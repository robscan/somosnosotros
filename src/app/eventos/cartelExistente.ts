"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { EventoAgenda } from "@/lib/agenda";
import { enlaceDeAlta } from "@/lib/armazon";
import { carpetaFotoPropia, esFotoPropia } from "@/lib/carteles/fotoPropia";
import { huellaDeCartel } from "@/lib/carteles/huellaServidor";
import { avisoAlDueno, completarDelFormulario, mensajeDeError, type Completado } from "@/lib/cartelExistente";
import { conPermisoDeCambiar } from "@/lib/cartelExistenteServidor";
import { comoPaleta } from "@/lib/coloresCartel";
import { coloresDeImagenEnMemoria } from "@/lib/coloresCartelServidor";
import { configPublica } from "@/lib/config";
import { esClase, hrefEvento, LIMITES_EVENTO } from "@/lib/eventos";
import { preguntaSiHayParecidos, type EventoParecido } from "@/lib/eventosParecidos";
import { localAIso, zonaSegura } from "@/lib/fechas";
import { esUuid } from "@/lib/formulario";
import { avisarAlTelefono } from "@/lib/redes/herramientas";
import { bajarImagen } from "@/lib/rutinas/imagenWeb";
import { clienteAdmin } from "@/lib/supabase/admin";
import { sesionOEntrar } from "@/lib/supabase/sesion";
import { esAdminDeSesion } from "@/lib/supabase/servidor";
import { zonaDePunto } from "@/lib/zona";

/**
 * Tu cartel a un evento que ya está (OL-467; prototipo firmado de OL-466, bitácora 498). Dos acciones del alta de evento, que la página le pasa
 * como `accion` y `sugerencias` (así las pruebas del alta no dependen de ellas):
 *
 * - `parecidosDelCartel`: en cuanto se lee el cartel (C2), con su nombre, su día y su sitio, los eventos parecidos (la misma `eventos_parecidos` que
 *   pregunta al publicar), y de los que ya tienen cartel si quien mira puede cambiarlo. Solo lee; si falla, nada (preguntar ayuda, no es un candado).
 * - `ponerMiCartel`: «Sí, es este: ponerle mi cartel» (o «cambiar su cartel por el mío», `reemplazar`). La regla vive en la base
 *   (`poner_cartel_a_evento`): cualquiera con sesión a uno sin cartel, completando solo lo que le falta; cambiarlo, quien lo publicó o la
 *   administración. Aquí: que la imagen sea un archivo de la carpeta de quien la sube, sus colores y su huella, el aviso al teléfono de quien lo
 *   publicó (si no es uno mismo; respeta sus avisos apagados) y la tarjeta del final con el evento como quedó.
 */

export type DatosParaParecidos = { titulo: string; inicio: string; clase: string; lugarId: string | null; sitioTexto: string | null; lat?: number | null; lng?: number | null };

export async function parecidosDelCartel(d: DatosParaParecidos): Promise<EventoParecido[]> {
  const { supabase, user } = await sesionOEntrar(enlaceDeAlta("evento", null).href);
  const titulo = typeof d?.titulo === "string" ? d.titulo.trim().slice(0, LIMITES_EVENTO.titulo) : "";
  const lugarId = typeof d?.lugarId === "string" && esUuid(d.lugarId) ? d.lugarId : null;
  const sitioTexto = !lugarId && typeof d?.sitioTexto === "string" ? d.sitioTexto.trim().slice(0, LIMITES_EVENTO.sitio) : "";
  if (!titulo || (!lugarId && !sitioTexto) || !preguntaSiHayParecidos(esClase(d?.clase) ? d.clase : "puntual")) return [];
  try {
    // La zona del evento: la de su lugar o, en otro sitio, la del punto (sin punto, la inicial), como al publicar.
    const zona = lugarId
      ? zonaSegura(((await supabase.from("lugares").select("zona").eq("id", lugarId).maybeSingle()).data as { zona?: string } | null)?.zona)
      : zonaDePunto(typeof d.lat === "number" ? d.lat : null, typeof d.lng === "number" ? d.lng : null);
    const inicio = localAIso(typeof d.inicio === "string" ? d.inicio : "", zona);
    if (!inicio) return [];
    const { data, error } = await supabase.rpc("eventos_parecidos", { p_titulo: titulo, p_inicio: inicio, p_zona: zona, p_lugar_id: lugarId, p_sitio_texto: sitioTexto || null });
    if (error || !Array.isArray(data) || !data.length) return [];
    return conPermisoDeCambiar(supabase, user.id, await esAdminDeSesion(supabase, user.id), data as EventoParecido[]);
  } catch (e) {
    console.error("parecidosDelCartel:", e);
    return [];
  }
}

