import "server-only";
import { unstable_cache } from "next/cache";
import { clienteAdmin } from "@/lib/supabase/admin";

/**
 * El grafo cultural para Administración (OL-401, bitácora 432; reglas en docs/rediseno/56-grafo-cultural-3d.md de la rama grafo-3d).
 *
 * Lo puro (`construirGrafo`) recibe las filas ya leídas y devuelve el grafo: lugares en su sitio real a escala (1 unidad = 10 m),
 * artistas flotando sobre el lugar donde más tocan, asistentes anónimos debajo (posición INVENTADA: la base no guarda dónde está nadie)
 * y las líneas entre ellos. Lo que sale de aquí viaja al navegador del administrador, así que NUNCA lleva un id, un nombre de persona,
 * una foto ni un enlace al perfil de quien asiste. Todo es determinista: las mismas filas dan el mismo grafo (sin `Math.random`).
 *
 * OL-404 (bitácora 435): el umbral de anonimato baja a 1; «sigue a» pasa a ser línea (persona→artista y persona→lugar, sin días); y los eventos en un sitio
 * sin ficha de lugar se agrupan en un nodo propio (`sitios`) al que se unen sus artistas y sus asistentes, para que ningún acto quede suelto.
 */

// ---------- Lo que se lee ----------
export type FilaLugar = { id: string; nombre: string; tipo: string; lat: number | null; lng: number | null; ciudad: string | null; visible: boolean; privado: boolean };
export type FilaArtista = { id: string; nombre: string; disciplina: string; ciudad: string | null; visible: boolean };
export type FilaEvento = {
  id: string;
  lugar_id: string | null;
  inicio: string;
  termina: string | null;
  visible: boolean;
  borrador: boolean;
  clase: string | null;
  evento_padre_id: string | null;
  sitio_lat: number | null;
  sitio_lng: number | null;
  sitio_texto: string | null;
};
export type FilaEventoArtista = { evento_id: string; artista_id: string };
export type FilaSeguimiento = { usuario_id: string; lugar_id: string | null; artista_id: string | null };
export type FilaAsistencia = { usuario_id: string; evento_id: string; estado: string };
export type FilasGrafo = {
  lugares: FilaLugar[];
  artistas: FilaArtista[];
  eventos: FilaEvento[];
  eventos_artistas: FilaEventoArtista[];
  seguimientos: FilaSeguimiento[];
  asistencias: FilaAsistencia[];
};

// ---------- Lo que sale ----------
export type NodoLugar = { nombre: string; tipo: string; ciudad: string; x: number; z: number; seguidores: number; asistentes: number; eventos: number; proximos: number; d: number[] };
/**
 * Un sitio sin ficha de lugar (OL-404): los eventos con `lugar_id` nulo y coordenadas que caen a 50 m o menos unos de otros. Va en el suelo (y = 0), con el
 * mismo tamaño que un lugar (seguidores 0 + asistencias a sus eventos). Son coordenadas de un sitio, no de una persona.
 */
export type NodoSitio = { nombre: string; /** Verdadero si ningún evento trae el nombre del sitio (el nombre es «Sitio sin ficha»). */ sinNombre?: true; lat: number; lng: number; x: number; z: number; asistentes: number; eventos: number; proximos: number; d: number[] };
export type NodoArtista = {
  nombre: string;
  disciplina: string;
  ciudad: string;
  seguidores: number;
  asistentes: number;
  /** Cuántos eventos tiene. */
  fechas: number;
  x: number;
  y: number;
  z: number;
  /** Índice (en `lugares`) del lugar con ficha donde más toca (cuenta también el sitio sin ficha donde más pesa); -1 si ese es un sitio o no tiene. */
  lugar: number;
  /** En cuántos lugares con ficha distintos toca. */
  lugares: number;
  /** En cuántos sitios sin ficha distintos toca. */
  sitios: number;
  suelto?: true;
  sitioLibre?: true;
};
/** Una persona que asiste: sin id, sin nombre, sin foto, sin enlace. `tramo` (1 a 3) en lugar del número de acciones. */
export type NodoPersona = { x: number; y: number; z: number; tramo: 1 | 2 | 3; inventada: true };
/**
 * `[tipo, a, b, peso, días]`: a y b son índices dentro de la lista de su tipo. Artista→lugar `a`, artista→sitio `as`; persona (por asistir) →lugar `pl`, →sitio
 * `psit`, →artista `pa`; persona (por seguir) →artista `psa`, →lugar `psl` (sin días: siempre activas); entre iguales `aa`, `ll`, `ss`, `pp`; lugar–sitio `ls`
 * (del mismo festival).
 */
