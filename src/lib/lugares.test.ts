import { describe, expect, it } from "vitest";
import { calleCorta, conProximo, enlaceRed, filtrarLugares, normalizarNombre, ordenarLugares, validarLugar } from "./lugares";

describe("normalizarNombre", () => {
  it("quita acentos, mayúsculas y signos", () => {
    expect(normalizarNombre("  Casa de Cultura  #3 — Potosí ")).toBe("casa de cultura 3 potosi");
  });
});

describe("filtrarLugares", () => {
  const lugares = [
    { nombre: "Teatro de la Paz", direccion: "Villerías 2" },
    { nombre: "Galería Ángel", direccion: null },
  ];
  it("busca sin acentos y a medias", () => {
    expect(filtrarLugares(lugares, "angel").map((l) => l.nombre)).toEqual(["Galería Ángel"]);
    expect(filtrarLugares(lugares, "VILLER").map((l) => l.nombre)).toEqual(["Teatro de la Paz"]);
    expect(filtrarLugares(lugares, "")).toHaveLength(2);
  });
});

describe("enlaceRed", () => {
  it("arma enlaces desde usuario, @usuario, número o enlace completo", () => {
    expect(enlaceRed("instagram", "@casadelacultura")).toBe("https://instagram.com/casadelacultura");
    expect(enlaceRed("facebook", "https://facebook.com/x")).toBe("https://facebook.com/x");
    expect(enlaceRed("whatsapp", "444 123 4567")).toBe("https://wa.me/524441234567");
    expect(enlaceRed("whatsapp", "+52 444 123 4567")).toBe("https://wa.me/524441234567");
    expect(enlaceRed("sitio", "ejemplo.org")).toBe("https://ejemplo.org");
    expect(enlaceRed("youtube", "losvecinos")).toBe("https://youtube.com/@losvecinos");
    expect(enlaceRed("youtube", "@losvecinos")).toBe("https://youtube.com/@losvecinos");
    expect(enlaceRed("youtube", "https://youtube.com/watch?v=abc")).toBe("https://youtube.com/watch?v=abc");
    expect(enlaceRed("spotify", "https://open.spotify.com/artist/abc")).toBe("https://open.spotify.com/artist/abc");
    expect(enlaceRed("spotify", "Los Vecinos")).toBe("https://open.spotify.com/search/Los%20Vecinos");
    expect(enlaceRed("sitio", "")).toBeNull();
  });
});

describe("validarLugar", () => {
  const base = { nombre: "Foro X", tipo: "foro", direccion: "Calle 1", lat: "22.15", lng: "-100.97", descripcion: "", portada: "" };
  it("acepta un lugar mínimo y limpia", () => {
    const { datos, errores } = validarLugar({ ...base, instagram: " @forox " });
    expect(errores).toEqual({});
    expect(datos.lat).toBeCloseTo(22.15);
    expect(datos.redes).toEqual({ instagram: "@forox" });
    expect(datos.portada).toBeNull();
  });
  it("exige nombre, tipo válido y ubicación", () => {
    const { errores } = validarLugar({ ...base, nombre: "", tipo: "bar", lat: "0", lng: "0" });
    expect(errores.nombre).toBeTruthy();
    expect(errores.tipo).toBeTruthy();
    expect(errores.ubicacion).toBeTruthy();
  });
  it("revisa el WhatsApp", () => {
    expect(validarLugar({ ...base, whatsapp: "123" }).errores.whatsapp).toBeTruthy();
    expect(validarLugar({ ...base, whatsapp: "4441234567" }).errores.whatsapp).toBeUndefined();
  });
});

describe("calleCorta", () => {
  it("quita código postal, ciudad y estado", () => {
    expect(calleCorta("C. 5 de Mayo 1100, 78000 San Luis Potosí, S.L.P.")).toBe("C. 5 de Mayo 1100");
    expect(calleCorta("Av. Carranza 480, Centro, San Luis Potosí")).toBe("Av. Carranza 480");
    expect(calleCorta("Jardín de Tequis 3")).toBe("Jardín de Tequis 3");
    expect(calleCorta(null)).toBe("");
  });
});

describe("ordenarLugares", () => {
  const base = { tipo: "foro" as const, direccion: null, portada: null };
  const a = { ...base, id: "a", nombre: "Zeta", lat: 22.15, lng: -100.98, proximo: { id: "e1", inicio: "2026-09-20T01:00:00Z" } };
  const b = { ...base, id: "b", nombre: "Alfa", lat: 22.16, lng: -100.98, proximo: null };
  const c = { ...base, id: "c", nombre: "Beta", lat: 22.2, lng: -100.9, proximo: { id: "e2", inicio: "2026-09-15T01:00:00Z" } };
  it("sin ubicación: con eventos primero por fecha, luego alfabético", () => {
    expect(ordenarLugares([a, b, c], null).lista.map((l) => l.id)).toEqual(["c", "a", "b"]);
  });
  it("con ubicación: por distancia, con los km", () => {
    const { lista, km } = ordenarLugares([a, b, c], { lat: 22.16, lng: -100.98 });
    expect(lista.map((l) => l.id)).toEqual(["b", "a", "c"]);
    expect(km.get("b")).toBe(0);
    expect(km.get("c")!).toBeGreaterThan(5);
  });
});

describe("conProximo", () => {
  it("toma el primer evento de cada lugar y deja null a los demás", () => {
    const r = conProximo([{ id: "a" }, { id: "b" }], [
      { id: "e1", inicio: "2026-09-15T01:00:00Z", lugar_id: "a" },
      { id: "e2", inicio: "2026-09-16T01:00:00Z", lugar_id: "a" },
      { id: "e3", inicio: "2026-09-17T01:00:00Z", lugar_id: null },
    ]);
    expect(r[0].proximo).toEqual({ id: "e1", inicio: "2026-09-15T01:00:00Z" });
    expect(r[1].proximo).toBeNull();
  });
});
