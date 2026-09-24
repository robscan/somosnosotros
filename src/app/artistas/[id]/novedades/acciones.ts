"use server";

import { revalidatePath } from "next/cache";
import { esUuid } from "@/lib/formulario";
import { embedIdDesdeOembedBandcamp } from "@/lib/incrustado";
import { validarNovedadArtista, type ErroresNovedadArtista } from "@/lib/novedadesArtista";
import { sesionOEntrar } from "@/lib/supabase/sesion";

/** Publicar una novedad de artista (docs/rediseno/44-novedades-artista.md, OL-175/OL-181, código de OL-171). */
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
