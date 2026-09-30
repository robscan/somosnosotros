"use client";

import { useSearchParams } from "next/navigation";
import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import ListaLugares from "@/components/ListaLugares";
import { useMemoriaPantalla } from "@/components/MemoriaPantalla";
import Mapa from "@/components/Mapa";
import PantallaConAviso from "@/components/useCanalDeListas";
import { useResuelta } from "@/components/useResuelta";
import type { AvisosLista } from "@/components/useSeguirEnLista";
import Aviso from "@/components/ui/Aviso";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import Cabecera from "@/components/ui/Cabecera";
import { EsqueletoCaja } from "@/components/ui/Esqueleto";
import { IconoUbicacion } from "@/components/ui/Iconos";
import comun from "@/components/Lista.module.css";
import { enlaceDeAlta } from "@/lib/armazon";
import { CIUDAD_INICIAL, type Ciudad, type CiudadConDatos } from "@/lib/ciudad";
import type { Destacado } from "@/lib/destacados";
import { etiquetaTipo, filtrarPorEleccion, lugaresEncuadreInicial, ordenarLugares, TIPOS, type ConEventos, type EleccionLugares, type LugarLista } from "@/lib/lugares";
import { leerUbicacionCercana } from "@/lib/ubicacion";
import FichaHoja, { type PiezasFicha } from "./FichaHoja";
import FilaLugares from "./FilaLugares";
import HojaLugares, { type DondeEstaba, type EstadoHoja, type Manejo } from "./HojaLugares";
import styles from "./lugares.module.css";

/** A dónde lleva «Registrar un lugar» cuando la ciudad no tiene ninguno. */
const ALTA_DE_LUGAR = enlaceDeAlta("lugar", null).href;

type Punto = { lat: number; lng: number };
type EstadoGeo = "sin-pedir" | "pidiendo" | "negado" | "error";
type Encuadre = { puntos: Punto[]; vez: number };
/**
 * La ficha abierta dentro de la hoja: el lugar y lo que llega del servidor (null mientras llega, «fallo» si no se pudo), con lo
 * diferido de la pantalla (`ExtrasLugares`) que había al pedirlo: si cambia con la ficha abierta —un Seguir revalida la pantalla—,
 * la ficha se pide de nuevo y no enseña lo de antes (el «Sigues», cuántos lo siguen).
 */
type FichaAbierta = { lugar: LugarLista; piezas: PiezasFicha | "fallo" | null; deExtra: ExtrasLugares | null };

/**
 * Lo que solo necesitan el mapa y la hoja, nunca la fila de contexto (OL-161, bitácora 196): quién sigue qué y la tira de
 * destacados. Llega como promesa (`Props.extras`) para que `VistaLugares` pinte su cabecera al instante con solo `lugares`; el mapa
 * y la hoja salen cuando llega (`useResuelta`).
 */
export type ExtrasLugares = {
  conSesion: boolean;
  /** Los lugares que la persona sigue (la lista los marca); null = sin sesión. */
  seguidos: string[] | null;
  avisos: AvisosLista | null;
  /** La tira de destacados de la ciudad (docs/rediseno/20): en naranja, en el mapa. */
  destacados: Destacado[];
};

type Props = {
  /** Todos los lugares de la ciudad: la fila de contexto, el mapa y la hoja parten de aquí y cada uno filtra los suyos. */
  lugares: LugarLista[];
  ciudad: Ciudad;
  ciudades: CiudadConDatos[];
  extras: Promise<ExtrasLugares>;
  /** El lugar cuya ficha abre la hoja al llegar (`?lugar=`, el slug o el id): Buscar, desde Lugares, vuelve al mapa con él. */
  fichaInicial?: string;
  /** Hoy en la ciudad, YYYY-MM-DD (lo decide el servidor para que cliente y servidor coincidan). */
  hoy: string;
  /** Pide al servidor las piezas de la ficha de un lugar (`fichaEnHoja.tsx`). La página la pasa como prop, y no se importa aquí, para
   *  que los componentes de cliente de esas piezas entren en el manifiesto de esta ruta: si no, Next no las encuentra al enviarlas. */
  abrirFicha: (idOSlug: string) => Promise<PiezasFicha | null>;
};

