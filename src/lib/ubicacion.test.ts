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

describe("ubicación al día sin toque (OL-255)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
    vi.stubGlobal("window", { localStorage: crearAlmacenFalso() });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  /** Un navegador con el permiso en `estado` (sin `permissions` si es null) cuya posición actual es `lat`. */
  function navegador(estado: PermissionState | null, lat = 22.15) {
    const getCurrentPosition = vi.fn<Geolocation["getCurrentPosition"]>((exito) => exito({ coords: { latitude: lat, longitude: -100.98 } } as GeolocationPosition));
    const query = vi.fn(async () => ({ state: estado }) as PermissionStatus);
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition }, ...(estado ? { permissions: { query } } : {}) });
    return { getCurrentPosition };
  }

  it("debeReleer: solo con permiso concedido y el punto viejo o ausente", async () => {
    const { debeReleer, RELECTURA_MS } = await import("./ubicacion");
    expect(debeReleer(true, null)).toBe(true);
    expect(debeReleer(true, RELECTURA_MS + 1)).toBe(true);
    expect(debeReleer(true, RELECTURA_MS)).toBe(false);
    expect(debeReleer(false, null)).toBe(false);
    expect(debeReleer(false, RELECTURA_MS + 1)).toBe(false);
  });

  it("concedido y con más de un minuto: relee y guarda el punto nuevo", async () => {
    const { leerUbicacionCercana, releerUbicacionAlDia, ubicacionCercanaFresca } = await import("./ubicacion");
    navegador("granted", 22.15);
    await leerUbicacionCercana(); // el toque de la persona
    const { getCurrentPosition } = navegador("granted", 22.2); // la persona camina
    vi.advanceTimersByTime(61 * 1000);

    await expect(releerUbicacionAlDia()).resolves.toBe(true);
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(ubicacionCercanaFresca()).toEqual({ lat: 22.2, lng: -100.98 });
  });

  it("concedido y fresco (menos de un minuto): no vuelve a llamar", async () => {
    const { leerUbicacionCercana, releerUbicacionAlDia } = await import("./ubicacion");
    const { getCurrentPosition } = navegador("granted");
    await leerUbicacionCercana();
    vi.advanceTimersByTime(30 * 1000);

    await expect(releerUbicacionAlDia()).resolves.toBe(false);
    expect(getCurrentPosition).toHaveBeenCalledTimes(1); // solo la del toque
  });

  it("la relectura es aproximada y no acepta del navegador una posición de más de un minuto", async () => {
    const { releerUbicacionAlDia } = await import("./ubicacion");
    const { getCurrentPosition } = navegador("granted");
    await releerUbicacionAlDia();
    expect(getCurrentPosition.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: false, maximumAge: 60000 });
  });

  it.each([["prompt"], ["denied"], [null]] as const)("con el permiso en %s: nunca llama a getCurrentPosition", async (estado) => {
    const { releerUbicacionAlDia } = await import("./ubicacion");
    const { getCurrentPosition } = navegador(estado);

    await expect(releerUbicacionAlDia()).resolves.toBe(false);
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("si el permiso se revoca entre la consulta y la lectura, no truena ni insiste", async () => {
    const { releerUbicacionAlDia } = await import("./ubicacion");
    const getCurrentPosition = vi.fn((_ok: PositionCallback, mal: PositionErrorCallback) => mal({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError));
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition }, permissions: { query: async () => ({ state: "granted" }) } });

    await expect(releerUbicacionAlDia()).resolves.toBe(false);
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  describe("en el WKWebView de la app (permissions.query lanza)", () => {
    function webviewIos() {
      const getCurrentPosition = vi.fn((exito: PositionCallback) => exito({ coords: { latitude: 22.15, longitude: -100.98 } } as GeolocationPosition));
      const query = vi.fn(async () => {
        throw new DOMException("Permissions::query does not support this API", "NotSupportedError");
      });
      vi.stubGlobal("navigator", { geolocation: { getCurrentPosition }, permissions: { query } });
      return { getCurrentPosition };
    }

    it("recién abierta la app no lee sola: iOS volvería a preguntar sin que nadie toque", async () => {
      const { releerUbicacionAlDia } = await import("./ubicacion");
      const { getCurrentPosition } = webviewIos();

      await expect(releerUbicacionAlDia()).resolves.toBe(false);
      expect(getCurrentPosition).not.toHaveBeenCalled();
    });

    it("tras una lectura buena en esta sesión (el toque de la persona), sí relee pasado el minuto", async () => {
      const { leerUbicacionCercana, releerUbicacionAlDia } = await import("./ubicacion");
      const { getCurrentPosition } = webviewIos();
      await leerUbicacionCercana();
      vi.advanceTimersByTime(61 * 1000);

      await expect(releerUbicacionAlDia()).resolves.toBe(true);
      expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    });

    it("si después se niega, deja de releer", async () => {
      const { leerUbicacionCercana, leerUbicacion, releerUbicacionAlDia } = await import("./ubicacion");
      const { getCurrentPosition } = webviewIos();
      await leerUbicacionCercana();
      getCurrentPosition.mockImplementationOnce((_ok: PositionCallback, mal?: PositionErrorCallback | null) => mal?.({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError));
      await expect(leerUbicacion()).rejects.toBe("negado");
      getCurrentPosition.mockClear();
      vi.advanceTimersByTime(61 * 1000);

      await expect(releerUbicacionAlDia()).resolves.toBe(false);
      expect(getCurrentPosition).not.toHaveBeenCalled();
    });
  });

  it("permisoConcedido: granted sí; prompt, denied o sin API no, y nada se lee", async () => {
    const { permisoConcedido } = await import("./ubicacion");
    for (const [estado, esperado] of [["granted", true], ["prompt", false], ["denied", false], [null, false]] as const) {
      const { getCurrentPosition } = navegador(estado);
      await expect(permisoConcedido()).resolves.toBe(esperado);
      expect(getCurrentPosition).not.toHaveBeenCalled();
    }
  });

  it("varias pantallas a la vez comparten una sola lectura", async () => {
    const { releerUbicacionAlDia } = await import("./ubicacion");
    const { getCurrentPosition } = navegador("granted");

    await Promise.all([releerUbicacionAlDia(), releerUbicacionAlDia(), releerUbicacionAlDia()]);
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });
});

describe("geolocalización nativa de la app (plugin de Capacitor, OL-256)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  /**
   * La app con el plugin: `window.Capacitor.Plugins.Geolocation` con el permiso en `estado`. El WKWebView sigue sin `permissions.query`
   * (lanza) y su `navigator.geolocation` no debe tocarse nunca: es el que haría salir el aviso del sitio.
   */
  function appConPlugin(estado: string, lat = 22.15) {
    const checkPermissions = vi.fn(async () => ({ location: estado }));
    const getCurrentPosition = vi.fn<(opciones: object) => Promise<{ coords: object }>>(async () => ({ coords: { latitude: lat, longitude: -100.98, accuracy: 65 } }));
    const navegadorGetCurrentPosition = vi.fn();
    vi.stubGlobal("window", { localStorage: crearAlmacenFalso(), Capacitor: { Plugins: { Geolocation: { checkPermissions, getCurrentPosition } } } });
    vi.stubGlobal("navigator", {
      geolocation: { getCurrentPosition: navegadorGetCurrentPosition },
      permissions: {
        query: async () => {
          throw new DOMException("Permissions::query does not support this API", "NotSupportedError");
        },
      },
    });
    return { checkPermissions, getCurrentPosition, navegadorGetCurrentPosition };
  }

  it("concedido: recién abierta la app relee sola, por el plugin y nunca por el navegador", async () => {
    const { releerUbicacionAlDia, ubicacionCercanaFresca } = await import("./ubicacion");
    const { getCurrentPosition, navegadorGetCurrentPosition } = appConPlugin("granted");

    await expect(releerUbicacionAlDia()).resolves.toBe(true);
    expect(getCurrentPosition).toHaveBeenCalledWith({ enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 });
    expect(navegadorGetCurrentPosition).not.toHaveBeenCalled();
    expect(ubicacionCercanaFresca()).toEqual({ lat: 22.15, lng: -100.98 });
  });

  it.each([["prompt"], ["denied"]])("con el permiso en %s: no lee sin toque", async (estado) => {
    const { releerUbicacionAlDia, permisoConcedido } = await import("./ubicacion");
    const { getCurrentPosition, navegadorGetCurrentPosition } = appConPlugin(estado);

    await expect(permisoConcedido()).resolves.toBe(false);
    await expect(releerUbicacionAlDia()).resolves.toBe(false);
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(navegadorGetCurrentPosition).not.toHaveBeenCalled();
  });

  it("si checkPermissions falla, cuenta como no concedido y no lee", async () => {
    const { permisoConcedido } = await import("./ubicacion");
    const { checkPermissions, getCurrentPosition } = appConPlugin("granted");
    checkPermissions.mockRejectedValueOnce(new Error("sin servicios de ubicación"));

    await expect(permisoConcedido()).resolves.toBe(false);
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("la lectura de un toque (permiso por decidir) va por el plugin, que pide el permiso al sistema", async () => {
    const { leerUbicacionCercana } = await import("./ubicacion");
    const { getCurrentPosition, navegadorGetCurrentPosition } = appConPlugin("prompt");

    await expect(leerUbicacionCercana()).resolves.toEqual({ lat: 22.15, lng: -100.98 });
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(navegadorGetCurrentPosition).not.toHaveBeenCalled();
  });

  it("la precisa pide GPS y devuelve la precisión del plugin", async () => {
    const { leerUbicacionConPrecision } = await import("./ubicacion");
    const { getCurrentPosition } = appConPlugin("granted");

    await expect(leerUbicacionConPrecision()).resolves.toEqual({ punto: { lat: 22.15, lng: -100.98 }, precisionM: 65 });
    expect(getCurrentPosition).toHaveBeenCalledWith({ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  });

  it("los rechazos del plugin: permiso negado o restringido es «negado»; cualquier otro, «error»", async () => {
    const { leerUbicacion } = await import("./ubicacion");
    const { getCurrentPosition } = appConPlugin("granted");

    getCurrentPosition.mockRejectedValueOnce({ code: "OS-PLUG-GLOC-0003" });
    await expect(leerUbicacion()).rejects.toBe("negado");
    getCurrentPosition.mockRejectedValueOnce({ code: "OS-PLUG-GLOC-0008" });
    await expect(leerUbicacion()).rejects.toBe("negado");
    getCurrentPosition.mockRejectedValueOnce({ code: "OS-PLUG-GLOC-0010" });
    await expect(leerUbicacion()).rejects.toBe("error");
    getCurrentPosition.mockRejectedValueOnce(new Error("sin código"));
    await expect(leerUbicacion()).rejects.toBe("error");
  });

  it("sin el plugin (app vieja de TestFlight o web) todo sigue como en OL-255: window.Capacitor sin Geolocation", async () => {
    const { releerUbicacionAlDia } = await import("./ubicacion");
    const getCurrentPosition = vi.fn((exito: PositionCallback) => exito({ coords: { latitude: 22.15, longitude: -100.98 } } as GeolocationPosition));
    vi.stubGlobal("window", { localStorage: crearAlmacenFalso(), Capacitor: { Plugins: { Calendario: {} } } });
    vi.stubGlobal("navigator", {
      geolocation: { getCurrentPosition },
      permissions: {
        query: async () => {
          throw new DOMException("Permissions::query does not support this API", "NotSupportedError");
        },
      },
    });

    await expect(releerUbicacionAlDia()).resolves.toBe(false); // WKWebView recién abierto: ni un aviso sin toque
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });
});
