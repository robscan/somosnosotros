import { etiquetaDisciplina } from "./artistas";
import { cuandoVariosDias, diaCorto } from "./fechas";
import { etiquetaLugar } from "./lugares";
import { unir } from "./panel";

/**
 * «Lo que publicó» en la ficha de administración de una persona (OL-414, bitácora 445). Founder, 18 de octubre: «quisiera saber qué publicaron.
 * Ahora solo dice: publicó 2 pero no puedo ver que». Cada cosa que la persona dio de alta (`creado_por` = ella), por tipo y de la más reciente a la
 * más antigua. Aquí se escribe cada renglón y se cuenta, sin tocar la base, para poder probarlo; la lectura vive en `admin/consultas`
 * (`cargarPublicado`). El número del renglón «Publicó» sale de la misma lectura que la lista: es el mismo que la lista enseña.
 */

export type TipoPublicado = "eventos" | "lugares" | "artistas";
export const TIPOS_PUBLICADO: readonly TipoPublicado[] = ["eventos", "lugares", "artistas"];
export const TITULO_PUBLICADO: Record<TipoPublicado, string> = { eventos: "Eventos", lugares: "Lugares", artistas: "Artistas" };
/** Cuántos renglones se ven de cada tipo antes de «Ver más», y cuántos más trae cada «Ver más». */
export const PAGINA_PUBLICADO = 20;
/** El tope de una lectura (el de las listas del panel, `panel_*`: 600). */
export const TOPE_PUBLICADO = 600;

// ---------- lo que lee `cargarPublicado` ----------
export type EventoPublicado = {
  id: string;
  slug: string | null;
  titulo: string;
  imagen: string | null;
  inicio: string;
  fin: string | null;
  zona: string | null;
  clase: string | null;
  visible: boolean;
  borrador: boolean | null;
  cancelado: boolean | null;
  evento_padre_id: string | null;
  creado_en: string;
  sitio_texto: string | null;
  lugar: { nombre: string; portada: string | null } | null;
};
export type LugarPublicado = { id: string; slug: string | null; nombre: string; tipo: string; detalle: string | null; portada: string | null; visible: boolean; privado: boolean; creado_en: string };
export type ArtistaPublicado = { id: string; slug: string | null; nombre: string; disciplina: string; detalle: string | null; foto: string | null; visible: boolean; creado_en: string };

/** Una página de un tipo: sus filas (las primeras `n`) y cuántas hay en total (el `count` de la misma consulta). */
export type Pagina<T> = { filas: T[]; total: number };
export type Publicado = {
  eventos: Pagina<EventoPublicado>;
  lugares: Pagina<LugarPublicado>;
  artistas: Pagina<ArtistaPublicado>;
  /** El título de cada festival del que algún evento de la lista es acto, por su id. */
  festivales: Record<string, string>;
};

// ---------- los renglones ----------
/** Lo que el administrador ve y el público no: la etiqueta del renglón. */
export type EstadoPublicado = "Borrador" | "Oculto" | "Cancelado" | "Privado";

/** Un acto de programa sin publicar es «Borrador» (nunca se ve); lo que se ocultó, «Oculto»; lo que se canceló, «Cancelado». Uno solo, en ese orden. */
export function estadoEvento(e: Pick<EventoPublicado, "visible" | "borrador" | "cancelado">): EstadoPublicado | null {
  if (e.borrador) return "Borrador";
  if (!e.visible) return "Oculto";
  if (e.cancelado) return "Cancelado";
  return null;
}

/** Un lugar oculto, «Oculto»; uno privado (el mapeo personal de la administración), «Privado». */
export function estadoLugar(l: Pick<LugarPublicado, "visible" | "privado">): EstadoPublicado | null {
  if (!l.visible) return "Oculto";
  if (l.privado) return "Privado";
  return null;
}

export function estadoArtista(a: Pick<ArtistaPublicado, "visible">): EstadoPublicado | null {
  return a.visible ? null : "Oculto";
}

const CLASE: Record<string, string> = { festival: "Festival", exposicion: "Exposición", taller: "Taller" };

/**
 * El cuándo de un evento en su renglón: su día («jue 15 de oct», «Hoy»), o sus días si dura varios («Del 9 al 12 de oct»), con su clase delante
 * cuando no es un evento suelto («Festival · Del 9 al 12 de oct»). Un acto de un festival lo dice detrás, con el nombre del festival: el día va
 * primero para que nunca se corte.
 */
