import type { Metadata } from "next";
import { CIUDAD_INICIAL, ciudadPorSlug, type Ciudad } from "@/lib/ciudad";
import { cargarCiudades } from "@/lib/ciudades";
import { enmascararCorreo } from "@/lib/comunidad";
import { leerTira } from "@/lib/destacados";
import { diaLocal, filtroSinPasar } from "@/lib/fechas";
import { conProximo, diasConEvento, TIPOS, type LugarLista, type LugarResumen, type ProximoEvento } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { abrirFichaEnHoja } from "./fichaEnHoja";
import VistaLugares, { type ExtrasLugares } from "./VistaLugares";

type SearchParams = { ciudad?: string; tipo?: string; q?: string };

/**
 * El canonical conserva la ciudad cuando no es la inicial ("el contexto ordena, no limita": OL-029) y descarta el
 * resto de filtros ("?tipo=museo" es la misma lista para Google, no una nueva). Sin esto, la lista de otra ciudad
 * se declaraba duplicada de la de San Luis Potosí y Google podía no ofrecerla nunca (OL-059). El título y la
 * descripción son propios, sin nombre de ciudad (no del layout raíz, que decía siempre San Luis Potosí) — por lo
 * mismo que el inicio (ver su comentario): esta página se reutiliza hasta 60 s al cambiar de ciudad sin recargar.
 * Repite openGraph y twitter (Next reemplaza el objeto entero, no lo combina con el del layout raíz): sin esto,
 * compartir `/lugares?ciudad=…` enseñaba el título y la descripción de San Luis Potosí del layout, con `og:url`
 * apuntando a la raíz en vez del canonical de esa ciudad (gestión de cambios, OL-059).
 */
export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const { ciudad: slug } = await searchParams;
  const ciudades = await cargarCiudades();
  const resuelta = ciudadPorSlug(slug, ciudades);
  const canonical = resuelta.slug === CIUDAD_INICIAL.slug ? "/lugares" : `/lugares?ciudad=${resuelta.slug}`;
  const titulo = "Lugares · Somos Nosotros";
  const descripcion = "Centros culturales cerca de ti: mapa y lista, con su próximo evento.";
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical },
    openGraph: { title: titulo, description: descripcion, url: canonical, type: "website", images: [{ url: "/portada.png", width: 1200, height: 630 }], locale: "es_MX", siteName: "Somos Nosotros" },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion, images: ["/portada.png"] },
  };
}

/**
 * Los lugares de la ciudad con su próximo evento y los días en que tienen eventos: el mapa primero y, sobre él, la hoja con la
 * lista. `diasEvento` (docs/rediseno/45, OL-174) sale de la misma consulta de eventos, sin otra: esa consulta ya trae todo lo que
 * no ha pasado, sin tope de días (solo de cuántos eventos trae, 500), y de ella salen el próximo evento de cada lugar y lo que
 * necesita «Con eventos» de Filtros (hoy, esta semana).
 */
async function cargar(ciudadNombre: string): Promise<LugarLista[]> {
  const supabase = await clienteServidor();
  if (!supabase) return [];
  const [l, e] = await Promise.all([
    // 1 000 lugares en una sola ciudad son muchos más de los que hay hoy (decenas); tope explícito para no
    // depender del corte silencioso de PostgREST si la ciudad crece (revisión 2026-09-14, A1).
    // `.eq("privado", false)` explícito (OL-179, founder 2026-09-24: "los lugares privados NUNCA aparecen en
    // listados públicos aunque la persona sea su autora"): sin él, la política de lectura dejaría pasar también
    // los privados de QUIEN MIRA (creado_por = auth.uid()) en este mapa y lista públicos -correcto en una ficha
    // propia, un error aquí. No depender de la RLS para esto (auditoría de la bitácora 214).
    supabase.from("lugares").select("id, slug, nombre, tipo, direccion, lat, lng, portada, privado").eq("visible", true).eq("privado", false).eq("ciudad", ciudadNombre).order("nombre").limit(1000),
    // `fin` (OL-218): un evento de varios días cuenta en cada día que ocupa, igual que la Agenda (`diasActivosCalendario`).
    supabase.from("eventos").select("id, inicio, fin, lugar_id, zona, titulo").eq("visible", true).not("lugar_id", "is", null).or(filtroSinPasar()).order("inicio").limit(500),
  ]);
  const eventos = (e.data ?? []) as (ProximoEvento & { fin: string | null; lugar_id: string | null })[];
  return diasConEvento(conProximo((l.data ?? []) as LugarResumen[], eventos), eventos);
}

/**
 * Lo que solo necesitan el mapa y la hoja (nunca la fila de contexto, que ya tiene `lugares`): quién sigue qué y la tira de
 * destacados. Sin `await` en `Lugares` (abajo): se pasa como promesa y se difiere en `<Suspense>` dentro de `VistaLugares`
 * (OL-161, bitácora 196) — igual que "su cabecera y su mapa seguían esperando la consulta entera" señalaba el canon de
 * `docs/PRINCIPIOS_UX.md` (OL-158).
 */
async function cargarExtras(ciudad: Ciudad): Promise<ExtrasLugares> {
  const [actual, destacados] = await Promise.all([usuarioActual(), clienteServidor().then((s) => leerTira(s, "lugares", ciudad.nombre))]);
  // Con sesión, los lugares que sigue: la lista los marca y el mapa los pinta en verde (bitácora 071).
  const supabase = actual ? await clienteServidor() : null;
  const s = supabase && actual ? await supabase.from("seguimientos").select("lugar_id").eq("usuario_id", actual.perfil.id).not("lugar_id", "is", null).limit(1000) : null;
  const seguidos = actual ? ((s?.data ?? []) as { lugar_id: string }[]).map((x) => x.lugar_id) : null;
  const avisos = actual ? { cuenta: actual.perfil.id, preguntado: actual.perfil.avisos_preguntado ?? true, correo: actual.correo ? enmascararCorreo(actual.correo) : "tu correo", llavePush: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "" } : null;
  return { conSesion: !!actual, seguidos, avisos, destacados };
}

export default async function Lugares({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { ciudad: slug, tipo, q } = await searchParams;
  const ciudades = await cargarCiudades();
  const ciudad = ciudadPorSlug(slug, ciudades);
  // `lugares` es lo único que pide la fila de contexto: se espera aquí, aparte de `extras` (destacados, seguidos, avisos), que solo
  // necesitan el mapa y la hoja y se difieren abajo.
  const lugares = await cargar(ciudad.nombre);
  const extras = cargarExtras(ciudad);
  // El tipo elegido vive en la URL (se comparte y sobrevive al volver atrás); solo vale si existe.
  const tipoElegido = tipo && TIPOS.some((t) => t.valor === tipo) ? tipo : null;
  return <VistaLugares lugares={lugares} ciudad={ciudad} ciudades={ciudades} tipo={tipoElegido} extras={extras} busquedaInicial={q} hoy={diaLocal(new Date(), ciudad.zona)} abrirFicha={abrirFichaEnHoja} />;
}
