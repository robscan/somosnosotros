import { etiquetaDisciplina } from "../artistas";
import { ultimoDiaDelPeriodo } from "../claseEvento";
import { claseDeCosto, COOPERACION_SOLIDARIA, type Clase } from "../eventos";
import { cuandoVariosDias, diaLocal, horaCorta, localAIso, zonaSegura } from "../fechas";
import { tieneLetra } from "./medir";
import { DOMINIO_CARTEL } from "./tokens";

/**
 * Los textos del cartel (OL-324; doc 52 §3.2): de dónde sale cada campo y su máximo. Nada se inventa ni se reescribe: el título es el del evento
 * (o el que la persona acortó a mano para el cartel), la fecha y la hora las escribe el sistema en un formato fijo, el precio sale de la clase de
 * costo (`claseDeCosto`: sin precio, «Entrada libre»; nunca «gratis» como texto de la app) y el sello del pie es el símbolo con el dominio.
 * Puro, para probarlo sin dibujar.
 *
 * Las fechas (OL-336, pedidos del founder tras probar en su iPhone): el último día de un evento de varios días sale con la misma regla que la
 * ficha (`ultimoDiaDelPeriodo`: un fin a las 00:00 es el final del día anterior); a un festival o una exposición, que pueden cambiar de fechas
 * y el cartel es una imagen que no se actualiza, solo el mes y el año («Octubre 2026») y sin hora; y cada plantilla dice la fecha una sola vez.
 */

/** Lo que el cartel necesita del evento: lo arma `cargar.ts` desde la base, o una prueba a mano. */
export type EventoCartel = {
  id: string;
  slug: string;
  titulo: string;
  inicio: string;
  fin: string | null;
  zona: string;
  precio: string | null;
  /** Cómo ocurre (OL-321): a un festival o una exposición el cartel les pone solo el mes (OL-336). */
  clase: Clase;
  /** Con horario por día (OL-311): cada día con su hora; el cartel no puede decirlas todas. */
  conSesiones: boolean;
  /** El nombre del sitio como lo dice la agenda (`sitioEnLista`): el lugar, «otro sitio», «Sitio reservado» o, en un festival, «Varias sedes» (OL-339). */
  sitio: string | null;
  /** El tipo del lugar (`lugares.tipo`), para la afinidad; null en «otro sitio». */
  tipoLugar: string | null;
  lugarId: string | null;
  /** Los artistas ligados, en su orden. */
  artistas: { nombre: string; disciplina: string; detalle: string | null }[];
};

/** Máximo de cada campo en el cartel (doc 52 §3.2). El título tiene tres tramos y su tope es el del último. */
export const MAXIMOS = { etiqueta: 28, titulo: 80, subtitulo: 90, lugar: 60, artistas: 8, artista: 40, precio: 24 } as const;

/** Los tramos del título: cada plantilla compone distinto cada uno (doc 52 §3.3, capa 1). */
export type Tramo = "corto" | "medio" | "largo";
export const TRAMOS: Record<Tramo, number> = { corto: 25, medio: 50, largo: 80 };

export function tramoDeTitulo(titulo: string): Tramo {
  const n = [...titulo].length;
  return n <= TRAMOS.corto ? "corto" : n <= TRAMOS.medio ? "medio" : "largo";
}

