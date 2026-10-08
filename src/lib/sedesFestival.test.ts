import { describe, expect, it } from "vitest";
import { buscarEventos, type EventoAgenda } from "./agenda";
import { tarjetaEvento } from "./destacados";
import { fotoDeEvento, nombreSitio, sitioEnLista } from "./eventos";
import { nombreDeSedes, portadaDeFestival, sedesDeFestival, sedesParaLista, textoActosEnSede, VARIAS_SEDES, type ActoConSitio } from "./sedesFestival";

/** Las sedes de un festival (OL-339): derivadas de sus actos al leer, sin repetir, en el orden de su primer acto; lo del marco solo sin actos. */

const CCUB = { id: "ccub", slug: "centro-cultural-universitario-bicentenario", nombre: "Centro Cultural Universitario Bicentenario", direccion: "Av. Sierra Leona 550", lat: 22.144, lng: -101.015 };
const PAZ = { id: "paz", slug: "teatro-de-la-paz", nombre: "Teatro de la Paz", direccion: "Villerías 205", lat: 22.1517, lng: -100.9761 };
const enLugar = (inicio: string, l: typeof CCUB): ActoConSitio => ({ inicio, lugar_id: l.id, lugar: l, sitio_texto: null });
const enSitio = (inicio: string, texto: string, extra: Partial<ActoConSitio> = {}): ActoConSitio => ({ inicio, lugar_id: null, lugar: null, sitio_texto: texto, ...extra });

describe("sedesDeFestival", () => {
  it("una sede por lugar del directorio, sin repetir, con cuántos actos tiene cada una", () => {
    const sedes = sedesDeFestival([enLugar("2026-10-16T01:00:00Z", CCUB), enLugar("2026-10-17T00:00:00Z", CCUB), enLugar("2026-10-17T23:00:00Z", PAZ)]);
    expect(sedes).toEqual([
      { clave: "l:ccub", nombre: CCUB.nombre, lugar: { id: "ccub", slug: CCUB.slug }, direccion: CCUB.direccion, punto: { lat: CCUB.lat, lng: CCUB.lng }, reservado: false, actos: 2 },
      { clave: "l:paz", nombre: PAZ.nombre, lugar: { id: "paz", slug: PAZ.slug }, direccion: PAZ.direccion, punto: { lat: PAZ.lat, lng: PAZ.lng }, reservado: false, actos: 1 },
    ]);
  });

  it("junta el directorio y los sitios fuera de él; un sitio se reconoce por su nombre sin acentos ni mayúsculas y toma el punto del acto que lo trae", () => {
    const sedes = sedesDeFestival([
      enLugar("2026-10-16T01:00:00Z", CCUB),
      enSitio("2026-10-17T01:00:00Z", "Jardín de San Juan de Dios"),
      enSitio("2026-10-18T01:00:00Z", "jardin de san juan de dios", { sitio_direccion: "Calle Madero 1", sitio_lat: 22.1511, sitio_lng: -100.9772 }),
    ]);
    expect(sedes.map((s) => [s.clave, s.nombre, s.actos])).toEqual([
      ["l:ccub", CCUB.nombre, 1],
      ["s:jardin de san juan de dios", "Jardín de San Juan de Dios", 2],
    ]);
    expect(sedes[1]).toMatchObject({ lugar: null, direccion: "Calle Madero 1", punto: { lat: 22.1511, lng: -100.9772 } });
  });

  it("en el orden de su primer acto, aunque los actos lleguen desordenados", () => {
    const sedes = sedesDeFestival([enLugar("2026-10-20T01:00:00Z", CCUB), enLugar("2026-10-16T01:00:00Z", PAZ), enLugar("2026-10-21T01:00:00Z", PAZ)]);
    expect(sedes.map((s) => s.clave)).toEqual(["l:paz", "l:ccub"]);
  });

  it("un sitio reservado dice su nombre pero no su dirección ni su punto; un acto sin sitio no es una sede", () => {
    const sedes = sedesDeFestival([enSitio("2026-10-16T01:00:00Z", "Casa de Lu", { sitio_reservado: true, sitio_direccion: "Privada 3", sitio_lat: 22.1, sitio_lng: -101 }), enSitio("2026-10-17T01:00:00Z", "  ")]);
    expect(sedes).toEqual([{ clave: "s:casa de lu", nombre: "Casa de Lu · sitio reservado", lugar: null, direccion: null, punto: null, reservado: true, actos: 1 }]);
  });

  it("un lugar que quien mira no puede leer (oculto) y sin sitio escrito no cuenta como sede", () => {
    expect(sedesDeFestival([{ inicio: "2026-10-16T01:00:00Z", lugar_id: "privado", lugar: null, sitio_texto: null }])).toEqual([]);
  });

  it("lo capturado en el festival solo cuenta sin actos que digan dónde (respaldo, con 0 actos)", () => {
    const marco = enLugar("2026-10-16T01:00:00Z", CCUB);
    expect(sedesDeFestival([], marco)).toMatchObject([{ clave: "l:ccub", actos: 0 }]);
    expect(sedesDeFestival([enSitio("2026-10-16T01:00:00Z", "")], marco)).toMatchObject([{ clave: "l:ccub", actos: 0 }]);
    expect(sedesDeFestival([enLugar("2026-10-17T01:00:00Z", PAZ)], marco).map((s) => s.clave)).toEqual(["l:paz"]);
    expect(sedesDeFestival([], null)).toEqual([]);
  });
});

