import ListaArtistas from "@/components/ListaArtistas";
import MemoriaPantalla from "@/components/MemoriaPantalla";
import NavInferior from "@/components/NavInferior";
import Publicar from "@/components/Publicar";
import Sesion from "@/components/Sesion";
import Barra from "@/components/ui/Barra";
import { conProximaFecha, DISCIPLINAS, filtroDesdeUrl, ordenarArtistas, PAGINA_ARTISTAS, UMBRAL_CHIPS_ARTISTAS, type ArtistaLista, type ArtistaResumen, type FechaDeArtista, type FiltroLeido } from "@/lib/artistas";
import { CIUDAD_INICIAL, ciudadPorSlug, type Ciudad } from "@/lib/ciudad";
import { cargarCiudadesDeArtistas } from "@/lib/ciudades";
import { enmascararCorreo } from "@/lib/comunidad";
import { nombreSitio } from "@/lib/eventos";
import { filtroSinPasar } from "@/lib/fechas";
import { normalizarNombre } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

export const metadata = { title: "Artistas · Somos Nosotros" };

type FilaFecha = { artista_id: string; evento: Evento | Evento[] | null };
type Evento = { id: string; titulo: string; inicio: string; zona: string; sitio_texto: string | null; sitio_reservado: boolean; lugar: { nombre: string } | { nombre: string }[] | null };
type Opcion = { valor: string; etiqueta: string };
export type Cargado = {
  artistas: ArtistaLista[];
  /** Cuántos cumplen el filtro, se vean o no (la página trae `n`). */
  total: number;
  /** Cuántos hay en la ciudad sin ningún filtro: decide si aparecen la búsqueda y los chips. */
  totalCiudad: number;
  disciplinas: Opcion[];
  detalles: Opcion[];
};

/**
 * Los artistas de la ciudad con su fecha más próxima y dónde (decisión 1), filtrados y paginados en el servidor:
 * la disciplina, el detalle y lo escrito vienen de la URL (revisión 2026-09-14, A2). Los que tienen fecha próxima van
 * primero (todos los que cumplen el filtro); el resto, en orden alfabético real (`nombre_orden`), de `n` en `n`.
 */
