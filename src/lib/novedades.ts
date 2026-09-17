import { diaLocal } from "./fechas";
import { compararNombres } from "./lugares";

/** Una novedad: qué pasó ("Nuevo en Casa Ocho Ventanas"), a qué evento, cuándo pasó y si es posterior a la última visita. */
export type TipoNovedad = "nuevo" | "cambio" | "hoy" | "juntos";
export type Novedad = {
  clave: string;
  tipo: TipoNovedad;
  que: string;
  eventoId: string;
  titulo: string;
  cuando: string;
  /** Cuándo empieza el evento (ISO): desempata lo que pasó a la vez, como los "Hoy vas" del día. */
  inicio: string;
  /** Cuándo pasó (ISO): ordena y agrupa por día. */
  fecha: string;
  nueva: boolean;
};
export type GrupoNovedades = { clave: string; titulo: string; novedades: Novedad[] };

/** Cuántos días atrás se mira. */
export const DIAS_NOVEDADES = 14;

/** "Hoy", "Ayer", "Esta semana", "Hace más": el título del grupo según cuándo pasó. */
export function tituloDia(fecha: string, ahora: Date = new Date()): string {
  const dia = diaLocal(new Date(fecha));
  if (dia === diaLocal(ahora)) return "Hoy";
  if (dia === diaLocal(new Date(ahora.getTime() - 86400000))) return "Ayer";
  if (new Date(fecha).getTime() >= ahora.getTime() - 7 * 86400000) return "Esta semana";
  return "Hace más";
}

/**
 * De más reciente a más antigua, en grupos por día (Hoy · Ayer · Esta semana · Hace más). Lo que pasó a la vez va en
 * orden de agenda (hora del evento, título) y por clave, para que dos cargas no lo traigan distinto (bitácora 062).
 */
export function agruparNovedades(lista: Novedad[], ahora: Date = new Date()): GrupoNovedades[] {
  const orden = ["Hoy", "Ayer", "Esta semana", "Hace más"];
  const grupos = new Map<string, GrupoNovedades>();
  for (const n of [...lista].sort((a, b) => b.fecha.localeCompare(a.fecha) || a.inicio.localeCompare(b.inicio) || compararNombres(a.titulo, b.titulo) || a.clave.localeCompare(b.clave))) {
    const titulo = tituloDia(n.fecha, ahora);
    let g = grupos.get(titulo);
    if (!g) {
      g = { clave: titulo, titulo, novedades: [] };
      grupos.set(titulo, g);
    }
    g.novedades.push(n);
  }
  return [...grupos.values()].sort((a, b) => orden.indexOf(a.titulo) - orden.indexOf(b.titulo));
}

/** "Cambió la fecha" · "Cambió el lugar" · "Cambió la fecha y el lugar". */
export function queCambio(detalle: string | null): string {
  return detalle === "ambos" ? "Cambió la fecha y el lugar" : detalle === "donde" ? "Cambió el lugar" : "Cambió la fecha";
}

/** "Van a lo mismo · Ana y Luis" · "Van a lo mismo · Ana, Luis y 2 más". */
export function queJuntos(nombres: string[]): string {
  const primeros = nombres.slice(0, 2);
  const resto = nombres.length - primeros.length;
  const lista = resto > 0 ? `${primeros.join(", ")} y ${resto} más` : primeros.length === 2 ? `${primeros[0]} y ${primeros[1]}` : primeros[0] ?? "";
  return `Van a lo mismo · ${lista}`;
}

/** Hay algo posterior a la última visita (para el punto de la campana). */
export function hayNuevas(lista: Novedad[]): boolean {
  return lista.some((n) => n.nueva);
}

/** Posterior a la última visita (nunca visitó: todo es nuevo). */
export function esNueva(fecha: string, vistasEn: string | null): boolean {
  return !vistasEn || new Date(fecha).getTime() > new Date(vistasEn).getTime();
}
