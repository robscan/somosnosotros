import { sumarDiasIso } from "./calendario";
import type { Clase } from "./eventos";
import { normalizarNombre } from "./lugares";

/**
 * Las sugerencias al publicar un evento (OL-323; modelo `docs/investigaciones/eventos-modelo.md` §10, casos H1, H2, H4 y H5; prototipo aceptado
 * `docs/rediseno/prototipos/eventos-superficies.html`, bitácora 314), sin DOM ni base: qué dice el título o el cartel y qué se propone con eso.
 * Las consultas las hace el servidor (`app/eventos/sugerencias.ts`); aquí se decide con lo que ya trajo.
 *
 * - **H1** · la apertura de una muestra con su periodo (el cartel lo trae): «También puedes publicar la exposición».
 * - **H2** · la apertura de una muestra sin periodo: «¿Hasta cuándo se puede visitar?».
 * - **H4** · el segundo acto distinto que nombra el mismo festival con su edición: «Estos dos eventos forman parte de …».
 * - **H5** · ya hay un festival propio con ese nombre: «Parte de …», desde el primer acto.
 *
 * Una sola sugerencia a la vez y, si concurren, la del periodo visitable gana (modelo §10). Lo que protege el flujo: «ganador del Festival X» o un
 * patrocinio no proponen pertenencia; el mismo nombre en otra edición son festivales distintos; un duplicado o la segunda función de la misma obra
 * no cuentan como segundo acto; «inauguración» sin una muestra identificable no ofrece exposición.
 */

// ---------------------------------------------------------------- Texto

/**
 * El texto en minúsculas y sin acentos, **del mismo largo** que el original (una letra por letra), para poder recortar del original lo que se
 * encontró en la versión normalizada («Festival de Cine UASLP 2026» tal como se escribió).
 */
function plano(s: string): string {
  return s
    .split("")
    .map((c) => {
      const d = c.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
      return d.length === 1 ? d : c.toLowerCase().length === 1 ? c.toLowerCase() : " ";
    })
    .join("");
}

