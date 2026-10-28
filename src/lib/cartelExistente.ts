/**
 * «Sí, es este: ponerle mi cartel» (OL-467; prototipo firmado de OL-466, bitácora 498): lo que no depende de la pantalla ni del servidor. Qué
 * respuesta lleva «¿Es este?» según lo que se encontró, qué se manda para completar el evento que ya estaba, qué dice el final y qué dice el
 * aviso a quien lo publicó. La regla de quién puede vive en la base (`poner_cartel_a_evento`, migración 20261028150000).
 */
import type { AvisoPush } from "./push";
import { deducirTipoArtista, quienDesdeJson } from "./artistas";
import { COOPERACION_SOLIDARIA, GRATIS, LIMITES_EVENTO, costoOpcional, esClase } from "./eventos";
import { localAIso, zonaSegura } from "./fechas";
import type { EventoParecido } from "./eventosParecidos";

/** Lo que se pregunta a `eventos_parecidos` en cuanto se lee el cartel (C2): el nombre, el inicio en la hora del sitio, la clase y el sitio. */
export type DatosParaParecidos = { titulo: string; inicio: string; clase: string; lugarId: string | null; sitioTexto: string | null; lat?: number | null; lng?: number | null };

/** Lo que la base completó del evento que ya estaba (en este orden se dice). */
export type Completado = "precio" | "fin" | "descripcion" | "artistas";
const ORDEN: Completado[] = ["precio", "fin", "descripcion", "artistas"];
const NOMBRE: Record<Completado, string> = { precio: "su precio", fin: "su hora de fin", descripcion: "su descripción", artistas: "quién se presenta" };

/**
 * La respuesta principal de «¿Es este?» (va en el pie), con un solo parecido:
 * - `poner`: no tiene cartel → «Sí, es este: ponerle mi cartel».
 * - `ir`: ya tiene cartel → «Sí, es este: ir al evento»; cambiarlo va en la caja, en segundo plano, y solo para quien lo publicó o la
 *   administración (`puedeCambiar`; a los demás, apagado con «Solo quien lo publicó puede cambiarlo.»).
 * Con dos o más (decisión 4 del founder), cada renglón abre su ficha, como hoy, y no se elige aquí: null.
 */
export type RespuestaParecido = { tipo: "poner"; parecido: EventoParecido } | { tipo: "ir"; parecido: EventoParecido; puedeCambiar: boolean };
export function respuestaDe(parecidos: readonly EventoParecido[] | null | undefined): RespuestaParecido | null {
  if (!parecidos || parecidos.length !== 1) return null;
  const [p] = parecidos;
  return p.imagen ? { tipo: "ir", parecido: p, puedeCambiar: p.puede_cambiar === true } : { tipo: "poner", parecido: p };
}

export const TEXTOS = {
  poner: "Sí, es este: ponerle mi cartel",
  ir: "Sí, es este: ir al evento",
  cambiar: "Sí, es este: cambiar su cartel por el mío",
  soloQuien: "Solo quien lo publicó puede cambiarlo.",
  seguir: "No, es otro: seguir",
  poniendo: "Poniendo tu cartel…",
} as const;

/** Lo que se manda para completar: lo leído del cartel (o lo que la persona dejó en «Revisa»), con la forma de la base. */
export type Completar = { descripcion?: string; precio?: string; fin?: string; quien?: { id?: string; nombre: string; tipo?: string }[] };

/**
 * El precio que se le puede poner a uno que no tiene: el número del cartel («$150»), «Cooperación solidaria» o, si el costo de ese evento es
 * opcional (un taller, un acto de festival: vacío es «Por confirmar»), «Gratis». En un evento suelto vacío ya se ve «Gratis»: no hace falta.
 */
