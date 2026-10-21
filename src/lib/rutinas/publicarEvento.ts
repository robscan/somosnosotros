import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formularioDeEvento, precioDeAgenda, resolverLugar, type EventoPropuesto } from "../cargaEventos";
import { leerParametrosCiudad, type ParametrosCiudad } from "../ciudadParametros";
import { validarEvento } from "../eventos";
import { isoALocal, zonaSegura } from "../fechas";
import { LIMITES_EVENTO } from "../limites";
import { normalizarNombre } from "../lugares";
import { urlSegura } from "../propuestas";
import { radioDeCiudadKm } from "./filtros";
import { ubicarSitioEnArea, type AreaCiudad, type Mapbox } from "./mapbox";

/**
 * Publicar un evento aceptado en la bandeja (OL-429). Por el mismo camino que el importador de la Mac (`cargaEventos.ts`): el lugar registrado
 * con ese nombre en la ciudad y, si no hay, el sitio con su punto de Mapbox dentro de la ciudad (sin punto no se publica: todo sitio lleva el
 * suyo, OL-348); lo que mandaría el formulario de alta (gratis, cooperación, precio) pasa por `validarEvento`; «¿Es este?» con
 * `eventos_parecidos` y el mismo título a la misma hora. Se inserta con la llave de servicio y sin sesión: es carga de agenda, no la publicación
 * de una persona, así que no crea avisos (ni el outbox de quienes siguen el lugar ni el de la administración: el autor es la cuenta de la
 * administración que aceptó). Queda `origen = 'rutina-agendas'` y `fuente_url` = la agenda.
 */

export const ORIGEN_RUTINA_AGENDAS = "rutina-agendas";

export type CiudadDeEvento = {
  slug: string;
  nombre: string;
  alias: string[];
  lat: number | null;
  lng: number | null;
  zona: string;
  radioKm: number;
  parametros: ParametrosCiudad;
};
export type LugarDeCiudad = { id: string; nombre: string; ciudad: string; zona: string | null; direccion: string | null };

export type MotivoSinPublicar = "sin_punto" | "invalido" | "parecido" | "pasado" | "base";
export type Preparado = { ok: true; fila: Record<string, unknown>; titulo: string } | { ok: false; motivo: MotivoSinPublicar; error: string };

const texto = (v: unknown, tope: number): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, tope) : "");
const objeto = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const nombresDe = (c: Pick<CiudadDeEvento, "nombre" | "alias">) => [c.nombre, ...c.alias.filter(Boolean)];

/** La ciudad de una corrida, con lo que hace falta para publicar en ella. */
export async function ciudadDeCorrida(db: SupabaseClient, corridaId: string): Promise<CiudadDeEvento | null> {
  const corrida = await db.from("rutinas_corridas").select("ciudad").eq("id", corridaId).maybeSingle();
  const slug = (corrida.data as { ciudad?: string | null } | null)?.ciudad;
  if (corrida.error || !slug) return null;
  const r = await db.from("ciudades").select("slug, nombre, lat, lng, zoom, zona, alias, parametros").eq("slug", slug).maybeSingle();
  if (r.error || !r.data) return null;
  const c = r.data as Record<string, unknown>;
  const parametros = leerParametrosCiudad(c.parametros);
  const zoom = typeof c.zoom === "number" ? c.zoom : 13;
  return {
    slug: String(c.slug),
    nombre: String(c.nombre),
    alias: Array.isArray(c.alias) ? c.alias.filter((a): a is string => typeof a === "string") : [],
    lat: typeof c.lat === "number" ? c.lat : null,
    lng: typeof c.lng === "number" ? c.lng : null,
    zona: zonaSegura(typeof c.zona === "string" ? c.zona : null),
    radioKm: parametros.radio_km ?? radioDeCiudadKm(zoom),
    parametros,
  };
}

/** Los lugares registrados de la ciudad (por su nombre y sus alias), como los lee el importador. */
export async function lugaresDeCiudad(db: SupabaseClient, ciudad: Pick<CiudadDeEvento, "nombre" | "alias">): Promise<LugarDeCiudad[] | null> {
  const r = await db.from("lugares").select("id, nombre, ciudad, zona, direccion").in("ciudad", nombresDe(ciudad)).limit(5000);
  if (r.error) return null;
  return (r.data ?? []) as LugarDeCiudad[];
}

