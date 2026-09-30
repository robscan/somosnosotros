import { describe, expect, it } from "vitest";
import { armarVista, hrefEnMapa, mejorResultado, metaConTipo, metaDe, ordenBusqueda, ordenarPorCiudad, SIN_RESULTADOS_BUSQUEDA, type Encontrado, type ResultadoBusqueda } from "./buscarUnificado";
import { ciudadesPorCercania, type Ciudad } from "./ciudad";

const hallado = (id: string, titulo: string, ciudad = "San Luis Potosí", href = `/x/${id}`): Encontrado => ({ id, href, foto: "/f.png", titulo, detalle: "dato", van: 0, ciudad });
const resultado = (r: Partial<ResultadoBusqueda>): ResultadoBusqueda => ({ ...SIN_RESULTADOS_BUSQUEDA, ...r });

describe("ordenBusqueda: el grupo de la sección de origen va primero", () => {
  it("desde eventos (Inicio, Agenda, Perfil y lo demás): eventos, lugares, artistas", () => expect(ordenBusqueda("eventos")).toEqual(["eventos", "lugares", "artistas"]));
  it("desde Lugares: lugares primero", () => expect(ordenBusqueda("lugares")).toEqual(["lugares", "eventos", "artistas"]));
  it("desde Artistas: artistas primero", () => expect(ordenBusqueda("artistas")).toEqual(["artistas", "eventos", "lugares"]));
});

describe("mejorResultado: lo escrito es el nombre de algo, o el principio de su nombre", () => {
  const r = resultado({ eventos: [hallado("e1", "MUNI: la última fogueada")], lugares: [hallado("l1", "MUNI Museo Universitario"), hallado("l2", "Muni")], artistas: [hallado("a1", "Aarón Cadena")] });
  it("sin acentos ni mayúsculas, de cualquier tipo, aunque la sección de origen sea otra", () => {
    expect(mejorResultado(r, "aaron", "eventos")).toMatchObject({ grupo: "artistas" });
    expect(mejorResultado(r, "AARÓN CADENA", "lugares")).toMatchObject({ grupo: "artistas" });
  });
  it("un nombre igual gana a uno que solo empieza igual", () => expect(mejorResultado(r, "muni", "eventos")?.encontrado.id).toBe("l2"));
  it("si solo empieza igual, gana el tipo de la sección de origen", () => {
    expect(mejorResultado(resultado({ eventos: r.eventos, lugares: [r.lugares[0]] }), "muni", "eventos")?.encontrado.id).toBe("e1");
    expect(mejorResultado(resultado({ eventos: r.eventos, lugares: [r.lugares[0]] }), "muni", "lugares")?.encontrado.id).toBe("l1");
  });
  it("si lo escrito está en medio del nombre, o no está, no hay mejor resultado", () => {
    expect(mejorResultado(r, "cadena", "eventos")).toBeNull();
    expect(mejorResultado(r, "", "eventos")).toBeNull();
  });
});

