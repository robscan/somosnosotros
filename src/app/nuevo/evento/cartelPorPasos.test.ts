import { describe, expect, it } from "vitest";
import { pasosQueFaltan, respuestasDelCartel, type Leido } from "./cartelPorPasos";
import { OTRO_VACIO, estadoInicial, faltan, flujo, pasoActual } from "./pasos";

const LUGAR = "0b0b0b0b-0000-4000-8000-000000000001";
const VALORES = { titulo: "", inicio: "", fin: "", gratis: false, precio: "", descripcion: "", enlace: "", lugar: "", direccion: "", artistas: [] };

/** Una lectura con lo que se le diga y nada más: sin hora ni precio leídos, sin lugar del directorio. */
const leyendo = (valores: Partial<typeof VALORES> = {}, resto: Partial<Omit<Leido, "valores">> = {}): Leido => ({ ok: true, valores: { ...VALORES, ...valores }, lugarId: null, quien: [], horaLeida: false, costoLeido: false, ...resto });

/** El cartel completo del prototipo (caso «legible»): nombre, jueves 5 de noviembre a las 19:00, un lugar del directorio y gratis. */
const COMPLETO = leyendo({ titulo: "Inauguración de Ecos de papel", inicio: "2026-11-05T19:00", gratis: true }, { lugarId: LUGAR, horaLeida: true, costoLeido: true, quien: [{ nombre: "Lucía Montaño" }] });

