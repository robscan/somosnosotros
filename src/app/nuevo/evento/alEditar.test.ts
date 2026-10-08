import { describe, expect, it } from "vitest";
import { localAIso } from "@/lib/fechas";
import type { LugarResumen } from "@/lib/lugares";
import { sesionesParaEnviar } from "@/lib/sesionesEvento";
import { cuandoDeEvento, horariosDeEvento, horasParaRevelar, respuestasAlEditar, sitioAlEditar, type EventoAEditar } from "./alEditar";
import { dondeResuelto, estadoAlEditar, faltan, faltaParaPublicar, finDe, flujo, inicioDe, pasoActual } from "./pasos";

/** OL-319 (bitácora 348): el evento guardado vuelto respuestas para entrar en «Revisa» al editar. Zona: San Luis Potosí (UTC−6). */
const ZONA = "America/Mexico_City";
const TEATRO: LugarResumen = { id: "0b0b0b0b-0000-4000-8000-000000000001", nombre: "Teatro de la Paz", tipo: "foro", direccion: "Villerías 205", lat: 22.15, lng: -100.97, portada: null, zona: ZONA, privado: false };
const MI_TALLER: LugarResumen = { ...TEATRO, id: "0b0b0b0b-0000-4000-8000-000000000003", nombre: "Mi taller", privado: true };
const LUGARES = [TEATRO, MI_TALLER];
const ARTISTA = { id: "0a0a0a0a-0000-4000-8000-000000000009", nombre: "Lucía Montaño" };
// vie 13 de nov de 2026, de 19:00 a 21:00 en San Luis.
const EVENTO: EventoAEditar = {
  titulo: "Ecos de papel", inicio: "2026-11-14T01:00:00.000Z", fin: "2026-11-14T03:00:00.000Z", lugar_id: TEATRO.id, precio: "$150", descripcion: "Lectura.", enlace: "https://ejemplo.org",
  imagen: null, sitio_texto: null, sitio_direccion: null, sitio_lat: null, sitio_lng: null, sitio_reservado: false, sitio_revelar_desde: null, zona: ZONA, ciudad: "San Luis Potosí",
};
const alEditar = (e: Partial<EventoAEditar> = {}, extra: Partial<Parameters<typeof respuestasAlEditar>[0]> = {}) => respuestasAlEditar({ evento: { ...EVENTO, ...e }, privado: null, lugares: LUGARES, quien: [ARTISTA], zona: ZONA, ...extra });
/** Lo que guardaría el flujo con esas respuestas, en instantes, como lo lee el servidor. */
const guardado = (r: ReturnType<typeof alEditar>) => ({ inicio: localAIso(inicioDe(r), ZONA), fin: finDe(r) ? localAIso(finDe(r), ZONA) : null });

