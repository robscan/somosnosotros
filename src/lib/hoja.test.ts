import { describe, expect, it } from "vitest";
import { alturaSiguiente, destinoAlAsentar, estadoEn, masCercano, type Detentes } from "./hoja";

/** Las alturas de la lista en un teléfono de 844: la franja, dos renglones y medio de 94 y el hueco que la deja llena. */
const LISTA: Detentes = { recogida: 0, asoma: 235, llena: 690 };
/** Las de una ficha: su cabecera, foto y datos con un poco de lo que sigue, y llena. */
const FICHA: Detentes = { recogida: 0, media: 400, llena: 678 };

describe("hoja: la altura más cercana", () => {
  it("escoge la más cercana a donde quedó el dedo", () => {
    expect(masCercano(0, LISTA)).toBe("recogida");
    expect(masCercano(100, LISTA)).toBe("recogida");
    expect(masCercano(140, LISTA)).toBe("asoma");
    expect(masCercano(500, LISTA)).toBe("llena");
    expect(masCercano(390, FICHA)).toBe("media");
  });

  it("si empatan, la más baja", () => {
    expect(masCercano(117.5, LISTA)).toBe("recogida");
  });

  it("con dos alturas iguales (pantalla chica: asoma ya es llena) da la primera", () => {
    expect(masCercano(300, { recogida: 0, asoma: 300, llena: 300 })).toBe("asoma");
  });
});

describe("hoja: en qué altura está", () => {
  it("llena en cuanto llega arriba y más allá (el contenido desplazado sigue siendo llena)", () => {
    expect(estadoEn(689, LISTA)).toBe("llena");
    expect(estadoEn(690, LISTA)).toBe("llena");
    expect(estadoEn(1400, LISTA)).toBe("llena");
  });

  it("antes de llegar arriba, la más cercana", () => {
    expect(estadoEn(500, LISTA)).toBe("llena");
    expect(estadoEn(450, LISTA)).toBe("asoma");
    expect(estadoEn(200, LISTA)).toBe("asoma");
    expect(estadoEn(30, LISTA)).toBe("recogida");
  });
});

describe("hoja: asentarse al soltar", () => {
  it("entre dos alturas se va a la más cercana", () => {
    expect(destinoAlAsentar(100, LISTA)).toBe(0);
    expect(destinoAlAsentar(140, LISTA)).toBe(235);
    expect(destinoAlAsentar(600, LISTA)).toBe(690);
    expect(destinoAlAsentar(300, FICHA)).toBe(400);
  });

  it("ya en una altura, no hay a dónde ir", () => {
    expect(destinoAlAsentar(0, LISTA)).toBeNull();
    expect(destinoAlAsentar(235.5, LISTA)).toBeNull();
    expect(destinoAlAsentar(400, FICHA)).toBeNull();
  });

  it("llena desplaza el contenido: nada que asentar, ni con un desplazamiento largo", () => {
    expect(destinoAlAsentar(690, LISTA)).toBeNull();
    expect(destinoAlAsentar(1200, LISTA)).toBeNull();
  });
});

describe("hoja: el asa", () => {
  it("sube a la siguiente altura", () => {
    expect(alturaSiguiente(0, LISTA)).toBe(235);
    expect(alturaSiguiente(235, LISTA)).toBe(690);
    expect(alturaSiguiente(0, FICHA)).toBe(400);
  });

  it("entre dos alturas sube a la de arriba", () => {
    expect(alturaSiguiente(100, LISTA)).toBe(235);
    expect(alturaSiguiente(300, FICHA)).toBe(400);
  });

  it("desde la más alta (o más allá) vuelve a la más baja", () => {
    expect(alturaSiguiente(690, LISTA)).toBe(0);
    expect(alturaSiguiente(900, FICHA)).toBe(0);
  });

  it("sin alturas medidas no se mueve", () => {
    expect(alturaSiguiente(50, {})).toBe(0);
  });
});
