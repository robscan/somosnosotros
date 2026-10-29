import "server-only";
import { diaLocal, formatearCuando, textoDePeriodo, esDeVariosDias } from "@/lib/fechas";
import { costoOpcional } from "@/lib/eventos";
import { lineaDeSenal, porSenal, sePuedePublicar, textoActos, unRenglonPorFestival } from "@/lib/instagram/elegir";
import { esHuella } from "@/lib/carteles/huella";
import { huellaDeCartel } from "@/lib/carteles/huellaServidor";
import { armarCarrusel, type ImagenCarrusel, type ParaCarrusel } from "@/lib/instagram/carrusel";
import { bajarCartel } from "@/lib/instagram/imagen";
import { armarTexto, etiquetasDeLaFoto, usuarioDeInstagram, type ActoIg, type ArtistaIg, type EventoIg } from "@/lib/instagram/texto";
import { enCamino, lineaDeTrabajo } from "@/lib/redes/reglas";
import { trabajosPorEvento } from "./colaPorEvento";
import { nombreDeSedes, sedesDeFestival } from "@/lib/sedesFestival";
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

/** Cómo va el espejo en Facebook de un evento ya publicado en Instagram (OL-461): publicado, el último error, en la cola (OL-465) o nada todavía. */
export type EstadoFacebook = { estado: "publicada" } | { estado: "error"; error: "permiso" | "imagen" | "otro" } | { estado: "publicando" } | { estado: "nada" };

/**
 * Un renglón de la lista, ya dicho. `facebook`: solo en lo que ya está en Instagram. `publicando` (OL-465): algo de este evento está en la cola de
 * redes (la lista se refresca sola mientras lo haya).
 */
export type Sugerencia = {
  id: string;
  href: string;
  titulo: string;
  foto: string | null;
  cuando: string;
  donde: string;
  linea: string;
  publicado: boolean;
  facebook: EstadoFacebook | null;
  publicando: boolean;
  /** OL-488: los trabajos en camino de este evento (la lista pregunta por ellos cada 5 s y se refresca en cuanto terminan). */
  enCamino?: { id: string; reintentando: boolean }[];
};


/** El estado de Facebook de cada evento, de sus intentos (del más nuevo al más viejo): con uno publicado, publicado; si no, el último error. */
export function estadosFacebook(filas: { evento_id: string; estado: string; error: string | null }[]): Map<string, EstadoFacebook> {
  const m = new Map<string, EstadoFacebook>();
  for (const f of filas) {
    const antes = m.get(f.evento_id);
    if (f.estado === "publicada") m.set(f.evento_id, { estado: "publicada" });
    else if (!antes && (f.error === "permiso" || f.error === "imagen" || f.error === "otro")) m.set(f.evento_id, { estado: "error", error: f.error });
  }
  return m;
}

