import { describe, expect, it } from "vitest";
import { alturaAsoma, alturaLlena, alturaSiguiente, cabeceraCompacta, destinoAlAsentar, detenteAlFiltrar, estadoEn, masCercano, tiempoEnMs, type Detentes } from "./hoja";

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

describe("alturaLlena: hasta dónde sube cada hoja", () => {
  // Un teléfono de 844 con la navegación de 60 y la franja de 64: recogida, el cuerpo empieza en 720; la fila de contexto termina en 116.
  const recogida = { arribaDelCuerpo: 720, y: 0, arribaDeLaHoja: 0, bajoLaFila: 116 };

  it("la lista vive bajo sus filtros: llena se detiene justo debajo de la fila de contexto", () => {
    expect(alturaLlena({ ...recogida, conFicha: false })).toBe(604);
  });

  it("la ficha es una página: llena cubre la pantalla hasta arriba de la hoja", () => {
    expect(alturaLlena({ ...recogida, conFicha: true })).toBe(720);
  });

  it("no depende de dónde esté la hoja al medir (asoma, llena o desplazada)", () => {
    for (const y of [238, 604, 900]) {
      expect(alturaLlena({ ...recogida, arribaDelCuerpo: 720 - y, y, conFicha: false })).toBe(604);
      expect(alturaLlena({ ...recogida, arribaDelCuerpo: 720 - y, y, conFicha: true })).toBe(720);
    }
  });
});

describe("alturaAsoma: la lista asoma sin tapar los mandos del mapa", () => {
  it("con sitio de sobra pide lo que piden sus renglones", () => {
    expect(alturaAsoma(235, 604, 72)).toBe(235);
    expect(alturaAsoma(235, 604, 0)).toBe(235);
  });

  it("en una ventana baja cede lo que haga falta: el mapa conserva el aire de «Mi ubicación» (12 + 48 + 12) arriba", () => {
    // Un teléfono de 568: el mapa deja 336 de hueco a la hoja y los dos renglones y medio piden 290.
    expect(alturaAsoma(290, 336, 72)).toBe(264);
  });

  it("nunca baja de cero", () => {
    expect(alturaAsoma(100, 40, 72)).toBe(0);
  });
});

describe("detenteAlFiltrar: lo que hace la hoja cuando cambia lo que se ve", () => {
  it("recogida sube a asoma para enseñar el resultado", () => {
    expect(detenteAlFiltrar("recogida")).toBe("asoma");
  });

  it("en asoma o llena se queda donde está", () => {
    expect(detenteAlFiltrar("asoma")).toBe("asoma");
    expect(detenteAlFiltrar("llena")).toBe("llena");
  });

  it("la de la ficha (media) tampoco se mueve", () => {
    expect(detenteAlFiltrar("media")).toBe("media");
  });
});

describe("cabeceraCompacta: también dice dónde vive la pastilla de Seguir", () => {
  // La portada deja de verse cuando el desplazamiento llega a 300: desde ahí la cabecera es compacta y la pastilla flota abajo.
  it("con la portada a la vista, la cabecera no es compacta y la pastilla va en el héroe, junto al menú", () => {
    expect(cabeceraCompacta(0, 300, "media", false)).toBe(false);
    expect(cabeceraCompacta(299, 300, "llena", false)).toBe(false);
  });
  it("desde que la portada se desplaza fuera, es compacta y la pastilla flota abajo", () => {
    expect(cabeceraCompacta(300, 300, "llena", false)).toBe(true);
    expect(cabeceraCompacta(900, 300, "llena", true)).toBe(true);
  });
  it("con la hoja recogida en el teléfono es compacta (la pastilla se esconde); en el panel no hay recogida", () => {
    expect(cabeceraCompacta(0, 300, "recogida", false)).toBe(true);
    expect(cabeceraCompacta(0, 300, "recogida", true)).toBe(false);
  });
});

describe("tiempoEnMs: lo que el minificador hace con las duraciones de globals.css", () => {
  it("lee los milisegundos tal cual y los segundos que deja el minificador (800ms sale como .8s)", () => {
    expect(tiempoEnMs("800ms")).toBe(800);
    expect(tiempoEnMs(" 366ms ")).toBe(366);
    expect(tiempoEnMs(".8s")).toBe(800);
    expect(tiempoEnMs("0.366s")).toBe(366);
  });
});
