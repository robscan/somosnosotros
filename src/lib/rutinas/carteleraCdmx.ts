import { resolverLugar } from "../cargaEventos";
import { claseSugerida, type Clase } from "../eventos";
import { distanciaKm, type Punto } from "../geo";
import { LIMITES_EVENTO, LIMITES_LUGAR } from "../limites";
import { normalizarNombre, type Tipo } from "../lugares";
import { enlaceSeguro, textoLimpio } from "./candidatos";
import { METROS_MISMO_LUGAR, nombresParecidos } from "./filtros";

/**
 * El lector de la Cartelera de la Ciudad de México (OL-448; cartelera.cdmx.gob.mx, de la Secretaría de Cultura de la ciudad). El founder preguntó
 * por qué la cartelera no se leía (la lectura web de la API la devolvía vacía: se arma con JavaScript) y decidió: «No quites nada, si cultura los
 * mete nosotros también. Me gusta que leas con calma para no tirar el sitio.» La cartelera publica sus datos en una API interna sin llave:
 *   · `POST /api/v1/internal/events/search_builder` (multipart) con `by_event_page=N` trae la página N de eventos (9 por página: id, tipo, nombre,
 *     recinto, miniatura, día y punto) y, con `by_venue_page=N`, la página N de recintos (nombre, imagen, punto) en la misma respuesta.
 *   · La ficha de un evento, `GET /<id>/<dd-mm-aaaa>/<cualquier texto>`, es HTML con `var cdmx_billboard_event_info = {…};`: dirección y punto,
 *     descripción (HTML), tipo, funciones (`schedule`: días y horas), duración, costos, recinto, imagen y enlace del evento.
 * Funciones puras, sin `server-only` ni base (el guion de la Mac también las usa): leer la lista, sacar el objeto de la ficha aunque traiga comillas
 * o llaves dentro de sus textos, convertir cada evento en las filas que la rutina de agendas ya sabe proponer (`agendas.ts`), cruzar el recinto
 * con los lugares de la ciudad y la calma: un solo cliente, una petición a la vez, al menos 1,5 s entre una y otra, reintentos con espera
 * creciente ante 429 y 5xx, y un User-Agent que dice quiénes somos. Nada se filtra por tipo: lo que la cartelera publica, entra.
 */

export const BASE_CARTELERA = "https://cartelera.cdmx.gob.mx";
export const URL_LISTA_CARTELERA = `${BASE_CARTELERA}/api/v1/internal/events/search_builder`;
/** El nombre de la fuente en la bandeja y en las propuestas (`propuestas.fuente`). */
export const NOMBRE_FUENTE_CARTELERA = "Cartelera de la Ciudad de México";
export const USER_AGENT_CARTELERA = "somosnosotrxs.org (lector de cartelera; contacto en el sitio)";
/** La calma: nunca dos peticiones con menos de 1,5 s entre el final de una y el principio de la otra. */
export const ESPERA_MINIMA_MS = 1_500;
/** Ante 429 o 5xx (o sin respuesta): hasta 3 reintentos, esperando 3 s, 6 s y 12 s (o lo que pida `Retry-After`, hasta 60 s). */
export const REINTENTOS_CARTELERA = 3;
export const ESPERA_REINTENTO_MS = 3_000;
export const ESPERA_REINTENTO_MAX_MS = 60_000;
/** Lo que se espera una respuesta antes de darla por perdida. */
export const PLAZO_PETICION_MS = 20_000;
/** Lo que se calcula por petición al repartir el paso: la espera mínima más lo que tarda en responder una ficha (unos 20 KB). */
export const MS_POR_PETICION = 2_500;
/** Lo que se guarda al final de cada paso para proponer y escribir en la base. */
export const RESERVA_PASO_MS = 45_000;
/** Tope de lo que se lee de una respuesta (una ficha pesa unos 20 KB; una página de la lista, unos 8 KB). */
const TOPE_RESPUESTA = 1_000_000;
/** Como mucho, cuántas funciones de un mismo evento se vuelven filas (el tope de sesiones de una propuesta). */
export const MAX_FUNCIONES = 31;
/** Un evento que no es taller ni exposición: sus funciones de los próximos 60 días (las demás llegan en la corrida siguiente). */
export const DIAS_FUNCIONES = 60;

