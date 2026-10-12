import type { Paleta } from "./coloresCartel";
import { CLASES, type Clase } from "./eventos";

/**
 * Las portadas del sistema (OL-375): lo que firmó el founder el 2026-10-11 en el prototipo `docs/rediseno/prototipos/portadas-sistema.html`
 * («Firmada»: P1 · P2 B · P3 cartel · P4 sobre · P5 todo · P7 · P8; bitácora 405). Festival, exposición y taller llevan en Inicio una portada
 * hecha por la app en vez del cartel: un color plano que sale de su cartel, un patrón de figuras que dice la clase (círculos el festival,
 * cuadrados la exposición, triángulos el taller, a la lawsofux) y, abajo, la zona del título sin figuras detrás. El evento común sin imagen entra
 * al mismo sistema sin figura, con el símbolo SN (P7). Aquí lo que se puede probar sin navegador: el color (`paleta`, `tieneTono`, el
 * respaldo), la composición de cada clase (`hash`, `colocar`, `reticula` y el juego B) y la regla de las vecinas. El código es el del prototipo
 * (el módulo `Portadas` y `respaldoDe`, `origenDe`, `composicionDe` y `dibujarPortada` de su página), sin cambiar una cuenta: con las mismas
 * entradas da los mismos colores y el mismo dibujo, letra por letra (`portadasSistema.test.ts` lo compara con el prototipo). Una sola excepción:
 * la Retícula de la exposición, donde el prototipo podía dejar su cuadro grande debajo de la línea del título o encima del sello (ver ahí); solo
 * cambian esos casos. Lo pinta `components/inicio/PortadaSistema`.
 *
 * La portada mide 100 de ancho por 125 de alto (4:5). Las figuras viven arriba, en el campo (de 0 a H); debajo de H va la zona del título, sin
 * figuras (un recorte lo garantiza). Reglas de la retícula:
 *  · la figura se apoya en la línea H, como un objeto sobre una repisa, y se alinea con el margen del título (M, 12 px de la tarjeta);
 *  · deja libre la esquina del sello de fecha (arriba a la derecha): el área libre tiene forma de L;
 *  · es la más grande que cabe en esa L, con su proporción.
 */

