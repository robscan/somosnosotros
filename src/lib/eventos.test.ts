import { describe, expect, it } from "vitest";
import { textoCompartir, validarEvento } from "./eventos";

const LUGAR = "2a63c4d0-6a3e-4d75-bc67-8c3226d4401b";
const base = { lugar_id: LUGAR, titulo: "Noche de jazz", inicio: "2026-09-20T19:00", fin: "", descripcion: "", imagen: "", gratis: "si", precio: "", enlace: "" };

describe("validarEvento", () => {
  it("acepta un evento mínimo: lugar, título y fecha; gratis por defecto", () => {
    const { datos, errores } = validarEvento(base);
    expect(errores).toEqual({});
    expect(datos.inicio).toBe("2026-09-21T01:00:00.000Z");
    expect(datos.precio).toBeNull();
    expect(datos.fin).toBeNull();
  });
  it("sin fecha no se publica; el fin va después del inicio", () => {
    expect(validarEvento({ ...base, inicio: "" }).errores.inicio).toBeTruthy();
    expect(validarEvento({ ...base, fin: "2026-09-20T18:00" }).errores.fin).toBeTruthy();
    expect(validarEvento({ ...base, fin: "2026-09-20T21:00" }).errores).toEqual({});
  });
  it("con precio hay que decir cuánto; el enlace se completa con https", () => {
    expect(validarEvento({ ...base, gratis: "no", precio: "" }).errores.precio).toBeTruthy();
    const { datos } = validarEvento({ ...base, gratis: "no", precio: "$150", enlace: "boletos.mx/jazz" });
    expect(datos.precio).toBe("$150");
    expect(datos.enlace).toBe("https://boletos.mx/jazz");
  });
  it("exige un lugar válido", () => {
    expect(validarEvento({ ...base, lugar_id: "x" }).errores.lugar_id).toBeTruthy();
  });
});

describe("textoCompartir", () => {
  it("arma título, cuándo, dónde y enlace", () => {
    expect(textoCompartir("Noche de jazz", "Hoy · 19:00", "Teatro de la Paz", "https://somosnosotros.org/eventos/1")).toBe(
      "Noche de jazz\nHoy · 19:00 · Teatro de la Paz\nhttps://somosnosotros.org/eventos/1",
    );
  });
});
