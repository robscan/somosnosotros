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
  });
});
