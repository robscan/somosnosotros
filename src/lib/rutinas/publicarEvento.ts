import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formularioDeEvento, mismoEventoDeAgenda, resolverLugar, type EventoPropuesto } from "../cargaEventos";
import { leerParametrosCiudad, type ParametrosCiudad } from "../ciudadParametros";
import { periodoDePrograma, ultimoDiaDelPeriodo } from "../claseEvento";
import { configPublica } from "../config";
import { conNotaDeCosto, costoDeAgenda } from "../costoDeAgenda";
import { COOPERACION_SOLIDARIA, costoOpcional, GRATIS, POR_CONFIRMAR, validarEvento, type Clase } from "../eventos";
import { diaLocal, isoALocal, localAIso, zonaSegura } from "../fechas";
import { LIMITES_EVENTO } from "../limites";
import { normalizarNombre } from "../lugares";
import { urlSegura } from "../propuestas";
import { dentroDelArea, radioDeCiudadKm } from "./filtros";
import { claseDeActo, leerFormaEvento, mismoPrograma, nombreDeExposicion, sumarDias, type SesionPropuesta } from "./formaEvento";
import { ubicarSitioEnArea, type AreaCiudad, type Mapbox } from "./mapbox";

/**
 * Publicar un evento aceptado en la bandeja (OL-429). Por el mismo camino que el importador de la Mac (`cargaEventos.ts`): el lugar registrado
 * con ese nombre en la ciudad y, si no hay, el sitio con su punto de Mapbox dentro de la ciudad (sin punto no se publica: todo sitio lleva el
 * suyo, OL-348); lo que mandaría el formulario de alta (gratis, cooperación, precio) pasa por `validarEvento`; «¿Es este?» con
 * `eventos_parecidos` y el mismo título a la misma hora. Se inserta con la llave de servicio y sin sesión: es carga de agenda, no la publicación
 * de una persona, así que no crea avisos (ni el outbox de quienes siguen el lugar ni el de la administración: el autor es la cuenta de la
 * administración que aceptó). Queda `origen = 'rutina-agendas'` y `fuente_url` = la agenda.
 *
 * Cómo ocurre (OL-433, lo que la rutina deja en `datos`; `formaEvento.ts`), con las mismas formas que guarda la app:
 *   · `clase` se respeta: un taller, un festival (sin programa: un día, una hora y un sitio, OL-413) o una exposición.
 *   · Un acto de un festival registrado (`marco`) se publica con `evento_padre_id` (nunca festival dentro de festival) y el periodo del festival
 *     se recalcula con sus actos (`recalcular_festival`).
 *   · Un acto de un festival propuesto (`marco_propuesto`): si su festival ya se aceptó y publicó, cuelga de él; si sigue por decidir, se acepta
 *     pero NO se publica suelto: espera (`datos.espera`) y se publica en cuanto se acepta el festival (`ligarFicha` → `publicarActosEnEspera`)
 *     o, si algo falla, con la siguiente corrida de agendas. Si el festival se rechazó, el acto se publica como evento suelto.
 *   · La propuesta de un festival con actos es un marco: su sitio, el del primer acto (sin pedirle punto, como `publicar_programa`); su
 *     periodo, del primer al último acto propuesto (`termina`).
 *   · `sesiones`: un taller con sus sesiones en `eventos_sesiones` (días sueltos); un evento de días seguidos con el mismo horario, sin filas
 *     («Mismo horario todos los días», OL-310), y con horarios distintos, una fila por día (OL-311).
 *   · Una inauguración con su periodo (`clase: exposicion`, `termina`): la inauguración como evento y la exposición ligada por `inaugura_id`
 *     (del primer minuto de ese día al último del de cierre, sin su hora ni su precio), como `publicar_exposicion_de_inauguracion`.
 * El costo (OL-441, `costoDeAgenda`): una cifra, gratis o cooperación como en el formulario; cualquier otro texto («Entrada con acceso al museo»)
 * queda «Por confirmar» en cualquier clase, con el texto de la agenda al final de la descripción («Costo: …»), así que nunca deja de publicarse
 * por el precio. En un evento suelto (donde el costo es obligatorio y un precio vacío se lee «Gratis») «Por confirmar» se guarda escrito, como
 * «Gratis» donde el costo es opcional; la bandeja lo dice: «se publicó con costo por confirmar» (`nota`).
 * Lo de la Cartelera de la Ciudad de México (OL-448): una exposición abierta (`visita`, con `termina`) se publica como exposición, del primer
 * minuto de su primer día (hoy, si ya abrió) al último del de cierre, sin inauguración, y no si ya está esa exposición en ese sitio esas fechas;
 * la imagen de la propuesta (`imagen`) la pone la bandeja como cartel al aceptar (`ponerCartel`).
 * Lo que va además de la fila (las sesiones, la exposición, el festival que recalcular o que el acto espera) viaja aparte, en `EXTRAS`: la
 * bandeja llama `prepararEvento` → `insertarEvento(fila)` → `ligarFicha` y la fila se inserta tal cual en `eventos`.
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
/** `lat` y `lng`: para cruzar los recintos de la cartelera por cercanía (OL-448). */
export type LugarDeCiudad = { id: string; nombre: string; ciudad: string; zona: string | null; direccion: string | null; lat?: number | null; lng?: number | null };