/** Lo que Lugares recuerda de la pantalla al salir de ella (a una ficha, a otra pestaña) y repone al volver. */
type Memoria = { conEventos: ConEventos | null; soloSigo: boolean; hoja: DondeEstaba & { ficha: string | null } };

/** El tipo que trae la URL (`?tipo=`): solo vale si existe. */
function tipoDeLaUrl(params: { get(nombre: string): string | null }): string | null {
  const tipo = params.get("tipo");
  return tipo && TIPOS.some((t) => t.valor === tipo) ? tipo : null;
}

/** La dirección de Lugares con lo que vive en la URL: la ciudad (si no es la inicial) y el tipo. */
function hrefLugares(ciudad: Ciudad, tipo: string | null): string {
  const consulta = new URLSearchParams();
  if (ciudad.slug !== CIUDAD_INICIAL.slug) consulta.set("ciudad", ciudad.slug);
  if (tipo) consulta.set("tipo", tipo);
  const texto = consulta.toString();
  return texto ? `/lugares?${texto}` : "/lugares";
}

/** Los cinco lugares más cercanos a un punto (y el punto): lo que encuadra el botón de ubicación. */
function encuadreCercanosDe(lugares: LugarLista[], p: Punto): Punto[] {
  return [p, ...ordenarLugares(lugares, p).lista.slice(0, 5)];
}

/**
 * Lugares: el mapa a toda la altura que deja la fila de contexto y, sobre él, la hoja con la lista de lugares y, al tocar un pin
 * o un renglón, la ficha del lugar dentro de la hoja (docs/rediseno/50, P5b; decisiones 31 a 36 y 58 del founder). La fila lleva la
 * ciudad y Filtros (tipo, con eventos y, con sesión, lo que sigo); buscar es la lupa de la barra de la app (`app/buscar`), que desde aquí vuelve
 * con la ficha de un lugar ya abierta (`fichaInicial`). «Mi ubicación» pide la ubicación al tocarla, no la guarda: centra en el punto azul y ordena la lista por cercanía. Al elegir
 * algo en Filtros, quitar un chip o cambiar de ciudad, la hoja responde: recogida sube a asoma (asoma o llena se quedan), la cantidad dice lo que quedó y
 * el mapa encuadra los lugares que quedan, sin moverse si no cambió nada (docs/rediseno/50, decisión del founder del 2026-09-30). Decisiones
 * en docs/rediseno/06-lugares-flujo-y-estados.md y docs/rediseno/prototipos/restructura-ui.html.
 */
