import { z } from "zod";
import { slugDeCiudad } from "./ciudad";
import { diaLocal, horaCorta, ZONA_INICIAL } from "./fechas";
import { contar, unir } from "./panel";

/**
 * Administración › Ciudades (OL-427; doc 57 §4.B; prototipo firmado OL-425, bitácora 458): lo que se calcula y se escribe sin tocar la base,
 * para poder probarlo. Los datos llegan de `panel_ciudades()` y `panel_propuestas()` (migración 20261020140000_ciudades.sql). La rutina que
 * corre con la API es OL-428: aquí un botón solo deja una corrida «pendiente» con su tope, y la pantalla lo dice así. OL-432 (prototipo
 * firmado OL-431, bitácora 463): la lista general, el panel de cada ciudad con sus tarjetas y «Añadir ciudad» (lo de Mapbox, en
 * `src/app/admin/ciudades/alta.ts`).
 */

// ---------- lo que devuelve la base ----------
const numero = z.coerce.number().catch(0);
const fecha = z.string().nullable().catch(null);
const objeto = z.record(z.string(), z.unknown()).catch({});

export const ESTADOS_CIUDAD = ["abierta", "detectada", "investigando", "cerrada"] as const;
export type EstadoCiudad = (typeof ESTADOS_CIUDAD)[number];
export const TIPOS_CORRIDA = ["lugares", "agendas", "artistas", "showcase", "carteles"] as const;
export type TipoCorrida = (typeof TIPOS_CORRIDA)[number];
/** Las tres búsquedas que alimentan la ciudad (las que cuentan para su siguiente paso y su línea en la lista). */
export type TipoBoton = Exclude<TipoCorrida, "showcase" | "carteles">;
/** Un botón con hoja de tope en el panel de la ciudad: las tres búsquedas y «Buscar carteles» (OL-444), que completa eventos que ya están. */
export type TipoHoja = TipoBoton | "carteles";
export const ESTADOS_CORRIDA = ["pendiente", "corriendo", "terminada", "fallida", "cancelada"] as const;
export type EstadoCorrida = (typeof ESTADOS_CORRIDA)[number];

const esquemaCiudad = z.object({
  slug: z.string(),
  nombre: z.string(),
  estado: z.enum(ESTADOS_CIUDAD).catch("detectada"),
  lat: z.number().nullable().catch(null),
  lng: z.number().nullable().catch(null),
  zona: z.string().catch(ZONA_INICIAL),
  creado_en: z.string(),
  consultas: numero,
});
const esquemaCorrida = z.object({
  id: z.string(),
  tipo: z.enum(TIPOS_CORRIDA),
  ciudad: z.string().nullable().catch(null),
  parametros: objeto,
  tope_usd: numero,
  gasto_usd: numero,
  estado: z.enum(ESTADOS_CORRIDA),
  resumen: objeto,
  creado_en: z.string(),
  inicio: fecha,
  fin: fecha,
  propuestas: numero,
  aceptadas: numero,
  rechazadas: numero,
  por_revisar: numero,
});
const esquemaPanel = z.object({
  ciudades: z.array(esquemaCiudad),
  corridas: z.array(esquemaCorrida),
  credito: z.object({ usd: numero, vence: z.string().nullable().catch(null), gastado: numero }),
});
export type CiudadPanel = z.infer<typeof esquemaCiudad>;
export type CorridaPanel = z.infer<typeof esquemaCorrida>;
export type PanelCiudades = z.infer<typeof esquemaPanel>;

/** El panel tal como llega de la base, o null si no trae lo que la pantalla necesita (entonces se dice que no se pudo leer). */
export function leerPanelCiudades(datos: unknown): PanelCiudades | null {
  const r = esquemaPanel.safeParse(datos);
  return r.success ? r.data : null;
}

// ---------- los tres botones, en el orden del founder ----------
export const BOTONES: readonly { tipo: TipoBoton; verbo: string }[] = [
  { tipo: "lugares", verbo: "Buscar lugares" },
  { tipo: "agendas", verbo: "Buscar agendas y eventos" },
  { tipo: "artistas", verbo: "Buscar artistas" },
];

/** «Buscar carteles» (OL-444): va aparte de `BOTONES` porque no es el siguiente paso de una ciudad recién abierta, solo completa sus eventos. */
export const BOTON_CARTELES = { tipo: "carteles", verbo: "Buscar carteles" } as const;
/** Todos los botones del panel, en su orden. */
export const BOTONES_PANEL: readonly { tipo: TipoHoja; verbo: string }[] = [...BOTONES, BOTON_CARTELES];

/**
 * Lo que dice la hoja de cada botón: qué hace, con qué fuentes (en orden), cuánto se estima y su tope por omisión (si no, `TOPE_POR_DEFECTO`).
 * Las claves de las fuentes viajan en la corrida.
 */
