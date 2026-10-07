"use server";

import { revalidatePath } from "next/cache";
import { cargarParaCartel, imagenesDelCartel, MARCA_GENERADO } from "@/lib/carteles/cargar";
import { carpetaFotoPropia, esFotoPropia } from "@/lib/carteles/fotoPropia";
import { generarCartel, traerImagen } from "@/lib/carteles/generar";
import { configPublica } from "@/lib/config";
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
 * no se dispara aquí (solo corre al subir una imagen en el alta). `imagen` dice con qué foto se dibuja, como en la vista previa (OL-337): la
 * foto propia de quien lo usa, si la puso, o ninguna si eligió la opción sin foto.
 */
export async function usarComoCartel(idOSlug: string, idPlantilla: string, idFormato: string, titulo: string | null, imagen: { foto: string | null; sinFoto: boolean } = { foto: null, sinFoto: false }): Promise<ResultadoUsar> {
  const { supabase, user } = await sesionOEntrar(`/eventos/${idOSlug}/cartel`);
  const plantilla = plantillaPorId(idPlantilla);
  const datos = plantilla ? await cargarParaCartel(supabase, idOSlug) : null;
  if (!plantilla || !datos?.gestiona) return { ok: false, mensaje: "No se pudo usar el cartel. ¿Sigues con sesión y es tu evento?" };
  const formato = formatoDe(idFormato);
  const propio = titulo ? limpiarTexto(titulo).slice(0, MAXIMOS.titulo) : null;
  let dibujo: Buffer;
  try {
    dibujo = (await generarCartel(imagenesDelCartel(datos, { foto: typeof imagen?.foto === "string" ? imagen.foto : null, sinFoto: imagen?.sinFoto === true }), plantilla, formato, { titulo: propio })).imagen;
  } catch {
    return { ok: false, mensaje: "No se pudo dibujar el cartel. Intenta de nuevo." };
  }
  const ruta = `lugares/${user.id}/${MARCA_GENERADO}${crypto.randomUUID()}.jpg`;
  const subida = await supabase.storage.from("fotos").upload(ruta, dibujo, { contentType: "image/jpeg", upsert: false });
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

export type ResultadoFoto = { ok: true } | { ok: false; mensaje: string };

/**
 * «Usar otra foto» (OL-337): la foto ya subió desde el teléfono (`subirFoto`, en la carpeta de quien mira); aquí se comprueba que sirve antes de
 * ponerla en los diseños. Solo quien gestiona el evento, solo una foto de su carpeta del Storage (`esFotoPropia`) y solo si sus bytes son un JPEG,
 * PNG o WebP dentro del tope de peso y de píxeles (`traerImagen` con `imagenAdmitida`, OL-329: lo mismo que se exige a cualquier imagen del
 * cartel). Bajarla aquí la deja además en la caché del servidor para las cuatro miniaturas. Si no sirve, la pantalla lo dice y sigue igual.
 */
export async function comprobarFotoPropia(idOSlug: string, url: string): Promise<ResultadoFoto> {
  const { supabase, user } = await sesionOEntrar(`/eventos/${idOSlug}/cartel`);
  const datos = await cargarParaCartel(supabase, idOSlug);
  if (!datos?.gestiona) return { ok: false, mensaje: "No se pudo usar la foto. ¿Sigues con sesión y es tu evento?" };
  if (!esFotoPropia(url, carpetaFotoPropia(user.id, configPublica().supabaseUrl)) || !(await traerImagen(url))) return { ok: false, mensaje: "Esa foto no se pudo usar. Prueba con otra." };
  return { ok: true };
}