const FORMATO = { "4x5": "Publicación", "9x16": "Historia", carrusel: "Carrusel" } as const;

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
  // La base ya dejó solo lo que se puede publicar (por venir, o en curso con días o sesiones por delante). Un festival es un solo renglón: sus
  // actos no van aparte mientras él esté en la lista (OL-463). Si sus actos no se pudieron leer, la lista va como antes.
  const todas = data as FilaSugerencia[];
  const festivales = todas.filter((f) => f.clase === "festival").map((f) => f.id);
  const actos = festivales.length
    ? await supabase.from("eventos").select("id, evento_padre_id").in("evento_padre_id", festivales).eq("visible", true).eq("borrador", false).eq("cancelado", false).eq("retirado_por_admin", false).limit(2000)
    : null;
  const agrupadas = unRenglonPorFestival(todas, actos && !actos.error ? ((actos.data ?? []) as { id: string; evento_padre_id: string | null }[]) : []);
  const filas = agrupadas.filas;
  // Lo ya publicado en Instagram: cómo va en Facebook (OL-461). Si no se pudo leer, sin estado (el renglón no ofrece publicar en Facebook).
  const publicados = filas.filter((f) => f.publicado_en).map((f) => f.id);
  const fb = publicados.length
    ? await supabase.from("facebook_publicaciones").select("evento_id, estado, error").in("evento_id", publicados).order("creado_en", { ascending: false }).limit(1000)
    : null;
  const enFacebook = fb && !fb.error ? estadosFacebook((fb.data ?? []) as { evento_id: string; estado: string; error: string | null }[]) : null;
  // OL-465: lo que está en la cola o no se pudo publicar en las últimas 24 horas. Si no se pudo leer, la lista va como antes.
  const cola = filas.length
    ? await supabase
        .from("redes_trabajos")
        .select("id, evento_id, red, formato, estado, pedido, error, intentos, fallos")
        .in("evento_id", filas.map((f) => f.id))
        .gte("creado_en", new Date(ahora.getTime() - 86_400_000).toISOString())
        // OL-479: lo que la semana de Instagram programó para más tarde no está «Publicando…» (lo dice la pestaña Semana).
        .or(`pedido->>casilla.is.null,siguiente_en.lte.${new Date(ahora.getTime() + 60_000).toISOString()},estado.neq.en_cola`)
        .order("creado_en", { ascending: false })
        .limit(500)
    : null;
  const trabajos = trabajosPorEvento(cola && !cola.error ? ((cola.data ?? []) as Record<string, unknown>[]) : []);
  const lineaDeCola = (f: FilaSugerencia): string | null => {
    const t = trabajos.instagram.get(f.id);
    if (!t) return null;
    // Un fallo solo se dice si no salió después (lo que ya está en Instagram dice cuándo se publicó).
    return enCamino(t) || (t.estado === "fallido" && !f.publicado_en) ? lineaDeTrabajo(t) : null;
  };
  const renglon = (f: FilaSugerencia): Sugerencia => ({
    id: f.id,
    href: `/eventos/${f.slug || f.id}`,
    titulo: f.titulo,
    foto: f.imagen,
    // Un festival dice cuántos actos lleva (OL-463): se publica una vez, con su programa.
    cuando: [cuandoDelRenglon(f, ahora), agrupadas.actos.get(f.id) ? textoActos(agrupadas.actos.get(f.id)!) : null].filter(Boolean).join(" · "),
    donde: [f.lugar_nombre ?? f.sitio_texto, ciudad ? null : f.ciudad_nombre].filter(Boolean).join(" · ") || f.ciudad_nombre,
    linea: lineaDeCola(f) ?? (f.publicado_en
      ? `${FORMATO[f.publicado_formato === "9x16" || f.publicado_formato === "carrusel" ? f.publicado_formato : "4x5"]} · ${cuandoSePublico(f.publicado_en, ahora, f.zona)}`
      : lineaDeSenal({ destacado: f.destacado, van: f.van, interesa: f.interesa, conCartel: !!f.imagen, inicio: f.inicio })),
    publicado: !!f.publicado_en,
    facebook: f.publicado_en && enFacebook ? (trabajos.facebook.has(f.id) ? { estado: "publicando" } : (enFacebook.get(f.id) ?? { estado: "nada" })) : null,
    publicando: enCamino(trabajos.instagram.get(f.id)) || (!!f.publicado_en && trabajos.facebook.has(f.id)),
    enCamino: trabajos.vivos.get(f.id) ?? [],
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

/**
 * Lo de la portada: cuántas se publicaron en Instagram en los últimos 7 días, cuántas salieron en Facebook en esos días (OL-461; null si no se
 * pudo leer) y cuántas esperan en la ciudad. Null si no se pudo leer.
 */
export async function cargarResumenInstagram(supabase: ClienteServidor, ciudad: string | null, ahora = new Date()): Promise<{ semana: number; facebook: number | null; porPublicar: number; ciudad: string | null } | null> {
  const desde = new Date(ahora.getTime() - 7 * 86_400_000).toISOString();
  const [publicadas, fb, sugerencias] = await Promise.all([
    supabase.from("instagram_publicaciones").select("id", { count: "exact", head: true }).eq("estado", "publicada").gte("creado_en", desde),
    supabase.from("facebook_publicaciones").select("instagram_id").eq("estado", "publicada").gte("creado_en", desde).limit(1000),
    cargarSugerencias(supabase, ciudad, ahora),
  ]);
  if (publicadas.error || !sugerencias) return null;
  const nombre = sugerencias.filas[0]?.ciudad_nombre ?? null;
  const facebook = fb.error ? null : new Set(((fb.data ?? []) as { instagram_id: string }[]).map((x) => x.instagram_id)).size;
  return { semana: publicadas.count ?? 0, facebook, porPublicar: sugerencias.para.length, ciudad: ciudad ? nombre : null };
}

type LugarFila = { id?: string; nombre: string; redes: unknown };
type Uno<T> = T | T[] | null;
const uno = <T,>(x: Uno<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

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
  cartel_huella?: string | null;
  ciudad: string;
  visible: boolean;
  cancelado: boolean;
  borrador: boolean;
  retirado_por_admin: boolean;
  evento_padre_id: string | null;
  inaugura_id: string | null;
  lugar_id: string | null;
  sitio_texto: string | null;
  lugar: Uno<LugarFila>;
  sesiones: { inicio: string; fin: string | null }[] | null;
};

type FilaActo = {
  id: string;
  titulo: string;
  imagen: string | null;
  cartel_huella?: string | null;
  inicio: string;
  fin: string | null;
  precio: string | null;
  lugar_id: string | null;
  sitio_texto: string | null;
  sitio_reservado: boolean | null;
  lugar: Uno<LugarFila>;
  sesiones: { inicio: string; fin: string | null }[] | null;
};

type FilaArtista = { evento_id?: string; artista: Uno<{ id: string; nombre: string; redes: unknown; disciplina: string | null }> };

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
  publicado: { cuando: string; formato: "4x5" | "9x16" | "carrusel" } | null;
  zona: string;
  /** Las imágenes posibles de un carrusel (OL-464): en un festival con carteles en sus actos, la portada y un cartel por cada cartel distinto de
   *  sus actos por venir; si no, vacío (se publica una imagen, como siempre). */
  carrusel: ImagenCarrusel[];
  datos: { inicio: string; termina: string; zona: string; clase: string; sesiones: { inicio: string }[] };
};

const aArtista = (x: FilaArtista): ArtistaIg | null => {
  const a = uno(x.artista);
  return a ? { id: a.id, nombre: a.nombre, usuario: usuarioDeInstagram(a.redes), disciplina: a.disciplina } : null;
};

/**
 * Los actos de un festival para el texto (OL-463): los publicados y no cancelados (también los que ya pasaron: cuentan para el precio y las
 * etiquetas; el programa solo dice lo que falta), cada uno con sus artistas y sus sesiones, y la sede que dicen sus actos («Varias sedes», la única,
 * o null si ninguno dice dónde). Null si no se pudieron leer (el festival se publica como antes, como un evento).
 */
async function cargarActos(supabase: ClienteServidor, festivalId: string): Promise<{ actos: ActoIg[]; paraCarrusel: ParaCarrusel[]; sede: { nombre: string; usuario: string | null } | null } | null> {
  const { data, error } = await supabase
    .from("eventos")
    .select("id, titulo, imagen, cartel_huella, inicio, fin, precio, lugar_id, sitio_texto, sitio_reservado, lugar:lugares(id, nombre, redes), sesiones:eventos_sesiones(inicio, fin)")
    .eq("evento_padre_id", festivalId)
    .eq("visible", true)
    .eq("borrador", false)
    .eq("cancelado", false)
    .eq("retirado_por_admin", false)
    .order("inicio")
    .limit(200);
  if (error || !Array.isArray(data)) return null;
  const filas = data as FilaActo[];
  if (!filas.length) return { actos: [], paraCarrusel: [], sede: null };
  const ligados = await supabase.from("eventos_artistas").select("evento_id, orden, artista:artistas(id, nombre, redes, disciplina)").in("evento_id", filas.map((a) => a.id)).order("orden").limit(1000);
  const porActo = new Map<string, ArtistaIg[]>();
  for (const x of (ligados.data ?? []) as FilaArtista[]) {
    const a = aArtista(x);
    if (a && x.evento_id) porActo.set(x.evento_id, [...(porActo.get(x.evento_id) ?? []), a]);
  }
  const actos = filas.map((a) => ({ titulo: a.titulo, inicio: a.inicio, fin: a.fin, precio: a.precio, artistas: porActo.get(a.id) ?? [], ...(a.sesiones?.length ? { sesiones: a.sesiones } : {}) }));
  // OL-464: lo que cada acto aporta al carrusel (su cartel y las cuentas de sus artistas).
  const paraCarrusel = filas.map((a) => ({
    id: a.id,
    titulo: a.titulo,
    imagen: a.imagen,
    huella: a.cartel_huella ?? null,
    inicio: a.inicio,
    fin: a.fin,
    usuarios: (porActo.get(a.id) ?? []).map((x) => x.usuario).filter((u): u is string => !!u),
    ...(a.sesiones?.length ? { sesiones: a.sesiones } : {}),
  }));
  // La sede, como la dice la app (OL-339: el «Dónde» de un festival sale de sus actos).
  const sedes = sedesDeFestival(filas.map((a) => ({ inicio: a.inicio, fin: a.fin, lugar_id: a.lugar_id, lugar: uno(a.lugar), sitio_texto: a.sitio_texto, sitio_reservado: !!a.sitio_reservado })));
  const nombre = nombreDeSedes(sedes);
  const lugarUnico = sedes.length === 1 && sedes[0].lugar ? filas.map((a) => uno(a.lugar)).find((l) => l?.id === sedes[0].lugar!.id) : null;
  return { actos, paraCarrusel, sede: nombre ? { nombre, usuario: lugarUnico ? usuarioDeInstagram(lugarUnico.redes) : null } : null };
}

const soloSiVarias = (xs: ImagenCarrusel[]) => (xs.length > 1 ? xs : []);

/**
 * La huella de un cartel para no repetirlo en el carrusel (OL-464): la guardada (`eventos.cartel_huella`, la pone `ponerCartel`) o, si falta,
 * se baja el cartel (una dirección nuestra de Storage) y se calcula. Las del mismo cartel se calculan una vez por petición (y la descarga ya la
 * guarda `traerImagen` un rato). Null si no hay cartel o no se pudo leer: entonces solo se compara la dirección.
 */
const huellasAlVuelo = new Map<string, Promise<string | null>>();
function huellaDe(imagen: string | null, guardada: string | null | undefined): Promise<string | null> {
  if (!imagen) return Promise.resolve(null);
  if (esHuella(guardada)) return Promise.resolve(guardada);
  let h = huellasAlVuelo.get(imagen);
  if (!h) {
    h = bajarCartel(imagen)
      .then((c) => (c ? huellaDeCartel(c.bytes) : null))
      .catch(() => null);
    huellasAlVuelo.set(imagen, h);
    // Solo mientras dura: la memoria no crece con cada cartel que se mira.
    h.finally(() => setTimeout(() => huellasAlVuelo.delete(imagen), 60_000).unref?.());
  }
  return h;
}

/** Todo lo de un evento para su hoja y para publicarlo. Null si no existe o no se ve. */
export async function cargarParaHoja(supabase: ClienteServidor, eventoId: string, ahora = new Date()): Promise<ParaHoja | null> {
  const { data: e } = await supabase
    .from("eventos")
    .select("id, slug, titulo, inicio, fin, termina, zona, clase, precio, imagen, cartel_huella, ciudad, visible, cancelado, borrador, retirado_por_admin, evento_padre_id, inaugura_id, lugar_id, sitio_texto, lugar:lugares(nombre, redes), sesiones:eventos_sesiones(inicio, fin)")
    .eq("id", eventoId)
    .maybeSingle<FilaEvento>();
  if (!e) return null;
  const lugar = uno(e.lugar);
  const [artistas, slugCiudad, ultima, festival] = await Promise.all([
    supabase.from("eventos_artistas").select("orden, artista:artistas(id, nombre, redes, disciplina)").eq("evento_id", e.id).order("orden").limit(20),
    supabase.rpc("ciudad_slug", { p_ciudad: e.ciudad }),
    supabase.from("instagram_publicaciones").select("creado_en, formato").eq("evento_id", e.id).eq("estado", "publicada").order("creado_en", { ascending: false }).limit(1).maybeSingle<{ creado_en: string; formato: "4x5" | "9x16" | "carrusel" }>(),
    e.clase === "festival" ? cargarActos(supabase, e.id) : null,
  ]);
  const ciudadSlug = typeof slugCiudad.data === "string" ? slugCiudad.data : "";
  const lista = ((artistas.data ?? []) as FilaArtista[]).map(aArtista).filter((a): a is ArtistaIg => !!a);
  const sesiones = e.sesiones ?? [];
  const propio = lugar ? { nombre: lugar.nombre, usuario: usuarioDeInstagram(lugar.redes) } : e.sitio_texto ? { nombre: e.sitio_texto, usuario: null } : null;
  const evento: EventoIg = {
    titulo: e.titulo,
    inicio: e.inicio,
    fin: e.fin,
    zona: e.zona,
    clase: e.clase,
    precio: e.precio,
    // Un festival con actos que dicen dónde: su sede o «Varias sedes» (OL-339, OL-463); si no, lo capturado en el marco.
    lugar: festival?.sede ?? propio,
    ciudad: e.ciudad,
    artistas: lista,
    opcional: costoOpcional({ clase: e.clase, evento_padre_id: e.evento_padre_id, inauguracion: !!e.inaugura_id }),
    ...(sesiones.length > 1 ? { sesiones } : {}),
    ...(festival?.actos.length ? { actos: festival.actos } : {}),
  };
  // La ubicación: la del lugar si la tiene; si no, la de la ciudad.
  const { data: ubic } = await supabase.from("instagram_ubicaciones").select("tipo, clave, pagina_id, nombre").or(`and(tipo.eq.ciudad,clave.eq.${ciudadSlug || "-"}),and(tipo.eq.lugar,clave.eq.${e.lugar_id ?? "-"})`);
  const filas = (ubic ?? []) as { tipo: string; pagina_id: string; nombre: string | null }[];
  const u = filas.find((x) => x.tipo === "lugar") ?? filas.find((x) => x.tipo === "ciudad") ?? null;
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
    // Un carrusel solo si hay más de una imagen (la portada y al menos un cartel de sus actos). Sin repetir carteles: por la dirección o por su
    // huella (la guardada o, si falta, calculada al vuelo).
    carrusel: festival?.paraCarrusel.length
      ? soloSiVarias(
          armarCarrusel({
            portada: { titulo: e.titulo, imagen: e.imagen, usuarios: lista.map((a) => a.usuario).filter((u): u is string => !!u), huella: await huellaDe(e.imagen, e.cartel_huella) },
            eventos: await Promise.all(festival.paraCarrusel.map(async (a) => ({ ...a, huella: await huellaDe(a.imagen, a.huella) }))),
            ahora,
            zona: e.zona,
          }),
        )
      : [],
    datos: { inicio: e.inicio, termina: e.termina, zona: e.zona, clase: e.clase, sesiones },
  };
}
