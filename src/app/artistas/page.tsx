import { Suspense } from "react";
import ListaArtistas from "@/components/ListaArtistas";
import ListaEsqueleto from "@/components/ListaEsqueleto";
import MemoriaPantalla from "@/components/MemoriaPantalla";
import NavInferior from "@/components/NavInferior";
import Publicar from "@/components/Publicar";
import Sesion from "@/components/Sesion";
import Barra from "@/components/ui/Barra";
import MisArtistas from "@/app/perfil/MisArtistas";
import { conArtistasLigados, conProximaFecha, DISCIPLINAS, filtroDesdeUrl, hrefArtista, PAGINA_ARTISTAS, UMBRAL_CHIPS_ARTISTAS, type ArtistaLista, type ArtistaResumen, type FechaDeArtista, type FiltroLeido } from "@/lib/artistas";
import type { Metadata } from "next";
import { artistasConMiCorreo, reclamarArtista } from "./acciones";
import { cargarMisArtistas } from "./consultas";
import LetreroCorreoLigado from "./LetreroCorreoLigado";
import { CIUDAD_INICIAL, ciudadPorSlug, type Ciudad } from "@/lib/ciudad";
import { cargarCiudadesDeArtistas } from "@/lib/ciudades";
import { enmascararCorreo } from "@/lib/comunidad";
import { nombreSitio } from "@/lib/eventos";
import { filtroSinPasar } from "@/lib/fechas";
import { gruposConPosicion } from "@/lib/indice";
import { normalizarNombre } from "@/lib/lugares";
import { qrDeUrl } from "@/lib/qr";
import { ORIGEN } from "@/lib/sitemap";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import styles from "./page.module.css";

type SearchParams = { ciudad?: string; hace?: string; que?: string; q?: string; n?: string };

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
  /** Cuántos cumplen el filtro (disciplina, detalle o búsqueda), se vean o no (la página trae `n`). */
  total: number;
  /** Cuántos faltan por ver tras los que trae la página. */
  quedan: number;
  /** Cuántos hay en la ciudad sin ningún filtro: decide si aparecen la búsqueda y los chips. */
  totalCiudad: number;
  disciplinas: Opcion[];
  detalles: Opcion[];
  /**
   * Las letras de la tira, en el orden real de la lista (dentro de lo que hace/qué ya filtra), y en qué posición
   * (0-based) empieza cada una. La tira es un acceso directo, no un filtro (corrección del founder, 2026-09-19):
   * tocar una letra fuera de lo cargado pide con `n` lo justo para que su posición quede dentro de la página.
   */
  letras: string[];
  posiciones: Record<string, number>;
};

/**
 * Los artistas de la ciudad con su fecha más próxima y dónde (decisión 1), filtrados y paginados en el servidor:
 * la disciplina, el detalle y lo escrito vienen de la URL (revisión 2026-09-14, A2), de `n` en `n`, en orden
 * alfabético real (`nombre_orden`). La tira de letras no filtra (corrección del founder, 2026-09-19: es un acceso
 * directo): sus posiciones salen de una consulta aparte, de una sola columna y sin límite de página, para saber
 * cuánto pedir sin traer fotos ni el catálogo completo de golpe. Sin carriles propios (OL-165): la tira de
 * destacados y "Con eventos esta semana" ya viven en Inicio.
 */
