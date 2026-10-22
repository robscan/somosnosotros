/**
 * OL-440 · Liga a los artistas con los eventos del año que ya se cargaron de las agendas de la Secretaría de Cultura, y propone a los que no
 * tienen ficha. El founder (21 oct 2026) preguntó si el Showcase «ya está alimentado con los eventos que se acaban de subir desde enero» y «si
 * ya nutre a los artistas»: los eventos entraron (OL-424, `eventos.origen = 'agenda-secult-2026-MM'`), pero el importador solo ligaba la ficha
 * con el nombre exacto y los nombres sin ficha se perdían.
 *
 * Lee los JSON privados de la lectura de las agendas (fuera del repo: `eventos-enero.json`, `eventos-2026-02.json`…; cada fila con `titulo`,
 * `lugar`, `fecha`, `hora`, `descripcion`, `enlace` del PDF y `artistas` por nombre) y los eventos de la ciudad, y empareja cada fila con su
 * evento: el de la agenda con el mismo título ese día (el más cercano en hora) o, si no entró por ser parecido a uno que ya estaba, ese
 * (`parecidoGuardado`, la regla del importador). Luego:
 *   · liga en `eventos_artistas` cada nombre que ya tiene ficha, con el cruce de `src/lib/cruceArtistas.ts` (también la ficha que el título
 *     nombra), sin repetir ligas y con su orden detrás de los que ya estaban;
 *   · por los nombres sin ficha, una corrida `artistas` de la ciudad ya terminada (a nombre de --autor, sin gasto) con una propuesta por artista
 *     (las variantes del mismo nombre juntas): `fuente` «Agenda de la Secretaría de Cultura» y en `datos` nombre, disciplina (la del nombre, la
 *     de su papel en la agenda o la de sus eventos; si nada, «por_completar»), detalle (lo que la agenda dice: «Trío de son jarocho»,
 *     «Clarinete»; los ensambles del Estado, «Ensamble del Gobierno del Estado»), tipo, ciudad, url (el PDF del primer evento), leida y
 *     `eventos` (los ids, que `aceptar_propuesta` liga al crear la ficha: migración 20261021190000);
 *   · un nombre que ya está propuesto y sin decidir suma sus eventos a esa propuesta; uno rechazado no vuelve; uno de una ficha oculta no se
 *     liga ni se propone; uno que se parece a dos fichas no se adivina; uno que no parece un artista (un club, una asociación, el alumnado de
 *     una escuela) no se propone. Todo queda en el informe.
 * Correrlo dos veces no repite nada: las ligas ya hechas se saltan y lo ya propuesto solo suma eventos nuevos.
 *
 * Uso: node scripts/instituciones/correr.mjs ligar-artistas <carpeta de los JSON o un archivo.json> --autor <id del admin> [--simular]
 *        [--salida <carpeta>]
 * Con --simular solo lee e imprime el informe (cuántos se ligan, cuántos se proponen, los 20 nombres con más eventos); no escribe nada.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deducirDisciplina, deducirTipoArtista, type Disciplina, type TipoArtista } from "../../src/lib/artistas";
import { artistasDelEvento, parecidoGuardado, resolverLugar, type EventoGuardado } from "../../src/lib/cargaEventos";
import { COMO_CRUCE, cruzarNombre, disciplinaDeEvento, esNombreDeGrupo, indiceDeArtistas, personasDe, sumarAlIndice, type ComoCruce, type FichaArtista } from "../../src/lib/cruceArtistas";
import { diaLocal, isoALocal, localAIso, ZONA_INICIAL, zonaSegura } from "../../src/lib/fechas";
import { LIMITES_ARTISTA } from "../../src/lib/limites";
import { normalizarNombre } from "../../src/lib/lugares";
import { CIUDAD, guardarInforme, preparar } from "./entorno";

/** Lo que dice la bandeja como fuente de estas propuestas (una sola: «Aceptar las N» las toma juntas). */
export const FUENTE = "Agenda de la Secretaría de Cultura";
/** El principio de `eventos.origen` de lo cargado de las agendas (OL-424: `agenda-secult-2026-01` … `-10`). */
export const ORIGEN_AGENDAS = "agenda-secult-";
/** Los archivos de la lectura: `eventos-enero.json`, `eventos-2026-02.json`… (no los `.lectura.json`). */
export const ARCHIVO_AGENDA = /^eventos-([a-z]+|\d{4}-\d{2})\.json$/;
/** Un ensamble del Estado: así lo dice su detalle. */
export const DETALLE_ENSAMBLE_ESTADO = "Ensamble del Gobierno del Estado";

// ---------- los datos ----------
export type FilaAgenda = {
  titulo: string;
  lugar?: string | null;
  sitio?: string | null;
  fecha: string;
  hora: string;
  descripcion?: string | null;
  enlace?: string | null;
  artistas?: string[];
  /** El archivo de donde salió y cuándo se leyó (la fecha del archivo). */
  archivo: string;
  leida: string;
};
export type EventoBase = EventoGuardado & { origen?: string | null };
export type PropuestaBase = { id: string; estado: string; datos: Record<string, unknown> };
export type Base = {
  eventos: EventoBase[];
  lugares: { id: string; nombre: string }[];
  artistas: FichaArtista[];
  ligas: { evento_id: string; artista_id: string; orden: number | null }[];
  /** Las propuestas de artista de la ciudad, de cualquier corrida. */
  propuestas: PropuestaBase[];
};

