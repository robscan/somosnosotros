"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fechasValidas, type EstadoDestacado } from "@/lib/destacados";
import { esUuid } from "@/lib/formulario";
import { textoCodigoRol, type Decision } from "@/lib/panel";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

/**
 * Acciones del panel (docs/rediseno/19, decisiones 2, 3, 9, 10 y 11). Cada una comprueba el rol aquí y la base lo
 * vuelve a exigir; ninguna falla en silencio: devuelve la causa en palabras para que la pantalla la diga en su sitio.
 */
export type Resultado = { ok: true } | { ok: false; error: string };

async function soloAdmin() {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/admin");
  if (actual.perfil.rol !== "admin") redirect("/");
  return (await clienteServidor())!;
}

const TABLA = { lugar: "lugares", evento: "eventos", artista: "artistas" } as const;
const RUTA = { lugar: "/lugares", evento: "/eventos", artista: "/artistas" } as const;
type TipoOcultable = keyof typeof TABLA;

/** Dónde se guarda cada liga de "quiero llevar yo la ficha" y con qué columna. */
const LIGA = {
  artista: { tabla: "artistas_cuentas", columna: "artista_id" },
  lugar: { tabla: "lugares_cuentas", columna: "lugar_id" },
} as const;

function esOcultable(tipo: string): tipo is TipoOcultable {
  return tipo in TABLA;
}