export type MotivoSinPublicar = "sin_punto" | "invalido" | "parecido" | "pasado" | "base";
/**
 * `espera`: un acto aceptado antes que su festival; `insertarEvento` no lo inserta (se publica al aceptar el festival). `nota`: lo que la línea
 * de lo hecho añade («se publicó con costo por confirmar», OL-441).
 */
export type Preparado = { ok: true; fila: Record<string, unknown>; titulo: string; espera?: string; nota?: string } | { ok: false; motivo: MotivoSinPublicar; error: string };

/** La línea de lo hecho cuando la agenda decía un costo que no es cifra, gratis ni cooperación (OL-441). */
export const NOTA_COSTO_POR_CONFIRMAR = "se publicó con costo por confirmar";

type SesionFila = { fecha: string; inicio: string; fin: string | null };
type Extras = { espera?: string; sesiones?: SesionFila[]; exposicion?: Record<string, unknown>; exposicionExistente?: string; padre?: string };
/** Lo que se hace con la fila al insertarla (o en vez de insertarla), por fila preparada. */
const EXTRAS = new WeakMap<Record<string, unknown>, Extras>();

const texto = (v: unknown, tope: number): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, tope) : "");
const objeto = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const nombresDe = (c: Pick<CiudadDeEvento, "nombre" | "alias">) => [c.nombre, ...c.alias.filter(Boolean)];
const numeroO = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const errorBase: Preparado = { ok: false, motivo: "base", error: "No se pudo comprobar si ya está. Intenta de nuevo." };

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
  const r = await db.from("lugares").select("id, nombre, ciudad, zona, direccion, lat, lng").in("ciudad", nombresDe(ciudad)).limit(5000);
  if (r.error) return null;
  return (r.data ?? []) as LugarDeCiudad[];
}

/** El festival del que colgar un acto, si sigue siendo un festival (uno que dejó de serlo o se borró: el acto va suelto). */
async function festivalVigente(db: SupabaseClient, id: string): Promise<{ id: string; titulo: string } | null | "error"> {
  const r = await db.from("eventos").select("id, titulo, clase").eq("id", id).maybeSingle();
  if (r.error) return "error";
  const f = r.data as { id: string; titulo: string; clase: string | null } | null;
  return f && f.clase === "festival" ? { id: f.id, titulo: f.titulo } : null;
}

