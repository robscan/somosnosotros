import "server-only";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
import { lunesDeLaSemana } from "@/lib/instagram/semana";
import { pendienteInstagram, type PendienteInstagram, type UltimoTrabajo } from "@/lib/portadaAdmin";
import type { ClienteServidor } from "@/lib/supabase/servidor";
import { zonaDeCiudad } from "./instagram/semana";

type Trabajo = UltimoTrabajo & { evento_id: string | null; artista_id: string | null; lugar_id: string | null };

/**
 * Lo que la portada de Administración (OL-494) lee de Instagram, partido por bloque (OL-498): cada bloque llega cuando están sus lecturas y
 * ninguno espera a otro.
 *
 * El pendiente «Instagram dejó de publicar» (bloque Pendiente): si el último trabajo de la cola falló (`redes_trabajos`, OL-465) frente a la
 * última conexión. `leido` en falso si el último trabajo no se pudo leer: entonces Pendiente no puede decir «Nada pendiente».
 */
export async function cargarInstagramPendiente(supabase: ClienteServidor, ahora = new Date()): Promise<{ pendiente: PendienteInstagram | null; leido: boolean }> {
  const [ultimo, conexion] = await Promise.all([
    supabase.from("redes_trabajos").select("estado, error, terminado_en, evento_id, artista_id, lugar_id").eq("red", "instagram").in("estado", ["publicado", "fallido"]).order("terminado_en", { ascending: false }).limit(1),
    supabase.from("instagram_conexion").select("conectado_en").limit(1),
  ]);
  const t = ultimo.error ? null : (((ultimo.data ?? [])[0] as Trabajo | undefined) ?? null);
  const conectadoEn = conexion.error ? null : (((conexion.data ?? [])[0] as { conectado_en: string } | undefined)?.conectado_en ?? null);
  let titulo: string | null = null;
  if (t?.estado === "fallido" && t.error !== "permiso") {
    const de = t.evento_id ? { tabla: "eventos", columna: "titulo", id: t.evento_id } : t.artista_id ? { tabla: "artistas", columna: "nombre", id: t.artista_id } : t.lugar_id ? { tabla: "lugares", columna: "nombre", id: t.lugar_id } : null;
    if (de) {
      const { data } = await supabase.from(de.tabla).select(de.columna).eq("id", de.id).maybeSingle();
      titulo = ((data as Record<string, string> | null)?.[de.columna] as string | undefined) ?? null;
    }
  }
  return { pendiente: pendienteInstagram(t, conectadoEn, titulo, ahora), leido: !ultimo.error };
}

/**
 * La línea del renglón «Instagram» (grupo Difusión): cuántas salieron en 7 días y cuántas fichas con fecha se quedan fuera de la semana por falta
 * de material (`instagram_falta_material`, OL-488, en la ciudad de la sesión). Llega sola, en su propio `Suspense`: nada de la portada la espera.
 * Cada lectura que falla solo deja de decir lo suyo (null), nunca un cero inventado.
 */
export async function cargarInstagramLinea(supabase: ClienteServidor, ciudad: string | null, ahora = new Date()): Promise<{ publicadas: number | null; sinMaterial: number | null }> {
  const slug = ciudad ?? CIUDAD_INICIAL.slug;
  const [publicadas, sinMaterial] = await Promise.all([
    supabase.from("instagram_publicaciones").select("id", { count: "exact", head: true }).eq("estado", "publicada").gte("creado_en", new Date(ahora.getTime() - 7 * 86_400_000).toISOString()),
    zonaDeCiudad(supabase, slug)
      .then((zona) => supabase.rpc("instagram_falta_material", { p_ciudad: slug, p_desde: lunesDeLaSemana("esta", ahora, zona) }))
      .catch(() => null),
  ]);
  return {
    publicadas: publicadas.error ? null : (publicadas.count ?? 0),
    sinMaterial: sinMaterial && !sinMaterial.error && Array.isArray(sinMaterial.data) ? sinMaterial.data.length : null,
  };
}
