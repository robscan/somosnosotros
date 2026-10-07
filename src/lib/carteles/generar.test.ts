import sharp from "sharp";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { AHORA_CASOS, CASOS } from "./casos";
import { generarCartel, traerImagen } from "./generar";
import { CATALOGO } from "./plantillas";
import { FORMATOS } from "./tokens";

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

/** OL-334 (F07 residual de OL-327): la descarga lleva su propio plazo; al vencer, la imagen se descarta y el cartel sale sin foto. */
describe("traerImagen: plazo de descarga", () => {
  it("pide la imagen con un AbortSignal que se aborta al vencer el plazo", async () => {
    let senal: AbortSignal | undefined;
    const traer = vi.fn(async (_url: unknown, init?: RequestInit) => {
      senal = init?.signal ?? undefined;
      return new Response(new Uint8Array(jpeg), { status: 200 });
    }) as unknown as typeof fetch;
    expect(await traerImagen(unica("jpg"), { traer, supabaseUrl: SUPABASE })).not.toBeNull();
    expect(senal).toBeInstanceOf(AbortSignal);
    expect(senal!.aborted).toBe(false); // se bajó a tiempo: no se aborta
    // Y si no responde, la señal sí se aborta.
    let senalColgada: AbortSignal | undefined;
    const colgado = vi.fn((_url: unknown, init?: RequestInit) => {
      senalColgada = init?.signal ?? undefined;
      return new Promise<Response>(() => {});
    }) as unknown as typeof fetch;
    await traerImagen(unica("jpg"), { traer: colgado, supabaseUrl: SUPABASE, plazoMs: 30 });
    expect(senalColgada!.aborted).toBe(true);
  });
  it("un fetch que no responde dentro del plazo se descarta (aunque no atienda la señal) y no lanza", async () => {
    const colgado = vi.fn(() => new Promise<Response>(() => {})) as unknown as typeof fetch;
    const t0 = performance.now();
    expect(await traerImagen(unica("jpg"), { traer: colgado, supabaseUrl: SUPABASE, plazoMs: 40 })).toBeNull();
    expect(performance.now() - t0).toBeLessThan(1500);
  });
  it("un cuerpo que empieza y se queda a medias también vence", async () => {
    const cuerpo = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new Uint8Array(jpeg.subarray(0, 10))); } }); // nunca cierra
    const traer = vi.fn(async () => new Response(cuerpo, { status: 200 })) as unknown as typeof fetch;
    const t0 = performance.now();
    expect(await traerImagen(unica("jpg"), { traer, supabaseUrl: SUPABASE, plazoMs: 40 })).toBeNull();
    expect(performance.now() - t0).toBeLessThan(1500);
  });
  it("rechaza el exceso de bytes aunque la cancelación del cuerpo nunca termine", async () => {
    const cancelar = vi.fn(() => new Promise<void>(() => {}));
    const cuerpo = new ReadableStream<Uint8Array>({
      start(c) { c.enqueue(new Uint8Array(7 * 1024 * 1024)); },
      cancel: cancelar,
    });
    const traer = vi.fn(async () => new Response(cuerpo)) as unknown as typeof fetch;
    expect(await traerImagen(unica("jpg"), { traer, supabaseUrl: SUPABASE, plazoMs: 40 })).toBeNull();
    expect(cancelar).toHaveBeenCalledOnce();
  }, 1500);
  it("cancela sin leer una respuesta que declara más bytes que el límite", async () => {
    const cancelar = vi.fn(() => new Promise<void>(() => {}));
    const cuerpo = new ReadableStream<Uint8Array>({ cancel: cancelar });
    const traer = vi.fn(async () => new Response(cuerpo, { headers: { "Content-Length": String(7 * 1024 * 1024) } })) as unknown as typeof fetch;
    expect(await traerImagen(unica("jpg"), { traer, supabaseUrl: SUPABASE, plazoMs: 40 })).toBeNull();
    expect(cancelar).toHaveBeenCalledOnce();
  }, 1500);
  it("un fetch que rechaza (red caída, señal abortada) devuelve null", async () => {
    const traer = vi.fn(async () => { throw new Error("red caída"); }) as unknown as typeof fetch;
    expect(await traerImagen(unica("jpg"), { traer, supabaseUrl: SUPABASE })).toBeNull();
  });
  it("lo que no llegó a tiempo no se guarda en la memoria: la siguiente petición lo vuelve a pedir", async () => {
    const url = unica("jpg");
    const colgado = vi.fn(() => new Promise<Response>(() => {})) as unknown as typeof fetch;
    expect(await traerImagen(url, { traer: colgado, supabaseUrl: SUPABASE, plazoMs: 20 })).toBeNull();
    expect(await traerImagen(url, { traer: respuesta(jpeg, "image/jpeg"), supabaseUrl: SUPABASE })).not.toBeNull();
  });
});

