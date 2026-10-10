/**
 * Los tokens del cartel (OL-324): formatos, retícula y los tamaños de letra que comparten las doce plantillas. Las plantillas no escriben
 * medidas sueltas: las sacan de aquí o de su caja de texto (`medir.ts`). Los px son del lienzo (1080 de ancho), no de la pantalla.
 */

export type IdFormato = "4x5" | "9x16";

export type Formato = {
  id: IdFormato;
  /** Lo que dice el chip. */
  nombre: string;
  proporcion: string;
  ancho: number;
  alto: number;
  /** Lo que la interfaz de Instagram y Facebook tapa arriba y abajo en una historia: ahí no va texto (doc 52 §3.1). En la publicación, 0. */
  tapaArriba: number;
  tapaAbajo: number;
};

/** Publicación (4:5) para Instagram, Facebook y WhatsApp; historia (9:16) para historias y estados (doc 52 §3.1, pedido del founder 2026-10-05). */
export const FORMATOS: Record<IdFormato, Formato> = {
  "4x5": { id: "4x5", nombre: "Publicación", proporcion: "4:5", ancho: 1080, alto: 1350, tapaArriba: 0, tapaAbajo: 0 },
  "9x16": { id: "9x16", nombre: "Historia", proporcion: "9:16", ancho: 1080, alto: 1920, tapaArriba: 250, tapaAbajo: 340 },
};

export function formatoDe(valor: string | null | undefined): Formato {
  return valor === "9x16" ? FORMATOS["9x16"] : FORMATOS["4x5"];
}

/** El aire de los lados y de arriba y abajo en todas las plantillas. */
export const MARGEN = 64;

/** Dónde empieza y dónde acaba el texto en un formato: el margen, o lo que tapa la interfaz si es más. */
export function zonaDeTexto(f: Formato): { arriba: number; abajo: number } {
  return { arriba: Math.max(MARGEN, f.tapaArriba), abajo: Math.max(MARGEN - 8, f.tapaAbajo) };
}

/** Los tamaños fijos de los datos (lo que no es el título), en px del lienzo. */
export const LETRA = {
  /** Etiqueta de arriba, en mayúsculas espaciadas. */
  etiqueta: 24,
  /** Un dato principal (el día, el sitio). */
  dato: 34,
  /** Lo que acompaña al dato (la hora, los artistas). */
  detalle: 27,
  /** El subtítulo. */
  subtitulo: 38,
  /** El pie: el sello (símbolo y dominio). */
  pie: 22,
  /** El mínimo legible de cualquier texto que no sea el pie. */
  minimo: 20,
} as const;

/**
 * El dominio del sello del pie (OL-336: el símbolo SN y el dominio, en el sitio donde iba la dirección corta). UNA sola constante para todos los
 * carteles. Desde OL-368 es `somosnosotrxs.org` (founder, 2026-10-10: «comprado y conectado pero solo vamos a cambiar dominio en el cartel, no
 * en ningún otro lugar»): el dominio lleva con un 308 a somosnosotros.org conservando la ruta, así que `/e/<slug>` también vale. El resto de la
 * app sigue con somosnosotros.org. Los carteles ya descargados conservan el dominio con que se dibujaron.
 */
export const DOMINIO_CARTEL = "somosnosotrxs.org";

/** El resaltador amarillo del zine y las cintas: decorativo, siempre con texto negro encima (contraste 16:1). */
export const RESALTADOR = "#ffe85a";
/** Los colores de las banderas de papel picado: decoración sin texto encima. */
export const PICADO = ["#d6452b", "#f2a33a", "#1e6e5a", "#c9338f", "#2f6db5", "#f2d03a"] as const;
