"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { esUuid, limpiar } from "@/lib/formulario";
import { localAIso, zonaSegura } from "@/lib/fechas";
import { cierreDesdeEvento } from "@/lib/obras-colectivas";
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
  if (error) return { ok: false, error: esUnicidad(error) ? "Ya hay una obra abierta en ese lugar." : "No se pudo crear. Intenta de nuevo." };
  redirect(`/admin/obras-colectivas/${creada.id}`);
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
  revalidatePath("/admin/obras-colectivas");
  redirect("/admin/obras-colectivas");
}
