import { formatearCuando } from "./fechas";
import { REDES, normalizarNombre, type ClaveRed, type Redes } from "./lugares";

/** Qué hace: lista cerrada; "por_completar" es el artista creado con solo el nombre desde el alta de un evento. */
export const DISCIPLINAS = [
  { valor: "musica", etiqueta: "Música" },
  { valor: "teatro", etiqueta: "Teatro" },
  { valor: "danza", etiqueta: "Danza" },
  { valor: "artes_visuales", etiqueta: "Artes visuales" },
  { valor: "letras", etiqueta: "Letras" },
  { valor: "cine", etiqueta: "Cine" },
  { valor: "otro", etiqueta: "Otro" },
] as const;
export type Disciplina = (typeof DISCIPLINAS)[number]["valor"] | "por_completar";

export const TIPOS_ARTISTA = [
  { valor: "solista", etiqueta: "Solista" },
  { valor: "grupo", etiqueta: "Grupo" },
  { valor: "colectivo", etiqueta: "Colectivo" },
] as const;
export type TipoArtista = (typeof TIPOS_ARTISTA)[number]["valor"];

/** Redes de un artista, en el orden de la ficha (Compartir va antes, en la página). */
export const REDES_ARTISTA = REDES.filter((r) => ["instagram", "facebook", "youtube", "spotify", "whatsapp", "sitio"].includes(r.clave));

export const LIMITES_ARTISTA = { nombre: 80, detalle: 40, descripcion: 600 } as const;

/** Umbral a partir del cual aparece la búsqueda por nombre (decisión 2). */
export const UMBRAL_BUSCAR_ARTISTAS = 8;

export type ArtistaResumen = {
  id: string;
  nombre: string;
  disciplina: Disciplina;
  detalle: string | null;
  tipo: TipoArtista;
  foto: string | null;
};

/** La fecha más cercana de un artista: qué día y dónde. */
export type ProximaFecha = { id: string; inicio: string; sitio: string };

export type ArtistaLista = ArtistaResumen & { proxima: ProximaFecha | null };

export type Artista = ArtistaResumen & {
  descripcion: string | null;
  ciudad: string;
  redes: Redes;
  creado_por: string | null;
  visible: boolean;
};

/** Un artista elegido en el renglón Quién: ya registrado (con id) o por crear con solo el nombre. */
export type QuienItem = { id?: string; nombre: string };

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
  if (/^(los|las|trio|cuarteto|quinteto|banda|compania|orquesta|ensamble|dueto|duo|coro|grupo|sonora|mariachi|conjunto)\b/.test(n)) return "grupo";
  return null;
}

/** Orden de la lista: con fechas próximas primero (por la fecha), luego alfabético (decisión 2). */
export function ordenarArtistas<T extends ArtistaLista>(artistas: T[]): T[] {
  return [...artistas].sort((a, b) => {
    if (a.proxima && b.proxima) return a.proxima.inicio.localeCompare(b.proxima.inicio) || a.nombre.localeCompare(b.nombre, "es");
    if (a.proxima || b.proxima) return a.proxima ? -1 : 1;
    return a.nombre.localeCompare(b.nombre, "es");
  });
}

/** Filtra por nombre escrito a medias, sin acentos ni mayúsculas. */
export function filtrarArtistas<T extends { nombre: string; detalle?: string | null }>(artistas: T[], busqueda: string): T[] {
  const q = normalizarNombre(busqueda);
  if (!q) return artistas;
  return artistas.filter((a) => normalizarNombre(`${a.nombre} ${a.detalle ?? ""}`).includes(q));
}

/** El registrado cuyo nombre es igual al escrito (sin acentos ni mayúsculas), si lo hay. */
export function artistaIgual<T extends { nombre: string }>(artistas: T[], nombre: string): T | null {
  const q = normalizarNombre(nombre);
  if (!q) return null;
  return artistas.find((a) => normalizarNombre(a.nombre) === q) ?? null;
}

/** "Próximo: hoy · 19:30 · Casa Ocho Ventanas". */
export function textoProximaFecha(f: ProximaFecha, ahora: Date = new Date()): string {
  const cuando = formatearCuando(f.inicio, null, ahora);
  return `Próximo: ${cuando.charAt(0).toLowerCase()}${cuando.slice(1)} · ${f.sitio}`;
}

/** Une artistas con su fecha más próxima (las filas vienen ordenadas por inicio). */
export function conProximaFecha<T extends { id: string }>(artistas: T[], fechas: { artista_id: string; evento: { id: string; inicio: string; sitio: string } }[]): (T & { proxima: ProximaFecha | null })[] {
  const proxima = new Map<string, ProximaFecha>();
  for (const f of [...fechas].sort((a, b) => a.evento.inicio.localeCompare(b.evento.inicio))) if (!proxima.has(f.artista_id)) proxima.set(f.artista_id, { ...f.evento });
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
    out.push(typeof id === "string" && /^[0-9a-f-]{36}$/.test(id) ? { id, nombre } : { nombre });
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
  redes: Redes;
};
export type ErroresArtista = Partial<Record<"nombre" | "disciplina" | "tipo" | "detalle" | "descripcion" | "foto" | ClaveRed, string>>;

function limpiar(v: FormDataEntryValue | string | null | undefined): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
}

export function validarArtista(entrada: Record<string, FormDataEntryValue | null | undefined>): { datos: DatosArtista; errores: ErroresArtista } {
  const redes: Redes = {};
  for (const r of REDES_ARTISTA) {
    const v = limpiar(entrada[r.clave]);
    if (v) redes[r.clave] = v;
  }
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
  };
  const errores: ErroresArtista = {};
  if (!datos.nombre) errores.nombre = "Escribe el nombre del artista o grupo.";
  else if (datos.nombre.length > LIMITES_ARTISTA.nombre) errores.nombre = `Máximo ${LIMITES_ARTISTA.nombre} caracteres.`;
  if (disciplina !== "por_completar" && !DISCIPLINAS.some((d) => d.valor === disciplina)) errores.disciplina = "Elige qué hace.";
  if (!TIPOS_ARTISTA.some((t) => t.valor === tipo)) errores.tipo = "Elige si es solista, grupo o colectivo.";
  if (datos.detalle && datos.detalle.length > LIMITES_ARTISTA.detalle) errores.detalle = `Máximo ${LIMITES_ARTISTA.detalle} caracteres.`;
  if (datos.descripcion && datos.descripcion.length > LIMITES_ARTISTA.descripcion) errores.descripcion = `Máximo ${LIMITES_ARTISTA.descripcion} caracteres.`;
  if (datos.foto && !/^https:\/\/[^\s]+$/.test(datos.foto)) errores.foto = "La foto no se subió bien. Intenta de nuevo.";
  for (const r of REDES_ARTISTA) {
    const v = redes[r.clave];
    if (v && v.length > 200) errores[r.clave] = "Demasiado largo.";
    if (v && r.clave === "whatsapp" && v.replace(/\D/g, "").length < 10) errores.whatsapp = "Pon el número con lada (10 dígitos).";
  }
  return { datos, errores };
}
