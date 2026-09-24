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
import { altoTeclado, combinarResultados, decidirGuardado, direccionAGuardar, modoDePantalla, puedeGuardarLugar } from "./dondeEsPantalla";
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
 * "¿Dónde es?" del alta de evento, a pantalla completa (OL-173, docs/rediseno/43; lugar privado de OL-179; hoja
 * "Agregar lugar" sin punto inventado, OL-182): el mapa de fondo, un solo campo "Nombre o dirección" y los
 * lugares registrados como pines tocables (los privados propios entre ellos, marcados "Privado"). Escribir abre
 * una lista flotante (nunca tapa nada, y nunca tapa la barra de acciones: `reservaAbajo`, OL-182); tocar un pin,
 * un punto de interés del mapa o cualquier punto vacío mueve el pin; arrastrarlo hace reverse geocoding. Sin
 * coincidencias, la barra de acciones muestra un solo botón, "Agregar lugar" (founder, 2026-09-24: "en el paso
 * anterior solo mostremos un botón de agregar"; antes había un segundo botón, "Buscar en el mapa sin agregar" -el
 * mapa siempre se puede tocar, el aviso lo dice).
 *
 * "Agregar lugar" abre una HOJA a media pantalla, pegada abajo (OL-182: el founder encontró en producción que el
 * panel anterior inventaba un pin en silencio -`moverPin(contexto.centro…)`- y guardaba una ubicación que nadie
 * eligió). Esta hoja NUNCA inventa un punto: dentro, el campo "Dirección" (con las mismas sugerencias que el
 * campo principal) es una tercera manera de fijarlo, además de tocar/arrastrar el pin en el mapa -que queda
 * visible arriba, nunca tapado (`MapaDondeEs` recibe `paddingInferior`)- y del botón "Estoy aquí" -que queda
 * SIEMPRE encima de la hoja, nunca debajo-. "Guardar y usar este lugar" está apagado mientras no haya un punto de
 * verdad (`puedeGuardarLugar`), con el porqué en texto chico debajo. Si las sugerencias de dirección necesitan
 * abrir y no hay sitio abajo (el campo queda bajo, pegado sobre el teclado), la propia hoja se estira y se
 * desplaza para dejarle sitio -la lista NUNCA abre encima del campo que se está usando (regla dura del founder,
 * 2026-09-24: "si sugieres algo sea debajo del campo que estoy usando").
 *
 * Registra un lugar de verdad -privado o no-; con privado, el evento se guarda como sitio reservado (nombre
 * visible, dirección oculta hasta la hora que toque), igual que si se elige un lugar privado ya registrado de las
 * sugerencias. "Listo" confirma y vuelve al formulario; "Atrás" no cambia nada (todo vive en el estado local de
 * esta hoja, no se avisa al padre hasta Listo).
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
  // El campo "Dirección" DENTRO de la hoja "Agregar lugar" (OL-182): mismo patrón que el campo principal (texto,
  // resultados de Mapbox, "cerrada para este texto"), pero solo direcciones/POIs -sin lugares registrados: ya se
  // descartó que coincidiera nada al abrir esta hoja, mezclar lugares aquí confundiría con el campo de arriba.
  const [qDireccionAgregar, setQDireccionAgregar] = useState("");
  const [resultadosDireccionAgregar, setResultadosDireccionAgregar] = useState<LugarSugerido[]>([]);
  const [buscandoDireccion, setBuscandoDireccion] = useState(false);
  const [errorBusquedaDireccion, setErrorBusquedaDireccion] = useState<string | null>(null);
  const [cerradaDireccionParaTexto, setCerradaDireccionParaTexto] = useState<string | null>(null);
  // Alto real de la hoja (con ResizeObserver: cambia con el contenido -el aviso de error, la propia expansión al
  // abrir las sugerencias de dirección-), para que "Estoy aquí" quede siempre encima de ella y el mapa reciba el
  // `paddingInferior` exacto que le hace falta para no tapar el pin (OL-182).
  const [altoHoja, setAltoHoja] = useState(0);
  const campoRef = useRef<HTMLDivElement>(null);
  // La barra de acciones vive fuera del campo y de la lista flotante: sin esto, su propio "tocar fuera" (gestor,
  // revisión de OL-179, bitácora 214) la cerraba con el mousedown del propio botón "Agregar", antes de que le
  // llegara el click.
  const barraRef = useRef<HTMLDivElement>(null);
  const hojaRef = useRef<HTMLDivElement>(null);
  const campoDireccionRef = useRef<HTMLDivElement>(null);
  const campoDireccionWrapRef = useRef<HTMLLabelElement>(null);
  const sesion = useRef("");
  const sesionDireccion = useRef("");
  const versionPin = useRef(0);
  const versionBusqueda = useRef(0);
  const versionBusquedaDireccion = useRef(0);
  useEffect(() => {
    sesion.current = crypto.randomUUID();
    sesionDireccion.current = crypto.randomUUID();
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

  // La misma búsqueda, para el campo "Dirección" de la hoja "Agregar lugar" (OL-182): mismo mecanismo
  // (buscarConContexto/sugerirLugares), su propia sesión de Mapbox. "Ubicando…" (lo que deja moverPin mientras
  // resuelve el reverse geocoding) nunca dispara una búsqueda -no es texto que la persona haya escrito.
  useEffect(() => {
    const texto = qDireccionAgregar.trim();
    if (texto.length < 3 || texto === "Ubicando…") return;
    const { mapboxToken } = configPublica();
    const version = ++versionBusquedaDireccion.current;
    const timer = setTimeout(async () => {
      setBuscandoDireccion(true);
      setErrorBusquedaDireccion(null);
      try {
        if (!mapboxToken) throw new Error("Sin servicio de direcciones");
        const opciones = await buscarConContexto(
          texto,
          contexto,
          (t, bbox) => sugerirLugares(t, mapboxToken, contexto.centro, sesionDireccion.current, consultarMapa, bbox).then((r) => descartarSinCalle(r, texto)),
          (r) => necesitaReintentoLugares(r.map((o) => o.distanciaM)),
        );
        if (version === versionBusquedaDireccion.current) setResultadosDireccionAgregar(opciones);
      } catch {
        if (version === versionBusquedaDireccion.current) setErrorBusquedaDireccion("No pude buscar. Intenta de nuevo o toca el mapa.");
      } finally {
        if (version === versionBusquedaDireccion.current) setBuscandoDireccion(false);
      }
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDireccionAgregar, contexto.origen, contexto.ciudad.slug]);

  const textoBusqueda = q.trim();
  const conTextoLargo = textoBusqueda.length >= 3;
  const lugaresFiltrados = textoBusqueda ? lugaresPorTexto(lugares, q) : [];
  const combinados = combinarResultados(lugaresFiltrados, conTextoLargo ? resultadosMapbox : []);
  const modo = modoDePantalla(q, panelAgregar, combinados.length > 0);
  const listaAbierta = (modo === "resultados" || modo === "no-encontrado") && !listaCerradaActual;
  const barraVisible = (modo === "resultados" || modo === "no-encontrado") && !listaCerradaActual;

  const textoDireccionAgregar = qDireccionAgregar.trim();
  const conTextoLargoDireccion = textoDireccionAgregar.length >= 3;
  // Mismas dos fuentes que el campo principal (lugares registrados + Mapbox, `combinarResultados`): elegir un
  // lugar registrado aquí no cambia de modo -"Agregar lugar" sigue igual-, solo toma su punto y su dirección,
  // igual que una dirección o un POI de Mapbox (docs/rediseno/43, segunda versión: "sugerencias de direcciones y
  // POIs, como el campo de arriba").
  const lugaresFiltradosDireccion = textoDireccionAgregar ? lugaresPorTexto(lugares, qDireccionAgregar) : [];
  const combinadosDireccion = combinarResultados(lugaresFiltradosDireccion, conTextoLargoDireccion ? resultadosDireccionAgregar : []);
  const listaDireccionCerradaActual = cerradaDireccionParaTexto === qDireccionAgregar;
  const listaDireccionAbierta = panelAgregar && combinadosDireccion.length > 0 && !listaDireccionCerradaActual;

  /** Mueve el pin a cualquier punto: se escriba el nombre a mano o venga de un POI, y reverse geocoding para la
   *  dirección. También refleja el resultado en el campo "Dirección" de la hoja "Agregar lugar" si está abierta
   *  -las tres maneras de fijar el punto (dirección, mapa, "Estoy aquí") terminan en el mismo lugar (OL-182). */
  async function moverPin(punto: Punto, nombreFijo?: string, esArrastre = false) {
    marcarTocado();
    setAjustado(esArrastre);
    setAvisoPublico(null);
    const version = ++versionPin.current;
    setDraft((actual) => ({ origen: "manual", nombre: nombreFijo ?? (actual?.editable ? actual.nombre : ""), direccion: "Ubicando…", punto, editable: true, ciudad: actual?.editable ? actual.ciudad : null }));
    setQDireccionAgregar("Ubicando…");
    setCerradaDireccionParaTexto("Ubicando…");
    const { mapboxToken } = configPublica();
    if (!mapboxToken) {
      if (version === versionPin.current) {
        setDraft((a) => (a && a.punto === punto ? { ...a, direccion: "" } : a));
        setQDireccionAgregar("");
        setCerradaDireccionParaTexto("");
      }
      return;
    }
    try {
      const r = await lugarDesdePunto(punto, mapboxToken);
      if (version !== versionPin.current) return;
      const direccionResuelta = r?.direccion ?? "";
      setDraft((a) => (a && a.punto === punto ? { ...a, direccion: direccionResuelta, ciudad: r?.ciudad ?? a.ciudad } : a));
      setQDireccionAgregar(direccionResuelta);
      setCerradaDireccionParaTexto(direccionResuelta);
    } catch {
      if (version === versionPin.current) {
        setDraft((a) => (a && a.punto === punto ? { ...a, direccion: "" } : a));
        setQDireccionAgregar("");
        setCerradaDireccionParaTexto("");
      }
    }
  }

  /** Fija el pin y la dirección desde el campo "Dirección" de la hoja, sin tocar el nombre (el de la hoja es un
   *  campo aparte, `nombreAgregar`) ni el resto del "Agregar lugar" en curso -elegir aquí un lugar YA registrado
   *  solo presta su punto y su dirección, igual que una dirección o un POI de Mapbox; no cambia de modo ni de
   *  nombre (eso sería `elegirLugarLista`, para el campo de arriba). */
  function fijarPuntoDesdeDireccion(punto: Punto, direccion: string, ciudad: string | null) {
    marcarTocado();
    setAvisoPublico(null);
    setDraft((a) => (a ? { ...a, origen: "manual", punto, direccion, ciudad } : { origen: "manual", nombre: nombreAgregar, direccion, punto, editable: true, ciudad }));
    setQDireccionAgregar(direccion);
    setCerradaDireccionParaTexto(direccion);
  }

  function elegirDireccionLugar(l: LugarResumen) {
    fijarPuntoDesdeDireccion({ lat: l.lat, lng: l.lng }, l.direccion ?? "", null);
  }

  async function elegirDireccionMapbox(item: LugarSugerido) {
    const { mapboxToken } = configPublica();
    if (!mapboxToken) return;
    marcarTocado();
    setBuscandoDireccion(true);
    try {
      const r = await recuperarLugar(item.mapboxId, mapboxToken, sesionDireccion.current, consultarMapa);
      if (!r || !puntoValido(r)) throw new Error("Sin coordenadas");
      fijarPuntoDesdeDireccion({ lat: r.lat, lng: r.lng }, r.direccion || item.direccion, r.ciudad);
    } catch {
      setErrorBusquedaDireccion("No pude ubicar esa opción. Busca de nuevo o toca el mapa.");
    } finally {
      setBuscandoDireccion(false);
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

  /** "Estoy aquí": SIEMPRE fija el punto en el mismo lugar (draft) tanto si la hoja "Agregar lugar" está abierta
   *  (una de sus tres maneras de fijar el punto, sin cerrarla) como si no (el resumen de la pantalla principal). */
  function estoyAquiClick() {
    onEstoyAqui((p) => {
      setErrorAgregar(null);
      setAvisoPublico(null);
      void moverPin(p);
    });
  }

  /** Abre la hoja "Agregar lugar" (OL-182): NUNCA inventa un punto -antes movía el pin en silencio al centro de
   *  contexto y guardaba esa ubicación sin que nadie la eligiera, el defecto que reportó el founder en
   *  producción-. Si ya había un punto puesto a mano (un POI, el mapa, "Estoy aquí"), se conserva tal cual -la
   *  hoja abre con "Guardar" ya encendido-; si el "draft" era un lugar YA REGISTRADO (otro lugar, no uno nuevo),
   *  no tiene sentido heredar su pin para uno nuevo: se limpia y la hoja abre sin punto. */
  function abrirAgregar() {
    if (draft?.origen === "lugar") setDraft(null);
    setNombreAgregar(q.trim() || draft?.nombre || "");
    setQDireccionAgregar(draft?.origen === "manual" && draft.direccion !== "Ubicando…" ? draft.direccion : "");
    setCerradaDireccionParaTexto(null);
    setPrivadoAgregar(false);
    setErrorAgregar(null);
    setErrorBusquedaDireccion(null);
    setAvisoPublico(null);
    setPanelAgregar(true);
    setCerradaParaTexto(q);
  }

  async function guardarAgregar() {
    const punto = draft?.punto ?? null;
    // Botón apagado mientras no haya punto (OL-182): esta comprobación es la misma que ya deshabilita el botón
    // (`puedeGuardarLugar`), por si acaso llega a llamarse de otro modo -nunca se guarda un punto inventado.
    if (!draft || !punto || !puedeGuardarLugar({ nombre: nombreAgregar, punto })) return;
    // La persona puede haber corregido a mano el campo "Dirección" sin volver a elegir una sugerencia (el doc 43
    // lo da como editable): eso manda sobre la dirección ya resuelta -antes se perdía (gestor, revisión de esta
    // pieza).
    const direccionActual = direccionAGuardar(qDireccionAgregar, draft.direccion === "Ubicando…" ? "" : draft.direccion);
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
  // Alto real de la hoja "Agregar lugar" (ResizeObserver: cambia con el error, o al expandirse para dejarle
  // sitio a las sugerencias de dirección) -para que el mapa reciba el `paddingInferior` justo y "Estoy aquí"
  // quede siempre encima, nunca debajo (OL-182, doc 43 segunda versión).
  useEffect(() => {
    // Sin la hoja abierta no hay nada que medir; el valor viejo de `altoHoja` no se usa en ningún lado mientras
    // `panelAgregar` es falso (estoyAquiBottom y el padding del mapa lo comprueban), así que no hace falta
    // resetearlo aquí -evita un setState síncrono dentro del cuerpo del efecto.
    if (!panelAgregar) return;
    const el = hojaRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entradas) => setAltoHoja(entradas[0]?.contentRect.height ?? 0));
    ro.observe(el);
    return () => ro.disconnect();
  }, [panelAgregar]);

  // Cuando las sugerencias de dirección necesitan abrir y no hay sitio abajo del campo (pegado sobre el teclado),
  // la propia hoja se estira hacia arriba (clase .expandida, CSS) y se desplaza por dentro para que el campo
  // "Dirección" quede arriba del todo: así SIEMPRE hay sitio libre debajo y la lista nunca abre encima del campo
  // que se está usando (regla dura del founder, 2026-09-24: "si sugieres algo sea debajo del campo que estoy
  // usando"; corrección pedida por el gestor sobre la primera entrega del prototipo de esta pieza).
  useEffect(() => {
    if (!listaDireccionAbierta) return;
    const hoja = hojaRef.current;
    const campo = campoDireccionWrapRef.current;
    if (!hoja || !campo) return;
    hoja.scrollTop = Math.max(0, campo.offsetTop - 10);
  }, [listaDireccionAbierta]);

  // Con la hoja estirada (sugerencias de dirección abiertas), el mapa queda casi tapado y "Estoy aquí" no sirve
  // ahí -se oculta (gestor, revisión de OL-182): sin esto, con `altoHoja` grande se montaba sobre el propio campo
  // "Nombre o dirección" de arriba (ese `bottom` empuja el botón por ENCIMA del alto entero de `.mapaLleno`, que
  // no tiene `overflow: hidden`, hacia donde vive el campo). Fuera de ese caso, un tope defensivo con `min()`
  // -nunca más de calc(100% - 64px) del propio `.mapaLleno`- para que tampoco se monte ahí si la hoja compacta
  // creciera de más por un error largo.
  const estoyAquiOculto = listaDireccionAbierta;
  const estoyAquiBottomPx = panelAgregar ? bottomBarra + altoHoja + 16 : barraVisible ? bottomBarra + ALTO_BARRA_ACCIONES + 16 : 16;
  const estoyAquiBottom = estoyAquiBottomPx > 16 ? `min(${estoyAquiBottomPx}px, calc(100% - 64px))` : `${estoyAquiBottomPx}px`;

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
            paddingInferior={panelAgregar ? altoHoja + 12 : 0}
            onLugar={(id) => {
              const l = lugares.find((x) => x.id === id);
              if (l) elegirLugarLista(l);
            }}
            onPoi={(nombre, p) => void moverPin(p, nombre)}
            onPunto={(p) => void moverPin(p)}
            onArrastre={(p) => void moverPin(p, undefined, true)}
          />
          {!estoyAquiOculto && (
            <button type="button" className={styles.estoyAqui} style={{ bottom: estoyAquiBottom }} onClick={estoyAquiClick} disabled={ubicando} aria-label="Estoy aquí" title="Estoy aquí">
              <IconoUbicacion width={22} height={22} />
            </button>
          )}
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
          <ListaFlotante
            abierta={listaAbierta}
            onCerrar={() => setCerradaParaTexto(q)}
            ancla={campoRef}
            dentro={[barraRef]}
            id="lista-donde-es"
            etiqueta="Lugares y direcciones"
            reservaAbajo={barraVisible ? ALTO_BARRA_ACCIONES + 8 : undefined}
          >
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
            // Hoja "Agregar lugar" a media pantalla, pegada abajo -sobre el teclado cuando lo hay, mismo mecanismo
            // que la barra- dejando el mapa (y el pin, con `paddingInferior`) siempre visibles arriba (OL-182). Con
            // las sugerencias de dirección abiertas, ".expandida" la estira y el efecto de arriba la desplaza para
            // que el campo "Dirección" quede al ras de arriba: así la lista SIEMPRE tiene sitio debajo.
            <div ref={hojaRef} className={listaDireccionAbierta ? `${styles.hojaAgregar} ${styles.expandida}` : styles.hojaAgregar} style={{ bottom: bottomBarra }} role="group" aria-label="Agregar lugar">
              <div className={styles.asaHoja} aria-hidden="true" />
              <h3>Agregar lugar</h3>
              <label className={styles.campoPanel}>
                <span>Nombre</span>
                <input type="text" value={nombreAgregar} onChange={(e) => setNombreAgregar(e.target.value)} maxLength={LIMITES_EVENTO.sitio} placeholder="Nombre del lugar" aria-label="Nombre del lugar nuevo" autoFocus />
              </label>
              <label className={styles.campoPanel} ref={campoDireccionWrapRef}>
                <span>Dirección</span>
                <div className={styles.campoDireccion} ref={campoDireccionRef}>
                  <IconoBuscar width={18} height={18} />
                  <input
                    type="text"
                    value={qDireccionAgregar}
                    onChange={(e) => setQDireccionAgregar(e.target.value)}
                    placeholder="Busca la dirección"
                    aria-label="Dirección del lugar nuevo"
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={listaDireccionAbierta}
                    aria-controls="lista-direccion-agregar"
                  />
                </div>
              </label>
              <ListaFlotante
                abierta={listaDireccionAbierta}
                onCerrar={() => setCerradaDireccionParaTexto(qDireccionAgregar)}
                ancla={campoDireccionRef}
                id="lista-direccion-agregar"
                etiqueta="Direcciones"
                reservaAbajo={0}
              >
                {combinadosDireccion.map((r) =>
                  r.tipo === "lugar" ? (
                    <li key={`dl-${r.lugar.id}`}>
                      <button type="button" role="option" aria-selected={false} className={sug.renglon} onClick={() => elegirDireccionLugar(r.lugar)}>
                        <IconoPin width={20} height={20} />
                        <b>
                          {r.lugar.nombre}
                          {r.lugar.privado && <span className={styles.marcaPrivado}>Privado</span>}
                        </b>
                        <small>{r.lugar.direccion}</small>
                      </button>
                    </li>
                  ) : (
                    <li key={`dm-${r.item.mapboxId}`}>
                      <button type="button" role="option" aria-selected={false} className={sug.renglon} onClick={() => void elegirDireccionMapbox(r.item)}>
                        <IconoPin width={20} height={20} />
                        <b>{r.item.esDireccion ? textoDireccionAgregar : r.item.nombre}</b>
                        <small>{[r.item.direccion, r.item.ciudad].filter(Boolean).join(" · ")}</small>
                      </button>
                    </li>
                  ),
                )}
                {buscandoDireccion && (
                  <li className={styles.avisoFlotante} role="status">
                    Buscando…
                  </li>
                )}
                {errorBusquedaDireccion && (
                  <li className={styles.avisoFlotante} role="alert">
                    {errorBusquedaDireccion}
                  </li>
                )}
              </ListaFlotante>
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
              <Boton type="button" onClick={() => void guardarAgregar()} disabled={!puedeGuardarLugar({ nombre: nombreAgregar, punto: draft?.punto ?? null }) || guardando}>
                {guardando ? "Guardando…" : "Guardar y usar este lugar"}
              </Boton>
              {/* La ayuda de qué falta va debajo del botón, nunca dentro (canon de formularios, OL-100) -y solo
                  habla de la ubicación: el nombre ya llega prellenado con lo escrito, rara vez falta. */}
              {!draft?.punto && <p className={styles.ayudaGuardar}>Falta la ubicación: busca la dirección, toca el mapa o usa «Estoy aquí».</p>}
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
