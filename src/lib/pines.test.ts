import { describe, expect, it } from "vitest";
import {
  bordePin,
  colorPin,
  distanciaNombre,
  huellaCirculo,
  huellaPin,
  prioridadPin,
  propiedadesPin,
  radioCirculo,
  radioPin,
  rangosDeDias,
  BORDE_ELEGIDO,
  BORDE_NORMAL,
  BORDE_SEGUIDO,
  ESCALA_ELEGIDO,
  RADIO_MEDIANO,
  RADIO_PEQUENO,
  TAMANO_NOMBRE,
  TAMANO_NOMBRE_ELEGIDO,
  type EstadoLugarPin,
} from "./pines";

const colores = { tinta: "#1a1a1a", primario: "#6d34c8", destacado: "#d35400", seguido: "#1f6f43", privado: "#5c5c5c" };

function estado(parcial: Partial<EstadoLugarPin>): EstadoLugarPin {
  return { dia: null, privado: false, seguido: false, destacado: false, elegido: false, ...parcial };
}

describe("radioPin", () => {
  it("sin evento esta semana, el pin es chico", () => {
    expect(radioPin(estado({}))).toBe(RADIO_PEQUENO);
  });

  it("con evento esta semana (el día encima), el pin es grande, sea o no seguido o destacado", () => {
    expect(radioPin(estado({ dia: "Hoy" }))).toBe(RADIO_MEDIANO);
    expect(radioPin(estado({ dia: "Vie", seguido: true, destacado: true }))).toBe(RADIO_MEDIANO);
  });

  it("el elegido crece entre ×1,8 y ×2 sobre lo que era, con día o sin él", () => {
    for (const dia of [null, "Hoy"]) {
      const normal = radioPin(estado({ dia }));
      const elegido = radioPin(estado({ dia, elegido: true }));
      expect(elegido / normal).toBeGreaterThanOrEqual(1.8);
      expect(elegido / normal).toBeLessThanOrEqual(2);
    }
    expect(radioPin(estado({ dia: "Hoy", elegido: true }))).toBeCloseTo(RADIO_MEDIANO * ESCALA_ELEGIDO);
  });
});

describe("bordePin y huellaPin", () => {
  it("fino en todos, un poco más en el seguido y ancho (el aro) solo en el elegido", () => {
    expect(bordePin(estado({}))).toBe(BORDE_NORMAL);
    expect(bordePin(estado({ seguido: true }))).toBe(BORDE_SEGUIDO);
    expect(bordePin(estado({ elegido: true }))).toBe(BORDE_ELEGIDO);
    expect(bordePin(estado({ elegido: true, seguido: true }))).toBe(BORDE_ELEGIDO);
    expect(BORDE_ELEGIDO).toBeGreaterThan(BORDE_SEGUIDO);
  });

  it("la huella es el radio más el borde (Mapbox dibuja el borde por fuera del círculo)", () => {
    expect(huellaPin(estado({ dia: "Hoy" }))).toBe(RADIO_MEDIANO + BORDE_NORMAL);
    expect(huellaPin(estado({ elegido: true }))).toBe(RADIO_PEQUENO * ESCALA_ELEGIDO + BORDE_ELEGIDO);
  });
});

describe("radioCirculo y huellaCirculo: lo que pinta la capa de puntos", () => {
  it("todos los lugares son un punto chico, con o sin evento esta semana (el disco con día es un símbolo aparte)", () => {
    expect(radioCirculo(estado({}))).toBe(RADIO_PEQUENO);
    expect(radioCirculo(estado({ dia: "Hoy" }))).toBe(RADIO_PEQUENO);
    expect(radioCirculo(estado({ dia: "Vie", seguido: true }))).toBe(RADIO_PEQUENO);
    expect(huellaCirculo(estado({ dia: "Hoy" }))).toBe(RADIO_PEQUENO + BORDE_NORMAL);
    expect(huellaCirculo(estado({ dia: "Hoy", seguido: true }))).toBe(RADIO_PEQUENO + BORDE_SEGUIDO);
  });

  it("el elegido conserva su disco grande, con día o sin él", () => {
    expect(radioCirculo(estado({ dia: "Hoy", elegido: true }))).toBeCloseTo(RADIO_MEDIANO * ESCALA_ELEGIDO);
    expect(radioCirculo(estado({ elegido: true }))).toBeCloseTo(RADIO_PEQUENO * ESCALA_ELEGIDO);
    expect(huellaCirculo(estado({ dia: "Hoy", elegido: true }))).toBe(huellaPin(estado({ dia: "Hoy", elegido: true })));
  });

  it("el nombre se acomoda fuera del disco con día aunque el disco ceda, y fuera del punto si no tiene día", () => {
    const conDia = propiedadesPin(estado({ dia: "Vie" }), colores, colores);
    const sinDia = propiedadesPin(estado({}), colores, colores);
    expect([conDia.radio, conDia.huella]).toEqual([RADIO_PEQUENO, RADIO_PEQUENO + BORDE_NORMAL]);
    expect(conDia.distanciaNombre * TAMANO_NOMBRE).toBeCloseTo(RADIO_MEDIANO + BORDE_NORMAL + 10);
    expect(sinDia.distanciaNombre * TAMANO_NOMBRE).toBeCloseTo(RADIO_PEQUENO + BORDE_NORMAL + 10);
  });
});

