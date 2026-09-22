import { describe, expect, it } from "vitest";
import { ORIGEN } from "./sitemap";
import { qrDelMando, urlDelMando } from "./qr";

const ID = "44444444-4444-4444-4444-444444444444";

describe("qr del mando (OL-118)", () => {
  it("la dirección codificada es la absoluta del mando, con la base del sitio", () => {
    expect(urlDelMando(ID)).toBe(`https://somosnosotros.org/obra/${ID}/mando`);
    expect(urlDelMando(ID)).toBe(`${ORIGEN}/obra/${ID}/mando`);
  });

  it("sale un SVG completo y devuelve la misma URL que codifica", async () => {
    const { url, svg } = await qrDelMando(ID);
    expect(url).toBe(urlDelMando(ID));
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toMatch(/viewBox="0 0 \d+ \d+"/);
    expect(svg).toContain("<path"); // los módulos del código, no un lienzo vacío
  });

  it("es determinista y cambia con la obra: dos obras no comparten código", async () => {
    const a = await qrDelMando(ID);
    const otraVez = await qrDelMando(ID);
    const b = await qrDelMando("55555555-5555-5555-5555-555555555555");
    expect(otraVez.svg).toBe(a.svg);
    expect(b.svg).not.toBe(a.svg);
  });
});
