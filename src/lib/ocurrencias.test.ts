import { describe, expect, it } from "vitest";
import { claveDe, ocurrenciaPaso, ocurrenciasDe, ocurrenciasDeLista, ocurrenciasVigentes, proximaOcurrencia, textoParte } from "./ocurrencias";

const MX = "America/Mexico_City"; // UTC−6 todo el año
type Prueba = { id: string; titulo: string; inicio: string; fin: string | null; zona: string; sesiones?: { inicio: string; fin: string | null }[]; precio?: string };
const evento = (id: string, inicio: string, fin: string | null, extra: Partial<Prueba> = {}): Prueba => ({ id, titulo: id, inicio, fin, zona: MX, ...extra });
/** Hora de pared de México → ISO (la zona no cambia de horario). */
const mx = (local: string) => new Date(`${local}:00-06:00`).toISOString();
const dias = (lista: { ocurrencia?: { dia: string } }[]) => lista.map((o) => o.ocurrencia?.dia);

describe("ocurrenciasDe: un evento de un solo día", () => {
  it("es una sola, él mismo, sin «Día n de N»", () => {
    const e = evento("a", mx("2026-10-10T20:00"), mx("2026-10-10T22:00"));
    const [o, ...otras] = ocurrenciasDe(e);
    expect(otras).toEqual([]);
    expect(o).toMatchObject({ id: "a", inicio: e.inicio, fin: e.fin, ocurrencia: { clave: "a:2026-10-10", dia: "2026-10-10", parte: null } });
    expect(textoParte(o)).toBeNull();
  });
  it("sin hora de fin también", () => {
    const [o] = ocurrenciasDe(evento("a", mx("2026-10-10T20:00"), null));
    expect(o.fin).toBeNull();
    expect(o.ocurrencia?.dia).toBe("2026-10-10");
  });
  it("una noche que cruza la medianoche es una noche, no dos días", () => {
    const lista = ocurrenciasDe(evento("a", mx("2026-10-10T22:00"), mx("2026-10-11T01:00")));
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ inicio: mx("2026-10-10T22:00"), fin: mx("2026-10-11T01:00") });
    expect(lista[0].ocurrencia?.dia).toBe("2026-10-10");
  });
  it("el día es el de la zona del evento, no el del instante en UTC", () => {
    // 2026-10-11T02:00Z son las 20:00 del 10 en México: sigue siendo el día 10.
    expect(ocurrenciasDe(evento("a", "2026-10-11T02:00:00.000Z", null))[0].ocurrencia?.dia).toBe("2026-10-10");
    expect(ocurrenciasDe({ ...evento("a", "2026-10-11T02:00:00.000Z", null), zona: "Europe/Madrid" })[0].ocurrencia?.dia).toBe("2026-10-11");
  });
});

