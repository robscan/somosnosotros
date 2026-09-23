"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Suspense } from "react";
import { Cuenta } from "@/components/ui/Chip";
import BuscadorUnificado from "@/components/BuscadorUnificado";
import ListaLugares from "@/components/ListaLugares";
import PantallaConAviso from "@/components/useCanalDeListas";
import type { AvisosLista } from "@/components/useSeguirEnLista";
import { useMemoriaPantalla } from "@/components/MemoriaPantalla";
import Aviso from "@/components/ui/Aviso";
import Boton from "@/components/ui/Boton";
import { EsqueletoCaja, EsqueletoRenglones } from "@/components/ui/Esqueleto";
import Hoja from "@/components/ui/Hoja";
import Mapa from "@/components/Mapa";
import NavInferior from "@/components/NavInferior";
import Publicar from "@/components/Publicar";
import Cabecera, { BotonRedondo } from "@/components/ui/Cabecera";
import { IconoCalendario, IconoLista, IconoMapa, IconoUbicacion } from "@/components/ui/Iconos";
import { useAltoHoja } from "@/components/ui/useAltoHoja";
import { CIUDAD_INICIAL, type Ciudad, type CiudadConDatos } from "@/lib/ciudad";
import type { Destacado, Tarjeta } from "@/lib/destacados";
import { SIN_FOTO } from "@/lib/imagen";
import ChipCiudad from "@/components/Ciudad";
import { calleCorta, etiquetaTipo, filtrarLugares, hrefLugar, lugaresEncuadreInicial, ordenarLugares, textoProximoPin, tiposPresentes, UMBRAL_BUSCAR_LUGARES, UMBRAL_CHIPS_LUGARES, type LugarLista } from "@/lib/lugares";
import { leerUbicacionCercana } from "@/lib/ubicacion";
import { PanelPestana, Pestana, PestanaEnlace, Pestanas } from "@/components/ui/Pestanas";
import { CampoBuscar } from "@/components/ui/Buscador";
import sug from "@/components/ui/Sugerencia.module.css";
import listaEsqueletoStyles from "@/components/ListaEsqueleto.module.css";
import styles from "./lugares.module.css";

type Vista = "mapa" | "lista";
/** Cuántos resultados de la búsqueda se listan sobre el mapa (el resto se ve en los pines o en la Lista). */
const MAX_RESULTADOS_MAPA = 6;
type Punto = { lat: number; lng: number };
type EstadoGeo = "sin-pedir" | "pidiendo" | "negado" | "error";
/**
 * Lo que la Cabecera (fuera del `<Suspense>`) le pide al mapa (dentro): buscar y reencuadrar. Un `ref` en vez de
 * levantar el estado del mapa hasta aquí (OL-161) — evita reaccionar a un cambio de prop con un efecto que llama
 * `setState` (la regla `react-hooks/set-state-in-effect` lo rechaza) y ocurre en el mismo toque, sin un repintado de
 * más. `CuerpoLugares` lo rellena al montar; antes de que exista (mientras carga su `<Suspense>`) queda en null y
 * el toque no hace nada, que es correcto: no hay mapa todavía con quién hablar.
 */
type InteraccionMapa = { buscar: (v: string) => void; recentrar: (p: Punto) => void };

/**
 * Lo que solo necesitan el mapa y la lista, nunca la barra ni las pestañas (OL-161, bitácora 196): quién sigue qué,
 * la tira de destacados y la de esta semana. Llega como promesa (`Props.extras`) para que `VistaLugares` pinte su
 * cabecera al instante con solo `lugares`, y `CuerpoLugares` la desenvuelva con `use()` dentro de su `<Suspense>`.
 */
export type ExtrasLugares = {
  conSesion: boolean;
  /** Los lugares que la persona sigue (la lista los marca y deja seguir al deslizar); null = sin sesión. */
  seguidos: string[] | null;
  avisos: AvisosLista | null;
  /** La tira de destacados de la ciudad (docs/rediseno/20): arriba de la lista y, en naranja, en el mapa. */
  destacados: Destacado[];
  eventosSemana: Tarjeta[];
};

