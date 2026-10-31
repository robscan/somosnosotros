import { diaConMes } from "./fechas";
import { contar, unir } from "./panel";
import { motivoLlano, type ClaveFallo } from "./redes/reglas";

/**
 * Lo que dicen los renglones de la portada de Administración (OL-494, variante C firmada del prototipo OL-493, bitácora 525), sin base para
 * poder probarlo: una línea de estado en palabras llanas por renglón de Difusión y Herramientas, y el pendiente «Instagram dejó de publicar».
 */

/** «@smsnstrsapp · 4 publicadas esta semana · 5 sin material». Lo que no se pudo leer no se escribe (nunca un cero inventado). */
export function lineaInstagram(cuenta: string, publicadas: number | null, sinMaterial: number | null): string {
  return unir([`@${cuenta}`, publicadas === null ? null : publicadas === 1 ? "1 publicada esta semana" : `${publicadas} publicadas esta semana`, sinMaterial ? `${sinMaterial} sin material` : null]);
}

/** «Artistas para presentar a foros · 16 candidatos · 2 invitados»; si las cifras no se leyeron, solo qué es. */
export function lineaShowcase(r: { candidatos: number; invitados: number } | null): string {
  return unir(["Artistas para presentar a foros", r && contar(r.candidatos, "candidato", "candidatos"), r && contar(r.invitados, "invitado", "invitados")]);
}

/** «Completar fichas: encendida · 192,29 USD de crédito». Sin el ajuste o sin el crédito, lo que sí se sabe. */
export function lineaRutinas(activa: boolean | null, credito: string | null): string {
  return unir([activa === null ? null : `Completar fichas: ${activa ? "encendida" : "apagada"}`, credito === null ? null : `${credito} USD de crédito`], "Las que corren solas cada semana");
}

/** El último trabajo de Instagram que terminó (`redes_trabajos`, OL-465), con lo que hace falta para decirlo. */
export type UltimoTrabajo = { estado: string; error: string | null; terminado_en: string | null };
export type PendienteInstagram = { titulo: string; detalle: string };

const CLAVES: readonly ClaveFallo[] = ["cupo", "imagen", "permiso", "empezo", "texto", "otro"];

/**
 * «Instagram dejó de publicar» sube a Pendiente (lo firmó el founder el 2026-10-29) cuando el último trabajo de la cola falló. La causa, en
 * llano: con el error `permiso` después de la última conexión, «La conexión caducó el lun 5 de oct: reconecta» (si se reconectó después del
 * fallo, ya no pide nada); con otro error, «No salió «título»: Instagram no aceptó la imagen». Un evento que ya había empezado no es que
 * Instagram dejara de publicar: no sube. Lleva a Administración › Instagram.
 */
export function pendienteInstagram(t: UltimoTrabajo | null, conectadoEn: string | null, titulo: string | null, ahora: Date = new Date()): PendienteInstagram | null {
  if (!t || t.estado !== "fallido") return null;
  const clave: ClaveFallo = CLAVES.includes(t.error as ClaveFallo) ? (t.error as ClaveFallo) : "otro";
  if (clave === "empezo") return null;
  if (clave === "permiso") {
    if (conectadoEn && t.terminado_en && Date.parse(conectadoEn) > Date.parse(t.terminado_en)) return null;
    return { titulo: "Instagram dejó de publicar", detalle: t.terminado_en ? `La conexión caducó el ${diaConMes(t.terminado_en, ahora)}: reconecta` : "La conexión caducó: reconecta" };
  }
  const que = titulo ? `No salió «${titulo.length > 60 ? `${titulo.slice(0, 59)}…` : titulo}»` : "La última no salió";
  return { titulo: "Instagram dejó de publicar", detalle: `${que}: ${motivoLlano("instagram", clave)}` };
}
