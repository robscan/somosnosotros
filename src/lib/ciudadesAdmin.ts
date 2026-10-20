import { z } from "zod";
import { diaLocal, horaCorta, ZONA_INICIAL } from "./fechas";
import { contar, unir } from "./panel";

/**
 * Administración › Ciudades (OL-427; doc 57 §4.B; prototipo firmado OL-425, bitácora 458): lo que se calcula y se escribe sin tocar la base,
 * para poder probarlo. Los datos llegan de `panel_ciudades()` y `panel_propuestas()` (migración 20261020140000_ciudades.sql). La rutina que
 * corre con la API es OL-428: aquí un botón solo deja una corrida «pendiente» con su tope, y la pantalla lo dice así.
 */

// ---------- lo que devuelve la base ----------
const numero = z.coerce.number().catch(0);
const fecha = z.string().nullable().catch(null);
const objeto = z.record(z.string(), z.unknown()).catch({});

export const ESTADOS_CIUDAD = ["abierta", "detectada", "investigando", "cerrada"] as const;
export type EstadoCiudad = (typeof ESTADOS_CIUDAD)[number];
export const TIPOS_CORRIDA = ["lugares", "agendas", "artistas", "showcase"] as const;
export type TipoCorrida = (typeof TIPOS_CORRIDA)[number];
export type TipoBoton = Exclude<TipoCorrida, "showcase">;
export const ESTADOS_CORRIDA = ["pendiente", "corriendo", "terminada", "fallida", "cancelada"] as const;
export type EstadoCorrida = (typeof ESTADOS_CORRIDA)[number];

const esquemaCiudad = z.object({
  slug: z.string(),
  nombre: z.string(),
  estado: z.enum(ESTADOS_CIUDAD).catch("detectada"),
  lat: z.number().nullable().catch(null),
  lng: z.number().nullable().catch(null),
  zona: z.string().catch(ZONA_INICIAL),
  creado_en: z.string(),
  consultas: numero,
});
const esquemaCorrida = z.object({
  id: z.string(),
  tipo: z.enum(TIPOS_CORRIDA),
  ciudad: z.string().nullable().catch(null),
  parametros: objeto,
  tope_usd: numero,
  gasto_usd: numero,
  estado: z.enum(ESTADOS_CORRIDA),
  resumen: objeto,
  creado_en: z.string(),
  inicio: fecha,
  fin: fecha,
  propuestas: numero,
  aceptadas: numero,
  rechazadas: numero,
  por_revisar: numero,
});
const esquemaPanel = z.object({
  ciudades: z.array(esquemaCiudad),
  corridas: z.array(esquemaCorrida),
  credito: z.object({ usd: numero, vence: z.string().nullable().catch(null), gastado: numero }),
});
export type CiudadPanel = z.infer<typeof esquemaCiudad>;
export type CorridaPanel = z.infer<typeof esquemaCorrida>;
export type PanelCiudades = z.infer<typeof esquemaPanel>;

/** El panel tal como llega de la base, o null si no trae lo que la pantalla necesita (entonces se dice que no se pudo leer). */
export function leerPanelCiudades(datos: unknown): PanelCiudades | null {
  const r = esquemaPanel.safeParse(datos);
  return r.success ? r.data : null;
}

// ---------- los tres botones, en el orden del founder ----------
export const BOTONES: readonly { tipo: TipoBoton; verbo: string }[] = [
  { tipo: "lugares", verbo: "Buscar lugares" },
  { tipo: "agendas", verbo: "Buscar agendas y eventos" },
  { tipo: "artistas", verbo: "Buscar artistas" },
];

