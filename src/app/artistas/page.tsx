import ListaArtistas from "@/components/ListaArtistas";
import NavInferior from "@/components/NavInferior";
import Publicar from "@/components/Publicar";
import Sesion from "@/components/Sesion";
import Barra from "@/components/ui/Barra";
import { DISCIPLINAS, filtroDesdeUrl, ordenarArtistas, PAGINA_ARTISTAS, UMBRAL_CHIPS_ARTISTAS, type ArtistaLista, type ArtistaResumen, type FiltroLeido, type ProximaFecha } from "@/lib/artistas";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
import { nombreSitio } from "@/lib/eventos";
import { desdeReciente } from "@/lib/fechas";
import { normalizarNombre } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import styles from "./artistas.module.css";

export const metadata = { title: "Artistas · Somos Nosotros" };

type FilaFecha = { artista_id: string; evento: Evento | Evento[] | null };
type Evento = { id: string; inicio: string; sitio_texto: string | null; sitio_reservado: boolean; lugar: { nombre: string } | { nombre: string }[] | null };
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
async function cargar(f: FiltroLeido): Promise<Cargado> {
  const vacio: Cargado = { artistas: [], total: 0, totalCiudad: 0, disciplinas: [], detalles: [] };
  const supabase = await clienteServidor();
  if (!supabase) return vacio;
  const ciudad = CIUDAD_INICIAL.nombre;

  const [f1, d1, d2] = await Promise.all([
    supabase.from("eventos_artistas").select("artista_id, evento:eventos!inner(id, inicio, sitio_texto, sitio_reservado, lugar:lugares(nombre))").eq("evento.visible", true).gte("evento.inicio", desdeReciente()).order("inicio", { referencedTable: "eventos" }).limit(500),
    supabase.rpc("disciplinas_con_artistas", { p_ciudad: ciudad }),
    f.hace ? supabase.rpc("detalles_de_disciplina", { p_ciudad: ciudad, p_disciplina: f.hace }) : Promise.resolve({ data: [] as { clave: string; etiqueta: string; n: number }[] }),
  ]);
  // Próxima fecha por artista (la primera, porque vienen ordenadas por inicio).
  const proxima = new Map<string, ProximaFecha>();
  for (const fila of (f1.data ?? []) as unknown as FilaFecha[]) {
    const e = Array.isArray(fila.evento) ? fila.evento[0] : fila.evento;
    if (!e || proxima.has(fila.artista_id)) continue;
    const lugar = Array.isArray(e.lugar) ? (e.lugar[0] ?? null) : e.lugar;
    proxima.set(fila.artista_id, { id: e.id, inicio: e.inicio, sitio: nombreSitio({ lugar: lugar ? { nombre: lugar.nombre, portada: null } : null, sitio_texto: e.sitio_texto, sitio_reservado: e.sitio_reservado }) });
  }
  const conFecha = [...proxima.keys()];
  const porDisciplina = ((d1.data ?? []) as { disciplina: string; n: number }[]).filter((x) => x.n > 0);
  const totalCiudad = porDisciplina.reduce((s, x) => s + Number(x.n), 0);
  const disciplinas = DISCIPLINAS.filter((d) => porDisciplina.some((x) => x.disciplina === d.valor));
  const detalles = ((d2.data ?? []) as { clave: string; etiqueta: string; n: number }[]).length >= 2 ? (d2.data as { clave: string; etiqueta: string }[]).map((x) => ({ valor: x.clave, etiqueta: x.etiqueta.charAt(0).toUpperCase() + x.etiqueta.slice(1) })) : [];

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
  const primero = ordenarArtistas(((a.data ?? []) as ArtistaResumen[]).map((x) => ({ ...x, proxima: proxima.get(x.id) ?? null })));
  const resto = ((b.data ?? []) as ArtistaResumen[]).map((x) => ({ ...x, proxima: null }));
  return { artistas: [...primero, ...resto], total: primero.length + (b.count ?? 0), totalCiudad, disciplinas, detalles };
}

/** Artistas: quiénes hacen la cultura de la ciudad, con su próxima fecha. Decisiones en docs/rediseno/08-artistas-flujo-y-estados.md. */
export default async function Artistas({ searchParams }: { searchParams: Promise<{ borrado?: string; hace?: string; que?: string; q?: string; n?: string }> }) {
  const { borrado, ...resto } = await searchParams;
  const filtro = filtroDesdeUrl(resto);
  const [cargado, actual] = await Promise.all([cargar(filtro), usuarioActual()]);
  return (
    <main className="raiz">
      <Barra derecha={<Sesion />} />
      {borrado === "artista" && (
        <p className={styles.aviso} role="status">
          Artista borrado.
        </p>
      )}
      <ListaArtistas {...cargado} filtro={filtro} conChips={cargado.totalCiudad >= UMBRAL_CHIPS_ARTISTAS} pagina={PAGINA_ARTISTAS} conSesion={!!actual} />
      <Publicar que="artista" />
      <NavInferior />
    </main>
  );
}