/** Las filas de la carpeta (los archivos de la lectura, en orden) o de un archivo. Cada fila sabe de qué archivo es y cuándo se leyó. */
export function leerAgendas(ruta: string): FilaAgenda[] {
  const archivos = statSync(ruta).isDirectory()
    ? readdirSync(ruta)
        .filter((f) => ARCHIVO_AGENDA.test(f))
        .sort()
        .map((f) => join(ruta, f))
    : [ruta];
  return archivos.flatMap((archivo) => {
    const filas = JSON.parse(readFileSync(archivo, "utf8")) as unknown;
    if (!Array.isArray(filas)) throw new Error(`${archivo} no es una lista de eventos`);
    const leida = statSync(archivo).mtime.toISOString();
    return (filas as Omit<FilaAgenda, "archivo" | "leida">[])
      .filter((f) => f && typeof f.titulo === "string" && typeof f.fecha === "string")
      .map((f) => ({ ...f, hora: typeof f.hora === "string" ? f.hora : "", archivo: basename(archivo), leida }));
  });
}

// ---------- cada fila con su evento ----------
export type Par = { fila: FilaAgenda; evento: EventoBase; como: "agenda" | "parecido" };

const minutos = (hhmm: string): number => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
};

/**
 * El evento de cada fila: el de las agendas (`origen` agenda-secult-…) con el mismo título ese día, el más cercano en hora; si no hay (la fila
 * no entró porque se parecía a un evento que ya estaba), el guardado que se le parece con la regla del importador (`parecidoGuardado`). Sin
 * evento, la fila queda aparte (no se liga ni se propone nada por ella).
 */
export function emparejar(filas: readonly FilaAgenda[], eventos: readonly EventoBase[], lugares: { id: string; nombre: string }[]): { pares: Par[]; sinEvento: FilaAgenda[] } {
  const porDia = new Map<string, EventoBase[]>();
  for (const ev of eventos) {
    const dia = diaLocal(new Date(ev.inicio), zonaSegura(ev.zona));
    porDia.set(dia, [...(porDia.get(dia) ?? []), ev]);
  }
  const pares: Par[] = [];
  const sinEvento: FilaAgenda[] = [];
  for (const fila of filas) {
    const delDia = porDia.get(fila.fecha) ?? [];
    const titulo = normalizarNombre(fila.titulo);
    const hora = (ev: EventoBase) => isoALocal(ev.inicio, zonaSegura(ev.zona)).slice(11, 16);
    const deAgenda = delDia
      .filter((ev) => (ev.origen ?? "").startsWith(ORIGEN_AGENDAS) && normalizarNombre(ev.titulo) === titulo)
      .sort((a, b) => Math.abs(minutos(hora(a)) - minutos(fila.hora)) - Math.abs(minutos(hora(b)) - minutos(fila.hora)) || a.id.localeCompare(b.id));
    if (deAgenda[0]) {
      pares.push({ fila, evento: deAgenda[0], como: "agenda" });
      continue;
    }
    const lugar = resolverLugar(fila.lugar, lugares);
    const inicio = localAIso(`${fila.fecha}T${fila.hora || "00:00"}`, ZONA_INICIAL);
    const parecido = inicio
      ? parecidoGuardado({ titulo: fila.titulo, inicio, zona: ZONA_INICIAL, lugar_id: lugar?.id ?? null, sitio_texto: lugar ? null : (fila.sitio ?? fila.lugar ?? null) }, delDia, lugares)
      : null;
    const evento = parecido ? delDia.find((ev) => ev.id === parecido.id) : undefined;
    if (evento) pares.push({ fila, evento, como: "parecido" });
    else sinEvento.push(fila);
  }
  return { pares, sinEvento };
}

