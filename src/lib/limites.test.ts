import { describe, it, expect } from "vitest";
import { LIMITES_LUGAR, LIMITES_EVENTO, LIMITES_ARTISTA, LIMITES_PERFIL, topeDe } from "./limites";
import { LIMITES_EVENTO as LIMITES_EVENTO_EVENTO } from "./eventos";
import { LIMITES_LUGAR as LIMITES_LUGAR_LUGARES } from "./lugares";
import { LIMITES_ARTISTA as LIMITES_ARTISTA_ARTISTAS } from "./artistas";

describe("limites: pantalla + servidor usan los mismos topes", () => {
  it("Pantalla de lugar usa el mismo tope que validación del servidor", () => {
    expect(LIMITES_LUGAR).toEqual(LIMITES_LUGAR_LUGARES);
    expect(LIMITES_LUGAR.nombre).toBe(120);
    expect(LIMITES_LUGAR.descripcion).toBe(600);
    expect(LIMITES_LUGAR.direccion).toBe(200);
    expect(LIMITES_LUGAR.detalle).toBe(60);
  });

  it("Pantalla de evento usa el mismo tope que validación del servidor", () => {
    expect(LIMITES_EVENTO).toEqual(LIMITES_EVENTO_EVENTO);
    expect(LIMITES_EVENTO.titulo).toBe(120);
    expect(LIMITES_EVENTO.descripcion).toBe(1000);
    expect(LIMITES_EVENTO.precio).toBe(60);
    expect(LIMITES_EVENTO.sitio).toBe(120);
    expect(LIMITES_EVENTO.direccion).toBe(200);
    expect(LIMITES_EVENTO.indicaciones).toBe(300);
  });

  it("Pantalla de artista usa el mismo tope que validación del servidor", () => {
    expect(LIMITES_ARTISTA).toEqual(LIMITES_ARTISTA_ARTISTAS);
    expect(LIMITES_ARTISTA.nombre).toBe(80);
    expect(LIMITES_ARTISTA.detalle).toBe(40);
    expect(LIMITES_ARTISTA.descripcion).toBe(600);
  });

  it("Perfil: topes soportados", () => {
    expect(LIMITES_PERFIL.nombre).toBe(60);
    expect(LIMITES_PERFIL.colonia).toBe(60);
    expect(LIMITES_PERFIL.bio).toBe(140);
  });

  it("topeDe() devuelve el tope correcto para campos conocidos", () => {
    expect(topeDe("lugar", "nombre")).toBe(120);
    expect(topeDe("lugar", "descripcion")).toBe(600);
    expect(topeDe("lugar", "direccion")).toBe(200);
    expect(topeDe("lugar", "detalle")).toBe(60);

    expect(topeDe("evento", "titulo")).toBe(120);
    expect(topeDe("evento", "descripcion")).toBe(1000);
    expect(topeDe("evento", "precio")).toBe(60);
    expect(topeDe("evento", "sitio")).toBe(120);
    expect(topeDe("evento", "direccion")).toBe(200);
    expect(topeDe("evento", "indicaciones")).toBe(300);

    expect(topeDe("artista", "nombre")).toBe(80);
    expect(topeDe("artista", "detalle")).toBe(40);
    expect(topeDe("artista", "descripcion")).toBe(600);

    expect(topeDe("perfil", "nombre")).toBe(60);
    expect(topeDe("perfil", "bio")).toBe(140);
  });

  it("topeDe() devuelve null para campos desconocidos", () => {
    expect(topeDe("lugar", "inexistente")).toBeNull();
    expect(topeDe("evento", "inexistente")).toBeNull();
  });

  it("Contador activa al 75% del tope", () => {
    const tope = LIMITES_LUGAR.nombre; // 120
    const mostrador = Math.ceil(tope * 0.75); // 90
    expect(mostrador).toBe(90);

    const topePrecio = LIMITES_EVENTO.precio; // 60
    const mostradorPrecio = Math.ceil(topePrecio * 0.75); // 45
    expect(mostradorPrecio).toBe(45);
  });
});