async function cargar(f: FiltroLeido, ciudadNombre: string): Promise<Cargado> {
  const vacio: Cargado = { artistas: [], total: 0, quedan: 0, totalCiudad: 0, disciplinas: [], detalles: [], letras: [], posiciones: {} };
  const supabase = await clienteServidor();
  if (!supabase) return vacio;
  const ciudad = ciudadNombre;

  const q = f.q ? normalizarNombre(f.q).replace(/[,()]/g, "") : "";
  const [f1, d1, d2, presencia] = await Promise.all([
    // Las filas van por la hora de su evento (`evento(inicio)` ordena las filas; `order` con `referencedTable` solo ordenaba
    // dentro del evento ligado), así el corte de 500 se queda con lo más próximo. Lo que se ordena debe ir en el select.
    supabase.from("eventos_artistas").select("artista_id, evento:eventos!inner(id, titulo, inicio, zona, sitio_texto, sitio_direccion, sitio_reservado, lugar:lugares(nombre))").eq("evento.visible", true).or(filtroSinPasar(), { referencedTable: "evento" }).order("evento(inicio)").order("evento(titulo)").order("evento(id)").order("artista_id").limit(500),
    supabase.rpc("disciplinas_con_artistas", { p_ciudad: ciudad }),
    f.hace ? supabase.rpc("detalles_de_disciplina", { p_ciudad: ciudad, p_disciplina: f.hace }) : Promise.resolve({ data: [] as { clave: string; etiqueta: string; n: number }[] }),
    // Solo el nombre, ya ordenado, para la tira: dónde empieza cada letra. No aplica con búsqueda, que la esconde.
    // Una sola columna, sin foto ni disciplina: no es el catálogo completo, aunque no esté recortada por página.
    !q
      ? (() => {
          let c = supabase.from("artistas").select("nombre_orden").eq("visible", true).eq("ciudad", ciudad);
          if (f.hace) c = c.eq("disciplina", f.hace);
          if (f.que) c = c.ilike("detalle", f.que.replace(/[%_]/g, ""));
          return c.order("nombre_orden").limit(5000);
        })()
      : Promise.resolve({ data: [] as { nombre_orden: string }[] }),
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
  const grupos = gruposConPosicion(((presencia.data ?? []) as { nombre_orden: string }[]), (x) => x.nombre_orden);
  const letras = grupos.map((g) => g.letra);
  const posiciones = Object.fromEntries(grupos.map((g) => [g.letra, g.desde]));

  const base = () => {
    let c = supabase.from("artistas").select("id, slug, nombre, disciplina, detalle, tipo, foto", { count: "exact" }).eq("visible", true).eq("ciudad", ciudad);
    if (f.hace) c = c.eq("disciplina", f.hace);
    if (f.que) c = c.ilike("detalle", f.que.replace(/[%_]/g, ""));
    if (q) c = c.or(`nombre_orden.ilike.%${q}%,detalle.ilike.%${q}%`);
    return c;
  };
  const a = await base().order("nombre_orden").range(0, f.n - 1);
  const artistas = conProximaFecha((a.data ?? []) as ArtistaResumen[], fechas);
  return { artistas, total: a.count ?? 0, quedan: Math.max(0, (a.count ?? 0) - artistas.length), totalCiudad, disciplinas, detalles, letras, posiciones };
}

/**
 * El listado mismo (OL-158, bitácora 193): en su propio componente de servidor para que su `<Suspense>` sea
 * independiente de `Barra` y `NavInferior`, que no esperan ninguna consulta.
 */
async function ArtistasContenido({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { ciudad: slug, ...resto } = await searchParams;
  const filtro = filtroDesdeUrl(resto);
  // Las ciudades de Artistas salen de los artistas que hay; la del alta es la elegida aquí y se cambia en el formulario.
  const [ciudades, actual] = await Promise.all([cargarCiudadesDeArtistas(), usuarioActual()]);
  const ciudad: Ciudad = ciudadPorSlug(slug, ciudades);
  // Arriba del listado, solo con sesión (OL-177, pedido del founder 2026-09-24): "Mis artistas" (las fichas que
  // ya gestiona, mismo componente y carga que en Mi perfil — perfil/page.tsx) y, si su correo coincide con el
  // que el CAPO capturó para alguna ficha sin reclamar, un letrero por cada una. Las tres consultas van con la
  // del listado para no atrasar la carga progresiva de la lista (dentro del mismo <Suspense>).
  const [cargado, misArtistas, correoLigado] = await Promise.all([
    cargar(filtro, ciudad.nombre),
    actual ? cargarMisArtistas(actual.perfil.id) : Promise.resolve([] as ArtistaResumen[]),
    actual ? artistasConMiCorreo() : Promise.resolve([]),
  ]);
  // El QR de cada artista ligado, calculado en el servidor: mismo patrón que Mi perfil (OL-154/OL-163).
  const misArtistasConQr = await Promise.all(misArtistas.map(async (artista) => ({ artista, url: `${ORIGEN}${hrefArtista(artista)}`, svg: await qrDeUrl(`${ORIGEN}${hrefArtista(artista)}`) })));
  // Con sesión, los artistas que sigue: la lista los marca y deja seguir al deslizar (bitácora 071).
  const supabase = actual ? await clienteServidor() : null;
  const s = supabase && actual ? await supabase.from("seguimientos").select("artista_id").eq("usuario_id", actual.perfil.id).not("artista_id", "is", null).limit(1000) : null;
  const seguidos = actual ? ((s?.data ?? []) as { artista_id: string }[]).map((x) => x.artista_id) : null;
  const avisos = actual ? { cuenta: actual.perfil.id, preguntado: actual.perfil.avisos_preguntado ?? true, correo: actual.correo ? enmascararCorreo(actual.correo) : "tu correo", llavePush: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "" } : null;
  // Corrección del gestor (OL-177): NO como hermanos antes de <ListaArtistas> — ahí caen entre la Barra (el
  // logotipo, que se esconde al bajar) y el renglón de chips (ui/Cabecera, pegajoso), la cabecera única de
  // OL-087. Van como contenido normal de la página, debajo de esa cabecera completa: se le pasan a
  // ListaArtistas, que los pinta después de `cabecera` y antes de la tira de letras y el conteo.
  const arriba = actual && (
    <>
      {conArtistasLigados(misArtistasConQr) && (
        <div className={styles.misArtistas}>
          <MisArtistas artistas={misArtistasConQr} />
        </div>
      )}
      {correoLigado.map((a) => <LetreroCorreoLigado key={a.id} artista={a} reclamar={reclamarArtista} />)}
    </>
  );
  return (
    <>
      <ListaArtistas {...cargado} filtro={filtro} conChips={cargado.totalCiudad >= UMBRAL_CHIPS_ARTISTAS} pagina={PAGINA_ARTISTAS} conSesion={!!actual} ciudad={ciudad} ciudades={ciudades} seguidos={seguidos} avisos={avisos} arriba={arriba} />
      {/* El filtro y la ciudad viven en la URL; lo que se recuerda al volver de una ficha es el scroll. */}
      <MemoriaPantalla seccion="artistas" />
      <Publicar que="artista" ciudad={ciudad.slug === CIUDAD_INICIAL.slug ? null : ciudad.slug} />
    </>
  );
}

/** Artistas: quiénes hacen la cultura de la ciudad, con su próxima fecha. Decisiones en docs/rediseno/08-artistas-flujo-y-estados.md. */
export default function Artistas({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <main className="raiz">
      <Barra derecha={<Sesion />} />
      <Suspense fallback={<ListaEsqueleto redonda />}>
        <ArtistasContenido searchParams={searchParams} />
      </Suspense>
      <NavInferior />
    </main>
  );
}
