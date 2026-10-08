import { sitioListo } from "@/app/eventos/direccionEvento";
import type { EventoAgenda } from "@/lib/agenda";
import type { QuienItem } from "@/lib/artistas";
import { FIN_DEL_DIA, sumarDiasIso } from "@/lib/calendario";
import { conHoraFin } from "@/lib/cuandoEvento";
import { horariosDeTaller, periodoDeVisita, textoProgramaRegistrado } from "@/lib/claseEvento";
import { COOPERACION_SOLIDARIA, LIMITES_EVENTO, claseSugerida, type Clase, type ModoSitio, type OtroSitio } from "@/lib/eventos";
import type { Franja } from "@/lib/horarioLugar";
import { combinarFechaHora, localAIso, rangoCorto, sumarHoras } from "@/lib/fechas";
import { queFalta } from "@/lib/formulario";
import { inicioFinDeHorarios, type HorarioDia } from "@/lib/sesionesEvento";
import { distanciaKm, type Punto } from "@/lib/geo";
import type { LugarResumen } from "@/lib/lugares";

/**
 * El alta de evento por pasos, sin DOM (OL-300; prototipo firmado `publicar-por-pasos.html`, bitácora 323): qué se pregunta, en qué
 * orden y adónde lleva cada respuesta. Los pasos salen de lo que falta: lo contestado no se vuelve a preguntar, y al terminar se llega a
 * «Revisa». Desde «Revisa» se abre una sola pregunta y, al contestarla, se vuelve. `mas` es lo opcional (artistas, descripción, enlace).
 *
 * «Dónde» son tres pasos (OL-301): `donde` (buscar el sitio), `mapa` («¿Es aquí?», solo si no es un lugar del directorio) y `uso`
 * («No está en el directorio»: qué hacer con ese sitio). Un lugar del directorio ya tiene su punto confirmado y salta los otros dos.
 */
export type Paso = "inicio" | "nombre" | "dia" | "hora" | "visita" | "sesiones" | "programa" | "donde" | "mapa" | "uso" | "cuanto" | "revisa" | "mas" | "publicado";

/** El camino sin cartel, de principio a fin: también da la línea de avance. */
const ORDEN: readonly Paso[] = ["inicio", "nombre", "dia", "hora", "donde", "cuanto", "revisa"];

export type Costo = "gratis" | "cooperacion" | "precio";
export type Sitio = { modo: ModoSitio; lugarId: string; otro: OtroSitio };
export type Dias = { desde: string; hasta: string | null };

/**
 * Los días que vienen de la hoja del calendario (`ui/SelectorDia`), como respuesta: un solo día se guarda sin `hasta` (la hoja ya manda
 * `null` para «Listo, un solo día»; aquí queda asegurado el contrato de `Dias`), porque el paso de la hora toma cualquier `hasta` por
 * «varios días» y preguntaría a qué hora termina en vez de cuánto dura.
 */
export const diasElegidos = (desde: string, hasta: string | null): Dias => ({ desde, hasta: hasta && hasta > desde ? hasta : null });

/**
 * Un evento del programa de un festival (OL-321, H6): lo que el cartel trae de cada uno o lo que se agrega a mano. Se publica marcado; desmarcado
 * queda como borrador del festival. `sitio` es su sede (la del paso «Dónde» de siempre); `sedeLeida`, lo que el cartel dijo de ella, para
 * empezar a buscarla. `leido`: vino del cartel.
 */
export type Acto = { clave: string; titulo: string; dia: string; hora: string; sitio: Sitio; sedeLeida: string; quien: QuienItem[]; marcado: boolean; leido: boolean };

/** El festival del que el evento es parte: uno que ya existe (elegido por su nombre) o uno nuevo, con solo el nombre. */
export type Padre = { id: string; titulo: string } | { nuevo: string };

/** La inauguración de una exposición: un acto puntual aparte, su día y su hora (sin el horario de visita). */
export type Inauguracion = { dia: string; hora: string };

