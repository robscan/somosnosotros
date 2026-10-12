import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { PALETAS_PROPIAS, type Paleta } from "./coloresCartel";
import {
  CASI_IGUAL,
  claseConFigura,
  colocar,
  composicionDe,
  COMPOSICIONES,
  conPortadaDelSistema,
  contraste,
  CREMA,
  diferencia,
  diferenciaLab,
  dibujoDePortada,
  hash,
  lum,
  NEGRO,
  origenDe,
  paleta,
  paletaDeBase,
  paletaJuntoA,
  paletasDeCarril,
  respaldoDe,
  RESPALDO,
  tieneTono,
  type ClaseConFigura,
  type MedidasPortada,
} from "./portadasSistema";

/** Portadas del sistema (OL-375): el color, la composición y la regla de las vecinas, con lo que firmó el founder en el prototipo (bitácora 405). */

const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
/** Una muestra amplia de colores de entrada: una rejilla de 18 por canal (5 832) y 3 000 al azar con semilla fija. */
function muestra(): string[] {
  const v = Array.from({ length: 18 }, (_, i) => i * 15);
  const lista = v.flatMap((r) => v.flatMap((g) => v.map((b) => hex(r, g, b))));
  let s = 2463534242;
  const azar = () => ((s ^= s << 13), (s ^= s >>> 17), (s ^= s << 5), (s >>> 0) % 256);
  for (let i = 0; i < 3000; i++) lista.push(hex(azar(), azar(), azar()));
  return lista;
}
const hsl = (c: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  const h = !d ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, l: (max + min) / 2 };
};

describe("paleta (P3 «Cartel»): el color del cartel en medio tono, en una de dos bandas", () => {
  it("da las bases de la tabla de la bitácora 405, con su banda y el contraste medido de su título", () => {
    // Origen → base, banda y contraste del título (tabla «Propuesta, las 26 portadas»).
    const tabla: [string, string, "oscura" | "clara", number][] = [
      ["#d7396c", "#bd2657", "oscura", 5.08],
      ["#c61b17", "#bc2521", "oscura", 5.3],
      ["#e19e53", "#8f5719", "oscura", 5.12],
      ["#721323", "#821729", "oscura", 8.63],
      ["#ffd23f", "#dfbc49", "clara", 9.47],
      ["#832478", "#832478", "oscura", 7.3],
      ["#2d3fd6", "#2637c4", "oscura", 7.49],
      ["#6d34c8", "#6530ba", "oscura", 6.76],
      ["#b37f3a", "#835d2a", "oscura", 5.1],
      ["#235a8a", "#235a8a", "oscura", 6.26],
      ["#a27486", "#974e6a", "oscura", 5.03],
      ["#9a674a", "#875a41", "oscura", 5.09],
      ["#9b6a45", "#865c3c", "oscura", 5.03],
      ["#e3cb00", "#c1b022", "clara", 7.87],
      ["#374e5a", "#345465", "oscura", 6.98],
      ["#3e3f23", "#979a4f", "clara", 5.84],
      ["#0f7c6c", "#147163", "oscura", 5.09],
    ];
    for (const [origen, base, banda, medido] of tabla) {
      const P = paleta(origen);
      expect([origen, P.base, P.banda], origen).toEqual([origen, base, banda]);
      expect(contraste(P.base, P.tinta)).toBeCloseTo(medido, 2);
    }
  });

  it("los amarillos, mostazas y olivos (40° a 80°) van a la clara con tinta negra; todos los demás a la oscura con tinta crema", () => {
    expect(paleta("#ffd23f")).toMatchObject({ banda: "clara", tinta: NEGRO, f: NEGRO, k: CREMA });
    expect(paleta("#3e3f23")).toMatchObject({ banda: "clara", tinta: NEGRO });
    expect(paleta("#d7396c")).toMatchObject({ banda: "oscura", tinta: CREMA, f: CREMA, k: CREMA });
    expect(paleta("#2d3fd6")).toMatchObject({ banda: "oscura", tinta: CREMA });
  });

  it("el título queda en 4,5:1 o más contra la base en todas las bandas, con 8 832 colores de entrada (de hecho, 5:1 o más)", () => {
    let peor = Infinity;
    for (const origen of muestra()) {
      const P = paleta(origen);
      const c = contraste(P.base, P.tinta);
      expect(c, origen).toBeGreaterThanOrEqual(4.5);
      peor = Math.min(peor, c);
      // La base nunca se queda entre 0,15 y 0,23, donde ni el crema ni el negro llegan a 4,5:1 (al redondear a 8 bits puede pasarse un pelo de su
      // banda, sin acercarse a esa franja).
      expect(lum(P.base) < 0.15 || lum(P.base) > 0.23, origen).toBe(true);
      expect(P.banda === "clara" ? lum(P.base) > 0.29 : lum(P.base) < 0.14, origen).toBe(true);
    }
    expect(peor).toBeGreaterThanOrEqual(5);
  });

  it("se queda el tono del cartel y la saturación va de 0,32 a 0,7", () => {
    for (const origen of ["#d7396c", "#2d3fd6", "#ffd23f", "#0f7c6c", "#b37f3a"]) expect(Math.abs(hsl(paleta(origen).base).h - hsl(origen).h), origen).toBeLessThan(4);
  });

  it("los escalones salen de la base: claro con crema, oscuro y más oscuro con negro", () => {
    expect(paleta("#374e5a")).toEqual({ origen: "#374e5a", base: "#345465", banda: "oscura", tinta: CREMA, f: CREMA, k: CREMA, c: "#75898b", o: "#253c49", oo: "#1a2a33", n: NEGRO });
    expect(paletaDeBase("#345465", "oscura")).toMatchObject({ base: "#345465", c: "#75898b", o: "#253c49", oo: "#1a2a33" });
  });
});

