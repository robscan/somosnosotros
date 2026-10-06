"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import Limpiar from "@/components/ui/Limpiar";
import { IconoBuscar, IconoCandado, IconoChevronIzquierda, IconoMas, IconoPin, IconoUbicacion } from "@/components/ui/Iconos";
import ListaFlotante from "@/components/ui/ListaFlotante";
import Palanca from "@/components/ui/Palanca";
import renglon from "@/components/ui/Renglon.module.css";
import sug from "@/components/ui/Sugerencia.module.css";
import { crearLugarDesdeEvento } from "@/app/lugares/acciones";
import { altoTeclado, combinarResultados, consultarMapa, deducirTipo, lugaresPorTexto, modoDePantalla, puntoValido, recuperarLugar, sugerirLugares, type LugarSugerido, type ResultadoBusqueda } from "@/lib/buscarLugares";
import { ciudadParaPunto, type Ciudad } from "@/lib/ciudad";
import { configPublica } from "@/lib/config";
import { buscarConContexto, descartarSinCalle, necesitaReintentoLugares } from "@/lib/direccionContexto";
import { LIMITES_EVENTO, type ModoSitio, type OtroSitio } from "@/lib/eventos";
import type { Punto } from "@/lib/geo";
import { lugarDesdePunto } from "@/lib/geocodificar";
import {
  borradorDeEvento,
  borradorDeLugar,
  coincidenciaClara,
  contextoDondeEsta,
  decidirGuardado,
  direccionAGuardar,
  lugarCercano,
  necesitaConfirmarDireccion,
  puedeGuardarLugar,
  puedeListo,
  resultadosDondeEsta,
  textoInicialBusqueda,
  textoListo,
  type Borrador,
  type ParaQue,
} from "@/lib/hojaDonde";
import { hrefLugar, type LugarResumen } from "@/lib/lugares";
import { ubicacionCercanaFresca } from "@/lib/ubicacion";
import MapaDondeEs from "./MapaDondeEs";
import { PiePaso } from "./PorPasos";
import styles from "./HojaDonde.module.css";

/** Lo que las dos hojas piden igual. */
type Comun = {
  /** Lugares registrados y visibles (los privados propios entre ellos): sus pines en el mapa y sus sugerencias. */
  lugares: LugarResumen[];
  /** La persona en el mapa (punto azul), si ya se ubicó. */
  yo: (Punto & { vez: number }) | null;
  ubicando: boolean;
  avisoUbicacion: string | null;
  onEstoyAqui: (poner: (p: Punto) => void) => void;
  onCerrar: () => void;
  /** La ciudad elegida (chip): una pista más para que Mapbox no busque en todo el país cuando todavía no hay pin ni posición. */
  ciudadContexto?: Ciudad | null;
  /** Se abrió con el «Estoy aquí» del renglón: lo primero que hace es leer la ubicación y poner ahí el pin. */
  ubicarme?: boolean;
};

/** El sitio de un evento: un lugar registrado, o un pin suelto con su nombre (público o reservado). */
type ParaEvento = {
  para: "evento";
  modoSitio: ModoSitio;
  lugarId: string;
  otro: OtroSitio;
  /** El registro de un lugar es en línea (docs/rediseno/43), sin salir de la pantalla: se usa como `siguiente` al crear el lugar,
   *  solo para que la acción de servidor nunca redirija (siempre hay una ruta interna que la satisface). */
  volverA: string;
  /** `nuevo` llega con el lugar recién creado en esta misma hoja (aún no está en `lugares`, que es del primer pintado de la
   *  página): quien llama lo agrega a su lista para que el renglón «Dónde» lo encuentre. */
  onLugar: (id: string, nuevo?: LugarResumen) => void;
  onOtro: (o: OtroSitio, desdePin?: boolean) => void;
  onGesto: () => void;
};

/** El punto de un lugar: aquí los lugares registrados nunca se eligen (se está creando o corrigiendo ESTE), solo avisan «ya existe». */
type ParaLugar = {
  para: "lugar";
  /** El nombre ya escrito en el formulario, para adelantar la primera búsqueda al entrar por «Buscar». */
  nombreForm: string;
  /** Con foco en el campo (se entró por «Buscar»); sin foco, se entró por «Cambiar» (ya hay ubicación). */
  conFoco: boolean;
  punto: Punto | null;
  direccion: string;
  ciudad: string;
  onListo: (v: { punto: Punto; direccion: string; ciudad: string | null }) => void;
};

type Props = Comun & (ParaEvento | ParaLugar);

const TITULO: Record<ParaQue, string> = { evento: "¿Dónde es?", lugar: "¿Dónde está?" };

/** El alto real de un elemento (con su relleno): el pie de abajo y la barra «Agregar» cambian con la zona segura y con el texto, y la
 *  lista flotante y «Estoy aquí» tienen que quedar encima de ellos. Sin el elemento a la vista (`activo` falso), 0. */
function useAlto(ref: RefObject<HTMLElement | null>, activo: boolean): number {
  const [alto, setAlto] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!activo || !el) return;
    const ro = new ResizeObserver(() => setAlto(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, activo]);
  return activo ? alto : 0;
}

