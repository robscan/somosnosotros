import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cartelDescargable } from "@/lib/cartelDescarga";
import { configPublica } from "@/lib/config";
import { diaConMes, diaLocal, horaDeReloj, ZONA_INICIAL } from "@/lib/fechas";
import { SIN_FOTO } from "@/lib/imagen";
import {
  armarSemana,
  cuandoDelDia,
  diaIso,
  diasDe,
  REGLA,
  estadoDelDia,
  lineaDelAviso,
  lineaDeLaQueViene,
  lineaDelEstado,
  lineaDelPasado,
  lunesDe,
  lunesDeLaSemana,
  nadieConMaterial,
  nombreDelDia,
  queFalta,
  rangoDeLaSemana,
  resumenDeLaFalta,
  resumenSemana,
  salePara,
  sugerirDia,
  tocaArmarLaQueViene,
  type Candidato,
  type CasillaNueva,
  type EstadoDia,
  type EventoCandidato,
  type TipoDia,
} from "@/lib/instagram/semana";
import { usuarioDeInstagram } from "@/lib/instagram/texto";
import type { ClienteServidor } from "@/lib/supabase/servidor";

/**
 * La semana de Instagram de una ciudad (OL-479; firmada en el prototipo de OL-477, bitácora 509): lo que lee la pestaña «Semana» de
 * Administración › Instagram. Con la sesión de la administración (la base lo comprueba: `instagram_semana` solo la lee ella y sus funciones lo
 * vuelven a decir). Si a la semana le faltan días por delante, se arman aquí con la regla (`armarSemana`) y los candidatos de la base, y se
 * guardan (`instagram_semana_guardar`, que pone cada día en la cola a su hora): el sistema llena y programa; la administración solo corrige.
 * OL-487 (bitácora 519): los miércoles, el latido de redes arma «la que viene» con esa misma función aunque nadie abra la pestaña
 * (`armarLasQueVienen`).
 */

export type FilaDia = {
  id: string;
  ciudad: string;
  fecha: string;
  tipo: TipoDia;
  artista_id: string | null;
  lugar_id: string | null;
  evento_id: string | null;
  eventos: string[] | null;
  hora: string | null;
  programado_para: string | null;
  estado: string;
  elegido_por: string;
  motivo: string | null;
  reemplaza: string | null;
  trabajo_id: string | null;
  aviso_en: string | null;
  dijo_no_en: string | null;
};
export const COLUMNAS_DIA = "id, ciudad, fecha, tipo, artista_id, lugar_id, evento_id, eventos, hora, programado_para, estado, elegido_por, motivo, reemplaza, trabajo_id, aviso_en, dijo_no_en";

/** Un renglón de la semana, ya dicho. */
export type DiaSemana = {
  id: string;
  fecha: string;
  tipo: TipoDia;
  nombre: string;
  /** La miniatura 4:5: la tarjeta (artista, lugar, «Esta semana»), el cartel (evento) o el símbolo SN (descanso, quitado). */
  imagen: string;
  cuando: string;
  estado: EstadoDia;
  lineaEstado: string;
  aviso: { texto: string; falta: boolean } | null;
  medida: string | null;
  permalink: string | null;
  /** Sin JavaScript, el renglón lleva a la ficha (o a la lista de hoy). */
  href: string;
  /** OL-488: un día que ya pasó sin publicación: una sola línea gris («Mié 7 · antes de armar la semana»), sin hoja. */
  pasado?: string;
  /** OL-488: de hoy en adelante, sin publicación: lo que sugiere la regla, para «Programar» o «Publicar ahora». */
  sugerencia?: Sugerencia;
  /** OL-488: de hoy en adelante, sin publicación y sin nadie con material: el renglón abre «Falta material» si hay a quién pedírselo. */
  nadie?: { abreFalta: boolean };
};

/** OL-488: lo que sugiere la regla para un día sin publicación (la hoja de «Programar» y «Publicar ahora»). */
export type Sugerencia = {
  fecha: string;
  tipo: Exclude<TipoDia, "descanso">;
  nombre: string;
  imagen: string;
  /** «Hoy · 9:00 am · Esta semana». */
  cuando: string;
  /** «hoy a las 9:00 am», «el vie 9 a las 7:00 pm». */
  sale: string;
  motivo: string | null;
  /** Su hora no ha pasado: se puede programar. */
  programar: boolean;
  /** Es hoy: se puede publicar ahora. */
  ahora: boolean;
};