// ---------- lo que la agenda dice de un artista ----------
/** Papeles que dice una agenda delante o detrás de un nombre, con la disciplina que dan (null: no la dicen). */
const PAPELES = new Map<string, Exclude<Disciplina, "por_completar"> | null>(Object.entries({
  solista: "musica", soprano: "musica", mezzosoprano: "musica", contralto: "musica", tenor: "musica", baritono: "musica", pianista: "musica",
  guitarrista: "musica", violinista: "musica", violonchelista: "musica", chelista: "musica", cellista: "musica", flautista: "musica",
  clarinetista: "musica", saxofonista: "musica", trompetista: "musica", percusionista: "musica", arpista: "musica", acordeonista: "musica",
  cantante: "musica", cantautor: "musica", cantautora: "musica", compositor: "musica", compositora: "musica", dj: "musica", rapero: "musica",
  rapera: "musica", trovador: "musica", trovadora: "musica", trio: "musica", duo: "musica", dueto: "musica", cuarteto: "musica",
  quinteto: "musica", ensamble: "musica", coro: "musica", orquesta: "musica", mariachi: "musica", rondalla: "musica", banda: "musica",
  narrador: "letras", narradora: "letras", poeta: "letras", poetisa: "letras", escritor: "letras", escritora: "letras", autor: "letras",
  autora: "letras", novelista: "letras", cuentista: "letras", cuentacuentos: "letras", declamador: "letras", declamadora: "letras",
  actor: "teatro", actriz: "teatro", titiritero: "teatro", titiritera: "teatro", dramaturgo: "teatro", dramaturga: "teatro", clown: "teatro",
  bailarin: "danza", bailarina: "danza", bailaor: "danza", bailaora: "danza", coreografo: "danza", coreografa: "danza",
  fotografo: "artes_visuales", fotografa: "artes_visuales", pintor: "artes_visuales", pintora: "artes_visuales", escultor: "artes_visuales",
  escultora: "artes_visuales", grabador: "artes_visuales", grabadora: "artes_visuales", ilustrador: "artes_visuales",
  ilustradora: "artes_visuales", muralista: "artes_visuales", director: null, directora: null, interprete: null, grupo: null, compania: null,
  colectivo: null, agrupacion: null, conjunto: null,
} satisfies Record<string, Exclude<Disciplina, "por_completar"> | null>));
/** Un papel solo que no dice nada que el tipo no diga ya («Grupo»): no se usa como detalle. */
const PAPELES_VACIOS = new Set(["grupo", "compania", "colectivo", "agrupacion", "conjunto", "ensamble", "banda"]);
const INSTRUMENTOS = new Set([
  "clarinete", "guitarra", "piano", "violin", "viola", "violonchelo", "chelo", "cello", "contrabajo", "flauta", "oboe", "fagot", "sax",
  "saxofon", "trompeta", "trombon", "tuba", "corno", "percusiones", "percusion", "bateria", "bajo", "arpa", "acordeon", "jarana", "requinto",
  "marimba", "voz", "canto", "organo", "clavecin", "ukulele", "mandolina", "teclados",
]);
const DE_INSTRUMENTO = new Set(["soprano", "alto", "tenor", "baritono", "electrica", "electrico", "acustica", "acustico", "clasica", "barroca", "sexta", "huapanguera", "jarocha"]);
const CORTE = /[.;:!?]$/;

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const limpiarPalabra = (w: string) => w.replace(/^[«"“'(¡¿]+|[»"”')!?,.;:]+$/g, "");

/** Lo que la agenda dice de un artista en una frase: su papel o instrumento, en sus palabras, con la disciplina que da. */
export type DichoDeAgenda = { detalle: string | null; disciplina: Exclude<Disciplina, "por_completar"> | null };

function dichoEn(nombre: string, texto: string): DichoDeAgenda | null {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const flujo: { t: string; i: number }[] = [];
  palabras.forEach((w, i) => normalizarNombre(w).split(" ").filter(Boolean).forEach((t) => flujo.push({ t, i })));
  const buscado = normalizarNombre(nombre).split(" ").filter(Boolean);
  if (!buscado.length) return null;
  const k = flujo.findIndex((_, j) => buscado.every((t, x) => flujo[j + x]?.t === t));
  if (k < 0) return null;
  const desde = flujo[k].i;
  const hasta = flujo[k + buscado.length - 1].i;
  const n = (i: number) => normalizarNombre(palabras[i] ?? "");

  // Detrás: «… en clarinete», «… en sax soprano», «… como narrador», «Ana López, soprano», «Juan Pérez (piano)».
  const tras = n(hasta + 1);
  if ((tras === "en" || tras === "al") && INSTRUMENTOS.has(n(hasta + 2))) {
    const tomar = [palabras[hasta + 2]];
    if (!CORTE.test(palabras[hasta + 2] ?? "") && !/,$/.test(palabras[hasta + 2] ?? "") && DE_INSTRUMENTO.has(n(hasta + 3))) tomar.push(palabras[hasta + 3]);
    return { detalle: mayuscula(tomar.map(limpiarPalabra).join(" ")), disciplina: "musica" };
  }
  if (tras === "como" && PAPELES.has(n(hasta + 2)) && !PAPELES_VACIOS.has(n(hasta + 2)))
    return { detalle: mayuscula(limpiarPalabra(palabras[hasta + 2])), disciplina: PAPELES.get(n(hasta + 2)) ?? null };
  // Pegado entre comas o paréntesis, y cerrado: «Ana López, soprano, con piano» sí; «Paola del Carmen, bajo la dirección de…» no.
  const pegado = (/,$/.test(palabras[hasta] ?? "") || /^\(/.test(palabras[hasta + 1] ?? "")) && (/[,.;:)]$/.test(palabras[hasta + 1] ?? "") || hasta + 2 >= palabras.length);
  if (pegado && (PAPELES.has(tras) || INSTRUMENTOS.has(tras)) && !PAPELES_VACIOS.has(tras))
    return { detalle: mayuscula(limpiarPalabra(palabras[hasta + 1])), disciplina: INSTRUMENTOS.has(tras) ? "musica" : (PAPELES.get(tras) ?? null) };

  // Delante: el papel más cercano, hasta seis palabras antes y sin pasar de una coma o un punto: «el trío de son jarocho X», «la solista X».
  for (let j = desde - 1; j >= Math.max(0, desde - 6); j--) {
    if (CORTE.test(palabras[j]) || /,$/.test(palabras[j])) break;
    const papel = n(j);
    if (!PAPELES.has(papel)) continue;
    const frase = palabras.slice(j, desde).map(limpiarPalabra);
    while (frase.length > 1 && /^(de|del|la|las|el|los|y|e|a|al|con)$/i.test(normalizarNombre(frase.at(-1) ?? ""))) frase.pop();
    if (frase.length === 1 && PAPELES_VACIOS.has(papel)) return null;
    // Entre el papel y el nombre no cabe otro nombre: «el Grupo Tlali-Xoco y el intérprete X» no es el papel de X.
    if (frase.slice(1).some((w) => /^\p{Lu}/u.test(w))) return null;
    const detalle = mayuscula(frase.join(" "));
    return { detalle: detalle.length <= LIMITES_ARTISTA.detalle ? detalle : null, disciplina: PAPELES.get(papel) ?? null };
  }
  return null;
}

/**
 * El detalle de un artista con lo que dice la agenda (OL-440): los ensambles del Estado, «Ensamble del Gobierno del Estado»; si no, su papel
 * o su instrumento en la primera descripción (o título) que lo diga: «el trío de son jarocho Son del Aire» → «Trío de son jarocho»,
 * «Carlos de Santos en clarinete» → «Clarinete», «con la solista Paola del Carmen» → «Solista». Hasta 40 (el tope de la ficha).
 */
export function detalleDeAgenda(nombre: string, textos: readonly string[]): DichoDeAgenda {
  if (/\b(gobierno del estado|del estado)\b/.test(normalizarNombre(nombre))) return { detalle: DETALLE_ENSAMBLE_ESTADO, disciplina: null };
  for (const t of textos) {
    const dicho = t ? dichoEn(nombre, t) : null;
    if (dicho) return dicho;
  }
  return { detalle: null, disciplina: null };
}

/**
 * La disciplina de un artista sin ficha: la que dice su nombre («Coro…», «Ballet…»), si no la de su papel en la agenda («la soprano X»), y si
 * no la que más se repite en sus eventos (`disciplinaDeEvento`: concierto → música, obra → teatro, exposición → artes visuales, presentación
 * de libro → letras). Sin nada, «por_completar».
 */
export function disciplinaDeArtista(
  nombre: string,
  dicho: DichoDeAgenda,
  eventos: readonly { titulo: string; descripcion?: string | null }[],
  variantes: readonly string[] = [],
): Disciplina {
  const delNombre = [nombre, ...variantes].map(deducirDisciplina).find(Boolean);
  if (delNombre) return delNombre;
  if (dicho.disciplina) return dicho.disciplina;
  const votos = new Map<string, number>();
  for (const e of eventos) {
    const d = disciplinaDeEvento(e.titulo, e.descripcion);
    if (d) votos.set(d, (votos.get(d) ?? 0) + 1);
  }
  // A igual número de eventos, la del primero (los votos se cuentan en orden).
  const ganadora = [...votos].sort((a, b) => b[1] - a[1])[0];
  return (ganadora?.[0] as Disciplina | undefined) ?? "por_completar";
}

function tipoDe(nombre: string): TipoArtista {
  const deducido = deducirTipoArtista(nombre);
  if (deducido) return deducido;
  if (/\b(colectivo|alumnos|alumnas|alumnado|estudiantes|taller|talleres|comunidad|circulo|club|asociacion)\b/.test(normalizarNombre(nombre))) return "colectivo";
  if (esNombreDeGrupo(nombre) || personasDe(nombre).length >= 2) return "grupo";
  return "solista";
}

/**
 * Solista, grupo o colectivo, por el nombre: «Colectivo…», «Taller…», «Alumnos…» son colectivos; «Coro…», «Los…», dos personas, grupo. Si el
 * nombre no lo dice, lo dicen sus variantes o su detalle («Pan y Sal» llegó también como «Colectivo Pan y Sal»; «Grupo teatral»).
 */
export function tipoDeNombre(nombre: string, pistas: readonly string[] = []): TipoArtista {
  return [nombre, ...pistas].map(tipoDe).find((t) => t !== "solista") ?? "solista";
}

/** El nombre a su tope (80), cortado en un espacio y no a media palabra. */
export function nombreATope(nombre: string): string {
  const n = nombre.replace(/\s+/g, " ").trim();
  if (n.length <= LIMITES_ARTISTA.nombre) return n;
  const corte = n.slice(0, LIMITES_ARTISTA.nombre + 1).lastIndexOf(" ");
  return n.slice(0, corte > 0 ? corte : LIMITES_ARTISTA.nombre).trim();
}

/** Por qué un nombre de la agenda no se propone como artista (o null): un club, una asociación, el alumnado de una escuela, «Talleres de…». */
export function motivoNoArtista(nombre: string): string | null {
  const n = normalizarNombre(nombre);
  if (/^(alumnos|alumnas|alumnado|estudiantes)\b/.test(n)) return "alumnado de una escuela";
  if (/^(club|asociacion|delegacion|secretaria|instituto|universidad|facultad|escuela|colegio|preparatoria|museo)\b/.test(n) || /\ba c$/.test(n)) return "institución o asociación";
  if (/^(talleres|companias|grupos)\b/.test(n)) return "varios grupos a la vez";
  return null;
}

// ---------- el plan ----------
type EventoDeNombre = { id: string; titulo: string; fecha: string; hora: string; descripcion: string; enlace: string | null; leida: string };
export type Liga = { evento_id: string; artista_id: string; orden: number; ficha: string; como: ComoCruce; nombres: { nombre: string; como: ComoCruce }[]; titulo: string; fecha: string };
export type PropuestaNueva = { nombre: string; datos: Record<string, unknown>; eventos: number };
export type PropuestaActualizada = { id: string; nombre: string; datos: Record<string, unknown>; nuevos: number };
export type Resultado = { nombre: string; eventos: number; resultado: string };
export type Plan = {
  cifras: {
    filas: number;
    conArtistas: number;
    /** Nombres distintos (normalizados) en las filas con artistas. */
    nombres: number;
    emparejadas: number;
    porParecido: number;
    sinEvento: number;
    ligas: number;
    yaLigadas: number;
    fichasLigadas: number;
    propuestas: number;
    eventosEnPropuestas: number;
    actualizadas: number;
    rechazados: number;
    noArtistas: number;
    ocultos: number;
    ambiguos: number;
  };
  meses: string[];
  ligas: Liga[];
  nuevas: PropuestaNueva[];
  actualizar: PropuestaActualizada[];
  sinEvento: FilaAgenda[];
  /** Cada nombre de la agenda (después de separar a varias personas) con sus eventos y qué se hizo, de más a menos eventos. */
  resultados: Resultado[];
};

type SinFicha = { nombre: string; variantes: Map<string, number>; eventos: Map<string, EventoDeNombre> };

/**
 * Arma lo que se escribiría (puro: lo prueba `ligar-artistas.test.ts` con un JSON y una base falsos). Las ligas nuevas con su orden detrás de
 * las que ya tiene cada evento; las propuestas, una por artista: los nombres sin ficha de más a menos eventos (así manda la forma más usada)
 * y cada uno se cruza con las propuestas que ya hay y las que se van armando (`cruzarNombre`: las variantes del mismo artista se juntan).
 */
export function armarPlan(filas: readonly FilaAgenda[], base: Base, opciones: { ciudad: string }): Plan {
  const indice = indiceDeArtistas(base.artistas, opciones.ciudad);
  const { pares, sinEvento } = emparejar(filas, base.eventos, base.lugares);
  const hechas = new Set(base.ligas.map((l) => `${l.evento_id}|${l.artista_id}`));
  const ordenDe = new Map<string, number>();
  for (const l of base.ligas) ordenDe.set(l.evento_id, Math.max(ordenDe.get(l.evento_id) ?? -1, l.orden ?? 0));

  const ligas: Liga[] = [];
  let yaLigadas = 0;
  const resultados = new Map<string, { nombre: string; eventos: Set<string>; resultado: string }>();
  const anotar = (nombre: string, evento: string, resultado: string) => {
    const k = normalizarNombre(nombre);
    const r = resultados.get(k) ?? { nombre, eventos: new Set<string>(), resultado };
    r.eventos.add(evento);
    resultados.set(k, r);
  };
  const sinFicha = new Map<string, SinFicha>();
  let ocultos = 0;
  let ambiguos = 0;

  for (const { fila, evento } of pares) {
    const datosEvento: EventoDeNombre = { id: evento.id, titulo: fila.titulo, fecha: fila.fecha, hora: fila.hora, descripcion: fila.descripcion ?? "", enlace: fila.enlace ?? null, leida: fila.leida };
    const quienes = artistasDelEvento({ titulo: fila.titulo, descripcion: fila.descripcion ?? "", artistas: fila.artistas ?? [] }, indice);
    for (const l of quienes.ligados) {
      for (const n of l.nombres) anotar(n.nombre, evento.id, `ligado a «${l.ficha}»${n.como === "igual" ? "" : ` (${COMO_CRUCE[n.como]})`}`);
      const clave = `${evento.id}|${l.id}`;
      if (hechas.has(clave)) {
        yaLigadas++;
        continue;
      }
      hechas.add(clave);
      const orden = (ordenDe.get(evento.id) ?? -1) + 1;
      ordenDe.set(evento.id, orden);
      ligas.push({ evento_id: evento.id, artista_id: l.id, orden, ficha: l.ficha, como: l.como, nombres: l.nombres, titulo: fila.titulo, fecha: fila.fecha });
    }
    for (const o of quienes.ocultos) {
      ocultos++;
      anotar(o.nombre, evento.id, `ficha oculta «${o.ficha}»: no se liga`);
    }
    for (const a of quienes.ambiguos) {
      ambiguos++;
      anotar(a.nombre, evento.id, `se parece a ${a.fichas.map((f) => `«${f}»`).join(" y ")}: no se adivina`);
    }
    for (const nombre of quienes.sinFicha) {
      const k = normalizarNombre(nombre);
      const s = sinFicha.get(k) ?? { nombre, variantes: new Map(), eventos: new Map() };
      s.variantes.set(nombre, (s.variantes.get(nombre) ?? 0) + 1);
      s.eventos.set(evento.id, datosEvento);
      sinFicha.set(k, s);
      anotar(nombre, evento.id, "sin ficha");
    }
  }

  // Las propuestas: primero las que ya hay (sin decidir o rechazadas), luego las nuevas según se arman.
  const indicePropuestas = indiceDeArtistas([], opciones.ciudad);
  const existentes = new Map<string, PropuestaBase>();
  for (const p of base.propuestas) {
    const nombre = typeof p.datos.nombre === "string" ? p.datos.nombre : "";
    if (!nombre || (p.estado !== "propuesta" && p.estado !== "rechazada")) continue;
    existentes.set(`existente:${p.id}`, p);
    sumarAlIndice(indicePropuestas, { id: `existente:${p.id}`, nombre });
  }
  const nuevas = new Map<string, { nombre: string; variantes: Map<string, number>; eventos: Map<string, EventoDeNombre> }>();
  const sumarEventos = new Map<string, Map<string, EventoDeNombre>>();
  let rechazados = 0;
  let noArtistas = 0;
  const marcar = (s: SinFicha, resultado: string) => {
    for (const v of s.variantes.keys()) {
      const r = resultados.get(normalizarNombre(v));
      if (r) r.resultado = resultado;
    }
  };
  const ordenados = [...sinFicha.values()].sort((a, b) => b.eventos.size - a.eventos.size || a.nombre.localeCompare(b.nombre, "es"));
  for (const s of ordenados) {
    const motivo = motivoNoArtista(s.nombre);
    if (motivo) {
      noArtistas++;
      marcar(s, `no se propone: ${motivo}`);
      continue;
    }
    const [u] = cruzarNombre(s.nombre, indicePropuestas);
    const id = u?.ficha?.id;
    const existente = id ? existentes.get(id) : undefined;
    if (existente && existente.estado === "rechazada") {
      rechazados++;
      marcar(s, `rechazado antes como «${String(existente.datos.nombre)}»: no vuelve`);
      continue;
    }
    if (existente) {
      const suma = sumarEventos.get(existente.id) ?? new Map<string, EventoDeNombre>();
      for (const [k, e] of s.eventos) suma.set(k, e);
      sumarEventos.set(existente.id, suma);
      marcar(s, `ya propuesto como «${String(existente.datos.nombre)}»: se le suman sus eventos`);
      continue;
    }
    const propia = id ? nuevas.get(id) : undefined;
    if (propia) {
      for (const [k, e] of s.eventos) propia.eventos.set(k, e);
      for (const [v, n] of s.variantes) propia.variantes.set(v, (propia.variantes.get(v) ?? 0) + n);
      marcar(s, `propuesto junto con «${propia.nombre}»`);
      continue;
    }
    const nuevoId = `nueva:${nuevas.size}`;
    nuevas.set(nuevoId, { nombre: s.nombre, variantes: new Map(s.variantes), eventos: new Map(s.eventos) });
    sumarAlIndice(indicePropuestas, { id: nuevoId, nombre: s.nombre });
    marcar(s, "propuesto");
  }

  const porFecha = (a: EventoDeNombre, b: EventoDeNombre) => `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`) || a.id.localeCompare(b.id);
  const propuestas: PropuestaNueva[] = [...nuevas.values()].map((n) => {
    const eventos = [...n.eventos.values()].sort(porFecha);
    const primero = eventos[0];
    const dicho = detalleDeAgenda(n.nombre, [...eventos.map((e) => e.descripcion), ...eventos.map((e) => e.titulo)]);
    const nombre = nombreATope(n.nombre);
    const otras = [...n.variantes.keys()].filter((v) => v !== n.nombre);
    const datos: Record<string, unknown> = {
      nombre,
      disciplina: disciplinaDeArtista(nombre, dicho, eventos, otras),
      tipo: tipoDeNombre(nombre, [...otras, ...(dicho.detalle ? [dicho.detalle] : [])]),
      ciudad: opciones.ciudad,
      redes: [],
      leida: primero.leida,
      eventos: eventos.map((e) => e.id),
    };
    if (dicho.detalle) datos.detalle = dicho.detalle;
    if (primero.enlace) datos.url = primero.enlace;
    if (otras.length) datos.variantes = otras;
    return { nombre, datos, eventos: eventos.length };
  });
  const actualizar: PropuestaActualizada[] = [];
  for (const [id, suma] of sumarEventos) {
    const p = base.propuestas.find((x) => x.id === id)!;
    const antes = Array.isArray(p.datos.eventos) ? p.datos.eventos.filter((x): x is string => typeof x === "string") : [];
    const todos = [...new Set([...antes, ...[...suma.values()].sort(porFecha).map((e) => e.id)])];
    if (todos.length === antes.length) continue;
    actualizar.push({ id, nombre: String(p.datos.nombre), datos: { ...p.datos, eventos: todos }, nuevos: todos.length - antes.length });
  }

  const conArtistas = filas.filter((f) => (f.artistas ?? []).length);
  const sinEventoConArtistas = sinEvento.filter((f) => (f.artistas ?? []).length);
  const nombres = new Set(conArtistas.flatMap((f) => (f.artistas ?? []).map(normalizarNombre)).filter(Boolean));
  const meses = [...new Set(filas.map((f) => f.fecha.slice(0, 7)))].sort();
  return {
    cifras: {
      filas: filas.length,
      conArtistas: conArtistas.length,
      nombres: nombres.size,
      emparejadas: pares.length,
      porParecido: pares.filter((p) => p.como === "parecido").length,
      sinEvento: sinEventoConArtistas.length,
      ligas: ligas.length,
      yaLigadas,
      fichasLigadas: new Set(ligas.map((l) => l.artista_id)).size,
      propuestas: propuestas.length,
      eventosEnPropuestas: new Set(propuestas.flatMap((p) => p.datos.eventos as string[])).size,
      actualizadas: actualizar.length,
      rechazados,
      noArtistas,
      ocultos,
      ambiguos,
    },
    meses,
    ligas,
    nuevas: propuestas,
    actualizar,
    sinEvento: sinEventoConArtistas,
    resultados: [...resultados.values()]
      .map((r) => ({ nombre: r.nombre, eventos: r.eventos.size, resultado: r.resultado }))
      .sort((a, b) => b.eventos - a.eventos || a.nombre.localeCompare(b.nombre, "es")),
  };
}

// ---------- la base ----------
type Respuesta = { data: unknown; error: { message: string } | null };
type Consulta = PromiseLike<Respuesta> & {
  eq(columna: string, valor: unknown): Consulta;
  in(columna: string, valores: unknown[]): Consulta;
  order(columna: string): Consulta;
  range(desde: number, hasta: number): Consulta;
};

/** Todas las filas, de mil en mil (PostgREST corta en 1 000 sin avisar). */
async function todas<T>(db: SupabaseClient, tabla: string, columnas: string, orden: string[], filtro: (q: Consulta) => Consulta = (q) => q): Promise<T[]> {
  let filas: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    let q = filtro(db.from(tabla).select(columnas) as unknown as Consulta);
    for (const o of orden) q = q.order(o);
    const { data, error } = await q.range(desde, desde + 999);
    if (error) throw new Error(`${tabla}: ${error.message}`);
    const pagina = (data ?? []) as T[];
    filas = filas.concat(pagina);
    if (pagina.length < 1000) return filas;
  }
}

