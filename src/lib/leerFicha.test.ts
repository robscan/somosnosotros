import { afterEach, describe, expect, it, vi } from "vitest";
import { ERROR_FICHA, leerFicha } from "./leerFicha";

const FILA = { id: "1", nombre: "Ficha" };
const ok = (data: unknown) => () => Promise.resolve({ data, error: null });
const error = () => Promise.resolve({ data: null, error: { code: "402", message: "secreto-remoto" } });

describe("leerFicha: encontrada, no existe, o falló la lectura (OL-289)", () => {
  const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
  afterEach(() => aviso.mockClear());

  it("devuelve la fila del slug sin preguntar por el UUID", async () => {
    const porId = vi.fn(ok(FILA));
    expect(await leerFicha("evento", ok(FILA), porId)).toEqual(FILA);
    expect(porId).not.toHaveBeenCalled();
  });

  it("sin fila por slug y sin UUID: null (no existe), sin avisos", async () => {
    expect(await leerFicha("lugar", ok(null), null)).toBeNull();
    expect(aviso).not.toHaveBeenCalled();
  });

  it("sin fila por slug pregunta por el UUID: lo encuentra o confirma que no existe", async () => {
    expect(await leerFicha("artista", ok(null), ok(FILA))).toEqual(FILA);
    expect(await leerFicha("artista", ok(null), ok(null))).toBeNull();
    expect(aviso).not.toHaveBeenCalled();
  });

  it("un error por slug lanza, sin pasar a la segunda consulta", async () => {
    const porId = vi.fn(ok(FILA));
    await expect(leerFicha("evento", error, porId)).rejects.toThrow(ERROR_FICHA);
    expect(porId).not.toHaveBeenCalled();
  });

  it("un error por UUID (tras no hallar el slug) también lanza: no es «no existe»", async () => {
    await expect(leerFicha("evento", ok(null), error)).rejects.toThrow(ERROR_FICHA);
  });

  it("un error con datos de relleno lanza (error manda sobre data)", async () => {
    await expect(leerFicha("lugar", () => Promise.resolve({ data: FILA, error: { message: "x" } }), null)).rejects.toThrow(ERROR_FICHA);
  });

  it("una promesa rechazada (transporte caído) lanza el mismo error genérico, sin el detalle", async () => {
    const caido = () => Promise.reject(new Error("fetch failed: 10.0.0.1"));
    await expect(leerFicha("artista", caido, null)).rejects.toThrow(ERROR_FICHA);
    await expect(leerFicha("artista", caido, null)).rejects.toThrow(expect.objectContaining({ message: ERROR_FICHA }));
  });

  it("la traza dice qué lectura falló y nada de la respuesta remota", async () => {
    await expect(leerFicha("evento", error, null)).rejects.toThrow();
    expect(aviso).toHaveBeenCalledTimes(1);
    expect(aviso).toHaveBeenCalledWith("[ficha] lectura no disponible: evento");
    expect(JSON.stringify(aviso.mock.calls)).not.toContain("secreto-remoto");
  });
});
