import { CUENTA_INSTAGRAM, INVITACION, type EventoIg } from "../instagram/texto";
import { MARCA } from "../marca";
import type { MedioVista, OrigenVista } from "../vistas";

/**
 * El texto de la página de Facebook y los enlaces con marca de origen (OL-461, bitácora 493). Puro: lo prueban `texto.test.ts` y lo usa la acción
 * de publicar.
 *
 * El texto de Facebook es el de Instagram (el que armó el sistema o el que escribió la administración) con tres cambios:
 *   1. La invitación: en vez de «Sigue a @smsnstrsapp … (enlace en la bio)», el enlace a la ficha del evento, completo y tocable (en Facebook sí
 *      se puede), y «entra a somosnosotrxs.org».
 *   2. Las menciones: los @ de Instagram no sirven en Facebook; el lugar y los artistas van por su nombre, sin @. Mencionar una página de Facebook
 *      (`@[page-id]`) pide a Meta la función «Page Mentioning» y su documentación solo la describe para responder publicaciones y comentarios,
 *      no para publicar: por eso, el nombre.
 *   3. La cuenta de la marca, si queda un @smsnstrsapp suelto, por su nombre.
 * Las etiquetas (#) quedan iguales, sin acento.
 */

/** El dominio que lee la gente (línea de la marca, 2026-10-21). Redirige a somosnosotros.org conservando la ruta y la consulta (308). */
export const DOMINIO_VISIBLE = "somosnosotrxs.org";
export const INVITACION_FACEBOOK = `Sigue la página para enterarte de más planes. Este y otros eventos: entra a ${DOMINIO_VISIBLE}.`;

/**
 * El enlace a la ficha de un evento con la marca de origen: de qué red (`utm_source`), desde qué (`utm_medium`, publicación o historia) y qué
 * evento (`utm_campaign`, su id). La ficha lo lee al contar la vista (`ContarVista`, `POST /api/vista`) sin guardar nada de la persona.
 */
export function enlaceConOrigen(e: { id: string; slug?: string | null }, red: OrigenVista, medio: MedioVista): string {
  const consulta = new URLSearchParams({ utm_source: red, utm_medium: medio, utm_campaign: e.id });
  return `https://${DOMINIO_VISIBLE}/eventos/${encodeURIComponent(e.slug || e.id)}?${consulta}`;
}

const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Lo que no puede seguir a un usuario entero: otra letra, número o guion bajo, o un punto con más usuario (un usuario no termina en punto). */
const FIN = "(?![A-Za-z0-9_]|\\.[A-Za-z0-9_])";
/** Un @usuario entero (no el principio de otro más largo). */
const mencion = (usuario: string) => new RegExp(`@${escapar(usuario)}${FIN}`, "gi");

/** El texto de Facebook a partir del de Instagram (ver arriba). `enlace`: el de la ficha con su marca de origen. */
export function textoDeFacebook(textoInstagram: string, e: Pick<EventoIg, "lugar" | "artistas">, enlace: string): string {
  let t = textoInstagram.trim();
  // 2. Menciones: «Lugar @lugar» → «Lugar»; «@artista» → su nombre.
  if (e.lugar?.usuario) {
    const nombreLugar = e.lugar.nombre;
    t = t.replace(new RegExp(`${escapar(e.lugar.nombre)} @${escapar(e.lugar.usuario)}${FIN}`, "g"), () => nombreLugar);
    t = t.replace(mencion(e.lugar.usuario), () => nombreLugar);
  }
  // (Con función: un nombre con «$» no se lee como patrón de reemplazo.)
  for (const a of e.artistas) if (a.usuario) t = t.replace(mencion(a.usuario), () => a.nombre);
  // 1. La invitación de Instagram se cambia por el enlace y la de Facebook; si se quitó a mano, el enlace va antes de las etiquetas.
  const bloque = `Ficha del evento: ${enlace}`;
  if (t.includes(INVITACION)) {
    t = t.replace(INVITACION, () => `${bloque}\n\n${INVITACION_FACEBOOK}`);
  } else {
    t = t.replace(/\s*\(enlace en la bio\)/gi, "");
    const partes = t.split(/\n{2,}/);
    const ultima = partes.at(-1) ?? "";
    const soloEtiquetas = partes.length > 1 && /^(#[\p{L}\p{N}_]+\s*)+$/u.test(ultima.trim());
    t = soloEtiquetas ? [...partes.slice(0, -1), bloque, ultima].join("\n\n") : `${t}\n\n${bloque}`;
  }
  // 3. La cuenta de la marca.
  return t.replace(mencion(CUENTA_INSTAGRAM), () => MARCA);
}
