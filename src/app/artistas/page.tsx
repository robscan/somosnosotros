import ListaArtistas from "@/components/ListaArtistas";
import MemoriaPantalla from "@/components/MemoriaPantalla";
import NavInferior from "@/components/NavInferior";
import Publicar from "@/components/Publicar";
import Sesion from "@/components/Sesion";
import Barra from "@/components/ui/Barra";
import { conProximaFecha, DISCIPLINAS, filtroDesdeUrl, PAGINA_ARTISTAS, UMBRAL_CHIPS_ARTISTAS, type ArtistaLista, type ArtistaResumen, type FechaDeArtista, type FiltroLeido } from "@/lib/artistas";
import type { Metadata } from "next";
import { CIUDAD_INICIAL, ciudadPorSlug, type Ciudad } from "@/lib/ciudad";
import { cargarCiudadesDeArtistas } from "@/lib/ciudades";
import { enmascararCorreo } from "@/lib/comunidad";
import { cargarEventosSemana } from "@/lib/cargarEventosSemana";
import { enOrden, leerTira, type Tarjeta } from "@/lib/destacados";
import { nombreSitio } from "@/lib/eventos";
import { filtroSinPasar } from "@/lib/fechas";
import { normalizarNombre } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

type SearchParams = { ciudad?: string; hace?: string; que?: string; q?: string; letra?: string; n?: string };

/**
 * El canonical conserva la ciudad cuando no es la inicial ("el contexto ordena, no limita": OL-029) y descarta el
 * resto de filtros ("?hace=musica" es la misma lista para Google, no una nueva). Sin esto, la lista de otra ciudad
 * se declaraba duplicada de la de San Luis Potosí y Google podía no ofrecerla nunca (OL-059). El título y la
 * descripción son propios, sin nombre de ciudad (no del layout raíz, que decía siempre San Luis Potosí) — por lo
 * mismo que el inicio (ver su comentario): esta página se reutiliza hasta 60 s al cambiar de ciudad sin recargar.
 * Repite openGraph y twitter (Next reemplaza el objeto entero, no lo combina con el del layout raíz): sin esto,
 * compartir `/artistas?ciudad=…` enseñaba el título y la descripción de San Luis Potosí del layout, con `og:url`
 * apuntando a la raíz en vez del canonical de esa ciudad (gestión de cambios, OL-059).
 */
export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const { ciudad: slug } = await searchParams;
  const ciudades = await cargarCiudadesDeArtistas();
  const resuelta = ciudadPorSlug(slug, ciudades);
  const canonical = resuelta.slug === CIUDAD_INICIAL.slug ? "/artistas" : `/artistas?ciudad=${resuelta.slug}`;
  const titulo = "Artistas · Somos Nosotros";
  const descripcion = "Quiénes hacen la cultura local: artistas y grupos, con su próxima fecha.";
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical },
    openGraph: { title: titulo, description: descripcion, url: canonical, type: "website", images: [{ url: "/portada.png", width: 1200, height: 630 }], locale: "es_MX", siteName: "Somos Nosotros" },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion, images: ["/portada.png"] },
  };
}

type FilaFecha = { artista_id: string; evento: Evento | Evento[] | null };
type Evento = { id: string; titulo: string; inicio: string; zona: string; sitio_texto: string | null; sitio_direccion: string | null; sitio_reservado: boolean; lugar: { nombre: string } | { nombre: string }[] | null };
type Opcion = { valor: string; etiqueta: string };
export type Cargado = {
  artistas: ArtistaLista[];
  /** Cuántos cumplen el filtro, se vean o no (la página trae `n`). */
  total: number;
  /** Cuántos faltan por ver después de los que trae la página (desde la letra, si la hay). */
  quedan: number;
  /** Cuántos hay en la ciudad sin ningún filtro: decide si aparecen la búsqueda y los chips. */
  totalCiudad: number;
  disciplinas: Opcion[];
  detalles: Opcion[];
  /** La tira de destacados (docs/rediseno/20): solo sin filtro ni búsqueda. */
  destacados: ArtistaLista[];
  eventosSemana: Tarjeta[];
};

