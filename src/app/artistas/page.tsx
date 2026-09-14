import ListaArtistas from "@/components/ListaArtistas";
import NavInferior from "@/components/NavInferior";
import Publicar from "@/components/Publicar";
import Sesion from "@/components/Sesion";
import Barra from "@/components/ui/Barra";
import { conProximaFecha, type ArtistaLista, type ArtistaResumen } from "@/lib/artistas";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
import { nombreSitio } from "@/lib/eventos";
import { desdeReciente } from "@/lib/fechas";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import styles from "./artistas.module.css";

export const metadata = { title: "Artistas · Somos Nosotros" };

type FilaFecha = { artista_id: string; evento: Evento | Evento[] | null };
type Evento = { id: string; inicio: string; sitio_texto: string | null; sitio_reservado: boolean; lugar: { nombre: string } | { nombre: string }[] | null };

/** Los artistas de la ciudad con su fecha más próxima y dónde: lo que dice si tienen vida (decisión 1). */
async function cargar(): Promise<ArtistaLista[]> {
  const supabase = await clienteServidor();
  if (!supabase) return [];
  const [a, f] = await Promise.all([
    supabase.from("artistas").select("id, nombre, disciplina, detalle, tipo, foto").eq("visible", true).eq("ciudad", CIUDAD_INICIAL.nombre).order("nombre"),
    supabase.from("eventos_artistas").select("artista_id, evento:eventos!inner(id, inicio, sitio_texto, sitio_reservado, lugar:lugares(nombre))").eq("evento.visible", true).gte("evento.inicio", desdeReciente()).limit(500),
  ]);
  const fechas = ((f.data ?? []) as unknown as FilaFecha[]).flatMap((fila) => {
    const e = Array.isArray(fila.evento) ? fila.evento[0] : fila.evento;
    if (!e) return [];
    const lugar = Array.isArray(e.lugar) ? (e.lugar[0] ?? null) : e.lugar;
    const sitio = nombreSitio({ lugar: lugar ? { nombre: lugar.nombre, portada: null } : null, sitio_texto: e.sitio_texto, sitio_reservado: e.sitio_reservado });
    return [{ artista_id: fila.artista_id, evento: { id: e.id, inicio: e.inicio, sitio } }];
  });
  return conProximaFecha((a.data ?? []) as ArtistaResumen[], fechas);
}

/** Artistas: quiénes hacen la cultura de la ciudad, con su próxima fecha. Decisiones en docs/rediseno/08-artistas-flujo-y-estados.md. */
export default async function Artistas({ searchParams }: { searchParams: Promise<{ borrado?: string }> }) {
  const { borrado } = await searchParams;
  const [artistas, actual] = await Promise.all([cargar(), usuarioActual()]);
  return (
    <main className="raiz">
      <Barra derecha={<Sesion />} />
      {borrado === "artista" && (
        <p className={styles.aviso} role="status">
          Artista borrado.
        </p>
      )}
      <ListaArtistas artistas={artistas} conSesion={!!actual} />
      <Publicar que="artista" />
      <NavInferior />
    </main>
  );
}
