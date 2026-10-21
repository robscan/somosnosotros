import { describe, expect, it, vi } from "vitest";
import { dispararPaso, ORIGEN_PRODUCCION, origenPropio } from "./disparar";

describe("a dónde puede viajar el secreto", () => {
  it("en producción, siempre a somosnosotros.org (diga lo que diga la cabecera)", () => {
    expect(origenPropio("atacante.example", "https", { VERCEL_ENV: "production" })).toBe(ORIGEN_PRODUCCION);
  });
  it("fuera de producción: el host de Vercel de este despliegue, los dominios propios o la Mac; nada más", () => {
    const env = { VERCEL_ENV: "preview", VERCEL_URL: "somosnosotros-abc123.vercel.app", VERCEL_BRANCH_URL: "somosnosotros-git-rama.vercel.app" };
    expect(origenPropio("somosnosotros-abc123.vercel.app", "https", env)).toBe("https://somosnosotros-abc123.vercel.app");
    expect(origenPropio("somosnosotros-git-rama.vercel.app", "https", env)).toBe("https://somosnosotros-git-rama.vercel.app");
    expect(origenPropio("www.somosnosotros.org", "https", env)).toBe("https://www.somosnosotros.org");
    expect(origenPropio("localhost:3100", "http", {})).toBe("http://localhost:3100");
    expect(origenPropio("127.0.0.1:3000", null, {})).toBe("http://127.0.0.1:3000");
    expect(origenPropio("atacante.example", "https", env)).toBeNull();
    expect(origenPropio("otra-app.vercel.app", "https", env)).toBeNull();
    expect(origenPropio("somosnosotros.org@atacante.example", "https", env)).toBeNull();
    expect(origenPropio(null, null, env)).toBeNull();
  });
});

describe("dispararPaso", () => {
  it("llama a la ruta del motor con el secreto como Bearer, por POST", async () => {
    const pedir = vi.fn(async () => new Response(null, { status: 202 })) as unknown as typeof fetch;
    expect(await dispararPaso("https://somosnosotros.org", { secreto: "s3cr3t", pedir })).toBe("disparado");
    const [url, init] = (pedir as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];
    expect(url).toBe("https://somosnosotros.org/api/rutinas/correr");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer s3cr3t");
  });

  it("sin secreto no dispara y lo dice en el registro (sin el secreto); sin origen, igual; si falla, no lanza", async () => {
    const avisos: string[] = [];
    const pedir = vi.fn() as unknown as typeof fetch;
    expect(await dispararPaso("https://somosnosotros.org", { secreto: undefined, pedir, avisar: (t) => avisos.push(t) })).toBe("sin secreto");
    expect(await dispararPaso(null, { secreto: "s3cr3t", pedir, avisar: (t) => avisos.push(t) })).toBe("sin origen");
    expect(pedir).not.toHaveBeenCalled();
    expect(avisos).toEqual(["rutinas: falta CRON_SECRET; la corrida espera al cron", "rutinas: no se reconoce el sitio; la corrida espera al cron"]);
    const cae = (async () => {
      throw new Error("sin red");
    }) as unknown as typeof fetch;
    expect(await dispararPaso("https://somosnosotros.org", { secreto: "s3cr3t", pedir: cae, esperar: async () => undefined, avisar: () => undefined })).toBe("falló");
  });
});

describe("dispararPaso reintenta (OL-429)", () => {
  const respuestas = (...rs: (number | Error)[]) =>
    vi.fn(async () => {
      const r = rs.shift();
      if (r instanceof Error) throw r;
      return new Response("{}", { status: r ?? 202 });
    }) as unknown as typeof fetch;
  const sinEspera = { esperar: async () => undefined };

  it("un 404 o un tropiezo de red se reintenta; al segundo o tercer intento, «disparado»", async () => {
    const pedir = respuestas(404, 202);
    expect(await dispararPaso("https://somosnosotros.org", { secreto: "s", pedir, ...sinEspera })).toBe("disparado");
    expect(pedir).toHaveBeenCalledTimes(2);
    const red = respuestas(new Error("sin red"), 503, 202);
    expect(await dispararPaso("https://somosnosotros.org", { secreto: "s", pedir: red, ...sinEspera })).toBe("disparado");
    expect(red).toHaveBeenCalledTimes(3);
  });

  it("tres intentos fallidos: «falló» y una línea en el registro con el motivo, sin el secreto", async () => {
    const avisos: string[] = [];
    const pedir = respuestas(500, 500, 500, 202);
    expect(await dispararPaso("https://somosnosotros.org", { secreto: "s3cr3t", pedir, avisar: (t) => avisos.push(t), ...sinEspera })).toBe("falló");
    expect(pedir).toHaveBeenCalledTimes(3);
    expect(avisos).toEqual(["rutinas: no se pudo pedir el paso (respondió 500); lo retoma Ciudades o el cron"]);
  });

  it("un 401 no se reintenta (el secreto no cambia entre intentos)", async () => {
    const avisos: string[] = [];
    const pedir = respuestas(401, 202);
    expect(await dispararPaso("https://somosnosotros.org", { secreto: "s", pedir, avisar: (t) => avisos.push(t), ...sinEspera })).toBe("rechazado");
    expect(pedir).toHaveBeenCalledTimes(1);
    expect(avisos[0]).toContain("no aceptó el secreto (401)");
  });

  it("no se pasa del tiempo de la función: sin margen para otro intento, no lo hace", async () => {
    let reloj = 0;
    const pedir = vi.fn(async () => {
      reloj += 2_000;
      return new Response(null, { status: 404 });
    }) as unknown as typeof fetch;
    const r = await dispararPaso("https://somosnosotros.org", { secreto: "s", pedir, ahora: () => reloj, hasta: 3_500, esperar: async (ms) => void (reloj += ms), avisar: () => undefined });
    expect(r).toBe("falló");
    expect(pedir).toHaveBeenCalledTimes(1);
  });
});
