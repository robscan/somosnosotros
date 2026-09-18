import { z } from "zod";

const cuenta = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const fecha = z.string().datetime({ offset: true });
const esquema = z.object({
  invitados: cuenta,
  ya_vinculados_al_invitar: cuenta,
  elegibles: cuenta,
  solicitaron_despues: cuenta,
  vinculados_despues: cuenta,
  primer_envio: fecha.nullable(),
  ultimo_envio: fecha.nullable(),
  corte: fecha,
}).strict().refine((m) =>
  m.invitados === m.ya_vinculados_al_invitar + m.elegibles &&
  m.solicitaron_despues <= m.elegibles && m.vinculados_despues <= m.elegibles &&
  (m.invitados === 0
    ? m.primer_envio === null && m.ultimo_envio === null
    : m.primer_envio !== null && m.ultimo_envio !== null &&
      Date.parse(m.primer_envio) <= Date.parse(m.ultimo_envio) && Date.parse(m.ultimo_envio) <= Date.parse(m.corte))
);

export type MetricasCapo = z.infer<typeof esquema>;

/** Una respuesta ausente, inválida o de otra versión nunca se presenta como cero. */
export function leerMetricasCapo(data: unknown): MetricasCapo | null {
  const parsed = esquema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export function porcentajeCapo(valor: number, base: number): string | null {
  if (base === 0) return null;
  return new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 1 }).format(valor / base);
}

export function fechaCapo(fecha: string): string {
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Mexico_City" }).format(new Date(fecha));
}
