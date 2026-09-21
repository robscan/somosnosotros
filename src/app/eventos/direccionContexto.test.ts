import { describe, expect, it } from "vitest";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
import {
  bboxDesdeCentro,
  ciudadDeContexto,
  ciudadDelTexto,
  limpiarDireccion,
  necesitaReintento,
  necesitaReintentoLugares,
  textoParaReintento,
} from "./direccionContexto";

// Coordenadas reales, para las pruebas de cercanía: San Luis Potosí, y un resultado lejano (Rioverde, S.L.P., a ~120 km).
const CALLE_CERCA = { lat: 22.152, lng: -100.98 }; // ~500 m del centro histórico
const RIOVERDE = { lat: 21.93, lng: -99.99 };

describe("limpiarDireccion", () => {
  it("caso con nombre del founder: 'Galeana #423, S.L.P.'", () => {
    expect(limpiarDireccion("Galeana #423, S.L.P.")).toBe("Galeana 423, San Luis Potosí");
  });
  it("quita '#' y 'No.', expande 'esq.' y 'col.'", () => {
    expect(limpiarDireccion("Hidalgo No. 12 esq. Zaragoza, col. Centro")).toBe("Hidalgo 12 esquina Zaragoza, colonia Centro");
  });
  it("no toca un texto ya limpio", () => {
    expect(limpiarDireccion("Avenida Universidad 300")).toBe("Avenida Universidad 300");
  });
});

describe("ciudadDelTexto", () => {
  it("reconoce 'S.L.P.' como San Luis Potosí", () => {
    expect(ciudadDelTexto("Galeana #423, S.L.P.")?.nombre).toBe("San Luis Potosí");
  });
  it("reconoce 'SLP' sin puntos", () => {
    expect(ciudadDelTexto("Av. Salk 123, SLP")?.nombre).toBe("San Luis Potosí");
  });
  it("sin ninguna pista, no reconoce nada", () => {
    expect(ciudadDelTexto("El teatrito")).toBeNull();
  });
});

describe("ciudadDeContexto", () => {
  it("el texto manda sobre cualquier otra pista", () => {
    const r = ciudadDeContexto({ texto: "Galeana #423, S.L.P.", ciudadChip: { ...CIUDAD_INICIAL, nombre: "Ciudad de México" } });
    expect(r.origen).toBe("texto");
    expect(r.ciudad.nombre).toBe("San Luis Potosí");
  });
  it("sin texto, usa el punto del lugar leído del cartel", () => {
    const punto = { lat: 1, lng: 2 };
    const r = ciudadDeContexto({ texto: "El teatrito", puntoLugarLeido: punto });
    expect(r.origen).toBe("lugar");
    expect(r.centro).toEqual(punto);
  });
  it("sin texto ni lugar, usa la ciudad del chip", () => {
    const chip = { ...CIUDAD_INICIAL, nombre: "Ciudad de México", centro: { lat: 19.4, lng: -99.1 } };
    const r = ciudadDeContexto({ texto: "El teatrito", ciudadChip: chip });
    expect(r.origen).toBe("chip");
    expect(r.ciudad.nombre).toBe("Ciudad de México");
  });
  it("sin nada de lo anterior, usa la posición del teléfono", () => {
    const posicion = { lat: 3, lng: 4 };
    const r = ciudadDeContexto({ texto: "El teatrito", posicion });
    expect(r.origen).toBe("posicion");
    expect(r.centro).toEqual(posicion);
  });
  it("sin ninguna pista, cae en San Luis Potosí", () => {
    const r = ciudadDeContexto({ texto: "El teatrito" });
    expect(r.origen).toBe("inicial");
    expect(r.ciudad.nombre).toBe(CIUDAD_INICIAL.nombre);
  });
});

describe("bboxDesdeCentro", () => {
  it("da un rectángulo [oeste, sur, este, norte] alrededor del centro", () => {
    const [oeste, sur, este, norte] = bboxDesdeCentro(CIUDAD_INICIAL.centro, 15);
    expect(oeste).toBeLessThan(CIUDAD_INICIAL.centro.lng);
    expect(este).toBeGreaterThan(CIUDAD_INICIAL.centro.lng);
    expect(sur).toBeLessThan(CIUDAD_INICIAL.centro.lat);
    expect(norte).toBeGreaterThan(CIUDAD_INICIAL.centro.lat);
  });
});

describe("necesitaReintento", () => {
  it("caso con nombre: Rioverde/Aguascalientes/Guadalajara lejos del centro de San Luis piden reintento", () => {
    expect(necesitaReintento([RIOVERDE], CIUDAD_INICIAL.centro)).toBe(true);
  });
  it("una calle cercana no pide reintento", () => {
    expect(necesitaReintento([CALLE_CERCA, RIOVERDE], CIUDAD_INICIAL.centro)).toBe(false);
  });
  it("sin resultados, sí pide reintento", () => {
    expect(necesitaReintento([], CIUDAD_INICIAL.centro)).toBe(true);
  });
});

describe("necesitaReintentoLugares", () => {
  it("caso con nombre: solo distancias lejanas (metros) piden reintento", () => {
    expect(necesitaReintentoLugares([120_000, 300_000])).toBe(true);
  });
  it("una distancia cercana no pide reintento", () => {
    expect(necesitaReintentoLugares([450, 120_000])).toBe(false);
  });
  it("sin distancia (null) para ninguno, pide reintento", () => {
    expect(necesitaReintentoLugares([null, null])).toBe(true);
  });
  it("sin resultados, pide reintento", () => {
    expect(necesitaReintentoLugares([])).toBe(true);
  });
});

describe("textoParaReintento", () => {
  it("agrega la ciudad de contexto si el texto limpio no la trae", () => {
    expect(textoParaReintento("Galeana 423", CIUDAD_INICIAL)).toBe("Galeana 423, San Luis Potosí");
  });
  it("no la repite si ya viene (por 'S.L.P.' expandido)", () => {
    expect(textoParaReintento("Galeana #423, S.L.P.", CIUDAD_INICIAL)).toBe("Galeana 423, San Luis Potosí");
  });
});
