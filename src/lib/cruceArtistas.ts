import { normalizarNombre } from "./lugares";
import { clavesDeNombre } from "./rutinas/nombresArtistas";

/**
 * Quién es quién entre los nombres de artistas que trae una agenda y las fichas que ya existen (OL-440). Antes el importador solo ligaba la
 * ficha con el nombre exacto, y «Orquesta Sinfónica de San Luis» no encontraba a «Orquesta Sinfónica de San Luis Potosí». Funciones puras: las
 * usan el importador de la Mac (por `src/lib/cargaEventos.ts`) y el guion que liga lo ya cargado (`scripts/instituciones/ligar-artistas.ts`).
 *
 * Un nombre se cruza por niveles, del más seguro al menos; el primero que da algo decide, y si da dos fichas distintas es «ambiguo» y no se
 * liga (lo ambiguo no se adivina):
 *   1. igual       las formas de `clavesDeNombre` (OL-430: acentos, mayúsculas, «y/&», comillas, el artículo o «Grupo» del principio) más sin
 *                  «Dr.», «Mtra.»…, «y sus» como «y» y, en un grupo, sin preposiciones y con la ciudad o «Gobierno del Estado» como una sola
 *                  marca («Mariachi de Gobierno del Estado» = «Mariachi del Gobierno del Estado de San Luis Potosí»);
 *   2. parte       uno de los nombres de un alias («La Lupita · Irma Zamora», «Juan Pérez (piano)»), de un lado o del otro;
 *   3. apellidos   una persona con uno o dos apellidos de más («Xiadani Robles Ugalde» = «Xiadani Robles»), si lo corto no acaba en un nombre
 *                  de pila («José Luis» no es «José Luis Mendoza»); grupo   un grupo cuyo nombre propio está entero en el otro («Grupo de Danza
 *                  Folclórica Viento Sur» = «… Viento Sur del IPBA»), con dos palabras propias al menos («Coro Polifónico» no es «Coro
 *                  Polifónico del IPBA»);
 *   4. integrante  una persona que la ficha de un grupo o colectivo nombra en su detalle o su descripción («Carlos de Santos» en Pargazz).
 * Varias personas en un mismo texto («Carlos de Santos y Óscar Loredo») se cruzan cada una por su lado. Nunca se une por parecido de letras:
 * «Xia Robles» no es «Xiadani Robles» y «Yesenia» no es «Yessenia» (mejor una propuesta de más que dos personas en una ficha).
 */

export type FichaArtista = {
  id: string;
  nombre: string;
  tipo?: string | null;
  disciplina?: string | null;
  detalle?: string | null;
  descripcion?: string | null;
  visible?: boolean | null;
};

export type ComoCruce = "igual" | "parte" | "apellidos" | "grupo" | "integrante" | "titulo";
export const COMO_CRUCE: Record<ComoCruce, string> = {
  igual: "el mismo nombre",
  parte: "parte del nombre",
  apellidos: "con apellidos de más",
  grupo: "el mismo grupo",
  integrante: "integrante del grupo",
  titulo: "nombrado en el título",
};

/** Lo que dice un nombre de la agenda: con qué ficha va (y cómo se supo), sin ficha, o ambiguo (con las que se parecen). */
export type Unidad =
  | { nombre: string; ficha: FichaArtista; como: ComoCruce }
  | { nombre: string; ficha: null; ambiguas: FichaArtista[] }
  | { nombre: string; ficha: null; ambiguas: null };

