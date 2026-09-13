import { describe, expect, it, vi } from "vitest";
import { calcularEstado } from "./estado";
import type { Config } from "./config";

const base: Config = {
  mapboxToken: "pk.abc",
  mapboxStyle: "mapbox://styles/mapbox/light-v11",
  supabaseUrl: "https://x.supabase.co/",
  supabaseAnonKey: "sb_publishable_123",
};

describe("calcularEstado", () => {
  it("sin Supabase configurado no llama a la red", async () => {
    const f = vi.fn();
    const e = await calcularEstado({ ...base, supabaseUrl: null }, f);
    expect(e).toEqual({ mapbox: "configurado", supabase: "falta" });
    expect(f).not.toHaveBeenCalled();
  });

  it("reporta falta de token de Mapbox sin exponer valores", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    const e = await calcularEstado({ ...base, mapboxToken: null }, f);
    expect(e.mapbox).toBe("falta");
    expect(JSON.stringify(e)).not.toContain("sb_publishable");
  });

  it("consulta /auth/v1/health con la llave y devuelve ok", async () => {
    const f = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () => new Response("{}", { status: 200 }),
    );
    const e = await calcularEstado(base, f);
    expect(e.supabase).toBe("ok");
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://x.supabase.co/auth/v1/health");
    expect((init?.headers as Record<string, string>).apikey).toBe("sb_publishable_123");
  });

  it("un status no-2xx o una excepción se reportan como error", async () => {
    const e1 = await calcularEstado(base, async () => new Response("", { status: 401 }));
    expect(e1).toMatchObject({ supabase: "error", detalle: "Supabase respondió 401" });
    const e2 = await calcularEstado(base, async () => {
      throw new Error("sin red");
    });
    expect(e2).toMatchObject({ supabase: "error", detalle: "sin red" });
  });
});
