"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { BUCKET_INSTANTANEAS, lugarMasCercano, nombreParedSinLugar, nombreSugerido, rutaInstantanea } from "@/lib/pincel";
import { esUuid, limpiar } from "@/lib/formulario";
import { localAIso, zonaSegura } from "@/lib/fechas";
import { cierreDesdeEvento, cierreSugeridoIso } from "@/lib/obras-colectivas";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

export type Resultado = { ok: true } | { ok: false; error: string };

async function soloAdmin() {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/admin/obras-colectivas");
  if (actual.perfil.rol !== "admin") redirect("/");
  const supabase = (await clienteServidor())!;
  return { supabase, yo: actual.perfil.id };
}

/** 23505 = unique_violation: ya hay una obra abierta en ese lugar o para ese evento (los dos índices de la migración). */
function esUnicidad(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23505";
}

/** 23514 = check_violation: el freno global de Pincel (OL-121, migración 20260922180000) — ya hay dos obras
 * abiertas, o el cupo pedido rebasa lo que queda entre todas. El disparador manda un mensaje llano en
 * `error.message` (p. ej. «Quedan 12 mandos entre todas las obras abiertas»): se muestra tal cual, no uno genérico. */
function esFrenoGlobal(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23514";
}

/**
 * «Activar Pincel» en la ficha de un evento. Si ese evento o su lugar ya tienen una obra abierta, entra a esa en vez
 * de duplicarla — la base lo garantiza con sus índices únicos, esto solo evita el viaje de ida y vuelta con error.
 */
export async function crearDesdeEvento(eventoId: string) {
  if (!esUuid(eventoId)) redirect("/");
  const { supabase, yo } = await soloAdmin();
  const { data: evento } = await supabase.from("eventos").select("id, titulo, inicio, fin, lugar_id").eq("id", eventoId).maybeSingle();
  if (!evento) redirect(`/eventos/${eventoId}`);
  const cierra = cierreDesdeEvento(evento.inicio, evento.fin);
  const { data: creada, error } = await supabase
    .from("obras_colectivas")
    .insert({ nombre: evento.titulo.slice(0, 120), lugar_id: evento.lugar_id, evento_id: eventoId, cierra_en: cierra, creado_por: yo })
    .select("id")
    .single();
  if (creada) redirect(`/admin/obras-colectivas/${creada.id}`);
  if (esUnicidad(error)) {
    const { data: existente } = await supabase.from("obras_colectivas").select("id").eq("lugar_id", evento.lugar_id).eq("estado", "abierta").maybeSingle();
    if (existente) redirect(`/admin/obras-colectivas/${existente.id}`);
  }
  redirect(`/eventos/${eventoId}`);
}

/** «Crear obra aquí», sin evento: lugar elegido, nombre y hora de cierre sugeridos, los tres editables. */
export async function crearPorUbicacion(_anterior: Resultado, formData: FormData): Promise<Resultado> {
  const { supabase, yo } = await soloAdmin();
  const lugarId = limpiar(formData.get("lugar_id"));
  const nombre = limpiar(formData.get("nombre")).slice(0, 120);
  const hora = limpiar(formData.get("hora"));
  if (!esUuid(lugarId)) return { ok: false, error: "Elige un lugar." };
  if (!nombre) return { ok: false, error: "Escribe un nombre para la obra." };
  const { data: lugar } = await supabase.from("lugares").select("zona").eq("id", lugarId).maybeSingle();
  if (!lugar) return { ok: false, error: "Ese lugar ya no existe." };
  const cierra = localAIso(hora, zonaSegura(lugar.zona));
  if (!cierra) return { ok: false, error: "La hora de cierre no es válida." };
  const { data: creada, error } = await supabase.from("obras_colectivas").insert({ nombre, lugar_id: lugarId, cierra_en: cierra, creado_por: yo }).select("id").single();
  if (error) {
    if (esUnicidad(error)) return { ok: false, error: "Ya hay una obra abierta en ese lugar." };
    if (esFrenoGlobal(error)) return { ok: false, error: error.message };
    return { ok: false, error: "No se pudo crear. Intenta de nuevo." };
  }
  redirect(`/admin/obras-colectivas/${creada.id}`);
}

