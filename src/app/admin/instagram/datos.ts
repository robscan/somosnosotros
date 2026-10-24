import "server-only";
import { diaLocal, formatearCuando, textoDePeriodo, esDeVariosDias } from "@/lib/fechas";
import { lineaDeSenal, porSenal, sePuedePublicar } from "@/lib/instagram/elegir";
import { armarTexto, etiquetasDeLaFoto, usuarioDeInstagram, type ArtistaIg, type EventoIg } from "@/lib/instagram/texto";
import type { ClienteServidor } from "@/lib/supabase/servidor";

/**
 * Lo que leen la lista de Instagram, la portada, la hoja de vista previa y la acción de publicar (OL-458, firmado; bitácora 490). Todo con la
 * sesión de la administración: la base lo comprueba (RLS y `instagram_sugerencias`, que solo responde a la administración).
 */

export type FilaSugerencia = {
  id: string;
  slug: string | null;
  titulo: string;
  inicio: string;
  fin: string | null;
  termina: string;
  zona: string;
  clase: string;
  imagen: string | null;
  precio: string | null;
  ciudad: string;
  ciudad_nombre: string;
  lugar_id: string | null;
  lugar_nombre: string | null;
  lugar_redes: unknown;
  sitio_texto: string | null;
  van: number;
  interesa: number;
  destacado: boolean;
  publicado_en: string | null;
  publicado_formato: string | null;
};

/** Un renglón de la lista, ya dicho. */
export type Sugerencia = { id: string; href: string; titulo: string; foto: string | null; cuando: string; donde: string; linea: string; publicado: boolean };

const FORMATO = { "4x5": "Publicación", "9x16": "Historia" } as const;

/** «Ayer, 7:40 pm», «jue 1 de oct, 6:15 pm». */
export function cuandoSePublico(iso: string, ahora: Date, zona = "America/Mexico_City"): string {
  const t = formatearCuando(iso, null, ahora, zona);
  return t.replace(" · ", ", ");
}

/** El cuándo del renglón: el de las listas de la app; lo que dura varios días, sus días («Hasta el …» si ya abrió). */
function cuandoDelRenglon(f: FilaSugerencia, ahora: Date): string {
  if ((f.clase === "exposicion" || f.clase === "festival") && f.fin && esDeVariosDias(f.inicio, f.fin, f.zona)) {
    return textoDePeriodo(diaLocal(new Date(f.inicio), f.zona), diaLocal(new Date(f.fin), f.zona), ahora, f.zona);
  }
  return formatearCuando(f.inicio, f.fin, ahora, f.zona);
}

/** Las sugerencias de una ciudad (null: todas) en los próximos 7 días, en dos grupos: para publicar (por señal) y ya en Instagram. */
export async function cargarSugerencias(supabase: ClienteServidor, ciudad: string | null, ahora = new Date()): Promise<{ para: Sugerencia[]; ya: Sugerencia[]; filas: FilaSugerencia[] } | null> {
  const { data, error } = await supabase.rpc("instagram_sugerencias", { p_ciudad: ciudad, p_dias: 7 });
  if (error || !Array.isArray(data)) return null;
  // La base ya dejó solo lo que se puede publicar (por venir, o en curso con días o sesiones por delante).
  const filas = data as FilaSugerencia[];
  const renglon = (f: FilaSugerencia): Sugerencia => ({
    id: f.id,
    href: `/eventos/${f.slug || f.id}`,
    titulo: f.titulo,
    foto: f.imagen,
    cuando: cuandoDelRenglon(f, ahora),
    donde: [f.lugar_nombre ?? f.sitio_texto, ciudad ? null : f.ciudad_nombre].filter(Boolean).join(" · ") || f.ciudad_nombre,
    linea: f.publicado_en
      ? `${FORMATO[f.publicado_formato === "9x16" ? "9x16" : "4x5"]} · ${cuandoSePublico(f.publicado_en, ahora, f.zona)}`
      : lineaDeSenal({ destacado: f.destacado, van: f.van, interesa: f.interesa, conCartel: !!f.imagen, inicio: f.inicio }),
    publicado: !!f.publicado_en,
  });
  const senal = (f: FilaSugerencia) => ({ destacado: f.destacado, van: f.van, interesa: f.interesa, conCartel: !!f.imagen, inicio: f.inicio });
  const para = filas.filter((f) => !f.publicado_en).sort((a, b) => porSenal(senal(a), senal(b))).map(renglon);
  const ya = filas.filter((f) => f.publicado_en).sort((a, b) => (b.publicado_en ?? "").localeCompare(a.publicado_en ?? "")).map(renglon);
  return { para, ya, filas };
}