/** Lo que hace falta de la base: eventos, lugares y artistas de la ciudad, las ligas de sus eventos y las propuestas de artista de la ciudad. */
export async function leerBase(db: SupabaseClient, ciudad: string, slug: string): Promise<Base> {
  const deLaCiudad = (q: Consulta) => q.eq("ciudad", ciudad);
  const [eventos, lugares, artistas, ligas, corridas] = await Promise.all([
    todas<EventoBase>(db, "eventos", "id, titulo, inicio, zona, lugar_id, sitio_texto, clase, borrador, visible, origen", ["id"], deLaCiudad),
    todas<{ id: string; nombre: string }>(db, "lugares", "id, nombre", ["id"], deLaCiudad),
    todas<FichaArtista>(db, "artistas", "id, nombre, tipo, disciplina, detalle, descripcion, visible", ["id"], deLaCiudad),
    todas<Base["ligas"][number]>(db, "eventos_artistas", "evento_id, artista_id, orden", ["evento_id", "artista_id"]),
    todas<{ id: string }>(db, "rutinas_corridas", "id", ["id"], (q) => q.eq("ciudad", slug)),
  ]);
  const ids = new Set(eventos.map((e) => e.id));
  const propuestas: PropuestaBase[] = [];
  for (let i = 0; i < corridas.length; i += 100) {
    const lote = corridas.slice(i, i + 100).map((c) => c.id);
    propuestas.push(...(await todas<PropuestaBase>(db, "propuestas", "id, estado, datos", ["id"], (q) => q.eq("tipo", "artista").in("corrida_id", lote))));
  }
  return { eventos, lugares, artistas, ligas: ligas.filter((l) => ids.has(l.evento_id)), propuestas };
}

