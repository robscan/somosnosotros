/**
 * Los hitos públicos de un artista (OL-445): lo que la administración aceptó de lo que descubren las rutinas —premios, becas, obra publicada,
 * presentaciones y prensa—, que llega a su perfil («Reconocimientos y obra»), a su «Presentación» en PDF y a su «Tu año». La base los mantiene
 * (`artistas_hitos`, migración 20261022130000: uno por evidencia aceptada, nunca lo propuesto ni lo rechazado); aquí solo lo que no lee la base:
 * de qué clase es cada uno (un disco, un libro, una residencia…), en qué orden van, cómo se agrupan por año y cómo se cuentan en una frase.
 */
import { dominioDe } from "./enlaces";

/** Los tipos que se publican (los de `showcase_evidencias` menos «redes», que no es un hito). */
export const TIPOS_HITO = ["premio", "beca", "obra", "presentacion", "prensa"] as const;
export type TipoHito = (typeof TIPOS_HITO)[number];
export const esTipoHito = (v: unknown): v is TipoHito => typeof v === "string" && (TIPOS_HITO as readonly string[]).includes(v);

/** Un hito como lo lee el perfil: `fecha` YYYY-MM-DD o null (la fuente no la dijo). */
export type Hito = { id: string; tipo: TipoHito; titulo: string; url: string; fuente: string | null; fecha: string | null };

/**
 * La clase de un hito, más fina que su tipo: lo que el título deja ver (un disco, un libro, una exposición; una residencia o una selección
 * oficial, que la rúbrica ya cuenta como reconocimiento). En este orden van dentro de cada año: premios y becas primero, luego la obra, luego las
 * presentaciones y la prensa.
 */
export const CLASES_HITO = [
  { clase: "premio", etiqueta: "Premio", uno: "premio", varios: "premios" },
  { clase: "beca", etiqueta: "Beca", uno: "beca", varios: "becas" },
  { clase: "residencia", etiqueta: "Residencia", uno: "residencia", varios: "residencias" },
  { clase: "seleccion", etiqueta: "Selección oficial", uno: "selección oficial", varios: "selecciones oficiales" },
  { clase: "disco", etiqueta: "Disco", uno: "disco", varios: "discos" },
  { clase: "libro", etiqueta: "Libro", uno: "libro", varios: "libros" },
  { clase: "exposicion", etiqueta: "Exposición", uno: "exposición", varios: "exposiciones" },
  { clase: "obra", etiqueta: "Obra", uno: "obra publicada", varios: "obras publicadas" },
  { clase: "presentacion", etiqueta: "Presentación", uno: "presentación", varios: "presentaciones" },
  { clase: "prensa", etiqueta: "Prensa", uno: "nota de prensa", varios: "notas de prensa" },
] as const;
export type ClaseHito = (typeof CLASES_HITO)[number]["clase"];

const RESIDENCIA = /\bresidencias?\b/i;
const SELECCION = /\bseleccionad[oa]s?\b|\bselecci[oó]n oficial\b/i;
// Un sencillo no es un disco: queda como «obra publicada».
const DISCO = /\b(disco|[áa]lbum|ep|lp|vinilo)\b/i;
const LIBRO = /\b(libro|poemario|novela|antolog[íi]a|libro de cuentos|ensayo|plaquette)\b/i;
const EXPOSICION = /\b(exposici[óo]n|expo|muestra individual|muestra colectiva)\b/i;

/** La clase de un hito por su tipo y lo que dice su título. */
export function claseHito(h: Pick<Hito, "tipo" | "titulo">): ClaseHito {
  if (h.tipo === "premio") return "premio";
  if (RESIDENCIA.test(h.titulo)) return "residencia";
  if (h.tipo === "beca") return "beca";
  if (SELECCION.test(h.titulo)) return "seleccion";
  if (h.tipo === "obra") return DISCO.test(h.titulo) ? "disco" : LIBRO.test(h.titulo) ? "libro" : EXPOSICION.test(h.titulo) ? "exposicion" : "obra";
  return h.tipo;
}
const ORDEN = new Map<ClaseHito, number>(CLASES_HITO.map((c, i) => [c.clase, i]));
const datosClase = (c: ClaseHito) => CLASES_HITO[ORDEN.get(c)!];
/** «Premio», «Disco», «Selección oficial»: lo que va delante de un hito. */
export const etiquetaHito = (h: Pick<Hito, "tipo" | "titulo">): string => datosClase(claseHito(h)).etiqueta;

