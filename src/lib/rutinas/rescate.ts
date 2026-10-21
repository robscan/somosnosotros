/**
 * La red de seguridad de la cadena de pasos (OL-429), sin esperar al cron diario: cuando Ciudades o Corridas se cargan y hay una corrida
 * varada, el servidor pide un paso después de responder (con `CRON_SECRET`, como la hoja «Correr»). Ninguna pantalla cambia.
 *
 * Varada es:
 *   · una `pendiente` creada hace más de 2 minutos (su primer paso se perdió), o
 *   · una `corriendo` que nadie trabaja (`ocupada_hasta` vencido o nulo) y que no avanza desde hace más de 2 minutos (`resumen.actualizada`,
 *     que el motor escribe en cada paso; si falta, su `inicio`). Así quedó la de San Luis la noche del 20 de octubre: «2 de 3 fuentes», turno 1,
 *     `ocupada_hasta` nulo, siete minutos sin pasos.
 * Una que se está trabajando (ocupada) o que acaba de avanzar no se toca: el siguiente paso ya va en camino.
 */

export const VARADA_MS = 120_000;
/** Como mucho, cuántos pasos pide una carga de la pantalla (uno por corrida varada). */
export const MAX_RESCATES = 3;

export type CorridaVista = { id: string; estado: string; resumen: unknown; creado_en: string; inicio?: string | null };

const objeto = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const instante = (v: unknown): number | null => {
  const t = typeof v === "string" ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? t : null;
};

/** Los ids de las corridas varadas, la más vieja primero. */
export function corridasVaradas(corridas: readonly CorridaVista[], ahora: Date): string[] {
  const limite = ahora.getTime() - VARADA_MS;
  return corridas
    .filter((c) => {
      if (c.estado === "pendiente") return (instante(c.creado_en) ?? Infinity) < limite;
      if (c.estado !== "corriendo") return false;
      const r = objeto(c.resumen);
      const ocupada = instante(r.ocupada_hasta);
      if (ocupada !== null && ocupada > ahora.getTime()) return false;
      const avance = instante(r.actualizada) ?? instante(c.inicio) ?? instante(c.creado_en);
      return avance !== null && avance < limite;
    })
    .sort((a, b) => (instante(a.creado_en) ?? 0) - (instante(b.creado_en) ?? 0))
    .map((c) => c.id);
}

/** Pide un paso por corrida varada (hasta `MAX_RESCATES`). Devuelve cuántos pidió. */
export async function rescatarVaradas(corridas: readonly CorridaVista[], ahora: Date, disparar: () => Promise<unknown>): Promise<number> {
  const varadas = corridasVaradas(corridas, ahora).slice(0, MAX_RESCATES);
  if (!varadas.length) return 0;
  console.warn(`rutinas: ${varadas.length === 1 ? "una corrida varada" : `${varadas.length} corridas varadas`}; se pide un paso`);
  await Promise.all(varadas.map(() => disparar()));
  return varadas.length;
}
