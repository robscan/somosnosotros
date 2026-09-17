import { describe, expect, it } from "vitest";
import { accionEvento, accionSeguir, alSoltar, decidirGesto, desplazamiento, recortar, textoHecho } from "./deslizar";

describe("deslizar", () => {
  it("un evento ofrece Me interesa; con interés, quitarlo; con Voy, solo dice Vas (cancelar vive en la ficha)", () => {
    expect(accionEvento(null)).toEqual({ clave: "me_interesa", etiqueta: "Me interesa", tono: "primario" });
    expect(accionEvento("me_interesa")).toMatchObject({ clave: "quitar_interes", etiqueta: "Ya no" });
    expect(accionEvento("voy")).toMatchObject({ clave: "vas", deshabilitada: true });
  });
  it("Seguir y Dejar de seguir", () => {
    expect(accionSeguir(false).clave).toBe("seguir");
    expect(accionSeguir(true)).toMatchObject({ clave: "dejar_de_seguir", etiqueta: "Dejar de seguir" });
  });
  it("solo de derecha a izquierda: espera un poco, suelta el scroll y lo que va a la derecha con el renglón cerrado", () => {
    expect(decidirGesto(3, 2, false)).toBe("esperar");
    expect(decidirGesto(-20, 4, false)).toBe("deslizar");
    expect(decidirGesto(4, 30, false)).toBe("soltar"); // scroll
    expect(decidirGesto(25, 3, false)).toBe("soltar"); // hacia la derecha, cerrado: no hay nada de ese lado
    expect(decidirGesto(25, 3, true)).toBe("deslizar"); // abierto: se cierra deslizando de vuelta
  });
  it("mientras se arrastra no pasa a la derecha y más allá de las acciones cuesta más", () => {
    expect(desplazamiento(0, 30, 100)).toBe(0);
    expect(desplazamiento(0, -60, 100)).toBe(-60);
    expect(desplazamiento(-100, 40, 100)).toBe(-60);
    const pasado = desplazamiento(0, -160, 100);
    expect(pasado).toBeLessThan(-100);
    expect(pasado).toBeGreaterThan(-160);
  });
  it("al soltar abre con el 40 % visible o con un tirón a la izquierda; un tirón a la derecha cierra", () => {
    expect(alSoltar(-45, 100, 0)).toBe("abrir");
    expect(alSoltar(-30, 100, 0)).toBe("cerrar");
    expect(alSoltar(-10, 100, -0.5)).toBe("abrir");
    expect(alSoltar(-90, 100, 0.5)).toBe("cerrar");
  });
  it("el aviso nombra lo que se hizo, con el nombre recortado", () => {
    expect(textoHecho("me_interesa", "Gala de arias de las óperas de Julián Carrillo")).toBe("Te interesa «Gala de arias de las óperas de Julián C…»");
    expect(textoHecho("quitar_interes", "Huapangueada sobre rieles")).toBe("Ya no te interesa «Huapangueada sobre rieles»");
    expect(textoHecho("seguir", "Teatro de la Paz", "lugar")).toBe("Sigues Teatro de la Paz");
    expect(textoHecho("dejar_de_seguir", "Abril Merlot", "artista")).toBe("Ya no sigues a Abril Merlot");
    expect(recortar("  dos   espacios  ")).toBe("dos espacios");
  });
});