export const HOJAS: Record<TipoHoja, { que: string; fuentes: readonly { clave: string; texto: (ciudad: string) => string }[]; estimado: string; tope?: number }> = {
  lugares: {
    que: "Busca los espacios culturales de la ciudad y te los propone uno por uno: nombre, tipo, dirección en el mapa, redes y de dónde salió. Nada se publica hasta que lo aceptas.",
    fuentes: [
      { clave: "sic", texto: () => "Catálogo de espacios culturales del Sistema de Información Cultural, por estado" },
      { clave: "cultura", texto: () => "Páginas de la Secretaría de Cultura del estado y del municipio" },
      { clave: "web", texto: () => "Búsqueda web" },
    ],
    estimado: "Se estima entre 1 y 3 USD.",
  },
  agendas: {
    que: "Busca las agendas que juntan los eventos del mes, las guarda como fuentes y lee sus eventos; si un lugar no existe, te propone darlo de alta. Cada mes se vuelve a correr sobre las fuentes guardadas.",
    fuentes: [
      // OL-448: en Ciudad de México esta fuente empieza por su cartelera, que se lee sin la API.
      { clave: "agenda-cultura", texto: (ciudad) => (/^ciudad de m[eé]xico$/i.test(ciudad.trim()) ? "Cartelera de la Ciudad de México y agendas de gobierno" : "Agenda de la Secretaría de Cultura del estado y del municipio") },
      { clave: "universidades-museos", texto: () => "Universidades y museos" },
      { clave: "web", texto: (ciudad) => `Búsqueda web: «agenda cultural ${ciudad}»` },
    ],
    estimado: "Se estima entre 1 y 5 USD.",
  },
  artistas: {
    que: "Busca catálogos como el CAPO (padrones de creadores, programas de estímulo, directorios de festivales) y propone fichas mínimas: nombre, disciplina, ciudad, enlace y fuente.",
    fuentes: [
      { clave: "padrones", texto: () => "Padrón estatal de creadores y programas de estímulo" },
      { clave: "festivales", texto: () => "Directorios de festivales" },
      { clave: "web", texto: () => "Búsqueda web" },
    ],
    estimado: "Se estima entre 1 y 3 USD.",
  },
  carteles: {
    que: "Busca el cartel ya publicado de los eventos próximos que no tienen, en el sitio de su lugar, en la página del evento, en notas de prensa o en agendas, y te lo propone con la página donde aparece. Instagram y Facebook no se pueden leer desde aquí: esos se revisan a mano. Nada se pone hasta que lo aceptas.",
    fuentes: [
      { clave: "sitio", texto: () => "Sitio del lugar y página del evento" },
      { clave: "web", texto: () => "Búsqueda web: notas de prensa y agendas" },
    ],
    estimado: "Se estima entre 0,50 y 2 USD.",
    tope: 2,
  },
};

export const TOPE_POR_DEFECTO = 3;
export const TOPE_MAXIMO = 50;

/** «3,00» → 3; «3.5» → 3.5. null si no es un tope válido (mayor que 0 y hasta 50, con dos decimales como mucho). */
export function leerTope(texto: string): number | null {
  const limpio = texto.trim().replace(/\s+/g, "").replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(limpio)) return null;
  const n = Number(limpio);
  return n > 0 && n <= TOPE_MAXIMO ? n : null;
}

/** Qué dice el campo del tope si no vale. */
export function errorTope(texto: string): string | null {
  if (!texto.trim()) return "Escribe el tope en dólares.";
  return leerTope(texto) === null ? `Un tope de más de 0 y hasta ${TOPE_MAXIMO} USD, como 3,00.` : null;
}

// ---------- números y fechas ----------
/** «3,00»: dos decimales con coma, como en el prototipo firmado. */
export function usd(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2).replace(".", ",");
}

/** «200» si es entero, «187,40» si no: el crédito de la portada de Corridas. */
export function usdCorto(n: number): string {
  return Number.isInteger(n) ? cifra(n) : usd(n);
}

/** «1 932»: miles con un espacio que no se parte, como en el prototipo firmado. */
export function cifra(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
}

/** «18 oct» (con año si no es el actual). */
export function diaMes(iso: string, ahora: Date = new Date(), zona: string = ZONA_INICIAL): string {
  const d = new Date(iso);
  const mismoAnio = diaLocal(d, zona).slice(0, 4) === diaLocal(ahora, zona).slice(0, 4);
  return new Intl.DateTimeFormat("es-MX", { timeZone: zona, day: "numeric", month: "short", ...(mismoAnio ? {} : { year: "numeric" }) })
    .format(d)
    .replace(/[.,]/g, "")
    .replace(/\bde\s+/g, "");
}

/** «hoy, 10:42 am» · «ayer, 9:15 pm» · «18 oct». */
export function cuando(iso: string, ahora: Date = new Date(), zona: string = ZONA_INICIAL): string {
  const dia = diaLocal(new Date(iso), zona);
  const hoy = diaLocal(ahora, zona);
  if (dia === hoy) return `hoy, ${horaCorta(iso, zona)}`;
  if (dia === diaLocal(new Date(ahora.getTime() - 86400000), zona)) return `ayer, ${horaCorta(iso, zona)}`;
  return diaMes(iso, ahora, zona);
}

const mayuscula = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

// ---------- una ciudad (OL-432: lo firmado en OL-431, bitácora 463, con las siete respuestas del gestor) ----------
/**
 * Los estados que se ven (respuesta 3): «investigando» se ve como abierta —con «Abrir» ya no hace falta— y una cerrada es la que se ocultó
 * (respuesta 6): no sale en la lista aunque siga sumando consultas.
 */
export type EstadoVisible = "abierta" | "detectada" | "cerrada";
export const estadoVisible = (e: EstadoCiudad): EstadoVisible => (e === "investigando" ? "abierta" : e);
export const ETIQUETA_ESTADO: Record<EstadoVisible, string> = { abierta: "Abierta", detectada: "Detectada", cerrada: "Oculta" };

const enCurso = (c: Pick<CorridaPanel, "estado">) => c.estado === "pendiente" || c.estado === "corriendo";

/** El avance que deja la rutina en su resumen, de 0 a 1 (`resumen.avance`), o null si no lo dice. */
export function avanceDe(c: Pick<CorridaPanel, "estado" | "resumen">): number | null {
  if (c.estado !== "corriendo") return null;
  const a = Number(c.resumen.avance);
  return Number.isFinite(a) ? Math.min(1, Math.max(0, a)) : null;
}

