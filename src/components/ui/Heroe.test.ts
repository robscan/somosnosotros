import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Heroe from "./Heroe";
import { Kpi, Kpis } from "./Kpi";

const pintar = (elemento: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(elemento);

describe("Heroe: la portada y el título de una ficha (docs/rediseno/50, P6)", () => {
  it("la ficha de un artista sin portada pinta el símbolo SN en la portada y su avatar redondo, con la etiqueta, el nombre y la meta", () => {
    const html = pintar(createElement(Heroe, { portada: null, alt: "Portada de Aaron", titulo: "Aaron", etiqueta: "Artes visuales", meta: "Fotografía · Solista", avatar: { src: null, alt: "Foto de Aaron" } }));
    expect(html).toContain('src="/sin-foto-ancha.png"'); // la portada: el símbolo SN ya generado, nunca compuesto en vivo
    expect(html).toContain('src="/sin-foto.png"'); // el avatar, redondo, también sin foto
    expect(html).toContain("<h1>Aaron</h1>");
    expect(html).toContain("Artes visuales");
    expect(html).toContain("Fotografía · Solista");
    expect(html).not.toContain("<button"); // sin imagen no hay visor: nada que abrir
  });
  it("con portada y foto, tocar cualquiera abre la imagen entera", () => {
    const html = pintar(createElement(Heroe, { portada: "https://example.com/portada.jpg", alt: "Portada de Aaron", titulo: "Aaron", avatar: { src: "https://example.com/aaron.jpg", alt: "Foto de Aaron" } }));
    expect(html).toContain('aria-label="Ver Portada de Aaron entero"');
    expect(html).toContain('aria-label="Ver Foto de Aaron entero"');
  });
  it("sin avatar ni etiqueta es solo la portada y su título; dentro de la hoja el título es un h2", () => {
    const html = pintar(createElement(Heroe, { portada: null, alt: "", titulo: "Un lugar", nivel: 2 }));
    expect(html).toContain("<h2>Un lugar</h2>");
    expect(html).not.toContain("<h1");
    expect(html).not.toContain('src="/sin-foto.png"');
  });
});

describe("Heroe: la cabecera oscura de exposición, taller y festival (OL-351)", () => {
  const numeros = Kpis({ piel: "banda", children: createElement(Kpi, { icono: null, etiqueta: "Actos", valor: 11 }) }); // `Kpis` no tiene estado: se llama directo
  it("con números en la banda: la portada y el título llevan su piel oscura y los números van en su fila, en la piel de la banda", () => {
    const html = pintar(createElement(Heroe, { portada: "https://example.com/cartel.jpg", alt: "Cartel de CINEMA", titulo: "CINEMA", etiqueta: "Festival", meta: "Del 29 de sep al 24 de oct", banda: numeros }));
    expect(html.match(/class="[^"]*oscura[^"]*"/g)).toHaveLength(2); // la figura y el título
    expect(html).toMatch(/<div class="[^"]*numeros[^"]*"><ul class="[^"]*kpis[^"]*sobreBanda[^"]*">/);
    expect(html).toContain("<small>Actos</small>");
    expect(html).toContain("Festival");
    expect(html).toContain("Del 29 de sep al 24 de oct");
  });
  it("sin portada, el símbolo SN ya generado en su versión oscura (nunca compuesto en vivo)", () => {
    const html = pintar(createElement(Heroe, { portada: null, alt: "", titulo: "CINEMA", banda: numeros }));
    expect(html).toContain('src="/sin-foto-oscura.png"');
    expect(html).not.toContain("sin-foto-ancha");
  });
  it("sin números, el héroe de siempre: ni piel oscura ni fila de números", () => {
    const html = pintar(createElement(Heroe, { portada: null, alt: "", titulo: "Un evento" }));
    expect(html).not.toContain("oscura");
    expect(html).not.toContain("numeros");
    expect(html).toContain('src="/sin-foto-ancha.png"');
  });
});

/**
 * El contraste de la cabecera oscura con los tokens de `globals.css` (WCAG 2.x). El peor caso de la portada es un cartel blanco: el velo se
 * compone sobre blanco. Lo que va bajo su parada del 45 % (la meta y, salvo un título de tres líneas, todo el título) lleva al menos ese velo;
 * el título es letra grande (26 px en 800) y le basta 3:1, la meta y los números piden 4,5:1. Las capturas de la bitácora 382 miden además el
 * velo en la posición real de cada línea a 320 y 390.
 */
describe("contraste de la cabecera oscura (OL-351)", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  const token = (nombre: string) => css.match(new RegExp(`--${nombre}:\\s*([^;]+);`))![1].trim();
  const rgba = (v: string): [number, number, number, number] => {
    const hex = v.match(/^#([0-9a-f]{6})$/i);
    if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)).concat(1) as [number, number, number, number];
    const [r, g, b, a = 1] = v.match(/[\d.]+/g)!.map(Number);
    return [r, g, b, a];
  };
  const sobre = ([r, g, b, a]: number[], [fr, fg, fb]: number[]) => [r * a + fr * (1 - a), g * a + fg * (1 - a), b * a + fb * (1 - a)];
  const luz = (c: number[]) => c.map((x) => x / 255).map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)).reduce((t, x, i) => t + x * [0.2126, 0.7152, 0.0722][i], 0);
  const contraste = (a: number[], b: number[]) => (Math.max(luz(a), luz(b)) + 0.05) / (Math.min(luz(a), luz(b)) + 0.05);
  const BLANCO = [255, 255, 255];
  const banda = rgba(token("banda")).slice(0, 3);

  it("los números: el valor en blanco y lo que es, en el blanco suave, sobre su tarjeta en la banda", () => {
    const tarjeta = sobre(rgba(token("sobre-banda")), banda);
    expect(contraste(BLANCO, tarjeta)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(sobre(rgba(token("sobre-banda-suave")), tarjeta), tarjeta)).toBeGreaterThanOrEqual(4.5);
  });
  it("el título y la meta en blanco sobre el velo, con un cartel blanco debajo", () => {
    const parada = token("velo-banda").match(/rgba\([^)]+\)\s*45%/)![0];
    const fondo = sobre(rgba(parada), BLANCO);
    expect(contraste(BLANCO, fondo)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(BLANCO, banda)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("Kpi: un número de la ficha", () => {
  const base = { icono: null, etiqueta: "Van", valor: 2 };
  it("solo informa si no hay a dónde ir", () => {
    const html = pintar(createElement(Kpi, base));
    expect(html).toContain("<small>Van</small>");
    expect(html).toContain("<b>2</b>");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("<button");
  });
  it("con un salto, toda la tarjeta es el enlace a esa sección", () => {
    expect(pintar(createElement(Kpi, { ...base, salto: "quien-va" }))).toContain('href="#quien-va"');
  });
  it("con algo que hacer, toda la tarjeta es un botón con su nombre", () => {
    const html = pintar(createElement(Kpi, { ...base, alTocar: { hace: () => {}, nombre: "Calcular la distancia" } }));
    expect(html).toContain("<button");
    expect(html).toContain('aria-label="Calcular la distancia"');
  });
});
