import { cruzarNombre, disciplinaDeEvento, fichaDelTitulo, type ComoCruce, type FichaArtista, type IndiceArtistas } from "./cruceArtistas";
import { COOPERACION_SOLIDARIA } from "./eventos";
import { diaLocal, zonaSegura } from "./fechas";
import { normalizarNombre } from "./lugares";
import { titulosParecidos } from "./sugerenciasParecido";

/**
 * Cómo se carga un evento de una agenda (OL-429): lo que antes vivía en `scripts/instituciones/instituciones.ts` (OL-384, OL-424) y ahora usan
 * igual el importador de la Mac (`importar-eventos.ts`) y el servidor (la rutina «Buscar agendas y eventos» y la publicación de un evento
 * aceptado en la bandeja, `src/lib/rutinas/publicarEvento.ts`). Funciones puras, sin `server-only` (el script de la Mac también las importa) y
 * sin llaves: las búsquedas en Mapbox y la base se le pasan desde fuera.
 *   · `resolverLugar`: el lugar registrado con ese nombre (igual al normalizar o el único que coincide; lo ambiguo no se adivina).
 *   · `formularioDeEvento`: lo que mandaría el formulario de alta (gratis, «Cooperación solidaria» en su casilla, precio), para `validarEvento`.
 *   · `parecidoGuardado`: el evento ya guardado que parece el mismo (la regla de `eventos_parecidos`, también para lo pasado y lo oculto).
 *   · `elegirPunto` y `ubicarSitio`: dónde va el pin de un sitio que no está en el directorio, contrastando nombre y dirección.
 *   · `artistasDelEvento`: con qué fichas de artista se liga el evento (el cruce de OL-440, `src/lib/cruceArtistas.ts`).
 */

export type Punto = { lat: number; lng: number };

const VACIAS = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "en", "a", "al", "san", "luis", "potosi", "slp"]);
/** Palabras que dicen qué clase de sitio es, no cuál: solas no identifican un lugar. */
const GENERICAS = new Set([
  "museo", "casa", "cultura", "centro", "cultural", "teatro", "galeria", "biblioteca", "escuela", "instituto", "foro", "espacio",
  "arte", "artes", "sala", "auditorio", "publica", "municipal", "estatal", "universitario", "universitaria", "cineteca", "cine",
  "libreria", "taller", "plaza", "jardin", "parque",
]);

function palabras(t: string): string[] {
  return normalizarNombre(t).split(" ").filter((w) => w.length > 1 && !VACIAS.has(w));
}

/**
 * ¿Hablan del mismo sitio dos nombres? Los nombres propios del más corto están todos en el otro y, si los dos dicen
 * qué clase de sitio son, comparten esa palabra: "Museo Laberinto" ≈ "Museo Laberinto de las Ciencias y las Artes",
 * pero "Casa de la Cultura" no identifica nada y "Teatro de la Paz" no es "Plaza de la Paz".
 */
export function nombresCoinciden(a: string, b: string): boolean {
  const pa = palabras(a);
  const pb = palabras(b);
  const propiasA = new Set(pa.filter((w) => !GENERICAS.has(w)));
  const propiasB = new Set(pb.filter((w) => !GENERICAS.has(w)));
  if (!propiasA.size || !propiasB.size) return false;
  const [corta, larga] = propiasA.size <= propiasB.size ? [propiasA, propiasB] : [propiasB, propiasA];
  if (![...corta].every((w) => larga.has(w))) return false;
  const genericasA = pa.filter((w) => GENERICAS.has(w));
  const genericasB = new Set(pb.filter((w) => GENERICAS.has(w)));
  if (genericasA.length && genericasB.size) return genericasA.some((w) => genericasB.has(w));
  // Si uno no dice qué clase de sitio es, solo vale el mismo nombre propio completo, de dos palabras o más.
  return propiasA.size === propiasB.size && propiasA.size >= 2;
}


export function metrosEntre(a: Punto, b: Punto): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}


/** Un punto que dio una búsqueda (o la fuente), con su dirección y, si se buscó por nombre, el nombre que encontró. */
export type PuntoEncontrado = Punto & { direccion: string; nombre?: string };
export type Eleccion = { punto: PuntoEncontrado; como: "Mapbox por nombre" | "Mapbox por dirección" | "coordenadas de la fuente"; nota: string | null };

/** A cuántos metros dos puntos cuentan como el mismo sitio. */
const CERCA_M = 250;