/** «3 de 10 meses», si la rutina lo dejó en su resumen (`resumen.paso`). */
function pasoDe(c: Pick<CorridaPanel, "resumen">): string | null {
  return typeof c.resumen.paso === "string" && c.resumen.paso.trim() ? c.resumen.paso.trim().slice(0, 60) : null;
}

/**
 * «Llegó al tope»: lo gastado alcanzó el tope, o la rutina dejó fuentes sin leer porque la siguiente llamada ya no cabía (`resumen.tope`,
 * OL-428: el motor para antes de pasarse, así que puede quedar un poco por debajo).
 */
const llegoAlTope = (c: Pick<CorridaPanel, "gasto_usd" | "tope_usd"> & { resumen?: Record<string, unknown> }) => c.resumen?.tope === true || (c.tope_usd > 0 && c.gasto_usd >= c.tope_usd);

/** Lo que la rutina dejó para la siguiente porque esta ya propuso su máximo (`resumen.descartados.de_mas`, OL-428 y OL-429). */
function esperanDe(c: Pick<CorridaPanel, "resumen">): number {
  const d = c.resumen.descartados;
  const n = d && typeof d === "object" && !Array.isArray(d) ? Number((d as Record<string, unknown>).de_mas) : 0;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/** Cómo quedó una búsqueda, como lo dice su tarjeta. «Llegó al tope» es una terminada que se detuvo en su tope; una cancelada no cuenta. */
export type EstadoBusqueda = "pendiente" | "corriendo" | "terminada" | "tope" | "fallo";
export function estadoBusqueda(c: Pick<CorridaPanel, "estado" | "gasto_usd" | "tope_usd" | "resumen">): EstadoBusqueda | null {
  if (c.estado === "cancelada") return null;
  if (c.estado === "fallida") return "fallo";
  if (c.estado === "terminada") return llegoAlTope(c) ? "tope" : "terminada";
  return c.estado;
}

export type Busquedas = Record<TipoBoton, CorridaPanel | null>;
/** La búsqueda de cada botón en una ciudad: la que está en curso o, si no, la más reciente que corrió (una cancelada no cuenta). */
export function busquedasDe(corridas: readonly CorridaPanel[], ciudad: string): Busquedas {
  return { lugares: busquedaDe(corridas, ciudad, "lugares"), agendas: busquedaDe(corridas, ciudad, "agendas"), artistas: busquedaDe(corridas, ciudad, "artistas") };
}
/** La búsqueda de un botón en una ciudad (también «Buscar carteles», OL-444): la que está en curso o la más reciente que corrió. */
export function busquedaDe(corridas: readonly CorridaPanel[], ciudad: string, tipo: TipoHoja): CorridaPanel | null {
  const propias = corridas.filter((c) => c.ciudad === ciudad && c.tipo === tipo && estadoBusqueda(c) !== null).sort((a, b) => Date.parse(b.creado_en) - Date.parse(a.creado_en));
  return propias.find(enCurso) ?? propias[0] ?? null;
}
const estadoDe = (b: Busquedas, tipo: TipoBoton) => (b[tipo] ? estadoBusqueda(b[tipo]!) : null);

/** Cuántas propuestas esperan en una ciudad, de todas sus búsquedas (el número violeta de su fila y de «Por revisar»). */
export function porRevisarDe(corridas: readonly Pick<CorridaPanel, "ciudad" | "por_revisar">[], ciudad: string): number {
  return corridas.reduce((t, c) => t + (c.ciudad === ciudad ? c.por_revisar : 0), 0);
}

export const verboDe = (tipo: TipoHoja): string => BOTONES_PANEL.find((b) => b.tipo === tipo)!.verbo;
const BUSCANDO: Record<TipoBoton, string> = { lugares: "Buscando lugares", agendas: "Buscando agendas y eventos", artistas: "Buscando artistas" };
const RECIENTE_MS = 2 * 60_000;
const VARIAS = ["Una", "Dos", "Las tres"] as const;

export type LineaFila = { texto: string; alerta: boolean; avance: number | null };
/**
 * La tercera línea de la fila de una ciudad: lo que hay que decidir, en una frase («Buscando agendas y eventos · 3 de 10 meses» con su barra;
 * «Una búsqueda falló y otra llegó al tope»; «Abierta hoy · 3 búsquedas por correr»). Sin nada que decidir, ninguna. Las propuestas por
 * revisar no van aquí: son el número violeta de la derecha.
 */
export function lineaFila(ciudad: Pick<CiudadPanel, "estado"> & { abiertaEn?: string | null }, b: Busquedas, ahora: Date = new Date()): LineaFila | null {
  if (estadoVisible(ciudad.estado) !== "abierta") return null;
  const con = (e: EstadoBusqueda) => BOTONES.filter(({ tipo }) => estadoDe(b, tipo) === e);
  const corre = con("corriendo")[0];
  if (corre) return { texto: unir([BUSCANDO[corre.tipo], pasoDe(b[corre.tipo]!)]), alerta: false, avance: avanceDe(b[corre.tipo]!) };
  const fallos = con("fallo");
  const topes = con("tope");
  if (fallos.length && topes.length)
    return { texto: `${fallos.length === 1 ? "Una búsqueda falló" : "Dos búsquedas fallaron"} y ${topes.length === 1 ? "otra llegó al tope" : "dos llegaron al tope"}`, alerta: true, avance: null };
  if (fallos.length) return { texto: fallos.length === 1 ? `«${fallos[0].verbo}» falló` : `${VARIAS[fallos.length - 1]} búsquedas fallaron`, alerta: true, avance: null };
  if (topes.length) return { texto: topes.length === 1 ? `«${topes[0].verbo}» llegó al tope` : `${VARIAS[topes.length - 1]} búsquedas llegaron al tope`, alerta: false, avance: null };
  const espera = con("pendiente")[0];
  if (espera) {
    const reciente = ahora.getTime() - Date.parse(b[espera.tipo]!.creado_en) < RECIENTE_MS;
    return { texto: `«${espera.verbo}» ${reciente ? "empieza en unos segundos" : "espera su turno"}`, alerta: false, avance: null };
  }
  if (BOTONES.every(({ tipo }) => !b[tipo])) {
    const hoy = !!ciudad.abiertaEn && diaLocal(new Date(ciudad.abiertaEn)) === diaLocal(ahora);
    return { texto: unir([hoy ? "Abierta hoy" : null, "3 búsquedas por correr"]), alerta: false, avance: null };
  }
  return null;
}

/** ¿Hay algo que decidir? Propuestas por revisar; una búsqueda que espera, corre, falló o llegó al tope; o recién abierta, con todo por correr. */
export function hayQueDecidir(ciudad: Pick<CiudadPanel, "estado">, b: Busquedas, porRevisar: number): boolean {
  if (estadoVisible(ciudad.estado) !== "abierta") return false;
  const estados = BOTONES.map(({ tipo }) => estadoDe(b, tipo));
  return porRevisar > 0 || estados.some((e) => e !== null && e !== "terminada") || estados.every((e) => e === null);
}

/**
 * El orden de la lista (firma de OL-425, ampliada en OL-431): primero las que tienen algo por decidir; luego las detectadas (falta decidir si
 * se abren); luego el resto. En cada grupo, por consultas y después por nombre. Las ocultas no salen.
 */
export function ordenarCiudades<T extends Pick<CiudadPanel, "slug" | "nombre" | "estado" | "consultas">>(ciudades: readonly T[], corridas: readonly CorridaPanel[]): T[] {
  const rango = (c: T) => (estadoVisible(c.estado) === "detectada" ? 1 : hayQueDecidir(c, busquedasDe(corridas, c.slug), porRevisarDe(corridas, c.slug)) ? 0 : 2);
  return ciudades.filter((c) => c.estado !== "cerrada").sort((a, b) => rango(a) - rango(b) || b.consultas - a.consultas || a.nombre.localeCompare(b.nombre, "es"));
}

/**
 * El único botón violeta del panel (OL-431, decisión 10): «Revisar» si hay propuestas; si una búsqueda espera o corre, ninguno (no se corre
 * dos veces); si no, la primera búsqueda que falta o que no terminó (falló o llegó al tope), en el orden del founder. Todo al día: ninguno.
 */
export function siguientePaso(b: Busquedas, porRevisar: number): "revisar" | TipoBoton | null {
  if (porRevisar > 0) return "revisar";
  if (BOTONES.some(({ tipo }) => b[tipo] && enCurso(b[tipo]!))) return null;
  return (
    BOTONES.find(({ tipo }) => {
      const e = estadoDe(b, tipo);
      return e === null || e === "fallo" || e === "tope";
    })?.tipo ?? null
  );
}

const frase = (t: string) => {
  const s = t.replace(/\s+/g, " ").trim().slice(0, 200);
  return s ? mayuscula(/[.!?…]$/.test(s) ? s : `${s}.`) : "";
};
/** La razón de «Falló» (`resumen.error`) y de «Llegó al tope» (su tope y dónde iba), en una frase. Las demás no llevan. */
export function razonCorrida(c: Pick<CorridaPanel, "estado" | "gasto_usd" | "tope_usd" | "resumen">): string | null {
  const e = estadoBusqueda(c);
  if (e === "fallo") return frase(typeof c.resumen.error === "string" ? c.resumen.error : "") || "Se detuvo sin dejar la razón.";
  if (e !== "tope") return null;
  const paso = pasoDe(c);
  return `Se detuvo en el tope de ${usd(c.tope_usd)} USD${paso ? ` en ${paso}` : ""}; la siguiente sigue donde se quedó.`;
}
/** Lo que la hoja de «Correr» recuerda arriba si la vez pasada falló o llegó al tope: «La vez pasada» + esto. */
export function vezPasada(c: CorridaPanel | null): string | null {
  const r = c ? razonCorrida(c) : null;
  return r ? r.charAt(0).toLowerCase() + r.slice(1) : null;
}

export type Pildora = { texto: string; tono: "gris" | "violeta" | "verde" | "naranja" | "rojo" };
export type LineaBusqueda = { pildora: Pildora; texto: string; razon: string | null; alerta: boolean; avance: number | null };
const LA_DE: Record<TipoHoja, string> = { lugares: "la de lugares", agendas: "la de agendas", artistas: "la de artistas", carteles: "la de carteles" };

/**
 * Bajo la raya de una tarjeta del panel: la última búsqueda de su botón con la píldora de Corridas y su detalle («Terminada · 20 oct · 30
 * propuestos · 13 rechazados · 0,33 USD»; «Corriendo · 3 de 10 meses · 0,40 de 3,00 USD» con su barra). «Falló» y «Llegó al tope» dicen su
 * razón; lo que la rutina dejó para la siguiente se cuenta («41 esperan a la siguiente», respuesta 5). `todas`: para saber a qué espera una
 * pendiente (el motor corre una a la vez).
 */
export function lineaBusqueda(c: CorridaPanel, todas: readonly CorridaPanel[], ahora: Date = new Date()): LineaBusqueda | null {
  const e = estadoBusqueda(c);
  if (!e) return null;
  const fecha = mayuscula(cuando(c.fin ?? c.inicio ?? c.creado_en, ahora));
  const gasto = `${usd(c.gasto_usd)} USD`;
  const propuestos = `${c.propuestas} ${c.propuestas === 1 ? "propuesto" : "propuestos"}`;
  const n = esperanDe(c);
  const esperan = n ? `${n} ${n === 1 ? "espera" : "esperan"} a la siguiente` : null;
  if (e === "pendiente") {
    const otra = todas.find((o) => o.id !== c.id && o.estado === "corriendo");
    const espera = otra
      ? otra.ciudad === c.ciudad && otra.tipo !== "showcase"
        ? `Espera a ${LA_DE[otra.tipo]}`
        : "Espera su turno"
      : ahora.getTime() - Date.parse(c.creado_en) < RECIENTE_MS
        ? "Empieza en unos segundos"
        : "Espera su turno";
    return { pildora: { texto: "Pendiente", tono: "gris" }, texto: unir([espera, `tope ${usd(c.tope_usd)} USD`]), razon: null, alerta: false, avance: null };
  }
  if (e === "corriendo") return { pildora: { texto: "Corriendo", tono: "violeta" }, texto: unir([pasoDe(c), `${usd(c.gasto_usd)} de ${usd(c.tope_usd)} USD`]), razon: null, alerta: false, avance: avanceDe(c) ?? 0 };
  if (e === "fallo") return { pildora: { texto: "Falló", tono: "rojo" }, texto: unir([fecha, contar(c.propuestas, "propuesto", "propuestos"), gasto]), razon: razonCorrida(c), alerta: true, avance: null };
  if (e === "tope")
    return { pildora: { texto: "Llegó al tope", tono: "naranja" }, texto: unir([fecha, propuestos, contar(c.rechazadas, "rechazado", "rechazados"), esperan, gasto]), razon: razonCorrida(c), alerta: false, avance: null };
  return {
    pildora: { texto: "Terminada", tono: "verde" },
    texto: unir([fecha, propuestos, contar(c.aceptadas, "aceptado", "aceptados"), contar(c.rechazadas, "rechazado", "rechazados"), esperan, gasto]),
    razon: null,
    alerta: false,
    avance: null,
  };
}

// ---------- el panel de una ciudad ----------
/** «a», «a y b», «a, b y c». */
export function listaY(xs: readonly string[]): string {
  return xs.length < 2 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} y ${xs.at(-1)}`;
}
/** Hasta tres, enteras; más, las dos primeras y cuántas faltan: «Cuauhtémoc, Miguel Hidalgo y 3 más». */
export function listaCorta(xs: readonly string[]): string {
  return xs.length <= 3 ? listaY(xs) : `${xs.slice(0, 2).join(", ")} y ${xs.length - 2} más`;
}

/** Lo que la pantalla lee de `ciudades.parametros` (OL-429 y OL-432): alcaldías, municipios del área, radio y cuándo se abrió. */
export type ParametrosVista = { alcaldias: string[]; municipios: string[]; radioKm: number | null; abiertaEn: string | null };
const textos = (v: unknown): string[] =>
  Array.isArray(v)
    ? [
        ...new Set(
          v
            .filter((x): x is string => typeof x === "string")
            .map((x) => x.replace(/\s+/g, " ").trim())
            .filter((x) => x.length >= 2 && x.length <= 80),
        ),
      ].slice(0, 30)
    : [];
export function leerParametrosVista(v: unknown): ParametrosVista {
  const p = v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const r = Number(p.radio_km);
  const abierta = typeof p.abierta_en === "string" && Number.isFinite(Date.parse(p.abierta_en)) ? p.abierta_en : null;
  return { alcaldias: textos(p.alcaldias), municipios: textos(p.municipios), radioKm: p.radio_km != null && Number.isFinite(r) && r >= 0.5 && r <= 100 ? r : null, abiertaEn: abierta };
}

/**
 * La línea bajo el nombre del panel: desde cuándo («Buscando desde hoy, 9:12 am» si una búsqueda corre; si no, «Abierta hoy, 8:05 am» o
 * «Detectada el 20 oct») y qué cuenta con ella (sus alcaldías, «Cuauhtémoc, Miguel Hidalgo y 3 más»; o sus municipios o alias, «con Soledad
 * de Graciano Sánchez»).
 */
export function cabeceraCiudad(c: { estado: EstadoCiudad; creado_en: string; alias: readonly string[]; parametros: ParametrosVista }, b: Busquedas, ahora: Date = new Date()): string {
  const corre = BOTONES.map(({ tipo }) => b[tipo]).find((r) => r?.estado === "corriendo");
  const desde = corre
    ? `Buscando desde ${cuando(corre.inicio ?? corre.creado_en, ahora)}`
    : c.parametros.abiertaEn
      ? `Abierta ${conArticulo(cuando(c.parametros.abiertaEn, ahora))}`
      : estadoVisible(c.estado) === "detectada"
        ? `Detectada el ${diaMes(c.creado_en, ahora)}`
        : null;
  const municipios = c.parametros.municipios.length ? c.parametros.municipios : c.alias;
  const area = c.parametros.alcaldias.length ? listaCorta(c.parametros.alcaldias) : municipios.length ? `con ${listaCorta(municipios)}` : null;
  return mayuscula(unir([desde, area]));
}
const conArticulo = (t: string) => (/^\d/.test(t) ? `el ${t}` : t);

/** «De «Buscar lugares» del 20 oct: 30 propuestas, 13 ya rechazadas»; de dos búsquedas o más, cuáles. */
export function detallePorRevisar(corridas: readonly CorridaPanel[], ciudad: string, ahora: Date = new Date()): string {
  const con = corridas.filter((c) => c.ciudad === ciudad && c.por_revisar > 0 && c.tipo !== "showcase").sort((a, b) => Date.parse(a.creado_en) - Date.parse(b.creado_en));
  if (!con.length) return "";
  const verbos = BOTONES_PANEL.filter((b) => con.some((c) => c.tipo === b.tipo)).map((b) => `«${b.verbo}»`);
  if (con.length > 1) return verbos.length === 1 ? `De ${con.length} búsquedas de ${verbos[0]}` : `De ${con.length} búsquedas: ${listaY(verbos)}`;
  const c = con[0];
  const cu = cuando(c.creado_en, ahora);
  const ya = listaY([contar(c.aceptadas, "ya aceptada", "ya aceptadas"), contar(c.rechazadas, "ya rechazada", "ya rechazadas")].filter((x): x is string => !!x));
  return `De ${verbos[0]} ${/^\d/.test(cu) ? "del" : "de"} ${cu}: ${c.propuestas} ${c.propuestas === 1 ? "propuesta" : "propuestas"}${ya ? `, ${ya}` : ""}`;
}
/** El botón de «Por revisar»: «Revisar las 17». */
export const textoRevisar = (n: number): string => (n === 1 ? "Revisar la propuesta" : `Revisar las ${n}`);

/** Bajo el número de la tarjeta de «Buscar carteles» (OL-444): «eventos próximos sin cartel». */
export const baseCarteles = (n: number): string => (n === 1 ? "evento próximo sin cartel" : "eventos próximos sin cartel");

/** «3 nuevos este mes» bajo el número de lugares; sin lugares, nada. */
export function baseLugares(total: number, nuevos: number): string | null {
  if (!total) return null;
  return nuevos ? `${cifra(nuevos)} ${nuevos === 1 ? "nuevo" : "nuevos"} este mes` : "Ninguno nuevo este mes";
}
function deOrigen(origen: string | null): string {
  if (origen === null) return "de su gente";
  if (/^agenda-secult/.test(origen)) return "de la agenda de Cultura";
  if (origen === "agenda-institucion") return "de agendas de instituciones";
  if (origen === "rutina-agendas") return "de sus búsquedas";
  if (origen === "redes") return "de redes";
  if (origen === "capo") return "del Catálogo CAPO";
  return "de otras cargas";
}
/** «41 de la agenda de Cultura · 23 de su gente» (`eventos.origen`, OL-424: nulo es lo que publicó una persona). */
export function baseEventos(porOrigen: readonly { origen: string | null; n: number }[]): string | null {
  const grupos = new Map<string, number>();
  for (const { origen, n } of porOrigen) if (n > 0) grupos.set(deOrigen(origen), (grupos.get(deOrigen(origen)) ?? 0) + n);
  const partes = [...grupos].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es")).map(([de, n]) => `${cifra(n)} ${de}`);
  return partes.length ? partes.slice(0, 3).join(" · ") : null;
}
/** «520 del Catálogo CAPO · 166 por su cuenta». */
export function baseArtistas(total: number, capo: number): string | null {
  return unir([contar(capo, "del Catálogo CAPO", "del Catálogo CAPO"), contar(Math.max(0, total - capo), "por su cuenta", "por su cuenta")]) || null;
}

const sumarDias = (dia: string, n: number) => new Date(Date.parse(`${dia}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const diasEntre = (desde: string, hasta: string) => Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000);

