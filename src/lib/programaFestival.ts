import { textoProgramaRegistrado } from "./claseEvento";
import { eventoPaso } from "./fechas";

/** Lo mínimo de un acto para saber si ya pasó: la misma regla de siempre (`eventoPaso`: su fin o, sin fin, 3 h después de empezar; OL-358). */
type Fechado = { inicio: string; fin: string | null; zona: string };

/**
 * El programa de un festival partido en dos (OL-383, prototipo firmado `inicio-propuestas.html`, «X1 como pasado · X2»): lo que viene, que va en
 * «Programa», y lo que ya pasó, que va aparte en «Ya pasó». Cada lado conserva el orden en que llegó (por su inicio).
 */
export function programaDeFestival<T extends Fechado>(actos: readonly T[], ahora: Date = new Date()): { porVenir: T[]; pasados: T[] } {
  const porVenir: T[] = [];
  const pasados: T[] = [];
  for (const a of actos) (eventoPaso(a.inicio, a.fin, ahora, a.zona) ? pasados : porVenir).push(a);
  return { porVenir, pasados };
}

/**
 * La línea bajo el programa: «Programa registrado: 11 actividades · 6 por venir» si alguno ya pasó; si no, la de siempre
 * (`textoProgramaRegistrado`). Sin ninguno por venir, «ninguna por venir».
 */
export function textoProgramaConPasados(total: number, porVenir: number): string {
  if (porVenir >= total) return textoProgramaRegistrado(total);
  return `${textoProgramaRegistrado(total)} · ${porVenir ? `${porVenir} por venir` : "ninguna por venir"}`;
}

/** «5 actividades», bajo «Ya pasó». */
export const textoActividades = (n: number): string => `${n} ${n === 1 ? "actividad" : "actividades"}`;

/**
 * Cómo se abre la ficha de un evento (OL-383): `viva` es la de siempre; `pasado`, la ficha en pasado (para quien no lo gestiona, de un evento
 * que se ve y ya pasó: lo que enlaza «Ya pasó» de un festival); `no-existe`, «Esto ya no está». Quien lo publicó y la administración siguen
 * viendo lo que veían (`viva`, con su aviso). Un borrador o un evento oculto que ya pasó sigue sin existir para los demás; la sesión que aún
 * puede consultar una dirección reservada (OL-257, lo decide la base) lo ve en pasado, como antes lo veía.
 */
export function vistaDeFicha(e: { paso: boolean; puedeEditar: boolean; visible: boolean; borrador?: boolean | null; conDireccionReservada: boolean }): "viva" | "pasado" | "no-existe" {
  if (!e.paso || e.puedeEditar) return "viva";
  if (e.visible && !e.borrador) return "pasado";
  return e.conDireccionReservada ? "pasado" : "no-existe";
}
