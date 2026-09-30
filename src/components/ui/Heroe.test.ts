import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Heroe from "./Heroe";
import { Kpi } from "./Kpi";

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
