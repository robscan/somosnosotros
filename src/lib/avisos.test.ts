import { describe, expect, it } from "vitest";
import { contenidoPush, contenidoPushAdmin, lotes, pendientesDeAviso, superoTopeAvisos, TOPE_AVISOS_POR_AUTOR_DIA, ventanaRecordatorio, type Canales, type EventoParaAviso } from "./avisos";

// "ahora" fijo para que los textos con fecha no dependan del día en que corre la prueba.
const AHORA = new Date("2026-09-19T16:00:00Z"); // sábado 19 sep 2026, 10:00 hora de la ciudad

const evento = (extra: Partial<EventoParaAviso> = {}): EventoParaAviso => ({
  id: "evt-1",
  titulo: "Noche de jazz",
  inicio: "2026-09-27T01:00:00Z",
  fin: null,
  zona: "America/Mexico_City",
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
  it("recordatorio: 'Hoy' o 'Mañana' en la zona del evento, con el título", () => {
    const hoy = contenidoPush("recordatorio", evento({ inicio: "2026-09-20T01:00:00Z" }), "ambos", AHORA);
    expect(hoy.titulo).toBe("Hoy: Noche de jazz");
    expect(hoy.cuerpo).toBe("Hoy · 19:00 · Casa 1100");
    // Mañana a las 8:00, dentro de las 24 horas del recordatorio de las 9:00: antes decía "Hoy".
    expect(contenidoPush("recordatorio", evento({ inicio: "2026-09-20T14:00:00Z" }), "ambos", AHORA).titulo).toBe("Mañana: Noche de jazz");
    // El mismo instante en Madrid es la 1:00 del domingo: mañana allá.
    const madrid = contenidoPush("recordatorio", evento({ inicio: "2026-09-19T23:00:00Z", zona: "Europe/Madrid" }), "ambos", AHORA);
    expect(madrid.titulo).toBe("Mañana: Noche de jazz");
    expect(madrid.cuerpo).toBe("Mañana · 01:00 · Casa 1100");
  });
  it("sin lugar registrado, usa el sitio escrito a mano (o 'sitio reservado')", () => {
    const c = contenidoPush("nuevo_evento", evento({ lugar: null, sitio_texto: "Plaza de armas" }), "ambos", AHORA);
    expect(c.titulo).toBe("Nuevo en Plaza de armas");
    const reservado = contenidoPush("nuevo_evento", evento({ lugar: null, sitio_texto: "Plaza de armas", sitio_reservado: true }), "ambos", AHORA);
    expect(reservado.titulo).toBe("Nuevo en Plaza de armas · sitio reservado");
  });
});

describe("contenidoPushAdmin (OL-115)", () => {
  it("un solo motivo: dice cuál, sin numero", () => {
    expect(contenidoPushAdmin({ reclamo_ficha: 1 })).toEqual({ titulo: "Administración", cuerpo: "Alguien reclamó una ficha", url: "/admin" });
    expect(contenidoPushAdmin({ registro: 1 })).toEqual({ titulo: "Administración", cuerpo: "Alguien se registró", url: "/admin" });
    expect(contenidoPushAdmin({ nuevo_evento: 1 }).cuerpo).toBe("Se publicó un evento nuevo");
    expect(contenidoPushAdmin({ nuevo_lugar: 1 }).cuerpo).toBe("Se publicó un lugar nuevo");
    expect(contenidoPushAdmin({ nuevo_artista: 1 }).cuerpo).toBe("Se publicó un artista nuevo");
    expect(contenidoPushAdmin({ reporte: 1 }).cuerpo).toBe("Alguien envió un reporte");
  });
  it("agrupado: dice cuántas cosas, nunca un nombre ni un motivo suelto", () => {
    expect(contenidoPushAdmin({ registro: 3, reclamo_ficha: 2 }).cuerpo).toBe("5 cosas por revisar");
    expect(contenidoPushAdmin({ nuevo_evento: 2 }).cuerpo).toBe("2 cosas por revisar");
  });
  it("siempre abre /admin, sin ids ni datos personales en el cuerpo", () => {
    const c = contenidoPushAdmin({ registro: 1 });
    expect(c.url).toBe("/admin");
    expect(c.cuerpo).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/); // sin uuid colado
  });
});