/** Del acto: el festival del que cuelga, si hay que esperar a uno propuesto, o nada (suelto). */
async function marcoDelActo(db: SupabaseClient, forma: ReturnType<typeof leerFormaEvento>): Promise<{ padre: { id: string; titulo: string } | null; espera: string | null } | "error"> {
  if (forma.marco) {
    const f = await festivalVigente(db, forma.marco.id);
    return f === "error" ? "error" : { padre: f, espera: null };
  }
  if (!forma.marcoPropuesto) return { padre: null, espera: null };
  const r = await db.from("propuestas").select("estado, ficha_id, datos").eq("id", forma.marcoPropuesto).maybeSingle();
  if (r.error) return "error";
  const p = r.data as { estado: string; ficha_id: string | null; datos: unknown } | null;
  const nombre = texto(objeto(p?.datos).titulo, 120) || forma.programa || "su festival";
  const espera = forma.espera ?? `Se publica cuando aceptes el festival «${nombre}».`;
  if (p?.estado === "propuesta") return { padre: null, espera };
  if (p?.estado === "aceptada") {
    if (!p.ficha_id) return { padre: null, espera };
    const f = await festivalVigente(db, p.ficha_id);
    return f === "error" ? "error" : { padre: f, espera: null };
  }
  // El festival se rechazó (o ya no está): el acto aceptado se publica como evento suelto.
  return { padre: null, espera: null };
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
  const forma = leerFormaEvento(datos);
  const titulo = texto(datos.titulo, LIMITES_EVENTO.titulo);
  const inicioDatos = texto(datos.inicio, 40);
  if (!titulo || !inicioDatos || Number.isNaN(Date.parse(inicioDatos))) return { ok: false, motivo: "invalido", error: "No se publicó: la propuesta no trae título, fecha y hora." };
  const ahora = dep.ahora.getTime();
  const esMarco = forma.clase === "festival" && forma.actos > 0;
  // Una exposición abierta de la cartelera (OL-448, `datos.visita`): se publica como exposición, del primer al último día, sin inauguración.
  const visita = forma.clase === "exposicion" && datos.visita === true && !!forma.termina;
  // Un taller aceptado a medias se publica con las sesiones que quedan.
  const sesiones: SesionPropuesta[] = forma.sesiones.filter((s) => Date.parse(s.inicio) >= ahora);
  const inicio = sesiones[0]?.inicio ?? new Date(inicioDatos).toISOString();
  // Ya pasó: un marco, cuando acabó su último acto; con sesiones, cuando no queda ninguna; si no, cuando empezó.
  const paso = esMarco || visita ? Date.parse(forma.termina ?? inicio) < ahora : forma.sesiones.length ? !sesiones.length : Date.parse(inicio) < ahora;
  if (paso) return { ok: false, motivo: "pasado", error: "No se publicó: ese evento ya pasó. Recházala." };
  const donde = texto(datos.lugar, LIMITES_EVENTO.sitio);
  if (!donde) return { ok: false, motivo: "invalido", error: "No se publicó: la propuesta no dice dónde es." };
  const lugar = resolverLugar(donde, [...lugares]);
  const zona = zonaSegura(lugar?.zona ?? ciudad.zona);

  const delMarco = esMarco ? { padre: null, espera: null } : await marcoDelActo(dep.db, forma);
  if (delMarco === "error") return errorBase;
  const { padre, espera } = delMarco;
  const esActo = !!padre || !!espera;
  const conExposicion = forma.clase === "exposicion" && !!forma.termina && !visita;
  // La clase de la fila: la inauguración de una exposición es un evento (la exposición va aparte); un acto, la suya sin ser festival.
  const clase: Clase = visita ? "exposicion" : forma.clase === "exposicion" ? "puntual" : esActo ? claseDeActo(forma.clase) : forma.clase;
  const opcional = clase !== "puntual" || esActo || conExposicion;

  // El cuándo: el de la propuesta; con sesiones, de la primera a la última; un marco, del primer al último acto.
  const local = isoALocal(inicio, zona);
  const finTexto = texto(datos.fin, 40);
  const finDatos = finTexto && !Number.isNaN(Date.parse(finTexto)) ? finTexto : null;
  // Una función que acaba pasada la medianoche la arma `finLocal` con la hora (el día siguiente); más de un día, no se adivina.
  const dura = finDatos ? Date.parse(finDatos) - Date.parse(inicioDatos) : 0;
  const horaFin = finDatos && dura > 0 && dura < 86_400_000 ? isoALocal(finDatos, zona).slice(11, 16) : null;
  const enlace = urlSegura(datos.url);
  const costoTexto = texto(datos.precio, 120);
  const costo = costoDeAgenda(costoTexto, opcional);
  const porConfirmar = costo.costo === "por_confirmar";
  const propuesto: EventoPropuesto = {
    titulo,
    lugar: lugar?.nombre ?? null,
    fecha: local.slice(0, 10),
    hora: local.slice(11, 16),
    // Con una sola sesión que queda, la hora de fin es la suya; con varias, el fin sale de la última (abajo).
    hora_fin: sesiones.length === 1 ? (sesiones[0].fin ? isoALocal(sesiones[0].fin, zona).slice(11, 16) : null) : sesiones.length ? null : horaFin,
    precio: costo.costo === "gratis" ? GRATIS : costo.costo === "cooperacion" ? COOPERACION_SOLIDARIA : costo.costo === "precio" ? `$${costo.precio}` : null,
    // Lo que la agenda decía del costo y no cabe en él («Entrada con acceso al museo», «$150 general, $100 niños»), al final: no se pierde.
    descripcion: conNotaDeCosto(texto(datos.descripcion, LIMITES_EVENTO.descripcion), costo.nota, LIMITES_EVENTO.descripcion),
    enlace: enlace?.startsWith("https://") ? enlace : null,
  };
  if (!lugar) {
    // Un sitio que no está en el directorio: el punto que la rutina ya le encontró dentro de la ciudad o, si no, Mapbox por nombre y dirección
    // (como el importador con `--historico`). El marco de un festival no es un sitio: si no hay punto, va sin él (sus sedes son las de sus actos).
    const direccion = texto(datos.direccion, LIMITES_EVENTO.direccion) || null;
    const centro = ciudad.lat != null && ciudad.lng != null ? { lat: ciudad.lat, lng: ciudad.lng } : null;
    const area: AreaCiudad | null = centro ? { centro, radioKm: ciudad.radioKm, nombres: nombresDe(ciudad) } : null;
    const lat = numeroO(datos.lat), lng = numeroO(datos.lng);
    // El punto de la cartelera de la Ciudad de México (OL-450) vale aunque quede fuera del radio de la ciudad: la cartelera entra completa.
    const deCartelera = typeof datos.cartelera_id === "string" && lat != null && lng != null;
    const yaUbicado =
      (area && lat != null && lng != null && dentroDelArea({ lat, lng }, area.centro, area.radioKm)) || deCartelera ? { lat: lat!, lng: lng!, direccion: texto(datos.direccion_mapa, LIMITES_EVENTO.direccion) } : null;
    const eleccion = yaUbicado ?? (area && dep.mapbox ? (await ubicarSitioEnArea(donde, direccion, area, dep.mapbox))?.punto ?? null : null);
    if (!eleccion && !esMarco) return { ok: false, motivo: "sin_punto", error: `No se publicó: «${donde}» no está en el directorio y el mapa no lo encuentra en ${ciudad.nombre}. Recházala o da de alta el lugar.` };
    if (eleccion) {
      const deMapbox = eleccion.direccion.length <= LIMITES_EVENTO.direccion ? eleccion.direccion : "";
      Object.assign(propuesto, { sitio: donde, sitio_direccion: direccion || deMapbox || null, sitio_lat: eleccion.lat, sitio_lng: eleccion.lng });
    } else Object.assign(propuesto, { sitio: donde });
  }
  const entrada = formularioDeEvento(propuesto, lugar?.id ?? null);
  // La exposición abierta: del primer minuto de su primer día (hoy, si ya abrió) al último del de cierre, como la de una inauguración.
  if (visita) {
    const desde = [diaLocal(new Date(inicio), zona), diaLocal(dep.ahora, zona)].sort().at(-1)!;
    entrada.inicio = `${desde}T00:00`;
    entrada.fin = `${ultimoDiaDelPeriodo(forma.termina!, null, zona)}T23:59`;
  }
  // «Por confirmar» (OL-411, OL-441): donde el costo es opcional, lo que la agenda no dice; en cualquier clase, lo que dice sin ser cifra,
  // gratis ni cooperación. `validarEvento` lo acepta como en un festival; donde es opcional, «Gratis» se guarda escrito.
  if (porConfirmar) Object.assign(entrada, { gratis: "no", por_confirmar: "si" });
  const extras: Extras = {};
  if (esMarco && forma.termina) entrada.fin = isoALocal(forma.termina, zona).slice(0, 16);
  if (sesiones.length >= 2) {
    // Varios días: de la primera sesión a la última (sin hora de fin, hasta el final de su día).
    // Cada sesión en su día: un fin de madrugada (pasada la medianoche) no cabe en él (la base lo rechaza, `validar_integridad_sesiones`), así
    // que esa sesión queda sin hora de fin.
    const filas = sesiones.map((s) => {
      const fecha = diaLocal(new Date(s.inicio), zona);
      const medianoche = Date.parse(localAIso(`${sumarDias(fecha, 1)}T00:00`, zona) ?? "");
      const fin = s.fin && Date.parse(s.fin) > Date.parse(s.inicio) && Date.parse(s.fin) <= medianoche ? s.fin : null;
      return { fecha, inicio: s.inicio, fin };
    });
    const ultima = filas[filas.length - 1];
    entrada.fin = ultima.fin ? isoALocal(ultima.fin, zona).slice(0, 16) : `${ultima.fecha}T23:59`;
    const horas = (f: SesionFila) => `${isoALocal(f.inicio, zona).slice(11, 16)}-${f.fin ? isoALocal(f.fin, zona).slice(11, 16) : ""}`;
    const mismoHorario = filas.every((f) => horas(f) === horas(filas[0]));
    // «Mismo horario todos los días» en días seguidos: sin filas (OL-310). Un taller, siempre con sus sesiones (días sueltos).
    if (clase === "taller" || !mismoHorario) extras.sesiones = filas;
  }
  const { datos: evento, errores } = validarEvento(entrada, zona, { marco: esMarco, costoOpcional: opcional || porConfirmar });
  const primero = Object.values(errores)[0];
  if (primero) return { ok: false, motivo: "invalido", error: `No se publicó: ${primero}` };
  const sitioNombre = lugar?.nombre ?? donde;

  if (esMarco) {
    // ¿Ya está ese festival en la ciudad, en esas fechas?
    const ya = await dep.db.from("eventos").select("titulo, inicio, fin").eq("clase", "festival").in("ciudad", nombresDe(ciudad)).lte("inicio", evento.fin ?? evento.inicio).gte("termina", evento.inicio).limit(50);
    if (ya.error) return errorBase;
    const igual = ((ya.data ?? []) as { titulo: string }[]).find((f) => mismoPrograma(f.titulo, evento.titulo) || mismoEventoDeAgenda(f.titulo, evento.titulo));
    if (igual) return { ok: false, motivo: "parecido", error: `Ya está el festival «${igual.titulo}» en esas fechas: recházala como duplicado.` };
  } else if (visita) {
    // ¿Ya está esa exposición en ese sitio, en esas fechas?
    const ya = await dep.db.from("eventos").select("titulo, lugar_id, sitio_texto").eq("clase", "exposicion").in("ciudad", nombresDe(ciudad)).lte("inicio", evento.fin ?? evento.inicio).gte("termina", evento.inicio).limit(200);
    if (ya.error) return errorBase;
    const mismoSitio = (x: { lugar_id: string | null; sitio_texto: string | null }) => (evento.lugar_id ? x.lugar_id === evento.lugar_id : normalizarNombre(x.sitio_texto ?? "") === normalizarNombre(evento.sitio_texto ?? ""));
    const igual = ((ya.data ?? []) as { titulo: string; lugar_id: string | null; sitio_texto: string | null }[]).find((x) => mismoSitio(x) && mismoEventoDeAgenda(x.titulo, evento.titulo, sitioNombre));
    if (igual) return { ok: false, motivo: "parecido", error: `Ya está la exposición «${igual.titulo}» en esas fechas: recházala como duplicado.` };
  } else {
    // «¿Es este?» como en el alta: el mismo día, en el mismo sitio, con un título parecido; y el mismo título a la misma hora en la ciudad. Lo
    // que la base toma por parecido se vuelve a mirar con la regla de la rutina (OL-433): dos inauguraciones distintas el mismo día en el
    // mismo museo no son la misma (la bandeja no tiene «es otro»).
    const parecidos = await dep.db.rpc("eventos_parecidos", { p_titulo: evento.titulo, p_inicio: evento.inicio, p_zona: evento.zona, p_lugar_id: evento.lugar_id, p_sitio_texto: evento.sitio_texto });
    if (parecidos.error) return errorBase;
    const parecido = ((Array.isArray(parecidos.data) ? parecidos.data : []) as { titulo?: string }[]).find((p) => mismoEventoDeAgenda(evento.titulo, p.titulo ?? "", sitioNombre));
    if (parecido) return { ok: false, motivo: "parecido", error: `Ya está «${parecido.titulo ?? evento.titulo}» ese día en ese sitio: recházala como duplicado.` };
    const mismaHora = await dep.db.from("eventos").select("titulo").eq("inicio", evento.inicio).in("ciudad", nombresDe(ciudad)).limit(50);
    if (mismaHora.error) return errorBase;
    const igual = ((mismaHora.data ?? []) as { titulo: string }[]).find((e) => normalizarNombre(e.titulo) === normalizarNombre(evento.titulo));
    if (igual) return { ok: false, motivo: "parecido", error: `Ya está «${igual.titulo}» a esa hora: recházala como duplicado.` };
  }

  const { privado: _privado, ...columnas } = evento;
  void _privado;
  const fila: Record<string, unknown> = {
    ...columnas,
    descripcion: columnas.descripcion || null,
    ciudad: lugar?.ciudad ?? ciudad.nombre,
    creado_por: autor,
    origen: ORIGEN_RUTINA_AGENDAS,
    fuente_url: enlace,
    clase,
  };
  if (padre) {
    fila.evento_padre_id = padre.id;
    extras.padre = padre.id;
  }
  if (espera) extras.espera = espera;
  if (conExposicion) {
    // La exposición que abre esta inauguración: del primer minuto de su día al último del de cierre, en el mismo sitio, sin su hora ni su precio.
    const dia = diaLocal(new Date(evento.inicio), zona);
    const cierre = ultimoDiaDelPeriodo(forma.termina!, null, zona);
    const nombre = forma.exposicion ?? nombreDeExposicion(titulo);
    if (cierre > dia) {
      const yaExpo = await dep.db.from("eventos").select("id, titulo, lugar_id, sitio_texto, inaugura_id").eq("clase", "exposicion").in("ciudad", nombresDe(ciudad)).lte("inicio", localAIso(`${cierre}T23:59`, zona)!).gte("termina", evento.inicio).limit(50);
      if (yaExpo.error) return errorBase;
      const mismoSitio = (x: { lugar_id: string | null; sitio_texto: string | null }) => (evento.lugar_id ? x.lugar_id === evento.lugar_id : normalizarNombre(x.sitio_texto ?? "") === normalizarNombre(evento.sitio_texto ?? ""));
      const existente = ((yaExpo.data ?? []) as { id: string; titulo: string; lugar_id: string | null; sitio_texto: string | null; inaugura_id: string | null }[]).find((x) => mismoSitio(x) && mismoEventoDeAgenda(x.titulo, nombre, sitioNombre));
      if (existente) {
        if (!existente.inaugura_id) extras.exposicionExistente = existente.id;
      } else {
        extras.exposicion = {
          titulo: nombre,
          inicio: localAIso(`${dia}T00:00`, zona),
          fin: localAIso(`${cierre}T23:59`, zona),
          lugar_id: fila.lugar_id ?? null,
          sitio_texto: fila.sitio_texto ?? null,
          sitio_direccion: fila.sitio_direccion ?? null,
          sitio_lat: fila.sitio_lat ?? null,
          sitio_lng: fila.sitio_lng ?? null,
          sitio_reservado: false,
          sitio_revelar_desde: null,
          ciudad: fila.ciudad,
          zona: fila.zona,
          imagen: null,
          enlace: fila.enlace ?? null,
          descripcion: null,
          precio: null,
          creado_por: autor,
          origen: ORIGEN_RUTINA_AGENDAS,
          fuente_url: enlace,
          clase: "exposicion",
          // La exposición de un festival (Fotovisión 31 tiene varias) es parte de su programa, como su inauguración.
          ...(padre ? { evento_padre_id: padre.id } : {}),
        };
      }
      fila.sugerencias = { exposicion: { estado: "aceptada" } };
    }
  }
  // Donde la ficha lee un precio vacío como «Gratis» (un evento suelto: ni festival, exposición o taller, ni acto, ni inauguración ligada),
  // «Por confirmar» se guarda escrito (`textoCosto` lo muestra tal cual; al editar, `costoDeEvento` vuelve a preguntar el costo).
  const inauguracion = !!(extras.exposicion || extras.exposicionExistente);
  if (porConfirmar && !costoOpcional({ clase, evento_padre_id: padre?.id ?? null, inauguracion })) fila.precio = POR_CONFIRMAR;
  EXTRAS.set(fila, extras);
  if (espera) return { ok: true, titulo: evento.titulo, fila, espera };
  return porConfirmar && costoTexto ? { ok: true, titulo: evento.titulo, fila, nota: NOTA_COSTO_POR_CONFIRMAR } : { ok: true, titulo: evento.titulo, fila };
}

