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
 *   · artista { nombre, disciplina?, detalle?, tipo?, ciudad?, redes?, url?, leida?, municipio?, obra? }   (municipio y obra: OL-430)
 *   · evento  { titulo, inicio, fin?, lugar, direccion?, municipio?, precio?, descripcion?, ciudad?, url?, leida? }   (OL-429)
 *   · cartel  { evento_id, titulo, inicio, lugar, imagen, pagina, url, ciudad?, leida? }   (OL-444: el cartel ya publicado de un evento que no
 *             tiene; `imagen` es el archivo, `pagina` (= `url`) la página donde aparece; aceptarlo lo sube a Storage y lo pone en el evento)
 * `url` es la página de la fuente que la rutina abrió y leyó (en un evento, la agenda: queda como `eventos.fuente_url` al publicarlo);
 * `leida`, cuándo (ISO). `redes`, enlaces (texto o { url }). En un evento, `inicio` y `fin` son ISO; `lugar`, el nombre exacto del lugar
 * registrado si la agenda es en uno, o el sitio como lo escribe la agenda; `precio`, «Gratis», «Cooperación solidaria» o el texto del costo;
 * `descripcion`, una o dos frases propias de la rutina (nunca copiadas). En un artista (OL-430), `detalle` es su especialidad (hasta 40, como la
 * ficha), `municipio` lo que la fuente dice de dónde trabaja y `obra` una frase propia sobre lo que la fuente dice de su obra: no van a la
 * ficha mínima que nace al aceptar; quedan para nutrirla después.
 * Un evento trae además, desde OL-433 (todo opcional; lo de antes se lee igual), cómo ocurre (lo lee `src/lib/rutinas/formaEvento.ts`, que
 * también da la frase para la tarjeta, `etiquetaDeForma`): `clase` (puntual · exposicion · taller · festival); `marco` { id, titulo } (acto de un
 * festival registrado); `marco_propuesto` (id de la propuesta de su festival), `programa` y `espera` (la frase de un acto aceptado antes que su
 * festival); en un festival, `actos` y `termina`; `sesiones` [{ inicio, fin? }] (un taller o días seguidos); `serie` { fechas, cada };
 * en la inauguración de una exposición, `termina` y `exposicion`; `variantes` (otros títulos de la misma función); `lat`, `lng` y
 * `direccion_mapa` (el punto que el mapa dio al sitio dentro de la ciudad); desde OL-462, `artistas` [{ nombre, id?, propuesta? }] (quién se
 * presenta: al publicarse se liga a las fichas que ya existen) e `imagen` también fuera de la cartelera (la sube el cargador de la Mac,
 * `scripts/instituciones/proponer.ts`).
 */

export const TIPOS_PROPUESTA = ["lugar", "evento", "artista", "cartel"] as const;
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
 * Por fuente: primero las que ya tuvieron una tanda aprobada en una corrida anterior (fuentes en las que ya se confió), luego las que traen más
 * por revisar y después por nombre. Dentro de cada fuente, en el orden en que llegan (la base las da por cuándo se propusieron).
 */
export function agruparPorFuente<T extends Pick<Propuesta, "fuente">>(propuestas: readonly T[], fuentesConTanda: readonly string[] = []): { fuente: string; propuestas: T[] }[] {
  const grupos = new Map<string, T[]>();
  for (const p of propuestas) grupos.set(p.fuente, [...(grupos.get(p.fuente) ?? []), p]);
  const conTanda = (f: string) => (fuentesConTanda.includes(f) ? 0 : 1);
  return [...grupos]
    .map(([fuente, lista]) => ({ fuente, propuestas: lista }))
    .sort((a, b) => conTanda(a.fuente) - conTanda(b.fuente) || b.propuestas.length - a.propuestas.length || a.fuente.localeCompare(b.fuente, "es"));
}

