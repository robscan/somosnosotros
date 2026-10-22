/**
 * «Tu año» como imagen para compartir (OL-394, pieza 3 de 5 del historial): lo que firmó el founder el 12 de octubre por la noche en el
 * prototipo `docs/rediseno/prototipos/tu-anio-propuestas.html` (OL-392, bitácora 423), tal como la segunda propuesta: «P año · F publicación
 * 4:5 · C calma · E crema · D cifras y lo más · N nombre y foto · Q solo quien gestiona · O en la sección». Aquí solo lo que no lee la base: qué
 * eventos entran (los del año en curso), qué cifras dice la imagen por sujeto, la línea de «lo más» con sus caídas y el «del 17 sep al 12 oct».
 * La lectura está en `cargarTuAnio.ts`; el dibujo, en `carteles/plantillas/tuAnio.tsx`. Las cuentas de lugares y artistas son las del historial
 * de las fichas (`historialFichas.ts`, OL-390): no se agrupa dos veces.
 */
import { agruparPorMes, artistasDelHistorial, lugaresDeTrayectoria, plural, type EventoPasado, type Presencia, realizados } from "./historialFichas";
import { ZONA_INICIAL, zonaSegura } from "./fechas";
import { hitosDelAnio, resumenHitos, TITULO_HITOS, type Hito } from "./hitos";
import { respaldoDe } from "./portadasSistema";
import { MARCA } from "./marca";

/** De quién es el año: la persona (sus «Voy» que ya pasaron), un artista (sus fechas) o un lugar (sus eventos). */
export type SujetoTuAnio = "persona" | "artista" | "lugar";
export const SUJETOS_TU_ANIO: readonly SujetoTuAnio[] = ["persona", "artista", "lugar"];
export const esSujetoTuAnio = (v: unknown): v is SujetoTuAnio => typeof v === "string" && (SUJETOS_TU_ANIO as readonly string[]).includes(v);

/** El violeta primario de la app (`--primario`): el color de la persona, que no tiene cartel ni portada de donde sacarlo. */
export const COLOR_PERSONA = "#6d34c8";

/** Lo que dibuja la imagen, ya decidido: cada texto tal cual se pinta. */
export type ResumenTuAnio = {
  quien: { nombre: string; foto: string | null; tipo: SujetoTuAnio };
  /** «Tu 2026» y «del 17 sep al 12 oct». */
  periodo: { titulo: string; desde: string };
  /** El número grande y su frase («36» · «eventos a los que fuiste»). */
  protagonista: { n: number; frase: string };
  /** Los dos chicos de abajo, sin los que valen 0 («19» · «lugares»). */
  secundarios: { n: number; palabra: string }[];
  /** Una sola línea: «Donde más fuiste: Museo de Arte Contemporáneo (MAC) · 5 veces»; null si no hay nada que destacar. */
  mas: { que: string; quien: string; cuantas: string } | null;
  /**
   * Solo el artista (OL-445): sus hitos del año en una frase, «2 premios · 1 disco · 5 presentaciones» (lo aceptado del showcase con fecha de
   * este año); null o ausente si no hay.
   */
  logros?: string | null;
  /** El color de origen de la figura (la de las portadas del sistema). */
  color: string;
};

/** El año (YYYY) de un instante en una zona. */
export function anioDe(iso: string | Date, zona: string = ZONA_INICIAL): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zonaSegura(zona), year: "numeric" }).format(typeof iso === "string" ? new Date(iso) : iso);
}

/** «17 sep»: el día y el mes corto, en la zona. */
export function diaMes(iso: string | Date, zona: string = ZONA_INICIAL): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: zonaSegura(zona), day: "numeric", month: "short" }).format(typeof iso === "string" ? new Date(iso) : iso).replace(/[.,]/g, "");
}

/** P año: lo que empezó este año (en la zona de la ficha), del más viejo al más reciente. Lo pasado ya viene filtrado por quien lee. */
export function delAnio<T extends Pick<EventoPasado, "inicio">>(eventos: readonly T[], ahora: Date, zona: string = ZONA_INICIAL): T[] {
  const anio = anioDe(ahora, zona);
  return eventos.filter((e) => anioDe(e.inicio, zona) === anio).sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));
}

/** La zona del año: la de la ficha si la guarda (el lugar), si no la del evento más reciente, si no la de San Luis. */
export function zonaDelAnio(eventos: readonly Pick<EventoPasado, "inicio" | "zona">[], propia?: string | null): string {
  return propia || [...eventos].sort((a, b) => Date.parse(b.inicio) - Date.parse(a.inicio))[0]?.zona || ZONA_INICIAL;
}

/**
 * ¿Hay año que enseñar? Lo que decide si sale el botón «Tu año»: al menos un evento pasado de este año (en la zona del año). Lo pasado de antes
 * de enero no hace imagen: diría «0».
 */
export const hayTuAnio = (eventos: readonly Pick<EventoPasado, "inicio" | "zona">[], ahora: Date = new Date(), propia?: string | null): boolean => delAnio(eventos, ahora, zonaDelAnio(eventos, propia)).length > 0;

