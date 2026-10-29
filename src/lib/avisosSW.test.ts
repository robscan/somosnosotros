import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

describe("identidad visual del aviso push", () => {
  it("reintentos del mismo job comparten tag; jobs distintos no se pisan por URL", async () => {
    const handlers = new Map<string, (e: unknown) => void>();
    const mostrar = vi.fn().mockResolvedValue(undefined);
    runInNewContext(readFileSync("public/sw.js", "utf8"), { self: {
      addEventListener: (tipo: string, fn: (e: unknown) => void) => handlers.set(tipo, fn),
      registration: { showNotification: mostrar },
    } });
    const pendientes: Promise<unknown>[] = [];
    for (const tag of ["aviso-1", "aviso-1", "aviso-2", undefined]) {
      handlers.get("push")!({ data: { json: () => ({ titulo: "Aviso", url: "/eventos/1", tag }) },
        waitUntil: (p: Promise<unknown>) => pendientes.push(p) });
    }
    await Promise.all(pendientes);
    expect(mostrar.mock.calls.map((c) => c[1].tag)).toEqual(["aviso-1", "aviso-1", "aviso-2", "/eventos/1"]);
    expect(mostrar.mock.calls.every((c) => c[1].renotify === false)).toBe(true);
  });
  it("OL-480: con el tag del evento, un aviso nuevo del mismo evento vuelve a sonar; un reintento del mismo aviso, no", async () => {
    const handlers = new Map<string, (e: unknown) => void>();
    const visibles: { tag: string; data: { aviso: string | null } }[] = [];
    const mostrar = vi.fn(async (_t: string, o: { tag: string; data: { aviso: string | null } }) => {
      const i = visibles.findIndex((n) => n.tag === o.tag);
      if (i >= 0) visibles.splice(i, 1);
      visibles.push({ tag: o.tag, data: o.data });
    });
    runInNewContext(readFileSync("public/sw.js", "utf8"), { self: {
      addEventListener: (tipo: string, fn: (e: unknown) => void) => handlers.set(tipo, fn),
      registration: { showNotification: mostrar, getNotifications: async ({ tag }: { tag: string }) => visibles.filter((n) => n.tag === tag) },
    } });
    const llega = async (aviso: string) => {
      let p: Promise<unknown> = Promise.resolve();
      handlers.get("push")!({ data: { json: () => ({ titulo: "Noche", url: "/eventos/1?desde=aviso&tipo=nuevo", tag: "evento-1", aviso }) },
        waitUntil: (x: Promise<unknown>) => { p = x; } });
      await p;
      return mostrar.mock.calls.at(-1)![1] as { tag: string; renotify: boolean; data: { url: string; aviso: string } };
    };
    expect((await llega("job-1")).renotify).toBe(false); // el primero: no había nada que sustituir
    expect((await llega("job-1")).renotify).toBe(false); // un reintento del mismo aviso no suena dos veces
    const cambio = await llega("job-2");
    expect([cambio.tag, cambio.renotify, cambio.data.aviso]).toEqual(["evento-1", true, "job-2"]); // el cambio del mismo evento sí suena
    expect(visibles).toHaveLength(1); // y queda uno solo por evento
  });
});