/**
 * ¿El lugar que Mapbox encontró por nombre está en la calle y el número investigados? Se compara el primer tramo de
 * la dirección (calle y número): "Santa Martha 521, Rancho Blanco" ≈ "Calle Sta. Martha 521, 78436 Soledad".
 */
export function mismaCalleYNumero(pedida: string, devuelta: string): boolean {
  const calle = normalizarNombre(pedida.split(",")[0] ?? "").split(" ");
  const respuesta = new Set(normalizarNombre(devuelta).split(" "));
  const numero = calle.filter((w) => /^\d{1,4}$/.test(w)).at(-1);
  return !!numero && respuesta.has(numero) && calle.some((w) => w.length >= 4 && !/^(calle|avenida|prolongacion|boulevard|calzada)$/.test(w) && respuesta.has(w));
}

/**
 * Dónde va el pin. Si Mapbox por nombre (la puerta del edificio) y por dirección coinciden, gana el nombre; si
 * discrepan, desempatan la fuente o que el lugar por nombre esté en la calle y el número investigados; si no, gana
 * la dirección con aviso. Con uno solo, ese, salvo que sea solo la dirección y la fuente discrepe: un número que Mapbox
 * interpola vale menos que las coordenadas de una ficha oficial. Sin Mapbox, la fuente con aviso. Sin nada, null.
 */
export function elegirPunto(fuente: PuntoEncontrado | null, porNombre: PuntoEncontrado | null, porDireccion: PuntoEncontrado | null, pedida = ""): Eleccion | null {
  if (porNombre && porDireccion) {
    const m = Math.round(metrosEntre(porNombre, porDireccion));
    if (m <= CERCA_M) return { punto: porNombre, como: "Mapbox por nombre", nota: null };
    if (fuente && metrosEntre(fuente, porNombre) <= CERCA_M)
      return { punto: porNombre, como: "Mapbox por nombre", nota: `la dirección cae a ${m} m; la fuente coincide con el nombre` };
    if (pedida && mismaCalleYNumero(pedida, porNombre.direccion))
      return { punto: porNombre, como: "Mapbox por nombre", nota: `la dirección cae a ${m} m, pero «${porNombre.nombre ?? ""}» está en la calle y el número investigados` };
    return {
      punto: porDireccion,
      como: "Mapbox por dirección",
      nota: `por nombre («${porNombre.nombre ?? ""}», ${porNombre.direccion || "sin dirección"}) cae a ${m} m de «${porDireccion.direccion}»: revisar`,
    };
  }
  const uno = porNombre ?? porDireccion;
  if (uno) {
    const como = porNombre ? "Mapbox por nombre" : "Mapbox por dirección";
    const lejos = fuente ? Math.round(metrosEntre(fuente, uno)) : 0;
    if (fuente && lejos > CERCA_M && !porNombre) return { punto: fuente, como: "coordenadas de la fuente", nota: `la dirección de Mapbox cae a ${lejos} m: se usaron las de la fuente` };
    if (fuente && lejos > CERCA_M) return { punto: uno, como, nota: `la fuente da un punto a ${lejos} m: revisar` };
    return { punto: uno, como, nota: porNombre ? `sin número exacto en Mapbox; ubicado como «${porNombre.nombre ?? ""}»` : null };
  }
  if (fuente) return { punto: fuente, como: "coordenadas de la fuente", nota: "Mapbox no lo ubicó: revisar en el mapa" };
  return null;
}


/** Un evento de la agenda de una institución, ya elegido para cargar (importar-eventos.ts). */
export type EventoPropuesto = {
  titulo: string;
  /** Nombre del lugar registrado donde es. Si no hay lugar registrado, `sitio` con el texto público ("Plaza de Armas"). */
  lugar?: string | null;
  sitio?: string | null;
  /** El punto del `sitio` (todo sitio lleva el suyo, OL-348) y su dirección si la agenda la trae. Sin punto, con `--historico` se busca en
   *  Mapbox por el nombre del sitio y la dirección (mapbox.ts · ubicarSitio). */
  sitio_direccion?: string | null;
  sitio_lat?: number | null;
  sitio_lng?: number | null;
  /** YYYY-MM-DD y HH:MM, en hora de la ciudad. */
  fecha: string;
  hora: string;
  hora_fin?: string | null;
  /** "Gratis", vacío o null = gratis; si no, el texto del costo. */
  precio?: string | null;
  descripcion: string;
  enlace?: string | null;
  artistas?: string[];
};