/**
 * El periodo de un festival con sus actos visibles: `recalcular_festival` en la base; si no se puede llamar, la misma regla aquí
 * (`periodoDePrograma`, que dice lo mismo que `fin_en_programa`).
 */
async function recalcularFestival(db: SupabaseClient, id: string): Promise<void> {
  const enLaBase = await db.rpc("recalcular_festival", { p_festival: id });
  if (!enLaBase.error) return;
  const r = await db.from("eventos").select("inicio, fin, zona, visible").eq("evento_padre_id", id).limit(500);
  if (r.error) return;
  const actos = ((r.data ?? []) as { inicio: string; fin: string | null; zona: string | null; visible: boolean | null }[]).filter((a) => a.visible !== false);
  const periodo = periodoDePrograma(actos, zonaSegura(actos[0]?.zona ?? null));
  if (periodo) await db.from("eventos").update({ inicio: periodo.inicio, fin: periodo.fin }).eq("id", id).eq("clase", "festival");
}

/**
 * Inserta lo preparado con la llave de servicio (sin sesión: sin avisos) y lo que va con ello: las sesiones de un taller, la exposición de una
 * inauguración, el periodo del festival de un acto. Un acto que espera a su festival no se inserta (null: se publica al aceptar el festival).
 * Si las sesiones o la exposición no se pueden guardar, no queda nada a medias: se borra y devuelve null (lo retoma la siguiente corrida).
 */
