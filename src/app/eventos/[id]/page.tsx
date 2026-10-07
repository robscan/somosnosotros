import { cache, Suspense } from "react";
import { sitioReservadoVencido } from "@/lib/retencionSitio";
import { esUuid } from "@/lib/formulario";
import { ERROR_FICHA, leerFicha } from "@/lib/leerFicha";
import { cargarDestacado } from "@/app/admin/consultas";
import DestacarFicha from "@/app/admin/DestacarFicha";
import { crearDesdeEvento } from "@/app/admin/obras-colectivas/acciones";
import Link from "next/link";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import type { Metadata } from "next";
import Borrar from "@/components/Borrar";
import BotonCalendario from "@/components/BotonCalendario";
import BotonCompartir from "@/components/BotonCompartir";
import BotonDescargarCartel from "@/components/BotonDescargarCartel";
import Desplegable from "@/components/Desplegable";
import { EsqueletoBloqueTexto, EsqueletoKpi } from "@/components/ui/Esqueleto";
import EnlaceExterno from "@/components/ui/EnlaceExterno";
import MapaFicha from "@/components/MapaFicha";
import Reportar from "@/components/Reportar";
import BarraFicha from "@/components/ui/BarraFicha";
import Ficha, { CIRCULO } from "@/components/ui/Ficha";
import Heroe from "@/components/ui/Heroe";
import { IconoBoleto, IconoCalendario, IconoCalendarioAgregar, IconoCalendarioMas, IconoCandado, IconoCartel, IconoChevronDerecha, IconoCompartir, IconoDescarga, IconoEstrella, IconoEtiqueta, IconoLapiz, IconoOjo, IconoOjoTachado, IconoOk, IconoPersonas, IconoPin, IconoPincel, IconoReloj, IconoRuta } from "@/components/ui/Iconos";
import EventosPorDia from "@/components/EventosPorDia";
import TextoHorario from "@/app/lugares/TextoHorario";
import { avisosParaListas } from "@/app/avisos/paraListas";
import { decididasDe } from "@/app/eventos/decididas";
import type { EventoAgenda } from "@/lib/agenda";
import { horarioEfectivo, kpisDeExposicion, lineaDeExposicion, rangoDelPeriodo, soloInteres, textoProgramaRegistrado, textoVisita, visitaDeEvento } from "@/lib/claseEvento";
import { franjaDeFila, type Franja } from "@/lib/horarioLugar";
import { Kpi, Kpis } from "@/components/ui/Kpi";
import ficha from "@/components/ui/Ficha.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import { cargarQuien } from "@/app/artistas/consultas";
import { enlaceAltaEvento } from "@/lib/armazon";
import { cartelDescargable } from "@/lib/cartelDescarga";
import { configPublica } from "@/lib/config";
import { enmascararCorreo, type Asistente } from "@/lib/comunidad";
import { puedeDestacarse } from "@/lib/destacados";
import { jsonLdMigajas } from "@/lib/estructurados";
import { datosEventoNativo } from "@/lib/calendario";
import type { Evento, SitioPrivado } from "@/lib/eventos";
import { compartirEvento, direccionPublicaSitio, enlaceComoLlegar, hrefEvento, jsonLdEvento, nombreSitio, puntoComoLlegar } from "@/lib/eventos";
import { kpiCuando, kpiCuandoPorDia } from "@/lib/ficha";
import { hrefLugar } from "@/lib/lugares";
import { etiquetaArtista, hrefArtista } from "@/lib/artistas";
import { SIN_FOTO } from "@/lib/imagen";
import { diaLocal, eventoPaso, formatearLargo } from "@/lib/fechas";
import { conPrimerDia, listaDeSesiones, sesionesVigentes, type SesionGuardada } from "@/lib/sesionesEvento";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { borrarEvento, cambiarVisibleEvento, publicarBorrador, type EstadoAsistencia } from "../acciones";
import Asistencia from "./Asistencia";
import MetaSitio from "./MetaSitio";
import QuienVa from "./QuienVa";
import styles from "./ficha.module.css";

type Params = { params: Promise<{ id: string }>; searchParams?: Promise<{ accion?: string; error?: string }> };
type EventoConLugar = Evento & { lugar: { id: string; slug: string; nombre: string; direccion: string | null; ciudad: string; lat: number; lng: number; portada: string | null; visible: boolean; privado: boolean } | null; autor: { id: string; nombre: string } | null; sesiones?: SesionGuardada[] | null };

const ORIGEN = "https://somosnosotros.org";

