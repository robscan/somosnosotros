"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validarPerfil, type ErroresPerfil } from "@/lib/perfil";
import { clienteServidor } from "@/lib/supabase/servidor";
import { endpointPushPermitido, validarSuscripcionPush } from "@/lib/suscripcionPush";

export type ResultadoGuardar = { ok: true; volver: string } | { ok: false; errores: ErroresPerfil; general?: string };

export async function guardarPerfil(_previo: ResultadoGuardar | null, formData: FormData): Promise<ResultadoGuardar> {
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!supabase || !user) redirect("/entrar?siguiente=/ajustes/editar");

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
  revalidatePath("/ajustes");
  revalidatePath(`/personas/${user.id}`);
  // Guardado: de vuelta a Ajustes, con la ficha releída (el formulario termina la tarea sin dejarla en el historial).
  return { ok: true, volver: "/ajustes" };
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

/** La suscripcion del navegador solo esta activa si esta cuenta la tiene registrada y consentida. */
export async function suscripcionPushActiva(endpoint: string): Promise<boolean> {
  if (typeof endpoint !== "string" || !endpointPushPermitido(endpoint)) return false;
  try {
    const supabase = await clienteServidor();
    if (!supabase) return false;
    const { data: { user }, error: errorSesion } = await supabase.auth.getUser();
    if (errorSesion || !user) return false;
    // Un solo snapshot para el registro y el consentimiento, con RLS y sin llave de servicio.
    const { data, error } = await supabase.from("suscripciones_push")
      .select("endpoint, perfiles!inner(avisos_push)")
      .eq("endpoint", endpoint).eq("usuario_id", user.id).eq("perfiles.avisos_push", true)
      .maybeSingle();
    return !error && data?.endpoint === endpoint;
  } catch {
    return false;
  }
}

/** Guarda la suscripción push de este teléfono (una fila por endpoint). */
export async function guardarSuscripcionPush(sub: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<boolean> {
  const valida = validarSuscripcionPush(sub);
  if (!valida) return false;
  try {
    const supabase = await clienteServidor();
    if (!supabase) return false;
    const { data: { user }, error: errorSesion } = await supabase.auth.getUser();
    if (errorSesion || !user) return false;
    const { error } = await supabase.from("suscripciones_push").upsert({ endpoint: valida.endpoint, usuario_id: user.id, p256dh: valida.keys.p256dh, auth: valida.keys.auth });
    if (error) return false;
    const { data: perfil, error: errorPerfil } = await supabase.from("perfiles")
      .update({ avisos_push: true, avisos_push_desde: new Date().toISOString(), avisos_preguntado: true })
      .eq("id", user.id).select("id, avisos_push").maybeSingle();
    if (errorPerfil || perfil?.id !== user.id || perfil.avisos_push !== true) return false;
    // Como elegirAvisos: Ajustes y la agenda al día; la pregunta ya no depende de esto (lib/avisosPreguntados).
    revalidatePath("/perfil");
    revalidatePath("/");
    return true;
  } catch {
    return false;
  }
}

export async function borrarSuscripcionPush(endpoint: string): Promise<void> {
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  await supabase?.from("suscripciones_push").delete().eq("endpoint", endpoint);
  if (!supabase || !user) return;
  // Apagar en un teléfono no apaga los demás: la cuenta sigue con avisos mientras quede otro dado de alta (decisión 5 de docs/rediseno/17).
  const { count } = await supabase.from("suscripciones_push").select("endpoint", { count: "exact", head: true }).eq("usuario_id", user.id);
  if (!count) await supabase.from("perfiles").update({ avisos_push: false, avisos_push_desde: null }).eq("id", user.id);
}