export type Respuestas = {
  nombre: string;
  /** Cómo ocurre (OL-321; doc 55 §2): la proponen el cartel o el título y se confirma en «Revisa». Cambiarla cambia solo el paso del tiempo. */
  clase: Clase;
  /** La eligió la persona (un chip bajo el nombre, OL-345, o la hoja «¿Cómo ocurre?» de «Revisa») o la dijo el cartel: el título ya no la cambia. */
  claseFijada: boolean;
  /** Exposición: el primer día de visita y el de cierre (inclusivo); `hasta` null mientras se elige. */
  visita: { desde: string; hasta: string | null } | null;
  /** Exposición: el horario propio en franjas; null es «Horario del lugar» (la casilla marcada) o, si el lugar no tiene, «por confirmar». */
  horario: Franja[] | null;
  /** Exposición: su inauguración, opcional. */
  inauguracion: Inauguracion | null;
  /** Taller o curso: los días de sus sesiones (YYYY-MM-DD); la hora es `hora` y `fin` y, con la casilla «Misma hora todas las sesiones»
   *  desmarcada, cada sesión lleva la suya en `sesiones`. */
  sesionesDias: string[];
  /** Festival: su programa. */
  actos: Acto[];
  /** Editar un festival que ya existe: cuántas actividades tiene registradas (su programa se edita en la ficha de cada una); null en el alta. */
  programaGuardado: number | null;
  /** «Parte de un festival» (todo lo que no es festival). */
  padre: Padre | null;
  /** El día de inicio (YYYY-MM-DD) y, si dura varios, el último. */
  dias: Dias | null;
  /** La hora de inicio, "HH:MM". */
  hora: string | null;
  /** El fin, «YYYY-MM-DDTHH:MM» en la hora del sitio; "" es «Sin hora de fin» y null, que todavía no se contesta. Con horario por día
   *  (`sesiones`) es el horario común, al que vuelve la casilla «Mismo horario todos los días»; el fin del evento sale de la última sesión. */
  fin: string | null;
  /** El horario de cada día cuando la casilla «Mismo horario todos los días» está desmarcada (OL-311); null con la casilla marcada. */
  sesiones: HorarioDia[] | null;
  sitio: Sitio;
  costo: Costo | null;
  /** Solo dígitos; cuenta cuando `costo` es «precio». */
  precio: string;
  quien: QuienItem[];
  descripcion: string;
  enlace: string;
};

/** El sitio que se está confirmando en el mapa: un resultado de la búsqueda o «Estoy aquí». Todavía no es la respuesta. */
export type Candidato = {
  /** El nombre del sitio; "" si el mapa solo dio una dirección (una dirección ubica, no nombra). */
  nombre: string;
  direccion: string;
  punto: Punto;
  ciudad: string | null;
  /** Lo que dice el mapa que es (`poi_category`): de ahí sale el tipo del lugar si se guarda (`deducirTipo`). */
  categorias: string[];
  /** «Estoy aquí» no trae dirección: el mapa se la pide al punto. */
  origen: "aqui" | "busqueda";
};

/** Qué hacer con un sitio que no está en el directorio. «Lugar» se resuelve fuera del reductor: crear el lugar es una acción del servidor. */
export type Uso = "evento" | "lugar" | "reservado";
/** Lo que el reductor resuelve solo, con lo que ya sabe el candidato. */
export type UsoSitio = Exclude<Uso, "lugar">;

export type Estado = {
  r: Respuestas;
  /** El acto cuya sede se está eligiendo en «Dónde» (OL-321); null si «Dónde» es el del evento. */
  sedeDe: string | null;
  /** El sitio que se confirma en `mapa` y se resuelve en `uso`. */
  candidato: Candidato | null;
  /** Los pasos por los que se llegó al actual (el último): Atrás quita uno. */
  pila: Paso[];
  /** Cómo se llegó al paso actual, para su transición; null al abrir la pantalla. */
  direccion: "entra" | "vuelve" | null;
};

export type Accion =
  /** Lo que se escribe o se elige sin dejar el paso (el nombre, la hora de inicio, el precio, lo opcional). */
  | { tipo: "cambiar"; cambios: Partial<Respuestas> }
  /** Lo que contesta el paso y lleva al siguiente (un día, el fin, el sitio, una opción de costo). */
  | { tipo: "contestar"; cambios: Partial<Respuestas> }
  /** «No tengo cartel», «Siguiente», «Listo». */
  | { tipo: "seguir" }
  /** Desde «Revisa»: solo esa pregunta. */
  | { tipo: "abrir"; paso: Paso }
  /** La sede de un acto del programa: el paso «Dónde» de siempre; al contestarlo se vuelve al programa con esa sede puesta. */
  | { tipo: "sedeDeActo"; clave: string }
  /** Atrás desde `desde`; se ignora si ya no se está ahí. */
  | { tipo: "atras"; desde: Paso }
  /** Un resultado del mapa o «Estoy aquí»: a confirmarlo en el mapa. */
  | { tipo: "elegir"; candidato: Candidato }
  /** «Sí, es aquí» con un sitio que no es del directorio (con el pin donde quedó): a decir qué hacer con él. */
  | { tipo: "confirmar"; candidato: Candidato }
  /** Lo que se hace con el sitio: se vuelve su respuesta y sigue lo que falte. */
  | { tipo: "usar"; uso: UsoSitio }
  /** El servidor publicó el evento: al final, sin camino de vuelta. */
  | { tipo: "publicado" };

