import { describe, expect, it } from "vitest";
import { sedesDeFestival, type ActoConSitio } from "./sedesFestival";
import { eventosDelSitio, hrefSitio, slugDeSitio, slugDelEvento } from "./sitios";

/** La ficha de un sitio fuera del directorio (OL-348): su slug, qué eventos lo nombran y cómo se arma con ellos (como una sede de festival). */

const SLP = "San Luis Potosí";
const enSitio = (inicio: string, sitio_texto: string, extra: Partial<ActoConSitio> = {}): ActoConSitio => ({ inicio, lugar_id: null, lugar: null, sitio_texto, ciudad: SLP, ...extra });

describe("slugDeSitio", () => {
  it("sale del nombre sin acentos, mayúsculas ni signos, con su ciudad detrás", () => {
    expect(slugDeSitio("Jardín de San Juan de Dios", SLP)).toBe("jardin-de-san-juan-de-dios-san-luis-potosi");
    expect(slugDeSitio("  ¡Plaza  de Armas!  ", "Querétaro")).toBe("plaza-de-armas-queretaro");
  });
  it("sin ciudad, solo el nombre; si el nombre ya termina con ella (o es ella), no se repite", () => {
    expect(slugDeSitio("Jardín de San Juan de Dios")).toBe("jardin-de-san-juan-de-dios");
    expect(slugDeSitio("Centro de las Artes San Luis Potosí", SLP)).toBe("centro-de-las-artes-san-luis-potosi");
    expect(slugDeSitio("San Luis Potosí", SLP)).toBe("san-luis-potosi");
  });
  it("un nombre sin letras ni números no da slug", () => {
    expect(slugDeSitio("¡¡!!", SLP)).toBe("");
  });
});

describe("hrefSitio", () => {
  it("un sitio fuera del directorio y público abre su ficha", () => {
    expect(hrefSitio({ lugar_id: null, sitio_texto: "Jardín de San Juan de Dios", ciudad: SLP })).toBe("/sitios/jardin-de-san-juan-de-dios-san-luis-potosi");
  });
  it("un lugar del directorio (tiene la suya), un sitio reservado (su dirección no se publica), sin sitio o sin letras: ninguna", () => {
    expect(hrefSitio({ lugar_id: "abc", sitio_texto: null })).toBeNull();
    expect(hrefSitio({ lugar_id: null, sitio_texto: "Casa de Lu", sitio_reservado: true })).toBeNull();
    expect(hrefSitio({ lugar_id: null, sitio_texto: null })).toBeNull();
    expect(hrefSitio({ lugar_id: null, sitio_texto: "  " })).toBeNull();
    expect(hrefSitio({ lugar_id: null, sitio_texto: "¡¡!!" })).toBeNull();
  });
});

describe("la ficha se arma con los eventos que nombran el sitio", () => {
  const eventos = [
    enSitio("2026-10-17T01:00:00Z", "Jardín de San Juan de Dios", { sitio_lat: 22.1511, sitio_lng: -100.9772 }),
    enSitio("2026-10-18T01:00:00Z", "jardin de san juan de dios", { sitio_direccion: "Calle Madero 1", sitio_lat: 22.1512, sitio_lng: -100.9771 }),
    enSitio("2026-10-19T01:00:00Z", "Jardín de San Juan de Dios", { ciudad: "Querétaro", sitio_lat: 20.59, sitio_lng: -100.39 }),
    enSitio("2026-10-20T01:00:00Z", "Jardín de San Juan de Dios", { sitio_reservado: true }),
    { inicio: "2026-10-21T01:00:00Z", lugar_id: "paz", lugar: { nombre: "Jardín de San Juan de Dios" }, sitio_texto: null, ciudad: SLP },
  ];
  const slug = slugDelEvento(eventos[0])!;

  it("el mismo nombre escrito distinto es el mismo sitio; en otra ciudad, otro; un reservado o un lugar del directorio no entran", () => {
    expect(eventosDelSitio(eventos, slug)).toEqual([eventos[0], eventos[1]]);
    expect(eventosDelSitio(eventos, slugDelEvento(eventos[2])!)).toEqual([eventos[2]]);
    expect(eventosDelSitio(eventos, "no-existe")).toEqual([]);
  });

  it("como una sede de festival: el nombre del primero, la dirección y el punto del primero que los diga, cuántos eventos y su ficha", () => {
    const [sede, ...otras] = sedesDeFestival(eventosDelSitio(eventos, slug));
    expect(otras).toEqual([]);
    expect(sede).toMatchObject({ nombre: "Jardín de San Juan de Dios", lugar: null, direccion: "Calle Madero 1", punto: { lat: 22.1511, lng: -100.9772 }, actos: 2, href: `/sitios/${slug}` });
  });
});
