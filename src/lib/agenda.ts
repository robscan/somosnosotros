import { abiertasEseDia, entraEnQue, esExposicion, plegarActos, porCierre, queDe, visitaEnRango, type Que } from "./agendaPorClase";
import { ocupaRango } from "./calendario";
import type { Agenda } from "./cargarAgenda";
import { cuandoDeUrl, type Cuando } from "./cuando";
import type { Clase, EventoResumen } from "./eventos";
import type { Franja } from "./horarioLugar";
import { claseDeCosto, nombreSitio, type ClaseDeCosto } from "./eventos";
import { diaCorto, diaLocal, localAIso, ZONA_INICIAL } from "./fechas";
import { compararNombres, normalizarNombre } from "./lugares";
import { ocurrenciasDeLista, type DatosOcurrencia } from "./ocurrencias";
import type { SesionGuardada } from "./sesionesEvento";

/** Lo que la agenda del inicio necesita de cada evento, además del resumen. */
export type EventoAgenda = EventoResumen & {
  creado_en: string;
  /** Cuántas personas dijeron "Voy"; null si el recuento no está disponible. */
  van: number | null;
  /** Su horario por día (`eventos_sesiones`, OL-311), solo si lo tiene y todavía vale (`sesionesVigentes`): la agenda lo reparte en sus días (`lib/ocurrencias`). */
  sesiones?: SesionGuardada[];
  /** Solo en lo que sale de repartir un evento en sus días (OL-320): el evento visto ese día, con el `inicio` y el `fin` de ese día. */
  ocurrencia?: DatosOcurrencia;
  /** Cómo ocurre (OL-321): sin ella, como hasta ahora, un evento (`puntual`). La agenda la usa para ponerlo donde va (OL-322, `lib/agendaPorClase`). */
  clase?: Clase;
  /** El festival del que es parte (un acto de su programa), si lo es. */
  evento_padre_id?: string | null;
  /** Solo en una exposición: el horario que vale (el suyo o, sin él, el de su lugar; `horarioEfectivo`). Vacío es «Horario por confirmar»; sin la
   *  propiedad, no se cargó y no se dice nada del horario. */
  horario?: Franja[];
  /** Solo en el marco de un festival: cuántos actos tiene publicados (`registrados`, «Programa registrado: N») y, en el carril «Esta semana», cuántos
   *  caen en la semana. */
  programa?: { registrados: number };
};

export type Grupo<T> = { clave: string; titulo: string; eventos: T[] };

type Ordenable = Pick<EventoAgenda, "id" | "titulo" | "inicio">;
/** Lo que hace falta para ordenar por publicación (Nuevos): lo de agenda y cuándo se publicó. */
type Publicable = Ordenable & Pick<EventoAgenda, "creado_en">;
/** Lo que hace falta para agrupar por día: el orden y la zona del evento. */
type Agrupable = Ordenable & Pick<EventoAgenda, "zona">;

/** Los instantes se comparan como instantes: una hora que llega de la base («…+00:00») y una calculada aquí («…Z») son la misma. */
function porInstante(a: string, b: string): number {
  const x = Date.parse(a);
  const y = Date.parse(b);
  return Number.isFinite(x) && Number.isFinite(y) ? x - y : a.localeCompare(b);
}

/**
 * Orden de agenda: por hora y, a la misma hora, por título (alfabético, como Lugares y Artistas) y por id. La base no
 * garantiza el orden de los empates: sin desempate, dos cargas traían en otro orden los eventos de las 19:00 y la
 * memoria de pantalla reponía el scroll sobre otro evento (bitácora 062).
 */
export function compararEventos(a: Ordenable, b: Ordenable): number {
  return porInstante(a.inicio, b.inicio) || compararNombres(a.titulo, b.titulo) || a.id.localeCompare(b.id);
}

/**
 * Agrupa por día, cada evento en el día de su zona: "Hoy", "Mañana" y luego cada día con eventos, en orden.
 * Dentro de cada día van en orden de agenda. Con `desde` (el primer día de un Cuándo), un evento que empezó antes y sigue
 * en curso va en ese primer día, no en el que ya pasó fuera del rango.
 */