export const OTRO_VACIO: OtroSitio = { reservado: false, sitioTexto: "", direccion: "", sitioPunto: null, direccionPrivada: "", privadoPunto: null, revelarHoras: 24, indicaciones: "", ciudad: null };

/** Todo sin contestar: un evento (la clase de entrada; el título o el cartel la proponen después). */
export const RESPUESTAS_VACIAS: Respuestas = {
  nombre: "",
  clase: "puntual",
  claseFijada: false,
  dias: null,
  hora: null,
  fin: null,
  sesiones: null,
  visita: null,
  horario: null,
  inauguracion: null,
  sesionesDias: [],
  actos: [],
  programaGuardado: null,
  padre: null,
  sitio: { modo: "lugar", lugarId: "", otro: OTRO_VACIO },
  costo: null,
  precio: "",
  quien: [],
  descripcion: "",
  enlace: "",
};

export function estadoInicial(quien: QuienItem[] = []): Estado {
  return {
    r: { ...RESPUESTAS_VACIAS, quien },
    sedeDe: null,
    candidato: null,
    pila: ["inicio"],
    direccion: null,
  };
}

/**
 * Editar un evento (OL-319): no se vuelven a recorrer los pasos; se entra directo en «Revisa» con todo puesto, y cada renglón abre su pregunta,
 * que al contestarse vuelve aquí (lo mismo que «Cambiar» dentro del alta). Sin transición: es lo que se ve al llegar.
 */
export const estadoAlEditar = (r: Respuestas): Estado => ({ r, sedeDe: null, candidato: null, pila: ["revisa"], direccion: null });

export const pasoActual = (e: Estado): Paso => e.pila[e.pila.length - 1];

const PREGUNTA: Partial<Record<Paso, string>> = {
  nombre: "¿Cómo se llama?",
  dia: "¿Qué día es?",
  hora: "¿A qué hora?",
  visita: "¿Cuándo se puede visitar?",
  sesiones: "¿Qué días son las sesiones?",
  donde: "¿Dónde es?",
  mapa: "¿Es aquí?",
  uso: "No está en el directorio",
  cuanto: "¿Cuánto cuesta?",
  mas: "¿Quieres agregar algo?",
};

/**
 * La pregunta de cada paso; con varios días la de la hora cambia: el horario del primer día vale para todos. El programa de un festival dice
 * cuántos eventos trae el cartel (H6) o, armado a mano, pregunta por sus actividades. Sin pregunta, undefined.
 */
export function preguntaDe(paso: Paso, r: Pick<Respuestas, "dias"> & Partial<Pick<Respuestas, "actos">>): string | undefined {
  if (paso === "hora" && r.dias?.hasta) return "¿A qué hora, cada día?";
  if (paso === "programa") {
    const leidos = (r.actos ?? []).filter((a) => a.leido).length;
    return leidos ? `El cartel trae ${leidos} ${leidos === 1 ? "evento" : "eventos"}` : "¿Qué actividades tiene?";
  }
  return PREGUNTA[paso];
}

/** ¿El sitio ya está contestado? Un sitio reservado sin su dirección exacta porque se retiró por privacidad (al editar un evento que ya pasó)
 *  cuenta como contestado con su nombre: no hay dirección que pedir para conservarlo. */
export const dondeResuelto = ({ modo, lugarId, otro }: Sitio): boolean =>
  modo === "lugar" ? !!lugarId : sitioListo(otro) || (modo === "reservado" && !!otro.direccionRetirada && !!otro.sitioTexto.trim());

/** Un acto del programa que se puede publicar: con nombre, día, hora y sede. */
export const actoListo = (a: Acto): boolean => !!a.titulo.trim() && !!a.dia && !!a.hora && dondeResuelto(a.sitio);

/** Los actos que se publican: los marcados. */
export const actosMarcados = (r: Pick<Respuestas, "actos">): Acto[] => r.actos.filter((a) => a.marcado);

/**
 * Lo que falta para publicar, en el orden en que se pregunta. El paso del tiempo depende de la clase (doc 55 §2): un evento pregunta el día y la
 * hora; una exposición, cuándo se puede visitar; un taller, los días de sus sesiones y su hora; un festival, su programa (al menos un acto
 * marcado, y todos los marcados completos). Un festival no pregunta dónde (cada acto tiene su sede); cuánto, sí: es el de sus actos (sin él, la
 * ficha diría lo que nadie dijo).
 */