async function cargar(f: FiltroLeido, ciudadNombre: string): Promise<Cargado> {
  const vacio: Cargado = { artistas: [], total: 0, totalCiudad: 0, disciplinas: [], detalles: [] };
  const supabase = await clienteServidor();
  if (!supabase) return vacio;
  const ciudad = ciudadNombre;

  const [f1, d1, d2] = await Promise.all([
    // Las filas van por la hora de su evento (`evento(inicio)` ordena las filas; `order` con `referencedTable` solo ordenaba
    // dentro del evento ligado), así el corte de 500 se queda con lo más próximo. Lo que se ordena debe ir en el select.
    supabase.from("eventos_artistas").select("artista_id, evento:eventos!inner(id, titulo, inicio, zona, sitio_texto, sitio_reservado, lugar:lugares(nombre))").eq("evento.visible", true).or(filtroSinPasar(), { referencedTable: "evento" }).order("evento(inicio)").order("evento(titulo)").order("evento(id)").order("artista_id").limit(500),
    supabase.rpc("disciplinas_con_artistas", { p_ciudad: ciudad }),
    f.hace ? supabase.rpc("detalles_de_disciplina", { p_ciudad: ciudad, p_disciplina: f.hace }) : Promise.resolve({ data: [] as { clave: string; etiqueta: string; n: number }[] }),
  ]);
  // Todas las fechas con su sitio; la próxima de cada artista la elige `conProximaFecha`, no el orden de llegada.
  const fechas: FechaDeArtista[] = [];
  for (const fila of (f1.data ?? []) as unknown as FilaFecha[]) {
    const e = Array.isArray(fila.evento) ? fila.evento[0] : fila.evento;
    if (!e) continue;
    const lugar = Array.isArray(e.lugar) ? (e.lugar[0] ?? null) : e.lugar;
    fechas.push({ artista_id: fila.artista_id, evento: { id: e.id, titulo: e.titulo, inicio: e.inicio, zona: e.zona, sitio: nombreSitio({ lugar: lugar ? { nombre: lugar.nombre, portada: null } : null, sitio_texto: e.sitio_texto, sitio_reservado: e.sitio_reservado }) } });
  }
  const conFecha = [...new Set(fechas.map((x) => x.artista_id))];
  const porDisciplina = ((d1.data ?? []) as { disciplina: string; n: number }[]).filter((x) => x.n > 0);
  const totalCiudad = porDisciplina.reduce((s, x) => s + Number(x.n), 0);
  const disciplinas = DISCIPLINAS.filter((d) => porDisciplina.some((x) => x.disciplina === d.valor)).map((d) => ({ ...d, n: Number(porDisciplina.find((x) => x.disciplina === d.valor)?.n ?? 0) }));
  const detalles = ((d2.data ?? []) as { clave: string; etiqueta: string; n: number }[]).length >= 2 ? (d2.data as { clave: string; etiqueta: string; n: number }[]).map((x) => ({ valor: x.clave, etiqueta: x.etiqueta.charAt(0).toUpperCase() + x.etiqueta.slice(1), n: Number(x.n) })) : [];

  const q = f.q ? normalizarNombre(f.q).replace(/[,()]/g, "") : "";
  const base = () => {
    let c = supabase.from("artistas").select("id, nombre, disciplina, detalle, tipo, foto", { count: "exact" }).eq("visible", true).eq("ciudad", ciudad);
    if (f.hace) c = c.eq("disciplina", f.hace);
    if (f.que) c = c.ilike("detalle", f.que.replace(/[%_]/g, ""));
    if (q) c = c.or(`nombre_orden.ilike.%${q}%,detalle.ilike.%${q}%`);
    return c;
  };
  const [a, b] = await Promise.all([
    conFecha.length ? base().in("id", conFecha) : Promise.resolve({ data: [] as ArtistaResumen[], count: 0 }),
    (conFecha.length ? base().not("id", "in", `(${conFecha.join(",")})`) : base()).order("nombre_orden").range(0, f.n - 1),
  ]);
  const primero = ordenarArtistas(conProximaFecha((a.data ?? []) as ArtistaResumen[], fechas));
  const resto = ((b.data ?? []) as ArtistaResumen[]).map((x) => ({ ...x, proxima: null }));
  return { artistas: [...primero, ...resto], total: primero.length + (b.count ?? 0), totalCiudad, disciplinas, detalles };
}

/** Artistas: quiénes hacen la cultura de la ciudad, con su próxima fecha. Decisiones en docs/rediseno/08-artistas-flujo-y-estados.md. */
export default async function Artistas({ searchParams }: { searchParams: Promise<{ ciudad?: string; hace?: string; que?: string; q?: string; n?: string }> }) {
  const { ciudad: slug, ...resto } = await searchParams;
  const filtro = filtroDesdeUrl(resto);
  // Las ciudades de Artistas salen de los artistas que hay; la del alta es la elegida aquí y se cambia en el formulario.
  const [ciudades, actual] = await Promise.all([cargarCiudadesDeArtistas(await clienteServidor()), usuarioActual()]);
  const ciudad: Ciudad = ciudadPorSlug(slug, ciudades);
  const cargado = await cargar(filtro, ciudad.nombre);
  // Con sesión, los artistas que sigue: la lista los marca y deja seguir al deslizar (bitácora 071).
  const supabase = actual ? await clienteServidor() : null;
  const s = supabase && actual ? await supabase.from("seguimientos").select("artista_id").eq("usuario_id", actual.perfil.id).not("artista_id", "is", null).limit(1000) : null;
  const seguidos = actual ? ((s?.data ?? []) as { artista_id: string }[]).map((x) => x.artista_id) : null;
  const avisos = actual ? { preguntado: actual.perfil.avisos_preguntado ?? true, correo: actual.correo ? enmascararCorreo(actual.correo) : "tu correo", llavePush: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "" } : null;
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
