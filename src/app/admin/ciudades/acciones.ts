"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { hrefArtista, validarArtista } from "@/lib/artistas";
import { BOTONES, HOJAS, leerTope, type TipoBoton } from "@/lib/ciudadesAdmin";
import { esUuid } from "@/lib/formulario";
import { hrefLugar, validarLugar } from "@/lib/lugares";
import { entradaDeArtista, entradaDeLugar, esMotivo, nombreDe, TIPOS_PROPUESTA, type MotivoRechazo, type TipoPropuesta } from "@/lib/propuestas";
import { dispararPaso, origenPropio } from "@/lib/rutinas/disparar";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { zonaDePunto } from "@/lib/zona";

/**
 * Acciones de Administración › Ciudades (OL-427). Cada una comprueba el rol aquí y la base lo vuelve a exigir (reglas por fila y funciones
 * que miran el rol por dentro); ninguna falla en silencio: devuelve la causa en palabras para que la pantalla la diga en su sitio.
 * «Correr» deja la corrida pendiente con su tope y, después de responder, pide su primer paso al motor (OL-428), que la corre con la API.
 */
export type Resultado = { ok: true } | { ok: false; error: string };
export type ResultadoAceptar = { ok: true; href: string | null } | { ok: false; error: string };

async function soloAdmin() {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/admin/ciudades");
  if (actual.perfil.rol !== "admin") redirect("/");
  return { supabase: (await clienteServidor())!, yo: actual.perfil.id };
}

