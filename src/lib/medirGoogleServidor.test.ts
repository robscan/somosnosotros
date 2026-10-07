import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientIdAleatorio, cuerpoGoogle, enviarAGoogle, ESPERA_MS, urlGoogle } from "./medirGoogleServidor";

const ID = "G-PRUEBA1234"; // inventado
const SECRETO = "secreto-de-prueba"; // inventado

const red = vi.fn();
beforeEach(() => {
  red.mockReset();
  red.mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", red);
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_GA_ID", ID);
  vi.stubEnv("GA_API_SECRET", SECRETO);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Measurement Protocol de GA4 (OL-325)", () => {
  it("el cuerpo: un evento con sus datos, client_id, non_personalized_ads y nada más (sin user_id)", () => {
    expect(cuerpoGoogle("asistencia", { estado: "voy", cambio: "puesto" }, "1.2")).toEqual({
      client_id: "1.2",
      non_personalized_ads: true,
      events: [{ name: "asistencia", params: { estado: "voy", cambio: "puesto" } }],
    });
    expect(cuerpoGoogle("app_instalada", {}, "1.2")).not.toHaveProperty("user_id");
  });
  it("manda a mp/collect con el identificador y el secreto, el cuerpo en JSON y un tiempo de espera", async () => {
    expect(await enviarAGoogle("evento_creado", { cartel: "si" })).toBe(true);
    const [url, opciones] = red.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://www.google-analytics.com/mp/collect?measurement_id=${ID}&api_secret=${SECRETO}`);
    expect(opciones.method).toBe("POST");
    expect(opciones.signal).toBeInstanceOf(AbortSignal);
    expect(ESPERA_MS).toBe(1500);
    const cuerpo = JSON.parse(String(opciones.body));
    expect(cuerpo).toMatchObject({ non_personalized_ads: true, events: [{ name: "evento_creado", params: { cartel: "si" } }] });
    expect(cuerpo.client_id).toMatch(/^\d+\.\d+$/);
    expect(cuerpo).not.toHaveProperty("user_id");
  });
  it("el client_id cambia en cada envío", async () => {
    await enviarAGoogle("busqueda", { resultados: "si" });
    await enviarAGoogle("busqueda", { resultados: "si" });
    const ids = red.mock.calls.map((c) => JSON.parse(String((c[1] as RequestInit).body)).client_id);
    expect(ids[0]).not.toBe(ids[1]);
    const muchos = new Set(Array.from({ length: 200 }, clientIdAleatorio));
    expect(muchos.size).toBe(200);
  });
  it("fuera de producción no manda nada", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(await enviarAGoogle("busqueda", { resultados: "no" })).toBe(false);
    expect(red).not.toHaveBeenCalled();
  });
  it("sin secreto (o sin identificador válido) no manda nada", async () => {
    vi.stubEnv("GA_API_SECRET", "");
    expect(await enviarAGoogle("busqueda", { resultados: "no" })).toBe(false);
    vi.stubEnv("GA_API_SECRET", SECRETO);
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "UA-1-1");
    expect(await enviarAGoogle("busqueda", { resultados: "no" })).toBe(false);
    expect(red).not.toHaveBeenCalled();
    expect(urlGoogle({ VERCEL_ENV: "production", NEXT_PUBLIC_GA_ID: ID })).toBeNull();
  });
  it("un fallo de red o un tiempo agotado no lanza", async () => {
    red.mockRejectedValue(new TypeError("fetch failed"));
    await expect(enviarAGoogle("reporte", { que: "evento" })).resolves.toBe(false);
    red.mockRejectedValue(new DOMException("tiempo", "TimeoutError"));
    await expect(enviarAGoogle("reporte", { que: "evento" })).resolves.toBe(false);
    red.mockResolvedValue(new Response(null, { status: 500 }));
    await expect(enviarAGoogle("reporte", { que: "evento" })).resolves.toBe(false);
  });
});
