"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validarPerfil, type ErroresPerfil } from "@/lib/perfil";
import { clienteServidor } from "@/lib/supabase/servidor";

export type ResultadoGuardar = { ok: true } | { ok: false; errores: ErroresPerfil; general?: string };

export async function guardarPerfil(_previo: ResultadoGuardar | null, formData: FormData): Promise<ResultadoGuardar> {
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!supabase || !user) redirect("/entrar?siguiente=/perfil");

  const { datos, errores } = validarPerfil({
    nombre: formData.get("nombre"),
    colonia: formData.get("colonia"),
    bio: formData.get("bio"),
    foto: formData.get("foto"),
  });
  if (Object.keys(errores).length) return { ok: false, errores };

  // Los avisos ya no van aquí: se cambian en su propia hoja, al tocar (avisos/acciones · elegirAvisos).
  const { error } = await supabase.from("perfiles").update({ nombre: datos.nombre, colonia: datos.colonia || null, bio: datos.bio || null, foto: datos.foto }).eq("id", user.id);
  if (error) return { ok: false, errores: {}, general: "No se pudo guardar. Intenta de nuevo." };

  revalidatePath("/");
  revalidatePath("/perfil");
  revalidatePath(`/personas/${user.id}`);
  return { ok: true };
}

/** Perfil público o reservado: se guarda al tocar el interruptor (migración 0020). */
export async function elegirReserva(reservado: boolean): Promise<boolean> {
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!supabase || !user) return false;
  const { error } = await supabase.from("perfiles").update({ reservado }).eq("id", user.id);
  if (error) return false;
  revalidatePath("/perfil");
  revalidatePath(`/personas/${user.id}`);
  return true;
}

export async function cerrarSesion() {
  const supabase = await clienteServidor();
  await supabase?.auth.signOut();
  revalidatePath("/");
  redirect("/");
}

export async function borrarMiCuenta() {
  const supabase = await clienteServidor();
  if (!supabase) redirect("/");
  const { error } = await supabase.rpc("borrar_mi_cuenta");
  if (error) redirect("/ajustes?error=borrar");
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/?cuenta=borrada");
}

/** Guarda la suscripción push de este teléfono (una fila por endpoint). */
export async function guardarSuscripcionPush(sub: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<boolean> {
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!supabase || !user || !sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return false;
  const { error } = await supabase.from("suscripciones_push").upsert({ endpoint: sub.endpoint, usuario_id: user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth });
  if (error) return false;
  await supabase.from("perfiles").update({ avisos_push: true, avisos_push_desde: new Date().toISOString(), avisos_preguntado: true }).eq("id", user.id);
  return true;
}

export async function borrarSuscripcionPush(endpoint: string): Promise<void> {
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  await supabase?.from("suscripciones_push").delete().eq("endpoint", endpoint);
  if (user) await supabase?.from("perfiles").update({ avisos_push: false, avisos_push_desde: null }).eq("id", user.id);
}
