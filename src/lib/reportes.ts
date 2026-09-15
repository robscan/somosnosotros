import { esUuid } from "./formulario";
export const MOTIVOS = [
  { valor: "falso", etiqueta: "No existe o es falso" },
  { valor: "ofensivo", etiqueta: "Es ofensivo o inapropiado" },
  { valor: "duplicado", etiqueta: "Está repetido" },
  { valor: "no_cultural", etiqueta: "No es cultural" },
  { valor: "otro", etiqueta: "Otra cosa" },
] as const;
export type Motivo = (typeof MOTIVOS)[number]["valor"];
export type TipoReportado = "lugar" | "evento" | "perfil" | "artista";
export const TIPOS_REPORTADOS: TipoReportado[] = ["lugar", "evento", "perfil", "artista"];

/** "Soy yo / es mi grupo" (ficha de artista): no salen en el formulario de reportar; los escribe su propia acción. */
export const MOTIVOS_RECLAMO = [
  { valor: "es_mio", etiqueta: "Dice que es él o su grupo y quiere llevar la ficha" },
  { valor: "retirar", etiqueta: "Dice que es él o su grupo y pide que se quite" },
] as const;
export type MotivoReclamo = (typeof MOTIVOS_RECLAMO)[number]["valor"];

export function etiquetaMotivo(m: string): string {
  return MOTIVOS.find((x) => x.valor === m)?.etiqueta ?? MOTIVOS_RECLAMO.find((x) => x.valor === m)?.etiqueta ?? m;
}

export function validarReporte(entrada: { tipo?: string; objeto_id?: string; motivo?: string; detalle?: string }): { ok: true; datos: { tipo: TipoReportado; objeto_id: string; motivo: Motivo; detalle: string | null } } | { ok: false; error: string } {
  const tipo = entrada.tipo as TipoReportado;
  if (!TIPOS_REPORTADOS.includes(tipo)) return { ok: false, error: "Tipo desconocido." };
  if (!esUuid(entrada.objeto_id ?? "")) return { ok: false, error: "No sé qué reportar." };
  if (!MOTIVOS.some((m) => m.valor === entrada.motivo)) return { ok: false, error: "Elige un motivo." };
  const detalle = (entrada.detalle ?? "").trim().replace(/\s+/g, " ");
  if (detalle.length > 500) return { ok: false, error: "Máximo 500 caracteres." };
  return { ok: true, datos: { tipo, objeto_id: entrada.objeto_id!, motivo: entrada.motivo as Motivo, detalle: detalle || null } };
}