// ---------- palabras ----------
/** Las que unen o acompañan y no distinguen: «Ensamble Musical de la Casa de Cultura del Barrio» = «… Casa de Cultura Barrio». */
const PARTICULAS = new Set(["de", "del", "la", "las", "los", "el", "y", "e", "sus", "su", "da", "do", "dos", "van", "von", "di", "a", "al"]);
/** Las que dicen que el nombre es de un grupo, no de una persona. */
const PALABRAS_DE_GRUPO = new Set([
  "orquesta", "banda", "coro", "coros", "coral", "mariachi", "camerata", "rondalla", "rondallas", "ensamble", "ballet", "compania", "companias",
  "grupo", "grupos", "cuarteto", "trio", "duo", "dueto", "quinteto", "sexteto", "estudiantina", "conjunto", "colectivo", "capella", "orfeon",
  "big", "band", "club", "comunidad", "asociacion", "taller", "talleres", "alumnos", "alumnas", "alumnado", "escuela", "academia",
  "producciones", "sonora", "sonidero", "sound", "system", "circulo", "delegacion", "solistas", "voces", "agrupacion", "filarmonica",
  "teatro", "danza",
]);
/** Las que describen a un grupo sin nombrarlo: «Sinfónica», «Juvenil», «de Guitarras». Solas no distinguen uno de otro. */
const DESCRIPTORES = new Set([
  "sinfonica", "sinfonico", "polifonico", "polifonica", "juvenil", "juveniles", "infantil", "universitario", "universitaria", "folklorico",
  "folklorica", "folclorico", "folclorica", "musical", "musica", "municipal", "estatal", "nacional", "internacional", "popular", "tradicional",
  "regional", "camara", "clasico", "clasica", "contemporaneo", "contemporanea", "experimental", "independiente", "danza", "danzas", "teatro",
  "guitarras", "guitarra", "cuerdas", "metales", "alientos", "percusiones", "jazz", "rock", "mexicano", "mexicana", "arte", "artes",
  "artistico", "artistica", "cultura", "cultural", "casa", "barrio", "adulto", "adultos", "mayor", "mayores", "ninos", "jovenes", "nueva",
  "generacion", "gobierno", "estado", "zzciudad",
]);
/** Palabras de un título que dicen qué clase de actividad es, no quién: una ficha que solo se llama así no se busca en los títulos. */
const GENERICAS_TITULO = new Set([
  "concierto", "recital", "homenaje", "presentacion", "funcion", "obra", "exposicion", "festival", "noche", "tarde", "gala", "temporada",
  "inauguracion", "clausura", "lectura", "taller", "danza", "musica", "teatro", "serenata", "aniversario", "especial", "edicion",
]);
/** Un nombre que empieza así es de una institución, no de un grupo: no se une a «su» orquesta o «su» coro por estar dentro de su nombre. */
const INSTITUCIONES = new Set([
  "escuela", "instituto", "universidad", "facultad", "museo", "casa", "centro", "secretaria", "club", "asociacion", "delegacion", "colegio",
  "preparatoria", "academia",
]);
/** Títulos que van delante de un nombre: «Dr. Chessani» es «Chessani». */
const HONORIFICO = /^(dr|dra|doctor|doctora|mtro|mtra|maestro|maestra|lic|licenciado|licenciada|ing|prof|profa|profr|profra|profesor|profesora|arq|don|dona|sr|sra|srta|srita)\.?\s+/i;
/**
 * Nombres de pila comunes: si lo corto acaba en uno, no tiene apellido y no se le suman apellidos («José Luis» no es «José Luis Mendoza»;
 * «Miguel Ángel» no es «Miguel Ángel Ortega»). También dicen que un nombre de dos palabras es de una persona y no de un grupo.
 */
