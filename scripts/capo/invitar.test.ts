import { describe, expect, it } from "vitest";
import { armarCorreo, asuntoDe, type Candidato, elegirTanda, enmascarar, urlFicha } from "./invitar";

describe("asuntoDe y urlFicha", () => {
  it("dos variantes de asunto, con el nombre del artista", () => {
    expect(asuntoDe("Vitalis")).toBe("Vitalis, tu ficha ya está en Somos Nosotros");
    expect(asuntoDe("Vitalis", "B")).toBe("¿Eres Vitalis? Tu ficha te espera en Somos Nosotros");
  });
  it("con slug, la ficha va a somosnosotros.org/artistas/<slug>", () => {
    expect(urlFicha("abc-123", "vitalis")).toBe("https://somosnosotros.org/artistas/vitalis");
  });
  it("sin slug (respaldo), la ficha va a somosnosotros.org/artistas/<id>", () => {
    expect(urlFicha("abc-123")).toBe("https://somosnosotros.org/artistas/abc-123");
    expect(urlFicha("abc-123", null)).toBe("https://somosnosotros.org/artistas/abc-123");
  });
});

describe("armarCorreo", () => {
  it("con slug: un solo llamado, la URL usa el slug, no el UUID", () => {
    const c = armarCorreo("Vitalis", "abc-123", "vitalis");
    expect(c.asunto).toBe("Vitalis, tu ficha ya está en Somos Nosotros");
    expect(c.url).toBe("https://somosnosotros.org/artistas/vitalis");
    expect(c.texto).toContain("https://somosnosotros.org/artistas/vitalis");
    expect(c.texto).toContain('"Soy yo / es mi grupo"');
    expect(c.texto).toContain("Catálogo de Artistas Potosinos");
    expect(c.texto).toContain("pedir que se quite");
    expect(c.html).toContain('href="https://somosnosotros.org/artistas/vitalis"');
    expect(c.html).toContain("Soy yo / es mi grupo");
  });
  it("sin slug (artista aún sin migrar): cae al UUID, no rompe el correo", () => {
    const c = armarCorreo("Vitalis", "abc-123");
    expect(c.url).toBe("https://somosnosotros.org/artistas/abc-123");
    expect(c.texto).toContain("https://somosnosotros.org/artistas/abc-123");
    expect(c.html).toContain('href="https://somosnosotros.org/artistas/abc-123"');
  });
});

describe("enmascarar", () => {
  it("dos caracteres y el dominio, nunca el correo completo", () => {
    expect(enmascarar("prisca@ejemplo.com")).toBe("pr…@ejemplo.com");
    expect(enmascarar("ab@x.mx")).toBe("ab…@x.mx");
    expect(enmascarar("a@x.mx")).toBe("a…@x.mx");
  });
  it("sin arroba, no revienta", () => {
    expect(enmascarar("no-es-un-correo")).toBe("…");
  });
});

describe("elegirTanda", () => {
  const candidatos: Candidato[] = [
    { artistaId: "1", nombre: "Ana", correo: "a@x.mx" },
    { artistaId: "2", nombre: "Beto", correo: "b@x.mx" },
    { artistaId: "1", nombre: "Ana", correo: "a2@x.mx" }, // mismo artista, otro correo del catálogo
    { artistaId: "3", nombre: "Coco", correo: "c@x.mx" },
  ];
  it("como mucho un correo por artista, en el orden recibido", () => {
    const tanda = elegirTanda(candidatos, 10);
    expect(tanda.map((c) => c.artistaId)).toEqual(["1", "2", "3"]);
    expect(tanda[0].correo).toBe("a@x.mx"); // el primero que aparece, no el repetido
  });
  it("respeta el tamaño de la tanda", () => {
    expect(elegirTanda(candidatos, 2).map((c) => c.artistaId)).toEqual(["1", "2"]);
    expect(elegirTanda(candidatos, 0)).toEqual([]);
  });
});
