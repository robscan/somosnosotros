import { describe, expect, it } from "vitest";
import { armarCiudades, armarCiudadesDeArtistas, CIUDADES, CIUDAD_INICIAL, ciudadCanonica, ciudadPorNombre, ciudadPorSlug, slugDeCiudad } from "./ciudad";

describe("ciudad", () => {
  it("empieza en San Luis Potosí, centrada en el centro histórico", () => {
    expect(CIUDAD_INICIAL.nombre).toBe("San Luis Potosí");
    expect(CIUDAD_INICIAL.centro.lat).toBeCloseTo(22.15, 1);
    expect(CIUDAD_INICIAL.centro.lng).toBeCloseTo(-100.98, 1);
    expect(CIUDAD_INICIAL.zoom).toBeGreaterThanOrEqual(11);
  });
  it("resuelve por slug o nombre y cae en la inicial si no existe", () => {
    expect(ciudadPorSlug("san-luis-potosi").nombre).toBe("San Luis Potosí");
    expect(ciudadPorSlug("otra").nombre).toBe(CIUDAD_INICIAL.nombre);
    expect(ciudadPorNombre("San Luis Potosí").slug).toBe("san-luis-potosi");
    expect(CIUDADES.every((c) => /^[a-z0-9-]+$/.test(c.slug))).toBe(true);
  });
  it("hace slugs sin acentos y unifica el área metropolitana", () => {
    expect(slugDeCiudad("Querétaro")).toBe("queretaro");
    expect(slugDeCiudad("  Ciudad de México ")).toBe("ciudad-de-mexico");
    expect(ciudadCanonica("Soledad de Graciano Sánchez")).toBe("San Luis Potosí");
    expect(ciudadCanonica("soledad de graciano sanchez")).toBe("San Luis Potosí");
    expect(ciudadCanonica("  Guadalajara ")).toBe("Guadalajara");
    expect(ciudadCanonica("")).toBe("");
    expect(ciudadCanonica(null)).toBe("");
  });
  it("arma las ciudades a partir de los lugares y los eventos: la inicial siempre y primero", () => {
    const c = armarCiudades(
      [
        { ciudad: "Querétaro", lat: 20.58, lng: -100.38 },
        { ciudad: "Querétaro", lat: 20.60, lng: -100.40 },
        { ciudad: "Soledad de Graciano Sánchez", lat: 22.18, lng: -100.94 },
        { ciudad: "Guadalajara", lat: 20.67, lng: -103.35 },
      ],
      [{ ciudad: "Querétaro" }, { ciudad: "San Luis Potosí" }, { ciudad: "" }],
    );
    expect(c.map((x) => x.nombre)).toEqual(["San Luis Potosí", "Querétaro", "Guadalajara"]);
    expect(c[0]).toMatchObject({ slug: "san-luis-potosi", lugares: 1, eventos: 2, centro: CIUDAD_INICIAL.centro });
    expect(c[1]).toMatchObject({ slug: "queretaro", lugares: 2, eventos: 1, zoom: 13 });
    expect(c[1].centro.lat).toBeCloseTo(20.59, 2);
    expect(c[1].centro.lng).toBeCloseTo(-100.39, 2);
    expect(ciudadPorSlug("queretaro", c).nombre).toBe("Querétaro");
    expect(ciudadPorSlug("nada", c).nombre).toBe("San Luis Potosí");
    expect(armarCiudades([], []).map((x) => x.nombre)).toEqual(["San Luis Potosí"]);
  });
  it("arma las ciudades de Artistas a partir de los artistas: la inicial siempre y primero, las demás por cuántos tienen", () => {
    const c = armarCiudadesDeArtistas([
      { ciudad: "Guadalajara" },
      { ciudad: "Querétaro" },
      { ciudad: "Querétaro" },
      { ciudad: "San Luis Potosí" },
      { ciudad: "Soledad de Graciano Sánchez" },
      { ciudad: "" },
      { ciudad: "Aguascalientes" },
    ]);
    expect(c.map((x) => [x.nombre, x.artistas])).toEqual([
      ["San Luis Potosí", 3],
      ["Querétaro", 2],
      ["Aguascalientes", 1],
      ["Guadalajara", 1],
    ]);
    expect(c[1]).toMatchObject({ slug: "queretaro", zoom: 13 });
    expect(ciudadPorSlug("guadalajara", c).artistas).toBe(1);
    expect(armarCiudadesDeArtistas([])).toEqual([{ ...CIUDAD_INICIAL, artistas: 0 }]);
  });
});