export function cuandoPublicado(e: Pick<EventoPublicado, "inicio" | "fin" | "zona" | "clase">, festival: string | null, ahora: Date = new Date()): string {
  const zona = e.zona ?? undefined;
  const dia = cuandoVariosDias(e.inicio, e.fin, ahora, zona)?.dias ?? diaCorto(e.inicio, ahora, zona);
  return unir([e.clase ? CLASE[e.clase] : null, dia, festival && `acto de ${festival}`]);
}

/** Dónde: el lugar con ficha o el sitio escrito. */
export function dondePublicado(e: Pick<EventoPublicado, "lugar" | "sitio_texto">): string {
  return e.lugar?.nombre ?? e.sitio_texto ?? "Sitio por confirmar";
}

/** Qué hace un artista: su disciplina y su subcategoría («Música · Acordeón»), como en la lista de Artistas del panel. */
export function disciplinaArtista(a: Pick<ArtistaPublicado, "disciplina" | "detalle">): string {
  if (a.disciplina === "por_completar") return a.detalle ? `Disciplina por completar · ${a.detalle}` : "Disciplina por completar";
  return etiquetaDisciplina(a.disciplina) + (a.detalle ? ` · ${a.detalle}` : "");
}

/** Qué es un lugar: su tipo («Galería», «Otro · Cafetería»). */
export function tipoLugar(l: Pick<LugarPublicado, "tipo" | "detalle">): string {
  return etiquetaLugar(l);
}

/** La foto del renglón de un evento: su cartel o, sin él, la portada de su lugar. */
export function fotoEventoPublicado(e: Pick<EventoPublicado, "imagen" | "lugar">): string | null {
  return e.imagen ?? e.lugar?.portada ?? null;
}

// ---------- el número ----------
/** Lo que dice el renglón «Publicó» sale de aquí: los totales de la misma lectura que la lista, en los nombres de `panel_persona`. */
export function totalesPublicado(p: Publicado): { publico_eventos: number; publico_lugares: number; publico_artistas: number } {
  return { publico_eventos: p.eventos.total, publico_lugares: p.lugares.total, publico_artistas: p.artistas.total };
}

export function totalPublicado(p: Publicado): number {
  return p.eventos.total + p.lugares.total + p.artistas.total;
}

/** Cuántos quedan por ver de un tipo («Ver más (12 más)»); 0 si ya se ven todos o si se llegó al tope de la lectura. */
export function faltanPublicado(p: Pagina<unknown>): number {
  if (p.filas.length >= TOPE_PUBLICADO) return 0;
  return Math.max(0, p.total - p.filas.length);
}

// ---------- la URL ----------
/** Cuántos renglones de cada tipo pide la URL (`?eventos=40`): de 20 en 20, de 20 al tope. */
export function leerPaginasPublicado(sp: Partial<Record<TipoPublicado, string | string[] | undefined>>): Record<TipoPublicado, number> {
  const leer = (v: string | string[] | undefined) => {
    const n = Number(Array.isArray(v) ? v[0] : v);
    if (!Number.isFinite(n) || n <= PAGINA_PUBLICADO) return PAGINA_PUBLICADO;
    return Math.min(TOPE_PUBLICADO, Math.ceil(n / PAGINA_PUBLICADO) * PAGINA_PUBLICADO);
  };
  return { eventos: leer(sp.eventos), lugares: leer(sp.lugares), artistas: leer(sp.artistas) };
}

/** «Ver más» de un tipo: la misma ficha con 20 renglones más de ese tipo, conservando lo que ya se abrió de los otros. */
export function hrefVerMasPublicado(perfilId: string, paginas: Record<TipoPublicado, number>, tipo: TipoPublicado): string {
  const p = new URLSearchParams();
  for (const t of TIPOS_PUBLICADO) {
    const n = t === tipo ? Math.min(TOPE_PUBLICADO, paginas[t] + PAGINA_PUBLICADO) : paginas[t];
    if (n > PAGINA_PUBLICADO) p.set(t, String(n));
  }
  return `/admin/personas/${perfilId}?${p.toString()}`;
}
