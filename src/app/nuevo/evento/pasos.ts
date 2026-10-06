import { sitioListo } from "@/app/eventos/direccionEvento";
import type { QuienItem } from "@/lib/artistas";
import { esNegocio } from "@/lib/buscarLugares";
import { FIN_DEL_DIA, sumarDiasIso } from "@/lib/calendario";
import { conHoraFin } from "@/lib/cuandoEvento";
import { LIMITES_EVENTO, type ModoSitio, type OtroSitio } from "@/lib/eventos";
import { combinarFechaHora, sumarHoras } from "@/lib/fechas";
import { queFalta } from "@/lib/formulario";
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
export type Paso = "inicio" | "nombre" | "dia" | "hora" | "donde" | "mapa" | "uso" | "cuanto" | "revisa" | "mas";

/** El camino sin cartel, de principio a fin: también da la línea de avance. */
const ORDEN: readonly Paso[] = ["inicio", "nombre", "dia", "hora", "donde", "cuanto", "revisa"];

export type Costo = "gratis" | "cooperacion" | "precio";
export type Sitio = { modo: ModoSitio; lugarId: string; otro: OtroSitio };
export type Dias = { desde: string; hasta: string | null };

export type Respuestas = {
  nombre: string;
  /** El día de inicio (YYYY-MM-DD) y, si dura varios, el último. */
  dias: Dias | null;
  /** La hora de inicio, "HH:MM". */
  hora: string | null;
  /** El fin, «YYYY-MM-DDTHH:MM» en la hora del sitio; "" es «Sin hora de fin» y null, que todavía no se contesta. */
  fin: string | null;
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
  /** Lo que dice el mapa que es (`poi_category`), para saber si es un negocio. */
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
  /** Atrás desde `desde`; se ignora si ya no se está ahí. */
  | { tipo: "atras"; desde: Paso }
  /** Un resultado del mapa o «Estoy aquí»: a confirmarlo en el mapa. */
  | { tipo: "elegir"; candidato: Candidato }
  /** «Sí, es aquí» con un sitio que no es del directorio (con el pin donde quedó): a decir qué hacer con él. */
  | { tipo: "confirmar"; candidato: Candidato }
  /** Lo que se hace con el sitio: se vuelve su respuesta y sigue lo que falte. */
  | { tipo: "usar"; uso: UsoSitio };

export const OTRO_VACIO: OtroSitio = { reservado: false, sitioTexto: "", direccion: "", sitioPunto: null, direccionPrivada: "", privadoPunto: null, revelarHoras: 24, indicaciones: "", ciudad: null };

export function estadoInicial(quien: QuienItem[] = []): Estado {
  return {
    r: { nombre: "", dias: null, hora: null, fin: null, sitio: { modo: "lugar", lugarId: "", otro: OTRO_VACIO }, costo: null, precio: "", quien, descripcion: "", enlace: "" },
    candidato: null,
    pila: ["inicio"],
    direccion: null,
  };
}

export const pasoActual = (e: Estado): Paso => e.pila[e.pila.length - 1];

export const dondeResuelto = ({ modo, lugarId, otro }: Sitio): boolean => (modo === "lugar" ? !!lugarId : sitioListo(otro));

/** Lo que falta para publicar, en el orden en que se pregunta. */
export function faltan(r: Respuestas): Paso[] {
  const p: Paso[] = [];
  if (!r.nombre.trim()) p.push("nombre");
  if (!r.dias) p.push("dia");
  if (!r.hora || r.fin === null) p.push("hora");
  if (!dondeResuelto(r.sitio)) p.push("donde");
  if (!r.costo || (r.costo === "precio" && !r.precio)) p.push("cuanto");
  return p;
}

const FALTA: Record<Exclude<Paso, "inicio" | "mapa" | "uso" | "revisa" | "mas">, string> = { nombre: "el nombre", dia: "el día", hora: "la hora", donde: "el lugar", cuanto: "el precio" };

/** Lo que dice el botón de «Revisa» mientras algo falte («Falta el día y la hora»); null si ya se puede publicar. Sin punto: es un botón. */
export function faltaParaPublicar(r: Respuestas): string | null {
  const frase = queFalta(faltan(r).map((p) => FALTA[p as keyof typeof FALTA]));
  return frase && frase.slice(0, -1);
}

/**
 * La hora va con su día: contestar el día vuelve a preguntar la hora y el fin (el fin de un evento de un día no vale para uno de
 * tres; y desde «Revisa», tocar «Cuándo» es elegir el día y después la hora, como en el prototipo).
 */
function con(r: Respuestas, cambios: Partial<Respuestas>): Respuestas {
  return { ...r, ...(cambios.dias !== undefined ? { hora: null, fin: null } : {}), ...cambios };
}

const apilar = (e: Estado, paso: Paso): Estado => ({ ...e, pila: [...e.pila, paso], direccion: "entra" });

/** A lo primero que falte; sin nada pendiente, a «Revisa»: si ya se estuvo ahí (se abrió una pregunta desde ella), se regresa. */
function siguiente(e: Estado): Estado {
  const paso = faltan(e.r)[0];
  const revisa = e.pila.indexOf("revisa");
  if (paso || revisa < 0) return apilar(e, paso ?? "revisa");
  return { ...e, pila: e.pila.slice(0, revisa + 1), direccion: "vuelve" };
}

export function flujo(e: Estado, a: Accion): Estado {
  switch (a.tipo) {
    case "cambiar":
      return { ...e, r: con(e.r, a.cambios) };
    case "contestar":
      return siguiente({ ...e, r: con(e.r, a.cambios) });
    case "seguir":
      return siguiente(e);
    case "abrir":
      return apilar(e, a.paso);
    case "atras":
      return pasoActual(e) === a.desde && e.pila.length > 1 ? { ...e, pila: e.pila.slice(0, -1), direccion: "vuelve" } : e;
    case "elegir":
      return apilar({ ...e, candidato: a.candidato }, "mapa");
    case "confirmar":
      return apilar({ ...e, candidato: a.candidato }, "uso");
    case "usar":
      return e.candidato ? siguiente({ ...e, r: { ...e.r, sitio: sitioDeCandidato(e.candidato, a.uso, e.r.sitio.otro) } }) : e;
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

/** «Guardarlo como lugar» pide un nombre (la dirección no nombra un lugar) y que no sea un negocio (bar, café, restaurante). */
export const puedeGuardarComoLugar = (c: Candidato): boolean => !!c.nombre.trim() && !esNegocio(c.nombre, c.categorias);

/** Las opciones del paso «No está en el directorio», en su orden. */
export const usosDisponibles = (c: Candidato): Uso[] => (puedeGuardarComoLugar(c) ? ["evento", "lugar", "reservado"] : ["evento", "reservado"]);

/** Hasta dónde un lugar del directorio cuenta como «el mismo sitio» que el pin (en metros). */
export const RADIO_MISMO_SITIO_M = 50;

/** El lugar del directorio que cae a menos de `RADIO_MISMO_SITIO_M` del punto (el más cercano), con la distancia en metros. */
export function lugarAlLado(lugares: readonly LugarResumen[], punto: Punto): { lugar: LugarResumen; metros: number } | null {
  let mejor: { lugar: LugarResumen; metros: number } | null = null;
  for (const lugar of lugares) {
    const metros = distanciaKm(punto, { lat: lugar.lat, lng: lugar.lng }) * 1000;
    if (metros < RADIO_MISMO_SITIO_M && (!mejor || metros < mejor.metros)) mejor = { lugar, metros };
  }
  return mejor && { ...mejor, metros: Math.round(mejor.metros) };
}

/** Lo recorrido, de 0 a 1 (lo opcional cuenta como «Revisa»; confirmar el sitio en el mapa y decidir qué hacer con él, como «Dónde»). */
export function avance(paso: Paso): number {
  return ORDEN.indexOf(paso === "mas" ? "revisa" : paso === "mapa" || paso === "uso" ? "donde" : paso) / ORDEN.length;
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

/** «YYYY-MM-DDTHH:MM» del inicio; "" sin día o sin hora. */
export const inicioDe = (r: Respuestas): string => (r.dias && r.hora ? combinarFechaHora(r.dias.desde, r.hora) : "");

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