/**
 * Lo que se insertaría en `eventos` para esta propuesta, o por qué no se publica (una frase para la bandeja). No escribe nada: así la bandeja
 * puede decir «no se publicó» antes de aceptar.
 */
export async function prepararEvento(
  dep: { db: SupabaseClient; mapbox: Mapbox | null; ahora: Date },
  datos: Record<string, unknown>,
  ciudad: CiudadDeEvento,
  lugares: readonly LugarDeCiudad[],
  autor: string,
): Promise<Preparado> {
  const titulo = texto(datos.titulo, LIMITES_EVENTO.titulo);
  const inicio = texto(datos.inicio, 40);
  if (!titulo || !inicio || Number.isNaN(Date.parse(inicio))) return { ok: false, motivo: "invalido", error: "No se publicó: la propuesta no trae título, fecha y hora." };
  if (Date.parse(inicio) < dep.ahora.getTime()) return { ok: false, motivo: "pasado", error: "No se publicó: ese evento ya pasó. Recházala." };
  const donde = texto(datos.lugar, LIMITES_EVENTO.sitio);
  if (!donde) return { ok: false, motivo: "invalido", error: "No se publicó: la propuesta no dice dónde es." };
  const lugar = resolverLugar(donde, [...lugares]);
  const zona = zonaSegura(lugar?.zona ?? ciudad.zona);
  const local = isoALocal(inicio, zona);
  const finTexto = texto(datos.fin, 40);
  const fin = finTexto && !Number.isNaN(Date.parse(finTexto)) ? isoALocal(finTexto, zona) : "";
  // Una función que acaba pasada la medianoche la arma `finLocal` con la hora (el día siguiente); más de un día, no se adivina.
  const dura = fin ? Date.parse(finTexto) - Date.parse(inicio) : 0;
  const horaFin = fin && dura > 0 && dura < 86_400_000 ? fin.slice(11, 16) : null;
  const enlace = urlSegura(datos.url);
  const propuesto: EventoPropuesto = {
    titulo,
    lugar: lugar?.nombre ?? null,
    fecha: local.slice(0, 10),
    hora: local.slice(11, 16),
    hora_fin: horaFin,
    precio: precioDeAgenda(texto(datos.precio, 120)),
    descripcion: texto(datos.descripcion, LIMITES_EVENTO.descripcion),
    enlace: enlace?.startsWith("https://") ? enlace : null,
  };
  if (!lugar) {
    // Un sitio que no está en el directorio: su punto, por nombre y dirección, dentro de la ciudad (como el importador con `--historico`).
    const direccion = texto(datos.direccion, LIMITES_EVENTO.direccion) || null;
    const centro = ciudad.lat != null && ciudad.lng != null ? { lat: ciudad.lat, lng: ciudad.lng } : null;
    const area: AreaCiudad | null = centro ? { centro, radioKm: ciudad.radioKm, nombres: nombresDe(ciudad) } : null;
    const eleccion = area && dep.mapbox ? await ubicarSitioEnArea(donde, direccion, area, dep.mapbox) : null;
    if (!eleccion) return { ok: false, motivo: "sin_punto", error: `No se publicó: «${donde}» no está en el directorio y el mapa no lo encuentra en ${ciudad.nombre}. Recházala o da de alta el lugar.` };
    const deMapbox = eleccion.punto.direccion.length <= LIMITES_EVENTO.direccion ? eleccion.punto.direccion : "";
    Object.assign(propuesto, { sitio: donde, sitio_direccion: direccion || deMapbox || null, sitio_lat: eleccion.punto.lat, sitio_lng: eleccion.punto.lng });
  }
  const { datos: evento, errores } = validarEvento(formularioDeEvento(propuesto, lugar?.id ?? null), zona);
  const primero = Object.values(errores)[0];
  if (primero) return { ok: false, motivo: "invalido", error: `No se publicó: ${primero}` };

  // «¿Es este?» como en el alta: el mismo día, en el mismo sitio, con un título parecido; y el mismo título a la misma hora en la ciudad.
  const parecidos = await dep.db.rpc("eventos_parecidos", { p_titulo: evento.titulo, p_inicio: evento.inicio, p_zona: evento.zona, p_lugar_id: evento.lugar_id, p_sitio_texto: evento.sitio_texto });
  if (parecidos.error) return { ok: false, motivo: "base", error: "No se pudo comprobar si ya está. Intenta de nuevo." };
  const parecido = (Array.isArray(parecidos.data) ? parecidos.data[0] : null) as { titulo?: string } | null;
  if (parecido) return { ok: false, motivo: "parecido", error: `Ya está «${parecido.titulo ?? evento.titulo}» ese día en ese sitio: recházala como duplicado.` };
  const mismaHora = await dep.db.from("eventos").select("titulo").eq("inicio", evento.inicio).in("ciudad", nombresDe(ciudad)).limit(50);
  if (mismaHora.error) return { ok: false, motivo: "base", error: "No se pudo comprobar si ya está. Intenta de nuevo." };
  const igual = ((mismaHora.data ?? []) as { titulo: string }[]).find((e) => normalizarNombre(e.titulo) === normalizarNombre(evento.titulo));
  if (igual) return { ok: false, motivo: "parecido", error: `Ya está «${igual.titulo}» a esa hora: recházala como duplicado.` };

  const { privado: _privado, ...fila } = evento;
  void _privado;
  return {
    ok: true,
    titulo: evento.titulo,
    fila: { ...fila, descripcion: fila.descripcion || null, ciudad: lugar?.ciudad ?? ciudad.nombre, creado_por: autor, origen: ORIGEN_RUTINA_AGENDAS, fuente_url: enlace },
  };
}