/** OL-488: una ficha con fecha que se quedó fuera de la semana por falta de foto o portada (una fila de `instagram_falta_material`). */
export type FichaSinMaterial = {
  tipo: "artista" | "lugar";
  id: string;
  slug: string;
  nombre: string;
  foto: string | null;
  falta: string[];
  /** «Falta la portada», «Su portada es de otra página: hay que subirla a la app». */
  queFalta: string;
  /** Lo demás que le faltaría para entrar: «También le falta la descripción para entrar». */
  otros: string | null;
  /** «Próxima fecha: vie 9 · Concierto en Aether». */
  proxima: string | null;
  /** El primer nombre de quien la lleva («La lleva Marcos»), o null si nadie. */
  lleva: string | null;
  puedePedir: boolean;
  /** «Se lo pedimos hoy» si ya se le pidió esa semana. */
  pedido: string | null;
  /** Su ficha (la dirección). */
  ficha: string;
};
export type FaltaMaterial = { lunes: string; resumen: string; fichas: FichaSinMaterial[] };

export type Semana = { lunes: string; rango: string; resumen: string; dias: DiaSemana[]; zona: string; ciudad: string; falta: FaltaMaterial | null };

type Uno<T> = T | T[] | null;
const uno = <T,>(x: Uno<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);
const db = (s: ClienteServidor) => s as unknown as SupabaseClient;

/** La zona de una ciudad (la de Administración › Ciudades; si no la tiene, la inicial). */
export async function zonaDeCiudad(supabase: ClienteServidor, ciudad: string): Promise<string> {
  const { data } = await supabase.from("ciudades").select("zona").eq("slug", ciudad).maybeSingle<{ zona: string }>();
  return data?.zona ?? ZONA_INICIAL;
}

/**
 * Los días guardados de la semana que empieza en `lunes`. `otraVez`: después de guardar, se vuelven a leer de verdad (Next guarda en la misma
 * petición la respuesta de un GET igual y devolvería la de antes de guardar: una señal propia lo deja fuera de esa memoria).
 */
async function leerDias(supabase: ClienteServidor, ciudad: string, lunes: string, otraVez = false): Promise<FilaDia[] | null> {
  const dias = diasDe(lunes);
  const q = supabase.from("instagram_semana").select(COLUMNAS_DIA).eq("ciudad", ciudad).gte("fecha", dias[0]).lte("fecha", dias[6]).order("fecha");
  const { data, error } = await (otraVez ? q.abortSignal(new AbortController().signal) : q);
  return error ? null : ((data ?? []) as FilaDia[]);
}

/** Los candidatos de la base para una semana (artistas o lugares), en el orden de la regla; null si la base no respondió. */
async function leerCandidatos(supabase: ClienteServidor, ciudad: string, tipo: "artista" | "lugar", lunes: string): Promise<Candidato[] | null> {
  const { data, error } = await supabase.rpc("instagram_candidatos", { p_ciudad: ciudad, p_tipo: tipo, p_desde: lunes });
  return error || !Array.isArray(data) ? null : (data as Candidato[]);
}

/** Los candidatos de la base para una semana (artistas o lugares), en el orden de la regla. */
export async function candidatos(supabase: ClienteServidor, ciudad: string, tipo: "artista" | "lugar", lunes: string): Promise<Candidato[]> {
  return (await leerCandidatos(supabase, ciudad, tipo, lunes)) ?? [];
}

/** OL-488: ¿el cartel de un evento es material que se puede publicar (está en el Storage de la app, lo único que la tarjeta puede bajar)? */
export const cartelPublicable = (e: Pick<EventoCandidato, "imagen">): boolean => cartelDescargable(e.imagen, configPublica().supabaseUrl);

/**
 * Arma y guarda los días que le faltan a una semana (los que ya están no se tocan). «guardada» si guardó alguno, «nada» si no había qué armar y
 * «error» si la base no respondió: en ese caso no se guarda nada (una semana armada sin candidatos serían siete descansos).
 */
