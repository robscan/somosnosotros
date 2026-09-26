"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { after } from "next/server";
import { artistaIgual, hrefArtista, validarArtista, type ArtistaResumen, type ErroresArtista } from "@/lib/artistas";
import { esUuid } from "@/lib/formulario";
import type { MotivoReclamo } from "@/lib/reportes";
import { sesionOEntrar } from "@/lib/supabase/sesion";
import { clienteServidor, esAdminDeSesion } from "@/lib/supabase/servidor";

/** Un artista cuyo correo capturado (CAPO) coincide con el de la cuenta, y que aún no reclama (OL-177, migración
 * 20260925110000_artistas_con_mi_correo). Lo mínimo para el letrero «Tu correo está enlazado a…»: el nombre para
 * el texto, el id para reclamar. */
export type ArtistaConMiCorreo = { id: string; nombre: string; slug: string };

/** Sin sesión, vacío: la función de la base también lo haría (lee auth.uid()), pero no vale la pena consultar. */
export async function artistasConMiCorreo(): Promise<ArtistaConMiCorreo[]> {
  const supabase = await clienteServidor();
  if (!supabase) return [];
  const { data } = await supabase.rpc("artistas_con_mi_correo");
  return (data ?? []) as ArtistaConMiCorreo[];
}

/** Publicar lleva a la ficha nueva reemplazando el alta; guardar devuelve a dónde volver (el formulario termina la tarea). */
export type ResultadoArtista =
  | { ok: true; id: string; volver: string }
  | { ok: false; errores: ErroresArtista; general?: string; existente?: ArtistaResumen };


function leer(formData: FormData) {
  const claves = ["nombre", "disciplina", "detalle", "tipo", "descripcion", "foto", "enlaces", "ciudad"];
  return Object.fromEntries(claves.map((k) => [k, formData.get(k)]));
}

/** Se revalida por id (la dirección vieja, que sigue resolviendo) y por slug (la de hoy): las dos pueden estar cacheadas. */
function revalidar(id: string, slug?: string | null) {
  revalidatePath("/artistas");
  revalidatePath(`/artistas/${id}`);
  if (slug) revalidatePath(`/artistas/${slug}`);
}

type Cliente = NonNullable<Awaited<ReturnType<typeof clienteServidor>>>;

/** El artista registrado que se llama igual en la misma ciudad, si lo hay (para "¿Es este?"). */
async function existenteIgual(supabase: Cliente, nombre: string, ciudad: string): Promise<ArtistaResumen | undefined> {
  const { data } = await supabase.rpc("artistas_con_nombre", { p_nombre: nombre });
  return artistaIgual(((data ?? []) as (ArtistaResumen & { ciudad: string })[]).filter((a) => a.ciudad === ciudad), nombre) ?? undefined;
}

/** Alta de artista. Si ya hay uno con el mismo nombre, devuelve el existente para preguntar "¿es este?" (decisión 5). */
export async function crearArtista(_previo: ResultadoArtista | null, formData: FormData): Promise<ResultadoArtista> {
  const { supabase, user } = await sesionOEntrar("/artistas/nuevo");
  const esAdmin = await esAdminDeSesion(supabase, user.id);
  const { datos, errores } = validarArtista(leer(formData), { esAdmin });
  if (Object.keys(errores).length) return { ok: false, errores };

  const { data, error } = await supabase
    .from("artistas")
    .insert({ ...datos, creado_por: user.id })
    .select("id, slug")
    .single();
  if (error?.code === "23505") return { ok: false, errores: {}, existente: await existenteIgual(supabase, datos.nombre, datos.ciudad), general: "Ya hay un artista con ese nombre." };
  if (error || !data) return { ok: false, errores: {}, general: "No se pudo guardar. Intenta de nuevo." };

  // "Soy yo / es mi grupo": la cuenta queda ligada; podrá editar y publicar sus fechas sin teclear el nombre.
  if (formData.get("soy") === "1") await supabase.from("artistas_cuentas").insert({ artista_id: data.id, perfil_id: user.id });

  revalidatePath("/artistas");
  redirect(`${hrefArtista(data)}?nuevo=1`, RedirectType.replace);
}

export async function actualizarArtista(id: string, _previo: ResultadoArtista | null, formData: FormData): Promise<ResultadoArtista> {
  const { supabase, user } = await sesionOEntrar(`/artistas/${id}/editar`);
  const [esAdmin, { data: existente }] = await Promise.all([esAdminDeSesion(supabase, user.id), supabase.from("artistas").select("foto").eq("id", id).maybeSingle()]);
  const { datos, errores } = validarArtista(leer(formData), { esAdmin, fotoActual: existente?.foto ?? null });
  if (Object.keys(errores).length) return { ok: false, errores };

  // La ciudad también se edita: es un renglón del formulario (pedido del founder, 2026-09-16, noche).
  const { nombre, disciplina, detalle, tipo, descripcion, foto, redes, ciudad } = datos;
  const cambios = { nombre, disciplina, detalle, tipo, descripcion, foto, redes, ciudad };
  const { data, error } = await supabase.from("artistas").update(cambios).eq("id", id).select("id, slug").maybeSingle();
  if (error?.code === "23505") return { ok: false, errores: { nombre: `Ya hay otro artista con ese nombre en ${ciudad}.` } };
  if (error || !data) return { ok: false, errores: {}, general: "No se pudo guardar. ¿Sigues con sesión y es tu ficha?" };

  revalidar(id, data.slug);
  revalidatePath("/");
  return { ok: true, id, volver: hrefArtista(data) };
}

