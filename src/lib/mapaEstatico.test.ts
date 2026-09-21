import { describe, expect, it, vi } from "vitest";

vi.mock("./config", () => ({ configPublica: vi.fn() }));
import { configPublica } from "./config";
import { urlMapaFicha } from "./mapaEstatico";

const mock = vi.mocked(configPublica);

describe("urlMapaFicha", () => {
  it("sin punto no fabrica nada", () => {
    mock.mockReturnValue({ mapboxToken: "tok", mapboxStyle: "mapbox://styles/robscan/flowya-light", supabaseUrl: null, supabaseAnonKey: null });
    expect(urlMapaFicha(null)).toBeNull();
  });

  it("sin token no fabrica nada, aunque haya punto", () => {
    mock.mockReturnValue({ mapboxToken: null, mapboxStyle: "mapbox://styles/robscan/flowya-light", supabaseUrl: null, supabaseAnonKey: null });
    expect(urlMapaFicha({ lat: 22.16, lng: -100.97 })).toBeNull();
  });

  it("arma la Static Images API con el estilo genérico claro (el de la cuenta usa imports, que esa API no resuelve), un pin y el token", () => {
    mock.mockReturnValue({ mapboxToken: "tok123", mapboxStyle: "mapbox://styles/robscan/flowya-light", supabaseUrl: null, supabaseAnonKey: null });
    const url = urlMapaFicha({ lat: 22.16, lng: -100.97 });
    expect(url).toBe("https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-s+0f6b7c(-100.97,22.16)/-100.97,22.16,15,0/600x170@2x?access_token=tok123");
  });
});
