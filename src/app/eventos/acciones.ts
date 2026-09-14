"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validarEvento, type ErroresEvento } from "@/lib/eventos";
import { clienteServidor } from "@/lib/supabase/servidor";

export type ResultadoEvento = { ok: true; id: string } | { ok: false; errores: ErroresEvento; general?: string };

async function sesionOEntrar(destino: string) {
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!supabase || !user) redirect(`/entrar?siguiente=${encodeURIComponent(destino)}`);
  return { supabase, user };
}

function leer(formData: FormData) {
  const claves = ["lugar_id", "titulo", "inicio", "fin", "descripcion", "imagen", "gratis", "precio", "enlace"];
  return Object.fromEntries(claves.map((k) => [k, formData.get(k)]));
}

function revalidar(id: string, lugarId: string) {
  revalidatePath("/");
  revalidatePath(`/eventos/${id}`);
  revalidatePath(`/lugares/${lugarId}`);
}

export async function crearEvento(_previo: ResultadoEvento | null, formData: FormData): Promise<ResultadoEvento> {
  const { supabase, user } = await sesionOEntrar("/eventos/nuevo");
  const { datos, errores } = validarEvento(leer(formData));
  if (Object.keys(errores).length) return { ok: false, errores };
  const { data, error } = await supabase
    .from("eventos")
    .insert({ ...datos, descripcion: datos.descripcion || null, creado_por: user.id })
    .select("id")
    .single();
  if (error || !data) return { ok: false, errores: {}, general: "No se pudo publicar el evento. Intenta de nuevo." };
  revalidar(data.id, datos.lugar_id);
  redirect(`/eventos/${data.id}?nuevo=1`);
}

export async function actualizarEvento(id: string, _previo: ResultadoEvento | null, formData: FormData): Promise<ResultadoEvento> {
  const { supabase } = await sesionOEntrar(`/eventos/${id}/editar`);
  const { datos, errores } = validarEvento(leer(formData));
  if (Object.keys(errores).length) return { ok: false, errores };
  const { data, error } = await supabase
    .from("eventos")
    .update({ ...datos, descripcion: datos.descripcion || null })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, errores: {}, general: "No se pudo guardar. ¿Sigues con sesión y es tu evento?" };
  revalidar(id, datos.lugar_id);
  redirect(`/eventos/${id}`);
}

export async function cambiarVisibleEvento(id: string, lugarId: string, visible: boolean) {
  const { supabase } = await sesionOEntrar(`/eventos/${id}`);
  await supabase.from("eventos").update({ visible }).eq("id", id);
  revalidar(id, lugarId);
  redirect(`/eventos/${id}`);
}
