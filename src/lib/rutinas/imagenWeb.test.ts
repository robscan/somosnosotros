import sharp from "sharp";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { TOPE_BYTES } from "../carteles/imagenSegura";
import { bajarImagen, direccionPublica } from "./imagenWeb";

/** Bajar un cartel de una página ajena (OL-444): solo https a dominios públicos con nombre, redirecciones vigiladas, tope y bytes de imagen. */

let jpeg: Buffer;
beforeAll(async () => {
  jpeg = await sharp({ create: { width: 40, height: 50, channels: 3, background: "#123456" } }).jpeg().toBuffer();
});

describe("direccionPublica", () => {
  it("deja https a un dominio con nombre; nada de http, IP, localhost, nombres internos, otro puerto ni usuario", () => {
    expect(direccionPublica("https://forositio.mx/c/jazz.jpg")?.href).toBe("https://forositio.mx/c/jazz.jpg");
    expect(direccionPublica("https://cdn.forositio.com.mx:443/a.png")).not.toBeNull();
    for (const mala of [
      "http://forositio.mx/a.jpg",
      "https://127.0.0.1/a.jpg",
      "https://169.254.169.254/latest",
      "https://[::1]/a.jpg",
      "https://localhost/a.jpg",
      "https://servidor.internal/a.jpg",
      "https://maquina.local/a.jpg",
      "https://forositio.mx:8443/a.jpg",
      "https://yo:clave@forositio.mx/a.jpg",
      "javascript:alert(1)",
      "nada",
    ])
      expect(direccionPublica(mala), mala).toBeNull();
  });
});

describe("bajarImagen", () => {
  it("baja un JPEG y sigue una redirección a otro dominio público", async () => {
    const pedir = vi.fn(async (url: string) =>
      url === "https://forositio.mx/c.jpg" ? new Response(null, { status: 302, headers: { location: "https://cdn.forositio.mx/c.jpg" } }) : new Response(new Uint8Array(jpeg)),
    ) as unknown as typeof fetch;
    expect(await bajarImagen("https://forositio.mx/c.jpg", pedir)).toEqual(jpeg);
    expect(pedir).toHaveBeenCalledTimes(2);
  });

  it("no sigue una redirección a una dirección interna, ni más de tres", async () => {
    const interna = vi.fn(async () => new Response(null, { status: 301, headers: { location: "http://169.254.169.254/" } })) as unknown as typeof fetch;
    expect(await bajarImagen("https://forositio.mx/c.jpg", interna)).toBeNull();
    expect(interna).toHaveBeenCalledTimes(1);
    let n = 0;
    const vueltas = vi.fn(async () => new Response(null, { status: 302, headers: { location: `https://forositio.mx/${++n}.jpg` } })) as unknown as typeof fetch;
    expect(await bajarImagen("https://forositio.mx/0.jpg", vueltas)).toBeNull();
    expect(vueltas).toHaveBeenCalledTimes(4);
  });

  it("no acepta una página, un SVG, algo que pasa del tope ni un error", async () => {
    const con = (cuerpo: BodyInit | null, init?: ResponseInit) => (async () => new Response(cuerpo, init)) as unknown as typeof fetch;
    expect(await bajarImagen("https://forositio.mx/c.jpg", con("<html>agenda</html>"))).toBeNull();
    expect(await bajarImagen("https://forositio.mx/c.svg", con('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>'))).toBeNull();
    expect(await bajarImagen("https://forositio.mx/c.jpg", con(new Uint8Array(jpeg), { headers: { "content-length": String(TOPE_BYTES + 1) } }))).toBeNull();
    expect(await bajarImagen("https://forositio.mx/c.jpg", con(new Uint8Array(TOPE_BYTES + 10)))).toBeNull();
    expect(await bajarImagen("https://forositio.mx/c.jpg", con("no", { status: 404 }))).toBeNull();
    const cae = (async () => {
      throw new Error("sin red");
    }) as unknown as typeof fetch;
    expect(await bajarImagen("https://forositio.mx/c.jpg", cae)).toBeNull();
  });
});