describe("ocurrenciasDe: varios días sin horario por día (el mismo horario cada día, OL-309)", () => {
  it("una por día entre el de inicio y el de fin, con la hora de inicio y la de fin de cada día", () => {
    const e = evento("a", mx("2026-10-09T20:00"), mx("2026-10-11T21:00"));
    const lista = ocurrenciasDe(e);
    expect(dias(lista)).toEqual(["2026-10-09", "2026-10-10", "2026-10-11"]);
    expect(lista.map((o) => [o.inicio, o.fin])).toEqual([
      [mx("2026-10-09T20:00"), mx("2026-10-09T21:00")],
      [mx("2026-10-10T20:00"), mx("2026-10-10T21:00")],
      [mx("2026-10-11T20:00"), mx("2026-10-11T21:00")],
    ]);
    expect(lista.map(textoParte)).toEqual(["Día 1 de 3", "Día 2 de 3", "Día 3 de 3"]);
    expect(lista.map(claveDe)).toEqual(["a:2026-10-09", "a:2026-10-10", "a:2026-10-11"]);
  });
  it("sin hora de fin puesta (acaba con su último día) cada día queda sin hora de fin y dura hasta que acaba", () => {
    const lista = ocurrenciasDe(evento("a", mx("2026-10-09T20:00"), mx("2026-10-11T23:59")));
    expect(lista.map((o) => o.fin)).toEqual([null, null, null]);
    expect(lista.map((o) => o.inicio)).toEqual([mx("2026-10-09T20:00"), mx("2026-10-10T20:00"), mx("2026-10-11T20:00")]);
  });
  it("un fin antes de la hora de inicio es un evento corrido, no un horario de cada día: se queda entero", () => {
    const e = evento("a", mx("2026-10-09T18:00"), mx("2026-10-11T11:00"));
    const lista = ocurrenciasDe(e);
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ inicio: e.inicio, fin: e.fin });
    expect(lista[0].ocurrencia?.parte).toBeNull();
  });
  it("de más de 31 días (una exposición de temporada) no se reparte", () => {
    const lista = ocurrenciasDe(evento("a", mx("2026-10-01T10:00"), mx("2026-12-15T23:59")));
    expect(lista).toHaveLength(1);
    expect(lista[0].ocurrencia?.parte).toBeNull();
    expect(ocurrenciasDe(evento("b", mx("2026-10-01T10:00"), mx("2026-10-31T23:59")))).toHaveLength(31);
    expect(ocurrenciasDe(evento("c", mx("2026-10-01T10:00"), mx("2026-11-01T23:59")))).toHaveLength(1);
  });
  it("las horas de cada día siguen a la zona cuando cambia el horario (Madrid, fin del horario de verano)", () => {
    const e = { id: "a", titulo: "a", zona: "Europe/Madrid", inicio: "2026-10-24T18:00:00.000Z", fin: "2026-10-26T20:00:00.000Z" }; // 20:00 a 21:00 de Madrid
    expect(ocurrenciasDe(e).map((o) => o.inicio)).toEqual(["2026-10-24T18:00:00.000Z", "2026-10-25T19:00:00.000Z", "2026-10-26T19:00:00.000Z"]);
  });
});

describe("ocurrenciasDe: con horario por día (sesiones)", () => {
  const sesiones = [
    { inicio: mx("2026-10-17T17:00"), fin: mx("2026-10-17T19:00") },
    { inicio: mx("2026-10-03T16:00"), fin: mx("2026-10-03T18:00") },
    { inicio: mx("2026-10-10T17:00"), fin: null },
  ];
  const taller = evento("taller", mx("2026-10-03T16:00"), mx("2026-10-17T19:00"), { sesiones, precio: "$300" });

  it("una por sesión, en orden, con la hora de ese día y los demás datos del evento", () => {
    const lista = ocurrenciasDe(taller);
    expect(dias(lista)).toEqual(["2026-10-03", "2026-10-10", "2026-10-17"]);
    expect(lista.map((o) => [o.inicio, o.fin])).toEqual([
      [mx("2026-10-03T16:00"), mx("2026-10-03T18:00")],
      [mx("2026-10-10T17:00"), null],
      [mx("2026-10-17T17:00"), mx("2026-10-17T19:00")],
    ]);
    expect(lista.map(textoParte)).toEqual(["Día 1 de 3", "Día 2 de 3", "Día 3 de 3"]);
    expect(lista.every((o) => o.id === "taller" && o.precio === "$300" && !("sesiones" in o))).toBe(true);
  });
  it("los días de en medio, sin sesión, no son una ocurrencia", () => {
    expect(dias(ocurrenciasDe(taller))).not.toContain("2026-10-05");
  });
  it("el día de cada sesión es el de la zona del evento", () => {
    const e = evento("noche", mx("2026-10-09T22:00"), mx("2026-10-10T22:00"), { sesiones: [{ inicio: mx("2026-10-09T22:00"), fin: null }, { inicio: mx("2026-10-10T22:00"), fin: null }] });
    expect(dias(ocurrenciasDe(e))).toEqual(["2026-10-09", "2026-10-10"]);
  });
});