describe("qué se pregunta tras leer un cartel", () => {
  it("con todo leído no se pregunta nada, y de «Leyendo» se pasa directo a «Revisa»", () => {
    expect(pasosQueFaltan(COMPLETO)).toEqual([]);
    const e = flujo(estadoInicial(), { tipo: "contestar", cambios: respuestasDelCartel(COMPLETO) });
    expect(pasoActual(e)).toBe("revisa");
    expect(e.pila).toEqual(["inicio", "revisa"]);
    expect(e.r).toMatchObject({ nombre: "Inauguración de Ecos de papel", dias: { desde: "2026-11-05", hasta: null }, hora: "19:00", fin: "", costo: "gratis", quien: [{ nombre: "Lucía Montaño" }] });
    expect(e.r.sitio).toEqual({ modo: "lugar", lugarId: LUGAR, otro: OTRO_VACIO });
  });

  it("a medias (caso «medias»: nombre y fecha con hora, sin lugar ni precio) se preguntan solo dónde y cuánto, en ese orden", () => {
    const medias = leyendo({ titulo: "Noche de son huasteco", inicio: "2026-11-14T20:00" }, { horaLeida: true });
    expect(pasosQueFaltan(medias)).toEqual(["donde", "cuanto"]);
    const e = flujo(estadoInicial(), { tipo: "contestar", cambios: respuestasDelCartel(medias) });
    expect(pasoActual(e)).toBe("donde");
  });

  it("una fecha sin hora pregunta solo la hora: las 19:00 de relleno del lector no son un dato", () => {
    const sinHora = leyendo({ titulo: "Cine al aire libre", inicio: "2026-11-14T19:00", gratis: true }, { lugarId: LUGAR, costoLeido: true });
    expect(pasosQueFaltan(sinHora)).toEqual(["hora"]);
    const r = respuestasDelCartel(sinHora);
    expect(r.dias).toEqual({ desde: "2026-11-14", hasta: null });
    expect(r.hora).toBeUndefined();
    expect(pasoActual(flujo(estadoInicial(), { tipo: "contestar", cambios: r }))).toBe("hora");
  });

  it("sin fecha se pregunta el día y la hora", () => {
    expect(pasosQueFaltan(leyendo({ titulo: "Sin fecha", gratis: true }, { lugarId: LUGAR, costoLeido: true }))).toEqual(["dia", "hora"]);
  });

  it("sin título se pregunta el nombre primero", () => {
    expect(pasosQueFaltan({ ...COMPLETO, valores: { ...COMPLETO.valores, titulo: "" } })).toEqual(["nombre"]);
  });

  it("un sitio que no está en el directorio queda como «otro» con lo leído y por confirmar: «Dónde» se pregunta igual", () => {
    const fuera = leyendo({ titulo: "Concierto", inicio: "2026-11-05T19:00", gratis: true, lugar: "Jardín de San Juan de Dios", direccion: "Calle Galeana 100" }, { horaLeida: true, costoLeido: true });
    const r = respuestasDelCartel(fuera);
    expect(r.sitio).toEqual({ modo: "otro", lugarId: "", otro: { ...OTRO_VACIO, sitioTexto: "Jardín de San Juan de Dios", direccion: "Calle Galeana 100", pinPendiente: true } });
    expect(r.sitio?.otro.sitioPunto).toBeNull();
    expect(pasosQueFaltan(fuera)).toEqual(["donde"]);
  });

  it("un sitio con solo el nombre, sin dirección, también se pregunta (no se acepta un lugar sin mapa que nadie confirmó)", () => {
    const soloNombre = leyendo({ titulo: "Concierto", inicio: "2026-11-05T19:00", gratis: true, lugar: "Casa Chata" }, { horaLeida: true, costoLeido: true });
    expect(respuestasDelCartel(soloNombre).sitio?.otro).toMatchObject({ sitioTexto: "Casa Chata", direccion: "", pinPendiente: true });
    expect(pasosQueFaltan(soloNombre)).toEqual(["donde"]);
  });

  it("solo la dirección, sin nombre de lugar, deja el nombre del sitio vacío y también se pregunta", () => {
    const soloDireccion = leyendo({ titulo: "Concierto", inicio: "2026-11-05T19:00", gratis: true, direccion: "Calle Galeana 100" }, { horaLeida: true, costoLeido: true });
    expect(respuestasDelCartel(soloDireccion).sitio?.otro).toMatchObject({ sitioTexto: "", direccion: "Calle Galeana 100" });
    expect(pasosQueFaltan(soloDireccion)).toEqual(["donde"]);
  });

  it("un lugar del directorio gana sobre el texto del cartel", () => {
    const r = respuestasDelCartel(leyendo({ lugar: "Museo Federico Silva", direccion: "Obregón 80" }, { lugarId: LUGAR }));
    expect(r.sitio).toEqual({ modo: "lugar", lugarId: LUGAR, otro: OTRO_VACIO });
  });

  it("el precio: gratis o un monto leído se dan por contestados; si el cartel no dice nada, «gratis» es relleno y se pregunta", () => {
    expect(respuestasDelCartel(leyendo({ gratis: true }, { costoLeido: true }))).toMatchObject({ costo: "gratis" });
    expect(respuestasDelCartel(leyendo({ precio: "150" }, { costoLeido: true }))).toMatchObject({ costo: "precio", precio: "150" });
    const callado = respuestasDelCartel(leyendo({ gratis: true }));
    expect(callado.costo).toBeUndefined();
    expect(pasosQueFaltan(leyendo({ titulo: "Callado", inicio: "2026-11-05T19:00", gratis: true }, { lugarId: LUGAR, horaLeida: true }))).toEqual(["cuanto"]);
  });

  it("la hora de fin del cartel pone el fin; sin ella, «sin hora de fin»; menor que la de inicio, es la madrugada del día siguiente", () => {
    expect(respuestasDelCartel(leyendo({ inicio: "2026-11-05T19:00", fin: "2026-11-05T21:30" }, { horaLeida: true })).fin).toBe("2026-11-05T21:30");
    expect(respuestasDelCartel(leyendo({ inicio: "2026-11-05T19:00" }, { horaLeida: true })).fin).toBe("");
    expect(respuestasDelCartel(leyendo({ inicio: "2026-11-05T22:00", fin: "2026-11-05T01:00" }, { horaLeida: true })).fin).toBe("2026-11-06T01:00");
    // Un fin sin hora de inicio leída no cuenta: primero se pregunta la hora.
    expect(respuestasDelCartel(leyendo({ inicio: "2026-11-05T19:00", fin: "2026-11-05T21:30" })).fin).toBeUndefined();
  });

  it("los artistas del cartel mandan sobre el artista propio que Quién trae de arranque, y si no nombra a nadie queda vacío", () => {
    const yo = [{ id: "a1", nombre: "Mi proyecto" }];
    expect(respuestasDelCartel(leyendo({}, { quien: [{ nombre: "Trío Bruma" }] }), yo).quien).toEqual([{ nombre: "Trío Bruma" }]);
    expect(respuestasDelCartel(leyendo(), yo).quien).toEqual([]);
  });

  it("descripción y enlace entran si vienen, y no pisan nada si no", () => {
    expect(respuestasDelCartel(leyendo({ descripcion: "Una noche de sones.", enlace: "https://ejemplo.mx" }))).toMatchObject({ descripcion: "Una noche de sones.", enlace: "https://ejemplo.mx" });
    const sin = respuestasDelCartel(leyendo());
    expect(sin).not.toHaveProperty("descripcion");
    expect(sin).not.toHaveProperty("enlace");
  });

  it("un cartel que no trae nada lo deja todo por preguntar, como sin cartel", () => {
    expect(pasosQueFaltan(leyendo())).toEqual(faltan(estadoInicial().r));
  });

  it("lo que el cartel no trae no borra lo ya contestado (se vuelve a subir otro cartel desde Atrás)", () => {
    const contestado = flujo(estadoInicial(), { tipo: "contestar", cambios: { nombre: "Escrito a mano" } });
    const e = flujo({ ...contestado, pila: ["inicio"] }, { tipo: "contestar", cambios: respuestasDelCartel(leyendo({ inicio: "2026-11-05T19:00" }, { horaLeida: true })) });
    expect(e.r.nombre).toBe("Escrito a mano");
    expect(pasoActual(e)).toBe("donde");
  });
});
