import { extraerNumero } from "./eventos";
import { normalizarNombre } from "./lugares";

/**
 * El costo como lo escribe una agenda (OL-441, sobre OL-429): una sola regla para la rutina (`precioDeAgenda`, lo que queda en la propuesta) y
 * para publicar el evento aceptado (`publicarEvento`). En este orden:
 *   · «Cooperación voluntaria», «Donativo», «Aportación voluntaria», «A voluntad» → cooperación (su casilla), aunque sugiera una cifra.
 *   · Una cifra («$150», «150», «150 pesos») → ese precio; con más texto («$150 general, $100 niños», «Desde $150»), el primero. Un número sin
 *     «$», sin «pesos» y con más palabras («Mayores de 18», «General 150») no se toma por precio: no se inventa un costo.
 *   · «Entrada libre», «Gratis», «Sin costo» → gratis; también con algo más («Gratis con boleto», «Entrada libre, cupo limitado»).
 *   · «Costo de recuperación» (o «cuota») sin cifra → cooperación.
 *   · «Por confirmar», «Por definir» → «Por confirmar».
 *   · Cualquier otro texto («Entrada con acceso al museo», «Incluida en el boleto», «Consultar») → «Por confirmar», sea cual sea la clase: el
 *     evento aceptado nunca se queda sin publicar por el precio (el founder, 2026-10-21: «si no tiene precio que ponga por confirmar»).
 *   · Sin texto: «Por confirmar» donde el costo es opcional (`opcional`: festival, exposición, taller y lo que cuelga de ellos, OL-411) y gratis
 *     en un evento suelto (la agenda de Cultura calla el costo cuando es gratis).
 * `nota`: el texto de la agenda cuando dice más de lo que cabe en el costo, para que no se pierda (`conNotaDeCosto` lo pone al final de la
 * descripción como «Costo: …»). Lo que ya es solo el costo («Entrada libre», «$150», «Cooperación voluntaria») no deja nota.
 */
export type CostoDeAgenda = {
  costo: "gratis" | "cooperacion" | "precio" | "por_confirmar";
  /** La cifra del precio, sin «$» («150»); vacío si no es `precio`. */
  precio: string;
  nota: string | null;
};

const VOLUNTARIA = /^(?:(?:entrada|acceso|ingreso) )?(?:con )?(?:cooperacion|donativo|donacion|aportacion|a voluntad|cuota voluntaria)\b/;
const SOLO_VOLUNTARIA = /^(?:cooperacion(?: (?:voluntaria|solidaria|libre))?|donativo(?: voluntario)?|aportacion voluntaria|a voluntad|(?:costo|cuota) de recuperacion)$/;
const RECUPERACION = /\b(?:costo|cuota) de recuperacion\b/;
const GRATIS_AL_INICIO = /^(?:(?:entrada|acceso|evento|ingreso|admision) )?(?:libre|gratis|gratuit[oa]s?|sin costo|sin cargo)\b/;
const SOLO_GRATIS = /^(?:(?:entrada|acceso|evento|ingreso|admision) )?(?:libre|gratis|gratuit[oa]|sin costo)(?: (?:entrada|acceso))?$/;
const SOLO_POR_CONFIRMAR = /^(?:(?:costo|precio) )?por (?:confirmar|definir|anunciar)$/;
const SOLO_CIFRA = /^\$?\s*\d[\d.,]*\s*(?:pesos|mxn|m\.?\s?n\.?)?$/i;

/** La primera cifra que es un precio, sin «$»: con «$» delante, con «pesos» o «MXN» detrás, o sola en su trozo («150, 100»). */
function cifraDePrecio(t: string): string | null {
  // Por trozos («$150 general, $100 niños»): la coma de los miles («$1,500») no lleva espacio detrás.
  for (const trozo of t.split(/[;|·/]|,\s|\sy\s/)) {
    const m = /\$\s*(\d[\d.,]*)/.exec(trozo) ?? /(\d[\d.,]*)\s*(?:pesos|mxn|m\.?\s?n\.?)(?![a-z])/i.exec(trozo) ?? /^\s*(\d[\d.,]*)\s*$/.exec(trozo);
    const numero = m ? extraerNumero(m[1]) : "";
    if (/^\d{1,6}$/.test(numero)) return String(Number(numero));
  }
  return null;
}

export function costoDeAgenda(texto: string | null | undefined, opcional: boolean): CostoDeAgenda {
  const t = (texto ?? "").replace(/\s+/g, " ").trim();
  if (!t) return { costo: opcional ? "por_confirmar" : "gratis", precio: "", nota: null };
  const n = normalizarNombre(t);
  if (SOLO_POR_CONFIRMAR.test(n)) return { costo: "por_confirmar", precio: "", nota: null };
  if (VOLUNTARIA.test(n)) return { costo: "cooperacion", precio: "", nota: SOLO_VOLUNTARIA.test(n) ? null : t };
  const cifra = cifraDePrecio(t);
  if (cifra === "0") return { costo: "gratis", precio: "", nota: SOLO_CIFRA.test(t) ? null : t };
  if (cifra) return { costo: "precio", precio: cifra, nota: SOLO_CIFRA.test(t) ? null : t };
  if (GRATIS_AL_INICIO.test(n)) return { costo: "gratis", precio: "", nota: SOLO_GRATIS.test(n) ? null : t };
  if (RECUPERACION.test(n)) return { costo: "cooperacion", precio: "", nota: SOLO_VOLUNTARIA.test(n) ? null : t };
  return { costo: "por_confirmar", precio: "", nota: t };
}

/**
 * La descripción con el costo de la agenda al final («… Costo: Entrada con acceso al museo.»), dentro de su tope (se recorta la descripción, no
 * la nota). Si la descripción ya lo dice, tal cual.
 */
export function conNotaDeCosto(descripcion: string, nota: string | null, tope: number): string {
  const d = descripcion.replace(/\s+/g, " ").trim();
  if (!nota || normalizarNombre(d).includes(normalizarNombre(nota))) return d;
  const linea = `Costo: ${nota}${/[.!?…]$/.test(nota) ? "" : "."}`;
  if (!d) return linea.slice(0, tope);
  const separador = /[.!?…»")\]]$/.test(d) ? " " : ". ";
  const cabe = tope - linea.length - separador.length;
  if (cabe < 1) return linea.slice(0, tope);
  return d.length <= cabe ? `${d}${separador}${linea}` : `${d.slice(0, cabe - 1).trimEnd()}… ${linea}`;
}
