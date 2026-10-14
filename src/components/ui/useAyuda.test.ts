import { describe, expect, it } from "vitest";
import { claveDe, dentroDelPanel } from "./useAyuda";

/** Un nodo de mentira con `closest` y `getAttribute`, para probar la lógica de resolver claves sin navegador. */
type Falso = { atributos: Record<string, string>; padre?: Falso; closest: (selector: string) => Falso | null; getAttribute: (nombre: string) => string | null };
function nodo(atributos: Record<string, string> = {}, padre?: Falso): Falso {
  const n: Falso = {
    atributos,
    padre,
    closest(selector) {
      const nombre = /^\[([a-z-]+)\]$/.exec(selector)?.[1] as string;
      for (let x: Falso | undefined = n; x; x = x.padre) if (nombre in x.atributos) return x;
      return null;
    },
    getAttribute: (nombre) => atributos[nombre] ?? null,
  };
  return n;
}

describe("claveDe", () => {
  it("devuelve la clave del propio control", () => {
    expect(claveDe(nodo({ "data-ayuda": "red" }) as unknown as EventTarget)).toBe("red");
  });
  it("sube al ancestro más cercano que la lleve", () => {
    const tarjeta = nodo({ "data-ayuda": "tarjeta" });
    const linea = nodo({ "data-ayuda": "lineas" }, tarjeta);
    const texto = nodo({}, linea);
    const cerrar = nodo({}, tarjeta);
    expect(claveDe(texto as unknown as EventTarget)).toBe("lineas");
    expect(claveDe(cerrar as unknown as EventTarget)).toBe("tarjeta");
  });
  it("un control sin clave no hace nada", () => {
    expect(claveDe(nodo({}, nodo({})) as unknown as EventTarget)).toBeNull();
    expect(claveDe(nodo({ "data-ayuda": "" }) as unknown as EventTarget)).toBeNull();
  });
  it("tolera un blanco que no es un elemento (la ventana, un nodo de texto, null)", () => {
    expect(claveDe(null)).toBeNull();
    expect(claveDe({} as EventTarget)).toBeNull();
  });
});

describe("dentroDelPanel", () => {
  it("reconoce lo que está dentro del panel y lo demás no", () => {
    const panel = nodo({ "data-ayuda-panel": "" });
    expect(dentroDelPanel(nodo({}, panel) as unknown as EventTarget)).toBe(true);
    expect(dentroDelPanel(nodo({ "data-ayuda": "red" }) as unknown as EventTarget)).toBe(false);
    expect(dentroDelPanel(null)).toBe(false);
  });
});