export const NOMBRES_DE_PILA: ReadonlySet<string> = new Set([
  "jose", "juan", "luis", "carlos", "miguel", "angel", "maria", "ana", "antonio", "manuel", "francisco", "jesus", "javier", "alejandro",
  "alejandra", "fernando", "fernanda", "gerardo", "eduardo", "ricardo", "roberto", "daniel", "daniela", "david", "jorge", "pedro", "pablo",
  "rafael", "ramon", "raul", "sergio", "victor", "hector", "enrique", "alberto", "arturo", "oscar", "mario", "martin", "diego", "gabriel",
  "gabriela", "guadalupe", "lupita", "isabel", "elena", "teresa", "carmen", "rosa", "luisa", "patricia", "laura", "sofia", "valeria",
  "andrea", "monica", "veronica", "adriana", "claudia", "paola", "mariana", "lucia", "beatriz", "cristina", "silvia", "margarita",
  "josefina", "leticia", "susana", "alicia", "lourdes", "rocio", "dolores", "eugenia", "ines", "esther", "raquel", "julia", "julio",
  "cesar", "ignacio", "emilio", "emiliano", "santiago", "sebastian", "mateo", "nicolas", "tomas", "andres", "felipe", "agustin",
  "salvador", "alfredo", "alfonso", "armando", "ernesto", "guillermo", "gustavo", "hugo", "ivan", "joaquin", "lorenzo", "marco", "marcos",
  "octavio", "omar", "rodrigo", "ruben", "samuel", "saul", "ulises", "damian", "josue", "adrian", "abraham", "efrain", "elias", "isaac",
  "israel", "jaime", "jairo", "joel", "leonardo", "leonel", "lucas", "abel", "benjamin", "xavier", "angelica", "karla", "karina", "liliana",
  "lorena", "maribel", "martha", "marta", "miriam", "norma", "olga", "pilar", "sandra", "sara", "yolanda", "irma", "estela", "fatima",
  "ximena", "regina", "renata", "camila", "valentina", "victoria", "eva", "elisa", "alma", "irene", "jacqueline", "jaqueline", "carolina",
  "natalia", "paula", "diana", "alexa", "alexis", "jonathan", "kevin", "erick", "eric", "edgar", "rogelio", "rolando", "rene", "nestor",
  "felix", "fabian", "cristian", "christian", "esteban", "federico", "gilberto", "humberto", "jacobo", "jeronimo", "macario", "mauricio",
  "moises", "noe", "patricio", "ramiro", "reynaldo", "rigoberto", "tadeo", "teodoro", "vicente", "yuritzi", "ixchel", "itzel", "citlali",
]);

const tokensDe = (t: string): string[] => normalizarNombre(t).split(" ").filter(Boolean);
const compacto = (ts: readonly string[]): string[] => ts.filter((t) => !PARTICULAS.has(t));
const esPropia = (t: string, minimo = 3): boolean =>
  t.length >= minimo && !/^\d+$/.test(t) && !PARTICULAS.has(t) && !PALABRAS_DE_GRUPO.has(t) && !DESCRIPTORES.has(t);

/** El nombre sin el título de delante («Dr. Chessani» → «Chessani»); si no queda nada, el nombre tal cual. */
export function sinHonorifico(nombre: string): string {
  const sin = nombre.trim().replace(HONORIFICO, "");
  return normalizarNombre(sin).length >= 3 ? sin : nombre.trim();
}

/** ¿Es el nombre de un grupo? Empieza por «Los/Las» o lleva una palabra de grupo, o es «X y sus Y». */
export function esNombreDeGrupo(nombre: string): boolean {
  const ts = tokensDe(nombre);
  if (!ts.length) return false;
  if (ts[0] === "los" || ts[0] === "las") return true;
  if (/\s(y|e)\s+(sus|su)\s/.test(` ${normalizarNombre(nombre)} `)) return true;
  return ts.some((t) => PALABRAS_DE_GRUPO.has(t));
}

/** ¿Puede ser el nombre de una persona? No es de grupo y tiene al menos nombre y apellido (sin «de», «del»…). */
export function esPersona(nombre: string): boolean {
  return !esNombreDeGrupo(nombre) && compacto(tokensDe(sinHonorifico(nombre))).length >= 2;
}

/** ¿Tiene apellido? Persona cuya última palabra no es un nombre de pila («Renata Ibarra» sí; «José Luis», «Paola del Carmen» no). */
function conApellido(nombre: string): boolean {
  const c = compacto(tokensDe(sinHonorifico(nombre)));
  return esPersona(nombre) && !NOMBRES_DE_PILA.has(c.at(-1) ?? "");
}

/** ¿Se lee como nombre y apellido? Persona que empieza por un nombre de pila: «Juan Pérez» sí, «Viento Sur» no. */
function pareceDePersona(nombre: string): boolean {
  const c = compacto(tokensDe(sinHonorifico(nombre)));
  return esPersona(nombre) && c.length <= 5 && NOMBRES_DE_PILA.has(c[0] ?? "");
}

// ---------- la ciudad ----------
const GENTILICIOS: Record<string, readonly string[]> = { "san luis potosi": ["potosino", "potosina", "potosinos", "potosinas"] };