export function agruparPorDia<T extends Agrupable>(eventos: T[], ahora: Date = new Date(), desde = ""): Grupo<T>[] {
  const grupos = new Map<string, Grupo<T>>();
  for (const e of [...eventos].sort(compararEventos)) {
    const propio = diaLocal(new Date(e.inicio), e.zona);
    const clave = propio < desde ? desde : propio;
    let g = grupos.get(clave);
    if (!g) {
      g = { clave, titulo: diaCorto(clave === propio ? e.inicio : (localAIso(`${clave}T12:00`, e.zona) ?? e.inicio), ahora, e.zona), eventos: [] };
      grupos.set(clave, g);
    }
    g.eventos.push(e);
  }
  return [...grupos.values()].sort((a, b) => a.clave.localeCompare(b.clave));
}

/** Lo más atrás que Nuevos mira, aunque la última visita sea más vieja (founder, 2026-09-17: «un tope máximo de 7 días»). */
export const DIAS_NUEVOS = 7;
/** Cuántos eventos enseña la pestaña Nuevos: es un resumen de lo último, no una segunda agenda (founder, 2026-09-18). */
export const LIMITE_NUEVOS = 20;

/**
 * Desde cuándo cuenta como nuevo: lo publicado desde la última vez que se miró Nuevos, con el tope de `DIAS_NUEVOS` (founder, 2026-09-17:
 * «mostrar nuevos desde la ultima vez que entraste, pero con un tome máximo de 7 días»). Sin marca, ilegible, o en el futuro porque el
 * teléfono tiene el reloj mal puesto, vale el tope: así un dato roto nunca deja la pestaña vacía.
 */
export function corteNuevos(ultimaVisita: string | number | null | undefined, ahora: Date = new Date()): number {
  const tope = ahora.getTime() - DIAS_NUEVOS * 86400000;
  const visita = ultimaVisita == null || ultimaVisita === "" ? NaN : typeof ultimaVisita === "number" ? ultimaVisita : new Date(ultimaVisita).getTime();
  if (!Number.isFinite(visita) || visita > ahora.getTime()) return tope;
  return Math.max(tope, visita);
}

/** Lo último publicado primero y, a igual publicación, en orden de agenda: dos cargas no lo traen distinto (bitácora 062). */
const porPublicacion = (a: Publicable, b: Publicable) => b.creado_en.localeCompare(a.creado_en) || compararEventos(a, b);

/**
 * Lo nuevo: lo publicado desde `corte` (`corteNuevos`), lo más reciente primero. Es la única definición de «nuevo»: la pestaña Nuevos de
 * Agenda y el carril «Nuevos eventos» de Inicio parten de aquí.
 */
export function eventosNuevos<T extends Publicable>(eventos: T[], corte: number): T[] {
  return eventos.filter((e) => new Date(e.creado_en).getTime() >= corte).toSorted(porPublicacion);
}

/** La zona del teléfono, que es la que decide si algo se publicó «hoy» o «ayer» para quien mira. */
function zonaDelEntorno(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ZONA_INICIAL;
  } catch {
    return ZONA_INICIAL;
  }
}

/**
 * El título del grupo según cuándo se publicó, contado en la zona de quien mira (no en la de la ciudad ni en la del evento): el rótulo
 * habla de cuándo lo viste tú. Son tres y con el tope de 7 días no puede haber un cuarto. El primero no lleva fecha porque no siempre es
 * de hoy: quien vuelve tras tres días ve arriba lo de anteayer (founder, 2026-09-17: «Lo mas nuevo, Publicado ayer, etc»).
 */
export function tituloPublicacion(creadoEn: string, ahora: Date = new Date(), zona: string = zonaDelEntorno()): string {
  const hoy = diaLocal(ahora, zona);
  const dia = diaLocal(new Date(creadoEn), zona);
  // Con el reloj del teléfono atrasado algo puede venir «del futuro»: es lo más reciente, así que va con lo de hoy.
  if (dia >= hoy) return "Lo más nuevo";
  if (dia === diaLocal(new Date(ahora.getTime() - 86400000), zona)) return "Publicado ayer";
  return "Esta semana";
}

/**
 * Nuevos, agrupado por cuándo se publicó y de lo más reciente hacia atrás (el patrón de `/novedades`, con los rótulos que eligió el founder):
 * como se recorre en ese orden, los grupos salen ya en el suyo. `agruparPorDia` no sirve aquí: agrupa y ordena por el día del evento, que es
 * justo el eje que esta pestaña no usa.
 */
