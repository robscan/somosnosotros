import { describe, expect, it } from "vitest";
import { puntoDeTexto } from "./geo";

describe("puntoDeTexto: el punto que llega en la URL", () => {
  it("toma dos decimales dentro de la Tierra, con o sin signo", () => {
    expect(puntoDeTexto("22.151100", "-100.978600")).toEqual({ lat: 22.1511, lng: -100.9786 });
    expect(puntoDeTexto("-33", "151")).toEqual({ lat: -33, lng: 151 });
    expect(puntoDeTexto("90", "180")).toEqual({ lat: 90, lng: 180 });
    expect(puntoDeTexto("0", "0")).toEqual({ lat: 0, lng: 0 });
  });

  it("lo que falta, lo ilegible y lo que se sale de la Tierra se ignora", () => {
    for (const [lat, lng] of [
      [undefined, "-100.9"],
      ["22.1", undefined],
      ["", ""],
      ["abc", "-100.9"],
      ["22.1", "1e2"],
      ["0x10", "5"],
      ["22,1", "-100,9"],
      ["22.1 ", "-100.9"],
      ["Infinity", "5"],
      ["90.0001", "0"],
      ["0", "-180.5"],
      ["-91", "0"],
    ] as const) {
      expect(puntoDeTexto(lat, lng), `${lat} ${lng}`).toBeNull();
    }
  });
});