export async function insertarEvento(db: SupabaseClient, fila: Record<string, unknown>): Promise<{ id: string; slug: string | null } | null> {
  const extras = EXTRAS.get(fila) ?? {};
  if (extras.espera) return null;
  const r = await db.from("eventos").insert(fila).select("id, slug").single();
  if (r.error || !r.data) return null;
  const d = r.data as { id: string; slug?: string | null };
  const deshacer = async () => {
    await db.from("eventos").delete().eq("id", d.id);
    return null;
  };
  if (extras.sesiones?.length) {
    const s = await db.from("eventos_sesiones").insert(extras.sesiones.map((x) => ({ evento_id: d.id, ...x })));
    if (s.error) return deshacer();
  }
  if (extras.exposicion) {
    const x = await db.from("eventos").insert({ ...extras.exposicion, inaugura_id: d.id }).select("id").single();
    if (x.error) return deshacer();
  }
  if (extras.exposicionExistente) await db.from("eventos").update({ inaugura_id: d.id }).eq("id", extras.exposicionExistente).is("inaugura_id", null);
  if (extras.padre) await recalcularFestival(db, extras.padre);
  return { id: d.id, slug: d.slug ?? null };
}

type Dep = { mapbox: Mapbox | null; ahora: Date };
const depPorOmision = (): Dep => {
  const token = configPublica().mapboxToken;
  return { mapbox: token ? { token } : null, ahora: new Date() };
};