type Props = {
  lugares: LugarLista[];
  ciudad: Ciudad;
  ciudades: CiudadConDatos[];
  vistaInicial: Vista;
  /** Tipo elegido, leído de la URL (`?tipo=`); vale para el mapa y la lista. */
  tipo: string | null;
  barra: ReactNode;
  extras: Promise<ExtrasLugares>;
  /** Con qué texto abrir la búsqueda ya escrita (el "Ver todos" del grupo Lugares del buscador único, OL-153). */
  busquedaInicial?: string;
};

/**
 * Lugares: Mapa y Lista como dos vistas del mismo directorio; el mapa es la primera. Las dos comparten ui/Cabecera:
 * ciudad, el botón que enseña la otra vista y la lupa; debajo, Todos · Cercanos · tipos (OL-087). Cercanos pide la
 * ubicación al tocarlo, no la guarda y es exclusiva con el tipo: en la lista ordena por distancia, en el mapa centra
 * en el punto azul. Decisiones en docs/rediseno/06-lugares-flujo-y-estados.md y docs/rediseno/prototipos/cabeceras.html.
 */
export default function VistaLugares({ lugares, ciudad, ciudades, vistaInicial, tipo, barra, extras, busquedaInicial }: Props) {
  const router = useRouter();
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [punto, setPunto] = useState<Punto | null>(null);
  const [vez, setVez] = useState(0);
  const [geo, setGeo] = useState<EstadoGeo>("sin-pedir");
  // El tipo elegido vive en la URL y vale para las dos vistas: cambiar de Mapa a Lista no lo pierde. Las pestañas
  // (Todos, Cercanos, tipos) solo necesitan `lugares`, que ya llega resuelto: pintan al instante, con la barra
  // (OL-161, bitácora 196) — antes esperaban también destacados, la tira de la semana y quién sigue qué.
  const tipos = lugares.length >= UMBRAL_CHIPS_LUGARES ? tiposPresentes(lugares) : [];
  const enCiudad = ciudad.slug === CIUDAD_INICIAL.slug ? "" : `&ciudad=${ciudad.slug}`;
  const hrefTipo = (t: string | null) => `/lugares?vista=${vista}${enCiudad}${t ? `&tipo=${t}` : ""}`;
  // Cambiar de ciudad conserva la vista y suelta el tipo.
  const chipCiudad = <ChipCiudad ciudad={ciudad} ciudades={ciudades} hrefDe={(c) => `/lugares?vista=${vista}${c.slug === CIUDAD_INICIAL.slug ? "" : `&ciudad=${c.slug}`}`} />;
  const lugaresDelTipo = useMemo(() => (tipo ? lugares.filter((l) => l.tipo === tipo) : lugares), [lugares, tipo]);
  // Una sola búsqueda para las dos vistas, tras la lupa. En el mapa, lo encontrado se encuadra en `CuerpoLugares`
  // (diferido); aquí solo vive el texto, para que el campo pinte con la cabecera.
  const [busqueda, setBusqueda] = useState(busquedaInicial ?? "");
  const [buscando, setBuscando] = useState(!!busquedaInicial);
  // Al volver de una ficha, la misma vista, lo escrito y el scroll de la lista (el tipo ya viene en la URL; la tira
  // de letras no selecciona nada que recordar: es un acceso directo, no un filtro, corrección del founder, 2026-09-19).
  useMemoriaPantalla<{ vista: Vista; busqueda: string }>("lugares", { vista, busqueda }, (r) => {
    if (r.vista === "mapa" || r.vista === "lista") setVista(r.vista);
    if (typeof r.busqueda === "string") setBusqueda(r.busqueda);
    setBuscando(!!r.busqueda);
  });
  // Lo que `CuerpoLugares` rellena al montar, para que un toque en la Cabecera (buscar, recentrar) actúe en el
  // mismo instante en vez de esperar un efecto reaccionando al cambio de prop (ver el tipo `InteraccionMapa`).
  const mapaRef = useRef<InteraccionMapa | null>(null);
  function buscar(v: string) {
    setBusqueda(v);
    mapaRef.current?.buscar(v);
  }
  function pedirUbicacion() {
    setGeo("pidiendo");
    // Con una posición fresca guardada en el teléfono (de aquí o de la agenda) esto resuelve al momento, sin
    // volver a llamar al navegador (OL-095, L25 y L50): el botón sigue pidiéndose con un toque, pero no repite
    // la llamada si ya la tenemos.
    leerUbicacionCercana().then(
      (p) => {
        setPunto(p);
        setVez((v) => v + 1);
        setGeo("sin-pedir");
        mapaRef.current?.recentrar(p);
      },
      (error: unknown) => setGeo(error === "negado" ? "negado" : "error"),
    );
  }
  function cambiarVista(v: Vista) {
    setVista(v);
  }
  /** El botón de ubicación del mapa (docs/rediseno/35): pide la ubicación y encuadra a la persona con los cinco
   *  lugares más cercanos; si ya la tiene, vuelve a centrar. No toca el tipo elegido: solo mueve la cámara. */
  function centrarEnMi() {
    if (punto) {
      setVez((v) => v + 1);
      mapaRef.current?.recentrar(punto);
    } else pedirUbicacion();
  }
  /** Cercanos, en la Lista: con la ubicación ya leída, ordena por cercanía; si no, se pide. Suelta el tipo. */
  function verCercanos() {
    if (tipo) router.replace(hrefTipo(null), { scroll: false });
    if (punto) {
      setVez((v) => v + 1);
      mapaRef.current?.recentrar(punto);
    } else pedirUbicacion();
  }
  const notaGeo =
    geo === "negado"
      ? "No pudimos leer tu ubicación. Actívala para este sitio en los ajustes del teléfono."
      : geo === "error"
        ? "No pudimos leer tu ubicación."
        : null;

  // El aviso de abajo y la pregunta de avisos son de la pantalla, no de la Lista: al cambiar a Mapa y volver, la lista se
  // vuelve a montar, y con un canal suyo la pregunta empezaría de cero cada vez (OL-057, revisión de gestión de cambios).
  return (
    <PantallaConAviso>
      <main className={`raiz ${vista === "mapa" ? styles.sinRelleno : ""}`}>
        {barra}
        <Cabecera
          contexto={chipCiudad}
          acciones={
            vista === "mapa" ? (
              <BotonRedondo etiqueta="Ver la lista" onClick={() => cambiarVista("lista")}>
                <IconoLista />
              </BotonRedondo>
            ) : (
              <BotonRedondo etiqueta="Ver el mapa" onClick={() => cambiarVista("mapa")}>
                <IconoMapa />
              </BotonRedondo>
            )
          }
          onBuscar={lugares.length >= UMBRAL_BUSCAR_LUGARES ? () => setBuscando(true) : undefined}
          campo={buscando && <CampoBuscar placeholder="Buscar un lugar" ariaLabel="Buscar un lugar por nombre" valor={busqueda} onCambiar={buscar} onCerrar={() => { setBuscando(false); buscar(""); }} autoFocus />}
          filtros={
            <Pestanas ariaLabel="Qué lugares ver">
              <PestanaEnlace activa={!punto && !tipo} href={hrefTipo(null)} onClick={() => setPunto(null)}>
                Todos
                <Cuenta n={lugares.length} />
              </PestanaEnlace>
              {/* "Cercanos" solo en la Lista: en el Mapa esa decisión es del botón de ubicación, no de la pestaña
                  (dos mandos para lo mismo, decisión del founder, 2026-09-22: docs/rediseno/35). */}
              {vista === "lista" && (
                <Pestana activa={!!punto} onClick={verCercanos}>
                  {geo === "pidiendo" ? "Un momento…" : "Cercanos"}
                </Pestana>
              )}
              {tipos.length > 1 &&
                tipos.map((t) => (
                  <PestanaEnlace key={t.valor} activa={!punto && tipo === t.valor} href={hrefTipo(t.valor)} onClick={() => setPunto(null)}>
                    {t.etiqueta}
                    <Cuenta n={t.n} />
                  </PestanaEnlace>
                ))}
            </Pestanas>
          }
        />

        {/* El mapa y la lista sí esperan una consulta aparte (quién sigue qué, destacados, la tira de la semana):
            van en su propio `<Suspense>`, con un esqueleto del mismo tamaño mientras llega (OL-161, bitácora 196). */}
        <Suspense fallback={<EsqueletoCuerpoLugares vista={vista} />}>
          <CuerpoLugares
            mapaRef={mapaRef}
            extras={extras}
            lugaresDelTipo={lugaresDelTipo}
            ciudad={ciudad}
            tipo={tipo}
            vista={vista}
            busqueda={busqueda}
            punto={punto}
            vez={vez}
            notaGeo={notaGeo}
            geoPidiendo={geo === "pidiendo"}
            onCerrarGeo={() => setGeo("sin-pedir")}
            onUbicacion={centrarEnMi}
          />
        </Suspense>

        <NavInferior />
      </main>
    </PantallaConAviso>
  );
}

