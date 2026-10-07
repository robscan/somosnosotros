import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { imagenesDelCartel, type ParaCartel } from "./cargar";
import { AHORA_CASOS, CASOS } from "./casos";
import { carpetaFotoPropia, esFotoPropia, TOPE_URL_FOTO } from "./fotoPropia";
import { generarCartel } from "./generar";
import { INICIAL, reponerRecordado } from "./memoria";
import { hrefCartel, parametrosCartel } from "./parametros";
import { plantillaPorId } from "./plantillas";
import { FORMATOS } from "./tokens";

/** OL-337: la foto propia del creador de cartel (quién la acepta, cómo viaja en la URL, cómo se recuerda y que va primero al dibujar). */

const SUPABASE = "https://viesoxgrfvftkgpjbnml.supabase.co";
const ANA = "11111111-1111-4111-8111-111111111111";
const OTRA = "22222222-2222-4222-8222-222222222222";
const CARPETA = `${SUPABASE}/storage/v1/object/public/fotos/lugares/${ANA}/`;
const FOTO = `${CARPETA}cartel-foto-0e0e0e0e-0000-4000-8000-000000000001.jpg`;

describe("esFotoPropia", () => {
  it("la carpeta es la de quien mira en `lugares/` del bucket `fotos`", () => {
    expect(carpetaFotoPropia(ANA, SUPABASE)).toBe(CARPETA);
    expect(carpetaFotoPropia(ANA, `${SUPABASE}/`)).toBe(CARPETA);
    expect(carpetaFotoPropia(ANA, null)).toBeNull();
    expect(carpetaFotoPropia("", SUPABASE)).toBeNull();
  });
  it("acepta un archivo directo de esa carpeta", () => {
    expect(esFotoPropia(FOTO, CARPETA)).toBe(true);
    expect(esFotoPropia(`${CARPETA}evento-123.webp`, CARPETA)).toBe(true);
  });
  it("rechaza lo de otra cuenta, otro bucket, otro dominio, subcarpetas, escapes, consultas y los carteles hechos aquí", () => {
    for (const url of [
      FOTO.replace(ANA, OTRA),
      FOTO.replace("/fotos/", "/obras/"),
      FOTO.replace(SUPABASE, "https://otro.example"),
      `${CARPETA}sub/foto.jpg`,
      `${CARPETA}../${OTRA}/foto.jpg`,
      `${CARPETA}%2e%2e/foto.jpg`,
      `${CARPETA}foto.jpg?x=1`,
      `${CARPETA}.oculta.jpg`,
      `${CARPETA}cartel-generado-abc.jpg`,
      `${CARPETA}`,
      `${CARPETA}${"a".repeat(TOPE_URL_FOTO)}.jpg`,
      null,
      42,
    ])
      expect(esFotoPropia(url, CARPETA), String(url)).toBe(false);
    expect(esFotoPropia(FOTO, null)).toBe(false);
  });
});

describe("la foto en la URL del cartel", () => {
  it("hrefCartel la lleva en `foto`, y la opción sin foto solo dice `sinfoto=1`", () => {
    const con = new URL(hrefCartel("oca", { plantilla: "tipo-fecha", formato: "4x5", foto: FOTO }), "http://x").searchParams;
    expect(con.get("foto")).toBe(FOTO);
    const sin = new URL(hrefCartel("oca", { plantilla: "tipo-fecha", formato: "4x5", foto: FOTO, sinFoto: true }), "http://x").searchParams;
    expect(sin.get("foto")).toBeNull();
    expect(sin.get("sinfoto")).toBe("1");
  });
  it("parametrosCartel la lee de vuelta; sinfoto manda sobre foto", () => {
    expect(parametrosCartel(new URLSearchParams({ foto: FOTO }))).toMatchObject({ foto: FOTO, sinFoto: false });
    expect(parametrosCartel(new URLSearchParams({ foto: FOTO, sinfoto: "1" }))).toMatchObject({ foto: null, sinFoto: true });
    expect(parametrosCartel(new URLSearchParams())).toMatchObject({ foto: null, sinFoto: false });
  });
});

