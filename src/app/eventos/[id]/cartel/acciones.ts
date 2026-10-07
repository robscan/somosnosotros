"use server";

import { revalidatePath } from "next/cache";
import { cargarParaCartel, MARCA_GENERADO } from "@/lib/carteles/cargar";
import { generarCartel } from "@/lib/carteles/generar";
import { plantillaPorId } from "@/lib/carteles/plantillas";
import { formatoDe } from "@/lib/carteles/tokens";
import { limpiarTexto, MAXIMOS } from "@/lib/carteles/datos";
import { hrefEvento } from "@/lib/eventos";
import { imagenPermitida } from "@/lib/imagenes";
import { sesionOEntrar } from "@/lib/supabase/sesion";

export type ResultadoUsar = { ok: true; href: string } | { ok: false; mensaje: string };

/**
 * «Usar como cartel del evento» (OL-324): dibuja el cartel elegido en el servidor (el mismo dibujo que la descarga), lo sube al bucket `fotos`
 * en la carpeta de quien lo usa (`lugares/<id>/cartel-generado-<uuid>.jpg`, como los carteles que se suben a mano) y lo pone como imagen del
 * evento. Solo lo hace quien gestiona el evento; la base lo vuelve a comprobar (RLS de `eventos`, de Storage y de `carteles_generados`).
 * El nombre lleva la marca `cartel-generado-`: el creador no vuelve a usar ese cartel como foto de otro cartel. La lectura de carteles con IA
 * no se dispara aquí (solo corre al subir una imagen en el alta).
 */
export async function usarComoCartel(idOSlug: string, idPlantilla: string, idFormato: string, titulo: string | null): Promise<ResultadoUsar> {
  const { supabase, user } = await sesionOEntrar(`/eventos/${idOSlug}/cartel`);
  const plantilla = plantillaPorId(idPlantilla);
  const datos = plantilla ? await cargarParaCartel(supabase, idOSlug) : null;
  if (!plantilla || !datos?.gestiona) return { ok: false, mensaje: "No se pudo usar el cartel. ¿Sigues con sesión y es tu evento?" };
  const formato = formatoDe(idFormato);
  const propio = titulo ? limpiarTexto(titulo).slice(0, MAXIMOS.titulo) : null;
  let imagen: Buffer;
  try {
    imagen = (await generarCartel(datos, plantilla, formato, { titulo: propio })).imagen;
  } catch {
    return { ok: false, mensaje: "No se pudo dibujar el cartel. Intenta de nuevo." };
  }
  const ruta = `lugares/${user.id}/${MARCA_GENERADO}${crypto.randomUUID()}.jpg`;
  const subida = await supabase.storage.from("fotos").upload(ruta, imagen, { contentType: "image/jpeg", upsert: false });
  if (subida.error) return { ok: false, mensaje: "No se pudo guardar el cartel. Intenta de nuevo." };
  const url = supabase.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
  if (!imagenPermitida(url, { esAdmin: false })) return { ok: false, mensaje: "No se pudo guardar el cartel. Intenta de nuevo." };
  const { data, error } = await supabase.from("eventos").update({ imagen: url }).eq("id", datos.evento.id).select("id").maybeSingle();
  if (error || !data) return { ok: false, mensaje: "No se pudo poner el cartel en el evento. Intenta de nuevo." };
  await supabase.from("carteles_generados").insert({ evento_id: datos.evento.id, perfil_id: datos.perfilId, plantilla: plantilla.id, formato: formato.id, ruta });
  const href = hrefEvento(datos.evento);
  revalidatePath(href);
  revalidatePath("/");
  if (datos.evento.lugarId) revalidatePath(`/lugares/${datos.evento.lugarId}`);
  return { ok: true, href };
}
