import { z } from "zod";
import { etiquetaDisciplina } from "./artistas";
import { ciudadCanonica } from "./ciudad";
import { diaMes, ESTADOS_CORRIDA, TIPOS_CORRIDA } from "./ciudadesAdmin";
import { horaCorta, ZONA_INICIAL } from "./fechas";
import { etiquetaLugar } from "./lugares";

/**
 * La bandeja de propuestas de una corrida (OL-427; doc 57 §4.B): lo que una rutina propone, agrupado por fuente, y cómo se vuelve una ficha
 * al aceptarlo. Lo que la rutina deja en `propuestas.datos` (OL-428 lo escribe así):
 *   · lugar   { nombre, tipo?, detalle?, direccion?, lat?, lng?, ciudad?, redes?, url?, leida? }
 *   · artista { nombre, disciplina?, detalle?, tipo?, ciudad?, redes?, url?, leida? }
 *   · evento  { titulo, inicio, fin?, lugar, direccion?, municipio?, precio?, descripcion?, ciudad?, url?, leida? }   (OL-429)
 * `url` es la página de la fuente que la rutina abrió y leyó (en un evento, la agenda: queda como `eventos.fuente_url` al publicarlo);
 * `leida`, cuándo (ISO). `redes`, enlaces (texto o { url }). En un evento, `inicio` y `fin` son ISO; `lugar`, el nombre exacto del lugar
 * registrado si la agenda es en uno, o el sitio como lo escribe la agenda; `precio`, «Gratis», «Cooperación solidaria» o el texto del costo;
 * `descripcion`, una o dos frases propias de la rutina (nunca copiadas).
 */

export const TIPOS_PROPUESTA = ["lugar", "evento", "artista"] as const;
export type TipoPropuesta = (typeof TIPOS_PROPUESTA)[number];

export const MOTIVOS_RECHAZO = [
  { valor: "duplicado", etiqueta: "Duplicado", detalle: "Ya está en el directorio" },
  { valor: "no_cultural", etiqueta: "No es cultural", detalle: "No es un espacio, evento o artista de cultura" },
  { valor: "fuera_de_la_ciudad", etiqueta: "Fuera de la ciudad", detalle: "Queda en otra ciudad o municipio" },
  { valor: "otro", etiqueta: "Otro", detalle: "Por otra razón" },
] as const;
export type MotivoRechazo = (typeof MOTIVOS_RECHAZO)[number]["valor"];
export function esMotivo(v: unknown): v is MotivoRechazo {
  return MOTIVOS_RECHAZO.some((m) => m.valor === v);
}

const numero = z.coerce.number().catch(0);
const esquemaPropuesta = z.object({
  id: z.string(),
  tipo: z.enum(TIPOS_PROPUESTA),
  fuente: z.string(),
  datos: z.record(z.string(), z.unknown()).catch({}),
  creado_en: z.string(),
});
const esquemaBandeja = z.object({
  corrida: z.object({
    id: z.string(),
    tipo: z.enum(TIPOS_CORRIDA),
    ciudad: z.string().nullable().catch(null),
    ciudad_nombre: z.string().nullable().catch(null),
    estado: z.enum(ESTADOS_CORRIDA),
    creado_en: z.string(),
    tope_usd: numero,
    gasto_usd: numero,
    propuestas: numero,
    aceptadas: numero,
    rechazadas: numero,
    por_revisar: numero,
  }),
  propuestas: z.array(esquemaPropuesta),
  fuentes_con_tanda: z.array(z.string()).catch([]),
});
export type Propuesta = z.infer<typeof esquemaPropuesta>;
export type Bandeja = z.infer<typeof esquemaBandeja>;

/** La bandeja tal como llega de `panel_propuestas`, o null si no trae lo que la pantalla necesita. */
export function leerBandeja(datos: unknown): Bandeja | null {
  const r = esquemaBandeja.safeParse(datos);
  return r.success ? r.data : null;
}

/**
 * Por fuente: primero las que ya tuvieron una tanda aprobada (donde se puede aceptar todo de un toque), luego las que traen más por revisar y
 * después por nombre. Dentro de cada fuente, en el orden en que llegan (la base las da por cuándo se propusieron).
 */
export function agruparPorFuente<T extends Pick<Propuesta, "fuente">>(propuestas: readonly T[], fuentesConTanda: readonly string[] = []): { fuente: string; propuestas: T[] }[] {
  const grupos = new Map<string, T[]>();
  for (const p of propuestas) grupos.set(p.fuente, [...(grupos.get(p.fuente) ?? []), p]);
  const conTanda = (f: string) => (fuentesConTanda.includes(f) ? 0 : 1);
  return [...grupos]
    .map(([fuente, lista]) => ({ fuente, propuestas: lista }))
    .sort((a, b) => conTanda(a.fuente) - conTanda(b.fuente) || b.propuestas.length - a.propuestas.length || a.fuente.localeCompare(b.fuente, "es"));
}

/** «Aceptar las N de esta fuente» solo donde la fuente ya tuvo una tanda aprobada y queda más de una (la primera tanda va una por una). */
export function ofrecerTodas(fuente: string, quedan: number, fuentesConTanda: readonly string[]): boolean {
  return quedan > 1 && fuentesConTanda.includes(fuente);
}

