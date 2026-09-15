/**
 * Lectura del Catálogo de Artistas Potosinos (CAPO, catalogoartistaspotosino.com), el catálogo público
 * de la Dirección de Cultura Municipal, hecho en Google Sites. Funciones puras: de HTML a registros y de
 * registros a nuestras fichas (artistas y lugares). Decisión del founder (2026-09-14): entran sin foto,
 * sin autor, marcadas "por confirmar"; los correos van a una tabla privada, solo para invitar una vez.
 */
import { deducirTipoArtista, LIMITES_ARTISTA, type Disciplina, type TipoArtista } from "../../src/lib/artistas";
import { normalizarRedes, type Enlace } from "../../src/lib/enlaces";
import { normalizarNombre, type Tipo as TipoLugar } from "../../src/lib/lugares";

export const CAPO_URL = "https://www.catalogoartistaspotosino.com";

/** Una ficha tal como está en la página: nombre, párrafos, enlaces externos, correos. */
export type Registro = {
  nombre: string;
  parrafos: string[];
  enlaces: string[];
  correos: string[];
  conImagen: boolean;
};

export type Pagina = {
  url: string;
  clase: "artista" | "lugar" | "ignorar";
  disciplina: Disciplina | null;
  detalle: string | null;
  /** Tipo por defecto de la página ("grupos", "solistas", compañías); el nombre puede corregirlo. */
  tipo: TipoArtista | null;
};

export type ArtistaCapo = {
  nombre: string;
  disciplina: Disciplina;
  detalle: string | null;
  tipo: TipoArtista;
  descripcion: string | null;
  redes: Enlace[];
  correos: string[];
  url_fuente: string;
};

export type LugarCapo = {
  nombre: string;
  tipo: TipoLugar;
  descripcion: string | null;
  direccion: string | null;
  redes: Enlace[];
  correos: string[];
  url_fuente: string;
};

// ---------- HTML → registros ----------

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodificarEntidades(t: string): string {
  return t
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n.toLowerCase()] ?? m);
}

function textoDe(html: string): string {
  return decodificarEntidades(html.replace(/<[^>]+>/g, " "))
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Google Sites envuelve los enlaces externos: google.com/url?q=… → el destino. */
export function destinoReal(href: string): string {
  const h = decodificarEntidades(href);
  const m = h.match(/^https?:\/\/www\.google\.com\/url\?(?:.*&)?q=([^&]+)/);
  if (!m) return h;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return h;
  }
}

const DE_GOOGLE = /^https?:\/\/([a-z0-9-]+\.)*(google\.com|forms\.gle|goo\.gl|gstatic\.com|googleusercontent\.com|catalogoartistaspotosino\.com)(\/|$)/i;
/** Etiquetas de sección o menú que a veces aparecen como encabezado dentro del contenido. */
const NO_ES_NOMBRE = /^(registro|aviso de privacidad|disciplinas?|m[uú]sica|artes esc[eé]nicas|literatura|artes visuales|cine|pintura|fotograf[ií]a|escultura|gr[aá]fica|multidisciplina|teatro|danza|artes circenses|grupos|solistas|recomendado|hist[oó]rico|espacios? (de|y) .*|compa[nñ][ií]as .*)$/i;