export type ResultadoMiCartel =
  | { ok: true; evento: EventoAgenda; completado: Completado[]; reemplazado: boolean }
  | { ok: false; mensaje: string; yaTieneCartel?: boolean };

const COMPLETADOS: readonly Completado[] = ["precio", "fin", "descripcion", "artistas"];
const COLUMNAS = "id, slug, titulo, inicio, fin, zona, imagen, precio, lugar_id, sitio_texto, sitio_direccion, sitio_reservado, creado_en, clase, evento_padre_id, lugar:lugares(nombre, portada)";
const texto = (v: FormDataEntryValue | null): string => (typeof v === "string" ? v : "");


export async function ponerMiCartel(eventoId: string, fd: FormData, reemplazar = false): Promise<ResultadoMiCartel> {
  const { supabase, user } = await sesionOEntrar(enlaceDeAlta("evento", null).href);
  const imagen = texto(fd.get("imagen"));
  // Solo un cartel que esta persona subió a su carpeta (la base, además, solo admite imágenes del almacenamiento de la app).
  if (!esUuid(eventoId) || !esFotoPropia(imagen, carpetaFotoPropia(user.id, configPublica().supabaseUrl))) return { ok: false, mensaje: "No se pudo poner tu cartel. Sube la imagen otra vez." };
  const { data: original } = await supabase.from("eventos").select("id, zona, clase, evento_padre_id").eq("id", eventoId).maybeSingle();
  if (!original) return { ok: false, mensaje: "Ese evento ya no está publicado." };
  // Los colores (OL-360) y la huella (OL-464), de la imagen ya subida; sin bajarla, los colores que calculó el teléfono.
  const bytes = await bajarImagen(imagen).catch(() => null);
  const [colores, huella] = bytes ? await Promise.all([coloresDeImagenEnMemoria(bytes), huellaDeCartel(bytes)]) : [null, null];
  const p_completar = reemplazar ? null : completarDelFormulario(fd, original as { zona: string; clase?: string | null; evento_padre_id?: string | null });
  const { data, error } = await supabase.rpc("poner_cartel_a_evento", { p_evento: eventoId, p_imagen: imagen, p_colores: colores ?? comoPaleta(fd.get("colores_cartel")), p_completar, p_reemplazar: reemplazar });
  if (error || !data) {
    if (error && !["23505", "42501", "P0002", "22023"].includes(error.code ?? "")) console.error("ponerMiCartel:", error.message);
    return { ok: false, ...mensajeDeError(error) };
  }
  const r = data as { id: string; slug: string | null; lugar_id: string | null; dueno: string | null; completado: string[]; reemplazado: boolean; artistas: string[] };
  const admin = clienteAdmin();
  // La huella solo la escribe el servidor (el disparador ignora lo que manda una cuenta): con la llave, y solo si la imagen sigue siendo esa.
  if (huella && admin) {
    const { error: e } = await admin.from("eventos").update({ cartel_huella: huella }).eq("id", r.id).eq("imagen", imagen);
    if (e) console.error("ponerMiCartel (huella):", e.message);
  }
  const { data: fila } = await supabase.from("eventos").select(COLUMNAS).eq("id", r.id).maybeSingle();
  const f = (fila ?? {}) as Record<string, unknown> & { lugar?: unknown };
  const lugar = Array.isArray(f.lugar) ? (f.lugar[0] ?? null) : (f.lugar ?? null);
  const evento = { ...f, id: r.id, slug: r.slug, lugar, van: null } as EventoAgenda;
  const href = hrefEvento({ id: r.id, slug: r.slug });
  revalidatePath("/");
  revalidatePath(`/eventos/${r.id}`);
  if (r.slug) revalidatePath(`/eventos/${r.slug}`);
  if (r.lugar_id) revalidatePath(`/lugares/${r.lugar_id}`);
  for (const a of r.artistas ?? []) revalidatePath(`/artistas/${a}`);
  // El aviso a quien lo publicó, después de contestar: «Ana le puso cartel a tu evento «…»».
  if (r.dueno && r.dueno !== user.id && admin) {
    const dueno = r.dueno;
    after(async () => {
      const { data: perfil } = await supabase.from("perfiles").select("nombre").eq("id", user.id).maybeSingle();
      await avisarAlTelefono(admin, dueno, avisoAlDueno({ nombre: (perfil as { nombre?: string } | null)?.nombre ?? null, titulo: evento.titulo ?? "", href, id: r.id, reemplazado: r.reemplazado }));
    });
  }
  return { ok: true, evento, completado: (r.completado ?? []).filter((c): c is Completado => COMPLETADOS.includes(c as Completado)), reemplazado: !!r.reemplazado };
}
