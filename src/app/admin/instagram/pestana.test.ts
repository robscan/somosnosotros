import { describe, expect, it } from "vitest";
import { pestanaDeLaDireccion, pestanaInicial, semanaConAlgo } from "./pestana";

// OL-495: la pestaña con la que abre Administración › Instagram.
const HOY = "2026-10-29";
const dia = (fecha: string, estado: string, extra: Record<string, unknown> = {}) => ({ fecha, estado, ...extra }) as never;

describe("pestanaInicial", () => {
  it("«Semana» si hay algo de hoy en adelante: programado, publicándose, publicado hoy o una sugerencia", () => {
    expect(pestanaInicial([dia("2026-10-30", "programado")], HOY)).toBe("semana");
    expect(pestanaInicial([dia(HOY, "hoy")], HOY)).toBe("semana");
    expect(pestanaInicial([dia(HOY, "publicando")], HOY)).toBe("semana");
    expect(pestanaInicial([dia(HOY, "publicado")], HOY)).toBe("semana");
    expect(pestanaInicial([dia("2026-10-31", "sin", { sugerencia: { nombre: "x" } })], HOY)).toBe("semana");
  });
  it("«Eventos» si no: lo publicado antes de hoy, los días pasados, el descanso y «nadie con material» no cuentan", () => {
    expect(pestanaInicial([dia("2026-10-27", "publicado"), dia("2026-10-28", "programado", { pasado: "Mié 28 · …" })], HOY)).toBe("eventos");
    expect(pestanaInicial([dia("2026-10-30", "descanso", { nadie: { abreFalta: true } }), dia("2026-11-01", "descanso"), dia("2026-10-31", "sin"), dia("2026-10-31", "fallido")], HOY)).toBe("eventos");
    expect(pestanaInicial([], HOY)).toBe("eventos");
    expect(pestanaInicial(null, HOY)).toBe("eventos");
  });
  it("semanaConAlgo dice lo mismo", () => {
    expect(semanaConAlgo([dia("2026-10-30", "programado")], HOY)).toBe(true);
    expect(semanaConAlgo([dia("2026-10-30", "sin")], HOY)).toBe(false);
  });
});

describe("pestanaDeLaDireccion", () => {
  const p = (q: string) => pestanaDeLaDireccion(new URLSearchParams(q));
  it("la elegida, la del aviso o la que viene; si no, ninguna (manda la regla o la sesión)", () => {
    expect(p("pestana=eventos")).toBe("eventos");
    expect(p("pestana=semana&evento=x")).toBe("semana");
    expect(p("evento=x")).toBe("eventos");
    expect(p("dia=x")).toBe("semana");
    expect(p("semana=viene")).toBe("semana");
    expect(p("ciudad=queretaro")).toBeNull();
    expect(p("pestana=otra")).toBeNull();
  });
});
