import { describe, expect, it } from "vitest";
import { cabeLaTarjeta, poiBajoElDedo, resultadosPerdidos, type ElementoDelMapa } from "./mapa";

describe("resultadosPerdidos: ¿ningún lugar cae en lo que se ve del mapa?", () => {
  // Un mapa de 390×500 con la hoja tapando 200 px por abajo: lo que se ve es de 0,0 a 390,300.
  const mapa = { ancho: 390, alto: 500 };
  const tapa = 200;

  it("con un lugar a la vista no hay nada perdido, aunque los demás estén lejos", () => {
    expect(resultadosPerdidos([{ x: 100, y: 100 }], mapa, tapa)).toBe(false);
    expect(resultadosPerdidos([{ x: -500, y: -500 }, { x: 390, y: 300 }, { x: 900, y: 900 }], mapa, tapa)).toBe(false);
  });

  it("los bordes de lo que se ve cuentan como a la vista", () => {
    expect(resultadosPerdidos([{ x: 0, y: 0 }], mapa, tapa)).toBe(false);
    expect(resultadosPerdidos([{ x: 390, y: 300 }], mapa, tapa)).toBe(false);
  });

  it("si todos quedan fuera por un lado, están perdidos", () => {
    expect(resultadosPerdidos([{ x: -1, y: 100 }], mapa, tapa)).toBe(true);
    expect(resultadosPerdidos([{ x: 391, y: 100 }], mapa, tapa)).toBe(true);
    expect(resultadosPerdidos([{ x: 100, y: -1 }], mapa, tapa)).toBe(true);
    expect(resultadosPerdidos([{ x: 100, y: 800 }, { x: -20, y: 40 }], mapa, tapa)).toBe(true);
  });

  it("lo que la hoja tapa no se ve: un lugar debajo de ella está perdido, y sin hoja sí se ve", () => {
    expect(resultadosPerdidos([{ x: 100, y: 400 }], mapa, tapa)).toBe(true);
    expect(resultadosPerdidos([{ x: 100, y: 301 }], mapa, tapa)).toBe(true);
    expect(resultadosPerdidos([{ x: 100, y: 400 }], mapa, 0)).toBe(false);
  });

  it("sin lugares no hay nada perdido que encuadrar", () => {
    expect(resultadosPerdidos([], mapa, tapa)).toBe(false);
  });
});

describe("poiBajoElDedo: el sitio del mapa base bajo el dedo", () => {
  const sitio = (nombre: string | null, lng: number, lat: number, extra: Partial<ElementoDelMapa> = {}): ElementoDelMapa => ({ sourceLayer: "poi_label", properties: nombre ? { name: nombre } : {}, geometry: { type: "Point", coordinates: [lng, lat] }, ...extra });
  // Un mapa de mentira: un grado son 1000 px, con la esquina en (0, 0) de la pantalla.
  const proyectar = (lng: number, lat: number) => ({ x: lng * 1000, y: lat * 1000 });
  const dedo = { x: 100, y: 100 };

  it("toma el nombre y el punto del sitio, no los del dedo", () => {
    expect(poiBajoElDedo([sitio("Teatro de la Paz", 0.104, 0.098)], dedo, proyectar)).toEqual({ nombre: "Teatro de la Paz", lat: 0.098, lng: 0.104 });
  });

  it("con varios gana el más cercano al dedo", () => {
    const cerca = poiBajoElDedo([sitio("Lejos", 0.11, 0.1), sitio("Cerca", 0.101, 0.1), sitio("Medio", 0.1, 0.105)], dedo, proyectar);
    expect(cerca?.nombre).toBe("Cerca");
  });

  it("el nombre en español gana si lo trae, y sin nombre no hay sitio", () => {
    const conEs = { ...sitio("Museum of Masks", 0.1, 0.1), properties: { name: "Museum of Masks", name_es: "Museo de la Máscara" } };
    expect(poiBajoElDedo([conEs], dedo, proyectar)?.nombre).toBe("Museo de la Máscara");
    expect(poiBajoElDedo([{ ...conEs, properties: { name: "Museum of Masks", name_es: "  " } }], dedo, proyectar)?.nombre).toBe("Museum of Masks");
    expect(poiBajoElDedo([sitio(null, 0.1, 0.1)], dedo, proyectar)).toBeNull();
  });

  it("solo cuentan los rótulos de sitios: ni las calles, ni los lugares ya registrados (que no vienen de una capa del mapa base), ni las áreas", () => {
    const otros: ElementoDelMapa[] = [
      sitio("Calle Galeana", 0.1, 0.1, { sourceLayer: "road_label" }),
      sitio("Plaza de Armas", 0.1, 0.1, { sourceLayer: undefined }),
      sitio("Parque", 0.1, 0.1, { geometry: { type: "Polygon", coordinates: [] } }),
    ];
    expect(poiBajoElDedo(otros, dedo, proyectar)).toBeNull();
    expect(poiBajoElDedo([], dedo, proyectar)).toBeNull();
  });
});

describe("cabeLaTarjeta: ¿cabe la tarjeta de una pulsación larga en lo que se ve del mapa?", () => {
  // Un mapa de 676 px de alto con una tarjeta de 130 (con su flecha) y 22 px entre ella y el punto: arriba del punto caben desde la y = 152.
  const cabe = (y: number, tapa: number) => cabeLaTarjeta(y, 130, 676, tapa, 22);

  it("arriba del punto si cabe, y si no abajo", () => {
    expect(cabe(300, 0)).toBe(true); // arriba
    expect(cabe(100, 0)).toBe(true); // arriba no cabe (78), abajo sí
    expect(cabe(152, 0)).toBe(true); // justo arriba: 130 de tarjeta y 22 de separación
  });

  it("cuenta lo que tapa la hoja por abajo: lo de debajo de ella no cuenta", () => {
    // Se ve hasta la y = 376: a la 100 caben 254 debajo.
    expect(cabe(100, 300)).toBe(true);
    // Se ve hasta la y = 200: a la 100 no caben ni arriba (78) ni abajo (78).
    expect(cabe(100, 476)).toBe(false);
    // Y si se recoge la hoja, sí.
    expect(cabe(100, 60)).toBe(true);
  });

  it("en un mapa muy corto, ningún punto tiene sitio", () => {
    expect(cabeLaTarjeta(60, 130, 200, 0, 22)).toBe(false);
    expect(cabeLaTarjeta(100, 130, 200, 0, 22)).toBe(false);
  });
});