export type TarjetaConsultas = { valor: number; serie: number[] | null; base: string; cambio: string | null };
/**
 * «Consultas»: las de los últimos 30 días (hoy incluido, en la zona de la ciudad), con su tendencia por semana (cinco semanas; solo con cuatro
 * o más contadas enteras, para no dibujar una tendencia que no existe) y el cambio contra la semana pasada. `desde`: el primer día contado.
 */
export function tarjetaConsultas(vistas: readonly { dia: string; consultas: number }[], hoy: string, desde: string): TarjetaConsultas {
  const entre = (a: string, b: string) => vistas.reduce((t, v) => t + (v.dia >= a && v.dia <= b ? v.consultas : 0), 0);
  const valor = entre(sumarDias(hoy, -29), hoy);
  const semana = (k: number) => entre(sumarDias(hoy, -7 * k - 6), sumarDias(hoy, -7 * k));
  const entera = (k: number) => sumarDias(hoy, -7 * k - 6) >= desde;
  const serie: number[] = [];
  for (let k = 0; k < 5 && entera(k); k++) serie.unshift(semana(k));
  const d = entera(1) ? semana(0) - semana(1) : null;
  const cambio = d === null ? null : d > 0 ? `▲ ${cifra(d)} esta semana` : d < 0 ? `▼ ${cifra(-d)} esta semana` : "Igual que la semana pasada";
  const dias = diasEntre(desde, hoy);
  const base =
    dias >= 29
      ? "en 30 días, al abrir Inicio o Lugares"
      : dias <= 0
        ? valor
          ? "desde hoy, al abrir Inicio o Lugares"
          : "se cuentan desde hoy"
        : `desde el ${diaMes(`${desde}T18:00:00Z`, new Date(`${hoy}T18:00:00Z`))}, al abrir Inicio o Lugares`;
  return { valor, serie: serie.length >= 4 ? serie : null, base, cambio };
}

