"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { leerCartel } from "@/lib/cartel";
import { configPublica } from "@/lib/config";
import { cartelAFormulario, validarEvento, type DatosEvento, type ErroresEvento } from "@/lib/eventos";
import type { LugarResumen } from "@/lib/lugares";
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
  const claves = ["modo_sitio", "lugar_id", "sitio_texto", "sitio_lat", "sitio_lng", "direccion_privada", "privado_lat", "privado_lng", "indicaciones", "revelar_horas", "titulo", "inicio", "fin", "descripcion", "imagen", "gratis", "precio", "enlace"];
  return Object.fromEntries(claves.map((k) => [k, formData.get(k)]));
}

function filaEvento(datos: DatosEvento) {
  const { privado: _p, ...fila } = datos;
  void _p;
  return { ...fila, descripcion: fila.descripcion || null };
}

function revalidar(id: string, lugarId: string | null) {
  revalidatePath("/");
  revalidatePath(`/eventos/${id}`);
  if (lugarId) revalidatePath(`/lugares/${lugarId}`);
}

/** Guarda (o quita) la dirección exacta de un sitio reservado. La política de la base decide quién puede. */
async function guardarPrivado(supabase: Awaited<ReturnType<typeof clienteServidor>>, id: string, datos: DatosEvento) {
  if (!supabase) return false;
  if (datos.privado) {
    const { error } = await supabase.from("eventos_sitio_privado").upsert({ evento_id: id, ...datos.privado });
    return !error;
  }
  await supabase.from("eventos_sitio_privado").delete().eq("evento_id", id);
  return true;
}

export async function crearEvento(_previo: ResultadoEvento | null, formData: FormData): Promise<ResultadoEvento> {
  const { supabase, user } = await sesionOEntrar("/eventos/nuevo");
  const { datos, errores } = validarEvento(leer(formData));
  if (Object.keys(errores).length) return { ok: false, errores };
  const { data, error } = await supabase
    .from("eventos")
    .insert({ ...filaEvento(datos), creado_por: user.id })
    .select("id")
    .single();
  if (error || !data) return { ok: false, errores: {}, general: "No se pudo publicar el evento. Intenta de nuevo." };
  if (!(await guardarPrivado(supabase, data.id, datos))) {
    await supabase.from("eventos").delete().eq("id", data.id);
    return { ok: false, errores: {}, general: "No se pudo guardar la dirección reservada. Intenta de nuevo." };
  }
  revalidar(data.id, datos.lugar_id);
  redirect(`/eventos/${data.id}?nuevo=1`);
}

export async function actualizarEvento(id: string, _previo: ResultadoEvento | null, formData: FormData): Promise<ResultadoEvento> {
  const { supabase } = await sesionOEntrar(`/eventos/${id}/editar`);
  const { datos, errores } = validarEvento(leer(formData));
  if (Object.keys(errores).length) return { ok: false, errores };
  const { data, error } = await supabase.from("eventos").update(filaEvento(datos)).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { ok: false, errores: {}, general: "No se pudo guardar. ¿Sigues con sesión y es tu evento?" };
  await guardarPrivado(supabase, id, datos);
  revalidar(id, datos.lugar_id);
  redirect(`/eventos/${id}`);
}

export async function cambiarVisibleEvento(id: string, lugarId: string | null, visible: boolean) {
  const { supabase } = await sesionOEntrar(`/eventos/${id}`);
  await supabase.from("eventos").update({ visible }).eq("id", id);
  revalidar(id, lugarId);
  redirect(`/eventos/${id}`);
}

export type ResultadoCartel =
  | { ok: true; valores: ReturnType<typeof cartelAFormulario>; lugarId: string | null }
  | { ok: false; mensaje: string };

/** Lee el cartel ya subido a Storage y devuelve los valores para llenar el formulario. */
export async function leerCartelAccion(urlImagen: string): Promise<ResultadoCartel> {
  const { supabase } = await sesionOEntrar("/eventos/nuevo");
  const { supabaseUrl } = configPublica();
  if (!supabaseUrl || !urlImagen.startsWith(`${supabaseUrl}/storage/v1/object/public/fotos/`)) return { ok: false, mensaje: "La imagen no es de aquí." };
  const lectura = await leerCartel(urlImagen);
  if (!lectura) return { ok: false, mensaje: "No pude leer el cartel. Llena los datos a mano." };
  const valores = cartelAFormulario(lectura);
  let lugarId: string | null = null;
  if (valores.lugar) {
    const { data } = await supabase.rpc("lugares_con_nombre", { p_nombre: valores.lugar });
    const lugares = (data ?? []) as LugarResumen[];
    if (lugares.length === 1) lugarId = lugares[0].id;
  }
  return { ok: true, valores, lugarId };
}
