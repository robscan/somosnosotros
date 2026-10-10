/**
 * Los colores de un cartel para el fondo de su historia (OL-359; prototipo firmado `barra-ahora.html`, «Degradado vivo»). Como Apple Music: el
 * cartel se enseña tal cual y lo que arma la app (el fondo) lleva un degradado de sus propios colores, también si es sepia o blanco y negro. Sin
 * cartel, una paleta propia con nombre de aquí, elegida por el id del evento.
 *
 * En esta pieza se calculan en el teléfono al cargar el cartel (`coloresDeImagen`, con un lienzo de 16×20). OL-360 los guardará con el evento al
 * subirlo: `paletaDePixeles` es la parte pura, la misma que correrá allí, y se prueba con píxeles sintéticos.
 *
 * Una paleta son cuatro colores `#rrggbb`: el fondo (oscuro, para que el blanco se lea) y tres luces, de la más viva a la menos.
 */
export type Paleta = readonly [string, string, string, string];

/** Las paletas propias, para un evento sin cartel (los nombres son de aquí; los colores, los del prototipo firmado). */
export const PALETAS_PROPIAS: readonly { nombre: string; c: Paleta }[] = [
  { nombre: "Cantera", c: ["#2a0a2e", "#b0306a", "#ff6f61", "#ffb88a"] },
  { nombre: "Xantolo", c: ["#1e0b3d", "#6d34c8", "#ff7a1a", "#ffd23f"] },
  { nombre: "Huasteca", c: ["#04262c", "#0f7c6c", "#3fc1a5", "#c6f68d"] },
  { nombre: "Real de Catorce", c: ["#2e1608", "#b5541c", "#f29e4c", "#ffe1a8"] },
  { nombre: "Media Luna", c: ["#021d33", "#0077b6", "#00b4d8", "#90e0ef"] },
  { nombre: "Tangamanga", c: ["#0b1340", "#2d3fd6", "#a43fd6", "#48c6ef"] },
];

/** La paleta propia de un evento: siempre la misma para el mismo id. */
export function paletaPropia(id: string): Paleta {
  let h = 7;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETAS_PROPIAS[h % PALETAS_PROPIAS.length].c;
}

type Rgb = [number, number, number];
const hex = ([r, g, b]: Rgb) => `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
/** Más saturado y un poco más oscuro: una luz que se ve sobre el fondo. */
const vivo = ([r, g, b]: Rgb): Rgb => {
  const m = (r + g + b) / 3;
  return [r, g, b].map((v) => (m + (v - m) * 1.35) * 0.92) as Rgb;
};
const croma = ([r, g, b]: Rgb) => Math.max(r, g, b) - Math.min(r, g, b);

/**
 * La paleta de unos píxeles RGBA (los de un cartel reducido): se juntan por tono en 12 cubos (más uno de grises: poca saturación o muy oscuros)
 * y ganan los que pesan más, contando más los vivos. El fondo es el más abundante oscurecido al 22 %; las luces, los tres primeros, del más vivo
 * al menos. Los píxeles transparentes no cuentan. Sin ningún píxel, null.
 */
export function paletaDePixeles(datos: ArrayLike<number>): Paleta | null {
  const cubos = new Map<string | number, { n: number; r: number; g: number; b: number; peso: number }>();
  for (let i = 0; i + 3 < datos.length; i += 4) {
    if (datos[i + 3] < 128) continue;
    const r = datos[i], g = datos[i + 1], b = datos[i + 2];
    const max = Math.max(r, g, b), mn = Math.min(r, g, b);
    const sat = max ? (max - mn) / max : 0;
    let h = 0;
    if (max !== mn) {
      h = max === r ? (g - b) / (max - mn) : max === g ? 2 + (b - r) / (max - mn) : 4 + (r - g) / (max - mn);
      h = (h * 60 + 360) % 360;
    }
    const k = sat < 0.2 || max < 40 ? "gris" : Math.round(h / 30) % 12;
    const cubo = cubos.get(k) ?? { n: 0, r: 0, g: 0, b: 0, peso: 0 };
    cubo.n++;
    cubo.r += r;
    cubo.g += g;
    cubo.b += b;
    cubo.peso += k === "gris" ? 0.3 : 0.6 + sat;
    cubos.set(k, cubo);
  }
  if (!cubos.size) return null;
  const orden: Rgb[] = [...cubos.values()].sort((p, q) => q.peso - p.peso).map((q) => [q.r / q.n, q.g / q.n, q.b / q.n]);
  while (orden.length < 3) orden.push(orden[0]);
  const tres = orden.slice(0, 3).sort((p, q) => croma(q) - croma(p));
  return [hex(orden[0].map((v) => v * 0.22) as Rgb), ...tres.map((q) => hex(vivo(q)))] as unknown as Paleta;
}

/** `#rrggbb` con transparencia, para los degradados del lienzo. */
export function conAlfa(color: string, alfa: number): string {
  const n = parseInt(color.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alfa})`;
}

/**
 * Los colores de un cartel ya cargado (en el navegador). La imagen debe ser del mismo origen (la de `next/image`, `/_next/image`) o traer CORS
 * (`crossOrigin`): si el lienzo queda «manchado», null y la historia se queda con su paleta propia.
 */
export function coloresDeImagen(img: HTMLImageElement): Paleta | null {
  try {
    const lienzo = document.createElement("canvas");
    lienzo.width = 16;
    lienzo.height = 20;
    const ctx = lienzo.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, 16, 20);
    return paletaDePixeles(ctx.getImageData(0, 0, 16, 20).data);
  } catch {
    return null;
  }
}

/** El degradado quieto de una paleta (el círculo de un evento sin cartel): tres luces sobre el fondo. */
export const degradadoCSS = (c: Paleta): string =>
  `radial-gradient(110% 70% at 15% 12%, ${c[1]} 0%, ${conAlfa(c[1], 0)} 62%), radial-gradient(90% 70% at 92% 40%, ${c[2]} 0%, ${conAlfa(c[2], 0)} 66%), radial-gradient(120% 80% at 40% 105%, ${c[3]} 0%, ${conAlfa(c[3], 0)} 64%), ${c[0]}`;

/** Si un valor (de la base o de un formulario) es una paleta: cuatro colores `#rrggbb`. Lo demás, null. */
export function comoPaleta(valor: unknown): Paleta | null {
  if (typeof valor === "string") {
    try {
      return comoPaleta(JSON.parse(valor));
    } catch {
      return null;
    }
  }
  return Array.isArray(valor) && valor.length === 4 && valor.every((c) => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c)) ? (valor.map((c: string) => c.toLowerCase()) as unknown as Paleta) : null;
}