async function llenar(supabase: ClienteServidor, ciudad: string, lunes: string, zona: string, existentes: FilaDia[], ahora: Date): Promise<"guardada" | "nada" | "error"> {
  const [artistas, lugares, sugeridos] = await Promise.all([
    leerCandidatos(supabase, ciudad, "artista", lunes),
    leerCandidatos(supabase, ciudad, "lugar", lunes),
    supabase.rpc("instagram_sugerencias", { p_ciudad: ciudad, p_dias: 14 }),
  ]);
  if (!artistas || !lugares || sugeridos.error || !Array.isArray(sugeridos.data)) return "error";
  const eventos = sugeridos.data as EventoCandidato[];
  const usados = new Set(existentes.flatMap((d) => [d.artista_id, d.lugar_id, d.evento_id, ...(d.eventos ?? [])].filter((x): x is string => !!x)));
  const nuevas = armarSemana({ lunes, zona, ahora, artistas, lugares, eventos, existentes: new Set(existentes.map((d) => d.fecha)), usados, conCartel: cartelPublicable });
  if (!nuevas.length) return "nada";
  const { error } = await supabase.rpc("instagram_semana_guardar", { p_ciudad: ciudad, p_casillas: nuevas });
  return error ? "error" : "guardada";
}

/** Lo que dejó `armarLoQueFalta`: la semana (su lunes, su zona y sus días ya guardados) y si se armó algo. */
export type Armada = { lunes: string; zona: string; filas: FilaDia[]; armado: "guardada" | "nada" | "error" };

/**
 * Arma lo que le falte a la semana («esta» o «la que viene») de una ciudad y devuelve sus días. La usan la pestaña (`cargarSemana`, con la sesión
 * de la administración) y, desde OL-487, el latido de redes los miércoles (`armarLasQueVienen`, a nombre de la administración): una sola regla.
 * Null si no se pudo leer la semana.
 */
export async function armarLoQueFalta(supabase: ClienteServidor, ciudad: string, cual: "esta" | "viene", ahora: Date): Promise<Armada | null> {
  const zona = await zonaDeCiudad(supabase, ciudad);
  const lunes = lunesDeLaSemana(cual, ahora, zona);
  const filas = await leerDias(supabase, ciudad, lunes);
  if (!filas) return null;
  if (filas.length >= 7) return { lunes, zona, filas, armado: "nada" };
  const armado = await llenar(supabase, ciudad, lunes, zona, filas, ahora);
  return { lunes, zona, filas: armado === "guardada" ? ((await leerDias(supabase, ciudad, lunes, true)) ?? filas) : filas, armado };
}

/** La semana («esta» o «la que viene») de una ciudad: se arma lo que falte y se dice cada día. Null si no se pudo leer. */
export async function cargarSemana(supabase: ClienteServidor, ciudad: string, cual: "esta" | "viene", ahora = new Date()): Promise<Semana | null> {
  const armada = await armarLoQueFalta(supabase, ciudad, cual, ahora);
  if (!armada) return null;
  const { lunes, zona, filas } = armada;
  const [dichos, sugeridas, falta] = await Promise.all([decirDias(supabase, filas, ahora, zona), sugerencias(supabase, ciudad, lunes, zona, filas, ahora), leerFalta(supabase, ciudad, lunes, ahora, zona)]);
  const hoy = diaLocal(ahora, zona);
  const porFecha = new Map(filas.map((f) => [f.fecha, f]));
  const dias = diasDe(lunes).map((fecha): DiaSemana => {
    const fila = porFecha.get(fecha);
    // Un día que no se armó (ya había pasado su hora cuando se llenó la semana) se dice igual: la semana siempre tiene sus siete renglones.
    const dicho = dichos.find((d) => d.fecha === fecha) ?? sinArmar(fecha, ahora, zona);
    // OL-488: lo que ya pasó sin publicación, en una línea gris (sin «Sin publicación» en grande).
    if (fecha < hoy) {
      const porQue = !fila ? "sin-armar" : fila.tipo === "descanso" && fila.motivo ? "nadie" : dicho.estado === "quitado" ? "quitado" : dicho.estado === "sin" ? "sin" : null;
      return porQue ? { ...dicho, pasado: lineaDelPasado(fecha, porQue, ahora, zona) } : dicho;
    }
    const c = sugeridas?.casillas.get(fecha);
    if (!c) return dicho;
    if (c.tipo !== "descanso") {
      const sugerencia = decirSugerencia(c, sugeridas!, ahora, zona);
      return { ...dicho, tipo: c.tipo, nombre: sugerencia.nombre, imagen: sugerencia.imagen, cuando: sugerencia.cuando, estado: "sin", lineaEstado: sugerencia.ahora ? "Sin programar: publícalo ahora" : "Sin programar: prográmalo", aviso: null, sugerencia };
    }
    // Nadie con material para ese día: el artista y el lugar llevan a «Falta material»; el evento dice por qué (sin eventos o sin cartel).
    const regla = REGLA[diaIso(fecha)];
    const deFicha = regla.tipo === "artista" || regla.tipo === "lugar";
    const abreFalta = deFicha && !!falta?.fichas.length;
    return {
      ...dicho,
      // Lo que pedía la regla ese día («Mié 14 · 7:00 pm · Lugar»), no «Descanso»: el día no descansa, le falta material.
      cuando: cuandoDelDia({ fecha, hora: regla.hora, tipo: regla.tipo }, ahora, zona),
      imagen: SIN_FOTO,
      nombre: deFicha ? nadieConMaterial(fecha, ahora, zona) : "Sin publicación",
      lineaEstado: deFicha ? (abreFalta ? "Falta material: ve quién se quedó fuera" : "Nadie tiene la ficha completa todavía") : (c.motivo ?? "No hay eventos ese día."),
      estado: "descanso",
      nadie: { abreFalta },
    };
  });
  return { lunes, rango: rangoDeLaSemana(lunes), resumen: resumenSemana(dias.map((d) => ({ estado: d.estado, fecha: d.fecha, falta: !!d.aviso?.falta }))), dias, zona, ciudad, falta };
}