/** Lo que va antes de «festival» y dice que el evento NO es parte de él: un premio, un patrocinio, una selección, un antecedente. */
const NO_ES_PARTE = /(ganador|ganadora|ganadores|ganadoras|premi|patrocin|seleccion oficial|seleccionad|finalista|particip|rumbo al|camino al|apoyo del?|presentad[oa]s? en|estuvo en|estuvieron en|viene del?|tras su paso por)/;
/** Los ordinales escritos que pueden ir antes de «festival» («Noveno Festival…»). */
const ORDINALES: Record<string, number> = { primer: 1, primero: 1, primera: 1, segundo: 2, segunda: 2, tercer: 3, tercero: 3, tercera: 3, cuarto: 4, cuarta: 4, quinto: 5, quinta: 5, sexto: 6, sexta: 6, septimo: 7, septima: 7, octavo: 8, octava: 8, noveno: 9, novena: 9, decimo: 10, decima: 10 };
const ROMANOS: Record<string, number> = { i: 1, v: 5, x: 10, l: 50 };
function romano(t: string): number | null {
  if (!/^[ivxl]{1,7}$/.test(t)) return null;
  let total = 0;
  for (let i = 0; i < t.length; i++) {
    const v = ROMANOS[t[i]];
    const sig = ROMANOS[t[i + 1]] ?? 0;
    total += v < sig ? -v : v;
  }
  return total > 0 && total < 90 ? total : null;
}
/** Palabras con que sigue una frase y ya no el nombre del festival («… en el Teatro de la Paz», «… presenta», «… con Trío Bruma»). */
const FIN_DEL_NOMBRE = /\s(en el|en la|en los|en las|presenta|presentan|te invita|invita|invitan|con|para|desde|hasta)\s/;
/** Lo que corta un nombre: signos de puntuación y los guiones de separar. */
const CORTE = /[·|,;:()[\]!?¡¿"«»“”\n\r\t–—]|\s-\s|\s\/\s/;

/** Un festival nombrado con su edición: el texto tal como se escribió (para enseñarlo) y su clave (nombre normalizado y edición). */
export type Mencion = { texto: string; nombre: string; edicion: string; clave: string };

/**
 * La mención explícita de un festival **con nombre y edición** en un texto (el título del evento o lo que leyó el cartel): «Festival de Cine UASLP
 * 2026», «9º Festival Internacional de Danza», «XXIII Festival de las Artes», «Festival Umbral, 3a edición». Sin edición no hay mención (el mismo
 * nombre en otro año es otro festival y no se resuelve por parecido). No cuenta si antes dice que es un premio, un patrocinio o un antecedente
 * («Ganador del Festival X 2025», «Con el apoyo del Festival X»). null si no hay ninguna que valga.
 */
export function mencionDeFestival(texto: string | null | undefined): Mencion | null {
  const s = (texto ?? "").slice(0, 600);
  const n = plano(s);
  const re = /\bfestival\b/g;
  for (let m = re.exec(n); m; m = re.exec(n)) {
    const antes = n.slice(0, m.index);
    // La edición antes: «9º», «9a.», «XXIII», «Noveno».
    let inicio = m.index;
    let edicion: string | null = null;
    const num = /(?:^|\s)(\d{1,2})\s*(?:º|°|ª|o|a|er|era|vo|va|no|na|mo|ma)?\.?\s*$/.exec(antes);
    const rom = /(?:^|\s)([ivxl]{1,7})\s*$/.exec(antes);
    const pal = /(?:^|\s)([a-z]+)\s*$/.exec(antes);
    if (num) {
      edicion = String(Number(num[1]));
      inicio = num.index + num[0].length - num[0].trimStart().length;
    } else if (rom && romano(rom[1])) {
      edicion = String(romano(rom[1]));
      inicio = rom.index + rom[0].length - rom[0].trimStart().length;
    } else if (pal && ORDINALES[pal[1]]) {
      edicion = String(ORDINALES[pal[1]]);
      inicio = pal.index + pal[0].length - pal[0].trimStart().length;
    }
    if (NO_ES_PARTE.test(n.slice(Math.max(0, inicio - 45), inicio))) continue;
    // El nombre: de «festival» hasta un signo, una frase que ya no es nombre o el año (que lo cierra).
    let resto = n.slice(m.index);
    const corte = CORTE.exec(resto);
    if (corte) resto = resto.slice(0, corte.index);
    const anio = /\b(19|20)\d{2}\b/.exec(resto);
    let fin = m.index + (anio ? anio.index + anio[0].length : resto.length);
    if (!anio) {
      const frase = FIN_DEL_NOMBRE.exec(resto);
      if (frase) fin = m.index + frase.index;
    }
    let cuerpo = n.slice(m.index, fin);
    if (anio) edicion = anio[0];
    // «Festival Umbral, 3a edición» o «Festival Umbral 3a edición»: la edición después del nombre.
    if (!edicion) {
      const despues = /^\s*,?\s*(\d{1,2})\s*(?:º|°|ª|a|va|o)?\.?\s+edicion\b/.exec(n.slice(fin));
      const dentro = /\s(\d{1,2})\s*(?:º|°|ª|a|va|o)?\.?\s+edicion\b.*$/.exec(cuerpo);
      if (despues) {
        edicion = String(Number(despues[1]));
        fin += despues[0].length;
      } else if (dentro) {
        edicion = String(Number(dentro[1]));
        cuerpo = cuerpo.slice(0, dentro.index);
      }
    }
    if (!edicion) continue;
    const nombre = normalizarNombre(cuerpo.replace(/\b(19|20)\d{2}\b/g, " ").replace(/\bedicion\b/g, " ")).replace(/\s+(de|del|la|las|los|el|y|en)$/g, "");
    // «Festival 2026» a secas no nombra nada.
    if (nombre.split(" ").filter((w) => !["festival", "de", "del", "la", "las", "los", "el", "y"].includes(w)).length === 0) continue;
    const textoOriginal = s.slice(inicio, fin).trim().replace(/\s+/g, " ").replace(/[\s,]+$/, "");
    return { texto: textoOriginal, nombre, edicion, clave: `${nombre}|${edicion}` };
  }
  return null;
}

/**
 * ¿Un festival ya publicado (su título y cuándo empieza) es el de la mención? Mismo nombre y misma edición; si el título del festival no dice su
 * edición y la mención trae un año, vale el año en que empieza (los festivales que se crearon con «Parte de un festival» con solo el nombre).
 */
export function esElMismoFestival(m: Pick<Mencion, "nombre" | "edicion">, festival: { titulo: string; inicio: string }): boolean {
  const propia = mencionDeFestival(festival.titulo);
  if (propia) return propia.nombre === m.nombre && propia.edicion === m.edicion;
  return normalizarNombre(festival.titulo) === m.nombre && /^(19|20)\d{2}$/.test(m.edicion) && festival.inicio.slice(0, 4) === m.edicion;
}

/** ¿El título dice que es una inauguración? («Inauguración de …», «Se inaugura …»). Solo eso no identifica una muestra. */
export const esApertura = (titulo: string): boolean => /\b(inauguracion|inauguraciones|inaugura|inauguran|inauguramos)\b/.test(plano(titulo));

/**
 * ¿El texto nombra **una** muestra? «exposición», «expo», «muestra» en singular; no «muestra de cine» (eso es un festival) ni «exposiciones» (la
 * apertura de varias salas no tiene una sola muestra que proponer: modelo §10, variantes).
 */
export const nombraMuestra = (texto: string): boolean => {
  const t = plano(texto);
  return /\b(exposicion|expo|muestra)\b/.test(t) && !/\bmuestra de cine\b/.test(t);
};

/** Adjetivos con que se presenta una muestra («exposición fotográfica colectiva»): se quitan junto con la palabra. */
const TIPO_MUESTRA = /^(exposicion|muestra|expo)((\s+(individual|colectiva|fotografica|pictorica|plastica|temporal|permanente|antologica|grafica|retrospectiva|itinerante|documental|de arte))*)\s*[:\-–—]?\s*/;

/**
 * El nombre de la muestra a partir del título de su inauguración: «Inauguración de la exposición Ecos de papel» → «Ecos de papel»;
 * «Inauguración: Levitaciones, de Ricardo Rendón» → «Levitaciones, de Ricardo Rendón»; «Inauguración de la exposición de Lucía Montaño» →
 * «Exposición de Lucía Montaño». Vacío si no queda nada que nombre una muestra («Inauguración»).
 */
export function nombreDeMuestra(titulo: string): string {
  let s = titulo.trim();
  let n = plano(s);
  const inaug = /^(gran\s+)?(inauguracion|apertura)\s*[:\-–—·]?\s*(de\s+(la|las|los|el)\s+|del\s+|de\s+)?/.exec(n);
  if (inaug) {
    s = s.slice(inaug[0].length);
    n = n.slice(inaug[0].length);
  }
  const tipo = TIPO_MUESTRA.exec(n);
  // «exposición de Lucía Montaño»: sin el nombre propio de la muestra, la palabra se queda (es su nombre).
  if (tipo && !/^de\s/.test(n.slice(tipo[0].length))) s = s.slice(tipo[0].length);
  s = s.replace(/^[«"“'‘\s]+|[»"”'’\s.]+$/g, "").trim();
  if (!s || !/\p{L}/u.test(s)) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** ¿Dos títulos son el mismo acto? Iguales una vez normalizados: un duplicado, una corrección o la segunda función de la misma obra. */
export const mismoActo = (a: string, b: string): boolean => normalizarNombre(a) === normalizarNombre(b);

// ---------------------------------------------------------------- Pistas

/** Lo que el cartel o el título dicen y que puede volverse sugerencia (lo arma la pantalla con lo leído; el servidor lo vuelve a comprobar). */
export type Pistas = {
  /** Los días de visita que leyó el cartel (H1 con los dos; H2 si falta `hasta`). */
  visita: { desde: string; hasta: string | null } | null;
  /** El cartel o el título dicen que es una apertura. */
  apertura: boolean;
  /** El cartel o el título nombran una muestra. */
  muestra: boolean;
  /** El festival con su edición que dice el cartel («Festival de Cine UASLP 2026»), si lo dice. */
  festival: string | null;
};

export const SIN_PISTAS: Pistas = { visita: null, apertura: false, muestra: false, festival: null };

const ES_DIA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Las pistas de lo que leyó el cartel y del título con que se publicó. Una apertura sale del título («Inauguración …») o del cartel: una exposición
 * con su fecha y hora de apertura antes de su periodo (la misma regla con que el alta pone la inauguración, `cartelPorPasos`).
 */
export function pistasDe(titulo: string, leido: { clase?: Clase | null; visita?: { desde: string; hasta: string | null } | null; inicio?: string; horaLeida?: boolean; festival?: string | null } | null): Pistas {
  const visita = leido?.visita && ES_DIA.test(leido.visita.desde) ? { desde: leido.visita.desde, hasta: leido.visita.hasta && ES_DIA.test(leido.visita.hasta) && leido.visita.hasta >= leido.visita.desde ? leido.visita.hasta : null } : null;
  const fecha = (leido?.inicio ?? "").split("T")[0];
  const aperturaLeida = leido?.clase === "exposicion" && !!leido.horaLeida && ES_DIA.test(fecha) && (!visita || fecha <= visita.desde);
  return {
    visita,
    apertura: esApertura(titulo) || aperturaLeida,
    muestra: nombraMuestra(titulo) || leido?.clase === "exposicion" || !!visita,
    festival: leido?.festival?.trim() ? leido.festival.trim().slice(0, 160) : null,
  };
}

/** Las pistas que llegan de la pantalla, limpias (un cliente viejo o un campo mal formado no dan nada). */
export function pistasLimpias(p: unknown): Pistas {
  if (!p || typeof p !== "object") return SIN_PISTAS;
  const o = p as Record<string, unknown>;
  const v = o.visita as Record<string, unknown> | null | undefined;
  const desde = v && typeof v.desde === "string" && ES_DIA.test(v.desde) ? v.desde : null;
  const hasta = desde && v && typeof v.hasta === "string" && ES_DIA.test(v.hasta) && v.hasta >= desde ? v.hasta : null;
  return {
    visita: desde ? { desde, hasta } : null,
    apertura: o.apertura === true,
    muestra: o.muestra === true,
    festival: typeof o.festival === "string" && o.festival.trim() ? o.festival.trim().slice(0, 160) : null,
  };
}

// ---------------------------------------------------------------- Lo que se propone

/** Lo que ya se anotó de un evento (`eventos.sugerencias`): la mención que leyó el cartel y lo que se hizo con cada sugerencia. */
export type Anotadas = {
  mencion_festival?: string;
  exposicion?: { estado: "descartada" | "aceptada" };
  festival?: { estado: "descartada" | "aceptada"; clave?: string | null };
};
export const anotadasDe = (v: unknown): Anotadas => (v && typeof v === "object" && !Array.isArray(v) ? (v as Anotadas) : {});

/** El evento que se acaba de publicar, como lo lee el servidor. */
export type Publicado = {
  id: string;
  titulo: string;
  clase: Clase;
  /** El día del evento (YYYY-MM-DD en su zona). */
  dia: string;
  /** El nombre de su lugar o su sitio, para enseñarlo. */
  lugar: string | null;
  /** Dónde es, para comparar: el id de su lugar o el nombre de su sitio normalizado (`claveDeSitio`). */
  sitio: string;
  sitioReservado: boolean;
  padre: string | null;
  /** Ya es la inauguración de una exposición. */
  inaugura: boolean;
  anotadas: Anotadas;
};

/** Una exposición propia que ya está publicada y podría ser la de esta apertura (para ligar en vez de crear otra). */
export type ExposicionPropia = { id: string; slug: string | null; titulo: string; sitio: string; desde: string; hasta: string; inaugurada: boolean };

/** Dónde es un evento, para comparar dos: el id de su lugar o, en otro sitio, su nombre normalizado. */
export const claveDeSitio = (lugarId: string | null, sitioTexto: string | null): string => lugarId ?? `sitio:${normalizarNombre(sitioTexto ?? "")}`;

export type Sugerencia =
  /** H1: el cartel trae el periodo; un toque la publica. */
  | { tipo: "exposicion"; modo: "crear"; titulo: string; visita: { desde: string; hasta: string }; lugar: string | null; quien: string[] }
  /** H2: no se sabe hasta cuándo; se pregunta («¿Cuándo se puede visitar?») con `desde` ya puesto. */
  | { tipo: "exposicion"; modo: "periodo"; titulo: string; desde: string; lugar: string | null; quien: string[] }
  /** H1/H2 con la exposición ya publicada: ligar la inauguración. */
  | { tipo: "exposicion"; modo: "ligar"; titulo: string; exposicion: ExposicionPropia }
  /** H4: dos actos distintos nombran el mismo festival y edición; se crea el festival y se relacionan. */
  | { tipo: "festival"; modo: "relacionar"; mencion: string; clave: string; otro: { id: string; titulo: string; dia: string; lugar: string | null } }
  /** H5: el festival propio ya existe; se relaciona este acto (y, si lo hay, el otro que lo nombra). */
  | { tipo: "festival"; modo: "marco"; mencion: string; clave: string; marco: { id: string; slug: string | null; titulo: string; actos: number }; otro: { id: string; titulo: string; dia: string; lugar: string | null } | null };

/**
 * H1 / H2: la exposición que abre esta inauguración. Solo para un evento puntual que es una apertura y nombra una muestra con nombre propio,
 * sin sugerencia anotada, que no inaugura ya otra, ni en un sitio reservado (su dirección es de otro evento). Con una exposición propia del
 * mismo nombre y lugar cuyos días se cruzan, se propone ligarla; con el periodo leído, crearla; sin él, preguntarlo (desde el día siguiente a la
 * apertura, por confirmar con el founder).
 */
export function sugerenciaDeExposicion(e: Publicado, pistas: Pistas, quien: string[], propias: readonly ExposicionPropia[], hoy: string): Sugerencia | null {
  if (e.clase !== "puntual" || e.inaugura || e.sitioReservado || e.anotadas.exposicion) return null;
  const apertura = pistas.apertura || esApertura(e.titulo);
  const muestra = pistas.muestra || nombraMuestra(e.titulo);
  const titulo = nombreDeMuestra(e.titulo);
  if (!apertura || !muestra || !titulo) return null;
  const visita = pistas.visita?.hasta && pistas.visita.hasta >= e.dia && pistas.visita.hasta >= hoy ? { desde: pistas.visita.desde, hasta: pistas.visita.hasta } : null;
  // Ya publicada: mismo nombre, mismo sitio, sin inauguración y con días que se cruzan con los leídos (o, sin ellos, abierta tras la apertura).
  const desde = visita?.desde ?? e.dia;
  const hasta = visita?.hasta ?? "9999-12-31";
  const ya = propias.find((x) => !x.inaugurada && mismoActo(x.titulo, titulo) && x.sitio === e.sitio && x.desde <= hasta && x.hasta >= desde && x.hasta >= e.dia);
  if (ya) return { tipo: "exposicion", modo: "ligar", titulo: ya.titulo, exposicion: ya };
  if (visita) return { tipo: "exposicion", modo: "crear", titulo, visita, lugar: e.lugar, quien };
  if (pistas.visita?.hasta) return null; // Leída, pero ya pasó: no se ofrece una exposición cerrada.
  return { tipo: "exposicion", modo: "periodo", titulo, desde: pistas.visita?.desde && pistas.visita.desde > e.dia ? pistas.visita.desde : sumarDiasIso(e.dia, 1), lugar: e.lugar, quien };
}

/** Otro evento propio y reciente, candidato a ser el otro acto del mismo festival. */
export type OtroActo = { id: string; titulo: string; dia: string; lugar: string | null; padre: string | null; anotadas: Anotadas };
/** Un festival propio. */
export type FestivalPropio = { id: string; slug: string | null; titulo: string; inicio: string; actos: number };

/** La mención de un evento guardado: la que anotó el cartel al publicarlo o, si no, la de su título. */
export const mencionDeEvento = (titulo: string, anotadas: Anotadas): Mencion | null => mencionDeFestival(anotadas.mencion_festival) ?? mencionDeFestival(titulo);

/**
 * H4 / H5: el festival que nombran este evento y otro propio. Solo si el título o el cartel lo nombran con su edición; nunca para un festival, uno
 * que ya es parte de un festival o uno cuya sugerencia ya se anotó. Si el festival propio ya existe (H5), se propone desde el primer acto. Si no,
 * hace falta un segundo acto distinto (otro título) que nombre lo mismo y no esté ya en otro festival (H4). Una agrupación que ya se descartó en
 * cualquiera de los actos no se vuelve a ofrecer por un tercero.
 */
export function sugerenciaDeFestival(e: Publicado, pistas: Pistas, otros: readonly OtroActo[], festivales: readonly FestivalPropio[]): Sugerencia | null {
  if (e.clase === "festival" || e.clase === "exposicion" || e.padre || e.anotadas.festival) return null;
  const m = mencionDeFestival(pistas.festival) ?? mencionDeEvento(e.titulo, e.anotadas);
  if (!m) return null;
  const mismos = otros.filter((o) => o.id !== e.id && mencionDeEvento(o.titulo, o.anotadas)?.clave === m.clave);
  if (mismos.some((o) => o.anotadas.festival?.estado === "descartada")) return null;
  const otro = mismos.filter((o) => !o.padre && !o.anotadas.festival && !mismoActo(o.titulo, e.titulo))[0] ?? null;
  const marco = festivales.find((f) => esElMismoFestival(m, f));
  const resumen = otro && { id: otro.id, titulo: otro.titulo, dia: otro.dia, lugar: otro.lugar };
  if (marco) return { tipo: "festival", modo: "marco", mencion: marco.titulo, clave: m.clave, marco: { id: marco.id, slug: marco.slug, titulo: marco.titulo, actos: marco.actos }, otro: resumen };
  if (!resumen) return null;
  return { tipo: "festival", modo: "relacionar", mencion: m.texto, clave: m.clave, otro: resumen };
}

/** La única sugerencia que sale: la del periodo visitable gana a la del festival (modelo §10: «priorizar el periodo visitable»). */
export const unaSugerencia = (exposicion: Sugerencia | null, festival: Sugerencia | null): Sugerencia | null => exposicion ?? festival;