/** «del 17 sep al 12 oct»: del primer día del año con algo al día de hoy; sin nada, «todavía sin nada». */
export function textoDesde(eventos: readonly Pick<EventoPasado, "inicio">[], ahora: Date, zona: string = ZONA_INICIAL): string {
  const primero = [...eventos].sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))[0];
  return primero ? `del ${diaMes(primero.inicio, zona)} al ${diaMes(ahora, zona)}` : "todavía sin nada";
}

/** El número como se pinta: «36», «120», «1000»; desde 10 000 con separador («12,500»). */
export const cifra = (n: number): string => (n < 10_000 ? String(n) : new Intl.NumberFormat("es-MX").format(n));

const veces = (n: number) => `${n} veces`;

/** El primero de una lista por veces, solo si repite (una vez no es «lo más»). */
const elQueRepite = (lista: readonly Presencia[]): Presencia | null => (lista[0] && lista[0].veces > 1 ? lista[0] : null);

/** El mes con más eventos, si hay más de un mes y el ganador tiene más de uno (a empate, el más reciente). */
function mesMasMovido(eventos: readonly EventoPasado[], uno: string, varios: string): ResumenTuAnio["mas"] {
  const meses = agruparPorMes(eventos);
  if (meses.length < 2) return null;
  const mayor = meses.reduce((a, b) => (b.eventos.length > a.eventos.length ? b : a));
  if (mayor.eventos.length < 2) return null;
  // «Octubre de 2026» → «Octubre»: el año ya lo dice el título.
  return { que: "El mes más movido", quien: mayor.titulo.replace(/ de \d{4}$/, ""), cuantas: plural(mayor.eventos.length, uno, varios) };
}

/** Lo que entra para hacer el resumen: quién, sus eventos pasados (todos: aquí se quedan los del año), la hora y la zona. */
export type EntradaTuAnio = {
  tipo: SujetoTuAnio;
  /** El id de la ficha (o del perfil): da el color de respaldo y la composición de la figura. */
  id: string;
  nombre: string;
  foto: string | null;
  eventos: readonly EventoPasado[];
  ahora: Date;
  zona?: string;
  /** El color de la ficha si lo guarda; si no, el de respaldo por id (o el violeta en la persona). */
  color?: string | null;
  /** Los hitos públicos del artista (OL-445); aquí se quedan los de este año. */
  hitos?: readonly Hito[];
};

/**
 * Lo que dice la imagen, por sujeto (`resumen` del prototipo, con C calma y D «cifras y lo más»):
 *  · persona: eventos a los que fue (con «Voy»), lugares con ficha distintos y artistas distintos; «Donde más fuiste» si un lugar repite, si no
 *    «A quien más viste» si un artista repite, si no «El mes más movido»;
 *  · artista: sus fechas, en cuántos lugares y cuántos fueron (los «Voy»); «Donde más tocó», si no «Con quien más», si no el mes;
 *  · lugar: sus eventos, con cuántos artistas y cuántos fueron; «Quien más pasó», si no el mes.
 * Una cifra en 0 no se pinta; sin nada que destacar, no hay línea de «lo más».
 */
export function resumirTuAnio(e: EntradaTuAnio): ResumenTuAnio {
  const zona = e.zona ?? ZONA_INICIAL;
  // Lo marcado «se canceló» (OL-391) no cuenta en «Tu año», como no cuenta en el historial.
  const lista = realizados(delAnio(e.eventos, e.ahora, zona) as EventoPasado[]);
  const lugares = lugaresDeTrayectoria(lista);
  // Los artistas del año; en el de un artista, los otros (con quien compartió fecha), nunca él mismo.
  const artistas = artistasDelHistorial(e.tipo === "artista" ? lista.map((x) => ({ ...x, artistas: x.artistas.filter((a) => a.id !== e.id) })) : lista);
  const fueron = lista.reduce((n, x) => n + (x.van || 0), 0);
  const n = lista.length;
  let protagonista: ResumenTuAnio["protagonista"];
  let secundarios: { n: number; uno: string; varios: string }[];
  let mas: ResumenTuAnio["mas"] = null;
  if (e.tipo === "persona") {
    protagonista = { n, frase: n === 1 ? "evento al que fuiste" : "eventos a los que fuiste" };
    secundarios = [
      { n: lugares.length, uno: "lugar", varios: "lugares" },
      { n: artistas.length, uno: "artista", varios: "artistas" },
    ];
    const lugar = elQueRepite(lugares);
    const artista = elQueRepite(artistas);
    mas = lugar ? { que: "Donde más fuiste", quien: lugar.nombre, cuantas: veces(lugar.veces) } : artista ? { que: "A quien más viste", quien: artista.nombre, cuantas: veces(artista.veces) } : mesMasMovido(lista, "evento", "eventos");
  } else if (e.tipo === "artista") {
    const palabra = n === 1 ? "fecha" : "fechas";
    protagonista = { n, frase: lugares.length ? `${palabra} en ${lugares.length === 1 ? "un lugar" : `${lugares.length} lugares`}` : palabra };
    secundarios = [
      { n: lugares.length, uno: "lugar", varios: "lugares" },
      { n: fueron, uno: "fue", varios: "fueron" },
    ];
    const lugar = elQueRepite(lugares);
    const artista = elQueRepite(artistas);
    mas = lugar ? { que: "Donde más tocó", quien: lugar.nombre, cuantas: veces(lugar.veces) } : artista ? { que: "Con quien más", quien: artista.nombre, cuantas: veces(artista.veces) } : mesMasMovido(lista, "fecha", "fechas");
  } else {
    const palabra = n === 1 ? "evento" : "eventos";
    protagonista = { n, frase: artistas.length ? `${palabra} con ${artistas.length === 1 ? "un artista" : `${artistas.length} artistas`}` : palabra };
    secundarios = [
      { n: artistas.length, uno: "artista", varios: "artistas" },
      { n: fueron, uno: "fue", varios: "fueron" },
    ];
    const artista = elQueRepite(artistas);
    mas = artista ? { que: "Quien más pasó", quien: artista.nombre, cuantas: veces(artista.veces) } : mesMasMovido(lista, "evento", "eventos");
  }
  const logros = e.tipo === "artista" ? resumenHitos(hitosDelAnio(e.hitos ?? [], anioDe(e.ahora, zona)), 3) : null;
  return {
    quien: { nombre: e.nombre, foto: e.foto, tipo: e.tipo },
    periodo: { titulo: `Tu ${anioDe(e.ahora, zona)}`, desde: textoDesde(lista, e.ahora, zona) },
    protagonista,
    secundarios: secundarios.filter((s) => s.n > 0).map((s) => ({ n: s.n, palabra: s.n === 1 ? s.uno : s.varios })),
    mas,
    // Sin hitos del año la clave ni existe: el resumen (y su versión) de quien no los tiene sigue igual que antes.
    ...(logros ? { logros } : {}),
    color: e.color || (e.tipo === "persona" ? COLOR_PERSONA : respaldoDe(e.id)),
  };
}