/** Lo gastado en una ciudad: todas sus corridas. */
export function gastoDe(corridas: readonly Pick<CorridaPanel, "ciudad" | "gasto_usd">[], ciudad: string): number {
  return Math.round(corridas.reduce((t, c) => t + (c.ciudad === ciudad ? c.gasto_usd : 0), 0) * 100) / 100;
}

/** El detalle del grupo de la portada: «3 abiertas · 1 detectada» (investigando se cuenta abierta; las ocultas, aparte). */
export function resumenCiudades(ciudades: readonly Pick<CiudadPanel, "estado">[]): string {
  const n = (e: EstadoVisible) => ciudades.filter((c) => estadoVisible(c.estado) === e).length;
  return unir([contar(n("abierta"), "abierta", "abiertas"), contar(n("detectada"), "detectada", "detectadas"), contar(n("cerrada"), "oculta", "ocultas")], "Sin ciudades todavía");
}

// ---------- propuestas por revisar ----------
const TITULO_BANDEJA: Record<TipoCorrida, string> = { lugares: "Lugares", agendas: "Agendas y eventos", artistas: "Artistas", showcase: "Showcase", carteles: "Carteles" };

/** «0,33 USD», «9:12 am»: que «USD», «am» y «pm» no queden solos al partir el renglón (como en el prototipo firmado). Se aplica al pintar. */
export const pegado = (t: string): string => t.replace(/ (USD|am|pm)\b/g, "\u00a0$1");