/**
 * La hoja «Dónde» a pantalla completa, la misma para fijar el sitio de un evento («¿Dónde es?», OL-173, docs/rediseno/43; lugar
 * privado de OL-179; «Agregar lugar» sin punto inventado, OL-182) y el punto de un lugar («¿Dónde está?», OL-211): el mapa de
 * fondo, un solo campo «Nombre o dirección» y los lugares registrados como pines tocables (los privados propios entre ellos,
 * marcados «Privado»). Escribir abre una lista flotante (nunca tapa nada, y nunca tapa la barra de acciones: `reservaAbajo`,
 * OL-182); tocar un pin, un punto de interés del mapa o cualquier punto vacío mueve el pin; arrastrarlo hace reverse
 * geocoding; «Estoy aquí» lo pone donde está la persona. «Listo» confirma y vuelve al formulario; «Atrás» no cambia nada
 * (todo vive en el estado local de esta hoja, no se avisa al padre hasta «Listo»). «Listo» vive en el pie, pegado abajo como el de
 * los pasos del alta (`PiePaso`; OL-303, founder 2026-10-05: el botón de confirmar va abajo, no arriba): dice «Falta el lugar» y está
 * apagado mientras no haya sitio (`textoListo`), y sube con el teclado. Nunca inventa una ubicación (OL-182).
 *
 * Solo cambian tres cosas (`ParaQue`, lib/hojaDonde): en un evento tocar un lugar registrado lo elige, el sitio lleva nombre
 * y se puede registrar un lugar nuevo ahí mismo; en un lugar, tocarlo solo avisa «ya existe» y lleva a su ficha (founder,
 * OL-211: «sirven para avisar, no para elegirlos»), y el nombre vive en el formulario de fuera.
 *
 * «Agregar lugar» (solo en el evento) abre una HOJA a media pantalla, pegada abajo (OL-182: el founder encontró en producción
 * que el panel anterior inventaba un pin en silencio y guardaba una ubicación que nadie eligió). Esta hoja NUNCA inventa un
 * punto: dentro, el campo «Dirección» (con las mismas sugerencias que el campo principal) es una tercera manera de fijarlo,
 * además de tocar/arrastrar el pin en el mapa -que queda visible arriba, nunca tapado (`MapaDondeEs` recibe
 * `paddingInferior`)- y del botón «Estoy aquí» -que queda SIEMPRE encima de la hoja, nunca debajo-. «Guardar y usar este
 * lugar» está apagado mientras no haya un punto de verdad (`puedeGuardarLugar`), con el porqué en texto chico debajo. Si las
 * sugerencias de dirección necesitan abrir y no hay sitio abajo (el campo queda bajo, pegado sobre el teclado), la propia hoja
 * se estira y se desplaza para dejarle sitio -la lista NUNCA abre encima del campo que se está usando (regla dura del
 * founder, 2026-09-24: «si sugieres algo sea debajo del campo que estoy usando»)-. Registra un lugar de verdad -privado o
 * no-; con privado, el evento se guarda como sitio reservado (nombre visible, dirección oculta hasta la hora que toque).
 *
 * El mapa es `MapaDondeEs`: esta pantalla necesita lugares tocables Y un pin que se mueve a cualquier punto A LA VEZ, algo que
 * `Mapa` no da junto.
 */