// ---------------------------------------------------------------- utilidades

const objeto = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const cadena = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" && Number.isFinite(v) ? String(v) : "");
const numeroO = (v: unknown): number | null => {
  const x = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isFinite(x) ? x : null;
};
const coordenadas = (lat: unknown, lng: unknown): Punto | null => {
  const a = numeroO(lat), b = numeroO(lng);
  return a !== null && b !== null && a !== 0 && b !== 0 && Math.abs(a) <= 90 && Math.abs(b) <= 180 ? { lat: a, lng: b } : null;
};
const sumarDias = (dia: string, n: number): string => new Date(Date.parse(`${dia}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** «23/10/2026» (o «23-10-2026») → «2026-10-23»; null si no es una fecha de verdad. */
export function diaDeCartelera(v: unknown): string | null {
  const m = /^\s*(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s*$/.exec(cadena(v));
  if (!m) return null;
  const dia = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(`${dia}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== dia ? null : dia;
}
/** «2026-10-23» → «23-10-2026» (como lo pide la dirección de una ficha). */
const diaDeUrl = (dia: string) => `${dia.slice(8, 10)}-${dia.slice(5, 7)}-${dia.slice(0, 4)}`;
/** «9:00» → «09:00»; null si no es una hora. */
export function horaDeCartelera(v: unknown): string | null {
  const m = /^\s*(\d{1,2}):(\d{2})/.exec(cadena(v));
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}
/** «01:30» → 90 minutos; null si no se entiende o es 0. */
export function minutosDeDuracion(v: unknown): number | null {
  const m = /^\s*(\d{1,3}):(\d{2})/.exec(cadena(v));
  const n = m ? Number(m[1]) * 60 + Number(m[2]) : 0;
  return n > 0 ? n : null;
}
const sumarMinutos = (hora: string, minutos: number): string => {
  const total = (Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5)) + minutos) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

/** La dirección de la ficha de un evento (la que queda como fuente y como enlace del evento publicado). */
export function urlFicha(id: string, dia: string, titulo: string): string {
  const slug = normalizarNombre(titulo).replace(/\s+/g, "-").slice(0, 80).replace(/-+$/, "") || "evento";
  return `${BASE_CARTELERA}/${encodeURIComponent(id)}/${diaDeUrl(dia)}/${slug}`;
}

