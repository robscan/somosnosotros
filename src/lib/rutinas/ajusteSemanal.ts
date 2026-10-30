/**
 * El interruptor de las rutinas semanales (OL-489: «Completar fichas» una vez por semana en cada ciudad abierta), sin nada del servidor para que
 * lo lean la portada de Administración y el motor (`semanales.ts`). Vive en `configuracion` con la clave `rutina_fichas_semanal`:
 * { activa, tope_usd, cambiado_en, cambiado_por }. Apagado por omisión: el gestor lo enciende tras la primera corrida real.
 */

export const CLAVE_SEMANAL = "rutina_fichas_semanal";
export const TOPE_SEMANAL = 0.5;
export const SEMANA_MS = 7 * 86_400_000;

export type AjusteSemanal = { activa: boolean; tope_usd: number; cambiado_en: string | null; cambiado_por: string | null };

export function leerAjusteSemanal(v: unknown): AjusteSemanal {
  const o = v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const tope = Number(o.tope_usd);
  return {
    activa: o.activa === true,
    tope_usd: Number.isFinite(tope) && tope > 0 && tope <= 5 ? tope : TOPE_SEMANAL,
    cambiado_en: typeof o.cambiado_en === "string" ? o.cambiado_en : null,
    cambiado_por: typeof o.cambiado_por === "string" ? o.cambiado_por : null,
  };
}

const coma = (n: number) => (n > 0 && n < 0.005 ? "menos de 0,01" : (Math.round(n * 100) / 100).toFixed(2).replace(".", ","));

/**
 * Lo que dice el renglón de «Completar fichas» bajo su nombre: encendida o apagada (si corre sola y con qué tope) y cómo le fue en los últimos 7 días («Esta semana:
 * 2 corridas · 14 propuestos · 0,04 USD»; sin corridas, «Todavía no corre esta semana»).
 */
export function lineaSemanal(
  a: AjusteSemanal,
  corridas: readonly { tipo: string; creado_en: string; propuestas: number; gasto_usd: number; estado: string }[],
  ahora: Date = new Date(),
): { encendida: string; apagada: string; semana: string } {
  const semana = corridas.filter((c) => c.tipo === "fichas" && c.estado !== "cancelada" && Date.parse(c.creado_en) >= ahora.getTime() - SEMANA_MS);
  const propuestos = semana.reduce((t, c) => t + c.propuestas, 0);
  const gasto = semana.reduce((t, c) => t + c.gasto_usd, 0);
  return {
    encendida: `Cada semana en cada ciudad abierta, con tope de ${coma(a.tope_usd)}\u00a0USD por ciudad.`,
    apagada: "Apagada: solo corre al tocar «Completar fichas» en una ciudad.",
    semana: semana.length
      ? `Esta semana: ${semana.length === 1 ? "1 corrida" : `${semana.length} corridas`} · ${propuestos === 1 ? "1 propuesto" : `${propuestos} propuestos`} · ${coma(gasto)}\u00a0USD`
      : "Todavía no corre esta semana.",
  };
}