/** Un día sin publicación (de hoy en adelante, no domingo): sin fila, o descansando porque nadie tenía material (su motivo lo dice). */
const sinPublicacion = (f: FilaDia | undefined) => !f || (f.tipo === "descanso" && !!f.motivo);

type Sugeridas = { casillas: Map<string, CasillaNueva>; artistas: Candidato[]; lugares: Candidato[]; eventos: EventoCandidato[] };

/**
 * OL-488: lo que sugiere la regla para cada día de hoy en adelante sin publicación (no domingo), con los candidatos de la base y en orden (una
 * ficha sugerida un día no se sugiere otro). La misma regla que arma la semana (`sugerirDia` es `armarSemana` para un día). Null si no hace falta
 * o si la base no respondió (entonces esos días se dicen como antes).
 */
async function sugerencias(supabase: ClienteServidor, ciudad: string, lunes: string, zona: string, filas: FilaDia[], ahora: Date): Promise<Sugeridas | null> {
  const hoy = diaLocal(ahora, zona);
  const porFecha = new Map(filas.map((f) => [f.fecha, f]));
  const faltan = diasDe(lunes).filter((fecha) => fecha >= hoy && diaIso(fecha) !== 7 && sinPublicacion(porFecha.get(fecha)));
  if (!faltan.length) return null;
  const [artistas, lugares, sugeridos] = await Promise.all([
    leerCandidatos(supabase, ciudad, "artista", lunes),
    leerCandidatos(supabase, ciudad, "lugar", lunes),
    supabase.rpc("instagram_sugerencias", { p_ciudad: ciudad, p_dias: 14 }),
  ]);
  if (!artistas || !lugares || sugeridos.error || !Array.isArray(sugeridos.data)) return null;
  const eventos = sugeridos.data as EventoCandidato[];
  const usados = new Set(filas.flatMap((d) => [d.artista_id, d.lugar_id, d.evento_id, ...(d.eventos ?? [])].filter((x): x is string => !!x)));
  const casillas = new Map<string, CasillaNueva>();
  for (const fecha of faltan) {
    const c = sugerirDia({ fecha, lunes, zona, ahora, artistas, lugares, eventos, usados, conCartel: cartelPublicable });
    if (!c) continue;
    for (const id of [c.artista_id, c.lugar_id, c.evento_id, ...(c.eventos ?? [])]) if (id) usados.add(id);
    casillas.set(fecha, c);
  }
  return { casillas, artistas, lugares, eventos };
}

/** OL-488: la sugerencia de un día, la misma que enseña la semana (así «Programar» y «Publicar ahora» guardan justo lo que se vio). */
export async function sugerenciaDelDia(supabase: ClienteServidor, ciudad: string, fecha: string, ahora = new Date()): Promise<CasillaNueva | null> {
  const zona = await zonaDeCiudad(supabase, ciudad);
  const lunes = lunesDe(fecha);
  const filas = await leerDias(supabase, ciudad, lunes, true);
  if (!filas) return null;
  const c = (await sugerencias(supabase, ciudad, lunes, zona, filas, ahora))?.casillas.get(fecha) ?? null;
  return c && c.tipo !== "descanso" ? c : null;
}