export default function HojaDonde(props: Props) {
  const { lugares, yo, ubicando, avisoUbicacion, onEstoyAqui, onCerrar, ciudadContexto = null, ubicarme = false } = props;
  const evento = props.para === "evento" ? props : null;
  const lugar = props.para === "lugar" ? props : null;

  // ---------- 1. Estado ----------
  const [borrador, setBorrador] = useState<Borrador | null>(() => {
    if (evento) return borradorDeEvento(evento.modoSitio, evento.lugarId, evento.otro, lugares);
    return lugar ? borradorDeLugar(lugar.punto, lugar.direccion, lugar.ciudad) : null;
  });
  // Nada se avisa al padre hasta «Listo» (doc 43: «Atrás no cambia nada»); `tocado` distingue «se reabrió con algo ya elegido
  // y no se tocó» («Listo» no debe pisar un sitio reservado existente) de un cambio de verdad. Solo en el evento.
  const [tocado, setTocado] = useState(false);
  const [ajustado, setAjustado] = useState(false);
  // Un lugar registrado tocado (su pin, o su renglón en la lista): solo un aviso «ya existe» con su ficha, nunca adopta su punto.
  // Se limpia en cuanto la persona vuelve a mover su propio pin (deja de ser lo último que tocó). Solo en el lugar.
  const [avisoTocado, setAvisoTocado] = useState<LugarResumen | null>(null);
  const [q, setQ] = useState(() => (lugar ? textoInicialBusqueda(lugar.nombreForm, !lugar.conFoco) : ""));
  // La lista/barra se cierra con un toque fuera (incluido el mapa, que siempre queda tocable) o Escape (ambos los resuelve
  // `ListaFlotante` con su «tocar fuera»), y vuelve a abrirse sola en cuanto el texto cambia: en vez de un booleano que un
  // efecto tendría que resetear, se guarda PARA QUÉ texto se cerró -así «cerrada» se deriva solo comparando con `q`, sin
  // useRef ni useEffect (react-hooks/refs).
  const [cerradaParaTexto, setCerradaParaTexto] = useState<string | null>(null);
  const [resultadosMapbox, setResultadosMapbox] = useState<LugarSugerido[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  // Lo de «Agregar lugar» (solo en el evento).
  const [panelAgregar, setPanelAgregar] = useState(false);
  const [nombreAgregar, setNombreAgregar] = useState("");
  const [privadoAgregar, setPrivadoAgregar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorAgregar, setErrorAgregar] = useState<string | null>(null);
  // Al pedir privado, si ya existe un lugar público parecido se usa ese (lugares_parecidos nunca ve privados: un parecido
  // siempre es público) y se avisa, en vez de tratarlo como privado (founder, 2026-09-24, OL-179).
  const [avisoPublico, setAvisoPublico] = useState<string | null>(null);
  // El campo «Dirección» DENTRO de la hoja «Agregar lugar» (OL-182): mismo patrón que el campo principal (texto, resultados de
  // Mapbox, «cerrada para este texto»), pero con sus propios resultados.
  const [qDireccionAgregar, setQDireccionAgregar] = useState("");
  const [resultadosDireccionAgregar, setResultadosDireccionAgregar] = useState<LugarSugerido[]>([]);
  const [buscandoDireccion, setBuscandoDireccion] = useState(false);
  const [errorBusquedaDireccion, setErrorBusquedaDireccion] = useState<string | null>(null);
  const [cerradaDireccionParaTexto, setCerradaDireccionParaTexto] = useState<string | null>(null);
  const campoRef = useRef<HTMLDivElement>(null);
  // La barra de acciones vive fuera del campo y de la lista flotante: sin esto, su propio «tocar fuera» (gestor, revisión de
  // OL-179, bitácora 214) la cerraba con el mousedown del propio botón «Agregar», antes de que le llegara el click.
  const barraRef = useRef<HTMLDivElement>(null);
  // El pie con «Listo»: se mide para que la lista flotante no lo tape (`reservaAbajo`).
  const pieRef = useRef<HTMLElement>(null);
  const hojaRef = useRef<HTMLDivElement>(null);
  const campoDireccionRef = useRef<HTMLDivElement>(null);
  const campoDireccionWrapRef = useRef<HTMLLabelElement>(null);
  const sesion = useRef("");
  const sesionDireccion = useRef("");
  const versionPin = useRef(0);
  const versionBusqueda = useRef(0);
  const versionBusquedaDireccion = useRef(0);
  // OL-187: si se abrió con una dirección ya leída (del cartel) pero sin punto, la primera búsqueda del campo principal es esa
  // misma dirección, disparada sola -en vez de esperar a que la persona la borre y la vuelva a escribir-. `direccionInicial`
  // recuerda CUÁL fue esa búsqueda (para no repetir el intento si la persona escribe algo distinto después);
  // `confirmarDireccion` se apaga en cuanto ese primer resultado llega, se use o no.
  const confirmarDireccion = useRef(!!evento && necesitaConfirmarDireccion(borrador));
  const direccionInicial = useRef(borrador?.direccion ?? "");
  useEffect(() => {
    sesion.current = crypto.randomUUID();
    sesionDireccion.current = crypto.randomUUID();
  }, []);
  useEffect(() => {
    if (confirmarDireccion.current && borrador) setQ(borrador.direccion);
    // Solo al montar: es la búsqueda que abre la hoja, no una que deba repetirse si `borrador` cambia después.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function marcarTocado() {
    evento?.onGesto();
    setTocado(true);
  }

  // Ciudad de contexto en cascada (mismo criterio que OL-100, docs/rediseno/26): el pin ya puesto manda; si no, el texto
  // escrito, la ciudad del chip o la posición cacheada del teléfono (nunca pedida aquí sin un toque: ya se pidió antes, en
  // Cercanos o en otra pantalla); San Luis Potosí de respaldo. Cálculo puro y barato: no hace falta useMemo.
  const posicionTelefono = ubicacionCercanaFresca();
  const contexto = contextoDondeEsta(borrador?.punto ?? null, q, ciudadContexto, yo, posicionTelefono);

  const listaCerradaActual = cerradaParaTexto === q;

  // ---------- 2. Búsqueda ----------
  // Búsqueda en Mapbox (Search Box: lugares y direcciones juntos), acotada a la ciudad de contexto y con el reintento
  // automático si el primer intento no trae nada cerca (buscarConContexto, ya construido en OL-100). Con menos de 3 letras no
  // se busca; lo que haya quedado de una búsqueda más larga se ignora al mostrar (abajo), así el efecto no necesita «limpiar»
  // nada por su cuenta cuando el texto se acorta.
  useEffect(() => {
    const texto = q.trim();
    if (texto.length < 3) return;
    const { mapboxToken } = configPublica();
    const version = ++versionBusqueda.current;
    const timer = setTimeout(async () => {
      setBuscando(true);
      setErrorBusqueda(null);
      let opciones: LugarSugerido[] = [];
      try {
        if (!mapboxToken) throw new Error("Sin servicio de direcciones");
        opciones = await buscarConContexto(
          texto,
          contexto,
          (t, bbox) => sugerirLugares(t, mapboxToken, contexto.centro, sesion.current, consultarMapa, bbox).then((r) => descartarSinCalle(r, texto)),
          (r) => necesitaReintentoLugares(r.map((o) => o.distanciaM)),
        );
        if (version === versionBusqueda.current) setResultadosMapbox(opciones);
      } catch {
        if (version === versionBusqueda.current) setErrorBusqueda("No pude buscar. Intenta de nuevo o toca el mapa.");
      } finally {
        if (version === versionBusqueda.current) {
          setBuscando(false);
          // OL-187: esta es la búsqueda automática de la dirección leída del cartel (nunca una que la persona haya vuelto a
          // escribir después: `direccionInicial` la fija una sola vez, al montar).
          if (confirmarDireccion.current && texto === direccionInicial.current) {
            confirmarDireccion.current = false;
            const claro = coincidenciaClara(combinarResultados(lugaresPorTexto(lugares, texto), opciones), direccionInicial.current);
            if (claro) void confirmarDireccionLeida(claro);
          }
        }
      }
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, contexto.origen, contexto.ciudad.slug]);

  // La misma búsqueda, para el campo «Dirección» de la hoja «Agregar lugar» (OL-182): mismo mecanismo
  // (buscarConContexto/sugerirLugares), su propia sesión de Mapbox. «Ubicando…» (lo que deja moverPin mientras resuelve el
  // reverse geocoding) nunca dispara una búsqueda -no es texto que la persona haya escrito.
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
  // Los lugares registrados que coinciden salen SIEMPRE, primero, tanto si Mapbox ya respondió como si no
  // (`resultadosDondeEsta`, corrección del gestor sobre el PR #249: no deben desaparecer cuando Mapbox responde).
  const combinados = resultadosDondeEsta(lugares, q, resultadosMapbox);
  const modo = modoDePantalla(q, panelAgregar, combinados.length > 0);
  const listaAbierta = (modo === "resultados" || modo === "no-encontrado") && !listaCerradaActual;
  const barraVisible = !!evento && listaAbierta;
  // «Agregar lugar» abierto trae su propio botón (Guardar): en ese modo el pie no se muestra.
  const pieVisible = !panelAgregar;
  const altoPie = useAlto(pieRef, pieVisible);
  // Alto real de la hoja «Agregar lugar», con su relleno (cambia con el contenido -el aviso de error, la propia expansión al abrir
  // las sugerencias de dirección-): «Estoy aquí» queda siempre encima de ella y el mapa recibe el `paddingInferior` exacto que le
  // hace falta para no tapar el pin (OL-182).
  const altoHoja = useAlto(hojaRef, panelAgregar);
  const altoBarra = useAlto(barraRef, barraVisible);

  const textoDireccionAgregar = qDireccionAgregar.trim();
  const conTextoLargoDireccion = textoDireccionAgregar.length >= 3;
  // Mismas dos fuentes que el campo principal (lugares registrados + Mapbox, `combinarResultados`): elegir un lugar registrado
  // aquí no cambia de modo -«Agregar lugar» sigue igual-, solo toma su punto y su dirección, igual que una dirección o un POI
  // de Mapbox (docs/rediseno/43, segunda versión: «sugerencias de direcciones y POIs, como el campo de arriba»).
  const lugaresFiltradosDireccion = textoDireccionAgregar ? lugaresPorTexto(lugares, qDireccionAgregar) : [];
  const combinadosDireccion = combinarResultados(lugaresFiltradosDireccion, conTextoLargoDireccion ? resultadosDireccionAgregar : []);
  const listaDireccionCerradaActual = cerradaDireccionParaTexto === qDireccionAgregar;
  const listaDireccionAbierta = panelAgregar && combinadosDireccion.length > 0 && !listaDireccionCerradaActual;

  // ---------- 3. El pin ----------
  /** Lo que se escribe en el campo «Dirección» de «Agregar lugar»: las tres maneras de fijar el punto (dirección, mapa, «Estoy
   *  aquí») terminan en el mismo lugar (OL-182). */
  function reflejarEnElPanel(direccion: string) {
    setQDireccionAgregar(direccion);
    setCerradaDireccionParaTexto(direccion);
  }

  /** Mueve el pin a cualquier punto: se escriba el nombre a mano o venga de un POI, y reverse geocoding para la dirección
   *  (nunca un punto inventado, regla de OL-182). También refleja el resultado en el campo «Dirección» de la hoja «Agregar
   *  lugar» si está abierta. */
  async function moverPin(punto: Punto, nombreFijo?: string, esArrastre = false) {
    marcarTocado();
    setAjustado(esArrastre);
    setAvisoPublico(null);
    setAvisoTocado(null);
    const version = ++versionPin.current;
    const editable = !!evento;
    setBorrador((actual) => ({ origen: "manual", nombre: nombreFijo ?? (actual?.editable ? actual.nombre : ""), direccion: "Ubicando…", punto, editable, ciudad: null }));
    reflejarEnElPanel("Ubicando…");
    const { mapboxToken } = configPublica();
    if (!mapboxToken) {
      if (version === versionPin.current) {
        setBorrador((a) => (a && a.punto === punto ? { ...a, direccion: "" } : a));
        reflejarEnElPanel("");
      }
      return;
    }
    try {
      const r = await lugarDesdePunto(punto, mapboxToken);
      if (version !== versionPin.current) return;
      const direccionResuelta = r?.direccion ?? "";
      setBorrador((a) => (a && a.punto === punto ? { ...a, direccion: direccionResuelta, ciudad: r?.ciudad ?? null } : a));
      reflejarEnElPanel(direccionResuelta);
    } catch {
      if (version === versionPin.current) {
        setBorrador((a) => (a && a.punto === punto ? { ...a, direccion: "" } : a));
        reflejarEnElPanel("");
      }
    }
  }

  async function elegirMapbox(item: LugarSugerido) {
    const { mapboxToken } = configPublica();
    if (!mapboxToken) return;
    marcarTocado();
    setPanelAgregar(false);
    setErrorAgregar(null);
    setAvisoPublico(null);
    setAvisoTocado(null);
    setAjustado(false);
    setBuscando(true);
    try {
      const r = await recuperarLugar(item.mapboxId, mapboxToken, sesion.current, consultarMapa);
      if (!r || !puntoValido(r)) throw new Error("Sin coordenadas");
      // Una dirección ubica, no nombra: solo un punto de interés le da nombre al sitio de un evento.
      setBorrador({ origen: "manual", nombre: evento && !item.esDireccion ? item.nombre : "", direccion: r.direccion || item.direccion, punto: { lat: r.lat, lng: r.lng }, editable: !!evento, ciudad: r.ciudad });
      setQ("");
    } catch {
      setErrorBusqueda("No pude ubicar esa opción. Busca de nuevo o toca el mapa.");
    } finally {
      setBuscando(false);
    }
  }

  /** Un lugar registrado (su pin, o su renglón en la lista): en un evento se elige; en un lugar solo avisa «ya existe». */
  function tocarRegistrado(l: LugarResumen) {
    if (!evento) {
      setAvisoTocado(l);
      // Cierra la lista (como cualquier toque de un renglón): sin esto el aviso quedaría tapado detrás de ella, ya que aquí no
      // hay ningún cambio de texto que la cierre sola (no se adopta el punto de este lugar).
      setCerradaParaTexto(q);
      return;
    }
    marcarTocado();
    setPanelAgregar(false);
    setErrorAgregar(null);
    setAvisoPublico(null);
    setBorrador({ origen: "lugar", nombre: l.nombre, direccion: l.direccion ?? "", punto: { lat: l.lat, lng: l.lng }, lugarId: l.id, privado: l.privado === true, editable: false, ciudad: null });
    setQ("");
  }

  /** «Estoy aquí»: SIEMPRE fija el punto en el mismo lugar (el borrador) tanto si la hoja «Agregar lugar» está abierta (una de
   *  sus tres maneras de fijar el punto, sin cerrarla) como si no (el resumen de la pantalla principal). */
  function estoyAquiClick() {
    onEstoyAqui((p) => {
      setErrorAgregar(null);
      setAvisoPublico(null);
      void moverPin(p);
    });
  }
  useEffect(() => {
    if (ubicarme) estoyAquiClick();
    // Solo al abrir: es el toque de «Estoy aquí» del renglón, no algo que deba repetirse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- 4. Lo de «Agregar lugar» (solo en el evento) ----------
  /** Fija el pin y la dirección desde el campo «Dirección» de la hoja, sin tocar el nombre (el de la hoja es un campo aparte,
   *  `nombreAgregar`) ni el resto del «Agregar lugar» en curso -elegir aquí un lugar YA registrado solo presta su punto y su
   *  dirección, igual que una dirección o un POI de Mapbox; no cambia de modo ni de nombre (eso sería `tocarRegistrado`, para
   *  el campo de arriba). */
  function fijarPuntoDesdeDireccion(punto: Punto, direccion: string, ciudad: string | null) {
    marcarTocado();
    setAvisoPublico(null);
    setBorrador((a) => (a ? { ...a, origen: "manual", punto, direccion, ciudad } : { origen: "manual", nombre: nombreAgregar, direccion, punto, editable: true, ciudad }));
    reflejarEnElPanel(direccion);
  }

  /** OL-187: la búsqueda automática de la dirección ya leída (del cartel) encontró UNA sola coincidencia clara. Reutiliza
   *  `fijarPuntoDesdeDireccion` -presta el punto y la dirección resuelta, nunca cambia el nombre ni el modo- porque el nombre ya
   *  es el correcto (lo trajo el cartel); adoptar aquí el nombre de un lugar registrado parecido sería sustituir en silencio lo
   *  que la persona ya vio y confirmó. Cierra el campo de búsqueda (que la abrió) al terminar. */
  async function confirmarDireccionLeida(r: ResultadoBusqueda) {
    if (r.tipo === "lugar") {
      fijarPuntoDesdeDireccion({ lat: r.lugar.lat, lng: r.lugar.lng }, r.lugar.direccion ?? "", null);
      setQ("");
      return;
    }
    const { mapboxToken } = configPublica();
    if (!mapboxToken) return;
    try {
      const res = await recuperarLugar(r.item.mapboxId, mapboxToken, sesion.current, consultarMapa);
      if (!res || !puntoValido(res)) return;
      fijarPuntoDesdeDireccion({ lat: res.lat, lng: res.lng }, res.direccion || r.item.direccion, res.ciudad);
      setQ("");
    } catch {
      // Sin retiro posible: la búsqueda queda con su texto puesto y la lista de sugerencias abierta (nunca se limpió `q`), para
      // que la persona elija con un toque -la misma salida que si hubiera dos coincidencias.
    }
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

  /** Abre la hoja «Agregar lugar» (OL-182): NUNCA inventa un punto -antes movía el pin en silencio al centro de contexto y
   *  guardaba esa ubicación sin que nadie la eligiera, el defecto que reportó el founder en producción-. Si ya había un punto
   *  puesto a mano (un POI, el mapa, «Estoy aquí»), se conserva tal cual -la hoja abre con «Guardar» ya encendido-; si el
   *  borrador era un lugar YA REGISTRADO (otro lugar, no uno nuevo), no tiene sentido heredar su pin para uno nuevo: se limpia
   *  y la hoja abre sin punto. */
  function abrirAgregar() {
    if (borrador?.origen === "lugar") setBorrador(null);
    setNombreAgregar(q.trim() || borrador?.nombre || "");
    setQDireccionAgregar(borrador?.origen === "manual" && borrador.direccion !== "Ubicando…" ? borrador.direccion : "");
    setCerradaDireccionParaTexto(null);
    setPrivadoAgregar(false);
    setErrorAgregar(null);
    setErrorBusquedaDireccion(null);
    setAvisoPublico(null);
    setPanelAgregar(true);
    setCerradaParaTexto(q);
  }

  async function guardarAgregar() {
    const punto = borrador?.punto ?? null;
    // Botón apagado mientras no haya punto (OL-182): esta comprobación es la misma que ya deshabilita el botón
    // (`puedeGuardarLugar`), por si acaso llega a llamarse de otro modo -nunca se guarda un punto inventado.
    if (!evento || !borrador || !punto || !puedeGuardarLugar({ nombre: nombreAgregar, punto })) return;
    // La persona puede haber corregido a mano el campo «Dirección» sin volver a elegir una sugerencia (el doc 43 lo da como
    // editable): eso manda sobre la dirección ya resuelta -antes se perdía (gestor, revisión de esta pieza).
    const direccionActual = direccionAGuardar(qDireccionAgregar, borrador.direccion === "Ubicando…" ? "" : borrador.direccion);
    const { modo: destino, nombre, direccion } = decidirGuardado(privadoAgregar, nombreAgregar, direccionActual);
    marcarTocado();
    setGuardando(true);
    setErrorAgregar(null);
    setAvisoPublico(null);
    try {
      // Con privado o sin él, el lugar se registra (OL-179, founder 2026-09-24): la diferencia es si además, al guardar el
      // evento, se usa por `lugar_id` (normal) o como sitio reservado (privado de verdad).
      const r = await crearLugarDesdeEvento({ nombre, direccion, lat: punto.lat, lng: punto.lng, ciudad: ciudadParaPunto(punto, borrador.ciudad, ciudadContexto) ?? "", volverA: evento.volverA, privado: destino === "privado" });
      if (!r.ok) {
        setErrorAgregar(r.error);
        return;
      }
      const existente = lugares.find((l) => l.id === r.id);
      const tipo = deducirTipo(nombre) ?? "otro";
      const lugarResultante: LugarResumen = existente ?? { id: r.id, nombre, tipo, direccion, lat: punto.lat, lng: punto.lng, portada: null };
      if (destino === "privado" && !r.reutilizado) {
        // Privado de verdad: el evento se guarda como sitio reservado (como hoy), nunca por `lugar_id` -el lugar recién creado
        // solo queda ahí para reutilizarlo otro día («¿Dónde es?» ya lo ofrece entre las sugerencias).
        setBorrador({ origen: "manual", nombre, direccion, punto, editable: true, ciudad: borrador.ciudad, reservado: true });
      } else {
        // Sin privado, o con privado pero ya existía como lugar público (lugares_parecidos nunca ve privados: un parecido
        // encontrado aquí es siempre público): se usa como un lugar normal, y se avisa si tocaba privado.
        if (destino === "privado" && r.reutilizado) setAvisoPublico(`«${nombre}» ya existe como lugar público.`);
        setBorrador({ origen: "lugar", nombre: lugarResultante.nombre, direccion: lugarResultante.direccion ?? "", punto: { lat: lugarResultante.lat, lng: lugarResultante.lng }, lugarId: lugarResultante.id, lugarNuevo: existente ? undefined : lugarResultante, editable: false, ciudad: null });
      }
      setPanelAgregar(false);
      setQ("");
    } catch {
      setErrorAgregar("No se pudo guardar el lugar. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  // ---------- 5. Confirmar ----------
  /** «Listo» en un evento: un lugar registrado (o uno privado, que rellena el evento como sitio reservado) o el sitio suelto. */
  function confirmarEvento(e: ParaEvento) {
    if (!borrador) return;
    if (borrador.origen === "lugar" && borrador.lugarId) {
      // Un lugar registrado privado (propio, de las sugerencias) rellena el evento como reservado, nunca por `lugar_id`: solo
      // su autor y la administración pueden verlo (OL-179, founder 2026-09-24).
      if (borrador.privado) {
        e.onOtro({ ...e.otro, reservado: true, sitioTexto: borrador.nombre.trim().slice(0, LIMITES_EVENTO.sitio), direccionPrivada: borrador.direccion.slice(0, LIMITES_EVENTO.direccion), privadoPunto: borrador.punto, sitioPunto: null, direccion: "", pinPendiente: false, ciudad: borrador.ciudad }, false);
      } else {
        e.onLugar(borrador.lugarId, borrador.lugarNuevo);
      }
      return;
    }
    if (!tocado || !borrador.punto || !borrador.nombre.trim()) return;
    const reservado = !!borrador.reservado;
    e.onOtro(
      {
        ...e.otro,
        reservado,
        sitioTexto: borrador.nombre.trim().slice(0, LIMITES_EVENTO.sitio),
        pinPendiente: false,
        ciudad: borrador.ciudad,
        ...(reservado
          ? { direccionPrivada: borrador.direccion.slice(0, LIMITES_EVENTO.direccion), privadoPunto: borrador.punto, sitioPunto: null, direccion: "" }
          : { direccion: borrador.direccion.slice(0, LIMITES_EVENTO.direccion), sitioPunto: borrador.punto, direccionPrivada: "", privadoPunto: null }),
      },
      false,
    );
  }

  /** «Listo» en un lugar: solo confirma dirección, coordenadas y ciudad (el nombre vive en el formulario de fuera). */
  function confirmarLugar(l: ParaLugar) {
    if (!borrador?.punto) return;
    l.onListo({ punto: borrador.punto, direccion: borrador.direccion === "Ubicando…" ? "" : borrador.direccion, ciudad: borrador.ciudad });
  }

  function listo() {
    if (evento) confirmarEvento(evento);
    else if (lugar) confirmarLugar(lugar);
    onCerrar();
  }

  // ---------- 6. Lo que se ve ----------
  // Aviso «ya existe» (founder, OL-211): el último lugar tocado manda; sin ninguno, el que quede a menos de 150 m del punto que
  // se está fijando -la misma regla que usa `lugares/acciones.ts` para no duplicar. Solo en el lugar.
  const avisoExiste = lugar ? (avisoTocado ?? (borrador?.punto ? lugarCercano(lugares, borrador.punto) : null)) : null;
  // El resumen del pin. En un evento, mientras no haya texto ni panel abierto; en un lugar, con la lista cerrada -tocar un
  // renglón sin borrar lo escrito no cambia de modo, y el aviso no debe quedar oculto detrás de un texto que ya no importa-,
  // y se muestra AUNQUE todavía no haya un punto propio (tocar un pin o un renglón registrado antes de fijar el propio también
  // debe avisar «ya existe»: founder, OL-211).
  const verResumen = evento ? modo === "inicial" && !!borrador : !listaAbierta && !!(borrador?.punto || avisoExiste);
  const conPin = evento ? !!borrador : !!borrador?.punto;

  // La barra sobre el teclado (variante B, doc 43 punto 5): `visualViewport` mide el área visible de verdad en iOS; sin él
  // (navegador que no lo da), se queda al pie -`altoTeclado` devuelve 0 en los dos casos sin teclado.
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

  // Cuando las sugerencias de dirección necesitan abrir y no hay sitio abajo del campo (pegado sobre el teclado), la propia hoja
  // se estira hacia arriba (clase .expandida, CSS) y se desplaza por dentro para que el campo «Dirección» quede arriba del todo:
  // así SIEMPRE hay sitio libre debajo y la lista nunca abre encima del campo que se está usando (regla dura del founder,
  // 2026-09-24: «si sugieres algo sea debajo del campo que estoy usando»).
  useEffect(() => {
    if (!listaDireccionAbierta) return;
    const hoja = hojaRef.current;
    const campo = campoDireccionWrapRef.current;
    if (!hoja || !campo) return;
    hoja.scrollTop = Math.max(0, campo.offsetTop - 10);
  }, [listaDireccionAbierta]);

  // Con la hoja estirada (sugerencias de dirección abiertas), el mapa queda casi tapado y «Estoy aquí» no sirve ahí -se oculta
  // (gestor, revisión de OL-182): sin esto, con `altoHoja` grande se montaba sobre el propio campo «Nombre o dirección» de arriba
  // (ese `bottom` empuja el botón por ENCIMA del alto entero de `.mapaLleno`, que no tiene `overflow: hidden`). Fuera de ese
  // caso, un tope defensivo con `min()` -nunca más de calc(100% - 64px) del propio `.mapaLleno`- para que tampoco se monte ahí si
  // la hoja compacta creciera de más por un error largo.
  const estoyAquiOculto = listaDireccionAbierta;
  const estoyAquiBottomPx = bottomBarra + (panelAgregar ? altoHoja : barraVisible ? altoBarra : 0) + 16;
  const estoyAquiBottom = estoyAquiBottomPx > 16 ? `min(${estoyAquiBottomPx}px, calc(100% - 64px))` : `${estoyAquiBottomPx}px`;

  const puedeConfirmar = puedeListo(props.para, borrador, panelAgregar);
  const textoAgregar = q.trim() ? `Agregar «${q.trim()}» como lugar` : "Agregar lugar";

  return (
    <div className={styles.capa} role="dialog" aria-label={TITULO[props.para]}>
      <div className={styles.cabecera}>
        <button type="button" className={styles.atras} onClick={onCerrar}>
          <IconoChevronIzquierda width={18} height={18} />
          Atrás
        </button>
        <h2>{TITULO[props.para]}</h2>
      </div>
      <div className={styles.cuerpo}>
        <div className={styles.campo} ref={campoRef}>
          <IconoBuscar width={20} height={20} />
          <input
            type="text"
            value={q}
            onChange={(e) => {
              // Una nueva búsqueda deja atrás el aviso de un renglón tocado antes (no el de la proximidad del propio pin, que se
              // recalcula solo con el punto).
              setAvisoTocado(null);
              setQ(e.target.value);
            }}
            placeholder="Nombre o dirección"
            aria-label="Buscar el lugar"
            autoComplete="off"
            autoFocus={lugar?.conFoco}
            role="combobox"
            aria-expanded={listaAbierta}
            aria-controls="lista-donde"
            aria-autocomplete="list"
          />
          <Limpiar visible={!!q} />
        </div>
        <div className={styles.mapaLleno}>
          <MapaDondeEs
            lugares={lugares}
            seleccion={borrador?.punto ?? null}
            centrarEn={contexto.centro}
            ciudad={contexto.ciudad}
            yo={yo}
            paddingInferior={panelAgregar ? altoHoja + 12 : 0}
            onLugar={(id) => {
              const l = lugares.find((x) => x.id === id);
              if (l) tocarRegistrado(l);
            }}
            onPoi={(nombre, p) => void moverPin(p, evento ? nombre : undefined)}
            onPunto={(p) => void moverPin(p)}
            onArrastre={(p) => void moverPin(p, undefined, true)}
          />
          {!estoyAquiOculto && (
            <BotonIcono tamano="accion" relieve="elevado" className={styles.estoyAqui} style={{ bottom: estoyAquiBottom }} onClick={estoyAquiClick} disabled={ubicando} aria-label="Estoy aquí" title="Estoy aquí">
              <IconoUbicacion width={22} height={22} />
            </BotonIcono>
          )}
          {modo === "inicial" && avisoUbicacion && <p className={styles.avisoUbicacion}>{avisoUbicacion}</p>}
          {verResumen && (
            <div className={styles.resumen}>
              {conPin && <IconoPin width={18} height={18} />}
              {evento && borrador && (
                borrador.editable ? (
                  <input
                    type="text"
                    className={styles.nombreEditable}
                    value={borrador.nombre}
                    onChange={(e) => {
                      marcarTocado();
                      setBorrador((a) => (a ? { ...a, nombre: e.target.value } : a));
                    }}
                    maxLength={LIMITES_EVENTO.sitio}
                    placeholder="Nombre del lugar"
                    aria-label="Nombre del lugar"
                  />
                ) : (
                  <b>{borrador.nombre}</b>
                )
              )}
              {conPin && borrador &&
                (evento ? (
                  <span className={styles.resumenDireccion}>{borrador.direccion || (borrador.punto ? "Ubicando…" : "")}</span>
                ) : (
                  <b>{borrador.direccion || "Ubicando…"}</b>
                ))}
              {conPin && ajustado && <span className={styles.notaAjuste}>Moviste el pin. Revisa que la dirección corresponda.</span>}
              {avisoPublico && <span className={styles.notaAjuste}>{avisoPublico}</span>}
              {avisoExiste && (
                <span className={styles.notaAjuste}>
                  «{avisoExiste.nombre}» ya existe cerca de aquí. <Link href={hrefLugar(avisoExiste)}>Ver ficha</Link>
                </span>
              )}
            </div>
          )}
          <ListaFlotante
            abierta={listaAbierta}
            onCerrar={() => setCerradaParaTexto(q)}
            ancla={campoRef}
            dentro={[barraRef]}
            id="lista-donde"
            etiqueta="Lugares y direcciones"
            reservaAbajo={altoPie + altoBarra}
          >
            {modo === "resultados" &&
              combinados.map((r) =>
                r.tipo === "lugar" ? (
                  <li key={`l-${r.lugar.id}`}>
                    <button type="button" role="option" aria-selected={false} className={sug.renglon} onClick={() => tocarRegistrado(r.lugar)}>
                      <IconoPin width={20} height={20} />
                      <b>
                        {r.lugar.nombre}
                        {/* En un lugar, todo lo registrado avisa «Ya existe». En un evento, un lugar privado propio (OL-179)
                            entre las sugerencias lleva una marca chica: solo lo ve su autor, la política de lectura ya se lo
                            dio a esta consulta. */}
                        {lugar ? <span className={styles.marca}>Ya existe</span> : r.lugar.privado && <span className={styles.marca}>Privado</span>}
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
                <b>«{q.trim()}» no tiene ficha.</b>
                {evento ? "Agrégalo, o toca el mapa para ubicarlo." : "Toca el mapa para ubicarlo."}
              </li>
            )}
            {conTextoLargo && modo === "resultados" && buscando && (
              <li className={styles.avisoFlotante} role="status">
                Buscando…
              </li>
            )}
            {/* Con «no tiene ficha» ya dicho arriba, repetir el error de red no cabe ni hace falta (además de que los dos
                juntos podían alargar la lista hasta tapar la barra de acciones): el aviso de red solo se suma cuando SÍ hay
                resultados. */}
            {conTextoLargo && modo === "resultados" && errorBusqueda && (
              <li className={styles.avisoFlotante} role="alert">
                {errorBusqueda}
              </li>
            )}
          </ListaFlotante>
          {evento && panelAgregar && (
            // Hoja «Agregar lugar» a media pantalla, pegada abajo -sobre el teclado cuando lo hay, mismo mecanismo que la barra-
            // dejando el mapa (y el pin, con `paddingInferior`) siempre visibles arriba (OL-182). Con las sugerencias de
            // dirección abiertas, «.expandida» la estira y el efecto de arriba la desplaza para que el campo «Dirección» quede al
            // ras de arriba: así la lista SIEMPRE tiene sitio debajo.
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
              <ListaFlotante abierta={listaDireccionAbierta} onCerrar={() => setCerradaDireccionParaTexto(qDireccionAgregar)} ancla={campoDireccionRef} id="lista-direccion-agregar" etiqueta="Direcciones" reservaAbajo={0}>
                {combinadosDireccion.map((r) =>
                  r.tipo === "lugar" ? (
                    <li key={`dl-${r.lugar.id}`}>
                      <button type="button" role="option" aria-selected={false} className={sug.renglon} onClick={() => elegirDireccionLugar(r.lugar)}>
                        <IconoPin width={20} height={20} />
                        <b>
                          {r.lugar.nombre}
                          {r.lugar.privado && <span className={styles.marca}>Privado</span>}
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
              <div className={`${renglon.ajuste} ${renglon.sola} ${styles.privado}`}>
                <IconoCandado width={20} height={20} />
                <b>Es un lugar privado</b>
                <small>Solo tú lo ves; podrás volver a usarlo en otros eventos</small>
                <Palanca encendida={privadoAgregar} aria-label="Lugar privado" onClick={() => setPrivadoAgregar((v) => !v)} />
              </div>
              {errorAgregar && (
                <p className={styles.notaError} role="alert">
                  {errorAgregar}
                </p>
              )}
              <Boton type="button" onClick={() => void guardarAgregar()} disabled={!puedeGuardarLugar({ nombre: nombreAgregar, punto: borrador?.punto ?? null }) || guardando}>
                {guardando ? "Guardando…" : "Guardar y usar este lugar"}
              </Boton>
              {/* La ayuda de qué falta va debajo del botón, nunca dentro (canon de formularios, OL-100) -y solo habla de la
                  ubicación: el nombre ya llega prellenado con lo escrito, rara vez falta. */}
              {!borrador?.punto && <p className={styles.ayudaGuardar}>Falta la ubicación: busca la dirección, toca el mapa o usa «Estoy aquí».</p>}
            </div>
          )}
          {barraVisible && (
            // Un solo botón (founder, 2026-09-24: «en el paso anterior solo mostremos un botón de agregar»): el mapa ya se puede
            // tocar siempre, sin un botón aparte para «buscar sin agregar» (el aviso lo dice). Secundario y flotante: encima del
            // pie, sobre el mapa (OL-303), sin una franja propia que lo tape más de lo necesario.
            <div ref={barraRef} className={styles.barraAcciones} style={{ bottom: bottomBarra }}>
              <Boton type="button" variante="secundario" forma="pildora" flotante onClick={abrirAgregar}>
                <IconoMas width={18} height={18} />
                <span className={styles.textoAgregar}>{textoAgregar}</span>
              </Boton>
            </div>
          )}
        </div>
      </div>
      {pieVisible && (
        <PiePaso ref={pieRef}>
          <Boton type="button" aria-disabled={puedeConfirmar ? undefined : true} onClick={puedeConfirmar ? listo : undefined}>
            {textoListo(props.para, borrador)}
          </Boton>
        </PiePaso>
      )}
    </div>
  );
}
