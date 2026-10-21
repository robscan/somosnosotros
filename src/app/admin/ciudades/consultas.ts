import "server-only";
import { headers } from "next/headers";
import { after } from "next/server";
import { CIUDAD_INICIAL, ciudadCanonica, slugDeCiudad } from "@/lib/ciudad";
import { leerPanelCiudades, leerParametrosVista, slugsDe, type CiudadPanel, type CorridaPanel, type PanelCiudades, type ParametrosVista } from "@/lib/ciudadesAdmin";
import { cargarCiudades, cargarCiudadesDeArtistas } from "@/lib/ciudades";
import { diaLocal, localAIso } from "@/lib/fechas";
import { esUuid } from "@/lib/formulario";
import { leerBandeja, type Bandeja } from "@/lib/propuestas";
import { dispararPaso, origenPropio } from "@/lib/rutinas/disparar";
import { corridasVaradas, rescatarVaradas, type CorridaVista } from "@/lib/rutinas/rescate";
import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Lo que leen Ciudades, el panel de cada ciudad, Corridas, la bandeja y el grupo de la portada (OL-427, OL-432): `panel_ciudades()` y
 * `panel_propuestas()` comprueban el rol por dentro (migración 20261020140000_ciudades.sql); la tabla `ciudades` la lee cualquiera (alias y
 * parámetros) y `ciudades_vistas` solo la administración. Cada carga dice si falló, para que la pantalla lo diga en su sitio y no enseñe ceros.
 */
export async function cargarPanelCiudades(): Promise<PanelCiudades | null> {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("panel_ciudades");
  return error ? null : leerPanelCiudades(data);
}

/** Lo que `panel_ciudades` no trae de cada ciudad: sus alias y sus parámetros (OL-429), por slug. */
export type ExtraCiudad = { alias: string[]; parametros: ParametrosVista };
export async function cargarExtras(): Promise<Map<string, ExtraCiudad> | null> {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const { data, error } = await supabase.from("ciudades").select("slug, alias, parametros");
  if (error || !Array.isArray(data)) return null;
  return new Map(
    data.map((f: { slug: string; alias?: unknown; parametros?: unknown }) => [
      f.slug,
      { alias: Array.isArray(f.alias) ? f.alias.filter((a): a is string => typeof a === "string") : [], parametros: leerParametrosVista(f.parametros) },
    ]),
  );
}

export type CiudadConCifras = CiudadPanel & { lugares: number; eventos: number; artistas: number };

/**
 * Lugares, eventos próximos y artistas de cada ciudad, contados como los cuenta la app (`cargarCiudades`: los mismos agregados y la misma
 * ciudad canónica que la hoja de ciudades), así el panel dice lo mismo que ve la gente. Una ciudad suma lo de sus alias (respuesta 1: «Oaxaca de
 * Juárez» cuenta igual que «Oaxaca»).
 */
export async function conCifras(ciudades: readonly CiudadPanel[], extras: ReadonlyMap<string, ExtraCiudad> = new Map()): Promise<CiudadConCifras[]> {
  const [oferta, artistas] = await Promise.all([cargarCiudades(true), cargarCiudadesDeArtistas(true)]);
  const deOferta = new Map(oferta.map((c) => [c.slug, c]));
  const deArtistas = new Map(artistas.map((c) => [c.slug, c.artistas]));
  return ciudades.map((c) => {
    const slugs = slugsDe({ slug: c.slug, nombre: c.nombre, alias: extras.get(c.slug)?.alias ?? [] });
    const suma = (f: (s: string) => number) => slugs.reduce((t, s) => t + f(s), 0);
    return { ...c, lugares: suma((s) => deOferta.get(s)?.lugares ?? 0), eventos: suma((s) => deOferta.get(s)?.eventos ?? 0), artistas: suma((s) => deArtistas.get(s) ?? 0) };
  });
}