/**
 * «Crear pared aquí» (OL-127, founder: «También debe permitir crear pared en ubicación actual sin más»): con la
 * ubicación actual del teléfono, sin más pasos. Si hay un lugar del directorio a menos de 200 m se usa ese (y se
 * dice); si no, la obra queda sin lugar y guarda sus coordenadas propias (migración 20260922230000). Nombre por
 * defecto «Pincel en <lugar>» o «Pincel · <fecha corta>», cierre en dos horas; los dos editables después.
 */
export async function crearParedAqui(donde: { lat: number; lng: number; precisionM: number }): Promise<{ ok: true; id: string; lugarNombre: string | null } | { ok: false; error: string }> {
  const { supabase, yo } = await soloAdmin();
  if (!Number.isFinite(donde.lat) || !Number.isFinite(donde.lng) || Math.abs(donde.lat) > 90 || Math.abs(donde.lng) > 180) return { ok: false, error: "No se pudo leer la ubicación." };
  const { data: lugares } = await supabase.from("lugares").select("id, nombre, lat, lng, zona").eq("visible", true);
  const conCoordenadas = ((lugares ?? []) as Array<{ id: string; nombre: string; lat: number | null; lng: number | null; zona: string }>).filter((l): l is { id: string; nombre: string; lat: number; lng: number; zona: string } => typeof l.lat === "number" && typeof l.lng === "number");
  const cercano = lugarMasCercano({ lat: donde.lat, lng: donde.lng }, conCoordenadas);
  const zona = zonaSegura(cercano?.lugar.zona ?? "America/Mexico_City");
  const nombre = (cercano ? nombreSugerido(cercano.lugar.nombre) : nombreParedSinLugar(new Date(), zona)).slice(0, 120);
  // Un solo objeto (no dos formas distintas): con lugar, o con coordenadas propias y su zona.
  const fila: Record<string, string | number> = { nombre, cierra_en: cierreSugeridoIso(), creado_por: yo, ...(cercano ? { lugar_id: cercano.lugar.id } : { lat: donde.lat, lng: donde.lng, zona }) };
  const { data: creada, error } = await supabase.from("obras_colectivas").insert(fila).select("id").single();
  if (error || !creada) {
    if (esUnicidad(error)) return { ok: false, error: `Ya hay una pared abierta en ${cercano?.lugar.nombre ?? "ese lugar"}.` };
    if (esFrenoGlobal(error)) return { ok: false, error: error?.message ?? "No se pudo crear." };
    return { ok: false, error: "No se pudo crear. Intenta de nuevo." };
  }
  revalidatePath("/admin/obras-colectivas");
  return { ok: true, id: creada.id, lugarNombre: cercano?.lugar.nombre ?? null };
}

function revalidar(id: string) {
  revalidatePath("/admin/obras-colectivas");
  revalidatePath(`/admin/obras-colectivas/${id}`);
}

export async function terminarObra(id: string): Promise<Resultado> {
  if (!esUuid(id)) return { ok: false, error: "No encontramos esa obra." };
  const { supabase } = await soloAdmin();
  const { error, data } = await supabase.from("obras_colectivas").update({ estado: "cerrada", cerrado_en: new Date().toISOString() }).eq("id", id).eq("estado", "abierta").select("id");
  if (error) return { ok: false, error: "No se pudo terminar. Intenta de nuevo." };
  if (!data || data.length === 0) return { ok: false, error: "Ya no estaba abierta. Recarga la página." };
  revalidar(id);
  return { ok: true };
}

/** Puede chocar con el índice único de su lugar o su evento si, mientras tanto, se abrió otra obra ahí. */
/** Cupo de mandos por obra (doc rediseno/34): entre 1 y 20, el mismo tope que exige la base con su `check`. Se
 * valida aquí también para dar un mensaje claro en vez del error crudo de Postgres si algo manda un número fuera. */
export async function cambiarCupo(id: string, cupo: number): Promise<Resultado> {
  if (!esUuid(id)) return { ok: false, error: "No encontramos esa obra." };
  if (!Number.isInteger(cupo) || cupo < 1 || cupo > 20) return { ok: false, error: "El cupo va de 1 a 20." };
  const { supabase } = await soloAdmin();
  const { error } = await supabase.from("obras_colectivas").update({ cupo_mandos: cupo }).eq("id", id);
  if (error) return { ok: false, error: esFrenoGlobal(error) ? error.message : "No se pudo cambiar el cupo. Intenta de nuevo." };
  revalidar(id);
  return { ok: true };
}

