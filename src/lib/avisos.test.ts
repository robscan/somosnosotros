import { describe, expect, it } from "vitest";
import { contenidoPush, lotes, pendientesDeAviso, superoTopeAvisos, TOPE_AVISOS_POR_AUTOR_DIA, ventanaRecordatorio, type Canales, type EventoParaAviso } from "./avisos";

// "ahora" fijo para que los textos con fecha no dependan del día en que corre la prueba.
const AHORA = new Date("2026-09-19T16:00:00Z"); // sábado 19 sep 2026, 10:00 hora de la ciudad

const evento = (extra: Partial<EventoParaAviso> = {}): EventoParaAviso => ({
  id: "evt-1",
  titulo: "Noche de jazz",
  inicio: "2026-09-27T01:00:00Z",
  fin: null,
  sitio_texto: null,
  sitio_reservado: false,
  lugar: { nombre: "Casa 1100", portada: null },
  ...extra,
});

describe("lotes", () => {
  it("parte la lista en trozos del tamaño pedido", () => {
    expect(lotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it("un solo lote cuando la lista cabe entera", () => {
    expect(lotes([1, 2], 10)).toEqual([[1, 2]]);
  });
  it("lista vacía: sin lotes", () => {
    expect(lotes([], 10)).toEqual([]);
  });
});

describe("superoTopeAvisos", () => {
  it("no pasa el tope con 0, 1, 2 o 3 eventos en 24 h", () => {
    expect(superoTopeAvisos(0)).toBe(false);
    expect(superoTopeAvisos(TOPE_AVISOS_POR_AUTOR_DIA)).toBe(false);
  });
  it("pasa el tope a partir del cuarto evento (con el tope por defecto, 3)", () => {
    expect(superoTopeAvisos(TOPE_AVISOS_POR_AUTOR_DIA + 1)).toBe(true);
  });
  it("admite un tope distinto al por defecto", () => {
    expect(superoTopeAvisos(5, 10)).toBe(false);
    expect(superoTopeAvisos(11, 10)).toBe(true);
  });
});

describe("ventanaRecordatorio", () => {
  it("va de ahora a dentro de `horas`, en ISO", () => {
    expect(ventanaRecordatorio(24, AHORA)).toEqual({ desde: "2026-09-19T16:00:00.000Z", hasta: "2026-09-20T16:00:00.000Z" });
  });
  it("con 1 hora, la ventana es corta", () => {
    expect(ventanaRecordatorio(1, AHORA)).toEqual({ desde: "2026-09-19T16:00:00.000Z", hasta: "2026-09-19T17:00:00.000Z" });
  });
});

describe("pendientesDeAviso", () => {
  const perfil = (id: string, extra: Partial<Canales> = {}): Canales => ({ id, avisos_correo: true, avisos_push: false, ...extra });

  it("deja fuera a quien no tiene ningún canal activo", () => {
    const perfiles = [perfil("a"), perfil("b", { avisos_correo: false, avisos_push: false })];
    expect(pendientesDeAviso(perfiles, new Set())).toEqual([perfil("a")]);
  });
  it("cuenta con que el push solo también basta", () => {
    const perfiles = [perfil("a", { avisos_correo: false, avisos_push: true })];
    expect(pendientesDeAviso(perfiles, new Set())).toEqual(perfiles);
  });
  it("deja fuera a quien ya está en avisos_enviados, aunque tenga canal activo", () => {
    const perfiles = [perfil("a"), perfil("b")];
    expect(pendientesDeAviso(perfiles, new Set(["a"]))).toEqual([perfil("b")]);
  });
  it("sin nadie pendiente, lista vacía", () => {
    expect(pendientesDeAviso([perfil("a")], new Set(["a"]))).toEqual([]);
  });
});

describe("contenidoPush", () => {
  it("nuevo evento: título con el lugar, cuerpo con título y cuándo, enlace a la ficha", () => {
    const c = contenidoPush("nuevo_evento", evento(), "ambos", AHORA);
    expect(c.titulo).toBe("Nuevo en Casa 1100");
    expect(c.cuerpo).toBe("Noche de jazz · sáb 26 de sep · 19:00");
    expect(c.url).toBe("https://somosnosotros.org/eventos/evt-1");
  });
  it("cambio: dice qué cambió (fecha, lugar o ambos) y cómo queda ahora", () => {
    expect(contenidoPush("cambio", evento(), "cuando", AHORA).titulo).toBe("Cambió la fecha: Noche de jazz");
    expect(contenidoPush("cambio", evento(), "donde", AHORA).titulo).toBe("Cambió el lugar: Noche de jazz");
    const c = contenidoPush("cambio", evento(), "ambos", AHORA);
    expect(c.titulo).toBe("Cambió la fecha y el lugar: Noche de jazz");
    expect(c.cuerpo).toBe("Ahora es sáb 26 de sep · 19:00 · Casa 1100");
  });
  it("recordatorio: título 'Hoy' con el título del evento", () => {
    const c = contenidoPush("recordatorio", evento(), "ambos", AHORA);
    expect(c.titulo).toBe("Hoy: Noche de jazz");
    expect(c.cuerpo).toBe("sáb 26 de sep · 19:00 · Casa 1100");
  });
  it("sin lugar registrado, usa el sitio escrito a mano (o 'sitio reservado')", () => {
    const c = contenidoPush("nuevo_evento", evento({ lugar: null, sitio_texto: "Plaza de armas" }), "ambos", AHORA);
    expect(c.titulo).toBe("Nuevo en Plaza de armas");
    const reservado = contenidoPush("nuevo_evento", evento({ lugar: null, sitio_texto: "Plaza de armas", sitio_reservado: true }), "ambos", AHORA);
    expect(reservado.titulo).toBe("Nuevo en Plaza de armas · sitio reservado");
  });
});
