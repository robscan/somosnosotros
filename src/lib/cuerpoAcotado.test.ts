import { describe, expect, it } from "vitest";
import { leerCuerpoAcotado } from "./cuerpoAcotado";

/** Un cuerpo en trozos, sin `Content-Length` (como uno chunked), que cuenta cuántos trozos se llegaron a leer. */
function cuerpoEnTrozos(trozos: number, tamano: number) {
  let leidos = 0;
  let cancelado = false;
  const flujo = new ReadableStream<Uint8Array>({
    pull(c) {
      if (leidos >= trozos) return c.close();
      leidos++;
      c.enqueue(new Uint8Array(tamano).fill(120));
    },
    cancel() {
      cancelado = true;
    },
  }, { highWaterMark: 0 }); // sin llenar la cola por adelantado: solo se pide un trozo cuando alguien lee
  const request = new Request("https://somosnosotros.org/api/medir", { method: "POST", body: flujo, duplex: "half" } as RequestInit);
  return { request, leidos: () => leidos, cancelado: () => cancelado };
}

describe("leerCuerpoAcotado (F12 de OL-327)", () => {
  it("un cuerpo pequeño se lee entero", async () => {
    const r = new Request("https://x/", { method: "POST", body: JSON.stringify({ nombre: "app_instalada" }) });
    expect(await leerCuerpoAcotado(r, 512)).toBe('{"nombre":"app_instalada"}');
  });
  it("con Content-Length mayor que el tope, ni empieza a leer", async () => {
    const { request } = cuerpoEnTrozos(1000, 1024);
    const r = new Request(request, { headers: { "content-length": String(1000 * 1024) } });
    expect(await leerCuerpoAcotado(r, 512)).toBeNull();
    expect(r.bodyUsed).toBe(false); // el cuerpo ni se tocó
  });
  it("un Content-Length que no es un número se rechaza", async () => {
    const r = new Request("https://x/", { method: "POST", body: "{}", headers: { "content-length": "abc" } });
    expect(await leerCuerpoAcotado(r, 512)).toBeNull();
  });
  it("sin Content-Length (chunked), un cuerpo grande se corta al pasar el tope: no se lee el resto", async () => {
    const { request, leidos, cancelado } = cuerpoEnTrozos(1000, 300); // 300 KB en total
    expect(await leerCuerpoAcotado(request, 512)).toBeNull();
    expect(leidos()).toBeLessThanOrEqual(3); // dos trozos pasan el tope; el lector lo suelta ahí
    expect(cancelado()).toBe(true);
  });
  it("justo en el tope, se acepta", async () => {
    const { request } = cuerpoEnTrozos(2, 256);
    expect((await leerCuerpoAcotado(request, 512))?.length).toBe(512);
  });
});
