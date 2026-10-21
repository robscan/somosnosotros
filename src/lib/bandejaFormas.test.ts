import { describe, expect, it } from "vitest";
import { armarBandejas, enBandeja, formaEnBandeja, idsParaContexto, SIN_CONTEXTO, variantesDe, type ContextoFormas } from "./bandejaFormas";
import { localAIso } from "./fechas";
import type { Bandeja, Propuesta } from "./propuestas";

/** OL-434: la forma de cada propuesta de evento en la bandeja de una ciudad, con datos como los deja la rutina de agendas (OL-433). */
const ZONA = "America/Mexico_City";
const AHORA = new Date("2026-10-21T16:00:00Z"); // miércoles 21 de octubre, 10:00 en San Luis Potosí
const local = (fechaHora: string) => localAIso(fechaHora, ZONA)!;
const SLP = { nombre: "San Luis Potosí", zona: ZONA };
const FEST = "f0000000-0000-4000-8000-000000000001";
const OTRO = "f0000000-0000-4000-8000-000000000002";
const REGISTRADO = "e0000000-0000-4000-8000-000000000001";
let n = 0;
const evento = (datos: Record<string, unknown>, extra: Partial<Propuesta> = {}): Propuesta => ({
  id: `p0000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
  tipo: "evento",
  fuente: "Cultura del estado y del municipio",
  datos: { titulo: "Recital", inicio: local("2026-10-25T18:00"), lugar: "Teatro de la Paz", url: "https://cultura.example/agenda", ...datos },
  creado_en: "2026-10-21T15:00:00Z",
  ...extra,
});
const festival = (extra: Partial<Propuesta> = {}) =>
  evento({ titulo: "Xantolo 2026", clase: "festival", actos: 4, programa: "Xantolo 2026", inicio: local("2026-10-28T19:00"), termina: local("2026-11-02T23:00"), lugar: "Plaza de Armas" }, { id: FEST, ...extra });
const actoDe = (titulo: string, extra: Record<string, unknown> = {}, p: Partial<Propuesta> = {}) =>
  evento({ titulo, marco_propuesto: FEST, programa: "Xantolo 2026", espera: "Se publica cuando aceptes el festival «Xantolo 2026».", inicio: local("2026-10-29T19:00"), lugar: "Plaza de Armas", ...extra }, p);
const bandeja = (id: string, propuestas: Propuesta[]): Bandeja => ({
  corrida: { id, tipo: "agendas", ciudad: "san-luis-potosi", ciudad_nombre: "San Luis Potosí", estado: "terminada", creado_en: "2026-10-21T15:00:00Z", tope_usd: 3, gasto_usd: 1, propuestas: propuestas.length, aceptadas: 0, rechazadas: 0, por_revisar: propuestas.length },
  propuestas,
  fuentes_con_tanda: [],
});

describe("la línea de forma de cada propuesta", () => {
  it("un evento como siempre, un lugar o un artista: sin línea", () => {
    expect(formaEnBandeja(evento({}), {}, AHORA, ZONA)).toBeNull();
    expect(formaEnBandeja({ tipo: "lugar", datos: { nombre: "Foro", clase: "festival" } }, {}, AHORA, ZONA)).toBeNull();
  });
  it("el festival propuesto: «Festival · 4 actos» con su periodo y el icono del festival", () => {
    expect(formaEnBandeja(festival(), {}, AHORA, ZONA)).toEqual({ icono: "festival", texto: "Festival · 4 actos", enlace: null, detalle: "Del 28 de oct al 2 de nov" });
  });
  it("un acto de un festival registrado enlaza a él", () => {
    expect(formaEnBandeja(evento({ marco: { id: REGISTRADO, titulo: "Fotovisión 31" } }), {}, AHORA, ZONA)).toEqual({
      icono: "festival",
      texto: "Acto de ",
      enlace: { texto: "«Fotovisión 31»", href: `/eventos/${REGISTRADO}` },
      detalle: null,
    });
  });
  it("un acto de un festival propuesto: sin enlace mientras se decide; con el de su evento si ya se aceptó; suelto si se rechazó", () => {
    const acto = actoDe("Danza de Huehues");
    expect(formaEnBandeja(acto, {}, AHORA, ZONA)).toEqual({ icono: "festival", texto: "Acto de «Xantolo 2026»", enlace: null, detalle: null });
    const aceptado: ContextoFormas = { aceptados: new Map(), festivales: new Map([[FEST, { estado: "aceptada", ficha_id: REGISTRADO }]]) };
    expect(formaEnBandeja(acto, { contexto: aceptado }, AHORA, ZONA)?.enlace).toEqual({ texto: "«Xantolo 2026»", href: `/eventos/${REGISTRADO}` });
    const rechazado: ContextoFormas = { aceptados: new Map(), festivales: new Map([[FEST, { estado: "rechazada", ficha_id: null }]]) };
    expect(formaEnBandeja(acto, { contexto: rechazado }, AHORA, ZONA)).toBeNull();
    const taller = actoDe("Taller de papel picado", { clase: "taller", sesiones: ["29", "30"].map((d) => ({ inicio: local(`2026-10-${d}T17:00`) })) });
    expect(formaEnBandeja(taller, { contexto: rechazado }, AHORA, ZONA)).toMatchObject({ icono: "fechas", texto: "Taller · 2 sesiones" });
  });
  it("bajo su festival, un acto no repite «Acto de…»: dice solo su forma propia", () => {
    expect(formaEnBandeja(actoDe("Danza de Huehues"), { anidado: true }, AHORA, ZONA)).toBeNull();
    const dias = actoDe("Altar monumental", { sesiones: ["28", "29", "30"].map((d) => ({ inicio: local(`2026-10-${d}T10:00`) })) });
    expect(formaEnBandeja(dias, { anidado: true }, AHORA, ZONA)).toEqual({ icono: "fechas", texto: "Evento de 3 días", enlace: null, detalle: "mié 28, jue 29 y vie 30 de oct · 10:00 am" });
  });
  it("taller, serie y exposición, con el icono de las fechas", () => {
    const taller = evento({ titulo: "Taller de grabado", clase: "taller", sesiones: ["03", "05", "10", "12"].map((d) => ({ inicio: local(`2026-11-${d}T17:00`), fin: local(`2026-11-${d}T19:00`) })) });
    expect(formaEnBandeja(taller, {}, AHORA, ZONA)).toEqual({ icono: "fechas", texto: "Taller · 4 sesiones", enlace: null, detalle: expect.stringMatching(/^mar 3, jue 5, mar 10 y jue 12 de nov · 5:00/) });
    const serie = evento({ serie: { fechas: ["2026-10-28T19:00", "2026-11-04T19:00", "2026-11-11T19:00", "2026-11-18T19:00"].map(local), cada: 7 } });
    expect(formaEnBandeja(serie, {}, AHORA, ZONA)).toEqual({ icono: "fechas", texto: "Serie · 4 fechas, cada semana", enlace: null, detalle: "mié 28 de oct y mié 4, mié 11 y mié 18 de nov · 7:00 pm" });
    const expo = evento({ titulo: "Inauguración: Raíces", clase: "exposicion", exposicion: "Raíces", termina: local("2026-11-30T23:59") });
    expect(formaEnBandeja(expo, {}, AHORA, ZONA)).toEqual({ icono: "fechas", texto: "Exposición «Raíces» · hasta el lun 30 de nov", enlace: null, detalle: null });
  });
  it("«También llegó como: …» con los otros títulos, sin repetir el suyo", () => {
    expect(variantesDe(evento({ titulo: "Los Hermanos Pérez Meza Big Band: Esto somos", variantes: ["Hermanos Pérez Meza Big Band"] }))).toBe("También llegó como: «Hermanos Pérez Meza Big Band»");
    expect(variantesDe(evento({ titulo: "Xil en concierto", variantes: ["Xil", "xil en concierto", "Xil, en vivo", 3] }))).toBe("También llegó como: «Xil» y «Xil, en vivo»");
    expect(variantesDe(evento({}))).toBeNull();
    expect(variantesDe({ tipo: "lugar", datos: { variantes: ["Otro"] } })).toBeNull();
  });
});

describe("la tarjeta y su línea de abajo", () => {
  it("el festival: sin fecha ni sitio en la línea (los dicen su periodo y sus actos); cuenta los actos aceptados que lo esperan", () => {
    const t = enBandeja(festival(), SLP, { contexto: { aceptados: new Map([[FEST, 2]]), festivales: new Map() } }, AHORA);
    expect(t.vista.linea).toBeNull();
    expect(t.aceptados).toBe(2);
    expect(t.vista.que).toBe("Evento · propuesto por la rutina");
  });
  it("un taller: el sitio sin la fecha de su primera sesión; un evento sin forma, como siempre", () => {
    const taller = enBandeja(evento({ clase: "taller", sesiones: ["03", "05"].map((d) => ({ inicio: local(`2026-11-${d}T17:00`) })) }), SLP, {}, AHORA);
    expect(taller.vista.linea).toBe("Teatro de la Paz");
    const suelto = enBandeja(evento({}), SLP, {}, AHORA);
    expect(suelto.vista.linea).toBe("25 oct, 6:00 pm · Teatro de la Paz");
    expect(suelto.aceptados).toBeNull();
    expect(suelto.forma).toBeNull();
  });
  it("bajo su festival: «Acto · propuesto por la rutina»", () => {
    const t = enBandeja(actoDe("Danza de Huehues"), SLP, { festival: FEST }, AHORA);
    expect(t.vista.que).toBe("Acto · propuesto por la rutina");
    expect(t.festival).toBe(FEST);
    expect(t.forma).toBeNull();
  });
});

describe("la bandeja de una ciudad", () => {
  it("los actos van con su festival aunque lleguen en otra búsqueda; la búsqueda que se queda sin tarjetas no se pinta", () => {
    const vieja = bandeja("c1", [festival(), evento({ titulo: "Recital de guitarra" })]);
    const nueva = bandeja("c2", [actoDe("Danza de Huehues"), actoDe("Son huasteco")]);
    const armadas = armarBandejas([vieja, nueva], SIN_CONTEXTO, SLP, AHORA);
    expect(armadas.map((b) => b.corrida.id)).toEqual(["c1"]);
    expect(armadas[0].propuestas.map((p) => [p.nombre, p.festival ?? null])).toEqual([
      ["Xantolo 2026", null],
      ["Recital de guitarra", null],
      ["Danza de Huehues", FEST],
      ["Son huasteco", FEST],
    ]);
  });
  it("un acto cuyo festival no está por revisar aquí se queda en su búsqueda, suelto", () => {
    const acto = actoDe("Danza de Huehues", { marco_propuesto: OTRO });
    const [b] = armarBandejas([bandeja("c1", [acto])], SIN_CONTEXTO, SLP, AHORA);
    expect(b.propuestas[0]).toMatchObject({ festival: null, forma: { texto: "Acto de «Xantolo 2026»" } });
  });
  it("qué se lee aparte: los festivales por revisar y los que nombran sus actos sin estar aquí", () => {
    expect(idsParaContexto([festival(), actoDe("Danza"), actoDe("Son", { marco_propuesto: OTRO }), evento({})])).toEqual({ festivales: [FEST], nombrados: [OTRO] });
    expect(idsParaContexto([{ id: "x", tipo: "lugar", datos: { clase: "festival" } }])).toEqual({ festivales: [], nombrados: [] });
  });
});
