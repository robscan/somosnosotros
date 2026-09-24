"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { esUuid } from "@/lib/formulario";
import { embedIdDesdeOembedBandcamp } from "@/lib/incrustado";
import { validarNovedadArtista, type ErroresNovedadArtista } from "@/lib/novedadesArtista";
import { sesionOEntrar } from "@/lib/supabase/sesion";

/**
 * Publicar, corregir y borrar una novedad de artista (docs/rediseno/44-novedades-artista.md, OL-175/OL-181, código
 * de OL-171; corregir y borrar, OL-185, founder 2026-09-24: «crea opción de editar publicaciones de artista, para
 * borrar o corregir subidas» — el doc 44 §6 decía "sin edición después de publicar", el founder lo cambia hoy).
 */
export type ResultadoNovedadArtista = { ok: true; volver: string } | { ok: false; errores: ErroresNovedadArtista; general?: string };

function leer(formData: FormData) {
  return { url: formData.get("url"), titulo: formData.get("titulo"), texto: formData.get("texto") };
}

const CHECK_VIOLATION = "23514";
const TIEMPO_LIMITE_OEMBED_MS = 6000;
const ERROR_BANDCAMP = "No pude leer ese enlace de Bandcamp. Revisa que sea la página de un álbum o una pista.";

/**
 * Bandcamp no trae el id numérico del álbum/pista en su URL pública (doc 44 §2/§3, OL-181): se resuelve con su
 * oEmbed público, con la URL ya normalizada por `reconocerEnlace` (nunca el texto crudo), y solo cuando esa URL es
 * de un subdominio `*.bandcamp.com` — nunca se consulta otro dominio, para no abrir un hueco de SSRF. Tiempo
 * límite corto y sin seguir redirecciones. Del JSON solo se lee `html`, y de ahí solo el id por regex
 * (`embedIdDesdeOembedBandcamp`, `lib/incrustado.ts`): nunca se guarda ni se sirve el HTML que manda Bandcamp.
 */
async function embedIdBandcamp(url: string): Promise<string | null> {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (!host.endsWith(".bandcamp.com")) return null;
  const controlador = new AbortController();
  const tiempoFuera = setTimeout(() => controlador.abort(), TIEMPO_LIMITE_OEMBED_MS);
  try {
    const resp = await fetch(`https://bandcamp.com/oembed?url=${encodeURIComponent(url)}&format=json`, {
      signal: controlador.signal,
      redirect: "error",
    });
    if (!resp.ok) return null;
    const json: unknown = await resp.json();
    return embedIdDesdeOembedBandcamp(json);
  } catch {
    return null;
  } finally {
    clearTimeout(tiempoFuera);
  }
}

/**
 * `artistaId` y `volver` (la ficha a la que se vuelve al terminar) van atados desde la pantalla con `.bind`, como
 * `actualizarArtista` — la pantalla ya sabe de qué artista es y cuál es su dirección de hoy (con slug). `publicado_por`
 * lo pone el servidor con la sesión de quien manda el formulario: nunca un dato que mande el cliente (doc 44 §3/§4,
 * mismo patrón que `cambiado_por` de `ajustes_sitio`). La política de la base (`gestiona_artista`) es quien de
 * verdad decide quién publica; aquí solo se valida la forma, se resuelve el `embed_id` de Bandcamp si aplica, y se
 * traduce el rechazo de la base a un aviso legible.
 */
export async function publicarNovedadArtista(artistaId: string, volver: string, _previo: ResultadoNovedadArtista | null, formData: FormData): Promise<ResultadoNovedadArtista> {
  if (!esUuid(artistaId)) return { ok: false, errores: {}, general: "No sé de qué artista es." };
  const { supabase, user } = await sesionOEntrar(`/artistas/${artistaId}/novedades/nueva`);
  const { datos, errores } = validarNovedadArtista(leer(formData));
  if (Object.keys(errores).length || !datos.proveedor) return { ok: false, errores };

  let embedId: string | null = null;
  if (datos.proveedor === "bandcamp") {
    embedId = await embedIdBandcamp(datos.url);
    if (!embedId) return { ok: false, errores: { url: ERROR_BANDCAMP } };
  }

  const { error } = await supabase.from("novedades_artista").insert({
    artista_id: artistaId,
    url: datos.url,
    proveedor: datos.proveedor,
    embed_id: embedId,
    titulo: datos.titulo,
    texto: datos.texto,
    publicado_por: user.id,
  });
  if (error) {
    if (error.code === CHECK_VIOLATION) return { ok: false, errores: {}, general: error.message };
    return { ok: false, errores: {}, general: "No se pudo publicar. ¿Sigues con sesión y es tu ficha?" };
  }

  revalidatePath(volver);
  return { ok: true, volver };
}