function revalidarFicha(tipo: TipoOcultable, id: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin${RUTA[tipo]}`);
  revalidatePath("/");
  revalidatePath(RUTA[tipo]);
  revalidatePath(`${RUTA[tipo]}/${id}`);
}

/**
 * Decidir un reclamo o reporte: dejarla como está, ocultar la ficha o pasársela a quien la pide. Las tres cierran el
 * pendiente (decisión 2). Pasar la ficha la liga a la cuenta y la hace su autora, como antes.
 */
export async function decidirPendiente(reporteId: string, decision: Decision): Promise<Resultado> {
  if (!esUuid(reporteId)) return { ok: false, error: "No encontramos ese pendiente. Recarga la página." };
  const supabase = await soloAdmin();
  const { data: r, error } = await supabase.from("reportes").select("id, tipo, objeto_id, motivo, creado_por").eq("id", reporteId).maybeSingle();
  if (error) return { ok: false, error: "Sin conexión con la base. Intenta de nuevo." };
  if (!r) return { ok: false, error: "No encontramos ese pendiente. Recarga la página." };

  if (decision === "ocultar") {
    if (!esOcultable(r.tipo)) return { ok: false, error: "Esta ficha no se oculta desde aquí." };
    const { error: e } = await supabase.from(TABLA[r.tipo]).update({ visible: false }).eq("id", r.objeto_id);
    if (e) return { ok: false, error: "No se pudo ocultar. Intenta de nuevo." };
  }
  if (decision === "dar_mas") {
    if (r.motivo !== "mas_lecturas") return { ok: false, error: "Esto no pide más lecturas." };
    if (!r.creado_por) return { ok: false, error: "La cuenta que las pidió ya no existe." };
    const { error: e } = await supabase.rpc("dar_mas_lecturas", { p_perfil: r.creado_por });
    if (e) return { ok: false, error: "No se pudo dar más. Intenta de nuevo." };
  }
  if (decision === "pasar") {
    if (r.tipo !== "artista" && r.tipo !== "lugar") return { ok: false, error: "Esta ficha no se pasa a otra cuenta." };
    if (r.motivo !== "es_mio") return { ok: false, error: "Solo se pasa la ficha a quien pidió llevarla." };
    if (!r.creado_por) return { ok: false, error: "La cuenta que la pidió ya no existe." };
    const tipo = r.tipo as keyof typeof LIGA;
    const { tabla, columna } = LIGA[tipo];
    const liga = await supabase.from(tabla).upsert({ [columna]: r.objeto_id, perfil_id: r.creado_por }, { onConflict: `${columna},perfil_id`, ignoreDuplicates: true });
    if (liga.error) return { ok: false, error: "No se pudo pasar la ficha. Intenta de nuevo." };
    const autor = await supabase.from(TABLA[tipo]).update({ creado_por: r.creado_por }).eq("id", r.objeto_id);
    if (autor.error) return { ok: false, error: "La ficha quedó ligada, pero no cambió de autor. Intenta de nuevo." };
  }

  const { error: cerrar } = await supabase.from("reportes").update({ atendido: true }).eq("id", reporteId);
  if (cerrar) return { ok: false, error: decision === "dejar" ? "No se pudo cerrar. Intenta de nuevo." : "Se hizo, pero el pendiente no se cerró. Intenta de nuevo." };
  if (esOcultable(r.tipo)) revalidarFicha(r.tipo, r.objeto_id);
  else revalidatePath("/admin");
  return { ok: true };
}

/** Ocultar o volver a mostrar una ficha: desde el menú de las listas y desde "Mostrar" tras ocultar un reporte. */
export async function cambiarVisibilidad(tipo: TipoOcultable, id: string, visible: boolean): Promise<Resultado> {
  if (!esOcultable(tipo) || !esUuid(id)) return { ok: false, error: "No encontramos esa ficha." };
  const supabase = await soloAdmin();
  const { error } = await supabase.from(TABLA[tipo]).update({ visible }).eq("id", id);
  if (error) return { ok: false, error: visible ? "No se pudo volver a mostrar. Intenta de nuevo." : "No se pudo ocultar. Intenta de nuevo." };
  revalidarFicha(tipo, id);
  return { ok: true };
}

/**
 * Destacar una ficha, quitarla de destacados (también si entró por asistentes) o dejarla como estaba al deshacer
 * (docs/rediseno/20, decisiones 6 a 8). La base vuelve a exigir la administración (cambiar_destacado).
 */
export async function cambiarDestacado(tipo: TipoOcultable, id: string, estado: EstadoDestacado, plazo: string | null = null, creado: string | null = null): Promise<Resultado> {
  if (!esOcultable(tipo) || !esUuid(id) || !["elegido", "quitado", "ninguno"].includes(estado)) return { ok: false, error: "No encontramos esa ficha." };
  const fallo = { ok: false, error: estado === "elegido" ? "No se pudo destacar. Intenta de nuevo." : "No se pudo cambiar. Intenta de nuevo." } as const;
  // Deshacer repone el plazo y cuándo se decidió, con los límites de la base; sin ellos, la base pone dos semanas desde ahora.
  if (!fechasValidas(plazo, creado)) return fallo;
  const supabase = await soloAdmin();
  const { error } = await supabase.rpc("cambiar_destacado", { p_tipo: TABLA[tipo], p_id: id, p_estado: estado, p_hasta: plazo, p_creado_en: creado });
  if (error) return fallo;
  revalidarFicha(tipo, id);
  return { ok: true };
}

/** Hacer o quitar administrador (decisión 9). Las guardas viven en la base (cambiar_rol); aquí se dicen en palabras. */
export async function cambiarRol(perfilId: string, rol: "admin" | "usuario"): Promise<Resultado> {
  if (!esUuid(perfilId)) return { ok: false, error: "Esta cuenta ya no existe." };
  const supabase = await soloAdmin();
  const { data, error } = await supabase.rpc("cambiar_rol", { p_perfil: perfilId, p_rol: rol });
  if (error) return { ok: false, error: "Sin conexión con la base. Intenta de nuevo." };
  const texto = textoCodigoRol(String(data));
  if (texto) return { ok: false, error: texto };
  revalidatePath("/admin");
  revalidatePath("/admin/personas");
  revalidatePath(`/admin/personas/${perfilId}`);
  return { ok: true };
}

/** El correo completo, al tocar "Ver" (D2). */
export async function verCorreo(perfilId: string): Promise<{ ok: true; correo: string } | { ok: false; error: string }> {
  if (!esUuid(perfilId)) return { ok: false, error: "Esta cuenta ya no existe." };
  const supabase = await soloAdmin();
  const { data, error } = await supabase.rpc("panel_correo", { p_perfil: perfilId });
  if (error) return { ok: false, error: "Sin conexión con la base. Intenta de nuevo." };
  if (!data) return { ok: false, error: "Esta cuenta no tiene correo." };
  return { ok: true, correo: String(data) };
}
