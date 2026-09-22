import { compararEventos } from "./agenda";
import { CIUDAD_INICIAL, ciudadCanonica } from "./ciudad";
import { esUuid, limpiar } from "./formulario";
import { enlacesDesdeJson, type Enlace } from "./enlaces";
import { formatearCuando } from "./fechas";
import { compararNombres, normalizarNombre } from "./lugares";
import type { Origen } from "./origen";
import { LIMITES_ARTISTA } from "./limites";

/** Qué hace: lista cerrada; "por_completar" es el artista creado con solo el nombre desde el alta de un evento. */
export const DISCIPLINAS = [
  { valor: "musica", etiqueta: "Música" },
  { valor: "teatro", etiqueta: "Teatro" },
  { valor: "danza", etiqueta: "Danza" },
  { valor: "artes_visuales", etiqueta: "Artes visuales" },
  { valor: "letras", etiqueta: "Letras" },
  { valor: "cine", etiqueta: "Cine" },
  { valor: "circo", etiqueta: "Artes circenses" },
  { valor: "otro", etiqueta: "Otro" },
] as const;
export type Disciplina = (typeof DISCIPLINAS)[number]["valor"] | "por_completar";

export const TIPOS_ARTISTA = [
  { valor: "solista", etiqueta: "Solista" },
  { valor: "grupo", etiqueta: "Grupo" },
  { valor: "colectivo", etiqueta: "Colectivo" },
] as const;
export type TipoArtista = (typeof TIPOS_ARTISTA)[number]["valor"];

export { LIMITES_ARTISTA } from "./limites";

/** Umbral a partir del cual aparece la búsqueda por nombre (decisión 2). */
export const UMBRAL_BUSCAR_ARTISTAS = 8;
/** Umbral a partir del cual aparecen los chips de disciplina (decisión 2). */
export const UMBRAL_CHIPS_ARTISTAS = 12;
/** Un detalle (género, técnica) merece chip cuando lo comparten al menos tantos artistas de la disciplina elegida. */
export const MINIMO_POR_DETALLE = 3;

export type ArtistaResumen = {
  id: string;
  /** La dirección legible (/artistas/<slug>): se pone sola al crear la ficha y no cambia si cambia el nombre. */
  slug: string;
  nombre: string;
  disciplina: Disciplina;
  detalle: string | null;
  tipo: TipoArtista;
  foto: string | null;
};

/** La fecha más cercana de un artista: qué día y dónde. */
export type ProximaFecha = { id: string; inicio: string; sitio: string; zona: string };

export type ArtistaLista = ArtistaResumen & { proxima: ProximaFecha | null };

export type Artista = ArtistaResumen & {
  descripcion: string | null;
  ciudad: string;
  /** Enlaces y redes reconocidos (lib/enlaces); en la base es JSON. */
  redes: Enlace[];
  creado_por: string | null;
  visible: boolean;
  /** De qué catálogo externo se trajo la ficha (por confirmar), o null si la registró alguien aquí. */
  origen: Origen | null;
};

/** Un artista elegido en el renglón Quién: ya registrado (con id) o por crear con solo el nombre. */
export type QuienItem = { id?: string; nombre: string };

/**
 * La dirección de la ficha: el slug si ya lo trae (todas las fichas nuevas y las 538 existentes lo tienen desde la
 * migración `20260922140000_artistas_slug`), y el UUID solo como respaldo (una fila leída sin ese campo). Las rutas
 * viejas `/artistas/<uuid>` siguen resolviendo con un redirect 308 a esta misma dirección (OL-114, doc 24).
 */
export function hrefArtista(a: { id: string; slug?: string | null }): string {
  return `/artistas/${a.slug || a.id}`;
}

export function etiquetaDisciplina(d: string): string {
  return DISCIPLINAS.find((x) => x.valor === d)?.etiqueta ?? "Por completar";
}
export function etiquetaTipoArtista(t: string): string {
  return TIPOS_ARTISTA.find((x) => x.valor === t)?.etiqueta ?? "Solista";
}

/** "Son huasteco · Grupo" · "Música · Solista" · "Ficha por completar" (creado solo con el nombre). */
export function etiquetaArtista(a: Pick<ArtistaResumen, "disciplina" | "detalle" | "tipo">): string {
  if (a.disciplina === "por_completar" && !a.detalle) return "Ficha por completar";
  const hace = a.detalle ? a.detalle.charAt(0).toUpperCase() + a.detalle.slice(1) : etiquetaDisciplina(a.disciplina);
  return `${hace} · ${etiquetaTipoArtista(a.tipo)}`;
}