const TOKEN = /<h([1-3])(?=[\s>])[^>]*>([\s\S]*?)<\/h\1>|<p(?=[\s>])[^>]*>([\s\S]*?)<\/p>|<a\s[^>]*href="([^"]+)"[^>]*>|<img\s[^>]*src="(https:\/\/lh[^"]+)"/gi;

function nuevo(nombre: string, conImagen: boolean): Registro {
  return { nombre, parrafos: [], enlaces: [], correos: [], conImagen };
}
function vacio(r: Registro): boolean {
  return r.parrafos.length === 0 && r.enlaces.length === 0 && r.correos.length === 0;
}

/**
 * Del HTML de una página del CAPO saca sus fichas. En el catálogo cada ficha es un encabezado (el nombre)
 * seguido de párrafos, iconos de redes (enlaces) y un correo; la imagen va antes del encabezado.
 * Un encabezado entre paréntesis "(San Luis Potosí, 1990)" no es una ficha: es el origen del anterior.
 * Dos encabezados seguidos sin nada en medio son alias y nombre real: el segundo pasa a ser el primer párrafo.
 */
export function extraerRegistros(html: string): Registro[] {
  const desde = html.search(/<div[^>]*role="main"/i);
  const hasta = html.search(/<footer(?=[\s>])/i);
  const cuerpo = html.slice(desde >= 0 ? desde : 0, hasta > desde ? hasta : undefined);
  const registros: Registro[] = [];
  let actual: Registro | null = null;
  let imagenPendiente = false;
  let ultimoFueEncabezado = false;
  for (const t of cuerpo.matchAll(TOKEN)) {
    if (t[1] !== undefined) {
      const nivel = Number(t[1]);
      const texto = textoDe(t[2]);
      if (nivel === 1 || !texto) continue;
      if (/^\(.*\)$/.test(texto)) {
        ultimoFueEncabezado = false;
        continue;
      }
      if (actual && ultimoFueEncabezado && vacio(actual) && !imagenPendiente) {
        actual.parrafos.push(texto);
        continue;
      }
      actual = nuevo(texto, imagenPendiente);
      registros.push(actual);
      imagenPendiente = false;
      ultimoFueEncabezado = true;
      continue;
    }
    ultimoFueEncabezado = false;
    if (t[3] !== undefined) {
      const texto = textoDe(t[3]);
      if (texto && actual) actual.parrafos.push(texto);
    } else if (t[4] !== undefined) {
      const href = destinoReal(t[4]);
      if (!actual) continue;
      if (/^mailto:/i.test(href)) {
        const correo = href.replace(/^mailto:/i, "").split("?")[0].trim().toLowerCase();
        if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(correo) && !actual.correos.includes(correo)) actual.correos.push(correo);
      } else if (/^https?:\/\//i.test(href) && !DE_GOOGLE.test(href) && !actual.enlaces.includes(href)) {
        actual.enlaces.push(href);
      }
    } else if (t[5] !== undefined) {
      imagenPendiente = true;
    }
  }
  return unirRepetidos(registros.filter((r) => !vacio(r) && !NO_ES_NOMBRE.test(r.nombre)));
}

/** La misma ficha dos veces en una página (pasa): se queda una con todo lo de ambas. */
function unirRepetidos(registros: Registro[]): Registro[] {
  const porNombre = new Map<string, Registro>();
  for (const r of registros) {
    const clave = normalizarNombre(r.nombre);
    const previo = porNombre.get(clave);
    if (!previo) {
      porNombre.set(clave, r);
      continue;
    }
    if (r.parrafos.join(" ").length > previo.parrafos.join(" ").length) previo.parrafos = r.parrafos;
    for (const e of r.enlaces) if (!previo.enlaces.includes(e)) previo.enlaces.push(e);
    for (const c of r.correos) if (!previo.correos.includes(c)) previo.correos.push(c);
    previo.conImagen = previo.conImagen || r.conImagen;
  }
  return [...porNombre.values()];
}

// ---------- qué es cada página ----------

const GENEROS: Record<string, string> = {
  "rock-metal-alternativo": "rock, metal y alternativo",
  "pop-urbano-electronica": "pop, urbano y electrónica",
  "academica-clasica": "música académica y clásica",
  "jazz-blues-soul": "jazz, blues y soul",
  "tradicional-folclore-canto-nuevo": "tradicional, folclore y canto nuevo",
  "regional-tropical-versatil": "regional, tropical y versátil",
};
const VISUALES: Record<string, string> = { pintura: "pintura", fotografia: "fotografía", escultura: "escultura", grafica: "gráfica", multidisciplina: "multidisciplina" };

function tramo(t: string): string {
  return normalizarNombre(decodeURIComponent(t)).replace(/ /g, "-").replace(/-\d+$/, "");
}

/** De la ruta de la página del CAPO: si trae artistas o lugares, y qué disciplina y tipo por defecto. */
export function clasificarPagina(url: string): Pagina {
  const ruta = url.replace(/^https?:\/\/[^/]+/, "").replace(/^\/catalogoartistaspotosino\/?/, "");
  const partes = ruta.split("/").filter(Boolean).map(tramo);
  const base: Pagina = { url, clase: "ignorar", disciplina: null, detalle: null, tipo: null };
  const [seccion, grupo, sub, hoja] = partes;
  if (seccion === "disciplinas") {
    if (grupo === "musica" && sub) {
      const tipo: TipoArtista | null = hoja === "grupos" ? "grupo" : hoja === "solistas" ? "solista" : null;
      return { ...base, clase: "artista", disciplina: "musica", detalle: GENEROS[sub] ?? null, tipo };
    }
    if (grupo === "artes-escenicas" && sub) {
      if (sub === "teatro") return { ...base, clase: "artista", disciplina: "teatro" };
      if (sub === "danza") return { ...base, clase: "artista", disciplina: "danza" };
      if (sub === "artes-circenses") return { ...base, clase: "artista", disciplina: "otro", detalle: "artes circenses" };
    }
    if (grupo === "literatura" && sub) return { ...base, clase: "artista", disciplina: "letras" };
    if (grupo === "artes-visuales" && sub) {
      if (sub === "cine") return { ...base, clase: "artista", disciplina: "cine" };
      return { ...base, clase: "artista", disciplina: "artes_visuales", detalle: VISUALES[sub] ?? null };
    }
    return base;
  }
  if (seccion === "espacios-y-grupos-independientes") {
    if (grupo === "companias-de-danza") return { ...base, clase: "artista", disciplina: "danza", detalle: "compañía de danza", tipo: "grupo" };
    if (grupo === "companias-independientes-de-teatro") return { ...base, clase: "artista", disciplina: "teatro", detalle: "compañía de teatro", tipo: "grupo" };
    if (grupo === "espacios-de-formacion" || grupo === "espacios-de-divulgacion") return { ...base, clase: "lugar" };
  }
  return base;
}

// ---------- registros → fichas ----------

function limpiarNombre(n: string): string {
  return n.replace(/\s+/g, " ").replace(/[\s·•|,;:-]+$/g, "").trim().slice(0, LIMITES_ARTISTA.nombre);
}

/** Corta en el final de una frase antes del límite; si no hay frase razonable, en una palabra con "…". */
export function recortarDescripcion(texto: string, maximo = LIMITES_ARTISTA.descripcion): string | null {
  const t = texto.trim();
  if (!t) return null;
  if (t.length <= maximo) return t;
  const corte = t.slice(0, maximo);
  let fin = -1;
  for (const m of corte.matchAll(/[.!?]["»)]?(?=\s|$)/g)) fin = m.index! + m[0].length;
  if (fin >= maximo * 0.4) return corte.slice(0, fin).trim();
  const espacio = corte.lastIndexOf(" ", maximo - 2);
  return `${corte.slice(0, espacio > 0 ? espacio : maximo - 1).trim()}…`;
}

const ES_ORIGEN = /^\(.*\)$/;
const ES_ETIQUETA_DIRECCION = /^direcci[oó]n:?$/i;

function redesDe(enlaces: string[]): Enlace[] {
  return normalizarRedes(enlaces.map((url) => ({ url })));
}

export function aArtista(r: Registro, pagina: Pagina): ArtistaCapo {
  const nombre = limpiarNombre(r.nombre);
  const parrafos = r.parrafos.filter((p) => !ES_ORIGEN.test(p) && !ES_ETIQUETA_DIRECCION.test(p));
  return {
    nombre,
    disciplina: pagina.disciplina ?? "por_completar",
    detalle: pagina.detalle,
    tipo: deducirTipoArtista(nombre) ?? pagina.tipo ?? "solista",
    descripcion: recortarDescripcion(parrafos.join("\n")),
    redes: redesDe(r.enlaces),
    correos: r.correos,
    url_fuente: pagina.url,
  };
}

const PARECE_DIRECCION = /\d/;
const PALABRAS_DIRECCION = /\b(col\.?|colonia|zona|centro|av\.?|avenida|calle|c\.|prol\.?|prolongaci[oó]n|blvd\.?|boulevard|fracc\.?|fraccionamiento|san luis potos[ií]|s\.?l\.?p\.?|c\.?p\.?|int\.?|piso|barrio|no\.|#|esq\.?|esquina|local)\b/i;

function esLineaDeDireccion(p: string, esUltima: boolean): boolean {
  if (p.length > 120 || !PARECE_DIRECCION.test(p)) return false;
  if (PALABRAS_DIRECCION.test(p)) return true;
  return esUltima && p.length <= 60 && /\d+\s*[a-z-]*$/i.test(p);
}

/** Separa la dirección de la descripción: lo que sigue a "Dirección", o las últimas líneas con pinta de calle. */
export function separarDireccion(parrafos: string[]): { descripcion: string[]; direccion: string[] } {
  const i = parrafos.findIndex((p) => ES_ETIQUETA_DIRECCION.test(p));
  if (i >= 0) return { descripcion: parrafos.slice(0, i), direccion: parrafos.slice(i + 1).filter((p) => !ES_ORIGEN.test(p)) };
  const direccion: string[] = [];
  let fin = parrafos.length;
  while (fin > 0 && esLineaDeDireccion(parrafos[fin - 1], fin === parrafos.length)) {
    direccion.unshift(parrafos[fin - 1]);
    fin--;
  }
  return { descripcion: parrafos.slice(0, fin), direccion };
}

export function deducirTipoLugar(texto: string): TipoLugar {
  const t = normalizarNombre(texto);
  if (/\b(galeria|gallery)\b/.test(t)) return "galeria";
  if (/\b(teatro|foro|carpa|escenico|escenica)\b/.test(t)) return "foro";
  if (/\bbiblioteca\b/.test(t)) return "biblioteca";
  if (/\b(casa de cultura|casa cultural|centro cultural)\b/.test(t)) return "casa_de_cultura";
  if (/\b(colectivo|colectiva|co lab|colab)\b/.test(t)) return "colectivo";
  return "otro";
}

export function aLugar(r: Registro, pagina: Pagina): LugarCapo {
  const nombre = limpiarNombre(r.nombre).slice(0, 120);
  const { descripcion, direccion } = separarDireccion(r.parrafos.filter((p) => !ES_ORIGEN.test(p)));
  const calle = direccion.join(", ").replace(/\s+,/g, ",").trim();
  const conCiudad = calle && !/san luis potos|s\.?l\.?p\b/i.test(calle) ? `${calle}, San Luis Potosí, S.L.P.` : calle;
  return {
    nombre,
    tipo: deducirTipoLugar(`${nombre} ${descripcion.join(" ")}`),
    descripcion: recortarDescripcion(descripcion.join("\n")),
    direccion: conCiudad || null,
    redes: redesDe(r.enlaces),
    correos: r.correos,
    url_fuente: pagina.url,
  };
}

/** El mismo nombre en dos páginas (un músico en dos géneros, una compañía repetida): se queda la primera con las redes de ambas. */
export function unirDuplicados<T extends { nombre: string; redes: Enlace[]; correos: string[]; descripcion: string | null; url_fuente: string }>(fichas: T[]): { unicas: T[]; repetidas: { nombre: string; urls: string[] }[] } {
  const porNombre = new Map<string, T>();
  const repetidas = new Map<string, string[]>();
  for (const f of fichas) {
    const clave = normalizarNombre(f.nombre);
    const previa = porNombre.get(clave);
    if (!previa) {
      porNombre.set(clave, f);
      continue;
    }
    repetidas.set(f.nombre, [...(repetidas.get(f.nombre) ?? [previa.url_fuente]), f.url_fuente]);
    if (!previa.descripcion && f.descripcion) previa.descripcion = f.descripcion;
    previa.redes = normalizarRedes([...previa.redes, ...f.redes]);
    for (const c of f.correos) if (!previa.correos.includes(c)) previa.correos.push(c);
  }
  return { unicas: [...porNombre.values()], repetidas: [...repetidas].map(([nombre, urls]) => ({ nombre, urls })) };
}