/** Luminancia relativa (WCAG) de un `#rrggbb`. */
export function luminancia(color: string): number {
  const n = parseInt(color.slice(1), 16);
  const lin = (v: number) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

/**
 * Un color oscurecido lo justo para que un texto blanco se lea encima (OL-360, bitácora 388, «Fondo legible»): luminancia ≤ 0,12, contraste
 * de 6:1 o más. Un color ya oscuro se queda como está. Como el prototipo, escala con (0,12/L)^(1/2,2); si el redondeo lo deja un pelo arriba,
 * se baja un poco más hasta que cumpla.
 */
export function legible(color: string): string {
  const n = parseInt(color.slice(1), 16);
  const rgb: Rgb = [n >> 16, (n >> 8) & 255, n & 255];
  let f = 1;
  for (let L = luminancia(color); L > 0.12; L = luminancia(hex(rgb.map((v) => v * f) as Rgb))) f *= L > 0.13 ? (0.12 / L) ** (1 / 2.2) : 0.98;
  return hex(rgb.map((v) => v * f) as Rgb);
}

/**
 * El fondo de la franja de título de una tarjeta (OL-360, el de `degradadoTarjeta` del prototipo): el color más vivo del cartel (`c[1]`) hecho
 * legible, con dos luces abajo y a la derecha para que la esquina del título quede oscura.
 */
export const degradadoTarjeta = (c: Paleta): string =>
  `radial-gradient(90% 60% at 100% 35%, ${conAlfa(c[2], 0.9)} 0%, ${conAlfa(c[2], 0)} 70%), radial-gradient(110% 70% at 0% 110%, ${conAlfa(c[3], 0.85)} 0%, ${conAlfa(c[3], 0)} 68%), ${legible(c[1])}`;

/**
 * Los colores de un archivo de imagen recién elegido (el cartel al subirlo, OL-360), en el navegador: se dibuja reducido a 16×20 y pasa por
 * `paletaDePixeles`. Nunca lanza: si el teléfono no puede leerla, null (la tarjeta usa su paleta propia hasta que el relleno la calcule).
 */
export async function coloresDeArchivo(archivo: Blob): Promise<Paleta | null> {
  try {
    const mapa = await createImageBitmap(archivo);
    const lienzo = document.createElement("canvas");
    lienzo.width = 16;
    lienzo.height = 20;
    const ctx = lienzo.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(mapa, 0, 0, 16, 20);
    mapa.close();
    return paletaDePixeles(ctx.getImageData(0, 0, 16, 20).data);
  } catch {
    return null;
  }
}
