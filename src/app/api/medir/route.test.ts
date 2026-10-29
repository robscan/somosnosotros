import { beforeEach, describe, expect, it, vi } from "vitest";

const tareas: (() => unknown)[] = [];
const enviar = vi.fn();
// OL-485: el tope de la base (`medir_contar`) y si de verdad se mandaría a Google (`urlGoogle`: producción con sus variables).
const m = vi.hoisted(() => ({ rpc: vi.fn(), respuesta: { data: true as unknown, error: null as unknown }, lanza: false, conLlave: true, google: true }));
vi.mock("next/server", () => ({ after: (f: () => unknown) => tareas.push(f) }));
vi.mock("@/lib/medirGoogleServidor", () => ({ enviarAGoogle: (...a: unknown[]) => enviar(...a), urlGoogle: () => (m.google ? "https://google.test/mp" : null) }));
vi.mock("@/lib/supabase/admin", () => ({
  clienteAdmin: () => (m.conLlave ? { rpc: (...a: unknown[]) => { m.rpc(...a); return { abortSignal: async () => { if (m.lanza) throw new Error("sin red"); return m.respuesta; } }; } } : null),
}));

import { POST } from "./route";

const pedir = (cuerpo: unknown, cabeceras: Record<string, string> = { "sec-fetch-site": "same-origin" }) =>
  POST(new Request("https://somosnosotros.org/api/medir", { method: "POST", headers: cabeceras, body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo) }));

const correr = async () => { for (const t of tareas) await t(); };

beforeEach(() => {
  tareas.length = 0;
  enviar.mockReset();
  m.rpc.mockReset();
  m.respuesta = { data: true, error: null };
  m.lanza = false;
  m.conLlave = true;
  m.google = true;
});

describe("POST /api/medir (OL-325)", () => {
  it("un evento de la lista: responde 204 al momento y manda a Google después", async () => {
    const r = await pedir({ nombre: "asistencia", datos: { estado: "voy", cambio: "puesto" } });
    expect(r.status).toBe(204);
    expect(enviar).not.toHaveBeenCalled(); // aún no: va en `after`
    await correr();
    expect(m.rpc).toHaveBeenCalledWith("medir_contar", { p_nombre: "asistencia" }); // solo el nombre, nunca los datos
    expect(enviar).toHaveBeenCalledWith("asistencia", { estado: "voy", cambio: "puesto" });
  });
  it("OL-485: pasado el tope de la hora, la base dice que no y no se manda a Google (la respuesta es la misma)", async () => {
    m.respuesta = { data: false, error: null };
    expect((await pedir({ nombre: "app_instalada" })).status).toBe(204);
    await correr();
    expect(m.rpc).toHaveBeenCalledWith("medir_contar", { p_nombre: "app_instalada" });
    expect(enviar).not.toHaveBeenCalled();
  });
  it("OL-485: si la base falla o no hay llave, se manda igual (medir no depende de la base)", async () => {
    m.respuesta = { data: null, error: { message: "402" } };
    await pedir({ nombre: "app_instalada" });
    m.lanza = true;
    await pedir({ nombre: "app_instalada" });
    m.lanza = false;
    m.conLlave = false;
    await pedir({ nombre: "app_instalada" });
    await correr();
    expect(enviar).toHaveBeenCalledTimes(3);
  });
  it("OL-485: fuera de producción (sin Google) no gasta el contador ni manda nada", async () => {
    m.google = false;
    await pedir({ nombre: "app_instalada" });
    await correr();
    expect(m.rpc).not.toHaveBeenCalled();
    expect(enviar).not.toHaveBeenCalled();
  });
  it("lo que no está en la lista: 400 y nada a Google", async () => {
    for (const cuerpo of [{ nombre: "visita", datos: {} }, { nombre: "busqueda", datos: { resultados: "si", texto: "rosa" } }, { nombre: "busqueda", datos: { resultados: "teatro" } }, { datos: {} }, "no es json"]) {
      expect((await pedir(cuerpo)).status).toBe(400);
    }
    expect(tareas).toHaveLength(0);
  });
  it("desde otra página: 403", async () => {
    expect((await pedir({ nombre: "app_instalada" }, { "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect((await pedir({ nombre: "app_instalada" }, {})).status).toBe(403); // OL-485: sin la cabecera (curl, un programa), tampoco
    expect((await pedir({ nombre: "app_instalada" }, { "sec-fetch-site": "same-site" })).status).toBe(403);
    expect(tareas).toHaveLength(0);
  });
  it("un cuerpo enorme: 413", async () => {
    expect((await pedir({ nombre: "app_instalada", datos: {}, relleno: "x".repeat(600) })).status).toBe(413);
    // F12: un megabyte sin Content-Length (en trozos) se corta sin leerlo entero, y uno que lo declara ni se empieza a leer.
    let trozos = 0;
    const grande = new ReadableStream<Uint8Array>({
      pull(c) {
        if (++trozos > 1024) return c.close();
        c.enqueue(new Uint8Array(1024).fill(120));
      },
    });
    const sinLargo = new Request("https://somosnosotros.org/api/medir", { method: "POST", headers: { "sec-fetch-site": "same-origin" }, body: grande, duplex: "half" } as RequestInit);
    expect((await POST(sinLargo)).status).toBe(413);
    expect(trozos).toBeLessThan(5);
    const conLargo = new Request("https://somosnosotros.org/api/medir", { method: "POST", headers: { "sec-fetch-site": "same-origin", "content-length": "1048576" }, body: "{}" });
    expect((await POST(conLargo)).status).toBe(413);
    expect(tareas).toHaveLength(0);
  });
});