/** El año de un hito (YYYY) o null si no tiene fecha. */
export const anioHito = (h: Pick<Hito, "fecha">): string | null => (h.fecha && /^\d{4}/.test(h.fecha) ? h.fecha.slice(0, 4) : null);

/** El orden de siempre: por año, de lo más reciente a lo más viejo (sin fecha al final); en cada año, por clase; luego por fecha y título. */
export function ordenarHitos<T extends Pick<Hito, "tipo" | "titulo" | "fecha">>(hitos: readonly T[]): T[] {
  return [...hitos].sort((a, b) => {
    const ya = anioHito(a) ?? "0000";
    const yb = anioHito(b) ?? "0000";
    if (ya !== yb) return yb.localeCompare(ya);
    const ca = ORDEN.get(claseHito(a))!;
    const cb = ORDEN.get(claseHito(b))!;
    return ca - cb || (b.fecha ?? "").localeCompare(a.fecha ?? "") || a.titulo.localeCompare(b.titulo, "es");
  });
}

/** Los hitos por año, en el orden de `ordenarHitos`: «2026», «2025»… y al final «Sin fecha». */
export function hitosPorAnio<T extends Pick<Hito, "tipo" | "titulo" | "fecha">>(hitos: readonly T[]): { anio: string | null; titulo: string; hitos: T[] }[] {
  const grupos: { anio: string | null; titulo: string; hitos: T[] }[] = [];
  for (const h of ordenarHitos(hitos)) {
    const anio = anioHito(h);
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.anio === anio) ultimo.hitos.push(h);
    else grupos.push({ anio, titulo: anio ?? "Sin fecha", hitos: [h] });
  }
  return grupos;
}

/** Los de un año (YYYY), por su fecha. Sin fecha no cuentan en ningún año. */
export const hitosDelAnio = <T extends Pick<Hito, "fecha">>(hitos: readonly T[], anio: string): T[] => hitos.filter((h) => anioHito(h) === anio);

/**
 * Cuántos de cada clase, en una frase: «2 premios · 1 disco · 5 presentaciones». Hasta `tope` clases (en su orden: 4 en el perfil y el PDF, 3
 * en la línea de «Tu año», que es de un renglón); lo demás se suma en «3 más». Sin hitos, null.
 */
export function resumenHitos(hitos: readonly Pick<Hito, "tipo" | "titulo">[], tope = 4): string | null {
  if (!hitos.length) return null;
  const cuenta = new Map<ClaseHito, number>();
  for (const h of hitos) cuenta.set(claseHito(h), (cuenta.get(claseHito(h)) ?? 0) + 1);
  const partes = CLASES_HITO.filter((c) => cuenta.has(c.clase)).map((c) => ({ n: cuenta.get(c.clase)!, texto: `${cuenta.get(c.clase)} ${cuenta.get(c.clase) === 1 ? c.uno : c.varios}` }));
  const resto = partes.slice(tope).reduce((n, p) => n + p.n, 0);
  return [...partes.slice(0, tope).map((p) => p.texto), resto ? `${resto} más` : null].filter(Boolean).join(" · ");
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
/** «14 mar»: el día y el mes de la fecha del hito (sin zona: es un día, no un instante). */
export function diaMesHito(fecha: string): string {
  const [, m, d] = fecha.split("-").map(Number);
  return `${d} ${MESES[m - 1] ?? ""}`.trim();
}

/** Lo que va debajo del título: la fuente (o el dominio del enlace) y el día. «cultura.gob.mx · 14 mar». */
export function detalleHito(h: Pick<Hito, "fuente" | "url" | "fecha">): string {
  return [h.fuente?.trim() || dominioDe(h.url), h.fecha ? diaMesHito(h.fecha) : null].filter(Boolean).join(" · ");
}

/** El título de la sección en el perfil y en el PDF. */
export const TITULO_HITOS = "Reconocimientos y obra";