/**
 * Se busca por slug (la dirección de hoy) y, si no aparece nada, por UUID (la dirección vieja, para que siga
 * resolviendo). Mismo criterio que artistas y lugares (OL-114, OL-119).
 */
async function cargarEvento(idOSlug: string): Promise<EventoConLugar | null> {
  const supabase = await clienteServidor();
  if (!supabase) {
    console.warn("[ficha] cliente no disponible: evento");
    throw new Error(ERROR_FICHA);
  }
  const columnas = "*, lugar:lugares(id, slug, nombre, direccion, ciudad, lat, lng, portada, visible, privado), autor:perfiles!eventos_creado_por_fkey(id, nombre), sesiones:eventos_sesiones(inicio, fin)";
  const data = await leerFicha<EventoConLugar & { lugar: unknown; autor: unknown }>(
    "evento",
    () => supabase.from("eventos").select(columnas).eq("slug", idOSlug).maybeSingle(),
    esUuid(idOSlug) ? () => supabase.from("eventos").select(columnas).eq("id", idOSlug).maybeSingle() : null,
  );
  if (!data) return null;
  const fila = data;
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

/**
 * Solo mi estado (Voy / Me interesa / nada), para las pastillas, que sí se pintan en el HTML inicial (OL-161,
 * bitácora 196): una fila, no la lista entera de quién va, que sí se difiere.
 */
async function cargarMiEstado(id: string, miId: string | null): Promise<EstadoAsistencia> {
  if (!miId) return null;
  const supabase = await clienteServidor();
  const { data } = (await supabase?.from("asistencias").select("estado").eq("evento_id", id).eq("usuario_id", miId).maybeSingle()) ?? { data: null };
  return (data?.estado as EstadoAsistencia | undefined) ?? null;
}

// Las tres consultas de "quién va" (nombres, cuántos van, el cartel de artistas) se piden una sola vez por petición
// aunque se usen desde varios bloques diferidos (`KpiVan`, `ArtistasEvento` y `QuienVaDiferido`): `cache()` de React
// las memoiza por argumento (gestión de cambios, OL-059, mismo patrón que `cargarLigadas` en la ficha de artista).
const cargarAsistenciasCache = cache(cargarAsistencias);
const cargarQuienCache = cache(cargarQuien);
const cargarTotalVanCache = cache(async (id: string): Promise<number> => {
  const supabase = await clienteServidor();
  const { data } = (await supabase?.rpc("van_por_evento", { ids: [id] })) ?? { data: [] as { evento_id: string; n: number }[] };
  return Number(((data ?? []) as { evento_id: string; n: number }[])[0]?.n ?? 0);
});

/**
 * Cuánta gente va: el tercer número de la ficha (`ui/Kpi`), que baja hasta «Quién va». Pide una consulta aparte de la del evento
 * (OL-161); va en `<Suspense>`, con una tarjeta de esqueleto del mismo alto mientras llega (`EsqueletoKpi`, canon de
 * `docs/PRINCIPIOS_UX.md`).
 */
async function KpiVan({ eventoId, miId }: { eventoId: string; miId: string | null }) {
  const [asistencias, totalVanRpc] = await Promise.all([cargarAsistenciasCache(eventoId, miId), cargarTotalVanCache(eventoId)]);
  return <Kpi icono={<IconoPersonas width={16} height={16} />} etiqueta="Van" valor={Math.max(totalVanRpc, asistencias.van.length)} salto="quien-va" />;
}

/**
 * Quién se presenta, en su orden: una fila por artista (su foto redonda, qué hace y un chevron a su ficha). Su consulta también es
 * aparte (`cargarQuien`); sin artistas no hay bloque, y tampoco un hueco mientras llega.
 */
async function ArtistasEvento({ eventoId }: { eventoId: string }) {
  const quien = await cargarQuienCache(eventoId);
  if (quien.length === 0) return null;
  return (
    <section className={ficha.bloque} aria-label="Artistas">
      <h2>Artistas</h2>
      <ul>
        {quien.map((q) => (
          <li key={q.id}>
            <Link href={hrefArtista(q)} className={renglon.dato}>
              {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage o la imagen fija de public */}
              <img src={q.foto ?? SIN_FOTO} alt="" />
              <b>{q.nombre}</b>
              <small>{etiquetaArtista(q)}</small>
              <IconoChevronDerecha />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Fallback de `QuienVaDiferido`: el título fijo de la sección (no depende de ninguna consulta) y dos líneas grises. */
function EsqueletoQuienVa() {
  return (
    <section className={ficha.bloque} id="quien-va" aria-label="Quién va" aria-hidden="true">
      <h2>Quién va</h2>
      <EsqueletoBloqueTexto lineas={2} />
    </section>
  );
}

/** La lista de quién va (`QuienVa`), diferida: la misma consulta que `KpiVan`, memoizada por `cache()`. */
async function QuienVaDiferido({ eventoId, miId, conSesion, consultaTrasFin }: { eventoId: string; miId: string | null; conSesion: boolean; consultaTrasFin: boolean }) {
  const [asistencias, totalVanRpc] = await Promise.all([cargarAsistenciasCache(eventoId, miId), cargarTotalVanCache(eventoId)]);
  const totalVan = Math.max(totalVanRpc, asistencias.van.length);
  if (consultaTrasFin && totalVan === 0) {
    return (
      <section className={ficha.bloque} id="quien-va" aria-label="Quién va">
        <h2>Quién va</h2>
        <p className={ficha.vacio}>Nadie confirmó asistencia.</p>
      </section>
    );
  }
  return <QuienVa van={asistencias.van} total={totalVan} interesados={asistencias.interesados} conSesion={conSesion} />;
}

/** Lo ligado a un evento por su clase (OL-321): el horario de una exposición (propio y el de su lugar) y su inauguración, el programa de un
 *  festival (sus actos visibles y, para su autor, sus borradores), el festival de un acto y la exposición que inaugura. Cada consulta falla
 *  sola sin tumbar la ficha (sin la migración, nada de esto existe y la ficha es la de siempre). */
type Ligado = { id: string; slug: string | null; titulo: string; inicio: string; fin: string | null; zona: string };
type Acto = EventoAgenda & { borrador?: boolean; visible?: boolean };
async function cargarLigados(e: EventoConLugar) {
  const supabase = await clienteServidor();
  const vacio = { horarioPropio: [] as Franja[], horarioLugar: [] as Franja[], inauguracion: null as Ligado | null, actos: [] as Acto[], padre: null as Ligado | null, inaugura: null as Ligado | null };
  if (!supabase) return vacio;
  const filas = (r: { data: unknown }) => (Array.isArray(r.data) ? (r.data as { dias: number[]; abre: string; cierra: string }[]).map(franjaDeFila) : []);
  const uno = (r: { data: unknown }) => (r.data as Ligado | null) ?? null;
  const columnas = "id, slug, titulo, inicio, fin, zona";
  const [horarioPropio, horarioLugar, inauguracion, actos, padre, inaugura] = await Promise.all([
    e.clase === "exposicion" ? supabase.from("eventos_horarios").select("dias, abre, cierra").eq("evento_id", e.id).order("creado_en").then(filas) : [],
    e.clase === "exposicion" && e.lugar_id ? supabase.from("lugares_horarios").select("dias, abre, cierra").eq("lugar_id", e.lugar_id).order("creado_en").then(filas) : [],
    e.inaugura_id ? supabase.from("eventos").select(columnas).eq("id", e.inaugura_id).maybeSingle().then(uno) : null,
    e.clase === "festival"
      ? supabase
          .from("eventos")
          .select("id, slug, titulo, inicio, fin, zona, imagen, precio, lugar_id, sitio_texto, sitio_direccion, sitio_reservado, creado_en, visible, borrador, lugar:lugares(nombre, portada)")
          .eq("evento_padre_id", e.id)
          .order("inicio")
          .limit(100)
          .then((r) => (Array.isArray(r.data) ? (r.data as unknown as (Acto & { lugar: Acto["lugar"] | Acto["lugar"][] })[]).map((a) => ({ ...a, lugar: Array.isArray(a.lugar) ? (a.lugar[0] ?? null) : a.lugar, van: null })) : []))
      : [],
    e.evento_padre_id ? supabase.from("eventos").select(columnas).eq("id", e.evento_padre_id).maybeSingle().then(uno) : null,
    e.clase === "puntual" || !e.clase ? supabase.from("eventos").select(columnas).eq("inaugura_id", e.id).limit(1).maybeSingle().then(uno, () => null) : null,
  ]);
  return { horarioPropio, horarioLugar, inauguracion, actos, padre, inaugura };
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
  const e = await cargarEvento(id).catch(() => undefined);
  // Falló la lectura (no «no existe»): sin etiquetas propias. Con `{}` rigen las del sitio (título «Somos Nosotros»), sin
  // `noindex` ni canonical; si la excepción saliera de aquí Next descartaría todas las etiquetas, también el título (OL-289).
  if (e === undefined) return {};
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

export default async function FichaEvento({ params, searchParams }: Params) {
  const { id } = await params;
  const { accion, error } = (await searchParams) ?? {};
  const [e, actual] = await Promise.all([cargarEvento(id), usuarioActual()]);
  if (!e) notFound();
  // La dirección vieja (/eventos/<uuid>) sigue resolviendo, pero se redirige a la de hoy (el slug); permanente
  // porque es el mismo evento para siempre (OL-119, mismo criterio que artistas y lugares). Se preservan los
  // parámetros con los que haya llegado.
  if (id !== e.slug) {
    const p = new URLSearchParams();
    if (accion) p.set("accion", accion);
    if (error) p.set("error", error);
    const q = p.toString();
    permanentRedirect(`${hrefEvento(e)}${q ? `?${q}` : ""}`);
  }
  const puedeEditar = !!actual && (actual.perfil.rol === "admin" || actual.perfil.id === e.creado_por);
  // OL-257: RLS decide si aún se puede consultar la dirección reservada
  // (hasta fin efectivo + 2 h). Autor/admin conservan su acceso habitual.
  const paso = eventoPaso(e.inicio, e.fin, new Date(), e.zona);
  const privado = e.sitio_reservado ? await cargarPrivado(e.id) : null;
  if (paso && !puedeEditar && !(actual && privado)) notFound();
  const consultaTrasFin = paso && !puedeEditar;
  // Venía de entrar con la intención de decir "Voy" / "Me interesa": se aplica sola.
  if (actual && !consultaTrasFin && (accion === "voy" || accion === "me_interesa")) {
    const supabase = await clienteServidor();
    await supabase?.from("asistencias").upsert({ usuario_id: actual.perfil.id, evento_id: e.id, estado: accion });
    redirect(hrefEvento(e));
  }
  // "Quién va" (nombres, cuántos van, el cartel de artistas) es su propia consulta, aparte de la del evento: se
  // difiere en `<Suspense>` (OL-161, bitácora 196) — la cabecera (foto, nombre, cuándo, dónde) no la espera. Solo mi
  // estado, para las pastillas, que sí se pintan al instante, se pide aquí (una fila, no la lista entera).
  const miEstado = await cargarMiEstado(e.id, actual?.perfil.id ?? null);
  const sitio = nombreSitio({ lugar: e.lugar, sitio_texto: e.sitio_texto, sitio_direccion: e.sitio_direccion, sitio_reservado: e.sitio_reservado });
  const esAdmin = actual?.perfil.rol === "admin";
  const destacable = esAdmin && puedeDestacarse({ visible: e.visible, paso, lugar: e.lugar }) ? await cargarDestacado("evento", e.id) : null;
  // Con horario por día (OL-311) cada día lleva sus horas; si se editó el evento por el formulario de siempre y ya no coinciden, se ignoran.
  const sesiones = sesionesVigentes(e, e.sesiones);
  // Cómo ocurre (OL-321; doc 55 §3): lo ligado por su clase, la línea de cuándo de una exposición y de un festival, y «Me interesa» sin «Voy».
  const clase = e.clase ?? "puntual";
  const ligados = await cargarLigados(e);
  const horario = horarioEfectivo(ligados.horarioPropio, ligados.horarioLugar);
  const ahora = new Date();
  const hoy = diaLocal(ahora, e.zona);
  // El programa: los actos que no son borrador (los que la base deja ver: a quien no administra el festival, solo los visibles).
  const actosVisibles = ligados.actos.filter((a) => !a.borrador);
  const borradores = puedeEditar ? ligados.actos.filter((a) => a.borrador) : [];
  const rangoFestival = clase === "festival" ? rangoDelPeriodo(e.inicio, e.fin, e.zona, ahora) : null;
  const cuandoClase = clase === "exposicion" ? textoVisita(visitaDeEvento(e.inicio, e.fin, e.zona), hoy, ahora, e.zona) : clase === "festival" ? [rangoFestival, textoProgramaRegistrado(actosVisibles.length)].filter(Boolean).join(" · ") : null;
  const { url, texto } = compartirEvento(e, sitio, sesiones.length > 0, cuandoClase);
  const decididasActos = clase === "festival" ? await decididasDe(actual?.perfil.id ?? null, actosVisibles.map((a) => a.id)) : null;
  const sedes = new Set(actosVisibles.map((a) => a.lugar?.nombre ?? a.sitio_texto ?? "")).size;
  // Con dirección cuando se puede (a diferencia de `sitio`, que solo da el nombre): mismo criterio que el archivo
  // .ics (`donde` en .../calendario/route.ts) para que la hoja nativa del sistema muestre algo útil para llegar.
  const lugarCalendario = e.lugar ? [e.lugar.nombre, e.lugar.direccion].filter(Boolean).join(", ") : sitio;
  // La hoja nativa del iPhone agrega un solo evento: con horario por día, el primer día y todos los días en las notas (el .ics de la web lleva uno por día).
  const datosCalendario = datosEventoNativo(conPrimerDia({ id: e.id, slug: e.slug, titulo: e.titulo, inicio: e.inicio, fin: e.fin, descripcion: e.descripcion, lugar: lugarCalendario }, sesiones, e.zona));
  const argsSitio = { lugar: e.lugar, sitioReservado: e.sitio_reservado, sitioLat: e.sitio_lat, sitioLng: e.sitio_lng, privado };
  const comoLlegar = enlaceComoLlegar(argsSitio);
  const puntoMapa = puntoComoLlegar(argsSitio);
  // Solo la coordenada, para la distancia del renglón del sitio: `puntoMapa` puede ser el lugar entero y no tiene por qué viajar al teléfono.
  const puntoDistancia = puntoMapa && { lat: puntoMapa.lat, lng: puntoMapa.lng };
  // Sin el conteo (diferido) el aviso de borrar ya no dice cuántos "Voy" hay: el menú de administración sigue en el
  // HTML inicial (OL-161) y no puede esperar esa consulta aparte.
  const avisoBorrar = 'Se borra el evento, con los "Voy" que tenga.';
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
          slug: e.slug,
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

  const portada = e.imagen ?? e.lugar?.portada ?? null;
  const cuando = e.fin && sesiones.length > 0 ? kpiCuandoPorDia(e.inicio, e.fin, e.zona) : kpiCuando(e.inicio, e.fin, e.zona);
  const kpiExpo = clase === "exposicion" ? kpisDeExposicion(e, horario.franjas, ahora) : null;
  const hayAvisos = error === "borrar" || !e.visible || paso;
  const hayDonde = !!e.lugar || !!e.sitio_texto || e.sitio_reservado;
  // «Cartel»: solo con imagen propia del evento (no la portada del lugar) que la ruta de descarga pueda entregar, y mientras el evento se ve.
  const hayCartel = e.visible && !paso && cartelDescargable(e.imagen, configPublica().supabaseUrl);
  // «Crear cartel» (OL-324) para quien lo gestiona, en el sitio de «Cartel» cuando el evento no tiene uno (más de la mitad, doc 52 §2); con
  // cartel, sigue en el menú de ajustes.
  const crearCartel = puedeEditar && !paso && !hayCartel;

  return (
    <Ficha portada={portada}>
      {jsonLd && (
        // Se escapa "<" para que un título o descripción con "</script>" no rompa la página (gestión de cambios, OL-059).
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      )}
      {migajas && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(migajas).replace(/</g, "\\u003c") }} />}
      <BarraFicha volver={{ href: "/", texto: "Agenda" }} titulo={e.titulo}>
        {puedeEditar && (
          <>
            <li>
              <Link href={`${hrefEvento(e)}/editar`} className={renglon.ajuste}>
                <IconoLapiz width={20} height={20} />
                <b>Editar</b>
              </Link>
            </li>
            <li>
              <Link href={enlaceAltaEvento({ desde: e.id })} className={renglon.ajuste}>
                <IconoCalendarioMas width={20} height={20} />
                <b>Duplicar con otra fecha</b>
              </Link>
            </li>
            <li>
              <Link href={`${hrefEvento(e)}/cartel`} className={renglon.ajuste}>
                <IconoCartel width={20} height={20} />
                <b>Crear cartel</b>
              </Link>
            </li>
          </>
        )}
        {destacable && <DestacarFicha tipo="evento" id={e.id} {...destacable} />}
        {esAdmin && (
          <li>
            <form action={cambiarVisibleEvento.bind(null, e.id, e.lugar_id, !e.visible)}>
              <button type="submit" className={renglon.ajuste}>
                {e.visible ? <IconoOjoTachado width={20} height={20} /> : <IconoOjo width={20} height={20} />}
                <b>{e.visible ? "Ocultar de la agenda" : "Volver a mostrar"}</b>
              </button>
            </form>
          </li>
        )}
        {esAdmin && (
          <li>
            {/* crearDesdeEvento (OL-088) entra a la obra ya abierta de este evento o su lugar en vez de duplicarla. */}
            <form action={crearDesdeEvento.bind(null, e.id)}>
              <button type="submit" className={renglon.ajuste}>
                <IconoPincel width={20} height={20} />
                <b>Activar obra colectiva</b>
              </button>
            </form>
          </li>
        )}
        <li>
          <Reportar tipo="evento" objetoId={e.id} volver={hrefEvento(e)} conSesion={!!actual} />
        </li>
        {puedeEditar && (
          <li>
            <Borrar fila que="el evento" icono="evento" aviso={avisoBorrar} accion={borrarEvento.bind(null, e.id, e.lugar_id)} />
          </li>
        )}
      </BarraFicha>
      <Heroe portada={portada} alt={e.imagen ? `Cartel de ${e.titulo}` : `Foto de ${e.lugar?.nombre ?? e.titulo}`} titulo={e.titulo} />

      {hayAvisos && (
        <div className={ficha.avisos}>
          {error === "borrar" && (
            <p className="aviso-error" role="alert">
              No se pudo borrar. ¿Sigues con sesión y es tu evento?
            </p>
          )}
          {(!e.visible || paso) && (
            <p className={`aviso-error ${ficha.oculto}`} role="status">
              {consultaTrasFin
                ? "Este evento ya terminó. La dirección sigue disponible hasta dos horas después de su fin."
                : `${paso ? "Este evento ya pasó" : "Este evento está oculto"}: solo lo ven quien lo publicó y la administración.`}
            </p>
          )}
        </div>
      )}

      <div className={ficha.cuerpo} data-cuerpo>
        {/* Una exposición: hasta cuándo, el horario de hoy y el costo (sin «Van»: no se va un día). Un festival: su periodo con cuántas actividades
            tiene, el costo y sus sedes. Lo demás, como siempre. */}
        {kpiExpo ? (
          <Kpis>
            <Kpi icono={<IconoCalendario width={16} height={16} />} etiqueta="Hasta" valor={kpiExpo.hasta} />
            <Kpi icono={<IconoReloj width={16} height={16} />} etiqueta={kpiExpo.hoy.etiqueta} valor={kpiExpo.hoy.valor} />
            <Kpi icono={<IconoBoleto width={16} height={16} />} etiqueta="Costo" valor={e.precio ?? "Gratis"} />
          </Kpis>
        ) : clase === "festival" ? (
          <Kpis>
            <Kpi icono={<IconoCalendario width={16} height={16} />} etiqueta="Actos" valor={actosVisibles.length} />
            <Kpi icono={<IconoBoleto width={16} height={16} />} etiqueta="Costo" valor={e.precio ?? "Gratis"} />
            <Kpi icono={<IconoPin width={16} height={16} />} etiqueta="Sedes" valor={sedes} />
          </Kpis>
        ) : (
          <Kpis>
            <Kpi icono={<IconoCalendario width={16} height={16} />} etiqueta={cuando.hora} valor={cuando.dia} />
            <Kpi icono={<IconoBoleto width={16} height={16} />} etiqueta="Costo" valor={e.precio ?? "Gratis"} />
            <Suspense fallback={<EsqueletoKpi />}>
              <KpiVan eventoId={e.id} miId={actual?.perfil.id ?? null} />
            </Suspense>
          </Kpis>
        )}
        {kpiExpo && <p className={styles.linea}>{lineaDeExposicion(e, horario.franjas, ahora)}</p>}
        {clase === "festival" && cuandoClase && <p className={styles.linea}>{cuandoClase}</p>}

        {/* Los accionables van arriba del mapa (founder, OL-225, 2026-09-26: "así se ven mas"). */}
        <div className={ficha.acciones}>
          <BotonCompartir titulo={e.titulo} texto={texto} url={url} className={ficha.accion}>
            <span className={CIRCULO}>
              <IconoCompartir />
            </span>
            Compartir
          </BotonCompartir>
          {/* Dice lo que hace: agrega el evento, con su alerta, al calendario del teléfono (decisión 12 de docs/rediseno/17).
              Dentro de la app de iPhone abre la hoja nativa del sistema en vez de descargar el .ics (OL-214, bitácora 243). */}
          <BotonCalendario datos={datosCalendario} href={`${hrefEvento(e)}/calendario`} className={ficha.accion}>
            <span className={CIRCULO}>
              <IconoCalendarioAgregar width={24} height={24} />
            </span>
            A mi calendario
          </BotonCalendario>
          {comoLlegar ? (
            <a href={comoLlegar} className={ficha.accion} target="_blank" rel="noopener noreferrer">
              <span className={CIRCULO}>
                <IconoRuta />
              </span>
              Cómo llegar
            </a>
          ) : (
            <span className={ficha.accion} aria-disabled="true">
              <span className={CIRCULO}>
                <IconoRuta />
              </span>
              Cómo llegar
              <small>sin dirección</small>
            </span>
          )}
          {/* Para llevar el cartel a Fotos, WhatsApp o Instagram (OL-304, OL-317): en la app, un toque a Fotos; en la web, la descarga del archivo. */}
          {hayCartel && (
            <BotonDescargarCartel
              id={e.slug}
              className={ficha.accion}
              icono={
                <span className={CIRCULO}>
                  <IconoDescarga />
                </span>
              }
              iconoListo={
                <span className={CIRCULO}>
                  <IconoOk />
                </span>
              }
              corto
            />
          )}
          {crearCartel && (
            <Link href={`${hrefEvento(e)}/cartel`} className={ficha.accion}>
              <span className={CIRCULO}>
                <IconoCartel />
              </span>
              Crear cartel
            </Link>
          )}
        </div>

        {/* Con horario por día (OL-311): cada día con sus horas, en 24 h, bajo los accionables y sin tarjeta propia. Un taller (OL-321): sus
            sesiones, «Sesión n de N». */}
        {sesiones.length > 0 && (
          <section className={ficha.bloque} aria-label={clase === "taller" ? "Sesiones" : "Horarios por día"}>
            <h2>{clase === "taller" ? "Sesiones" : "Horarios"}</h2>
            <ul>
              {listaDeSesiones(sesiones, e.zona).map(({ dia, horas }, i) => (
                <li key={dia} className={renglon.dato}>
                  <IconoCalendario width={20} height={20} />
                  <b>{clase === "taller" ? `Sesión ${i + 1} de ${sesiones.length} · ${dia}` : dia}</b>
                  <small>{horas}</small>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Una exposición (OL-321): su horario (el propio o el de su lugar, estructurado por el sistema) o «Horario por confirmar», y su inauguración. */}
        {clase === "exposicion" && (
          <section className={ficha.bloque} aria-label="Horario">
            <h2>Horario</h2>
            <ul>
              <li className={renglon.dato}>
                <IconoReloj width={20} height={20} />
                <b>{horario.franjas.length ? <TextoHorario franjas={horario.franjas} /> : "Horario por confirmar"}</b>
                <small>{horario.origen === "lugar" ? "Horario del lugar" : horario.origen === "propio" ? "Horario de la exposición" : "Pregunta en el lugar antes de ir."}</small>
              </li>
              {ligados.inauguracion && (
                <li>
                  <Link href={hrefEvento(ligados.inauguracion)} className={renglon.dato}>
                    <IconoEstrella width={20} height={20} />
                    <b>Inauguración</b>
                    <small>{formatearLargo(ligados.inauguracion.inicio, ahora, null, ligados.inauguracion.zona)}</small>
                    <IconoChevronDerecha />
                  </Link>
                </li>
              )}
            </ul>
          </section>
        )}

        {/* Un festival (OL-321): su programa por día, cada acto con su ficha y su «Voy»; lo registrado se dice («Programa registrado: N»). Su autor
            ve también sus borradores, con «Publicar». */}
        {clase === "festival" && (
          <section className={ficha.bloque} aria-label="Programa">
            <h2>Programa</h2>
            {actosVisibles.length ? <EventosPorDia eventos={actosVisibles} decididas={decididasActos} avisos={avisosParaListas(actual)} /> : <p className={ficha.vacio}>Todavía no hay actividades publicadas.</p>}
            <p className={ficha.vacio}>
              {textoProgramaRegistrado(actosVisibles.length)}
              {borradores.length ? ` · ${borradores.length} ${borradores.length === 1 ? "borrador" : "borradores"}` : ""}
            </p>
            {borradores.length > 0 && (
              <ul aria-label="Borradores">
                {borradores.map((b) => (
                  <li key={b.id} className={renglon.dato}>
                    <IconoCalendario width={20} height={20} />
                    <b>{b.titulo}</b>
                    <small>{formatearLargo(b.inicio, ahora, null, b.zona)} · borrador</small>
                    <form action={publicarBorrador.bind(null, b.id, hrefEvento(e))}>
                      <button type="submit" className={styles.publicarBorrador}>
                        Publicar
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            {puedeEditar && (
              <Link href={enlaceAltaEvento({ festival: e.id })} className={renglon.dato}>
                <IconoCalendarioMas width={20} height={20} />
                <b>Agregar otra actividad</b>
                <IconoChevronDerecha />
              </Link>
            )}
          </section>
        )}

        {/* El festival del que es parte, y la exposición que inaugura (OL-321): enlaces a su ficha. */}
        {(ligados.padre || ligados.inaugura) && (
          <section className={ficha.bloque} aria-label="Parte de">
            <ul>
              {ligados.padre && (
                <li>
                  <Link href={hrefEvento(ligados.padre)} className={renglon.dato}>
                    <IconoEtiqueta width={20} height={20} />
                    <b>Parte de {ligados.padre.titulo}</b>
                    <small>Festival</small>
                    <IconoChevronDerecha />
                  </Link>
                </li>
              )}
              {ligados.inaugura && (
                <li>
                  <Link href={hrefEvento(ligados.inaugura)} className={renglon.dato}>
                    <IconoEstrella width={20} height={20} />
                    <b>Inaugura {ligados.inaugura.titulo}</b>
                    <small>Exposición</small>
                    <IconoChevronDerecha />
                  </Link>
                </li>
              )}
            </ul>
          </section>
        )}

        {hayDonde && (
          <section className={ficha.tarjeta}>
            <h2>Dónde</h2>
            <MapaFicha punto={puntoMapa} href={comoLlegar} alt={sitio} />
            {e.lugar && (
              <Link href={hrefLugar(e.lugar)} className={renglon.dato}>
                <IconoPin width={20} height={20} />
                <b>{e.lugar.nombre}</b>
                <MetaSitio direccion={e.lugar.direccion} punto={puntoDistancia} />
                <IconoChevronDerecha />
              </Link>
            )}
            {!e.lugar && e.sitio_texto && !e.sitio_reservado && (
              <div className={renglon.dato}>
                <IconoPin width={20} height={20} />
                <b>{e.sitio_texto}</b>
                <MetaSitio direccion={e.sitio_direccion} punto={puntoDistancia} />
              </div>
            )}
            {e.sitio_reservado &&
              (privado || actual ? (
                <div className={renglon.dato}>
                  {privado ? <IconoPin width={20} height={20} /> : <IconoCandado width={20} height={20} />}
                  <b>{privado ? privado.direccion : `${e.sitio_texto} · sitio reservado`}</b>
                  {privado ? privado.indicaciones && <small>{privado.indicaciones}</small> : sitioReservadoVencido(e) ? <small>La dirección ya no está disponible por privacidad.</small> : <small>La dirección se revela aquí {e.sitio_revelar_desde ? `el ${revela}` : revela}.</small>}
                </div>
              ) : (
                // Sin sesión no se ve la dirección reservada: toda la fila lleva a entrar.
                <Link href={`/entrar?siguiente=${encodeURIComponent(hrefEvento(e))}`} className={renglon.dato}>
                  <IconoCandado width={20} height={20} />
                  <b>{e.sitio_texto} · sitio reservado</b>
                  <small>Entra para ver la dirección cuando toque.</small>
                  <IconoChevronDerecha />
                </Link>
              ))}
          </section>
        )}

        <Suspense fallback={null}>
          <ArtistasEvento eventoId={e.id} />
        </Suspense>

        {(e.descripcion || e.enlace) && (
          <section className={ficha.bloque} aria-label="Sobre el evento">
            <h2>Sobre el evento</h2>
            {e.descripcion && <Desplegable texto={e.descripcion} />}
            {e.enlace && (
              <EnlaceExterno href={e.enlace} className={styles.enlaceExterno}>
                Más información en la página del evento →
              </EnlaceExterno>
            )}
          </section>
        )}

        {/* Una exposición o un festival no tienen «Voy» (OL-321): tampoco «Quién va». */}
        {!soloInteres(clase) && (
          <Suspense fallback={<EsqueletoQuienVa />}>
            <QuienVaDiferido eventoId={e.id} miId={actual?.perfil.id ?? null} conSesion={!!actual} consultaTrasFin={consultaTrasFin} />
          </Suspense>
        )}

        <p className={ficha.pie}>Publicado por {e.autor ? <Link href={`/personas/${e.autor.id}`}>{e.autor.nombre}</Link> : "una cuenta borrada"}</p>
      </div>

      {!consultaTrasFin && (
        <Asistencia
          eventoId={e.id}
          eventoSlug={e.slug}
          titulo={e.titulo}
          miEstado={miEstado}
          conSesion={!!actual}
          cuenta={actual?.perfil.id ?? ""}
          avisosPreguntado={actual?.perfil.avisos_preguntado ?? true}
          correo={actual?.correo ? enmascararCorreo(actual.correo) : "tu correo"}
          llavePush={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
          soloInteres={soloInteres(clase)}
        />
      )}
    </Ficha>
  );
}