/** La hora de fin como fecha local; si no es posterior al inicio, es del día siguiente (una función que acaba pasada la medianoche). */
export function finLocal(fecha: string, hora: string, horaFin: string | null | undefined): string {
  if (!horaFin) return "";
  if (horaFin > hora) return `${fecha}T${horaFin}`;
  const dia = new Date(`${fecha}T00:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() + 1);
  return `${dia.toISOString().slice(0, 10)}T${horaFin}`;
}

/**
 * El costo como lo escribe una agenda, a lo que entiende el formulario (OL-429): «Entrada libre», «Acceso gratuito», «Sin costo» → «Gratis»;
 * «Cooperación voluntaria» → «Cooperación solidaria» (su casilla); lo demás tal cual («$150», «$100 general, $50 estudiantes»). Vacío, null.
 */
export function precioDeAgenda(texto: string | null | undefined): string | null {
  const t = (texto ?? "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  const n = normalizarNombre(t);
  if (/^(entrada |acceso |evento )?(libre|gratis|gratuit[oa]|sin costo)( (entrada|acceso))?$/.test(n) || /^(entrada|acceso) (libre|gratuita|gratis)/.test(n)) return "Gratis";
  if (/^cooperacion (voluntaria|solidaria)/.test(n)) return COOPERACION_SOLIDARIA;
  return t;
}

/** Lo que mandaría el formulario de alta para este evento: se valida con lib/eventos · validarEvento. */
export function formularioDeEvento(e: EventoPropuesto, lugarId: string | null): Record<string, string> {
  const precio = (e.precio ?? "").trim();
  const gratis = !precio || /^gratis$/i.test(precio);
  // «Cooperación solidaria» (el costo sin cifra, OL-140) va en su casilla, no en el precio: el formulario lo rechaza como precio.
  const cooperacion = !gratis && normalizarNombre(precio) === normalizarNombre(COOPERACION_SOLIDARIA);
  return {
    modo_sitio: lugarId ? "lugar" : "otro",
    lugar_id: lugarId ?? "",
    sitio_texto: lugarId ? "" : (e.sitio ?? "").trim(),
    sitio_direccion: lugarId ? "" : (e.sitio_direccion ?? "").trim(),
    sitio_lat: lugarId || e.sitio_lat == null ? "" : String(e.sitio_lat),
    sitio_lng: lugarId || e.sitio_lng == null ? "" : String(e.sitio_lng),
    titulo: e.titulo,
    inicio: `${e.fecha}T${e.hora}`,
    fin: finLocal(e.fecha, e.hora, e.hora_fin),
    gratis: gratis ? "si" : "no",
    cooperacion: cooperacion ? "si" : "no",
    precio: gratis || cooperacion ? "" : precio,
    descripcion: e.descripcion,
    enlace: e.enlace ?? "",
  };
}

/** La sigla que un lugar lleva entre paréntesis al final («Centro de las Artes de San Luis Potosí Centenario (CEART)» → «ceart»). */
const siglaDe = (nombre: string): string => normalizarNombre(nombre.match(/\(([^()]{2,12})\)\s*$/)?.[1] ?? "");

/**
 * El lugar registrado con ese nombre: el igual al normalizar o, si no, el único cuyo nombre coincide; o el único cuya sigla entre paréntesis es
 * ese nombre («CEART», OL-433). Lo ambiguo no se adivina.
 */
export function resolverLugar<T extends { id: string; nombre: string }>(nombre: string | null | undefined, lugares: T[]): T | null {
  if (!nombre) return null;
  const n = normalizarNombre(nombre);
  const igual = lugares.find((l) => normalizarNombre(l.nombre) === n);
  if (igual) return igual;
  const parecidos = lugares.filter((l) => nombresCoinciden(nombre, l.nombre));
  if (parecidos.length === 1) return parecidos[0] ?? null;
  if (parecidos.length > 1) return null;
  const porSigla = n ? lugares.filter((l) => siglaDe(l.nombre) === n) : [];
  return porSigla.length === 1 ? (porSigla[0] ?? null) : null;
}


/** Las palabras que no cuentan (las mismas de `eventos_parecidos` y de `tituloDistintivo`). */
const VACIAS_TITULO = new Set(["de", "del", "la", "las", "los", "el", "y", "e", "en", "con", "a", "al", "para", "por", "un", "una", "o", "u", "the", "of", "and"]);

/** Las palabras con contenido de un título, como las cuenta `eventos_parecidos`: sin las vacías ni los años; un ordinal se queda con su número. */
function palabrasConContenido(titulo: string): Set<string> {
  return new Set(
    normalizarNombre(titulo)
      .split(" ")
      .filter((w) => w && !VACIAS_TITULO.has(w) && !/^(19|20)[0-9]{2}$/.test(w))
      .map((w) => w.replace(/^([0-9]+)(a|o|er|ra|da|do|ro|to|ta|vo|va|no|na|mo|ma)$/, "$1")),
  );
}

/**
 * ¿Dos títulos del mismo día y el mismo sitio son el mismo evento? La regla de `eventos_parecidos` (migración 20261012120000, OL-384), aquí
 * porque esa función solo mira lo que no ha pasado y una carga histórica compara contra lo pasado: (1) el mismo título normalizado; (2) uno
 * dentro del otro por palabras enteras y el corto distintivo (`titulosParecidos`); o (3) al menos dos palabras con contenido en común.
 */
export function titulosDelMismoEvento(a: string, b: string): boolean {
  const na = normalizarNombre(a);
  const nb = normalizarNombre(b);
  if (!na || !nb) return false;
  if (na === nb || titulosParecidos(a, b)) return true;
  const suyas = palabrasConContenido(b);
  return [...palabrasConContenido(a)].filter((w) => suyas.has(w)).length >= 2;
}

/**
 * Las palabras que dicen qué clase de actividad es, no cuál (OL-433): «Inauguración», «Concierto», «Taller», «Noche»… Dos títulos que solo
 * comparten estas no hablan del mismo evento («Inauguración de la exposición Raíces» y «… Ecos»); una de estas en un solo lado no los separa
 * («Xil» y «Xil en concierto»). En singular y sin acentos, como las deja `palabrasDeTitulo`.
 */
export const GENERICAS_EVENTO: ReadonlySet<string> = new Set([
  "inauguracion", "exposicion", "expo", "muestra", "concierto", "recital", "presentacion", "libro", "conferencia", "charla", "platica",
  "taller", "curso", "funcion", "obra", "teatro", "danza", "musica", "musical", "cine", "proyeccion", "pelicula", "recorrido", "visita",
  "guiada", "guiado", "lectura", "sesion", "noche", "tarde", "dia", "festival", "fest", "encuentro", "ciclo", "homenaje", "gala", "temporada",
  "edicion", "programa", "actividad", "evento", "jornada", "foro", "mesa", "panel", "coloquio", "seminario", "clase", "conversatorio",
  "exhibicion", "feria", "nacional", "internacional", "estatal", "municipal", "especial", "infantil", "familiar", "cultural", "arte",
  "artistica", "artistico", "invitado", "invitada", "entrada", "libre", "gratuita", "gratuito", "apertura", "clausura", "cierre", "inicio",
]);

/**
 * Singular a la española, sin diccionario, igual en los dos lados (OL-433): «noches» → «noche», «recorridos» → «recorrido», «canciones» →
 * «cancion», «festivales» → «festival». Palabras de tres letras o menos y números, tal cual.
 */
export function singular(w: string): string {
  if (w.length <= 3 || /\d/.test(w) || !w.endsWith("s") || w.endsWith("ss")) return w;
  if (w.endsWith("es") && /[lrndzj]$/.test(w.slice(0, -2)) && w.length > 4) return w.slice(0, -2);
  return w.slice(0, -1);
}

/** Las palabras con contenido de un título (las de `palabrasConContenido`) en singular y sin las de `quitar` (las del nombre del sitio). */
export function palabrasDeTitulo(titulo: string, quitar: ReadonlySet<string> = new Set()): Set<string> {
  return new Set([...palabrasConContenido(titulo)].map(singular).filter((w) => w && !VACIAS_TITULO.has(w) && !quitar.has(w)));
}

/** Las palabras del nombre de un sitio, como las cuenta `palabrasDeTitulo` («Noches de Recorridos CEART» en el CEART: «ceart» no distingue). */
export const palabrasDelSitio = (sitio: string | null | undefined): Set<string> => palabrasDeTitulo(sitio ?? "");

const distintiva = (w: string) => !GENERICAS_EVENTO.has(w);

/**
 * ¿Dos títulos del mismo día, la misma hora o el mismo sitio son la misma función? La regla de la rutina de agendas (OL-433), más fina que
 * `titulosDelMismoEvento` (la de `eventos_parecidos`, que el importador sigue usando):
 *   · el mismo título normalizado, sí;
 *   · se cuentan las palabras con contenido en singular, sin las del nombre del sitio («Noche de recorridos» = «Noches de Recorridos CEART» en
 *     el CEART);
 *   · si cada uno tiene una palabra propia que el otro no dice, son distintos («Inauguración: Raíces» y «Inauguración: Ecos»; «Concierto de la
 *     Banda de Música del Estado» y «Concierto de la Orquesta Sinfónica del Estado»);
 *   · si no, son el mismo cuando comparten dos palabras o una que no es genérica («Hermanos Pérez Meza Big Band» ⊂ «Los Hermanos Pérez Meza Big
 *     Band: Esto somos»; «Xil» y «Xil en concierto»), y no cuando solo comparten una genérica («Concierto» y «Concierto de jazz»).
 */
export function mismoEventoDeAgenda(a: string, b: string, sitio?: string | null): boolean {
  const na = normalizarNombre(a);
  const nb = normalizarNombre(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const quitar = palabrasDelSitio(sitio);
  const pa = palabrasDeTitulo(a, quitar);
  const pb = palabrasDeTitulo(b, quitar);
  // Si quitar el sitio deja vacío un título («CEART»), se compara sin quitarlo.
  const [A, B] = pa.size && pb.size ? [pa, pb] : [palabrasDeTitulo(a), palabrasDeTitulo(b)];
  if (!A.size || !B.size) return false;
  const soloA = [...A].filter((w) => !B.has(w));
  const soloB = [...B].filter((w) => !A.has(w));
  if (soloA.some(distintiva) && soloB.some(distintiva)) return false;
  const comunes = [...A].filter((w) => B.has(w));
  return comunes.length >= 2 || comunes.some(distintiva);
}

/** Un evento ya guardado, con lo justo para compararlo (la lectura del importador). */
export type EventoGuardado = {
  id: string;
  titulo: string;
  inicio: string;
  zona: string | null;
  lugar_id: string | null;
  sitio_texto: string | null;
  clase: string | null;
  borrador: boolean | null;
  visible: boolean | null;
  /** El fin (OL-433: un festival, una exposición o un evento de varios días ocupan un periodo). Opcional: el importador no lo lee. */
  fin?: string | null;
  /** El festival del que es un acto (OL-433). */
  evento_padre_id?: string | null;
};

/**
 * El evento ya guardado que parece el mismo que el que se va a cargar: el mismo día local, el mismo sitio (el mismo lugar del directorio o el
 * mismo nombre de sitio, venga del lugar o escrito a mano) y un título del mismo evento. Como `eventos_parecidos`, solo lo puntual y los talleres
 * y nunca un borrador; a diferencia de ella, también lo pasado y lo oculto (una carga histórica no debe volver a meter lo que la administración
 * ocultó). El más cercano en hora primero. `mismo` decide si dos títulos son el mismo evento: por omisión la regla de `eventos_parecidos`
 * (el importador); la rutina de agendas pasa la suya, más fina (`mismoEventoDeAgenda`, OL-433), con el nombre del sitio.
 */
export function parecidoGuardado(
  nuevo: { titulo: string; inicio: string; zona: string; lugar_id: string | null; sitio_texto: string | null },
  guardados: EventoGuardado[],
  lugares: { id: string; nombre: string }[],
  mismo: (a: string, b: string) => boolean = titulosDelMismoEvento,
): EventoGuardado | null {
  const nombreLugar = new Map(lugares.map((l) => [l.id, l.nombre]));
  const sitioDe = (lugarId: string | null, sitio: string | null) => normalizarNombre((lugarId ? nombreLugar.get(lugarId) : null) ?? sitio ?? "");
  const zona = zonaSegura(nuevo.zona);
  const dia = diaLocal(new Date(nuevo.inicio), zona);
  const sitio = sitioDe(nuevo.lugar_id, nuevo.sitio_texto);
  const t = new Date(nuevo.inicio).getTime();
  return (
    guardados
      .filter((g) => (g.clase ?? "puntual") === "puntual" || g.clase === "taller")
      .filter((g) => !g.borrador)
      .filter((g) => diaLocal(new Date(g.inicio), zona) === dia)
      .filter((g) => (nuevo.lugar_id && g.lugar_id === nuevo.lugar_id) || (sitio !== "" && sitioDe(g.lugar_id, g.sitio_texto) === sitio))
      .filter((g) => mismo(nuevo.titulo, g.titulo))
      .sort((a, b) => Math.abs(new Date(a.inicio).getTime() - t) - Math.abs(new Date(b.inicio).getTime() - t) || a.id.localeCompare(b.id))[0] ?? null
  );
}

/** Las dos búsquedas de un sitio: por su nombre y por su dirección, ya acotadas a la ciudad por quien las da. */
export type BuscarSitio = {
  porNombre: (nombre: string) => Promise<PuntoEncontrado | null>;
  porDireccion: (direccion: string) => Promise<PuntoEncontrado | null>;
};

/**
 * El punto de un sitio que no está en el directorio («El Meteorito. Museo Interactivo», «Plaza de Armas»), como el de un lugar nuevo: por su
 * nombre y, si la agenda trae la dirección, también por ella, contrastados con `elegirPunto`. Solo dentro de la ciudad (lo deciden las
 * búsquedas). Sin resultado, null: el evento no se publica.
 */
export async function ubicarSitio(sitio: string, direccion: string | null | undefined, buscar: BuscarSitio): Promise<Eleccion | null> {
  const nombre = sitio.replace(/[.…]+\s*$/, "").trim();
  if (!nombre) return null;
  const pedida = (direccion ?? "").trim();
  const [n, d] = await Promise.all([buscar.porNombre(nombre), pedida ? buscar.porDireccion(pedida) : Promise.resolve(null)]);
  return elegirPunto(null, n, d, pedida);
}


/** Quién se presenta en un evento de agenda, según las fichas que ya existen (OL-440). */
export type ArtistasDelEvento = {
  /** Las fichas con las que se liga, una vez cada una: cómo se supo la primera vez y los nombres de la agenda que llevaron a ella (cada uno
   *  con su cómo; ninguno si solo la nombra el título). */
  ligados: { id: string; ficha: string; como: ComoCruce; nombres: { nombre: string; como: ComoCruce }[] }[];
  /** Los nombres sin ficha (los propone `scripts/instituciones/ligar-artistas.ts`; aquí no se crean artistas). */
  sinFicha: string[];
  /** Los que son de una ficha oculta: no se ligan (la administración la ocultó) ni se proponen. */
  ocultos: { nombre: string; ficha: string }[];
  /** Los que se parecen a dos fichas o más: no se adivina. */
  ambiguos: { nombre: string; fichas: string[] }[];
};

/**
 * Con qué fichas se liga un evento de agenda (OL-440): cada nombre de `artistas` por el cruce de `cruzarNombre` (el mismo nombre, parte de
 * un alias, apellidos de más, el mismo grupo o integrante de un grupo) y, además, la ficha que el título nombra como uno de sus tramos, de la
 * misma disciplina que el evento («Gitanos mexicanos 2ª edición: PARGAZZ»). Antes solo se ligaba el nombre exacto.
 */
export function artistasDelEvento(e: Pick<EventoPropuesto, "titulo" | "descripcion" | "artistas">, indice: IndiceArtistas): ArtistasDelEvento {
  const r: ArtistasDelEvento = { ligados: [], sinFicha: [], ocultos: [], ambiguos: [] };
  const sinFicha = new Set<string>();
  const ligar = (ficha: FichaArtista, nombre: string | null, como: ComoCruce) => {
    if (ficha.visible === false) {
      if (nombre) r.ocultos.push({ nombre, ficha: ficha.nombre });
      return;
    }
    const ya = r.ligados.find((l) => l.id === ficha.id);
    if (ya) {
      if (nombre) ya.nombres.push({ nombre, como });
      return;
    }
    r.ligados.push({ id: ficha.id, ficha: ficha.nombre, como, nombres: nombre ? [{ nombre, como }] : [] });
  };
  for (const n of e.artistas ?? [])
    for (const u of cruzarNombre(n, indice)) {
      if (u.ficha) ligar(u.ficha, u.nombre, u.como);
      else if (u.ambiguas) r.ambiguos.push({ nombre: u.nombre, fichas: u.ambiguas.map((f) => f.nombre) });
      else if (!sinFicha.has(normalizarNombre(u.nombre))) {
        sinFicha.add(normalizarNombre(u.nombre));
        r.sinFicha.push(u.nombre);
      }
    }
  const delTitulo = fichaDelTitulo(e.titulo, disciplinaDeEvento(e.titulo, e.descripcion), indice);
  if (delTitulo) ligar(delTitulo, null, "titulo");
  return r;
}