/**
 * «Aceptar las N» de una búsqueda (en su cabecera) y «Aceptar las N de esta fuente» (OL-438; founder: «por qué no hay un botón para aceptar
 * todas las propuestas de una búsqueda de api» y «sí, agregar aceptar todas»): siempre que queden 2 o más por decidir. Se retira la regla de
 * OL-427 de que la primera tanda de una fuente fuera una por una (solo se ofrecía donde la fuente ya tuvo una tanda aceptada en una corrida
 * anterior, `fuentes_con_tanda`): ninguna fuente la tenía y el founder no veía el botón en ninguna bandeja. Rechazar sigue una por una, con su
 * motivo (es lo que enseña a la rutina). `deLaBusqueda`: en una fuente bajo la cabecera de su búsqueda, lo que queda en toda la búsqueda; si la
 * fuente es todo lo que queda, su botón repetiría el de la cabecera y no sale.
 */
export function ofrecerTodas(quedan: number, deLaBusqueda?: number): boolean {
  return quedan > 1 && (deLaBusqueda === undefined || quedan < deLaBusqueda);
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

/** El nombre de la propuesta: el del lugar o artista, o el título del evento (también el de un cartel: es el de su evento). */
export function nombreDe(p: Pick<Propuesta, "tipo" | "datos">): string {
  if (p.tipo === "cartel") return texto(p.datos.titulo, 120) ? `el cartel de «${texto(p.datos.titulo, 120)}»` : "el cartel";
  return texto(p.tipo === "evento" ? p.datos.titulo : p.datos.nombre, 120) || "Sin nombre";
}

/** `imagen` (OL-444): en un cartel, el archivo que se propone, para abrirlo antes de aceptarlo. */
export type VistaPropuesta = { que: string; titulo: string; linea: string | null; fuente: { texto: string; url: string } | null; leida: string | null; imagen?: string | null };

/**
 * Lo que dice la tarjeta de una propuesta: «Foro · propuesto por la rutina», el nombre, dónde, la fuente con su enlace y cuándo se leyó. En un
 * evento, `omitir` quita de la línea el cuándo o el dónde cuando la línea de su forma ya lo dice (OL-434: los días de un taller, el periodo de
 * un festival, cuyas sedes son las de sus actos).
 */
export function vistaPropuesta(
  p: Pick<Propuesta, "tipo" | "datos" | "creado_en">,
  ciudad: string | null,
  ahora: Date = new Date(),
  omitir: { cuando?: boolean; donde?: boolean } = {},
): VistaPropuesta {
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
  const cuando = !omitir.cuando && inicio && !Number.isNaN(Date.parse(inicio)) ? `${diaMes(inicio, ahora)}, ${horaCorta(inicio, ZONA_INICIAL)}` : "";
  const donde = omitir.donde ? "" : texto(d.lugar, 120);
  const linea = [cuando, donde].filter(Boolean).join(" · ") || null;
  if (p.tipo === "cartel") return { que: "Cartel · propuesto por la rutina", titulo: texto(d.titulo, 120) || "Sin título", linea, fuente, leida, imagen: urlSegura(d.imagen) };
  return { que: "Evento · propuesto por la rutina", titulo: nombreDe(p), linea, fuente, leida };
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
    // La ficha admite hasta 40 (`LIMITES_ARTISTA.detalle`): más largo, `validarArtista` no la dejaría aceptar.
    detalle: texto(d.detalle, 40),
    tipo: texto(d.tipo, 20) || "solista",
    ciudad: ciudadCanonica(texto(d.ciudad, 80) || ciudad || ""),
    enlaces: JSON.stringify(redesDe(d.redes)),
  };
}

/**
 * La línea que queda al decidir. Un evento aceptado ya se publica al aceptarlo (OL-429), como un lugar o un artista: «Aceptaste …» y «Ver
 * ficha». `nota`, si el servidor la manda (un evento aceptado que no se pudo publicar en ese momento, un acto que espera a su festival, lo que
 * se publicó con un festival), va detrás como continuación de la frase: «Se publica cuando aceptes el festival «X».» → «… · se publica cuando
 * aceptes el festival «X»».
 */
export function textoDecidida(nombre: string, decision: { aceptada: true; tipo: TipoPropuesta } | { aceptada: false; motivo: MotivoRechazo }, nota?: string): string {
  if (!decision.aceptada) return `Rechazaste ${nombre} · ${MOTIVOS_RECHAZO.find((m) => m.valor === decision.motivo)?.etiqueta.toLowerCase() ?? "otro"}`;
  const sigue = (nota ?? "").trim().replace(/\.$/, "");
  return sigue ? `Aceptaste ${nombre} · ${sigue.charAt(0).toLowerCase()}${sigue.slice(1)}` : `Aceptaste ${nombre}`;
}

