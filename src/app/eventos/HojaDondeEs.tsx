"use client";

import { useEffect, useRef, useState } from "react";
import Boton from "@/components/ui/Boton";
import Limpiar from "@/components/ui/Limpiar";
import { IconoBuscar, IconoChevronIzquierda, IconoMas, IconoPin, IconoUbicacion } from "@/components/ui/Iconos";
import ListaFlotante from "@/components/ui/ListaFlotante";
import MapaDondeEs from "@/components/MapaDondeEs";
import { LIMITES_EVENTO, type ModoSitio } from "@/lib/eventos";
import type { Punto } from "@/lib/geo";
import { deducirTipo, recuperarLugar, sugerirLugares, type LugarSugerido } from "@/lib/buscarLugares";
import { lugarDesdePunto } from "@/lib/geocodificar";
import type { LugarResumen } from "@/lib/lugares";
import { CIUDAD_INICIAL, type Ciudad } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import { crearLugarDesdeEvento } from "@/app/lugares/acciones";
import { buscarConContexto, ciudadDeContexto, descartarSinCalle, necesitaReintentoLugares } from "./direccionContexto";
import { consultarMapa, lugaresPorTexto, puntoValido } from "./direccionEvento";
import { altoTeclado, combinarResultados, decidirGuardado, modoDePantalla } from "./dondeEsPantalla";
import { ubicacionCercanaFresca } from "@/lib/ubicacion";
import sug from "@/components/ui/Sugerencia.module.css";
import styles from "./HojaDondeEs.module.css";

/** Lo que resuelve Dónde cuando no es un lugar registrado: el sitio, su pin y, si es reservado, la dirección exacta. */
export type OtroSitio = {
  reservado: boolean;
  sitioTexto: string;
  /** Direccion publica estructurada, nunca parte del alias persistido. */
  direccion?: string;
  nombreLegacy?: boolean;
  referenciaLegacy?: string;
  pinPendiente?: boolean;
  sitioPunto: Punto | null;
  direccionPrivada: string;
  privadoPunto: Punto | null;
  revelarHoras: number;
  indicaciones: string;
  /** La ciudad del pin, deducida por Mapbox al ponerlo (null hasta entonces). */
  ciudad: string | null;
};

type Props = {
  lugares: LugarResumen[];
  modoSitio: ModoSitio;
  lugarId: string;
  otro: OtroSitio;
  /** La persona en el mapa (punto azul), si ya se ubicó. */
  yo: (Punto & { vez: number }) | null;
  ubicando: boolean;
  avisoUbicacion: string | null;
  /** Ya no se navega a /lugares/nuevo (el registro es en línea, docs/rediseno/43): se usa como `siguiente` al crear
   *  el lugar, solo para que la acción de servidor nunca redirija (siempre hay una ruta interna que la satisface). */
  volverA: string;
  /** `nuevo` llega con el lugar recién creado en esta misma hoja (aún no está en `lugares`, que es del primer
   *  pintado de la página): quien llama lo agrega a su lista para que el renglón "Dónde" lo encuentre. */
  onLugar: (id: string, nuevo?: LugarResumen) => void;
  onOtro: (o: OtroSitio, desdePin?: boolean) => void;
  onGesto: () => void;
  onEstoyAqui: (poner: (p: Punto) => void) => void;
  onCerrar: () => void;
  ciudadContexto?: Ciudad | null;
};

/** El pin en construcción: viene de un lugar registrado (fijo) o de cualquier otro punto (nombre editable). */
type Draft = {
  origen: "lugar" | "manual";
  nombre: string;
  direccion: string;
  punto: Punto | null;
  lugarId?: string;
  /** Solo cuando "Agregar lugar" acaba de crear uno de verdad y todavía no está en `lugares` (ver la nota de `volverA`). */
  lugarNuevo?: LugarResumen;
  /** El lugar elegido (registrado o recién creado) es privado: "Listo" lo guarda como sitio reservado, nunca por
   *  `lugar_id` (OL-179, founder 2026-09-24: "solo lo ve él"). Solo tiene sentido con `origen: "lugar"`. */
  privado?: boolean;
  /** Un sitio manual que debe guardarse como reservado (el panel "Agregar lugar" con el interruptor de privado
   *  encendido, sin que hubiera un lugar público parecido). Solo tiene sentido con `origen: "manual"`. */
  reservado?: boolean;
  editable: boolean;
  ciudad: string | null;
};