/**
 * Deja en la propuesta el evento que salió de ella (`ficha_id`), con la llave de servicio: `aceptar_propuesta` lo deja nulo en un evento. Si es
 * un festival, publica ahí mismo sus actos que ya se habían aceptado y esperaban (OL-433). `dep`, para las pruebas (por omisión el Mapbox de la
 * app y la hora de ahora).
 */
export async function ligarFicha(db: SupabaseClient, propuestaId: string, eventoId: string, dep?: Dep): Promise<boolean> {
  const r = await db.from("propuestas").update({ ficha_id: eventoId }).eq("id", propuestaId).eq("estado", "aceptada").is("ficha_id", null).select("id, datos, corrida_id");
  const ligada = !r.error && !!r.data?.length;
  const p = ligada ? (r.data![0] as { datos?: unknown; corrida_id?: string }) : null;
  if (p && objeto(p.datos).clase === "festival" && typeof p.corrida_id === "string") {
    try {
      await publicarActosEnEspera(db, propuestaId, p.corrida_id, dep ?? depPorOmision());
    } catch {
      // Lo que no se publicó ahora lo publica la siguiente corrida de agendas (`publicarAceptadasSinFicha`).
    }
  }
  return ligada;
}

export type Publicadas = { publicados: number; sin_publicar: number; en_espera: number };

