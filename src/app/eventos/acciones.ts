"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { avisarCambioEvento, avisarNuevoEvento } from "@/lib/avisos";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
import { leerCartel } from "@/lib/cartel";
import { configPublica } from "@/lib/config";
import { artistaIgual, deducirTipoArtista, quienDesdeJson, type ArtistaResumen, type QuienItem } from "@/lib/artistas";
import { cartelAFormulario, queCambio, validarEvento, type DatosEvento, type ErroresEvento } from "@/lib/eventos";
import { zonaSegura } from "@/lib/fechas";
import { esUuid } from "@/lib/formulario";
import type { LugarResumen } from "@/lib/lugares";
import { sesionOEntrar } from "@/lib/supabase/sesion";
import { clienteServidor } from "@/lib/supabase/servidor";
import { zonaDePunto } from "@/lib/zona";

export type ResultadoEvento = { ok: true; id: string } | { ok: false; errores: ErroresEvento; general?: string };


function leer(formData: FormData) {
  const claves = ["modo_sitio", "lugar_id", "sitio_texto", "sitio_lat", "sitio_lng", "direccion_privada", "privado_lat", "privado_lng", "indicaciones", "revelar_horas", "titulo", "inicio", "fin", "descripcion", "imagen", "gratis", "precio", "enlace", "ciudad"];
  return Object.fromEntries(claves.map((k) => [k, formData.get(k)]));
}

function filaEvento(datos: DatosEvento, ciudad: string) {
  const { privado: _p, ...fila } = datos;
  void _p;
  return { ...fila, descripcion: fila.descripcion || null, ciudad };
}

type Entrada = ReturnType<typeof leer>;
type LugarDelEvento = { ciudad: string; zona: string } | null;

/** El lugar registrado donde es el evento (su ciudad y su zona), o null si es en otro sitio. */
async function lugarDelEvento(supabase: Cliente, entrada: Entrada): Promise<LugarDelEvento> {
  const id = typeof entrada.lugar_id === "string" ? entrada.lugar_id.trim() : "";
  if ((entrada.modo_sitio || "lugar") !== "lugar" || !esUuid(id)) return null;
  const { data } = await supabase.from("lugares").select("ciudad, zona").eq("id", id).maybeSingle();
  return data;
}

/**
 * La zona horaria del evento, que decide cómo se leen sus horas: la de su lugar (la base la vuelve a poner desde el
 * lugar); en otro sitio, la del punto, el público o el reservado; sin punto, la de la inicial, como su ciudad.
 */
function zonaDelEvento(entrada: Entrada, lugar: LugarDelEvento): string {
  if (lugar) return zonaSegura(lugar.zona);
  const numero = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);
  const reservado = entrada.modo_sitio === "reservado";
  return zonaDePunto(numero(entrada[reservado ? "privado_lat" : "sitio_lat"]), numero(entrada[reservado ? "privado_lng" : "sitio_lng"]));
}

/** La ciudad del evento: la de su lugar; en otro sitio, la del pin (Mapbox); si no se supo, la inicial. */
function ciudadDe(datos: DatosEvento, lugar: LugarDelEvento): string {
  if (!datos.lugar_id) return datos.ciudad || CIUDAD_INICIAL.nombre;
  return lugar?.ciudad ?? CIUDAD_INICIAL.nombre;
}

function revalidar(id: string, lugarId: string | null, artistas: string[] = []) {
  revalidatePath("/");
  revalidatePath("/artistas");
  revalidatePath(`/eventos/${id}`);
  if (lugarId) revalidatePath(`/lugares/${lugarId}`);
  for (const a of artistas) revalidatePath(`/artistas/${a}`);
}

type Cliente = NonNullable<Awaited<ReturnType<typeof clienteServidor>>>;

type ConCiudad = ArtistaResumen & { ciudad: string };

/**
 * Un nombre escrito en Quién: el artista registrado que se llama igual, o uno nuevo con solo el nombre (decisión 12).
 * Con dos del mismo nombre, el de la ciudad del evento; el nuevo se registra en la ciudad del evento (antes caía
 * siempre en la inicial).
 */
async function resolverArtista(supabase: Cliente, usuarioId: string, item: QuienItem, ciudad: string): Promise<string | null> {
  if (item.id) return item.id;
  const { data } = await supabase.rpc("artistas_con_nombre", { p_nombre: item.nombre });
  const encontrados = (data ?? []) as ConCiudad[];
  const igual = artistaIgual(encontrados.filter((a) => a.ciudad === ciudad), item.nombre) ?? artistaIgual(encontrados, item.nombre);
  if (igual) return igual.id;
  const { data: nuevo, error } = await supabase
    .from("artistas")
    .insert({ nombre: item.nombre, disciplina: "por_completar", tipo: deducirTipoArtista(item.nombre) ?? "solista", ciudad, creado_por: usuarioId })
    .select("id")
    .single();
  if (error?.code === "23505") {
    // Alguien lo registró mientras tanto en esa ciudad: se liga al que ya está.
    const { data: otra } = await supabase.rpc("artistas_con_nombre", { p_nombre: item.nombre });
    return artistaIgual(((otra ?? []) as ConCiudad[]).filter((a) => a.ciudad === ciudad), item.nombre)?.id ?? null;
  }
  return nuevo?.id ?? null;
}

