import { describe, expect, it } from "vitest";
import { puedeConservarReservadoSinDireccion, sitioReservadoVencido } from "./retencionSitio";

const evento = { sitio_reservado: true, inicio: "2026-09-24T19:00:00Z", fin: "2026-09-24T21:00:00Z", zona: "America/Mexico_City" };
const corte = new Date("2026-10-01T21:00:00Z");
describe("retención de la dirección del evento", () => {
  it("vence exactamente a las 168 horas", () => {
    expect(sitioReservadoVencido(evento, new Date(corte.getTime() - 1))).toBe(false);
    expect(sitioReservadoVencido(evento, corte)).toBe(true);
  });
  it("sin fin cuenta desde inicio + 3 h (como eventos.termina, OL-358), incluso al cambiar horario", () => {
    const sinFin = { ...evento, inicio: "2026-11-01T04:30:00Z", fin: null, zona: "America/New_York" };
    expect(sitioReservadoVencido(sinFin, new Date("2026-11-08T07:29:59Z"))).toBe(false);
    expect(sitioReservadoVencido(sinFin, new Date("2026-11-08T07:30:00Z"))).toBe(true);
  });
  it("datos incompletos o sitio público no habilitan la excepción", () => {
    for (const e of [null, {}, { ...evento, inicio: "inválido" }, { ...evento, fin: "inválido" }, { ...evento, sitio_reservado: false }]) {
      expect(sitioReservadoVencido(e, corte)).toBe(false);
    }
  });
  it("solo un reservado ya vencido que sigue vencido admite omitir la copia", () => {
    expect(puedeConservarReservadoSinDireccion(evento, evento, corte)).toBe(true);
    expect(puedeConservarReservadoSinDireccion(null, evento, corte)).toBe(false);
    expect(puedeConservarReservadoSinDireccion(evento, { ...evento, fin: "2026-10-02T21:00:00Z" }, corte)).toBe(false);
    expect(puedeConservarReservadoSinDireccion({ ...evento, sitio_reservado: false }, evento, corte)).toBe(false);
  });
});
