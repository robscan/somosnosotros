import { slugDeCiudad } from "@/lib/ciudad";
import { listaCorta, listaY, slugsDe, type EstadoVisible } from "@/lib/ciudadesAdmin";
import type { Punto } from "@/lib/geo";
import { normalizarNombre } from "@/lib/lugares";

/**
 * «Añadir ciudad» (OL-432; prototipo firmado OL-431, pantallas B y C, con las respuestas 1, 2 y 6 del gestor): lo que se calcula sin red, para
 * poder probarlo. Mapbox sugiere ciudades (Geocoding v6, `types=place`) y dice qué municipio hay en cada punto; el servidor junta las
 * respuestas (`mapbox.ts`) y la hoja enseña lo resuelto. La persona solo confirma: el sistema propone el nombre, la hora y el área.
 */

/** El área que cuenta con una ciudad nueva: 15 km alrededor de su centro (lo firmado). Una ciudad con `parametros.radio_km` usa el suyo. */
export const RADIO_ALTA_KM = 15;

/** Lo que Mapbox dice de una ciudad: su nombre, su estado y su país, y su centro. */
export type LugarMapbox = { nombre: string; region: string | null; pais: string | null; codigoPais: string | null; lat: number; lng: number };

const limpio = (t: string) => t.replace(/\s+/g, " ").trim();

type Contexto = { region?: { name?: string }; country?: { name?: string; country_code?: string } };
type RespuestaV6 = { features?: Array<{ properties?: { name?: string; coordinates?: { latitude?: number; longitude?: number }; context?: Contexto } }> };

