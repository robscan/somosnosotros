import { describe, expect, it } from "vitest";
import { siguienteEstadoLetrero } from "./letreroCorreoLigado";

describe("siguienteEstadoLetrero", () => {
  it("correo coincidente: aprobado, sin mensaje de error", () => {
    expect(siguienteEstadoLetrero({ ok: true, aprobado: true })).toEqual({ estado: "aprobado" });
  });
  it("sin coincidencia: enviada (queda un reclamo pendiente para el administrador)", () => {
    expect(siguienteEstadoLetrero({ ok: true, aprobado: false })).toEqual({ estado: "enviada" });
  });
  it("fallo del servidor: error, con el mensaje que trae reclamarArtista", () => {
    expect(siguienteEstadoLetrero({ ok: false, error: "No se pudo enviar. Intenta de nuevo." })).toEqual({ estado: "error", error: "No se pudo enviar. Intenta de nuevo." });
  });
  it("fallo sin mensaje: cae a uno genérico, nunca vacío", () => {
    expect(siguienteEstadoLetrero({ ok: false, error: "" })).toEqual({ estado: "error", error: "No se pudo enviar. Intenta de nuevo." });
  });
});