export default function VistaLugares({ lugares, ciudad, ciudades, extras, fichaInicial, hoy, abrirFicha }: Props) {
  // El tipo se elige aquí, sin pedirle nada al servidor (la lista de la ciudad ya está en el teléfono): la lista y el mapa cambian al
  // instante y la URL lo refleja para poder compartirlo. Si la URL trae otro por su cuenta (otra ciudad, Atrás), el tipo la sigue.
  const tipoDeUrl = tipoDeLaUrl(useSearchParams());
  const [tipo, setTipo] = useState(tipoDeUrl);
  const [tipoVisto, setTipoVisto] = useState(tipoDeUrl);
  if (tipoDeUrl !== tipoVisto) {
    setTipoVisto(tipoDeUrl);
    setTipo(tipoDeUrl);
  }
  const [conEventos, setConEventos] = useState<ConEventos | null>(null);
  const [soloSigo, setSoloSigo] = useState(false);
  const [punto, setPunto] = useState<Punto | null>(null);
  const [vez, setVez] = useState(0);
  const [geo, setGeo] = useState<EstadoGeo>("sin-pedir");
  const [encuadre, setEncuadre] = useState<Encuadre | null>(null);
  // Con `fichaInicial` (Buscar, desde Lugares) la ficha ya está abierta desde el primer cuadro: la hoja sube a ella y el mapa se centra.
  const [inicial] = useState(() => (fichaInicial ? lugares.find((l) => (l.slug || l.id) === fichaInicial) : undefined));
  const [ficha, setFicha] = useState<FichaAbierta | null>(() => (inicial ? { lugar: inicial, piezas: null, deExtra: null } : null));
  /** Cambia con cada ficha que se abre por un gesto de la persona (un pin, un renglón): la hoja entra con movimiento. Al reponer la pantalla o
   *  llegar con la ficha ya abierta no cambia, y la ficha aparece en su sitio. */
  const [entrada, setEntrada] = useState(0);
  /** Cómo quedó la hoja al asentarse (para la memoria de pantalla y para dejar libre al mapa lo que ella tapa). */
  const [hoja, setHoja] = useState<EstadoHoja>({ detente: "asoma", y: 0, cubre: 0 });
  /** La lista de la hoja ya se desplazó más de una pantalla: aparece el botón de volver arriba (`ui/Cabecera`). */
  const [lejos, setLejos] = useState(false);
  const [restaurar, setRestaurar] = useState<DondeEstaba>();
  /** Lo que tenía el foco al abrir la ficha, para devolvérselo al cerrarla. */
  const disparador = useRef<HTMLElement | null>(null);
  /** Lo que se le puede pedir a la hoja (subir a asoma al filtrar). */
  const hojaRef = useRef<Manejo>(null);
  /** Lo que la cámara encuadra en cuanto la hoja diga cuánto tapa: el lugar de la ficha que se abre (abre más alta que la lista) o lo que queda
   *  al filtrar, cuando la hoja recogida sube a asoma. */
  const porEncuadrar = useRef<Punto[] | null>(inicial ? [inicial] : null);
  // Lo diferido ya llegado; con otra promesa (cambiar de tipo, un Seguir) se queda lo anterior hasta que llegue lo nuevo, sin que el
  // mapa y la hoja se vayan y vuelvan.
  const extra = useResuelta(extras);
  const seguidos = extra?.seguidos ?? null;
  // «Solo lo que sigo» existe solo con sesión, que se sabe cuando llega lo diferido: sin ella, un valor de la memoria de pantalla no cuenta.
  // Mientras llega se deja como esté, para que el chip de quien sí tiene sesión no aparezca tarde.
  const conSesion = extra?.conSesion;
  const eleccion = useMemo<EleccionLugares>(() => ({ tipo, conEventos, soloSigo: soloSigo && conSesion !== false }), [tipo, conEventos, soloSigo, conSesion]);
  // Lo que dejan pasar los filtros: lo que enseñan el mapa y la lista.
  const visibles = useMemo(() => filtrarPorEleccion(lugares, eleccion, seguidos, hoy), [lugares, eleccion, seguidos, hoy]);
  const abierta = ficha && lugares.some((l) => l.id === ficha.lugar.id) ? ficha : null;
  /** Pide las piezas de la ficha al servidor y, cuando llegan, las pone (si esa ficha sigue abierta). */
  const pedirPiezas = useCallback(
    (lugar: LugarLista, deExtra: ExtrasLugares | null) => {
      // Como transición: con la ficha ya a la vista, lo nuevo la reemplaza cuando está listo, sin pasar por el esqueleto.
      const poner = (piezas: PiezasFicha | "fallo") => startTransition(() => setFicha((f) => (f?.lugar.id === lugar.id ? { ...f, piezas, deExtra } : f)));
      abrirFicha(lugar.slug || lugar.id).then((piezas) => poner(piezas ?? "fallo"), () => poner("fallo"));
    },
    [abrirFicha],
  );
  // Lo diferido cambió con la ficha ya abierta (un Seguir revalidó la pantalla): se pide de nuevo, y la anterior se queda a la vista
  // hasta que llegue la nueva.
  const fichaActual = useRef(ficha);
  useLayoutEffect(() => {
    fichaActual.current = ficha;
  });
  useEffect(() => {
    const f = fichaActual.current;
    if (f?.deExtra && f.deExtra !== extra && f.piezas && f.piezas !== "fallo") pedirPiezas(f.lugar, extra);
  }, [extra, pedirPiezas]);

  const encuadrar = (puntos: Punto[]) => setEncuadre((e) => ({ puntos, vez: (e?.vez ?? 0) + 1 }));

  function abrir(lugar: LugarLista, porGesto = true) {
    disparador.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Con otra ficha ya abierta la hoja no cambia de altura y la cámara va al momento; si no, espera a lo que tapará la ficha al abrirse.
    if (abierta) encuadrar([lugar]);
    else porEncuadrar.current = [lugar];
    setFicha({ lugar, piezas: null, deExtra: extra });
    if (porGesto) setEntrada((n) => n + 1);
    pedirPiezas(lugar, extra);
  }
  function alAsentar(estado: EstadoHoja) {
    setHoja(estado);
    if (porEncuadrar.current) encuadrar(porEncuadrar.current);
    porEncuadrar.current = null;
  }
  function cerrar() {
    setFicha(null);
    if (disparador.current?.isConnected) disparador.current.focus({ preventScroll: true });
  }
  /** La persona cambió lo que ve (un filtro, un chip, otra ciudad): la hoja enseña la lista (recogida sube a asoma) y el mapa encuadra `puntos`
   *  (con null, la cámara se queda donde está). */
  function mostrarResultado(puntos: Punto[] | null) {
    if (abierta) return; // con la ficha a la vista la lista no se ve y la cámara es de la ficha
    porEncuadrar.current = puntos; // la cámara va en cuanto la hoja avise cuánto tapa: ya subió a asoma si estaba recogida
    hojaRef.current?.mostrarLista();
  }
  /** Lo que se elige en Filtros: todo se queda en el teléfono; el tipo, además, en la URL (se comparte y sobrevive al volver atrás). */
  function cambiar(nueva: EleccionLugares) {
    setConEventos(nueva.conEventos);
    setSoloSigo(nueva.soloSigo);
    if (nueva.tipo !== tipo) {
      setTipo(nueva.tipo);
      window.history.replaceState(null, "", hrefLugares(ciudad, nueva.tipo));
    }
    const quedan = filtrarPorEleccion(lugares, nueva, seguidos, hoy);
    // Con lo mismo a la vista, la cámara se queda donde está.
    mostrarResultado(quedan.length === visibles.length && quedan.every((l, i) => l.id === visibles[i].id) ? null : quedan);
  }
  function pedirUbicacion() {
    setGeo("pidiendo");
    // Con una posición fresca guardada en el teléfono (de aquí o de la agenda) esto resuelve al momento, sin volver a llamar al
    // navegador (OL-095, L25 y L50): el botón sigue pidiéndose con un toque, pero no repite la llamada si ya la tenemos.
    leerUbicacionCercana().then(
      (p) => {
        setPunto(p);
        setVez((v) => v + 1);
        setGeo("sin-pedir");
        encuadrar(encuadreCercanosDe(visibles, p));
      },
      (error: unknown) => setGeo(error === "negado" ? "negado" : "error"),
    );
  }
  /** El botón de ubicación (docs/rediseno/35): pide la ubicación y encuadra a la persona con los cinco lugares más cercanos; si ya la
   *  tiene, vuelve a centrar. No toca los filtros: solo mueve la cámara y ordena la lista. */
  function centrarEnMi() {
    if (punto) {
      setVez((v) => v + 1);
      encuadrar(encuadreCercanosDe(visibles, punto));
    } else pedirUbicacion();
  }
  const notaGeo = geo === "negado" ? "No pudimos leer tu ubicación. Actívala para este sitio en los ajustes del teléfono." : geo === "error" ? "No pudimos leer tu ubicación." : null;

  // Al volver de una ficha o de otra pestaña: los filtros, la ficha abierta y la hoja donde estaba (altura y desplazamiento).
  useMemoriaPantalla<Memoria>("lugares", { conEventos, soloSigo, hoja: { ficha: abierta?.lugar.slug || abierta?.lugar.id || null, detente: hoja.detente, y: hoja.y } }, (r) => {
    setConEventos(r.conEventos === "hoy" || r.conEventos === "semana" ? r.conEventos : null);
    setSoloSigo(!!r.soloSigo);
    if (!r.hoja) return;
    setRestaurar({ detente: r.hoja.detente, y: r.hoja.y });
    const lugar = r.hoja.ficha ? lugares.find((l) => (l.slug || l.id) === r.hoja.ficha) : undefined;
    if (lugar) abrir(lugar, false);
  });

  // Al cambiar de ciudad la pantalla sigue montada (la URL trae otros lugares): la hoja y el mapa responden como ante un filtro.
  const ciudadVista = useRef(ciudad.slug);
  useEffect(() => {
    if (ciudadVista.current === ciudad.slug) return;
    ciudadVista.current = ciudad.slug;
    mostrarResultado(visibles);
  });

  // Buscar, desde Lugares, llega con `?lugar=`: se piden las piezas de la ficha que ya está abierta y la URL suelta el parámetro (que no se
  // reabra al volver a la sección). Solo al montar.
  useEffect(() => {
    if (!inicial) return;
    pedirPiezas(inicial, null);
    window.history.replaceState(null, "", hrefLugares(ciudad, tipo));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  // El aviso de abajo y la pregunta de avisos son de la pantalla, no de la hoja: con un canal suyo, cerrar la ficha y abrir otra
  // empezaría de cero (OL-057, revisión de gestión de cambios).
  return (
    <PantallaConAviso>
      <main className={styles.lugares}>
        <Cabecera
          contexto={<FilaLugares ciudad={ciudad} ciudades={ciudades} hrefDeCiudad={(c) => hrefLugares(c, null)} lugares={lugares} hoy={hoy} seguidos={seguidos} conSesion={!!conSesion} valor={eleccion} onCambiar={cambiar} />}
          volverArriba={{ lejos, volver: () => hojaRef.current?.irA("llena") }}
        />
        {/* El mapa y la hoja esperan una consulta aparte (quién sigue qué, destacados): mientras llega, un esqueleto del alto del mapa
            (OL-161, bitácora 196). */}
        {extra ? (
          <CuerpoLugares
            extra={extra}
            lugares={lugares}
            visibles={visibles}
            ciudad={ciudad}
            eleccion={eleccion}
            punto={punto}
            vez={vez}
            encuadre={encuadre}
            tapaAbajo={hoja.cubre}
            notaGeo={notaGeo}
            geoPidiendo={geo === "pidiendo"}
            onCerrarGeo={() => setGeo("sin-pedir")}
            onUbicacion={centrarEnMi}
            ficha={abierta}
            entrada={entrada}
            onAbrir={abrir}
            onCerrarFicha={cerrar}
            restaurar={restaurar}
            alAsentar={alAsentar}
            alLejos={setLejos}
            hojaRef={hojaRef}
          />
        ) : (
          <EsqueletoCaja className={styles.mapa} />
        )}
      </main>
    </PantallaConAviso>
  );
}

/** Por qué no hay ningún lugar que ver, cuando la ciudad sí tiene (los filtros no dejan pasar ninguno). */
function porQueNoHay({ tipo, conEventos, soloSigo }: EleccionLugares): string {
  if (conEventos) return `Ningún lugar tiene eventos ${conEventos === "hoy" ? "hoy" : "esta semana"}.`;
  if (soloSigo) return "Todavía no sigues ningún lugar.";
  if (tipo) return `Todavía no hay lugares de tipo ${etiquetaTipo(tipo).toLowerCase()}.`;
  return "Ningún lugar coincide con lo que elegiste.";
}

type PropsCuerpo = {
  extra: ExtrasLugares;
  lugares: LugarLista[];
  visibles: LugarLista[];
  ciudad: Ciudad;
  eleccion: EleccionLugares;
  punto: Punto | null;
  vez: number;
  encuadre: Encuadre | null;
  /** Lo que la hoja tapa del mapa por abajo: cada encuadre lo deja libre. */
  tapaAbajo: number;
  notaGeo: string | null;
  geoPidiendo: boolean;
  onCerrarGeo: () => void;
  onUbicacion: () => void;
  ficha: FichaAbierta | null;
  /** Cambia con cada ficha que se abre por un gesto de la persona: la hoja entra con movimiento. */
  entrada: number;
  onAbrir: (lugar: LugarLista) => void;
  onCerrarFicha: () => void;
  restaurar: DondeEstaba | undefined;
  alAsentar: (estado: EstadoHoja) => void;
  alLejos: (lejos: boolean) => void;
  hojaRef: RefObject<Manejo | null>;
};

/**
 * El mapa y la hoja, ya con lo que llegó de su propia consulta (OL-161, bitácora 196). Lo que la fila necesita mostrar (los
 * filtros, la ubicación pedida, la ficha abierta) llega como prop desde el componente de arriba, que es el dueño
 * de ese estado.
 */
function CuerpoLugares({ extra, lugares, visibles, ciudad, eleccion, punto, vez, encuadre, tapaAbajo, notaGeo, geoPidiendo, onCerrarGeo, onUbicacion, ficha, entrada, onAbrir, onCerrarFicha, restaurar, alAsentar, alLejos, hojaRef }: PropsCuerpo) {
  const { lista, km } = useMemo(() => ordenarLugares(visibles, punto), [visibles, punto]);
  // En el mapa, los destacados van en naranja y los seguidos en verde (gana el verde); sin sesión, `seguidos` llega null y ningún
  // pin se resalta como seguido. Sin aro (OL-146, 2026-09-23: decisión del founder tras firmar el doc 35 y el 37), salvo el del lugar
  // de la ficha abierta, que crece, lleva aro y sombra y queda encima de los demás (P8, 2026-09-29).
  const enTira = useMemo(() => extra.destacados.map((d) => d.id), [extra.destacados]);
  const idsSeguidos = useMemo(() => extra.seguidos ?? [], [extra.seguidos]);
  // El encuadre al abrir (docs/rediseno/35, "Cómo se decide el encuadre"): los lugares de esta semana y los destacados; con
  // menos de tres, se completa con los cercanos al centro. Se calcula una sola vez, al montar este componente.
  const [inicial] = useState<Encuadre | null>(() => {
    const iniciales = lugaresEncuadreInicial(visibles, enTira, ciudad.centro);
    return iniciales.length > 0 ? { puntos: iniciales, vez: 1 } : null;
  });
  const cantidad = visibles.length === 1 ? "1 lugar" : `${visibles.length} lugares`;

  return (
    <>
      <div className={styles.mapa} data-techo-hoja>
        <Mapa
          lugares={visibles}
          encuadre={encuadre ?? inicial}
          ciudad={ciudad}
          onPin={onAbrir}
          elegido={ficha?.lugar.id ?? null}
          ubicacion={punto ? { ...punto, vez } : null}
          seguidos={idsSeguidos}
          destacados={enTira}
          tapaAbajo={tapaAbajo}
        />
        {notaGeo && <Aviso texto={notaGeo} onCerrar={onCerrarGeo} className={styles.avisoMapa} />}
        <BotonIcono tamano="accion" relieve="elevado" data-libre className={`${styles.ubicacion} ${punto ? styles.ubicacionActiva : ""} ${geoPidiendo ? styles.ubicacionPidiendo : ""}`} onClick={onUbicacion} aria-label="Mi ubicación">
          <IconoUbicacion width={22} height={22} />
        </BotonIcono>
      </div>
      <HojaLugares
        ref={hojaRef}
        resumen={
          visibles.length === 0 ? (
            "Ningún lugar"
          ) : (
            <>
              {cantidad}
              {punto && <small> · los más cercanos primero</small>}
            </>
          )
        }
        ficha={ficha && <FichaHoja key={ficha.lugar.id} lugar={ficha.lugar} piezas={ficha.piezas} onCerrar={onCerrarFicha} />}
        entrada={entrada}
        desde={restaurar}
        alAsentar={alAsentar}
        alLejos={alLejos}
      >
        {lista.length > 0 ? (
          <ListaLugares lugares={lista} km={km} seguidos={extra.seguidos} avisos={extra.avisos} alAbrir={onAbrir} />
        ) : lugares.length === 0 ? (
          <section className={comun.vacio}>
            <h2>Lugares</h2>
            <p>Aún no hay lugares en {ciudad.nombre}. Registra el primero.</p>
            <Boton href={extra.conSesion ? ALTA_DE_LUGAR : `/entrar?siguiente=${encodeURIComponent(ALTA_DE_LUGAR)}`} variante="secundario">
              Registrar un lugar
            </Boton>
          </section>
        ) : (
          <p className={styles.nada}>{porQueNoHay(eleccion)}</p>
        )}
      </HojaLugares>
    </>
  );
}
