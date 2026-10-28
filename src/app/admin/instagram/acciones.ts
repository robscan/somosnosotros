"use server";

import { revalidatePath } from "next/cache";
import { cargarParaCartel } from "@/lib/carteles/cargar";
import { publicarEnPagina } from "@/lib/facebook/api";
import { enlaceConOrigen, textoDeFacebook } from "@/lib/facebook/texto";
import { esUuid } from "@/lib/formulario";
import { cupo, leerPagina, paginaDeEnlace, publicar } from "@/lib/instagram/api";
import { sePuedePublicar } from "@/lib/instagram/elegir";
import { armarImagen, bajarCartel, convieneRecortar } from "@/lib/instagram/imagen";
import { armarTexto, etiquetasDeLaFoto, revisarTexto } from "@/lib/instagram/texto";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { cargarParaHoja, type ParaHoja } from "./datos";
import { FRASES, FRASES_FACEBOOK, type ClaveError, type ClaveFacebook } from "@/lib/instagram/frases";
import type { EventoIg } from "@/lib/instagram/texto";

/**
 * Publicar en Instagram desde Administración (OL-458, firmado; bitácora 490): lo que pide la hoja de vista previa (`prepararInstagram`), publicar
 * (`publicarEnInstagram`) y guardar la ubicación de una ciudad o de un lugar (`guardarUbicacionInstagram`). Solo la administración: se comprueba
 * aquí y la base lo vuelve a comprobar (RLS). El token de Instagram nunca sale del servidor (`lib/instagram/api`).
 * OL-461 (bitácora 493): el espejo en la página de Facebook. Con «También en Facebook», lo que sale en Instagram se publica también en la página
 * (la misma imagen; el texto con el enlace a la ficha y sin @, `lib/facebook/texto`); si Instagram falla no se intenta Facebook, y si Facebook
 * falla Instagram queda publicado y se puede reintentar (`publicarEnFacebook`, también desde «Ya en Instagram»).
 */

/** La sesión, solo si es de la administración (como `soloAdmin` del panel: el rol de su perfil). */
async function sesionAdmin() {
  const actual = await usuarioActual();
  if (!actual || actual.perfil.rol !== "admin") return null;
  const supabase = await clienteServidor();
  return supabase ? { supabase, user: { id: actual.perfil.id } } : null;
}

export type Preparado =
  | {
      ok: true;
      id: string;
      titulo: string;
      evento: EventoIg;
      etiquetas: string[];
      ubicacion: { nombre: string } | null;
      ciudad: { slug: string; nombre: string };
      conCartel: boolean;
      recortar: boolean;
      sePuede: boolean;
      publicado: { cuando: string; formato: "4x5" | "9x16" } | null;
      ahora: string;
    }
  | { ok: false; mensaje: string };

/** Lo que la hoja necesita para un evento: el texto se arma en el teléfono con el mismo código (`armarTexto`) para quitar etiquetas al momento. */
export async function prepararInstagram(eventoId: string): Promise<Preparado> {
  const s = esUuid(eventoId) ? await sesionAdmin() : null;
  if (!s) return { ok: false, mensaje: "Solo la administración publica en Instagram." };
  const ahora = new Date();
  const h = await cargarParaHoja(s.supabase, eventoId, ahora);
  if (!h) return { ok: false, mensaje: "No encontramos ese evento." };
  const cartel = await bajarCartel(h.imagen);
  return {
    ok: true,
    id: h.id,
    titulo: h.titulo,
    evento: h.evento,
    etiquetas: h.etiquetas,
    ubicacion: h.ubicacion ? { nombre: h.ubicacion.nombre } : null,
    ciudad: h.ciudad,
    conCartel: !!cartel,
    recortar: !!cartel && convieneRecortar(cartel.ancho, cartel.alto),
    sePuede: h.sePuede,
    publicado: h.publicado,
    ahora: ahora.toISOString(),
  };
}

export type PedidoPublicar = { eventoId: string; formato: "4x5" | "9x16"; recorte: boolean; diseno: number; texto: string | null; quitadas: string[]; facebook?: boolean };
/** Lo que pasó en Facebook (OL-461). */
export type Espejo = { ok: true; permalink: string | null } | { ok: false; error: ClaveFacebook; mensaje: string };
/** `facebook`: null si no se pidió o si Instagram falló (entonces no se intenta). */
export type Publicado = { ok: true; permalink: string | null; sinEtiquetas: boolean; facebook: Espejo | null } | { ok: false; error: ClaveError; mensaje: string };

