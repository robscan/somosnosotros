import { esUuid } from "@/lib/formulario";
import { cargarDestacado } from "@/app/admin/consultas";
import DestacarFicha from "@/app/admin/DestacarFicha";
import { crearDesdeEvento } from "@/app/admin/obras-colectivas/acciones";
import Link from "next/link";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Fragment } from "react";
import Borrar from "@/components/Borrar";
import BotonCompartir from "@/components/BotonCompartir";
import Cartel from "@/components/Cartel";
import Desplegable from "@/components/Desplegable";
import EnlaceExterno from "@/components/ui/EnlaceExterno";
import MapaFicha from "@/components/MapaFicha";
import Reportar from "@/components/Reportar";
import Barra from "@/components/ui/Barra";
import { IconoBoleto, IconoCalendarioAgregar, IconoCompartir, IconoEstrella, IconoPersonas, IconoPin, IconoReloj, IconoRuta } from "@/components/ui/Iconos";
import MenuAcciones from "@/components/ui/MenuAcciones";
import Salto from "@/components/ui/Salto";
import ficha from "@/components/ui/Ficha.module.css";
import { cargarQuien } from "@/app/artistas/consultas";
import { enmascararCorreo, type Asistente } from "@/lib/comunidad";
import { puedeDestacarse } from "@/lib/destacados";
import { jsonLdMigajas } from "@/lib/estructurados";
import type { Evento, SitioPrivado } from "@/lib/eventos";
import { direccionPublicaSitio, enlaceComoLlegar, hrefEvento, jsonLdEvento, nombreSitio, puntoComoLlegar, textoCompartir } from "@/lib/eventos";
import { hrefLugar } from "@/lib/lugares";
import { hrefArtista } from "@/lib/artistas";
import { eventoPaso, formatearCuando, formatearLargo } from "@/lib/fechas";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { borrarEvento, cambiarVisibleEvento, type EstadoAsistencia } from "../acciones";
import Asistencia from "./Asistencia";
import QuienVa from "./QuienVa";
import styles from "./ficha.module.css";

type Params = { params: Promise<{ id: string }>; searchParams?: Promise<{ nuevo?: string; accion?: string; error?: string }> };
type EventoConLugar = Evento & { lugar: { id: string; slug: string; nombre: string; direccion: string | null; ciudad: string; lat: number; lng: number; portada: string | null; visible: boolean; privado: boolean } | null; autor: { id: string; nombre: string } | null };

const ORIGEN = "https://somosnosotros.org";

/**
 * Se busca por slug (la dirección de hoy) y, si no aparece nada, por UUID (la dirección vieja, para que siga
 * resolviendo). Mismo criterio que artistas y lugares (OL-114, OL-119).
 */
async function cargarEvento(idOSlug: string): Promise<EventoConLugar | null> {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const columnas = "*, lugar:lugares(id, slug, nombre, direccion, ciudad, lat, lng, portada, visible, privado), autor:perfiles!eventos_creado_por_fkey(id, nombre)";
  const porSlug = await supabase.from("eventos").select(columnas).eq("slug", idOSlug).maybeSingle();
  const data = porSlug.data ?? (esUuid(idOSlug) ? (await supabase.from("eventos").select(columnas).eq("id", idOSlug).maybeSingle()).data : null);
  if (!data) return null;
  const fila = data as unknown as EventoConLugar & { lugar: unknown; autor: unknown };
  const lugar = Array.isArray(fila.lugar) ? (fila.lugar[0] ?? null) : fila.lugar;
  const autor = Array.isArray(fila.autor) ? (fila.autor[0] ?? null) : fila.autor;
  return { ...fila, lugar: lugar as EventoConLugar["lugar"], autor: autor as EventoConLugar["autor"] };
}

