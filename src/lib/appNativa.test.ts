import { describe, expect, it } from "vitest";
import { esAppNativa, GUION_APP_NATIVA, MARCA_USER_AGENT } from "./appNativa";

describe("detectar la app de iPhone por el user-agent", () => {
  it("con el sello que añade Capacitor, es la app", () => {
    expect(esAppNativa(`Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 ${MARCA_USER_AGENT}`)).toBe(true);
  });
  it("un iPhone con Safari normal no lo trae", () => {
    expect(esAppNativa("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")).toBe(false);
  });
  it("vacío no cuenta", () => {
    expect(esAppNativa("")).toBe(false);
  });
});

describe("el guion que pone la clase en <html>", () => {
  it("lleva el sello y el nombre de la clase, listo para inyectarse antes de React", () => {
    expect(GUION_APP_NATIVA).toContain(MARCA_USER_AGENT);
    expect(GUION_APP_NATIVA).toContain("app-nativa");
    expect(GUION_APP_NATIVA).toContain("navigator.userAgent");
  });
});