/** Del nombre se deduce si es grupo o colectivo (decisión 4): "Los Vecinos", "Trío Xochitl", "Colectivo Barro Vivo". */
export function deducirTipoArtista(nombre: string): TipoArtista | null {
  const n = normalizarNombre(nombre);
  if (/^colectivo\b/.test(n)) return "colectivo";
  if (/^(los|las|trio|cuarteto|quinteto|banda|compania|orquesta|ensamble|dueto|duo|coro|grupo|sonora|mariachi|conjunto|ballet)\b/.test(n)) return "grupo";
  return null;
}

/**
 * Del nombre se deduce qué hace (decisión 4 de docs/rediseno/15): "Ballet Folclórico" baila, "Compañía de Teatro" actúa,
 * "Coro", "Orquesta" o "Mariachi" tocan. Sin pista, Música, que es lo más común; el renglón se cambia con un toque.
 */
export function deducirDisciplina(nombre: string): Disciplina {
  const n = normalizarNombre(nombre);
  if (/\b(teatro|teatral|titeres|clown|payas[oa]s?)\b/.test(n)) return "teatro";
  if (/\b(danza|ballet|bailarin[a]?|bailes?)\b/.test(n)) return "danza";
  if (/\b(cine|cineclub|filmes?|documental(es)?)\b/.test(n)) return "cine";
  if (/\b(circo|circense|malabar(es|istas?)|acrobat[ai]s?)\b/.test(n)) return "circo";
  if (/\b(grabado|grafica|pintura|escultura|fotografia|ceramica|muralis[mt][oa]s?|ilustracion)\b/.test(n)) return "artes_visuales";
  if (/\b(poesia|poetas?|letras|literari[oa]|narrador(a|es)?|cuentacuentos)\b/.test(n)) return "letras";
  return "musica";
}

/** Orden del directorio: alfabético, sin distinguir acentos, mayúsculas ni signos. */
export function ordenarArtistas<T extends ArtistaLista>(artistas: T[]): T[] {
  return [...artistas].sort((a, b) => compararNombres(a.nombre, b.nombre));
}

/** Filtra por nombre escrito a medias, sin acentos ni mayúsculas. */
export type FiltroArtistas = { disciplina?: string | null; detalle?: string | null };

/** Cuántos artistas trae cada página de la lista; "Ver más" suma otros tantos. */
export const PAGINA_ARTISTAS = 100;

/**
 * Lo que va en la URL de /artistas: la ciudad (slug; ausente = la inicial), qué hacen (`hace`), qué en concreto
 * (`que`), lo escrito (`q`) y cuántos se ven (`n`). La letra de la tira no filtra ni vive en la URL (corrección del
 * founder, 2026-09-19): es un acceso directo, no un filtro; tocarla puede pedir más `n` para que su grupo esté cargado.
 */
export type FiltroUrlArtistas = { ciudad?: string | null; hace?: string | null; que?: string | null; q?: string | null; n?: number | null };

/** La URL de la lista con un filtro; sin parámetros vacíos, para que el enlace sea limpio y compartible. */
export function hrefArtistas(f: FiltroUrlArtistas): string {
  const p = new URLSearchParams();
  if (f.ciudad && f.ciudad !== CIUDAD_INICIAL.slug) p.set("ciudad", f.ciudad);
  if (f.hace) p.set("hace", f.hace);
  if (f.que) p.set("que", f.que);
  if (f.q?.trim()) p.set("q", f.q.trim());
  if (f.n && f.n > PAGINA_ARTISTAS) p.set("n", String(f.n));
  const s = p.toString();
  return s ? `/artistas?${s}` : "/artistas";
}

/** Lee el filtro de la URL con valores seguros: la disciplina debe existir; `n` es un múltiplo de la página. */
export type FiltroLeido = { hace: string | null; que: string | null; q: string | null; n: number };
export function filtroDesdeUrl(p: { hace?: string; que?: string; q?: string; n?: string }): FiltroLeido {
  const hace = p.hace && DISCIPLINAS.some((d) => d.valor === p.hace) ? p.hace : null;
  const n = Number(p.n);
  return { hace, que: hace && p.que?.trim() ? p.que.trim().slice(0, 60) : null, q: p.q?.trim().slice(0, 80) || null, n: Number.isInteger(n) && n > PAGINA_ARTISTAS ? Math.min(n, 5000) : PAGINA_ARTISTAS };
}

