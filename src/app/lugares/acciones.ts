"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { deducirTipo } from "@/lib/buscarLugares";
import { esUuid } from "@/lib/formulario";
import { rutaSegura } from "@/lib/rutas";
import { hrefLugar, validarLugar, type ErroresLugar, type LugarResumen } from "@/lib/lugares";
import type { MotivoReclamo } from "@/lib/reportes";
import { sesionOEntrar } from "@/lib/supabase/sesion";
import { zonaDePunto } from "@/lib/zona";

/** Publicar lleva a la ficha nueva reemplazando el alta; guardar, o publicar desde el alta de evento, devuelve a dónde volver. */
export type ResultadoLugar =
  | { ok: true; id: string; volver: string }
  | { ok: false; errores: ErroresLugar; general?: string; parecidos?: LugarResumen[] };


function leer(formData: FormData) {
  const claves = ["nombre", "tipo", "direccion", "lat", "lng", "descripcion", "portada", "enlaces", "privado", "detalle", "ciudad"];
  return Object.fromEntries(claves.map((k) => [k, formData.get(k)]));
}

/** Se revalida por id (la dirección vieja, que sigue resolviendo) y por slug (la de hoy): las dos pueden estar cacheadas. */
function revalidar(id: string, slug?: string | null) {
  revalidatePath("/lugares");
  revalidatePath(`/lugares/${id}`);
  if (slug) revalidatePath(`/lugares/${slug}`);
}

type Cliente = Awaited<ReturnType<typeof sesionOEntrar>>["supabase"];

/** "Privado" solo lo puede marcar el administrador (la política de la base lo exige también). */
async function privadoPermitido(supabase: Cliente, usuarioId: string, pedido: boolean): Promise<boolean> {
  if (!pedido) return false;
  const { data } = await supabase.from("perfiles").select("rol").eq("id", usuarioId).maybeSingle();
  return data?.rol === "admin";
}

/** Alta de lugar. Si hay uno parecido a menos de 150 m y no se confirmó, devuelve los parecidos para preguntar "¿es este?". */
export async function crearLugar(_previo: ResultadoLugar | null, formData: FormData): Promise<ResultadoLugar> {
  const { supabase, user } = await sesionOEntrar("/lugares/nuevo");
  const { datos, errores } = validarLugar(leer(formData));
  if (Object.keys(errores).length) return { ok: false, errores };

  if (formData.get("confirmado") !== "1") {
    const { data: parecidos } = await supabase.rpc("lugares_parecidos", { p_nombre: datos.nombre, p_lat: datos.lat, p_lng: datos.lng });
    if (parecidos && parecidos.length > 0) return { ok: false, errores: {}, parecidos: parecidos as LugarResumen[] };
  }

  const { data, error } = await supabase
    .from("lugares")
    .insert({ ...datos, zona: zonaDePunto(datos.lat, datos.lng), privado: await privadoPermitido(supabase, user.id, datos.privado), descripcion: datos.descripcion || null, direccion: datos.direccion || null, creado_por: user.id })
    .select("id, slug")
    .single();
  if (error || !data) return { ok: false, errores: {}, general: "No se pudo guardar el lugar. Intenta de nuevo." };

  revalidatePath("/");
  // Si se vino del alta de evento, el formulario vuelve a ella con el lugar ya elegido; si no, a la ficha recién publicada.
  const siguiente = rutaSegura(formData.get("siguiente") as string | null, "");
  if (siguiente) return { ok: true, id: data.id, volver: siguiente };
  redirect(`${hrefLugar(data)}?nuevo=1`, RedirectType.replace);
}

export type ResultadoLugarDesdeEvento = { ok: true; id: string; reutilizado: boolean } | { ok: false; error: string };

/**
 * "Agregar lugar" desde la pantalla completa "¿Dónde es?" del alta de evento (OL-173, docs/rediseno/43, paso 6):
 * registro automático, salvo que la persona marque "Es un lugar privado, no registrarlo" (esa rama nunca llama
 * aquí; se queda en el propio evento, como hoy "Es en otro sitio"). Reutiliza `crearLugar` entero -misma
 * validación, mismos 150 m ("un lugar es un lugar", docs/DEFINICION.md)-, así que si ya hay un lugar parecido no
 * se duplica: se usa el que ya existe (`reutilizado: true`) en vez de fallar o preguntar de nuevo, porque la pantalla
 * de agregar no tiene espacio para el "¿es este?" completo de `/lugares/nuevo` (decisión de esta pieza, el doc 43
 * no lo cubre). El tipo no lo pide el panel corto (docs/rediseno/43: solo nombre, dirección y el interruptor): se
 * deduce del nombre, igual que hace `FormularioLugar` cuando nadie lo elige a mano; sin pista, "otro".
 * `siguiente` se manda solo para que `crearLugar` NO redirija (aquí se usa el resultado en línea, sin navegar).
 */