/** Lo que dicen el renglón y la hoja de una sugerencia: el nombre, la miniatura, cuándo saldría y si se puede programar o publicar ya. */
function decirSugerencia(c: CasillaNueva, de: Sugeridas, ahora: Date, zona: string): Sugerencia {
  const tipo = c.tipo as Sugerencia["tipo"];
  const hora = c.hora ?? "19:00";
  const ficha = c.artista_id ? de.artistas.find((x) => x.id === c.artista_id) : c.lugar_id ? de.lugares.find((x) => x.id === c.lugar_id) : null;
  const evs = (c.evento_id ? [c.evento_id] : (c.eventos ?? [])).map((id) => de.eventos.find((e) => e.id === id)).filter((e): e is EventoCandidato => !!e);
  const nombre = ficha?.nombre ?? (tipo === "semana" ? nombreDelFin(evs.map((e) => ({ id: e.id, slug: e.slug ?? null, titulo: e.titulo, imagen: e.imagen, inicio: e.inicio, zona: e.zona }))) : evs[0]?.titulo) ?? "Sin nombre";
  const imagen = (ficha ? (ficha.portada ?? ficha.foto) : evs[0]?.imagen) ?? SIN_FOTO;
  const esHoy = c.fecha === diaLocal(ahora, zona);
  return {
    fecha: c.fecha,
    tipo,
    nombre,
    imagen,
    cuando: cuandoDelDia({ fecha: c.fecha, hora, tipo }, ahora, zona, tipo === "semana" ? evs.length + 1 : 0),
    sale: `${esHoy ? "hoy" : `el ${nombreDelDia(c.fecha, ahora, zona).toLowerCase()}`} a las ${horaDeReloj(hora)}`,
    motivo: c.motivo,
    programar: new Date(salePara(c.fecha, hora, zona)) > ahora,
    ahora: esHoy,
  };
}

type FilaFalta = { tipo: "artista" | "lugar"; id: string; slug: string; nombre: string; foto: string | null; falta: string[]; otros: string[] | null; proxima_titulo: string | null; proxima_inicio: string | null; proxima_zona: string | null; lleva: string[] | null; lleva_nombre: string | null; pedido_en: string | null };

/** OL-488: «Falta material» de una semana (`instagram_falta_material`), ya dicho. Null si la base no respondió; sin nadie, la lista vacía. */
export async function leerFalta(supabase: ClienteServidor, ciudad: string, lunes: string, ahora: Date, zona: string): Promise<FaltaMaterial | null> {
  const { data, error } = await supabase.rpc("instagram_falta_material", { p_ciudad: ciudad, p_desde: lunes });
  if (error || !Array.isArray(data)) return null;
  const dia = (iso: string, z: string) => diaConMes(iso, ahora, z).replace(/ de .*$/, "");
  const fichas = (data as FilaFalta[]).map((f): FichaSinMaterial => ({
    tipo: f.tipo,
    id: f.id,
    slug: f.slug,
    nombre: f.nombre,
    foto: f.foto,
    falta: f.falta,
    queFalta: queFalta(f.falta),
    otros: f.otros?.length ? `También le falta ${f.otros.map((o) => (o === "descripcion" ? "la descripción" : "su Instagram")).join(" y ")} para entrar` : null,
    proxima: f.proxima_inicio ? `Próxima fecha: ${dia(f.proxima_inicio, f.proxima_zona ?? zona)}${f.proxima_titulo ? ` · ${f.proxima_titulo}` : ""}` : null,
    lleva: f.lleva?.length ? (f.lleva_nombre ?? "").trim().split(/\s+/)[0] || "una cuenta" : null,
    puedePedir: !!f.lleva?.length && !f.pedido_en,
    pedido: f.pedido_en ? `Se lo pedimos ${diaLocal(new Date(f.pedido_en), zona) === diaLocal(ahora, zona) ? "hoy" : `el ${dia(f.pedido_en, zona)}`}` : null,
    ficha: `/${f.tipo === "artista" ? "artistas" : "lugares"}/${f.slug}`,
  }));
  const n = (t: "artista" | "lugar") => fichas.filter((f) => f.tipo === t).length;
  return { lunes, resumen: resumenDeLaFalta(n("artista"), n("lugar")) ?? "", fichas };
}

