import { LIMITES_EVENTO } from "../limites";
import { normalizarNombre } from "../lugares";
import { enlaceSeguro, textoLimpio } from "./candidatos";
import { textoDeDescripcion } from "./carteleraCdmx";

/**
 * Los eventos de un sitio de WordPress con «The Events Calendar» (OL-509): su API pública `wp-json/tribe/events/v1/events`, sin llave y sin la
 * API de Anthropic. El primero es el de Turismo del estado de San Luis Potosí (eventos.visitasanluispotosi.com), que el 2 de noviembre costaba
 * 0,039 USD por evento con la búsqueda web; el lector es genérico: otra ciudad solo guarda la URL base de su sitio con el tipo `tribe`.
 *   · `?start_date=AAAA-MM-DD&end_date=AAAA-MM-DD&per_page=50&page=N`, con `total_pages`.
 *   · `start_date`/`end_date` («2026-11-13 21:00:00») van en la hora LOCAL del sitio aunque `timezone` diga «UTC+0» (lo comprobado: Enjambre en
 *     el Teatro del Pueblo, 21:00, igual que su boletera; El Cascanueces en el Teatro de la Paz, 20:30). `all_day`: sin hora, no entra.
 *   · `venue` (`venue`, `address`, `city`, `geo_lat`/`geo_lng` si los trae), `image.url` (WebP casi siempre: se acepta y al ponerlo como cartel se
 *     convierte a JPEG), `cost`, `url` (la ficha), `description` (HTML), `categories[].slug`.
 * Solo lo cultural: fuera lo que solo trae categorías de deportes, carreras, actos cívicos o ferias comerciales y congresos (`CATEGORIAS_FUERA`;
 * «Corre x tu marca» salió como evento el 2 de noviembre y hubo que ocultarlo). Lo dudoso (sin categoría, o una cultural junto a otra) entra: la
 * administración decide en la bandeja. Funciones puras: `agendas.ts` pide las páginas con la calma y propone por el `proponer` de siempre.
 */

/** La URL base de Turismo de San Luis Potosí. */
export const URL_TRIBE_SLP = "https://eventos.visitasanluispotosi.com/wp-json/tribe/events/v1/events";
export const POR_PAGINA_TRIBE = 50;
/** Las categorías que no son culturales (por su slug): deportes, carreras, actos cívicos, ferias comerciales, congresos y convenciones. */
export const CATEGORIAS_FUERA = /(deport|carrera|maraton|civic|desfile-civico|congreso|convencion|negocio|empresarial|comercial|expo-?venta)/i;

/** La dirección de la página N entre dos días. */
export function urlPaginaTribe(base: string, desde: string, hasta: string, pagina: number): string {
  const u = new URL(base);
  u.search = "";
  u.searchParams.set("start_date", desde);
  u.searchParams.set("end_date", hasta);
  u.searchParams.set("per_page", String(POR_PAGINA_TRIBE));
  u.searchParams.set("page", String(pagina));
  return u.href;
}

export type EventoTribe = {
  id: string;
  titulo: string;
  inicio: string | null;
  fin: string | null;
  todoElDia: boolean;
  lugar: string;
  direccion: string | null;
  municipio: string | null;
  lat: number | null;
  lng: number | null;
  imagen: string | null;
  precio: string | null;
  url: string | null;
  descripcion: string;
  categorias: string[];
};
export type PaginaTribe = { eventos: EventoTribe[]; paginas: number; total: number };

const objeto = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const cadena = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" && Number.isFinite(v) ? String(v) : "");
const coordenada = (v: unknown, limite: number): number | null => {
  const x = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isFinite(x) && x !== 0 && Math.abs(x) <= limite ? x : null;
};
const fechaHora = (v: unknown): string | null => (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(cadena(v).trim()) ? cadena(v).trim().slice(0, 16) : null);
const https = (v: unknown): string | null => {
  const u = enlaceSeguro(cadena(v));
  return u && u.startsWith("https://") ? u : null;
};
/** «SAN LUIS POTOSÍ» → «San Luis Potosí». */
const municipioDe = (v: unknown): string | null => {
  const t = textoLimpio(v, 80);
  return t ? (t === t.toUpperCase() ? t.toLowerCase().replace(/(^|\s)\p{L}/gu, (l) => l.toUpperCase()) : t) : null;
};