/** Las ciudades de la hoja: cada una con cuántos eventos se pueden publicar, de la que más a la que menos. */
export async function cargarCiudadesInstagram(supabase: ClienteServidor, ahora = new Date()): Promise<{ slug: string; nombre: string; n: number }[]> {
  const todas = await cargarSugerencias(supabase, null, ahora);
  const cuenta = new Map<string, { slug: string; nombre: string; n: number }>();
  for (const f of todas?.filas ?? []) {
    const c = cuenta.get(f.ciudad) ?? { slug: f.ciudad, nombre: f.ciudad_nombre, n: 0 };
    c.n++;
    cuenta.set(f.ciudad, c);
  }
  return [...cuenta.values()].sort((a, b) => b.n - a.n || a.nombre.localeCompare(b.nombre, "es"));
}

/** Lo de la portada: cuántas se publicaron en los últimos 7 días y cuántas esperan en la ciudad. Null si no se pudo leer. */
export async function cargarResumenInstagram(supabase: ClienteServidor, ciudad: string | null, ahora = new Date()): Promise<{ semana: number; porPublicar: number; ciudad: string | null } | null> {
  const desde = new Date(ahora.getTime() - 7 * 86_400_000).toISOString();
  const [publicadas, sugerencias] = await Promise.all([
    supabase.from("instagram_publicaciones").select("id", { count: "exact", head: true }).eq("estado", "publicada").gte("creado_en", desde),
    cargarSugerencias(supabase, ciudad, ahora),
  ]);
  if (publicadas.error || !sugerencias) return null;
  const nombre = sugerencias.filas[0]?.ciudad_nombre ?? null;
  return { semana: publicadas.count ?? 0, porPublicar: sugerencias.para.length, ciudad: ciudad ? nombre : null };
}

type FilaEvento = {
  id: string;
  slug: string | null;
  titulo: string;
  inicio: string;
  fin: string | null;
  termina: string;
  zona: string;
  clase: string;
  precio: string | null;
  imagen: string | null;
  ciudad: string;
  visible: boolean;
  cancelado: boolean;
  borrador: boolean;
  retirado_por_admin: boolean;
  lugar_id: string | null;
  sitio_texto: string | null;
  lugar: { nombre: string; redes: unknown } | { nombre: string; redes: unknown }[] | null;
  sesiones: { inicio: string }[] | null;
};

export type ParaHoja = {
  id: string;
  slug: string | null;
  titulo: string;
  evento: EventoIg;
  /** Lo que se puede etiquetar (antes de quitar). */
  etiquetas: string[];
  texto: string;
  ubicacion: { id: string; nombre: string } | null;
  ciudad: { slug: string; nombre: string };
  imagen: string | null;
  sePuede: boolean;
  publicado: { cuando: string; formato: "4x5" | "9x16" } | null;
  zona: string;
  datos: { inicio: string; termina: string; zona: string; clase: string; sesiones: { inicio: string }[] };
};

