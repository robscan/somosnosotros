import { describe, expect, it } from "vitest";
import { calleCorta, conProximo, filtrarLugares, hrefLugar, normalizarNombre, ordenarLugares, tiposPresentes, validarLugar } from "./lugares";

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
  it("filtra por tipo y lista los tipos presentes en el orden cerrado", () => {
    const l = [
      { nombre: "Foro Uno", direccion: null, tipo: "foro" },
      { nombre: "Galería Dos", direccion: null, tipo: "galeria" },
      { nombre: "Foro Tres", direccion: "Calle 3", tipo: "foro" },
    ];
    expect(filtrarLugares(l, "", "foro").map((x) => x.nombre)).toEqual(["Foro Uno", "Foro Tres"]);
    expect(filtrarLugares(l, "tres", "foro").map((x) => x.nombre)).toEqual(["Foro Tres"]);
    expect(tiposPresentes(l).map((t) => t.valor)).toEqual(["foro", "galeria"]);
  });
});

describe("tiposPresentes", () => {
  it("cuenta cuántos lugares hay de cada tipo", () => {
    expect(tiposPresentes([{ tipo: "museo" }, { tipo: "foro" }, { tipo: "museo" }]).map((t) => `${t.valor}:${t.n}`)).toEqual(["museo:2", "foro:1"]);
  });
  it("Museo y Escuela entran en el orden de los chips con su etiqueta", () => {
    const l = [{ tipo: "escuela" }, { tipo: "foro" }, { tipo: "museo" }];
    expect(tiposPresentes(l).map((t) => t.etiqueta)).toEqual(["Museo", "Foro", "Escuela"]);
  });
});

describe("validarLugar", () => {
  const base = { nombre: "Foro X", tipo: "foro", direccion: "Calle 1", lat: "22.15", lng: "-100.97", descripcion: "", portada: "" };
  it("acepta un lugar mínimo y limpia", () => {
    const { datos, errores } = validarLugar({ ...base, enlaces: JSON.stringify([" @forox ", "vimeo.com/forox"]) });
    expect(errores).toEqual({});
    expect(datos.lat).toBeCloseTo(22.15);
    expect(datos.redes).toEqual([
      { red: "instagram", url: "https://www.instagram.com/forox/" },
      { red: "vimeo", url: "https://vimeo.com/forox" },
    ]);
    expect(datos.portada).toBeNull();
    expect(datos.privado).toBe(false);
    expect(validarLugar({ ...base, privado: "1" }).datos.privado).toBe(true);
    // "Qué es" solo cuenta con tipo Otro.
    expect(validarLugar({ ...base, tipo: "otro", detalle: " Taller de cerámica " }).datos.detalle).toBe("Taller de cerámica");
    expect(validarLugar({ ...base, detalle: "Taller" }).datos.detalle).toBeNull();
  });
  it("exige nombre, tipo válido y ubicación", () => {
    const { errores } = validarLugar({ ...base, nombre: "", tipo: "bar", lat: "0", lng: "0" });
    expect(errores.nombre).toBeTruthy();
    expect(errores.tipo).toBeTruthy();
    expect(errores.ubicacion).toBeTruthy();
  });
  it("reconoce el WhatsApp por el número y descarta lo que no es nada", () => {
    expect(validarLugar({ ...base, enlaces: JSON.stringify(["123"]) }).datos.redes).toEqual([]);
    expect(validarLugar({ ...base, enlaces: JSON.stringify(["4441234567"]) }).datos.redes).toEqual([{ red: "whatsapp", url: "https://wa.me/524441234567" }]);
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
  const a = { ...base, id: "a", nombre: "Zeta", lat: 22.15, lng: -100.98, proximo: { id: "e1", inicio: "2026-09-20T01:00:00Z", zona: "America/Mexico_City" } };
  const b = { ...base, id: "b", nombre: "Alfa", lat: 22.16, lng: -100.98, proximo: null };
  const c = { ...base, id: "c", nombre: "Beta", lat: 22.2, lng: -100.9, proximo: { id: "e2", inicio: "2026-09-15T01:00:00Z", zona: "America/Mexico_City" } };
  it("sin ubicación: alfabético", () => {
    expect(ordenarLugares([a, b, c], null).lista.map((l) => l.id)).toEqual(["b", "c", "a"]);
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
      { id: "e1", inicio: "2026-09-15T01:00:00Z", lugar_id: "a", zona: "America/Mexico_City" },
      { id: "e2", inicio: "2026-09-16T01:00:00Z", lugar_id: "a", zona: "America/Mexico_City" },
      { id: "e3", inicio: "2026-09-17T01:00:00Z", lugar_id: null, zona: "America/Mexico_City" },
    ]);
    expect(r[0].proximo).toEqual({ id: "e1", inicio: "2026-09-15T01:00:00Z", zona: "America/Mexico_City" });
    expect(r[1].proximo).toBeNull();
  });
});

describe("hrefLugar", () => {
  it("usa el slug cuando lo trae; el UUID solo como respaldo (OL-119, mismo criterio que artistas)", () => {
    expect(hrefLugar({ id: "a1", slug: "casa-de-la-cultura" })).toBe("/lugares/casa-de-la-cultura");
    expect(hrefLugar({ id: "a1", slug: null })).toBe("/lugares/a1");
    expect(hrefLugar({ id: "a1" })).toBe("/lugares/a1");
    expect(hrefLugar({ id: "a1", slug: "" })).toBe("/lugares/a1");
  });
});