/** Una página de la API, o null si no es la respuesta que se espera. */
export function leerPaginaTribe(texto: string): PaginaTribe | null {
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return null;
  }
  const o = objeto(json);
  if (!Array.isArray(o.events)) return null;
  const eventos: EventoTribe[] = [];
  for (const e of o.events) {
    const x = objeto(e);
    const titulo = textoLimpio(x.title, LIMITES_EVENTO.titulo);
    if (!titulo) continue;
    const v = objeto(x.venue);
    const costo = textoLimpio(x.cost, 120);
    eventos.push({
      id: cadena(x.id).slice(0, 20),
      titulo,
      inicio: fechaHora(x.start_date),
      fin: fechaHora(x.end_date),
      todoElDia: x.all_day === true,
      lugar: textoLimpio(v.venue, LIMITES_EVENTO.sitio),
      direccion: textoLimpio(v.address, LIMITES_EVENTO.direccion) || null,
      municipio: municipioDe(v.city),
      lat: coordenada(v.geo_lat, 90),
      lng: coordenada(v.geo_lng, 180),
      imagen: https(objeto(x.image).url),
      precio: costo || null,
      url: https(x.url),
      descripcion: textoDeDescripcion(x.description),
      categorias: (Array.isArray(x.categories) ? x.categories : []).map((c) => cadena(objeto(c).slug).toLowerCase()).filter(Boolean),
    });
  }
  return { eventos, paginas: Math.max(1, Number(o.total_pages) || 1), total: Number(o.total) || eventos.length };
}

/** ¿Solo trae categorías que no son culturales? (Sin categoría, o con una cultural junto a otra, entra: lo decide la bandeja.) */
export const noEsCultural = (e: Pick<EventoTribe, "categorias">): boolean => e.categorias.length > 0 && e.categorias.every((c) => CATEGORIAS_FUERA.test(c));

/** Una fila con la forma de `EventoEntregado` (`agendas.ts`) y lo que trae la API además. */
export type FilaTribe = {
  titulo: string;
  fecha: string;
  hora: string;
  hora_fin: string | null;
  lugar: string;
  direccion: string | null;
  municipio: string | null;
  precio: string | null;
  descripcion: string;
  programa: string | null;
  termina: string | null;
  url: string;
  imagen: string | null;
  lat?: number;
  lng?: number;
  ficha_fuente: string;
};

/**
 * La fila de un evento (una: su primer día y su hora; la hora de fin, si termina ese mismo día). Sin hora (`all_day`), `sin_hora`; solo
 * categorías que no son culturales, `no_cultural`; sin ficha, `sin_ficha`.
 */
export function filaDeTribe(e: EventoTribe): { fila: FilaTribe | null; motivo: "sin_hora" | "no_cultural" | "sin_ficha" | null } {
  if (noEsCultural(e)) return { fila: null, motivo: "no_cultural" };
  if (e.todoElDia || !e.inicio) return { fila: null, motivo: "sin_hora" };
  if (!e.url) return { fila: null, motivo: "sin_ficha" };
  const [fecha, hora] = e.inicio.split(" ");
  const fin = e.fin && e.fin.slice(0, 10) === fecha && e.fin.slice(11) > hora ? e.fin.slice(11) : null;
  const gratis = /\b(gratis|gratuito|entrada libre|libre)\b/i.test(normalizarNombre(e.precio ?? ""));
  return {
    fila: {
      titulo: e.titulo,
      fecha,
      hora,
      hora_fin: fin,
      lugar: e.lugar,
      direccion: e.direccion,
      municipio: e.municipio,
      precio: gratis ? "Gratis" : e.precio,
      descripcion: e.descripcion,
      programa: null,
      termina: null,
      url: e.url,
      imagen: e.imagen,
      ...(e.lat !== null && e.lng !== null ? { lat: e.lat, lng: e.lng } : {}),
      ficha_fuente: e.url,
    },
    motivo: null,
  };
}
