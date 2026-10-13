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
  /** Índice (en `lugares`) del lugar donde más toca; -1 si no tiene. */
  lugar: number;
  /** En cuántos lugares distintos toca. */
  lugares: number;
  suelto?: true;
  sitioLibre?: true;
};
/** Una persona que asiste: sin id, sin nombre, sin foto, sin enlace. `tramo` (1 a 3) en lugar del número de acciones. */
export type NodoPersona = { x: number; y: number; z: number; tramo: 1 | 2 | 3; inventada: true };
/** `[tipo, a, b, peso, días]`: a y b son índices dentro de la lista de su tipo. */
export type TipoArista = "a" | "pl" | "pa" | "aa" | "ll" | "pp";
export type Arista = [TipoArista, number, number, number, number[]];
export type ResumenGrafo = {
  lugares: number;
  artistas: number;
  artistasConectados: number;
  artistasEnSitioLibre: number;
  artistasSueltos: number;
  personas: number;
  /** Personas con alguna acción (Voy, Me interesa o Seguir), se dibujen o no. */
  personasQueSiguen: number;
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
/** Un evento con menos asistencias que esto no genera líneas de personas (umbral de anonimato, decisión del founder). */
export const UMBRAL_ANONIMATO = 3;
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
  const simetrica = tipo === "aa" || tipo === "ll" || tipo === "pp";
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
  const artistaIdx = new Map(artistasFila.map((a, i) => [a.id, i]));
  const evento = new Map(eventosFila.map((e) => [e.id, e]));
  const lugarDe = (e: FilaEvento) => (e.lugar_id ? lugarIdx.get(e.lugar_id) : undefined);
  /** Dónde queda un evento: en su lugar con ficha o, si no, en su sitio libre con coordenadas. */
  const puntoDe = (e: FilaEvento): { x: number; z: number } | null => {
    const li = lugarDe(e);
    if (li !== undefined) return posLugar[li];
    return esNumero(e.sitio_lat) && esNumero(e.sitio_lng) ? proyectar(e.sitio_lat, e.sitio_lng, centro) : null;
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

  // Seguimientos: solo suman al tamaño (y a las acciones de cada persona)
  const seguidoresLugar = lugaresFila.map(() => 0);
  const seguidoresArtista = artistasFila.map(() => 0);
  const seguimientosDePersona = new Map<string, number>();
  let seguimientosTotal = 0;
  for (const s of entrada.seguimientos) {
    const l = s.lugar_id ? lugarIdx.get(s.lugar_id) : undefined;
    const a = s.artista_id ? artistaIdx.get(s.artista_id) : undefined;
    if (l === undefined && a === undefined) continue;
    if (l !== undefined) seguidoresLugar[l]++;
    if (a !== undefined) seguidoresArtista[a]++;
    seguimientosTotal++;
    seguimientosDePersona.set(s.usuario_id, (seguimientosDePersona.get(s.usuario_id) ?? 0) + 1);
  }

  // ----- Lugares -----
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

  // ----- Artistas -----
  const llegada = lugaresFila.map(() => 0);
  let sueltosVistos = 0;
  const lugaresDe: Map<number, number>[] = [];
  const artistas: NodoArtista[] = artistasFila.map((a, ai) => {
    const suyos = eventosDeArtista[ai];
    // Cada evento en un lugar con ficha pesa 2 si está en curso o por venir y 1 si ya pasó
    const pesos = new Map<number, number>();
    const sitios: { x: number; z: number }[] = [];
    for (const e of suyos) {
      const li = lugarDe(e);
      if (li !== undefined) pesos.set(li, (pesos.get(li) ?? 0) + (proximo(e) ? 2 : 1));
      else {
        const p = puntoDe(e);
        if (p) sitios.push(p);
      }
    }
    lugaresDe.push(pesos);
    const base = {
      nombre: a.nombre,
      disciplina: a.disciplina,
      ciudad: a.ciudad ?? CIUDAD_BASE,
      seguidores: seguidoresArtista[ai],
      asistentes: suyos.reduce((s, e) => s + asistenciasA(e), 0),
      fechas: suyos.length,
    };
    const y = 45 + 95 * hash01(a.id, "y");
    if (pesos.size) {
      const total = [...pesos.values()].reduce((s, w) => s + w, 0);
      let bx = 0;
      let bz = 0;
      let principal = -1;
      let mejor = -1;
      for (const [li, w] of [...pesos].sort((p, q) => p[0] - q[0])) {
        bx += (posLugar[li].x * w) / total;
        bz += (posLugar[li].z * w) / total;
        if (w > mejor) {
          mejor = w;
          principal = li;
        }
      }
      let radio: number;
      let angulo: number;
      if (pesos.size === 1) {
        // Un halo alrededor de su lugar: el k-ésimo en llegar queda en el ángulo áureo siguiente, cada vez más lejos
        const k = ++llegada[principal];
        radio = 28 + 11 * Math.sqrt(k);
        angulo = k * ANGULO_AUREO + principal;
      } else {
        radio = 18;
        angulo = 2 * Math.PI * hash01(a.id, "ang");
      }
      return { ...base, x: redondear(bx + radio * Math.cos(angulo)), y: redondear(y), z: redondear(bz + radio * Math.sin(angulo)), lugar: principal, lugares: pesos.size };
    }
    if (sitios.length) {
      const bx = sitios.reduce((s, p) => s + p.x, 0) / sitios.length;
      const bz = sitios.reduce((s, p) => s + p.z, 0) / sitios.length;
      const radio = 15 + 20 * hash01(a.id, "r");
      const angulo = 2 * Math.PI * hash01(a.id, "ang");
      return { ...base, x: redondear(bx + radio * Math.cos(angulo)), y: redondear(y), z: redondear(bz + radio * Math.sin(angulo)), lugar: -1, lugares: 0, sitioLibre: true as const };
    }
    // Sin ningún evento con sitio: fuera del ecosistema, en un anillo exterior
    const k = ++sueltosVistos;
    const radio = 800 + 150 * hash01(a.id, "r");
    const angulo = k * ANGULO_AUREO;
    const ys = -120 + 240 * hash01(a.id, "ys");
    return { ...base, x: redondear(radio * Math.cos(angulo)), y: redondear(ys), z: redondear(radio * Math.sin(angulo)), lugar: -1, lugares: 0, suelto: true as const };
  });

  // ----- Personas (anónimas): solo quien asiste a algún evento visible, en orden barajado (por un hash del id, que no se guarda) -----
  const usuarios = [...eventosDePersona.keys()].sort((p, q) => hash(`orden:${p}`) - hash(`orden:${q}`) || (p < q ? -1 : 1));
  const personaIdx = new Map(usuarios.map((u, i) => [u, i]));
  const personas: NodoPersona[] = usuarios.map((u) => {
    const puntos = (eventosDePersona.get(u) ?? []).map((id) => puntoDe(evento.get(id) as FilaEvento)).filter((p): p is { x: number; z: number } => p !== null);
    const bx = puntos.length ? puntos.reduce((s, p) => s + p.x, 0) / puntos.length : 0;
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

  // artista → lugar: el peso es el de arriba y los días, los de esos eventos
  artistas.forEach((_, ai) => {
    for (const [li, w] of [...lugaresDe[ai]].sort((p, q) => p[0] - q[0])) {
      sumarArista(acc, "a", ai, li, w, eventosDeArtista[ai].filter((e) => lugarDe(e) === li).flatMap(diasDe));
    }
  });
  // artista–artista: comparten un evento (no el festival entero)
  for (const e of eventosFila) {
    const quienes = [...(artistasDeEvento.get(e.id) ?? [])].sort((p, q) => p - q);
    for (let i = 0; i < quienes.length; i++) for (let j = i + 1; j < quienes.length; j++) sumarArista(acc, "aa", quienes[i], quienes[j], 1, diasDe(e));
  }
  // lugar–lugar: sedes de actos del mismo festival
  const actosDe = new Map<string, FilaEvento[]>();
  for (const e of eventosFila) if (e.evento_padre_id) actosDe.set(e.evento_padre_id, [...(actosDe.get(e.evento_padre_id) ?? []), e]);
  for (const padre of [...actosDe.keys()].sort()) {
    const actos = actosDe.get(padre) as FilaEvento[];
    const sedes = [...new Set(actos.map(lugarDe).filter((i): i is number => i !== undefined))].sort((p, q) => p - q);
    for (let i = 0; i < sedes.length; i++)
      for (let j = i + 1; j < sedes.length; j++) {
        const dias = actos.filter((e) => lugarDe(e) === sedes[i] || lugarDe(e) === sedes[j]).flatMap(diasDe);
        sumarArista(acc, "ll", sedes[i], sedes[j], 1, dias);
      }
  }
  // Las de personas, solo de eventos con tres o más asistencias (umbral de anonimato)
  for (const e of eventosFila) {
    const quienes = asistentesDeEvento.get(e.id) ?? [];
    if (quienes.length < UMBRAL_ANONIMATO) continue;
    const gente = quienes.map((u) => personaIdx.get(u) as number).sort((p, q) => p - q);
    const li = lugarDe(e);
    for (const p of gente) {
      if (li !== undefined) sumarArista(acc, "pl", p, li, 1, diasDe(e));
      for (const ai of artistasDeEvento.get(e.id) ?? []) sumarArista(acc, "pa", p, ai, 1, diasDe(e));
    }
    for (let i = 0; i < gente.length; i++) for (let j = i + 1; j < gente.length; j++) sumarArista(acc, "pp", gente[i], gente[j], 1, diasDe(e));
  }
  const aristas: Arista[] = [...acc.values()].map((l) => [l.tipo, l.a, l.b, l.w, unicosOrdenados(l.d)]);

  // ----- Resumen y periodo -----
  const dias = eventosFila.map((e) => diaDe(e.inicio));
  const personasConAccion = new Set([...eventosDePersona.keys(), ...seguimientosDePersona.keys()]);
  const grafo: Grafo = {
    extraido: new Date(hoy * DIA_MS).toISOString().slice(0, 10),
    hoy,
    primerDia: dias.length ? Math.min(...dias) : hoy,
    ultimoDia: dias.length ? Math.max(...dias) : hoy,
    centro: { lat: Math.round(centro.lat * 1e5) / 1e5, lng: Math.round(centro.lng * 1e5) / 1e5 },
    resumen: {
      lugares: lugares.length,
      artistas: artistas.length,
      artistasConectados: artistas.filter((a) => a.lugares > 0).length,
      artistasEnSitioLibre: artistas.filter((a) => a.sitioLibre).length,
      artistasSueltos: artistas.filter((a) => a.suelto).length,
      personas: personas.length,
      personasQueSiguen: personasConAccion.size,
      aristas: aristas.length,
      eventos: eventosFila.length,
      festivales: eventosFila.filter((e) => e.clase === "festival").length,
      seguimientos: seguimientosTotal,
      asistencias: asistenciasTotal,
    },
    lugares,
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
      db.from("eventos").select("id, lugar_id, inicio, termina, visible, borrador, clase, evento_padre_id, sitio_lat, sitio_lng").eq("visible", true).eq("borrador", false).order("id").range(d, h),
    ),
    leerTodo<FilaEventoArtista>((d, h) => db.from("eventos_artistas").select("evento_id, artista_id").order("evento_id").order("artista_id").range(d, h)),
    leerTodo<FilaSeguimiento>((d, h) => db.from("seguimientos").select("usuario_id, lugar_id, artista_id").order("id").range(d, h)),
    leerTodo<FilaAsistencia>((d, h) => db.from("asistencias").select("usuario_id, evento_id, estado").order("usuario_id").order("evento_id").range(d, h)),
  ]);
  return { lugares, artistas, eventos, eventos_artistas, seguimientos, asistencias };
}

/**
 * El grafo de Administración. Cuesta seis lecturas completas, así que se guarda una hora: diez administradores que lo abren
 * suman una sola lectura por hora. Solo en el servidor y con la llave de servicio (nunca en el navegador). Devuelve también el mapa privado
 * usuario → punto (`indicePorUsuario`): quien llama toma de ahí el punto de la cuenta con sesión y NO pasa el mapa al navegador.
 */
export const cargarGrafo = unstable_cache(async (): Promise<GrafoConIndice> => armarGrafo(await leerFilas(), Math.floor(Date.now() / DIA_MS)), ["grafo-admin"], { revalidate: 3600 });