export function agruparPorPublicacion<T extends Publicable>(eventos: T[], ahora: Date = new Date(), zona: string = zonaDelEntorno()): Grupo<T>[] {
  const grupos = new Map<string, Grupo<T>>();
  for (const e of eventos.toSorted(porPublicacion)) {
    const titulo = tituloPublicacion(e.creado_en, ahora, zona);
    let g = grupos.get(titulo);
    if (!g) {
      g = { clave: titulo, titulo, eventos: [] };
      grupos.set(titulo, g);
    }
    g.eventos.push(e);
  }
  return [...grupos.values()];
}

/** "a 600 m" · "a 2.4 km" · "a 12 km". */
export function textoDistancia(km: number): string {
  if (km < 1) return `a ${Math.max(50, Math.round(km * 1000 / 50) * 50)} m`;
  return `a ${km < 10 ? km.toFixed(1).replace(".0", "") : Math.round(km)} km`;
}

/** Cuánto cuesta (la hoja Filtros): las tres clases de `claseDeCosto`, que juntas cubren todos los eventos. */
export type Cuanto = ClaseDeCosto;
export const CUANTOS: { clave: Cuanto; etiqueta: string }[] = [
  { clave: "gratis", etiqueta: "Gratis" },
  { clave: "cooperacion", etiqueta: "Cooperación" },
  { clave: "costo", etiqueta: "Con costo" },
];
const cuesta = (e: Pick<EventoAgenda, "precio">, cuanto: readonly Cuanto[] = []) => cuanto.length === 0 || cuanto.includes(claseDeCosto(e.precio));

/**
 * Lo que la persona puso en la fila de contexto de Agenda (y de Inicio): Cuándo, Cuánto, si solo lo que sigue y «Qué» (OL-322: eventos,
 * exposiciones, talleres o festivales; sin él, o «todo», lo de siempre).
 */
export type FiltrosAgenda = { cuando: Cuando | null; cuanto: Cuanto[]; siguiendo: boolean; que?: Que };
/** Los valores que acepta `?filtro=` en Agenda (hoy uno: solo lo que sigue); lo demás se ignora. */
export const FILTROS_DE_URL = ["siguiendo"] as const;
export const SIN_FILTROS: FiltrosAgenda = { cuando: null, cuanto: [], siguiendo: false };

/** El «Qué» puesto, «todo» si no hay. */
export const queDeFiltros = (f: Pick<FiltrosAgenda, "que">): Que => f.que ?? "todo";

/** Cuántos filtros de la hoja Filtros hay puestos (Cuándo no cuenta: tiene su propio chip). */
export const filtrosPuestos = (f: FiltrosAgenda) => f.cuanto.length + (f.siguiendo ? 1 : 0) + (queDeFiltros(f) === "todo" ? 0 : 1);

/** ¿Hay algo puesto en la fila de contexto, Cuándo incluido? Decide qué vacío se enseña y si mirar Nuevos cuenta como haberlo visto todo. */
export const conFiltros = (f: FiltrosAgenda) => !!f.cuando || filtrosPuestos(f) > 0;

/** «Solo lo que sigo» existe solo con sesión: sin ella, un valor que llegue en la URL o en la memoria de pantalla no cuenta y la lista lo enseña todo. */
export const sinSeguirSinSesion = (f: FiltrosAgenda, conSesion: boolean): FiltrosAgenda => (conSesion || !f.siguiendo ? f : { ...f, siguiendo: false });

/**
 * A Agenda con esos filtros, y en su pestaña Nuevos si se pide (`?ver=nuevos`: sin el parámetro, Todos): la URL es su estado inicial
 * (después Agenda lleva los filtros en el teléfono, sin apilar historial; la pestaña sí se queda en la URL).
 */
