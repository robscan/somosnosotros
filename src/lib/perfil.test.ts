import { describe, expect, it } from "vitest";
import { correoValido, textoAvisos, textoCompartirPersona, validarPerfil } from "./perfil";

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

describe("textoAvisos", () => {
  it("dice por dónde llegan los avisos, o que no hay", () => {
    expect(textoAvisos(true, true)).toBe("Por correo y en el teléfono");
    expect(textoAvisos(true, false)).toBe("Por correo");
    expect(textoAvisos(false, true)).toBe("En el teléfono");
    expect(textoAvisos(false, false)).toBe("Sin avisos");
  });
});

describe("textoCompartirPersona", () => {
  it("cuenta los eventos próximos y distingue mi ficha de la ajena", () => {
    expect(textoCompartirPersona("Rosa", 2, false)).toBe("Rosa va a 2 eventos próximos en San Luis Potosí. Mira cuáles:");
    expect(textoCompartirPersona("Rosa", 1, true)).toBe("Voy a 1 evento próximo en San Luis Potosí. Mira cuál:");
    expect(textoCompartirPersona("Rosa", 0, false)).toContain("Rosa está en Somos Nosotros");
  });
});