/** Inserta lo preparado con la llave de servicio (sin sesión: sin avisos). */
export async function insertarEvento(db: SupabaseClient, fila: Record<string, unknown>): Promise<{ id: string; slug: string | null } | null> {
  const r = await db.from("eventos").insert(fila).select("id, slug").single();
  if (r.error || !r.data) return null;
  const d = r.data as { id: string; slug?: string | null };
  return { id: d.id, slug: d.slug ?? null };
}

/** Deja en la propuesta el evento que salió de ella (`ficha_id`), con la llave de servicio: `aceptar_propuesta` lo deja nulo en un evento. */
export async function ligarFicha(db: SupabaseClient, propuestaId: string, eventoId: string): Promise<boolean> {
  const r = await db.from("propuestas").update({ ficha_id: eventoId }).eq("id", propuestaId).eq("estado", "aceptada").is("ficha_id", null).select("id");
  return !r.error && !!r.data?.length;
}

export type Publicadas = { publicados: number; sin_publicar: number };

/**
 * Las propuestas de evento que ya estaban «aceptadas» sin evento (las de antes de OL-429, o una que falló al insertar) se publican por el
 * mismo camino al empezar cada corrida de agendas de su ciudad, con quien las aceptó como autor. Las que no se pueden (sin punto, parecidas)
 * se cuentan y se quedan como están: la bandeja ya no las muestra y la administración las ve en la ficha de la corrida.
 */
export async function publicarAceptadasSinFicha(
  dep: { db: SupabaseClient; mapbox: Mapbox | null; ahora: Date },
  ciudad: CiudadDeEvento,
  lugares: readonly LugarDeCiudad[],
  idsCorridas: readonly string[],
): Promise<Publicadas> {
  const salida: Publicadas = { publicados: 0, sin_publicar: 0 };
  if (!idsCorridas.length) return salida;
  const r = await dep.db.from("propuestas").select("id, datos, resuelto_por").eq("tipo", "evento").eq("estado", "aceptada").is("ficha_id", null).in("corrida_id", [...idsCorridas]).limit(50);
  if (r.error) return salida;
  for (const p of (r.data ?? []) as { id: string; datos: unknown; resuelto_por: string | null }[]) {
    if (!p.resuelto_por) {
      salida.sin_publicar++;
      continue;
    }
    const preparado = await prepararEvento(dep, objeto(p.datos), ciudad, lugares, p.resuelto_por);
    if (!preparado.ok) {
      salida.sin_publicar++;
      continue;
    }
    const evento = await insertarEvento(dep.db, preparado.fila);
    if (evento && (await ligarFicha(dep.db, p.id, evento.id))) salida.publicados++;
    else salida.sin_publicar++;
  }
  return salida;
}