export function precioParaCompletar(campos: { gratis?: string | null; cooperacion?: string | null; precio?: string | null }, costoOpcional: boolean): string | undefined {
  if (campos.cooperacion === "si") return COOPERACION_SOLIDARIA;
  const numero = (campos.precio ?? "").replace(/[^\d]/g, "");
  if (campos.gratis !== "si" && /^\d{1,6}$/.test(numero)) return `$${numero}`;
  if (campos.gratis === "si" && costoOpcional) return GRATIS;
  return undefined;
}

const txt = (v: FormDataEntryValue | null): string => (typeof v === "string" ? v : "");

/** Lo que se manda para completar, del formulario del alta (los mismos campos que publica `crearEvento`) y en la zona del evento que ya estaba. */
export function completarDelFormulario(fd: FormData, original: { zona: string; clase?: string | null; evento_padre_id?: string | null }): Completar {
  const c: Completar = {};
  const descripcion = txt(fd.get("descripcion")).trim().slice(0, LIMITES_EVENTO.descripcion);
  if (descripcion) c.descripcion = descripcion;
  const precio = precioParaCompletar({ gratis: txt(fd.get("gratis")), cooperacion: txt(fd.get("cooperacion")), precio: txt(fd.get("precio")) }, costoOpcional({ clase: esClase(original.clase) ? original.clase : "puntual", evento_padre_id: original.evento_padre_id ?? null }));
  if (precio) c.precio = precio;
  const fin = localAIso(txt(fd.get("fin")), zonaSegura(original.zona));
  if (fin) c.fin = fin;
  const quien = quienDesdeJson(fd.get("quien")).slice(0, 6);
  if (quien.length) c.quien = quien.map((q) => ({ ...q, tipo: deducirTipoArtista(q.nombre) ?? "solista" }));
  return c;
}

/** El título y la frase del final («Publicado», OL-304), con solo lo que de verdad se completó. */
export function finalDeCartel({ completado, reemplazado }: { completado: readonly string[]; reemplazado: boolean }): { titulo: string; frase: string } {
  if (reemplazado) return { titulo: "Listo: cambiamos su cartel por el tuyo", frase: "Todo lo demás sigue igual. Así lo ve la gente:" };
  const partes = ORDEN.filter((c) => completado.includes(c)).map((c) => NOMBRE[c]);
  const lista = partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}` : partes[0];
  return { titulo: "Listo: tu cartel ya está en el evento", frase: lista ? `Le pusimos tu cartel y completamos ${lista}. Así lo ve la gente:` : "Le pusimos tu cartel. Así lo ve la gente:" };
}

/** El aviso al teléfono de quien publicó el evento: «Ana le puso cartel a tu evento «Noche de danzón»». Abre la ficha. */
export function avisoAlDueno({ nombre, titulo, href, id, reemplazado }: { nombre: string | null; titulo: string; href: string; id: string; reemplazado: boolean }): AvisoPush {
  const quien = (nombre ?? "").trim() || "Alguien";
  const corto = titulo.length > 80 ? `${titulo.slice(0, 79)}…` : titulo;
  return {
    titulo: "Tu evento tiene cartel",
    cuerpo: reemplazado ? `${quien} cambió el cartel de tu evento «${corto}»` : `${quien} le puso cartel a tu evento «${corto}»`,
    url: href,
    tag: `cartel-${id}`,
  };
}

/** El mensaje de cada «no» de la base (los códigos de `poner_cartel_a_evento`). */
export function mensajeDeError(error: { code?: string; message?: string } | null | undefined): { mensaje: string; yaTieneCartel?: boolean } {
  const codigo = error?.code ?? "";
  if (codigo === "23505") return { mensaje: "Alguien le acaba de poner cartel a ese evento.", yaTieneCartel: true };
  if (codigo === "42501") return { mensaje: TEXTOS.soloQuien };
  if (codigo === "P0002") return { mensaje: "Ese evento ya no está publicado." };
  if (codigo === "22023" && /evento_pasado/.test(error?.message ?? "")) return { mensaje: "Ese evento ya pasó." };
  return { mensaje: "No se pudo poner tu cartel. Intenta de nuevo." };
}
