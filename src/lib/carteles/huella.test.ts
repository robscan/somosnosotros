import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { armarCarrusel, PORTADA } from "../instagram/carrusel";
import { distanciaBits, distanciaColor, esHuella, mismoCartel, partesDeHuella, UMBRAL_BITS, UMBRAL_COLOR } from "./huella";
import { huellaDeCartel } from "./huellaServidor";

/**
 * OL-464 (bitácora 496): la huella de un cartel. Founder: «Este festival tiene más eventos que carteles. Asegúrate de que no se repitan las
 * imágenes». Cada acto guarda su propia copia del cartel del día (otra dirección, otros bytes): dos copias re-codificadas son el mismo cartel; dos
 * carteles distintos no, ni dos programas del día hechos con la misma plantilla, ni el mismo diseño en otros colores.
 */
/** Un programa del día con la plantilla del festival (fondo, título y franja iguales): cambian el día, la foto del día y la lista de actividades,
 *  como en los programas reales de «Cultura Mística». */
const programa = (dia: string, actos: string[], fondo = "#2b1846", tinta = "#f4c95d", foto = 0) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="1080" height="1350" fill="${fondo}"/>
    <text x="540" y="150" font-family="Helvetica, Arial" font-weight="700" font-size="96" fill="${tinta}" text-anchor="middle">Programa</text>
    <text x="540" y="260" font-family="Helvetica, Arial" font-size="72" fill="${tinta}" text-anchor="middle">${dia}</text>
    <circle cx="${300 + foto * 240}" cy="${470 + foto * 30}" r="${120 + foto * 25}" fill="${["#f7b2d9", "#9fc0ff", "#ff8a3d"][foto % 3]}"/>
    <rect x="${640 - foto * 520}" y="360" width="340" height="${220 + foto * 40}" fill="${["#c8f1e4", "#e9c08f", "#e2d0ff"][foto % 3]}"/>
    ${actos.map((a, i) => `<rect x="80" y="${700 + i * 130}" width="${280 + ((i * 97 + foto * 53) % 600)}" height="90" rx="20" fill="${tinta}"/><text x="110" y="${760 + i * 130}" font-family="Helvetica, Arial" font-size="52" fill="${fondo}">${a}</text>`).join("")}
    <rect x="80" y="1260" width="920" height="12" fill="${tinta}"/></svg>`);

let viernes: Buffer, viernes72: Buffer, viernesChico: Buffer, sabado: Buffer, otro: Buffer;
beforeAll(async () => {
  const base = await sharp(programa("Viernes 30 de octubre", ["5:30 Meditación", "6:30 Escritura", "9:00 Tarot"])).jpeg({ quality: 90 }).toBuffer();
  viernes = base;
  // Las copias que guarda `ponerCartel` (re-codificadas, otra calidad) y una de otra fuente, más chica y en WebP.
  viernes72 = await sharp(base).jpeg({ quality: 72, mozjpeg: true }).toBuffer();
  viernesChico = await sharp(base).resize(720).webp({ quality: 75 }).toBuffer();
  // El del sábado: la misma plantilla y los mismos colores, otro texto.
  sabado = await sharp(programa("Sábado 31 de octubre", ["11:00 Yoga", "1:00 Mercadito", "5:00 Cacao", "7:00 Cartas"], undefined, undefined, 1)).jpeg({ quality: 90 }).toBuffer();
  otro = await sharp(programa("Cultura Mística", ["Del 30 de oct", "al 1 de nov", "Aurora Co-Lab"], "#123c3a", "#c8f1e4", 3)).jpeg({ quality: 90 }).toBuffer();
});

describe("huellaDeCartel y mismoCartel", () => {
  it("la huella es forma (dHash de 256 bits), color (rejilla de 4 × 4) y bytes (SHA-256), en hexadecimal; la misma imagen da la misma huella", async () => {
    const h = await huellaDeCartel(viernes);
    expect(esHuella(h)).toBe(true);
    expect(h).toBe(await huellaDeCartel(Buffer.from(viernes)));
    expect(await huellaDeCartel(Buffer.from("no es una imagen"))).toBeNull();
  });

  it("dos copias re-codificadas del mismo cartel (otra calidad, otro tamaño) son el mismo cartel aunque sus bytes difieran", async () => {
    const [a, b, c] = await Promise.all([huellaDeCartel(viernes), huellaDeCartel(viernes72), huellaDeCartel(viernesChico)]);
    expect(partesDeHuella(a)!.bytes).not.toBe(partesDeHuella(b)!.bytes);
    expect(mismoCartel(a, b)).toBe(true);
    expect(mismoCartel(a, c)).toBe(true);
    expect(mismoCartel(b, c)).toBe(true);
  });

  it("dos carteles distintos no lo son, tampoco dos programas del día con la misma plantilla", async () => {
    const [v, s, o] = await Promise.all([huellaDeCartel(viernes72), huellaDeCartel(sabado), huellaDeCartel(otro)]);
    expect(mismoCartel(v, s)).toBe(false);
    expect(mismoCartel(v, o)).toBe(false);
    expect(distanciaBits(partesDeHuella(v)!.forma, partesDeHuella(s)!.forma)).toBeGreaterThan(UMBRAL_BITS);
  });

  it("los mismos bytes son el mismo cartel aunque el dHash diga otra cosa; sin huella no se sabe", () => {
    const sha = "a".repeat(64);
    const color = "8".repeat(96);
    expect(mismoCartel(`${"0".repeat(64)}.${color}.${sha}`, `${"f".repeat(64)}.${"0".repeat(96)}.${sha}`)).toBe(true);
    expect(mismoCartel(`${"0".repeat(64)}.${color}.${"b".repeat(64)}`, `${"f".repeat(64)}.${color}.${sha}`)).toBe(false);
    expect(mismoCartel(null, `${"0".repeat(64)}.${color}.${sha}`)).toBe(false);
    expect(mismoCartel("basura", "basura")).toBe(false);
  });
});

it("el mismo diseño en otros colores no es el mismo cartel (la forma casi igual, el color no)", async () => {
  const azul = await sharp(programa("Viernes 30 de octubre", ["5:30 Meditación", "6:30 Escritura", "9:00 Tarot"], "#0e1f4d", "#9fc0ff")).jpeg({ quality: 90 }).toBuffer();
  const [v, a] = await Promise.all([huellaDeCartel(viernes), huellaDeCartel(azul)]);
  expect(distanciaBits(partesDeHuella(v)!.forma, partesDeHuella(a)!.forma)).toBeLessThanOrEqual(UMBRAL_BITS);
  expect(distanciaColor(partesDeHuella(v)!.color, partesDeHuella(a)!.color)).toBeGreaterThan(UMBRAL_COLOR);
  expect(mismoCartel(v, a)).toBe(false);
});

describe("armarCarrusel con huellas: más actos que carteles", () => {
  it("once actos con su propia copia de tres carteles del día (direcciones distintas) dan la portada y tres imágenes, con los artistas de cada día", async () => {
    const [hv, hv2, hs, hs2, hm] = await Promise.all([huellaDeCartel(viernes), huellaDeCartel(viernes72), huellaDeCartel(sabado), huellaDeCartel(await sharp(sabado).jpeg({ quality: 60 }).toBuffer()), huellaDeCartel(otro)]);
    const domingo = await huellaDeCartel(await sharp(programa("Domingo 1 de noviembre", ["12:00 Astrología", "6:00 Cuencos", "8:30 Fogata"], undefined, undefined, 2)).jpeg({ quality: 85 }).toBuffer());
    const dia = (d: number, h: number) => new Date(Date.UTC(2026, 9, d, h)).toISOString();
    const acto = (n: number, d: number, huella: string | null, usuario: string) => ({ id: `acto-${n}`, titulo: `Acto ${n}`, imagen: `https://x.supabase.co/storage/v1/object/public/fotos/lugares/a/evento-${n}.jpg`, inicio: dia(d, 10 + n), fin: null, usuarios: [usuario], huella });
    const actos = [
      acto(1, 30, hv, "martha"),
      acto(2, 30, hv2, "gustono"),
      acto(3, 30, hv, "luna"),
      acto(4, 31, hs, "paloma"),
      acto(5, 31, hs2, "sahumerio"),
      acto(6, 31, hs, "ixchel"),
      acto(7, 31, hs2, "tambor"),
      acto(8, 32, domingo, "rocio"),
      acto(9, 32, domingo, "oraculo"),
      acto(10, 32, domingo, "tambor"),
      acto(11, 32, domingo, "martha"),
    ];
    const r = armarCarrusel({ portada: { titulo: "Cultura Mística", imagen: "https://x.supabase.co/storage/v1/object/public/fotos/lugares/a/marco.jpg", huella: hm }, eventos: actos, ahora: new Date("2026-10-28T12:00:00Z"), zona: "America/Mexico_City" });
    expect(r.map((i) => i.clave)).toEqual([PORTADA, "acto-1", "acto-4", "acto-8"]);
    expect(r[1].eventos.sort()).toEqual(["acto-1", "acto-2", "acto-3"]);
    expect(r[2].usuarios.sort()).toEqual(["ixchel", "paloma", "sahumerio", "tambor"]);
    expect(r[3].usuarios.sort()).toEqual(["martha", "oraculo", "rocio", "tambor"]);
  });

  it("sin huellas solo cuenta la dirección (como antes)", () => {
    const a = { id: "a", titulo: "A", imagen: "https://x/a.jpg", inicio: "2026-10-30T20:00:00Z", fin: null, usuarios: [] };
    const r = armarCarrusel({ portada: { titulo: "F", imagen: null }, eventos: [a, { ...a, id: "b", imagen: "https://x/b.jpg" }], ahora: new Date("2026-10-28T12:00:00Z"), zona: "America/Mexico_City" });
    expect(r).toHaveLength(3);
  });
});
