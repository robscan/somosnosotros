/**
 * Lo que ya pasó en la ficha de un artista («Trayectoria») y en la de un lugar («Historial»): OL-390, pieza 1 del historial, prototipo firmado
 * `docs/rediseno/prototipos/historial-propuestas.html` (OL-389, bitácora 420: «H1 plegado · H2 propio · H3 por mes · H4 · H5 · K1 todos · Q1
 * fotos»). Todo sale de `eventos`, `eventos_artistas`, `lugares`, `artistas` y `asistencias`, sin tablas nuevas. Aquí solo la lógica que no lee
 * la base: los textos, el orden y la agrupación (la lectura está en `cargarHistorial.ts`). Lo que ya pasó cuenta como realizado salvo que quien
 * lo gestiona lo marque «se canceló» (OL-391, pieza 2): se queda en la lista, tachado, y no cuenta en las cifras, en la fila de fotos ni en
 * «Lugares» (ejercicio C1 del prototipo).
 */
import { hrefArtista } from "./artistas";
import { esDeVariosDias, horaCorta, ZONA_INICIAL, zonaSegura } from "./fechas";
import { hrefLugar } from "./lugares";

/** Cuántos eventos pasados se leen como mucho por ficha: de sobra para hoy (171 en toda la base el 12 de oct). Con el tope lleno, «200+ fechas». */
export const TOPE_HISTORIAL = 200;

/** Un artista de un evento pasado: lo que piden la fila de fotos y la línea «con …». */
export type ArtistaDelEvento = { id: string; slug: string | null; nombre: string; foto: string | null };
/** El lugar con ficha de un evento pasado. */
export type LugarDelEvento = { id: string; slug: string | null; nombre: string; portada: string | null };

/** Un evento que ya pasó, listo para su renglón: su sitio, su festival, sus artistas y cuántos dijeron «Voy». */
export type EventoPasado = {
  id: string;
  slug: string | null;
  titulo: string;
  inicio: string;
  fin: string | null;
  zona: string;
  imagen: string | null;
  lugar_id: string | null;
  sitio_texto: string | null;
  sitio_direccion: string | null;
  sitio_reservado: boolean;
  lugar: LugarDelEvento | null;
  /** El título del festival del que es parte (un acto de su programa), si lo es. */
  festival: string | null;
  /** Sus artistas, en su orden. */
  artistas: ArtistaDelEvento[];
  /** Cuántos dijeron «Voy». */
  van: number;
  /** «Se canceló» (OL-391): se queda en su mes, tachado, y no cuenta. */
  cancelado: boolean;
  /** Cómo ocurre (`eventos.clase`: puntual, exposición, taller, festival): el informe del lugar (OL-396) aparta el festival marco y nombra los talleres. */
  clase?: string | null;
  /** El id del festival del que es parte (con su título en `festival`): el informe del lugar sabe así qué festival tiene actos en el periodo. */
  festivalId?: string | null;
};

/** Lo pasado de una ficha: los eventos (lo más reciente primero) y si se llegó al tope de la lectura. */
export type Historial = { eventos: EventoPasado[]; lleno: boolean };

/** Un lugar donde se presentó un artista, o un artista que pasó por un lugar: su foto redonda, su nombre y cuántas veces. */
export type Presencia = { id: string; href: string; nombre: string; foto: string | null; veces: number };

/** «1 fecha», «3 fechas». */
export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** La cuenta con el tope: «200+» si la lectura se llenó (puede haber más), si no el número. */
const cuenta = (n: number, lleno: boolean, uno: string, varios: string) => (lleno ? `${n}+ ${varios}` : plural(n, uno, varios));

/**
 * Lo que ocurrió y lo cancelado, juntos: «2 fechas · 1 cancelado» (C1). Los cancelados solo se nombran si hay alguno; si todo lo pasado se
 * canceló, solo ellos («1 cancelado»), sin un «0 fechas».
 */
function cuentas(realizados: number, cancelados: number, lleno: boolean, uno: string, varios: string): (string | null)[] {
  return [realizados > 0 || cancelados === 0 ? cuenta(realizados, lleno, uno, varios) : null, cancelados > 0 ? plural(cancelados, "cancelado", "cancelados") : null];
}

/** El renglón-cabecera de la trayectoria de un artista: «3 fechas · 1 cancelado · 2 lugares» (sin lugares con ficha, sin ellos). */
export function cabeceraTrayectoria(fechas: number, lugares: number, lleno = false, cancelados = 0): string {
  return [...cuentas(fechas, cancelados, lleno, "fecha", "fechas"), lugares > 0 ? plural(lugares, "lugar", "lugares") : null].filter(Boolean).join(" · ");
}

/** El renglón-cabecera del historial de un lugar: «13 eventos · 1 cancelado · 11 artistas» (sin artistas, sin ellos). */
export function cabeceraHistorial(eventos: number, artistas: number, lleno = false, cancelados = 0): string {
  return [...cuentas(eventos, cancelados, lleno, "evento", "eventos"), artistas > 0 ? plural(artistas, "artista", "artistas") : null].filter(Boolean).join(" · ");
}

/** Lo que sí ocurrió (lo que cuenta): todo lo pasado menos lo que se marcó «se canceló». */
export function realizados<T extends Pick<EventoPasado, "cancelado">>(eventos: readonly T[]): T[] {
  return eventos.filter((e) => !e.cancelado);
}

/** Los nombres de una lista corta: «A», «A y B», «A, B y 2 más». */
export function listaCon(nombres: readonly string[]): string {
  if (nombres.length <= 2) return nombres.join(" y ");
  return `${nombres.slice(0, 2).join(", ")} y ${nombres.length - 2} más`;
}