/** Quién va (con nombre y foto), cuántos tienen interés, y mi estado. Lectura pública. */
async function cargarAsistencias(id: string, miId: string | null): Promise<{ van: Asistente[]; interesados: number; miEstado: EstadoAsistencia }> {
  const supabase = await clienteServidor();
  if (!supabase) return { van: [], interesados: 0, miEstado: null };
  // Necesita venir completa (decide "reservados" y la lista de nombres); tope de sobra contra el corte silencioso
  // de PostgREST, muy por encima de lo que junta hoy un evento.
  const { data } = await supabase.from("asistencias").select("usuario_id, estado, perfil:perfiles(id, nombre, foto)").eq("evento_id", id).limit(2000);
  const filas = (data ?? []) as unknown as Array<{ usuario_id: string; estado: string; perfil: { id: string; nombre: string; foto: string | null } | { id: string; nombre: string; foto: string | null }[] | null }>;
  const van: Asistente[] = [];
  let interesados = 0;
  let miEstado: EstadoAsistencia = null;
  for (const f of filas) {
    const perfil = Array.isArray(f.perfil) ? f.perfil[0] : f.perfil;
    if (f.usuario_id === miId) miEstado = f.estado as EstadoAsistencia;
    if (f.estado === "voy" && perfil) van.push({ id: perfil.id, nombre: perfil.nombre, foto: perfil.foto });
    else if (f.estado === "me_interesa") interesados++;
  }
  // Yo al frente de la lista: es la evidencia de que el "Voy" quedó.
  if (miId) van.sort((a, b) => (a.id === miId ? -1 : b.id === miId ? 1 : 0));
  return { van, interesados, miEstado };
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
  // Un evento que ya pasó no se anuncia al compartir (decisión del founder, 2026-09-14).
  if (!e || eventoPaso(e.inicio, e.fin, new Date(), e.zona)) return { title: "Evento · Somos Nosotros" };
  const cuando = formatearLargo(e.inicio, new Date(), null, e.zona);
  const descripcion = `${cuando} · ${nombreSitio({ lugar: e.lugar, sitio_texto: e.sitio_texto, sitio_direccion: e.sitio_direccion, sitio_reservado: e.sitio_reservado })}${e.precio ? ` · ${e.precio}` : " · Gratis"}`;
  const imagen = e.imagen ?? e.lugar?.portada ?? undefined;
  return {
    title: `${e.titulo} · Somos Nosotros`,
    description: descripcion,
    alternates: { canonical: `${ORIGEN}${hrefEvento(e)}` },
    openGraph: { title: e.titulo, description: descripcion, url: `${ORIGEN}${hrefEvento(e)}`, type: "article", images: imagen ? [{ url: imagen }] : undefined, locale: "es_MX", siteName: "Somos Nosotros" },
    twitter: { card: imagen ? "summary_large_image" : "summary", title: e.titulo, description: descripcion, images: imagen ? [imagen] : undefined },
  };
}