export type TipoArista = "a" | "as" | "pl" | "psit" | "pa" | "psa" | "psl" | "aa" | "ll" | "ls" | "ss" | "pp";
export type Arista = [TipoArista, number, number, number, number[]];
export type ResumenGrafo = {
  lugares: number;
  /** Sitios sin ficha de lugar (cada uno es un lugar por dar de alta) y cuántos eventos tienen entre todos. */
  sitios: number;
  eventosEnSitios: number;
  artistas: number;
  artistasConectados: number;
  artistasEnSitioLibre: number;
  artistasSueltos: number;
  personas: number;
  /** Personas que siguen a algún lugar o artista (con o sin asistencias). */
  personasQueSiguen: number;
  /** De ellas, las que solo siguen: no han dicho Voy ni Me interesa a nada. */
  personasSoloSiguen: number;
  aristas: number;
  eventos: number;
  festivales: number;
  seguimientos: number;
  asistencias: number;
};
export type Grafo = {
  extraido: string;
  hoy: number;
  primerDia: number;
  ultimoDia: number;
  centro: { lat: number; lng: number };
  resumen: ResumenGrafo;
  lugares: NodoLugar[];
  sitios: NodoSitio[];
  artistas: NodoArtista[];
  personas: NodoPersona[];
  aristas: Arista[];
};

// ---------- Constantes ----------
const DIA_MS = 86_400_000;
const KM_POR_GRADO = 111.32;
/** 1 unidad = 10 m = 0,01 km. */
const UNIDADES_POR_KM = 100;
/** Pasado este radio (10 km) la distancia crece en logaritmo: lo lejano se acerca sin esconderse. */
const RADIO_LOGARITMO = 1000;
const ANGULO_AUREO = 2.399963;
/**
 * Un evento con menos asistencias que esto no genera líneas de personas. Decisión del founder del 13 de octubre de 2026 («baja humbral a 1 para grafo»), solo
 * para Administración: baja de 3 a 1. Las personas siguen siendo anónimas: sin id ni nombre, con tramo en vez de número y con posición inventada.
 */
export const UMBRAL_ANONIMATO = 1;
/** Dos eventos sin lugar con ficha a esta distancia o menos (en metros, uno encadenado con el otro) son el mismo sitio. */
export const METROS_MISMO_SITIO = 50;
const CIUDAD_BASE = "San Luis Potosí";
const CENTRO_RESPALDO = { lat: 22.15, lng: -100.98 };

// ---------- Utilidades puras ----------
/** FNV-1a de 32 bits: barato, estable y sin azar. */
function hash(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
/** Un número de [0, 1) que depende solo del texto y de la sal: así cada cosa tiene su azar fijo. */
export function hash01(texto: string, sal: string): number {
  return (hash(`${sal}:${texto}`) % 10000) / 10000;
}
const redondear = (n: number) => Math.round(n * 10) / 10;
const porId = <T extends { id: string }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const diaDe = (iso: string) => Math.floor(Date.parse(iso) / DIA_MS);
const unicosOrdenados = (dias: number[]) => [...new Set(dias)].sort((a, b) => a - b);
const esNumero = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n);
/** Metros entre dos puntos cercanos (aproximación plana: de sobra a decenas de metros). */
function metrosEntre(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const m = 111_320;
  const dx = (a.lng - b.lng) * m * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  const dy = (a.lat - b.lat) * m;
  return Math.hypot(dx, dy);
}

/**
 * De latitud y longitud a unidades (1 = 10 m) alrededor de un centro: x al este, z al sur. Más allá de 10 km la distancia
 * crece en logaritmo (`1000 + 300·ln(r/1000)`), en el mismo rumbo.
 */
export function proyectar(lat: number, lng: number, centro: { lat: number; lng: number }): { x: number; z: number } {
  let x = (lng - centro.lng) * KM_POR_GRADO * Math.cos((centro.lat * Math.PI) / 180) * UNIDADES_POR_KM;
  let z = -(lat - centro.lat) * KM_POR_GRADO * UNIDADES_POR_KM;
  const r = Math.hypot(x, z);
  if (r > RADIO_LOGARITMO) {
    const comprimido = RADIO_LOGARITMO + 300 * Math.log(r / RADIO_LOGARITMO);
    x *= comprimido / r;
    z *= comprimido / r;
  }
  return { x, z };
}

