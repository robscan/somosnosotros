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

  it("rechaza controles en cualquier parte, incluidos los que URL omite entre barras", () => {
    for (const codigo of [...Array.from({ length: 32 }, (_, i) => i), 127]) {
      const control = String.fromCharCode(codigo);
      for (const entrada of [`/${control}/example.test`, `/perfil?x=${control}`, `/perfil#${control}`]) {
        const salida = rutaSegura(entrada, "/perfil");
        expect(salida, JSON.stringify(entrada)).toBe("/perfil");
        expect(new URL(salida, "https://somosnosotros.org").origin).toBe("https://somosnosotros.org");
      }
    }
  });

  it("rechaza barras inversas y autoridades, también si aparecen al normalizar segmentos", () => {
    for (const entrada of ["/\\example.test", "/a\\..\\example.test", "///example.test", "/a/..//example.test", "/a/%2e%2e//example.test", "/.//example.test"]) {
      expect(rutaSegura(entrada, "/perfil"), entrada).toBe("/perfil");
    }
  });

  it("conserva búsqueda y fragmento de destinos internos y normaliza segmentos", () => {
    expect(rutaSegura("/lugares/../perfil?panel=avisos#correo")).toBe("/perfil?panel=avisos#correo");
    expect(rutaSegura("/eventos/abc?accion=voy#horario")).toBe("/eventos/abc?accion=voy#horario");
    expect(rutaSegura("/buscar?q=https%3A%2F%2Fexample.test")).toBe("/buscar?q=https%3A%2F%2Fexample.test");
    expect(rutaSegura("/buscar?q=hola mundo")).toBe("/buscar?q=hola%20mundo");
  });

  it("los destinos siguen siendo internos al reutilizarlos y respeta el fallback vacío del alta", () => {
    for (const entrada of ["/perfil", "/eventos/abc?accion=voy#horario", "/a/../perfil", "/a/..//example.test", "/\t/example.test"]) {
      const salida = rutaSegura(entrada);
      expect(rutaSegura(salida)).toBe(salida);
      for (const origen of ["https://somosnosotros.org", "http://localhost:3121"]) {
        expect(new URL(salida, origen).origin).toBe(origen);
      }
    }
    expect(rutaSegura("//example.test", "")).toBe("");
    expect(rutaSegura(null, "")).toBe("");
  });
});
