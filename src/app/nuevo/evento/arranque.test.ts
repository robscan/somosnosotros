import { describe, expect, it } from "vitest";
import type { LugarResumen } from "@/lib/lugares";
import { arranqueDe, costoDeEvento, respuestasDeEvento, sinPisar, sitioDeEvento, type EventoBase } from "./arranque";
import { OTRO_VACIO, estadoConArranque, faltan, pasoActual } from "./pasos";

/** OL-312 (bitácora 340): con qué abre el alta por pasos según por dónde se entra. */
const TEATRO: LugarResumen = { id: "0b0b0b0b-0000-4000-8000-000000000001", nombre: "Teatro de la Paz", tipo: "foro", direccion: "Villerías 205", lat: 22.15, lng: -100.97, portada: null, zona: "America/Mexico_City", privado: false };
const MI_TALLER: LugarResumen = { ...TEATRO, id: "0b0b0b0b-0000-4000-8000-000000000003", nombre: "Mi taller", direccion: "Calle Privada 4", privado: true };
const LUGARES = [TEATRO, MI_TALLER];
const ARTISTA = { id: "0a0a0a0a-0000-4000-8000-000000000009", nombre: "Lucía Montaño" };
const EVENTO: EventoBase = { titulo: "Ecos de papel", lugar_id: TEATRO.id, precio: "$150", descripcion: "Lectura.", enlace: "https://ejemplo.org", sitio_texto: null, sitio_direccion: null, sitio_lat: null, sitio_lng: null, sitio_reservado: false, ciudad: "San Luis Potosí" };

describe("el evento que se duplica", () => {
  it("trae nombre, sitio, costo, quién, descripción y enlace; nunca el día, la hora ni el cartel", () => {
    const r = respuestasDeEvento(EVENTO, LUGARES, [ARTISTA]);
    expect(r).toEqual({ nombre: "Ecos de papel", sitio: { modo: "lugar", lugarId: TEATRO.id, otro: OTRO_VACIO }, costo: "precio", precio: "150", quien: [ARTISTA], descripcion: "Lectura.", enlace: "https://ejemplo.org" });
    expect(r).not.toHaveProperty("dias");
    expect(r).not.toHaveProperty("hora");
  });
  it("el costo: sin precio gratis, «Cooperación solidaria» cooperación, un número su precio y un texto sin número se pregunta", () => {
    expect(costoDeEvento(null)).toEqual({ costo: "gratis", precio: "" });
    expect(costoDeEvento("Cooperación solidaria")).toEqual({ costo: "cooperacion", precio: "" });
    expect(costoDeEvento("$1,200")).toEqual({ costo: "precio", precio: "1200" });
    expect(costoDeEvento("taquilla")).toBeNull();
    expect(respuestasDeEvento({ ...EVENTO, precio: "taquilla" }, LUGARES, [])).not.toHaveProperty("costo");
  });
  it("el sitio: un lugar que ya no está en el directorio se pregunta; uno privado de la cuenta va como reservado", () => {
    expect(sitioDeEvento({ ...EVENTO, lugar_id: "0b0b0b0b-0000-4000-8000-0000000000ff" }, LUGARES)).toBeUndefined();
    expect(sitioDeEvento({ ...EVENTO, lugar_id: MI_TALLER.id }, LUGARES)?.modo).toBe("reservado");
  });
  it("otro sitio con su nombre, su dirección y su punto queda contestado; sin punto con dirección, se pregunta", () => {
    const otro = { ...EVENTO, lugar_id: null, sitio_texto: "Jardín de San Juan de Dios", sitio_direccion: "Calle Madero 1", sitio_lat: 22.1511, sitio_lng: -100.9772 };
    const sitio = sitioDeEvento(otro, LUGARES);
    expect(sitio).toMatchObject({ modo: "otro", otro: { sitioTexto: "Jardín de San Juan de Dios", direccion: "Calle Madero 1", sitioPunto: { lat: 22.1511, lng: -100.9772 }, ciudad: "San Luis Potosí" } });
    expect(faltan({ ...estadoConArranque([], null).r, sitio: sitio! })).not.toContain("donde");
    const sinPunto = sitioDeEvento({ ...otro, sitio_lat: null, sitio_lng: null }, LUGARES);
    expect(faltan({ ...estadoConArranque([], null).r, sitio: sinPunto! })).toContain("donde");
  });
  it("un sitio reservado se pregunta: su dirección exacta no se lee al duplicar", () => {
    expect(sitioDeEvento({ ...EVENTO, lugar_id: null, sitio_texto: "Casa de Ana", sitio_reservado: true }, LUGARES)).toBeUndefined();
  });
});