/** Publica una lista de propuestas aceptadas sin evento, con quien las aceptó como autor. */
async function publicarLista(db: SupabaseClient, dep: Dep, ciudad: CiudadDeEvento, lugares: readonly LugarDeCiudad[], propuestas: readonly { id: string; datos: unknown; resuelto_por: string | null }[]): Promise<Publicadas> {
  const salida: Publicadas = { publicados: 0, sin_publicar: 0, en_espera: 0 };
  // Los festivales primero: así sus actos que esperaban ya tienen de dónde colgar.
  const orden = [...propuestas].sort((a, b) => Number(objeto(b.datos).clase === "festival") - Number(objeto(a.datos).clase === "festival"));
  for (const p of orden) {
    if (!p.resuelto_por) {
      salida.sin_publicar++;
      continue;
    }
    const preparado = await prepararEvento({ db, ...dep }, objeto(p.datos), ciudad, lugares, p.resuelto_por);
    if (!preparado.ok) {
      salida.sin_publicar++;
      continue;
    }
    if (preparado.espera) {
      salida.en_espera++;
      continue;
    }
    const evento = await insertarEvento(db, preparado.fila);
    if (evento && (await ligarFicha(db, p.id, evento.id, dep))) salida.publicados++;
    else salida.sin_publicar++;
  }
  return salida;
}

