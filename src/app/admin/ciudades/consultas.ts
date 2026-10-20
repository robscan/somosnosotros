import "server-only";
import { leerPanelCiudades, type CiudadPanel, type PanelCiudades } from "@/lib/ciudadesAdmin";
import { cargarCiudades, cargarCiudadesDeArtistas } from "@/lib/ciudades";
import { esUuid } from "@/lib/formulario";
import { leerBandeja, type Bandeja } from "@/lib/propuestas";
import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Lo que leen Ciudades, Corridas, la bandeja y el grupo de la portada (OL-427): `panel_ciudades()` y `panel_propuestas()` comprueban el rol
 * por dentro (migración 20261020140000_ciudades.sql). Cada carga dice si falló, para que la pantalla lo diga en su sitio y no enseñe ceros.
 */
export async function cargarPanelCiudades(): Promise<PanelCiudades | null> {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("panel_ciudades");
  return error ? null : leerPanelCiudades(data);
}

export type CiudadConCifras = CiudadPanel & { lugares: number; eventos: number; artistas: number };

/**
 * Lugares, eventos próximos y artistas de cada ciudad, contados como los cuenta la app (`cargarCiudades`: los mismos agregados y la misma
 * ciudad canónica que la hoja de ciudades), así el panel dice lo mismo que ve la gente.
 */
export async function conCifras(ciudades: readonly CiudadPanel[]): Promise<CiudadConCifras[]> {
  const [oferta, artistas] = await Promise.all([cargarCiudades(true), cargarCiudadesDeArtistas(true)]);
  const deOferta = new Map(oferta.map((c) => [c.slug, c]));
  const deArtistas = new Map(artistas.map((c) => [c.slug, c.artistas]));
  return ciudades.map((c) => ({ ...c, lugares: deOferta.get(c.slug)?.lugares ?? 0, eventos: deOferta.get(c.slug)?.eventos ?? 0, artistas: deArtistas.get(c.slug) ?? 0 }));
}

/** La bandeja de una corrida. `bandeja: null` sin error es que esa corrida no existe. */
export async function cargarBandeja(corrida: string): Promise<{ bandeja: Bandeja | null; error: boolean }> {
  if (!esUuid(corrida)) return { bandeja: null, error: false };
  const supabase = await clienteServidor();
  if (!supabase) return { bandeja: null, error: true };
  const { data, error } = await supabase.rpc("panel_propuestas", { p_corrida: corrida });
  if (error) return { bandeja: null, error: true };
  if (data === null) return { bandeja: null, error: false };
  const bandeja = leerBandeja(data);
  return { bandeja, error: !bandeja };
}