// ---------- festivales y sus actos (OL-433, OL-434) ----------
/**
 * «Aceptar» de la propuesta de un festival: si ya hay actos suyos aceptados que esperan, dice que se publican con él («Aceptar el festival y sus
 * 3 actos aceptados»).
 */
export function textoAceptarFestival(aceptados: number): string {
  if (aceptados <= 0) return "Aceptar";
  return aceptados === 1 ? "Aceptar el festival y su acto aceptado" : `Aceptar el festival y sus ${aceptados} actos aceptados`;
}

/**
 * Lo que se publicó al aceptar un festival, para la línea de lo hecho: sus actos que esperaban y se publicaron con él y los que no se pudieron
 * publicar ahora (los publica la siguiente corrida de agendas, como cualquier evento aceptado sin publicar). Sin actos que esperaban, nada.
 */
export function notaDeFestival(publicados: number, sinPublicar: number): string | undefined {
  const de = (n: number) => (n === 1 ? "su acto" : `sus ${n} actos`);
  if (!publicados && !sinPublicar) return undefined;
  if (!sinPublicar) return `se publicó con ${de(publicados)}`;
  if (!publicados) return `${sinPublicar === 1 ? "su acto se publica" : `sus ${sinPublicar} actos se publican`} con la siguiente corrida de agendas`;
  return `se publicó con ${publicados} de sus ${publicados + sinPublicar} actos; ${sinPublicar === 1 ? "el otro se publica" : "los demás se publican"} con la siguiente corrida de agendas`;
}

/** La línea de un acto que esperaba a su festival y se publicó con él, al aceptar el festival en la misma bandeja. */
export const textoActoPublicado = (nombre: string): string => `Aceptaste ${nombre} · se publicó con el festival`;

/**
 * Las propuestas de una bandeja por fuente (`agruparPorFuente`) con los actos de un festival propuesto justo debajo de él (OL-434): el festival
 * va antes que sus actos aunque un acto haya llegado por otra fuente o antes que él. Un acto cuyo festival no está en la lista va suelto en su
 * fuente. Cada grupo cuenta sus actos para el orden.
 */
export function agruparConActos<T extends { id: string; fuente: string; festival?: string | null }>(propuestas: readonly T[], fuentesConTanda: readonly string[] = []): { fuente: string; propuestas: T[] }[] {
  const ids = new Set(propuestas.map((p) => p.id));
  // Solo bajo un festival que va suelto: así ninguna queda fuera de la lista (un «festival» que fuera a su vez acto de otro).
  const sueltas = new Set(propuestas.filter((p) => !p.festival || p.festival === p.id || !ids.has(p.festival)).map((p) => p.id));
  const bajo = (p: T) => !sueltas.has(p.id) && sueltas.has(p.festival ?? "");
  const actos = new Map<string, T[]>();
  for (const p of propuestas) if (bajo(p)) actos.set(p.festival!, [...(actos.get(p.festival!) ?? []), p]);
  const conTanda = (f: string) => (fuentesConTanda.includes(f) ? 0 : 1);
  const grupos = new Map<string, T[]>();
  for (const p of propuestas) if (!bajo(p)) grupos.set(p.fuente, [...(grupos.get(p.fuente) ?? []), p, ...(actos.get(p.id) ?? [])]);
  return [...grupos]
    .map(([fuente, lista]) => ({ fuente, propuestas: lista }))
    .sort((a, b) => conTanda(a.fuente) - conTanda(b.fuente) || b.propuestas.length - a.propuestas.length || a.fuente.localeCompare(b.fuente, "es"));
}

// ---------- «Aceptar todas» (OL-438) ----------
/**
 * El orden de una tanda: el de la pantalla, fuente por fuente (`agruparConActos`), así un festival se acepta antes que sus actos (después
 * cuelgan de él directamente) aunque un acto haya llegado antes que él o por otra fuente.
 */
export function enOrdenDeAceptar<T extends { id: string; fuente: string; festival?: string | null }>(propuestas: readonly T[], fuentesConTanda: readonly string[] = []): T[] {
  return agruparConActos(propuestas, fuentesConTanda).flatMap((g) => g.propuestas);
}

