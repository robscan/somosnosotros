import { beforeEach, describe, expect, it, vi } from "vitest";

const tareas: (() => unknown)[] = [];
const enviar = vi.fn();
vi.mock("next/server", () => ({ after: (f: () => unknown) => tareas.push(f) }));
vi.mock("@/lib/medirGoogleServidor", () => ({ enviarAGoogle: (...a: unknown[]) => enviar(...a) }));

import { POST } from "./route";

const pedir = (cuerpo: unknown, cabeceras: Record<string, string> = { "sec-fetch-site": "same-origin" }) =>
  POST(new Request("https://somosnosotros.org/api/medir", { method: "POST", headers: cabeceras, body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo) }));

beforeEach(() => {
  tareas.length = 0;
  enviar.mockReset();
});

describe("POST /api/medir (OL-325)", () => {
  it("un evento de la lista: responde 204 al momento y manda a Google después", async () => {
    const r = await pedir({ nombre: "asistencia", datos: { estado: "voy", cambio: "puesto" } });
    expect(r.status).toBe(204);
    expect(enviar).not.toHaveBeenCalled(); // aún no: va en `after`
    for (const t of tareas) await t();
    expect(enviar).toHaveBeenCalledWith("asistencia", { estado: "voy", cambio: "puesto" });
  });
  it("lo que no está en la lista: 400 y nada a Google", async () => {
    for (const cuerpo of [{ nombre: "visita", datos: {} }, { nombre: "busqueda", datos: { resultados: "si", texto: "rosa" } }, { nombre: "busqueda", datos: { resultados: "teatro" } }, { datos: {} }, "no es json"]) {
      expect((await pedir(cuerpo)).status).toBe(400);
    }
    expect(tareas).toHaveLength(0);
  });
  it("desde otra página: 403", async () => {
    expect((await pedir({ nombre: "app_instalada" }, { "sec-fetch-site": "cross-site" })).status).toBe(403);
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