const ALTO_BARRA_ACCIONES = 56; // min-height de .barraAcciones en HojaDondeEs.module.css

/**
 * "¿Dónde es?" del alta de evento, a pantalla completa (OL-173, docs/rediseno/43; lugar privado de OL-179): el
 * mapa de fondo, un solo campo "Nombre o dirección" y los lugares registrados como pines tocables (los privados
 * propios entre ellos, marcados "Privado"). Escribir abre una lista flotante (nunca tapa nada); tocar un pin, un
 * punto de interés del mapa o cualquier punto vacío mueve el pin; arrastrarlo hace reverse geocoding. Sin
 * coincidencias, la barra de acciones muestra un solo botón, "Agregar lugar" (founder, 2026-09-24: "en el paso
 * anterior solo mostremos un botón de agregar"; antes había un segundo botón, "Buscar en el mapa sin agregar" -el
 * mapa siempre se puede tocar, el aviso lo dice). "Agregar lugar" registra uno de verdad -privado o no-; con
 * privado, el evento se guarda como sitio reservado (nombre visible, dirección oculta hasta la hora que toque),
 * igual que si se elige un lugar privado ya registrado de las sugerencias. "Listo" confirma y vuelve al
 * formulario; "Atrás" no cambia nada (todo vive en el estado local de esta hoja, no se avisa al padre hasta Listo).
 *
 * El mapa es un componente nuevo, `MapaDondeEs` (no `Mapa.tsx`): esta pantalla necesita lugares tocables Y un pin
 * que se mueve a cualquier punto A LA VEZ, algo que ningún modo de `Mapa.tsx` da junto, y ese archivo lo lleva
 * OL-174 en paralelo (instrucción del gestor: no tocarlo). Documentado como algo por unificar más adelante.
 */
