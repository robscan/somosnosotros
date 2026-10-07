import sharp from "sharp";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { traerImagen } from "./generar";

/** OL-329: la imagen que trae el generador solo es del Storage propio y solo pasa si sus bytes son JPEG, PNG o WebP razonables. */

const SUPABASE = "https://viesoxgrfvftkgpjbnml.supabase.co";
const PROPIA = `${SUPABASE}/storage/v1/object/public/fotos/eventos/x/`;
const SVG_DE_CODEX = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#f80808"/></svg>`);

let jpeg: Buffer;
let png: Buffer;
let webp: Buffer;
beforeAll(async () => {
  const base = sharp({ create: { width: 64, height: 48, channels: 3, background: "#337799" } });
  jpeg = await base.clone().jpeg().toBuffer();
  png = await base.clone().png().toBuffer();
  webp = await base.clone().webp().toBuffer();
});

/** Un `fetch` falso que responde `cuerpo` con el tipo que se diga. */
function respuesta(cuerpo: Buffer, tipo: string) {
  return vi.fn(async () => new Response(new Uint8Array(cuerpo), { status: 200, headers: { "Content-Type": tipo } })) as unknown as typeof fetch;
}
// Cada caso usa una URL distinta: el generador guarda en memoria lo que ya validó.
let n = 0;
const unica = (ext: string) => `${PROPIA}prueba-${++n}.${ext}`;

describe("traerImagen", () => {
  it("deja pasar un JPEG, un PNG y un WebP válidos del Storage propio", async () => {
    expect(await traerImagen(unica("jpg"), { traer: respuesta(jpeg, "image/jpeg"), supabaseUrl: SUPABASE })).not.toBeNull();
    expect(await traerImagen(unica("png"), { traer: respuesta(png, "image/png"), supabaseUrl: SUPABASE })).not.toBeNull();
    expect(await traerImagen(unica("webp"), { traer: respuesta(webp, "image/webp"), supabaseUrl: SUPABASE })).not.toBeNull();
  });
  it("rechaza un SVG aunque venga como image/png o como image/svg+xml", async () => {
    expect(await traerImagen(unica("png"), { traer: respuesta(SVG_DE_CODEX, "image/png"), supabaseUrl: SUPABASE })).toBeNull();
    expect(await traerImagen(unica("svg"), { traer: respuesta(SVG_DE_CODEX, "image/svg+xml"), supabaseUrl: SUPABASE })).toBeNull();
  });
  it("rechaza un cuerpo que dice image/png y no es un PNG", async () => {
    expect(await traerImagen(unica("png"), { traer: respuesta(Buffer.from("esto no es un PNG, ni de lejos"), "image/png"), supabaseUrl: SUPABASE })).toBeNull();
  });
  it("acepta un JPEG aunque el Content-Type esté mal (cuentan los bytes, no la cabecera)", async () => {
    expect(await traerImagen(unica("jpg"), { traer: respuesta(jpeg, "application/octet-stream"), supabaseUrl: SUPABASE })).not.toBeNull();
  });
  it("rechaza lo que pasa del tope de peso", async () => {
    const enorme = Buffer.concat([jpeg, Buffer.alloc(7 * 1024 * 1024)]);
    expect(await traerImagen(unica("jpg"), { traer: respuesta(enorme, "image/jpeg"), supabaseUrl: SUPABASE })).toBeNull();
  });
  it("rechaza una URL de otro host o de otro bucket sin ni siquiera pedirla", async () => {
    const traer = respuesta(jpeg, "image/jpeg");
    expect(await traerImagen("https://ejemplo.org/storage/v1/object/public/fotos/a.jpg", { traer, supabaseUrl: SUPABASE })).toBeNull();
    expect(await traerImagen("http://169.254.169.254/latest/meta-data/", { traer, supabaseUrl: SUPABASE })).toBeNull();
    expect(await traerImagen(`${SUPABASE}/storage/v1/object/public/obras/privada.png`, { traer, supabaseUrl: SUPABASE })).toBeNull();
    expect(traer).not.toHaveBeenCalled();
  });
  it("una respuesta que no es 200 devuelve null", async () => {
    const traer = vi.fn(async () => new Response("no", { status: 404 })) as unknown as typeof fetch;
    expect(await traerImagen(unica("jpg"), { traer, supabaseUrl: SUPABASE })).toBeNull();
  });
});