export function faltan(r: Respuestas): Paso[] {
  const p: Paso[] = [];
  if (!r.nombre.trim()) p.push("nombre");
  if (r.clase === "exposicion") {
    if (!r.visita?.desde || !r.visita.hasta) p.push("visita");
  } else if (r.clase === "taller") {
    if (!r.sesionesDias.length || !r.hora) p.push("sesiones");
  } else if (r.clase === "festival") {
    const marcados = actosMarcados(r);
    if (r.programaGuardado === null && (!marcados.length || !marcados.every(actoListo))) p.push("programa");
  } else {
    if (!r.dias) p.push("dia");
    if (!r.hora || r.fin === null) p.push("hora");
  }
  if (r.clase !== "festival" && !dondeResuelto(r.sitio)) p.push("donde");
  if (!r.costo || (r.costo === "precio" && !r.precio)) p.push("cuanto");
  return p;
}

const FALTA: Record<Exclude<Paso, "inicio" | "mapa" | "uso" | "revisa" | "mas" | "publicado">, string> = {
  nombre: "el nombre",
  dia: "el día",
  hora: "la hora",
  visita: "cuándo se puede visitar",
  sesiones: "las sesiones",
  programa: "una actividad",
  donde: "el lugar",
  cuanto: "el precio",
};

/** Lo que dice el botón de «Revisa» mientras algo falte («Falta el día y la hora», «Faltan las sesiones»); null si ya se puede publicar. Sin punto: es un botón. */
export function faltaParaPublicar(r: Respuestas): string | null {
  // Un programa con actos marcados pero incompletos no pide «una actividad»: pide completar la que falta.
  const partes = faltan(r).map((p) => (p === "programa" && actosMarcados(r).length ? "completar una actividad" : FALTA[p as keyof typeof FALTA]));
  if (partes.length === 1 && partes[0] === "las sesiones") return "Faltan las sesiones";
  const frase = queFalta(partes);
  return frase && frase.slice(0, -1);
}

/**
 * La hora va con su día: contestar el día vuelve a preguntar la hora y el fin (el fin de un evento de un día no vale para uno de
 * tres; y desde «Revisa», tocar «Cuándo» es elegir el día y después la hora, como en el prototipo) y borra el horario por día, que era
 * de otros días.
 */
function con(r: Respuestas, cambios: Partial<Respuestas>): Respuestas {
  const nuevo = { ...r, ...(cambios.dias !== undefined ? { hora: null, fin: null, sesiones: null } : {}), ...cambios };
  // El título propone la clase mientras nadie la haya elegido (ni la persona ni el cartel): «Exposición…», «Taller de…», «Festival…».
  if (cambios.nombre !== undefined && cambios.clase === undefined && !nuevo.claseFijada) nuevo.clase = claseSugerida(nuevo.nombre) ?? "puntual";
  return nuevo.clase !== r.clase ? conClase(nuevo, r) : nuevo;
}

/**
 * Elegir la clase: lo que mandan el chip bajo el nombre (OL-345) y la hoja «¿Cómo ocurre?» de «Revisa» (OL-321). Queda fijada: el título ya no la
 * cambia. Lo demás (el paso del tiempo que pide, lo que se conserva) lo hace `con` al recibirla, sea quien sea quien la mande.
 */
export const claseElegida = (clase: Clase): Pick<Respuestas, "clase" | "claseFijada"> => ({ clase, claseFijada: true });

/**
 * ¿Salen los chips de la clase bajo el nombre (OL-345)? En cuanto hay nombre (el título ya propone una) o cuando la clase ya está fijada (la trajo
 * el cartel o se eligió), aunque el nombre esté vacío. Sin nada escrito no hay qué proponer: el paso queda solo con su campo.
 */
export const clasesALaVista = (r: Pick<Respuestas, "nombre" | "claseFijada">): boolean => !!r.nombre.trim() || r.claseFijada;

/**
 * Cambiar la clase cambia solo el paso del tiempo (doc 55 §2): nombre, dónde, quién, precio y cartel se conservan, y lo que ya se dijo del tiempo
 * sirve de partida: los días de un evento son los de visita de una exposición o los de las sesiones de un taller. El horario por día de un evento
 * de varios días no vale para las sesiones sueltas de un taller (ni al revés): se vuelve al horario común.
 */
function conClase(r: Respuestas, antes: Respuestas): Respuestas {
  const dias = r.dias;
  const desdeDias = dias ? (dias.hasta ? diasEntre(dias.desde, dias.hasta) : [dias.desde]) : [];
  return {
    ...r,
    sesiones: null,
    visita: r.clase === "exposicion" && !r.visita && dias ? { desde: dias.desde, hasta: dias.hasta } : r.visita,
    sesionesDias: r.clase === "taller" && !r.sesionesDias.length ? ((r.sesiones ?? antes.sesiones)?.map((h) => h.dia) ?? desdeDias) : r.sesionesDias,
  };
}

/** Cada día de un rango (YYYY-MM-DD), hasta 31. */
function diasEntre(desde: string, hasta: string): string[] {
  const dias: string[] = [];
  for (let d = desde; d <= hasta && dias.length < 31; d = sumarDiasIso(d, 1)) dias.push(d);
  return dias;
}