export type Escrito = { corrida: string | null; propuestas: { id: string; nombre: string }[]; ligas: number; actualizadas: number; fallas: string[] };

/**
 * Escribe el plan con la llave de servicio: las ligas (de 500 en 500), la corrida terminada y sus propuestas (de 100 en 100) y los eventos
 * que se suman a lo ya propuesto (solo si sigue sin decidir). Una falla no detiene lo demás: queda en `fallas` y en el informe; si fallan las
 * propuestas, la corrida queda «fallida» con su razón.
 */
export async function escribirPlan(db: SupabaseClient, plan: Plan, opciones: { autor: string; slug: string; ahora?: Date }): Promise<Escrito> {
  const escrito: Escrito = { corrida: null, propuestas: [], ligas: 0, actualizadas: 0, fallas: [] };
  for (let i = 0; i < plan.ligas.length; i += 500) {
    const lote = plan.ligas.slice(i, i + 500).map(({ evento_id, artista_id, orden }) => ({ evento_id, artista_id, orden }));
    const { error } = await db.from("eventos_artistas").insert(lote);
    if (error) escrito.fallas.push(`ligas ${i + 1}–${i + lote.length}: ${error.message}`);
    else escrito.ligas += lote.length;
  }
  if (plan.nuevas.length) {
    const ahora = (opciones.ahora ?? new Date()).toISOString();
    const { data, error } = await db
      .from("rutinas_corridas")
      .insert({
        tipo: "artistas",
        ciudad: opciones.slug,
        // Sin la API no hay gasto; el tope solo cumple la regla de la tabla (mayor que 0) y una búsqueda terminada no lo enseña.
        tope_usd: 0.01,
        gasto_usd: 0,
        estado: "terminada",
        creado_por: opciones.autor,
        inicio: ahora,
        fin: ahora,
        parametros: { guion: "ligar-artistas", fuente: FUENTE, meses: plan.meses },
        resumen: resumenDeCorrida(plan),
      })
      .select("id")
      .single();
    const corrida = (data as { id?: string } | null)?.id ?? null;
    if (error || !corrida) escrito.fallas.push(`corrida: ${error?.message ?? "sin id"}`);
    else {
      escrito.corrida = corrida;
      for (let i = 0; i < plan.nuevas.length; i += 100) {
        const lote = plan.nuevas.slice(i, i + 100);
        const { data: hechas, error: sinPropuestas } = await db
          .from("propuestas")
          .insert(lote.map((p) => ({ corrida_id: corrida, tipo: "artista", fuente: FUENTE, estado: "propuesta", datos: p.datos })))
          .select("id");
        if (sinPropuestas) {
          escrito.fallas.push(`propuestas ${i + 1}–${i + lote.length}: ${sinPropuestas.message}`);
          continue;
        }
        ((hechas ?? []) as { id: string }[]).forEach((h, j) => escrito.propuestas.push({ id: h.id, nombre: lote[j]?.nombre ?? "" }));
      }
      if (escrito.propuestas.length < plan.nuevas.length) {
        const razon = `Se guardaron ${escrito.propuestas.length} de ${plan.nuevas.length} propuestas.`;
        await db.from("rutinas_corridas").update({ estado: escrito.propuestas.length ? "terminada" : "fallida", resumen: { ...resumenDeCorrida(plan), error: razon } }).eq("id", corrida);
      }
    }
  }
  for (const a of plan.actualizar) {
    const { error } = await db.from("propuestas").update({ datos: a.datos }).eq("id", a.id).eq("estado", "propuesta");
    if (error) escrito.fallas.push(`propuesta «${a.nombre}»: ${error.message}`);
    else escrito.actualizadas++;
  }
  return escrito;
}