// ---------- lo que se lee de `datos` ----------
const texto = (v: unknown, tope = 300): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, tope) : "");
const coordenada = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
/** Solo enlaces http(s): lo que se lee de la web es dato, nunca un `javascript:`. */
export function urlSegura(v: unknown): string | null {
  const t = texto(v, 500);
  if (!t) return null;
  try {
    const u = new URL(t);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}
function redesDe(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((r) => urlSegura(typeof r === "string" ? r : (r as { url?: unknown } | null)?.url)).filter((u): u is string => !!u).slice(0, 8);
}

/** El nombre de la propuesta: el del lugar o artista, o el título del evento. */
export function nombreDe(p: Pick<Propuesta, "tipo" | "datos">): string {
  return texto(p.tipo === "evento" ? p.datos.titulo : p.datos.nombre, 120) || "Sin nombre";
}

export type VistaPropuesta = { que: string; titulo: string; linea: string | null; fuente: { texto: string; url: string } | null; leida: string | null };

/** Lo que dice la tarjeta de una propuesta: «Foro · propuesto por la rutina», el nombre, dónde, la fuente con su enlace y cuándo se leyó. */
export function vistaPropuesta(p: Pick<Propuesta, "tipo" | "datos" | "creado_en">, ciudad: string | null, ahora: Date = new Date()): VistaPropuesta {
  const d = p.datos;
  const url = urlSegura(d.url);
  const fuente = url ? { texto: new URL(url).hostname.replace(/^www\./, ""), url } : null;
  const leidaEn = texto(d.leida, 40);
  const leida = `leída el ${diaMes(leidaEn && !Number.isNaN(Date.parse(leidaEn)) ? leidaEn : p.creado_en, ahora)}`;
  const enCiudad = (lugar: string) => {
    const c = texto(d.ciudad, 80) || ciudad || "";
    return c && !lugar.toLowerCase().includes(c.toLowerCase()) ? (lugar ? `${lugar}, ${c}` : c) : lugar;
  };
  if (p.tipo === "lugar") {
    const tipo = texto(d.tipo, 40);
    return { que: `${tipo ? etiquetaLugar({ tipo, detalle: texto(d.detalle, 40) || null }) : "Lugar"} · propuesto por la rutina`, titulo: nombreDe(p), linea: enCiudad(texto(d.direccion, 200)) || null, fuente, leida };
  }
  if (p.tipo === "artista") {
    const disciplina = texto(d.disciplina, 40);
    return { que: `${disciplina ? etiquetaDisciplina(disciplina) : "Artista"} · propuesto por la rutina`, titulo: nombreDe(p), linea: enCiudad("") || null, fuente, leida };
  }
  const inicio = texto(d.inicio, 40);
  const cuando = inicio && !Number.isNaN(Date.parse(inicio)) ? `${diaMes(inicio, ahora)}, ${horaCorta(inicio, ZONA_INICIAL)}` : "";
  const donde = texto(d.lugar, 120);
  return { que: "Evento · propuesto por la rutina", titulo: nombreDe(p), linea: [cuando, donde].filter(Boolean).join(" · ") || null, fuente, leida };
}

// ---------- de la propuesta a la ficha ----------
/** Lo que se le pasa a `validarLugar` (la misma validación del alta de lugar): la ciudad de la propuesta o, si no la dice, la de la corrida. */
export function entradaDeLugar(p: Pick<Propuesta, "datos">, ciudad: string | null): Record<string, string> {
  const d = p.datos;
  const lat = coordenada(d.lat), lng = coordenada(d.lng);
  return {
    nombre: texto(d.nombre, 200),
    tipo: texto(d.tipo, 40) || "otro",
    detalle: texto(d.detalle, 60),
    direccion: texto(d.direccion, 300),
    lat: lat === null ? "" : String(lat),
    lng: lng === null ? "" : String(lng),
    ciudad: ciudadCanonica(texto(d.ciudad, 80) || ciudad || ""),
    enlaces: JSON.stringify(redesDe(d.redes)),
    descripcion: "",
  };
}

/** Lo que se le pasa a `validarArtista` (la ficha mínima: nombre, disciplina, ciudad y redes). */
export function entradaDeArtista(p: Pick<Propuesta, "datos">, ciudad: string | null): Record<string, string> {
  const d = p.datos;
  return {
    nombre: texto(d.nombre, 200),
    disciplina: texto(d.disciplina, 40) || "por_completar",
    detalle: texto(d.detalle, 60),
    tipo: texto(d.tipo, 20) || "solista",
    ciudad: ciudadCanonica(texto(d.ciudad, 80) || ciudad || ""),
    enlaces: JSON.stringify(redesDe(d.redes)),
  };
}

/**
 * La línea que queda al decidir. Un evento aceptado ya se publica al aceptarlo (OL-429), como un lugar o un artista: «Aceptaste …» y «Ver
 * ficha». `nota`, si el servidor la manda (un evento aceptado que no se pudo publicar en ese momento), va detrás.
 */
export function textoDecidida(nombre: string, decision: { aceptada: true; tipo: TipoPropuesta } | { aceptada: false; motivo: MotivoRechazo }, nota?: string): string {
  if (!decision.aceptada) return `Rechazaste ${nombre} · ${MOTIVOS_RECHAZO.find((m) => m.valor === decision.motivo)?.etiqueta.toLowerCase() ?? "otro"}`;
  return nota ? `Aceptaste ${nombre} · ${nota}` : `Aceptaste ${nombre}`;
}