/** Por nombre o detalle escrito, y por los chips: disciplina y, dentro de ella, detalle (género, técnica). */
export function filtrarArtistas<T extends { nombre: string; disciplina?: string; detalle?: string | null }>(artistas: T[], busqueda: string, filtro: FiltroArtistas = {}): T[] {
  const q = normalizarNombre(busqueda);
  const detalle = filtro.detalle ? normalizarNombre(filtro.detalle) : null;
  return artistas.filter((a) => {
    if (filtro.disciplina && a.disciplina !== filtro.disciplina) return false;
    if (detalle && normalizarNombre(a.detalle ?? "") !== detalle) return false;
    return !q || normalizarNombre(`${a.nombre} ${a.detalle ?? ""}`).includes(q);
  });
}

/** Las disciplinas con al menos un artista, en el orden de la lista cerrada (Todos va aparte). */
export function disciplinasPresentes<T extends { disciplina?: string }>(artistas: T[]): { valor: string; etiqueta: string }[] {
  const hay = new Set(artistas.map((a) => a.disciplina));
  return DISCIPLINAS.filter((d) => hay.has(d.valor));
}

/**
 * Segundo nivel de chips: los detalles (género musical, técnica) de la disciplina elegida que comparten
 * al menos MINIMO_POR_DETALLE artistas, de más a menos frecuente. Con menos de dos, no hay segundo nivel.
 */
export function detallesDe<T extends { disciplina?: string; detalle?: string | null }>(artistas: T[], disciplina: string): { valor: string; etiqueta: string }[] {
  const cuenta = new Map<string, { etiqueta: string; n: number }>();
  for (const a of artistas) {
    if (a.disciplina !== disciplina || !a.detalle) continue;
    const clave = normalizarNombre(a.detalle);
    const actual = cuenta.get(clave);
    if (actual) actual.n += 1;
    else cuenta.set(clave, { etiqueta: a.detalle.charAt(0).toUpperCase() + a.detalle.slice(1), n: 1 });
  }
  const lista = [...cuenta.entries()].filter(([, v]) => v.n >= MINIMO_POR_DETALLE).sort((a, b) => b[1].n - a[1].n || a[1].etiqueta.localeCompare(b[1].etiqueta, "es"));
  return lista.length >= 2 ? lista.map(([valor, v]) => ({ valor, etiqueta: v.etiqueta })) : [];
}

/** Una subcategoría (detalle) ya usada en una disciplina, tal como la trae `subcategorias_de` (migración OL-101). */
export type Subcategoria = { detalle: string; artistas: number };

/**
 * Al escribir una subcategoría nueva, ¿ya existe una parecida? (OL-101, docs/rediseno/27): evita "foto",
 * "Fotografia" y "fotografía" como tres subcategorías distintas. Compara formas normalizadas (sin acentos
 * ni mayúsculas, el mismo criterio que evita artistas duplicados): igual, o una es el principio de la otra
 * (mínimo 3 letras, para no confundir "cine" con "circo"). Con exactamente lo mismo ya escrito, no hay nada
 * que sugerir.
 */
export function subcategoriaParecida<T extends Subcategoria>(existentes: T[], escrito: string): T | null {
  const norm = normalizarNombre(escrito);
  if (norm.length < 2) return null;
  let mejor: T | null = null;
  let mejorPeso = -1;
  for (const e of existentes) {
    const en = normalizarNombre(e.detalle);
    if (!en) continue;
    let peso = -1;
    if (en === norm) peso = 100;
    else if (norm.length >= 3 && (en.startsWith(norm) || norm.startsWith(en))) peso = 50 - Math.abs(en.length - norm.length);
    if (peso > mejorPeso) {
      mejorPeso = peso;
      mejor = e;
    }
  }
  if (mejor && normalizarNombre(mejor.detalle) === norm && mejor.detalle === escrito.trim()) return null;
  return mejor;
}

/** El registrado cuyo nombre es igual al escrito (sin acentos ni mayúsculas), si lo hay. */
export function artistaIgual<T extends { nombre: string }>(artistas: T[], nombre: string): T | null {
  const q = normalizarNombre(nombre);
  if (!q) return null;
  return artistas.find((a) => normalizarNombre(a.nombre) === q) ?? null;
}

/** "Próximo: hoy · 19:30 · Casa Ocho Ventanas", con la hora de la zona del evento. */
export function textoProximaFecha(f: ProximaFecha, ahora: Date = new Date()): string {
  const cuando = formatearCuando(f.inicio, null, ahora, f.zona);
  return `Próximo: ${cuando.charAt(0).toLowerCase()}${cuando.slice(1)} · ${f.sitio}`;
}

/** Una fecha de un artista como llega de la base: el evento, con el título que desempata, y dónde es. */
export type FechaDeArtista = { artista_id: string; evento: ProximaFecha & { titulo: string } };

