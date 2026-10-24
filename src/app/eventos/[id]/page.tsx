import { cache, Fragment, Suspense, type ReactNode } from "react";
import { sitioReservadoVencido } from "@/lib/retencionSitio";
import { esUuid } from "@/lib/formulario";
import { ERROR_FICHA, leerFicha } from "@/lib/leerFicha";
import { cargarDestacado } from "@/app/admin/consultas";
import DestacarFicha from "@/app/admin/DestacarFicha";
import { cuandoSePublico } from "@/app/admin/instagram/datos";
import { HojaInstagramDeFicha, RenglonPublicarInstagram } from "@/components/instagram/PublicarDesdeFicha";
import { sePuedePublicar } from "@/lib/instagram/elegir";
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
import { IconoBoleto, IconoCalendario, IconoCalendarioAgregar, IconoCalendarioMas, IconoCandado, IconoCaret, IconoCartel, IconoChevronDerecha, IconoCompartir, IconoDescarga, IconoEstrella, IconoEtiqueta, IconoLapiz, IconoOjo, IconoOjoTachado, IconoOk, IconoPersonas, IconoPin, IconoPincel, IconoReloj, IconoRuta } from "@/components/ui/Iconos";
import EventosPorDia from "@/components/EventosPorDia";
import RenglonEvento from "@/components/RenglonEvento";
import TarjetaSede from "@/components/TarjetaSede";
import Salto from "@/components/ui/Salto";
import TextoHorario from "@/app/lugares/TextoHorario";
import { avisosParaListas } from "@/app/avisos/paraListas";
import { decididasDe } from "@/app/eventos/decididas";
import { agruparPorDia, type EventoAgenda } from "@/lib/agenda";
import { cuandoDePeriodo, festivalComoEvento, horarioEfectivo, kpisDeExposicion, lineaDeFestivalSinPrograma, lineaDeTaller, soloInteres, textoVisita, visitaDeEvento } from "@/lib/claseEvento";
import { franjaDeFila, type Franja } from "@/lib/horarioLugar";
import { Kpi, Kpis } from "@/components/ui/Kpi";
import ficha from "@/components/ui/Ficha.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import { cargarQuien } from "@/app/artistas/consultas";
import { enlaceAltaEvento } from "@/lib/armazon";
import { cartelDescargable } from "@/lib/cartelDescarga";
import { configPublica } from "@/lib/config";
import { enmascararCorreo, type Asistente } from "@/lib/comunidad";
import { PROGRAMA_POR_CONFIRMAR, puedeDestacarse } from "@/lib/destacados";
import { jsonLdMigajas } from "@/lib/estructurados";
import { datosEventoNativo } from "@/lib/calendario";
import type { Evento, SitioPrivado } from "@/lib/eventos";
import { POR_CONFIRMAR, compartirEvento, cortoDeClase, costoOpcional, direccionPublicaSitio, enlaceComoLlegar, fotoDeEvento, hrefEvento, jsonLdEvento, nombreSitio, puntoComoLlegar, sabidoGratis, sitioEnLista, textoCosto } from "@/lib/eventos";
import { kpiCuando, kpiCuandoPorDia } from "@/lib/ficha";
import { calleCorta, hrefLugar } from "@/lib/lugares";
import type { SedeMapa } from "@/lib/mapaSedes";
import { etiquetaArtista, hrefArtista } from "@/lib/artistas";
import { SIN_FOTO } from "@/lib/imagen";
import { diaLocal, eventoPaso, fechaCortaChip, filtroSinPasar, formatearLargo } from "@/lib/fechas";
import { renglonLigado } from "@/lib/ligado";
import { programaDeFestival, textoActividades, textoProgramaConPasados, vistaDeFicha } from "@/lib/programaFestival";
import { conPrimerDia, listaDeSesiones, sesionesVigentes, type SesionGuardada } from "@/lib/sesionesEvento";
import { hrefCreador } from "@/lib/carteles/origen";
import { cargarActosDeMarcos } from "@/lib/cargarSedes";
import { funcionesHermanas, otrasFunciones, textoFuncion } from "@/lib/series";
import { hrefSitio } from "@/lib/sitios";
import { portadaDeFestival, proximoPorSede, sedesDeFestival, textoActosEnSede, VARIAS_SEDES } from "@/lib/sedesFestival";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { borrarEvento, cambiarVisibleEvento, publicarBorrador, type EstadoAsistencia } from "../acciones";
import Asistencia from "./Asistencia";
import RenglonCancelado, { AvisoCancelado } from "./MarcarCancelado";
import MetaSitio from "./MetaSitio";
import QuienVa from "./QuienVa";
import styles from "./ficha.module.css";
import { MARCA, tituloDePagina } from "@/lib/marca";

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
async function KpiVan({ eventoId, miId, pasado = false, cancelado = false }: { eventoId: string; miId: string | null; pasado?: boolean; cancelado?: boolean }) {
  // Lo que se canceló (OL-391) no tuvo a nadie: ni «Fueron» ni «Van».
  if (cancelado) return null;
  const [asistencias, totalVanRpc] = await Promise.all([cargarAsistenciasCache(eventoId, miId), cargarTotalVanCache(eventoId)]);
  const valor = Math.max(totalVanRpc, asistencias.van.length);
  // En pasado (OL-383) es cuántos dijeron «Voy», «Fueron», y baja a «Quién fue» (OL-388); con nadie no se pinta, como tampoco «Quién fue».
  if (pasado && valor === 0) return null;
  return <Kpi icono={<IconoPersonas width={16} height={16} />} etiqueta={pasado ? "Fueron" : "Van"} valor={valor} salto="quien-va" />;
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

/**
 * La lista de quién va (`QuienVa`), diferida: la misma consulta que `KpiVan`, memoizada por `cache()`. En pasado (OL-388) es «Quién fue», quienes
 * dijeron «Voy»; si nadie lo dijo, no hay sección.
 */
async function QuienVaDiferido({ eventoId, miId, conSesion, pasado = false, cancelado = false }: { eventoId: string; miId: string | null; conSesion: boolean; pasado?: boolean; cancelado?: boolean }) {
  // Nadie fue a lo que no ocurrió (OL-391): sin «Quién fue».
  if (cancelado) return null;
  const [asistencias, totalVanRpc] = await Promise.all([cargarAsistenciasCache(eventoId, miId), cargarTotalVanCache(eventoId)]);
  const totalVan = Math.max(totalVanRpc, asistencias.van.length);
  if (pasado && totalVan === 0) return null;
  return <QuienVa van={asistencias.van} total={totalVan} interesados={asistencias.interesados} conSesion={conSesion} pasado={pasado} />;
}

/**
 * Un renglón de lo ligado (la inauguración, la exposición que inaugura, el festival del que es parte): siempre a su ficha. Lo que ya pasó (OL-388)
 * se ve pasado y no activo: «Ya pasó» chico encima (como la ceja de las tarjetas), el título en el gris del texto suave y la fecha en pasado. Si
 * se canceló (OL-391), el título tachado y «Se canceló» en vez de «Fue el …» (`renglonLigado`).
 */
function RenglonLigado({ href, icono, titulo, meta, pasado, cancelado = false }: { href: string; icono: ReactNode; titulo: string; meta: string; pasado: boolean; cancelado?: boolean }) {
  return (
    <li>
      <Link href={href} className={[renglon.dato, pasado && styles.ligadoPasado, pasado && cancelado && styles.ligadoCancelado].filter(Boolean).join(" ")}>
        {icono}
        {pasado && <i>Ya pasó</i>}
        <b>{titulo}</b>
        <small>{meta}</small>
        <IconoChevronDerecha />
      </Link>
    </li>
  );
}

/** Lo ligado a un evento por su clase (OL-321): el horario de una exposición (propio y el de su lugar) y su inauguración, el programa de un
 *  festival (sus actos visibles y, para su autor, sus borradores), el festival de un acto y la exposición que inaugura. Cada consulta falla
 *  sola sin tumbar la ficha (sin la migración, nada de esto existe y la ficha es la de siempre). */
type Ligado = { id: string; slug: string | null; titulo: string; inicio: string; fin: string | null; zona: string; cancelado?: boolean };
type Acto = EventoAgenda & { borrador?: boolean; visible?: boolean; retirado_por_admin?: boolean; cancelado?: boolean; sitio_lat?: number | null; sitio_lng?: number | null; ciudad?: string | null };
async function cargarLigados(e: EventoConLugar) {
  const supabase = await clienteServidor();
  const vacio = { horarioPropio: [] as Franja[], horarioLugar: [] as Franja[], inauguracion: null as Ligado | null, actos: [] as Acto[], padre: null as Ligado | null, inaugura: null as Ligado | null };
  if (!supabase) return vacio;
  const filas = (r: { data: unknown }) => (Array.isArray(r.data) ? (r.data as { dias: number[]; abre: string; cierra: string }[]).map(franjaDeFila) : []);
  const uno = (r: { data: unknown }) => (r.data as Ligado | null) ?? null;
  // `cancelado` (OL-391): lo ligado que ya pasó y se canceló lo dice («Se canceló»), y un acto cancelado lo dice en el «Ya pasó» del festival.
  const columnas = "id, slug, titulo, inicio, fin, zona, cancelado";
  const [horarioPropio, horarioLugar, inauguracion, actos, padre, inaugura] = await Promise.all([
    e.clase === "exposicion" ? supabase.from("eventos_horarios").select("dias, abre, cierra").eq("evento_id", e.id).order("creado_en").then(filas) : [],
    e.clase === "exposicion" && e.lugar_id ? supabase.from("lugares_horarios").select("dias, abre, cierra").eq("lugar_id", e.lugar_id).order("creado_en").then(filas) : [],
    e.inaugura_id ? supabase.from("eventos").select(columnas).eq("id", e.inaugura_id).maybeSingle().then(uno) : null,
    e.clase === "festival"
      ? supabase
          .from("eventos")
          // Con su clase, su festival y su horario por día (OL-410, «S»): el programa pone cada función de un acto en su día, con su hora.
          .select("id, slug, titulo, inicio, fin, zona, imagen, precio, lugar_id, sitio_texto, sitio_direccion, sitio_lat, sitio_lng, sitio_reservado, ciudad, creado_en, visible, borrador, retirado_por_admin, cancelado, clase, evento_padre_id, lugar:lugares(id, slug, nombre, portada, direccion, lat, lng), sesiones:eventos_sesiones(inicio, fin)")
          .eq("evento_padre_id", e.id)
          .order("inicio")
          .limit(100)
          .then((r) =>
            Array.isArray(r.data)
              ? (r.data as unknown as (Omit<Acto, "sesiones"> & { lugar: Acto["lugar"] | Acto["lugar"][]; sesiones?: SesionGuardada[] | null })[]).map(({ sesiones: guardadas, ...a }) => {
                  const sesiones = sesionesVigentes(a, guardadas);
                  return { ...a, lugar: Array.isArray(a.lugar) ? (a.lugar[0] ?? null) : a.lugar, van: null, ...(sesiones.length ? { sesiones } : {}) };
                })
              : [],
          )
      : [],
    e.evento_padre_id ? supabase.from("eventos").select(columnas).eq("id", e.evento_padre_id).maybeSingle().then(uno) : null,
    e.clase === "puntual" || !e.clase ? supabase.from("eventos").select(columnas).eq("inaugura_id", e.id).limit(1).maybeSingle().then(uno, () => null) : null,
  ]);
  return { horarioPropio, horarioLugar, inauguracion, actos, padre, inaugura };
}

/**
 * Las otras funciones de lo mismo (OL-385): los eventos visibles y sin pasar del mismo lugar (o, sin lugar, del mismo sitio escrito, sin importar
 * mayúsculas), hasta 100, y aquí, en TypeScript, los de su mismo título normalizado (`otrasFunciones`). Ni un festival ni una exposición las tienen.
 * Aparte, las que ya pasaron (las 100 más recientes, solo lo que hace falta para compararlas), para que «Función n de N» cuente todas (OL-418:
 * `hermanas` son las pasadas y las por venir). Si la consulta falla, la ficha sigue sin el bloque.
 */
async function cargarOtrasFunciones(e: EventoConLugar, ahora: Date): Promise<{ otras: EventoAgenda[]; hermanas: Pick<EventoAgenda, "id" | "inicio">[] }> {
  const ninguna = { otras: [], hermanas: [] };
  if (e.clase === "festival" || e.clase === "exposicion" || (!e.lugar_id && !e.sitio_texto?.trim())) return ninguna;
  const supabase = await clienteServidor();
  if (!supabase) return ninguna;
  let consulta = supabase
    .from("eventos")
    .select("id, slug, titulo, inicio, fin, zona, imagen, precio, lugar_id, sitio_texto, sitio_direccion, sitio_reservado, creado_en, clase, evento_padre_id, colores_cartel, lugar:lugares(nombre, portada)")
    .eq("visible", true)
    .or(filtroSinPasar(ahora))
    .neq("id", e.id);
  let yaPasadas = supabase.from("eventos").select("id, titulo, inicio, lugar_id, sitio_texto, clase").eq("visible", true).lt("termina", ahora.toISOString()).neq("id", e.id);
  if (e.lugar_id) {
    consulta = consulta.eq("lugar_id", e.lugar_id);
    yaPasadas = yaPasadas.eq("lugar_id", e.lugar_id);
  } else {
    // En el sitio escrito, `%`, `_` y la barra no son comodines: se escapan.
    const sitio = e.sitio_texto!.trim().replace(/[\\%_]/g, "\\$&");
    consulta = consulta.is("lugar_id", null).eq("ciudad", e.ciudad).ilike("sitio_texto", sitio);
    yaPasadas = yaPasadas.is("lugar_id", null).eq("ciudad", e.ciudad).ilike("sitio_texto", sitio);
  }
  const [porVenir, pasadas] = await Promise.all([consulta.order("inicio").limit(100), yaPasadas.order("inicio", { ascending: false }).limit(100)]);
  const filas = Array.isArray(porVenir.data) ? (porVenir.data as unknown as (EventoAgenda & { lugar: EventoAgenda["lugar"] | NonNullable<EventoAgenda["lugar"]>[] })[]) : [];
  const candidatos = filas.map((f) => ({ ...f, lugar: Array.isArray(f.lugar) ? (f.lugar[0] ?? null) : f.lugar, van: null }));
  const otras = otrasFunciones(e, candidatos, (x) => eventoPaso(x.inicio, x.fin, ahora, x.zona));
  const yaPasaron = funcionesHermanas(e, Array.isArray(pasadas.data) ? (pasadas.data as unknown as Pick<EventoAgenda, "id" | "titulo" | "inicio" | "lugar_id" | "sitio_texto" | "clase">[]) : []);
  // Sin repetir: las dos lecturas no se cruzan (`termina`), pero la cuenta no depende de eso.
  return { otras, hermanas: [...new Map([...yaPasaron, ...otras].map((x) => [x.id, x])).values()] };
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
  // Falló la lectura (no «no existe»): sin etiquetas propias. Con `{}` rigen las del sitio (título «Somos Nosotrxs»), sin
  // `noindex` ni canonical; si la excepción saliera de aquí Next descartaría todas las etiquetas, también el título (OL-289).
  if (e === undefined) return {};
  if (!e) return { title: tituloDePagina("Evento") };
  // Un evento que ya pasó no se anuncia al compartir (decisión del founder, 2026-09-14): sin imagen ni tarjeta; su ficha existe en pasado
  // (OL-383) y su título y su descripción lo dicen.
  if (eventoPaso(e.inicio, e.fin, new Date(), e.zona)) {
    // Si se marcó «se canceló» (OL-391), lo dice en vez de «Ya pasó»: sigue visible y se puede compartir.
    const cuandoFue = formatearLargo(e.inicio, new Date(), null, e.zona);
    if (e.cancelado) return { title: tituloDePagina(e.titulo, "Se canceló"), description: `Se canceló: era el ${cuandoFue}.`, alternates: { canonical: `${ORIGEN}${hrefEvento(e)}` } };
    return { title: tituloDePagina(e.titulo, "Ya pasó"), description: `Ya pasó: fue el ${cuandoFue}.`, alternates: { canonical: `${ORIGEN}${hrefEvento(e)}` } };
  }
  const cuando = formatearLargo(e.inicio, new Date(), null, e.zona);
  // Un festival dice sus sedes, derivadas de sus actos (OL-339): «Varias sedes» o la única; sin imagen propia, se comparte con el cartel de su
  // próximo acto (OL-346). Las dos, de una lectura.
  const supabase = e.clase === "festival" ? await clienteServidor() : null;
  const actos = supabase ? (await cargarActosDeMarcos(supabase, [e.id]))?.get(e.id) : undefined;
  const sedes = actos ? sedesDeFestival(actos) : undefined;
  // El costo, solo si se sabe (OL-411): sin precio, «Gratis» en un evento suelto; en uno de costo opcional («Por confirmar» en la ficha), nada.
  const costo = textoCosto(e.precio, costoOpcional(e));
  const descripcion = `${cuando} · ${nombreSitio({ lugar: e.lugar, sitio_texto: e.sitio_texto, sitio_direccion: e.sitio_direccion, sitio_reservado: e.sitio_reservado, sedes })}${costo === POR_CONFIRMAR ? "" : ` · ${costo}`}`;
  const imagen = fotoDeEvento({ imagen: e.imagen, portadaActo: actos ? (portadaDeFestival(actos) ?? undefined) : undefined, lugar: e.lugar }) ?? undefined;
  return {
    title: tituloDePagina(e.titulo),
    description: descripcion,
    alternates: { canonical: `${ORIGEN}${hrefEvento(e)}` },
    openGraph: { title: e.titulo, description: descripcion, url: `${ORIGEN}${hrefEvento(e)}`, type: "article", images: imagen ? [{ url: imagen }] : undefined, locale: "es_MX", siteName: MARCA },
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
  const privadoLeido = e.sitio_reservado ? await cargarPrivado(e.id) : null;
  // Un evento que ya pasó y se ve existe en pasado (OL-383): lo enlaza el «Ya pasó» de su festival. Oculto o borrador, «Esto ya no está» para
  // quien no lo gestiona; quien lo publicó y la administración lo siguen viendo como antes.
  const vista = vistaDeFicha({ paso, puedeEditar, visible: e.visible, borrador: e.borrador, conDireccionReservada: !!(actual && privadoLeido) });
  if (vista === "no-existe") notFound();
  // Tras el fin, la dirección reservada solo con sesión (OL-257): una respuesta inesperada sin sesión no la enseña en la ficha en pasado.
  const privado = paso && !puedeEditar && !actual ? null : privadoLeido;
  const consultaTrasFin = vista === "pasado";
  // «Se canceló» (OL-391): solo cuenta en lo que ya pasó. Quien gestiona el evento (autora o administración) lo marca o lo deshace desde el menú
  // «···», de un toque, mientras se vea (un borrador u oculto no cambian); la acción vuelve a comprobarlo todo en el servidor.
  const cancelado = paso && !!e.cancelado;
  const ofrecerCancelar = puedeEditar && paso && e.visible && !e.borrador;
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
  const esAdmin = actual?.perfil.rol === "admin";
  const destacable = esAdmin && puedeDestacarse({ visible: e.visible, paso, lugar: e.lugar }) ? await cargarDestacado("evento", e.id) : null;
  // OL-458: «Publicar en Instagram» en el «···», solo la administración y solo lo que está por venir (`sePuedePublicar`); un evento que ya pasó
  // no lo ofrece. Si ya se publicó, el renglón dice cuándo.
  const otros = e as unknown as { termina?: string; cancelado?: boolean; borrador?: boolean; retirado_por_admin?: boolean };
  const publicable = esAdmin && sePuedePublicar({ inicio: e.inicio, termina: otros.termina ?? e.fin ?? e.inicio, zona: e.zona, clase: e.clase ?? "puntual", visible: e.visible, cancelado: otros.cancelado, borrador: otros.borrador, retirado_por_admin: otros.retirado_por_admin, sesiones: e.sesiones ?? null }, new Date());
  const clienteIg = publicable ? await clienteServidor() : null;
  const yaEnInstagram = clienteIg ? (await clienteIg.from("instagram_publicaciones").select("creado_en").eq("evento_id", e.id).eq("estado", "publicada").order("creado_en", { ascending: false }).limit(1).maybeSingle<{ creado_en: string }>()).data : null;
  // Con horario por día (OL-311) cada día lleva sus horas; si se editó el evento por el formulario de siempre y ya no coinciden, se ignoran.
  const sesiones = sesionesVigentes(e, e.sesiones);
  // Cómo ocurre (OL-321; doc 55 §3): lo ligado por su clase, la línea de cuándo de una exposición y de un festival, y «Me interesa» sin «Voy».
  const clase = e.clase ?? "puntual";
  const ahora = new Date();
  const [ligados, { otras: funciones, hermanas }] = await Promise.all([cargarLigados(e), cargarOtrasFunciones(e, ahora)]);
  // El costo (OL-411; firma del founder: «K «Por confirmar»»): sin precio, «Gratis» solo en un evento suelto; en un festival, una exposición, un
  // taller, un acto de festival o una inauguración (que heredan el costo de lo suyo), «Por confirmar».
  const opcional = costoOpcional({ clase, evento_padre_id: e.evento_padre_id, inauguracion: !!ligados.inaugura });
  const costo = textoCosto(e.precio, opcional);
  const horario = horarioEfectivo(ligados.horarioPropio, ligados.horarioLugar);
  // «Función 2 de 6» junto a la clase, si tiene funciones hermanas y no ha pasado; cuenta todas, también las que ya pasaron (OL-418). «Voy» sigue
  // siendo por función (H8 de docs/investigaciones/eventos-modelo.md): cada renglón de «Otras funciones» (las que no han pasado) lleva el suyo.
  const funcion = consultaTrasFin || paso ? null : textoFuncion(e, hermanas);
  const decididasFunciones = funciones.length ? await decididasDe(actual?.perfil.id ?? null, funciones.map((f) => f.id)) : null;
  const hoy = diaLocal(ahora, e.zona);
  // Lo ligado que ya pasó se enlaza a su ficha en pasado y se dice en pasado (OL-388, sustituye a OL-380): «Fue el …», «Cerró el …», «Terminó el …».
  const inauguracion = ligados.inauguracion ? renglonLigado(ligados.inauguracion, ahora) : null;
  const inaugura = ligados.inaugura ? renglonLigado(ligados.inaugura, ahora, "Cerró") : null;
  const padre = ligados.padre ? renglonLigado(ligados.padre, ahora, "Terminó") : null;
  // El programa: los actos que no son borrador (los que la base deja ver: a quien no administra el festival, solo los visibles).
  const actosVisibles = ligados.actos.filter((a) => !a.borrador);
  // Un festival sin programa (OL-413; definición aprobada por el founder el 18 de octubre: el programa es opcional): sin actividades publicadas y
  // de pocos días, se presenta como un evento, con su día, su hora, su lugar y su «Voy»; conserva la cabecera oscura y la etiqueta «Festival».
  const comoEvento = clase === "festival" && festivalComoEvento({ clase, inicio: e.inicio, fin: e.fin, zona: e.zona, programa: { registrados: actosVisibles.length } });
  // Lo que viene va en «Programa»; lo que ya pasó, aparte y plegado en «Ya pasó», cada acto con su ficha en pasado (OL-383, «X1 como pasado · X2»).
  const programa = programaDeFestival(actosVisibles, ahora);
  const borradores = puedeEditar ? ligados.actos.filter((a) => a.borrador) : [];
  // Las sedes de un festival (OL-339): las de sus actos publicados (lo que ve cualquiera), sin repetir y en el orden de su primer acto; sin actos que
  // digan dónde, lo capturado en el festival (`sedesDeFestival`). Se calculan al leer: cambian en cuanto un acto cambia de lugar.
  const actosPublicados = actosVisibles.filter((a) => a.visible !== false && !a.retirado_por_admin);
  const sedesFestival = clase === "festival" ? sedesDeFestival(actosPublicados, e) : [];
  // Las que salen de sus actos (la de respaldo se pinta como la de cualquier evento): con varias, mapa con todos los pines y su lista; con una, esa.
  const sedes = sedesFestival.some((s) => s.actos > 0) ? sedesFestival : [];
  const sedeUnica = sedes.length === 1 ? sedes[0] : null;
  const sitio = nombreSitio({ lugar: e.lugar, sitio_texto: e.sitio_texto, sitio_direccion: e.sitio_direccion, sitio_reservado: e.sitio_reservado, sedes });
  // El cuándo del festival con la regla de todo periodo (OL-409, «U»): en curso «Hasta el …», por venir «Del … al …».
  const rangoFestival = clase === "festival" ? cuandoDePeriodo(e, ahora) : null;
  // Cuántas actividades tiene lo dice una sola vez el número de la banda («Actividades 3», OL-418; antes también la línea, «Programa registrado: 3
  // actividades»): la línea dice su cuándo y, sin actos publicados todavía, «Programa por confirmar», como su tarjeta en Inicio (OL-346).
  const cuandoClase = clase === "exposicion" ? textoVisita(visitaDeEvento(e.inicio, e.fin, e.zona), hoy, ahora, e.zona) : clase === "festival" && !comoEvento ? [rangoFestival, actosVisibles.length ? null : PROGRAMA_POR_CONFIRMAR].filter(Boolean).join(" · ") : null;
  const { url, texto } = compartirEvento(e, sitio, sesiones.length > 0, cuandoClase);
  const decididasActos = clase === "festival" ? await decididasDe(actual?.perfil.id ?? null, programa.porVenir.map((a) => a.id)) : null;
  // Con dirección cuando se puede (a diferencia de `sitio`, que solo da el nombre): mismo criterio que el archivo
  // .ics (`donde` en .../calendario/route.ts) para que la hoja nativa del sistema muestre algo útil para llegar.
  const lugarCalendario = sedes.length > 1 ? VARIAS_SEDES : sedeUnica ? [sedeUnica.nombre, sedeUnica.direccion].filter(Boolean).join(", ") : e.lugar ? [e.lugar.nombre, e.lugar.direccion].filter(Boolean).join(", ") : sitio;
  // La hoja nativa del iPhone agrega un solo evento: con horario por día, el primer día y todos los días en las notas (el .ics de la web lleva uno por día).
  const datosCalendario = datosEventoNativo(conPrimerDia({ id: e.id, slug: e.slug, titulo: e.titulo, inicio: e.inicio, fin: e.fin, descripcion: e.descripcion, lugar: lugarCalendario }, sesiones, e.zona));
  // El punto del mapa y de «Cómo llegar»: el del evento; el de la única sede de un festival; ninguno con varias (cada sede lleva a su ficha).
  const argsSitio = sedes.length
    ? { lugar: sedeUnica?.punto ?? null, sitioReservado: false, sitioLat: null, sitioLng: null, privado: null }
    : { lugar: e.lugar, sitioReservado: e.sitio_reservado, sitioLat: e.sitio_lat, sitioLng: e.sitio_lng, privado };
  const comoLlegar = enlaceComoLlegar(argsSitio);
  const puntoMapa = puntoComoLlegar(argsSitio);
  // Solo la coordenada, para la distancia del renglón del sitio: `puntoMapa` puede ser el lugar entero y no tiene por qué viajar al teléfono.
  const puntoDistancia = puntoMapa && { lat: puntoMapa.lat, lng: puntoMapa.lng };
  // Lo que pinta el mapa de «Dónde» y su capa a pantalla completa (OL-350): las sedes de los actos de un festival, cada una con «N actividades» y el día de
  // su próximo acto en el pin (founder, 2026-10-08: «puede decir n actividades y la próxima se descubre en el listado»); si no, el sitio del evento con su
  // dirección y el día del evento. El ángulo de su tarjeta abre la misma ficha que su renglón en «Dónde».
  const proximos = sedes.length ? proximoPorSede(actosPublicados, e.zona, ahora) : null;
  const sedesMapa: SedeMapa[] = proximos
    ? sedes.flatMap((s) => {
        const inicio = proximos.get(s.clave);
        return s.punto ? [{ clave: s.clave, nombre: s.nombre, punto: s.punto, meta: textoActosEnSede(s.actos), href: s.href, reservado: s.reservado, comoLlegar: enlaceComoLlegar({ lugar: s.punto, sitioReservado: false, sitioLat: null, sitioLng: null, privado: null })!, proximo: inicio ? { inicio, zona: e.zona } : null }] : [];
      })
    : puntoDistancia && comoLlegar
      ? [
          {
            clave: "sitio",
            nombre: e.lugar?.nombre ?? e.sitio_texto ?? sitio,
            punto: puntoDistancia,
            meta: calleCorta(e.lugar ? e.lugar.direccion : e.sitio_reservado ? privado?.direccion : e.sitio_direccion) || null,
            href: e.lugar ? hrefLugar(e.lugar) : !e.sitio_reservado && e.visible && !paso ? hrefSitio(e) : null,
            comoLlegar,
            proximo: { inicio: e.inicio, zona: e.zona },
          },
        ]
      : [];
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
          gratis: sabidoGratis(e.precio, opcional),
          sitioNombre: sitio,
          direccionPublica: direccionYCiudad.direccion,
          ciudadPublica: direccionYCiudad.ciudad,
          sitioLat: geoPublico?.lat ?? null,
          sitioLng: geoPublico?.lng ?? null,
        })
      : null;
  // BreadcrumbList (OL-143, doc 36): misma condición que el JSON-LD del evento — lo que también vería un visitante sin sesión.
  const migajas = e.visible && !paso ? jsonLdMigajas([{ nombre: "Inicio", url: "/" }, { nombre: "Agenda", url: "/" }, { nombre: e.titulo, url: hrefEvento(e) }]) : null;

  // Sin imagen propia, un festival lleva el cartel de su próximo acto publicado (OL-346), de los actos ya cargados; si no, la portada de su lugar.
  const portadaActo = clase === "festival" && !e.imagen ? (portadaDeFestival(actosPublicados, ahora) ?? undefined) : undefined;
  const portada = fotoDeEvento({ imagen: e.imagen, portadaActo, lugar: e.lugar });
  const cuando = e.fin && sesiones.length > 0 ? kpiCuandoPorDia(e.inicio, e.fin, e.zona) : kpiCuando(e.inicio, e.fin, e.zona);
  const kpiExpo = clase === "exposicion" ? kpisDeExposicion(e, horario.franjas, ahora) : null;
  // En pasado (OL-383) una exposición dice cuándo cerró y cuándo abrió, no el horario de hoy.
  if (kpiExpo && consultaTrasFin) kpiExpo.hoy = { etiqueta: "Abrió", valor: fechaCortaChip(e.inicio, e.zona) };
  // La cabecera oscura (OL-351, prototipo firmado `cabecera-clases.html`, variante A): una exposición, un taller o un festival llevan su clase en la
  // etiqueta, sus tres números en la banda y su línea bajo el título: el festival, su periodo y su programa; el taller, cuándo y dónde (el sitio
  // sin su dirección, como en las listas: la dirección está en «Dónde»); la exposición ninguna (repetía lo que dicen «Hasta» y «Horario»). Sin
  // «Cupo»: no existe en el modelo, el taller sigue con «Van». Un evento suelto, el héroe y los números de siempre.
  const numerosClase = kpiExpo ? (
    <Kpis piel="banda">
      <Kpi icono={<IconoCalendario width={16} height={16} />} etiqueta={consultaTrasFin ? "Cerró" : "Hasta"} valor={kpiExpo.hasta} />
      <Kpi icono={<IconoBoleto width={16} height={16} />} etiqueta="Costo" valor={costo} />
      <Kpi icono={<IconoReloj width={16} height={16} />} etiqueta={kpiExpo.hoy.etiqueta} valor={kpiExpo.hoy.valor} />
    </Kpis>
  ) : comoEvento ? (
    // Un festival sin programa: cuándo, el costo y cuántos van, como un evento suelto, en la banda de la cabecera oscura.
    <Kpis piel="banda">
      <Kpi icono={<IconoCalendario width={16} height={16} />} etiqueta={cancelado ? `Era · ${cuando.hora}` : consultaTrasFin ? `Fue · ${cuando.hora}` : cuando.hora} valor={cuando.dia} />
      <Kpi icono={<IconoBoleto width={16} height={16} />} etiqueta="Costo" valor={costo} />
      <Suspense fallback={cancelado ? null : <EsqueletoKpi />}>
        <KpiVan eventoId={e.id} miId={actual?.perfil.id ?? null} pasado={consultaTrasFin} cancelado={cancelado} />
      </Suspense>
    </Kpis>
  ) : clase === "festival" ? (
    <Kpis piel="banda">
      <Kpi icono={<IconoCalendario width={16} height={16} />} etiqueta="Actividades" valor={actosVisibles.length} />
      <Kpi icono={<IconoBoleto width={16} height={16} />} etiqueta="Costo" valor={costo} />
      <Kpi icono={<IconoPin width={16} height={16} />} etiqueta="Sedes" valor={sedesFestival.length} />
    </Kpis>
  ) : clase === "taller" ? (
    <Kpis piel="banda">
      <Kpi icono={<IconoCalendario width={16} height={16} />} etiqueta="Sesiones" valor={Math.max(sesiones.length, 1)} />
      <Kpi icono={<IconoBoleto width={16} height={16} />} etiqueta="Costo" valor={costo} />
      <Suspense fallback={<EsqueletoKpi />}>
        <KpiVan eventoId={e.id} miId={actual?.perfil.id ?? null} pasado={consultaTrasFin} cancelado={cancelado} />
      </Suspense>
    </Kpis>
  ) : undefined;
  const metaClase = comoEvento ? lineaDeFestivalSinPrograma(e, sitioEnLista({ lugar: e.lugar, sitio_texto: e.sitio_texto, sitio_direccion: e.sitio_direccion, sitio_reservado: e.sitio_reservado }), ahora) : clase === "festival" ? (cuandoClase ?? undefined) : clase === "taller" ? lineaDeTaller(e, sitioEnLista({ lugar: e.lugar, sitio_texto: e.sitio_texto, sitio_direccion: e.sitio_direccion, sitio_reservado: e.sitio_reservado, sedes }), ahora) : undefined;
  // En pasado (OL-383) lo dice el chip de la cabecera; el aviso queda solo para la dirección reservada que aún se puede consultar (OL-257).
  const avisoPasado = consultaTrasFin && !!privado;
  const hayAvisos = error === "borrar" || error === "publicar" || error === "no_publicable" || avisoPasado || (!consultaTrasFin && (!e.visible || paso));
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
            {/* Un festival sin programa (OL-413): sus actividades como fichas aparte son opcionales; se agregan desde aquí. */}
            {comoEvento && !paso && (
              <li>
                <Link href={enlaceAltaEvento({ festival: e.id })} className={renglon.ajuste}>
                  <IconoCalendarioMas width={20} height={20} />
                  <b>Agregar programa</b>
                </Link>
              </li>
            )}
            <li>
              <Link href={hrefCreador(hrefEvento(e), "menu")} className={renglon.ajuste}>
                <IconoCartel width={20} height={20} />
                <b>Crear cartel</b>
              </Link>
            </li>
            {ofrecerCancelar && <RenglonCancelado eventoId={e.id} cancelado={cancelado} />}
          </>
        )}
        {destacable && <DestacarFicha tipo="evento" id={e.id} {...destacable} />}
        {publicable && <RenglonPublicarInstagram publicado={yaEnInstagram ? cuandoSePublico(yaEnInstagram.creado_en, new Date(), e.zona).toLowerCase() : null} />}
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
      {publicable && <HojaInstagramDeFicha eventoId={e.id} />}
      <Heroe
        portada={portada}
        alt={e.imagen || portadaActo ? `Cartel de ${e.titulo}` : `Foto de ${e.lugar?.nombre ?? e.titulo}`}
        titulo={e.titulo}
        etiqueta={[numerosClase && cortoDeClase(clase), funcion, cancelado ? "Se canceló" : consultaTrasFin && "Ya pasó"].filter(Boolean).join(" · ") || undefined}
        cancelado={cancelado}
        meta={metaClase}
        banda={numerosClase}
      />

      {hayAvisos && (
        <div className={ficha.avisos}>
          {error === "publicar" && (
            <p className="aviso-error" role="alert">No se pudo publicar la actividad. Intenta de nuevo.</p>
          )}
          {error === "borrar" && (
            <p className="aviso-error" role="alert">
              No se pudo borrar. ¿Sigues con sesión y es tu evento?
            </p>
          )}
          {error === "no_publicable" && (
            <p className="aviso-error" role="alert">
              La administración retiró esta actividad.
            </p>
          )}
          {avisoPasado && (
            <p className={`aviso-error ${ficha.oculto}`} role="status">
              Este evento ya terminó. La dirección sigue disponible hasta dos horas después de su fin.
            </p>
          )}
          {!consultaTrasFin && (!e.visible || paso) && (
            <p className={`aviso-error ${ficha.oculto}`} role="status">
              {paso && e.visible
                ? cancelado
                  ? "Marcado «Se canceló»: los demás lo ven así y no cuenta en el historial de sus artistas ni de su lugar."
                  : "Este evento ya pasó: los demás lo ven en pasado, sin «Voy» ni «Cómo llegar»."
                : `${paso ? "Este evento ya pasó" : "Este evento está oculto"}: solo lo ven quien lo publicó y la administración.`}
            </p>
          )}
        </div>
      )}

      <div className={ficha.cuerpo} data-cuerpo>
        {/* Un evento suelto: cuándo, el costo y cuántos van. Los de una exposición, un taller o un festival van en la banda de la cabecera. */}
        {!numerosClase && (
          <Kpis>
            {/* Lo que se canceló (OL-391) no «fue»: «Era · 7:00 pm». */}
            <Kpi icono={<IconoCalendario width={16} height={16} />} etiqueta={cancelado ? `Era · ${cuando.hora}` : consultaTrasFin ? `Fue · ${cuando.hora}` : cuando.hora} valor={cuando.dia} />
            <Kpi icono={<IconoBoleto width={16} height={16} />} etiqueta="Costo" valor={costo} />
            <Suspense fallback={cancelado ? null : <EsqueletoKpi />}>
              <KpiVan eventoId={e.id} miId={actual?.perfil.id ?? null} pasado={consultaTrasFin} cancelado={cancelado} />
            </Suspense>
          </Kpis>
        )}

        {/* Los accionables van arriba del mapa (founder, OL-225, 2026-09-26: "así se ven mas"). */}
        <div className={ficha.acciones}>
          <BotonCompartir titulo={e.titulo} texto={texto} url={url} className={ficha.accion}>
            <span className={CIRCULO}>
              <IconoCompartir />
            </span>
            Compartir
          </BotonCompartir>
          {/* Dice lo que hace: agrega el evento, con su alerta, al calendario del teléfono (decisión 12 de docs/rediseno/17).
              Dentro de la app de iPhone abre la hoja nativa del sistema en vez de descargar el .ics (OL-214, bitácora 243). En pasado (OL-383),
              solo «Compartir»: ni calendario ni «Cómo llegar». */}
          {!consultaTrasFin && (
            <BotonCalendario datos={datosCalendario} href={`${hrefEvento(e)}/calendario`} className={ficha.accion}>
              <span className={CIRCULO}>
                <IconoCalendarioAgregar width={24} height={24} />
              </span>
              A mi calendario
            </BotonCalendario>
          )}
          {/* Un festival con varias sedes no tiene un destino: baja a la lista de sedes, cada una con su ficha (y su «Cómo llegar»). */}
          {consultaTrasFin ? null : sedes.length > 1 ? (
            <Salto destino="donde" className={ficha.accion}>
              <span className={CIRCULO}>
                <IconoRuta />
              </span>
              Cómo llegar
            </Salto>
          ) : comoLlegar ? (
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
              imagen={e.imagen}
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
            <Link href={hrefCreador(hrefEvento(e), "accion")} className={ficha.accion}>
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

        {/* Las otras funciones de lo mismo (OL-385: mismo título, mismo sitio), debajo del cuándo y antes de «Dónde»: cada una con su día y su hora,
            su «Voy» (o «Vas», o «Te interesa» si ya decidió) y su ficha. El sitio es el mismo: no se repite. */}
        {funciones.length > 0 && (
          <section className={ficha.bloque} aria-label="Otras funciones">
            <h2>Otras funciones</h2>
            <EventosPorDia eventos={funciones} sinSitio decididas={decididasFunciones} avisos={avisosParaListas(actual)} />
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
              {/* Si ya pasó (OL-388), a su ficha en pasado, con el renglón en pasado. */}
              {ligados.inauguracion && inauguracion && <RenglonLigado href={hrefEvento(ligados.inauguracion)} icono={<IconoEstrella width={20} height={20} />} titulo="Inauguración" meta={inauguracion.cuando} pasado={inauguracion.pasado} cancelado={!!ligados.inauguracion.cancelado} />}
            </ul>
          </section>
        )}

        {/* Un festival (OL-321): su programa por día, cada acto con su ficha y su «Voy»; lo registrado se dice («Programa registrado: N»). Su autor
            ve también sus borradores, con «Publicar». Solo lo que viene (OL-383): lo que ya pasó va aparte, en «Ya pasó». */}
        {clase === "festival" && !(comoEvento && !borradores.length) && (
          <section className={ficha.bloque} aria-label="Programa">
            <h2>Programa</h2>
            {programa.porVenir.length ? (
              <EventosPorDia eventos={programa.porVenir} decididas={decididasActos} avisos={avisosParaListas(actual)} />
            ) : (
              !actosVisibles.length && <p className={ficha.vacio}>Todavía no hay actividades publicadas.</p>
            )}
            <p className={ficha.vacio}>
              {textoProgramaConPasados(actosVisibles.length, programa.porVenir.length)}
              {borradores.length ? ` · ${borradores.length} ${borradores.length === 1 ? "borrador" : "borradores"}` : ""}
            </p>
            {borradores.length > 0 && (
              <ul aria-label="Borradores">
                {borradores.map((b) => (
                  <li key={b.id} className={renglon.dato}>
                    <IconoCalendario width={20} height={20} />
                    <b>{b.titulo}</b>
                    <small>{formatearLargo(b.inicio, ahora, null, b.zona)} · {b.retirado_por_admin ? "retirado por la administración" : "borrador"}</small>
                    {/* Lo que la administración retiró no se publica (OL-328): la base lo rechaza y aquí no se ofrece. */}
                    {!b.retirado_por_admin && (
                      <form action={publicarBorrador.bind(null, b.id, hrefEvento(e))}>
                        <button type="submit" className={styles.publicarBorrador}>
                          Publicar
                        </button>
                      </form>
                    )}
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

        {/* Lo que ya pasó del festival (OL-383, prototipo firmado `inicio-propuestas.html`: «X1 como pasado · X2»): aparte, plegado al abrir la
            ficha («Ya pasó · 5 actividades»), y al tocarlo los mismos renglones por día, apagados y sin «Voy», cada uno a su ficha en pasado.
            `<details>`: se abre sin JS y no se recuerda. */}
        {clase === "festival" && programa.pasados.length > 0 && (
          <details className={styles.yaPaso} aria-label="Ya pasó">
            <summary>
              <h2>Ya pasó</h2>
              <small>{textoActividades(programa.pasados.length)}</small>
              <IconoCaret />
            </summary>
            {agruparPorDia(programa.pasados, ahora).map((g) => (
              <Fragment key={g.clave}>
                <h3>{g.titulo}</h3>
                <ul aria-label={g.titulo}>
                  {g.eventos.map((a) => (
                    <RenglonEvento key={a.id} evento={a} nota="ya pasó" cancelado={!!a.cancelado} />
                  ))}
                </ul>
              </Fragment>
            ))}
          </details>
        )}

        {/* El festival del que es parte, y la exposición que inaugura (OL-321): enlaces a su ficha; lo que ya acabó, en pasado (OL-388). */}
        {(ligados.padre || ligados.inaugura) && (
          <section className={ficha.bloque} aria-label="Parte de">
            <ul>
              {ligados.padre && padre && (
                <RenglonLigado href={hrefEvento(ligados.padre)} icono={<IconoEtiqueta width={20} height={20} />} titulo={`Parte de ${ligados.padre.titulo}`} meta={padre.pasado ? `Festival · ${padre.cuando}` : "Festival"} pasado={padre.pasado} cancelado={!!ligados.padre.cancelado} />
              )}
              {ligados.inaugura && inaugura && (
                <RenglonLigado
                  href={hrefEvento(ligados.inaugura)}
                  icono={<IconoEstrella width={20} height={20} />}
                  titulo={`${inaugura.pasado ? "Inauguró" : "Inaugura"} ${ligados.inaugura.titulo}`}
                  meta={inaugura.pasado ? `Exposición · ${inaugura.cuando}` : "Exposición"}
                  pasado={inaugura.pasado}
                  cancelado={!!ligados.inaugura.cancelado}
                />
              )}
            </ul>
          </section>
        )}

        {/* Un festival con sedes en sus actos (OL-339): con varias, el mapa con todos los pines y la lista de sedes, cada una con cuántas actividades
            tiene ahí; con una, como cualquier evento. Cada sede abre su ficha, del directorio o de sitio (OL-348); una reservada, ninguna. */}
        {sedes.length > 0 && (
          <section className={ficha.tarjeta} id="donde" aria-label="Dónde">
            <h2>Dónde</h2>
            <MapaFicha sedes={sedesMapa} ficha="festival" alt={sedes.length > 1 ? `las sedes de ${e.titulo}` : sitio} />
            <ul>
              {sedes.map((s) => (
                <li key={s.clave}>
                  <TarjetaSede nombre={s.nombre} href={s.href} reservado={s.reservado}>
                    {sedeUnica ? <MetaSitio direccion={s.direccion} punto={puntoDistancia} /> : <small>{textoActosEnSede(s.actos)}</small>}
                  </TarjetaSede>
                </li>
              ))}
            </ul>
          </section>
        )}

        {hayDonde && !sedes.length && (
          <section className={ficha.tarjeta}>
            <h2>Dónde</h2>
            <MapaFicha sedes={sedesMapa} ficha={clase === "festival" ? "festival" : "evento"} alt={sitio} />
            {/* El ángulo siempre abre una ficha (OL-348): la del lugar o la del sitio fuera del directorio, armada con los eventos que lo
                nombran (por eso solo si este se ve: uno oculto o que ya pasó no la arma). «Cómo llegar» está en las acciones de arriba. */}
            {e.lugar && (
              <TarjetaSede nombre={e.lugar.nombre} href={hrefLugar(e.lugar)}>
                <MetaSitio direccion={e.lugar.direccion} punto={puntoDistancia} />
              </TarjetaSede>
            )}
            {!e.lugar && e.sitio_texto && !e.sitio_reservado && (
              <TarjetaSede nombre={e.sitio_texto} href={e.visible && !paso ? hrefSitio(e) : null}>
                <MetaSitio direccion={e.sitio_direccion} punto={puntoDistancia} />
              </TarjetaSede>
            )}
            {/* En pasado (OL-383) no hay nada que revelar ni a qué entrar: sin la dirección que la base aún deje consultar, «ya no está disponible». */}
            {e.sitio_reservado &&
              (privado || actual || consultaTrasFin ? (
                <div className={renglon.dato}>
                  {privado ? <IconoPin width={20} height={20} /> : <IconoCandado width={20} height={20} />}
                  <b>{privado ? privado.direccion : `${e.sitio_texto} · sitio reservado`}</b>
                  {privado ? privado.indicaciones && <small>{privado.indicaciones}</small> : consultaTrasFin || sitioReservadoVencido(e) ? <small>La dirección ya no está disponible por privacidad.</small> : <small>La dirección se revela aquí {e.sitio_revelar_desde ? `el ${revela}` : revela}.</small>}
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

        {/* Una exposición o un festival no tienen «Voy» (OL-321): tampoco «Quién va». En pasado (OL-388), «Quién fue», solo si alguien dijo «Voy»: sin
            esqueleto mientras llega, para no pintar una sección que quizá no existe. */}
        {!soloInteres(clase, comoEvento) && (
          <Suspense fallback={consultaTrasFin || cancelado ? null : <EsqueletoQuienVa />}>
            <QuienVaDiferido eventoId={e.id} miId={actual?.perfil.id ?? null} conSesion={!!actual} pasado={consultaTrasFin} cancelado={cancelado} />
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
          soloInteres={soloInteres(clase, comoEvento)}
        />
      )}
      {/* El aviso de «Se canceló» con Deshacer (OL-391): fuera del menú, que se cierra al tocar. */}
      {ofrecerCancelar && <AvisoCancelado eventoId={e.id} />}
    </Ficha>
  );
}
