import { describe, expect, it } from "vitest";
import { altaLejosDeCiudades, armarCiudades, armarCiudadesDeArtistas, CIUDADES, CIUDAD_INICIAL, ciudadCanonica, ciudadInicialCercana, ciudadesDeHoja, ciudadMasCercana, ciudadPorNombre, ciudadPorSlug, filasDeCiudades, ofrecerUbicacionCiudades, raizConCiudad, slugDeCiudad, type Ciudad } from "./ciudad";

describe("ciudad", () => {
  it("«Cerca de ti» lleva a la ciudad cuyo centro queda más cerca, y sin lista, a la inicial", () => {
    const queretaro = { ...CIUDAD_INICIAL, slug: "queretaro", nombre: "Querétaro", centro: { lng: -100.39, lat: 20.59 } };
    const ciudades = [CIUDAD_INICIAL, queretaro];
    expect(ciudadMasCercana({ lat: 20.6, lng: -100.4 }, ciudades).slug).toBe("queretaro");
    expect(ciudadMasCercana({ lat: 22.15, lng: -100.98 }, ciudades).slug).toBe("san-luis-potosi");
    const ninguna: Ciudad[] = [];
    expect(ciudadMasCercana({ lat: 40.4, lng: -3.7 }, ninguna).slug).toBe("san-luis-potosi");
  });
  it("la raíz de una sección conserva la ciudad y suelta lo demás", () => {
    expect(raizConCiudad("/lugares", "?vista=lista&tipo=museo&ciudad=madrid")).toBe("/lugares?ciudad=madrid");
    expect(raizConCiudad("/", "?cuenta=borrada")).toBe("/");
    expect(raizConCiudad("/artistas", "")).toBe("/artistas");
    expect(raizConCiudad("/", "?ciudad=cordoba-espana")).toBe("/?ciudad=cordoba-espana");
  });
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
  it("cada ciudad tiene la zona que más se repite entre sus lugares y eventos; sin ninguna, la inicial", () => {
    const c = armarCiudades(
      [
        { ciudad: "Madrid, España", lat: 40.42, lng: -3.7, zona: "Europe/Madrid" },
        { ciudad: "Madrid, España", lat: 40.41, lng: -3.71, zona: "Europe/Madrid" },
        { ciudad: "San Luis Potosí", lat: 22.15, lng: -100.97, zona: "America/Mexico_City" },
        { ciudad: "Querétaro", lat: 20.58, lng: -100.38 },
      ],
      [{ ciudad: "San José, Costa Rica", zona: "America/Costa_Rica" }, { ciudad: "Madrid, España", zona: "Atlantic/Canary" }],
    );
    expect(Object.fromEntries(c.map((x) => [x.nombre, x.zona]))).toEqual({
      "San Luis Potosí": "America/Mexico_City",
      "Madrid, España": "Europe/Madrid",
      Querétaro: "America/Mexico_City",
      "San José, Costa Rica": "America/Costa_Rica",
    });
    expect(armarCiudades([], [])[0].zona).toBe("America/Mexico_City");
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

describe("hoja de ciudades (OL-270)", () => {
  const slp = CIUDAD_INICIAL;
  const qro = { ...slp, slug: "queretaro", nombre: "Querétaro", centro: { lat: 20.59, lng: -100.39 }, centroConocido: true };
  const gdl = { ...slp, slug: "guadalajara", nombre: "Guadalajara", centro: { lat: 20.67, lng: -103.35 }, centroConocido: true };
  const catalogo = [gdl, slp, qro];
  const lejos = { lat: 40.4, lng: -3.7 };
  it("la ciudad inicial sigue con centro conocido aunque un doble anterior no lleve la marca", () => {
    const filas = filasDeCiudades(qro, [slp], slp.centro, "eventos");
    expect(filas[0]).toMatchObject({ distancia: 0, estasAqui: true });
    expect(ciudadInicialCercana(qro, [slp], slp.centro, "eventos", false, false)?.slug).toBe(slp.slug);
    expect(altaLejosDeCiudades(qro, [slp], slp.centro, "eventos")).toBeNull();
  });
  it("identifica centros conocidos sin cambiar el respaldo de una ciudad sin lugares", () => {
    const ciudades = armarCiudades([{ ciudad: "Querétaro", ...qro.centro }], [{ ciudad: "Aguascalientes" }]);
    expect(ciudades.find(c => c.slug === slp.slug)).toMatchObject({ centroConocido: true, centro: slp.centro });
    expect(ciudades.find(c => c.slug === qro.slug)).toMatchObject({ centroConocido: true, centro: qro.centro });
    expect(ciudades.find(c => c.slug === "aguascalientes")).toMatchObject({ centroConocido: false, centro: slp.centro });
  });
  it("una ciudad sin lugares no da distancia ni aquí y queda detrás de los centros conocidos", () => {
    const ciudades = armarCiudades([{ ciudad: "Querétaro", ...qro.centro }], [{ ciudad: "Aguascalientes" }, { ciudad: "Puebla" }]);
    const aguascalientes = ciudades.find(c => c.slug === "aguascalientes")!;
    const filas = filasDeCiudades(aguascalientes, ciudades, slp.centro, "eventos");
    expect(filas.map(f => f.ciudad.slug)).toEqual([slp.slug, qro.slug, "aguascalientes", "puebla"]);
    expect(filas.filter(f => !f.ciudad.centroConocido).every(f => f.distancia === null && !f.estasAqui)).toBe(true);
    expect(ciudadInicialCercana(qro, [aguascalientes], slp.centro, "eventos", false, false)).toBeNull();
  });
  it("la oferta de alta ignora centros desconocidos dentro del catálogo ya filtrado", () => {
    const ciudades = armarCiudades([{ ciudad: "Querétaro", ...qro.centro }], [{ ciudad: "Aguascalientes" }]);
    const aguascalientes = ciudades.find(c => c.slug === "aguascalientes")!;
    const soloDesconocida = ciudadesDeHoja(aguascalientes, ciudades, "eventos");
    expect(altaLejosDeCiudades(aguascalientes, soloDesconocida, slp.centro, "eventos")).toEqual({ texto: "Agregar un evento donde estás", href: "/nuevo?tipo=evento" });
    expect(altaLejosDeCiudades(aguascalientes, ciudades, slp.centro, "eventos")).toBeNull();
  });
  it("filtra cada catálogo por contenido y siempre mantiene la actual vacía", () => {
    const datos = [
      { ...slp, lugares: 0, eventos: 0, zona: "America/Mexico_City", centroConocido: true },
      { ...qro, lugares: 0, eventos: 1, zona: "America/Mexico_City", centroConocido: false },
      { ...gdl, lugares: 1, eventos: 0, zona: "America/Mexico_City", centroConocido: true },
    ];
    expect(ciudadesDeHoja(slp, datos, "eventos").map(c => c.slug)).toEqual([slp.slug, qro.slug]);
    expect(ciudadesDeHoja(slp, datos, "lugares").map(c => c.slug)).toEqual([slp.slug, gdl.slug]);
    expect(ciudadesDeHoja(slp, datos, "buscar").map(c => c.slug)).toEqual([slp.slug, qro.slug, gdl.slug]);
    expect(ciudadesDeHoja(slp, datos.map(c => ({ ...c, artistas: c.eventos })), "artistas").map(c => c.slug)).toEqual([slp.slug, qro.slug]);
    const filtradas = ciudadesDeHoja(slp, datos, "lugares");
    expect(ciudadInicialCercana(slp, filtradas, qro.centro, "lugares", false, false)).toBeNull();
    expect(altaLejosDeCiudades(slp, filtradas, qro.centro, "lugares")).not.toBeNull();
  });
  it("ordena sin mutar el catálogo y distingue la cercanía de la selección", () => {
    expect(filasDeCiudades(qro, catalogo, null, "eventos").map(f => f.ciudad.slug)).toEqual([qro.slug, slp.slug, gdl.slug]);
    const filas = filasDeCiudades(qro, catalogo, slp.centro, "lugares");
    expect(filas.map(f => f.ciudad.slug)).toEqual([slp.slug, qro.slug, gdl.slug]);
    expect(filas.map(f => f.estasAqui)).toEqual([true, false, false]);
    expect(filas[0].distancia).toBe(0);
    expect(catalogo).toEqual([gdl, slp, qro]);
  });
  it("la frontera de 50 km determina aquí, selección inicial y oferta de alta", () => {
    const actual = { ...slp, slug: "actual", centro: lejos };
    const ciudad = { ...qro, centro: { lat: 0, lng: 0 } };
    for (const [km, dentro] of [[49.999, true], [50, true], [50.001, false]] as const) {
      const punto = { lat: km / 6371 * 180 / Math.PI, lng: 0 };
      expect(filasDeCiudades(actual, [ciudad], punto, "eventos")[0].estasAqui).toBe(dentro);
      expect(!!ciudadInicialCercana(actual, [ciudad], punto, "eventos", false, false)).toBe(dentro);
      expect(!!altaLejosDeCiudades(actual, [ciudad], punto, "eventos")).toBe(!dentro);
    }
  });
  it("ninguna elección previa se cambia; tampoco la ciudad ya actual ni una ciudad sin centro fiable", () => {
    expect(ciudadInicialCercana(slp, catalogo, qro.centro, "eventos", false, false)?.slug).toBe(qro.slug);
    for (const [explicita, marcada] of [[true, false], [false, true], [true, true]]) expect(ciudadInicialCercana(slp, catalogo, qro.centro, "eventos", explicita, marcada)).toBeNull();
    expect(ciudadInicialCercana(qro, catalogo, qro.centro, "eventos", false, false)).toBeNull();
    expect(ciudadInicialCercana(slp, catalogo, lejos, "eventos", false, false)).toBeNull();
    expect(ciudadInicialCercana(slp, catalogo, null, "eventos", false, false)).toBeNull();
    expect(ciudadInicialCercana(slp, catalogo, qro.centro, "artistas", false, false)).toBeNull();
    expect(filasDeCiudades(qro, catalogo, slp.centro, "artistas").every(f => f.distancia === null && !f.estasAqui)).toBe(true);
  });
  it("ofrece el alta correspondiente solo con un punto lejano; la URL no contiene ubicación", () => {
    expect(altaLejosDeCiudades(slp, catalogo, lejos, "eventos")).toEqual({ texto: "Agregar un evento donde estás", href: "/nuevo?tipo=evento" });
    expect(altaLejosDeCiudades(slp, catalogo, lejos, "lugares")).toEqual({ texto: "Agregar un lugar donde estás", href: "/nuevo?tipo=lugar" });
    expect(altaLejosDeCiudades(slp, catalogo, lejos, "artistas")).toBeNull();
    expect(altaLejosDeCiudades(slp, catalogo, lejos, "buscar")).toBeNull();
    expect(altaLejosDeCiudades(slp, catalogo, slp.centro, "eventos")).toBeNull();
    expect(altaLejosDeCiudades(slp, catalogo, null, "eventos")).toBeNull();
  });
  it("el botón espera el permiso consultado, sin punto y sin negativa de sesión", () => {
    expect(ofrecerUbicacionCiudades("eventos", null, false, false)).toBe(true);
    expect(ofrecerUbicacionCiudades("lugares", null, false, false)).toBe(true);
    expect(ofrecerUbicacionCiudades("artistas", null, false, false)).toBe(false);
    expect(ofrecerUbicacionCiudades("eventos", null, null, false)).toBe(false);
    expect(ofrecerUbicacionCiudades("eventos", null, true, false)).toBe(false);
    expect(ofrecerUbicacionCiudades("eventos", slp.centro, false, false)).toBe(false);
    expect(ofrecerUbicacionCiudades("eventos", null, false, true)).toBe(false);
  });
});
