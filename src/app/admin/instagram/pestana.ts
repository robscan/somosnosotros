import type { DiaSemana } from "./semana";

/**
 * La pestaña con la que abre Administración › Instagram (OL-495, firmado en el prototipo de OL-493, bitácora 525): «Semana» si la semana tiene
 * algo de hoy en adelante (programado, publicándose, publicado hoy o una sugerencia, que solo sale si alguien tiene material); si no, «Eventos».
 * Pura: la página la calcula con la semana ya dicha y el día de hoy en la zona de la ciudad. La dirección (`?pestana=`, `?evento=`, `?dia=`,
 * `?semana=viene`) y la elección de la persona en la sesión ganan sobre esta regla (`PantallaInstagram`).
 */
export type PestanaInstagram = "semana" | "eventos";

type Dia = Pick<DiaSemana, "fecha" | "estado" | "pasado" | "sugerencia">;
const EN_CAMINO = new Set(["programado", "hoy", "publicando"]);

/** ¿La semana tiene algo de hoy en adelante? */
export function semanaConAlgo(dias: readonly Dia[], hoy: string): boolean {
  return dias.some((d) => d.fecha >= hoy && !d.pasado && (EN_CAMINO.has(d.estado) || (d.estado === "publicado" && d.fecha === hoy) || !!d.sugerencia));
}

export function pestanaInicial(dias: readonly Dia[] | null, hoy: string): PestanaInstagram {
  return dias && semanaConAlgo(dias, hoy) ? "semana" : "eventos";
}

/** La pestaña que pide la dirección, si la pide: la elegida, la de un aviso (`?evento=`, Eventos; `?dia=`, Semana) o «la que viene» (Semana). */
export function pestanaDeLaDireccion(params: { get(clave: string): string | null }): PestanaInstagram | null {
  const p = params.get("pestana");
  if (p === "eventos" || p === "semana") return p;
  if (params.get("evento")) return "eventos";
  if (params.get("dia") || params.get("semana") === "viene") return "semana";
  return null;
}
