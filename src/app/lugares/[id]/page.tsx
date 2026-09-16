import { esUuid } from "@/lib/formulario";
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
import Barra from "@/components/ui/Barra";
import Boton from "@/components/ui/Boton";
import { IconoCalendario, IconoCompartir, IconoPersonas, IconoPin, IconoRuta } from "@/components/ui/Iconos";
import IconoRed from "@/components/ui/IconoRed";
import MenuAcciones from "@/components/ui/MenuAcciones";
import ficha from "@/components/ui/Ficha.module.css";
import { agruparPorDia, type EventoAgenda } from "@/lib/agenda";
import { enmascararCorreo } from "@/lib/comunidad";
import { filtroSinPasar } from "@/lib/fechas";
import { etiquetaEnlace, normalizarRedes } from "@/lib/enlaces";
import { etiquetaLugar, etiquetaTipo, textoProximo, type Lugar } from "@/lib/lugares";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import Seguir from "@/components/Seguir";
import { borrarLugar, cambiarSeguimiento, cambiarVisible } from "../acciones";
import styles from "@/components/ui/FichaLista.module.css";

type Params = { params: Promise<{ id: string }>; searchParams?: Promise<{ nuevo?: string; accion?: string; error?: string }> };
type LugarConAutor = Lugar & { autor: { id: string; nombre: string } | null };

const ORIGEN = "https://somosnosotros.org";