/** El resumen que queda en la corrida (lo lee Administración › Corridas). */
export function resumenDeCorrida(plan: Plan): Record<string, unknown> {
  const c = plan.cifras;
  return {
    avance: 1,
    guion: "ligar-artistas",
    fuente: FUENTE,
    meses: plan.meses,
    eventos_leidos: c.filas,
    con_artistas: c.conArtistas,
    nombres: c.nombres,
    ligados: c.ligas,
    propuestos: c.propuestas,
    eventos_en_propuestas: c.eventosEnPropuestas,
    propuestas_con_eventos_nuevos: c.actualizadas,
    descartados: { rechazado_antes: c.rechazados, no_es_artista: c.noArtistas, ficha_oculta: c.ocultos, ambiguo: c.ambiguos, sin_evento: c.sinEvento },
  };
}

// ---------- el informe ----------
/** Las cifras en una línea (lo que imprime la consola y encabeza el informe). */
export function lineaDeCifras(plan: Plan, simular: boolean): string {
  const c = plan.cifras;
  const verbo = simular ? "se ligarían" : "ligados";
  return [
    `Eventos leídos ${c.filas} (${c.conArtistas} nombran artistas, ${c.nombres} nombres distintos)`,
    `emparejados con su evento ${c.emparejadas} (${c.porParecido} con uno parecido que ya estaba) · sin evento ${c.sinEvento} con artistas`,
    `${verbo} ${c.ligas} (a ${c.fichasLigadas} fichas; ${c.yaLigadas} ya estaban)`,
    `${simular ? "se propondrían" : "propuestos"} ${c.propuestas} artistas con ${c.eventosEnPropuestas} eventos · propuestas que suman eventos ${c.actualizadas}`,
    `rechazados antes ${c.rechazados} · no parecen artistas ${c.noArtistas} · fichas ocultas ${c.ocultos} · parecidos a varias ${c.ambiguos}`,
  ].join(" · ");
}