/** «Lugares de Oaxaca» (el título de la bandeja de una corrida y de su renglón). */
export function tituloBandeja(tipo: TipoCorrida, ciudad: string | null): string {
  return ciudad ? `${TITULO_BANDEJA[tipo]} de ${ciudad}` : TITULO_BANDEJA[tipo];
}

/** La bandeja de una ciudad (respuesta 7): todas sus búsquedas juntas. */
export const hrefPropuestas = (ciudad: string): string => `/admin/ciudades/${ciudad}/propuestas`;

export type PorRevisar = { corrida: string; tipo: TipoCorrida; titulo: string; detalle: string; n: number; href: string };

/**
 * Lo que sube a «Pendiente» de la portada: un renglón por ciudad con propuestas por revisar (su bandeja junta todas sus búsquedas, respuesta
 * 7), de la que espera más a la que menos. Una corrida sin ciudad (el showcase) va sola, a su bandeja de siempre.
 */
export function propuestasPorRevisar(corridas: readonly CorridaPanel[], ciudades: readonly Pick<CiudadPanel, "slug" | "nombre">[], ahora: Date = new Date()): PorRevisar[] {
  const nombre = new Map(ciudades.map((c) => [c.slug, c.nombre]));
  const grupos = new Map<string, CorridaPanel[]>();
  for (const c of corridas.filter((x) => x.por_revisar > 0).sort((a, b) => Date.parse(a.creado_en) - Date.parse(b.creado_en))) {
    const clave = c.ciudad ?? `corrida:${c.id}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), c]);
  }
  return [...grupos.values()].map((lista) => {
    const [c] = lista;
    const n = lista.reduce((t, x) => t + x.por_revisar, 0);
    const deCiudad = c.ciudad ? (nombre.get(c.ciudad) ?? c.ciudad) : null;
    const unTipo = lista.every((x) => x.tipo === c.tipo);
    return {
      corrida: c.id,
      tipo: c.tipo,
      titulo: unTipo || !deCiudad ? tituloBandeja(c.tipo, deCiudad) : `Propuestas de ${deCiudad}`,
      detalle: lista.length === 1 ? `${n} por revisar · de la búsqueda del ${diaMes(c.creado_en, ahora)}` : `${n} por revisar · de ${lista.length} búsquedas`,
      n,
      href: c.ciudad ? hrefPropuestas(c.ciudad) : `/admin/ciudades/propuestas/${c.id}`,
    };
  });
}

/** «18 oct · 14 propuestos · 9 aceptados»: lo que se dice de cada búsqueda en la bandeja de su ciudad. */
export function notaBandeja(c: Pick<CorridaPanel, "creado_en" | "propuestas" | "aceptadas" | "rechazadas">, ahora: Date = new Date()): string {
  return unir([mayuscula(cuando(c.creado_en, ahora)), `${c.propuestas} ${c.propuestas === 1 ? "propuesto" : "propuestos"}`, contar(c.aceptadas, "aceptado", "aceptados"), contar(c.rechazadas, "rechazado", "rechazados")]);
}

// ---------- los nombres de una ciudad ----------
/** Los slugs con los que llega una ciudad a la app: el suyo, el de su nombre y los de sus alias (`ciudades.alias`). */
export function slugsDe(c: { slug: string; nombre: string; alias: readonly string[] }): string[] {
  return [...new Set([c.slug, slugDeCiudad(c.nombre), ...c.alias.map(slugDeCiudad)].filter(Boolean))];
}

/**
 * Una ciudad abierta junta a las filas que son ella con otro nombre (respuesta 1: «Oaxaca» en la lista y «Oaxaca de Juárez» como detalle,
 * que cuenta igual): si la detección dio de alta «Oaxaca de Juárez» como detectada y «Oaxaca» la tiene de alias, sus consultas suman a Oaxaca
 * y la detectada no sale aparte. `juntadas`: el slug de cada fila juntada → el de la ciudad que la junta.
 */
export function juntarAlias<T extends Pick<CiudadPanel, "slug" | "estado" | "consultas">>(
  ciudades: readonly T[],
  nombres: ReadonlyMap<string, { nombre: string; alias: readonly string[] }>,
): { ciudades: T[]; juntadas: Map<string, string> } {
  const juntadas = new Map<string, string>();
  for (const a of ciudades.filter((c) => estadoVisible(c.estado) === "abierta")) {
    const n = nombres.get(a.slug);
    if (!n) continue;
    for (const s of slugsDe({ slug: a.slug, ...n }))
      if (s !== a.slug && !juntadas.has(s) && ciudades.some((c) => c.slug === s && estadoVisible(c.estado) !== "abierta")) juntadas.set(s, a.slug);
  }
  const suma = new Map<string, number>();
  for (const c of ciudades) {
    const destino = juntadas.get(c.slug);
    if (destino) suma.set(destino, (suma.get(destino) ?? 0) + c.consultas);
  }
  return { ciudades: ciudades.filter((c) => !juntadas.has(c.slug)).map((c) => (suma.has(c.slug) ? { ...c, consultas: c.consultas + suma.get(c.slug)! } : c)), juntadas };
}

// ---------- la lista de corridas ----------
export const TITULO_TIPO: Record<TipoCorrida, string> = { lugares: "Lugares", agendas: "Agendas y eventos", artistas: "Artistas", showcase: "Showcase", carteles: "Carteles" };

/** «Lugares · Oaxaca». */
export function tituloCorrida(c: Pick<CorridaPanel, "tipo">, ciudad: string | null): string {
  return ciudad ? `${TITULO_TIPO[c.tipo]} · ${ciudad}` : TITULO_TIPO[c.tipo];
}

/** El detalle de una corrida en la lista: fecha, parámetros, resultados y gasto. */
export function detalleCorrida(c: CorridaPanel, ahora: Date = new Date()): string {
  const fuentes = Array.isArray(c.parametros.fuentes) ? c.parametros.fuentes.length : 0;
  const parametros = fuentes ? `${fuentes} ${fuentes === 1 ? "fuente" : "fuentes"}` : null;
  if (c.estado === "pendiente") return unir([mayuscula(cuando(c.creado_en, ahora)), parametros, `tope ${usd(c.tope_usd)} USD`]);
  if (c.estado === "corriendo") return unir([mayuscula(cuando(c.inicio ?? c.creado_en, ahora)), pasoDe(c), `${usd(c.gasto_usd)} de ${usd(c.tope_usd)} USD`]);
  if (c.estado === "cancelada") return unir([mayuscula(cuando(c.creado_en, ahora)), parametros, "no corrió"]);
  return unir([
    mayuscula(cuando(c.fin ?? c.creado_en, ahora)),
    parametros,
    `${c.propuestas} ${c.propuestas === 1 ? "propuesto" : "propuestos"}`,
    contar(c.aceptadas, "aceptado", "aceptados"),
    contar(c.por_revisar, "por revisar", "por revisar"),
    `${usd(c.gasto_usd)} USD`,
  ]);
}

/** La píldora de estado de una corrida. */
export function pildoraCorrida(c: Pick<CorridaPanel, "estado" | "gasto_usd" | "tope_usd"> & { resumen?: Record<string, unknown> }): Pildora {
  if (c.estado === "pendiente") return { texto: "Pendiente", tono: "gris" };
  if (c.estado === "corriendo") return { texto: "En curso", tono: "violeta" };
  if (c.estado === "fallida") return { texto: "Falló", tono: "rojo" };
  if (c.estado === "cancelada") return { texto: "Cancelada", tono: "gris" };
  return llegoAlTope(c) ? { texto: "Llegó al tope", tono: "naranja" } : { texto: "Terminada", tono: "verde" };
}

/** Por cuándo: «En curso» (pendientes y corriendo), «Esta semana» (lo de los últimos 7 días) y después por mes («Octubre»). */
export function gruposDeCorridas<T extends Pick<CorridaPanel, "estado" | "creado_en">>(corridas: readonly T[], ahora: Date = new Date(), zona: string = ZONA_INICIAL): { titulo: string; corridas: T[] }[] {
  const grupos = new Map<string, T[]>();
  const semana = ahora.getTime() - 7 * 86400000;
  const anio = diaLocal(ahora, zona).slice(0, 4);
  for (const c of [...corridas].sort((a, b) => Date.parse(b.creado_en) - Date.parse(a.creado_en))) {
    const d = new Date(c.creado_en);
    const titulo = enCurso(c)
      ? "En curso"
      : d.getTime() >= semana
        ? "Esta semana"
        : mayuscula(new Intl.DateTimeFormat("es-MX", { timeZone: zona, month: "long", ...(diaLocal(d, zona).slice(0, 4) === anio ? {} : { year: "numeric" }) }).format(d).replace(/\bde\s+/, ""));
    grupos.set(titulo, [...(grupos.get(titulo) ?? []), c]);
  }
  const orden = (t: string) => (t === "En curso" ? 0 : t === "Esta semana" ? 1 : 2);
  return [...grupos].map(([titulo, lista]) => ({ titulo, corridas: lista })).sort((a, b) => orden(a.titulo) - orden(b.titulo));
}

// ---------- el crédito ----------
/** Lo que queda del crédito, lo gastado y cuántos días faltan para que venza (null si ya venció o no se sabe). */
export function credito(c: PanelCiudades["credito"], ahora: Date = new Date()): { queda: number; inicial: number; gastado: number; vence: string | null; dias: number | null } {
  const vence = c.vence && /^\d{4}-\d{2}-\d{2}$/.test(c.vence) ? c.vence : null;
  const hoy = diaLocal(ahora);
  const dias = vence ? Math.round((Date.parse(`${vence}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86400000) : null;
  return { queda: Math.max(0, c.usd - c.gastado), inicial: c.usd, gastado: c.gastado, vence, dias: dias !== null && dias >= 0 ? dias : null };
}

/** «11 de noviembre». */
export function fechaVence(vence: string): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", day: "numeric", month: "long" }).format(new Date(`${vence}T12:00:00Z`));
}

/** «Crédito: 187,40 USD · vence el 11 de noviembre». */
export function lineaCredito(c: ReturnType<typeof credito>): string {
  return unir([`Crédito: ${usd(c.queda)} USD`, c.vence ? (c.dias === null ? `venció el ${fechaVence(c.vence)}` : `vence el ${fechaVence(c.vence)}`) : null]);
}
