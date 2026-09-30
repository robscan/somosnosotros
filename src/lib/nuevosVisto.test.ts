import { describe, expect, it } from "vitest";
import { corteNuevos } from "./agenda";
import { marcarNuevosVisto, marcaNuevosVisto, type Almacen } from "./nuevosVisto";

const CLAVE = "somosnosotros:nuevos-visto:san-luis-potosi";
const publicado = (creado_en: string) => ({ creado_en });

/** El almacén del teléfono, de mentira. `roto` imita el modo privado, donde leer o escribir lanza. */
function almacen(datos: Record<string, string> = {}, roto = false): Almacen & { datos: Record<string, string> } {
  return {
    datos,
    getItem: (k) => {
      if (roto) throw new Error("modo privado");
      return datos[k] ?? null;
    },
    setItem: (k, v) => {
      if (roto) throw new Error("modo privado");
      datos[k] = v;
    },
  };
}

describe("la marca de Nuevos en el teléfono (docs/rediseno/23)", () => {
  it("sin marca no hay nada guardado, y el corte es el tope de 7 días", () => {
    const a = almacen();
    expect(marcaNuevosVisto("san-luis-potosi", a)).toBeNull();
    expect(corteNuevos(marcaNuevosVisto("san-luis-potosi", a), new Date("2026-09-17T18:00:00Z"))).toBe(new Date("2026-09-10T18:00:00Z").getTime());
  });

  it("marca un instante después de la publicación más reciente que se enseñó, no la hora del toque", () => {
    const a = almacen();
    marcarNuevosVisto("san-luis-potosi", [publicado("2026-09-16T10:00:00Z"), publicado("2026-09-17T17:00:00Z"), publicado("2026-09-15T08:00:00Z")], a);
    expect(a.datos[CLAVE]).toBe("2026-09-17T17:00:00.001Z");
    // Con esa marca, lo que ya se vio no vuelve a ser nuevo (el corte se compara con «desde»), y lo que se publique después sí.
    const corte = corteNuevos(marcaNuevosVisto("san-luis-potosi", a), new Date("2026-09-17T18:00:00Z"));
    expect(new Date("2026-09-17T17:00:00Z").getTime() >= corte).toBe(false);
    expect(new Date("2026-09-17T17:00:00.002Z").getTime() >= corte).toBe(true);
  });

  it("una ciudad no marca como vistos los eventos de otra", () => {
    const a = almacen();
    marcarNuevosVisto("san-luis-potosi", [publicado("2026-09-17T17:00:00Z")], a);
    expect(marcaNuevosVisto("queretaro", a)).toBeNull();
  });

  it("una lista vieja (otra pestaña del navegador) no hace retroceder una marca más nueva", () => {
    const a = almacen();
    marcarNuevosVisto("san-luis-potosi", [publicado("2026-09-17T17:00:00Z")], a);
    marcarNuevosVisto("san-luis-potosi", [publicado("2026-09-16T10:00:00Z")], a);
    expect(a.datos[CLAVE]).toBe("2026-09-17T17:00:00.001Z");
    marcarNuevosVisto("san-luis-potosi", [publicado("2026-09-18T09:00:00Z")], a);
    expect(a.datos[CLAVE]).toBe("2026-09-18T09:00:00.001Z");
  });

  it("sin eventos o con una fecha ilegible no marca nada", () => {
    const a = almacen();
    marcarNuevosVisto("san-luis-potosi", [], a);
    marcarNuevosVisto("san-luis-potosi", [publicado("no es una fecha")], a);
    expect(a.datos[CLAVE]).toBeUndefined();
  });

  it("una marca estropeada se reemplaza en vez de impedir marcar", () => {
    const a = almacen({ [CLAVE]: "basura" });
    marcarNuevosVisto("san-luis-potosi", [publicado("2026-09-17T17:00:00Z")], a);
    expect(a.datos[CLAVE]).toBe("2026-09-17T17:00:00.001Z");
  });

  it("sin poder leer ni escribir (modo privado, o sin almacén) no pasa nada: sin marca, vale el tope", () => {
    const roto = almacen({}, true);
    expect(() => marcarNuevosVisto("san-luis-potosi", [publicado("2026-09-17T17:00:00Z")], roto)).not.toThrow();
    expect(marcaNuevosVisto("san-luis-potosi", roto)).toBeNull();
    expect(marcaNuevosVisto("san-luis-potosi", null)).toBeNull();
    expect(() => marcarNuevosVisto("san-luis-potosi", [publicado("2026-09-17T17:00:00Z")], null)).not.toThrow();
  });
});
