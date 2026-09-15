"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { rutaSegura } from "@/lib/rutas";
import { validarLugar, type ErroresLugar, type LugarResumen } from "@/lib/lugares";
import { sesionOEntrar } from "@/lib/supabase/sesion";

export type ResultadoLugar =
  | { ok: true; id: string }
  | { ok: false; errores: ErroresLugar; general?: string; parecidos?: LugarResumen[] };


function leer(formData: FormData) {
  const claves = ["nombre", "tipo", "direccion", "lat", "lng", "descripcion", "portada", "enlaces", "privado"];
  return Object.fromEntries(claves.map((k) => [k, formData.get(k)]));
}

type Cliente = Awaited<ReturnType<typeof sesionOEntrar>>["supabase"];

/** "Privado" solo lo puede marcar el administrador (la política de la base lo exige también). */
async function privadoPermitido(supabase: Cliente, usuarioId: string, pedido: boolean): Promise<boolean> {
  if (!pedido) return false;
  const { data } = await supabase.from("perfiles").select("rol").eq("id", usuarioId).maybeSingle();
  return data?.rol === "admin";
}

/** Alta de lugar. Si hay uno parecido a menos de 150 m y no se confirmó, devuelve los parecidos para preguntar "¿es este?". */
export async function crearLugar(_previo: ResultadoLugar | null, formData: FormData): Promise<ResultadoLugar> {
  const { supabase, user } = await sesionOEntrar("/lugares/nuevo");
  const { datos, errores } = validarLugar(leer(formData));
  if (Object.keys(errores).length) return { ok: false, errores };

  if (formData.get("confirmado") !== "1") {
    const { data: parecidos } = await supabase.rpc("lugares_parecidos", { p_nombre: datos.nombre, p_lat: datos.lat, p_lng: datos.lng });
    if (parecidos && parecidos.length > 0) return { ok: false, errores: {}, parecidos: parecidos as LugarResumen[] };
  }

  const { data, error } = await supabase
    .from("lugares")
    .insert({ ...datos, privado: await privadoPermitido(supabase, user.id, datos.privado), descripcion: datos.descripcion || null, direccion: datos.direccion || null, creado_por: user.id })
    .select("id")
    .single();
  if (error || !data) return { ok: false, errores: {}, general: "No se pudo guardar el lugar. Intenta de nuevo." };

  revalidatePath("/");
  // Si se vino del alta de evento, se vuelve con el lugar ya elegido; si no, a la ficha recién publicada.
  const siguiente = rutaSegura(formData.get("siguiente") as string | null, "");
  redirect(siguiente ? `${siguiente}${siguiente.includes("?") ? "&" : "?"}lugar=${data.id}` : `/lugares/${data.id}?nuevo=1`);
}

export async function actualizarLugar(id: string, _previo: ResultadoLugar | null, formData: FormData): Promise<ResultadoLugar> {
  const { supabase, user } = await sesionOEntrar(`/lugares/${id}/editar`);
  const { datos, errores } = validarLugar(leer(formData));
  if (Object.keys(errores).length) return { ok: false, errores };

  const { data, error } = await supabase
    .from("lugares")
    .update({ ...datos, privado: await privadoPermitido(supabase, user.id, datos.privado), descripcion: datos.descripcion || null, direccion: datos.direccion || null })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, errores: {}, general: "No se pudo guardar. ¿Sigues con sesión y es tu lugar?" };

  revalidatePath("/");
  revalidatePath(`/lugares/${id}`);
  redirect(`/lugares/${id}`);
}

/** Solo el admin (o el autor) puede ocultar/mostrar; lo decide la política de la base. */
export async function cambiarVisible(id: string, visible: boolean) {
  const { supabase } = await sesionOEntrar(`/lugares/${id}`);
  await supabase.from("lugares").update({ visible }).eq("id", id);
  revalidatePath("/");
  revalidatePath(`/lugares/${id}`);
  redirect(`/lugares/${id}`);
}

/** Seguir / dejar de seguir un lugar. Un toque. */
export async function cambiarSeguimiento(lugarId: string, seguir: boolean) {
  const { supabase, user } = await sesionOEntrar(`/lugares/${lugarId}?accion=${seguir ? "seguir" : ""}`);
  if (seguir) await supabase.from("seguimientos").upsert({ usuario_id: user.id, lugar_id: lugarId }, { onConflict: "usuario_id,lugar_id", ignoreDuplicates: true });
  else await supabase.from("seguimientos").delete().eq("usuario_id", user.id).eq("lugar_id", lugarId);
  revalidatePath(`/lugares/${lugarId}`);
  revalidatePath("/perfil");
  revalidatePath(`/personas/${user.id}`);
}

/**
 * Borrar un lugar: su autor si no tiene eventos de otras personas (si los tiene, que lo oculte);
 * el admin siempre. Los eventos del lugar se van con él (cascada en la base).
 */
export async function borrarLugar(id: string) {
  const { supabase, user } = await sesionOEntrar(`/lugares/${id}`);
  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).maybeSingle();
  if (perfil?.rol !== "admin") {
    const { count } = await supabase.from("eventos").select("*", { count: "exact", head: true }).eq("lugar_id", id).neq("creado_por", user.id);
    if ((count ?? 0) > 0) redirect(`/lugares/${id}?error=tiene-eventos`);
  }
  const { data } = await supabase.from("lugares").delete().eq("id", id).select("id").maybeSingle();
  if (!data) redirect(`/lugares/${id}?error=borrar`);
  revalidatePath("/");
  redirect("/?borrado=lugar");
}
