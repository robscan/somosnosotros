import type { PorRevisar } from "./ciudadesAdmin";
import { cuandoFue, propuestaObra, RUTA_POR_APROBAR, SENALES, sumaValores, valorDe, type EvidenciaBreve, type Senal, type Valores } from "./showcase";

/**
 * «Por aprobar» del Showcase (OL-446; lo firmado en OL-443, bitácora 475). Lógica pura: qué cambia en la rúbrica si se acepta un hallazgo, el
 * total que tendría el artista si se acepta todo lo suyo, el orden de los hallazgos (primero los que suben el puntaje) y los motivos de un
 * rechazo. La regla es la de OL-437: solo la obra sale de las evidencias aceptadas; circulación, actividad y vínculo salen de la base, así que
 * aceptar una evidencia de esas señales no mueve el puntaje (y se dice por qué). Lo fijado a mano manda: aceptar no lo suelta (respuesta 6).
 */

/** Los motivos de un rechazo (respuesta 5 del gestor), con lo que dice cada uno en la hoja. El valor es el de la base (`motivo_rechazo`). */
export const MOTIVOS_RECHAZO = [
  { valor: "duplicado", etiqueta: "Duplicado", detalle: "Ya está entre sus evidencias" },
  { valor: "no_es_esta_persona", etiqueta: "No es esta persona", detalle: "Habla de alguien con el mismo nombre" },
  { valor: "no_relevante", etiqueta: "No es relevante", detalle: "No dice nada de su trayectoria" },
  { valor: "otro", etiqueta: "Otro", detalle: "Por otra razón" },
] as const;
export type MotivoRechazo = (typeof MOTIVOS_RECHAZO)[number]["valor"];
export const esMotivoRechazo = (v: unknown): v is MotivoRechazo => MOTIVOS_RECHAZO.some((m) => m.valor === v);
export const etiquetaMotivo = (m: MotivoRechazo) => MOTIVOS_RECHAZO.find((x) => x.valor === m)!.etiqueta;

/** De dónde sale el puntaje de las señales que no cambian con una evidencia. */
const DE_DONDE: Record<Exclude<Senal, "obra">, string> = {
  circulacion: "se cuenta con sus eventos en la base",
  actividad: "sale de sus lecturas de redes",
  vinculo: "sale de su ficha en la app",
};
const etiqueta = (s: Senal) => SENALES.find((x) => x.clave === s)!.etiqueta;
const comoAceptada = (e: EvidenciaBreve): EvidenciaBreve => ({ ...e, estado: "aceptada" });

/** Los valores de un artista si se aceptan estas evidencias: la obra se vuelve a proponer con ellas; lo fijado a mano no se mueve. */
export function valoresSiAcepta(v: Valores, obraAceptada: readonly EvidenciaBreve[], nuevas: readonly EvidenciaBreve[], hoy: string): Valores {
  const deObra = nuevas.filter((e) => e.senal === "obra");
  if (!deObra.length || v.obra.origen === "fijado") return v;
  return { ...v, obra: valorDe(null, propuestaObra([...obraAceptada, ...deObra.map(comoAceptada)], hoy)) };
}

/**
 * Lo que dice un hallazgo de lo que pasa si se acepta:
 *   · «Si la aceptas: Obra 1 → 2 · total 7 → 8» (sube: va en verde, y `corto` es lo que dice la línea de lo hecho: «Obra 1 → 2»);
 *   · «No cambia el puntaje: Obra está fijada a mano en 2»;
 *   · «No cambia el puntaje: Obra ya está en 1»;
 *   · «No cambia el puntaje: Circulación se cuenta con sus eventos en la base».
 * `obraAceptada`: las evidencias de obra que el artista ya tiene aceptadas.
 */
