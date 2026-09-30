import { eventosEstaSemana } from "./inicio";
import { compararNombres, etiquetaTipo } from "./lugares";

/** Cuántos atajos trae «Esta semana» en Buscar como mucho. */
export const MAXIMO_TIPOS_SEMANA = 5;

/**
 * Los atajos de «Esta semana» en Buscar (docs/rediseno/50, OL-237): los tipos de lo que hay en los próximos siete días, del que más
 * tiene al que menos, hasta cinco. Un evento no tiene tipo propio: es el del lugar donde ocurre (Museo, Foro, Galería…), que también
 * es la palabra con la que se busca («Otro» no dice nada y no entra). Sin eventos esa semana, ninguno.
 */
export function tiposDeLaSemana(eventos: { inicio: string; fin: string | null; lugar: { tipo: string } | null }[], ahora: Date = new Date()): string[] {
  const cuenta = new Map<string, number>();
  for (const e of eventosEstaSemana(eventos, ahora)) {
    const tipo = e.lugar?.tipo;
    if (tipo && tipo !== "otro") cuenta.set(tipo, (cuenta.get(tipo) ?? 0) + 1);
  }
  return [...cuenta]
    .map(([tipo, n]) => ({ etiqueta: etiquetaTipo(tipo), n }))
    .sort((a, b) => b.n - a.n || compararNombres(a.etiqueta, b.etiqueta))
    .slice(0, MAXIMO_TIPOS_SEMANA)
    .map((t) => t.etiqueta);
}