describe("imagenesDelCartel", () => {
  const datos: ParaCartel = {
    evento: CASOS.corto,
    gestiona: true,
    perfilId: ANA,
    imagenes: [`${SUPABASE}/storage/v1/object/public/fotos/lugares/x/evento.jpg`, `${SUPABASE}/storage/v1/object/public/fotos/artistas/y/portada.jpg`],
    memoria: null,
    datosEleccion: { conImagen: true, tipoLugar: null, disciplinas: [], artistas: 0, memoria: null },
  };
  it("la foto propia va primera y luego el orden de siempre (sin repetirla)", () => {
    expect(imagenesDelCartel(datos, { foto: FOTO, sinFoto: false }, SUPABASE).imagenes).toEqual([FOTO, ...datos.imagenes]);
    expect(imagenesDelCartel({ ...datos, imagenes: [FOTO] }, { foto: FOTO, sinFoto: false }, SUPABASE).imagenes).toEqual([FOTO]);
  });
  it("sin imágenes de antes, con la foto propia ya hay imagen", () => {
    const sinNada = { ...datos, imagenes: [], datosEleccion: { ...datos.datosEleccion, conImagen: false } };
    expect(imagenesDelCartel(sinNada, { foto: FOTO, sinFoto: false }, SUPABASE)).toMatchObject({ imagenes: [FOTO], datosEleccion: { conImagen: true } });
  });
  it("una foto que no es de quien mira se ignora: el orden de siempre", () => {
    expect(imagenesDelCartel(datos, { foto: FOTO.replace(ANA, OTRA), sinFoto: false }, SUPABASE)).toBe(datos);
    expect(imagenesDelCartel(datos, { foto: null, sinFoto: false }, SUPABASE)).toBe(datos);
  });
  it("la opción sin foto no lleva ninguna imagen, ni la propia", () => {
    expect(imagenesDelCartel(datos, { foto: FOTO, sinFoto: true }, SUPABASE).imagenes).toEqual([]);
  });
  it("al dibujar, la primera imagen que se pide es la foto propia", async () => {
    const foto = await sharp({ create: { width: 400, height: 300, channels: 3, background: "#cc3322" } }).jpeg().toBuffer();
    const pedidas: string[] = [];
    const traer = vi.fn(async (url: unknown) => {
      pedidas.push(String(url));
      return new Response(new Uint8Array(foto), { status: 200 });
    }) as unknown as typeof fetch;
    const unica = `${CARPETA}cartel-foto-${crypto.randomUUID()}.jpg`;
    await generarCartel(imagenesDelCartel(datos, { foto: unica, sinFoto: false }, SUPABASE), plantillaPorId("cine-sangre")!, FORMATOS["4x5"], { ahora: AHORA_CASOS, ancho: 270, descarga: { traer, supabaseUrl: SUPABASE } });
    expect(pedidas).toEqual([unica]);
  });
});

describe("memoria de pantalla con foto (reponerRecordado)", () => {
  const cuantas = { tandas: 3, tandasConFoto: 3, carpeta: CARPETA };
  it("repone la foto propia con el paso, la tanda, el diseño, el formato y el título", () => {
    const guardado = { paso: "ver", tanda: 2, plantilla: "deco-sol", formato: "9x16", titulo: "OCA", foto: FOTO };
    expect(reponerRecordado(guardado, cuantas)).toEqual(guardado);
  });
  it("una foto de otra cuenta (o rara) no se repone; lo demás sí", () => {
    expect(reponerRecordado({ paso: "elegir", tanda: 1, plantilla: null, formato: "4x5", titulo: "", foto: FOTO.replace(ANA, OTRA) }, cuantas)).toMatchObject({ tanda: 1, foto: null });
    expect(reponerRecordado({ tanda: 1, foto: { url: FOTO } }, cuantas)).toMatchObject({ tanda: 1, foto: null });
    expect(reponerRecordado({ foto: FOTO }, { ...cuantas, carpeta: null })).toMatchObject({ foto: null });
  });
  it("la tanda se mide con las tandas que tocan: con foto o sin ella", () => {
    expect(reponerRecordado({ tanda: 3, foto: FOTO }, { tandas: 3, tandasConFoto: 4, carpeta: CARPETA }).tanda).toBe(3);
    expect(reponerRecordado({ tanda: 3, foto: null }, { tandas: 3, tandasConFoto: 4, carpeta: CARPETA }).tanda).toBe(0);
  });
  it("lo de antes de OL-337 (sin foto) y lo roto caen al valor de siempre", () => {
    expect(reponerRecordado({ paso: "elegir", tanda: 1, plantilla: null, formato: "4x5", titulo: "" }, cuantas)).toEqual({ ...INICIAL, tanda: 1 });
    expect(reponerRecordado(null, cuantas)).toEqual(INICIAL);
    expect(reponerRecordado("x", cuantas)).toEqual(INICIAL);
    expect(reponerRecordado({ paso: "ver", plantilla: null, tanda: -1, formato: "16x9", titulo: 5 }, cuantas)).toEqual(INICIAL);
  });
});
