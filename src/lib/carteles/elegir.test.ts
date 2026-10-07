import { describe, expect, it } from "vitest";
import { afinidad, cuantasTandas, elegir as elegirConFoto, ordenar, sinFotoDe, tandasDe, type Datos } from "./elegir";
import { plantillaMedida, PLANTILLAS_CARTEL } from "../medir";
import { CATALOGO, plantillaPorId } from "./plantillas";

const base: Datos = { conImagen: true, tipoLugar: null, disciplinas: [], artistas: 0, memoria: null };
const familias = (ps: { familia: string }[]) => ps.map((p) => p.familia);
/** Las plantillas de la tanda, sin decir cuál va sin foto (las pruebas de antes de OL-337). */
const elegir = (...a: Parameters<typeof elegirConFoto>) => elegirConFoto(...a).map((e) => e.plantilla);

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

describe("siempre una sin imagen (OL-337)", () => {
  const casos: [string, Datos][] = [
    ["con imagen", base],
    ["museo con artes visuales", { ...base, tipoLugar: "museo", disciplinas: ["artes_visuales"] }],
    ["foro con música y memoria", { ...base, tipoLugar: "foro", disciplinas: ["musica"], memoria: "cine-sangre" }],
    ["plaza con danza, 6 artistas", { ...base, tipoLugar: "plaza", disciplinas: ["danza", "circo"], artistas: 6 }],
    ["títulos que se cortan", { ...base, recortan: new Set(["galeria-marco", "deco-sol"]), recortanSinFoto: new Set(["tipo-franja"]) }],
  ];
  for (const [nombre, d] of casos) {
    it(`${nombre}: en cada tanda exactamente una va sin foto, de las que pueden, y las familias siguen distintas mientras se pueda`, () => {
      const tandas = tandasDe(CATALOGO, d);
      expect(tandas).toHaveLength(cuantasTandas(CATALOGO, d));
      for (const [i, tanda] of tandas.entries()) {
        expect(tanda).toHaveLength(4);
        // Doce plantillas de seis familias: las dos primeras tandas son de cuatro familias; la tercera lleva lo que queda (como antes de OL-337).
        if (i < 2) expect(new Set(tanda.map((e) => e.plantilla.familia)).size).toBe(4);
        const sinFoto = tanda.filter((e) => e.sinFoto);
        expect(sinFoto).toHaveLength(1);
        expect(sinFoto[0].plantilla.fotoNecesaria).toBe(false);
      }
      // «Ver otros diseños» trae las mismas tandas, vuelta incluida.
      for (let i = 0; i <= tandas.length; i++) expect(elegirConFoto(CATALOGO, d, i)).toEqual(tandas[i % tandas.length]);
    });
  }
  it("la primera de la tanda (la que mejor encaja) conserva su foto", () => {
    for (const [, d] of casos) for (const tanda of tandasDe(CATALOGO, d)) expect(tanda[0].sinFoto).toBe(false);
  });
  it("la tipográfica es la de más afinidad entre las demás, medida sin foto", () => {
    const d = { ...base, tipoLugar: "museo", disciplinas: ["artes_visuales"] };
    const [primera] = tandasDe(CATALOGO, d);
    const resto = primera.slice(1).map((e) => e.plantilla);
    const mejor = Math.max(...resto.map((p) => afinidad(p, d)));
    const elegida = primera.find((e) => e.sinFoto)!.plantilla;
    expect(afinidad(elegida, d)).toBe(mejor);
    expect(elegida).toBe(resto.find((p) => afinidad(p, d) === mejor)); // empate: la que va antes
  });
  it("cuenta lo que se corta sin foto: una que corta el título sin foto cede el lugar", () => {
    const tanda = elegir(CATALOGO, base);
    const sinCorte = sinFotoDe(tanda, base)!;
    const conCorte = sinFotoDe(tanda, { ...base, recortanSinFoto: new Set([sinCorte.id]) })!;
    expect(conCorte.id).not.toBe(sinCorte.id);
  });
  it("si solo la primera puede ir sin foto, va ella; si ninguna puede, ninguna", () => {
    const sangre = plantillaPorId("cine-sangre")!;
    const franja = plantillaPorId("tipo-franja")!;
    expect(sinFotoDe([franja, sangre], base)).toBe(franja);
    expect(sinFotoDe([sangre], base)).toBeNull();
  });
  it("sin ninguna imagen, todas van sin foto (y ninguna pide foto)", () => {
    const sin = { ...base, conImagen: false };
    for (const tanda of tandasDe(CATALOGO, sin)) for (const e of tanda) expect(e).toMatchObject({ sinFoto: true, plantilla: { fotoNecesaria: false } });
  });
});
