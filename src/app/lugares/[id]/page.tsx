import Link from "next/link";
import { notFound } from "next/navigation";
import { REDES, enlaceRed, etiquetaTipo, type Lugar } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { cambiarVisible } from "../acciones";
import styles from "./ficha.module.css";

type Params = { params: Promise<{ id: string }>; searchParams?: Promise<{ nuevo?: string }> };

async function cargarLugar(id: string): Promise<(Lugar & { autor: { nombre: string } | null }) | null> {
  const supabase = await clienteServidor();
  if (!supabase || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await supabase
    .from("lugares")
    .select("id, nombre, tipo, direccion, lat, lng, portada, descripcion, ciudad, redes, creado_por, visible, autor:perfiles!lugares_creado_por_fkey(nombre)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const autor = Array.isArray(data.autor) ? (data.autor[0] ?? null) : data.autor;
  return { ...(data as unknown as Lugar), autor: autor as { nombre: string } | null };
}

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  const lugar = await cargarLugar(id);
  return { title: lugar ? `${lugar.nombre} · somosnosotros` : "Lugar · somosnosotros" };
}

export default async function FichaLugar({ params, searchParams }: Params) {
  const { id } = await params;
  const { nuevo } = (await searchParams) ?? {};
  const [lugar, actual] = await Promise.all([cargarLugar(id), usuarioActual()]);
  if (!lugar) notFound();
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

      {lugar.descripcion && <p className={styles.descripcion}>{lugar.descripcion}</p>}

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

      <p className={styles.autor}>Publicado por {lugar.autor?.nombre || "una cuenta borrada"}.</p>

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
        </div>
      )}
    </main>
  );
}