/** Guarda quién se presenta: crea los artistas que falten y reescribe la liga del evento. Devuelve los ids. */
async function guardarQuien(supabase: Cliente, usuarioId: string, eventoId: string, quien: QuienItem[], ciudad: string): Promise<string[]> {
  const ids: string[] = [];
  for (const item of quien) {
    const id = await resolverArtista(supabase, usuarioId, item, ciudad);
    if (id && !ids.includes(id)) ids.push(id);
  }
  await supabase.from("eventos_artistas").delete().eq("evento_id", eventoId);
  if (ids.length) await supabase.from("eventos_artistas").insert(ids.map((artista_id, orden) => ({ evento_id: eventoId, artista_id, orden })));
  return ids;
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
  const entrada = leer(formData);
  const lugar = await lugarDelEvento(supabase, entrada);
  const { datos, errores } = validarEvento(entrada, zonaDelEvento(entrada, lugar));
  if (Object.keys(errores).length) return { ok: false, errores };
  const ciudad = ciudadDe(datos, lugar);
  const { data, error } = await supabase
    .from("eventos")
    .insert({ ...filaEvento(datos, ciudad), creado_por: user.id })
    .select("id")
    .single();
  if (error || !data) return { ok: false, errores: {}, general: "No se pudo publicar el evento. Intenta de nuevo." };
  if (!(await guardarPrivado(supabase, data.id, datos))) {
    await supabase.from("eventos").delete().eq("id", data.id);
    return { ok: false, errores: {}, general: "No se pudo guardar la dirección reservada. Intenta de nuevo." };
  }
  const artistas = await guardarQuien(supabase, user.id, data.id, quienDesdeJson(formData.get("quien")), ciudad);
  revalidar(data.id, datos.lugar_id, artistas);
  // Avisar a quienes siguen el lugar, después de responder (no retrasa la publicación).
  after(() => avisarNuevoEvento(data.id, user.id));
  redirect(`/eventos/${data.id}?nuevo=1`);
}

export async function actualizarEvento(id: string, _previo: ResultadoEvento | null, formData: FormData): Promise<ResultadoEvento> {
  const { supabase, user } = await sesionOEntrar(`/eventos/${id}/editar`);
  const entrada = leer(formData);
  const lugar = await lugarDelEvento(supabase, entrada);
  const { datos, errores } = validarEvento(entrada, zonaDelEvento(entrada, lugar));
  if (Object.keys(errores).length) return { ok: false, errores };
  // Cómo estaba antes, para avisar a quienes van si cambia cuándo o dónde.
  const { data: antes } = await supabase.from("eventos").select("inicio, fin, lugar_id, sitio_texto").eq("id", id).maybeSingle();
  const ciudad = ciudadDe(datos, lugar);
  const { data, error } = await supabase.from("eventos").update(filaEvento(datos, ciudad)).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { ok: false, errores: {}, general: "No se pudo guardar. ¿Sigues con sesión y es tu evento?" };
  await guardarPrivado(supabase, id, datos);
  const artistas = await guardarQuien(supabase, user.id, id, quienDesdeJson(formData.get("quien")), ciudad);
  revalidar(id, datos.lugar_id, artistas);
  const cambio = antes ? queCambio(antes, datos) : null;
  if (cambio) after(() => avisarCambioEvento(id, user.id, cambio));
  redirect(`/eventos/${id}`);
}

export async function cambiarVisibleEvento(id: string, lugarId: string | null, visible: boolean) {
  const { supabase } = await sesionOEntrar(`/eventos/${id}`);
  await supabase.from("eventos").update({ visible }).eq("id", id);
  revalidar(id, lugarId);
  redirect(`/eventos/${id}`);
}

export type ResultadoCartel =
  | { ok: true; valores: ReturnType<typeof cartelAFormulario>; lugarId: string | null; quien: QuienItem[] }
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
  // Los nombres del cartel: registrados si se llaman igual; si no, por crear con solo el nombre.
  const quien: QuienItem[] = [];
  for (const nombre of valores.artistas) {
    const { data } = await supabase.rpc("artistas_con_nombre", { p_nombre: nombre });
    const igual = artistaIgual((data ?? []) as ArtistaResumen[], nombre);
    quien.push(igual ? { id: igual.id, nombre: igual.nombre } : { nombre });
  }
  return { ok: true, valores, lugarId, quien };
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
  redirect("/borrado?que=evento");
}