export function hrefAgenda(f: FiltrosAgenda, ciudad?: string | null, nuevos = false): string {
  const p = new URLSearchParams();
  if (ciudad) p.set("ciudad", ciudad);
  if (nuevos) p.set("ver", "nuevos");
  if (f.cuando) {
    p.set("desde", f.cuando.desde);
    if (f.cuando.hasta !== f.cuando.desde) p.set("hasta", f.cuando.hasta);
  }
  if (f.cuanto.length > 0) p.set("cuanto", f.cuanto.join(","));
  if (f.siguiendo) p.set("filtro", FILTROS_DE_URL[0]);
  if (queDeFiltros(f) !== "todo") p.set("que", queDeFiltros(f));
  const consulta = p.toString();
  return consulta ? `/agenda?${consulta}` : "/agenda";
}

/** Los filtros que guardó la memoria de pantalla, sin fiarse de su forma: una versión anterior de la pantalla guardaba otra. */
export function filtrosRecordados(f: Partial<FiltrosAgenda> | undefined): FiltrosAgenda {
  return ponerQue({ cuando: cuandoDeUrl(f?.cuando?.desde, f?.cuando?.hasta), cuanto: CUANTOS.map((c) => c.clave).filter((c) => f?.cuanto?.includes(c)), siguiendo: f?.siguiendo === true }, f?.que);
}

/** Los filtros que llegan en la URL de Agenda; lo que no se reconoce (un enlace viejo, `?filtro=cercanos`) se ignora. */
export function filtrosDeUrl(p: { desde?: string; hasta?: string; cuanto?: string; filtro?: string; que?: string }): FiltrosAgenda {
  const cuantos = (p.cuanto ?? "").split(",");
  return ponerQue({ cuando: cuandoDeUrl(p.desde, p.hasta), cuanto: CUANTOS.map((c) => c.clave).filter((c) => cuantos.includes(c)), siguiendo: p.filtro === FILTROS_DE_URL[0] }, p.que);
}

/** Los filtros con ese «Qué» (lo que no se reconoce es «todo»): con «todo», sin la propiedad, así los filtros de siempre quedan como estaban. */
export function ponerQue(f: FiltrosAgenda, que: unknown): FiltrosAgenda {
  const elegido = queDe(que);
  const resto: FiltrosAgenda = { cuando: f.cuando, cuanto: f.cuanto, siguiendo: f.siguiendo };
  return elegido === "todo" ? resto : { ...resto, que: elegido };
}

/** Lo que decide qué eventos entran a la lista de Agenda (y a «Tus favoritos» de Inicio). */
export type ContextoFiltro = {
  /** Solo lo que sigue la persona: los eventos de sus lugares y los de los artistas que sigue. */
  siguiendo: boolean;
  /** Lugares que sigue; null si no hay sesión. */
  seguidos: string[] | null;
  /** Eventos en los que se presenta un artista que sigue (Artistas, decisión 10). */
  eventosSeguidos?: string[];
  /** Los días elegidos con Cuándo, o null: un evento cuenta en cada día que ocupa, en la zona del propio evento. */
  cuando: Cuando | null;
  /** Las clases de costo elegidas (gratis, cooperación, con costo); vacío o sin él, cualquier precio. */
  cuanto?: readonly Cuanto[];
  /** La pestaña Nuevos: solo lo publicado desde ese instante (`corteNuevos`), lo más reciente primero y con el tope de `LIMITE_NUEVOS`; sin él, toda la agenda. */
  nuevosDesde?: number;
};

/**
 * Aplica los filtros de Agenda. La lista va en orden de agenda sin importar cómo llegue de la base (con un día elegido se
 * pinta tal cual); en Nuevos (`nuevosDesde`), en orden de publicación: los filtros valen igual en las dos pestañas y el tope se aplica
 * después de ellos.
 */
export function filtrarAgenda<T extends EventoAgenda>(eventos: T[], ctx: ContextoFiltro): T[] {
  // Un evento de varios días cuenta en cada día que ocupa (OL-218, `ocupaRango`): sin esto, el calendario podía marcar
  // un día como "disponible" (por un evento que lo ocupa sin empezar ahí) y, al elegirlo, la lista salía vacía —
  // confirmado con un evento de ejemplo del 6 al 8 de octubre, bitácora 247.
  let lista = eventos.filter((e) => (!ctx.cuando || ocupaRango(e, ctx.cuando.desde, ctx.cuando.hasta)) && cuesta(e, ctx.cuanto)).sort(compararEventos);
  if (ctx.siguiendo) lista = lista.filter(loSigue(ctx));
  // En Nuevos un festival nuevo sale como su marco y no con sus actos (OL-322): se pliegan después de saber qué es nuevo y antes del tope.
  return ctx.nuevosDesde === undefined ? lista : plegarActos(eventosNuevos(lista, ctx.nuevosDesde)).slice(0, LIMITE_NUEVOS);
}