type PublicacionIg = { id: string; formato: "4x5" | "9x16"; imagen: string | null };

/** Publica en la página de Facebook lo que ya salió en Instagram y lo anota (con la sesión: la base comprueba que es de la administración). */
async function espejar(supabase: NonNullable<Awaited<ReturnType<typeof sesionAdmin>>>["supabase"], ig: PublicacionIg, h: ParaHoja, textoInstagram: string | null): Promise<Espejo> {
  const anotar = (fila: Record<string, unknown>) => supabase.from("facebook_publicaciones").insert({ instagram_id: ig.id, evento_id: h.id, formato: ig.formato, ...fila });
  if (!ig.imagen) {
    await anotar({ estado: "error", error: "imagen" });
    return { ok: false, error: "imagen", mensaje: FRASES_FACEBOOK.imagen };
  }
  const historia = ig.formato === "9x16";
  const texto = historia ? null : textoDeFacebook(textoInstagram ?? armarTexto(h.evento, new Date()), h.evento, enlaceConOrigen({ id: h.id, slug: h.slug }, "facebook", "post"));
  const r = await publicarEnPagina({ imagen: ig.imagen, texto, historia });
  await anotar(r.ok ? { estado: "publicada", post_id: r.postId, permalink: r.permalink } : { estado: "error", error: r.error });
  revalidatePath("/admin/instagram");
  revalidatePath("/admin");
  return r.ok ? { ok: true, permalink: r.permalink } : { ok: false, error: r.error, mensaje: FRASES_FACEBOOK[r.error] };
}

/** Publica: vuelve a comprobar que el evento está por venir, el texto, el cupo; arma el JPEG, lo sube, publica y lo anota. */
export async function publicarEnInstagram(p: PedidoPublicar): Promise<Publicado> {
  const s = esUuid(p?.eventoId) ? await sesionAdmin() : null;
  if (!s) return { ok: false, error: "permiso", mensaje: "Solo la administración publica en Instagram." };
  const formato = p.formato === "9x16" ? "9x16" : "4x5";
  const ahora = new Date();
  const h = await cargarParaHoja(s.supabase, p.eventoId, ahora);
  if (!h) return { ok: false, error: "otro", mensaje: "No encontramos ese evento." };
  const anotar = (fila: Record<string, unknown>) => s.supabase.from("instagram_publicaciones").insert({ evento_id: h.id, formato, ...fila });
  const fallo = async (error: Exclude<ClaveError, "texto">): Promise<Publicado> => {
    await anotar({ estado: "error", error });
    return { ok: false, error, mensaje: FRASES[error] };
  };
  if (!sePuedePublicar(h.datos, ahora)) return fallo("empezo");
  const quitadas = Array.isArray(p.quitadas) ? p.quitadas.filter((x) => typeof x === "string").slice(0, 60) : [];
  // El texto: lo que mandó la hoja o, si no, el que arma el sistema; nunca en una historia (Instagram no lo publica).
  const texto = formato === "4x5" ? (typeof p.texto === "string" && p.texto.trim() ? p.texto.trim() : armarTexto(h.evento, ahora, quitadas)) : null;
  if (texto) {
    const r = revisarTexto(texto);
    if (r.problema) return { ok: false, error: "texto", mensaje: r.problema };
  }
  const usado = await cupo();
  if (usado && usado.usadas >= usado.tope) return fallo("cupo");
  // La imagen: el cartel encajado, o el diseño de Crear cartel; un JPEG público en la carpeta de quien publica.
  const [cartel, datos] = await Promise.all([bajarCartel(h.imagen), cargarParaCartel(s.supabase, h.id)]);
  if (!datos) return fallo("otro");
  let jpeg: Buffer;
  try {
    jpeg = await armarImagen({ cartel: cartel?.bytes ?? null, datos, formato, recorte: !!p.recorte, diseno: Number(p.diseno) || 0 });
  } catch {
    return fallo("imagen");
  }
  const ruta = `lugares/${s.user.id}/instagram-${crypto.randomUUID()}.jpg`;
  const subida = await s.supabase.storage.from("fotos").upload(ruta, jpeg, { contentType: "image/jpeg", upsert: false });
  if (subida.error) return fallo("otro");
  const imagen = s.supabase.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
  // Solo se etiqueta a quien la ficha dice (nunca un nombre que mande el teléfono).
  const etiquetas = etiquetasDeLaFoto(h.evento, quitadas);
  const r = await publicar({ imagen, texto, etiquetas, ubicacion: h.ubicacion?.id ?? null, historia: formato === "9x16" });
  if (!r.ok) return fallo(r.error);
  const anotada = await anotar({ estado: "publicada", media_id: r.mediaId, permalink: r.permalink, imagen, etiquetas: r.sinEtiquetas ? [] : etiquetas, ubicacion: r.sinEtiquetas || formato === "9x16" ? null : (h.ubicacion?.id ?? null) })
    .select("id")
    .maybeSingle<{ id: string }>();
  revalidatePath("/admin/instagram");
  revalidatePath("/admin");
  // El espejo en Facebook, solo si salió en Instagram. Sin la fila de Instagram no se puede anotar: no se publica en Facebook y se dice.
  const facebook: Espejo | null = !p.facebook ? null : anotada.data?.id ? await espejar(s.supabase, { id: anotada.data.id, formato, imagen }, h, texto) : { ok: false, error: "otro", mensaje: FRASES_FACEBOOK.otro };
  return { ok: true, permalink: r.permalink, sinEtiquetas: r.sinEtiquetas && (etiquetas.length > 0 || !!h.ubicacion), facebook };
}

