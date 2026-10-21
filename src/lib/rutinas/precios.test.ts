import { describe, expect, it } from "vitest";
import { costoDeUso, PRECIOS, precioDe, redondear, USD_POR_BUSQUEDA_WEB } from "./precios";

describe("costoDeUso: lo que cuesta una respuesta de la API", () => {
  it("cobra entrada, salida, caché y búsquedas con los precios de su modelo (Opus 5.5: 4 · 5 · 8 · 0,20 · 20 USD por millón)", () => {
    const uso = {
      input_tokens: 10_000,
      output_tokens: 2_000,
      cache_read_input_tokens: 50_000,
      cache_creation_input_tokens: 4_000,
      cache_creation: { ephemeral_5m_input_tokens: 3_000, ephemeral_1h_input_tokens: 1_000 },
      server_tool_use: { web_search_requests: 3, web_fetch_requests: 1 },
    };
    // 10 000×4 + 3 000×5 + 1 000×8 + 50 000×0,20 + 2 000×20 = 40 000 + 15 000 + 8 000 + 10 000 + 40 000 = 113 000 millonésimas
    // + 3 búsquedas × 0,01 (la lectura web no cobra aparte)
    expect(costoDeUso(uso, "claude-opus-5-5")).toBeCloseTo(0.113 + 0.03, 10);
  });

  it("sin el desglose por duración, la escritura de caché se cobra como la de 5 minutos", () => {
    expect(costoDeUso({ input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 1_000_000 }, "claude-opus-5-5")).toBeCloseTo(5, 10);
  });

  it("cada búsqueda web cuesta 10 USD por cada 1 000; una respuesta vacía, nada", () => {
    expect(USD_POR_BUSQUEDA_WEB).toBe(0.01);
    expect(costoDeUso({ input_tokens: 0, output_tokens: 0, server_tool_use: { web_search_requests: 4, web_fetch_requests: 2 } }, "claude-opus-5-5")).toBeCloseTo(0.04, 10);
    expect(costoDeUso(null, "claude-opus-5-5")).toBe(0);
    expect(costoDeUso({ input_tokens: -5, output_tokens: Number.NaN }, "claude-opus-5-5")).toBe(0);
  });

  it("cada modelo con su precio, y uno que no está en la tabla al más caro (el crédito nunca baja de menos)", () => {
    const uso = { input_tokens: 1_000_000, output_tokens: 1_000_000 };
    expect(costoDeUso(uso, "claude-sonnet-5-5")).toBeCloseTo(12, 10);
    // La lectura de caché de Sonnet 5.5: 0,20 USD por millón (la guía de la API).
    expect(costoDeUso({ cache_read_input_tokens: 1_000_000 }, "claude-sonnet-5-5")).toBeCloseTo(0.2, 10);
    expect(costoDeUso(uso, "claude-opus-5-5")).toBeCloseTo(24, 10);
    const masCaro = Math.max(...Object.values(PRECIOS).map((p) => p.entrada + p.salida));
    expect(costoDeUso(uso, "un-modelo-nuevo")).toBeCloseTo(masCaro, 10);
  });

  it("un nombre con fecha se cobra como su modelo (la clave más larga: Sonnet 5.5 no es Sonnet 5)", () => {
    expect(precioDe("claude-opus-5-5-20261001")).toBe(PRECIOS["claude-opus-5-5"]);
    expect(precioDe("claude-sonnet-5-5-20261001")).toBe(PRECIOS["claude-sonnet-5-5"]);
    expect(precioDe("claude-sonnet-5-20260801")).toBe(PRECIOS["claude-sonnet-5"]);
    expect(precioDe("claude-opus-5-55")).toBe(PRECIOS["claude-fable-5-1"]);
  });

  it("se guarda a la diezmilésima de dólar, como gasto_usd", () => {
    expect(redondear(0.123456)).toBe(0.1235);
    expect(redondear(2.99995)).toBe(3);
  });
});