describe("el evento como respuestas", () => {
  it("trae todo: nombre, día y hora, lugar, precio, quién, descripción y enlace; nada falta y se entra en «Revisa»", () => {
    const r = alEditar();
    expect(r).toMatchObject({ nombre: "Ecos de papel", dias: { desde: "2026-11-13", hasta: null }, hora: "19:00", fin: "2026-11-13T21:00", sesiones: null, sitio: { modo: "lugar", lugarId: TEATRO.id }, costo: "precio", precio: "150", quien: [ARTISTA], descripcion: "Lectura.", enlace: "https://ejemplo.org" });
    expect(faltan(r)).toEqual([]);
    expect(faltaParaPublicar(r)).toBeNull();
    expect(pasoActual(estadoAlEditar(r))).toBe("revisa");
  });

  it("guardar sin tocar nada guarda lo mismo: el inicio y el fin vuelven a ser los guardados", () => {
    expect(guardado(alEditar())).toEqual({ inicio: EVENTO.inicio, fin: EVENTO.fin });
    expect(guardado(alEditar({ fin: null }))).toEqual({ inicio: EVENTO.inicio, fin: null });
    const noche = { fin: "2026-11-14T07:00:00.000Z" }; // termina a la 1:00 del sábado
    expect(guardado(alEditar(noche))).toEqual({ inicio: EVENTO.inicio, fin: noche.fin });
    const tresDias = { fin: "2026-11-16T03:00:00.000Z" }; // del vie 13 al dom 15, hasta las 21:00
    expect(guardado(alEditar(tresDias))).toEqual({ inicio: EVENTO.inicio, fin: tresDias.fin });
  });

  it("cuándo: sin fin es un día «Sin hora de fin»; una noche que cruza la medianoche es un día; si no, varios días", () => {
    expect(cuandoDeEvento(EVENTO.inicio, null, ZONA)).toEqual({ dias: { desde: "2026-11-13", hasta: null }, hora: "19:00", fin: "" });
    expect(cuandoDeEvento(EVENTO.inicio, "2026-11-14T07:00:00.000Z", ZONA)).toEqual({ dias: { desde: "2026-11-13", hasta: null }, hora: "19:00", fin: "2026-11-14T01:00" });
    expect(cuandoDeEvento(EVENTO.inicio, "2026-11-16T03:00:00.000Z", ZONA)).toEqual({ dias: { desde: "2026-11-13", hasta: "2026-11-15" }, hora: "19:00", fin: "2026-11-15T21:00" });
    // Dos días que acaban más tarde que la hora de inicio: varios días, no una noche.
    expect(cuandoDeEvento(EVENTO.inicio, "2026-11-15T04:00:00.000Z", ZONA).dias).toEqual({ desde: "2026-11-13", hasta: "2026-11-14" });
    // Varios días sin hora de fin: acaban con su último día (23:59), que es el «Sin hora de fin» de varios días.
    expect(cuandoDeEvento(EVENTO.inicio, "2026-11-16T05:59:00.000Z", ZONA).fin).toBe("2026-11-15T23:59");
  });

  it("costo: sin precio gratis, cooperación, y un precio sin número se pregunta (falta el precio)", () => {
    expect(alEditar({ precio: null })).toMatchObject({ costo: "gratis", precio: "" });
    expect(alEditar({ precio: "Cooperación solidaria" })).toMatchObject({ costo: "cooperacion" });
    const taquilla = alEditar({ precio: "taquilla" });
    expect(taquilla).toMatchObject({ costo: null, precio: "" });
    expect(faltaParaPublicar(taquilla)).toBe("Falta el precio");
  });
});

