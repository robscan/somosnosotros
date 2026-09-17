import { describe, expect, it } from "vitest";
import { artistasParaSitemap, eventosParaSitemap, lugaresParaSitemap, ORIGEN, rutasEstaticas } from "./sitemap";

describe("sitemap", () => {
  it("trae las rutas fijas, sin ninguna privada ni de administración", () => {
    const urls = rutasEstaticas().map((e) => e.url);
    expect(urls).toEqual([`${ORIGEN}/`, `${ORIGEN}/lugares`, `${ORIGEN}/artistas`, `${ORIGEN}/reglas`, `${ORIGEN}/privacidad`]);
  });

  it("las rutas fijas no llevan lastModified: no tienen una fecha propia y 'ahora' cambiaría en cada rastreo", () => {
    for (const e of rutasEstaticas()) expect(e).not.toHaveProperty("lastModified");
  });

  it("una ficha de lugar oculta no sale", () => {
    const filas = [
      { id: "visible", visible: true, privado: false, actualizado_en: "2026-09-10T00:00:00Z" },
      { id: "oculto", visible: false, privado: false, actualizado_en: "2026-09-10T00:00:00Z" },
    ];
    expect(lugaresParaSitemap(filas).map((e) => e.url)).toEqual([`${ORIGEN}/lugares/visible`]);
  });

  it("un lugar privado ('solo tú lo ves') no sale, aunque esté visible", () => {
    const filas = [
      { id: "publico", visible: true, privado: false, actualizado_en: "2026-09-10T00:00:00Z" },
      { id: "reservado", visible: true, privado: true, actualizado_en: "2026-09-10T00:00:00Z" },
    ];
    expect(lugaresParaSitemap(filas).map((e) => e.url)).toEqual([`${ORIGEN}/lugares/publico`]);
  });

  it("un evento oculto no sale", () => {
    const ahora = new Date("2026-09-17T12:00:00Z");
    const filas = [
      { id: "visible", visible: true, termina: "2026-09-20T00:00:00Z", actualizado_en: "2026-09-10T00:00:00Z" },
      { id: "oculto", visible: false, termina: "2026-09-20T00:00:00Z", actualizado_en: "2026-09-10T00:00:00Z" },
    ];
    expect(eventosParaSitemap(filas, ahora).map((e) => e.url)).toEqual([`${ORIGEN}/eventos/visible`]);
  });

  it("un evento que ya terminó no sale", () => {
    const ahora = new Date("2026-09-17T12:00:00Z");
    const filas = [
      { id: "futuro", visible: true, termina: "2026-09-20T00:00:00Z", actualizado_en: "2026-09-10T00:00:00Z" },
      { id: "pasado", visible: true, termina: "2026-09-16T00:00:00Z", actualizado_en: "2026-09-10T00:00:00Z" },
    ];
    expect(eventosParaSitemap(filas, ahora).map((e) => e.url)).toEqual([`${ORIGEN}/eventos/futuro`]);
  });

  it("un artista oculto no sale", () => {
    const filas = [{ id: "oculto", visible: false, origen: null, actualizado_en: "2026-09-10T00:00:00Z", reclamado: false }];
    expect(artistasParaSitemap(filas)).toEqual([]);
  });

  it("un artista propio (no CAPO) sale aunque nadie lo haya reclamado", () => {
    const filas = [{ id: "propio", visible: true, origen: null, actualizado_en: "2026-09-10T00:00:00Z", reclamado: false }];
    expect(artistasParaSitemap(filas).map((e) => e.url)).toEqual([`${ORIGEN}/artistas/propio`]);
  });

  it("un artista del CAPO sin reclamar no sale (interruptor apagado); reclamado sí sale", () => {
    const filas = [
      { id: "sin-reclamar", visible: true, origen: "capo", actualizado_en: "2026-09-10T00:00:00Z", reclamado: false },
      { id: "reclamado", visible: true, origen: "capo", actualizado_en: "2026-09-10T00:00:00Z", reclamado: true },
    ];
    expect(artistasParaSitemap(filas).map((e) => e.url)).toEqual([`${ORIGEN}/artistas/reclamado`]);
  });
});
