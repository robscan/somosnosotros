import { afterEach, describe, expect, it } from "vitest";
import { DIAS_NUEVOS } from "./agenda";
import { huboVisitaANuevos, leerCorteNuevos, marcarNuevosVisto } from "./nuevosVisto";

const AHORA = new Date("2026-09-17T18:00:00Z");
const TOPE = AHORA.getTime() - DIAS_NUEVOS * 86400000;
const CLAVE = "somosnosotros:nuevos-visto";

/** El almacén del teléfono, de mentira. `roto` imita el modo privado, donde leer o escribir lanza. */
function almacen(datos: Record<string, string> = {}, roto = false) {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => {
        if (roto) throw new Error("modo privado");
        return datos[k] ?? null;
      },
      setItem: (k: string, v: string) => {
        if (roto) throw new Error("modo privado");
        datos[k] = v;
      },
    },
  });
  return datos;
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "localStorage");
});

describe("la marca de Nuevos en el teléfono", () => {
  it("mirar una ciudad no marca como vistos los eventos de otra", () => {
    almacen();
    marcarNuevosVisto(AHORA, "san-luis-potosi");
    expect(leerCorteNuevos(AHORA, "san-luis-potosi")).toBe(AHORA.getTime());
    expect(leerCorteNuevos(AHORA, "madrid")).toBe(TOPE);
    expect(huboVisitaANuevos("madrid")).toBe(false);
  });

  it("una lista antigua en otra pestaña no retrocede una marca válida", () => {
    const datos = almacen();
    marcarNuevosVisto(AHORA);
    marcarNuevosVisto(new Date("2026-09-16T18:00:00Z"));
    expect(datos[CLAVE]).toBe(AHORA.toISOString());
  });

  it("un sello inválido no marca nada como visto", () => {
    const datos = almacen();
    marcarNuevosVisto(new Date("invalid"));
    expect(datos[CLAVE]).toBeUndefined();
  });
  it("sin marca, el corte es el tope de 7 días: la pestaña se comporta como antes", () => {
    almacen();
    expect(leerCorteNuevos(AHORA)).toBe(TOPE);
    expect(huboVisitaANuevos()).toBe(false);
  });

  it("con marca, el corte es la última visita", () => {
    almacen({ [CLAVE]: "2026-09-16T18:00:00Z" });
    expect(leerCorteNuevos(AHORA)).toBe(new Date("2026-09-16T18:00:00Z").getTime());
    expect(huboVisitaANuevos()).toBe(true);
  });

  it("con marca de hace un mes manda el tope, y con el reloj mal puesto también", () => {
    almacen({ [CLAVE]: "2026-08-17T18:00:00Z" });
    expect(leerCorteNuevos(AHORA)).toBe(TOPE);
    almacen({ [CLAVE]: "2027-01-01T00:00:00Z" });
    expect(leerCorteNuevos(AHORA)).toBe(TOPE);
  });

  it("con la marca ilegible, ni cuenta como visita ni rompe el corte", () => {
    almacen({ [CLAVE]: "ayer por la tarde" });
    expect(leerCorteNuevos(AHORA)).toBe(TOPE);
    expect(huboVisitaANuevos()).toBe(false);
  });

  it("en modo privado, donde el almacén lanza, sigue habiendo corte y no hay visita", () => {
    almacen({}, true);
    expect(leerCorteNuevos(AHORA)).toBe(TOPE);
    expect(huboVisitaANuevos()).toBe(false);
    expect(() => marcarNuevosVisto(AHORA)).not.toThrow();
  });

  it("sin almacén ninguno (servidor, o navegador que lo bloquea) tampoco falla", () => {
    expect(leerCorteNuevos(AHORA)).toBe(TOPE);
    expect(huboVisitaANuevos()).toBe(false);
    expect(() => marcarNuevosVisto(AHORA)).not.toThrow();
  });

  it("guarda el instante de la visita, para que la próxima vez sea el corte", () => {
    const datos = almacen();
    marcarNuevosVisto(AHORA);
    expect(datos[CLAVE]).toBe(AHORA.toISOString());
    expect(leerCorteNuevos(new Date("2026-09-18T18:00:00Z"))).toBe(AHORA.getTime());
  });

  /**
   * Hallazgo 1 de la revisión: se marca el sello de la lista que se enseñó, no el instante del toque. La lista no se
   * refresca mientras la pantalla vive, así que lo publicado entre que llegó y el toque **no se ha visto**; marcar el
   * toque lo daría por visto y no saldría en Nuevos ninguna vez.
   */
  it("marca el sello de la lista, no el del toque: lo publicado entretanto sigue siendo nuevo", () => {
    const datos = almacen();
    const llegoLaLista = new Date("2026-09-17T14:00:00Z");
    const seTocaLaPestana = new Date("2026-09-17T15:30:00Z");
    const publicadoEntretanto = new Date("2026-09-17T15:00:00Z");

    marcarNuevosVisto(llegoLaLista);
    expect(datos[CLAVE]).toBe(llegoLaLista.toISOString());

    // En la visita siguiente, el corte deja entrar lo que se publicó mientras la pantalla estaba abierta.
    const corte = leerCorteNuevos(new Date("2026-09-17T16:00:00Z"));
    expect(publicadoEntretanto.getTime()).toBeGreaterThanOrEqual(corte);
    // Con el instante del toque se habría perdido para siempre.
    expect(publicadoEntretanto.getTime()).toBeLessThan(seTocaLaPestana.getTime());
  });

  /**
   * La garantía de la que depende que la pantalla no pinte un "Ya estás al día" falso ni acorte la lista a destiempo:
   * el corte es SIEMPRE un número usable, pase lo que pase con el almacén. Nunca null, nunca NaN, nunca en el futuro.
   */
  it("el corte nunca es inválido ni posterior a ahora, con cualquier almacén", () => {
    const casos: (() => void)[] = [
      () => almacen(),
      () => almacen({ [CLAVE]: "2026-09-16T18:00:00Z" }),
      () => almacen({ [CLAVE]: "2026-08-01T00:00:00Z" }),
      () => almacen({ [CLAVE]: "2027-01-01T00:00:00Z" }),
      () => almacen({ [CLAVE]: "" }),
      () => almacen({ [CLAVE]: "no es fecha" }),
      () => almacen({}, true),
      () => Reflect.deleteProperty(globalThis, "localStorage"),
    ];
    for (const preparar of casos) {
      preparar();
      const corte = leerCorteNuevos(AHORA);
      expect(Number.isFinite(corte)).toBe(true);
      expect(corte).toBeLessThanOrEqual(AHORA.getTime());
      expect(corte).toBeGreaterThanOrEqual(TOPE);
    }
  });
});