type Ficha = { id: string; slug: string; nombre: string; redes: unknown; imagen: string | null };
type Evento = { id: string; slug: string | null; titulo: string; imagen: string | null; inicio: string; zona: string };
type Trabajo = { id: string; estado: string; siguiente_en: string; resultado: { instagram?: { permalink?: string | null } } | null };

/** Lo que dice cada día: el nombre, la miniatura, cómo va, el aviso y (ya publicado) lo que dio. */
export async function decirDias(supabase: ClienteServidor, filas: FilaDia[], ahora: Date, zona: string): Promise<DiaSemana[]> {
  const ids = (k: "artista_id" | "lugar_id" | "evento_id") => [...new Set(filas.map((f) => f[k]).filter((x): x is string => !!x))];
  const deEventos = [...new Set([...ids("evento_id"), ...filas.flatMap((f) => f.eventos ?? [])])];
  const trabajos = [...new Set(filas.map((f) => f.trabajo_id).filter((x): x is string => !!x))];
  const publicados = filas.filter((f) => f.estado === "publicado").map((f) => f.id);
  const [a, l, e, t, r] = await Promise.all([
    ids("artista_id").length ? supabase.from("artistas").select("id, slug, nombre, redes, imagen:foto").in("id", ids("artista_id")) : null,
    ids("lugar_id").length ? supabase.from("lugares").select("id, slug, nombre, redes, imagen:portada").in("id", ids("lugar_id")) : null,
    deEventos.length ? supabase.from("eventos").select("id, slug, titulo, imagen, inicio, zona").in("id", deEventos) : null,
    trabajos.length ? supabase.from("redes_trabajos").select("id, estado, siguiente_en, resultado").in("id", trabajos) : null,
    publicados.length ? supabase.rpc("instagram_resultado", { p_casillas: publicados }) : null,
  ]);
  const por = <T extends { id: string }>(x: { data: unknown } | null) => new Map(((x?.data ?? []) as T[]).map((y) => [y.id, y]));
  const artistas = por<Ficha>(a);
  const lugares = por<Ficha>(l);
  const eventos = por<Evento>(e);
  const trabajosPor = por<Trabajo>(t);
  const medidas = new Map(((r?.data ?? []) as { casilla: string; visitas: number; van: number }[]).map((x) => [x.casilla, x]));
  return filas.map((f) => {
    const trabajo = f.trabajo_id ? (trabajosPor.get(f.trabajo_id) ?? null) : null;
    const estado = estadoDelDia({ estado: f.estado, tipo: f.tipo, fecha: f.fecha, programado_para: f.programado_para, trabajo }, ahora, zona);
    const ficha = f.artista_id ? artistas.get(f.artista_id) : f.lugar_id ? lugares.get(f.lugar_id) : null;
    const evento = f.evento_id ? eventos.get(f.evento_id) : null;
    const delFin = (f.eventos ?? []).map((id) => eventos.get(id)).filter((x): x is Evento => !!x);
    const nombre =
      f.tipo === "descanso" ? "Sin publicación" : ficha?.nombre ?? evento?.titulo ?? (f.tipo === "semana" ? nombreDelFin(delFin) : "Sin ficha");
    // De qué ficha es la tarjeta (`f`): tras «Cambiar», el teléfono no enseña la miniatura que guardó de la anterior.
    const tarjeta = `/api/instagram/semana/${f.id}?mini=1&f=${f.artista_id ?? f.lugar_id ?? (f.eventos ?? []).join(",").slice(0, 120)}`;
    const imagen = f.tipo === "descanso" || estado === "quitado" ? SIN_FOTO : f.tipo === "evento" ? (evento?.imagen ?? SIN_FOTO) : tarjeta;
    const m = medidas.get(f.id);
    return {
      id: f.id,
      fecha: f.fecha,
      tipo: f.tipo,
      nombre,
      imagen,
      cuando: cuandoDelDia({ fecha: f.fecha, hora: f.hora, tipo: f.tipo }, ahora, zona, f.tipo === "semana" ? delFin.length + 1 : 0),
      estado,
      lineaEstado: lineaDelEstado(estado, f.hora, f.tipo === "descanso" ? f.motivo : null),
      aviso: lineaDelAviso({ tipo: f.tipo, cuenta: ficha ? usuarioDeInstagram(ficha.redes) : null, aviso_en: f.aviso_en, reemplaza: f.reemplaza }, estado, ahora, zona),
      medida: m ? `${m.visitas === 1 ? "1 visita" : `${m.visitas} visitas`} · ${m.van} van` : null,
      permalink: trabajo?.resultado?.instagram?.permalink ?? null,
      href: f.artista_id && ficha ? `/artistas/${ficha.slug}` : f.lugar_id && ficha ? `/lugares/${ficha.slug}` : evento ? `/eventos/${evento.slug ?? evento.id}` : "/admin/instagram",
    };
  });
}