export type Efecto = { sube: boolean; texto: string; corto: string | null };
export function efectoAlAceptar(v: Valores, obraAceptada: readonly EvidenciaBreve[], e: EvidenciaBreve, hoy: string): Efecto {
  const s = e.senal;
  const antes = v[s];
  if (antes.origen === "fijado") return { sube: false, texto: `No cambia el puntaje: ${etiqueta(s)} está fijada a mano en ${antes.puntaje}`, corto: null };
  if (s !== "obra") return { sube: false, texto: `No cambia el puntaje: ${etiqueta(s)} ${DE_DONDE[s]}`, corto: null };
  const despues = valoresSiAcepta(v, obraAceptada, [e], hoy);
  const p0 = antes.puntaje;
  const p1 = despues.obra.puntaje;
  if (p1 === null || p1 === p0) return { sube: false, texto: `No cambia el puntaje: ${etiqueta(s)} ya está en ${p0 ?? "sin datos"}`, corto: null };
  const t0 = sumaValores(v);
  const t1 = sumaValores(despues);
  const corto = `${etiqueta(s)} ${p0 ?? "sin datos"} → ${p1}`;
  return { sube: t1 > t0, texto: `Si la aceptas: ${corto} · total ${t0} → ${t1}`, corto };
}

/** El total de 8 que tendría el artista si se aceptan todos sus hallazgos pendientes. */
export function totalConTodo(v: Valores, obraAceptada: readonly EvidenciaBreve[], pendientes: readonly EvidenciaBreve[], hoy: string): number {
  return sumaValores(valoresSiAcepta(v, obraAceptada, pendientes, hoy));
}

/** Los hallazgos de un artista en su orden: primero los que suben el puntaje, luego los demás, cada grupo en el orden en que llegaron. */
export function ordenarHallazgos<T extends EvidenciaBreve>(lista: readonly T[], v: Valores, obraAceptada: readonly EvidenciaBreve[], hoy: string): T[] {
  return lista
    .map((e, i) => ({ e, i, sube: efectoAlAceptar(v, obraAceptada, e, hoy).sube }))
    .sort((a, b) => Number(b.sube) - Number(a.sube) || a.i - b.i)
    .map((x) => x.e);
}

/** «Música · Revisado · 7 de 8 · con todo, 8»: el renglón del artista en Por aprobar (sin «con todo» si no sube). */
export function detalleArtista(disciplina: string, estado: string, suma: number, conTodo: number): string {
  return [disciplina, estado, `${suma} de 8`, conTodo > suma ? `con todo, ${conTodo}` : null].filter(Boolean).join(" · ");
}

/** «26 evidencias de 9 artistas · las trajo la rutina ayer. Solo cuenta lo que aceptas.», o lo que dice la pantalla cuando ya no queda nada. */
export function lineaPorAprobar(n: number, artistas: number, cuando: string | null): string {
  if (!n) return "Todo decidido. Lo aceptado ya cuenta en su rúbrica.";
  const plural = (x: number, uno: string, varios: string) => `${x} ${x === 1 ? uno : varios}`;
  return `${plural(n, "evidencia", "evidencias")} de ${plural(artistas, "artista", "artistas")}${cuando ? ` · las trajo la rutina ${cuando}` : ""}. Solo cuenta lo que aceptas.`;
}

/**
 * El renglón de «Pendiente» en la portada de Administración (OL-446): «Evidencias del showcase · 26 por aprobar · de 9 artistas, investigados
 * ayer», con su cuenta, que lleva a Por aprobar. Va con las propuestas de las rutinas de Ciudades (la misma forma). `hoy` y `ultima` en el día de la
 * ciudad (YYYY-MM-DD). null si no hay nada.
 */
export function renglonPorAprobar(r: { n: number; artistas: number; ultima: string | null } | null, hoy: string): PorRevisar | null {
  if (!r?.n) return null;
  const cuando = r.ultima ? `, investigados ${cuandoFue(r.ultima, hoy)}` : "";
  return { corrida: "showcase-por-aprobar", tipo: "showcase", titulo: "Evidencias del showcase", detalle: `${r.n} por aprobar · de ${r.artistas} ${r.artistas === 1 ? "artista" : "artistas"}${cuando}`, n: r.n, href: RUTA_POR_APROBAR };
}
