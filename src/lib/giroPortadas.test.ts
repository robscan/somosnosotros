import { describe, expect, it, vi } from "vitest";
import { CLAVE_GIRO, destinoDeGiro, giroQuerido, guardarGiro, leerGiro, llego, RECORRIDO_GRADOS, suavizar, suscribirseGiro, traslaciones } from "./giroPortadas";
import { MAX_UNIDADES } from "./portadasSistema";

/** El giro de las portadas del sistema (OL-375, P8): la preferencia en el teléfono y las cuentas de la inclinación, como el prototipo firmado. */

function almacen(inicial: Record<string, string> = {}) {
  const datos = new Map(Object.entries(inicial));
  return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v), datos };
}
const roto = { getItem: () => { throw new Error("SecurityError"); }, setItem: () => { throw new Error("QuotaExceededError"); } };

describe("la preferencia, en el teléfono", () => {
  it("lee lo que la persona eligió; lo demás (nada, otro valor, sin almacén o un almacén que truena) es lo de fábrica", () => {
    expect(leerGiro(almacen({ [CLAVE_GIRO]: "encendido" }))).toBe("encendido");
    expect(leerGiro(almacen({ [CLAVE_GIRO]: "apagado" }))).toBe("apagado");
    expect(leerGiro(almacen({ [CLAVE_GIRO]: "1" }))).toBeNull();
    expect(leerGiro(almacen())).toBeNull();
    expect(leerGiro(null)).toBeNull();
    expect(leerGiro(roto)).toBeNull();
  });

  it("guarda, avisa a quien escucha y no truena si el teléfono no deja guardar", () => {
    const a = almacen();
    const escucha = vi.fn();
    const quitar = suscribirseGiro(escucha);
    guardarGiro(a, "apagado");
    expect(a.datos.get(CLAVE_GIRO)).toBe("apagado");
    expect(() => guardarGiro(roto, "encendido")).not.toThrow();
    expect(escucha).toHaveBeenCalledTimes(2);
    quitar();
    guardarGiro(a, "encendido");
    expect(escucha).toHaveBeenCalledTimes(2);
  });

  it("de fábrica: apagado en el iPhone (el permiso se pide con el toque del interruptor) y encendido en Android (no hay permiso)", () => {
    expect(giroQuerido(null, true)).toBe(false);
    expect(giroQuerido(null, false)).toBe(true);
    expect(giroQuerido("encendido", true)).toBe(true);
    expect(giroQuerido("apagado", false)).toBe(false);
  });
});

describe("la inclinación", () => {
  const base = { gamma: 3, beta: 40 };
  it("desde la postura en que se activó, ±25° llenan el recorrido de 4 unidades (la de atrás, la mitad)", () => {
    expect(RECORRIDO_GRADOS).toBe(25);
    expect(MAX_UNIDADES).toBe(4);
    // La comprobación del prototipo: 25° a la derecha y 12,5° hacia el frente dan 4 y 2 unidades.
    expect(destinoDeGiro(base, { gamma: 28, beta: 52.5 })).toEqual({ x: 4, y: 2 });
    expect(destinoDeGiro(base, base)).toEqual({ x: 0, y: 0 });
    expect(destinoDeGiro(base, { gamma: -22, beta: 40 })).toEqual({ x: -4, y: 0 });
  });
  it("más allá del recorrido, se queda en el tope", () => {
    expect(destinoDeGiro(base, { gamma: 90, beta: -60 })).toEqual({ x: 4, y: -4 });
  });
  it("se acerca un quinto por cuadro y se detiene a dos centésimas", () => {
    expect(suavizar(0, 4)).toBeCloseTo(0.8, 10);
    let actual = { x: 0, y: 0 };
    let cuadros = 0;
    while (!llego(actual, { x: 3.98, y: 1.99 })) {
      actual = { x: suavizar(actual.x, 3.98), y: suavizar(actual.y, 1.99) };
      cuadros++;
    }
    expect(cuadros).toBeLessThan(30);
  });
  it("las dos capas: adelante lo que va el giro y atrás la mitad, con dos decimales (`translate(3.98 1.99)`, como el prototipo)", () => {
    expect(traslaciones(3.98, 1.99)).toEqual({ atras: "translate(1.99 0.99)", delante: "translate(3.98 1.99)" });
    expect(traslaciones(-3, 0)).toEqual({ atras: "translate(-1.50 0.00)", delante: "translate(-3.00 0.00)" });
  });
});