const apilar = (e: Estado, paso: Paso): Estado => ({ ...e, pila: [...e.pila, paso], direccion: "entra" });

/** A lo primero que falte; sin nada pendiente, a «Revisa»: si ya se estuvo ahí (se abrió una pregunta desde ella), se regresa. */
function siguiente(e: Estado): Estado {
  if (e.sedeDe !== null) return alPrograma(e);
  const paso = faltan(e.r)[0];
  const revisa = e.pila.indexOf("revisa");
  if (paso || revisa < 0) return apilar(e, paso ?? "revisa");
  return { ...e, pila: e.pila.slice(0, revisa + 1), direccion: "vuelve" };
}

/**
 * El estado al abrir con lo que ya se sabe por dónde se entró (OL-312, `arranque.ts`): las respuestas puestas y, con `entrar` (duplicar un
 * evento), ya en lo primero que falte, con el primer paso detrás; sin transición, porque es lo que se ve al llegar.
 */
export function estadoConArranque(quien: QuienItem[], arranque: { r: Partial<Respuestas>; entrar: boolean } | null): Estado {
  const e = estadoInicial(quien);
  if (!arranque) return e;
  const conRespuestas = { ...e, r: { ...e.r, ...arranque.r } };
  return arranque.entrar ? { ...siguiente(conRespuestas), direccion: null } : conRespuestas;
}

/**
 * La sede de un acto ya elegida (o se dejó de elegir): de vuelta al programa, donde se abrió, con la sede puesta en ese acto. Lo que se contesta en
 * «Dónde» mientras se elige una sede es de ese acto, no del evento.
 */
function alPrograma(e: Estado, sitio?: Sitio): Estado {
  const programa = e.pila.lastIndexOf("programa");
  const actos = sitio ? e.r.actos.map((x) => (x.clave === e.sedeDe ? { ...x, sitio } : x)) : e.r.actos;
  return { ...e, r: { ...e.r, actos }, sedeDe: null, candidato: null, pila: programa >= 0 ? e.pila.slice(0, programa + 1) : e.pila, direccion: "vuelve" };
}

export function flujo(e: Estado, a: Accion): Estado {
  switch (a.tipo) {
    case "cambiar":
      return { ...e, r: con(e.r, a.cambios) };
    case "contestar": {
      // La sede de un acto: va a ese acto (lo demás del cambio, si lo hubiera, sí es del evento).
      if (e.sedeDe !== null && a.cambios.sitio) {
        const { sitio, ...resto } = a.cambios;
        return alPrograma({ ...e, r: con(e.r, resto) }, sitio);
      }
      // El cartel trae varios eventos (H6): primero «El cartel trae N eventos», para revisarlos antes de «Revisa», aunque todos estén completos.
      if (a.cambios.clase === "festival" && a.cambios.actos?.some((x) => x.leido)) return apilar({ ...e, r: con(e.r, a.cambios) }, "programa");
      return siguiente({ ...e, r: con(e.r, a.cambios) });
    }
    case "sedeDeActo":
      return apilar({ ...e, sedeDe: a.clave }, "donde");
    case "seguir":
      return siguiente(e);
    case "abrir":
      return apilar(e, a.paso);
    case "atras": {
      if (pasoActual(e) !== a.desde || e.pila.length <= 1) return e;
      const pila = e.pila.slice(0, -1);
      // Atrás desde «¿Dónde es?» de una sede: de vuelta al programa sin cambiar nada.
      return { ...e, pila, sedeDe: e.sedeDe !== null && pila[pila.length - 1] === "programa" ? null : e.sedeDe, direccion: "vuelve" };
    }
    case "elegir":
      return apilar({ ...e, candidato: a.candidato }, "mapa");
    case "confirmar":
      return apilar({ ...e, candidato: a.candidato }, "uso");
    case "usar":
      if (!e.candidato) return e;
      if (e.sedeDe !== null) return alPrograma(e, sitioDeCandidato(e.candidato, a.uso, OTRO_VACIO));
      return siguiente({ ...e, r: { ...e.r, sitio: sitioDeCandidato(e.candidato, a.uso, e.r.sitio.otro) } });
    case "publicado":
      // La pila queda solo con el final: Atrás no tiene a dónde volver (en la barra va la ✕, no el Atrás).
      return { ...e, pila: ["publicado"], direccion: "entra" };
  }
}

/** Un sitio nuevo parte de lo que ya había en lo que no se pregunta aquí (cuántas horas antes se revela, indicaciones). */
const base = (otro: OtroSitio): OtroSitio => ({ ...OTRO_VACIO, revelarHoras: otro.revelarHoras, indicaciones: otro.indicaciones });