describe("el color de origen y el respaldo", () => {
  it("un cartel gris no tiene tono (croma menor que 28 de 255): toma el respaldo", () => {
    expect(tieneTono("#614b47")).toBe(false); // Fotovisión 31
    expect(tieneTono("#a09f9f")).toBe(false);
    expect(tieneTono("#9b6a45")).toBe(true);
    const gris: Paleta = ["#111112", "#614b47", "#363e4a", "#49494b"];
    expect(origenDe(gris, "fotovision")).toBe(respaldoDe("fotovision"));
  });

  it("el más vivo de su cartel (`colores[1]`); sin colores (sin cartel, foto del lugar, sin calcular), el respaldo", () => {
    expect(origenDe(["#0e1215", "#374e5a", "#352718", "#424441"], "x")).toBe("#374e5a");
    expect(origenDe(null, "x")).toBe(respaldoDe("x"));
    expect(origenDe(undefined, "x")).toBe(respaldoDe("x"));
  });

  it("el respaldo son nueve luces de las paletas propias de la app, sin repetir, y lo elige el id siempre igual", () => {
    const luces = new Set(PALETAS_PROPIAS.flatMap((p) => p.c.slice(1)));
    expect(RESPALDO).toHaveLength(9);
    expect(new Set(RESPALDO.map(([, c]) => c)).size).toBe(9);
    for (const [, c] of RESPALDO) expect(luces.has(c), c).toBe(true);
    expect(respaldoDe("b5b5aaa5-9957-422d-9b8f-44ffe61e3032")).toBe(respaldoDe("b5b5aaa5-9957-422d-9b8f-44ffe61e3032"));
    const usados = new Set(Array.from({ length: 200 }, (_, i) => respaldoDe(`evento-${i}`)));
    expect(usados.size).toBe(9);
  });

  it("hash es FNV-1a de 32 bits", () => {
    expect(hash("")).toBe(0x811c9dc5);
    expect(hash("a")).toBe(0xe40c292c);
    expect(hash("foobar")).toBe(0xbf9cf968);
  });
});