const ICONO_CANDADO = (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

export default async function FichaEvento({ params, searchParams }: Params) {
  const { id } = await params;
  const { nuevo, accion, error } = (await searchParams) ?? {};
  const [e, actual] = await Promise.all([cargarEvento(id), usuarioActual()]);
  if (!e) notFound();
  // La dirección vieja (/eventos/<uuid>) sigue resolviendo, pero se redirige a la de hoy (el slug); permanente
  // porque es el mismo evento para siempre (OL-119, mismo criterio que artistas y lugares). Se preservan los
  // parámetros con los que haya llegado.
  if (id !== e.slug) {
    const p = new URLSearchParams();
    if (nuevo) p.set("nuevo", nuevo);
    if (accion) p.set("accion", accion);
    if (error) p.set("error", error);
    const q = p.toString();
    permanentRedirect(`${hrefEvento(e)}${q ? `?${q}` : ""}`);
  }
  const puedeEditar = !!actual && (actual.perfil.rol === "admin" || actual.perfil.id === e.creado_por);
  // Un evento que ya pasó se oculta como uno oculto: solo lo ven su autor y el administrador (decisión del founder, 2026-09-14).
  const paso = eventoPaso(e.inicio, e.fin, new Date(), e.zona);
  if (paso && !puedeEditar) notFound();
  // Venía de entrar con la intención de decir "Voy" / "Me interesa": se aplica sola.
  if (actual && (accion === "voy" || accion === "me_interesa")) {
    const supabase = await clienteServidor();
    await supabase?.from("asistencias").upsert({ usuario_id: actual.perfil.id, evento_id: e.id, estado: accion });
    redirect(hrefEvento(e));
  }
  const [asistencias, quien, conteo] = await Promise.all([cargarAsistencias(e.id, actual?.perfil.id ?? null), cargarQuien(e.id), (await clienteServidor())?.rpc("van_por_evento", { ids: [e.id] }) ?? Promise.resolve({ data: [] as { evento_id: string; n: number }[] })]);
  // Cuántos van en total, también los de perfil reservado, que la política de la base no deja ver por nombre.
  const totalVan = Math.max(Number(((conteo.data ?? []) as { evento_id: string; n: number }[])[0]?.n ?? 0), asistencias.van.length);
  const privado = e.sitio_reservado ? await cargarPrivado(e.id) : null;
  const sitio = nombreSitio({ lugar: e.lugar, sitio_texto: e.sitio_texto, sitio_direccion: e.sitio_direccion, sitio_reservado: e.sitio_reservado });
  const esAdmin = actual?.perfil.rol === "admin";
  const destacable = esAdmin && puedeDestacarse({ visible: e.visible, paso, lugar: e.lugar }) ? await cargarDestacado("evento", e.id) : null;
  const url = `${ORIGEN}${hrefEvento(e)}`;
  const texto = textoCompartir(e.titulo, formatearCuando(e.inicio, e.fin, new Date(), e.zona), sitio, url).replace(`\n${url}`, "");
  const argsSitio = { lugar: e.lugar, sitioReservado: e.sitio_reservado, sitioLat: e.sitio_lat, sitioLng: e.sitio_lng, privado };
  const comoLlegar = enlaceComoLlegar(argsSitio);
  const puntoMapa = puntoComoLlegar(argsSitio);
  const n = totalVan;
  const avisoBorrar = n > 0 ? `Se borra el evento y los ${n === 1 ? '1 "Voy"' : `${n} "Voy"`} que tiene.` : "Se borra el evento.";
  const revela = e.sitio_revelar_desde ? formatearLargo(e.sitio_revelar_desde, new Date(), null, e.zona) : "el día del evento";
  // JSON-LD (OL-059, bitácora 088): la coordenada y la dirección solo si son públicas — nunca las de un sitio
  // reservado (`privado`), y nunca las de un lugar oculto o marcado "Solo tú lo ves". Sin una dirección pública
  // (Google la exige para mostrar el evento) no hay nada que mandar. Solo se manda si es lo que también vería un
  // visitante sin sesión (evento visible y no pasado); si no, `notFound()` ya lo detuvo arriba salvo para el autor
  // o el administrador.
  const geoPublico =
    e.lugar && e.lugar.visible && !e.lugar.privado
      ? { lat: e.lugar.lat, lng: e.lugar.lng }
      : !e.sitio_reservado && e.sitio_lat != null && e.sitio_lng != null
        ? { lat: e.sitio_lat, lng: e.sitio_lng }
        : null;
  // La dirección pública y su ciudad van de la mano: la del lugar (con la ciudad del lugar), o la de "otro sitio"
  // (con la ciudad del propio evento). Sin dirección pública no hay JSON-LD que mandar.
  const direccionYCiudad =
    e.lugar && e.lugar.visible && !e.lugar.privado && e.lugar.direccion
      ? { direccion: e.lugar.direccion, ciudad: e.lugar.ciudad }
      : direccionPublicaSitio(e);
  const jsonLd =
    e.visible && !paso && direccionYCiudad
      ? jsonLdEvento({
          id: e.id,
          titulo: e.titulo,
          descripcion: e.descripcion,
          inicio: e.inicio,
          fin: e.fin,
          imagen: e.imagen,
          gratis: e.precio === null,
          sitioNombre: sitio,
          direccionPublica: direccionYCiudad.direccion,
          ciudadPublica: direccionYCiudad.ciudad,
          sitioLat: geoPublico?.lat ?? null,
          sitioLng: geoPublico?.lng ?? null,
        })
      : null;
  // BreadcrumbList (OL-143, doc 36): misma condición que el JSON-LD del evento — lo que también vería un visitante sin sesión.
  const migajas = e.visible && !paso ? jsonLdMigajas([{ nombre: "Inicio", url: "/" }, { nombre: "Agenda", url: "/" }, { nombre: e.titulo, url: hrefEvento(e) }]) : null;

  return (
    <main className={ficha.pagina}>
      {jsonLd && (
        // Se escapa "<" para que un título o descripción con "</script>" no rompa la página (gestión de cambios, OL-059).
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      )}
      {migajas && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(migajas).replace(/</g, "\\u003c") }} />}
      <Barra
        volver={{ href: "/", texto: "Agenda" }}
        derecha={
          <MenuAcciones>
            {puedeEditar && (
              <>
                <li>
                  <Link href={`${hrefEvento(e)}/editar`} className={ficha.menuItem}>
                    Editar
                  </Link>
                </li>
                <li>
                  <Link href={`/eventos/nuevo?desde=${e.id}`} className={ficha.menuItem}>
                    Duplicar con otra fecha
                  </Link>
                </li>
              </>
            )}
            {destacable && <DestacarFicha tipo="evento" id={e.id} {...destacable} />}
            {esAdmin && (
              <li>
                <form action={cambiarVisibleEvento.bind(null, e.id, e.lugar_id, !e.visible)}>
                  <button type="submit" className={ficha.menuItem}>
                    {e.visible ? "Ocultar de la agenda" : "Volver a mostrar"}
                  </button>
                </form>
              </li>
            )}
            {esAdmin && (
              <li>
                {/* crearDesdeEvento (OL-088) entra a la obra ya abierta de este evento o su lugar en vez de duplicarla. */}
                <form action={crearDesdeEvento.bind(null, e.id)}>
                  <button type="submit" className={ficha.menuItem}>
                    Activar obra colectiva
                  </button>
                </form>
              </li>
            )}
            <li className={ficha.menuItem}>
              <Reportar tipo="evento" objetoId={e.id} volver={hrefEvento(e)} conSesion={!!actual} />
            </li>
            {puedeEditar && (
              <li className={ficha.menuItem}>
                <Borrar que="el evento" icono="evento" aviso={avisoBorrar} accion={borrarEvento.bind(null, e.id, e.lugar_id)} />
              </li>
            )}
          </MenuAcciones>
        }
      />
      {nuevo === "1" && (
        <div className={ficha.publicado} role="status">
          <b>Publicado.</b>
          Ya está en la agenda.
          <BotonCompartir titulo={e.titulo} texto={texto} url={url} className={ficha.publicadoBoton}>
            Compartir
          </BotonCompartir>
        </div>
      )}
      {error === "borrar" && (
        <p className="aviso-error" role="alert">
          No se pudo borrar. ¿Sigues con sesión y es tu evento?
        </p>
      )}
      {(!e.visible || paso) && (
        <p className={`aviso-error ${ficha.oculto}`} role="status">
          {paso ? "Este evento ya pasó" : "Este evento está oculto"}: solo lo ven su autor y el administrador.
        </p>
      )}

      <Cartel src={e.imagen ?? e.lugar?.portada ?? null} alt={e.imagen ? `Cartel de ${e.titulo}` : `Foto de ${e.lugar?.nombre ?? e.titulo}`} />
      <h1 className={ficha.titulo}>{e.titulo}</h1>

      <ul className={ficha.datos}>
        <li className={ficha.dato}>
          <IconoReloj width={20} height={20} />
          <b>{formatearLargo(e.inicio, new Date(), e.fin, e.zona)}</b>
        </li>
        {e.lugar && (
          <li className={ficha.dato}>
            <IconoPin width={20} height={20} />
            <b>
              <Link href={hrefLugar(e.lugar)}>{e.lugar.nombre}</Link>
            </b>
            {e.lugar.direccion && <small>{e.lugar.direccion}</small>}
          </li>
        )}
        {!e.lugar && e.sitio_texto && !e.sitio_reservado && (
          <li className={ficha.dato}>
            <IconoPin width={20} height={20} />
            <b>{e.sitio_texto}</b>
            {e.sitio_direccion && <small>{e.sitio_direccion}</small>}
          </li>
        )}
        {e.sitio_reservado && (
          <li className={ficha.dato}>
            {privado ? <IconoPin width={20} height={20} /> : ICONO_CANDADO}
            <b>{privado ? privado.direccion : `${e.sitio_texto} · sitio reservado`}</b>
            {privado ? (
              privado.indicaciones && <small>{privado.indicaciones}</small>
            ) : actual ? (
              <small>La dirección se revela aquí {e.sitio_revelar_desde ? `el ${revela}` : revela}.</small>
            ) : (
              <small>Entra para ver la dirección cuando toque.</small>
            )}
            {!privado && !actual && (
              <Link href={`/entrar?siguiente=${encodeURIComponent(hrefEvento(e))}`} className={ficha.datoEnlace}>
                Entrar
              </Link>
            )}
          </li>
        )}
        {quien.length > 0 && (
          <li className={ficha.dato}>
            <IconoEstrella width={20} height={20} />
            <b>
              Con{" "}
              {quien.map((q, i) => (
                <Fragment key={q.id}>
                  {i > 0 && (i === quien.length - 1 ? " y " : ", ")}
                  <Link href={hrefArtista(q)}>{q.nombre}</Link>
                </Fragment>
              ))}
            </b>
          </li>
        )}
        <li className={ficha.dato}>
          <IconoPersonas width={20} height={20} />
          <b>{n === 0 ? "Nadie ha dicho que va todavía" : n === 1 ? "Va 1 persona" : `Van ${n} personas`}</b>
          {n > 0 && (
            <Salto destino="quien-va" className={ficha.datoEnlace}>
              ver
            </Salto>
          )}
        </li>
        <li className={ficha.dato}>
          <IconoBoleto width={20} height={20} />
          <b>{e.precio ?? "Gratis"}</b>
        </li>
      </ul>

      <MapaFicha punto={puntoMapa} href={comoLlegar} alt={sitio} />

      <div className={ficha.acciones}>
        <BotonCompartir titulo={e.titulo} texto={texto} url={url} className={ficha.accion}>
          <span className={ficha.accionIcono}>
            <IconoCompartir />
          </span>
          Compartir
        </BotonCompartir>
        {/* Dice lo que hace: agrega el evento, con su alerta, al calendario del teléfono (decisión 12 de docs/rediseno/17). */}
        <a href={`${hrefEvento(e)}/calendario`} className={ficha.accion}>
          <span className={ficha.accionIcono}>
            <IconoCalendarioAgregar width={24} height={24} />
          </span>
          A mi calendario
        </a>
        {comoLlegar ? (
          <a href={comoLlegar} className={ficha.accion} target="_blank" rel="noopener noreferrer">
            <span className={ficha.accionIcono}>
              <IconoRuta />
            </span>
            Cómo llegar
          </a>
        ) : (
          <span className={ficha.accion} aria-disabled="true">
            <span className={ficha.accionIcono}>
              <IconoRuta />
            </span>
            Cómo llegar
            <small>sin dirección</small>
          </span>
        )}
      </div>

      {e.descripcion && <Desplegable texto={e.descripcion} />}
      {e.enlace && (
        <EnlaceExterno href={e.enlace} className={styles.enlaceExterno}>
          Más información en la página del evento →
        </EnlaceExterno>
      )}

      <QuienVa van={asistencias.van} total={totalVan} interesados={asistencias.interesados} conSesion={!!actual} />

      <p className={ficha.autor}>Publicado por {e.autor ? <Link href={`/personas/${e.autor.id}`}>{e.autor.nombre}</Link> : "una cuenta borrada"}.</p>

      <Asistencia
        eventoId={e.id}
        eventoSlug={e.slug}
        titulo={e.titulo}
        miEstado={asistencias.miEstado}
        conSesion={!!actual}
        cuenta={actual?.perfil.id ?? ""}
        avisosPreguntado={actual?.perfil.avisos_preguntado ?? true}
        correo={actual?.correo ? enmascararCorreo(actual.correo) : "tu correo"}
        llavePush={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
      />
    </main>
  );
}
