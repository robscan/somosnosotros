import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { EventoResumen } from "@/lib/eventos";
import { formatearCuando } from "@/lib/fechas";
import { REDES, enlaceRed, etiquetaTipo, type Lugar } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { borrarLugar, cambiarVisible } from "../acciones";
import Borrar from "@/components/Borrar";
import Seguir from "./Seguir";
import Reportar from "@/components/Reportar";
import styles from "./ficha.module.css";

type Params = { params: Promise<{ id: string }>; searchParams?: Promise<{ nuevo?: string; accion?: string; error?: string; borrado?: string }> };

async function cargarLugar(id: string): Promise<(Lugar & { autor: { id: string; nombre: string } | null }) | null> {
  const supabase = await clienteServidor();
  if (!supabase || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await supabase
    .from("lugares")
    .select("id, nombre, tipo, direccion, lat, lng, portada, descripcion, ciudad, redes, creado_por, visible, autor:perfiles!lugares_creado_por_fkey(id, nombre)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const autor = Array.isArray(data.autor) ? (data.autor[0] ?? null) : data.autor;
  return { ...(data as unknown as Lugar), autor: autor as { id: string; nombre: string } | null };
}

async function cargarEventos(lugarId: string): Promise<EventoResumen[]> {
  const supabase = await clienteServidor();
  if (!supabase) return [];
  const desde = new Date(Date.now() - 3 * 3600000).toISOString();
  const { data } = await supabase.from("eventos").select("id, titulo, inicio, fin, imagen, precio, lugar_id, sitio_texto, sitio_reservado").eq("lugar_id", lugarId).eq("visible", true).gte("inicio", desde).order("inicio").limit(30);
  return ((data ?? []) as Omit<EventoResumen, "lugar">[]).map((e) => ({ ...e, lugar: null }));
}

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  const lugar = await cargarLugar(id);
  return { title: lugar ? `${lugar.nombre} · somosnosotros` : "Lugar · somosnosotros" };
}

export default async function FichaLugar({ params, searchParams }: Params) {
  const { id } = await params;
  const { nuevo, accion, error, borrado } = (await searchParams) ?? {};
  const [lugar, actual, eventos] = await Promise.all([cargarLugar(id), usuarioActual(), cargarEventos(id)]);
  if (!lugar) notFound();
  const supabaseSeg = await clienteServidor();
  if (actual && accion === "seguir") {
    await supabaseSeg?.from("seguimientos").upsert({ usuario_id: actual.perfil.id, lugar_id: lugar.id });
    redirect(`/lugares/${lugar.id}`);
  }
  const { data: seguimientos } = (await supabaseSeg?.from("seguimientos").select("usuario_id").eq("lugar_id", id)) ?? { data: [] };
  const seguidores = (seguimientos ?? []).length;
  const sigo = !!actual && (seguimientos ?? []).some((s) => s.usuario_id === actual.perfil.id);
  const puedeEditar = !!actual && (actual.perfil.rol === "admin" || actual.perfil.id === lugar.creado_por);
  const esAdmin = actual?.perfil.rol === "admin";
  const redes = REDES.map((r) => ({ ...r, href: enlaceRed(r.clave, lugar.redes?.[r.clave] ?? "") })).filter((r) => r.href);
  const comoLlegar = `https://www.google.com/maps/dir/?api=1&destination=${lugar.lat},${lugar.lng}`;
  const faltanDetalles = !lugar.descripcion && !lugar.portada && Object.keys(lugar.redes ?? {}).length === 0;

  return (
    <main className="pagina">
      <Link href={`/?lugar=${lugar.id}`} className="enlace-volver">
        ← Ver en el mapa
      </Link>
      {lugar.portada && (
        // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
        <img src={lugar.portada} alt="" className={styles.portada} />
      )}
      {nuevo === "1" && (
        <div className={styles.publicado} role="status">
          <p>
            <strong>Publicado.</strong> Ya está en el mapa.
          </p>
          <div className={styles.publicadoAcciones}>
            <Link href="/lugares/nuevo" className={styles.botonPrincipal}>
              Registrar otro lugar
            </Link>
            {puedeEditar && faltanDetalles && (
              <Link href={`/lugares/${lugar.id}/editar`} className={styles.botonEnlace}>
                Completar detalles
              </Link>
            )}
          </div>
        </div>
      )}
      {nuevo !== "1" && puedeEditar && faltanDetalles && (
        <p className={styles.nota}>
          Aún sin descripción, redes ni foto. <Link href={`/lugares/${lugar.id}/editar`}>Completar</Link>
        </p>
      )}
      {error === "tiene-eventos" && (
        <p className="aviso-error" role="alert">
          Este lugar tiene eventos publicados por otras personas; no se puede borrar. Si ya no existe, ocúltalo o avisa al administrador.
        </p>
      )}
      {error === "borrar" && (
        <p className="aviso-error" role="alert">
          No se pudo borrar. ¿Sigues con sesión y es tu lugar?
        </p>
      )}
      {borrado === "evento" && (
        <p className="aviso-ok" role="status">
          Evento borrado.
        </p>
      )}
      {!lugar.visible && (
        <p className="aviso-error" role="status">
          Este lugar está oculto: solo lo ven su autor y el administrador.
        </p>
      )}
      <h1 className="titulo">{lugar.nombre}</h1>
      <p className="subtitulo">{etiquetaTipo(lugar.tipo)}</p>

      {lugar.direccion && <p className={styles.direccion}>{lugar.direccion}</p>}
      <a href={comoLlegar} className={styles.botonEnlace} target="_blank" rel="noopener noreferrer">
        Cómo llegar
      </a>
      <Seguir lugarId={lugar.id} sigo={sigo} seguidores={seguidores} conSesion={!!actual} />

      {lugar.descripcion && <p className={styles.descripcion}>{lugar.descripcion}</p>}

      <section className={styles.eventos} aria-label="Eventos">
        <div className={styles.eventosCabecera}>
          <h2 className={styles.eventosTitulo}>Eventos</h2>
          <Link href={actual ? `/eventos/nuevo?lugar=${lugar.id}` : `/entrar?siguiente=${encodeURIComponent(`/eventos/nuevo?lugar=${lugar.id}`)}`} className={styles.botonEnlace}>
            + Publicar un evento aquí
          </Link>
        </div>
        {eventos.length === 0 ? (
          <p className={styles.nota}>Aún no hay eventos próximos aquí.</p>
        ) : (
          <ul className={styles.listaEventos}>
            {eventos.map((e) => (
              <li key={e.id}>
                <Link href={`/eventos/${e.id}`} className={styles.evento}>
                  <span className={styles.eventoCuando}>{formatearCuando(e.inicio, e.fin)}</span>
                  <strong>{e.titulo}</strong>
                  <span className={styles.eventoPrecio}>{e.precio ?? "Gratis"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {redes.length > 0 && (
        <ul className={styles.redes} aria-label="Redes y contacto">
          {redes.map((r) => (
            <li key={r.clave}>
              <a href={r.href!} target="_blank" rel="noopener noreferrer">
                {r.etiqueta}
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.autor}>
        Publicado por {lugar.autor ? <Link href={`/personas/${lugar.autor.id}`}>{lugar.autor.nombre}</Link> : "una cuenta borrada"}. <Reportar tipo="lugar" objetoId={lugar.id} volver={`/lugares/${lugar.id}`} conSesion={!!actual} />
      </div>

      {puedeEditar && (
        <div className={styles.acciones}>
          <Link href={`/lugares/${lugar.id}/editar`} className={styles.botonEnlace}>
            Editar
          </Link>
          {esAdmin && (
            <form action={cambiarVisible.bind(null, lugar.id, !lugar.visible)}>
              <button type="submit" className={styles.botonSuave}>
                {lugar.visible ? "Ocultar del mapa" : "Volver a mostrar"}
              </button>
            </form>
          )}
          <Borrar que="el lugar" aviso={eventos.length > 0 ? `Se borra el lugar y sus ${eventos.length === 1 ? "1 evento próximo" : `${eventos.length} eventos próximos`} (y los pasados).` : "Se borra el lugar."} accion={borrarLugar.bind(null, lugar.id)} />
        </div>
      )}
    </main>
  );
}