/**
 * Los artistas de la ciudad con su fecha más próxima y dónde (decisión 1), filtrados y paginados en el servidor:
 * la disciplina, el detalle y lo escrito vienen de la URL (revisión 2026-09-14, A2). Todos van
 * en orden alfabético real (`nombre_orden`), de `n` en `n`, desde la letra del índice si la hay.
 */
async function cargar(f: FiltroLeido, ciudadNombre: string): Promise<Cargado> {
  const vacio: Cargado = { artistas: [], total: 0, quedan: 0, totalCiudad: 0, disciplinas: [], detalles: [], destacados: [], eventosSemana: [] };
  const supabase = await clienteServidor();
  if (!supabase) return vacio;
  const ciudad = ciudadNombre;

  const sinFiltro = !f.hace && !f.que && !f.q && !f.letra;
  const [f1, d1, d2, tira, eventosSemana] = await Promise.all([
    // Las filas van por la hora de su evento (`evento(inicio)` ordena las filas; `order` con `referencedTable` solo ordenaba
    // dentro del evento ligado), así el corte de 500 se queda con lo más próximo. Lo que se ordena debe ir en el select.
    supabase.from("eventos_artistas").select("artista_id, evento:eventos!inner(id, titulo, inicio, zona, sitio_texto, sitio_direccion, sitio_reservado, lugar:lugares(nombre))").eq("evento.visible", true).or(filtroSinPasar(), { referencedTable: "evento" }).order("evento(inicio)").order("evento(titulo)").order("evento(id)").order("artista_id").limit(500),
    supabase.rpc("disciplinas_con_artistas", { p_ciudad: ciudad }),
    f.hace ? supabase.rpc("detalles_de_disciplina", { p_ciudad: ciudad, p_disciplina: f.hace }) : Promise.resolve({ data: [] as { clave: string; etiqueta: string; n: number }[] }),
    sinFiltro ? leerTira(supabase, "artistas", ciudad) : Promise.resolve([]),
    sinFiltro ? cargarEventosSemana(supabase, "artistas", ciudad) : Promise.resolve([]),
  ]);
  // Todas las fechas con su sitio; la próxima de cada artista la elige `conProximaFecha`, no el orden de llegada.
  const fechas: FechaDeArtista[] = [];
  for (const fila of (f1.data ?? []) as unknown as FilaFecha[]) {
    const e = Array.isArray(fila.evento) ? fila.evento[0] : fila.evento;
    if (!e) continue;
    const lugar = Array.isArray(e.lugar) ? (e.lugar[0] ?? null) : e.lugar;
    fechas.push({ artista_id: fila.artista_id, evento: { id: e.id, titulo: e.titulo, inicio: e.inicio, zona: e.zona, sitio: nombreSitio({ lugar: lugar ? { nombre: lugar.nombre, portada: null } : null, sitio_texto: e.sitio_texto, sitio_direccion: e.sitio_direccion, sitio_reservado: e.sitio_reservado }) } });
  }
  const porDisciplina = ((d1.data ?? []) as { disciplina: string; n: number }[]).filter((x) => x.n > 0);
  const totalCiudad = porDisciplina.reduce((s, x) => s + Number(x.n), 0);
  const disciplinas = DISCIPLINAS.filter((d) => porDisciplina.some((x) => x.disciplina === d.valor)).map((d) => ({ ...d, n: Number(porDisciplina.find((x) => x.disciplina === d.valor)?.n ?? 0) }));
  const detalles = ((d2.data ?? []) as { clave: string; etiqueta: string; n: number }[]).length >= 2 ? (d2.data as { clave: string; etiqueta: string; n: number }[]).map((x) => ({ valor: x.clave, etiqueta: x.etiqueta.charAt(0).toUpperCase() + x.etiqueta.slice(1), n: Number(x.n) })) : [];

  const q = f.q ? normalizarNombre(f.q).replace(/[,()]/g, "") : "";
  const base = (head = false) => {
    let c = supabase.from("artistas").select("id, nombre, disciplina, detalle, tipo, foto", { count: "exact", head }).eq("visible", true).eq("ciudad", ciudad);
    if (f.hace) c = c.eq("disciplina", f.hace);
    if (f.que) c = c.ilike("detalle", f.que.replace(/[%_]/g, ""));
    if (q) c = c.or(`nombre_orden.ilike.%${q}%,detalle.ilike.%${q}%`);
    return c;
  };
  // La letra del índice lateral: la página empieza en esa letra y sigue de corrido (Ver más), como en Contactos;
  // el conteo sigue siendo el de todo el filtro.
  const desde = f.letra && !q ? f.letra.toLowerCase() : null;
  const [a, t, todos] = await Promise.all([
    (desde ? base().gte("nombre_orden", desde) : base()).order("nombre_orden").range(0, f.n - 1),
    // Los destacados pueden no estar en la primera página: se leen aparte, con su próxima fecha.
    tira.length ? supabase.from("artistas").select("id, nombre, disciplina, detalle, tipo, foto").eq("visible", true).in("id", tira.map((d) => d.id)) : Promise.resolve({ data: [] as ArtistaResumen[] }),
    desde ? base(true) : Promise.resolve(null),
  ]);
  const artistas = conProximaFecha((a.data ?? []) as ArtistaResumen[], fechas);
  const destacados = enOrden(tira, conProximaFecha((t.data ?? []) as ArtistaResumen[], fechas));
  return { artistas, total: (todos ? todos.count : a.count) ?? 0, quedan: Math.max(0, (a.count ?? 0) - artistas.length), totalCiudad, disciplinas, detalles, destacados, eventosSemana };
}

