import { describe, expect, it, vi } from "vitest";

vi.mock("./config", () => ({ configPublica: vi.fn() }));
import { configPublica } from "./config";
import { urlMapaFicha, urlMapaSedes } from "./mapaEstatico";

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
    expect(url).toBe("https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-s+6d34c8(-100.97,22.16)/-100.97,22.16,15,0/600x250@2x?access_token=tok123");
  });
});

describe("urlMapaSedes (OL-339)", () => {
  const conToken = (mapboxToken: string | null) => mock.mockReturnValue({ mapboxToken, mapboxStyle: "mapbox://styles/robscan/flowya-light", supabaseUrl: null, supabaseAnonKey: null });

  it("con varias sedes, un pin por cada una y el encuadre que las abarca (`auto`), con aire alrededor", () => {
    conToken("tok");
    const url = urlMapaSedes([
      { lat: 22.144, lng: -101.015 },
      { lat: 22.1517, lng: -100.9761 },
    ]);
    expect(url).toBe("https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-s+6d34c8(-101.015,22.144),pin-s+6d34c8(-100.9761,22.1517)/auto/600x250@2x?padding=40&access_token=tok");
  });

  it("con una sola es el mapa de siempre; sin ninguna o sin token, nada", () => {
    conToken("tok");
    expect(urlMapaSedes([{ lat: 22.16, lng: -100.97 }])).toBe(urlMapaFicha({ lat: 22.16, lng: -100.97 }));
    expect(urlMapaSedes([])).toBeNull();
    conToken(null);
    expect(urlMapaSedes([{ lat: 22.16, lng: -100.97 }, { lat: 22.15, lng: -100.98 }])).toBeNull();
  });

  it("a lo más 25 pines (la dirección de la imagen tiene tope)", () => {
    conToken("tok");
    const muchas = Array.from({ length: 40 }, (_, i) => ({ lat: 22 + i / 1000, lng: -101 }));
    expect(urlMapaSedes(muchas)?.match(/pin-s\+/g)).toHaveLength(25);
  });
});
