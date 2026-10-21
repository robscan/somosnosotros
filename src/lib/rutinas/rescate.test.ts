import { describe, expect, it, vi } from "vitest";
import { corridasVaradas, MAX_RESCATES, rescatarVaradas, VARADA_MS } from "./rescate";

const AHORA = new Date("2026-10-20T03:19:00Z");
const hace = (ms: number) => new Date(AHORA.getTime() - ms).toISOString();

describe("la red de seguridad de Ciudades (OL-429)", () => {
  it("varada: la de San Luis (corriendo, sin dueño, siete minutos sin avanzar) y una pendiente cuyo primer paso se perdió", () => {
    const sanLuis = { id: "L", estado: "corriendo", creado_en: hace(7 * 60_000), inicio: hace(7 * 60_000), resumen: { paso: "2 de 3 fuentes", turno: 1, ocupada_hasta: null, intentos: 0 } };
    const pendiente = { id: "P", estado: "pendiente", creado_en: hace(3 * 60_000), resumen: {} };
    expect(corridasVaradas([pendiente, sanLuis], AHORA)).toEqual(["L", "P"]);
  });

  it("no varada: la que alguien trabaja (ocupada), la que acaba de avanzar, la pendiente recién creada y las que ya acabaron", () => {
    const corridas = [
      { id: "ocupada", estado: "corriendo", creado_en: hace(600_000), resumen: { ocupada_hasta: new Date(AHORA.getTime() + 60_000).toISOString(), actualizada: hace(600_000) } },
      { id: "reciente", estado: "corriendo", creado_en: hace(600_000), resumen: { ocupada_hasta: null, actualizada: hace(VARADA_MS - 1_000) } },
      { id: "nueva", estado: "pendiente", creado_en: hace(30_000), resumen: {} },
      { id: "fin", estado: "terminada", creado_en: hace(600_000), resumen: {} },
      { id: "cancelada", estado: "cancelada", creado_en: hace(600_000), resumen: {} },
    ];
    expect(corridasVaradas(corridas, AHORA)).toEqual([]);
    // Una ocupada cuyo plazo venció (el paso se cayó) sí lo está.
    expect(corridasVaradas([{ ...corridas[0], resumen: { ocupada_hasta: hace(1_000), actualizada: hace(600_000) } }], AHORA)).toEqual(["ocupada"]);
  });

  it("pide un paso por corrida varada, como mucho tres; sin varadas, ninguno", async () => {
    const disparar = vi.fn(async () => "disparado");
    const varadas = Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, estado: "pendiente", creado_en: hace(10 * 60_000 + i), resumen: {} }));
    expect(await rescatarVaradas(varadas, AHORA, disparar)).toBe(MAX_RESCATES);
    expect(disparar).toHaveBeenCalledTimes(3);
    expect(await rescatarVaradas([], AHORA, disparar)).toBe(0);
    expect(disparar).toHaveBeenCalledTimes(3);
  });
});
