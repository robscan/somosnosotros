import { etiquetaDisciplina, hrefArtista } from "./artistas";
import { etiquetaLugar, hrefLugar } from "./lugares";

/**
 * OL-447: asignar desde Administración una ficha de lugar o de artista a una persona (la misma liga que un reclamo aprobado). Aquí, lo que
 * no depende de la base ni de React: qué dice cada renglón, qué dice la hoja y cómo se leen las respuestas de `admin_asignar_ficha` y
 * `admin_quitar_ficha` (migración 20261022150000).
 */
export type TipoAsignable = "lugar" | "artista";
export const TIPOS_ASIGNABLES: readonly TipoAsignable[] = ["lugar", "artista"];
export const esTipoAsignable = (t: unknown): t is TipoAsignable => t === "lugar" || t === "artista";

/** Una ficha que sale al buscar (`admin_buscar_fichas`). `clase` es el tipo del lugar o la disciplina del artista. */
export type FichaHallada = {
  tipo: TipoAsignable;
  id: string;
  nombre: string;
  foto: string | null;
  ciudad: string | null;
  clase: string;
  detalle: string | null;
  visible: boolean;
  /** Esta persona ya la administra. */
  suya: boolean;
  /** El nombre de otra persona que la administra (la primera que llegó) y cuántas otras son. */
  otros: string | null;
  otros_n: number;
};

/** Una ficha que la persona administra (lo que lista su ficha en Administración). */
export type FichaAdministrada = { tipo: TipoAsignable; id: string; slug: string | null; nombre: string; foto: string | null; clase: string; detalle: string | null; ciudad: string | null };

/** Lo mínimo que se escribe para buscar: con una letra saldrían cientos. */
export const MINIMO_BUSQUEDA = 2;

/** Qué es la ficha: «Foro» o «Otro · Cafetería» para un lugar; «Música · Acordeón» para un artista. */
export function queEs(f: Pick<FichaHallada, "tipo" | "clase" | "detalle">): string {
  if (f.tipo === "lugar") return etiquetaLugar({ tipo: f.clase, detalle: f.detalle });
  if (f.clase === "por_completar") return f.detalle ? `Disciplina por completar · ${f.detalle}` : "Disciplina por completar";
  return etiquetaDisciplina(f.clase) + (f.detalle ? ` · ${f.detalle}` : "");
}

/** La primera línea de la meta: «Lugar · Foro · San Luis Potosí». */
export function lineaQueEs(f: Pick<FichaHallada, "tipo" | "clase" | "detalle" | "ciudad">): string {
  return [f.tipo === "lugar" ? "Lugar" : "Artista", queEs(f), f.ciudad].filter(Boolean).join(" · ");
}

/** La segunda línea: quién más la administra, o nadie. */
export function lineaQuienLaLleva(f: Pick<FichaHallada, "suya" | "otros" | "otros_n">, persona: string): string {
  if (f.suya) return `Ya la administra ${persona}`;
  if (!f.otros_n) return "Nadie la administra";
  const otro = f.otros || "una cuenta sin nombre";
  return f.otros_n === 1 ? `La administra ${otro}` : `La administran ${otro} y ${f.otros_n - 1} más`;
}

/** Lo que dice la hoja al elegir una ficha que otra persona ya administra (quién, ya lo dice el renglón): asignar agrega, no reemplaza. */
export function avisoCompartida(f: Pick<FichaHallada, "otros_n">): string | null {
  if (!f.otros_n) return null;
  return f.otros_n === 1
    ? "No se la quitamos a quien ya la administra: las dos cuentas podrán editarla."
    : "No se la quitamos a quienes ya la administran: todas las cuentas podrán editarla.";
}

/** El nombre con el que la hoja llama a la persona (sin nombre, «esta persona»). */
export const nombrePersona = (nombre: string | null | undefined) => nombre?.trim() || "esta persona";

/** El botón principal de la hoja: dice qué va a pasar. */
export function textoAsignar(ficha: string, persona: string): string {
  return `Asignar ${ficha} a ${persona}`;
}

/** Lo que dice la base al asignar; null es que salió bien. */
export function textoCodigoAsignar(codigo: string): string | null {
  switch (codigo) {
    case "ok":
      return null;
    case "ya":
      return "Ya la administraba. Recarga la página.";
    case "no_admin":
      return "Solo la administración asigna fichas.";
    case "sin_persona":
      return "Esta cuenta ya no existe.";
    case "sin_ficha":
      return "Esa ficha ya no existe o no se puede asignar.";
    default:
      return "No se pudo asignar. Intenta de nuevo.";
  }
}

/** Lo que dice la base al quitar; null es que salió bien («no_estaba» también: el resultado es el que se pedía). */
export function textoCodigoQuitar(codigo: string): string | null {
  switch (codigo) {
    case "ok":
    case "no_estaba":
      return null;
    case "no_admin":
      return "Solo la administración quita fichas.";
    default:
      return "No se pudo quitar. Intenta de nuevo.";
  }
}

/** La ruta pública de la ficha (Administración no tiene ficha propia de un lugar o un artista: abre la pública, donde ve lo oculto). */
export function hrefFicha(f: Pick<FichaAdministrada, "tipo" | "id" | "slug">): string {
  return f.tipo === "lugar" ? hrefLugar(f) : hrefArtista(f);
}

/** Ordena lo que administra: por nombre, sin importar acentos ni mayúsculas. */
export function ordenarAdministradas<T extends Pick<FichaAdministrada, "nombre" | "id">>(fichas: T[]): T[] {
  return [...fichas].sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }) || a.id.localeCompare(b.id));
}
