import { selloNovedadArtista, type NovedadRecienteArtista } from "./novedadesArtista";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventoAgenda } from "./agenda";
import { etiquetaArtista, hrefArtista, type ArtistaLista } from "./artistas";
import { hrefEvento, sitioEnLista } from "./eventos";
import { diaCorto, diaLocal, formatearCuando, ZONA_INICIAL } from "./fechas";
import { etiquetaTipo, hrefLugar, textoProximo, type LugarLista } from "./lugares";
import { textoActividadesSemana } from "./agendaPorClase";
import { rangoDelPeriodo, soloInteres, textoProgramaRegistrado, textoVisita, visitaDeEvento } from "./claseEvento";
import { textoParte } from "./ocurrencias";

/**
 * Destacados (docs/rediseno/20, firmado por el founder el 2026-09-16): arriba de la Agenda, de Lugares y de Artistas, lo
 * que elige la administración y lo que tiene al menos 3 «Voy». Qué entra y en qué orden lo decide la base
 * (`tira_destacados`); aquí, cómo se lee y cómo se dice.
 */
export type TipoFicha = "evento" | "lugar" | "artista";
export type Seccion = "eventos" | "lugares" | "artistas";
/** Un renglón de la tira como llega de la base. */
export type Destacado = { id: string; motivo: "elegido" | "asistentes"; hasta: string | null; van: number };
/** Un destacado como lo ve el panel: con su nombre y su foto. */
export type FilaDestacada = Destacado & { nombre: string; foto: string | null };
/** El tipo de ficha de cada sección, y al revés. */
export const TIPO_DE: Record<Seccion, TipoFicha> = { eventos: "evento", lugares: "lugar", artistas: "artista" };
export const SECCION_DE: Record<TipoFicha, Seccion> = { evento: "eventos", lugar: "lugares", artista: "artistas" };
/** Lo que la administración decidió sobre una ficha: la eligió, la quitó aunque tenga asistentes, o nada. */
export type EstadoDestacado = "elegido" | "quitado" | "ninguno";
/** Lo decidido que sigue vigente, con su plazo y cuándo se decidió: Deshacer lo repone tal cual. */
export type Decidido = { estado: EstadoDestacado; plazo: string | null; creado: string | null };
export const SIN_DECIDIR: Decidido = { estado: "ninguno", plazo: null, creado: null };
/** Una tarjeta de la tira, lista para pintarse. `foto` es null cuando no tiene (quien la pinta pone su relleno o no lleva imagen);
 *  `cuando` dice que `detalle` es un día y una hora (se pinta en violeta) y no un tipo o una disciplina; `detalle` es la primera línea de sus datos (cuándo) y `sitio`, la segunda (dónde); `hoy` (empieza hoy) y `van` los pone solo
 *  `tarjetaEvento`: lugares y artistas no tienen qué decir así. `clave` y `parte` solo los lleva la tarjeta de un día de un evento con varios (OL-320,
 *  `lib/ocurrencias`): la llave de ese día, para que el mismo evento pueda salir dos veces en una tira, y «Día 2 de 3» («Sesión 2 de 4» en un taller).
 *  `sinVoy`: una exposición o el marco de un festival (OL-322), que no llevan el botón «Voy» de la tarjeta. */
export type Tarjeta = { id: string; href: string; foto: string | null; titulo: string; detalle: string; sitio?: string; van: number | null; hoy?: boolean; cuando?: boolean; novedad?: NovedadRecienteArtista | null; clave?: string; parte?: string; sinVoy?: boolean };

/**
 * Una tarjeta de evento, con lo mínimo para saber si sigue vigente y en qué orden va entre otras (OL-224, bitácora
 * 253): `tarjetaEvento` siempre las trae; lugares y artistas no («Tus planes» solo junta eventos). El «recuerdo de la
 * visita» (`lib/decisionesVisita.ts`) guarda esta misma forma para poder agregar, sin volver a pedirle nada al
 * servidor, la tarjeta de un evento recién decidido (Voy o Me interesa) que todavía no viene en la página.
 */
