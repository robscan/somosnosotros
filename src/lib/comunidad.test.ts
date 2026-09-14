import { describe, expect, it } from "vitest";
import { correoNuevoEvento, correoRecordatorio, resumenAsistentes } from "./comunidad";

describe("resumenAsistentes", () => {
  const a = (nombre: string) => ({ id: nombre, nombre, foto: null });
  it("resume en palabras", () => {
    expect(resumenAsistentes([])).toBe("");
    expect(resumenAsistentes([a("Ana López")])).toBe("Va Ana");
    expect(resumenAsistentes([a("Ana"), a("Luis")])).toBe("Van 2: Ana y Luis");
    expect(resumenAsistentes([a("Ana"), a("Luis"), a("Mar")])).toBe("Van 3: Ana, Luis y 1 más");
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
  it("recordatorio: asunto Hoy y escape de HTML", () => {
    const c = correoRecordatorio({ titulo: "Taller <niños>", cuando: "Hoy · 17:00", lugar: "Biblioteca", eventoId: "x" });
    expect(c.asunto).toBe("Hoy: Taller <niños>");
    expect(c.html).toContain("Taller &lt;niños&gt;");
  });
});
