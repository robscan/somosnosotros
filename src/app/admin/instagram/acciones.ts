"use server";

import { revalidatePath } from "next/cache";
import { cargarParaCartel } from "@/lib/carteles/cargar";
import { publicarEnPagina } from "@/lib/facebook/api";
import { enlaceConOrigen, textoDeFacebook } from "@/lib/facebook/texto";
import { esUuid } from "@/lib/formulario";
import { cupo, leerPagina, paginaDeEnlace, publicar, publicarCarrusel } from "@/lib/instagram/api";
import { etiquetasPorImagen, imagenesPedidas, PORTADA, type ImagenCarrusel } from "@/lib/instagram/carrusel";
import { sePuedePublicar } from "@/lib/instagram/elegir";
import { armarImagen, bajarCartel, convieneRecortar, encajarCartel } from "@/lib/instagram/imagen";
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
 * OL-464 (bitácora 496): un festival con carteles en sus actos se publica como carrusel (la portada y un cartel por cada cartel distinto de sus
 * actos por venir, hasta 10, en el orden que dejó la hoja; `lib/instagram/carrusel`), y en Facebook como una publicación con varias fotos. Las
 * historias siguen con una imagen.
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
      publicado: { cuando: string; formato: "4x5" | "9x16" | "carrusel" } | null;
      ahora: string;
      /** Las imágenes posibles del carrusel, en su orden (la hoja las dibuja con `/api/instagram/<id>?imagen=<clave>`); vacío: una imagen. */
      carrusel: { clave: string; titulo: string }[];
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
    carrusel: h.carrusel.map((i) => ({ clave: i.clave, titulo: i.titulo })),
  };
}

/** `imagenes`: las claves del carrusel en el orden de la hoja (OL-464); sin ellas, una imagen como siempre. */
export type PedidoPublicar = { eventoId: string; formato: "4x5" | "9x16"; recorte: boolean; diseno: number; texto: string | null; quitadas: string[]; facebook?: boolean; imagenes?: string[] };
/** Lo que pasó en Facebook (OL-461). */
export type Espejo = { ok: true; permalink: string | null } | { ok: false; error: ClaveFacebook; mensaje: string };
/** `facebook`: null si no se pidió o si Instagram falló (entonces no se intenta). */
export type Publicado = { ok: true; permalink: string | null; sinEtiquetas: boolean; facebook: Espejo | null; imagenes: number } | { ok: false; error: ClaveError; mensaje: string };

type PublicacionIg = { id: string; formato: "4x5" | "9x16" | "carrusel"; imagen: string | null; carrusel: string[] | null };

