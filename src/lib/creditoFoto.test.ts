import { describe, expect, it } from "vitest";
import { creditoAlGuardar, limpiarCreditoFoto, partesCreditoFoto, TOPE_CREDITO_FOTO, validarCreditoFoto } from "./creditoFoto";

describe("limpiarCreditoFoto", () => {
  it("una línea, sin «Foto:» delante ni espacios de más", () => {
    expect(limpiarCreditoFoto("  Foto:  Pablo   Pérez\n· CC BY-SA 4.0 ")).toBe("Pablo Pérez · CC BY-SA 4.0");
    expect(limpiarCreditoFoto("crédito: Ana")).toBe("Ana");
    expect(limpiarCreditoFoto(null)).toBe("");
    expect(limpiarCreditoFoto("   ")).toBe("");
  });
});

describe("validarCreditoFoto", () => {
  it("vacío es null; con texto se guarda limpio", () => {
    expect(validarCreditoFoto("")).toEqual({ credito: null });
    expect(validarCreditoFoto(" Pablo Pérez · CC BY 4.0 ")).toEqual({ credito: "Pablo Pérez · CC BY 4.0" });
  });
  it("más del tope de la base es un error", () => {
    const r = validarCreditoFoto("a".repeat(TOPE_CREDITO_FOTO + 1));
    expect(r.error).toBe(`Máximo ${TOPE_CREDITO_FOTO} caracteres.`);
    expect(validarCreditoFoto("a".repeat(TOPE_CREDITO_FOTO)).error).toBeUndefined();
  });
});

describe("creditoAlGuardar", () => {
  const fd = (campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    return f;
  };
  it("sin portada se borra, lo mande o no el formulario", () => {
    expect(creditoAlGuardar(fd({ portada_credito: "Ana · CC BY" }), null)).toEqual({ credito: null });
    expect(creditoAlGuardar(fd({}), null)).toEqual({ credito: null });
  });
  it("con portada y sin el campo (un formulario de antes), no se toca", () => {
    expect(creditoAlGuardar(fd({}), "/f.jpg")).toEqual({});
  });
  it("con portada y el campo: lo escrito, limpio; vacío lo borra; largo es error", () => {
    expect(creditoAlGuardar(fd({ portada_credito: " Foto: Ana · CC BY " }), "/f.jpg")).toEqual({ credito: "Ana · CC BY" });
    expect(creditoAlGuardar(fd({ portada_credito: "" }), "/f.jpg")).toEqual({ credito: null });
    expect(creditoAlGuardar(fd({ portada_credito: "x".repeat(161) }), "/f.jpg").error).toBe("Máximo 160 caracteres.");
  });
});

describe("partesCreditoFoto", () => {
  it("sin crédito, nada", () => {
    expect(partesCreditoFoto(null)).toBeNull();
    expect(partesCreditoFoto("  ")).toBeNull();
  });
  it("nombre y licencia, sin dirección: nada enlaza", () => {
    expect(partesCreditoFoto("Pablo Pérez · CC BY-SA 4.0")).toEqual({ nombre: "Pablo Pérez", resto: "CC BY-SA 4.0", url: null });
    expect(partesCreditoFoto("Dominio público")).toEqual({ nombre: "Dominio público", resto: "", url: null });
  });
  it("la dirección entre paréntesis enlaza el nombre", () => {
    expect(partesCreditoFoto("Pablo Pérez · CC BY-SA 4.0 (https://commons.wikimedia.org/wiki/File:Teatro_de_la_Paz.jpg)")).toEqual({
      nombre: "Pablo Pérez",
      resto: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:Teatro_de_la_Paz.jpg",
    });
    expect(partesCreditoFoto("Pablo Pérez (https://commons.wikimedia.org/wiki/User:PP) · CC BY 4.0")).toEqual({ nombre: "Pablo Pérez", resto: "CC BY 4.0", url: "https://commons.wikimedia.org/wiki/User:PP" });
  });
  it("y también suelta al final, con o sin «·» antes", () => {
    expect(partesCreditoFoto("Ana López · CC0 https://flickr.com/x")).toEqual({ nombre: "Ana López", resto: "CC0", url: "https://flickr.com/x" });
    expect(partesCreditoFoto("Ana López · CC BY 4.0 · https://flickr.com/x")).toEqual({ nombre: "Ana López", resto: "CC BY 4.0", url: "https://flickr.com/x" });
  });
  it("una dirección que no es http(s) se queda como texto", () => {
    expect(partesCreditoFoto("Ana · CC BY (javascript:alert(1))")?.url).toBeNull();
    expect(partesCreditoFoto("Ana · ftp://x.org/y")).toEqual({ nombre: "Ana", resto: "ftp://x.org/y", url: null });
  });
  it("solo la dirección: enlaza su dominio, sin inventar un autor", () => {
    expect(partesCreditoFoto("https://www.flickr.com/photos/x/1")).toEqual({ nombre: "flickr.com", resto: "", url: "https://www.flickr.com/photos/x/1" });
  });
});