/** Los N nombres con más eventos y qué se hace con cada uno. */
export function primeros(plan: Plan, n = 20): string[] {
  return plan.resultados.slice(0, n).map((r, i) => `${String(i + 1).padStart(2)}. ${r.nombre} · ${r.eventos} ${r.eventos === 1 ? "evento" : "eventos"} · ${r.resultado}`);
}

/** El informe completo, en Markdown. */
export function informeDe(plan: Plan, simular: boolean, escrito: Escrito | null = null): string[] {
  const porFicha = new Map<string, Liga[]>();
  for (const l of plan.ligas) porFicha.set(l.ficha, [...(porFicha.get(l.ficha) ?? []), l]);
  const lineas = [
    `# Artistas de las agendas → fichas y propuestas · ${new Date().toISOString()}${simular ? " (simulación)" : ""}`,
    "",
    `Meses: ${plan.meses.join(", ")} · Fuente de las propuestas: «${FUENTE}»`,
    "",
    lineaDeCifras(plan, simular),
    "",
  ];
  if (escrito)
    lineas.push(
      `Escrito: ${escrito.ligas} ligas · corrida ${escrito.corrida ?? "ninguna"} · ${escrito.propuestas.length} propuestas · ${escrito.actualizadas} propuestas con eventos nuevos${escrito.fallas.length ? ` · FALLAS: ${escrito.fallas.join("; ")}` : ""}`,
      "",
    );
  lineas.push("## Los 20 nombres con más eventos", ...primeros(plan).map((l) => `- ${l}`), "");
  lineas.push(`## ${simular ? "Se ligarían" : "Ligados"} (por ficha)`);
  for (const [ficha, ls] of [...porFicha].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "es"))) {
    const como = [
      ...new Set(ls.filter((l) => l.como !== "igual").map((l) => `${COMO_CRUCE[l.como]}${l.nombres.length ? `: ${l.nombres.map((n) => `«${n.nombre}»`).join(", ")}` : ""}`)),
    ];
    lineas.push(`- ${ficha} · ${ls.length} ${ls.length === 1 ? "evento" : "eventos"}${como.length ? ` · ${como.join("; ")}` : ""}`);
    for (const l of ls) lineas.push(`  - ${l.fecha} · ${l.titulo} · ${l.evento_id}`);
  }
  lineas.push("", `## ${simular ? "Se propondrían" : "Propuestos"} (corrida «artistas», fuente «${FUENTE}»)`);
  for (const p of [...plan.nuevas].sort((a, b) => b.eventos - a.eventos || a.nombre.localeCompare(b.nombre, "es"))) {
    const d = p.datos;
    const variantes = Array.isArray(d.variantes) ? ` · también como ${(d.variantes as string[]).map((v) => `«${v}»`).join(", ")}` : "";
    lineas.push(`- ${p.nombre} · ${p.eventos} ${p.eventos === 1 ? "evento" : "eventos"} · ${String(d.disciplina)} · ${String(d.tipo)}${d.detalle ? ` · «${String(d.detalle)}»` : ""}${variantes}`);
  }
  lineas.push("", "## Ya propuestos sin decidir: se les suman eventos");
  for (const a of plan.actualizar) lineas.push(`- ${a.nombre} · ${a.nuevos} eventos más · ${a.id}`);
  lineas.push("", "## No se ligan ni se proponen");
  for (const r of plan.resultados.filter((x) => !/^(ligado|propuesto|ya propuesto)/.test(x.resultado))) lineas.push(`- ${r.nombre} · ${r.eventos} · ${r.resultado}`);
  lineas.push("", "## Filas con artistas sin evento en la base (no entraron en la carga)");
  for (const f of plan.sinEvento) lineas.push(`- ${f.fecha} ${f.hora} · ${f.titulo} · ${(f.artistas ?? []).join(", ")} · ${f.archivo}`);
  lineas.push("");
  return lineas;
}

