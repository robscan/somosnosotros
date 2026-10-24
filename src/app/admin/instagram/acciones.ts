"use server";

import { revalidatePath } from "next/cache";
import { cargarParaCartel } from "@/lib/carteles/cargar";
import { esUuid } from "@/lib/formulario";
import { cupo, leerPagina, paginaDeEnlace, publicar } from "@/lib/instagram/api";
import { sePuedePublicar } from "@/lib/instagram/elegir";
import { armarImagen, bajarCartel, convieneRecortar } from "@/lib/instagram/imagen";
import { armarTexto, etiquetasDeLaFoto, revisarTexto } from "@/lib/instagram/texto";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { cargarParaHoja } from "./datos";
import { FRASES, type ClaveError } from "@/lib/instagram/frases";
import type { EventoIg } from "@/lib/instagram/texto";

/**
 * Publicar en Instagram desde Administración (OL-458, firmado; bitácora 490): lo que pide la hoja de vista previa (`prepararInstagram`), publicar
 * (`publicarEnInstagram`) y guardar la ubicación de una ciudad o de un lugar (`guardarUbicacionInstagram`). Solo la administración: se comprueba
 * aquí y la base lo vuelve a comprobar (RLS). El token de Instagram nunca sale del servidor (`lib/instagram/api`).
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

export type PedidoPublicar = { eventoId: string; formato: "4x5" | "9x16"; recorte: boolean; diseno: number; texto: string | null; quitadas: string[] };
export type Publicado = { ok: true; permalink: string | null; sinEtiquetas: boolean } | { ok: false; error: ClaveError; mensaje: string };

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
  const quitadas = Array.isArray(p.quitadas) ? p.quitadas.filter((x) => typeof x === "string").slice(0, 20) : [];
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
  await anotar({ estado: "publicada", media_id: r.mediaId, permalink: r.permalink, imagen, etiquetas: r.sinEtiquetas ? [] : etiquetas, ubicacion: r.sinEtiquetas || formato === "9x16" ? null : (h.ubicacion?.id ?? null) });
  revalidatePath("/admin/instagram");
  revalidatePath("/admin");
  return { ok: true, permalink: r.permalink, sinEtiquetas: r.sinEtiquetas && (etiquetas.length > 0 || !!h.ubicacion) };
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