/** Todo lo de un evento para su hoja y para publicarlo. Null si no existe o no se ve. */
export async function cargarParaHoja(supabase: ClienteServidor, eventoId: string, ahora = new Date()): Promise<ParaHoja | null> {
  const { data: e } = await supabase
    .from("eventos")
    .select("id, slug, titulo, inicio, fin, termina, zona, clase, precio, imagen, ciudad, visible, cancelado, borrador, retirado_por_admin, lugar_id, sitio_texto, lugar:lugares(nombre, redes), sesiones:eventos_sesiones(inicio)")
    .eq("id", eventoId)
    .maybeSingle<FilaEvento>();
  if (!e) return null;
  const lugar = Array.isArray(e.lugar) ? (e.lugar[0] ?? null) : e.lugar;
  const [artistas, slugCiudad, ultima] = await Promise.all([
    supabase.from("eventos_artistas").select("orden, artista:artistas(nombre, redes, disciplina)").eq("evento_id", e.id).order("orden").limit(20),
    supabase.rpc("ciudad_slug", { p_ciudad: e.ciudad }),
    supabase.from("instagram_publicaciones").select("creado_en, formato").eq("evento_id", e.id).eq("estado", "publicada").order("creado_en", { ascending: false }).limit(1).maybeSingle<{ creado_en: string; formato: "4x5" | "9x16" }>(),
  ]);
  const ciudadSlug = typeof slugCiudad.data === "string" ? slugCiudad.data : "";
  const lista: ArtistaIg[] = ((artistas.data ?? []) as { artista: { nombre: string; redes: unknown; disciplina: string | null } | { nombre: string; redes: unknown; disciplina: string | null }[] | null }[])
    .map((x) => (Array.isArray(x.artista) ? x.artista[0] : x.artista))
    .filter((a): a is { nombre: string; redes: unknown; disciplina: string | null } => !!a)
    .map((a) => ({ nombre: a.nombre, usuario: usuarioDeInstagram(a.redes), disciplina: a.disciplina }));
  const evento: EventoIg = {
    titulo: e.titulo,
    inicio: e.inicio,
    fin: e.fin,
    zona: e.zona,
    clase: e.clase,
    precio: e.precio,
    lugar: lugar ? { nombre: lugar.nombre, usuario: usuarioDeInstagram(lugar.redes) } : e.sitio_texto ? { nombre: e.sitio_texto, usuario: null } : null,
    ciudad: e.ciudad,
    artistas: lista,
  };
  // La ubicación: la del lugar si la tiene; si no, la de la ciudad.
  const { data: ubic } = await supabase.from("instagram_ubicaciones").select("tipo, clave, pagina_id, nombre").or(`and(tipo.eq.ciudad,clave.eq.${ciudadSlug || "-"}),and(tipo.eq.lugar,clave.eq.${e.lugar_id ?? "-"})`);
  const filas = (ubic ?? []) as { tipo: string; pagina_id: string; nombre: string | null }[];
  const u = filas.find((x) => x.tipo === "lugar") ?? filas.find((x) => x.tipo === "ciudad") ?? null;
  const sesiones = e.sesiones ?? [];
  return {
    id: e.id,
    slug: e.slug,
    titulo: e.titulo,
    evento,
    etiquetas: etiquetasDeLaFoto(evento),
    texto: armarTexto(evento, ahora),
    ubicacion: u ? { id: u.pagina_id, nombre: u.nombre ?? (u.tipo === "lugar" ? (lugar?.nombre ?? e.ciudad) : e.ciudad) } : null,
    ciudad: { slug: ciudadSlug, nombre: e.ciudad },
    imagen: e.imagen,
    sePuede: sePuedePublicar({ ...e, sesiones }, ahora),
    publicado: ultima.data ? { cuando: cuandoSePublico(ultima.data.creado_en, ahora, e.zona), formato: ultima.data.formato } : null,
    zona: e.zona,
    datos: { inicio: e.inicio, termina: e.termina, zona: e.zona, clase: e.clase, sesiones },
  };
}