describe("armarVista: mejor resultado, grupos y chips", () => {
  const r = resultado({ eventos: [hallado("e1", "Noche de jazz"), hallado("e2", "Jazz en el parque")], lugares: [hallado("l1", "Jazz Club")] });
  it("el mejor resultado sale arriba y no se repite en su grupo", () => {
    const v = armarVista(r, "jazz club", "eventos", null);
    expect(v.mejor?.encontrado.id).toBe("l1");
    expect(v.grupos.map((g) => g.grupo)).toEqual(["eventos"]);
  });
  // Con un texto que no es el nombre de nada (`zzz`) no hay mejor resultado y solo se ve cómo se agrupa.
  it("los grupos siguen el orden de la sección de origen y los vacíos no salen", () => {
    expect(armarVista(r, "zzz", "eventos", null).grupos.map((g) => g.grupo)).toEqual(["eventos", "lugares"]);
    expect(armarVista(r, "zzz", "lugares", null).grupos.map((g) => g.grupo)).toEqual(["lugares", "eventos"]);
  });
  it("hay chips (más de un tipo) solo cuando lo encontrado trae más de un tipo", () => {
    expect(armarVista(r, "zzz", "eventos", null).tipos).toEqual(["eventos", "lugares"]);
    expect(armarVista(resultado({ eventos: r.eventos }), "zzz", "eventos", null).tipos).toEqual(["eventos"]);
  });
  it("con un tipo elegido queda solo ese tipo, completo; un tipo que no trae nada vuelve a «Todo»", () => {
    const v = armarVista(r, "zzz", "eventos", "lugares");
    expect(v.grupos.map((g) => g.grupo)).toEqual(["lugares"]);
    expect(v.elegido).toBe("lugares");
    expect(armarVista(r, "zzz", "eventos", "artistas")).toMatchObject({ elegido: null, tipos: ["eventos", "lugares"] });
  });
  it("con un tipo elegido, el mejor resultado es el de ese tipo", () => {
    const v = armarVista(resultado({ eventos: [hallado("e1", "Jazz"), hallado("e2", "Jazz de noche")], lugares: [hallado("l1", "Jazz Club")] }), "jazz", "lugares", "lugares");
    expect(v.mejor?.grupo).toBe("lugares");
  });
});

describe("ordenarPorCiudad: la ciudad ordena, no limita", () => {
  const lista = [hallado("1", "a", "Córdoba, España"), hallado("2", "b", "San Luis Potosí"), hallado("3", "c", "Querétaro"), hallado("4", "d", "San Luis Potosí"), hallado("5", "e", "Ciudad desconocida")];
  it("primero la ciudad que se ve, luego las demás en su orden de cercanía y al final las que no están; dentro de cada una, el mismo orden", () => {
    expect(ordenarPorCiudad(lista, ["San Luis Potosí", "Querétaro", "Córdoba, España"]).map((e) => e.id)).toEqual(["2", "4", "3", "1", "5"]);
  });
  it("sin orden de ciudades no cambia nada", () => expect(ordenarPorCiudad(lista, []).map((e) => e.id)).toEqual(["1", "2", "3", "4", "5"]));
  it("ciudadesPorCercania: la propia y luego las otras, de la más cercana a la más lejana", () => {
    const ciudad = (nombre: string, lng: number, lat: number): Ciudad => ({ slug: nombre, nombre, centro: { lng, lat }, zoom: 13 });
    const slp = ciudad("San Luis Potosí", -100.98, 22.15);
    expect(ciudadesPorCercania(slp, [ciudad("Córdoba, España", -4.78, 37.88), slp, ciudad("Querétaro", -100.39, 20.59)])).toEqual(["San Luis Potosí", "Querétaro", "Córdoba, España"]);
  });
});

describe("lo que dice el renglón y a dónde lleva", () => {
  it("la ciudad va en la meta, en su línea, solo si no es la que se ve (el país la distingue)", () => {
    expect(metaDe(hallado("1", "a"), "San Luis Potosí")).toEqual(["dato"]);
    expect(metaDe(hallado("1", "a", "Córdoba, España"), "San Luis Potosí")).toEqual(["dato", "Córdoba, España"]);
  });
  it("sin rótulo de grupo (mejor resultado, recientes) el tipo va delante de la primera línea", () => {
    expect(metaConTipo("eventos", ["vie 2 oct · MUNI"])).toEqual(["Evento · vie 2 oct · MUNI"]);
    expect(metaConTipo("lugares", ["Museo", "Córdoba, España"])).toEqual(["Lugar · Museo", "Córdoba, España"]);
  });
  it("un lugar, desde Lugares, vuelve al mapa de su ciudad con su ficha abierta", () => {
    expect(hrefEnMapa(hallado("1", "a", "San Luis Potosí", "/lugares/teatro-de-la-paz"))).toBe("/lugares?lugar=teatro-de-la-paz");
    expect(hrefEnMapa(hallado("2", "b", "Córdoba, España", "/lugares/museo-de-bellas-artes"))).toBe("/lugares?ciudad=cordoba-espana&lugar=museo-de-bellas-artes");
  });
});
