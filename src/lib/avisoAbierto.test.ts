import { describe, expect, it } from "vitest";
import { esTipoAvisoAbierto, leerAvisoAbierto, TIPOS_AVISO_ABIERTO } from "./avisoAbierto";
import { EVENTOS, validarMedicion } from "./medir";

describe("leerAvisoAbierto (OL-480)", () => {
  it("de un aviso: el tipo y la misma dirección sin `desde` ni `tipo` (el resto de la consulta y el # intactos)", () => {
    expect(leerAvisoAbierto("https://somosnosotros.org/eventos/noche?desde=aviso&tipo=nuevo")).toEqual({ tipo: "nuevo", limpia: "/eventos/noche" });
    expect(leerAvisoAbierto("/eventos/noche?ciudad=queretaro&desde=aviso&tipo=cambio#mapa")).toEqual({ tipo: "cambio", limpia: "/eventos/noche?ciudad=queretaro#mapa" });
  });
  it("sin `desde=aviso` no hay nada que contar ni que quitar (un `tipo` de otra pantalla se queda)", () => {
    expect(leerAvisoAbierto("/agenda?tipo=nuevo")).toEqual({ tipo: null, limpia: null });
    expect(leerAvisoAbierto("/")).toEqual({ tipo: null, limpia: null });
  });
  it("un tipo fuera de la lista no se cuenta, pero la dirección igual se limpia", () => {
    expect(leerAvisoAbierto("/?desde=aviso&tipo=fulano")).toEqual({ tipo: null, limpia: "/" });
    expect(leerAvisoAbierto("/?desde=aviso")).toEqual({ tipo: null, limpia: "/" });
  });
  it("la lista cerrada es la misma en la medición (`aviso_abierto`) y ningún dato identifica a nadie", () => {
    expect(EVENTOS.aviso_abierto.tipo).toEqual(TIPOS_AVISO_ABIERTO);
    expect(validarMedicion("aviso_abierto", { tipo: "recordatorio" })).toEqual({ tipo: "recordatorio" });
    expect(validarMedicion("aviso_abierto", { tipo: "recordatorio", evento: "x" })).toBeNull();
    expect(validarMedicion("aviso_abierto", { tipo: "otra" })).toBeNull();
    expect(esTipoAvisoAbierto("cancelado")).toBe(true);
    expect(esTipoAvisoAbierto(3)).toBe(false);
  });
});
