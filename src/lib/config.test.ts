import { describe, expect, it } from "vitest";
import { ESTILO_CLARO_POR_DEFECTO, leerConfig } from "./config";

describe("leerConfig", () => {
  it("sin variables: todo null y estilo claro por defecto", () => {
    expect(leerConfig({})).toEqual({
      mapboxToken: null,
      mapboxStyle: ESTILO_CLARO_POR_DEFECTO,
      supabaseUrl: null,
      supabaseAnonKey: null,
    });
  });

  it("con variables: las devuelve recortadas y respeta el estilo propio", () => {
    const c = leerConfig({
      NEXT_PUBLIC_MAPBOX_TOKEN: " pk.abc ",
      NEXT_PUBLIC_MAPBOX_STYLE: "mapbox://styles/founder/claro",
      NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_123",
    });
    expect(c.mapboxToken).toBe("pk.abc");
    expect(c.mapboxStyle).toBe("mapbox://styles/founder/claro");
    expect(c.supabaseUrl).toBe("https://x.supabase.co");
    expect(c.supabaseAnonKey).toBe("sb_publishable_123");
  });

  it("una variable en blanco cuenta como ausente", () => {
    expect(leerConfig({ NEXT_PUBLIC_MAPBOX_TOKEN: "   " }).mapboxToken).toBeNull();
  });
});
