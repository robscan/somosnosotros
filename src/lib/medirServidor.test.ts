import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.fn();
const tareas: (() => Promise<void>)[] = [];
vi.mock("@vercel/analytics/server", () => ({ track: (...a: unknown[]) => track(...a) }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "user-agent": "Prueba/1.0", "x-forwarded-for": "203.0.113.7", cookie: "sb-sesion=secreta", referer: "https://somosnosotros.org/nuevo/lugar?nombre=Casa" }),
}));
vi.mock("next/server", () => ({ after: (f: () => Promise<void>) => tareas.push(f) }));

import { medirServidor } from "./medirServidor";

const correr = async () => {
  for (const t of tareas.splice(0)) await t();
};

beforeEach(() => {
  track.mockReset();
  tareas.length = 0;
  vi.stubEnv("VERCEL_ENV", "production");
});
afterEach(() => vi.unstubAllEnvs());

describe("medirServidor (OL-325)", () => {
  it("en producción manda a Vercel después de la respuesta, solo con el navegador y la IP (nunca las cookies)", async () => {
    await medirServidor("entrar", { paso: "listo", metodo: "apple" });
    expect(track).not.toHaveBeenCalled(); // aún no: va en `after`
    await correr();
    expect(track).toHaveBeenCalledWith("entrar", { paso: "listo", metodo: "apple" }, { headers: { "user-agent": "Prueba/1.0", "x-forwarded-for": "203.0.113.7" } });
    expect(JSON.stringify(track.mock.calls)).not.toContain("secreta");
    expect(JSON.stringify(track.mock.calls)).not.toContain("Casa");
  });
  it("fuera de producción no manda nada", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    await medirServidor("entrar", { paso: "fallo", metodo: "google" });
    await correr();
    expect(track).not.toHaveBeenCalled();
  });
  it("para la administración no manda nada", async () => {
    await medirServidor("entrar", { paso: "listo", metodo: "google" }, { esAdmin: async () => true });
    await correr();
    expect(track).not.toHaveBeenCalled();
  });
  it("lo que no está en la lista no sale", async () => {
    await (medirServidor as (n: string, d: unknown) => Promise<void>)("entrar", { paso: "listo", metodo: "correo", correo: "rosa@gmail.com" });
    await correr();
    expect(track).not.toHaveBeenCalled();
  });
  it("nunca lanza, aunque Vercel o la comprobación de admin fallen", async () => {
    track.mockRejectedValue(new Error("sin red"));
    await expect(medirServidor("entrar", { paso: "listo", metodo: "apple" })).resolves.toBeUndefined();
    await expect(correr()).resolves.toBeUndefined();
    await medirServidor("entrar", { paso: "listo", metodo: "apple" }, { esAdmin: async () => { throw new Error("sin base"); } });
    await expect(correr()).resolves.toBeUndefined();
  });
});