export type TarjetaConFecha = Tarjeta & { inicio: string; fin: string | null; zona: string };

/** Foto real primero; el orden de la selección o de las fechas se conserva dentro de cada grupo. */
export function ordenarTarjetasPorFoto(tarjetas: Tarjeta[]): Tarjeta[] {
  return tarjetas.toSorted((a, b) => Number(a.foto === null) - Number(b.foto === null));
}

/**
 * El único rótulo que lleva una tarjeta sobre su foto (docs/rediseno/50, H-02): no se apilan tres sobre el cartel. Lo tuyo primero
 * («Te interesa»), luego lo que ayuda a decidir: «Hoy» antes que «N van»; sin ninguno, nada. «Recién agregado» ya no es un sello: el
 * carril que lo agrupa lo dice. `tuyo` es lo que la persona ya decidió (un estado); lo demás, un dato del evento (un sello); `hoy` marca
 * el tratamiento de «Hoy», también para «Nuevo video/audio» de artistas (OL-275), en el color de acción.
 */
export function selloDeTarjeta(t: Pick<Tarjeta, "hoy" | "van" | "novedad" | "parte">, interesa = false): { texto: string; tuyo: boolean; hoy: boolean } | null {
  if (interesa) return { texto: "Te interesa", tuyo: true, hoy: false };
  const nuevo = selloNovedadArtista(t.novedad);
  if (nuevo) return { texto: nuevo, tuyo: false, hoy: true };
  // El día de un evento con varios dice cuál es («Hoy · Día 2 de 3»): sin eso, tres tarjetas del mismo evento parecerían repetidas.
  if (t.hoy) return { texto: t.parte ? `Hoy · ${t.parte}` : "Hoy", tuyo: false, hoy: true };
  if (t.parte) return { texto: t.parte, tuyo: false, hoy: false };
  if (t.van !== null && t.van > 0) return { texto: t.van === 1 ? "1 va" : `${t.van} van`, tuyo: false, hoy: false };
  return null;
}

/** Lo que elige la administración en lugares y artistas dura dos semanas; un evento, hasta que pasa. */
export const DIAS_DESTACADO = 14;
const DOS_SEMANAS_MS = DIAS_DESTACADO * 86400000;

/** La tira de una sección en una ciudad; vacía si no hay base o falla (la lista sigue: la tira es un atajo). */
export async function leerTira(supabase: SupabaseClient | null, seccion: Seccion, ciudad: string): Promise<Destacado[]> {
  if (!supabase) return [];
  const { data } = await supabase.rpc("tira_destacados", { p_tipo: seccion, p_ciudad: ciudad });
  return (data ?? []) as Destacado[];
}

/** Las fichas ya cargadas, en el orden de la tira. */
export function enOrden<T extends { id: string }>(tira: { id: string }[], fichas: T[]): T[] {
  const porId = new Map(fichas.map((f) => [f.id, f]));
  return tira.flatMap((d) => porId.get(d.id) ?? []);
}

const minuscula = (texto: string) => texto.charAt(0).toLowerCase() + texto.slice(1);

/**
 * La línea de cuándo de la tarjeta de un evento: su día y su hora y, por clase (OL-322, doc 55 §3), la de una exposición («Hasta el dom 30 de nov»)
 * o los días del marco de un festival («Del 12 al 14 de nov»). Lo demás de su clase lo dice `notaDeClase`.
 */
export function cuandoDeTarjeta(e: Pick<EventoAgenda, "inicio" | "fin" | "zona" | "clase">, ahora = new Date()): string {
  if (e.clase === "exposicion") return textoVisita(visitaDeEvento(e.inicio, e.fin, e.zona), diaLocal(ahora, e.zona), ahora, e.zona);
  if (e.clase === "festival") return rangoDelPeriodo(e.inicio, e.fin, e.zona, ahora);
  return minuscula(formatearCuando(e.inicio, null, ahora, e.zona));
}