/** Una imagen de la cartelera: solo https de su propio dominio (lo demás no se guarda). */
function imagenDeCartelera(v: unknown): string | null {
  const url = enlaceSeguro(cadena(v).replace(/\\\//g, "/"));
  if (!url) return null;
  const u = new URL(url);
  return u.protocol === "https:" && u.hostname === "cartelera.cdmx.gob.mx" ? u.href : null;
}

// ---------------------------------------------------------------- la calma

export type Calma = {
  pedir: typeof fetch;
  /** Esperar (en las pruebas, un reloj falso que avanza sin esperar de verdad). */
  dormir?: (ms: number) => Promise<void>;
  /** La hora en milisegundos (Date.now). */
  reloj?: () => number;
  /** Cuándo terminó la última petición (la del paso anterior, si se guardó en el cursor). */
  ultima?: number;
};
export type Respuesta = { ok: true; texto: string } | { ok: false; estado: number | null };
export type ClienteCartelera = {
  traer: (url: string, init?: RequestInit) => Promise<Respuesta>;
  /** La página N de la lista (y, si se pide, la N de recintos), ya leída; null si no respondió o no se entiende. */
  lista: (pagina: number, conRecintos: boolean) => Promise<PaginaLista | null>;
  /** La ficha de un evento, ya leída; null si no respondió o no trae el objeto. */
  ficha: (id: string, dia: string, titulo: string) => Promise<FichaCartelera | null>;
  /** Cuándo terminó la última petición (para guardarla en el cursor). */
  ultima: () => number;
  peticiones: () => number;
  /** ¿La última petición que falló fue un «demasiadas peticiones» (429)? Entonces el paso se detiene y sigue en el siguiente. */
  limitada: () => boolean;
};

export const dormirDeVerdad = (ms: number) => new Promise<void>((r) => setTimeout(r, Math.max(0, ms)));

/** Cuánto pide esperar el servidor (`Retry-After` en segundos), o 0. */
function pideEsperar(r: Response | null): number {
  const v = r?.headers.get("retry-after");
  const s = v ? Number(v) : NaN;
  return Number.isFinite(s) && s > 0 ? s * 1000 : 0;
}

/**
 * El único cliente de la cartelera. Cada petición espera a que pasen 1,5 s desde que terminó la anterior (nunca dos a la vez: quien llama
 * espera la respuesta antes de pedir otra); un 429, un 5xx o una petición sin respuesta se reintenta hasta 3 veces con espera creciente; un
 * 404 o cualquier otro 4xx no se reintenta. Siempre con el User-Agent de somosnosotrxs.org.
 */
export function clienteCartelera(o: Calma): ClienteCartelera {
  const dormir = o.dormir ?? dormirDeVerdad;
  const reloj = o.reloj ?? Date.now;
  let ultima = o.ultima ?? 0;
  let peticiones = 0;
  let limitada = false;
  let cola: Promise<unknown> = Promise.resolve();

  async function una(url: string, init: RequestInit): Promise<Respuesta> {
    let estado: number | null = null;
    for (let intento = 0; intento <= REINTENTOS_CARTELERA; intento++) {
      const falta = ultima + ESPERA_MINIMA_MS - reloj();
      if (falta > 0) await dormir(falta);
      peticiones++;
      let r: Response | null = null;
      try {
        r = await o.pedir(url, {
          ...init,
          cache: "no-store",
          signal: AbortSignal.timeout(PLAZO_PETICION_MS),
          headers: { accept: init.method === "POST" ? "application/json" : "text/html", ...(init.headers as Record<string, string> | undefined), "user-agent": USER_AGENT_CARTELERA },
        });
        if (r.ok) {
          const texto = (await r.text()).slice(0, TOPE_RESPUESTA);
          ultima = reloj();
          limitada = false;
          return { ok: true, texto };
        }
      } catch {
        r = null;
      }
      ultima = reloj();
      estado = r?.status ?? null;
      await r?.body?.cancel().catch(() => undefined);
      const reintentar = estado === null || estado === 429 || estado >= 500;
      limitada = estado === 429;
      if (!reintentar || intento === REINTENTOS_CARTELERA) break;
      // La espera del reintento (3 s o más) ya cubre la calma de 1,5 s.
      await dormir(Math.min(ESPERA_REINTENTO_MAX_MS, Math.max(pideEsperar(r), ESPERA_REINTENTO_MS * 2 ** intento)));
    }
    return { ok: false, estado };
  }

  /** Una sola a la vez, aunque alguien llame dos veces sin esperar. */
  const traer = (url: string, init: RequestInit = {}): Promise<Respuesta> => {
    const siguiente = cola.then(() => una(url, init));
    cola = siguiente.catch(() => undefined);
    return siguiente;
  };

  return {
    traer,
    lista: async (pagina, conRecintos) => {
      const cuerpo = new FormData();
      cuerpo.set("by_event_page", String(pagina));
      if (conRecintos) cuerpo.set("by_venue_page", String(pagina));
      const r = await traer(URL_LISTA_CARTELERA, { method: "POST", body: cuerpo });
      return r.ok ? leerLista(r.texto) : null;
    },
    ficha: async (id, dia, titulo) => {
      const r = await traer(urlFicha(id, dia, titulo));
      return r.ok ? leerFicha(r.texto) : null;
    },
    ultima: () => ultima,
    peticiones: () => peticiones,
    limitada: () => limitada,
  };
}

/** Cuántas peticiones caben en un paso de `plazoMs` con la calma, dejando la reserva para proponer y escribir. Al menos una. */
export function peticionesPorPaso(plazoMs: number): number {
  return Math.max(1, Math.floor((plazoMs - RESERVA_PASO_MS) / MS_POR_PETICION));
}

// ---------------------------------------------------------------- la lista

export type ItemLista = { id: string; tipo: string; nombre: string; recinto: string; miniatura: string | null; dia: string; punto: Punto | null };
export type RecintoLista = { id: string; nombre: string; imagen: string | null; punto: Punto | null };
export type PaginaLista = { pagina: number; paginas: number; total: number; eventos: ItemLista[]; recintos: RecintoLista[]; paginasRecintos: number };

/** Una página de la lista (`index_info` o `search_builder`), o null si no es la respuesta que se espera. */
export function leerLista(texto: string): PaginaLista | null {
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return null;
  }
  const data = objeto(objeto(json).data);
  const ev = objeto(data.event_data);
  if (!Array.isArray(ev.event_items_list)) return null;
  const eventos: ItemLista[] = [];
  for (const e of ev.event_items_list) {
    const o = objeto(e);
    const id = cadena(o.event_id).trim();
    const dia = diaDeCartelera(o.event_date_located);
    const nombre = textoLimpio(o.event_name, 300);
    if (!/^\d{1,9}$/.test(id) || !dia || !nombre) continue;
    eventos.push({ id, tipo: textoLimpio(o.event_type, 80), nombre, recinto: textoLimpio(o.event_venue, 200), miniatura: imagenDeCartelera(o.event_thumb), dia, punto: coordenadas(o.event_lat, o.event_lon) });
  }
  const ve = objeto(data.venue_data);
  const recintos: RecintoLista[] = [];
  for (const v of Array.isArray(ve.venue_items_list) ? ve.venue_items_list : []) {
    const o = objeto(v);
    const id = cadena(o.venue_id).trim();
    const nombre = textoLimpio(o.venue_name, LIMITES_LUGAR.nombre);
    if (!/^\d{1,9}$/.test(id) || !nombre) continue;
    recintos.push({ id, nombre, imagen: imagenDeCartelera(o.venue_image), punto: coordenadas(o.venue_lat, o.venue_lon) });
  }
  const entero = (v: unknown, minimo: number) => Math.max(minimo, Math.floor(numeroO(v) ?? minimo));
  return {
    pagina: entero(ev.event_pages_current, 1),
    paginas: entero(ev.event_pages_total, 1),
    total: entero(ev.event_items_total, 0),
    eventos,
    recintos,
    paginasRecintos: entero(ve.venue_pages_total, 0),
  };
}

// ---------------------------------------------------------------- la ficha

/**
 * El texto del objeto JavaScript que se asigna a `nombre` en la página («var nombre = {…};»), con sus llaves en equilibrio: las llaves, comillas
 * y punto y coma dentro de los textos (con sus escapes) no lo cortan. Null si no está o no cierra.
 */
export function extraerObjetoJs(html: string, nombre: string): string | null {
  const m = new RegExp(`(?:^|[^\\w$.])${nombre.replace(/[$]/g, "\\$")}\\s*=\\s*\\{`).exec(html);
  if (!m) return null;
  const inicio = m.index + m[0].length - 1;
  let profundidad = 0;
  let comilla: string | null = null;
  for (let i = inicio; i < html.length; i++) {
    const c = html[i];
    if (comilla) {
      if (c === "\\") i++;
      else if (c === comilla) comilla = null;
      continue;
    }
    if (c === '"' || c === "'") comilla = c;
    else if (c === "{") profundidad++;
    else if (c === "}" && --profundidad === 0) return html.slice(inicio, i + 1);
  }
  return null;
}

export type FuncionCartelera = { dias: string[]; horas: string[] };
export type FichaCartelera = {
  id: string;
  titulo: string;
  /** La descripción ya en texto plano. */
  descripcion: string;
  tipo: { id: string; nombre: string };
  direccion: string | null;
  punto: Punto | null;
  funciones: FuncionCartelera[];
  duracionMin: number | null;
  costos: { nombre: string; precio: string }[];
  recinto: { id: string | null; nombre: string };
  imagen: string | null;
  /** El sitio o la red del evento o del recinto (event_url): se propone como red del lugar si es nuevo. */
  enlace: string | null;
  /** El día con que la cartelera lista el evento (located_date). */
  dia: string | null;
};

/** La ficha de un evento a partir de su página, o null si no trae `cdmx_billboard_event_info` o no se entiende. */
export function leerFicha(html: string): FichaCartelera | null {
  const crudo = extraerObjetoJs(html, "cdmx_billboard_event_info");
  if (!crudo) return null;
  let o: Record<string, unknown>;
  try {
    o = objeto(JSON.parse(crudo));
  } catch {
    return null;
  }
  const id = cadena(o.event_id).trim();
  const titulo = tituloDeCartelera(o.event_name);
  if (!/^\d{1,9}$/.test(id) || !titulo) return null;
  const lugar = objeto(o.event_location);
  const tipo = objeto(o.event_type);
  const funciones: FuncionCartelera[] = [];
  for (const f of Object.values(objeto(o.schedule))) {
    const b = objeto(f);
    const dias = [...new Set((Array.isArray(b.event_dates) ? b.event_dates : []).map(diaDeCartelera).filter((d): d is string => !!d))].sort();
    const horas = [...new Set((Array.isArray(b.event_hours) ? b.event_hours : []).map(horaDeCartelera).filter((h): h is string => !!h))].sort();
    if (dias.length) funciones.push({ dias, horas });
  }
  const costos = Object.values(objeto(o.costs))
    .map((c) => ({ nombre: textoLimpio(objeto(c).cost_name, 200), precio: textoLimpio(objeto(c).cost_price, 80) }))
    .filter((c) => c.precio || c.nombre);
  return {
    id,
    titulo,
    descripcion: textoDeDescripcion(o.event_description),
    tipo: { id: textoLimpio(tipo.id, 60), nombre: textoLimpio(tipo.name, 80) },
    direccion: direccionDeCartelera(lugar.address),
    punto: coordenadas(lugar.lat, lugar.lng),
    funciones,
    duracionMin: minutosDeDuracion(o.event_duration),
    costos,
    recinto: { id: /^\d{1,9}$/.test(cadena(o.venue_id_id).trim()) ? cadena(o.venue_id_id).trim() : null, nombre: textoLimpio(o.venue_name, LIMITES_EVENTO.sitio) },
    imagen: imagenDeCartelera(o.event_image) ?? imagenDeCartelera(o.event_image_thumb),
    enlace: enlaceSeguro(o.event_url),
    dia: diaDeCartelera(o.located_date),
  };
}

/** El título sin el punto final con que la cartelera cierra muchos («Taller. Teatro popular y máscaras.»). */
export function tituloDeCartelera(v: unknown): string {
  return textoLimpio(v, 300).replace(/(?<!\.)\.$/, "").trim().slice(0, LIMITES_EVENTO.titulo);
}

/** La descripción (HTML) en texto plano: sin etiquetas ni entidades, los párrafos separados por un espacio, sin la firma «CarteleraCdMx». */
export function textoDeDescripcion(v: unknown): string {
  const html = cadena(v)
    .replace(/<\s*(br|\/p|\/li|\/blockquote|\/h\d|\/div)\s*\/?>/gi, " ")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ");
  return textoLimpio(html, 4000)
    .replace(/\s*#?\bCartelera\s?CdMx\b\.?/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LIMITES_EVENTO.descripcion);
}

/** «Plaza de San Fernando 17 , Guerrero, Cuauhtémoc, C.P. 06300, Ciudad de México» sin espacios antes de las comas. */
export function direccionDeCartelera(v: unknown): string | null {
  const t = textoLimpio(v, 400).replace(/\s+,/g, ",").replace(/,\s*,/g, ",").replace(/^[\s,]+|[\s,]+$/g, "");
  return t ? t.slice(0, LIMITES_EVENTO.direccion) : null;
}

/** La alcaldía de una dirección de la cartelera: el trozo justo antes de «C.P.» («…, Guerrero, Cuauhtémoc, C.P. 06300, …» → «Cuauhtémoc»). */
export function alcaldiaDeDireccion(direccion: string | null | undefined): string | null {
  const trozos = (direccion ?? "").split(",").map((t) => t.trim());
  const cp = trozos.findIndex((t) => /^c\.?\s*p\.?\s*\d{5}/i.test(t));
  const antes = cp > 0 ? trozos[cp - 1] : null;
  return antes && /\p{L}/u.test(antes) ? antes.slice(0, 80) : null;
}

/** «Gratuito» → «Gratis»; «$ 60» → «$60»; lo demás tal cual. */
function precioLimpio(p: string): string {
  const t = p.replace(/\s+/g, " ").trim();
  if (/^(gratuit[oa]|gratis|entrada libre|libre|sin costo|\$\s*0+(?:\.0+)?)$/i.test(t)) return "Gratis";
  return t.replace(/\$\s+(?=\d)/g, "$");
}

/**
 * El costo como texto de agenda (lo lee `precioDeAgenda` y, al publicar, `costoDeAgenda`): todo gratis → «Gratis»; un solo costo → su precio;
 * varios → «General $60, Estudiantes $30» (el primero manda y lo demás queda como nota del costo). Null si la ficha no dice nada.
 */
export function precioDeCartelera(costos: readonly { nombre: string; precio: string }[]): string | null {
  const limpios = costos.map((c) => ({ nombre: c.nombre.replace(/\s+/g, " ").trim(), precio: precioLimpio(c.precio) })).filter((c) => c.precio);
  if (!limpios.length) return null;
  if (limpios.every((c) => c.precio === "Gratis")) return "Gratis";
  if (limpios.length === 1) return limpios[0].precio.slice(0, 120);
  const corto = (n: string) => (n.length > 40 ? "" : n);
  return limpios
    .map((c) => [corto(c.nombre), c.precio].filter(Boolean).join(" "))
    .join(", ")
    .slice(0, 120);
}

// ---------------------------------------------------------------- tipos y clases

/** Los tipos de la cartelera (por su id o su nombre, sin acentos) y la clase de la app que les toca; los demás, la del título o «evento». */
export const CLASES_CARTELERA: readonly { patron: RegExp; clase: Clase }[] = [
  { patron: /^museos?\b/, clase: "exposicion" },
  { patron: /^(cursos?|talleres?)\b/, clase: "taller" },
  { patron: /^festivales?\b/, clase: "festival" },
];

/** La clase para un evento de la cartelera: la de su tipo (Museos y Expos → exposición; Cursos y Talleres → taller; Festivales y Ferias → festival) o la del título. */
export function claseDeCartelera(tipo: string, titulo: string): Clase {
  const n = normalizarNombre(tipo.replace(/_/g, " "));
  const porTipo = CLASES_CARTELERA.find((c) => c.patron.test(n))?.clase;
  if (porTipo) return porTipo;
  const sugerida = claseSugerida(titulo);
  return sugerida === "exposicion" || !sugerida ? "puntual" : sugerida;
}

/** La clase por el primero de los tipos que dice una (el de la lista y el de la ficha no siempre coinciden: «Festivales y Ferias» y «Al Aire Libre»). */
export function claseDeTipos(tipos: readonly (string | null | undefined)[], titulo: string): Clase {
  for (const t of tipos) {
    const n = normalizarNombre((t ?? "").replace(/_/g, " "));
    const porTipo = n ? CLASES_CARTELERA.find((c) => c.patron.test(n))?.clase : undefined;
    if (porTipo) return porTipo;
  }
  return claseDeCartelera("", titulo);
}

/**
 * La hora que dice la descripción cuando la ficha no la trae («00:00»): «12 horas», «a las 17:30», «de 10 a 18 horas» (con su fin). Solo de 7 a
 * 23 h, para no tomar por hora un año, un código postal o una edad. Null si no la dice.
 */
export function horaDeDescripcion(texto: string): { hora: string; fin: string | null } | null {
  const t = texto.toLowerCase();
  const hh = (h: string, m?: string) => (Number(h) >= 7 && Number(h) <= 23 && (!m || Number(m) <= 59) ? `${h.padStart(2, "0")}:${m ?? "00"}` : null);
  const rango = /\bde\s+(\d{1,2})(?::(\d{2}))?\s+a\s+(\d{1,2})(?::(\d{2}))?\s*(?:horas|hrs?\b|h\b)/.exec(t);
  if (rango) {
    const hora = hh(rango[1], rango[2]);
    if (hora) return { hora, fin: hh(rango[3], rango[4]) };
  }
  for (const m of t.matchAll(/(?:\ba\s+las\s+(\d{1,2})(?::(\d{2}))?\b)|(?:\b(\d{1,2}):(\d{2})\b)|(?:\b(\d{1,2})\s*(?:horas|hrs?\.?)(?![a-z])(?!\s+de\s+duraci))/g)) {
    const hora = hh(m[1] ?? m[3] ?? m[5], m[2] ?? m[4]);
    if (hora) return { hora, fin: null };
  }
  return null;
}

/** El nombre del tipo para el informe («Museos y Exposiciones», «Cursos y Talleres»…), el de la lista si lo hay. */
export const nombreDeTipo = (ficha: Pick<FichaCartelera, "tipo">, deLista?: string | null): string => (deLista || ficha.tipo.nombre || ficha.tipo.id || "Sin tipo").slice(0, 60);

// ---------------------------------------------------------------- las filas que propone la rutina

/** Una fila con la forma que la rutina de agendas propone (`EventoEntregado` de `agendas.ts`) y lo que trae además la cartelera. */
export type FilaCartelera = {
  titulo: string;
  fecha: string;
  hora: string;
  hora_fin: string | null;
  lugar: string;
  direccion: string | null;
  municipio: string | null;
  precio: string | null;
  descripcion: string;
  programa: string | null;
  termina: string | null;
  /** Lo de la cartelera: la ficha (fuente y enlace), su imagen como cartel, el punto del recinto, la clase por su tipo. */
  url: string;
  imagen: string | null;
  lat: number | null;
  lng: number | null;
  clase: Clase;
  /** Una exposición abierta (no su inauguración): se publica como exposición, de su primer a su último día. */
  visita?: boolean;
  cartelera_id: string;
  recinto_id: string | null;
};

/**
 * Las filas de un evento: una por día de función de hoy en adelante, a su primera hora de ese día (con su hora de fin si la duración la dice).
 * La cartelera escribe «00:00» cuando no tiene hora: entonces vale la de la descripción y, si tampoco la dice, el evento no da filas (la rutina
 * lo cuenta como `sin_hora`, la regla de siempre: un evento necesita día y hora). La clase, por el tipo de la lista o el de la ficha.
 *   · una exposición con varios días es UNA fila: el primero, con `termina` el último (`visita`: se publica como exposición abierta);
 *   · un taller lleva todas sus sesiones (hasta 31): la rutina las junta en una propuesta;
 *   · lo demás, sus funciones de los próximos 60 días (hasta 31): días seguidos se juntan, otra cadencia se propone como serie.
 * `lugar` es el nombre con que se propone el sitio (el del lugar del directorio si el recinto ya está; si no, el del recinto).
 */
export function filasDeFicha(ficha: FichaCartelera, o: { hoy: string; lugar?: string | null; tipoDeLista?: string | null; miniatura?: string | null }): FilaCartelera[] {
  const porDia = new Map<string, string>();
  // «00:00» es como la cartelera dice «sin hora»: entonces, la que diga la descripción («12 horas», «de 10 a 18 horas»); si no dice, no entra.
  const deTexto = horaDeDescripcion(ficha.descripcion);
  for (const f of ficha.funciones) {
    const hora = f.horas.find((h) => h !== "00:00") ?? deTexto?.hora;
    if (!hora) continue;
    for (const d of f.dias) if (d >= o.hoy && (!porDia.has(d) || hora < porDia.get(d)!)) porDia.set(d, hora);
  }
  let dias = [...porDia.keys()].sort();
  if (!dias.length) return [];
  const clase = claseDeTipos([o.tipoDeLista, ficha.tipo.id, ficha.tipo.nombre], ficha.titulo);
  const base = {
    titulo: ficha.titulo,
    lugar: (o.lugar || ficha.recinto.nombre).slice(0, LIMITES_EVENTO.sitio),
    direccion: ficha.direccion,
    municipio: alcaldiaDeDireccion(ficha.direccion),
    precio: precioDeCartelera(ficha.costos),
    descripcion: ficha.descripcion,
    programa: null,
    url: urlFicha(ficha.id, ficha.dia ?? dias[0], ficha.titulo),
    imagen: ficha.imagen ?? o.miniatura ?? null,
    lat: ficha.punto?.lat ?? null,
    lng: ficha.punto?.lng ?? null,
    cartelera_id: ficha.id,
    recinto_id: ficha.recinto.id,
  };
  if (clase === "exposicion") {
    if (dias.length === 1) return [{ ...base, fecha: dias[0], hora: porDia.get(dias[0])!, hora_fin: null, termina: null, clase: "puntual" }];
    return [{ ...base, fecha: dias[0], hora: porDia.get(dias[0])!, hora_fin: null, termina: dias.at(-1)!, clase, visita: true }];
  }
  if (clase !== "taller") dias = dias.filter((d) => d <= sumarDias(o.hoy, DIAS_FUNCIONES));
  const fin = (hora: string) =>
    deTexto?.fin && deTexto.hora === hora ? deTexto.fin : ficha.duracionMin && ficha.duracionMin < 24 * 60 ? sumarMinutos(hora, ficha.duracionMin) : null;
  return dias.slice(0, MAX_FUNCIONES).map((d) => {
    const hora = porDia.get(d)!;
    return { ...base, fecha: d, hora, hora_fin: fin(hora), termina: null, clase };
  });
}

// ---------------------------------------------------------------- los recintos

/** El tipo de lugar que dice el nombre del recinto (como el importador de instituciones); si nada, «Otro». */
export function tipoDeRecinto(nombre: string): Tipo {
  const n = ` ${normalizarNombre(nombre)} `;
  if (/ (museo|museum|ex convento|exconvento|casa museo) /.test(n)) return "museo";
  if (/ (galeria|gallery) /.test(n)) return "galeria";
  if (/ (biblioteca|libreria) /.test(n)) return "biblioteca";
  if (/ (faro|casa de (la )?cultura|centro cultural|centro de cultura|casa del lago) /.test(n)) return "casa_de_cultura";
  if (/ (teatro|foro|auditorio|lunario|sala|cine|cineteca|arena|estadio|palacio de los deportes) /.test(n)) return "foro";
  if (/ (escuela|universidad|facultad|conservatorio|instituto|colegio|academia) /.test(n)) return "escuela";
  if (/ (plaza|jardin|parque|bosque|zocalo|alameda|explanada|deportivo|zoologico|lago|canal|embarcadero) /.test(n)) return "plaza";
  if (/ (cafe|bar|cantina|restaurante|pulqueria) /.test(n)) return "cafe_bar";
  return "otro";
}

export type LugarParaCruce = { id: string; nombre: string; lat?: number | null; lng?: number | null };

/**
 * El lugar del directorio que es este recinto, o null: el mismo nombre (o el único que coincide, `resolverLugar`), o uno a menos de 150 m con un
 * nombre parecido (`nombresParecidos`, el criterio de «Buscar lugares»; las palabras de la ciudad no cuentan).
 */
export function cruzarRecinto<T extends LugarParaCruce>(recinto: { nombre: string; punto: Punto | null }, lugares: readonly T[], palabrasCiudad: Set<string> = new Set()): T | null {
  if (!recinto.nombre) return null;
  const porNombre = resolverLugar(recinto.nombre, [...lugares]);
  if (porNombre) return porNombre;
  if (!recinto.punto) return null;
  const cerca = lugares
    .filter((l) => l.lat != null && l.lng != null)
    .map((l) => ({ l, m: distanciaKm(recinto.punto!, { lat: l.lat!, lng: l.lng! }) * 1000 }))
    .filter((x) => x.m <= METROS_MISMO_LUGAR && nombresParecidos(recinto.nombre, x.l.nombre, palabrasCiudad))
    .sort((a, b) => a.m - b.m);
  return cerca[0]?.l ?? null;
}

/** `propuestas.datos` de un recinto que no está en el directorio (el contrato de OL-427 para un lugar, más su imagen y su id en la cartelera). */
export function datosDeRecinto(r: { id: string | null; nombre: string; punto: Punto; direccion: string | null; imagen: string | null; enlace: string | null }, ciudad: string, leida: string, url: string): Record<string, unknown> {
  const datos: Record<string, unknown> = {
    nombre: r.nombre.slice(0, LIMITES_LUGAR.nombre),
    tipo: tipoDeRecinto(r.nombre),
    lat: Math.round(r.punto.lat * 1e6) / 1e6,
    lng: Math.round(r.punto.lng * 1e6) / 1e6,
    ciudad,
    redes: r.enlace ? [r.enlace] : [],
    leida,
    url,
  };
  if (r.direccion) datos.direccion = r.direccion.slice(0, LIMITES_LUGAR.direccion);
  if (r.imagen) datos.imagen = r.imagen;
  if (r.id) datos.cartelera_recinto = r.id;
  return datos;
}
