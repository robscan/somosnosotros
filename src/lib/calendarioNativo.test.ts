import { describe, expect, it, vi } from "vitest";
import { calendarioDelSistema } from "./calendarioNativo";

describe("calendarioDelSistema", () => {
  it("fuera de la app (sin Capacitor en window) no hay plugin: sigue el <a> normal", () => {
    expect(calendarioDelSistema({})).toBeNull();
  });

  it("dentro de la app, pero antes de que este plugin se registre, tampoco hay nada que llamar", () => {
    expect(calendarioDelSistema({ Capacitor: { Plugins: {} } })).toBeNull();
  });

  it("con el plugin registrado, es el mismo objeto (para llamar agregarEvento)", () => {
    const agregarEvento = vi.fn();
    const puente = { Capacitor: { Plugins: { Calendario: { agregarEvento } } } };
    expect(calendarioDelSistema(puente)).toBe(puente.Capacitor.Plugins.Calendario);
  });
});
