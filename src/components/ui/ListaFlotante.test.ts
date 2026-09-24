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

  describe("reservaAbajo (OL-182, bitácora 217: la lista nunca tapa la barra de acciones)", () => {
    it("sin reservaAbajo (por omisión, 0), se comporta exactamente como antes", () => {
      const campo = { left: 20, top: 100, bottom: 140, width: 300 };
      expect(calcularPosicion(campo, 800, 0, 800)).toEqual(calcularPosicion(campo, 800, 0, 800, 0));
    });

    it("con reservaAbajo, se achica pero sigue abriendo hacia abajo si aún cabe", () => {
      // Sin reserva, 300 px de sobra (pero el tope ya la deja en 260); con la barra "Agregar" (56 px + 8 de
      // respiro = 64) reservados, quedan 236 -sigue abriendo hacia abajo, y ahora sí se nota el achique.
      const campo = { left: 20, top: 150, bottom: 192, width: 350 };
      const sinReserva = calcularPosicion(campo, 500, 0, 800);
      expect(sinReserva.maxHeight).toBe(260);
      const conReserva = calcularPosicion(campo, 500, 0, 800, 64);
      expect(conReserva.top).toBe(196);
      expect(conReserva.bottom).toBeUndefined();
      expect(conReserva.maxHeight).toBe(236);
      expect(conReserva.maxHeight).toBeLessThan(sinReserva.maxHeight);
    });

    it("puede forzar la apertura hacia arriba cuando sin reservaAbajo habría abierto hacia abajo", () => {
      const campo = { left: 20, top: 160, bottom: 200, width: 350 };
      // Sin reserva: 500-200-8=292, abre abajo.
      const sinReserva = calcularPosicion(campo, 500, 0, 500);
      expect(sinReserva.top).toBeDefined();
      expect(sinReserva.bottom).toBeUndefined();
      // Con una barra que reserva 250 px: 292-250=42 (<120) y arriba hay 160-0-8=152 (>42): abre arriba, sin
      // pisar jamás la reserva.
      const conReserva = calcularPosicion(campo, 500, 0, 500, 250);
      expect(conReserva.top).toBeUndefined();
      expect(conReserva.bottom).toBeDefined();
      expect(conReserva.maxHeight).toBe(152);
    });

    it("la lista NUNCA se estira más allá de lo que deja la reserva (el defecto reportado por el founder)", () => {
      // Tres resultados largos necesitarían ~220 px; con la barra (64) sobre el teclado, solo hay 100 -la lista
      // se achica a eso, nunca "260 de sobra" tapando la barra.
      const p = calcularPosicion({ left: 20, top: 480, bottom: 520, width: 350 }, 844, 0, 844, 64);
      expect(p.maxHeight).toBeLessThanOrEqual(844 - 520 - 8 - 64);
    });
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
