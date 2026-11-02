import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * OL-501: el manejador `fetch` de `public/sw.js`, en el mismo arnés que `avisosSW.test.ts` (el archivo corre en una caja con un `self`
 * mínimo), con una caché y una red de mentira.
 */
const ORIGEN = "https://somosnosotros.org";
const PAGINA = readFileSync("public/sin-conexion.html", "utf8");

function montar(red: (peticion: Request) => Promise<Response>) {
  const handlers = new Map<string, (e: unknown) => void>();
  const guardadas = new Map<string, Map<string, Response>>();
  const caches = {
    open: async (nombre: string) => {
      if (!guardadas.has(nombre)) guardadas.set(nombre, new Map());
      const c = guardadas.get(nombre)!;
      return {
        add: async (p: Request) => void c.set(new URL(p.url, ORIGEN).pathname, new Response(PAGINA)),
        match: async (u: string) => c.get(u)?.clone(),
      };
    },
    match: async (u: string, o: { cacheName: string }) => guardadas.get(o.cacheName)?.get(u)?.clone(),
    keys: async () => [...guardadas.keys()],
    delete: async (n: string) => guardadas.delete(n),
  };
  const fetch = vi.fn(red);
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: { addEventListener: (t: string, fn: (e: unknown) => void) => handlers.set(t, fn), registration: {}, location: { origin: ORIGEN }, skipWaiting() {}, clients: { claim: async () => {} } },
    caches,
    fetch,
    Request: class extends Request {
      constructor(u: string, o?: RequestInit) {
        super(new URL(u, ORIGEN), o);
      }
    },
    Response,
    URL,
    setTimeout: (f: () => void, ms: number) => setTimeout(f, ms),
    clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
  });
  /** Lanza el evento `fetch` y devuelve lo que se respondió, o null si el SW dejó pasar la petición. */
  const pedir = (ruta: string, { metodo = "GET", modo = "navigate" }: { metodo?: string; modo?: string } = {}) => {
    const request = { url: ORIGEN + ruta, method: metodo, mode: modo };
    let respuesta: Promise<Response> | null = null;
    handlers.get("fetch")!({ request, respondWith: (p: Promise<Response>) => (respuesta = p) });
    return respuesta as Promise<Response> | null;
  };
  const instalar = async () => {
    let p: Promise<unknown> = Promise.resolve();
    handlers.get("install")!({ waitUntil: (x: Promise<unknown>) => (p = x) });
    await p;
  };
  return { pedir, instalar, fetch, guardadas, handlers };
}

afterEach(() => vi.useRealTimers());

describe("OL-501: respaldo cuando una pantalla no carga", () => {
  it("al instalar precarga la página de respaldo en su caché con versión", async () => {
    const sw = montar(async () => new Response("ok"));
    await sw.instalar();
    expect([...sw.guardadas.keys()]).toEqual(["sn-respaldo-v1"]);
    expect(sw.guardadas.get("sn-respaldo-v1")!.has("/sin-conexion.html")).toBe(true);
  });

  it("una navegación que falla por la red → la página de respaldo, motivo «red», en la misma dirección", async () => {
    const sw = montar(async () => Promise.reject(new TypeError("Failed to fetch")));
    await sw.instalar();
    const r = await sw.pedir("/eventos/noche-de-son?desde=aviso")!;
    const html = await r.text();
    expect(html).toContain("No se pudo cargar");
    expect(html).toContain('<html lang="es" data-motivo="red">');
    expect(r.headers.get("cache-control")).toBe("no-store");
  });

  it("una respuesta 503 → el respaldo con motivo «servidor»", async () => {
    const sw = montar(async () => new Response("Service Unavailable", { status: 503 }));
    await sw.instalar();
    const html = await (await sw.pedir("/")!).text();
    expect(html).toContain('<html lang="es" data-motivo="servidor">');
  });

  it("una respuesta buena, un 404 o una redirección pasan tal cual, y nada se guarda en la caché", async () => {
    for (const status of [200, 404]) {
      const original = new Response("pantalla", { status });
      const sw = montar(async () => original);
      await sw.instalar();
      expect(await sw.pedir("/agenda")).toBe(original);
      expect([...sw.guardadas.get("sn-respaldo-v1")!.keys()]).toEqual(["/sin-conexion.html"]);
    }
  });

  it("GET a /api/, un POST, una petición que no es navegación, /auth/callback y /_next/ pasan sin tocarlas", () => {
    const sw = montar(async () => new Response("ok"));
    expect(sw.pedir("/api/medir")).toBeNull();
    expect(sw.pedir("/agenda", { metodo: "POST" })).toBeNull();
    expect(sw.pedir("/agenda", { modo: "cors" })).toBeNull();
    expect(sw.pedir("/auth/callback?code=abc")).toBeNull();
    expect(sw.pedir("/auth")).toBeNull();
    expect(sw.pedir("/_next/static/chunks/a.js")).toBeNull();
    expect(sw.fetch).not.toHaveBeenCalled();
    // `/autores` no es `/auth/`: sí se cubre.
    expect(sw.pedir("/autores")).not.toBeNull();
  });

  it("otra dirección (otro origen) pasa sin tocarla", () => {
    const sw = montar(async () => new Response("ok"));
    const handlers = sw.handlers;
    let respondio = false;
    handlers.get("fetch")!({ request: { url: "https://otro.example/", method: "GET", mode: "navigate" }, respondWith: () => (respondio = true) });
    expect(respondio).toBe(false);
  });

  it("una petición que se cuelga → el respaldo al pasar el tope de 12 s, no antes", async () => {
    const sw = montar(() => new Promise<Response>(() => {}));
    await sw.instalar();
    vi.useFakeTimers();
    let llego: Response | null = null;
    void sw.pedir("/")!.then((r) => (llego = r));
    await vi.advanceTimersByTimeAsync(11_900);
    expect(llego).toBeNull();
    await vi.advanceTimersByTimeAsync(200);
    expect(llego).not.toBeNull();
    expect(await llego!.text()).toContain('<html lang="es" data-motivo="red">');
  });

  it("sin la página en la caché (falló la precarga) da el respaldo mínimo, nunca el blanco", async () => {
    const sw = montar(async () => Promise.reject(new TypeError("offline")));
    const html = await (await sw.pedir("/")!).text();
    expect(html).toContain("No se pudo cargar");
    expect(html).toContain("Intentar de nuevo");
  });

  it("al activarse borra las cachés de respaldo viejas y deja la de hoy", async () => {
    const sw = montar(async () => new Response("ok"));
    await sw.instalar();
    sw.guardadas.set("sn-respaldo-v0", new Map());
    let p: Promise<unknown> = Promise.resolve();
    sw.handlers.get("activate")!({ waitUntil: (x: Promise<unknown>) => (p = x) });
    await p;
    expect([...sw.guardadas.keys()]).toEqual(["sn-respaldo-v1"]);
  });
});
