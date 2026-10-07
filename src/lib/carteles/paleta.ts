/**
 * El color del cartel (OL-324; doc 52 §3.4: «la paleta se toma de la portada del lugar o de la foto del evento, dentro de combinaciones ya
 * probadas de contraste»). El color nunca se inventa: la foto da un tono y se elige, entre las paletas que la plantilla admite, la que más se
 * le parece. Todas las paletas de la tabla pasan AA (las pruebas lo comprueban par por par), así que ningún tono de foto puede dejar un texto
 * ilegible. Puro: sin red ni imágenes (el tono dominante lo saca `dibujar.ts` con sharp).
 */

/** Un color en `#rrggbb`. */
export type Hex = `#${string}`;
export type Rgb = { r: number; g: number; b: number };

/**
 * Una paleta: fondo, texto, texto suave (datos secundarios), acento (bloques de color, banderas, sellos) y el texto que va sobre el acento.
 * El acento como letra sobre el fondo solo se usa en tamaños grandes (≥ 28 px en el lienzo de 1080): ahí AA pide 3:1, no 4,5:1.
 */
export type Paleta = { id: string; fondo: Hex; texto: Hex; suave: Hex; acento: Hex; sobreAcento: Hex };

/** Las combinaciones probadas. Oscuras primero, luego claras; el nombre dice el tono para leerlas en una plantilla. */
export const PALETAS = {
  noche: { id: "noche", fondo: "#0b0b0b", texto: "#f4efe6", suave: "#bdb6aa", acento: "#e8b04a", sobreAcento: "#0b0b0b" },
  tinta: { id: "tinta", fondo: "#101418", texto: "#f0deb0", suave: "#c2b28a", acento: "#c9a45c", sobreAcento: "#101418" },
  vino: { id: "vino", fondo: "#2a0f14", texto: "#f6e7d8", suave: "#d9b9a6", acento: "#f0a63c", sobreAcento: "#2a0f14" },
  bosque: { id: "bosque", fondo: "#0f2a22", texto: "#eef3e2", suave: "#b9cdb0", acento: "#a6d971", sobreAcento: "#0f2a22" },
  marino: { id: "marino", fondo: "#0e1f3a", texto: "#eaf0fb", suave: "#b4c2dc", acento: "#ff8f61", sobreAcento: "#0e1f3a" },
  papel: { id: "papel", fondo: "#efeae0", texto: "#141414", suave: "#4a463f", acento: "#c4301a", sobreAcento: "#ffffff" },
  crema: { id: "crema", fondo: "#f6e7c8", texto: "#3a1d14", suave: "#6a4434", acento: "#b8381f", sobreAcento: "#fff8ec" },
  hueso: { id: "hueso", fondo: "#fbfaf7", texto: "#1c1c1a", suave: "#5f5d57", acento: "#8a5a3c", sobreAcento: "#ffffff" },
  zine: { id: "zine", fondo: "#f1ede4", texto: "#111111", suave: "#3d3a35", acento: "#d81b60", sobreAcento: "#ffffff" },
  cielo: { id: "cielo", fondo: "#e9f1f7", texto: "#10283a", suave: "#3c5568", acento: "#1d64a3", sobreAcento: "#ffffff" },
  menta: { id: "menta", fondo: "#e7f2ea", texto: "#12301f", suave: "#3b5646", acento: "#1b7046", sobreAcento: "#ffffff" },
  durazno: { id: "durazno", fondo: "#fbe3d4", texto: "#3b1a0e", suave: "#6b3d2a", acento: "#ad3d1b", sobreAcento: "#ffffff" },
} as const satisfies Record<string, Paleta>;
export type IdPaleta = keyof typeof PALETAS;

export function hexARgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1, 7), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** `rgba(…)` de un color de la paleta con transparencia (los degradados sobre la foto). */
export function conAlfa(hex: string, alfa: number): string {
  const { r, g, b } = hexARgb(hex);
  return `rgba(${r},${g},${b},${alfa})`;
}

/** Luminancia relativa (WCAG 2.x). */
function luminancia({ r, g, b }: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Contraste WCAG entre dos colores (de 1 a 21). */
export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(hexARgb(a)), luminancia(hexARgb(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Matiz (0–360) y saturación (0–1) de un color, en HSL. */
export function matizYSaturacion({ r, g, b }: Rgb): { matiz: number; saturacion: number; luz: number } {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const luz = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { matiz: 0, saturacion: 0, luz };
  const saturacion = d / (1 - Math.abs(2 * luz - 1));
  const matiz = max === rr ? ((gg - bb) / d + 6) % 6 : max === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4;
  return { matiz: matiz * 60, saturacion, luz };
}

/** Debajo de esta saturación el tono de la foto es gris (una foto en blanco y negro, de noche): no dice ningún color y manda la primera paleta. */
const SATURACION_MINIMA = 0.18;

/** Distancia entre dos matices, en la vuelta corta del círculo. */
const distanciaMatiz = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

/** Un fondo sin color (negro, hueso) no se parece a ningún tono: cuenta como lejano, pero no tanto como el opuesto. */
const LEJOS_SIN_COLOR = 60;

/**
 * La paleta para una plantilla: entre las que admite (`admitidas`, la primera es la de siempre), la que más se parece al tono de la foto. Pesa
 * más el fondo que el acento (una foto cálida pide un fondo vino, no un azul marino con acento naranja). Sin foto, o con una foto sin color,
 * la primera; con `semilla` (sin foto) se rota entre las admitidas para que dos eventos sin foto del mismo lugar no salgan iguales.
 */
export function elegirPaleta(admitidas: readonly IdPaleta[], dominante: Rgb | null, semilla = 0): Paleta {
  if (admitidas.length === 0) return PALETAS.noche;
  if (!dominante) return PALETAS[admitidas[Math.abs(semilla) % admitidas.length]];
  const tono = matizYSaturacion(dominante);
  if (tono.saturacion < SATURACION_MINIMA) return PALETAS[admitidas[0]];
  const lejania = (id: IdPaleta) => {
    const acento = matizYSaturacion(hexARgb(PALETAS[id].acento));
    const fondo = matizYSaturacion(hexARgb(PALETAS[id].fondo));
    const dFondo = fondo.saturacion >= SATURACION_MINIMA ? distanciaMatiz(tono.matiz, fondo.matiz) : LEJOS_SIN_COLOR;
    return 0.5 * distanciaMatiz(tono.matiz, acento.matiz) + dFondo;
  };
  return PALETAS[[...admitidas].sort((a, b) => lejania(a) - lejania(b))[0]];
}
