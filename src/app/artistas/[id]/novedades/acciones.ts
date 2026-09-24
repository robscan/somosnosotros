"use server";

import { revalidatePath } from "next/cache";
import { esUuid } from "@/lib/formulario";
import { validarNovedadArtista, type ErroresNovedadArtista } from "@/lib/novedadesArtista";
import { sesionOEntrar } from "@/lib/supabase/sesion";

/** Publicar una novedad de artista, fase 1 (docs/rediseno/44-novedades-artista.md, OL-175, código de OL-171). */
export type ResultadoNovedadArtista = { ok: true; volver: string } | { ok: false; errores: ErroresNovedadArtista; general?: string };

function leer(formData: FormData) {
  return { url: formData.get("url"), titulo: formData.get("titulo"), texto: formData.get("texto") };
}

const CHECK_VIOLATION = "23514";

/**
 * `artistaId` y `volver` (la ficha a la que se vuelve al terminar) van atados desde la pantalla con `.bind`, como
 * `actualizarArtista` — la pantalla ya sabe de qué artista es y cuál es su dirección de hoy (con slug). `publicado_por`
 * lo pone el servidor con la sesión de quien manda el formulario: nunca un dato que mande el cliente (doc 44 §3/§4,
 * mismo patrón que `cambiado_por` de `ajustes_sitio`). La política de la base (`gestiona_artista`) es quien de
 * verdad decide quién publica; aquí solo se valida la forma y se traduce el rechazo de la base a un aviso legible.
 */
export async function publicarNovedadArtista(artistaId: string, volver: string, _previo: ResultadoNovedadArtista | null, formData: FormData): Promise<ResultadoNovedadArtista> {
  if (!esUuid(artistaId)) return { ok: false, errores: {}, general: "No sé de qué artista es." };
  const { supabase, user } = await sesionOEntrar(`/artistas/${artistaId}/novedades/nueva`);
  const { datos, errores } = validarNovedadArtista(leer(formData));
  if (Object.keys(errores).length || !datos.proveedor) return { ok: false, errores };

  const { error } = await supabase.from("novedades_artista").insert({
    artista_id: artistaId,
    url: datos.url,
    proveedor: datos.proveedor,
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