/** «2 fueron», «1 fue»; null si nadie dijo «Voy» (el renglón lleva su chevrón). */
export function textoFueron(van: number): string | null {
  return van > 0 ? `${van} ${van === 1 ? "fue" : "fueron"}` : null;
}

/** «jue 8»: el día de la semana y el del mes en la zona del evento (el mes ya lo dice la cabecera del grupo). */
function diaSemana(iso: string, zona: string): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: zonaSegura(zona), weekday: "short", day: "numeric" }).format(new Date(iso)).replace(/[.,]/g, "");
}

/** La línea de cuándo de un renglón pasado: «jue 8 · 7:00 pm»; si duró varios días, «del mar 6 al mié 7» (una exposición cuenta por su inicio). */
export function cuandoPasado(e: Pick<EventoPasado, "inicio" | "fin" | "zona">): string {
  const zona = e.zona || ZONA_INICIAL;
  if (e.fin && esDeVariosDias(e.inicio, e.fin, zona)) return `del ${diaSemana(e.inicio, zona)} al ${diaSemana(e.fin, zona)}`;
  return `${diaSemana(e.inicio, zona)} · ${horaCorta(e.inicio, zona)}`;
}

/** Un grupo de la lista: el mes («Octubre de 2026») y sus eventos. */
export type GrupoMes = { clave: string; titulo: string; eventos: EventoPasado[] };

/**
 * Lo pasado por mes, lo más reciente primero (H3 «por mes»: en un año serán meses y después años, y el mes ya dice el año). El mes es el del
 * inicio en la zona del evento; dentro del mes, del más reciente al más viejo.
 */
export function agruparPorMes(eventos: readonly EventoPasado[]): GrupoMes[] {
  const grupos = new Map<string, GrupoMes>();
  for (const e of [...eventos].sort((a, b) => Date.parse(b.inicio) - Date.parse(a.inicio) || a.id.localeCompare(b.id))) {
    const zona = zonaSegura(e.zona || ZONA_INICIAL);
    const fecha = new Date(e.inicio);
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit" }).formatToParts(fecha).map((x) => [x.type, x.value]));
    const clave = `${p.year}-${p.month}`;
    let g = grupos.get(clave);
    if (!g) {
      const mes = new Intl.DateTimeFormat("es-MX", { timeZone: zona, month: "long", year: "numeric" }).format(fecha);
      g = { clave, titulo: mes.charAt(0).toUpperCase() + mes.slice(1), eventos: [] };
      grupos.set(clave, g);
    }
    g.eventos.push(e);
  }
  return [...grupos.values()].sort((a, b) => b.clave.localeCompare(a.clave));
}

/** Por cuántas veces y luego por nombre (como se ordena en español). */
const porVeces = (a: Presencia, b: Presencia) => b.veces - a.veces || a.nombre.localeCompare(b.nombre, "es");

/**
 * «Se ha presentado en»: los lugares con ficha de sus fechas pasadas, con cuántas veces. Las fechas en un sitio sin ficha no entran, ni las que
 * se cancelaron.
 */
export function lugaresDeTrayectoria(eventos: readonly EventoPasado[]): Presencia[] {
  const porId = new Map<string, Presencia>();
  for (const e of realizados(eventos)) {
    if (!e.lugar) continue;
    const p = porId.get(e.lugar.id) ?? { id: e.lugar.id, href: hrefLugar({ id: e.lugar.id, slug: e.lugar.slug }), nombre: e.lugar.nombre, foto: e.lugar.portada, veces: 0 };
    p.veces++;
    porId.set(e.lugar.id, p);
  }
  return [...porId.values()].sort(porVeces);
}

/** «Han pasado por aquí»: los artistas de los eventos pasados de un lugar, con cuántas veces (lo cancelado no cuenta: no pasaron). */
export function artistasDelHistorial(eventos: readonly EventoPasado[]): Presencia[] {
  const porId = new Map<string, Presencia>();
  for (const e of realizados(eventos)) {
    for (const a of e.artistas) {
      const p = porId.get(a.id) ?? { id: a.id, href: hrefArtista({ id: a.id, slug: a.slug }), nombre: a.nombre, foto: a.foto, veces: 0 };
      p.veces++;
      porId.set(a.id, p);
    }
  }
  return [...porId.values()].sort(porVeces);
}

/** Los otros artistas de un evento, para la línea «con …» de la trayectoria de uno de ellos (H5). */
export function otrosArtistas(e: Pick<EventoPasado, "artistas">, artistaId: string): string[] {
  return e.artistas.filter((a) => a.id !== artistaId).map((a) => a.nombre);
}

/**
 * K1 «todos»: el número «Lugares» del artista cuenta los lugares con ficha de todas sus fechas visibles, pasadas y por venir. Lo pasado llega ya
 * sin lo cancelado (`realizados`).
 */
export function contarLugares(...listas: readonly (readonly { lugar_id: string | null }[])[]): number {
  return new Set(listas.flat().map((e) => e.lugar_id).filter(Boolean)).size;
}

/**
 * A dónde baja el número «Lugares» al tocarlo: con fechas próximas, a «Próximas fechas» (como hoy); sin ellas pero con lugares en lo pasado,
 * a la trayectoria (que se abre); sin lugares, a ninguna parte.
 */
export function saltoLugares(lugares: number, proximas: number, pasadas: number): "fechas" | "trayectoria" | undefined {
  if (proximas > 0) return "fechas";
  if (lugares > 0 && pasadas > 0) return "trayectoria";
  return undefined;
}