/** Lo que dice la hoja de cada botón: qué hace, con qué fuentes (en orden) y cuánto se estima. Las claves de las fuentes viajan en la corrida. */
export const HOJAS: Record<TipoBoton, { que: string; fuentes: readonly { clave: string; texto: (ciudad: string) => string }[]; estimado: string }> = {
  lugares: {
    que: "Busca los espacios culturales de la ciudad y te los propone uno por uno: nombre, tipo, dirección en el mapa, redes y de dónde salió. Nada se publica hasta que lo aceptas.",
    fuentes: [
      { clave: "sic", texto: () => "Catálogo de espacios culturales del Sistema de Información Cultural, por estado" },
      { clave: "cultura", texto: () => "Páginas de la Secretaría de Cultura del estado y del municipio" },
      { clave: "web", texto: () => "Búsqueda web" },
    ],
    estimado: "Se estima entre 1 y 3 USD.",
  },
  agendas: {
    que: "Busca las agendas que juntan los eventos del mes, las guarda como fuentes y lee sus eventos; si un lugar no existe, te propone darlo de alta. Cada mes se vuelve a correr sobre las fuentes guardadas.",
    fuentes: [
      { clave: "agenda-cultura", texto: () => "Agenda de la Secretaría de Cultura del estado y del municipio" },
      { clave: "universidades-museos", texto: () => "Universidades y museos" },
      { clave: "web", texto: (ciudad) => `Búsqueda web: «agenda cultural ${ciudad}»` },
    ],
    estimado: "Se estima entre 1 y 5 USD.",
  },
  artistas: {
    que: "Busca catálogos como el CAPO (padrones de creadores, programas de estímulo, directorios de festivales) y propone fichas mínimas: nombre, disciplina, ciudad, enlace y fuente.",
    fuentes: [
      { clave: "padrones", texto: () => "Padrón estatal de creadores y programas de estímulo" },
      { clave: "festivales", texto: () => "Directorios de festivales" },
      { clave: "web", texto: () => "Búsqueda web" },
    ],
    estimado: "Se estima entre 1 y 3 USD.",
  },
};

export const TOPE_POR_DEFECTO = 3;
export const TOPE_MAXIMO = 50;

/** «3,00» → 3; «3.5» → 3.5. null si no es un tope válido (mayor que 0 y hasta 50, con dos decimales como mucho). */
export function leerTope(texto: string): number | null {
  const limpio = texto.trim().replace(/\s+/g, "").replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(limpio)) return null;
  const n = Number(limpio);
  return n > 0 && n <= TOPE_MAXIMO ? n : null;
}

/** Qué dice el campo del tope si no vale. */
export function errorTope(texto: string): string | null {
  if (!texto.trim()) return "Escribe el tope en dólares.";
  return leerTope(texto) === null ? `Un tope de más de 0 y hasta ${TOPE_MAXIMO} USD, como 3,00.` : null;
}

// ---------- números y fechas ----------
/** «3,00»: dos decimales con coma, como en el prototipo firmado. */
export function usd(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2).replace(".", ",");
}

/** «200» si es entero, «187,40» si no: el crédito de la portada de Corridas. */
export function usdCorto(n: number): string {
  return Number.isInteger(n) ? cifra(n) : usd(n);
}

/** «1 932»: miles con un espacio que no se parte, como en el prototipo firmado. */
export function cifra(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
}

/** «18 oct» (con año si no es el actual). */
export function diaMes(iso: string, ahora: Date = new Date(), zona: string = ZONA_INICIAL): string {
  const d = new Date(iso);
  const mismoAnio = diaLocal(d, zona).slice(0, 4) === diaLocal(ahora, zona).slice(0, 4);
  return new Intl.DateTimeFormat("es-MX", { timeZone: zona, day: "numeric", month: "short", ...(mismoAnio ? {} : { year: "numeric" }) })
    .format(d)
    .replace(/[.,]/g, "")
    .replace(/\bde\s+/g, "");
}

/** «hoy, 10:42 am» · «ayer, 9:15 pm» · «18 oct». */
export function cuando(iso: string, ahora: Date = new Date(), zona: string = ZONA_INICIAL): string {
  const dia = diaLocal(new Date(iso), zona);
  const hoy = diaLocal(ahora, zona);
  if (dia === hoy) return `hoy, ${horaCorta(iso, zona)}`;
  if (dia === diaLocal(new Date(ahora.getTime() - 86400000), zona)) return `ayer, ${horaCorta(iso, zona)}`;
  return diaMes(iso, ahora, zona);
}

const mayuscula = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

// ---------- una ciudad ----------
export const ETIQUETA_ESTADO: Record<EstadoCiudad, string> = { abierta: "Abierta", detectada: "Detectada", investigando: "Investigando", cerrada: "Cerrada" };

/** «14 consultas en 30 días · 0 lugares · 0 eventos próximos · 0 artistas». */
export function cifrasCiudad(c: { consultas: number; lugares: number; eventos: number; artistas: number }): string {
  const n = (k: number, uno: string, varios: string) => `${cifra(k)} ${k === 1 ? uno : varios}`;
  return [n(c.consultas, "consulta en 30 días", "consultas en 30 días"), n(c.lugares, "lugar", "lugares"), n(c.eventos, "evento próximo", "eventos próximos"), n(c.artistas, "artista", "artistas")].join(" · ");
}