/** Los cinco lugares más cercanos a un punto, del tipo elegido (o todos): lo que encuadra el botón de ubicación. */
function encuadreCercanosDe(lugaresDelTipo: LugarLista[], p: Punto) {
  const cercanos = ordenarLugares(lugaresDelTipo, p).lista.slice(0, 5);
  return { puntos: [p, ...cercanos.map((l) => ({ lat: l.lat, lng: l.lng }))] };
}

/**
 * Mapa y lista, tras su propia consulta (OL-161, bitácora 196): `use(extras)` la desenvuelve y, mientras está
 * pendiente, suspende — el `<Suspense>` de `VistaLugares` (arriba) enseña `EsqueletoCuerpoLugares`. Todo lo que
 * antes vivía en `VistaLugares` y solo le servía al mapa o a la lista (el encuadre, la tarjeta elegida, el
 * desplegable de resultados) vive aquí ahora; lo que la cabecera necesita mostrar (vista, tipo, la búsqueda escrita,
 * la ubicación pedida) llega como prop desde el componente de arriba, que sigue siendo el dueño de ese estado.
 */
function CuerpoLugares({
  mapaRef,
  extras,
  lugaresDelTipo,
  ciudad,
  tipo,
  vista,
  busqueda,
  punto,
  vez,
  notaGeo,
  geoPidiendo,
  onCerrarGeo,
  onUbicacion,
}: {
  mapaRef: RefObject<InteraccionMapa | null>;
  extras: Promise<ExtrasLugares>;
  lugaresDelTipo: LugarLista[];
  ciudad: Ciudad;
  tipo: string | null;
  vista: Vista;
  busqueda: string;
  punto: Punto | null;
  vez: number;
  notaGeo: string | null;
  geoPidiendo: boolean;
  onCerrarGeo: () => void;
  onUbicacion: () => void;
}) {
  const extra = use(extras);
  const [elegido, setElegido] = useState<LugarLista | null>(null);
  const enMapa = useMemo(() => filtrarLugares(lugaresDelTipo, busqueda), [lugaresDelTipo, busqueda]);
  // En el mapa, los destacados van en naranja y los seguidos en verde (gana el verde); sin sesión, `seguidos`
  // llega null y ningún pin se resalta como seguido. Sin aro en ningún caso (OL-146, 2026-09-23): decisión del
  // founder tras firmar el doc 35 (2026-09-22) y el doc 37 (2026-09-23).
  const enTira = useMemo(() => extra.destacados.map((d) => d.id), [extra.destacados]);
  const idsSeguidos = useMemo(() => extra.seguidos ?? [], [extra.seguidos]);
  // El encuadre al abrir (docs/rediseno/35, "Cómo se decide el encuadre"): los lugares de esta semana y los
  // destacados; con menos de tres, se completa con los cercanos al centro. Se calcula una sola vez, al montar este
  // componente — que ahora ocurre justo cuando `extra` ya está disponible, no antes (OL-161).
  const [encuadre, setEncuadre] = useState<{ puntos: Punto[]; vez: number; paraBusqueda?: boolean } | null>(() => {
    const iniciales = lugaresEncuadreInicial(lugaresDelTipo, enTira, ciudad.centro);
    return iniciales.length > 0 ? { puntos: iniciales.map((l) => ({ lat: l.lat, lng: l.lng })), vez: 1 } : null;
  });
  // Lo encontrado se lista bajo el buscador mientras se escribe; al tocar uno se abre su tarjeta y la lista se cierra.
  const [listaAbierta, setListaAbierta] = useState(busqueda.trim().length > 0);
  const resultados = listaAbierta && busqueda.trim() ? enMapa.slice(0, MAX_RESULTADOS_MAPA) : [];
  function elegirResultado(l: LugarLista) {
    setListaAbierta(false);
    setElegido(l);
    setEncuadre((e) => ({ puntos: [{ lat: l.lat, lng: l.lng }], vez: (e?.vez ?? 0) + 1, paraBusqueda: true }));
  }
  // La Cabecera (fuera de este `<Suspense>`) llama a estas dos funciones a través de `mapaRef` en el mismo toque de
  // teclado o de botón (OL-161): nada de reaccionar a un cambio de prop con un efecto que llama `setState` (la regla
  // `react-hooks/set-state-in-effect` lo rechaza, y además tardaría un repintado extra). El registro en sí sí es un
  // efecto, pero no llama `setState`: solo deja escrita la referencia mientras este componente esté montado.
  useEffect(() => {
    mapaRef.current = {
      buscar(v) {
        if (vista !== "mapa") return;
        const t = v.trim();
        setListaAbierta(t.length > 0);
        if (!t) {
          setElegido(null);
          return;
        }
        const hallados = filtrarLugares(lugaresDelTipo, t);
        setElegido(hallados.length === 1 ? hallados[0] : null); // sin resultado o con varios, la tarjeta se cierra
        if (hallados.length > 0) setEncuadre((e) => ({ puntos: hallados.map((l) => ({ lat: l.lat, lng: l.lng })), vez: (e?.vez ?? 0) + 1, paraBusqueda: true }));
      },
      recentrar(p) {
        setEncuadre((e) => ({ ...encuadreCercanosDe(lugaresDelTipo, p), vez: (e?.vez ?? 0) + 1 }));
      },
    };
    return () => {
      mapaRef.current = null;
    };
  });
  // Mide la hoja del pin abierta para que el botón de ubicación suba justo por encima, sin taparse nunca
  // (docs/rediseno/35, "El botón de ubicación"; pedido explícito del founder al ver la primera entrega).
  const hojaRef = useAltoHoja<HTMLDivElement>(vista === "mapa" && !!elegido);

  return (
    <>
      {/* Deslizamiento de 200 ms en la dirección de la pestaña (docs/rediseno/38-transiciones-cargador.md,
          OL-148): Mapa es la 0, Lista la 1, como en el prototipo firmado. */}
      <PanelPestana posicion={vista === "mapa" ? 0 : 1}>
      {vista === "mapa" ? (
        <div className={styles.cajaMapa}>
          <Mapa
            lugares={enMapa}
            encuadre={encuadre}
            ciudad={ciudad}
            presentacion="caja"
            onPin={setElegido}
            elegido={elegido?.id ?? null}
            ubicacion={punto ? { ...punto, vez } : null}
            seguidos={idsSeguidos}
            destacados={enTira}
          />
          <div className={styles.sobreMapa}>
            {resultados.length > 0 && (
              <ul className={`${sug.lista} ${styles.resultadosMapa}`} role="listbox" aria-label="Lugares encontrados">
                {resultados.map((l) => (
                  <li key={l.id}>
                    <button type="button" className={`${sug.renglon} ${sug.sinIcono}`} onClick={() => elegirResultado(l)} role="option" aria-selected={elegido?.id === l.id}>
                      <b>{l.nombre}</b>
                      <small>
                        {etiquetaTipo(l.tipo)}
                        {calleCorta(l.direccion) ? ` · ${calleCorta(l.direccion)}` : ""}
                      </small>
                    </button>
                  </li>
                ))}
                {enMapa.length > resultados.length && <li className={styles.resultadoMas}>Y {enMapa.length - resultados.length} más en el mapa</li>}
              </ul>
            )}
            {busqueda.trim() && enMapa.length === 0 && <p className={styles.nadaMapa}>Ningún lugar se llama así. Si existe, regístralo.</p>}
          </div>
          {notaGeo && <Aviso texto={notaGeo} onCerrar={onCerrarGeo} className={styles.avisoMapa} />}
          <button
            type="button"
            className={`${styles.ubicacion} ${punto ? styles.ubicacionActiva : ""} ${geoPidiendo ? styles.ubicacionPidiendo : ""}`}
            onClick={onUbicacion}
            aria-label="Mi ubicación"
          >
            <IconoUbicacion width={22} height={22} />
          </button>
          {elegido && (
            <Hoja etiqueta="Lugar" onCerrar={() => setElegido(null)}>
              <div ref={hojaRef} className={styles.hojaLugar}>
                {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
                <img src={elegido.portada ?? SIN_FOTO} alt="" className={styles.hojaFoto} />
                <h3 className={styles.hojaTitulo}>{elegido.nombre}</h3>
                <span className={styles.hojaMeta}>
                  {enTira.includes(elegido.id) && <span className={styles.destacado}>Destacado</span>}
                  <span>{elegido.privado ? "Solo tú lo ves" : etiquetaTipo(elegido.tipo)}</span>
                  <span>
                    <IconoCalendario width={15} height={15} />
                    {elegido.proximo ? <b>{textoProximoPin(elegido.proximo)}</b> : "Sin eventos próximos"}
                  </span>
                </span>
              </div>
              <Boton href={hrefLugar(elegido)} className={styles.verFicha}>
                Ver ficha
              </Boton>
            </Hoja>
          )}
        </div>
      ) : busqueda.trim().length >= 2 ? (
        // El buscador único (OL-153, bitácora 188): en Lugares, lugares primero y con más resultados (doc 41,
        // "El buscador único"). Reemplaza aquí la lista de siempre mientras se busca; Todos/Cercanos/tipos siguen
        // en la cabecera, y borrar la búsqueda vuelve a `ListaLugares` tal cual.
        <BuscadorUnificado seccion="lugares" q={busqueda} ciudadSlug={ciudad.slug === CIUDAD_INICIAL.slug ? null : ciudad.slug} ciudadNombre={ciudad.nombre} />
      ) : (
        <ListaLugares
          lugares={lugaresDelTipo}
          tipo={tipo}
          busqueda={busqueda}
          punto={punto}
          ciudad={ciudad}
          conSesion={extra.conSesion}
          seguidos={extra.seguidos}
          avisos={extra.avisos}
          destacados={extra.destacados}
          eventosSemana={extra.eventosSemana}
          aviso={notaGeo && <Aviso texto={notaGeo} onCerrar={onCerrarGeo} className={styles.avisoLista} />}
        />
      )}
      </PanelPestana>

      {!elegido && <Publicar que="lugar" />}
    </>
  );
}

/** Fallback del `<Suspense>` de `CuerpoLugares`: una caja del alto del mapa, o renglones grises, según la vista. */
function EsqueletoCuerpoLugares({ vista }: { vista: Vista }) {
  return vista === "mapa" ? (
    <EsqueletoCaja className={styles.cajaMapa} />
  ) : (
    <div className={listaEsqueletoStyles.lista}>
      <EsqueletoRenglones cantidad={6} />
    </div>
  );
}