/** Quita lo que la fuente no puede dibujar (emojis, ideogramas) y los espacios de más. */
export function limpiarTexto(texto: string): string {
  return [...texto]
    .filter((letra) => /\s/.test(letra) || tieneLetra(letra))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** Corta un texto en el último espacio antes del máximo y pone «…»: el corte se ve, nunca a escondidas ni a media palabra si se puede evitar. */
export function recortar(texto: string, maximo: number): string {
  const letras = [...texto];
  if (letras.length <= maximo) return texto;
  const corte = letras.slice(0, maximo - 1).join("");
  // Si el corte cae justo al final de una palabra, la palabra se queda entera.
  const espacio = letras[maximo - 1] === " " ? corte.length : corte.lastIndexOf(" ");
  return `${(espacio > maximo * 0.5 ? corte.slice(0, espacio) : corte).replace(/[\s,.;:·–—-]+$/, "")}…`;
}

/**
 * El subtítulo sale del propio título cuando trae dos partes unidas por dos puntos, una raya o un guion entre espacios («Sangre de Coyote:
 * Semilla que florece el barrio», «Master Class - 9° Festival de Cine UASLP»): es el mismo texto, partido donde la persona ya lo partió. No se aplica si la primera parte es una etiqueta corta («Charla:»,
 * «Taller:»), que se queda en el título.
 */
export function partirTitulo(titulo: string): { titulo: string; subtitulo: string | null } {
  const m = /^(.{4,}?)\s*(?::|\s[–—|-]\s)\s*(.{3,})$/.exec(titulo);
  if (!m || [...m[1]].length < 10) return { titulo, subtitulo: null };
  return { titulo: m[1].trim(), subtitulo: m[2].trim() };
}

/** El precio en el cartel: «Entrada libre», «Cooperación solidaria» o lo que escribió quien publicó, con su tope. */
export function textoPrecio(precio: string | null | undefined): string {
  const clase = claseDeCosto(precio);
  if (clase === "gratis") return "Entrada libre";
  const texto = limpiarTexto(precio ?? "");
  if (clase === "cooperacion" && texto === COOPERACION_SOLIDARIA) return COOPERACION_SOLIDARIA;
  return recortar(texto, MAXIMOS.precio);
}

/** La etiqueta de arriba: qué hace el primer artista con disciplina («Son huasteco», «Teatro»); sin artistas, nada. */
export function textoEtiqueta(artistas: EventoCartel["artistas"]): string | null {
  const conDisciplina = artistas.find((a) => a.disciplina && a.disciplina !== "por_completar");
  if (!conDisciplina) return null;
  const detalle = conDisciplina.detalle ? limpiarTexto(conDisciplina.detalle) : "";
  const texto = detalle && [...detalle].length <= MAXIMOS.etiqueta ? detalle.charAt(0).toUpperCase() + detalle.slice(1) : etiquetaDisciplina(conDisciplina.disciplina);
  return recortar(texto, MAXIMOS.etiqueta);
}

/** Hasta 8 nombres; si hay más, cuántos faltan («y 4 más»). Una plantilla que enseña menos usa `nombresVisibles`. */
export function textoArtistas(artistas: EventoCartel["artistas"]): { nombres: string[]; mas: number } {
  const nombres = artistas.map((a) => recortar(limpiarTexto(a.nombre), MAXIMOS.artista)).filter(Boolean);
  return { nombres: nombres.slice(0, MAXIMOS.artistas), mas: Math.max(0, nombres.length - MAXIMOS.artistas) };
}

/** Los nombres que caben en una plantilla que enseña `tope`: «Ana, Luis y 3 más». */
export function nombresVisibles(artistas: { nombres: string[]; mas: number }, tope: number): string {
  const visibles = artistas.nombres.slice(0, tope);
  const resto = artistas.nombres.length - visibles.length + artistas.mas;
  if (visibles.length === 0) return "";
  if (resto > 0) return `${visibles.join(", ")} y ${resto} más`;
  return visibles.length === 1 ? visibles[0] : `${visibles.slice(0, -1).join(", ")} y ${visibles[visibles.length - 1]}`;
}

const primeraMayuscula = (t: string) => t.charAt(0).toLocaleUpperCase("es-MX") + t.slice(1);

/** El mediodía de un día de calendario (YYYY-MM-DD) en la zona: el instante con que se escribe ese día sin que la hora lo mueva. */
const mediodia = (dia: string, zona: string): string => localAIso(`${dia}T12:00`, zona) ?? `${dia}T12:00:00.000Z`;

/** «Sábado 11 de octubre» (con año si no es el de `ahora`), en la zona del evento. */
function diaLargoCartel(iso: string, zona: string, ahora: Date): string {
  const z = zonaSegura(zona);
  const anio = (d: Date) => new Intl.DateTimeFormat("es-MX", { timeZone: z, year: "numeric" }).format(d);
  const d = new Date(iso);
  const texto = new Intl.DateTimeFormat("es-MX", { timeZone: z, weekday: "long", day: "numeric", month: "long", ...(anio(d) === anio(ahora) ? {} : { year: "numeric" }) }).format(d);
  return primeraMayuscula(texto.replace(",", ""));
}

/** «Sáb 11 oct»: la fecha corta de los sellos y las cintas. */
function diaCortoCartel(iso: string, zona: string): string {
  const texto = new Intl.DateTimeFormat("es-MX", { timeZone: zonaSegura(zona), weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
  return primeraMayuscula(texto.replace(/[.,]/g, "").replace(/\bde\s+/, ""));
}

/** El mes de un día de calendario: «octubre» (`long`) u «oct» (`short`). No depende de la zona. */
const mesDe = (dia: string, largo: "long" | "short"): string => new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", month: largo }).format(new Date(`${dia}T12:00:00Z`)).replace(/[.,]/g, "");
const numeroDe = (dia: string): string => String(Number(dia.slice(8, 10)));

/** «Del 9 al 11 de octubre» (o «Del 30 de octubre al 2 de noviembre»), con el mes completo: en un cartel sobra el espacio que falta en una lista. */
function rangoLargo(desde: string, hasta: string): string {
  return desde.slice(0, 7) === hasta.slice(0, 7) ? `Del ${numeroDe(desde)} al ${numeroDe(hasta)} de ${mesDe(hasta, "long")}` : `Del ${numeroDe(desde)} de ${mesDe(desde, "long")} al ${numeroDe(hasta)} de ${mesDe(hasta, "long")}`;
}

/**
 * Solo el mes y el año (OL-336, decisión del founder: el cartel no se actualiza si un festival o una exposición cambia sus fechas): «Octubre
 * 2026», «Octubre – Noviembre 2026» o, si cambia el año, «Diciembre 2026 – Enero 2027». `largo` da el mes completo y, si no, en tres letras.
 */
function soloMeses(desde: string, hasta: string, largo: "long" | "short"): string {
  const mes = (dia: string) => primeraMayuscula(mesDe(dia, largo));
  const [a, b] = [desde.slice(0, 4), hasta.slice(0, 4)];
  if (desde.slice(0, 7) === hasta.slice(0, 7)) return `${mes(desde)} ${a}`;
  return a === b ? `${mes(desde)} – ${mes(hasta)} ${b}` : `${mes(desde)} ${a} – ${mes(hasta)} ${b}`;
}

/** Las clases cuyo cartel dice solo el mes (OL-336): las que se viven a lo largo de días y pueden cambiar de fechas. */
export const CLASES_SOLO_MES: readonly Clase[] = ["festival", "exposicion"];

export type TextosCartel = {
  etiqueta: string | null;
  titulo: string;
  subtitulo: string | null;
  tramo: Tramo;
  /** El título no cupo en los 80 del tramo largo y se cortó: la pantalla ofrece «Acortar título». */
  tituloRecortado: boolean;
  /** La fecha en un renglón: «Sábado 11 de octubre», «Del 9 al 11 de octubre» o, a un festival o una exposición, «Octubre 2026». */
  dia: string;
  /** La misma fecha en corto, para sellos, cintas y boletos: «Sáb 11 oct», «Vie 9 oct – Dom 11 oct» u «Oct 2026». */
  diaCorto: string;
  /**
   * La misma fecha como imagen (las versiones sin foto la hacen enorme): el número y, aparte, el mes. «11» y «OCT»; varios días, «9–11» y «OCT»
   * (o «30–2» y «OCT–NOV»); solo el mes, «OCT» y «2026». Cada plantilla usa UNA de las tres formas: la fecha sale una vez por cartel (OL-336).
   */
  fecha: { numero: string; mes: string };
  /** «19:00 h», «19:00–21:00 h» (varios días con el mismo horario) u «Horario por día»; null a un festival o una exposición (solo el mes). */
  hora: string | null;
  sitio: string | null;
  artistas: { nombres: string[]; mas: number };
  precio: string;
};

/** La dirección corta del evento (`somosnosotros.org/e/<slug>`; el proxy la lleva a `/eventos/<slug>` con un 308). Desde OL-336 el pie del cartel
 *  lleva el símbolo con el dominio y no esta dirección, pero la dirección sigue valiendo para quien la tenga. */
export function enlaceCorto(slug: string): string {
  return `${DOMINIO_CARTEL}/e/${slug}`;
}

/** Las mayúsculas del mes en la fecha como imagen («OCT»). */
const mayus = (t: string) => t.toLocaleUpperCase("es-MX");

/** Las tres formas de la fecha (`dia`, `diaCorto`, `fecha`) y la hora, según la clase y los días del evento. */
function fechas(e: EventoCartel, ahora: Date): Pick<TextosCartel, "dia" | "diaCorto" | "fecha" | "hora"> {
  const z = zonaSegura(e.zona);
  const desde = diaLocal(new Date(e.inicio), z);
  // El último día con la regla de la ficha: un fin a las 00:00 es el final del día anterior («Ciclo Fellini» terminaba a las 00:00 del 15: es el 14).
  const hasta = ultimoDiaDelPeriodo(e.inicio, e.fin, z);
  if (CLASES_SOLO_MES.includes(e.clase)) {
    const [a, b] = [desde.slice(0, 4), hasta.slice(0, 4)];
    const meses = desde.slice(0, 7) === hasta.slice(0, 7) ? mayus(mesDe(desde, "short")) : `${mayus(mesDe(desde, "short"))}–${mayus(mesDe(hasta, "short"))}`;
    return { dia: soloMeses(desde, hasta, "long"), diaCorto: soloMeses(desde, hasta, "short"), fecha: { numero: meses, mes: a === b ? a : `${a}–${b}` }, hora: null };
  }
  const varios = cuandoVariosDias(e.inicio, e.fin, ahora, z);
  if (e.conSesiones || (varios && hasta > desde)) {
    const mismoMes = desde.slice(0, 7) === hasta.slice(0, 7);
    return {
      dia: rangoLargo(desde, hasta),
      diaCorto: `${diaCortoCartel(e.inicio, z)} – ${diaCortoCartel(mediodia(hasta, z), z)}`,
      fecha: { numero: `${numeroDe(desde)}–${numeroDe(hasta)}`, mes: mismoMes ? mayus(mesDe(hasta, "short")) : `${mayus(mesDe(desde, "short"))}–${mayus(mesDe(hasta, "short"))}` },
      // Con un fin a las 00:00 el evento acaba con su último día (la misma regla de arriba): la hora es solo la de inicio, como con 23:59.
      hora: e.conSesiones ? "Horario por día" : `${varios && !(e.fin && horaCorta(e.fin, z) === "00:00") ? varios.horas : horaCorta(e.inicio, z)} h`,
    };
  }
  return { dia: diaLargoCartel(e.inicio, z, ahora), diaCorto: diaCortoCartel(e.inicio, z), fecha: { numero: numeroDe(desde), mes: mayus(mesDe(desde, "short")) }, hora: `${horaCorta(e.inicio, z)} h` };
}

/**
 * Todos los textos del cartel a partir del evento. `tituloPropio` es el que la persona escribió en «Acortar título» (solo para el cartel: el
 * evento no cambia); vacío o igual al del evento, se usa el del evento.
 */
export function armarTextos(e: EventoCartel, tituloPropio: string | null = null, ahora: Date = new Date()): TextosCartel {
  const propio = tituloPropio ? limpiarTexto(tituloPropio) : "";
  const base = propio || limpiarTexto(e.titulo);
  const partes = propio ? { titulo: propio, subtitulo: null } : partirTitulo(base);
  const titulo = recortar(partes.titulo, MAXIMOS.titulo);
  return {
    etiqueta: textoEtiqueta(e.artistas),
    titulo,
    subtitulo: partes.subtitulo ? recortar(partes.subtitulo, MAXIMOS.subtitulo) : null,
    tramo: tramoDeTitulo(titulo),
    tituloRecortado: titulo !== partes.titulo,
    ...fechas(e, ahora),
    sitio: e.sitio ? recortar(limpiarTexto(e.sitio), MAXIMOS.lugar) : null,
    artistas: textoArtistas(e.artistas),
    precio: textoPrecio(e.precio),
  };
}
