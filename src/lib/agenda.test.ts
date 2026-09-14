import { describe, expect, it } from "vitest";
import { agruparPorDia, distanciaKm, esNuevo, filtrarAgenda, textoDistancia, type EventoAgenda } from "./agenda";

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
});
