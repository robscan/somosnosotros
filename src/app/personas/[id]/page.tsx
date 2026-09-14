import Barra from "@/components/ui/Barra";
import { notFound } from "next/navigation";
import { formatearCuando } from "@/lib/fechas";
import { nombreSitio, type EventoResumen } from "@/lib/eventos";
import { etiquetaTipo } from "@/lib/lugares";
import { clienteServidor, type Perfil } from "@/lib/supabase/servidor";
import Tarjeta from "@/components/ui/Tarjeta";
import styles from "./perfil.module.css";

type Params = { params: Promise<{ id: string }> };

async function cargar(id: string) {
  const supabase = await clienteServidor();
  if (!supabase || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data: perfil } = await supabase.from("perfiles").select("id, nombre, foto, colonia, bio, rol").eq("id", id).maybeSingle();
  if (!perfil) return null;
  const desde = new Date(Date.now() - 3 * 3600000).toISOString();
  const [{ data: sigue }, { data: va }] = await Promise.all([
    supabase.from("seguimientos").select("lugar:lugares(id, nombre, tipo, portada)").eq("usuario_id", id),
    supabase.from("asistencias").select("evento:eventos(id, titulo, inicio, fin, imagen, precio, lugar_id, sitio_texto, sitio_reservado, lugar:lugares(nombre, portada))").eq("usuario_id", id).eq("estado", "voy"),
  ]);
  const lugares = (sigue ?? []).map((s) => (Array.isArray(s.lugar) ? s.lugar[0] : s.lugar)).filter(Boolean) as { id: string; nombre: string; tipo: string; portada: string | null }[];
  const eventos = (va ?? [])
    .map((a) => (Array.isArray(a.evento) ? a.evento[0] : a.evento))
    .filter((e): e is NonNullable<typeof e> => !!e && e.inicio >= desde)
    .map((e) => ({ ...e, lugar: Array.isArray(e.lugar) ? (e.lugar[0] ?? null) : e.lugar }) as unknown as EventoResumen)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  return { perfil: perfil as Perfil, lugares, eventos };
}

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  const d = await cargar(id);
  return { title: d ? `${d.perfil.nombre} · Somos Nosotros` : "Persona · Somos Nosotros" };
}

/** Perfil público: quién es, qué lugares sigue y a qué eventos va. Es la forma de reconocerse. */
export default async function PaginaPersona({ params }: Params) {
  const { id } = await params;
  const d = await cargar(id);
  if (!d) notFound();
  const { perfil, lugares, eventos } = d;
  return (
    <main className="pagina">
      <Barra volver={{ href: "/", texto: "Agenda" }} />
      <div className={styles.cabecera}>
        {perfil.foto ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
          <img src={perfil.foto} alt="" className={styles.avatar} />
        ) : (
          <span className={styles.avatar}>{(perfil.nombre || "?").slice(0, 1).toUpperCase()}</span>
        )}
        <div>
          <h1 className="titulo">{perfil.nombre}</h1>
          {perfil.colonia && <p className={styles.dato}>{perfil.colonia}</p>}
        </div>
      </div>
      {perfil.bio && <p className={styles.bio}>{perfil.bio}</p>}

      <section className={styles.seccion} aria-label="Eventos a los que va">
        <h2 className={styles.tituloSeccion}>Va a</h2>
        {eventos.length === 0 ? (
          <p className={styles.vacio}>Todavía no ha dicho que va a ningún evento.</p>
        ) : (
          <ul className={styles.lista}>
            {eventos.map((e) => (
              <li key={e.id}>
                <Tarjeta href={`/eventos/${e.id}`} arriba={formatearCuando(e.inicio, e.fin)} titulo={e.titulo} detalle={nombreSitio(e)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.seccion} aria-label="Lugares que sigue">
        <h2 className={styles.tituloSeccion}>Sigue</h2>
        {lugares.length === 0 ? (
          <p className={styles.vacio}>Todavía no sigue ningún lugar.</p>
        ) : (
          <ul className={styles.lista}>
            {lugares.map((l) => (
              <li key={l.id}>
                <Tarjeta href={`/lugares/${l.id}`} titulo={l.nombre} detalle={etiquetaTipo(l.tipo)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