export default function HojaDondeEs({ lugares, modoSitio, lugarId, otro, yo, ubicando, avisoUbicacion, volverA, onLugar, onOtro, onGesto, onEstoyAqui, onCerrar, ciudadContexto = null }: Props) {
  const [draft, setDraft] = useState<Draft | null>(() => {
    if (modoSitio === "lugar") {
      const l = lugares.find((x) => x.id === lugarId);
      return l ? { origen: "lugar", nombre: l.nombre, direccion: l.direccion ?? "", punto: { lat: l.lat, lng: l.lng }, lugarId: l.id, privado: l.privado === true, editable: false, ciudad: null } : null;
    }
    const punto = otro.reservado ? otro.privadoPunto : otro.sitioPunto;
    const direccion = otro.reservado ? otro.direccionPrivada : (otro.direccion ?? "");
    const nombre = otro.sitioTexto;
    if (!nombre.trim() && !direccion.trim() && !punto) return null;
    return { origen: "manual", nombre, direccion, punto, editable: true, ciudad: otro.ciudad };
  });
  // Nada se avisa al padre hasta "Listo" (doc 43: "Atrás no cambia nada"); `tocado` distingue "se reabrió con algo
  // ya elegido y no se tocó" (Listo no debe pisar un sitio reservado existente) de un cambio de verdad.
  const [tocado, setTocado] = useState(false);
  const [ajustado, setAjustado] = useState(false);
  const [q, setQ] = useState("");
  // La lista/barra se cierra con un toque fuera (incluido el mapa, que siempre queda tocable) o Escape (ambos los
  // resuelve `ListaFlotante` con su "tocar fuera"), y vuelve a abrirse sola en cuanto el texto cambia: en vez de un
  // booleano que un efecto tendría que resetear, se guarda PARA QUÉ texto se cerró -así "cerrada" se deriva solo
  // comparando con `q`, sin useRef ni useEffect (react-hooks/refs).
  const [cerradaParaTexto, setCerradaParaTexto] = useState<string | null>(null);
  const [resultadosMapbox, setResultadosMapbox] = useState<LugarSugerido[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [panelAgregar, setPanelAgregar] = useState(false);
  const [nombreAgregar, setNombreAgregar] = useState("");
  const [privadoAgregar, setPrivadoAgregar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorAgregar, setErrorAgregar] = useState<string | null>(null);
  // Al pedir privado, si ya existe un lugar público parecido se usa ese (lugares_parecidos nunca ve privados: un
  // parecido siempre es público) y se avisa, en vez de tratarlo como privado (founder, 2026-09-24, OL-179).
  const [avisoPublico, setAvisoPublico] = useState<string | null>(null);
  const campoRef = useRef<HTMLDivElement>(null);
  // La barra de acciones vive fuera del campo y de la lista flotante: sin esto, su propio "tocar fuera" (gestor,
  // revisión de OL-179, bitácora 214) la cerraba con el mousedown del propio botón "Agregar", antes de que le
  // llegara el click.
  const barraRef = useRef<HTMLDivElement>(null);
  const sesion = useRef("");
  const versionPin = useRef(0);
  const versionBusqueda = useRef(0);
  useEffect(() => {
    sesion.current = crypto.randomUUID();
  }, []);

  function marcarTocado() {
    onGesto();
    setTocado(true);
  }

  // Ciudad de contexto en cascada (mismo criterio que OL-100, docs/rediseno/26): el pin ya puesto manda; si no, el
  // texto escrito, la ciudad del chip o la posición cacheada del teléfono (nunca pedida aquí sin un toque: ya se
  // pidió antes, en Cercanos o en otra pantalla); San Luis Potosí de respaldo. Cálculo puro y barato: no hace
  // falta useMemo (y el compilador de React se queja si la lista de dependencias no calza con lo que infiere).
  const posicionTelefono = ubicacionCercanaFresca();
  const contexto = draft?.punto ? { ciudad: CIUDAD_INICIAL, centro: draft.punto, origen: "posicion" as const } : ciudadDeContexto({ texto: q, ciudadChip: ciudadContexto, posicion: yo ?? posicionTelefono });

  const listaCerradaActual = cerradaParaTexto === q;

  // Búsqueda en Mapbox (Search Box: lugares y direcciones juntos), acotada a la ciudad de contexto y con el
  // reintento automático si el primer intento no trae nada cerca (buscarConContexto, ya construido en OL-100).
  // Con menos de 3 letras no se busca; lo que haya quedado de una búsqueda más larga se ignora al mostrar (abajo),
  // así el efecto no necesita "limpiar" nada por su cuenta cuando el texto se acorta.
  useEffect(() => {
    const texto = q.trim();
    if (texto.length < 3) return;
    const { mapboxToken } = configPublica();
    const version = ++versionBusqueda.current;
    const timer = setTimeout(async () => {
      setBuscando(true);
      setErrorBusqueda(null);
      try {
        if (!mapboxToken) throw new Error("Sin servicio de direcciones");
        const opciones = await buscarConContexto(
          texto,
          contexto,
          (t, bbox) => sugerirLugares(t, mapboxToken, contexto.centro, sesion.current, consultarMapa, bbox).then((r) => descartarSinCalle(r, texto)),
          (r) => necesitaReintentoLugares(r.map((o) => o.distanciaM)),
        );
        if (version === versionBusqueda.current) setResultadosMapbox(opciones);
      } catch {
        if (version === versionBusqueda.current) setErrorBusqueda("No pude buscar. Intenta de nuevo o toca el mapa.");
      } finally {
        if (version === versionBusqueda.current) setBuscando(false);
      }
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, contexto.origen, contexto.ciudad.slug]);

  const textoBusqueda = q.trim();
  const conTextoLargo = textoBusqueda.length >= 3;
  const lugaresFiltrados = textoBusqueda ? lugaresPorTexto(lugares, q) : [];
  const combinados = combinarResultados(lugaresFiltrados, conTextoLargo ? resultadosMapbox : []);
  const modo = modoDePantalla(q, panelAgregar, combinados.length > 0);
  const listaAbierta = (modo === "resultados" || modo === "no-encontrado") && !listaCerradaActual;
  const barraVisible = (modo === "resultados" || modo === "no-encontrado") && !listaCerradaActual;

  /** Mueve el pin a cualquier punto: se escriba el nombre a mano o venga de un POI, y reverse geocoding para la dirección. */
  async function moverPin(punto: Punto, nombreFijo?: string, esArrastre = false) {
    marcarTocado();
    setAjustado(esArrastre);
    setAvisoPublico(null);
    const version = ++versionPin.current;
    setDraft((actual) => ({ origen: "manual", nombre: nombreFijo ?? (actual?.editable ? actual.nombre : ""), direccion: "Ubicando…", punto, editable: true, ciudad: actual?.editable ? actual.ciudad : null }));
    const { mapboxToken } = configPublica();
    if (!mapboxToken) {
      if (version === versionPin.current) setDraft((a) => (a && a.punto === punto ? { ...a, direccion: "" } : a));
      return;
    }
    try {
      const r = await lugarDesdePunto(punto, mapboxToken);
      if (version !== versionPin.current) return;
      setDraft((a) => (a && a.punto === punto ? { ...a, direccion: r?.direccion ?? "", ciudad: r?.ciudad ?? a.ciudad } : a));
    } catch {
      if (version === versionPin.current) setDraft((a) => (a && a.punto === punto ? { ...a, direccion: "" } : a));
    }
  }

  function elegirLugarLista(l: LugarResumen) {
    marcarTocado();
    setPanelAgregar(false);
    setErrorAgregar(null);
    setAvisoPublico(null);
    setDraft({ origen: "lugar", nombre: l.nombre, direccion: l.direccion ?? "", punto: { lat: l.lat, lng: l.lng }, lugarId: l.id, privado: l.privado === true, editable: false, ciudad: null });
    setQ("");
  }

  async function elegirMapbox(item: LugarSugerido) {
    const { mapboxToken } = configPublica();
    if (!mapboxToken) return;
    marcarTocado();
    setPanelAgregar(false);
    setErrorAgregar(null);
    setAvisoPublico(null);
    setBuscando(true);
    try {
      const r = await recuperarLugar(item.mapboxId, mapboxToken, sesion.current, consultarMapa);
      if (!r || !puntoValido(r)) throw new Error("Sin coordenadas");
      setDraft({ origen: "manual", nombre: item.esDireccion ? "" : item.nombre, direccion: r.direccion || item.direccion, punto: { lat: r.lat, lng: r.lng }, editable: true, ciudad: r.ciudad });
      setQ("");
    } catch {
      setErrorBusqueda("No pude ubicar esa opción. Busca de nuevo o toca el mapa.");
    } finally {
      setBuscando(false);
    }
  }

  function estoyAquiClick() {
    onEstoyAqui((p) => {
      setPanelAgregar(false);
      setErrorAgregar(null);
      setAvisoPublico(null);
      void moverPin(p);
    });
  }

  function abrirAgregar() {
    if (!draft?.punto) void moverPin(contexto.centro, q.trim() || undefined);
    setNombreAgregar(q.trim() || draft?.nombre || "");
    setPrivadoAgregar(false);
    setErrorAgregar(null);
    setAvisoPublico(null);
    setPanelAgregar(true);
    setCerradaParaTexto(q);
  }

  async function guardarAgregar() {
    if (!nombreAgregar.trim() || !draft?.punto) return;
    const punto = draft.punto;
    const direccionActual = draft.direccion === "Ubicando…" ? "" : draft.direccion;
    const { modo: destino, nombre, direccion } = decidirGuardado(privadoAgregar, nombreAgregar, direccionActual);
    marcarTocado();
    setGuardando(true);
    setErrorAgregar(null);
    setAvisoPublico(null);
    try {
      // Con privado o sin él, el lugar se registra (OL-179, founder 2026-09-24): la diferencia es si además, al
      // guardar el evento, se usa por `lugar_id` (normal) o como sitio reservado (privado de verdad).
      const r = await crearLugarDesdeEvento({ nombre, direccion, lat: punto.lat, lng: punto.lng, ciudad: draft.ciudad ?? contexto.ciudad.nombre, volverA, privado: destino === "privado" });
      if (!r.ok) {
        setErrorAgregar(r.error);
        return;
      }
      const existente = lugares.find((l) => l.id === r.id);
      const tipo = deducirTipo(nombre) ?? "otro";
      const lugarResultante: LugarResumen = existente ?? { id: r.id, nombre, tipo, direccion, lat: punto.lat, lng: punto.lng, portada: null };
      if (destino === "privado" && !r.reutilizado) {
        // Privado de verdad: el evento se guarda como sitio reservado (como hoy), nunca por `lugar_id` -el lugar
        // recién creado solo queda ahí para reutilizarlo otro día ("¿Dónde es?" ya lo ofrece entre las sugerencias).
        setDraft({ origen: "manual", nombre, direccion, punto, editable: true, ciudad: draft.ciudad, reservado: true });
      } else {
        // Sin privado, o con privado pero ya existía como lugar público (lugares_parecidos nunca ve privados: un
        // parecido encontrado aquí es siempre público): se usa como un lugar normal, y se avisa si tocaba privado.
        if (destino === "privado" && r.reutilizado) setAvisoPublico(`«${nombre}» ya existe como lugar público.`);
        setDraft({ origen: "lugar", nombre: lugarResultante.nombre, direccion: lugarResultante.direccion ?? "", punto: { lat: lugarResultante.lat, lng: lugarResultante.lng }, lugarId: lugarResultante.id, lugarNuevo: existente ? undefined : lugarResultante, editable: false, ciudad: null });
      }
      setPanelAgregar(false);
      setQ("");
    } catch {
      setErrorAgregar("No se pudo guardar el lugar. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  function atras() {
    onCerrar();
  }
  function listo() {
    if (!draft) {
      onCerrar();
      return;
    }
    if (draft.origen === "lugar" && draft.lugarId) {
      // Un lugar registrado privado (propio, de las sugerencias) rellena el evento como reservado, nunca por
      // `lugar_id`: solo su autor y la administración pueden verlo (OL-179, founder 2026-09-24).
      if (draft.privado) {
        onOtro({ ...otro, reservado: true, sitioTexto: draft.nombre.trim().slice(0, LIMITES_EVENTO.sitio), direccionPrivada: draft.direccion.slice(0, LIMITES_EVENTO.direccion), privadoPunto: draft.punto, sitioPunto: null, direccion: "", pinPendiente: false, ciudad: draft.ciudad }, false);
      } else {
        onLugar(draft.lugarId, draft.lugarNuevo);
      }
      onCerrar();
      return;
    }
    if (!tocado || !draft.punto || !draft.nombre.trim()) {
      onCerrar();
      return;
    }
    const reservado = !!draft.reservado;
    onOtro(
      {
        ...otro,
        reservado,
        sitioTexto: draft.nombre.trim().slice(0, LIMITES_EVENTO.sitio),
        pinPendiente: false,
        ciudad: draft.ciudad,
        ...(reservado
          ? { direccionPrivada: draft.direccion.slice(0, LIMITES_EVENTO.direccion), privadoPunto: draft.punto, sitioPunto: null, direccion: "" }
          : { direccion: draft.direccion.slice(0, LIMITES_EVENTO.direccion), sitioPunto: draft.punto, direccionPrivada: "", privadoPunto: null }),
      },
      false,
    );
    onCerrar();
  }

  const listoHabilitado = !panelAgregar && !!draft?.punto && (draft.origen === "lugar" || draft.nombre.trim().length > 0);

  // La barra sobre el teclado (variante B, doc 43 punto 5): `visualViewport` mide el área visible de verdad en
  // iOS; sin él (navegador que no lo da), se queda al pie -`altoTeclado` devuelve 0 en los dos casos sin teclado.
  const [bottomBarra, setBottomBarra] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    function medir() {
      setBottomBarra(altoTeclado(window.innerHeight, vv ? { height: vv.height, offsetTop: vv.offsetTop } : null));
    }
    medir();
    if (!vv) return;
    vv.addEventListener("resize", medir);
    vv.addEventListener("scroll", medir);
    return () => {
      vv.removeEventListener("resize", medir);
      vv.removeEventListener("scroll", medir);
    };
  }, []);
  const estoyAquiBottom = barraVisible ? bottomBarra + ALTO_BARRA_ACCIONES + 16 : 16;

  const textoAgregar = q.trim() ? `Agregar «${q.trim()}» como lugar` : "Agregar lugar";

  return (
    <div className={styles.capa} role="dialog" aria-label="¿Dónde es?">
      <div className={styles.cabecera}>
        <button type="button" className={styles.atras} onClick={atras}>
          <IconoChevronIzquierda width={18} height={18} />
          Atrás
        </button>
        <h2>¿Dónde es?</h2>
        <button type="button" className={styles.listo} onClick={listo} disabled={!listoHabilitado}>
          Listo
        </button>
      </div>
      <div className={styles.cuerpo}>
        <div className={styles.campo} ref={campoRef}>
          <IconoBuscar width={20} height={20} />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre o dirección"
            aria-label="Buscar el lugar"
            autoComplete="off"
            role="combobox"
            aria-expanded={listaAbierta}
            aria-controls="lista-donde-es"
            aria-autocomplete="list"
          />
          <Limpiar visible={!!q} />
        </div>
        <div className={styles.mapaLleno}>
          <MapaDondeEs
            lugares={lugares}
            seleccion={draft?.punto ?? null}
            centrarEn={contexto.centro}
            ciudad={contexto.ciudad}
            yo={yo}
            onLugar={(id) => {
              const l = lugares.find((x) => x.id === id);
              if (l) elegirLugarLista(l);
            }}
            onPoi={(nombre, p) => void moverPin(p, nombre)}
            onPunto={(p) => void moverPin(p)}
            onArrastre={(p) => void moverPin(p, undefined, true)}
          />
          <button type="button" className={styles.estoyAqui} style={{ bottom: estoyAquiBottom }} onClick={estoyAquiClick} disabled={ubicando} aria-label="Estoy aquí" title="Estoy aquí">
            <IconoUbicacion width={22} height={22} />
          </button>
          {modo === "inicial" && avisoUbicacion && <p className={styles.avisoUbicacion}>{avisoUbicacion}</p>}
          {modo === "inicial" && draft && (
            <div className={styles.resumen}>
              <IconoPin width={18} height={18} />
              {draft.editable ? (
                <input
                  type="text"
                  className={styles.nombreEditable}
                  value={draft.nombre}
                  onChange={(e) => {
                    marcarTocado();
                    setDraft((a) => (a ? { ...a, nombre: e.target.value } : a));
                  }}
                  maxLength={LIMITES_EVENTO.sitio}
                  placeholder="Nombre del lugar"
                  aria-label="Nombre del lugar"
                />
              ) : (
                <b>{draft.nombre}</b>
              )}
              <span className={styles.resumenDireccion}>{draft.direccion || (draft.punto ? "Ubicando…" : "")}</span>
              {ajustado && <span className={styles.notaAjuste}>Moviste el pin. Revisa que la dirección corresponda.</span>}
              {avisoPublico && <span className={styles.notaAjuste}>{avisoPublico}</span>}
            </div>
          )}
          <ListaFlotante abierta={listaAbierta} onCerrar={() => setCerradaParaTexto(q)} ancla={campoRef} dentro={[barraRef]} id="lista-donde-es" etiqueta="Lugares y direcciones">
            {modo === "resultados" &&
              combinados.map((r) =>
                r.tipo === "lugar" ? (
                  <li key={`l-${r.lugar.id}`}>
                    <button type="button" role="option" aria-selected={false} className={sug.renglon} onClick={() => elegirLugarLista(r.lugar)}>
                      <IconoPin width={20} height={20} />
                      <b>
                        {r.lugar.nombre}
                        {/* Un lugar privado propio (OL-179): entre las sugerencias, con una marca chica -solo lo
                            ve su autor, la política de lectura ya se lo dio a esta consulta. */}
                        {r.lugar.privado && <span className={styles.marcaPrivado}>Privado</span>}
                      </b>
                      <small>{r.lugar.direccion}</small>
                    </button>
                  </li>
                ) : (
                  <li key={`m-${r.item.mapboxId}`}>
                    <button type="button" role="option" aria-selected={false} className={sug.renglon} onClick={() => void elegirMapbox(r.item)}>
                      <IconoPin width={20} height={20} />
                      <b>{r.item.esDireccion ? q.trim() : r.item.nombre}</b>
                      <small>{[r.item.direccion, r.item.ciudad].filter(Boolean).join(" · ")}</small>
                    </button>
                  </li>
                ),
              )}
            {modo === "no-encontrado" && (
              <li className={styles.avisoNoEncontrado} role="status">
                <b>«{q.trim()}» no está registrado.</b>
                Agrégalo, o toca el mapa para ubicarlo.
              </li>
            )}
            {conTextoLargo && modo === "resultados" && buscando && (
              <li className={styles.avisoFlotante} role="status">
                Buscando…
              </li>
            )}
            {/* Con "no está registrado" ya dicho arriba, repetir el error de red no cabe ni hace falta (además
                de que los dos juntos podían alargar la lista hasta tapar la barra de acciones, medido con las
                capturas de esta pieza): el aviso de red solo se suma cuando SÍ hay resultados. */}
            {conTextoLargo && modo === "resultados" && errorBusqueda && (
              <li className={styles.avisoFlotante} role="alert">
                {errorBusqueda}
              </li>
            )}
          </ListaFlotante>
          {panelAgregar && (
            <div className={styles.panelAgregar}>
              <h3>Agregar lugar</h3>
              <label className={styles.campoPanel}>
                <span>Nombre</span>
                <input type="text" value={nombreAgregar} onChange={(e) => setNombreAgregar(e.target.value)} maxLength={LIMITES_EVENTO.sitio} placeholder="Nombre del lugar" aria-label="Nombre del lugar nuevo" autoFocus />
              </label>
              <label className={styles.campoPanel}>
                <span>Dirección</span>
                <p className={styles.direccionFija}>{draft && draft.direccion !== "Ubicando…" ? draft.direccion || "Ajusta el pin en el mapa para fijar la dirección" : "Ubicando…"}</p>
              </label>
              <div className={styles.filaPrivado}>
                <div className={styles.textoPrivado}>
                  <b>Es un lugar privado</b>
                  <small>Solo tú lo ves; podrás volver a usarlo en otros eventos</small>
                </div>
                <button type="button" role="switch" aria-checked={privadoAgregar} aria-label="Lugar privado" className={styles.palanca} onClick={() => setPrivadoAgregar((v) => !v)} />
              </div>
              {errorAgregar && (
                <p className={styles.notaError} role="alert">
                  {errorAgregar}
                </p>
              )}
              <Boton type="button" onClick={() => void guardarAgregar()} disabled={!nombreAgregar.trim() || guardando}>
                {guardando ? "Guardando…" : "Guardar y usar este lugar"}
              </Boton>
            </div>
          )}
          {barraVisible && (
            // Un solo botón (founder, 2026-09-24: "en el paso anterior solo mostremos un botón de agregar"): el
            // mapa ya se puede tocar siempre, sin un botón aparte para "buscar sin agregar" (el aviso lo dice).
            <div ref={barraRef} className={styles.barraAcciones} style={{ bottom: bottomBarra }}>
              <button type="button" className={styles.accionAgregar} onClick={abrirAgregar}>
                <IconoMas width={18} height={18} />
                <span>{textoAgregar}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