/**
 * Lo que su clase añade al cuándo (OL-322): «Horario por confirmar» en una exposición que se sabe sin horario; en el marco de un festival, «3
 * actividades esta semana» (el carril «Esta semana») o «Programa registrado: 4 actividades». Null en lo demás. Va aparte del cuándo para que no
 * se corte con él: en la tarjeta, en la línea del sitio; en el renglón, tras el cuándo.
 */
export function notaDeClase(e: Pick<EventoAgenda, "clase" | "horario" | "programa">): string | null {
  if (e.clase === "exposicion") return e.horario && !e.horario.some((f) => f.dias.length) ? "Horario por confirmar" : null;
  if (e.clase === "festival") return e.programa?.estaSemana ? textoActividadesSemana(e.programa.estaSemana) : e.programa?.registrados ? textoProgramaRegistrado(e.programa.registrados) : null;
  return null;
}

/** La segunda línea de la tarjeta: el sitio; el de una exposición sin horario lo dice («Aether · Horario por confirmar») y el marco de un festival
 *  dice su programa en vez del sitio de su primer acto (un festival suele tener varias sedes). */
function sitioDeTarjeta(e: EventoAgenda): string {
  const nota = notaDeClase(e);
  if (!nota) return sitioEnLista(e);
  return e.clase === "festival" ? nota : `${sitioEnLista(e)} · ${nota}`;
}

export function tarjetaEvento(e: EventoAgenda, ahora = new Date()): TarjetaConFecha {
  const parte = textoParte(e);
  // Una exposición no «es hoy» aunque se pueda visitar hoy: su rótulo no lo dice (no es algo que pase hoy a una hora). Ni ella ni el marco de un
  // festival llevan «Voy» (doc 55 §5, punto 2: «Me interesa», que se cambia en su ficha).
  const hoy = e.clase !== "exposicion" && diaCorto(e.inicio, ahora, e.zona) === "Hoy";
  return { ...(e.ocurrencia ? { clave: e.ocurrencia.clave } : {}), ...(parte ? { parte } : {}), ...(soloInteres(e.clase) ? { sinVoy: true } : {}), id: e.id, href: hrefEvento(e), foto: e.imagen ?? e.lugar?.portada ?? null, titulo: e.titulo, detalle: cuandoDeTarjeta(e, ahora), sitio: sitioDeTarjeta(e), van: e.van, cuando: true, hoy, inicio: e.inicio, fin: e.fin, zona: e.zona };
}

export function tarjetaLugar(l: LugarLista, ahora = new Date()): Tarjeta {
  return { id: l.id, href: hrefLugar(l), foto: l.portada, titulo: l.nombre, detalle: l.proximo ? textoProximo(l.proximo, ahora) : etiquetaTipo(l.tipo), van: 0, ...(l.proximo ? { cuando: true } : {}) };
}

/** La tarjeta de artista usa el mismo rectángulo que eventos; la fecha va sin el sitio. */
export function tarjetaArtista(a: ArtistaLista, ahora = new Date()): Tarjeta {
  const novedad = selloNovedadArtista(a.novedad, ahora) ? a.novedad : null;
  return { id: a.id, href: `${hrefArtista(a)}${novedad ? `?novedad=${encodeURIComponent(novedad.novedad_id)}` : ""}`, novedad, foto: a.foto, titulo: a.nombre, detalle: a.proxima ? minuscula(formatearCuando(a.proxima.inicio, null, ahora, a.proxima.zona)) : etiquetaArtista(a), van: 0, ...(a.proxima ? { cuando: true } : {}) };
}

/** "hasta mañana" o "hasta el mié 30 de sep", en la zona de la ficha. */
function hasta(iso: string, ahora: Date, zona: string): string {
  const dia = diaCorto(iso, ahora, zona);
  return dia === "Hoy" || dia === "Mañana" ? `hasta ${minuscula(dia)}` : `hasta el ${dia}`;
}

const enDosSemanas = (ahora: Date) => new Date(ahora.getTime() + DOS_SEMANAS_MS).toISOString();

