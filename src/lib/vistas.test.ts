import { describe, expect, it } from "vitest";
import { origenDeConsulta, origenDeVista } from "./vistas";

/** OL-461 (bitácora 493): de qué red llegó una vista, de la marca de origen del enlace; listas cerradas. */
describe("origenDeVista", () => {
  it("instagram o facebook, post o story", () => {
    expect(origenDeVista("facebook", "post")).toEqual({ origen: "facebook", medio: "post" });
    expect(origenDeVista("instagram", "story")).toEqual({ origen: "instagram", medio: "story" });
  });
  it("lo demás no se guarda; sin red no hay medio", () => {
    expect(origenDeVista("tiktok", "post")).toEqual({ origen: null, medio: null });
    expect(origenDeVista("facebook", "reel")).toEqual({ origen: "facebook", medio: null });
    expect(origenDeVista(undefined, "post")).toEqual({ origen: null, medio: null });
    expect(origenDeVista({ toString: () => "facebook" }, "post")).toEqual({ origen: null, medio: null });
    expect(origenDeVista("Facebook", "post")).toEqual({ origen: null, medio: null });
  });
});

describe("origenDeConsulta", () => {
  it("lee utm_source y utm_medium de la dirección; ignora lo demás", () => {
    expect(origenDeConsulta("?utm_source=facebook&utm_medium=post&utm_campaign=11111111-1111-4111-8111-111111111111")).toEqual({ origen: "facebook", medio: "post" });
    expect(origenDeConsulta("?utm_source=newsletter")).toEqual({ origen: null, medio: null });
    expect(origenDeConsulta("")).toEqual({ origen: null, medio: null });
  });
});
