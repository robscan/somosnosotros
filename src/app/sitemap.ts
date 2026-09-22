import type { MetadataRoute } from "next";
import { artistasParaSitemap, eventosParaSitemap, lugaresParaSitemap, rutasEstaticas } from "@/lib/sitemap";
import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Lo que Google puede rastrear (OL-059, bitácora 088): las páginas fijas más cada ficha pública, con el cliente
 * público (RLS) — nunca la llave de servicio, así que trae exactamente lo que ve una persona sin cuenta. Las reglas
 * de qué ficha entra viven en `src/lib/sitemap.ts`, donde se prueban.
 *
 * Se renueva cada hora: sin esto, si `clienteServidor()` no llega a pedir las cookies (por ejemplo, en un build sin
 * variables de entorno), Next puede congelar este mapa como estático en el momento del build y no volver a tocarlo
 * hasta el próximo despliegue — una ficha ocultada después seguiría listada. Cada hora es de sobra para un rastreador.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await clienteServidor();
  if (!supabase) return rutasEstaticas();

  // Topes muy por encima de lo que hay hoy (unas decenas de lugares y eventos, ~520 artistas), para no depender
  // del corte silencioso de PostgREST en 1 000 filas si la ciudad crece (mismo tope que `cargarCiudades`).
  const [l, e, a, ac] = await Promise.all([
    supabase.from("lugares").select("id, slug, visible, privado, actualizado_en").eq("visible", true).limit(5000),
    supabase.from("eventos").select("id, slug, visible, termina, actualizado_en").eq("visible", true).limit(5000),
    supabase.from("artistas").select("id, slug, visible, origen, actualizado_en").eq("visible", true).limit(5000),
    supabase.from("artistas_cuentas").select("artista_id").limit(5000),
  ]);

  const reclamados = new Set((ac.data ?? []).map((f) => f.artista_id as string));
  const artistas = (a.data ?? []).map((f) => ({ ...(f as { id: string; slug: string; visible: boolean; origen: string | null; actualizado_en: string }), reclamado: reclamados.has(f.id as string) }));

  return [
    ...rutasEstaticas(),
    ...lugaresParaSitemap((l.data ?? []) as Parameters<typeof lugaresParaSitemap>[0]),
    ...eventosParaSitemap((e.data ?? []) as Parameters<typeof eventosParaSitemap>[0]),
    ...artistasParaSitemap(artistas),
  ];
}
