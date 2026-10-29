import { describe, expect, it } from "vitest";
import { claveDeVuelta, estadoConexion, fechaConexion, FRASES_CONEXION, type FilaConexion } from "./conexionEstado";

// OL-471 (bitácora 503): lo que dice el bloque «Conexión» de Administración › Instagram.
const AHORA = new Date("2026-10-28T18:00:00Z");
const TODOS = ["business_management", "instagram_basic", "instagram_content_publish", "instagram_manage_insights", "pages_manage_posts", "pages_read_engagement", "pages_show_list"];
const fila = (permisos = TODOS): FilaConexion => ({ pagina_nombre: "Somos Nosotrxs", instagram_usuario: "smsnstrsapp", permisos, conectado_en: "2026-10-28T17:00:00Z" });

describe("estadoConexion", () => {
  it("conectada con todo: quién, qué puede y desde cuándo", () => {
    expect(estadoConexion(fila(), true, AHORA)).toEqual({ titulo: "Conectada como Somos Nosotrxs (@smsnstrsapp)", detalle: "Publica y lee cuentas · desde el 28 de octubre", falta: false, boton: "Reconectar" });
  });
  it("sin el permiso de leer cuentas: pide reconectar", () => {
    const e = estadoConexion(fila(TODOS.filter((p) => p !== "instagram_manage_insights")), true, AHORA);
    expect(e).toMatchObject({ detalle: "Falta el permiso para leer cuentas: reconecta", falta: true, boton: "Reconectar" });
  });
  it("sin el permiso de la página de Facebook: publica solo en Instagram", () => {
    expect(estadoConexion(fila(TODOS.filter((p) => p !== "pages_manage_posts")), true, AHORA).detalle).toBe("Publica solo en Instagram y lee cuentas · desde el 28 de octubre");
  });
  it("sin conexión propia: usa el token de respaldo (o no hay ninguno)", () => {
    expect(estadoConexion(null, true, AHORA)).toEqual({ titulo: "Sin conexión propia", detalle: "Usa el token de respaldo", falta: false, boton: "Conectar Instagram" });
    expect(estadoConexion(null, false, AHORA)).toMatchObject({ titulo: "Sin conexión", falta: true, boton: "Conectar Instagram" });
  });
  it("la fecha en la hora de México, con el año si no es este", () => {
    expect(fechaConexion(new Date("2026-10-29T03:00:00Z"), AHORA)).toBe("28 de octubre");
    expect(fechaConexion(new Date("2025-12-01T18:00:00Z"), AHORA)).toBe("1 de diciembre de 2025");
  });
});

describe("claveDeVuelta", () => {
  it("solo las claves conocidas", () => {
    expect(claveDeVuelta("conectado")).toBe("conectado");
    expect(claveDeVuelta("pagina")).toBe("pagina");
    expect(claveDeVuelta("<script>")).toBeNull();
    expect(claveDeVuelta("toString")).toBeNull();
    expect(claveDeVuelta(null)).toBeNull();
  });
  it("las frases no llevan nada técnico", () => {
    for (const f of Object.values(FRASES_CONEXION)) expect(f).not.toMatch(/token|oauth|state|http|error|[0-9]{3}/i);
  });
});