/** Lo que la tanda mira de cada tarjeta justo antes de mandarla. */
export type EstadoEnTanda = { decidida?: { rechazo: boolean } | null; enCamino?: string | null };
export type PasoDeTanda = { accion: "aceptar" } | { accion: "saltar" } | { accion: "dejar"; razon: string };

/** La razón de un acto que se queda por revisar porque su festival, en la misma bandeja, no se aceptó. */
export const textoActoSinFestival = (festival: string): string => `Su festival «${festival}» no se aceptó: acéptalo antes que este acto.`;

/**
 * En una tanda, qué hacer con la siguiente justo antes de mandarla (lo decidido a mano mientras corre cuenta): `saltar` la que ya se decidió o
 * va en camino; `dejar`, con su razón, un acto cuyo festival está en esta bandeja y no se aceptó (falló antes en la misma tanda o sigue por
 * decidir): aceptarlo lo dejaría esperando a un festival que quizá se rechace; si no, `aceptar`. Un acto cuyo festival se rechazó se acepta
 * (se publica suelto, OL-433). `festivalAqui` da el nombre del festival si está en esta bandeja.
 */
export function pasoDeTanda(
  p: { id: string; festival?: string | null },
  estado: (id: string) => EstadoEnTanda | undefined,
  festivalAqui: (id: string) => string | undefined,
): PasoDeTanda {
  const propio = estado(p.id);
  if (propio?.decidida || propio?.enCamino) return { accion: "saltar" };
  const nombre = p.festival && p.festival !== p.id ? festivalAqui(p.festival) : undefined;
  if (nombre === undefined) return { accion: "aceptar" };
  const suyo = estado(p.festival!)?.decidida;
  return suyo ? { accion: "aceptar" } : { accion: "dejar", razon: textoActoSinFestival(nombre) };
}

const PLURAL: Record<TipoPropuesta, string> = { lugar: "lugares", evento: "eventos", artista: "artistas", cartel: "carteles" };

/**
 * La hoja de «Aceptar las N» de una búsqueda: cuántas, de qué y de qué ciudad, y qué pasa con las que no se puedan publicar. Los ejemplos son
 * los de lo que se acepta: un repetido siempre; un sitio sin punto con lugares o eventos; un acto cuyo festival no se ha aceptado solo si hay
 * actos de un festival propuesto en la misma bandeja.
 */
export function textoConfirmarTodas(propuestas: readonly { tipo: TipoPropuesta; festival?: string | null }[], ciudad: string | null): { que: string; siNo: string } {
  const tipos = new Set(propuestas.map((p) => p.tipo));
  const de = tipos.size === 1 ? ` de ${PLURAL[[...tipos][0]]}` : "";
  const n = propuestas.length;
  const ejemplos = [
    "un repetido",
    ...(tipos.has("lugar") || tipos.has("evento") ? ["un sitio sin punto"] : []),
    ...(propuestas.some((p) => p.festival) ? ["un acto cuyo festival no se ha aceptado"] : []),
    ...(tipos.has("cartel") ? ["una imagen que ya no responde"] : []),
  ];
  return {
    que: `Vas a aceptar ${n === 1 ? "1 propuesta" : `${n} propuestas`}${de}${ciudad ? ` de ${ciudad}` : ""}.`,
    siNo: `Las que no se puedan publicar (${ejemplos.join(", ")}) se quedan por revisar con su razón.`,
  };
}

export const textoAceptarTodas = (n: number): string => `Aceptar las ${n}`;
/** El avance, en el mismo botón: la que va en camino de todas las de la tanda. */
export const textoAvanceTodas = (va: number, de: number): string => `Aceptando ${va} de ${de}…`;

/** La cabecera al terminar una tanda: cuántas se aceptaron en ella y cuántas quedan por revisar en la búsqueda (cuenta en vivo). */
export function textoTandaHecha(aceptadas: number, quedan: number): string {
  const hechas = aceptadas === 0 ? "Ninguna aceptada" : aceptadas === 1 ? "1 aceptada" : `${aceptadas} aceptadas`;
  return quedan > 0 ? `${hechas} · ${quedan} por revisar` : hechas;
}
