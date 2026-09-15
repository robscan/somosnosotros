import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Fragment } from "react";
import Borrar from "@/components/Borrar";
import BotonCompartir from "@/components/BotonCompartir";
import Cartel from "@/components/Cartel";
import Desplegable from "@/components/Desplegable";
import RenglonEvento from "@/components/RenglonEvento";
import Reportar from "@/components/Reportar";
import Seguir from "@/components/Seguir";
import Barra from "@/components/ui/Barra";
import { IconoCalendario, IconoCompartir, IconoPersonas } from "@/components/ui/Iconos";
import IconoRed from "@/components/ui/IconoRed";
import MenuAcciones from "@/components/ui/MenuAcciones";
import ficha from "@/components/ui/Ficha.module.css";
import { agruparPorDia, type EventoAgenda } from "@/lib/agenda";
import { etiquetaArtista, textoProximaFecha, type Artista } from "@/lib/artistas";
import { enmascararCorreo } from "@/lib/comunidad";
import { nombreSitio } from "@/lib/eventos";
import { desdeReciente } from "@/lib/fechas";
import { etiquetaEnlace, normalizarRedes } from "@/lib/enlaces";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { borrarArtista, cambiarSeguimientoArtista, cambiarVisibleArtista } from "../acciones";
import EsMiNombre from "./EsMiNombre";
import styles from "./ficha.module.css";

type Params = { params: Promise<{ id: string }>; searchParams?: Promise<{ nuevo?: string; accion?: string; error?: string }> };
type ArtistaConAutor = Artista & { autor: { id: string; nombre: string } | null };
type FilaEvento = Omit<EventoAgenda, "lugar" | "van" | "lat" | "lng"> & { lugar: { nombre: string; portada: string | null; lat: number; lng: number } | { nombre: string; portada: string | null; lat: number; lng: number }[] | null };

const ORIGEN = "https://somosnosotros.org";