/** Un día que no se armó: lo que pedía la regla, sin publicación. No abre hoja (`id` empieza con «sin-»). */
function sinArmar(fecha: string, ahora: Date, zona: string): DiaSemana {
  const r = REGLA[diaIso(fecha)];
  return {
    id: `sin-${fecha}`,
    fecha,
    tipo: r.tipo,
    nombre: "Sin publicación",
    imagen: SIN_FOTO,
    cuando: cuandoDelDia({ fecha, hora: r.hora, tipo: r.tipo }, ahora, zona),
    estado: r.tipo === "descanso" ? "descanso" : "sin",
    lineaEstado: r.tipo === "descanso" ? "La cuenta descansa" : "No se programó",
    aviso: null,
    medida: null,
    permalink: null,
    href: "/admin/instagram",
  };
}

/** «Del viernes 16 al domingo 18»: el nombre del día de «Esta semana», de los días de sus eventos. */
function nombreDelFin(eventos: Evento[]): string {
  if (!eventos.length) return "Esta semana";
  const dias = eventos.map((e) => ({ dia: diaLocal(new Date(e.inicio), e.zona), zona: e.zona })).sort((x, y) => x.dia.localeCompare(y.dia));
  const fmt = (d: string) => new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", weekday: "long", day: "numeric" }).format(new Date(`${d}T12:00:00Z`)).replace(",", "");
  const a = dias[0].dia;
  const b = dias.at(-1)!.dia;
  return a === b ? `El ${fmt(a)}` : `Del ${fmt(a)} al ${fmt(b)}`;
}

/** Un día, con su ciudad (para la hoja y la vista previa). */
export async function leerDia(supabase: ClienteServidor, id: string): Promise<FilaDia | null> {
  const { data } = await supabase.from("instagram_semana").select(COLUMNAS_DIA).eq("id", id).maybeSingle<FilaDia>();
  return data ?? null;
}

/** Cuándo se guardó el primer día de una semana (null si no tiene ninguno; undefined si no se pudo leer). */
async function armadaEn(supabase: ClienteServidor, ciudad: string, lunes: string): Promise<string | null | undefined> {
  const dias = diasDe(lunes);
  const { data, error } = await supabase.from("instagram_semana").select("creado_en").eq("ciudad", ciudad).gte("fecha", dias[0]).lte("fecha", dias[6]).order("creado_en").limit(1);
  if (error) return undefined;
  return ((data ?? []) as { creado_en: string }[])[0]?.creado_en ?? null;
}

/**
 * Resumen para la portada de Administración: «Semana: 4 de 6 programadas · la que viene, armada el mié 7» (o «· la que viene se arma el
 * miércoles», OL-487: así la administración sabe que no tiene que entrar) y, OL-488, «· 3 sin material» si hay fichas con fecha que se quedan
 * fuera por falta de foto o portada. Null si no hay nada que decir o no se pudo leer.
 */
export async function resumenDeLaPortada(supabase: ClienteServidor, ciudad: string | null, ahora = new Date()): Promise<string | null> {
  if (!ciudad) return null;
  const zona = await zonaDeCiudad(supabase, ciudad);
  const lunes = lunesDeLaSemana("esta", ahora, zona);
  const [filas, viene, falta] = await Promise.all([leerDias(supabase, ciudad, lunes), armadaEn(supabase, ciudad, lunesDeLaSemana("viene", ahora, zona)), supabase.rpc("instagram_falta_material", { p_ciudad: ciudad, p_desde: lunes })]);
  const partes: string[] = [];
  if (filas?.length) {
    const vivos = filas.filter((f) => f.tipo !== "descanso");
    const listos = vivos.filter((f) => f.estado === "publicado" || (f.estado === "programado" && f.trabajo_id)).length;
    partes.push(`${listos} de ${vivos.length} ${vivos.length === 1 ? "programada" : "programadas"}`);
  }
  if (viene !== undefined) partes.push(lineaDeLaQueViene(viene, ahora, zona));
  // OL-488: cuántas fichas con fecha se quedan fuera de esta semana por falta de foto o portada.
  const sinMaterial = !falta.error && Array.isArray(falta.data) ? falta.data.length : 0;
  if (sinMaterial) partes.push(`${sinMaterial} sin material`);
  return partes.length ? `Semana: ${partes.join(" · ")}` : null;
}