describe("ocurrenciasVigentes: lo que pasó ya no sale", () => {
  const sesiones = [
    { inicio: mx("2026-10-03T16:00"), fin: mx("2026-10-03T18:00") },
    { inicio: mx("2026-10-10T17:00"), fin: mx("2026-10-10T19:00") },
    { inicio: mx("2026-10-17T17:00"), fin: null },
  ];
  const taller = evento("taller", sesiones[0].inicio, mx("2026-10-17T23:59"), { sesiones });

  it("el día que ya pasó no sale, pero los demás conservan su «Día n de N»", () => {
    const lista = ocurrenciasVigentes(taller, new Date(mx("2026-10-04T09:00")));
    expect(dias(lista)).toEqual(["2026-10-10", "2026-10-17"]);
    expect(lista.map(textoParte)).toEqual(["Día 2 de 3", "Día 3 de 3"]);
  });
  it("una sesión de hoy sigue hasta que termina", () => {
    expect(dias(ocurrenciasVigentes(taller, new Date(mx("2026-10-10T18:59"))))).toEqual(["2026-10-10", "2026-10-17"]);
    expect(dias(ocurrenciasVigentes(taller, new Date(mx("2026-10-10T19:01"))))).toEqual(["2026-10-17"]);
  });
  it("una sesión sin hora de fin se ve 3 h desde que empieza (OL-358)", () => {
    expect(dias(ocurrenciasVigentes(taller, new Date(mx("2026-10-17T19:59"))))).toEqual(["2026-10-17"]);
    expect(dias(ocurrenciasVigentes(taller, new Date(mx("2026-10-17T20:00"))))).toEqual(["2026-10-17"]);
    expect(ocurrenciasVigentes(taller, new Date(mx("2026-10-17T20:01")))).toEqual([]);
    expect(ocurrenciaPaso({ inicio: mx("2026-10-17T10:00"), fin: null, zona: MX }, new Date(mx("2026-10-17T12:59")))).toBe(false);
    expect(ocurrenciaPaso({ inicio: mx("2026-10-17T10:00"), fin: null, zona: MX }, new Date(mx("2026-10-17T13:01")))).toBe(true);
  });
  it("varios días sin horario por día: ayer ya no sale, hoy sí", () => {
    const e = evento("a", mx("2026-10-09T20:00"), mx("2026-10-11T21:00"));
    expect(dias(ocurrenciasVigentes(e, new Date(mx("2026-10-10T12:00"))))).toEqual(["2026-10-10", "2026-10-11"]);
  });
  it("un evento de un solo día no se filtra aquí: que pasó lo decide la base con `termina`", () => {
    expect(ocurrenciasVigentes(evento("a", mx("2026-10-01T20:00"), null), new Date(mx("2026-10-20T12:00")))).toHaveLength(1);
  });
  it("de una lista, todos los días vigentes de todos los eventos", () => {
    const solo = evento("solo", mx("2026-10-12T20:00"), null);
    expect(ocurrenciasDeLista([taller, solo], new Date(mx("2026-10-11T09:00"))).map((o) => o.ocurrencia?.clave)).toEqual(["taller:2026-10-17", "solo:2026-10-12"]);
  });
});

describe("proximaOcurrencia: el evento visto en su próximo día", () => {
  const sesiones = [
    { inicio: mx("2026-10-03T16:00"), fin: mx("2026-10-03T18:00") },
    { inicio: mx("2026-10-10T17:00"), fin: mx("2026-10-10T19:00") },
  ];
  const taller = evento("taller", sesiones[0].inicio, sesiones[1].fin, { sesiones });
  it("el primer día si todavía no empieza; el de hoy si sigue; el que sigue si el de hoy ya pasó", () => {
    expect(proximaOcurrencia(taller, new Date(mx("2026-10-01T12:00"))).inicio).toBe(sesiones[0].inicio);
    expect(proximaOcurrencia(taller, new Date(mx("2026-10-03T17:00"))).inicio).toBe(sesiones[0].inicio);
    expect(proximaOcurrencia(taller, new Date(mx("2026-10-03T18:30"))).inicio).toBe(sesiones[1].inicio);
  });
  it("sin ningún día vigente, el evento tal cual", () => {
    const o = proximaOcurrencia(taller, new Date(mx("2026-11-01T12:00")));
    expect(o.id).toBe("taller");
    expect(o.inicio).toBe(taller.inicio);
  });
  it("un evento de un solo día es él mismo", () => {
    const e = evento("a", mx("2026-10-10T20:00"), null);
    expect(proximaOcurrencia(e, new Date(mx("2026-10-09T12:00"))).inicio).toBe(e.inicio);
  });
});

describe("claveDe y textoParte", () => {
  it("sin ocurrencia, la llave es el id y no hay «Día n de N»", () => {
    expect(claveDe({ id: "a" })).toBe("a");
    expect(textoParte({})).toBeNull();
  });
});