async function cargarArtista(id: string): Promise<ArtistaConAutor | null> {
  const supabase = await clienteServidor();
  if (!supabase || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await supabase
    .from("artistas")
    .select("id, nombre, disciplina, detalle, tipo, foto, descripcion, ciudad, redes, creado_por, visible, autor:perfiles!artistas_creado_por_fkey(id, nombre)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const autor = Array.isArray(data.autor) ? (data.autor[0] ?? null) : data.autor;
  return { ...(data as unknown as Artista), autor: autor as ArtistaConAutor["autor"] };
}

/** Las fechas próximas en las que se presenta, con su sitio y cuántos van, listas para el renglón de la agenda (decisión 8). */
async function cargarFechas(artistaId: string): Promise<EventoAgenda[]> {
  const supabase = await clienteServidor();
  if (!supabase) return [];
  const { data } = await supabase
    .from("eventos")
    .select("id, titulo, inicio, fin, imagen, precio, lugar_id, sitio_texto, sitio_reservado, creado_en, lugar:lugares(nombre, portada, lat, lng), eventos_artistas!inner(artista_id)")
    .eq("eventos_artistas.artista_id", artistaId)
    .eq("visible", true)
    .gte("inicio", desdeReciente())
    .order("inicio")
    .limit(30);
  const filas = (data ?? []) as unknown as FilaEvento[];
  if (filas.length === 0) return [];
  const { data: a } = await supabase
    .from("asistencias")
    .select("evento_id")
    .eq("estado", "voy")
    .in(
      "evento_id",
      filas.map((f) => f.id),
    );
  const van = new Map<string, number>();
  for (const f of a ?? []) van.set(f.evento_id as string, (van.get(f.evento_id as string) ?? 0) + 1);
  return filas.map((f) => {
    const lugar = Array.isArray(f.lugar) ? (f.lugar[0] ?? null) : f.lugar;
    return { ...f, lugar, lat: null, lng: null, van: van.get(f.id) ?? 0 };
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const a = await cargarArtista(id);
  if (!a) return { title: "Artista · Somos Nosotros" };
  const descripcion = etiquetaArtista(a);
  return {
    title: `${a.nombre} · Somos Nosotros`,
    description: descripcion,
    openGraph: { title: a.nombre, description: descripcion, url: `${ORIGEN}/artistas/${a.id}`, type: "profile", images: a.foto ? [{ url: a.foto }] : undefined, locale: "es_MX", siteName: "Somos Nosotros" },
  };
}

/** Ficha de artista: decisiones 6 a 11 y 15 de docs/rediseno/08-artistas-flujo-y-estados.md. */
export default async function FichaArtista({ params, searchParams }: Params) {
  const { id } = await params;
  const { nuevo, accion, error } = (await searchParams) ?? {};
  const [a, actual] = await Promise.all([cargarArtista(id), usuarioActual()]);
  if (!a) notFound();
  const supabase = await clienteServidor();
  // Venía de entrar con la intención de seguir: se aplica sola.
  if (actual && accion === "seguir") {
    await supabase?.from("seguimientos").upsert({ usuario_id: actual.perfil.id, artista_id: a.id }, { onConflict: "usuario_id,artista_id", ignoreDuplicates: true });
    redirect(`/artistas/${a.id}`);
  }
  const [fechas, seg, lig] = await Promise.all([
    cargarFechas(a.id),
    supabase?.from("seguimientos").select("usuario_id").eq("artista_id", a.id) ?? Promise.resolve({ data: [] as { usuario_id: string }[] }),
    supabase?.from("artistas_cuentas").select("perfil_id").eq("artista_id", a.id) ?? Promise.resolve({ data: [] as { perfil_id: string }[] }),
  ]);
  const seguimientos = (seg.data ?? []) as { usuario_id: string }[];
  const ligados = (lig.data ?? []) as { perfil_id: string }[];
  const seguidores = seguimientos.length;
  const sigo = !!actual && seguimientos.some((s) => s.usuario_id === actual.perfil.id);
  const esAdmin = actual?.perfil.rol === "admin";
  const esAutor = !!actual && actual.perfil.id === a.creado_por;
  const estaLigado = !!actual && ligados.some((l) => l.perfil_id === actual.perfil.id);
  const puedeEditar = esAdmin || esAutor || estaLigado;
  const puedeBorrar = esAdmin || esAutor;
  const redes = normalizarRedes(a.redes);
  const faltanDetalles = a.disciplina === "por_completar" || (!a.descripcion && !a.foto && redes.length === 0);
  const url = `${ORIGEN}/artistas/${a.id}`;
  const textoCompartir = `${a.nombre} · ${etiquetaArtista(a)}`;
  const hrefPublicarFecha = actual ? `/eventos/nuevo?artista=${a.id}` : `/entrar?siguiente=${encodeURIComponent(`/eventos/nuevo?artista=${a.id}`)}`;
  const grupos = agruparPorDia(fechas);
  const proxima = fechas[0] ? { id: fechas[0].id, inicio: fechas[0].inicio, sitio: nombreSitio(fechas[0]) } : null;
  const avisoBorrar = fechas.length > 0 ? `Se borra la ficha; sus ${fechas.length === 1 ? "1 fecha próxima se queda" : `${fechas.length} fechas próximas se quedan`} sin artista.` : "Se borra la ficha.";
  const correo = actual?.correo ? enmascararCorreo(actual.correo) : "tu correo";

  return (
    <main className={ficha.pagina}>
      <Barra
        volver={{ href: "/artistas", texto: "Artistas" }}
        derecha={
          <MenuAcciones>
            {puedeEditar && (
              <li>
                <Link href={`/artistas/${a.id}/editar`} className={ficha.menuItem}>
                  Editar
                </Link>
              </li>
            )}
            {esAdmin && (
              <li>
                <form action={cambiarVisibleArtista.bind(null, a.id, !a.visible)}>
                  <button type="submit" className={ficha.menuItem}>
                    {a.visible ? "Ocultar de Artistas" : "Volver a mostrar"}
                  </button>
                </form>
              </li>
            )}
            <li className={ficha.menuItem}>
              <Reportar tipo="artista" objetoId={a.id} volver={`/artistas/${a.id}`} conSesion={!!actual} />
            </li>
            {!puedeEditar && (
              <li className={ficha.menuItem}>
                <EsMiNombre artistaId={a.id} nombre={a.nombre} conSesion={!!actual} correo={correo} />
              </li>
            )}
            {puedeBorrar && (
              <li className={ficha.menuItem}>
                <Borrar que="la ficha" aviso={avisoBorrar} accion={borrarArtista.bind(null, a.id)} />
              </li>
            )}
          </MenuAcciones>
        }
      />
      {/* Volvió de entrar con "Es mi nombre" en la mano: la hoja se abre sola. */}
      {actual && accion === "mio" && !puedeEditar && <EsMiNombre artistaId={a.id} nombre={a.nombre} conSesion correo={correo} soloHoja />}
      {nuevo === "1" && (
        <div className={ficha.publicado} role="status">
          <div>
            <b>Publicado.</b>Ya está en Artistas.
          </div>
          {puedeEditar && faltanDetalles ? (
            <Link href={`/artistas/${a.id}/editar`} className={ficha.publicadoBoton}>
              Completar
            </Link>
          ) : (
            <BotonCompartir titulo={a.nombre} texto={textoCompartir} url={url} className={ficha.publicadoBoton}>
              Compartir
            </BotonCompartir>
          )}
        </div>
      )}
      {nuevo !== "1" && puedeEditar && faltanDetalles && (
        <p className={styles.nota}>
          {a.disciplina === "por_completar" ? "Esta ficha se creó con solo el nombre." : "Aún sin descripción, redes ni foto."} <Link href={`/artistas/${a.id}/editar`}>Completar</Link>
        </p>
      )}
      {error === "borrar" && (
        <p className="aviso-error" role="alert">
          No se pudo borrar. ¿Sigues con sesión y es tu ficha?
        </p>
      )}
      {!a.visible && (
        <p className={`aviso-error ${ficha.oculto}`} role="status">
          Esta ficha está oculta: solo la ven su autor, su cuenta ligada y el administrador.
        </p>
      )}

      {a.foto && <Cartel src={a.foto} alt={`Foto de ${a.nombre}`} />}
      <h1 className={`${ficha.titulo} ${ficha.tituloConEtiqueta}`}>{a.nombre}</h1>
      <p className={ficha.etiqueta}>{etiquetaArtista(a)}</p>

      <ul className={ficha.datos}>
        <li className={ficha.dato}>
          <IconoPersonas width={20} height={20} />
          <b>{seguidores === 0 ? "Nadie lo sigue todavía" : seguidores === 1 ? "1 persona lo sigue" : `${seguidores} personas lo siguen`}</b>
        </li>
        <li className={ficha.dato}>
          <IconoCalendario width={20} height={20} />
          <b>{proxima ? textoProximaFecha(proxima) : "Sin fechas próximas"}</b>
          {proxima && (
            <a href="#fechas" className={ficha.datoEnlace}>
              ver
            </a>
          )}
        </li>
      </ul>

      <div className={ficha.acciones}>
        <BotonCompartir titulo={a.nombre} texto={textoCompartir} url={url} className={ficha.accion}>
          <IconoCompartir />
          Compartir
        </BotonCompartir>
        {redes.map((r) => (
          <a key={r.url} href={r.url} className={ficha.accion} target="_blank" rel="noopener noreferrer">
            <IconoRed red={r.red} />
            {etiquetaEnlace(r)}
          </a>
        ))}
      </div>

      {a.descripcion && <Desplegable texto={a.descripcion} />}

      <section className={styles.fechas} id="fechas" aria-label="Se presenta en">
        <h2>
          Se presenta en
          {fechas.length > 0 && <span> · {fechas.length}</span>}
        </h2>
        {fechas.length === 0 && <p className={styles.vacio}>Aún no tiene fechas publicadas. ¿Sabes de una? Publícala.</p>}
        {grupos.map((g) => (
          <Fragment key={g.clave}>
            <h3>{g.titulo}</h3>
            <ul aria-label={g.titulo}>
              {g.eventos.map((e) => (
                <RenglonEvento key={e.id} evento={e} />
              ))}
            </ul>
          </Fragment>
        ))}
        <Link href={hrefPublicarFecha} className={styles.publicarFecha}>
          Publicar una fecha de {a.nombre}
        </Link>
      </section>

      <p className={ficha.autor}>Registrado por {a.autor ? <Link href={`/personas/${a.autor.id}`}>{a.autor.nombre}</Link> : "una cuenta borrada"}.</p>

      <Seguir
        que="artista"
        nombre={a.nombre}
        sigo={sigo}
        conSesion={!!actual}
        accion={cambiarSeguimientoArtista.bind(null, a.id)}
        hrefEntrar={`/artistas/${a.id}?accion=seguir`}
        avisosPreguntado={actual?.perfil.avisos_preguntado ?? true}
        avisosCorreo={actual?.perfil.avisos_correo ?? false}
        avisosPush={actual?.perfil.avisos_push ?? false}
        correo={correo}
        llavePush={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
      />
    </main>
  );
}