/** Las ciudades de una respuesta de Geocoding v6 (de ida o de vuelta). Lo que no trae nombre o centro se ignora; sin repetir. */
export function leerLugaresMapbox(json: unknown): LugarMapbox[] {
  const vistos = new Set<string>();
  const salida: LugarMapbox[] = [];
  for (const f of (json as RespuestaV6 | null)?.features ?? []) {
    const p = f?.properties;
    const nombre = typeof p?.name === "string" ? limpio(p.name).slice(0, 80) : "";
    const lat = p?.coordinates?.latitude;
    const lng = p?.coordinates?.longitude;
    if (!nombre || typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const region = typeof p?.context?.region?.name === "string" ? limpio(p.context.region.name).slice(0, 80) : null;
    const pais = typeof p?.context?.country?.name === "string" ? limpio(p.context.country.name).slice(0, 80) : null;
    const codigo = typeof p?.context?.country?.country_code === "string" ? p.context.country.country_code.trim().toUpperCase().slice(0, 2) : "";
    const clave = `${slugDeCiudad(nombre)}|${slugDeCiudad(region ?? "")}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    salida.push({ nombre, region, pais, codigoPais: codigo || null, lat, lng });
  }
  return salida;
}

/** «Oaxaca, México»: el estado y el país, como los renglones de la hoja de ciudades. */
export function detalleRegion(l: Pick<LugarMapbox, "region" | "pais">): string {
  return [l.region, l.pais].filter(Boolean).join(", ");
}

/**
 * El nombre en la app (respuesta 1): como lo busca la gente. Si el nombre de Mapbox contiene el de su estado y es más largo («Oaxaca de
 * Juárez», «Santiago de Querétaro», «Heroica Puebla de Zaragoza»), el del estado; si no, el de Mapbox. Fuera de México lleva su país, como lo
 * guarda la app («Córdoba, España», `ciudadDelContexto`). Se cambia en la hoja con «Cambiar».
 */
export function nombreCorto(l: Pick<LugarMapbox, "nombre" | "region" | "codigoPais" | "pais">): string {
  let n = limpio(l.nombre);
  const r = l.region ? limpio(l.region) : "";
  const nn = normalizarNombre(n);
  const nr = normalizarNombre(r);
  if (nr.length >= 4 && nn !== nr && ` ${nn} `.includes(` ${nr} `)) n = r;
  if (l.codigoPais && l.codigoPais !== "MX" && l.pais && !normalizarNombre(n).endsWith(normalizarNombre(l.pais))) n = `${n}, ${l.pais}`;
  return n.slice(0, 80);
}

/**
 * Los otros nombres con los que llega la ciudad (`ciudades.alias`): los que ya tenía, el de Mapbox si es otro (respuesta 1: «cuenta igual») y
 * los municipios de su área, como Soledad de Graciano Sánchez con San Luis Potosí: así las búsquedas también los cuentan. Sin repetir y sin
 * el nombre de la app.
 */
export function aliasNuevos(nombre: string, otros: readonly (string | null | undefined)[]): string[] {
  const vistos = new Set([slugDeCiudad(nombre)]);
  const salida: string[] = [];
  for (const a of otros) {
    const t = a ? limpio(a).slice(0, 80) : "";
    const s = slugDeCiudad(t);
    if (!s || vistos.has(s)) continue;
    vistos.add(s);
    salida.push(t);
  }
  return salida.slice(0, 30);
}

const redondo = (n: number) => Math.round(n * 1e5) / 1e5;
/** Dónde se le pregunta a Mapbox qué municipio hay: el centro, ocho puntos a medio radio y ocho casi en el borde (girados, para cubrir más). */
export function puntosDeMuestra(centro: Punto, radioKm: number): Punto[] {
  const kmLng = 111.32 * Math.max(0.1, Math.cos((centro.lat * Math.PI) / 180));
  const puntos: Punto[] = [{ lat: redondo(centro.lat), lng: redondo(centro.lng) }];
  for (const [f, giro] of [[0.5, 0], [0.97, Math.PI / 8]] as const)
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4 + giro;
      puntos.push({ lat: redondo(centro.lat + (radioKm * f * Math.sin(a)) / 111.32), lng: redondo(centro.lng + (radioKm * f * Math.cos(a)) / kmLng) });
    }
  return puntos;
}

/** Los municipios que caen en el área, del centro hacia fuera (el orden de las muestras), sin la ciudad misma ni repetidos. */
export function municipiosDelArea(nombres: readonly (string | null)[], ciudad: readonly (string | null | undefined)[]): string[] {
  const fuera = new Set(ciudad.filter((x): x is string => !!x).map(slugDeCiudad));
  const salida: string[] = [];
  for (const n of nombres) {
    const t = n ? limpio(n).slice(0, 80) : "";
    const s = slugDeCiudad(t);
    if (!s || fuera.has(s)) continue;
    fuera.add(s);
    salida.push(t);
  }
  return salida.slice(0, 30);
}

/**
 * El renglón del área (respuesta 2: se enseña al abrir, en una línea): «15 km alrededor del centro» y «Cuenta también Santa Lucía del Camino y
 * Santa Cruz Xoxocotlán». Con alcaldías (Ciudad de México, OL-429) cuentan solo ellas. `municipios` null: Mapbox no respondió.
 */
export function textoArea(radioKm: number, municipios: readonly string[] | null, alcaldias: readonly string[] = []): { titulo: string; detalle: string } {
  const titulo = `${String(radioKm).replace(".", ",")} km alrededor del centro`;
  if (alcaldias.length) return { titulo, detalle: `Solo cuentan ${listaY(alcaldias)}` };
  if (municipios === null) return { titulo, detalle: "No pudimos ver qué municipios caen en el área" };
  return { titulo, detalle: municipios.length ? `Cuenta también ${listaCorta(municipios)}` : "Solo su municipio" };
}

/** Las horas de México por su nombre de siempre; las demás, como las nombra el navegador («Hora de Europa central»). */
const ZONAS_MEXICO: Record<string, string> = {
  "America/Mexico_City": "Hora del centro de México",
  "America/Monterrey": "Hora del centro de México",
  "America/Merida": "Hora del centro de México",
  "America/Bahia_Banderas": "Hora del centro de México",
  "America/Chihuahua": "Hora del centro de México",
  "America/Cancun": "Hora del sureste de México",
  "America/Mazatlan": "Hora del Pacífico de México",
  "America/Hermosillo": "Hora del Pacífico de México",
  "America/Tijuana": "Hora del noroeste de México",
};
export function nombreZona(zona: string, ahora: Date = new Date()): string {
  if (ZONAS_MEXICO[zona]) return ZONAS_MEXICO[zona];
  try {
    const t = new Intl.DateTimeFormat("es-MX", { timeZone: zona, timeZoneName: "longGeneric" }).formatToParts(ahora).find((p) => p.type === "timeZoneName")?.value;
    if (t) return t.charAt(0).toUpperCase() + t.slice(1);
  } catch {
    // Una zona que el navegador no conoce: se dice tal cual.
  }
  return zona;
}
/** Minutos que la zona va de UTC en ese instante (−360 en el centro de México), o null si no se sabe. */
export function desfase(zona: string, ahora: Date = new Date()): number | null {
  try {
    const t = new Intl.DateTimeFormat("en-US", { timeZone: zona, timeZoneName: "shortOffset" }).formatToParts(ahora).find((p) => p.type === "timeZoneName")?.value ?? "";
    if (t === "GMT" || t === "UTC") return 0;
    const m = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(t);
    return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : null;
  } catch {
    return null;
  }
}
/** El renglón de la hora: «Hora del centro de México» y «La misma de San Luis Potosí» (o «1 hora menos que San Luis Potosí»). */
export function textoHora(zona: string, referencia: { nombre: string; zona: string } | null, ahora: Date = new Date()): { titulo: string; detalle: string | null } {
  const titulo = nombreZona(zona, ahora);
  const a = desfase(zona, ahora);
  const b = referencia ? desfase(referencia.zona, ahora) : null;
  if (!referencia || a === null || b === null) return { titulo, detalle: null };
  const d = (a - b) / 60;
  if (d === 0) return { titulo, detalle: `La misma de ${referencia.nombre}` };
  const h = Math.abs(d);
  return { titulo, detalle: `${String(h).replace(".", ",")} ${h === 1 ? "hora" : "horas"} ${d > 0 ? "más" : "menos"} que ${referencia.nombre}` };
}

/** Una ciudad que ya está en la tabla. */
export type CiudadExistente = { slug: string; nombre: string; alias: readonly string[]; estado: EstadoVisible; consultas: number };
/** ¿Alguno de estos nombres es una ciudad que ya está (por su slug, su nombre o sus alias)? */
export function existenteDe<T extends Pick<CiudadExistente, "slug" | "nombre" | "alias">>(nombres: readonly (string | null | undefined)[], filas: readonly T[]): T | null {
  const buscados = new Set(nombres.filter((x): x is string => !!x).map(slugDeCiudad).filter(Boolean));
  return filas.find((f) => slugsDe(f).some((s) => buscados.has(s))) ?? null;
}

/**
 * Lo que sale bajo el campo al escribir: primero las que ya están (con su píldora; una abierta lleva a su panel), luego las de Mapbox. Un
 * municipio que ya cuenta con otra ciudad (un alias, como Santa Lucía del Camino con Oaxaca) sale con su nombre y «Cuenta con Oaxaca», sin
 * píldora, y lleva a esa ciudad.
 */
export type SugerenciaCiudad =
  | { tipo: "existente"; slug: string; nombre: string; estado: EstadoVisible; detalle: string; pildora: boolean }
  | { tipo: "nueva"; clave: string; lugar: LugarMapbox; detalle: string };
export const MAX_SUGERENCIAS = 6;

/** El nombre con el que «san» encuentra una ciudad: el suyo o, si no, uno de sus alias (el texto al empezar una palabra). null si ninguno. */
function coincide(q: string, c: Pick<CiudadExistente, "nombre" | "alias">): string | null {
  const t = normalizarNombre(q);
  if (!t) return null;
  return [c.nombre, ...c.alias].find((n) => ` ${normalizarNombre(n)}`.includes(` ${t}`)) ?? null;
}
const consultasEn30 = (n: number) => `${n} ${n === 1 ? "consulta" : "consultas"} en 30 días`;

export function armarSugerencias(q: string, existentes: readonly CiudadExistente[], lugares: readonly LugarMapbox[]): SugerenciaCiudad[] {
  const region = new Map<string, string>();
  const vistas: { e: CiudadExistente; como: string }[] = [];
  const nuevas: SugerenciaCiudad[] = [];
  for (const l of lugares) {
    const e = existenteDe([l.nombre, nombreCorto(l)], existentes);
    if (!e) {
      nuevas.push({ tipo: "nueva", clave: `${slugDeCiudad(l.nombre)}:${l.lat.toFixed(3)},${l.lng.toFixed(3)}`, lugar: l, detalle: detalleRegion(l) });
      continue;
    }
    const propia = [e.slug, slugDeCiudad(e.nombre)].some((s) => s === slugDeCiudad(l.nombre) || s === slugDeCiudad(nombreCorto(l)));
    if (propia && !region.has(e.slug)) region.set(e.slug, detalleRegion(l));
    vistas.push({ e, como: propia ? e.nombre : l.nombre });
  }
  const locales = existentes
    .map((e) => ({ e, como: coincide(q, e) }))
    .filter((x): x is { e: CiudadExistente; como: string } => x.como !== null)
    .sort((a, b) => b.e.consultas - a.e.consultas || a.e.nombre.localeCompare(b.e.nombre, "es"));
  const ya: SugerenciaCiudad[] = [];
  for (const { e, como } of [...locales, ...vistas]) {
    const deOtra = slugDeCiudad(como) !== slugDeCiudad(e.nombre);
    if (ya.some((s) => s.tipo === "existente" && s.slug === e.slug && slugDeCiudad(s.nombre) === slugDeCiudad(como))) continue;
    ya.push({ tipo: "existente", slug: e.slug, nombre: como, estado: e.estado, pildora: !deOtra, detalle: deOtra ? `Cuenta con ${e.nombre}` : region.get(e.slug) || consultasEn30(e.consultas) });
  }
  return [...ya, ...nuevas].slice(0, MAX_SUGERENCIAS);
}

/**
 * Lo que la hoja enseña al elegir una ciudad (pantalla C) y lo que «Abrir» guarda. `desde`: la fila que se abre (una detectada u oculta); null,
 * una ciudad nueva. `municipios` null: Mapbox no dijo qué municipios caen en el área.
 */
export type Alta = {
  desde: string | null;
  nombre: string;
  largo: string;
  region: string;
  lat: number;
  lng: number;
  zona: string;
  hora: { titulo: string; detalle: string | null };
  radioKm: number;
  municipios: string[] | null;
  alcaldias: string[];
  area: { titulo: string; detalle: string };
  mapa: string | null;
};

/** El mapa chico de la hoja: 5:2 (el de «Dónde» en las fichas), con el radio del área a 0,4 del alto. */
export const MAPA_AREA = { ancho: 600, alto: 240, radio: 96 } as const;
/** El zoom de la imagen para que el radio del área mida `MAPA_AREA.radio` px (teselas de 512: 78 271,517 m por px en el ecuador a zoom 0). */
export function zoomParaArea(lat: number, radioKm: number): number {
  const metrosPorPx = (radioKm * 1000) / MAPA_AREA.radio;
  const z = Math.log2((78271.517 * Math.cos((lat * Math.PI) / 180)) / metrosPorPx);
  return Math.round(Math.min(16, Math.max(1, z)) * 100) / 100;
}
/**
 * La imagen de Mapbox (Static Images API, el estilo claro genérico de las miniaturas, `mapaEstatico.ts`) centrada en la ciudad. El área y el pin
 * se dibujan encima en la página (un SVG del mismo tamaño), así se ven aunque la imagen no cargue. null sin token.
 */
export function urlMapaArea(centro: Punto, radioKm: number, token: string | null): string | null {
  if (!token) return null;
  const z = zoomParaArea(centro.lat, radioKm);
  return `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${redondo(centro.lng)},${redondo(centro.lat)},${z},0/${MAPA_AREA.ancho}x${MAPA_AREA.alto}@2x?access_token=${token}`;
}