async function cargarLugar(id: string): Promise<LugarConAutor | null> {
  const supabase = await clienteServidor();
  if (!supabase || !esUuid(id)) return null;
  const { data } = await supabase
    .from("lugares")
    .select("id, nombre, tipo, direccion, lat, lng, portada, descripcion, ciudad, redes, creado_por, visible, origen, autor:perfiles!lugares_creado_por_fkey(id, nombre)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const autor = Array.isArray(data.autor) ? (data.autor[0] ?? null) : data.autor;
  return { ...(data as unknown as Lugar), autor: autor as LugarConAutor["autor"] };
}

/** Los eventos próximos del lugar, con cuántos van, listos para el renglón de la agenda. */
async function cargarEventos(lugar: Lugar): Promise<EventoAgenda[]> {
  const supabase = await clienteServidor();
  if (!supabase) return [];
  const { data } = await supabase.from("eventos").select("id, titulo, inicio, fin, imagen, precio, lugar_id, sitio_texto, sitio_reservado, creado_en").eq("lugar_id", lugar.id).eq("visible", true).or(filtroSinPasar()).order("inicio").limit(30);
  const filas = (data ?? []) as Omit<EventoAgenda, "lugar" | "van" | "lat" | "lng">[];
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
  return filas.map((f) => ({ ...f, lugar: { nombre: lugar.nombre, portada: lugar.portada }, lat: lugar.lat, lng: lugar.lng, van: van.get(f.id) ?? 0 }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const lugar = await cargarLugar(id);
  if (!lugar) return { title: "Lugar · Somos Nosotros" };
  const descripcion = `${etiquetaTipo(lugar.tipo)}${lugar.direccion ? ` · ${lugar.direccion}` : ""}`;
  return {
    title: `${lugar.nombre} · Somos Nosotros`,
    description: descripcion,
    openGraph: { title: lugar.nombre, description: descripcion, url: `${ORIGEN}/lugares/${lugar.id}`, type: "website", images: lugar.portada ? [{ url: lugar.portada }] : undefined, locale: "es_MX", siteName: "Somos Nosotros" },
  };
}

export default async function FichaLugar({ params, searchParams }: Params) {
  const { id } = await params;
  const { nuevo, accion, error } = (await searchParams) ?? {};
  const [lugar, actual] = await Promise.all([cargarLugar(id), usuarioActual()]);
  if (!lugar) notFound();
  const supabase = await clienteServidor();
  // Venía de entrar con la intención de seguir: se aplica sola.
  if (actual && accion === "seguir") {
    await supabase?.from("seguimientos").upsert({ usuario_id: actual.perfil.id, lugar_id: lugar.id }, { onConflict: "usuario_id,lugar_id", ignoreDuplicates: true });
    redirect(`/lugares/${lugar.id}`);
  }
  // Cuántos lo siguen se cuenta en la base; si yo lo sigo, una fila como mucho (nunca la lista entera).
  const [eventos, cuenta, mio] = await Promise.all([
    cargarEventos(lugar),
    supabase?.rpc("cuenta_seguidores", { p_lugar: id }) ?? Promise.resolve({ data: 0 }),
    actual && supabase ? supabase.from("seguimientos").select("usuario_id").eq("lugar_id", id).eq("usuario_id", actual.perfil.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const seguidores = Number(cuenta.data ?? 0); // cuenta también a quien tiene el perfil reservado
  const sigo = !!mio.data;
  const puedeEditar = !!actual && (actual.perfil.rol === "admin" || actual.perfil.id === lugar.creado_por);
  const esAdmin = actual?.perfil.rol === "admin";
  const redes = normalizarRedes(lugar.redes);
  const faltanDetalles = !lugar.descripcion && !lugar.portada && redes.length === 0;
  const url = `${ORIGEN}/lugares/${lugar.id}`;
  const hrefPublicarAqui = actual ? `/eventos/nuevo?lugar=${lugar.id}` : `/entrar?siguiente=${encodeURIComponent(`/eventos/nuevo?lugar=${lugar.id}`)}`;
  const grupos = agruparPorDia(eventos);
  const avisoBorrar = eventos.length > 0 ? `Se borra el lugar y sus ${eventos.length === 1 ? "1 evento próximo" : `${eventos.length} eventos próximos`} (y los pasados).` : "Se borra el lugar.";

  return (
    <main className={ficha.pagina}>
      <Barra
        volver={{ href: "/lugares", texto: "Lugares" }}
        derecha={
          <MenuAcciones>
            {puedeEditar && (
              <li>
                <Link href={`/lugares/${lugar.id}/editar`} className={ficha.menuItem}>
                  Editar
                </Link>
              </li>
            )}
            {esAdmin && (
              <li>
                <form action={cambiarVisible.bind(null, lugar.id, !lugar.visible)}>
                  <button type="submit" className={ficha.menuItem}>
                    {lugar.visible ? "Ocultar del mapa" : "Volver a mostrar"}
                  </button>
                </form>
              </li>
            )}
            <li className={ficha.menuItem}>
              <Reportar tipo="lugar" objetoId={lugar.id} volver={`/lugares/${lugar.id}`} conSesion={!!actual} />
            </li>
            {puedeEditar && (
              <li className={ficha.menuItem}>
                <Borrar que="el lugar" icono="lugar" aviso={avisoBorrar} accion={borrarLugar.bind(null, lugar.id)} />
              </li>
            )}
          </MenuAcciones>
        }
      />
      {nuevo === "1" && (
        <div className={ficha.publicado} role="status">
          <b>Publicado.</b>
          Ya está en Lugares.
          {puedeEditar && faltanDetalles ? (
            <Link href={`/lugares/${lugar.id}/editar`} className={ficha.publicadoBoton}>
              Completar
            </Link>
          ) : (
            <BotonCompartir titulo={lugar.nombre} texto={`${lugar.nombre} · ${etiquetaTipo(lugar.tipo)}`} url={url} className={ficha.publicadoBoton}>
              Compartir
            </BotonCompartir>
          )}
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
      {lugar.privado ? (
        <p className={`aviso-ok ${ficha.oculto}`} role="status">
          Lugar privado: solo lo ves tú. No sale en el mapa ni en la lista para nadie más.
        </p>
      ) : (
        !lugar.visible && (
          <p className={`aviso-error ${ficha.oculto}`} role="status">
            Este lugar está oculto: solo lo ven su autor y el administrador.
          </p>
        )
      )}

      {lugar.portada && <Cartel src={lugar.portada} alt={`Portada de ${lugar.nombre}`} />}
      <h1 className={`${ficha.titulo} ${ficha.tituloConEtiqueta}`}>{lugar.nombre}</h1>
      <p className={ficha.etiqueta}>{etiquetaLugar(lugar)}</p>

      <ul className={ficha.datos}>
        <li className={ficha.dato}>
          <IconoPin width={20} height={20} />
          <b>{lugar.direccion ?? "Sin dirección"}</b>
        </li>
        {/* Sin eventos ni seguidores: una sola línea en gris; las dos negaciones no merecen dos renglones. */}
        {seguidores === 0 && !eventos[0] ? (
          <li className={ficha.dato}>
            <IconoCalendario width={20} height={20} />
            <span className={ficha.suave}>Sin eventos próximos · Nadie lo sigue todavía</span>
          </li>
        ) : (
          <>
            <li className={ficha.dato}>
              <IconoPersonas width={20} height={20} />
              <b>{seguidores === 0 ? "Nadie lo sigue todavía" : seguidores === 1 ? "1 persona lo sigue" : `${seguidores} personas lo siguen`}</b>
            </li>
            <li className={ficha.dato}>
              <IconoCalendario width={20} height={20} />
              <b>{eventos[0] ? textoProximo(eventos[0].inicio) : "Sin eventos próximos"}</b>
              {eventos[0] && (
                <a href="#eventos" className={ficha.datoEnlace}>
                  ver
                </a>
              )}
            </li>
          </>
        )}
      </ul>

      <div className={ficha.acciones}>
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${lugar.lat},${lugar.lng}`} className={ficha.accion} target="_blank" rel="noopener noreferrer">
          <IconoRuta />
          Cómo llegar
        </a>
        <BotonCompartir titulo={lugar.nombre} texto={`${lugar.nombre} · ${etiquetaTipo(lugar.tipo)}${lugar.direccion ? ` · ${lugar.direccion}` : ""}`} url={url} className={ficha.accion}>
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

      {lugar.descripcion && <Desplegable texto={lugar.descripcion} />}

      <section className={styles.lista} id="eventos" aria-label="Próximos eventos">
        <h2>
          Próximos eventos
          {eventos.length > 0 && <span> · {eventos.length}</span>}
        </h2>
        {eventos.length === 0 && <p className={styles.vacio}>Aún no hay eventos aquí. ¿Organizas algo? Publícalo.</p>}
        {grupos.map((g) => (
          <Fragment key={g.clave}>
            <h3>{g.titulo}</h3>
            <ul aria-label={g.titulo}>
              {g.eventos.map((e) => (
                <RenglonEvento key={e.id} evento={e} sinSitio />
              ))}
            </ul>
          </Fragment>
        ))}
        <Boton href={hrefPublicarAqui} variante="secundario" className={styles.publicar}>
          Publicar un evento aquí
        </Boton>
      </section>

      {/* Sin pie de origen para las fichas del catálogo (decisión del founder, 2026-09-14): solo se dice quién la publicó cuando hay quién. */}
      {!(lugar.origen && !lugar.autor) && (
        <p className={ficha.autor}>Publicado por {lugar.autor ? <Link href={`/personas/${lugar.autor.id}`}>{lugar.autor.nombre}</Link> : "una cuenta borrada"}.</p>
      )}

      <Seguir
        que="lugar"
        nombre={lugar.nombre}
        sigo={sigo}
        conSesion={!!actual}
        accion={cambiarSeguimiento.bind(null, lugar.id)}
        hrefEntrar={`/lugares/${lugar.id}?accion=seguir`}
        avisosPreguntado={actual?.perfil.avisos_preguntado ?? true}
        avisosCorreo={actual?.perfil.avisos_correo ?? false}
        avisosPush={actual?.perfil.avisos_push ?? false}
        correo={actual?.correo ? enmascararCorreo(actual.correo) : "tu correo"}
        llavePush={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
      />
    </main>
  );
}