/**
 * Cómo se nombra la ciudad dentro del nombre de un grupo: entera, sus dos primeras palabras, la última si es larga, sus iniciales (juntas y
 * separadas, como quedan «S.L.P.» al normalizar) y su gentilicio. «San Luis Potosí»: san luis potosi, san luis, potosi, slp, s l p, potosino…
 * De la más larga a la más corta, para reemplazar primero lo entero.
 */
export function formasDeCiudad(ciudad: string): string[] {
  const n = normalizarNombre(ciudad);
  const ts = n.split(" ").filter(Boolean);
  if (!ts.length) return [];
  const formas = new Set<string>([n]);
  if (ts.length >= 3) formas.add(ts.slice(0, 2).join(" "));
  const ultima = ts.at(-1) ?? "";
  if (ts.length >= 2 && ultima.length >= 5) formas.add(ultima);
  const iniciales = ts.filter((t) => !PARTICULAS.has(t)).map((t) => t[0]);
  if (iniciales.length >= 2) {
    formas.add(iniciales.join(""));
    formas.add(iniciales.join(" "));
  }
  for (const g of GENTILICIOS[n] ?? []) formas.add(g);
  return [...formas].sort((a, b) => b.length - a.length);
}

/**
 * Las palabras propias de un grupo, en orden: sin preposiciones ni artículos, y la ciudad, «Gobierno del Estado» o «del Estado» como una sola
 * marca (en la agenda de una ciudad, el Gobierno del Estado es el de esa ciudad). «Orquesta Sinfónica del Gobierno del Estado de San Luis
 * Potosí» → orquesta sinfonica ‹ciudad›, igual que «Orquesta Sinfónica de San Luis».
 */
export function palabrasDeGrupo(nombre: string, formasCiudad: readonly string[]): string[] {
  let s = ` ${normalizarNombre(sinHonorifico(nombre))} `;
  s = s.replace(/ gobierno (del estado|estatal) /g, " zzciudad ");
  for (const f of formasCiudad) s = s.split(` ${f} `).join(" zzciudad ");
  s = s.replace(/ (del|de) estado /g, " zzciudad ");
  const ts = compacto(s.trim().split(" ").filter(Boolean));
  return ts.filter((t, i) => !(t === "zzciudad" && ts[i - 1] === "zzciudad"));
}

// ---------- claves ----------
/**
 * Las formas con las que se reconoce un nombre: las de `clavesDeNombre` (OL-430) del nombre, sin su título de delante y con «y sus» como «y»;
 * y, si es de un grupo, sus palabras propias con la ciudad como marca (clave «g:…», que solo iguala a otro grupo).
 */
export function clavesCruce(nombre: string, formasCiudad: readonly string[]): Set<string> {
  const claves = new Set<string>();
  const ysus = (t: string) => t.replace(/\s+(y|e|&)\s+(sus|su|los|las)\s+/gi, " y ");
  for (const v of new Set([nombre, sinHonorifico(nombre), ysus(nombre), sinHonorifico(ysus(nombre))])) for (const k of clavesDeNombre(v)) claves.add(k);
  if (esNombreDeGrupo(nombre)) {
    const g = palabrasDeGrupo(ysus(nombre), formasCiudad).join(" ");
    if (g.replace(/zzciudad/g, "").trim().length >= 3) claves.add(`g:${g}`);
  }
  return claves;
}

// ---------- partes de un nombre ----------
/** Varias personas en un texto: «Carlos de Santos y Óscar Loredo», «Ana López, Luis Pérez y Eva Ruiz». Solo si TODAS las piezas son personas. */
export function personasDe(nombre: string): string[] {
  const piezas = nombre.split(/\s*[,;]\s*|\s+(?:y|e|&)\s+/i).map((p) => p.trim()).filter(Boolean);
  return piezas.length >= 2 && piezas.every(esPersona) ? piezas : [nombre.trim()];
}

/** Los nombres de un alias: «La Lupita · Irma Zamora», «Juan Pérez (piano)», «Selene | la voz del norte». Sin alias, ninguno. */
export function partesDeAlias(nombre: string): string[] {
  const partes = nombre
    .split(/\s*[·|/()[\]]\s*|\s+[-–—]\s+|\s*:\s+/)
    .map((p) => p.trim())
    .filter((p) => normalizarNombre(p).length >= 3);
  return partes.length >= 2 ? partes : [];
}

