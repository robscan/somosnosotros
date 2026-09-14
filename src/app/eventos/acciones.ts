"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { avisarNuevoEvento } from "@/lib/avisos";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
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

function filaEvento(datos: DatosEvento, ciudad: string) {
  const { privado: _p, ...fila } = datos;
  void _p;
  return { ...fila, descripcion: fila.descripcion || null, ciudad };
}

/** La ciudad del evento: la de su lugar, o la inicial si es otro sitio. */
async function ciudadDe(supabase: NonNullable<Awaited<ReturnType<typeof clienteServidor>>>, lugarId: string | null): Promise<string> {
  if (!lugarId) return CIUDAD_INICIAL.nombre;
  const { data } = await supabase.from("lugares").select("ciudad").eq("id", lugarId).maybeSingle();
  return data?.ciudad ?? CIUDAD_INICIAL.nombre;
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
    .insert({ ...filaEvento(datos, await ciudadDe(supabase, datos.lugar_id)), creado_por: user.id })
    .select("id")
    .single();
  if (error || !data) return { ok: false, errores: {}, general: "No se pudo publicar el evento. Intenta de nuevo." };
  if (!(await guardarPrivado(supabase, data.id, datos))) {
    await supabase.from("eventos").delete().eq("id", data.id);
    return { ok: false, errores: {}, general: "No se pudo guardar la dirección reservada. Intenta de nuevo." };
  }
  revalidar(data.id, datos.lugar_id);
  // Avisar a quienes siguen el lugar, después de responder (no retrasa la publicación).
  after(() => avisarNuevoEvento(data.id, user.id));
  redirect(`/eventos/${data.id}?nuevo=1`);
}

export async function actualizarEvento(id: string, _previo: ResultadoEvento | null, formData: FormData): Promise<ResultadoEvento> {
  const { supabase } = await sesionOEntrar(`/eventos/${id}/editar`);
  const { datos, errores } = validarEvento(leer(formData));
  if (Object.keys(errores).length) return { ok: false, errores };
  const { data, error } = await supabase.from("eventos").update(filaEvento(datos, await ciudadDe(supabase, datos.lugar_id))).eq("id", id).select("id").maybeSingle();
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

export type EstadoAsistencia = "voy" | "me_interesa" | null;

/** "Voy" / "Me interesa" / quitar. Un toque; la política de la base cuida que cada quien mueva solo lo suyo. */
export async function cambiarAsistencia(eventoId: string, estado: EstadoAsistencia) {
  const { supabase, user } = await sesionOEntrar(`/eventos/${eventoId}?accion=${estado ?? ""}`);
  if (estado) await supabase.from("asistencias").upsert({ usuario_id: user.id, evento_id: eventoId, estado });
  else await supabase.from("asistencias").delete().eq("usuario_id", user.id).eq("evento_id", eventoId);
  revalidatePath(`/eventos/${eventoId}`);
  revalidatePath("/perfil");
  revalidatePath(`/personas/${user.id}`);
}

/** Borrar un evento: su autor o el admin (la política de la base lo exige). Se van también los "Voy". */
export async function borrarEvento(id: string, lugarId: string | null) {
  const { supabase } = await sesionOEntrar(`/eventos/${id}`);
  const { data } = await supabase.from("eventos").delete().eq("id", id).select("id").maybeSingle();
  if (!data) redirect(`/eventos/${id}?error=borrar`);
  revalidatePath("/");
  if (lugarId) revalidatePath(`/lugares/${lugarId}`);
  redirect(lugarId ? `/lugares/${lugarId}?borrado=evento` : "/?borrado=evento");
}