describe("rangosDeDias: quién elige sitio primero entre los pines con día", () => {
  const pin = (id: string, prioridad: number, inicio: number) => ({ id, prioridad, inicio });

  it("más prioridad primero: el seguido, el destacado, el que solo tiene día", () => {
    const rangos = rangosDeDias([pin("dia", 1, 100), pin("seguido", 3, 900), pin("destacado", 2, 500)]);
    expect([rangos.get("seguido"), rangos.get("destacado"), rangos.get("dia")]).toEqual([0, 1, 2]);
  });

  it("a igual prioridad, el evento más próximo primero", () => {
    const rangos = rangosDeDias([pin("viernes", 1, 300), pin("hoy", 1, 100), pin("jueves", 1, 200)]);
    expect([rangos.get("hoy"), rangos.get("jueves"), rangos.get("viernes")]).toEqual([0, 1, 2]);
  });

  it("y si empatan, el id: un orden estable que no depende de cómo lleguen", () => {
    const uno = rangosDeDias([pin("b", 1, 100), pin("a", 1, 100), pin("c", 1, 100)]);
    const otro = rangosDeDias([pin("c", 1, 100), pin("b", 1, 100), pin("a", 1, 100)]);
    expect([...uno]).toEqual([...new Map([["a", 0], ["b", 1], ["c", 2]])]);
    expect(new Map([...otro].sort())).toEqual(new Map([...uno].sort()));
  });

  it("da un rango distinto a cada pin, de 0 a n - 1, y nada si no hay pines", () => {
    const rangos = rangosDeDias([pin("a", 1, 1), pin("b", 3, 1), pin("c", 2, 1), pin("d", 1, 0)]);
    expect([...rangos.values()].sort()).toEqual([0, 1, 2, 3]);
    expect(rangosDeDias([]).size).toBe(0);
  });
});

describe("colorPin", () => {
  it("sin seguir y sin eventos: tinta", () => {
    expect(colorPin(estado({}), colores)).toBe(colores.tinta);
  });

  it("con evento esta semana, sin seguir ni destacar: el color de acción (primario)", () => {
    expect(colorPin(estado({ dia: "Hoy" }), colores)).toBe(colores.primario);
  });

  it("destacado que no se sigue: naranja, tenga o no evento", () => {
    expect(colorPin(estado({ destacado: true }), colores)).toBe(colores.destacado);
    expect(colorPin(estado({ destacado: true, dia: "Vie" }), colores)).toBe(colores.destacado);
  });

  it("seguido: verde, y gana al destacado y al evento", () => {
    expect(colorPin(estado({ seguido: true }), colores)).toBe(colores.seguido);
    expect(colorPin(estado({ seguido: true, destacado: true, dia: "Hoy" }), colores)).toBe(colores.seguido);
  });

  it("privado: gris, siempre, aunque sea seguido o destacado", () => {
    expect(colorPin(estado({ privado: true, seguido: true, destacado: true, dia: "Hoy" }), colores)).toBe(colores.privado);
  });

  it("el elegido no cambia de color: el color sigue diciendo qué es el lugar", () => {
    for (const parcial of [{}, { dia: "Hoy" }, { destacado: true }, { seguido: true }, { privado: true }]) {
      expect(colorPin(estado({ ...parcial, elegido: true }), colores)).toBe(colorPin(estado(parcial), colores));
    }
  });
});

describe("prioridadPin", () => {
  it("elegido > seguido > destacado > con día > el resto", () => {
    const orden = [estado({ elegido: true }), estado({ seguido: true, dia: "Hoy" }), estado({ destacado: true, dia: "Hoy" }), estado({ dia: "Hoy" }), estado({})].map(prioridadPin);
    expect(orden).toEqual([...orden].sort((a, b) => b - a));
    expect(new Set(orden).size).toBe(5);
  });

  it("el elegido gana aunque sea el más corriente, y el seguido gana al destacado que además tiene día", () => {
    expect(prioridadPin(estado({ elegido: true }))).toBeGreaterThan(prioridadPin(estado({ seguido: true, destacado: true, dia: "Hoy" })));
    expect(prioridadPin(estado({ seguido: true }))).toBeGreaterThan(prioridadPin(estado({ destacado: true, dia: "Hoy" })));
  });
});

describe("distanciaNombre", () => {
  it("el nombre queda fuera de la huella de su pin, en cualquier estado", () => {
    for (const parcial of [{}, { dia: "Hoy" }, { seguido: true, dia: "Vie" }, { elegido: true }, { elegido: true, dia: "Hoy" }]) {
      const e = estado(parcial);
      const tamano = e.elegido ? TAMANO_NOMBRE_ELEGIDO : TAMANO_NOMBRE;
      expect(distanciaNombre(e) * tamano).toBeGreaterThan(huellaPin(e));
    }
  });
});

describe("propiedadesPin", () => {
  it("trae cada regla calculada, para que las capas solo lean la propiedad", () => {
    const e = estado({ dia: "Vie", destacado: true, elegido: true });
    expect(propiedadesPin(e, colores, { ...colores, destacado: "#a94400" })).toEqual({
      radio: radioPin(e),
      borde: BORDE_ELEGIDO,
      huella: huellaPin(e),
      prioridad: prioridadPin(e),
      tamanoDia: expect.closeTo(19),
      distanciaNombre: distanciaNombre(e),
      colorPunto: colores.destacado,
      colorTexto: "#a94400",
    });
  });
});
