import { describe, expect, it } from "vitest";
import type { LugarSugerido } from "@/lib/buscarLugares";
import { CIUDAD_INICIAL, type Ciudad } from "@/lib/ciudad";
import type { LugarResumen } from "@/lib/lugares";
import { contextoDondeEsta, lugarCercano, resultadosDondeEsta, textoInicialBusqueda } from "./dondeEstaPantalla";

function lugar(id: string, nombre: string, lat: number, lng: number): LugarResumen {
  return { id, nombre, tipo: "museo", direccion: "Calle 1", lat, lng, portada: null };
}

function sugerido(id: string, nombre: string): LugarSugerido {
  return { mapboxId: id, nombre, direccion: "Otra calle", categorias: [], esDireccion: false, ciudad: "San Luis Potosí", distanciaM: 100 };
}

describe("lugarCercano (OL-211: avisar «ya existe», nunca elegir)", () => {
  const centro = { lat: 22.15, lng: -100.97 };

  it("sin lugares cerca: nada que avisar", () => {
    expect(lugarCercano([lugar("a", "Museo A", 22.2, -101.1)], centro)).toBeNull();
  });

  it("un lugar a menos de 150 m: se avisa", () => {
    // ~0.001° de latitud son ~111 m.
    const cerca = lugar("a", "Museo A", centro.lat + 0.001, centro.lng);
    expect(lugarCercano([cerca], centro)).toEqual(cerca);
  });

  it("justo en el mismo punto: se avisa (0 m)", () => {
    const aqui = lugar("a", "Museo A", centro.lat, centro.lng);
    expect(lugarCercano([aqui], centro)).toEqual(aqui);
  });

  it("a más de 150 m: no se avisa", () => {
    // ~0.002° de latitud son ~222 m.
    const lejos = lugar("a", "Museo A", centro.lat + 0.002, centro.lng);
    expect(lugarCercano([lejos], centro)).toBeNull();
  });

  it("con varios cerca, avisa del más cercano", () => {
    const lejano = lugar("lejano", "Foro lejano", centro.lat + 0.0012, centro.lng);
    const cercano = lugar("cercano", "Foro cercano", centro.lat + 0.0003, centro.lng);
    expect(lugarCercano([lejano, cercano], centro)).toEqual(cercano);
  });

  it("sin lugares: null", () => {
    expect(lugarCercano([], centro)).toBeNull();
  });

  it("admite un radio distinto", () => {
    const aUnos300m = lugar("a", "Museo A", centro.lat + 0.0027, centro.lng);
    expect(lugarCercano([aUnos300m], centro)).toBeNull();
    expect(lugarCercano([aUnos300m], centro, 500)).toEqual(aUnos300m);
  });
});

describe("textoInicialBusqueda (OL-211: el nombre ya escrito adelanta la primera búsqueda)", () => {
  it('entrando por "Buscar" (sin ubicación), arranca con el nombre ya escrito', () => {
    expect(textoInicialBusqueda("Laboratorio de Arte Escénico", false)).toBe("Laboratorio de Arte Escénico");
  });

  it("recorta espacios", () => {
    expect(textoInicialBusqueda("  Casa de Cultura  ", false)).toBe("Casa de Cultura");
  });

  it('entrando por "Cambiar" (ya hay ubicación), arranca vacío aunque haya nombre', () => {
    expect(textoInicialBusqueda("Laboratorio de Arte Escénico", true)).toBe("");
  });

  it("sin nombre todavía, arranca vacío", () => {
    expect(textoInicialBusqueda("", false)).toBe("");
  });
});

const OTRA_CIUDAD: Ciudad = { slug: "otra-ciudad", nombre: "Otra Ciudad", centro: { lat: 20, lng: -99 }, zoom: 13 };