/** El tramo de una persona por sus acciones (asistencias + seguimientos): nunca el número. */
export function tramoDe(acciones: number): 1 | 2 | 3 {
  return acciones <= 1 ? 1 : acciones <= 5 ? 2 : 3;
}

/** Las líneas se juntan por par ordenado (menor|mayor en las simétricas): sin duplicados, con el peso sumado y los días de cada evento. */
type Acumulador = Map<string, { tipo: TipoArista; a: number; b: number; w: number; d: number[] }>;
function sumarArista(acc: Acumulador, tipo: TipoArista, a: number, b: number, w: number, dias: number[]) {
  const simetrica = tipo === "aa" || tipo === "ll" || tipo === "ss" || tipo === "pp";
  const [x, y] = simetrica && a > b ? [b, a] : [a, b];
  const clave = `${tipo}|${x}|${y}`;
  const previa = acc.get(clave);
  if (previa) {
    previa.w += w;
    previa.d.push(...dias);
  } else acc.set(clave, { tipo, a: x, b: y, w, d: [...dias] });
}

// ---------- El grafo ----------
/**
 * El grafo y, aparte, qué punto de `personas` es cada usuario (`indicePorUsuario`: id de la cuenta → índice). Ese mapa es PRIVADO del servidor: sirve
 * para que la página sepa cuál es el punto de quien mira (el interruptor «Yo») y nunca viaja al navegador.
 */
export type GrafoConIndice = { grafo: Grafo; indicePorUsuario: Record<string, number> };