type Rgb = [number, number, number];
const hexRgb = (h: string): Rgb => {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
const rgbHex = (rgb: readonly number[]): string => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
function rgbHsl([r, g, b]: Rgb): Rgb {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    l = (max + min) / 2,
    d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}
function hslRgb([h, s, l]: Rgb): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
const lin = (v: number) => {
  v /= 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lumRgb = ([r, g, b]: Rgb) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
/** Luminancia relativa (WCAG) de un `#rrggbb`. */
export const lum = (hex: string): number => lumRgb(hexRgb(hex));
/** Contraste (WCAG) entre dos colores `#rrggbb`. */
export const contraste = (a: string, b: string): number => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const mezcla = (a: string, b: string, t: number): string => {
  const x = hexRgb(a),
    y = hexRgb(b);
  return rgbHex(x.map((v, i) => v + (y[i] - v) * t));
};

/** El crema de todo el sistema (las tarjetas de lawsofux): la tinta y las figuras de adelante sobre la banda oscura. */
export const CREMA = "#f4efd6";
/** El negro de la app (`--texto`): la tinta y las figuras de adelante sobre la banda clara (el amarillo con negro de la Bauhaus). */
export const NEGRO = "#1a1a1a";
// Las dos bandas de luz de la base. Oscura: luminancia ≤ 0,13 (el título crema queda en 5:1 o más). Clara: ≥ 0,30 (el título negro, en 5,8:1 o
// más). Entre 0,15 y 0,23 ni crema ni negro llegan a 4,5:1: la base nunca se queda ahí.
const OSCURA = 0.13,
  CLARA = 0.3;

/** ¿El color trae un tono que valga, o es gris (cartel en blanco y negro)? Croma de 28 o más, de 255. */
export const tieneTono = (hex: string): boolean => {
  const [r, g, b] = hexRgb(hex);
  return Math.max(r, g, b) - Math.min(r, g, b) >= 28;
};

export type Banda = "oscura" | "clara";
/**
 * La paleta de una portada: la base (el color plano), su banda, la tinta del título y de la ceja (crema u oscuro), y los escalones del mismo
 * color con que se pintan las figuras: `f` la figura de adelante (la tinta), `k` el crema, `c` el claro, `o` el oscuro y `oo` el más oscuro.
 */
export type PaletaPortada = { origen: string; base: string; banda: Banda; tinta: string; f: string; k: string; c: string; o: string; oo: string; n: string };

/** La luz de la base de un color de origen: se queda el tono, la saturación entre 0,32 y 0,7 y la luz en su banda. */
function luzDe(origen: string): { h: number; s: number; l: number; clara: boolean } {
  const [h, s0, l0] = rgbHsl(hexRgb(origen));
  const s = Math.min(0.7, Math.max(0.32, s0));
  const L = (l: number) => lumRgb(hslRgb([h, s, l]));
  const clara = h >= 40 && h <= 80;
  // La luz parte de la del color: entre 0,3 y 0,46 en la banda oscura (más hondo que un neón) y entre 0,4 y 0,58 en la clara.
  let l = clara ? Math.min(0.58, Math.max(0.4, l0)) : Math.min(0.46, Math.max(0.3, l0));
  if (clara) while (L(l) < CLARA && l < 0.95) l += 0.0025;
  else while (L(l) > OSCURA && l > 0.05) l -= 0.0025;
  return { h, s, l, clara };
}
/** La paleta con una base ya decidida: los escalones salen de ella. */
function conBase(origen: string, base: string, clara: boolean): PaletaPortada {
  return {
    origen,
    base,
    banda: clara ? "clara" : "oscura",
    tinta: clara ? NEGRO : CREMA,
    f: clara ? NEGRO : CREMA,
    k: CREMA,
    c: mezcla(base, CREMA, clara ? 0.5 : 0.34),
    o: mezcla(base, "#000000", clara ? 0.22 : 0.28),
    oo: mezcla(base, "#000000", clara ? 0.42 : 0.5),
    n: NEGRO,
  };
}

/**
 * La paleta de una portada a partir de su color de origen. Se queda el tono; la saturación va entre 0,32 y 0,7 (medios tonos, como las tarjetas
 * de lawsofux) y la luz parte de la del color y se lleva a su banda: los amarillos, mostazas y olivos (tono de 40° a 80°) a la clara, con título
 * y figura en negro (el amarillo con negro de los carteles de la Bauhaus); todos los demás a la oscura, con título y figura en crema (como
 * lawsofux). Un amarillo oscurecido se vuelve café verdoso y un azul aclarado, pastel: por eso la banda la dice el tono. Escalones del mismo
 * color: oscuro y más oscuro (como su negro al 20 %), claro (con crema) y el crema.
 */
export function paleta(origen: string): PaletaPortada {
  const { h, s, l, clara } = luzDe(origen);
  return conBase(origen, rgbHex(hslRgb([h, s, l])), clara);
}

/** La paleta de una base ya decidida (la que dejó `paletasDeCarril`, también tras la regla de las vecinas): sus escalones salen de ella. */
export const paletaDeBase = (base: string, banda: Banda): PaletaPortada => conBase(base, base, banda === "clara");

// ===== Vecinas distintas (decisión del 2026-10-11, recomendación del gestor aceptada con «Continúa. Vamos a prod»).

/** Lab (CIE, D65) de un `#rrggbb`: la base de la diferencia de color. */
export function lab(hex: string): Rgb {
  const [r, g, b] = hexRgb(hex).map(lin);
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const x = f((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047);
  const y = f(0.2126729 * r + 0.7151522 * g + 0.072175 * b);
  const z = f((0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** CIEDE2000 entre dos colores Lab (Sharma, Wu y Dalal, 2005): cuánto se distinguen a la vista. */
export function diferenciaLab([L1, a1, b1]: readonly number[], [L2, a2, b2]: readonly number[]): number {
  const rad = Math.PI / 180;
  const C7 = (C: number) => Math.sqrt(C ** 7 / (C ** 7 + 25 ** 7));
  const G = 0.5 * (1 - C7((Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2));
  const a1p = (1 + G) * a1,
    a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1),
    C2p = Math.hypot(a2p, b2);
  const tono = (b: number, a: number) => (b === 0 && a === 0 ? 0 : ((Math.atan2(b, a) / rad) % 360 + 360) % 360);
  const h1p = tono(b1, a1p),
    h2p = tono(b2, a2p);
  const sinTono = C1p * C2p === 0;
  let dh = sinTono ? 0 : h2p - h1p;
  if (dh > 180) dh -= 360;
  else if (dh < -180) dh += 360;
  const dL = L2 - L1,
    dC = C2p - C1p,
    dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh / 2) * rad);
  const Lm = (L1 + L2) / 2,
    Cm = (C1p + C2p) / 2;
  const hm = sinTono ? h1p + h2p : Math.abs(h1p - h2p) <= 180 ? (h1p + h2p) / 2 : h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
  const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
  const SL = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2),
    SC = 1 + 0.045 * Cm,
    SH = 1 + 0.015 * Cm * T;
  const RT = -Math.sin(2 * 30 * Math.exp(-(((hm - 275) / 25) ** 2)) * rad) * 2 * C7(Cm);
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}
/** CIEDE2000 entre dos `#rrggbb`. */
export const diferencia = (a: string, b: string): number => diferenciaLab(lab(a), lab(b));

/**
 * «Casi del mismo color»: dos bases a menos de 10 de CIEDE2000. Por debajo de 10 la diferencia solo se ve mirando de cerca, una junto a la otra;
 * medido con los colores del prototipo: los cafés del final de «Festivales y expos» quedan a 0, 3,0, 6,1, 7,2 y 9,1 entre sí y la mostaza de «Una
 * vez más» a 6,9 del amarillo de respaldo, mientras que Ciclo Fellini y Cinema, dos rojos que la bitácora 405 ya daba por distintos, quedan a 15,8.
 */
export const CASI_IGUAL = 10;
/** El paso con que se busca el escalón: un punto de luz (HSL). */
const PASO_LUZ = 0.01;

/**
 * La paleta de una portada que va justo después de otra en su carril (`anterior`, la base que quedó en esa). Si las dos salen casi del mismo color
 * (`CASI_IGUAL`), esta cambia un escalón de tono: la luz sube o baja lo justo para quedar a 10 o más, sin dejar de salir de su cartel (el tono y la
 * saturación no cambian) y sin salirse de su banda (la tinta sigue en 5:1 o más). Si en su banda no llega a 10, se queda con lo más lejos que
 * cabe. Sin anterior, o si ya se distinguen, la de siempre (`paleta`). Por eso un evento puede verse un poco distinto en otro carril.
 */
export function paletaJuntoA(origen: string, anterior: string | null): PaletaPortada {
  const propia = paleta(origen);
  if (!anterior) return propia;
  let mejor = { base: propia.base, d: diferencia(propia.base, anterior) };
  if (mejor.d >= CASI_IGUAL) return propia;
  const { h, s, l, clara } = luzDe(origen);
  const enSuBanda = (hex: string) => (clara ? lum(hex) >= CLARA : lum(hex) <= OSCURA);
  for (let paso = 1; mejor.d < CASI_IGUAL && paso * PASO_LUZ < 0.9; paso++) {
    for (const luz of [l - paso * PASO_LUZ, l + paso * PASO_LUZ]) {
      if (luz <= 0.05 || luz >= 0.95) continue;
      const base = rgbHex(hslRgb([h, s, luz]));
      const d = diferencia(base, anterior);
      if (enSuBanda(base) && d > mejor.d) mejor = { base, d };
    }
  }
  return conBase(origen, mejor.base, clara);
}

// ===== El color de origen (P3 «Cartel»).

/**
 * El respaldo, para un cartel gris, sin cartel o con la foto del lugar: las luces de las paletas propias de la app (`PALETAS_PROPIAS`, las de la
 * historia y de la tarjeta sin cartel de antes) sin repetir tono, nueve en vez de seis paletas (cada paleta trae dos luces casi iguales: Media
 * Luna, dos cianes). Lo elige el id.
 */
export const RESPALDO: readonly (readonly [nombre: string, color: string])[] = [
  ["Cantera", "#ff6f61"],
  ["Real de Catorce", "#b5541c"],
  ["Xantolo", "#ffd23f"],
  ["Huasteca", "#c6f68d"],
  ["Huasteca", "#0f7c6c"],
  ["Media Luna", "#0077b6"],
  ["Tangamanga", "#2d3fd6"],
  ["Xantolo", "#6d34c8"],
  ["Cantera", "#b0306a"],
];

/**
 * Un número estable por id (FNV-1a): la misma composición siempre para el mismo evento. Es otro que el de `paletaPropia` (h × 31 + c): con el
 * mismo, el color de respaldo y el arreglo irían de la mano y dos vecinas podrían salir idénticas.
 */
export const hash = (id: string): number => {
  let h = 0x811c9dc5;
  for (const ch of String(id)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
};

/** El color de respaldo de un evento: siempre el mismo para el mismo id. */
export const respaldoDe = (id: string): string => RESPALDO[hash(`${id}·respaldo`) % RESPALDO.length][1];

/**
 * El color de origen de una portada: el más vivo de su cartel (`colores[1]`, el que guarda la app al subirlo; el de un festival sin cartel propio
 * es el del cartel de su próximo acto, que es el que enseña). Un cartel gris (sin tono), sin cartel o con la foto de su lugar: su respaldo.
 */
export function origenDe(colores: Paleta | null | undefined, id: string): string {
  return colores && tieneTono(colores[1]) ? colores[1] : respaldoDe(id);
}

// ===== La composición (P2 B, a la lawsofux).

/** El campo de una portada, en unidades de 100: la línea del título (`H`), el margen (`M`), lo que no se pisa arriba y la esquina del sello. */
export type Campo = { H: number; M: number; P: PaletaPortada; s: number; arriba: number; selloIzq: number; selloAbajo: number; tope?: number };
/** Las dos capas de una figura, atrás y adelante (con el giro, P8, se mueven distinto): SVG ya con su color. */
export type Capas = [atras: string[], delante: string[]];
export type Composicion = { nombre: "Anidados" | "Retícula" | "Ritmo"; caja: number; idea: string; f: (c: Campo) => Capas };

const r2 = (n: number) => Math.round(n * 100) / 100;
const pts = (l: readonly (readonly [number, number])[]) => l.map(([x, y]) => `${r2(x)},${r2(y)}`).join(" ");
const circ = (cx: number, cy: number, r: number, fill: string) => `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="${fill}"/>`;
const rect = (x: number, y: number, w: number, h: number, fill: string) => `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" fill="${fill}"/>`;
const poli = (l: readonly (readonly [number, number])[], fill: string) => `<polygon points="${pts(l)}" fill="${fill}"/>`;
/** Triángulo con la base en y (de x a x + w) y la punta arriba. */
const tri = (x: number, y: number, w: number, a: number, fill: string) =>
  poli(
    [
      [x, y],
      [x + w, y],
      [x + w / 2, y - a],
    ],
    fill,
  );

/**
 * Dónde va la caja de una composición (proporción ancho:alto = r:1). Dos maneras de caber en la L libre: a todo lo ancho por debajo del sello, o
 * a la izquierda del sello con todo el alto. Gana la que da la figura más grande; la caja se apoya en H, en el margen M.
 */
export function colocar(r: number, c: Campo): { x: number; y: number; u: number; w: number } {
  const hueco = 3;
  const u1 = Math.min((100 - 2 * c.M) / r, c.H - c.selloAbajo - hueco);
  const u2 = Math.min((c.selloIzq - hueco - c.M) / r, c.H - c.arriba);
  const u = Math.max(4, Math.min(c.tope || 1e9, Math.max(u1, u2)));
  return { x: c.M, y: c.H, u, w: u * r };
}

/** Una retícula que llena la L libre: filas que caben en el alto y columnas que caben a lo ancho (menos las que tapa el sello). */
export function reticula(c: Campo, paso: number, tam: number, maxFilas: number, maxCols: number): { celdas: { i: number; j: number; x: number; y: number; filas: number }[]; filas: number } {
  const filas = Math.max(2, Math.min(maxFilas, Math.floor((c.H - c.arriba + (paso - tam)) / paso)));
  const y0 = c.H - filas * paso + (paso - tam);
  const celdas: { i: number; j: number; x: number; y: number; filas: number }[] = [];
  for (let i = 0; i < filas; i++) {
    const y = y0 + i * paso;
    const limite = y < c.selloAbajo + 2 ? c.selloIzq - 3 : 100 - c.M;
    const cols = Math.min(maxCols, Math.floor((limite - c.M + (paso - tam)) / paso));
    for (let j = 0; j < cols; j++) celdas.push({ i, j, x: c.M + j * paso, y, filas });
  }
  return { celdas, filas };
}

/** Las clases que llevan figura: el evento común sin imagen no (P7: la figura significa clase; el SN, sin imagen). */
export type ClaseConFigura = Exclude<Clase, "puntual">;

/**
 * B · patrones (lawsofux). Tres arreglos que comparten las tres clases: «Anidados» (la figura repetida hacia adentro, en escalones de tono),
 * «Retícula» (muchas iguales y unas cuantas en crema: semejanza; las «partículas» del pedido) y «Ritmo» (una hilera que crece).
 */
export const COMPOSICIONES: Record<ClaseConFigura, readonly Composicion[]> = {
  festival: [
    {
      nombre: "Anidados",
      caja: 1,
      idea: "Círculos que se oscurecen hacia el centro, con un punto crema (la tarjeta de Doherty en lawsofux).",
      f: (c) => {
        const { P } = c,
          { x, y, u } = colocar(1, c),
          R = u / 2,
          cx = x + R,
          cy = y - R;
        return [
          [circ(cx, cy, R, P.c), circ(cx, cy, R * 0.74, P.o)],
          [circ(cx, cy, R * 0.48, P.oo), circ(cx, cy, R * 0.2, P.f)],
        ];
      },
    },
    {
      nombre: "Retícula",
      caja: 0,
      idea: "Una retícula de puntos oscuros y unos cuantos crema en diagonal (semejanza): un programa de muchos actos.",
      f: (c) => {
        const { P, s } = c,
          paso = 11.2,
          r = 3.8,
          { celdas, filas } = reticula(c, paso, 2 * r, 6, 7);
        const d = s % 3,
          atras: string[] = [],
          delante: string[] = [];
        for (const k of celdas) {
          const crema = k.j - (filas - 1 - k.i) === d;
          (crema ? delante : atras).push(circ(k.x + r, k.y + r, r, crema ? P.f : P.o));
        }
        return [atras, delante];
      },
    },
    {
      nombre: "Ritmo",
      caja: 2.5,
      idea: "Una hilera de círculos que crecen sobre la línea; el último, crema.",
      f: (c) => {
        const { P } = c,
          { x, y, u } = colocar(2.5, c),
          tam = [0.28, 0.44, 0.67, 1],
          hueco = 0.04 * u;
        const atras: string[] = [],
          delante: string[] = [];
        let xx = x;
        tam.forEach((k, i) => {
          const r = (u * k) / 2,
            ult = i === tam.length - 1;
          (ult ? delante : atras).push(circ(xx + r, y - r, r, ult ? P.f : i === 2 ? P.c : P.o));
          xx += 2 * r + hueco;
        });
        return [atras, delante];
      },
    },
  ],
  exposicion: [
    {
      nombre: "Anidados",
      caja: 1,
      idea: "Cuatro cuadrados anidados y bajados hacia el pie, en escalones del mismo color (el homenaje al cuadrado de Albers).",
      f: (c) => {
        const { P } = c,
          { x, y, u } = colocar(1, c);
        const l = (
          [
            [1, P.oo],
            [0.76, P.o],
            [0.52, P.c],
            [0.28, P.f],
          ] as const
        ).map(([k, col]) => {
          const t = u * k,
            m = (u - t) / 2;
          return rect(x + m, y - u + m * 1.5, t, t, col);
        });
        return [l.slice(0, 2), l.slice(2)];
      },
    },
    {
      nombre: "Retícula",
      caja: 0,
      idea: "Una pared de cuadros oscuros y uno grande en crema (semejanza): la obra que se mira.",
      f: (c) => {
        const { P, s } = c,
          paso = 12,
          lado = 9.2,
          { celdas, filas } = reticula(c, paso, lado, 5, 6);
        const abajo = celdas.filter((k) => k.i >= filas - 2);
        const cols = Math.max(2, ...abajo.map((k) => k.j + 1));
        // El cuadro grande ocupa dos filas y dos columnas. El prototipo saca su fila con `>>`, que tiene signo: con la mitad de los ids (hash de 2³¹ o
        // más) puede dar la última fila, y entonces el cuadro queda debajo de la línea del título, cortado a la mitad (y con el giro, dentro de la
        // zona); y su columna sale de las columnas de abajo, así que en una fila junto al sello podía quedar encima de él. Aquí esa fila sube una
        // y, si el cuadro queda encima del sello, se corre a la izquierda. Lo demás, como el prototipo (también su respaldo, `celdas[0]`, si su fila
        // o su celda no existen): donde cumplía sus reglas, el dibujo es el mismo (bitácora 406).
        const fila = filas - 2 - ((s >> 3) % Math.max(1, filas - 2));
        const gi = fila === filas - 1 ? filas - 2 : fila;
        let gj = s % (cols - 1);
        const bajoElSello = (j: number) => celdas.some((k) => k.i === gi && k.j === j && k.x + paso + lado > c.selloIzq && k.y < c.selloAbajo);
        while (gj > 0 && bajoElSello(gj)) gj--;
        const dentro = (k: { i: number; j: number }) => k.i >= gi && k.i <= gi + 1 && k.j >= gj && k.j <= gj + 1;
        const atras = celdas.filter((k) => !dentro(k)).map((k) => rect(k.x, k.y, lado, lado, P.o));
        const k0 = celdas.find((k) => k.i === gi && k.j === gj) || celdas[0];
        return [atras, [rect(k0.x, k0.y, paso + lado, paso + lado, P.f)]];
      },
    },
    {
      nombre: "Ritmo",
      caja: 2.5,
      idea: "Una hilera de cuadrados que crecen sobre la línea, como cuadros colgados; el último, crema.",
      f: (c) => {
        const { P } = c,
          { x, y, u } = colocar(2.5, c),
          tam = [0.28, 0.44, 0.67, 1],
          hueco = 0.06 * u;
        const atras: string[] = [],
          delante: string[] = [];
        let xx = x;
        tam.forEach((k, i) => {
          const l = u * k,
            ult = i === tam.length - 1;
          (ult ? delante : atras).push(rect(xx, y - l, l, l, ult ? P.f : i === 2 ? P.c : P.o));
          xx += l + hueco;
        });
        return [atras, delante];
      },
    },
  ],
  taller: [
    {
      nombre: "Anidados",
      caja: 1.155,
      idea: "Triángulos anidados y bajados hacia la base, en escalones del mismo color.",
      f: (c) => {
        const { P } = c,
          { x, y, u } = colocar(1.155, c),
          w = 1.155 * u;
        const l = (
          [
            [1, P.oo],
            [0.74, P.o],
            [0.5, P.c],
            [0.26, P.f],
          ] as const
        ).map(([k, col]) => {
          const a = u * k,
            ww = w * k;
          return tri(x + (w - ww) / 2, y - (u - a) * 0.18, ww, a, col);
        });
        return [l.slice(0, 2), l.slice(2)];
      },
    },
    {
      nombre: "Retícula",
      caja: 0,
      idea: "Una retícula de triángulos oscuros y unos cuantos crema en diagonal (semejanza).",
      f: (c) => {
        const { P, s } = c,
          paso = 12,
          w = 9.6,
          a = 8.4,
          { celdas, filas } = reticula(c, paso, a, 6, 7);
        const d = s % 3,
          atras: string[] = [],
          delante: string[] = [];
        for (const k of celdas) {
          const crema = k.j - (filas - 1 - k.i) === d;
          (crema ? delante : atras).push(tri(k.x, k.y + a, w, a, crema ? P.f : P.o));
        }
        return [atras, delante];
      },
    },
    {
      nombre: "Ritmo",
      caja: 4,
      idea: "Una tira de triángulos que se alternan, arriba y abajo (teselado); uno crema.",
      f: (c) => {
        const { P, s } = c,
          { x, y, u } = colocar(4, c),
          n = 7,
          w = u,
          a = u * 0.92;
        const atras: string[] = [],
          delante: string[] = [];
        const elegido = 2 * (s % 4);
        for (let i = 0; i < n; i++) {
          const xx = x + (i * w) / 2,
            arriba = i % 2 === 0;
          const l: [number, number][] = arriba
            ? [
                [xx, y],
                [xx + w, y],
                [xx + w / 2, y - a],
              ]
            : [
                [xx, y - a],
                [xx + w, y - a],
                [xx + w / 2, y],
              ];
          const col = i === elegido ? P.f : arriba ? P.o : P.c;
          (i === elegido ? delante : atras).push(poli(l, col));
        }
        return [atras, delante];
      },
    },
  ],
};

/** La composición de un evento: el arreglo de su clase que toca a su id, siempre el mismo (`s`, su número, también lo usan la retícula y el ritmo). */
export function composicionDe(clase: ClaseConFigura, id: string): Composicion & { s: number } {
  const lista = COMPOSICIONES[clase];
  const s = hash(id);
  return { ...lista[s % lista.length], s };
}

/** Lo que el giro (P8) puede correr la capa de adelante, en unidades de la portada (6,6 px en la tarjeta grande, 5,3 en la mediana); la de atrás, la mitad. */
export const MAX_UNIDADES = 4;

/** Las medidas de una portada ya colocada, en unidades de 100: dónde empieza la zona del título y dónde queda el sello. */
export type MedidasPortada = { H: number; M: number; selloIzq: number; selloAbajo: number };

/**
 * El dibujo de una portada (lo de adentro de su `<svg viewBox="0 0 100 125">`), como `dibujarPortada` del prototipo: la base, el recorte en la
 * línea del título y las dos capas (`data-capa`, las que mueve el giro). Con el giro encendido el recorte baja `MAX_UNIDADES` dentro del relleno
 * de arriba de la zona (12 y 8 px): al inclinar, la base de las figuras no se corta y nada llega al texto (comentario 3 del founder: «se pueden
 * cortar las figuras en la base»). En reposo nada se dibuja debajo de H. `clip` nombra el recorte: único en la página.
 */
export function dibujoDePortada({ clase, id, P, medidas, giro, clip }: { clase: ClaseConFigura; id: string; P: PaletaPortada; medidas: MedidasPortada; giro: boolean; clip: string }): string {
  const { H, M, selloIzq, selloAbajo } = medidas;
  const corte = H + (giro ? MAX_UNIDADES : 0);
  const comp = composicionDe(clase, id);
  const [atras, delante] = comp.f({ H, M, P, s: comp.s, arriba: M * 0.8, selloIzq, selloAbajo });
  return `<rect width="100" height="125" fill="${P.base}"/><clipPath id="${clip}"><rect width="100" height="${corte.toFixed(2)}"/></clipPath><g clip-path="url(#${clip})"><g data-capa="1">${atras.join("")}</g><g data-capa="2">${delante.join("")}</g></g>`;
}

// ===== Qué tarjetas la llevan y su color en un carril.

const CON_FIGURA: ReadonlyMap<string, ClaseConFigura> = new Map(CLASES.filter((c): c is (typeof CLASES)[number] & { clase: ClaseConFigura } => c.clase !== "puntual").map((c) => [c.corto, c.clase]));

/**
 * La clase con figura de una tarjeta, por la palabra de su clase («Festival», «Exposición», «Taller»: `cortoDeClase`, que es lo que lleva
 * `Tarjeta.clase`); null en un evento (un acto de un festival es un evento) y en la tarjeta que «Tus planes» guardó sin clase.
 */
export const claseConFigura = (clase: string | null | undefined): ClaseConFigura | null => (clase ? (CON_FIGURA.get(clase) ?? null) : null);

/**
 * ¿La tarjeta lleva portada del sistema? Festival, exposición y taller, siempre (P1 en todo Inicio, P5); un evento, solo sin ninguna imagen (P7).
 * Lo demás conserva su cartel o su foto.
 */
export const conPortadaDelSistema = (t: { clase?: string | null; foto: string | null }): boolean => claseConFigura(t.clase) !== null || !t.foto;

/**
 * Las paletas de las tarjetas de un carril, en su orden: la de cada portada del sistema (null en las que llevan cartel o foto) con la regla de las
 * vecinas (`paletaJuntoA`): una portada que va justo después de otra de casi el mismo color cambia un escalón de tono. Solo cuentan las vecinas
 * de verdad: una tarjeta con cartel en medio las separa.
 */
export function paletasDeCarril(tarjetas: readonly { id: string; clase?: string | null; foto: string | null; colores?: Paleta | null }[]): (PaletaPortada | null)[] {
  let anterior: string | null = null;
  return tarjetas.map((t) => {
    if (!conPortadaDelSistema(t)) {
      anterior = null;
      return null;
    }
    // Festival, exposición y taller: el color de su cartel o su respaldo. El evento sin imagen (P7) no trae colores: su respaldo.
    const P = paletaJuntoA(origenDe(t.colores, t.id), anterior);
    anterior = P.base;
    return P;
  });
}