/** «Solo lo que sigo»: los eventos de sus lugares y aquellos en los que se presenta un artista que sigue. */
function loSigue(ctx: Pick<ContextoFiltro, "seguidos" | "eventosSeguidos">) {
  const lugares = new Set(ctx.seguidos ?? []);
  const porArtista = new Set(ctx.eventosSeguidos ?? []);
  return (e: Pick<EventoAgenda, "id" | "lugar_id">) => (!!e.lugar_id && lugares.has(e.lugar_id)) || porArtista.has(e.id);
}

/** Un evento y los nombres de los artistas que se presentan: el buscador único (`app/accionesBuscar.ts`) busca también por ellos. */
export type EventoBuscable = EventoAgenda & { artistas: string[] };

/**
 * Buscador de los eventos (pedido del founder, 2026-09-15; hoy lo usa el buscador único, `app/accionesBuscar.ts`): por título,
 * sitio o artista, escrito a medias, sin importar acentos ni mayúsculas; cada palabra escrita tiene que estar («jazz museo» halla
 * el jazz del museo).
 */
export function buscarEventos<T extends Pick<EventoBuscable, "titulo" | "lugar" | "sitio_texto" | "sitio_direccion" | "sitio_reservado" | "artistas" | "sedes">>(eventos: T[], busqueda: string): T[] {
  const palabras = normalizarNombre(busqueda).split(" ").filter(Boolean);
  if (palabras.length === 0) return eventos;
  return eventos.filter((e) => {
    // Un festival se halla por cualquiera de sus sedes (OL-339), no por «Varias sedes».
    const sitio = e.sedes?.length ? e.sedes.map((s) => s.nombre).join(" ") : nombreSitio(e);
    const texto = normalizarNombre(`${e.titulo} ${sitio} ${e.artistas.join(" ")}`);
    return palabras.every((p) => texto.includes(p));
  });
}

/**
 * Lo que Agenda lista con esos filtros, en orden de agenda (o, en Nuevos, `nuevosDesde`, lo último publicado primero). La lista y el número de
 * cada botón «Ver N eventos» de las hojas de Cuándo y Filtros salen de aquí: lo que dice el botón es lo que se ve al tocarlo, en la pestaña
 * que se está viendo.
 *
 * Todos lista cada día en que pasa algo (OL-320, `lib/ocurrencias`): un evento con horario por día, o de varios días, sale en cada uno, con su
 * hora de ese día, y el que ya pasó no sale; el número de «Ver N eventos» cuenta esos renglones. Nuevos, en cambio, lista eventos (cada uno
 * una vez, por cuándo se publicó), aunque el filtro de Cuándo sí mira los días que ocupa cada uno.
 *
 * Por clase (OL-322): en Todos, una exposición no es un renglón (está en «Para visitar»: `paraVisitarEnAgenda` y `exposicionesEnAgenda`) y el
 * marco de un festival tampoco (es la cabecera del bloque de sus actos, `componerDia`); las sesiones de un taller y los actos sí. En Nuevos, la
 * exposición y el marco son un evento más y los actos de un festival nuevo se pliegan en él. «Qué» elige la clase (`entraEnQue`).
 */
export function listarAgenda(agenda: Pick<Agenda, "eventos" | "seguidos" | "eventosSeguidos">, filtros: FiltrosAgenda, nuevosDesde?: number, ahora: Date = new Date()): EventoAgenda[] {
  const que = queDeFiltros(filtros);
  const eventos = (nuevosDesde === undefined ? ocurrenciasDeLista(agenda.eventos, ahora) : agenda.eventos).filter((e) => entraEnQue(e, que));
  return filtrarAgenda(eventos, { siguiendo: filtros.siguiendo, seguidos: agenda.seguidos, eventosSeguidos: agenda.eventosSeguidos, cuando: filtros.cuando, cuanto: filtros.cuanto, nuevosDesde });
}