// ---------- el índice ----------
type Forma = { texto: string; persona: string[] | null; conApellido: boolean; esGrupo: boolean; grupo: string[]; pareceDePersona: boolean };
type Entrada = {
  ficha: FichaArtista;
  claves: Set<string>;
  clavesPartes: Set<string>;
  /** El nombre entero y sus partes de alias. */
  formas: Forma[];
  /** Detalle y descripción normalizados, entre espacios, si es grupo o colectivo (para encontrar a sus integrantes). */
  texto: string | null;
};
export type IndiceArtistas = { formasCiudad: string[]; entradas: Entrada[]; porClave: Map<string, Entrada[]>; porClaveParte: Map<string, Entrada[]> };

function forma(texto: string, formasCiudad: readonly string[]): Forma {
  const grupo = esNombreDeGrupo(texto);
  return {
    texto,
    persona: grupo ? null : compacto(tokensDe(sinHonorifico(texto))),
    conApellido: conApellido(texto),
    esGrupo: grupo,
    grupo: palabrasDeGrupo(texto, formasCiudad),
    pareceDePersona: pareceDePersona(texto),
  };
}

const anotar = (mapa: Map<string, Entrada[]>, clave: string, e: Entrada) => {
  const lista = mapa.get(clave);
  if (!lista) mapa.set(clave, [e]);
  else if (!lista.includes(e)) lista.push(e);
};

/** Suma una ficha al índice (también sirve para las propuestas que se van armando: una propuesta es una ficha que aún no existe). */
export function sumarAlIndice(indice: IndiceArtistas, ficha: FichaArtista): void {
  const partes = partesDeAlias(ficha.nombre);
  const esGrupo = ficha.tipo === "grupo" || ficha.tipo === "colectivo" || esNombreDeGrupo(ficha.nombre);
  const texto = esGrupo ? normalizarNombre(`${ficha.detalle ?? ""} ${ficha.descripcion ?? ""}`) : "";
  const e: Entrada = {
    ficha,
    claves: clavesCruce(ficha.nombre, indice.formasCiudad),
    clavesPartes: new Set(partes.flatMap((p) => [...clavesCruce(p, indice.formasCiudad)])),
    formas: [ficha.nombre, ...partes].map((t) => forma(t, indice.formasCiudad)),
    texto: texto ? ` ${texto} ` : null,
  };
  indice.entradas.push(e);
  for (const k of e.claves) anotar(indice.porClave, k, e);
  for (const k of e.clavesPartes) anotar(indice.porClaveParte, k, e);
}

/** El índice de las fichas de una ciudad, para cruzar muchos nombres sin recorrerlas todas cada vez. */
export function indiceDeArtistas(fichas: readonly FichaArtista[], ciudad = "San Luis Potosí"): IndiceArtistas {
  const indice: IndiceArtistas = { formasCiudad: formasDeCiudad(ciudad), entradas: [], porClave: new Map(), porClaveParte: new Map() };
  for (const f of fichas) sumarAlIndice(indice, f);
  return indice;
}

// ---------- el cruce ----------
/** ¿`corta` está entera, seguida, dentro de `larga`? */
function contenida(corta: readonly string[], larga: readonly string[]): boolean {
  if (!corta.length || corta.length >= larga.length) return false;
  for (let i = 0; i + corta.length <= larga.length; i++) if (corta.every((t, j) => larga[i + j] === t)) return true;
  return false;
}

/** Una persona con uno o dos apellidos de más que la otra: la corta tiene apellido y es el principio de la larga. */
function mismaPersona(a: Forma, b: Forma): boolean {
  if (!a.persona || !b.persona) return false;
  const [corta, cortaForma, larga] = a.persona.length <= b.persona.length ? [a.persona, a, b.persona] : [b.persona, b, a.persona];
  const extra = larga.length - corta.length;
  return cortaForma.conApellido && corta.length >= 2 && extra >= 1 && extra <= 2 && larga.length <= 6 && corta.every((t, i) => larga[i] === t);
}