describe("«Varias sedes»: el lugar de un festival en una línea, resuelto una vez en nombreSitio", () => {
  const marco = { lugar: { nombre: "Centro Cultural Universitario Bicentenario", portada: null }, sitio_texto: null, sitio_direccion: null, sitio_reservado: false };

  it("con varias sedes dice «Varias sedes»; con una, su nombre; sin sedes, lo de siempre", () => {
    expect(VARIAS_SEDES).toBe("Varias sedes");
    expect(nombreDeSedes([{ nombre: "A" }, { nombre: "B" }])).toBe(VARIAS_SEDES);
    expect(nombreDeSedes([{ nombre: "Teatro de la Paz" }])).toBe("Teatro de la Paz");
    expect(nombreDeSedes([])).toBeNull();
    expect(nombreSitio({ ...marco, sedes: [{ nombre: "A" }, { nombre: "B" }] })).toBe("Varias sedes");
    expect(sitioEnLista({ ...marco, sedes: [{ nombre: "Teatro de la Paz" }] })).toBe("Teatro de la Paz");
    expect(sitioEnLista({ ...marco, sedes: [] })).toBe("Centro Cultural Universitario Bicentenario");
    expect(sitioEnLista(marco)).toBe("Centro Cultural Universitario Bicentenario");
  });

  it("a las listas solo viaja el nombre de cada sede; junto al nombre en la ficha, «3 actividades»", () => {
    expect(sedesParaLista(sedesDeFestival([enLugar("2026-10-16T01:00:00Z", CCUB), enLugar("2026-10-17T01:00:00Z", PAZ)]))).toEqual([{ nombre: CCUB.nombre }, { nombre: PAZ.nombre }]);
    expect(textoActosEnSede(1)).toBe("1 actividad");
    expect(textoActosEnSede(3)).toBe("3 actividades");
  });

  const festival = (cambios: Partial<EventoAgenda> = {}): EventoAgenda => ({
    id: "cine",
    titulo: "Festival de Cine de Invierno",
    inicio: "2026-10-16T01:00:00Z",
    fin: "2026-10-18T06:00:00Z",
    zona: "America/Mexico_City",
    imagen: null,
    precio: null,
    lugar_id: "ccub",
    ...marco,
    creado_en: "2026-10-01T00:00:00Z",
    van: null,
    clase: "festival",
    programa: { registrados: 3 },
    ...cambios,
  });

  it("la tarjeta del carril dice sus sedes y cuántas actividades, en corto; sin sedes leídas, solo su programa (como antes)", () => {
    const ahora = new Date("2026-10-07T18:00:00Z");
    expect(tarjetaEvento(festival({ sedes: [{ nombre: "A" }, { nombre: "B" }] }), ahora).sitio).toBe("Varias sedes · 3 actividades");
    expect(tarjetaEvento(festival({ sedes: [{ nombre: "Teatro de la Paz" }] }), ahora).sitio).toBe("Teatro de la Paz · 3 actividades");
    expect(tarjetaEvento(festival(), ahora).sitio).toBe("Programa registrado: 3 actividades");
    // Sin la clase (una lista que no la pide, «Tus planes»): el sitio a secas.
    expect(tarjetaEvento(festival({ clase: undefined, programa: undefined, sedes: [{ nombre: "A" }, { nombre: "B" }] }), ahora).sitio).toBe("Varias sedes");
  });

  it("Buscar halla un festival por cualquiera de sus sedes, no por «Varias sedes»", () => {
    const e = { ...festival({ sedes: [{ nombre: "Centro Cultural Universitario Bicentenario" }, { nombre: "Teatro de la Paz" }] }), artistas: [] };
    expect(buscarEventos([e], "teatro paz")).toHaveLength(1);
    expect(buscarEventos([e], "varias sedes")).toHaveLength(0);
  });
});

