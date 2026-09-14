import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Evento, SitioPrivado } from "@/lib/eventos";
import { nombreSitio, textoCompartir } from "@/lib/eventos";
import { formatearCuando, formatearLargo } from "@/lib/fechas";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { cambiarVisibleEvento } from "../acciones";
import BotonCompartir from "./BotonCompartir";
import styles from "./ficha.module.css";

type Params = { params: Promise<{ id: string }>; searchParams?: Promise<{ nuevo?: string }> };
type EventoConLugar = Evento & { lugar: { id: string; nombre: string; direccion: string | null; lat: number; lng: number; portada: string | null } | null; autor: { nombre: string } | null };

const ORIGEN = "https://somosnosotros.org";

async function cargarEvento(id: string): Promise<EventoConLugar | null> {
  const supabase = await clienteServidor();
  if (!supabase || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await supabase
    .from("eventos")
    .select("*, lugar:lugares(id, nombre, direccion, lat, lng, portada), autor:perfiles!eventos_creado_por_fkey(nombre)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const fila = data as unknown as EventoConLugar & { lugar: unknown; autor: unknown };
  const lugar = Array.isArray(fila.lugar) ? (fila.lugar[0] ?? null) : fila.lugar;
  const autor = Array.isArray(fila.autor) ? (fila.autor[0] ?? null) : fila.autor;
  return { ...fila, lugar: lugar as EventoConLugar["lugar"], autor: autor as EventoConLugar["autor"] };
}

/** La dirección reservada: la base decide si esta persona puede verla (autor, admin, o con sesión cuando toca). */
async function cargarPrivado(id: string): Promise<SitioPrivado | null> {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const { data } = await supabase.from("eventos_sitio_privado").select("direccion, lat, lng, indicaciones, revelar_desde").eq("evento_id", id).maybeSingle();
  return (data as SitioPrivado | null) ?? null;
}

/** Vista previa al compartir (WhatsApp lee estas etiquetas): título, cuándo y dónde, imagen. */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const e = await cargarEvento(id);
  if (!e) return { title: "Evento · somosnosotros" };
  const cuando = formatearLargo(e.inicio);
  const descripcion = `${cuando} · ${nombreSitio({ lugar: e.lugar, sitio_texto: e.sitio_texto, sitio_reservado: e.sitio_reservado })}${e.precio ? ` · ${e.precio}` : " · Gratis"}`;
  const imagen = e.imagen ?? e.lugar?.portada ?? undefined;
  return {
    title: `${e.titulo} · somosnosotros`,
    description: descripcion,
    openGraph: { title: e.titulo, description: descripcion, url: `${ORIGEN}/eventos/${e.id}`, type: "article", images: imagen ? [{ url: imagen }] : undefined, locale: "es_MX", siteName: "somosnosotros" },
    twitter: { card: imagen ? "summary_large_image" : "summary", title: e.titulo, description: descripcion, images: imagen ? [imagen] : undefined },
  };
}

export default async function FichaEvento({ params, searchParams }: Params) {
  const { id } = await params;
  const { nuevo } = (await searchParams) ?? {};
  const [e, actual] = await Promise.all([cargarEvento(id), usuarioActual()]);
  if (!e) notFound();
  const privado = e.sitio_reservado ? await cargarPrivado(id) : null;
  const sitio = nombreSitio({ lugar: e.lugar, sitio_texto: e.sitio_texto, sitio_reservado: e.sitio_reservado });
  const puedeEditar = !!actual && (actual.perfil.rol === "admin" || actual.perfil.id === e.creado_por);
  const esAdmin = actual?.perfil.rol === "admin";
  const url = `${ORIGEN}/eventos/${e.id}`;
  const cuando = formatearCuando(e.inicio, e.fin);
  const texto = textoCompartir(e.titulo, cuando, sitio, url);
  const puntoLlegar = e.lugar ? { lat: e.lugar.lat, lng: e.lugar.lng } : privado?.lat != null && privado?.lng != null ? { lat: privado.lat, lng: privado.lng } : e.sitio_lat != null && e.sitio_lng != null ? { lat: e.sitio_lat, lng: e.sitio_lng } : null;
  const comoLlegar = puntoLlegar ? `https://www.google.com/maps/dir/?api=1&destination=${puntoLlegar.lat},${puntoLlegar.lng}` : null;

  return (
    <main className="pagina">
      <Link href="/" className="enlace-volver">
        ← Agenda
      </Link>
      {nuevo === "1" && (
        <div className={styles.publicado} role="status">
          <p>
            <strong>Publicado.</strong> Ya está en la agenda. Compártelo para que la gente se entere.
          </p>
        </div>
      )}
      {!e.visible && (
        <p className="aviso-error" role="status">
          Este evento está oculto: solo lo ven su autor y el administrador.
        </p>
      )}
      {e.imagen && (
        // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
        <img src={e.imagen} alt="" className={styles.imagen} />
      )}
      <h1 className="titulo">{e.titulo}</h1>
      <p className={styles.cuando}>{formatearLargo(e.inicio)}{e.fin ? ` · hasta ${formatearCuando(e.fin).split(" · ")[1] ?? ""}` : ""}</p>
      <p className={styles.precio}>{e.precio ?? "Gratis"}</p>
      {e.lugar && (
        <p className={styles.donde}>
          <Link href={`/lugares/${e.lugar.id}`}>{e.lugar.nombre}</Link>
          {e.lugar.direccion ? <span className={styles.direccion}>{e.lugar.direccion}</span> : null}
        </p>
      )}
      {!e.lugar && e.sitio_texto && !e.sitio_reservado && (
        <p className={styles.donde}>
          <strong>{e.sitio_texto}</strong>
        </p>
      )}
      {e.sitio_reservado && (
        <div className={styles.reservado}>
          <p className={styles.donde}>
            <strong>{e.sitio_texto}</strong>
            <span className={styles.direccion}>Sitio reservado</span>
          </p>
          {privado ? (
            <p className={styles.privado}>
              {privado.direccion}
              {privado.indicaciones ? <span className={styles.direccion}>{privado.indicaciones}</span> : null}
            </p>
          ) : actual ? (
            <p className={styles.nota}>La dirección exacta se revela aquí el {e.sitio_revelar_desde ? formatearLargo(e.sitio_revelar_desde) : "día del evento"}. Vuelve entonces.</p>
          ) : (
            <p className={styles.nota}>
              La dirección exacta se revela a las personas registradas{e.sitio_revelar_desde ? ` el ${formatearLargo(e.sitio_revelar_desde)}` : ""}.{" "}
              <Link href={`/entrar?siguiente=${encodeURIComponent(`/eventos/${e.id}`)}`}>Entra</Link> para verla cuando toque.
            </p>
          )}
        </div>
      )}

      <div className={styles.acciones}>
        <BotonCompartir titulo={e.titulo} texto={texto.replace(`\n${url}`, "")} url={url} />
        <a href={`/eventos/${e.id}/calendario`} className={styles.botonEnlace}>
          Agregar a mi calendario
        </a>
        {comoLlegar && (
          <a href={comoLlegar} className={styles.botonEnlace} target="_blank" rel="noopener noreferrer">
            Cómo llegar
          </a>
        )}
        {e.enlace && (
          <a href={e.enlace} className={styles.botonEnlace} target="_blank" rel="noopener noreferrer">
            Más información
          </a>
        )}
      </div>

      {e.descripcion && <p className={styles.descripcion}>{e.descripcion}</p>}

      <p className={styles.autor}>Publicado por {e.autor?.nombre || "una cuenta borrada"}.</p>

      {puedeEditar && (
        <div className={styles.gestion}>
          <Link href={`/eventos/${e.id}/editar`} className={styles.botonEnlace}>
            Editar
          </Link>
          <Link href={`/eventos/nuevo?desde=${e.id}`} className={styles.botonEnlace}>
            Duplicar con otra fecha
          </Link>
          {esAdmin && (
            <form action={cambiarVisibleEvento.bind(null, e.id, e.lugar_id, !e.visible)}>
              <button type="submit" className={styles.botonSuave}>
                {e.visible ? "Ocultar de la agenda" : "Volver a mostrar"}
              </button>
            </form>
          )}
        </div>
      )}
    </main>
  );
}
