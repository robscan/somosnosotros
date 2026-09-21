import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Un localStorage de mentira para probar sin jsdom (el entorno de pruebas es "node"). */
function crearAlmacenFalso() {
  const datos = new Map<string, string>();
  return {
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => void datos.set(clave, valor),
    removeItem: (clave: string) => void datos.delete(clave),
    clear: () => datos.clear(),
  };
}

describe("ubicación cercana (caché de frescura, OL-095 L25/L50)", () => {
  const ahora = new Date("2026-09-21T12:00:00Z");

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(ahora);
    vi.stubGlobal("window", { localStorage: crearAlmacenFalso() });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("sin nada guardado, no hay ubicación fresca", async () => {
    const { ubicacionCercanaFresca } = await import("./ubicacion");
    expect(ubicacionCercanaFresca()).toBeNull();
  });

  it("leerUbicacionCercana pide al navegador la primera vez y la guarda", async () => {
    const { leerUbicacionCercana, ubicacionCercanaFresca } = await import("./ubicacion");
    const getCurrentPosition = vi.fn((exito: PositionCallback) =>
      exito({ coords: { latitude: 22.15, longitude: -100.98 } } as GeolocationPosition),
    );
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

    const punto = await leerUbicacionCercana();
    expect(punto).toEqual({ lat: 22.15, lng: -100.98 });
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(ubicacionCercanaFresca()).toEqual({ lat: 22.15, lng: -100.98 });
  });

  it("con una posición fresca no vuelve a llamar al navegador (el bug de L25)", async () => {
    const { leerUbicacionCercana } = await import("./ubicacion");
    const getCurrentPosition = vi.fn((exito: PositionCallback) =>
      exito({ coords: { latitude: 22.15, longitude: -100.98 } } as GeolocationPosition),
    );
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

    await leerUbicacionCercana(); // primera vez: sí llama
    vi.advanceTimersByTime(5 * 60 * 1000); // 5 minutos después, sigue fresca
    const punto = await leerUbicacionCercana();

    expect(punto).toEqual({ lat: 22.15, lng: -100.98 });
    expect(getCurrentPosition).toHaveBeenCalledTimes(1); // no una segunda vez
  });

  it("pasados los 15 minutos, vuelve a pedirla", async () => {
    const { leerUbicacionCercana } = await import("./ubicacion");
    const getCurrentPosition = vi.fn((exito: PositionCallback) =>
      exito({ coords: { latitude: 22.15, longitude: -100.98 } } as GeolocationPosition),
    );
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

    await leerUbicacionCercana();
    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    await leerUbicacionCercana();

    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it("una posición guardada por otra pantalla (misma clave) también cuenta como fresca", async () => {
    const { leerUbicacionCercana, ubicacionCercanaFresca } = await import("./ubicacion");
    const getCurrentPosition = vi.fn((exito: PositionCallback) =>
      exito({ coords: { latitude: 19.43, longitude: -99.13 } } as GeolocationPosition),
    );
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

    await leerUbicacionCercana(); // simula que Agenda ya la pidió
    expect(ubicacionCercanaFresca()).toEqual({ lat: 19.43, lng: -99.13 }); // Lugares la ve sin pedirla
  });

  it("guarda la caché redondeada a 3 decimales (~100 m), no la posición exacta", async () => {
    const { leerUbicacionCercana, ubicacionCercanaFresca } = await import("./ubicacion");
    const getCurrentPosition = vi.fn((exito: PositionCallback) =>
      exito({ coords: { latitude: 22.149712345, longitude: -100.976398765 } } as GeolocationPosition),
    );
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

    await leerUbicacionCercana(); // el primer resultado puede venir con toda la precisión del navegador...
    expect(ubicacionCercanaFresca()).toEqual({ lat: 22.15, lng: -100.976 }); // ...pero lo que queda guardado no
  });

  it("borrarUbicacionCercana la quita y obliga a pedirla otra vez", async () => {
    const { borrarUbicacionCercana, leerUbicacionCercana, ubicacionCercanaFresca } = await import("./ubicacion");
    const getCurrentPosition = vi.fn((exito: PositionCallback) =>
      exito({ coords: { latitude: 22.15, longitude: -100.98 } } as GeolocationPosition),
    );
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

    await leerUbicacionCercana();
    borrarUbicacionCercana();
    expect(ubicacionCercanaFresca()).toBeNull();

    await leerUbicacionCercana();
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it("sin localStorage (modo privado) no truena: pide y sigue funcionando", async () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("modo privado");
        },
        setItem: () => {
          throw new Error("modo privado");
        },
        removeItem: () => {
          throw new Error("modo privado");
        },
      },
    });
    const { leerUbicacionCercana } = await import("./ubicacion");
    const getCurrentPosition = vi.fn((exito: PositionCallback) =>
      exito({ coords: { latitude: 22.15, longitude: -100.98 } } as GeolocationPosition),
    );
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

    await expect(leerUbicacionCercana()).resolves.toEqual({ lat: 22.15, lng: -100.98 });
  });
});
