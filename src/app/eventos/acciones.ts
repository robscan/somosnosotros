"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { after } from "next/server";
import { avisarCambioEvento, avisarNuevoEvento } from "@/lib/avisos";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
import { leerCartel } from "@/lib/cartel";
import { configPublica } from "@/lib/config";
import { artistaIgual, deducirTipoArtista, quienDesdeJson, type ArtistaResumen, type QuienItem } from "@/lib/artistas";
import { cartelAFormulario, validarEvento, type CambioEvento, type DatosEvento, type ErroresEvento } from "@/lib/eventos";
import { zonaSegura } from "@/lib/fechas";
import { esUuid } from "@/lib/formulario";
import type { LugarResumen } from "@/lib/lugares";
import { sesionOEntrar } from "@/lib/supabase/sesion";
import { clienteServidor } from "@/lib/supabase/servidor";
import { zonaDePunto } from "@/lib/zona";

/** Publicar lleva a la ficha nueva reemplazando el alta; guardar devuelve a dónde volver (el formulario termina la tarea). */
export type ResultadoEvento = { ok: true; id: string; volver: string } | { ok: false; errores: ErroresEvento; general?: string; conflicto?: boolean };


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

/** La zona de un punto, para que el formulario lea las horas en la misma zona en la que las leerá el servidor al guardar. */
export async function zonaDelPunto(lat: number, lng: number): Promise<string> {
  return zonaDePunto(lat, lng);
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

type GuardadoCompleto = { id: string; artistas: string[]; artistas_anteriores: string[]; lugar_anterior: string | null; cambio: CambioEvento; repetido?: boolean };

async function guardarCompleto(supabase: Cliente, id: string | null, datos: DatosEvento, ciudad: string, quien: QuienItem[], operacion: FormDataEntryValue | null, revision: string | null = null): Promise<{ data: GuardadoCompleto | null; conflicto: boolean }> {
  if (typeof operacion !== "string" || !esUuid(operacion)) return { data: null, conflicto: false };
  const { data, error } = await supabase.rpc("guardar_evento_completo", {
    p_evento: id,
    p_datos: filaEvento(datos, ciudad),
    p_privado: datos.privado,
    p_quien: quien.map((item) => ({ ...item, tipo: deducirTipoArtista(item.nombre) ?? "solista" })),
    p_revision: revision,
    p_operacion: operacion,
  });
  return { data: error || !data ? null : data as GuardadoCompleto, conflicto: error?.code === "40001" };
}


export async function crearEvento(_previo: ResultadoEvento | null, formData: FormData): Promise<ResultadoEvento> {
  const { supabase, user } = await sesionOEntrar("/eventos/nuevo");
  const entrada = leer(formData);
  const lugar = await lugarDelEvento(supabase, entrada);
  const { datos, errores } = validarEvento(entrada, zonaDelEvento(entrada, lugar));
  if (Object.keys(errores).length) return { ok: false, errores };
  const ciudad = ciudadDe(datos, lugar);
  const { data } = await guardarCompleto(supabase, null, datos, ciudad, quienDesdeJson(formData.get("quien")), formData.get("operacion"));
  if (!data) return { ok: false, errores: {}, general: "No se pudo publicar el evento completo. Intenta de nuevo." };
  revalidar(data.id, datos.lugar_id, data.artistas);
  // Avisar a quienes siguen el lugar, después de responder (no retrasa la publicación).
  if (!data.repetido) after(() => avisarNuevoEvento(data.id, user.id));
  redirect(`/eventos/${data.id}?nuevo=1`, RedirectType.replace);
}

export async function actualizarEvento(id: string, _previo: ResultadoEvento | null, formData: FormData): Promise<ResultadoEvento> {
  const { supabase, user } = await sesionOEntrar(`/eventos/${id}/editar`);
  const entrada = leer(formData);
  const lugar = await lugarDelEvento(supabase, entrada);
  const { datos, errores } = validarEvento(entrada, zonaDelEvento(entrada, lugar));
  if (Object.keys(errores).length) return { ok: false, errores };
  const ciudad = ciudadDe(datos, lugar);
  const revision = formData.get("revision");
  if (typeof revision !== "string" || !revision.trim() || !Number.isFinite(Date.parse(revision))) {
    return { ok: false, errores: {}, general: "Vuelve a abrir el evento para cargar su versión actual. Tus cambios no se guardaron." };
  }
  const { data, conflicto } = await guardarCompleto(supabase, id, datos, ciudad, quienDesdeJson(formData.get("quien")), formData.get("operacion"), revision);
  if (conflicto) return { ok: false, errores: {}, conflicto: true, general: "El evento cambió mientras lo editabas. Tus cambios siguen aquí, pero no se guardaron. Revisa la versión actual antes de volver a editar." };
  if (!data) return { ok: false, errores: {}, general: "No se pudo guardar el evento completo. ¿Sigues con sesión y es tu evento?" };
  revalidar(id, datos.lugar_id, [...data.artistas, ...data.artistas_anteriores]);
  if (data.lugar_anterior && data.lugar_anterior !== datos.lugar_id) revalidatePath(`/lugares/${data.lugar_anterior}`);
  const cambio = data.cambio;
  if (cambio) after(() => avisarCambioEvento(id, user.id, cambio));
  return { ok: true, id, volver: `/eventos/${id}` };
}

export async function cambiarVisibleEvento(id: string, lugarId: string | null, visible: boolean) {
  const { supabase } = await sesionOEntrar(`/eventos/${id}`);
  await supabase.from("eventos").update({ visible }).eq("id", id);
  revalidar(id, lugarId);
  redirect(`/eventos/${id}`);
}

export type ResultadoCartel =
  | { ok: true; valores: ReturnType<typeof cartelAFormulario>; lugarId: string | null; quien: QuienItem[] }
  | { ok: false; mensaje: string }
  | { ok: false; sinCupo: true };

/** Lee el cartel ya subido a Storage y devuelve los valores para llenar el formulario. */
export async function leerCartelAccion(urlImagen: string): Promise<ResultadoCartel> {
  const { supabase } = await sesionOEntrar("/eventos/nuevo");
  const { supabaseUrl } = configPublica();
  if (!supabaseUrl || !urlImagen.startsWith(`${supabaseUrl}/storage/v1/object/public/fotos/`)) return { ok: false, mensaje: "La imagen no es de aquí." };
  // El cupo se aparta aquí, antes de llamar al modelo, y en un solo paso: en el cliente se saltaría en diez
  // segundos, y en dos pasos dos toques seguidos pasarían los dos (docs/rediseno/23).
  const { data: apartada, error: eCupo } = await supabase.rpc("apartar_lectura_de_cartel");
  if (eCupo) return { ok: false, mensaje: "No pude apartar la lectura. Intenta de nuevo." };
  if (!apartada) return { ok: false, sinCupo: true };
  const lectura = await leerCartel(urlImagen);
  // El titular ("No pude leer el cartel") lo pone la tarjeta; aquí solo va lo que toca hacer.
  if (!lectura) return { ok: false, mensaje: "Llena los datos a mano; la imagen se queda puesta." };
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

/**
 * "Voy" / "Me interesa" / quitar. Un toque; la política de la base cuida que cada quien mueva solo lo suyo. Devuelve si
 * se guardó: las listas deshacen lo que mostraron y ofrecen Reintentar (bitácora 085).
 */
export async function cambiarAsistencia(eventoId: string, estado: EstadoAsistencia): Promise<boolean> {
  const { supabase, user } = await sesionOEntrar(`/eventos/${eventoId}?accion=${estado ?? ""}`);
  const { error } = estado
    ? await supabase.from("asistencias").upsert({ usuario_id: user.id, evento_id: eventoId, estado })
    : await supabase.from("asistencias").delete().eq("usuario_id", user.id).eq("evento_id", eventoId);
  if (error) return false;
  revalidatePath(`/eventos/${eventoId}`);
  // La agenda muestra lo decidido en cada renglón (y se reutiliza hasta un minuto): al volver de la ficha, al día.
  revalidatePath("/");
  revalidatePath("/perfil");
  revalidatePath(`/personas/${user.id}`);
  return true;
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

export type Cupo = { usadas: number; tope: number; sinTope: boolean; pedida: boolean };

/** Lo que le queda a quien mira, para que la tarjeta avise antes de que se acabe (docs/rediseno/23). */
export async function cupoDeCartel(): Promise<Cupo | null> {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  // Todo sale de la misma función definer: nadie puede leer sus propias filas de `reportes`, y abrirlas sería peor.
  const { data, error } = await supabase.rpc("mi_cupo_de_cartel").maybeSingle();
  const d = data as { usadas: number; tope: number; sin_tope: boolean; pedida: boolean } | null;
  if (error || !d) return null;
  return { usadas: d.usadas, tope: d.tope, sinTope: d.sin_tope, pedida: d.pedida };
}

/** "Pedir más": una petición sin atender por cuenta, que llega a lo pendiente del panel. Sin correos. */
export async function pedirMasLecturas(): Promise<{ ok: boolean }> {
  const { supabase, user } = await sesionOEntrar("/eventos/nuevo");
  const { error } = await supabase.from("reportes").insert({ tipo: "perfil", objeto_id: user.id, motivo: "mas_lecturas", creado_por: user.id });
  // Si ya había una sin atender, el índice único la rechaza: para quien pide, es lo mismo que si se hubiera mandado.
  if (error && error.code !== "23505") return { ok: false };
  return { ok: true };
}
