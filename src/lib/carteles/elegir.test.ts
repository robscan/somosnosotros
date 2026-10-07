import { describe, expect, it } from "vitest";
import { afinidad, cuantasTandas, elegir, ordenar, type Datos } from "./elegir";
import { plantillaMedida, PLANTILLAS_CARTEL } from "../medir";
import { CATALOGO, plantillaPorId } from "./plantillas";

const base: Datos = { conImagen: true, tipoLugar: null, disciplinas: [], artistas: 0, memoria: null };
const familias = (ps: { familia: string }[]) => ps.map((p) => p.familia);

describe("catálogo", () => {
  it("doce plantillas, seis familias de dos, ids únicos", () => {
    expect(CATALOGO).toHaveLength(12);
    expect(new Set(CATALOGO.map((p) => p.id)).size).toBe(12);
    const porFamilia = new Map<string, number>();
    for (const p of CATALOGO) porFamilia.set(p.familia, (porFamilia.get(p.familia) ?? 0) + 1);
    expect([...porFamilia.values()]).toEqual([2, 2, 2, 2, 2, 2]);
  });
  it("la lista cerrada de la medición (OL-336) nombra justo las plantillas del catálogo", () => {
    expect(CATALOGO.map((p) => plantillaMedida(p.id))).toEqual([...PLANTILLAS_CARTEL]);
  });
  it("plantillaPorId encuentra y rechaza", () => {
    expect(plantillaPorId("deco-sol")?.familia).toBe("deco");
    expect(plantillaPorId("no-existe")).toBeNull();
    expect(plantillaPorId(null)).toBeNull();
  });
});

describe("elegir", () => {
  it("cuatro, de familias distintas", () => {
    const cuatro = elegir(CATALOGO, base);
    expect(cuatro).toHaveLength(4);
    expect(new Set(familias(cuatro)).size).toBe(4);
  });
  it("sin imagen se descartan las que necesitan foto, en todas las tandas", () => {
    const sin = { ...base, conImagen: false };
    expect(ordenar(CATALOGO, sin).some((p) => p.fotoNecesaria)).toBe(false);
    for (let i = 0; i < cuantasTandas(CATALOGO, sin); i++) expect(elegir(CATALOGO, sin, i).every((p) => !p.fotoNecesaria)).toBe(true);
    expect(ordenar(CATALOGO, base).some((p) => p.fotoNecesaria)).toBe(true);
  });
  it("afinidad: un museo con artes visuales trae galería primero; un foro con música, cine o deco", () => {
    expect(elegir(CATALOGO, { ...base, tipoLugar: "museo", disciplinas: ["artes_visuales"] })[0].familia).toBe("galeria");
    expect(["cine", "deco"]).toContain(elegir(CATALOGO, { ...base, tipoLugar: "foro", disciplinas: ["musica"] })[0].familia);
    expect(["feria", "zine"]).toContain(elegir(CATALOGO, { ...base, tipoLugar: "plaza", disciplinas: ["danza", "circo"] })[0].familia);
  });
  it("la memoria del lugar va primero aunque su afinidad sea menor", () => {
    const d = { ...base, tipoLugar: "museo", disciplinas: ["artes_visuales"], memoria: "feria-boleto" };
    expect(elegir(CATALOGO, d)[0].id).toBe("feria-boleto");
  });
  it("una memoria que ya no sirve (pide foto y no hay) no se ofrece", () => {
    const d = { ...base, conImagen: false, memoria: "cine-sangre" };
    expect(elegir(CATALOGO, d).map((p) => p.id)).not.toContain("cine-sangre");
  });
  it("cuenta en contra no enseñar a todos los artistas y cortar el título", () => {
    const deco = plantillaPorId("deco-arco")!;
    expect(afinidad(deco, { ...base, artistas: 5 })).toBe(-1);
    expect(afinidad(deco, { ...base, recortan: new Set(["deco-arco"]) })).toBe(-3);
    const galeria = plantillaPorId("galeria-marco")!;
    expect(afinidad(galeria, { ...base, artistas: 5 })).toBe(0);
  });
  it("«Ver otras»: la segunda tanda trae otras plantillas y al acabarse vuelve a la primera", () => {
    const primera = elegir(CATALOGO, base, 0).map((p) => p.id);
    const segunda = elegir(CATALOGO, base, 1).map((p) => p.id);
    expect(segunda.some((id) => !primera.includes(id))).toBe(true);
    expect(elegir(CATALOGO, base, cuantasTandas(CATALOGO, base)).map((p) => p.id)).toEqual(primera);
    expect(cuantasTandas(CATALOGO, base)).toBe(3);
  });
  it("es estable: los mismos datos dan las mismas cuatro", () => {
    const d = { ...base, tipoLugar: "casa_de_cultura", disciplinas: ["musica"] };
    expect(elegir(CATALOGO, d).map((p) => p.id)).toEqual(elegir(CATALOGO, d).map((p) => p.id));
  });
});
