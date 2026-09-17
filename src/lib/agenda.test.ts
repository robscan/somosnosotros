import { describe, expect, it } from "vitest";
import { agruparPorDia, buscarEventos, distanciaKm, esNuevo, filtrarAgenda, textoDistancia, type EventoAgenda } from "./agenda";

// "ahora": lunes 14 sep 2026, 12:00 hora de la ciudad (18:00Z)
const AHORA = new Date("2026-09-14T18:00:00Z");

function evento(p: Partial<EventoAgenda> & { id: string; inicio: string }): EventoAgenda {
  return { titulo: p.id, fin: null, imagen: null, precio: null, lugar_id: null, sitio_texto: null, sitio_reservado: false, lugar: null, creado_en: "2026-09-01T00:00:00Z", lat: null, lng: null, van: 0, ...p };
}

describe("agenda", () => {
  it("agrupa por día con Hoy, Mañana y días cortos, en orden", () => {
    const grupos = agruparPorDia(
      [evento({ id: "c", inicio: "2026-09-17T01:00:00Z" }), evento({ id: "a", inicio: "2026-09-15T01:00:00Z" }), evento({ id: "b", inicio: "2026-09-16T01:00:00Z" }), evento({ id: "a2", inicio: "2026-09-14T23:00:00Z" })],
      AHORA,
    );
    expect(grupos.map((g) => g.titulo)).toEqual(["Hoy", "Mañana", "mié 16 de sep"]);
    expect(grupos[0].eventos.map((e) => e.id)).toEqual(["a2", "a"]); // 17:00 y 19:00 de hoy
  });
  it("con orden dado, respeta el orden dentro del día (Cercanos: por distancia) y los días siguen en orden", () => {
    const grupos = agruparPorDia(
      [evento({ id: "lejos-manana", inicio: "2026-09-16T01:00:00Z" }), evento({ id: "cerca-hoy-tarde", inicio: "2026-09-15T01:00:00Z" }), evento({ id: "lejos-hoy-temprano", inicio: "2026-09-14T23:00:00Z" })],
      AHORA,
      true,
    );
    expect(grupos.map((g) => g.titulo)).toEqual(["Hoy", "Mañana"]);
    expect(grupos[0].eventos.map((e) => e.id)).toEqual(["cerca-hoy-tarde", "lejos-hoy-temprano"]);
  });
  it("a la misma hora ordena por título y luego por id, llegue como llegue de la base", () => {
    // Jueves 17 a las 19:00 en la ciudad, en el mismo lugar y agregados a la vez: empatan también en Cercanos y Nuevos.
    const comun = { inicio: "2026-09-18T01:00:00Z", creado_en: "2026-09-13T00:00:00Z", lugar_id: "L1", lugar: { nombre: "Casa", portada: null, lat: 22.1449, lng: -100.9753 } };
    const llegada = [
      evento({ ...comun, id: "e1", titulo: "Lectura del Taller de Creación Literaria" }),
      evento({ ...comun, id: "e4", titulo: "Mariachi" }),
      evento({ ...comun, id: "e2", titulo: "Demostración folclórica" }),
      evento({ ...comun, id: "e3", titulo: "Mariachi" }),
    ];
    const esperado = ["e2", "e1", "e3", "e4"];
    for (const eventos of [llegada, [...llegada].reverse()]) {
      expect(agruparPorDia(eventos, AHORA)[0].eventos.map((e) => e.id)).toEqual(esperado);
      // Con el día elegido la lista se pinta tal cual sale del filtro (el caso del jueves 17 en el iPhone).
      for (const filtro of ["todos", "cercanos", "siguiendo", "nuevos"] as const) {
        const { lista } = filtrarAgenda(eventos, { filtro, punto: { lat: 22.1497, lng: -100.9764 }, seguidos: ["L1"], fecha: "2026-09-17", ahora: AHORA });
        expect(lista.map((e) => e.id)).toEqual(esperado);
      }
    }
  });
  it("mide distancias y las escribe en metros o kilómetros", () => {
    const plaza = { lat: 22.1497, lng: -100.9764 };
    const km = distanciaKm(plaza, { lat: 22.1449, lng: -100.9753 });
    expect(km).toBeGreaterThan(0.5);
    expect(km).toBeLessThan(0.6);
    expect(textoDistancia(0.54)).toBe("a 550 m");
    expect(textoDistancia(2.4)).toBe("a 2.4 km");
    expect(textoDistancia(12.6)).toBe("a 13 km");
  });
  it("filtra por cercanía, seguidos, nuevos y día", () => {
    const lejos = evento({ id: "lejos", inicio: "2026-09-15T01:00:00Z", lat: 22.2, lng: -101.1, creado_en: "2026-09-13T00:00:00Z" });
    const cerca = evento({ id: "cerca", inicio: "2026-09-15T02:00:00Z", lugar_id: "L1", lugar: { nombre: "Casa", portada: null, lat: 22.1449, lng: -100.9753 } });
    const eventos = [lejos, cerca];
    const punto = { lat: 22.1497, lng: -100.9764 };
    expect(filtrarAgenda(eventos, { filtro: "cercanos", punto, seguidos: null, fecha: "", ahora: AHORA }).lista.map((e) => e.id)).toEqual(["cerca", "lejos"]);
    expect(filtrarAgenda(eventos, { filtro: "siguiendo", punto: null, seguidos: ["L1"], fecha: "", ahora: AHORA }).lista.map((e) => e.id)).toEqual(["cerca"]);
    expect(filtrarAgenda(eventos, { filtro: "nuevos", punto: null, seguidos: null, fecha: "", ahora: AHORA }).lista.map((e) => e.id)).toEqual(["lejos"]);
    expect(filtrarAgenda(eventos, { filtro: "todos", punto: null, seguidos: null, fecha: "2026-09-14", ahora: AHORA }).lista.map((e) => e.id)).toEqual(["lejos", "cerca"]);
    expect(filtrarAgenda(eventos, { filtro: "todos", punto: null, seguidos: null, fecha: "2026-09-20", ahora: AHORA }).lista).toEqual([]);
    expect(esNuevo("2026-09-01T00:00:00Z", AHORA)).toBe(false);
  });

  it("busca por título, sitio o artista, a medias y sin acentos; cada palabra escrita tiene que estar", () => {
    const lista = [
      evento({ id: "a", inicio: "2026-09-15T01:00:00Z", titulo: "Noche de jazz", lugar: { nombre: "Museo Leonora Carrington", portada: null } }),
      evento({ id: "b", inicio: "2026-09-15T01:00:00Z", titulo: "Función de títeres", sitio_texto: "Jardín de San Miguelito", artistas: ["Camerata de San Luis"] }),
      evento({ id: "c", inicio: "2026-09-15T01:00:00Z", titulo: "Lectura", lugar: null }),
    ];
    expect(buscarEventos(lista, "").map((e) => e.id)).toEqual(["a", "b", "c"]);
    expect(buscarEventos(lista, "JAZZ").map((e) => e.id)).toEqual(["a"]);
    expect(buscarEventos(lista, "carrington").map((e) => e.id)).toEqual(["a"]);
    expect(buscarEventos(lista, "camerata").map((e) => e.id)).toEqual(["b"]);
    expect(buscarEventos(lista, "titeres jardin").map((e) => e.id)).toEqual(["b"]);
    expect(buscarEventos(lista, "jazz jardin")).toEqual([]);
    expect(buscarEventos(lista, "sitio por confirmar").map((e) => e.id)).toEqual(["c"]);
  });
});