/** Las funciones de la base que el latido pide a nombre de la administración (migración 20261029230000, `instagram_semana_latido`). */
const A_NOMBRE_DE_LA_ADMINISTRACION = new Set(["instagram_candidatos", "instagram_sugerencias", "instagram_semana_guardar"]);

/**
 * El cliente con la llave de servicio, visto como la sesión de la administración para armar la semana: lee las tablas tal cual y las tres
 * funciones que piden ser de la administración (los candidatos, los eventos y guardar) van por `instagram_semana_latido`, que las llama a nombre
 * de la cuenta que conectó Instagram (o la última que tocó la semana). Así el latido usa la misma `armarLoQueFalta` que la pestaña.
 */
export function comoAdministracion(db: SupabaseClient): ClienteServidor {
  const rpc = async (fn: string, args?: Record<string, unknown>) => {
    if (!A_NOMBRE_DE_LA_ADMINISTRACION.has(fn)) return db.rpc(fn, args);
    const { data, error } = await db.rpc("instagram_semana_latido", { p_funcion: fn, p_args: args ?? {} });
    return { data, error };
  };
  return { from: (tabla: string) => db.from(tabla), rpc } as unknown as ClienteServidor;
}

export type ArmadoDelLatido = { ciudad: string; resultado: "armada" | "ya estaba" | "fuera de hora" | "error" };

/**
 * OL-487: lo que hace el latido de redes (`/api/redes/correr`) en cada llamada antes de trabajar la cola: un miércoles entre las 9:00 y las 9:59 de
 * la hora de cada ciudad abierta con eventos la semana que viene (`instagram_semana_por_armar`, que es también lo que despierta al latido), arma «la
 * que viene» si le faltan días, con la misma función que la pestaña. Idempotente: si ya está (la armó la pestaña o otra vuelta del latido), no hace
 * nada. Nunca lanza: si una ciudad falla, lo anota (`avisar`: los registros de la ruta, sin secretos ni datos de personas) y sigue con la siguiente;
 * el latido lo vuelve a intentar al minuto siguiente mientras dure la hora.
 */
export async function armarLasQueVienen(db: SupabaseClient, ahora: Date, avisar: (t: string) => void = (t) => console.warn(t)): Promise<ArmadoDelLatido[]> {
  const { data, error } = await db.rpc("instagram_semana_por_armar", { p_ahora: ahora.toISOString() });
  if (error || !Array.isArray(data)) {
    avisar("redes: no se pudo ver qué semanas de Instagram faltan por armar; lo reintenta el latido");
    return [];
  }
  const cliente = comoAdministracion(db);
  const hechos: ArmadoDelLatido[] = [];
  for (const { ciudad, zona } of data as { ciudad: string; zona: string }[]) {
    if (!tocaArmarLaQueViene(ahora, zona)) {
      hechos.push({ ciudad, resultado: "fuera de hora" });
      continue;
    }
    try {
      const r = await armarLoQueFalta(cliente, ciudad, "viene", ahora);
      if (!r || r.armado === "error") throw new Error("sin armar");
      hechos.push({ ciudad, resultado: r.armado === "guardada" ? "armada" : "ya estaba" });
    } catch {
      avisar(`redes: no se pudo armar la semana que viene de Instagram de ${ciudad}; lo reintenta el latido`);
      hechos.push({ ciudad, resultado: "error" });
    }
  }
  return hechos;
}

/** «el mié 7 de oct» si la ficha dijo que no a salir en Instagram (solo lo ve la administración: la base no se lo da a nadie más); null si no. */
export async function fueraDeInstagram(supabase: ClienteServidor | null, tipo: "artista" | "lugar", id: string, ahora = new Date()): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("instagram_fuera").select("desde").eq(tipo === "artista" ? "artista_id" : "lugar_id", id).maybeSingle<{ desde: string }>();
  return data ? `el ${diaConMes(data.desde, ahora, ZONA_INICIAL)}` : null;
}

export { db as comoCliente, uno };