/** Los actos aceptados que esperaban a este festival (`datos.marco_propuesto`), publicados ya colgados de él. */
export async function publicarActosEnEspera(db: SupabaseClient, festivalPropuestaId: string, corridaId: string, dep: Dep): Promise<Publicadas> {
  const r = await db.from("propuestas").select("id, datos, resuelto_por").eq("tipo", "evento").eq("estado", "aceptada").is("ficha_id", null).eq("datos->>marco_propuesto", festivalPropuestaId).limit(50);
  const actos = (r.data ?? []) as { id: string; datos: unknown; resuelto_por: string | null }[];
  if (r.error || !actos.length) return { publicados: 0, sin_publicar: 0, en_espera: 0 };
  const ciudad = await ciudadDeCorrida(db, corridaId);
  const lugares = ciudad ? await lugaresDeCiudad(db, ciudad) : null;
  if (!ciudad || !lugares) return { publicados: 0, sin_publicar: actos.length, en_espera: 0 };
  return publicarLista(db, dep, ciudad, lugares, actos);
}

/**
 * Las propuestas de evento que ya estaban «aceptadas» sin evento (las de antes de OL-429, una que falló al insertar o un acto que esperaba a su
 * festival) se publican por el mismo camino al empezar cada corrida de agendas de su ciudad, con quien las aceptó como autor. Las que no se
 * pueden (sin punto, parecidas) se cuentan y se quedan como están; un acto cuyo festival sigue por decidir sigue esperando (`en_espera`).
 */
export async function publicarAceptadasSinFicha(
  dep: { db: SupabaseClient; mapbox: Mapbox | null; ahora: Date },
  ciudad: CiudadDeEvento,
  lugares: readonly LugarDeCiudad[],
  idsCorridas: readonly string[],
): Promise<Publicadas> {
  if (!idsCorridas.length) return { publicados: 0, sin_publicar: 0, en_espera: 0 };
  const r = await dep.db.from("propuestas").select("id, datos, resuelto_por").eq("tipo", "evento").eq("estado", "aceptada").is("ficha_id", null).in("corrida_id", [...idsCorridas]).limit(50);
  if (r.error) return { publicados: 0, sin_publicar: 0, en_espera: 0 };
  return publicarLista(dep.db, { mapbox: dep.mapbox, ahora: dep.ahora }, ciudad, lugares, (r.data ?? []) as { id: string; datos: unknown; resuelto_por: string | null }[]);
}
