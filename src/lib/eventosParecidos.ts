/**
 * «¿Es este?» antes de publicar un evento (OL-384, bitácora 415): lo que devuelve la función `eventos_parecidos` de la base (migración
 * 20261012120000) y cómo se dice en el aviso de «Revisa». La regla vive en la base (el mismo día local, el mismo sitio, un título parecido);
 * aquí solo cuándo se pregunta y qué se pinta.
 */
import { hrefEvento, type Clase } from "./eventos";
import { formatearCuando } from "./fechas";
import { SIN_FOTO } from "./imagen";

/** Una fila de `eventos_parecidos`: lo justo para pintar el renglón y enlazar su ficha. */
export type EventoParecido = {
  id: string;
  slug: string | null;
  titulo: string;
  inicio: string;
  zona: string;
  imagen: string | null;
  lugar_id: string | null;
  lugar_nombre: string | null;
  sitio_texto: string | null;
  /** Solo si ya tiene cartel (OL-467): quien mira lo publicó o es de la administración, y puede cambiarlo por el suyo. La base lo vuelve a comprobar. */
  puede_cambiar?: boolean;
};

/** Lo que se pregunta antes de publicar: lo puntual y los talleres. Una exposición o un festival ocupan un periodo (la base no los compara). */
export function preguntaSiHayParecidos(clase: Clase | null | undefined): boolean {
  return !clase || clase === "puntual" || clase === "taller";
}

/** El renglón del aviso: el cartel (o el símbolo SN), el título, «vie 16 oct · 7:00 pm» en su zona y el sitio, y el enlace a su ficha. */
export function renglonParecido(p: EventoParecido, ahora: Date = new Date()) {
  return {
    href: hrefEvento(p),
    imagen: p.imagen || SIN_FOTO,
    titulo: p.titulo,
    cuando: formatearCuando(p.inicio, null, ahora, p.zona),
    donde: p.lugar_nombre || p.sitio_texto || "",
  };
}

/** La firma de lo que se confirmó con «No, es otro»: si cambia el título, el día o el sitio, se vuelve a preguntar. */
export function firmaParecidos(titulo: string, inicio: string | null, sitio: unknown): string {
  return JSON.stringify([titulo.trim(), inicio, sitio]);
}