/** Ocultar o volver a mostrar: solo la administración (la base lo exige con el trigger proteger_autor_y_visible). */
export async function cambiarVisibleArtista(id: string, visible: boolean) {
  const { supabase } = await sesionOEntrar(`/artistas/${id}`);
  await supabase.from("artistas").update({ visible }).eq("id", id);
  revalidar(id);
  redirect(`/artistas/${id}`);
}

/** Seguir / dejar de seguir a un artista. Un toque. Devuelve si se guardó (la lista deshace y ofrece Reintentar si no). */
/** `diferir`: mismo motivo y patrón que `cambiarSeguimiento` (lugares/acciones.ts), OL-212 tercera vuelta. */
export async function cambiarSeguimientoArtista(artistaId: string, seguir: boolean, diferir = false): Promise<boolean> {
  const { supabase, user } = await sesionOEntrar(`/artistas/${artistaId}?accion=${seguir ? "seguir" : ""}`);
  const { error } = seguir
    ? await supabase.from("seguimientos").upsert({ usuario_id: user.id, artista_id: artistaId }, { onConflict: "usuario_id,artista_id", ignoreDuplicates: true })
    : await supabase.from("seguimientos").delete().eq("usuario_id", user.id).eq("artista_id", artistaId);
  if (error) return false;
  const revalidar = () => {
    revalidatePath(`/artistas/${artistaId}`);
    revalidatePath("/perfil");
    revalidatePath(`/personas/${user.id}`);
  };
  if (diferir) after(revalidar);
  else revalidar();
  return true;
}

/** Borrar un artista: su autor o el admin. Sus ligas con eventos y sus seguidores se van con él (cascada). */
export async function borrarArtista(id: string) {
  const { supabase } = await sesionOEntrar(`/artistas/${id}`);
  const { data } = await supabase.from("artistas").delete().eq("id", id).select("id").maybeSingle();
  if (!data) redirect(`/artistas/${id}?error=borrar`);
  revalidatePath("/artistas");
  revalidatePath("/");
  redirect("/borrado?que=artista");
}

/** `aprobado`: se ligó la cuenta al instante (correo coincidente, L53); sin él, el administrador lo revisa. */
export type ResultadoReclamo = { ok: true; aprobado: boolean } | { ok: false; error: string };

/**
 * Gancho para OL-115 (avisos al administrador): hoy no manda nada. Se llama solo cuando el reclamo se aprobó
 * solo (sin pasar por el panel del administrador), que es el único caso en que hace falta avisarle algo nuevo.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- la firma es el contrato que OL-115 conecta; hoy no hace nada.
async function avisarAdminReclamoAutomatico(_artistaId: string, _perfilId: string): Promise<void> {}

/**
 * "Soy yo / es mi grupo" (decisión 11): la persona pide la ficha para llevarla ella o pide que se quite.
 * Si pide llevarla y el correo de su cuenta es uno que el CAPO capturó para esa ficha, se aprueba sola (L53):
 * la cuenta queda ligada al instante, sin reporte ni espera del administrador (al que solo se avisa). Si no
 * coincide, o pide que se quite, sigue el camino de hoy: un reporte que el administrador atiende.
 * Si ya hay un reclamo pendiente igual, devuelve el que existe sin duplicar.
 */
export async function reclamarArtista(artistaId: string, motivo: MotivoReclamo): Promise<ResultadoReclamo> {
  const { supabase, user } = await sesionOEntrar(`/artistas/${artistaId}?accion=mio`);
  if (!esUuid(artistaId) || !["es_mio", "retirar"].includes(motivo)) return { ok: false, error: "No sé qué ficha es." };

  if (motivo === "es_mio") {
    const { data: aprobado, error: errorRpc } = await supabase.rpc("reclamar_si_correo_coincide", { p_artista: artistaId });
    if (!errorRpc && aprobado) {
      await avisarAdminReclamoAutomatico(artistaId, user.id);
      revalidatePath(`/artistas/${artistaId}`);
      return { ok: true, aprobado: true };
    }
  }

  // Verificar si ya existe un reclamo pendiente igual (mismo usuario, artista y motivo).
  const { data: existente } = await supabase
    .from("reportes")
    .select("id")
    .eq("tipo", "artista")
    .eq("objeto_id", artistaId)
    .eq("creado_por", user.id)
    .eq("motivo", motivo)
    .eq("atendido", false)
    .limit(1)
    .maybeSingle();

  // Si ya existe un reclamo pendiente igual, devolver ok sin duplicar.
  if (existente) return { ok: true, aprobado: false };

  const { error } = await supabase.from("reportes").insert({ tipo: "artista", objeto_id: artistaId, motivo, creado_por: user.id });
  if (error) return { ok: false, error: "No se pudo enviar. Intenta de nuevo." };
  return { ok: true, aprobado: false };
}