export function armarGrafo(entrada: FilasGrafo, hoy: number): GrafoConIndice {
  // Todo se ordena por id: el resultado no depende del orden en que llegaron las filas.
  const lugaresFila = entrada.lugares.filter((l) => l.visible && !l.privado && esNumero(l.lat) && esNumero(l.lng)).sort(porId);
  const artistasFila = entrada.artistas.filter((a) => a.visible).sort(porId);
  const eventosFila = entrada.eventos.filter((e) => e.visible && !e.borrador).sort(porId);

  // Centro: el promedio de los lugares de la ciudad base (o de todos, o uno de respaldo).
  const baseCiudad = lugaresFila.filter((l) => l.ciudad === CIUDAD_BASE);
  const paraCentro = baseCiudad.length ? baseCiudad : lugaresFila;
  const centro = paraCentro.length
    ? { lat: paraCentro.reduce((s, l) => s + (l.lat as number), 0) / paraCentro.length, lng: paraCentro.reduce((s, l) => s + (l.lng as number), 0) / paraCentro.length }
    : CENTRO_RESPALDO;

  const lugarIdx = new Map(lugaresFila.map((l, i) => [l.id, i]));
  const posLugar = lugaresFila.map((l) => proyectar(l.lat as number, l.lng as number, centro));
  const NL = lugaresFila.length;
  const artistaIdx = new Map(artistasFila.map((a, i) => [a.id, i]));
  const evento = new Map(eventosFila.map((e) => [e.id, e]));
  const lugarDe = (e: FilaEvento) => (e.lugar_id ? lugarIdx.get(e.lugar_id) : undefined);

  // ----- Sitios sin ficha (OL-404): eventos sin lugar_id y con coordenadas, agrupados por cercanía -----
  // Un grupo es lo que se alcanza de un evento a otro saltando de a 50 m o menos (no una rejilla: una rejilla corta en dos a dos eventos que están a 30 m si
  // justo cae una raya entre ellos). Los grupos y su orden salen de los ids de los eventos (ya ordenados), así que no dependen del orden de las filas.
  const enSitio = eventosFila.filter((e) => !e.lugar_id && esNumero(e.sitio_lat) && esNumero(e.sitio_lng));
  const padreSitio = enSitio.map((_, i) => i);
  const raizSitio = (i: number): number => {
    while (padreSitio[i] !== i) {
      padreSitio[i] = padreSitio[padreSitio[i]];
      i = padreSitio[i];
    }
    return i;
  };
  for (let i = 0; i < enSitio.length; i++)
    for (let j = i + 1; j < enSitio.length; j++) {
      if (metrosEntre({ lat: enSitio[i].sitio_lat as number, lng: enSitio[i].sitio_lng as number }, { lat: enSitio[j].sitio_lat as number, lng: enSitio[j].sitio_lng as number }) <= METROS_MISMO_SITIO)
        padreSitio[Math.max(raizSitio(i), raizSitio(j))] = Math.min(raizSitio(i), raizSitio(j));
    }
  const gruposSitio = new Map<number, FilaEvento[]>();
  enSitio.forEach((e, i) => gruposSitio.set(raizSitio(i), [...(gruposSitio.get(raizSitio(i)) ?? []), e]));
  const eventosDeSitio: FilaEvento[][] = [...gruposSitio.entries()].sort((p, q) => p[0] - q[0]).map(([, evs]) => evs);
  const NS = eventosDeSitio.length;
  const sitioDeEvento = new Map<string, number>();
  eventosDeSitio.forEach((evs, si) => evs.forEach((e) => sitioDeEvento.set(e.id, si)));
  const puntoSitio = eventosDeSitio.map((evs) => ({
    lat: evs.reduce((s, e) => s + (e.sitio_lat as number), 0) / evs.length,
    lng: evs.reduce((s, e) => s + (e.sitio_lng as number), 0) / evs.length,
  }));
  const posSitio = puntoSitio.map((p) => proyectar(p.lat, p.lng, centro));
  /** Un lugar con ficha va de 0 a NL−1; un sitio sin ficha, de NL en adelante: así artistas y festivales tratan a los dos igual. */
  const sedeDe = (e: FilaEvento): number | undefined => {
    const li = lugarDe(e);
    if (li !== undefined) return li;
    const si = sitioDeEvento.get(e.id);
    return si === undefined ? undefined : NL + si;
  };
  const posSede = (k: number) => (k < NL ? posLugar[k] : posSitio[k - NL]);
  /** Dónde queda un evento: en su lugar con ficha o en su sitio sin ficha. */
  const puntoDe = (e: FilaEvento): { x: number; z: number } | null => {
    const k = sedeDe(e);
    return k === undefined ? null : posSede(k);
  };

  // Eventos por lugar y por artista
  const eventosDeLugar = lugaresFila.map(() => [] as FilaEvento[]);
  for (const e of eventosFila) {
    const i = lugarDe(e);
    if (i !== undefined) eventosDeLugar[i].push(e);
  }
  const artistasDeEvento = new Map<string, number[]>();
  const eventosDeArtista = artistasFila.map(() => [] as FilaEvento[]);
  for (const ea of [...entrada.eventos_artistas].sort((p, q) => (p.evento_id + p.artista_id < q.evento_id + q.artista_id ? -1 : 1))) {
    const e = evento.get(ea.evento_id);
    const a = artistaIdx.get(ea.artista_id);
    if (!e || a === undefined) continue;
    const lista = artistasDeEvento.get(e.id) ?? [];
    if (lista.includes(a)) continue;
    lista.push(a);
    artistasDeEvento.set(e.id, lista);
    eventosDeArtista[a].push(e);
  }

  // Asistencias de eventos visibles (Voy y Me interesa), una por persona y evento
  const asistentesDeEvento = new Map<string, string[]>();
  const eventosDePersona = new Map<string, string[]>();
  let asistenciasTotal = 0;
  for (const s of [...entrada.asistencias].sort((p, q) => (p.evento_id + p.usuario_id < q.evento_id + q.usuario_id ? -1 : 1))) {
    if (!evento.has(s.evento_id) || (s.estado !== "voy" && s.estado !== "me_interesa")) continue;
    const quienes = asistentesDeEvento.get(s.evento_id) ?? [];
    if (quienes.includes(s.usuario_id)) continue;
    quienes.push(s.usuario_id);
    asistentesDeEvento.set(s.evento_id, quienes);
    const suyos = eventosDePersona.get(s.usuario_id) ?? [];
    suyos.push(s.evento_id);
    eventosDePersona.set(s.usuario_id, suyos);
    asistenciasTotal++;
  }
  const asistenciasA = (e: FilaEvento) => asistentesDeEvento.get(e.id)?.length ?? 0;

  // Seguimientos: suman al tamaño, a las acciones de cada persona y, desde OL-404, son líneas (persona sigue a artista / a lugar)
  const seguidoresLugar = lugaresFila.map(() => 0);
  const seguidoresArtista = artistasFila.map(() => 0);
  const seguimientosDePersona = new Map<string, number>();
  const sigueArtistas = new Map<string, Set<number>>();
  const sigueLugares = new Map<string, Set<number>>();
  let seguimientosTotal = 0;
  for (const s of entrada.seguimientos) {
    const l = s.lugar_id ? lugarIdx.get(s.lugar_id) : undefined;
    const a = s.artista_id ? artistaIdx.get(s.artista_id) : undefined;
    if (l === undefined && a === undefined) continue;
    if (l !== undefined) {
      seguidoresLugar[l]++;
      sigueLugares.set(s.usuario_id, (sigueLugares.get(s.usuario_id) ?? new Set<number>()).add(l));
    }
    if (a !== undefined) {
      seguidoresArtista[a]++;
      sigueArtistas.set(s.usuario_id, (sigueArtistas.get(s.usuario_id) ?? new Set<number>()).add(a));
    }
    seguimientosTotal++;
    seguimientosDePersona.set(s.usuario_id, (seguimientosDePersona.get(s.usuario_id) ?? 0) + 1);
  }

  // ----- Lugares y sitios -----
  const proximo = (e: FilaEvento) => Date.parse(e.termina ?? e.inicio) >= hoy * DIA_MS;
  const lugares: NodoLugar[] = lugaresFila.map((l, i) => ({
    nombre: l.nombre,
    tipo: l.tipo,
    ciudad: l.ciudad ?? CIUDAD_BASE,
    x: redondear(posLugar[i].x),
    z: redondear(posLugar[i].z),
    seguidores: seguidoresLugar[i],
    asistentes: eventosDeLugar[i].reduce((s, e) => s + asistenciasA(e), 0),
    eventos: eventosDeLugar[i].length,
    proximos: eventosDeLugar[i].filter(proximo).length,
    d: unicosOrdenados(eventosDeLugar[i].map((e) => diaDe(e.inicio))),
  }));
  /** El nombre de un sitio: el texto más repetido entre sus eventos (si hay empate, el primero en orden alfabético); sin texto, «Sitio sin ficha». */
  const nombreDeSitio = (evs: FilaEvento[]): string => {
    const cuenta = new Map<string, number>();
    for (const e of evs) {
      const t = e.sitio_texto?.trim();
      if (t) cuenta.set(t, (cuenta.get(t) ?? 0) + 1);
    }
    const orden = [...cuenta].sort((p, q) => q[1] - p[1] || (p[0] < q[0] ? -1 : 1));
    return orden[0]?.[0] ?? "Sitio sin ficha";
  };
  const sitios: NodoSitio[] = eventosDeSitio.map((evs, si) => ({
    nombre: nombreDeSitio(evs),
    ...(evs.some((e) => e.sitio_texto?.trim()) ? {} : { sinNombre: true as const }),
    lat: Math.round(puntoSitio[si].lat * 1e5) / 1e5,
    lng: Math.round(puntoSitio[si].lng * 1e5) / 1e5,
    x: redondear(posSitio[si].x),
    z: redondear(posSitio[si].z),
    asistentes: evs.reduce((s, e) => s + asistenciasA(e), 0),
    eventos: evs.length,
    proximos: evs.filter(proximo).length,
    d: unicosOrdenados(evs.map((e) => diaDe(e.inicio))),
  }));

  // ----- Artistas -----
  const llegada = Array.from({ length: NL + NS }, () => 0);
  let sueltosVistos = 0;
  /** Por artista: dónde toca (clave de sede: lugar < NL, sitio ≥ NL) y con qué peso. */
  const sedesDe: Map<number, number>[] = [];
  /** Por artista: la sede donde más pesa (-1 si ninguna). */
  const principalDe: number[] = [];
  const artistas: NodoArtista[] = artistasFila.map((a, ai) => {
    const suyos = eventosDeArtista[ai];
    // Cada evento en una sede (lugar con ficha o sitio sin ficha) pesa 2 si está en curso o por venir y 1 si ya pasó
    const pesos = new Map<number, number>();
    for (const e of suyos) {
      const k = sedeDe(e);
      if (k !== undefined) pesos.set(k, (pesos.get(k) ?? 0) + (proximo(e) ? 2 : 1));
    }
    sedesDe.push(pesos);
    const nLugares = [...pesos.keys()].filter((k) => k < NL).length;
    const base = {
      nombre: a.nombre,
      disciplina: a.disciplina,
      ciudad: a.ciudad ?? CIUDAD_BASE,
      seguidores: seguidoresArtista[ai],
      asistentes: suyos.reduce((s, e) => s + asistenciasA(e), 0),
      fechas: suyos.length,
      lugares: nLugares,
      sitios: pesos.size - nLugares,
    };
    const y = 45 + 95 * hash01(a.id, "y");
    if (pesos.size) {
      const total = [...pesos.values()].reduce((s, w) => s + w, 0);
      let bx = 0;
      let bz = 0;
      let principal = -1;
      let mejor = -1;
      for (const [k, w] of [...pesos].sort((p, q) => p[0] - q[0])) {
        bx += (posSede(k).x * w) / total;
        bz += (posSede(k).z * w) / total;
        if (w > mejor) {
          mejor = w;
          principal = k;
        }
      }
      principalDe.push(principal);
      let radio: number;
      let angulo: number;
      if (pesos.size === 1) {
        // Un halo alrededor de su sede (lugar o sitio): el k-ésimo en llegar queda en el ángulo áureo siguiente, cada vez más lejos
        const k = ++llegada[principal];
        radio = 28 + 11 * Math.sqrt(k);
        angulo = k * ANGULO_AUREO + principal;
      } else {
        radio = 18;
        angulo = 2 * Math.PI * hash01(a.id, "ang");
      }
      return {
        ...base,
        x: redondear(bx + radio * Math.cos(angulo)),
        y: redondear(y),
        z: redondear(bz + radio * Math.sin(angulo)),
        lugar: principal < NL ? principal : -1,
        ...(nLugares === 0 ? { sitioLibre: true as const } : {}),
      };
    }
    principalDe.push(-1);
    // Sin ningún evento con sede: fuera del ecosistema, en un anillo exterior
    const k = ++sueltosVistos;
    const radio = 800 + 150 * hash01(a.id, "r");
    const angulo = k * ANGULO_AUREO;
    const ys = -120 + 240 * hash01(a.id, "ys");
    return { ...base, x: redondear(radio * Math.cos(angulo)), y: redondear(ys), z: redondear(radio * Math.sin(angulo)), lugar: -1, suelto: true as const };
  });

  // ----- Personas (anónimas): quien asiste a algún evento visible o sigue a algún lugar o artista, en orden barajado (por un hash del id, que no se guarda) -----
  const usuarios = [...new Set([...eventosDePersona.keys(), ...seguimientosDePersona.keys()])].sort((p, q) => hash(`orden:${p}`) - hash(`orden:${q}`) || (p < q ? -1 : 1));
  const personaIdx = new Map(usuarios.map((u, i) => [u, i]));
  const sigueA = (u: string) => [...(sigueArtistas.get(u) ?? [])].sort((p, q) => p - q);
  const sigueL = (u: string) => [...(sigueLugares.get(u) ?? [])].sort((p, q) => p - q);
  const personas: NodoPersona[] = usuarios.map((u) => {
    let puntos = (eventosDePersona.get(u) ?? []).map((id) => puntoDe(evento.get(id) as FilaEvento)).filter((p): p is { x: number; z: number } => p !== null);
    if (!puntos.length) {
      // Quien solo sigue: el promedio de los lugares que sigue y de las sedes donde más tocan los artistas que sigue
      puntos = [...sigueL(u).map((l) => posLugar[l]), ...sigueA(u).map((a) => principalDe[a]).filter((k) => k >= 0).map(posSede)];
    }
    const bx = puntos.length ? puntos.reduce((s, p) => s + p.x, 0) / puntos.length : 0; // sin ningún punto: cerca del centro
    const bz = puntos.length ? puntos.reduce((s, p) => s + p.z, 0) / puntos.length : 0;
    const radio = 30 + 60 * hash01(u, "pr");
    const angulo = 2 * Math.PI * hash01(u, "pa");
    return {
      x: redondear(bx + radio * Math.cos(angulo)),
      y: redondear(-140 + 95 * hash01(u, "py")),
      z: redondear(bz + radio * Math.sin(angulo)),
      tramo: tramoDe((eventosDePersona.get(u) ?? []).length + (seguimientosDePersona.get(u) ?? 0)),
      inventada: true as const,
    };
  });

  // ----- Líneas -----
  const acc: Acumulador = new Map();
  const diasDe = (e: FilaEvento) => [diaDe(e.inicio)];

  // artista → lugar (`a`) o sitio (`as`): el peso es el de arriba y los días, los de esos eventos
  artistas.forEach((_, ai) => {
    for (const [k, w] of [...sedesDe[ai]].sort((p, q) => p[0] - q[0])) {
      const dias = eventosDeArtista[ai].filter((e) => sedeDe(e) === k).flatMap(diasDe);
      if (k < NL) sumarArista(acc, "a", ai, k, w, dias);
      else sumarArista(acc, "as", ai, k - NL, w, dias);
    }
  });
  // artista–artista: comparten un evento (no el festival entero)
  for (const e of eventosFila) {
    const quienes = [...(artistasDeEvento.get(e.id) ?? [])].sort((p, q) => p - q);
    for (let i = 0; i < quienes.length; i++) for (let j = i + 1; j < quienes.length; j++) sumarArista(acc, "aa", quienes[i], quienes[j], 1, diasDe(e));
  }
  // sede–sede: sedes de actos del mismo festival (lugar–lugar `ll`, lugar–sitio `ls`, sitio–sitio `ss`)
  const actosDe = new Map<string, FilaEvento[]>();
  for (const e of eventosFila) if (e.evento_padre_id) actosDe.set(e.evento_padre_id, [...(actosDe.get(e.evento_padre_id) ?? []), e]);
  for (const padre of [...actosDe.keys()].sort()) {
    const actos = actosDe.get(padre) as FilaEvento[];
    const sedes = [...new Set(actos.map(sedeDe).filter((i): i is number => i !== undefined))].sort((p, q) => p - q);
    for (let i = 0; i < sedes.length; i++)
      for (let j = i + 1; j < sedes.length; j++) {
        const dias = actos.filter((e) => sedeDe(e) === sedes[i] || sedeDe(e) === sedes[j]).flatMap(diasDe);
        const [p, q] = [sedes[i], sedes[j]]; // p < q: si hay un lugar con ficha, es p
        if (q < NL) sumarArista(acc, "ll", p, q, 1, dias);
        else if (p < NL) sumarArista(acc, "ls", p, q - NL, 1, dias);
        else sumarArista(acc, "ss", p - NL, q - NL, 1, dias);
      }
  }
  // Las de personas por asistir, de eventos con el mínimo de asistentes (umbral de anonimato)
  for (const e of eventosFila) {
    const quienes = asistentesDeEvento.get(e.id) ?? [];
    if (quienes.length < UMBRAL_ANONIMATO) continue;
    const gente = quienes.map((u) => personaIdx.get(u) as number).sort((p, q) => p - q);
    const k = sedeDe(e);
    for (const p of gente) {
      if (k !== undefined && k < NL) sumarArista(acc, "pl", p, k, 1, diasDe(e));
      else if (k !== undefined) sumarArista(acc, "psit", p, k - NL, 1, diasDe(e));
      for (const ai of artistasDeEvento.get(e.id) ?? []) sumarArista(acc, "pa", p, ai, 1, diasDe(e));
    }
    for (let i = 0; i < gente.length; i++) for (let j = i + 1; j < gente.length; j++) sumarArista(acc, "pp", gente[i], gente[j], 1, diasDe(e));
  }
  // Las de seguir: sin umbral, de peso 1 y sin días (siempre activas)
  for (const u of usuarios) {
    const p = personaIdx.get(u) as number;
    for (const ai of sigueA(u)) sumarArista(acc, "psa", p, ai, 1, []);
    for (const li of sigueL(u)) sumarArista(acc, "psl", p, li, 1, []);
  }
  const aristas: Arista[] = [...acc.values()].map((l) => [l.tipo, l.a, l.b, l.w, unicosOrdenados(l.d)]);

  // ----- Resumen y periodo -----
  const dias = eventosFila.map((e) => diaDe(e.inicio));
  const personasQueSiguen = [...seguimientosDePersona.keys()];
  const grafo: Grafo = {
    extraido: new Date(hoy * DIA_MS).toISOString().slice(0, 10),
    hoy,
    primerDia: dias.length ? Math.min(...dias) : hoy,
    ultimoDia: dias.length ? Math.max(...dias) : hoy,
    centro: { lat: Math.round(centro.lat * 1e5) / 1e5, lng: Math.round(centro.lng * 1e5) / 1e5 },
    resumen: {
      lugares: lugares.length,
      sitios: sitios.length,
      eventosEnSitios: sitios.reduce((s, x) => s + x.eventos, 0),
      artistas: artistas.length,
      artistasConectados: artistas.filter((a) => a.lugares > 0).length,
      artistasEnSitioLibre: artistas.filter((a) => a.sitioLibre).length,
      artistasSueltos: artistas.filter((a) => a.suelto).length,
      personas: personas.length,
      personasQueSiguen: personasQueSiguen.length,
      personasSoloSiguen: personasQueSiguen.filter((u) => !eventosDePersona.has(u)).length,
      aristas: aristas.length,
      eventos: eventosFila.length,
      festivales: eventosFila.filter((e) => e.clase === "festival").length,
      seguimientos: seguimientosTotal,
      asistencias: asistenciasTotal,
    },
    lugares,
    sitios,
    artistas,
    personas,
    aristas,
  };
  return { grafo, indicePorUsuario: Object.fromEntries(personaIdx) };
}