const AVISO_GUARDAR = "No se pudo guardar. ¿Sigues con sesión y es tu ficha?";

/**
 * Corregir una novedad ya publicada (OL-185): misma validación que publicar, mismo `embedIdBandcamp` cuando hace
 * falta. Solo se vuelve a consultar el oEmbed de Bandcamp si el proveedor de destino es Bandcamp Y la URL cambió
 * respecto a la ya guardada — editar el título sin tocar el enlace no llama a ningún servicio externo. Si el
 * proveedor nuevo no es Bandcamp, `embed_id` queda en `null` (mismo criterio que publicar). `artista_id`,
 * `publicado_por`, `creado_en` y `visible` no se tocan aquí: la migración 20260925140000_novedades_editar.sql los
 * protege con un disparador, y esta acción tampoco los manda en el `update`.
 */
export async function actualizarNovedadArtista(artistaId: string, novedadId: string, volver: string, _previo: ResultadoNovedadArtista | null, formData: FormData): Promise<ResultadoNovedadArtista> {
  if (!esUuid(artistaId) || !esUuid(novedadId)) return { ok: false, errores: {}, general: "No sé de qué novedad es." };
  const { supabase } = await sesionOEntrar(`/artistas/${artistaId}/novedades/${novedadId}/editar`);
  const { datos, errores } = validarNovedadArtista(leer(formData));
  if (Object.keys(errores).length || !datos.proveedor) return { ok: false, errores };

  const { data: actual } = await supabase.from("novedades_artista").select("url, proveedor, embed_id").eq("id", novedadId).eq("artista_id", artistaId).maybeSingle();
  if (!actual) return { ok: false, errores: {}, general: AVISO_GUARDAR };

  let embedId: string | null = null;
  if (datos.proveedor === "bandcamp") {
    const sinCambioDeEnlace = actual.proveedor === "bandcamp" && actual.url === datos.url;
    embedId = sinCambioDeEnlace ? actual.embed_id : await embedIdBandcamp(datos.url);
    if (!embedId) return { ok: false, errores: { url: ERROR_BANDCAMP } };
  }

  const { data, error } = await supabase
    .from("novedades_artista")
    .update({ url: datos.url, proveedor: datos.proveedor, embed_id: embedId, titulo: datos.titulo, texto: datos.texto })
    .eq("id", novedadId)
    .eq("artista_id", artistaId)
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === CHECK_VIOLATION) return { ok: false, errores: {}, general: error.message };
    return { ok: false, errores: {}, general: AVISO_GUARDAR };
  }
  if (!data) return { ok: false, errores: {}, general: AVISO_GUARDAR };

  revalidatePath(volver);
  return { ok: true, volver };
}

/**
 * Borrar una novedad ya publicada (OL-185): quien gestiona la ficha o la administración (política ya existente
 * desde OL-175, bitácora 210 — aquí solo faltaba la pantalla). `artista_id` en el `eq` de más, aunque la RLS ya
 * decide quién borra: una novedad nunca se borra "por accidente" desde la ficha de otro artista.
 */
export async function borrarNovedadArtista(artistaId: string, novedadId: string, volver: string): Promise<void> {
  const { supabase } = await sesionOEntrar(`/artistas/${artistaId}/novedades/${novedadId}/editar`);
  await supabase.from("novedades_artista").delete().eq("id", novedadId).eq("artista_id", artistaId);
  revalidatePath(volver);
  redirect(volver);
}
