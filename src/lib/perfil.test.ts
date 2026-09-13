import { describe, expect, it } from "vitest";
import { correoValido, validarPerfil } from "./perfil";

describe("validarPerfil", () => {
  it("limpia espacios y acepta un perfil mínimo", () => {
    const { datos, errores } = validarPerfil({ nombre: "  Oscar   Muñiz ", colonia: "", bio: "" });
    expect(errores).toEqual({});
    expect(datos).toEqual({ nombre: "Oscar Muñiz", colonia: "", bio: "", foto: null });
  });
  it("pide nombre y limita largos", () => {
    const { errores } = validarPerfil({ nombre: "", colonia: "x".repeat(61), bio: "y".repeat(141) });
    expect(errores.nombre).toBeTruthy();
    expect(errores.colonia).toBeTruthy();
    expect(errores.bio).toBeTruthy();
  });
  it("la foto debe ser una URL https o nada", () => {
    expect(validarPerfil({ nombre: "A", foto: "https://x.supabase.co/storage/v1/object/public/fotos/a.jpg" }).errores.foto).toBeUndefined();
    expect(validarPerfil({ nombre: "A", foto: "javascript:alert(1)" }).errores.foto).toBeTruthy();
    expect(validarPerfil({ nombre: "A", foto: "" }).datos.foto).toBeNull();
  });
});

describe("correoValido", () => {
  it("distingue correos con forma de correo", () => {
    expect(correoValido("alguien@ejemplo.org")).toBe(true);
    expect(correoValido(" alguien@ejemplo.org ")).toBe(true);
    expect(correoValido("alguien")).toBe(false);
    expect(correoValido("a@b")).toBe(false);
  });
});