/** Solo el grafo (lo que dibuja la pantalla y lo que prueban las pruebas de posiciones y líneas). */
export function construirGrafo(entrada: FilasGrafo, hoy: number): Grafo {
  return armarGrafo(entrada, hoy).grafo;
}

// ---------- La lectura ----------
const PAGINA = 1000;

type Respuesta = { data: unknown[] | null; error: { message: string } | null };

/** Lee una tabla entera de 1 000 en 1 000 (el servidor no devuelve más de eso por consulta). El orden es por la llave de cada tabla:
 * `asistencias` y `eventos_artistas` no tienen columna `id` (su llave es el par), y pedir `order=id` ahí falla en PostgREST. */
async function leerTodo<T>(consulta: (desde: number, hasta: number) => PromiseLike<Respuesta>): Promise<T[]> {
  const todo: T[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await consulta(desde, desde + PAGINA - 1);
    if (error) throw new Error(`grafo: ${error.message}`);
    const filas = (data ?? []) as T[];
    todo.push(...filas);
    if (filas.length < PAGINA) return todo;
  }
}

async function leerFilas(): Promise<FilasGrafo> {
  const db = clienteAdmin();
  if (!db) throw new Error("grafo: falta la llave de servicio");
  const [lugares, artistas, eventos, eventos_artistas, seguimientos, asistencias] = await Promise.all([
    leerTodo<FilaLugar>((d, h) => db.from("lugares").select("id, nombre, tipo, lat, lng, ciudad, visible, privado").eq("visible", true).eq("privado", false).order("id").range(d, h)),
    leerTodo<FilaArtista>((d, h) => db.from("artistas").select("id, nombre, disciplina, ciudad, visible").eq("visible", true).order("id").range(d, h)),
    leerTodo<FilaEvento>((d, h) =>
      db.from("eventos").select("id, lugar_id, inicio, termina, visible, borrador, clase, evento_padre_id, sitio_lat, sitio_lng, sitio_texto").eq("visible", true).eq("borrador", false).order("id").range(d, h),
    ),
    leerTodo<FilaEventoArtista>((d, h) => db.from("eventos_artistas").select("evento_id, artista_id").order("evento_id").order("artista_id").range(d, h)),
    leerTodo<FilaSeguimiento>((d, h) => db.from("seguimientos").select("usuario_id, lugar_id, artista_id").order("id").range(d, h)),
    leerTodo<FilaAsistencia>((d, h) => db.from("asistencias").select("usuario_id, evento_id, estado").order("usuario_id").order("evento_id").range(d, h)),
  ]);
  return { lugares, artistas, eventos, eventos_artistas, seguimientos, asistencias };
}

/** Lo que guarda la caché: el grafo, el índice de quien mira y el instante exacto del cálculo (ISO), que la pantalla enseña como «Datos de las 2:05 pm». */
export type GrafoCargado = GrafoConIndice & { calculadoEn: string };
/** Etiqueta de la caché del grafo: `actualizarGrafo` (acción de administración) la invalida para forzar una lectura nueva sin esperar la hora. */
export const ETIQUETA_GRAFO = "grafo-admin";
/**
 * El grafo de Administración. Cuesta seis lecturas completas, así que se guarda una hora: diez administradores que lo abren
 * suman una sola lectura por hora. Solo en el servidor y con la llave de servicio (nunca en el navegador). Devuelve también el mapa privado
 * usuario → punto (`indicePorUsuario`): quien llama toma de ahí el punto de la cuenta con sesión y NO pasa el mapa al navegador.
 */
export const cargarGrafo = unstable_cache(
  async (): Promise<GrafoCargado> => ({ ...armarGrafo(await leerFilas(), Math.floor(Date.now() / DIA_MS)), calculadoEn: new Date().toISOString() }),
  ["grafo-admin"],
  { revalidate: 3600, tags: [ETIQUETA_GRAFO] },
);