/**
 * Un grupo cuyo nombre propio (dos palabras propias o más) está entero y seguido en el nombre de otro grupo: «Viento Sur» en «Grupo de Danza
 * Folclórica Viento Sur del IPBA». El largo tiene que ser de grupo; lo corto que se lee como nombre de persona («Juan Pérez» en «Juan Pérez y
 * su Banda») o de una institución («Escuela Estatal de Iniciación Musical…» en «Orquesta de guitarras de la Escuela…») no cuenta.
 */
function mismoGrupo(a: Forma, b: Forma): boolean {
  const [corta, larga] = a.grupo.length <= b.grupo.length ? [a, b] : [b, a];
  if (!larga.esGrupo || corta.pareceDePersona || INSTITUCIONES.has(corta.grupo[0] ?? "")) return false;
  if (corta.grupo.filter((t) => esPropia(t)).length < 2) return false;
  return contenida(corta.grupo, larga.grupo);
}

/** Lo que dio un nivel: una ficha (decide), varias (ambiguo, decide) o ninguna (sigue el siguiente). */
function decidir(nombre: string, halladas: Iterable<Entrada>, como: ComoCruce): Unidad | null {
  const fichas = [...new Map([...halladas].map((e) => [e.ficha.id, e.ficha])).values()];
  if (fichas.length === 1) return { nombre, ficha: fichas[0], como };
  if (fichas.length > 1) return { nombre, ficha: null, ambiguas: fichas };
  return null;
}

/** Cruza el nombre de UN artista (con sus posibles alias) contra el índice. */
function cruzarUno(nombre: string, indice: IndiceArtistas): Unidad {
  const claves = clavesCruce(nombre, indice.formasCiudad);
  const iguales = [...claves].flatMap((k) => indice.porClave.get(k) ?? []);
  const igual = decidir(nombre, iguales, "igual");
  if (igual) return igual;

  const partes = partesDeAlias(nombre);
  const todas = new Set([...claves, ...partes.flatMap((p) => [...clavesCruce(p, indice.formasCiudad)])]);
  const porParte = [...todas].flatMap((k) => [...(indice.porClaveParte.get(k) ?? []), ...(partes.length ? (indice.porClave.get(k) ?? []) : [])]);
  const parte = decidir(nombre, porParte, "parte");
  if (parte) return parte;

  const mias = [nombre, ...partes].map((t) => forma(t, indice.formasCiudad));
  const porApellidos = indice.entradas.filter((e) => mias.some((m) => e.formas.some((f) => mismaPersona(m, f))));
  const apellidos = decidir(nombre, porApellidos, "apellidos");
  if (apellidos) return apellidos;
  const porGrupo = indice.entradas.filter((e) => mias.some((m) => e.formas.some((f) => mismoGrupo(m, f))));
  const grupo = decidir(nombre, porGrupo, "grupo");
  if (grupo) return grupo;

  const personas = [nombre, ...partes].filter(conApellido).map((t) => ` ${normalizarNombre(sinHonorifico(t))} `);
  const porIntegrante = personas.length ? indice.entradas.filter((e) => e.texto && personas.some((p) => e.texto!.includes(p))) : [];
  return decidir(nombre, porIntegrante, "integrante") ?? { nombre, ficha: null, ambiguas: null };
}

/**
 * Cruza un nombre de la agenda con las fichas: una unidad por artista (varias personas en un texto se cruzan cada una; si nada se separa, el
 * texto entero). Lo que no tiene ficha queda con `ficha: null` para proponerlo; lo ambiguo, con las fichas que se le parecen.
 */
export function cruzarNombre(nombre: string, indice: IndiceArtistas): Unidad[] {
  const limpio = nombre.replace(/\s+/g, " ").trim();
  if (normalizarNombre(limpio).length < 2) return [];
  const entero = cruzarUno(limpio, indice);
  if (entero.ficha || entero.ambiguas) return [entero];
  const personas = personasDe(limpio);
  return personas.length >= 2 ? personas.map((p) => cruzarUno(p, indice)) : [entero];
}