/** Un lugar del directorio como sitio. Uno privado (solo lo ve su autor) va como sitio reservado, nunca por `lugar_id` (OL-179). */
export function sitioDeLugar(l: LugarResumen, otro: OtroSitio): Sitio {
  if (!l.privado) return { modo: "lugar", lugarId: l.id, otro };
  const nombre = l.nombre.trim().slice(0, LIMITES_EVENTO.sitio);
  const direccionPrivada = ((l.direccion ?? "").trim() || nombre).slice(0, LIMITES_EVENTO.direccion);
  return { modo: "reservado", lugarId: "", otro: { ...base(otro), reservado: true, sitioTexto: nombre, direccionPrivada, privadoPunto: { lat: l.lat, lng: l.lng }, pinPendiente: false } };
}

/** El nombre del sitio elegido, como se dice en «Revisa»: el del lugar del directorio o el que se le puso; "" si todavía no hay. */
export const nombreDelSitio = (sitio: Sitio, lugar: Pick<LugarResumen, "nombre"> | undefined): string => (sitio.modo === "lugar" ? (lugar?.nombre ?? "") : sitio.otro.sitioTexto);

/** Lo que dice la tarjeta de «¿Es aquí?» como título: el nombre y, si el mapa no lo dio, la dirección. */
export const tituloDe = (c: Pick<Candidato, "nombre" | "direccion">): string => c.nombre.trim() || c.direccion.trim();

/** El nombre que sale con un sitio reservado cuando el mapa no dio ninguno: nunca la dirección, que es lo que se reserva. */
export const NOMBRE_RESERVADO = "Sitio reservado";

/** Un sitio que no es del directorio, según lo que se hace con él: el mismo punto, público o con la dirección reservada (guardarlo como lugar crea el lugar y luego es `sitioDeLugar`). */
export function sitioDeCandidato(c: Candidato, uso: UsoSitio, otro: OtroSitio): Sitio {
  const nombre = tituloDe(c).slice(0, LIMITES_EVENTO.sitio);
  const direccion = c.direccion.trim().slice(0, LIMITES_EVENTO.direccion);
  if (uso === "reservado") {
    const visible = c.nombre.trim().slice(0, LIMITES_EVENTO.sitio) || NOMBRE_RESERVADO;
    return { modo: "reservado", lugarId: "", otro: { ...base(otro), reservado: true, sitioTexto: visible, direccionPrivada: direccion || visible, privadoPunto: c.punto, pinPendiente: false, ciudad: c.ciudad } };
  }
  return { modo: "otro", lugarId: "", otro: { ...base(otro), sitioTexto: nombre, direccion, sitioPunto: c.punto, pinPendiente: false, ciudad: c.ciudad } };
}

/** «Guardarlo como lugar» pide un nombre: la dirección no nombra un lugar. Un negocio también se guarda (decisión del founder, 2026-10-06: los
 *  cafés, bares y restaurantes entran al directorio con su tipo). */
export const puedeGuardarComoLugar = (c: Candidato): boolean => !!c.nombre.trim();

/** Las opciones del paso «No está en el directorio», en su orden. */
export const usosDisponibles = (c: Candidato): Uso[] => (puedeGuardarComoLugar(c) ? ["evento", "lugar", "reservado"] : ["evento", "reservado"]);

/** Hasta dónde un lugar del directorio cuenta como «el mismo sitio» que el pin (en metros). */
export const RADIO_MISMO_SITIO_M = 50;

/** El lugar del directorio que cae a menos de `radio` metros del punto (el más cercano), con la distancia en metros. De entrada,
 *  `RADIO_MISMO_SITIO_M` (el sitio de un evento); el alta de lugar pregunta «¿Es este?» a 150 m, como el servidor. */
export function lugarAlLado(lugares: readonly LugarResumen[], punto: Punto, radio = RADIO_MISMO_SITIO_M): { lugar: LugarResumen; metros: number } | null {
  let mejor: { lugar: LugarResumen; metros: number } | null = null;
  for (const lugar of lugares) {
    const metros = distanciaKm(punto, { lat: lugar.lat, lng: lugar.lng }) * 1000;
    if (metros < radio && (!mejor || metros < mejor.metros)) mejor = { lugar, metros };
  }
  return mejor && { ...mejor, metros: Math.round(mejor.metros) };
}

/** Lo recorrido, de 0 a 1 (lo opcional cuenta como «Revisa»; confirmar el sitio en el mapa y decidir qué hacer con él, como «Dónde»). */
export function avance(paso: Paso): number {
  if (paso === "publicado") return 1;
  // El paso del tiempo de cada clase ocupa el lugar del día: lo sustituye (doc 55 §2).
  const comoDia = paso === "visita" || paso === "sesiones" || paso === "programa";
  return ORDEN.indexOf(paso === "mas" ? "revisa" : paso === "mapa" || paso === "uso" ? "donde" : comoDia ? "dia" : paso) / ORDEN.length;
}

