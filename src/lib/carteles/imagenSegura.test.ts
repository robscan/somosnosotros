import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { formatoPorBytes, imagenAdmitida, LIMITE_PIXELES, TOPE_BYTES } from "./imagenSegura";

/** OL-329: solo se decodifica lo que los bytes dicen que es JPEG, PNG o WebP razonable; nada de SVG ni de mentiras en el Content-Type. */

/** Un SVG mínimo como el de 106 bytes con el que Codex probó que entraba al lector SVG de sharp (OL-327). */
const SVG_DE_CODEX = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#f80808"/></svg>`);

let jpeg: Buffer;
let png: Buffer;
let webp: Buffer;

beforeAll(async () => {
  const base = sharp({ create: { width: 64, height: 48, channels: 3, background: "#cc7733" } });
  jpeg = await base.clone().jpeg().toBuffer();
  png = await base.clone().png().toBuffer();
  webp = await base.clone().webp().toBuffer();
});

describe("formatoPorBytes", () => {
  it("reconoce JPEG, PNG y WebP por sus bytes mágicos", () => {
    expect(formatoPorBytes(jpeg)).toBe("jpeg");
    expect(formatoPorBytes(png)).toBe("png");
    expect(formatoPorBytes(webp)).toBe("webp");
  });
  it("no reconoce SVG, GIF, AVIF, texto ni cuerpos cortos", async () => {
    expect(formatoPorBytes(SVG_DE_CODEX)).toBeNull();
    expect(formatoPorBytes(Buffer.from("GIF89a\u0001\u0000\u0001\u0000\u0000\u0000\u0000;"))).toBeNull();
    expect(formatoPorBytes(await sharp({ create: { width: 8, height: 8, channels: 3, background: "#fff" } }).avif().toBuffer())).toBeNull();
    expect(formatoPorBytes(Buffer.from("no es una imagen, aunque diga image/png"))).toBeNull();
    expect(formatoPorBytes(Buffer.alloc(0))).toBeNull();
  });
});

describe("imagenAdmitida", () => {
  it("deja pasar un JPEG, un PNG y un WebP válidos", async () => {
    expect(await imagenAdmitida(jpeg)).toBe(true);
    expect(await imagenAdmitida(png)).toBe(true);
    expect(await imagenAdmitida(webp)).toBe(true);
  });
  it("rechaza el SVG", async () => {
    expect(await imagenAdmitida(SVG_DE_CODEX)).toBe(false);
  });
  it("rechaza un cuerpo que no es la imagen que dice ser", async () => {
    expect(await imagenAdmitida(Buffer.from("<html>Not a PNG</html>"))).toBe(false);
    // Encabezado de PNG sin nada válido detrás.
    expect(await imagenAdmitida(Buffer.concat([png.subarray(0, 8), Buffer.from("basura basura basura")]))).toBe(false);
  });
  it("rechaza lo que pesa más del tope aunque los bytes sean de JPEG", async () => {
    const enorme = Buffer.concat([jpeg, Buffer.alloc(TOPE_BYTES)]);
    expect(await imagenAdmitida(enorme)).toBe(false);
  });
  it("rechaza lo que trae más píxeles del tope (bomba de descompresión)", async () => {
    const lado = Math.ceil(Math.sqrt(LIMITE_PIXELES)) + 100;
    const grande = await sharp({ create: { width: lado, height: lado, channels: 3, background: "#000" } }).png({ compressionLevel: 9 }).toBuffer();
    expect(grande.length).toBeLessThan(TOPE_BYTES);
    expect(await imagenAdmitida(grande)).toBe(false);
  });
});