const sumarDias = (dia: string, n: number) => new Date(Date.parse(`${dia}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

/** Lo que dicen las tarjetas del panel bajo cada número. Cada parte es null si no se pudo leer (la tarjeta enseña el número sin su detalle). */
export type DatosCiudad = {
  nuevos: number | null;
  eventosPorOrigen: { origen: string | null; n: number }[] | null;
  capo: number | null;
  vistas: { dia: string; consultas: number }[] | null;
};

/**
 * Lo propio del panel de una ciudad (OL-432): lugares nuevos este mes, eventos próximos por procedencia (`eventos.origen`, OL-424), artistas del
 * Catálogo CAPO y las consultas de las últimas seis semanas (para la tendencia). Se cuenta sobre los nombres con los que la app guarda la ciudad
 * (los de los agregados cuya ciudad canónica es ella o uno de sus alias); las consultas, de su slug y de las filas que junta (`juntadas`).
 */
export async function cargarDatosCiudad(c: { slug: string; nombre: string; alias: readonly string[]; zona: string }, juntadas: readonly string[], ahora: Date = new Date()): Promise<DatosCiudad> {
  const nada: DatosCiudad = { nuevos: null, eventosPorOrigen: null, capo: null, vistas: null };
  const supabase = await clienteServidor();
  if (!supabase) return nada;
  const slugs = new Set(slugsDe(c));
  const [ag, agArt] = await Promise.all([supabase.rpc("ciudades_agregadas"), supabase.rpc("ciudades_artistas_agregadas")]);
  const filas = [...(Array.isArray(ag.data) ? ag.data : []), ...(Array.isArray(agArt.data) ? agArt.data : [])] as { ciudad?: unknown }[];
  const crudos = [...new Set(filas.map((f) => (typeof f.ciudad === "string" ? f.ciudad : "")).filter((n) => slugs.has(slugDeCiudad(ciudadCanonica(n) || CIUDAD_INICIAL.nombre))))];
  const hoy = diaLocal(ahora, c.zona);
  const inicioMes = localAIso(`${hoy.slice(0, 7)}-01T00:00`, c.zona) ?? `${hoy.slice(0, 7)}-01T06:00:00Z`;
  const ya = ahora.toISOString();
  const sinCiudad = Promise.resolve({ count: 0, data: [] as { origen: string | null }[], error: null });
  const [nuevos, deSuGente, conOrigen, capo, vistas] = await Promise.all([
    crudos.length ? supabase.from("lugares").select("id", { count: "exact", head: true }).in("ciudad", crudos).eq("visible", true).eq("privado", false).gte("creado_en", inicioMes) : sinCiudad,
    crudos.length ? supabase.from("eventos").select("id", { count: "exact", head: true }).in("ciudad", crudos).eq("visible", true).gte("termina", ya).is("origen", null) : sinCiudad,
    crudos.length ? supabase.from("eventos").select("origen").in("ciudad", crudos).eq("visible", true).gte("termina", ya).not("origen", "is", null).limit(1000) : sinCiudad,
    crudos.length ? supabase.from("artistas").select("id", { count: "exact", head: true }).in("ciudad", crudos).eq("visible", true).eq("origen", "capo") : sinCiudad,
    supabase.from("ciudades_vistas").select("dia, consultas").in("ciudad", [c.slug, ...juntadas]).gte("dia", sumarDias(hoy, -41)),
  ]);
  const porOrigen = new Map<string, number>();
  for (const f of (conOrigen.data ?? []) as { origen: string | null }[]) if (f.origen) porOrigen.set(f.origen, (porOrigen.get(f.origen) ?? 0) + 1);
  return {
    nuevos: nuevos.error ? null : (nuevos.count ?? 0),
    eventosPorOrigen: deSuGente.error || conOrigen.error ? null : [{ origen: null, n: deSuGente.count ?? 0 }, ...[...porOrigen].map(([origen, n]) => ({ origen, n }))],
    capo: capo.error ? null : (capo.count ?? 0),
    vistas: vistas.error || !Array.isArray(vistas.data) ? null : (vistas.data as { dia: string; consultas: number }[]).map((v) => ({ dia: String(v.dia).slice(0, 10), consultas: Number(v.consultas) || 0 })),
  };
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

/**
 * La bandeja de una ciudad (respuesta 7): la de cada búsqueda suya con algo por revisar, de la más vieja a la más nueva. `error`: alguna no se
 * pudo leer (las que sí, se enseñan).
 */
export async function cargarBandejasDeCiudad(corridas: readonly CorridaPanel[], ciudad: string): Promise<{ bandejas: Bandeja[]; error: boolean }> {
  const con = corridas.filter((c) => c.ciudad === ciudad && c.por_revisar > 0).sort((a, b) => Date.parse(a.creado_en) - Date.parse(b.creado_en));
  const leidas = await Promise.all(con.map((c) => cargarBandeja(c.id)));
  return { bandejas: leidas.map((l) => l.bandeja).filter((b): b is Bandeja => !!b && b.propuestas.length > 0), error: leidas.some((l) => l.error) };
}

/**
 * La red de seguridad de la cadena de pasos (OL-429; `src/lib/rutinas/rescate.ts`): si al cargar Ciudades, el panel de una ciudad o Corridas
 * hay una corrida varada (pendiente o «corriendo» sin nadie que la trabaje y sin avanzar en más de 2 minutos), el servidor pide un paso después
 * de responder, con `CRON_SECRET`, como la hoja «Correr». La pantalla no cambia ni espera; si algo falla aquí, solo queda una línea en el registro.
 */
export async function pedirPasoSiHayVaradas(corridas: readonly CorridaVista[], ahora: Date = new Date()): Promise<void> {
  if (!corridasVaradas(corridas, ahora).length) return;
  try {
    const h = await headers();
    const origen = origenPropio(h.get("x-forwarded-host") ?? h.get("host"), h.get("x-forwarded-proto"));
    after(() => rescatarVaradas(corridas, ahora, () => dispararPaso(origen)));
  } catch {
    console.warn("rutinas: no se pudo pedir el paso de una corrida varada; la retoma el cron");
  }
}