/**
 * Los días que se sugieren, medidos en producción el 2026-10-05 (solo lectura, 274 eventos visibles; bitácora 323, cuarta vuelta):
 * viernes (68) y sábado (71) son el 51 %. Cada uno es el próximo a partir de `hoy` (YYYY-MM-DD en la zona del evento), hoy incluido.
 */
const DIAS_SUGERIDOS = [
  { etiqueta: "Este viernes", semana: 5 },
  { etiqueta: "Este sábado", semana: 6 },
] as const;

export function diasSugeridos(hoy: string): { etiqueta: string; dia: string }[] {
  const semana = new Date(`${hoy}T12:00:00Z`).getUTCDay();
  return DIAS_SUGERIDOS.map(({ etiqueta, semana: s }) => ({ etiqueta, dia: sumarDiasIso(hoy, (s - semana + 7) % 7) }));
}

/**
 * Las horas de inicio que se sugieren, de la misma medición (274 eventos, 2026-10-05): 19:00 (52), 20:00 (39), 17:00 (28) y 12:00
 * (22), el 51 % de los inicios, en ese orden. Límite anotado entonces: casi todos los cargó la administración desde agendas
 * institucionales; cuando haya eventos de la gente, se vuelve a medir.
 */
export const HORAS_SUGERIDAS = ["19:00", "20:00", "17:00", "12:00"] as const;

/** Las duraciones que se ofrecen (prototipo firmado): una, dos y tres horas. En producción (36 eventos con hora de fin, 2026-10-05):
 *  9 duran 2 h, 6 duran 3 h y 5 duran 1 h; otros 12 duran de 7 a 9 h (jornadas de museo) y 2 terminan al día siguiente. */
export const DURACIONES = [1, 2, 3] as const;

/** «1 hora», «2 horas». */
export const etiquetaDuracion = (horas: number): string => `${horas} ${horas === 1 ? "hora" : "horas"}`;

/**
 * El horario de cada sesión de un taller: el de cada una si la casilla «Misma hora todas las sesiones» está desmarcada (`sesiones`); si no, la
 * hora común en cada día. Vacío sin días o sin hora.
 */
export function horariosDelTaller(r: Respuestas): HorarioDia[] {
  if (r.sesiones) return r.sesiones;
  return r.hora ? horariosDeTaller(r.sesionesDias, r.hora, r.fin ?? "") : [];
}

/** Las sesiones que viajan al servidor: el horario por día de un evento de varios días, o las de un taller de dos o más sesiones (sus días son sueltos). */
export function sesionesDe(r: Respuestas): HorarioDia[] | null {
  if (r.clase === "taller") {
    const horarios = horariosDelTaller(r);
    return horarios.length >= 2 ? horarios : null;
  }
  return r.clase === "puntual" ? r.sesiones : null;
}

/** «YYYY-MM-DDTHH:MM» del inicio; "" sin día o sin hora. Con horario por día, la hora del primer día; una exposición, su primer día de visita;
 *  un taller, su primera sesión; un festival, su primer acto marcado. */
export function inicioDe(r: Respuestas): string {
  if (r.clase === "exposicion") return r.visita?.desde && r.visita.hasta ? periodoDeVisita({ desde: r.visita.desde, hasta: r.visita.hasta }).inicio : "";
  if (r.clase === "taller") {
    const horarios = horariosDelTaller(r);
    return horarios.length ? combinarFechaHora(horarios[0].dia, horarios[0].hora) : "";
  }
  // Un festival que ya existe (editar) conserva su periodo: lo recalcula la base con su programa.
  if (r.clase === "festival" && actosMarcados(r).length) return actosMarcados(r).filter((a) => a.dia && a.hora).map((a) => combinarFechaHora(a.dia, a.hora)).sort()[0] ?? "";
  return r.sesiones ? inicioFinDeHorarios(r.sesiones).inicio : r.dias && r.hora ? combinarFechaHora(r.dias.desde, r.hora) : "";
}

/**
 * El fin del evento como se guarda: `r.fin`, o con horario por día el de la última sesión (sin hora de fin, el fin de ese día). Una exposición
 * acaba con su día de cierre; un taller de una sesión, a su hora de fin (o sin ella), y uno de varias, con la última; un festival, con el día de
 * su último acto marcado (la base lo vuelve a calcular). null: todavía no se contesta.
 */