describe("el arranque y el primer paso", () => {
  it("de cero no hay arranque y se abre en el primer paso", () => {
    expect(arranqueDe({})).toBeNull();
    expect(estadoConArranque([], null).pila).toEqual(["inicio"]);
  });
  it("un lugar contesta el sitio y abre en el primer paso: «¿Dónde es?» ya no falta", () => {
    const a = arranqueDe({ lugar: TEATRO });
    expect(a).toEqual({ r: { sitio: { modo: "lugar", lugarId: TEATRO.id, otro: OTRO_VACIO } }, entrar: false });
    const e = estadoConArranque([], a);
    expect(pasoActual(e)).toBe("inicio");
    expect(faltan(e.r)).toEqual(["nombre", "dia", "hora", "cuanto"]);
  });
  it("un artista pone Quién (en vez del artista propio de la cuenta); con un lugar, los dos", () => {
    const yo = [{ id: "yo", nombre: "Quien publica" }];
    expect(estadoConArranque(yo, arranqueDe({ artista: ARTISTA })).r.quien).toEqual([ARTISTA]);
    expect(estadoConArranque(yo, null).r.quien).toEqual(yo);
    expect(arranqueDe({ lugar: TEATRO, artista: ARTISTA })?.r).toMatchObject({ sitio: { lugarId: TEATRO.id }, quien: [ARTISTA] });
  });
  it("duplicar entra ya en «¿Qué día es?» con el primer paso detrás y sin transición", () => {
    const e = estadoConArranque([], arranqueDe({ desde: respuestasDeEvento(EVENTO, LUGARES, []), lugar: MI_TALLER }));
    expect(e.pila).toEqual(["inicio", "dia"]);
    expect(e.direccion).toBeNull();
    // El evento manda sobre el lugar de la consulta.
    expect(e.r.sitio.lugarId).toBe(TEATRO.id);
  });
});

describe("lo que vino al abrir no lo pisa el cartel", () => {
  const leidas = { nombre: "Del cartel", dias: { desde: "2026-11-05", hasta: null }, hora: "19:00", fin: "", sitio: { modo: "lugar" as const, lugarId: "otro", otro: OTRO_VACIO }, costo: "gratis" as const, precio: "", quien: [{ nombre: "Trío Bruma" }] };
  it("sin arranque, todo lo leído", () => {
    expect(sinPisar(leidas, null)).toEqual(leidas);
  });
  it("con el lugar y el artista de las fichas, solo lo demás", () => {
    expect(sinPisar(leidas, arranqueDe({ lugar: TEATRO, artista: ARTISTA }))).toEqual({ nombre: "Del cartel", dias: leidas.dias, hora: "19:00", fin: "", costo: "gratis", precio: "" });
  });
  it("al duplicar, solo el día y la hora (y lo que el evento traía vacío, como sus artistas)", () => {
    const r = respuestasDeEvento({ ...EVENTO, descripcion: null }, LUGARES, []);
    expect(Object.keys(sinPisar({ ...leidas, descripcion: "Del cartel" }, arranqueDe({ desde: r }))).sort()).toEqual(["descripcion", "dias", "fin", "hora", "quien"]);
  });
});
