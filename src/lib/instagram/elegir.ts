import { diaLocal } from "../fechas";

/**
 * Qué eventos se proponen para Instagram y en qué orden (OL-458, firmado; bitácora 490). Puro: la base filtra igual
 * (`instagram_sugerencias`, migración 20261023140000) y aquí se vuelve a decir para la ficha y para el servidor justo antes de publicar.
 *
 * Solo lo que está por venir: un evento que todavía no empieza; una exposición o un festival que ya abrió, mientras termine después de hoy (en
 * su zona); un taller que ya empezó, mientras le quede una sesión por delante. Nunca lo oculto, lo cancelado, lo retirado ni un borrador.
 */
export type ParaPublicar = {
  inicio: string;
  termina: string;
  zona: string;
  clase: string;
  visible?: boolean;
  cancelado?: boolean;
  borrador?: boolean;
  retirado_por_admin?: boolean;
  /** Los inicios de sus sesiones (un taller por días). */
  sesiones?: { inicio: string }[] | null;
};

export function sePuedePublicar(e: ParaPublicar, ahora: Date): boolean {
  if (e.visible === false || e.cancelado || e.borrador || e.retirado_por_admin) return false;
  if (new Date(e.inicio) > ahora) return true;
  if (e.clase === "exposicion" || e.clase === "festival") return diaLocal(new Date(e.termina), e.zona) > diaLocal(ahora, e.zona);
  if (e.clase === "taller") return (e.sesiones ?? []).some((s) => new Date(s.inicio) > ahora);
  return false;
}

/** ¿Empezó mientras se preparaba? Lo mismo, dicho al revés, para el aviso «Ya empezó» de la hoja y del servidor. */
export const yaEmpezo = (e: ParaPublicar, ahora: Date): boolean => !sePuedePublicar(e, ahora);

/**
 * Un festival por venir es un solo renglón (OL-463): sus actos no se sugieren aparte mientras él esté en la lista (once publicaciones del mismo
 * festival no sirven). `actos`: los actos publicados de los festivales de la lista (su id y el de su festival). Devuelve la lista sin esos actos y
 * cuántos actos tiene cada festival. Un acto cuyo festival no está en la lista (oculto, cancelado, ya terminó) se sugiere como cualquier evento; y
 * desde el «···» de su ficha se puede publicar siempre.
 */
export function unRenglonPorFestival<T extends { id: string; clase: string }>(filas: readonly T[], actos: readonly { id: string; evento_padre_id: string | null }[]): { filas: T[]; actos: Map<string, number> } {
  const festivales = new Set(filas.filter((f) => f.clase === "festival").map((f) => f.id));
  const cuenta = new Map<string, number>();
  const ocultos = new Set<string>();
  for (const a of actos) {
    if (!a.evento_padre_id || !festivales.has(a.evento_padre_id)) continue;
    cuenta.set(a.evento_padre_id, (cuenta.get(a.evento_padre_id) ?? 0) + 1);
    ocultos.add(a.id);
  }
  return { filas: filas.filter((f) => !ocultos.has(f.id)), actos: cuenta };
}

/** «1 acto», «11 actos». */
export const textoActos = (n: number): string => `${n} ${n === 1 ? "acto" : "actos"}`;

export type Senal ={ destacado: boolean; van: number; interesa: number; conCartel: boolean; inicio: string };

/** El orden de la lista: primero lo destacado, luego lo que más «Voy» y «Me interesa» suma, con cartel antes que sin él, y lo más próximo. */
export function porSenal(a: Senal, b: Senal): number {
  return Number(b.destacado) - Number(a.destacado) || b.van + b.interesa - (a.van + a.interesa) || Number(b.conCartel) - Number(a.conCartel) || a.inicio.localeCompare(b.inicio);
}

/** La línea de por qué está arriba: «Destacado · Sin cartel · 31 van · 54 les interesa». */
export function lineaDeSenal(s: Senal): string {
  return [s.destacado && "Destacado", !s.conCartel && "Sin cartel", `${s.van} van`, `${s.interesa} les interesa`].filter(Boolean).join(" · ");
}