type DatosAgenda = Pick<Agenda, "eventos" | "seguidos" | "eventosSeguidos">;

/** Las exposiciones que dejan pasar Cuánto y «Solo lo que sigo» (Cuándo y el horario los mira quien llama). */
function exposicionesFiltradas(agenda: DatosAgenda, filtros: FiltrosAgenda): EventoAgenda[] {
  const sigue = loSigue(agenda);
  return agenda.eventos.filter((e) => esExposicion(e) && cuesta(e, filtros.cuanto) && (!filtros.siguiendo || sigue(e)));
}

/**
 * «Para visitar hoy» (OL-322; doc 55 §3): en Todos y con «Qué» en Todo, las exposiciones abiertas un día según su horario, la que cierra antes
 * primero. El día es el primero de lo que se ve: hoy, o el primero que se eligió con Cuándo. Sin horario no entran (no se promete «visitable
 * hoy»). Null en Nuevos o con otro «Qué»: ahí no hay sección.
 */
export function paraVisitarEnAgenda(agenda: DatosAgenda, filtros: FiltrosAgenda, hoy: string, nuevosDesde?: number): { dia: string; exposiciones: EventoAgenda[] } | null {
  if (nuevosDesde !== undefined || queDeFiltros(filtros) !== "todo") return null;
  const dia = filtros.cuando && filtros.cuando.desde > hoy ? filtros.cuando.desde : hoy;
  return { dia, exposiciones: abiertasEseDia(exposicionesFiltradas(agenda, filtros), dia) };
}

/**
 * Con «Qué» en Exposiciones, en Todos: «Para visitar», todas las que no han cerrado (con Cuándo, las que se pueden visitar algún día de esas
 * fechas), con horario o sin él, la que cierra antes primero. Las que ya cerraron las quita la base (`termina`).
 */
export function exposicionesEnAgenda(agenda: DatosAgenda, filtros: FiltrosAgenda): EventoAgenda[] {
  return exposicionesFiltradas(agenda, filtros)
    .filter((e) => !filtros.cuando || visitaEnRango(e, filtros.cuando.desde, filtros.cuando.hasta))
    .toSorted(porCierre);
}

/**
 * Lo que Agenda enseña con esos filtros, contado (el botón «Ver N» de cada hoja): los renglones (las sesiones y los actos cuentan, el marco no) y,
 * aparte, las exposiciones para visitar (doc 55 §3: «y 4 para visitar»). Con «Qué» en Exposiciones, en Todos, todo son exposiciones.
 */
export function contarAgenda(agenda: DatosAgenda, filtros: FiltrosAgenda, hoy: string, nuevosDesde?: number, ahora: Date = new Date()): { renglones: number; visitar: number } {
  if (nuevosDesde === undefined && queDeFiltros(filtros) === "exposiciones") return { renglones: 0, visitar: exposicionesEnAgenda(agenda, filtros).length };
  return { renglones: listarAgenda(agenda, filtros, nuevosDesde, ahora).length, visitar: paraVisitarEnAgenda(agenda, filtros, hoy, nuevosDesde)?.exposiciones.length ?? 0 };
}

const nEventos = (n: number) => `${n} ${n === 1 ? "evento" : "eventos"}`;

/**
 * Lo que dice el botón de una hoja: «Ver 14 eventos», «Ver 14 eventos y 3 para visitar», «Ver 3 para visitar», «Ver 2 exposiciones» o «Sin
 * eventos»; sin saber todavía cuántos, «Ver eventos». Las sesiones y los actos son eventos (doc 55 §3: «12 eventos esta semana»).
 */
export function textoVer(cuenta: { renglones: number; visitar: number } | null, que: Que = "todo"): string {
  if (!cuenta) return "Ver eventos";
  const { renglones, visitar } = cuenta;
  if (que === "exposiciones") {
    const n = renglones + visitar;
    return n === 0 ? "Sin exposiciones" : `Ver ${n} ${n === 1 ? "exposición" : "exposiciones"}`;
  }
  if (renglones === 0) return visitar === 0 ? "Sin eventos" : `Ver ${visitar} para visitar`;
  return visitar === 0 ? `Ver ${nEventos(renglones)}` : `Ver ${nEventos(renglones)} y ${visitar} para visitar`;
}
