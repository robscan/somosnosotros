import { describe, expect, it } from "vitest";
import { calcularPosicion, tocoDentro } from "./ListaFlotante";

/** Un "Node" de mentira: solo lo que `tocoDentro` necesita (`contains`), sin levantar un DOM real. */
function contenedor(contiene: readonly unknown[]): Pick<Node, "contains"> {
  return { contains: (n) => contiene.includes(n) };
}

describe("calcularPosicion", () => {
  it("con espacio de sobra abajo, abre hacia abajo pegada al campo", () => {
    const p = calcularPosicion({ left: 20, top: 100, bottom: 140, width: 300 }, 800, 0, 800);
    expect(p.top).toBe(144);
    expect(p.bottom).toBeUndefined();
    expect(p.left).toBe(20);
    expect(p.width).toBe(300);
  });

  it("caso real reportado por el gestor: el campo baja 66 px (aparece 'Falta confirmar el pin.') y la lista lo sigue", () => {
    const antes = calcularPosicion({ left: 20, top: 578, bottom: 618, width: 350 }, 844, 0, 844);
    const despues = calcularPosicion({ left: 20, top: 644, bottom: 684, width: 350 }, 844, 0, 844);
    // La misma separación (4 px) en los dos casos: la lista se mueve junto con el campo, nunca se queda atrás.
    expect(antes.top).toBe(622);
    expect(despues.top).toBe(688);
    expect(despues.top! - antes.top!).toBe(66); // se mueve exactamente lo que se movió el campo
  });

  it("sin espacio abajo pero sí arriba (teclado abierto), abre hacia arriba", () => {
    const p = calcularPosicion({ left: 20, top: 380, bottom: 400, width: 300 }, 420, 0, 420);
    expect(p.top).toBeUndefined();
    expect(p.bottom).toBeDefined();
    expect(p.maxHeight).toBeGreaterThan(0);
  });

  it("el alto máximo nunca pasa de 260 ni baja de 100", () => {
    const muchoEspacio = calcularPosicion({ left: 0, top: 50, bottom: 90, width: 300 }, 2000, 0, 2000);
    expect(muchoEspacio.maxHeight).toBe(260);
    // Ventana muy chica (200 px), el campo a la mitad: ni arriba ni abajo caben más de ~82 px.
    const pocoEspacio = calcularPosicion({ left: 0, top: 90, bottom: 110, width: 300 }, 200, 0, 200);
    expect(pocoEspacio.maxHeight).toBe(100);
  });
});

describe("tocoDentro (OL-179, bitácora 214: un elemento en `dentro` no cuenta como \"fuera\")", () => {
  const objetivo = {} as Node;

  it("dentro de uno de los contenedores (p. ej. la barra de acciones pasada en `dentro`): true, no cierra", () => {
    const barra = contenedor([objetivo]);
    expect(tocoDentro(objetivo, [null, barra])).toBe(true);
  });

  it("fuera de todos los contenedores: false, sí cierra", () => {
    const lista = contenedor([]);
    const ancla = contenedor([]);
    const barra = contenedor([]);
    expect(tocoDentro(objetivo, [lista, ancla, barra])).toBe(false);
  });

  it("un contenedor null (sin ref todavía, p. ej. ancla.current) no rompe la comprobación", () => {
    expect(tocoDentro(objetivo, [null, undefined])).toBe(false);
  });

  it("sin ningún contenedor (dentro=[] por omisión): siempre fuera", () => {
    expect(tocoDentro(objetivo, [])).toBe(false);
  });
});