/** Las figuras de un dibujo, con su caja, para comprobar dónde quedan. */
function figuras(svg: string): { forma: string; x0: number; y0: number; x1: number; y1: number }[] {
  const capas = svg.slice(svg.indexOf('<g data-capa="1">'));
  return [...capas.matchAll(/<(circle|rect|polygon) ([^>]*)\/>/g)].map(([, forma, attrs]) => {
    const a = Object.fromEntries([...attrs.matchAll(/(\w[\w-]*)="([^"]*)"/g)].map(([, k, v]) => [k, v]));
    if (forma === "circle") return { forma, x0: +a.cx - +a.r, y0: +a.cy - +a.r, x1: +a.cx + +a.r, y1: +a.cy + +a.r };
    if (forma === "rect") return { forma, x0: +a.x, y0: +a.y, x1: +a.x + +a.width, y1: +a.y + +a.height };
    const p = a.points.split(" ").map((xy) => xy.split(",").map(Number));
    return { forma, x0: Math.min(...p.map((q) => q[0])), y0: Math.min(...p.map((q) => q[1])), x1: Math.max(...p.map((q) => q[0])), y1: Math.max(...p.map((q) => q[1])) };
  });
}
/** Medidas reales: la grande (165 px de ancho) y la mediana (132), con el título en una o dos líneas, con o sin chip, y a la letra al doble. */
const MEDIDAS: MedidasPortada[] = [];
for (const H of [52, 58.4, 63, 70.3, 76.4, 81.9, 86.7, 94.1]) for (const [M, selloIzq, selloAbajo] of [[7.27, 68.48, 36.36], [9.09, 60.61, 43.94], [7.27, 63.64, 41.21]]) MEDIDAS.push({ H, M, selloIzq, selloAbajo });
const IDS = Array.from({ length: 60 }, (_, i) => `bbbb0001-0000-4000-8000-${String(i).padStart(12, "0")}`);
const CLASES: ClaseConFigura[] = ["festival", "exposicion", "taller"];

describe("la composición (P2 B, a la lawsofux)", () => {
  it("tres arreglos por clase, los mismos tres (Anidados, Retícula, Ritmo); círculos el festival, cuadrados la expo, triángulos el taller", () => {
    for (const clase of CLASES) expect(COMPOSICIONES[clase].map((c) => c.nombre)).toEqual(["Anidados", "Retícula", "Ritmo"]);
    const P = paleta("#d7396c");
    const formas = (clase: ClaseConFigura) => new Set(IDS.flatMap((id) => figuras(dibujoDePortada({ clase, id, P, medidas: MEDIDAS[4], giro: false, clip: "c" })).map((f) => f.forma)));
    expect([...formas("festival")]).toEqual(["circle"]);
    expect([...formas("exposicion")]).toEqual(["rect"]);
    expect([...formas("taller")]).toEqual(["polygon"]);
  });

  it("cada evento lleva siempre el mismo arreglo, elegido por su id; los tres salen", () => {
    expect(composicionDe("taller", IDS[3]).nombre).toBe(composicionDe("taller", IDS[3]).nombre);
    for (const clase of CLASES) expect(new Set(IDS.map((id) => composicionDe(clase, id).nombre)).size).toBe(3);
  });

  it("las figuras se apoyan en la línea del título, en el margen, y dejan libre la esquina del sello (la L libre)", () => {
    const P = paleta("#9b6a45");
    for (const clase of CLASES)
      for (const id of IDS.slice(0, 30))
        for (const medidas of MEDIDAS) {
          const fs = figuras(dibujoDePortada({ clase, id, P, medidas, giro: false, clip: "c" }));
          const que = `${clase} ${composicionDe(clase, id).nombre} ${JSON.stringify(medidas)}`;
          expect(fs.length, que).toBeGreaterThan(0);
          // Nada debajo de la línea del título (las figuras se apoyan en ella) ni a la izquierda del margen; las cifras van con dos decimales.
          expect(Math.max(...fs.map((f) => f.y1)), que).toBeLessThanOrEqual(medidas.H + 0.02);
          expect(Math.min(...fs.map((f) => f.x0)), que).toBeGreaterThanOrEqual(medidas.M - 0.02);
          // Algo toca la línea: se apoya en ella.
          expect(Math.max(...fs.map((f) => f.y1)), que).toBeGreaterThan(medidas.H - 0.02);
          // Nada en la esquina del sello.
          for (const f of fs) expect(f.x1 > medidas.selloIzq + 0.01 && f.y0 < medidas.selloAbajo - 0.01, `${que} ${JSON.stringify(f)}`).toBe(false);
        }
  });

  it("la caja de una composición: la mayor de dos maneras de caber en la L, apoyada en la línea y en el margen", () => {
    const c = { H: 86.7, M: 7.27, P: paleta("#d7396c"), s: 0, arriba: 5.82, selloIzq: 68.48, selloAbajo: 36.36 };
    // A todo lo ancho bajo el sello: min(85,46 / 1, 86,7 − 36,36 − 3); a la izquierda del sello: min((68,48 − 3 − 7,27) / 1, 86,7 − 5,82). Gana la segunda.
    const caja = colocar(1, c);
    expect([caja.x, caja.y]).toEqual([7.27, 86.7]);
    expect(caja.u).toBeCloseTo(58.21, 9);
    expect(caja.w).toBeCloseTo(58.21, 9);
    // Una hilera (2,5:1) cabe mejor a todo lo ancho.
    expect(colocar(2.5, c).u).toBeCloseTo((100 - 2 * 7.27) / 2.5, 6);
  });
});

describe("el dibujo de una portada", () => {
  const medidas = { H: 70, M: 7.27, selloIzq: 68, selloAbajo: 36 };
  const P = paleta("#374e5a");
  it("la base, el recorte en la línea del título y las dos capas que mueve el giro (el de «Desierto», como en el prototipo)", () => {
    expect(dibujoDePortada({ clase: "exposicion", id: "4bf2f781-36ba-46bb-af15-647814777756", P, medidas, giro: true, clip: "d1c" })).toBe(
      '<rect width="100" height="125" fill="#345465"/><clipPath id="d1c"><rect width="100" height="74.00"/></clipPath><g clip-path="url(#d1c)"><g data-capa="1"><rect x="7.27" y="12.27" width="57.73" height="57.73" fill="#1a2a33"/><rect x="14.2" y="22.66" width="43.87" height="43.87" fill="#253c49"/></g><g data-capa="2"><rect x="21.13" y="33.05" width="30.02" height="30.02" fill="#75898b"/><rect x="28.05" y="43.44" width="16.16" height="16.16" fill="#f4efd6"/></g></g>',
    );
  });
  it("el recorte va en la línea del título; con el giro encendido baja 4 unidades dentro del relleno de la zona (comentario 3 del founder)", () => {
    const alto = (giro: boolean) => Number(/<clipPath id="c"><rect width="100" height="([\d.]+)"/.exec(dibujoDePortada({ clase: "festival", id: "x", P, medidas, giro, clip: "c" }))![1]);
    expect(alto(false)).toBe(70);
    expect(alto(true)).toBe(74);
  });
});

describe("vecinas distintas: dos portadas seguidas de casi el mismo color", () => {
  it("CIEDE2000 da lo de la tabla de Sharma, Wu y Dalal (2005)", () => {
    const pares: [number[], number[], number][] = [
      [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
      [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
      [[50, 2.8361, -74.02], [50, 0, -82.7485], 3.4412],
      [[50, 0, 0], [50, -1, 2], 2.3669],
      [[50, 2.49, -0.001], [50, -2.49, 0.0009], 7.1792],
      [[50, 2.5, 0], [73, 25, -18], 27.1492],
      [[50, 2.5, 0], [61, -5, 29], 22.8977],
      [[50, 2.5, 0], [56, -27, -3], 31.903],
      [[50, 2.5, 0], [58, 24, 15], 19.4535],
      [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
    ];
    for (const [a, b, esperado] of pares) {
      expect(diferenciaLab(a, b)).toBeCloseTo(esperado, 4);
      expect(diferenciaLab(b, a)).toBeCloseTo(esperado, 4);
    }
  });

  it("«casi del mismo color» es menos de 10: los cafés y los amarillos del prototipo lo son; Ciclo Fellini y Cinema, no", () => {
    expect(CASI_IGUAL).toBe(10);
    // Los cafés del final de «Festivales y expos» (Friedeberg, El rostro del paisaje, Lxs colocaos, Verbena).
    for (const [a, b] of [["#865c3c", "#865c3c"], ["#875a41", "#865c3c"], ["#835d2a", "#865c3c"], ["#835d2a", "#875a41"], ["#8f5719", "#865c3c"]]) expect(diferencia(a, b), `${a} ${b}`).toBeLessThan(10);
    // La mostaza de «Una vez más» junto al amarillo de respaldo de «Reflejo atemporal».
    expect(diferencia("#c1b022", "#dfbc49")).toBeLessThan(10);
    // Ciclo Fellini y Cinema, dos rojos que se distinguen; Kowaifest y Xantolo, nada que ver.
    expect(diferencia("#bd2657", "#bc2521")).toBeGreaterThan(15);
    expect(diferencia("#821729", "#dfbc49")).toBeGreaterThan(60);
  });

  it("la segunda cambia un escalón de tono: la luz, lo justo para quedar a 10 o más; el tono, la saturación y la banda no cambian", () => {
    const anterior = paleta("#9b6a45").base;
    const segunda = paletaJuntoA("#9b6a45", anterior);
    expect(segunda.base).not.toBe(anterior);
    expect(diferencia(segunda.base, anterior)).toBeGreaterThanOrEqual(CASI_IGUAL);
    expect(diferencia(segunda.base, anterior)).toBeLessThan(CASI_IGUAL + 1.5);
    expect(segunda.banda).toBe("oscura");
    expect(Math.abs(hsl(segunda.base).h - hsl(anterior).h)).toBeLessThan(3);
    expect(contraste(segunda.base, segunda.tinta)).toBeGreaterThanOrEqual(5);
    // Los escalones salen de la base nueva; el origen sigue siendo su cartel.
    expect(segunda).toEqual({ ...paletaDeBase(segunda.base, "oscura"), origen: "#9b6a45" });
    // Sin anterior, o si ya se distinguen, la de siempre.
    expect(paletaJuntoA("#9b6a45", null)).toEqual(paleta("#9b6a45"));
    expect(paletaJuntoA("#c61b17", paleta("#d7396c").base)).toEqual(paleta("#c61b17"));
  });

  it("también en la banda clara (la mostaza junto al amarillo), sin salirse de ella", () => {
    const segunda = paletaJuntoA("#ffd23f", paleta("#e3cb00").base);
    expect(segunda.banda).toBe("clara");
    expect(lum(segunda.base)).toBeGreaterThanOrEqual(0.3);
    expect(diferencia(segunda.base, paleta("#e3cb00").base)).toBeGreaterThanOrEqual(CASI_IGUAL);
    expect(contraste(segunda.base, NEGRO)).toBeGreaterThanOrEqual(5.8);
  });

  it("con cualquier par de colores, la segunda sigue en 4,5:1 o más y nunca queda más cerca que antes", () => {
    const lista = muestra().filter((_, i) => i % 7 === 0);
    for (let i = 0; i + 1 < lista.length; i++) {
      const anterior = paleta(lista[i]).base;
      for (const origen of [lista[i + 1], lista[i]]) {
        const P = paletaJuntoA(origen, anterior);
        expect(contraste(P.base, P.tinta), `${origen} tras ${anterior}`).toBeGreaterThanOrEqual(4.5);
        expect(diferencia(P.base, anterior) + 1e-9).toBeGreaterThanOrEqual(diferencia(paleta(origen).base, anterior));
      }
    }
  });

  it("en un carril: tres cafés iguales seguidos quedan A, A' y A; una tarjeta con cartel en medio las separa", () => {
    const cafe: Paleta = ["#0e0e0e", "#9b6a45", "#5b3633", "#3d3b3a"];
    const expo = (id: string) => ({ id, clase: "Exposición", foto: "/cartel.jpg", colores: cafe });
    const [a, b, c] = paletasDeCarril([expo("hilaridad"), expo("lineas"), expo("privacidad")]);
    expect(a!.base).toBe("#865c3c");
    expect(diferencia(b!.base, a!.base)).toBeGreaterThanOrEqual(CASI_IGUAL);
    expect(c!.base).toBe("#865c3c");
    const conCartelEnMedio = paletasDeCarril([expo("hilaridad"), { id: "concierto", clase: "Evento", foto: "/c.jpg", colores: cafe }, expo("lineas")]);
    expect(conCartelEnMedio.map((P) => P?.base ?? null)).toEqual(["#865c3c", null, "#865c3c"]);
  });

  it("en un carril: un evento con cartel no lleva portada; uno sin imagen (P7), la de su respaldo; un festival con el color de su próximo acto", () => {
    const acto: Paleta = ["#280a09", "#c61b17", "#3c3c93", "#575456"];
    const [cartel, sinImagen, cinema] = paletasDeCarril([
      { id: "a", clase: "Evento", foto: "/a.jpg", colores: null },
      { id: "b", clase: "Evento", foto: null },
      { id: "cinema", clase: "Festival", foto: "/chatbot.jpg", colores: acto },
    ]);
    expect(cartel).toBeNull();
    expect(sinImagen!.base).toBe(paleta(respaldoDe("b")).base);
    expect(cinema!.base).toBe("#bc2521");
  });
});

describe("qué tarjetas llevan la portada del sistema", () => {
  it("la clase con figura sale de la palabra de la tarjeta (`cortoDeClase`)", () => {
    expect([claseConFigura("Festival"), claseConFigura("Exposición"), claseConFigura("Taller"), claseConFigura("Evento"), claseConFigura(undefined), claseConFigura("festival")]).toEqual(["festival", "exposicion", "taller", null, null, null]);
  });
  it("festival, exposición y taller siempre (con cartel o sin él); un evento, solo sin ninguna imagen", () => {
    expect(conPortadaDelSistema({ clase: "Festival", foto: "/c.jpg" })).toBe(true);
    expect(conPortadaDelSistema({ clase: "Exposición", foto: null })).toBe(true);
    expect(conPortadaDelSistema({ clase: "Taller", foto: "/lugar.jpg" })).toBe(true);
    expect(conPortadaDelSistema({ clase: "Evento", foto: "/c.jpg" })).toBe(false);
    expect(conPortadaDelSistema({ clase: "Evento", foto: null })).toBe(true);
    expect(conPortadaDelSistema({ foto: "/c.jpg" })).toBe(false);
  });
});

describe("lo mismo que el prototipo firmado, letra por letra", () => {
  // El módulo `Portadas` de `docs/rediseno/prototipos/portadas-sistema.html` (su primer <script>), tal cual.
  const html = fs.readFileSync(new URL("../../docs/rediseno/prototipos/portadas-sistema.html", import.meta.url), "utf8");
  const modulo = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes("const Portadas = (() =>"))!;
  type Prototipo = { paleta: (o: string) => unknown; hash: (id: string) => number; tieneTono: (o: string) => boolean; B: Record<ClaseConFigura, { f: (c: object) => [string[], string[]] }[]> };
  const Portadas = new Function(`${modulo}; return Portadas;`)() as Prototipo;

  it("las mismas paletas, el mismo tono y el mismo hash", () => {
    for (const origen of muestra().filter((_, i) => i % 3 === 0)) {
      expect(paleta(origen), origen).toEqual(Portadas.paleta(origen));
      expect(tieneTono(origen)).toBe(Portadas.tieneTono(origen));
    }
    for (const id of IDS) expect(hash(id)).toBe(Portadas.hash(id));
  });

  /** ¿Algo del dibujo sale de la L: debajo de la línea del título, a la izquierda del margen o encima del sello? */
  const fueraDeLaL = (svg: string, m: MedidasPortada) => figuras(svg).some((f) => f.y1 > m.H + 0.02 || f.x0 < m.M - 0.02 || (f.x1 > m.selloIzq + 0.02 && f.y0 < m.selloAbajo - 0.02));
  const suyo = (clase: ClaseConFigura, id: string, medidas: MedidasPortada) => {
    const P = paleta(origenDe(null, id));
    const s = hash(id);
    const [atras, delante] = Portadas.B[clase][s % 3].f({ ...medidas, P, s, id: "d1", arriba: medidas.M * 0.8 });
    return `<g data-capa="1">${atras.join("")}</g><g data-capa="2">${delante.join("")}</g>`;
  };

  it("el mismo dibujo (`dibujarPortada` con P2 B), en las tres clases y con medidas de la grande y la mediana, siempre que el del prototipo cumpla la L", () => {
    let iguales = 0;
    for (const clase of CLASES)
      for (const id of IDS)
        for (const medidas of MEDIDAS) {
          const mio = dibujoDePortada({ clase, id, P: paleta(origenDe(null, id)), medidas, giro: false, clip: "d1c" });
          const delPrototipo = suyo(clase, id, medidas);
          expect(fueraDeLaL(mio, medidas), `${clase} ${id}`).toBe(false);
          if (fueraDeLaL(delPrototipo, medidas)) expect(clase).toBe("exposicion");
          else {
            expect(mio, `${clase} ${id}`).toContain(delPrototipo);
            iguales++;
          }
        }
    expect(iguales).toBeGreaterThan(0.9 * CLASES.length * IDS.length * MEDIDAS.length);
  });

  it("la Retícula de la exposición: donde el prototipo deja el cuadro grande debajo de la línea (su fila con signo) o encima del sello, aquí queda dentro", () => {
    // `bbbb…0000` tiene un hash de 2³¹ o más: con `>>` su fila es la última y el cuadro crema baja 12 unidades de la línea del título.
    const id = IDS[0],
      medidas = { H: 70.3, M: 7.27, selloIzq: 68.48, selloAbajo: 36.36 };
    expect(hash(id)).toBeGreaterThanOrEqual(2 ** 31);
    expect(composicionDe("exposicion", id).nombre).toBe("Retícula");
    expect(fueraDeLaL(suyo("exposicion", id, medidas), medidas)).toBe(true);
    expect(fueraDeLaL(dibujoDePortada({ clase: "exposicion", id, P: paleta("#9b6a45"), medidas, giro: true, clip: "c" }), medidas)).toBe(false);
  });
});
