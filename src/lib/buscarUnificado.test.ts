import { describe, expect, it } from "vitest";
import { armarVista, atajosDeLaSemana, hrefEnMapa, mejorResultado, metaConTipo, metaDe, ordenBusqueda, ordenarPorCiudad, SIN_RESULTADOS_BUSQUEDA, type Encontrado, type ResultadoBusqueda } from "./buscarUnificado";
import { ciudadesPorCercania, type Ciudad } from "./ciudad";

const hallado = (id: string, titulo: string, ciudad = "San Luis Potosí", href = `/x/${id}`): Encontrado => ({ id, href, foto: "/f.png", titulo, detalle: "dato", van: 0, ciudad });
const resultado = (r: Partial<ResultadoBusqueda>): ResultadoBusqueda => ({ ...SIN_RESULTADOS_BUSQUEDA, ...r });

describe("ordenBusqueda: el grupo de la sección de origen va primero", () => {
  it("desde eventos (Inicio, Agenda, Perfil y lo demás): eventos, lugares, artistas", () => expect(ordenBusqueda("eventos")).toEqual(["eventos", "lugares", "artistas"]));
  it("desde Lugares: lugares primero", () => expect(ordenBusqueda("lugares")).toEqual(["lugares", "eventos", "artistas"]));
  it("desde Artistas: artistas primero", () => expect(ordenBusqueda("artistas")).toEqual(["artistas", "eventos", "lugares"]));
});

describe("mejorResultado: el nombre entero de algo, o el principio del nombre de una sola cosa", () => {
  const r = resultado({ eventos: [hallado("e1", "MUNI: la última fogueada")], lugares: [hallado("l1", "MUNI Museo Universitario"), hallado("l2", "Muni")], artistas: [hallado("a1", "Aarón Cadena")] });
  it("el nombre entero, sin acentos ni mayúsculas, de cualquier tipo, aunque la sección de origen sea otra", () => {
    expect(mejorResultado(r, "aaron cadena", "eventos")).toMatchObject({ grupo: "artistas" });
    expect(mejorResultado(r, "AARÓN CADENA", "lugares")).toMatchObject({ grupo: "artistas" });
  });
  it("un nombre entero gana a los que solo empiezan igual", () => expect(mejorResultado(r, "muni", "eventos")?.encontrado.id).toBe("l2"));
  it("con dos nombres enteros, el de la sección de origen", () => {
    const oca = resultado({ eventos: [hallado("e", "OCA")], lugares: [hallado("l", "Oca")] });
    expect(mejorResultado(oca, "oca", "eventos")?.encontrado.id).toBe("e");
    expect(mejorResultado(oca, "oca", "lugares")?.encontrado.id).toBe("l");
  });
  it("si solo encaja al principio del nombre de una sola cosa entre todos los tipos, esa", () => {
    const unica = resultado({ eventos: [hallado("e1", "Concierto")], lugares: [hallado("l1", "MUNI Museo Universitario")], artistas: [hallado("a1", "Pepe")] });
    expect(mejorResultado(unica, "muni", "eventos")?.encontrado.id).toBe("l1");
  });
  it("con varios que empiezan igual no hay mejor resultado: ni del mismo tipo ni de tipos distintos", () => {
    const museos = resultado({ lugares: [hallado("l1", "Museo del Ferrocarril"), hallado("l2", "Museo Nacional de la Máscara"), hallado("l3", "Museo de Bellas Artes")] });
    expect(mejorResultado(museos, "museo", "lugares")).toBeNull();
    expect(mejorResultado(r, "muni", "eventos")?.encontrado.id).toBe("l2"); // hay uno entero: lo suyo
    expect(mejorResultado(resultado({ eventos: r.eventos, lugares: [r.lugares[0]] }), "muni", "eventos")).toBeNull();
  });
  it("si lo escrito está en medio del nombre, o no está, o no hay texto, no hay mejor resultado", () => {
    expect(mejorResultado(r, "cadena", "eventos")).toBeNull();
    expect(mejorResultado(r, "zzz", "eventos")).toBeNull();
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
  it("el mejor resultado se busca entre todos los tipos: con un tipo elegido solo sale si es de ese tipo", () => {
    const r2 = resultado({ eventos: [hallado("e1", "Jazz"), hallado("e2", "Jazz de noche")], lugares: [hallado("l1", "Jazz Club")] });
    const conEventos = armarVista(r2, "jazz", "lugares", "eventos");
    expect(conEventos.mejor?.encontrado.id).toBe("e1");
    expect(conEventos.grupos.map((g) => g.encontrados.map((e) => e.id))).toEqual([["e2"]]);
    const conLugares = armarVista(r2, "jazz", "lugares", "lugares");
    expect(conLugares.mejor).toBeNull();
    expect(conLugares.grupos.map((g) => g.grupo)).toEqual(["lugares"]);
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
  it("un evento dice cuándo y dónde en una sola línea, aunque la tarjeta del carril los ponga en dos", () => {
    expect(metaDe({ ...hallado("1", "a"), detalle: "hoy · 18:00", sitio: "MUNI" }, "San Luis Potosí")).toEqual(["hoy · 18:00 · MUNI"]);
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

describe("atajosDeLaSemana: tres fijos que llevan a Agenda con el filtro que ya existe", () => {
  it("Hoy, Fin de semana y Gratis, en ese orden", () => {
    expect(atajosDeLaSemana("2026-09-29", null)).toEqual([
      { etiqueta: "Hoy", href: "/agenda?desde=2026-09-29" },
      { etiqueta: "Fin de semana", href: "/agenda?desde=2026-10-03&hasta=2026-10-04" },
      { etiqueta: "Gratis", href: "/agenda?cuanto=gratis" },
    ]);
  });
  it("conservan la ciudad que se ve, y el fin de semana que ya empezó va desde hoy", () => {
    const [hoy, finDeSemana, gratis] = atajosDeLaSemana("2026-10-04", "cordoba-espana");
    expect(hoy.href).toBe("/agenda?ciudad=cordoba-espana&desde=2026-10-04");
    expect(finDeSemana.href).toBe("/agenda?ciudad=cordoba-espana&desde=2026-10-04");
    expect(gratis.href).toBe("/agenda?ciudad=cordoba-espana&cuanto=gratis");
  });
});