const enCurso = (c: Pick<CorridaPanel, "estado">) => c.estado === "pendiente" || c.estado === "corriendo";

/** La línea de la última investigación: «Investigando desde hoy, 10:42 am» · «Última investigación: 18 oct» · «Nunca investigada · detectada el 12 oct». */
export function lineaInvestigacion(ciudad: Pick<CiudadPanel, "estado" | "creado_en">, corridas: CorridaPanel[], ahora: Date = new Date()): string {
  const corriendo = corridas.find((c) => c.estado === "corriendo");
  if (corriendo) return `Investigando desde ${cuando(corriendo.inicio ?? corriendo.creado_en, ahora)}`;
  const hechas = corridas.filter((c) => c.estado === "terminada" || c.estado === "fallida").sort((a, b) => Date.parse(b.fin ?? b.creado_en) - Date.parse(a.fin ?? a.creado_en));
  if (hechas.length) return `Última investigación: ${diaMes(hechas[0].fin ?? hechas[0].creado_en, ahora)}`;
  const pendiente = corridas.find((c) => c.estado === "pendiente");
  const nunca = ciudad.estado === "detectada" ? `Nunca investigada · detectada el ${diaMes(ciudad.creado_en, ahora)}` : "Nunca investigada";
  return pendiente ? `${nunca} · una búsqueda espera turno` : nunca;
}

/** Lo que dice cada botón de su última corrida. */
export function textoBoton(c: CorridaPanel | null | undefined, ahora: Date = new Date()): string {
  if (!c) return "Sin correr";
  if (c.estado === "pendiente") return `Pendiente de correr · tope ${usd(c.tope_usd)} USD`;
  if (c.estado === "corriendo") return unir(["Corriendo", pasoDe(c), `${usd(c.gasto_usd)} de ${usd(c.tope_usd)} USD`]);
  if (c.estado === "cancelada") return `Cancelada el ${diaMes(c.fin ?? c.creado_en, ahora)}`;
  const dia = diaMes(c.fin ?? c.creado_en, ahora);
  if (c.estado === "fallida") return unir([`Falló el ${dia}`, contar(c.propuestas, "propuesto", "propuestos"), `${usd(c.gasto_usd)} USD`]);
  return unir([
    dia,
    llegoAlTope(c) ? "llegó al tope" : null,
    `${c.propuestas} ${c.propuestas === 1 ? "propuesto" : "propuestos"}`,
    contar(c.aceptadas, "aceptado", "aceptados"),
    contar(c.por_revisar, "por revisar", "por revisar"),
    `${usd(c.gasto_usd)} USD`,
  ]);
}

/** El avance que deja la rutina en su resumen, de 0 a 1 (`resumen.avance`), o null si no lo dice. */
export function avanceDe(c: Pick<CorridaPanel, "estado" | "resumen">): number | null {
  if (c.estado !== "corriendo") return null;
  const a = Number(c.resumen.avance);
  return Number.isFinite(a) ? Math.min(1, Math.max(0, a)) : null;
}

/** «3 de 10 meses», si la rutina lo dejó en su resumen (`resumen.paso`). */
function pasoDe(c: Pick<CorridaPanel, "resumen">): string | null {
  return typeof c.resumen.paso === "string" && c.resumen.paso.trim() ? c.resumen.paso.trim().slice(0, 60) : null;
}

const llegoAlTope = (c: Pick<CorridaPanel, "gasto_usd" | "tope_usd">) => c.tope_usd > 0 && c.gasto_usd >= c.tope_usd;

/** La última corrida de cada botón de una ciudad: la que está en curso o, si no, la más reciente. */
export function ultimaPorBoton(corridas: CorridaPanel[], ciudad: string): Record<TipoBoton, CorridaPanel | null> {
  const propias = corridas.filter((c) => c.ciudad === ciudad).sort((a, b) => Date.parse(b.creado_en) - Date.parse(a.creado_en));
  const de = (tipo: TipoBoton) => propias.find((c) => c.tipo === tipo && enCurso(c)) ?? propias.find((c) => c.tipo === tipo) ?? null;
  return { lugares: de("lugares"), agendas: de("agendas"), artistas: de("artistas") };
}

/**
 * El orden de las ciudades (founder, firma de OL-425: «las ciudades con algo por decidir primero»): primero las que tienen propuestas por
 * revisar o una búsqueda en curso; luego las detectadas (falta decidir si se investigan); luego el resto. En cada grupo, por consultas.
 */
