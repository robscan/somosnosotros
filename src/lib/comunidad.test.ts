import { describe, expect, it } from "vitest";
import { correoCambioEvento, correoNuevoEvento, correoRecordatorio, enmascararCorreo, resumenAsistentes, textoCambio } from "./comunidad";

describe("resumenAsistentes", () => {
  const a = (nombre: string) => ({ id: nombre, nombre, foto: null });
  it("resume en palabras", () => {
    expect(resumenAsistentes([])).toBe("");
    expect(resumenAsistentes([a("Ana López")])).toBe("Va Ana");
    expect(resumenAsistentes([a("Ana"), a("Luis")])).toBe("Van 2: Ana y Luis");
    expect(resumenAsistentes([a("Ana"), a("Luis"), a("Mar")])).toBe("Van 3: Ana, Luis y 1 más");
  });
});

describe("resumenAsistentes con reservados", () => {
  it("cuenta a los reservados sin nombre", () => {
    expect(resumenAsistentes([{ id: "a", nombre: "Ana López", foto: null }], 2, 3)).toBe("Van 3: Ana y 2 más");
    expect(resumenAsistentes([], 2, 2)).toBe("Van 2");
    expect(resumenAsistentes([], 2, 1)).toBe("Va 1 persona");
  });
});

describe("correos", () => {
  it("nuevo evento: asunto con el lugar, enlace y cómo apagar avisos", () => {
    const c = correoNuevoEvento({ titulo: "Noche de jazz", cuando: "sáb 26 de sep · 20:00", lugar: "Casa 1100", eventoId: "abc" });
    expect(c.asunto).toBe("Nuevo en Casa 1100: Noche de jazz");
    expect(c.texto).toContain("https://somosnosotros.org/eventos/abc");
    expect(c.texto).toContain("/perfil");
    expect(c.html).toContain("<strong>Noche de jazz</strong>");
  });
  it("cambio: dice qué cambió y cómo queda", () => {
    const c = correoCambioEvento({ titulo: "Noche de jazz", cuando: "dom 27 de sep · 20:00", lugar: "Casa 1100", eventoId: "abc", cambio: "ambos" });
    expect(c.asunto).toBe("Cambió la fecha y el lugar: Noche de jazz");
    expect(c.texto).toContain("Ahora es: dom 27 de sep · 20:00 · Casa 1100");
    expect(textoCambio("cuando")).toBe("la fecha");
    expect(textoCambio("donde")).toBe("el lugar");
  });
  it("recordatorio: asunto Hoy y escape de HTML", () => {
    const c = correoRecordatorio({ titulo: "Taller <niños>", cuando: "Hoy · 17:00", lugar: "Biblioteca", eventoId: "x" });
    expect(c.asunto).toBe("Hoy: Taller <niños>");
    expect(c.html).toContain("Taller &lt;niños&gt;");
  });
});

describe("enmascararCorreo", () => {
  it("deja dos letras y el dominio", () => {
    expect(enmascararCorreo("robscan@gmail.com")).toBe("ro…@gmail.com");
    expect(enmascararCorreo("a@b.mx")).toBe("a…@b.mx");
    expect(enmascararCorreo("sin-arroba")).toBe("sin-arroba");
  });
});
