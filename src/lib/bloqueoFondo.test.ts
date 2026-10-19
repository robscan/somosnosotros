import { describe, expect, it } from "vitest";
import { crearBloqueoFondo } from "./bloqueoFondo";

/** Un body de mentira: sus hijos con su `inert`, si la página está bloqueada y quién vigila los cambios. */
function cuerpo(...iniciales: [string, boolean][]) {
  const hijos = iniciales.map(([nombre, inert]) => ({ nombre, inert }));
  const estado = { bloqueado: false, vigilando: false };
  let avisar: (() => void) | null = null;
  const pila = crearBloqueoFondo({
    hijos: () => hijos,
    bloquear: (si) => (estado.bloqueado = si),
    vigilar: (alCambiar) => {
      estado.vigilando = true;
      avisar = alCambiar;
      return () => {
        estado.vigilando = false;
        avisar = null;
      };
    },
  });
  const poner = (nombre: string) => {
    const e = { nombre, inert: false };
    hijos.push(e);
    avisar?.();
    return e;
  };
  const quitar = (e: { nombre: string }) => {
    hijos.splice(hijos.indexOf(e as (typeof hijos)[number]), 1);
    avisar?.();
  };
  const inertes = () => hijos.filter((e) => e.inert).map((e) => e.nombre);
  return { hijos, estado, pila, poner, quitar, inertes };
}

describe("la pila del fondo de las capas (OL-419)", () => {
  it("con una capa, todo lo demás queda inerte y la página quieta; al cerrarla, todo vuelve", () => {
    const b = cuerpo(["raiz", false]);
    const hoja = b.poner("hoja");
    b.pila.abrir("hoja", hoja);
    expect(b.inertes()).toEqual(["raiz"]);
    expect(b.estado).toEqual({ bloqueado: true, vigilando: true });
    b.pila.cerrar("hoja");
    b.quitar(hoja);
    expect(b.inertes()).toEqual([]);
    expect(b.estado).toEqual({ bloqueado: false, vigilando: false });
  });

  it("mapa y luego hoja: cerrar el mapa primero y después la hoja deja el fondo libre", () => {
    const b = cuerpo(["raiz", false]);
    const mapa = b.poner("mapa");
    b.pila.abrir("mapa", mapa);
    const hoja = b.poner("hoja");
    b.pila.abrir("hoja", hoja);
    expect(b.inertes()).toEqual(["raiz", "mapa"]);
    // Se cierra el de abajo: la hoja sigue siendo la única interactiva.
    b.pila.cerrar("mapa");
    b.quitar(mapa);
    expect(b.inertes()).toEqual(["raiz"]);
    expect(b.estado.bloqueado).toBe(true);
    b.pila.cerrar("hoja");
    b.quitar(hoja);
    expect(b.inertes()).toEqual([]);
    expect(b.estado.bloqueado).toBe(false);
  });

  it("mapa y luego hoja: cerrar la hoja primero devuelve el mapa interactivo; al cerrarlo, el fondo queda libre", () => {
    const b = cuerpo(["raiz", false]);
    const mapa = b.poner("mapa");
    b.pila.abrir("mapa", mapa);
    const hoja = b.poner("hoja");
    b.pila.abrir("hoja", hoja);
    b.pila.cerrar("hoja");
    b.quitar(hoja);
    expect(b.inertes()).toEqual(["raiz"]);
    expect(b.pila.esSuperior("mapa")).toBe(true);
    b.pila.cerrar("mapa");
    b.quitar(mapa);
    expect(b.inertes()).toEqual([]);
    expect(b.estado.bloqueado).toBe(false);
  });

  it("el elemento puede salir del body antes o después de darse de baja: nada se queda inerte", () => {
    const b = cuerpo(["raiz", false]);
    const mapa = b.poner("mapa");
    b.pila.abrir("mapa", mapa);
    const hoja = b.poner("hoja");
    b.pila.abrir("hoja", hoja);
    // El portal se va del body antes de que su efecto lo dé de baja (React quita el DOM y después limpia).
    b.quitar(hoja);
    b.quitar(mapa);
    b.pila.cerrar("mapa");
    b.pila.cerrar("hoja");
    expect(b.inertes()).toEqual([]);
    expect([hoja.inert, mapa.inert]).toEqual([false, false]);
  });

  it("un inert ajeno se conserva y lo que llega al body con una capa abierta queda inerte hasta cerrarla", () => {
    const b = cuerpo(["raiz", false], ["ajeno", true]);
    const hoja = b.poner("hoja");
    b.pila.abrir("hoja", hoja);
    const tardio = b.poner("tardio");
    expect(b.inertes()).toEqual(["raiz", "ajeno", "tardio"]);
    b.pila.cerrar("hoja");
    expect(b.inertes()).toEqual(["ajeno"]);
    expect(tardio.inert).toBe(false);
  });

  it("solo la de arriba es superior; registrar dos veces el mismo dueño no duplica y cerrar uno desconocido no rompe nada", () => {
    const b = cuerpo(["raiz", false]);
    const a = b.poner("a");
    const c = b.poner("c");
    b.pila.abrir("a", a);
    b.pila.abrir("c", c);
    b.pila.abrir("a", a);
    expect(b.pila.abiertas()).toBe(2);
    expect(b.pila.esSuperior("a")).toBe(true);
    expect(b.inertes()).toEqual(["raiz", "c"]);
    b.pila.cerrar("nadie");
    expect(b.pila.abiertas()).toBe(2);
    b.pila.cerrar("a");
    b.pila.cerrar("c");
    expect(b.inertes()).toEqual([]);
    expect(b.estado).toEqual({ bloqueado: false, vigilando: false });
  });
});