export function ordenarCiudades<T extends Pick<CiudadPanel, "slug" | "nombre" | "estado" | "consultas">>(ciudades: readonly T[], corridas: readonly CorridaPanel[]): T[] {
  const rango = (c: T) => {
    const propias = corridas.filter((r) => r.ciudad === c.slug);
    if (propias.some((r) => r.por_revisar > 0 || enCurso(r))) return 0;
    return c.estado === "detectada" ? 1 : 2;
  };
  return [...ciudades].sort((a, b) => rango(a) - rango(b) || b.consultas - a.consultas || a.nombre.localeCompare(b.nombre, "es"));
}

/** El detalle del grupo de la portada: «2 abiertas · 1 investigando · 1 detectada». */
export function resumenCiudades(ciudades: readonly Pick<CiudadPanel, "estado">[]): string {
  const n = (e: EstadoCiudad) => ciudades.filter((c) => c.estado === e).length;
  return unir(
    [contar(n("abierta"), "abierta", "abiertas"), contar(n("investigando"), "investigando", "investigando"), contar(n("detectada"), "detectada", "detectadas"), contar(n("cerrada"), "cerrada", "cerradas")],
    "Sin ciudades todavía",
  );
}

// ---------- propuestas por revisar ----------
const TITULO_BANDEJA: Record<TipoCorrida, string> = { lugares: "Lugares", agendas: "Agendas y eventos", artistas: "Artistas", showcase: "Showcase" };

/** «Lugares de Oaxaca» (el título de la bandeja de una corrida y de su renglón). */
export function tituloBandeja(tipo: TipoCorrida, ciudad: string | null): string {
  return ciudad ? `${TITULO_BANDEJA[tipo]} de ${ciudad}` : TITULO_BANDEJA[tipo];
}

export type PorRevisar = { corrida: string; tipo: TipoCorrida; titulo: string; detalle: string; n: number };

/** Un renglón por corrida con propuestas por revisar, de la más vieja a la más nueva (lo que espera más, primero). */
export function propuestasPorRevisar(corridas: readonly CorridaPanel[], ciudades: readonly Pick<CiudadPanel, "slug" | "nombre">[], ahora: Date = new Date()): PorRevisar[] {
  const nombre = new Map(ciudades.map((c) => [c.slug, c.nombre]));
  return corridas
    .filter((c) => c.por_revisar > 0)
    .sort((a, b) => Date.parse(a.creado_en) - Date.parse(b.creado_en))
    .map((c) => ({
      corrida: c.id,
      tipo: c.tipo,
      titulo: tituloBandeja(c.tipo, c.ciudad ? (nombre.get(c.ciudad) ?? c.ciudad) : null),
      detalle: `${c.por_revisar} por revisar · de la corrida del ${diaMes(c.creado_en, ahora)}`,
      n: c.por_revisar,
    }));
}

/** «Corrida del 18 oct · 14 propuestos · 9 aceptados». */
export function notaBandeja(c: Pick<CorridaPanel, "creado_en" | "propuestas" | "aceptadas" | "rechazadas">, ahora: Date = new Date()): string {
  return unir([`Corrida del ${diaMes(c.creado_en, ahora)}`, `${c.propuestas} ${c.propuestas === 1 ? "propuesto" : "propuestos"}`, contar(c.aceptadas, "aceptado", "aceptados"), contar(c.rechazadas, "rechazado", "rechazados")]);
}

// ---------- la lista de corridas ----------
export const TITULO_TIPO: Record<TipoCorrida, string> = { lugares: "Lugares", agendas: "Agendas y eventos", artistas: "Artistas", showcase: "Showcase" };

/** «Lugares · Oaxaca». */
export function tituloCorrida(c: Pick<CorridaPanel, "tipo">, ciudad: string | null): string {
  return ciudad ? `${TITULO_TIPO[c.tipo]} · ${ciudad}` : TITULO_TIPO[c.tipo];
}

