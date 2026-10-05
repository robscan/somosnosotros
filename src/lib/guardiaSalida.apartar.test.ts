import { afterEach, describe, expect, it } from "vitest";
import { apartarGuardia, pedirSalida, ponerGuardia, quitarGuardia, reponerGuardia } from "./guardiaSalida";

// OL-296 (bitácora 324): al tocar «Publicar» la guardia se aparta; si el servidor no publicó, vuelve.
describe("guardia de salida: apartar al publicar y reponer si falla", () => {
  afterEach(() => quitarGuardia());
  it("apartada, Atrás se va solo (publicar salió bien o sigue en camino)", () => {
    ponerGuardia(() => {});
    apartarGuardia();
    expect(pedirSalida(() => {})).toBe(false);
  });
  it("si el servidor no publicó, `reponerGuardia` devuelve la misma guardia", () => {
    let continuar: (() => void) | null = null;
    let fue = 0;
    ponerGuardia((c) => (continuar = c));
    apartarGuardia();
    reponerGuardia();
    expect(pedirSalida(() => fue++)).toBe(true);
    expect(fue).toBe(0);
    continuar!();
    expect(fue).toBe(1);
  });
  it("apartar sin guardia (la edición no la tiene) y reponer no inventan una", () => {
    apartarGuardia();
    reponerGuardia();
    expect(pedirSalida(() => {})).toBe(false);
  });
  it("una guardia nueva descarta la que estaba apartada", () => {
    const nueva = () => {};
    ponerGuardia(() => {});
    apartarGuardia();
    ponerGuardia(nueva);
    reponerGuardia();
    quitarGuardia(nueva);
    expect(pedirSalida(() => {})).toBe(false);
  });
  it("reponer una sola vez: tras «Salir y borrar» (quitarla) otro `reponerGuardia` no la devuelve", () => {
    ponerGuardia(() => {});
    apartarGuardia();
    reponerGuardia();
    quitarGuardia();
    reponerGuardia();
    expect(pedirSalida(() => {})).toBe(false);
  });
  it("una guardia apartada de una pantalla ya desmontada no pasa a la siguiente", () => {
    const vieja = () => {};
    ponerGuardia(vieja);
    apartarGuardia();
    quitarGuardia(vieja);
    expect(pedirSalida(() => {})).toBe(false);
    ponerGuardia(() => {});
    quitarGuardia();
    reponerGuardia();
    expect(pedirSalida(() => {})).toBe(false);
  });
});