describe("portadaDeFestival (OL-346): sin imagen propia, el cartel de su próximo acto", () => {
  const ahora = new Date("2026-10-08T18:00:00Z");
  const acto = (inicio: string, imagen: string | null) => ({ inicio, imagen });

  it("el próximo acto que tiene cartel, por fecha, aunque lleguen desordenados; uno sin cartel no cuenta", () => {
    const actos = [acto("2026-10-25T02:00:00Z", "clausura.jpg"), acto("2026-10-15T02:00:00Z", null), acto("2026-10-01T02:00:00Z", "pasado.jpg"), acto("2026-10-17T02:00:00Z", "musica.jpg")];
    expect(portadaDeFestival(actos, ahora)).toBe("musica.jpg");
  });
  it("si todos los actos con cartel ya empezaron, el del último", () => {
    expect(portadaDeFestival([acto("2026-09-30T02:00:00Z", "uno.jpg"), acto("2026-10-03T02:00:00Z", "dos.jpg"), acto("2026-10-20T02:00:00Z", null)], ahora)).toBe("dos.jpg");
  });
  it("ningún acto con cartel, o sin actos: null (sigue la portada de su lugar o el símbolo SN)", () => {
    expect(portadaDeFestival([acto("2026-10-23T23:00:00Z", null), acto("2026-10-24T01:30:00Z", null)], ahora)).toBeNull();
    expect(portadaDeFestival([], ahora)).toBeNull();
  });
  it("la foto de una lista: la imagen propia, luego el cartel del acto, luego la portada del lugar", () => {
    const lugar = { nombre: "Cineteca", portada: "cineteca.jpg" };
    expect(fotoDeEvento({ imagen: "propia.jpg", portadaActo: "acto.jpg", lugar })).toBe("propia.jpg");
    expect(fotoDeEvento({ imagen: null, portadaActo: "acto.jpg", lugar })).toBe("acto.jpg");
    expect(fotoDeEvento({ imagen: null, lugar })).toBe("cineteca.jpg");
    expect(fotoDeEvento({ imagen: null, lugar: null })).toBeNull();
    expect(tarjetaEvento({ id: "cine", titulo: "CINEMA", inicio: "2026-09-30T00:00:00Z", fin: "2026-10-25T06:00:00Z", zona: "America/Mexico_City", imagen: null, precio: null, lugar_id: null, sitio_texto: null, sitio_reservado: false, lugar: null, creado_en: "2026-09-01T00:00:00Z", van: null, clase: "festival", portadaActo: "acto.jpg" }, ahora).foto).toBe("acto.jpg");
  });
});