// ---------- la disciplina de un evento ----------
type DisciplinaDeEvento = "musica" | "teatro" | "danza" | "artes_visuales" | "letras" | "cine" | "circo";
/** En este orden: «Presentación de danza» es danza y no letras; «Teatro musical» es teatro. */
const REGLAS_DISCIPLINA: readonly [DisciplinaDeEvento, RegExp][] = [
  ["letras", /\b(presentacion (de |del )?(libro|poemario|novela|revista|antologia)|presentacion editorial|libros?|poemarios?|poesia|poemas?|poetas?|lecturas? (de|en voz)|literari[oa]s?|cuentos?|novelas?|palique|declamacion|tertulia literaria|escritor(a|es|as)?)\b/],
  ["teatro", /\b(obra de teatro|obras? teatral(es)?|teatro|teatral|puesta en escena|monologos?|dramaturgi[ao]|titeres|pastorela|clown|cabaret|obra)\b/],
  ["danza", /\b(danzas?|ballet|bailes?|folklor\w*|folclor\w*|danzon|tango|flamenco|coreografi\w*|huapangueada)\b/],
  ["musica", /\b(conciertos?|recital(es)?|serenatas?|musica|musical(es)?|sinfonic\w*|orquestas?|coros?|coral|mariachi|banda|rondallas?|ensamble|cantos?|canciones|jazz|rock|sones|son (jarocho|huasteco)|trova|opera|camerata|piano|guitarras?|dj)\b/],
  ["artes_visuales", /\b(exposicion(es)?|expo|muestra (plastica|fotografica|pictorica)|pintura|fotografi\w*|grabados?|escultura|plastica|murales?|ilustracion|instalacion|galeria)\b/],
  ["cine", /\b(cine|cineclub|proyeccion|peliculas?|documental(es)?|cortometrajes?|largometrajes?|filmes?)\b/],
  ["circo", /\b(circo|circense|malabar\w*|acrobac\w*)\b/],
];

/**
 * La disciplina que dice un evento: lo que dice el título primero y, si no dice nada, su descripción. «Concierto…» → música, «Obra…» →
 * teatro, «Exposición…» → artes visuales, «Presentación del libro…» → letras. Sin pista, null.
 */
export function disciplinaDeEvento(titulo: string, descripcion?: string | null): DisciplinaDeEvento | null {
  for (const texto of [titulo, descripcion ?? ""]) {
    const n = normalizarNombre(texto);
    if (!n) continue;
    const r = REGLAS_DISCIPLINA.find(([, re]) => re.test(n));
    if (r) return r[0];
  }
  return null;
}

// ---------- el título ----------
/** ¿El nombre tiene una palabra propia de cuatro letras o más que no sea de las que nombran una actividad? «Pargazz» sí, «Concierto» no. */
function nombreDistinto(nombre: string): boolean {
  return tokensDe(nombre).some((t) => esPropia(t, 4) && !GENERICAS_TITULO.has(t));
}

/**
 * La ficha que un título nombra como uno de sus tramos («Gitanos mexicanos 2ª edición: PARGAZZ» → Pargazz), con el mismo nombre (nivel igual)
 * y de la misma disciplina que el evento (un grupo «Raíces» de música no es la exposición «Inauguración: Raíces»). Sin disciplina del evento,
 * o con una ficha «por completar», no se liga: sería adivinar. Solo una; si dos, ninguna.
 */
export function fichaDelTitulo(titulo: string, disciplina: string | null, indice: IndiceArtistas): FichaArtista | null {
  if (!disciplina) return null;
  const tramos = titulo.split(/\s*[:·|]\s*|\s+[-–—]\s+/).map((t) => t.trim()).filter((t) => normalizarNombre(t).length >= 3);
  const halladas = new Map<string, FichaArtista>();
  for (const t of tramos)
    for (const k of clavesCruce(t, indice.formasCiudad))
      for (const e of indice.porClave.get(k) ?? []) if (e.ficha.disciplina === disciplina && nombreDistinto(e.ficha.nombre)) halladas.set(e.ficha.id, e.ficha);
  return halladas.size === 1 ? [...halladas.values()][0] : null;
}