/** Debajo de «Destacar», en el menú: hasta cuándo quedaría. */
export function textoDestacar(tipo: TipoFicha, ahora = new Date(), zona = ZONA_INICIAL): string {
  return tipo === "evento" ? "Hasta que pase el evento" : `Dos semanas: ${hasta(enDosSemanas(ahora), ahora, zona)}`;
}

/** Por qué está destacada una ficha, en el menú y en el panel. */
export function textoMotivo(d: Pick<Destacado, "motivo" | "hasta" | "van">, tipo: TipoFicha, ahora = new Date(), zona = ZONA_INICIAL): string {
  if (d.motivo === "asistentes") return `Destacado: ${d.van} van${tipo === "evento" ? "" : " a sus eventos"}`;
  return d.hasta ? `Destacado ${hasta(d.hasta, ahora, zona)}` : "Destacado hasta que pase";
}

/** Lo que queda escrito en el menú después de destacar o quitar. */
export function textoHecho(estado: EstadoDestacado, tipo: TipoFicha, ahora = new Date(), zona = ZONA_INICIAL): string {
  if (estado !== "elegido") return "Ya no es destacado";
  return textoMotivo({ motivo: "elegido", hasta: tipo === "evento" ? null : enDosSemanas(ahora), van: 0 }, tipo, ahora, zona);
}

/** Lo que la administración decidió sobre una ficha, si sigue vigente: con el plazo vencido, cuenta como nada. */
export function decididoVigente(renglon: { quitado: boolean; hasta: string | null; creado_en: string } | null, ahora = new Date()): Decidido {
  if (!renglon || (renglon.hasta && new Date(renglon.hasta) <= ahora)) return SIN_DECIDIR;
  return { estado: renglon.quitado ? "quitado" : "elegido", plazo: renglon.hasta, creado: renglon.creado_en };
}

/**
 * Los límites de `cambiar_destacado` para lo que repone Deshacer: el plazo, por venir y de dos semanas como mucho; la
 * fecha de la decisión, no futura. La acción los comprueba antes de llamar a la base.
 */
export function fechasValidas(plazo: string | null, creado: string | null, ahora = new Date()): boolean {
  const hasta = plazo === null ? null : Date.parse(plazo);
  const desde = creado === null ? null : Date.parse(creado);
  return (hasta === null || (hasta > ahora.getTime() && hasta <= ahora.getTime() + DOS_SEMANAS_MS)) && (desde === null || desde <= ahora.getTime());
}

/**
 * Si una ficha puede salir en la tira, con la regla de `tira_destacados`: visible; un lugar, además, no privado; un
 * evento, sin pasar y sin lugar o en uno visible y no privado. A lo que nunca puede salir no se le ofrece «Destacar».
 */
export function puedeDestacarse(ficha: { visible: boolean; privado?: boolean; paso?: boolean; lugar?: { visible: boolean; privado: boolean } | null }): boolean {
  return ficha.visible && !ficha.privado && !ficha.paso && (!ficha.lugar || (ficha.lugar.visible && !ficha.lugar.privado));
}

/**
 * El renglón «Destacar» del menú de una ficha y del panel. Está destacada si la administración la eligió (aunque no quepa
 * en la tira de 8) o si entra por asistentes y nadie la quitó; entonces se ofrece quitarla. El motivo sale de lo decidido
 * y, si no hay nada decidido, de la tira.
 */
export function opcionDestacar(tipo: TipoFicha, decidido: Decidido, enTira: Destacado | null, ahora = new Date(), zona = ZONA_INICIAL): { quitar: boolean; detalle: string } {
  if (decidido.estado === "elegido") return { quitar: true, detalle: textoMotivo({ motivo: "elegido", hasta: decidido.plazo, van: 0 }, tipo, ahora, zona) };
  if (enTira) return { quitar: true, detalle: textoMotivo(enTira, tipo, ahora, zona) };
  return { quitar: false, detalle: textoDestacar(tipo, ahora, zona) };
}
