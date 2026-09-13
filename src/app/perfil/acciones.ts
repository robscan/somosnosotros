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

  const { error } = await supabase
    .from("perfiles")
    .update({ nombre: datos.nombre, colonia: datos.colonia || null, bio: datos.bio || null, foto: datos.foto })
    .eq("id", user.id);
  if (error) return { ok: false, errores: {}, general: "No se pudo guardar. Intenta de nuevo." };

  revalidatePath("/");
  revalidatePath("/perfil");
  return { ok: true };
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
  if (error) redirect("/perfil?error=borrar");
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/?cuenta=borrada");
}
