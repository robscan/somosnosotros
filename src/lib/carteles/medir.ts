import ANCHOS from "./anchos.json";

/**
 * Medir el texto antes de dibujarlo (OL-324; doc 52 §3.3, capas 1 y 2: «cambia la composición, no solo el tamaño» y «la letra baja por pasos
 * hasta un mínimo legible; es cálculo, no IA»). Cada letra tiene su avance en la tabla que sale de la propia fuente
 * (`scripts/carteles/instancias.py`); con eso se parte el texto en renglones y se busca el tamaño mayor con el que cabe. Los renglones se
 * dibujan tal cual salen de aquí, uno por uno y sin que satori los vuelva a partir: lo que se mide es lo que se ve.
 * Puro: sin fuentes cargadas, sin DOM. El interletraje (kerning) no se cuenta: casi siempre acerca las letras, así que la medida peca de ancha
 * y nunca de angosta (las pruebas lo comprueban contra satori).
 */

/** Las instancias de Bricolage Grotesque que hay (`src/lib/carteles/fuentes/bricolage-<nombre>.ttf`). */
export type Fuente = keyof typeof ANCHOS;
export const FUENTES = Object.keys(ANCHOS) as Fuente[];

type Tabla = { upm: number; anchos: Record<string, number> };
const TABLAS = ANCHOS as Record<Fuente, Tabla>;

/** ¿La fuente tiene esta letra? Lo que no tiene (un emoji, un ideograma) no se puede dibujar y se quita antes (`limpiarTexto`). */
export function tieneLetra(letra: string, fuente: Fuente = "regular"): boolean {
  return letra in TABLAS[fuente].anchos;
}

/** El ancho de un texto en px a un tamaño dado, con el espacio entre letras (`espaciado`, en px) que se le ponga. */
export function anchoTexto(texto: string, fuente: Fuente, tamano: number, espaciado = 0): number {
  const { upm, anchos } = TABLAS[fuente];
  const promedio = upm * 0.55;
  let unidades = 0;
  let letras = 0;
  for (const letra of texto) {
    unidades += anchos[letra] ?? promedio;
    letras++;
  }
  return (unidades * tamano) / upm + espaciado * letras;
}

export type Estilo = { fuente: Fuente; tamano: number; espaciado?: number };

/**
 * Parte un texto en renglones que no pasen de `ancho` (por palabras, sin cortar ninguna). Una palabra que sola ya no cabe se devuelve en
 * `sobra` para que quien llama pruebe otro tamaño: nunca se parte una palabra a la mitad sin avisar.
 */
export function partirRenglones(texto: string, ancho: number, estilo: Estilo): { renglones: string[]; sobra: boolean } {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const mide = (t: string) => anchoTexto(t, estilo.fuente, estilo.tamano, estilo.espaciado);
  const renglones: string[] = [];
  let actual = "";
  let sobra = false;
  for (const palabra of palabras) {
    const junto = actual ? `${actual} ${palabra}` : palabra;
    if (mide(junto) <= ancho) {
      actual = junto;
      continue;
    }
    if (actual) renglones.push(actual);
    actual = palabra;
    if (mide(palabra) > ancho) sobra = true;
  }
  if (actual) renglones.push(actual);
  return { renglones, sobra };
}

/**
 * Renglones parejos (como `text-wrap: balance`): con el mismo número de renglones, el ancho más angosto que todavía da ese número. Un título de
 * cartel con una palabra sola en el último renglón se ve roto; así el corte cae donde un diseñador lo pondría.
 */
function equilibrar(texto: string, ancho: number, estilo: Estilo, cuantos: number): string[] {
  let bajo = ancho * 0.4;
  let alto = ancho;
  let mejor = partirRenglones(texto, ancho, estilo).renglones;
  for (let i = 0; i < 12; i++) {
    const medio = (bajo + alto) / 2;
    const prueba = partirRenglones(texto, medio, estilo);
    if (!prueba.sobra && prueba.renglones.length <= cuantos) {
      mejor = prueba.renglones;
      alto = medio;
    } else {
      bajo = medio;
    }
  }
  return mejor;
}