describe("contextoDondeEsta (corrección del gestor, PR #249: sin la ciudad elegida, Mapbox buscaba en todo el país)", () => {
  it("con el pin YA puesto: manda el propio punto, sin importar la ciudad elegida ni el texto", () => {
    const punto = { lat: 1, lng: 2 };
    const r = contextoDondeEsta(punto, "cualquier texto", OTRA_CIUDAD, null, null);
    expect(r).toEqual({ ciudad: CIUDAD_INICIAL, centro: punto, origen: "posicion" });
  });

  it("sin pin y con ciudad elegida (chip): la usa, aunque no haya posición del teléfono", () => {
    const r = contextoDondeEsta(null, "", OTRA_CIUDAD, null, null);
    expect(r).toEqual({ ciudad: OTRA_CIUDAD, centro: OTRA_CIUDAD.centro, origen: "chip" });
  });

  it("sin pin, sin ciudad elegida y sin posición: cae en San Luis Potosí SIN pista real -el defecto que reportó el gestor (Aguascalientes, Pachuca, CDMX)", () => {
    const r = contextoDondeEsta(null, "", null, null, null);
    expect(r).toEqual({ ciudad: CIUDAD_INICIAL, centro: CIUDAD_INICIAL.centro, origen: "inicial" });
  });

  it("sin pin, sin ciudad elegida, con la posición del teléfono: la usa", () => {
    const yo = { lat: 3, lng: 4 };
    const r = contextoDondeEsta(null, "", null, yo, null);
    expect(r).toEqual({ ciudad: CIUDAD_INICIAL, centro: yo, origen: "posicion" });
  });

  it("el texto manda sobre la ciudad elegida (misma cascada que el alta de evento): reconoce San Luis Potosí en el texto aunque el chip diga otra ciudad", () => {
    const r = contextoDondeEsta(null, "un lugar en San Luis Potosí", OTRA_CIUDAD, null, null);
    expect(r.origen).toBe("texto");
    expect(r.ciudad).toEqual(CIUDAD_INICIAL);
  });
});

describe("resultadosDondeEsta (corrección del gestor, PR #249: los registrados salen primero y no desaparecen cuando Mapbox responde)", () => {
  it("un lugar registrado que coincide, antes de que Mapbox responda (resultadosMapbox aún vacío): aparece solo", () => {
    const museoA = lugar("a", "Museo A", 22.15, -100.97);
    const r = resultadosDondeEsta([museoA], "Museo A", []);
    expect(r).toEqual([{ tipo: "lugar", lugar: museoA }]);
  });

  it("el mismo lugar SIGUE apareciendo, PRIMERO, cuando Mapbox ya respondió con varias sugerencias", () => {
    const museoA = lugar("a", "Museo A", 22.15, -100.97);
    const mapbox = [sugerido("x", "Plaza X"), sugerido("y", "Calle Y"), sugerido("z", "Avenida Z")];
    const r = resultadosDondeEsta([museoA], "Museo A", mapbox);
    expect(r[0]).toEqual({ tipo: "lugar", lugar: museoA });
    expect(r).toHaveLength(4);
    expect(r.slice(1)).toEqual(mapbox.map((item) => ({ tipo: "mapbox", item })));
  });

  it("varios lugares registrados coinciden: todos antes que cualquier cosa de Mapbox", () => {
    const a = lugar("a", "Foro A", 22.15, -100.97);
    const b = lugar("b", "Foro B", 22.16, -100.98);
    const r = resultadosDondeEsta([a, b], "Foro", [sugerido("x", "Otro lado")]);
    expect(r.map((x) => x.tipo)).toEqual(["lugar", "lugar", "mapbox"]);
  });

  it("sin ningún lugar que coincida: solo lo de Mapbox", () => {
    const r = resultadosDondeEsta([lugar("a", "Museo A", 22.15, -100.97)], "Otro nombre", [sugerido("x", "Plaza X")]);
    expect(r).toEqual([{ tipo: "mapbox", item: sugerido("x", "Plaza X") }]);
  });

  it("con menos de 3 letras, lo de Mapbox no cuenta (aunque ya hubiera llegado de una búsqueda anterior), pero el lugar registrado si coincide sí", () => {
    const museoA = lugar("a", "Museo A", 22.15, -100.97);
    const r = resultadosDondeEsta([museoA], "Mu", [sugerido("x", "Plaza X")]);
    expect(r).toEqual([{ tipo: "lugar", lugar: museoA }]);
  });

  it("sin texto: nada", () => {
    expect(resultadosDondeEsta([lugar("a", "Museo A", 22.15, -100.97)], "", [sugerido("x", "Plaza X")])).toEqual([]);
  });
});