/** La ceja de arriba, sobre el nombre: «SOMOS NOSOTRXS», «ARTISTA · SOMOS NOSOTRXS», «LUGAR · SOMOS NOSOTRXS» (se pinta en mayúsculas). */
export function cejaDe(tipo: SujetoTuAnio): string {
  return tipo === "persona" ? MARCA : tipo === "artista" ? `Artista · ${MARCA}` : `Lugar · ${MARCA}`;
}

/** La clase cuya figura lleva la imagen (la de las portadas del sistema): taller la persona, festival el artista, exposición el lugar. */
export function claseDeFigura(tipo: SujetoTuAnio): "taller" | "festival" | "exposicion" {
  return tipo === "persona" ? "taller" : tipo === "artista" ? "festival" : "exposicion";
}

/** La dirección de la imagen (`/api/tu-anio`): `ancho` 360, 720 o 1080; `descarga` la entrega como archivo. */
export function hrefTuAnio(p: { que: SujetoTuAnio; id?: string | null; ancho?: number; descarga?: boolean; v?: string }): string {
  const q = new URLSearchParams({ que: p.que });
  if (p.que !== "persona" && p.id) q.set("id", p.id);
  if (p.ancho) q.set("ancho", String(p.ancho));
  if (p.descarga) q.set("descarga", "1");
  if (p.v) q.set("v", p.v);
  return `/api/tu-anio?${q.toString()}`;
}

/** Una versión corta del resumen (FNV-1a): si cambia lo que dice la imagen, cambia su dirección y la caché del teléfono no da la de ayer. */
export function versionTuAnio(resumen: ResumenTuAnio): string {
  let h = 0x811c9dc5;
  for (const letra of JSON.stringify(resumen)) h = Math.imul(h ^ letra.charCodeAt(0), 0x01000193) >>> 0;
  return h.toString(36);
}

/** Lo que lee el lector de pantalla de la imagen: lo mismo que dice, en una frase. */
export function textoAlternativo(r: ResumenTuAnio): string {
  const partes = [`${r.periodo.titulo} de ${r.quien.nombre}, ${r.periodo.desde}: ${r.protagonista.n} ${r.protagonista.frase}`, ...r.secundarios.map((s) => `${s.n} ${s.palabra}`)];
  if (r.logros) partes.push(`${TITULO_HITOS}: ${r.logros}`);
  if (r.mas) partes.push(`${r.mas.que}: ${r.mas.quien}${r.mas.cuantas ? `, ${r.mas.cuantas}` : ""}`);
  return `${partes.join(". ")}.`;
}

/** La pantalla de vista previa:`/tu-anio` (la persona), `/artistas/<slug>/tu-anio`, `/lugares/<slug>/tu-anio`. */
export function hrefVistaTuAnio(que: SujetoTuAnio, fichaHref?: string): string {
  return que === "persona" || !fichaHref ? "/tu-anio" : `${fichaHref}/tu-anio`;
}

/** El nombre del archivo: «tu-2026-feleal.jpg»; sin slug, «tu-2026.jpg». */
export function nombreTuAnio(anio: string, slug?: string | null): string {
  const base = (slug ?? "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return `tu-${anio}${base ? `-${base}` : ""}.jpg`;
}
