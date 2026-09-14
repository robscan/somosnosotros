import { describe, expect, it } from "vitest";
import { artistaIgual, conProximaFecha, deducirTipoArtista, etiquetaArtista, filtrarArtistas, ordenarArtistas, quienDesdeJson, textoProximaFecha, unirNombres, validarArtista } from "./artistas";

describe("deducirTipoArtista", () => {
  it("propone grupo o colectivo por el nombre; solista se queda sin propuesta", () => {
    expect(deducirTipoArtista("Los Vecinos")).toBe("grupo");
    expect(deducirTipoArtista("Trío Xochitl")).toBe("grupo");
    expect(deducirTipoArtista("Compañía Trasluz")).toBe("grupo");
    expect(deducirTipoArtista("Colectivo Barro Vivo")).toBe("colectivo");
    expect(deducirTipoArtista("Mariana Ledesma")).toBeNull();
    expect(deducirTipoArtista("Loscuras")).toBeNull();
  });
});

describe("etiquetaArtista", () => {
  it("usa el detalle si lo hay, la disciplina si no, y avisa si está por completar", () => {
    expect(etiquetaArtista({ disciplina: "musica", detalle: "son huasteco", tipo: "grupo" })).toBe("Son huasteco · Grupo");
    expect(etiquetaArtista({ disciplina: "teatro", detalle: null, tipo: "colectivo" })).toBe("Teatro · Colectivo");
    expect(etiquetaArtista({ disciplina: "por_completar", detalle: null, tipo: "solista" })).toBe("Ficha por completar");
  });
});

describe("ordenarArtistas y filtrarArtistas", () => {
  const base = { disciplina: "musica" as const, detalle: null, tipo: "grupo" as const, foto: null };
  const lista = [
    { ...base, id: "1", nombre: "Zeta", proxima: null },
    { ...base, id: "2", nombre: "Beta", proxima: { id: "e2", inicio: "2026-09-20T01:00:00Z", sitio: "Foro" } },
    { ...base, id: "3", nombre: "Alfa", proxima: null },
    { ...base, id: "4", nombre: "Gamma", proxima: { id: "e4", inicio: "2026-09-15T01:00:00Z", sitio: "Casa" } },
  ];
  it("con fechas primero (por fecha), luego alfabético", () => {
    expect(ordenarArtistas(lista).map((a) => a.nombre)).toEqual(["Gamma", "Beta", "Alfa", "Zeta"]);
  });
  it("busca por nombre o detalle, sin acentos", () => {
    const l = [{ nombre: "Trío Xóchitl", detalle: "son huasteco" }, { nombre: "Pedro Ibarra", detalle: "jazz" }];
    expect(filtrarArtistas(l, "xochitl").map((a) => a.nombre)).toEqual(["Trío Xóchitl"]);
    expect(filtrarArtistas(l, "JAZZ").map((a) => a.nombre)).toEqual(["Pedro Ibarra"]);
    expect(filtrarArtistas(l, "")).toHaveLength(2);
  });
  it("encuentra al igual sin acentos ni mayúsculas", () => {
    expect(artistaIgual([{ nombre: "Trío Xóchitl" }], " trio xochitl ")?.nombre).toBe("Trío Xóchitl");
    expect(artistaIgual([{ nombre: "Trío Xóchitl" }], "trio")).toBeNull();
  });
});

describe("conProximaFecha y textoProximaFecha", () => {
  it("toma la fecha más cercana de cada artista y la escribe con el sitio", () => {
    const r = conProximaFecha([{ id: "a" }, { id: "b" }], [
      { artista_id: "a", evento: { id: "e2", inicio: "2026-09-20T01:00:00Z", sitio: "Foro" } },
      { artista_id: "a", evento: { id: "e1", inicio: "2026-09-15T01:00:00Z", sitio: "Casa" } },
    ]);
    expect(r[0].proxima?.id).toBe("e1");
    expect(r[1].proxima).toBeNull();
    const ahora = new Date("2026-09-14T18:00:00Z");
    expect(textoProximaFecha({ id: "e1", inicio: "2026-09-15T01:30:00Z", sitio: "Casa" }, ahora)).toMatch(/^Próximo: hoy · 19:30 · Casa$/);
  });
});

describe("unirNombres", () => {
  it("une con comas y una 'y' final", () => {
    expect(unirNombres([])).toBe("");
    expect(unirNombres(["A"])).toBe("A");
    expect(unirNombres(["A", "B"])).toBe("A y B");
    expect(unirNombres(["A", "B", "C"])).toBe("A, B y C");
  });
});

describe("quienDesdeJson", () => {
  it("acepta registrados y por crear, limpia, quita repetidos y tope de seis", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    expect(quienDesdeJson(JSON.stringify([{ id, nombre: " Los  Vecinos " }, { nombre: "los vecinos" }, { nombre: "Trío Xochitl" }, { id: "no-es-uuid", nombre: "X" }]))).toEqual([
      { id, nombre: "Los Vecinos" },
      { nombre: "Trío Xochitl" },
      { nombre: "X" },
    ]);
    expect(quienDesdeJson("no es json")).toEqual([]);
    expect(quienDesdeJson("")).toEqual([]);
    expect(quienDesdeJson(JSON.stringify(Array.from({ length: 9 }, (_, i) => ({ nombre: `A${i}` }))))).toHaveLength(6);
  });
});

describe("validarArtista", () => {
  it("acepta lo mínimo y limpia", () => {
    const { datos, errores } = validarArtista({ nombre: "  Los Vecinos ", disciplina: "musica", detalle: "son huasteco", tipo: "grupo", instagram: "@losvecinos", foto: "" });
    expect(errores).toEqual({});
    expect(datos).toMatchObject({ nombre: "Los Vecinos", disciplina: "musica", detalle: "son huasteco", tipo: "grupo", foto: null, redes: { instagram: "@losvecinos" } });
  });
  it("avisa del nombre vacío, la disciplina desconocida y el WhatsApp corto", () => {
    const { errores } = validarArtista({ nombre: "", disciplina: "pintura", tipo: "grupo", whatsapp: "123" });
    expect(errores.nombre).toBeDefined();
    expect(errores.disciplina).toBeDefined();
    expect(errores.whatsapp).toBeDefined();
  });
});
