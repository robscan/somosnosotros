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
});
