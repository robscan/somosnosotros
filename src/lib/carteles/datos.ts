import { etiquetaDisciplina } from "../artistas";
import { claseDeCosto, COOPERACION_SOLIDARIA } from "../eventos";
import { cuandoVariosDias, diaLocal, horaCorta, zonaSegura } from "../fechas";
import { tieneLetra } from "./medir";

/**
 * Los textos del cartel (OL-324; doc 52 §3.2): de dónde sale cada campo y su máximo. Nada se inventa ni se reescribe: el título es el del evento
 * (o el que la persona acortó a mano para el cartel), la fecha y la hora las escribe el sistema en un formato fijo, el precio sale de la clase de
 * costo (`claseDeCosto`: sin precio, «Entrada libre»; nunca «gratis» como texto de la app) y el sitio web es la dirección corta del evento.
 * Puro, para probarlo sin dibujar.
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
  /** Con horario por día (OL-311): cada día con su hora; el cartel no puede decirlas todas. */
  conSesiones: boolean;
  /** El nombre del sitio como lo dice la agenda (`sitioEnLista`): el lugar, «otro sitio» o «Sitio reservado». */
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

/** «Del 9 al 11 de octubre» (o «Del 30 de octubre al 2 de noviembre»), con el mes completo: en un cartel sobra el espacio que falta en una lista. */
function rangoLargo(inicio: string, fin: string, zona: string): string {
  const z = zonaSegura(zona);
  const mes = (iso: string) => new Intl.DateTimeFormat("es-MX", { timeZone: z, month: "long" }).format(new Date(iso));
  const dia = (iso: string) => String(Number(diaLocal(new Date(iso), z).slice(8, 10)));
  return mes(inicio) === mes(fin) ? `Del ${dia(inicio)} al ${dia(fin)} de ${mes(fin)}` : `Del ${dia(inicio)} de ${mes(inicio)} al ${dia(fin)} de ${mes(fin)}`;
}

export type TextosCartel = {
  etiqueta: string | null;
  titulo: string;
  subtitulo: string | null;
  tramo: Tramo;
  /** El título no cupo en los 80 del tramo largo y se cortó: la pantalla ofrece «Acortar título». */
  tituloRecortado: boolean;
  /** «Sábado 11 de octubre» o «Del 9 al 11 de octubre». */
  dia: string;
  /** «Sáb 11 oct» (o «9–11 oct» si son varios días). */
  diaCorto: string;
  /** «19:00 h», «19:00–21:00 h» (varios días con el mismo horario) u «Horario por día». */
  hora: string;
  sitio: string | null;
  artistas: { nombres: string[]; mas: number };
  precio: string;
  /** «somosnosotros.org/e/<slug>». */
  enlace: string;
};

/** El dominio, que también es el sello discreto del pie (doc 52 §4: si va siempre o solo en los sin costo lo decide el founder). */
export const DOMINIO = "somosnosotros.org";

/** La dirección corta del evento en el cartel: `somosnosotros.org/e/<slug>` (el proxy la lleva a `/eventos/<slug>` con un 308). */
export function enlaceCorto(slug: string): string {
  return `${DOMINIO}/e/${slug}`;
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
  const varios = cuandoVariosDias(e.inicio, e.fin, ahora, e.zona);
  const variosDias = e.conSesiones || !!varios;
  const fin = e.fin ?? e.inicio;
  const diaCorto = variosDias ? `${diaCortoCartel(e.inicio, e.zona)} – ${diaCortoCartel(fin, e.zona)}` : diaCortoCartel(e.inicio, e.zona);
  return {
    etiqueta: textoEtiqueta(e.artistas),
    titulo,
    subtitulo: partes.subtitulo ? recortar(partes.subtitulo, MAXIMOS.subtitulo) : null,
    tramo: tramoDeTitulo(titulo),
    tituloRecortado: titulo !== partes.titulo,
    dia: variosDias ? rangoLargo(e.inicio, fin, e.zona) : diaLargoCartel(e.inicio, e.zona, ahora),
    diaCorto,
    hora: e.conSesiones ? "Horario por día" : varios ? `${varios.horas} h` : `${horaCorta(e.inicio, e.zona)} h`,
    sitio: e.sitio ? recortar(limpiarTexto(e.sitio), MAXIMOS.lugar) : null,
    artistas: textoArtistas(e.artistas),
    precio: textoPrecio(e.precio),
    enlace: enlaceCorto(e.slug),
  };
}