// ---------- en la Mac ----------
async function main() {
  const { archivo: ruta, autor, salida, simular, db } = preparar("ligar-artistas");
  const { data: perfil, error: sinPerfil } = await db.from("perfiles").select("rol").eq("id", autor).maybeSingle();
  if (sinPerfil) throw sinPerfil;
  if ((perfil as { rol?: string } | null)?.rol !== "admin") {
    console.error(`--autor ${autor} no es una cuenta de la administración: la corrida y las propuestas van a su nombre.`);
    process.exit(1);
  }
  const { data: ciudad, error: sinCiudad } = await db.from("ciudades").select("slug").eq("nombre", CIUDAD).maybeSingle();
  if (sinCiudad) throw sinCiudad;
  const slug = (ciudad as { slug?: string } | null)?.slug;
  if (!slug) {
    console.error(`No está la ciudad «${CIUDAD}» en Administración › Ciudades (migración 20261020140000).`);
    process.exit(1);
  }

  const filas = leerAgendas(ruta);
  const base = await leerBase(db, CIUDAD, slug);
  const plan = armarPlan(filas, base, { ciudad: CIUDAD });
  const escrito = simular ? null : await escribirPlan(db, plan, { autor, slug });
  const entraron = escrito
    ? [
        ...(escrito.corrida ? [{ id: escrito.corrida, nombre: "corrida" }] : []),
        ...escrito.propuestas,
        ...plan.ligas.map((l) => ({ id: `${l.evento_id}:${l.artista_id}`, nombre: `liga ${l.ficha} · ${l.titulo}` })),
      ]
    : [];
  const informe = guardarInforme(salida, "ligar-artistas", informeDe(plan, simular, escrito), entraron, simular);
  console.log(`\n${lineaDeCifras(plan, simular)}\n\nLos 20 nombres con más eventos:\n${primeros(plan).join("\n")}`);
  if (escrito?.fallas.length) console.log(`\nFALLAS:\n${escrito.fallas.join("\n")}`);
  console.log(`\nInforme: ${informe}`);
}

// Se corre solo cuando es el archivo que se ejecuta (el paquete de correr.mjs, `ligar-artistas.mjs`, o el .ts): no al importarlo en las
// pruebas ni dentro de otro paquete.
const esPrincipal = /^ligar-artistas\.(m?js|ts)$/.test(basename(process.argv[1] ?? ""));
if (esPrincipal) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