/** Lo que pide un bloque de texto: dónde cabe y entre qué tamaños puede moverse. */
export type Caja = {
  fuente: Fuente;
  /** El ancho disponible, en px del lienzo. */
  ancho: number;
  /** Cuántos renglones caben como mucho. */
  renglones: number;
  /** El tamaño de letra mayor y el mínimo legible (px del lienzo de 1080). */
  mayor: number;
  menor: number;
  espaciado?: number;
  /** Todo en mayúsculas (se mide ya en mayúsculas: son más anchas). */
  mayusculas?: boolean;
  /** Renglones parejos (títulos). */
  parejo?: boolean;
  /** El alto disponible, en px: con él, además de los renglones, cuenta lo que miden (renglones × tamaño × interlineado). */
  alto?: number;
  /** El interlineado con que se va a pintar (para `alto`); 1 si no se dice. */
  interlineado?: number;
};

export type Ajuste = {
  tamano: number;
  renglones: string[];
  /** No cupo entero ni al tamaño mínimo y se cortó con «…» al final (capa 3 sin IA: el corte se ve y la pantalla ofrece «Acortar título»). */
  recortado: boolean;
};

/** Cuánto baja la letra en cada paso, en px. */
const PASO = 2;

/** Cuántos renglones caben a un tamaño: los de la caja y, si tiene alto, los que entran en él (al menos uno). */
function renglonesQueCaben(caja: Caja, tamano: number): number {
  if (!caja.alto) return caja.renglones;
  return Math.max(1, Math.min(caja.renglones, Math.floor(caja.alto / (tamano * (caja.interlineado ?? 1)))));
}

/** Corta el texto para que quepa en los renglones de la caja al tamaño dado, quitando palabras del final y poniendo «…». */
function recortarARenglones(texto: string, caja: Caja, tamano: number): string[] {
  const estilo = { fuente: caja.fuente, tamano, espaciado: caja.espaciado };
  const cuantos = renglonesQueCaben(caja, tamano);
  const palabras = texto.split(/\s+/).filter(Boolean);
  for (let n = palabras.length - 1; n > 0; n--) {
    const prueba = `${palabras.slice(0, n).join(" ").replace(/[\s,.;:·–—-]+$/, "")}…`;
    const { renglones, sobra } = partirRenglones(prueba, caja.ancho, estilo);
    if (!sobra && renglones.length <= cuantos) return renglones;
  }
  // Ni la primera palabra cabe: se corta por letras (un nombre de 30 letras sin espacios a tamaño mínimo).
  const letras = [...palabras[0]];
  for (let n = letras.length - 1; n > 0; n--) {
    const prueba = `${letras.slice(0, n).join("")}…`;
    if (anchoTexto(prueba, caja.fuente, tamano, caja.espaciado) <= caja.ancho) return [prueba];
  }
  return ["…"];
}

/**
 * El tamaño mayor (de `mayor` a `menor`, de 2 en 2) con el que el texto cabe entero en la caja (sus renglones y, si lo tiene, su alto), y sus
 * renglones. Si no cabe ni al mínimo, se corta con «…» al mínimo y se avisa (`recortado`).
 */
export function ajustar(textoOriginal: string, caja: Caja): Ajuste {
  const texto = caja.mayusculas ? textoOriginal.toLocaleUpperCase("es-MX") : textoOriginal;
  if (!texto.trim()) return { tamano: caja.mayor, renglones: [], recortado: false };
  for (let tamano = caja.mayor; tamano >= caja.menor; tamano -= PASO) {
    const estilo = { fuente: caja.fuente, tamano, espaciado: caja.espaciado };
    const { renglones, sobra } = partirRenglones(texto, caja.ancho, estilo);
    if (sobra || renglones.length > renglonesQueCaben(caja, tamano)) continue;
    return { tamano, renglones: caja.parejo && renglones.length > 1 ? equilibrar(texto, caja.ancho, estilo, renglones.length) : renglones, recortado: false };
  }
  return { tamano: caja.menor, renglones: recortarARenglones(texto, caja, caja.menor), recortado: true };
}

/** Un renglón que tiene que caber en una línea (un dato, el pie): el tamaño mayor que cabe y, si no, cortado con «…» al mínimo. */
export function ajustarRenglon(texto: string, caja: Omit<Caja, "renglones" | "parejo">): Ajuste {
  return ajustar(texto, { ...caja, renglones: 1 });
}