describe("dónde", () => {
  it("un lugar del directorio va por su id, también uno privado de la cuenta (no se vuelve reservado); uno que ya no está se pregunta", () => {
    expect(sitioAlEditar(EVENTO, null, LUGARES)).toMatchObject({ modo: "lugar", lugarId: TEATRO.id });
    expect(sitioAlEditar({ ...EVENTO, lugar_id: MI_TALLER.id }, null, LUGARES)).toMatchObject({ modo: "lugar", lugarId: MI_TALLER.id });
    const fuera = sitioAlEditar({ ...EVENTO, lugar_id: "0b0b0b0b-0000-4000-8000-0000000000ff" }, null, LUGARES);
    expect(fuera).toMatchObject({ modo: "lugar", lugarId: "" });
    expect(dondeResuelto(fuera)).toBe(false);
  });

  it("otro sitio con nombre, dirección, punto y ciudad; el de antes sin dirección se respeta, y sin punto se vuelve a preguntar (OL-348)", () => {
    const otro = sitioAlEditar({ ...EVENTO, lugar_id: null, sitio_texto: "Jardín de San Juan de Dios", sitio_direccion: "Calle Madero 1", sitio_lat: 22.1511, sitio_lng: -100.9772 }, null, LUGARES);
    expect(otro).toMatchObject({ modo: "otro", otro: { sitioTexto: "Jardín de San Juan de Dios", direccion: "Calle Madero 1", nombreLegacy: false, sitioPunto: { lat: 22.1511, lng: -100.9772 }, ciudad: "San Luis Potosí" } });
    expect(dondeResuelto(otro)).toBe(true);
    const deAntes = sitioAlEditar({ ...EVENTO, lugar_id: null, sitio_texto: "La casa de la esquina", sitio_lat: 22.15, sitio_lng: -100.98 }, null, LUGARES);
    expect(deAntes.otro.nombreLegacy).toBe(true);
    expect(dondeResuelto(deAntes)).toBe(true);
    // Sin punto (los eventos antiguos que la base no revisó): «Dónde» queda por contestar y «Revisa» dice «Falta el lugar».
    const sinPunto = sitioAlEditar({ ...EVENTO, lugar_id: null, sitio_texto: "La casa de la esquina" }, null, LUGARES);
    expect(dondeResuelto(sinPunto)).toBe(false);
  });

  it("un sitio reservado trae su dirección exacta, su punto, sus indicaciones y cuántas horas antes se revela", () => {
    const privado = { direccion: "Calle Privada 4", lat: 22.16, lng: -100.99, indicaciones: "Tocar el timbre", revelar_desde: "2026-11-13T19:00:00.000Z" };
    const reservado = sitioAlEditar({ ...EVENTO, lugar_id: null, sitio_texto: "Casa de Ana", sitio_reservado: true, sitio_revelar_desde: privado.revelar_desde }, privado, LUGARES);
    expect(reservado).toMatchObject({ modo: "reservado", otro: { reservado: true, sitioTexto: "Casa de Ana", direccionPrivada: "Calle Privada 4", privadoPunto: { lat: 22.16, lng: -100.99 }, indicaciones: "Tocar el timbre", revelarHoras: 6 } });
    expect(reservado.otro.direccionRetirada).toBeUndefined();
    expect(dondeResuelto(reservado)).toBe(true);
  });

  it("un sitio reservado de un evento que terminó hace más de siete días, ya sin dirección: se conserva con su nombre", () => {
    const viejo = { ...EVENTO, lugar_id: null, sitio_texto: "Casa de Ana", sitio_reservado: true, inicio: "2020-01-10T01:00:00.000Z", fin: "2020-01-10T03:00:00.000Z" };
    const sitio = sitioAlEditar(viejo, null, LUGARES);
    expect(sitio.otro).toMatchObject({ direccionRetirada: true, direccionPrivada: "" });
    expect(dondeResuelto(sitio)).toBe(true);
    // Uno que todavía no vence y no trae su dirección (no debería pasar): falta.
    expect(dondeResuelto(sitioAlEditar({ ...viejo, inicio: EVENTO.inicio, fin: EVENTO.fin }, null, LUGARES))).toBe(false);
  });

  it("horas para revelar: las que se ofrecen; otra cuenta o ninguna, 24", () => {
    expect(horasParaRevelar(EVENTO.inicio, "2026-11-13T22:00:00.000Z")).toBe(3);
    expect(horasParaRevelar(EVENTO.inicio, "2026-11-13T20:00:00.000Z")).toBe(24);
    expect(horasParaRevelar(EVENTO.inicio, null)).toBe(24);
  });
});