/** Publica en la página de Facebook lo que ya salió en Instagram y lo anota (con la sesión: la base comprueba que es de la administración). */
async function espejar(supabase: NonNullable<Awaited<ReturnType<typeof sesionAdmin>>>["supabase"], ig: PublicacionIg, h: ParaHoja, textoInstagram: string | null): Promise<Espejo> {
  const anotar = (fila: Record<string, unknown>) => supabase.from("facebook_publicaciones").insert({ instagram_id: ig.id, evento_id: h.id, formato: ig.formato, ...fila });
  if (!ig.imagen) {
    await anotar({ estado: "error", error: "imagen" });
    return { ok: false, error: "imagen", mensaje: FRASES_FACEBOOK.imagen };
  }
  const historia = ig.formato === "9x16";
  const texto = historia ? null : textoDeFacebook(textoInstagram ?? armarTexto(h.evento, new Date()), h.evento, enlaceConOrigen({ id: h.id, slug: h.slug }, "facebook", "post"));
  // Un carrusel, con todas sus fotos en una publicación (OL-464).
  const varias = ig.formato === "carrusel" && ig.carrusel && ig.carrusel.length > 1 ? ig.carrusel : undefined;
  const r = await publicarEnPagina({ imagen: ig.imagen, texto, historia, imagenes: varias });
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
  // OL-464: las imágenes del carrusel que dejó la hoja, en su orden (solo de las que el servidor sabe; nunca una que mande el teléfono).
  let pedidas = formato === "4x5" ? imagenesPedidas(h.carrusel, p.imagenes) : [];
  const enCarrusel = () => (pedidas.length > 1 ? { formato: "carrusel", imagenes: pedidas.length } : { formato, imagenes: 1 });
  const anotar = (fila: Record<string, unknown>) => s.supabase.from("instagram_publicaciones").insert({ evento_id: h.id, ...enCarrusel(), ...fila });
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
  // La imagen: el cartel encajado, o el diseño de Crear cartel; un JPEG público en la carpeta de quien publica. En un carrusel, también el cartel de
  // cada acto a 4:5 con el margen de su color (uno que ya no se pudo bajar se deja fuera).
  const [cartel, datos] = await Promise.all([bajarCartel(h.imagen), cargarParaCartel(s.supabase, h.id)]);
  if (!datos) return fallo("otro");
  const portada = () => armarImagen({ cartel: cartel?.bytes ?? null, datos, formato, recorte: !!p.recorte, diseno: Number(p.diseno) || 0 });
  const dibujar = async (i: ImagenCarrusel): Promise<Buffer | null> => {
    if (i.clave === PORTADA || !i.imagen) return portada();
    const suyo = await bajarCartel(i.imagen);
    return suyo ? encajarCartel(suyo.bytes, "4x5", false) : null;
  };
  let jpegs: { item: ImagenCarrusel | null; bytes: Buffer }[];
  try {
    if (pedidas.length) {
      const dibujadas = await Promise.all(pedidas.map(async (item) => ({ item, bytes: await dibujar(item) })));
      jpegs = dibujadas.filter((x): x is { item: ImagenCarrusel; bytes: Buffer } => !!x.bytes);
      pedidas = jpegs.map((x) => x.item!);
      if (!jpegs.length) return fallo("imagen");
    } else jpegs = [{ item: null, bytes: await portada() }];
  } catch {
    return fallo("imagen");
  }
  const subidas: string[] = [];
  for (const j of jpegs) {
    const ruta = `lugares/${s.user.id}/instagram-${crypto.randomUUID()}.jpg`;
    const subida = await s.supabase.storage.from("fotos").upload(ruta, j.bytes, { contentType: "image/jpeg", upsert: false });
    if (subida.error) return fallo("otro");
    subidas.push(s.supabase.storage.from("fotos").getPublicUrl(ruta).data.publicUrl);
  }
  const imagen = subidas[0];
  // Solo se etiqueta a quien la ficha dice (nunca un nombre que mande el teléfono). En un carrusel, el lugar en todas y cada artista en la imagen
  // de su cartel (`etiquetasPorImagen`).
  const etiquetas = etiquetasDeLaFoto(h.evento, quitadas);
  const carrusel = pedidas.length > 1;
  const r = carrusel
    ? await publicarCarrusel({
        imagenes: etiquetasPorImagen(pedidas, { lugar: h.evento.lugar?.usuario ?? null, permitidas: etiquetas }).map((us, i) => ({ imagen: subidas[i], etiquetas: us })),
        texto,
        ubicacion: h.ubicacion?.id ?? null,
      })
    : await publicar({ imagen, texto, etiquetas, ubicacion: h.ubicacion?.id ?? null, historia: formato === "9x16" });
  if (!r.ok) return fallo(r.error);
  const anotada = await anotar({
    estado: "publicada",
    media_id: r.mediaId,
    permalink: r.permalink,
    imagen,
    ...(carrusel ? { carrusel: subidas } : {}),
    etiquetas: r.sinEtiquetas ? [] : etiquetas,
    ubicacion: r.sinEtiquetas || formato === "9x16" ? null : (h.ubicacion?.id ?? null),
  })
    .select("id")
    .maybeSingle<{ id: string }>();
  revalidatePath("/admin/instagram");
  revalidatePath("/admin");
  // El espejo en Facebook, solo si salió en Instagram. Sin la fila de Instagram no se puede anotar: no se publica en Facebook y se dice.
  const facebook: Espejo | null = !p.facebook
    ? null
    : anotada.data?.id
      ? await espejar(s.supabase, { id: anotada.data.id, formato: carrusel ? "carrusel" : formato, imagen, carrusel: carrusel ? subidas : null }, h, texto)
      : { ok: false, error: "otro", mensaje: FRASES_FACEBOOK.otro };
  return { ok: true, permalink: r.permalink, sinEtiquetas: r.sinEtiquetas && (etiquetas.length > 0 || !!h.ubicacion), facebook, imagenes: subidas.length };
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
    .select("id, formato, imagen, carrusel")
    .eq("evento_id", h.id)
    .eq("estado", "publicada")
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle<PublicacionIg>();
  if (!ig) return { ok: false, error: "otro", mensaje: "Este evento todavía no está en Instagram." };
  const { data: ya } = await s.supabase.from("facebook_publicaciones").select("permalink").eq("instagram_id", ig.id).eq("estado", "publicada").limit(1).maybeSingle<{ permalink: string | null }>();
  if (ya) return { ok: true, permalink: ya.permalink };
  const propio = ig.formato !== "9x16" && typeof texto === "string" && texto.trim() ? texto.trim().slice(0, 5000) : null;
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