function revalidar(corrida?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/ciudades");
  revalidatePath("/admin/corridas");
  if (corrida) revalidatePath(`/admin/ciudades/propuestas/${corrida}`);
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const esBoton = (t: string): t is TipoBoton => BOTONES.some((b) => b.tipo === t);

/** «Correr»: deja una corrida pendiente de ese botón en esa ciudad, con su tope y las fuentes de la hoja. */
export async function crearCorrida(ciudad: string, tipo: string, tope: string): Promise<Resultado> {
  if (!SLUG.test(ciudad) || ciudad.length > 80 || !esBoton(tipo)) return { ok: false, error: "No encontramos esa ciudad. Recarga la página." };
  const usd = leerTope(tope);
  if (usd === null) return { ok: false, error: "Escribe un tope de más de 0 y hasta 50 USD." };
  const { supabase, yo } = await soloAdmin();
  const { error } = await supabase
    .from("rutinas_corridas")
    .insert({ tipo, ciudad, tope_usd: usd, creado_por: yo, parametros: { fuentes: HOJAS[tipo].fuentes.map((f) => f.clave) } })
    .select("id")
    .single();
  if (error?.code === "23505") return { ok: false, error: "Ya hay una búsqueda así en curso en esta ciudad." };
  if (error?.code === "23503") return { ok: false, error: "Esa ciudad ya no está. Recarga la página." };
  if (error) return { ok: false, error: "No se pudo dejar lista. Intenta de nuevo." };
  revalidar();
  await pedirPrimerPaso();
  return { ok: true };
}

/**
 * El primer paso sin esperar al cron (OL-428): después de responder, el servidor llama al motor con `CRON_SECRET` (nunca el navegador).
 * Sin secreto no dispara y lo dice en el registro; si algo falla aquí, la corrida queda pendiente y la toma el cron. Nunca tumba la acción.
 */
async function pedirPrimerPaso() {
  try {
    const h = await headers();
    const origen = origenPropio(h.get("x-forwarded-host") ?? h.get("host"), h.get("x-forwarded-proto"));
    after(() => dispararPaso(origen));
  } catch {
    console.warn("rutinas: no se pudo pedir el primer paso; la corrida espera al cron");
  }
}

/** Cancelar una corrida que todavía no empieza. Si una cancelación llega mientras corre, el motor no da otro paso y solo anota lo gastado. */
export async function cancelarCorrida(id: string): Promise<Resultado> {
  if (!esUuid(id)) return { ok: false, error: "No encontramos esa búsqueda. Recarga la página." };
  const { supabase } = await soloAdmin();
  const { data, error } = await supabase.from("rutinas_corridas").update({ estado: "cancelada", fin: new Date().toISOString() }).eq("id", id).eq("estado", "pendiente").select("id");
  if (error) return { ok: false, error: "No se pudo cancelar. Intenta de nuevo." };
  if (!data?.length) return { ok: false, error: "Ya empezó a correr: no se cancela desde aquí." };
  revalidar();
  return { ok: true };
}

type Leida = { id: string; tipo: TipoPropuesta; datos: Record<string, unknown>; estado: string; corrida_id: string };

/** La propuesta, con la ciudad de su corrida (la ficha nace en esa ciudad si la propuesta no dice otra). */
async function leerPropuesta(supabase: Awaited<ReturnType<typeof soloAdmin>>["supabase"], id: string): Promise<{ p: Leida; ciudad: string | null } | { error: string }> {
  const { data: p, error } = await supabase.from("propuestas").select("id, tipo, datos, estado, corrida_id").eq("id", id).maybeSingle();
  if (error) return { error: "Sin conexión con la base. Intenta de nuevo." };
  if (!p || !TIPOS_PROPUESTA.includes(p.tipo)) return { error: "No encontramos esa propuesta. Recarga la página." };
  const { data: corrida } = await supabase.from("rutinas_corridas").select("ciudad").eq("id", p.corrida_id).maybeSingle();
  const { data: ciudad } = corrida?.ciudad ? await supabase.from("ciudades").select("nombre").eq("slug", corrida.ciudad).maybeSingle() : { data: null };
  return { p: p as Leida, ciudad: (ciudad?.nombre as string | undefined) ?? null };
}

/**
 * Aceptar: un lugar pasa por la misma validación del alta de lugar y por «¿es este?» (150 m); un artista, por la del alta de artista. La
 * ficha y la marca de la propuesta se guardan juntas (`aceptar_propuesta`). Un evento queda aceptado: lo publica la rutina de agendas (OL-428).
 */
export async function aceptarPropuesta(id: string): Promise<ResultadoAceptar> {
  if (!esUuid(id)) return { ok: false, error: "No encontramos esa propuesta. Recarga la página." };
  const { supabase } = await soloAdmin();
  const leida = await leerPropuesta(supabase, id);
  if ("error" in leida) return { ok: false, error: leida.error };
  const { p, ciudad } = leida;
  if (p.estado !== "propuesta") return { ok: false, error: "Ya se decidió. Recarga la página." };

  let ficha: Record<string, unknown> = {};
  if (p.tipo === "lugar") {
    const { datos, errores } = validarLugar(entradaDeLugar(p, ciudad), { esAdmin: true });
    const primero = Object.values(errores)[0];
    if (primero) return { ok: false, error: primero };
    const { data: parecidos } = await supabase.rpc("lugares_parecidos", { p_nombre: datos.nombre, p_lat: datos.lat, p_lng: datos.lng });
    const parecido = Array.isArray(parecidos) ? (parecidos[0] as { nombre?: string } | undefined) : undefined;
    if (parecido) return { ok: false, error: `Ya está «${parecido.nombre ?? datos.nombre}» muy cerca: recházala como duplicado.` };
    ficha = { nombre: datos.nombre, tipo: datos.tipo, detalle: datos.detalle, direccion: datos.direccion, lat: datos.lat, lng: datos.lng, ciudad: datos.ciudad, zona: zonaDePunto(datos.lat, datos.lng), redes: datos.redes };
  } else if (p.tipo === "artista") {
    const { datos, errores } = validarArtista(entradaDeArtista(p, ciudad), { esAdmin: true });
    const primero = Object.values(errores)[0];
    if (primero) return { ok: false, error: primero };
    ficha = { nombre: datos.nombre, disciplina: datos.disciplina, detalle: datos.detalle, tipo: datos.tipo, ciudad: datos.ciudad, redes: datos.redes };
  }

  const { data, error } = await supabase.rpc("aceptar_propuesta", { p_propuesta: id, p_ficha: ficha });
  if (error?.code === "23505") return { ok: false, error: `Ya hay una ficha llamada «${nombreDe(p)}»: recházala como duplicado.` };
  if (error) return { ok: false, error: "No se pudo aceptar. Intenta de nuevo." };
  const r = (data ?? {}) as { ficha_id?: string | null; slug?: string | null };
  revalidar(p.corrida_id);
  if (p.tipo === "lugar") {
    revalidatePath("/");
    revalidatePath("/lugares");
  }
  if (p.tipo === "artista") revalidatePath("/artistas");
  if (!r.ficha_id) return { ok: true, href: null };
  return { ok: true, href: p.tipo === "lugar" ? hrefLugar({ id: r.ficha_id, slug: r.slug }) : hrefArtista({ id: r.ficha_id, slug: r.slug }) };
}

/** Rechazar con su motivo (duplicado, no cultural, fuera de la ciudad u otro): la rutina aprende a no proponerlo (OL-428). */
export async function rechazarPropuesta(id: string, motivo: MotivoRechazo): Promise<Resultado> {
  if (!esUuid(id)) return { ok: false, error: "No encontramos esa propuesta. Recarga la página." };
  if (!esMotivo(motivo)) return { ok: false, error: "Elige por qué la rechazas." };
  const { supabase, yo } = await soloAdmin();
  const { data, error } = await supabase
    .from("propuestas")
    .update({ estado: "rechazada", motivo_rechazo: motivo, resuelto_por: yo, resuelto_en: new Date().toISOString() })
    .eq("id", id)
    .eq("estado", "propuesta")
    .select("id, corrida_id");
  if (error) return { ok: false, error: "No se pudo rechazar. Intenta de nuevo." };
  if (!data?.length) return { ok: false, error: "Ya se decidió. Recarga la página." };
  revalidar(data[0].corrida_id as string);
  return { ok: true };
}

/** Deshacer un rechazo: la propuesta vuelve a la bandeja. Lo aceptado no se deshace aquí (la ficha ya existe: se oculta desde su menú). */
export async function deshacerRechazo(id: string): Promise<Resultado> {
  if (!esUuid(id)) return { ok: false, error: "No encontramos esa propuesta. Recarga la página." };
  const { supabase } = await soloAdmin();
  const { data, error } = await supabase
    .from("propuestas")
    .update({ estado: "propuesta", motivo_rechazo: null, resuelto_por: null, resuelto_en: null })
    .eq("id", id)
    .eq("estado", "rechazada")
    .select("id, corrida_id");
  if (error || !data?.length) return { ok: false, error: "No se pudo deshacer. Recarga la página." };
  revalidar(data[0].corrida_id as string);
  return { ok: true };
}
