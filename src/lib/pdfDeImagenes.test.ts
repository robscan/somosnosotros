import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { medidasJpeg, pdfDeImagenes } from "./pdfDeImagenes";

/**
 * El PDF hecho a mano (OL-396): la cabecera, una página por JPEG con su imagen sin volver a comprimir, la tabla `xref` con el desplazamiento real
 * de cada objeto, el `trailer` y `%%EOF`. Que un visor lo abre se comprobó en la verificación (Chrome de la Mac, bitácora 427).
 */

const jpeg = (ancho: number, alto: number, canales: 1 | 3 = 3) =>
  sharp({ create: { width: ancho, height: alto, channels: 3, background: { r: 200, g: 120, b: 40 } } })
    .toColourspace(canales === 1 ? "b-w" : "srgb")
    .jpeg({ quality: 80 })
    .toBuffer();

/** Los objetos «N 0 obj» con su desplazamiento, leídos del archivo. */
function objetos(pdf: Buffer): Map<number, number> {
  const texto = pdf.toString("latin1");
  const m = new Map<number, number>();
  for (const x of texto.matchAll(/(?:^|\n)(\d+) 0 obj\n/g)) m.set(Number(x[1]), x.index! + (x[0].startsWith("\n") ? 1 : 0));
  return m;
}

describe("medidasJpeg", () => {
  it("lee el ancho, el alto y los canales del marcador de cuadro", async () => {
    expect(medidasJpeg(await jpeg(1275, 1650))).toEqual({ ancho: 1275, alto: 1650, componentes: 3 });
    expect(medidasJpeg(await jpeg(40, 30, 1)).componentes).toBe(1);
  });
  it("lo que no es JPEG lanza", async () => {
    expect(() => medidasJpeg(Buffer.from("%PDF-1.4"))).toThrow();
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#fff" } }).png().toBuffer();
    expect(() => medidasJpeg(png)).toThrow();
  });
});

describe("pdfDeImagenes (OL-396)", () => {
  it("dos páginas carta: cabecera, xref con los desplazamientos reales, trailer y %%EOF", async () => {
    const paginas = [await jpeg(1275, 1650), await jpeg(1275, 1650)];
    const pdf = pdfDeImagenes(paginas, { puntos: { ancho: 612, alto: 792 }, titulo: "Presentación de Leo Traeger", creado: new Date("2026-10-12T20:48:00Z") });
    const texto = pdf.toString("latin1");
    expect(texto.startsWith("%PDF-1.4\n")).toBe(true);
    expect(texto.endsWith("%%EOF\n")).toBe(true);
    // startxref apunta a «xref».
    const inicio = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(texto)![1]);
    expect(texto.slice(inicio, inicio + 5)).toBe("xref\n");
    // Cada entrada de la tabla apunta al principio de su objeto.
    const [, primero, cuantos] = /^xref\n(\d+) (\d+)\n/.exec(texto.slice(inicio))!.map(Number);
    expect(primero).toBe(0);
    expect(cuantos).toBe(4 + 3 * 2);
    const tabla = texto.slice(inicio).split("\n").slice(2, 2 + cuantos);
    expect(tabla[0]).toBe("0000000000 65535 f ");
    const reales = objetos(pdf);
    for (let n = 1; n < cuantos; n++) {
      expect(tabla[n]).toMatch(/^\d{10} 00000 n $/);
      expect(Number(tabla[n].slice(0, 10))).toBe(reales.get(n));
      expect(texto.slice(Number(tabla[n].slice(0, 10))).startsWith(`${n} 0 obj\n`)).toBe(true);
    }
    expect(texto).toContain("/Type /Pages /Kids [4 0 R 7 0 R] /Count 2");
    expect(texto).toContain("/MediaBox [0 0 612 792]");
    expect(texto).toContain("/Width 1275 /Height 1650 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode");
    expect(texto).toContain("q 612 0 0 792 0 0 cm /Im0 Do Q");
    expect(texto).toContain(`/Size ${cuantos} /Root 1 0 R /Info 3 0 R`);
    expect(texto).toContain("/CreationDate (D:20261012204800Z)");
    // El título con acentos, en UTF-16.
    expect(texto).toContain("/Title <FEFF00500072006500730065006E007400610063006900F3006E");
  });

  it("cada JPEG va tal cual, con su largo exacto", async () => {
    const pagina = await jpeg(1240, 1754);
    const pdf = pdfDeImagenes([pagina], { puntos: { ancho: 595, alto: 842 } });
    expect(pdf.indexOf(pagina)).toBeGreaterThan(0);
    expect(pdf.toString("latin1")).toContain(`/Length ${pagina.length} >>\nstream\n`);
    expect(pdf.toString("latin1")).toContain("/MediaBox [0 0 595 842]");
  });

  it("un JPEG en gris va como DeviceGray; sin páginas, lanza", async () => {
    const gris = await jpeg(20, 20, 1);
    expect(pdfDeImagenes([gris], { puntos: { ancho: 612, alto: 792 } }).toString("latin1")).toContain("/ColorSpace /DeviceGray");
    expect(() => pdfDeImagenes([], { puntos: { ancho: 612, alto: 792 } })).toThrow();
  });
});