export function finDe(r: Respuestas): string | null {
  if (r.clase === "exposicion") return r.visita?.desde && r.visita.hasta ? periodoDeVisita({ desde: r.visita.desde, hasta: r.visita.hasta }).fin : null;
  if (r.clase === "taller") {
    const horarios = horariosDelTaller(r);
    if (!horarios.length) return null;
    if (horarios.length === 1) return horarios[0].fin ? combinarFechaHora(horarios[0].dia, horarios[0].fin) : "";
    return inicioFinDeHorarios(horarios).fin;
  }
  if (r.clase === "festival" && actosMarcados(r).length) {
    const ultimo = actosMarcados(r).map((a) => a.dia).filter(Boolean).sort().at(-1);
    return ultimo ? combinarFechaHora(ultimo, FIN_DEL_DIA) : null;
  }
  return r.sesiones ? inicioFinDeHorarios(r.sesiones).fin : r.fin;
}

/** El programa como se dice en «Revisa» y en «Publicado»: «Del 12 al 14 de nov · Programa registrado: 3 actividades»; null sin actos marcados. */
export function resumenPrograma(r: Pick<Respuestas, "actos">, hoy: string): string | null {
  const marcados = actosMarcados(r);
  const dias = marcados.map((a) => a.dia).filter(Boolean).sort();
  if (!marcados.length) return null;
  const cuando = !dias.length ? null : dias[0] === dias[dias.length - 1] ? null : rangoCorto(dias[0], dias[dias.length - 1], hoy);
  return [cuando, textoProgramaRegistrado(marcados.length)].filter(Boolean).join(" · ");
}

/** El último día del evento: el de inicio si dura uno solo. */
const ultimoDia = (dias: Dias): string => dias.hasta ?? dias.desde;

/**
 * Los fines que se sugieren, uno por cada duración de `DURACIONES` y en su orden: el último día a la hora de inicio, más una, dos y
 * tres horas, en la zona del evento (un fin que pasa de la medianoche cae en el día siguiente). Vacío sin día o sin hora.
 */
export function finesSugeridos(r: Respuestas, zona: string): string[] {
  if (!r.dias || !r.hora) return [];
  const base = combinarFechaHora(ultimoDia(r.dias), r.hora);
  return DURACIONES.map((horas) => sumarHoras(base, horas, zona));
}

/**
 * El fin con una hora elegida en la lista («Otra hora»), o sin hora de fin (`""`), con la regla de `conHoraFin`: cae en el último
 * día; en uno de un día, una hora que no es posterior al inicio es la madrugada del día siguiente; sin hora, un evento de varios días
 * acaba con su último día y uno de un día queda sin fin.
 */
export function finConHora(r: Respuestas, hora: string): string {
  if (!r.dias || !r.hora) return "";
  const inicio = combinarFechaHora(r.dias.desde, r.hora);
  const varios = !!r.dias.hasta && r.dias.hasta > r.dias.desde;
  return conHoraFin({ inicio, fin: varios ? combinarFechaHora(ultimoDia(r.dias), FIN_DEL_DIA) : "" }, hora).fin;
}

/** Lo que el servidor devolvió al publicar: lo único que no sale de las respuestas. */
export type Creado = { id: string; slug: string | null; creadoEn: string };

/**
 * El evento como quedó, con la forma que tiene en las listas (`EventoAgenda`): lo que pinta la tarjeta de «Publicado» es lo que verá la
 * gente en la agenda. Sale de las respuestas con las mismas reglas con que el servidor guarda (el precio, el sitio) y de lo que él
 * devolvió. `lugar` es el lugar del directorio si es en uno; `zona`, la de las horas (la misma con que se leyeron); `imagen`, el cartel.
 */
export function eventoPublicado(r: Respuestas, creado: Creado, { lugar, zona, imagen }: { lugar: Pick<LugarResumen, "nombre" | "portada"> | undefined; zona: string; imagen: string | null }): EventoAgenda {
  const { modo, lugarId, otro } = r.sitio;
  const fin = finDe(r);
  return {
    id: creado.id,
    slug: creado.slug,
    titulo: r.nombre.trim().slice(0, LIMITES_EVENTO.titulo),
    inicio: localAIso(inicioDe(r), zona) ?? "",
    fin: fin ? localAIso(fin, zona) : null,
    zona,
    imagen,
    precio: r.costo === "cooperacion" ? COOPERACION_SOLIDARIA : r.costo === "precio" ? `$${r.precio}` : null,
    lugar_id: modo === "lugar" ? lugarId : null,
    sitio_texto: modo === "lugar" ? null : otro.sitioTexto.slice(0, LIMITES_EVENTO.sitio),
    // La dirección de un sitio reservado nunca sale: es lo que se reserva.
    sitio_direccion: modo === "otro" ? otro.direccion || null : null,
    sitio_reservado: modo === "reservado",
    lugar: modo === "lugar" && lugar ? { nombre: lugar.nombre, portada: lugar.portada } : null,
    creado_en: creado.creadoEn,
    van: null,
  };
}