/** Artistas: quiénes hacen la cultura de la ciudad, con su próxima fecha. Decisiones en docs/rediseno/08-artistas-flujo-y-estados.md. */
export default async function Artistas({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { ciudad: slug, ...resto } = await searchParams;
  const filtro = filtroDesdeUrl(resto);
  // Las ciudades de Artistas salen de los artistas que hay; la del alta es la elegida aquí y se cambia en el formulario.
  const [ciudades, actual] = await Promise.all([cargarCiudadesDeArtistas(), usuarioActual()]);
  const ciudad: Ciudad = ciudadPorSlug(slug, ciudades);
  const cargado = await cargar(filtro, ciudad.nombre);
  // Con sesión, los artistas que sigue: la lista los marca y deja seguir al deslizar (bitácora 071).
  const supabase = actual ? await clienteServidor() : null;
  const s = supabase && actual ? await supabase.from("seguimientos").select("artista_id").eq("usuario_id", actual.perfil.id).not("artista_id", "is", null).limit(1000) : null;
  const seguidos = actual ? ((s?.data ?? []) as { artista_id: string }[]).map((x) => x.artista_id) : null;
  const avisos = actual ? { cuenta: actual.perfil.id, preguntado: actual.perfil.avisos_preguntado ?? true, correo: actual.correo ? enmascararCorreo(actual.correo) : "tu correo", llavePush: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "" } : null;
  return (
    <main className="raiz">
      <Barra derecha={<Sesion />} />
      <ListaArtistas {...cargado} filtro={filtro} conChips={cargado.totalCiudad >= UMBRAL_CHIPS_ARTISTAS} pagina={PAGINA_ARTISTAS} conSesion={!!actual} ciudad={ciudad} ciudades={ciudades} seguidos={seguidos} avisos={avisos} />
      {/* El filtro y la ciudad viven en la URL; lo que se recuerda al volver de una ficha es el scroll. */}
      <MemoriaPantalla seccion="artistas" />
      <Publicar que="artista" ciudad={ciudad.slug === CIUDAD_INICIAL.slug ? null : ciudad.slug} />
      <NavInferior />
    </main>
  );
}