describe("generarCartel: el plazo de descarga cabe en el tiempo total y el cartel sale igual al de sin foto", () => {
  const evento = CASOS.corto;
  const datos = (imagenes: string[]) => ({ evento, gestiona: true, perfilId: "p", imagenes, memoria: null, datosEleccion: {} as never });
  const plantilla = CATALOGO[0];
  const formato = FORMATOS["4x5"];
  const base = { ahora: AHORA_CASOS, ancho: 270 };

  it("si la imagen no responde dentro del plazo, el cartel es idéntico al de sin foto", async () => {
    const colgado = vi.fn(() => new Promise<Response>(() => {})) as unknown as typeof fetch;
    const t0 = performance.now();
    const [conColgada, sinFoto] = await Promise.all([
      generarCartel(datos([unica("jpg")]), plantilla, formato, { ...base, descarga: { traer: colgado, supabaseUrl: SUPABASE, plazoMs: 40 } }),
      generarCartel(datos([]), plantilla, formato, base),
    ]);
    expect(conColgada.imagen.equals(sinFoto.imagen)).toBe(true);
    expect(performance.now() - t0).toBeLessThan(4000);
  });
  it("con una imagen sana, el cartel sí lleva foto (la prueba de arriba no es vacía)", async () => {
    const foto = await sharp({ create: { width: 400, height: 300, channels: 3, background: "#cc3322" } }).jpeg().toBuffer();
    const [con, sin] = await Promise.all([
      generarCartel(datos([unica("jpg")]), plantilla, formato, { ...base, descarga: { traer: respuesta(foto, "image/jpeg"), supabaseUrl: SUPABASE } }),
      generarCartel(datos([]), plantilla, formato, base),
    ]);
    expect(con.imagen.equals(sin.imagen)).toBe(false);
  });
  it("la primera imagen colgada no impide que la segunda, sana, se use dentro del tiempo total", async () => {
    const foto = await sharp({ create: { width: 400, height: 300, channels: 3, background: "#2255cc" } }).jpeg().toBuffer();
    const colgada = unica("jpg");
    const sana = unica("jpg");
    const traer = vi.fn((url: unknown) => (String(url) === colgada ? new Promise<Response>(() => {}) : Promise.resolve(new Response(new Uint8Array(foto), { status: 200 })))) as unknown as typeof fetch;
    const [con, sin] = await Promise.all([
      generarCartel(datos([colgada, sana]), plantilla, formato, { ...base, descarga: { traer, supabaseUrl: SUPABASE, plazoMs: 40 } }),
      generarCartel(datos([]), plantilla, formato, base),
    ]);
    expect(con.imagen.equals(sin.imagen)).toBe(false);
  });
  it("el tiempo total abarca la descarga: sin presupuesto no se pide ninguna imagen y sale sin foto", async () => {
    const traer = vi.fn(async () => new Response("x", { status: 200 })) as unknown as typeof fetch;
    const [agotado, sinFoto] = await Promise.all([
      generarCartel(datos([unica("jpg")]), plantilla, formato, { ...base, descarga: { traer, supabaseUrl: SUPABASE, tiempoMaxFotoMs: 0 } }),
      generarCartel(datos([]), plantilla, formato, base),
    ]);
    expect(traer).not.toHaveBeenCalled();
    expect(agotado.imagen.equals(sinFoto.imagen)).toBe(true);
  });
});
