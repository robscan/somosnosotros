import { describe, expect, it } from "vitest";
import { rutaSegura } from "./rutas";

describe("rutaSegura", () => {
  it("acepta rutas internas", () => {
    expect(rutaSegura("/perfil")).toBe("/perfil");
    expect(rutaSegura("/lugares/abc?x=1")).toBe("/lugares/abc?x=1");
  });
  it("rechaza externas, protocolo-relativas y vacías", () => {
    expect(rutaSegura("https://malo.com")).toBe("/");
    expect(rutaSegura("//malo.com")).toBe("/");
    expect(rutaSegura("/\\malo.com")).toBe("/");
    expect(rutaSegura(null, "/perfil")).toBe("/perfil");
    expect(rutaSegura("")).toBe("/");
  });
});