/**
 * Une artistas con su fecha más próxima: la primera en orden de agenda (hora, título, id), llegue como llegue de la base.
 * Tomar la primera fila que llegaba no bastaba: la base no garantiza ese orden y un artista con dos fechas podía mostrar
 * la que no es la más próxima (bitácora 063).
 */
export function conProximaFecha<T extends { id: string }>(artistas: T[], fechas: FechaDeArtista[]): (T & { proxima: ProximaFecha | null })[] {
  const proxima = new Map<string, ProximaFecha>();
  for (const { artista_id, evento: e } of [...fechas].sort((a, b) => compararEventos(a.evento, b.evento))) if (!proxima.has(artista_id)) proxima.set(artista_id, { id: e.id, inicio: e.inicio, sitio: e.sitio, zona: e.zona });
  return artistas.map((a) => ({ ...a, proxima: proxima.get(a.id) ?? null }));
}

/** "Con Los Vecinos y Trío Xochitl" (los nombres se enlazan en la página; aquí solo la unión). */
export function unirNombres(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? "";
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

/** El renglón Quién viaja como JSON en un campo oculto: se valida, se limpia y se quitan repetidos. */
export function quienDesdeJson(texto: FormDataEntryValue | string | null | undefined): QuienItem[] {
  if (typeof texto !== "string" || !texto.trim()) return [];
  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    return [];
  }
  if (!Array.isArray(crudo)) return [];
  const vistos = new Set<string>();
  const out: QuienItem[] = [];
  for (const x of crudo) {
    if (!x || typeof x !== "object") continue;
    const nombre = String((x as { nombre?: unknown }).nombre ?? "").trim().replace(/\s+/g, " ").slice(0, LIMITES_ARTISTA.nombre);
    const id = (x as { id?: unknown }).id;
    const clave = normalizarNombre(nombre);
    if (!clave || vistos.has(clave)) continue;
    vistos.add(clave);
    out.push(esUuid(id) ? { id, nombre } : { nombre });
    if (out.length === 6) break;
  }
  return out;
}

export type DatosArtista = {
  nombre: string;
  disciplina: Disciplina;
  detalle: string | null;
  tipo: TipoArtista;
  descripcion: string | null;
  foto: string | null;
  redes: Enlace[];
  /** La ciudad del renglón Ciudad (de entrada, la elegida en Artistas); vacía, la inicial. */
  ciudad: string;
};
export type ErroresArtista = Partial<Record<"nombre" | "disciplina" | "tipo" | "detalle" | "descripcion" | "foto" | "enlaces", string>>;


export function validarArtista(entrada: Record<string, FormDataEntryValue | null | undefined>): { datos: DatosArtista; errores: ErroresArtista } {
  const redes = enlacesDesdeJson(entrada.enlaces);
  const disciplina = (limpiar(entrada.disciplina) || "por_completar") as Disciplina;
  const tipo = (limpiar(entrada.tipo) || "solista") as TipoArtista;
  const datos: DatosArtista = {
    nombre: limpiar(entrada.nombre),
    disciplina,
    detalle: limpiar(entrada.detalle) || null,
    tipo,
    descripcion: limpiar(entrada.descripcion) || null,
    foto: limpiar(entrada.foto) || null,
    redes,
    ciudad: ciudadCanonica(limpiar(entrada.ciudad)) || CIUDAD_INICIAL.nombre,
  };
  const errores: ErroresArtista = {};
  if (!datos.nombre) errores.nombre = "Escribe el nombre del artista o grupo.";
  else if (datos.nombre.length > LIMITES_ARTISTA.nombre) errores.nombre = `Máximo ${LIMITES_ARTISTA.nombre} caracteres.`;
  if (disciplina !== "por_completar" && !DISCIPLINAS.some((d) => d.valor === disciplina)) errores.disciplina = "Elige qué hace.";
  if (!TIPOS_ARTISTA.some((t) => t.valor === tipo)) errores.tipo = "Elige si es solista, grupo o colectivo.";
  if (datos.detalle && datos.detalle.length > LIMITES_ARTISTA.detalle) errores.detalle = `Máximo ${LIMITES_ARTISTA.detalle} caracteres.`;
  if (datos.descripcion && datos.descripcion.length > LIMITES_ARTISTA.descripcion) errores.descripcion = `Máximo ${LIMITES_ARTISTA.descripcion} caracteres.`;
  if (datos.foto && !/^https:\/\/[^\s]+$/.test(datos.foto)) errores.foto = "La foto no se subió bien. Intenta de nuevo.";
  if (redes.some((e) => e.url.length > 300)) errores.enlaces = "Hay un enlace demasiado largo.";
  return { datos, errores };
}