/**
 * Publica en Facebook lo que ya está en Instagram y no salió en Facebook (la hoja, «Reintentar en Facebook»; la lista, «Publicar en Facebook»):
 * la última publicación de Instagram del evento, con su misma imagen. `texto`: el que llevó Instagram, si la hoja lo tiene; si no, el que arma el
 * sistema. Si esa publicación ya está en Facebook, no se publica otra vez. Solo lo que está por venir, como en Instagram.
 */
export async function publicarEnFacebook(eventoId: string, texto: string | null = null): Promise<Espejo> {
  const s = esUuid(eventoId) ? await sesionAdmin() : null;
  if (!s) return { ok: false, error: "permiso", mensaje: "Solo la administración publica en Facebook." };
  const ahora = new Date();
  const h = await cargarParaHoja(s.supabase, eventoId, ahora);
  if (!h) return { ok: false, error: "otro", mensaje: "No encontramos ese evento." };
  if (!sePuedePublicar(h.datos, ahora)) return { ok: false, error: "empezo", mensaje: FRASES_FACEBOOK.empezo };
  const { data: ig } = await s.supabase
    .from("instagram_publicaciones")
    .select("id, formato, imagen")
    .eq("evento_id", h.id)
    .eq("estado", "publicada")
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle<PublicacionIg>();
  if (!ig) return { ok: false, error: "otro", mensaje: "Este evento todavía no está en Instagram." };
  const { data: ya } = await s.supabase.from("facebook_publicaciones").select("permalink").eq("instagram_id", ig.id).eq("estado", "publicada").limit(1).maybeSingle<{ permalink: string | null }>();
  if (ya) return { ok: true, permalink: ya.permalink };
  const propio = ig.formato === "4x5" && typeof texto === "string" && texto.trim() ? texto.trim().slice(0, 5000) : null;
  return espejar(s.supabase, ig, h, propio);
}

export type Guardado = { ok: true; nombre: string } | { ok: false; mensaje: string };

/** Guarda la ubicación de Instagram de una ciudad (su slug) o de un lugar (su id) desde el enlace de su página de Facebook. */
export async function guardarUbicacionInstagram(tipo: "ciudad" | "lugar", clave: string, enlace: string): Promise<Guardado> {
  const s = await sesionAdmin();
  if (!s || (tipo !== "ciudad" && tipo !== "lugar") || typeof clave !== "string" || !clave || clave.length > 80) return { ok: false, mensaje: "Solo la administración guarda la ubicación." };
  const pagina = typeof enlace === "string" ? paginaDeEnlace(enlace) : null;
  if (!pagina) return { ok: false, mensaje: "Eso no parece el enlace de una página de Facebook." };
  const leida = await leerPagina(pagina);
  if (!leida) return { ok: false, mensaje: "No pudimos leer esa página o no tiene ubicación. Prueba con la página oficial de la ciudad o del lugar." };
  const { error } = await s.supabase.from("instagram_ubicaciones").upsert({ tipo, clave, pagina_id: leida.id, nombre: leida.nombre, enlace: enlace.trim().slice(0, 300) });
  if (error) return { ok: false, mensaje: "No se pudo guardar. Intenta de nuevo." };
  revalidatePath(tipo === "ciudad" ? `/admin/ciudades/${clave}` : "/admin");
  return { ok: true, nombre: leida.nombre };
}