export async function crearLugarDesdeEvento(datos: { nombre: string; direccion: string; lat: number; lng: number; ciudad: string; volverA: string }): Promise<ResultadoLugarDesdeEvento> {
  const fd = new FormData();
  fd.set("nombre", datos.nombre);
  fd.set("tipo", deducirTipo(datos.nombre) ?? "otro");
  fd.set("direccion", datos.direccion);
  fd.set("lat", String(datos.lat));
  fd.set("lng", String(datos.lng));
  fd.set("ciudad", datos.ciudad);
  fd.set("siguiente", rutaSegura(datos.volverA, "/eventos/nuevo"));
  const r = await crearLugar(null, fd);
  if (r.ok) return { ok: true, id: r.id, reutilizado: false };
  if (r.parecidos && r.parecidos.length > 0) return { ok: true, id: r.parecidos[0].id, reutilizado: true };
  return { ok: false, error: r.general ?? Object.values(r.errores)[0] ?? "No se pudo guardar el lugar. Intenta de nuevo." };
}

export async function actualizarLugar(id: string, _previo: ResultadoLugar | null, formData: FormData): Promise<ResultadoLugar> {
  const { supabase, user } = await sesionOEntrar(`/lugares/${id}/editar`);
  const { datos, errores } = validarLugar(leer(formData));
  if (Object.keys(errores).length) return { ok: false, errores };

  const { data, error } = await supabase
    .from("lugares")
    .update({ ...datos, zona: zonaDePunto(datos.lat, datos.lng), privado: await privadoPermitido(supabase, user.id, datos.privado), descripcion: datos.descripcion || null, direccion: datos.direccion || null })
    .eq("id", id)
    .select("id, slug")
    .maybeSingle();
  if (error || !data) return { ok: false, errores: {}, general: "No se pudo guardar. ¿Sigues con sesión y es tu lugar?" };

  revalidar(id, data.slug);
  revalidatePath("/");
  return { ok: true, id, volver: hrefLugar(data) };
}

/** Ocultar o volver a mostrar: solo la administración (la base lo exige con el trigger proteger_autor_y_visible). */
export async function cambiarVisible(id: string, visible: boolean) {
  const { supabase } = await sesionOEntrar(`/lugares/${id}`);
  await supabase.from("lugares").update({ visible }).eq("id", id);
  revalidatePath("/");
  revalidatePath(`/lugares/${id}`);
  redirect(`/lugares/${id}`);
}

/** Seguir / dejar de seguir un lugar. Un toque. Devuelve si se guardó (la lista deshace y ofrece Reintentar si no). */
export async function cambiarSeguimiento(lugarId: string, seguir: boolean): Promise<boolean> {
  const { supabase, user } = await sesionOEntrar(`/lugares/${lugarId}?accion=${seguir ? "seguir" : ""}`);
  const { error } = seguir
    ? await supabase.from("seguimientos").upsert({ usuario_id: user.id, lugar_id: lugarId }, { onConflict: "usuario_id,lugar_id", ignoreDuplicates: true })
    : await supabase.from("seguimientos").delete().eq("usuario_id", user.id).eq("lugar_id", lugarId);
  if (error) return false;
  revalidatePath(`/lugares/${lugarId}`);
  revalidatePath("/perfil");
  revalidatePath(`/personas/${user.id}`);
  return true;
}

/**
 * Borrar un lugar: su autor si no tiene eventos de otras personas (si los tiene, que lo oculte);
 * el admin siempre. Los eventos del lugar se van con él (cascada en la base).
 */
export async function borrarLugar(id: string) {
  const { supabase, user } = await sesionOEntrar(`/lugares/${id}`);
  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).maybeSingle();
  if (perfil?.rol !== "admin") {
    const { count } = await supabase.from("eventos").select("*", { count: "exact", head: true }).eq("lugar_id", id).neq("creado_por", user.id);
    if ((count ?? 0) > 0) redirect(`/lugares/${id}?error=tiene-eventos`);
  }
  const { data } = await supabase.from("lugares").delete().eq("id", id).select("id").maybeSingle();
  if (!data) redirect(`/lugares/${id}?error=borrar`);
  revalidatePath("/");
  redirect("/borrado?que=lugar");
}

export type ResultadoReclamo = { ok: true } | { ok: false; error: string };

/**
 * "¿Es tu espacio?": quien lleva el lugar de verdad pide la ficha para editarla, o pide que se quite.
 * Lo mismo que "Soy yo / es mi grupo" en Artistas: queda como reporte con su cuenta y lo atiende el
 * administrador desde su panel (los lugares del catálogo y los institucionales no tienen dueño).
 */
export async function reclamarLugar(lugarId: string, motivo: MotivoReclamo): Promise<ResultadoReclamo> {
  const { supabase, user } = await sesionOEntrar(`/lugares/${lugarId}?accion=mio`);
  if (!esUuid(lugarId) || !["es_mio", "retirar"].includes(motivo)) return { ok: false, error: "No sé qué ficha es." };
  const { error } = await supabase.from("reportes").insert({ tipo: "lugar", objeto_id: lugarId, motivo, creado_por: user.id });
  if (error) return { ok: false, error: "No se pudo enviar. Intenta de nuevo." };
  return { ok: true };
}
