import { describe, expect, it } from "vitest";
import {
  bordePin,
  colorPin,
  distanciaNombre,
  huellaPin,
  opacidadPin,
  prioridadPin,
  propiedadesPin,
  radioPin,
  BORDE_ELEGIDO,
  BORDE_NORMAL,
  BORDE_SEGUIDO,
  ESCALA_ELEGIDO,
  OPACIDAD_ATENUADA,
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

describe("opacidadPin", () => {
  it("con un elegido, los demás bajan a media opacidad y el elegido se ve completo", () => {
    expect(opacidadPin(estado({}), true)).toBe(OPACIDAD_ATENUADA);
    expect(opacidadPin(estado({ dia: "Hoy", seguido: true }), true)).toBe(OPACIDAD_ATENUADA);
    expect(opacidadPin(estado({ elegido: true }), true)).toBe(1);
    expect(OPACIDAD_ATENUADA).toBe(0.5);
  });

  it("sin ficha abierta, todos se ven completos", () => {
    expect(opacidadPin(estado({}), false)).toBe(1);
    expect(opacidadPin(estado({ dia: "Hoy" }), false)).toBe(1);
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
    expect(propiedadesPin(e, true, colores, { ...colores, destacado: "#a94400" })).toEqual({
      radio: radioPin(e),
      borde: BORDE_ELEGIDO,
      huella: huellaPin(e),
      prioridad: prioridadPin(e),
      opacidad: 1,
      tamanoDia: expect.closeTo(19),
      distanciaNombre: distanciaNombre(e),
      colorPunto: colores.destacado,
      colorTexto: "#a94400",
    });
  });
});