/** Interruptor «Pincel apagado» (OL-121, doc del founder 2026-09-22): apagado, la pared y el mando no dejan pintar
 * y el canal en vivo deja de responder (migración 20260922180000, política restrictiva sobre `realtime.messages`).
 * Quién lo cambió y cuándo lo pone solo el disparador de la base (`ajustes_sitio_quien`), no lo que mande aquí. */
/**
 * «Borrar la pared» (OL-126): registra la hora del borrado en la obra abierta. Es la comprobación del lado del
 * servidor: solo administración llega aquí (`soloAdmin`) y solo administración puede actualizar la obra (RLS); la
 * pared, al recibir «borrar» por el canal, lee esta hora y solo limpia si es reciente — un mando que mande «borrar»
 * por su cuenta no la tiene. El aviso por el canal lo manda el navegador de administración después de esto.
 */
export async function borrarPared(id: string): Promise<Resultado> {
  if (!esUuid(id)) return { ok: false, error: "No encontramos esa obra." };
  const { supabase } = await soloAdmin();
  const { error, data } = await supabase.from("obras_colectivas").update({ borrado_pared_en: new Date().toISOString() }).eq("id", id).eq("estado", "abierta").select("id");
  if (error) return { ok: false, error: "No se pudo borrar la pared. Intenta de nuevo." };
  if (!data || data.length === 0) return { ok: false, error: "La obra ya no está abierta. Recarga la página." };
  return { ok: true };
}

export async function cambiarPincelActivo(activo: boolean): Promise<Resultado> {
  const { supabase } = await soloAdmin();
  const { error } = await supabase.from("ajustes_sitio").update({ valor: activo }).eq("clave", "pincel_activo");
  if (error) return { ok: false, error: "No se pudo cambiar. Intenta de nuevo." };
  revalidatePath("/admin/obras-colectivas");
  return { ok: true };
}

export async function reabrirObra(id: string): Promise<Resultado> {
  if (!esUuid(id)) return { ok: false, error: "No encontramos esa obra." };
  const { supabase } = await soloAdmin();
  const { error, data } = await supabase.from("obras_colectivas").update({ estado: "abierta", cerrado_en: null }).eq("id", id).eq("estado", "cerrada").select("id");
  if (error) return { ok: false, error: esUnicidad(error) ? "Ya hay otra obra abierta en ese lugar o evento." : "No se pudo reabrir. Intenta de nuevo." };
  if (!data || data.length === 0) return { ok: false, error: "Ya no estaba cerrada. Recarga la página." };
  revalidar(id);
  return { ok: true };
}

/**
 * Borra una obra ya cerrada (founder, 2026-09-21: "permite borrado de obras colectivas"; cambia lo firmado el
 * 2026-09-19). La base lo exige con su propia política (solo admin, solo `estado = 'cerrada'`, migración
 * 20260922120000); aquí solo se lee `imagen_final` antes de borrar la fila para, si existe, borrarla también del
 * bucket — mismo patrón de redirect con `?error=` que `borrarEvento` (`Borrar` no tiene su propio estado de error).
 */
export async function borrarObra(id: string) {
  if (!esUuid(id)) redirect("/admin/obras-colectivas");
  const { supabase } = await soloAdmin();
  const { data: obra } = await supabase.from("obras_colectivas").select("imagen_final").eq("id", id).maybeSingle();
  const { data } = await supabase.from("obras_colectivas").delete().eq("id", id).select("id").maybeSingle();
  if (!data) redirect(`/admin/obras-colectivas/${id}?error=borrar`);
  // Mejor esfuerzo: la fila ya se borró (es lo que importa); si esto falla, queda un archivo huérfano en el
  // bucket, no un dato roto en la base. Nadie sube a fotos/obras/ todavía (llega con la pared, Fase 2), así que
  // hoy `imagen_final` siempre es null y esta rama no se ejercita — queda lista para cuando exista.
  if (obra?.imagen_final) await supabase.storage.from("fotos").remove([obra.imagen_final]);
  // OL-126: la instantánea de la pared (bucket privado «obras», obras/<id>/pared.png), si la hubo; mismo mejor esfuerzo.
  await supabase.storage.from(BUCKET_INSTANTANEAS).remove([rutaInstantanea(id)]);
  revalidatePath("/admin/obras-colectivas");
  redirect("/admin/obras-colectivas");
}