describe("horario por día (OL-311) al editar", () => {
  // Del vie 13 al dom 15: 19:00–21:00, el sábado 17:00 sin hora de fin, el domingo 19:00–21:00.
  const tresDias = { fin: "2026-11-16T03:00:00.000Z" };
  const sesiones = [
    { inicio: "2026-11-14T01:00:00.000Z", fin: "2026-11-14T03:00:00.000Z" },
    { inicio: "2026-11-14T23:00:00.000Z", fin: null },
    { inicio: "2026-11-16T01:00:00.000Z", fin: "2026-11-16T03:00:00.000Z" },
  ];

  it("cada día con su horario, en la hora del sitio; guardar sin tocar manda las mismas sesiones", () => {
    const r = alEditar(tresDias, { sesiones });
    expect(r.sesiones).toEqual([
      { dia: "2026-11-13", hora: "19:00", fin: "21:00" },
      { dia: "2026-11-14", hora: "17:00", fin: "" },
      { dia: "2026-11-15", hora: "19:00", fin: "21:00" },
    ]);
    expect(guardado(r)).toEqual({ inicio: EVENTO.inicio, fin: tresDias.fin });
    const enviadas = JSON.parse(sesionesParaEnviar(r.sesiones!)) as { inicio: string; fin: string }[];
    expect(enviadas.map((s) => ({ inicio: localAIso(s.inicio, ZONA), fin: s.fin ? localAIso(s.fin, ZONA) : null }))).toEqual(sesiones);
    // El horario común (al que vuelve la casilla «Mismo horario todos los días») es el del primer día y el fin del último.
    expect(r).toMatchObject({ hora: "19:00", fin: "2026-11-15T21:00" });
  });

  it("sesiones que ya no le corresponden al evento (se editó por fuera) se ignoran: el mismo horario cada día", () => {
    expect(alEditar({ ...tresDias, inicio: "2026-11-14T02:00:00.000Z" }, { sesiones }).sesiones).toBeNull();
    expect(alEditar(tresDias, { sesiones: [] }).sesiones).toBeNull();
    expect(horariosDeEvento({ inicio: EVENTO.inicio, fin: EVENTO.fin, zona: ZONA }, sesiones, cuandoDeEvento(EVENTO.inicio, EVENTO.fin, ZONA))).toBeNull();
  });

  it("un día sin su sesión (no debería pasar) lleva el horario común", () => {
    const sinSabado = [sesiones[0], sesiones[2]];
    expect(alEditar(tresDias, { sesiones: sinSabado }).sesiones?.[1]).toEqual({ dia: "2026-11-14", hora: "19:00", fin: "21:00" });
  });

  it("desde «Revisa», volver a marcar la casilla deja el horario común y elegir otros días borra el horario por día", () => {
    const e = estadoAlEditar(alEditar(tresDias, { sesiones }));
    const hora = flujo(e, { tipo: "abrir", paso: "hora" });
    const comun = flujo(hora, { tipo: "cambiar", cambios: { sesiones: null } });
    expect(comun.r.sesiones).toBeNull();
    expect(guardado(comun.r)).toEqual({ inicio: EVENTO.inicio, fin: tresDias.fin });
    expect(pasoActual(flujo(comun, { tipo: "seguir" }))).toBe("revisa");
    const otrosDias = flujo(flujo(e, { tipo: "abrir", paso: "dia" }), { tipo: "contestar", cambios: { dias: { desde: "2026-11-20", hasta: "2026-11-21" } } });
    expect(otrosDias.r.sesiones).toBeNull();
    expect(pasoActual(otrosDias)).toBe("hora");
  });
});

describe("«Cambiar» desde «Revisa»", () => {
  it("abre la pregunta y, al contestarla, vuelve a «Revisa»; Atrás también", () => {
    const e = estadoAlEditar(alEditar());
    const cuanto = flujo(e, { tipo: "abrir", paso: "cuanto" });
    expect(pasoActual(cuanto)).toBe("cuanto");
    const gratis = flujo(cuanto, { tipo: "contestar", cambios: { costo: "gratis" } });
    expect(pasoActual(gratis)).toBe("revisa");
    expect(gratis.r.costo).toBe("gratis");
    expect(pasoActual(flujo(cuanto, { tipo: "atras", desde: "cuanto" }))).toBe("revisa");
    // «Revisa» es el primer paso: sin Atrás (la barra lleva la ✕).
    expect(flujo(e, { tipo: "atras", desde: "revisa" })).toBe(e);
  });
});
