import { describe, expect, it } from "vitest";
import { alternarCapa, aplicarLente, capasGuardables, capasVistas, estadoDeGuardado, estadoInicial, ponerCapa, quitarLente } from "./capas";

const conLugarPlegado = () => ponerCapa(estadoInicial(), "lugar", false);

describe("las capas y las lentes", () => {
  it("una lente que necesita una capa plegada la despliega, y lo único que se guarda sigue plegado", () => {
    const { estado, desplegadas } = aplicarLente(conLugarPlegado(), ["lugar", "artista"]);
    expect(desplegadas).toEqual(["lugar"]);
    expect(capasVistas(estado).lugar).toBe(true);
    expect(capasGuardables(estado).lugar).toBe(false);
  });
  it("al quitar la lente, la capa vuelve a estar plegada", () => {
    const { estado } = aplicarLente(conLugarPlegado(), ["lugar"]);
    expect(capasVistas(quitarLente(estado))).toEqual({ lugar: false, artista: true, persona: true });
  });
  it("una lente no toca las capas que ya estaban a la vista, y quitarla no las pliega", () => {
    const { estado, desplegadas } = aplicarLente(estadoInicial(), ["lugar", "artista"]);
    expect(desplegadas).toEqual([]);
    expect(capasVistas(quitarLente(estado))).toEqual({ lugar: true, artista: true, persona: true });
  });
  it("una capa que la persona dejó plegada y la lente no necesita sigue plegada", () => {
    const { estado } = aplicarLente(ponerCapa(conLugarPlegado(), "persona", false), ["lugar"]);
    expect(capasVistas(estado)).toEqual({ lugar: true, artista: true, persona: false });
    expect(capasVistas(quitarLente(estado))).toEqual({ lugar: false, artista: true, persona: false });
  });
  it("si la persona toca una píldora con la lente puesta, su elección se guarda y gana", () => {
    const { estado } = aplicarLente(conLugarPlegado(), ["lugar"]);
    // pliega la capa que la lente había desplegado: queda plegada y guardada
    const plegada = alternarCapa(estado, "lugar");
    expect(capasVistas(plegada).lugar).toBe(false);
    expect(capasGuardables(plegada).lugar).toBe(false);
    // la vuelve a desplegar: es ya suya y sobrevive a quitar la lente
    const suya = alternarCapa(plegada, "lugar");
    expect(capasGuardables(suya).lugar).toBe(true);
    expect(capasVistas(quitarLente(suya)).lugar).toBe(true);
  });
  it("otra capa tocada con la lente puesta se guarda y la de la lente se repliega igual", () => {
    const { estado } = aplicarLente(conLugarPlegado(), ["lugar"]);
    const otra = alternarCapa(estado, "persona");
    expect(capasGuardables(otra)).toEqual({ lugar: false, artista: true, persona: false });
    expect(capasVistas(quitarLente(otra))).toEqual({ lugar: false, artista: true, persona: false });
  });
  it("cambiar de una lente a otra: quitar la primera y aplicar la segunda no deja capas de más", () => {
    const una = aplicarLente(conLugarPlegado(), ["lugar"]).estado;
    const otra = aplicarLente(quitarLente(una), ["artista"]);
    expect(otra.desplegadas).toEqual([]);
    expect(capasVistas(otra.estado).lugar).toBe(false);
  });
  it("lo que se lee del aparato solo cuenta si es booleano", () => {
    expect(capasVistas(estadoDeGuardado({ capas: { lugar: false, artista: "no", persona: 0 } }))).toEqual({ lugar: false, artista: true, persona: true });
    expect(capasVistas(estadoDeGuardado(null))).toEqual({ lugar: true, artista: true, persona: true });
    expect(capasVistas(estadoDeGuardado("roto"))).toEqual({ lugar: true, artista: true, persona: true });
  });
});