/** El detalle de una corrida en la lista: fecha, parámetros, resultados y gasto. */
export function detalleCorrida(c: CorridaPanel, ahora: Date = new Date()): string {
  const fuentes = Array.isArray(c.parametros.fuentes) ? c.parametros.fuentes.length : 0;
  const parametros = fuentes ? `${fuentes} ${fuentes === 1 ? "fuente" : "fuentes"}` : null;
  if (c.estado === "pendiente") return unir([mayuscula(cuando(c.creado_en, ahora)), parametros, `tope ${usd(c.tope_usd)} USD`]);
  if (c.estado === "corriendo") return unir([mayuscula(cuando(c.inicio ?? c.creado_en, ahora)), pasoDe(c), `${usd(c.gasto_usd)} de ${usd(c.tope_usd)} USD`]);
  if (c.estado === "cancelada") return unir([mayuscula(cuando(c.creado_en, ahora)), parametros, "no corrió"]);
  return unir([
    mayuscula(cuando(c.fin ?? c.creado_en, ahora)),
    parametros,
    `${c.propuestas} ${c.propuestas === 1 ? "propuesto" : "propuestos"}`,
    contar(c.aceptadas, "aceptado", "aceptados"),
    contar(c.por_revisar, "por revisar", "por revisar"),
    `${usd(c.gasto_usd)} USD`,
  ]);
}

export type Pildora = { texto: string; tono: "gris" | "violeta" | "verde" | "naranja" | "rojo" };

/** La píldora de estado de una corrida. */
export function pildoraCorrida(c: Pick<CorridaPanel, "estado" | "gasto_usd" | "tope_usd">): Pildora {
  if (c.estado === "pendiente") return { texto: "Pendiente", tono: "gris" };
  if (c.estado === "corriendo") return { texto: "En curso", tono: "violeta" };
  if (c.estado === "fallida") return { texto: "Falló", tono: "rojo" };
  if (c.estado === "cancelada") return { texto: "Cancelada", tono: "gris" };
  return llegoAlTope(c) ? { texto: "Llegó al tope", tono: "naranja" } : { texto: "Terminada", tono: "verde" };
}

/** Por cuándo: «En curso» (pendientes y corriendo), «Esta semana» (lo de los últimos 7 días) y después por mes («Octubre»). */
export function gruposDeCorridas<T extends Pick<CorridaPanel, "estado" | "creado_en">>(corridas: readonly T[], ahora: Date = new Date(), zona: string = ZONA_INICIAL): { titulo: string; corridas: T[] }[] {
  const grupos = new Map<string, T[]>();
  const semana = ahora.getTime() - 7 * 86400000;
  const anio = diaLocal(ahora, zona).slice(0, 4);
  for (const c of [...corridas].sort((a, b) => Date.parse(b.creado_en) - Date.parse(a.creado_en))) {
    const d = new Date(c.creado_en);
    const titulo = enCurso(c)
      ? "En curso"
      : d.getTime() >= semana
        ? "Esta semana"
        : mayuscula(new Intl.DateTimeFormat("es-MX", { timeZone: zona, month: "long", ...(diaLocal(d, zona).slice(0, 4) === anio ? {} : { year: "numeric" }) }).format(d).replace(/\bde\s+/, ""));
    grupos.set(titulo, [...(grupos.get(titulo) ?? []), c]);
  }
  const orden = (t: string) => (t === "En curso" ? 0 : t === "Esta semana" ? 1 : 2);
  return [...grupos].map(([titulo, lista]) => ({ titulo, corridas: lista })).sort((a, b) => orden(a.titulo) - orden(b.titulo));
}

// ---------- el crédito ----------
/** Lo que queda del crédito, lo gastado y cuántos días faltan para que venza (null si ya venció o no se sabe). */
export function credito(c: PanelCiudades["credito"], ahora: Date = new Date()): { queda: number; inicial: number; gastado: number; vence: string | null; dias: number | null } {
  const vence = c.vence && /^\d{4}-\d{2}-\d{2}$/.test(c.vence) ? c.vence : null;
  const hoy = diaLocal(ahora);
  const dias = vence ? Math.round((Date.parse(`${vence}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86400000) : null;
  return { queda: Math.max(0, c.usd - c.gastado), inicial: c.usd, gastado: c.gastado, vence, dias: dias !== null && dias >= 0 ? dias : null };
}

/** «11 de noviembre». */
export function fechaVence(vence: string): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", day: "numeric", month: "long" }).format(new Date(`${vence}T12:00:00Z`));
}

/** «Crédito: 187,40 USD · vence el 11 de noviembre». */
export function lineaCredito(c: ReturnType<typeof credito>): string {
  return unir([`Crédito: ${usd(c.queda)} USD`, c.vence ? (c.dias === null ? `venció el ${fechaVence(c.vence)}` : `vence el ${fechaVence(c.vence)}`) : null]);
}
