import { describe, expect, it } from "vitest";
import { artistasParaSitemap, CAPO_SIN_RECLAMAR_EN_SITEMAP, eventosParaSitemap, lugaresParaSitemap, ORIGEN, rutasEstaticas } from "./sitemap";

describe("sitemap", () => {
  it("trae las rutas fijas, sin ninguna privada ni de administración", () => {
    const urls = rutasEstaticas().map((e) => e.url);
    expect(urls).toEqual([`${ORIGEN}/`, `${ORIGEN}/agenda`, `${ORIGEN}/lugares`, `${ORIGEN}/artistas`, `${ORIGEN}/reglas`, `${ORIGEN}/privacidad`, `${ORIGEN}/ayuda`]);
  });

  it("las rutas fijas no llevan lastModified: no tienen una fecha propia y 'ahora' cambiaría en cada rastreo", () => {
    for (const e of rutasEstaticas()) expect(e).not.toHaveProperty("lastModified");
  });

  it("una ficha de lugar oculta no sale", () => {
    const filas = [
      { id: "visible", slug: "visible", visible: true, privado: false, actualizado_en: "2026-09-10T00:00:00Z" },
      { id: "oculto", slug: "oculto", visible: false, privado: false, actualizado_en: "2026-09-10T00:00:00Z" },
    ];
    expect(lugaresParaSitemap(filas).map((e) => e.url)).toEqual([`${ORIGEN}/lugares/visible`]);
  });

  it("un lugar privado ('solo tú lo ves') no sale, aunque esté visible", () => {
    const filas = [
      { id: "publico", slug: "publico", visible: true, privado: false, actualizado_en: "2026-09-10T00:00:00Z" },
      { id: "reservado", slug: "reservado", visible: true, privado: true, actualizado_en: "2026-09-10T00:00:00Z" },
    ];
    expect(lugaresParaSitemap(filas).map((e) => e.url)).toEqual([`${ORIGEN}/lugares/publico`]);
  });

  it("un evento oculto no sale", () => {
    const ahora = new Date("2026-09-17T12:00:00Z");
    const filas = [
      { id: "visible", slug: "visible", visible: true, termina: "2026-09-20T00:00:00Z", actualizado_en: "2026-09-10T00:00:00Z" },
      { id: "oculto", slug: "oculto", visible: false, termina: "2026-09-20T00:00:00Z", actualizado_en: "2026-09-10T00:00:00Z" },
    ];
    expect(eventosParaSitemap(filas, ahora).map((e) => e.url)).toEqual([`${ORIGEN}/eventos/visible`]);
  });

  it("un evento que ya terminó no sale", () => {
    const ahora = new Date("2026-09-17T12:00:00Z");
    const filas = [
      { id: "futuro", slug: "futuro", visible: true, termina: "2026-09-20T00:00:00Z", actualizado_en: "2026-09-10T00:00:00Z" },
      { id: "pasado", slug: "pasado", visible: true, termina: "2026-09-16T00:00:00Z", actualizado_en: "2026-09-10T00:00:00Z" },
    ];
    expect(eventosParaSitemap(filas, ahora).map((e) => e.url)).toEqual([`${ORIGEN}/eventos/futuro`]);
  });

  it("un artista oculto no sale", () => {
    const filas = [{ id: "oculto", slug: "oculto", visible: false, origen: null, actualizado_en: "2026-09-10T00:00:00Z", reclamado: false }];
    expect(artistasParaSitemap(filas)).toEqual([]);
  });

  it("un artista propio (no CAPO) sale aunque nadie lo haya reclamado", () => {
    const filas = [{ id: "propio", slug: "propio", visible: true, origen: null, actualizado_en: "2026-09-10T00:00:00Z", reclamado: false }];
    expect(artistasParaSitemap(filas).map((e) => e.url)).toEqual([`${ORIGEN}/artistas/propio`]);
  });

  it("con la decisión del founder («si entran todos los contenidos del sitio»), un artista del CAPO sale aunque nadie lo haya reclamado", () => {
    const filas = [
      { id: "sin-reclamar", slug: "sin-reclamar", visible: true, origen: "capo", actualizado_en: "2026-09-10T00:00:00Z", reclamado: false },
      { id: "reclamado", slug: "reclamado", visible: true, origen: "capo", actualizado_en: "2026-09-10T00:00:00Z", reclamado: true },
    ];
    expect(artistasParaSitemap(filas).map((e) => e.url).sort()).toEqual([`${ORIGEN}/artistas/reclamado`, `${ORIGEN}/artistas/sin-reclamar`]);
  });

  it("las dos caras del interruptor van juntas: sitemap y el noindex de la ficha leen la misma constante", () => {
    // src/app/artistas/[id]/page.tsx calcula su noindex como
    //   a.origen === "capo" && !CAPO_SIN_RECLAMAR_EN_SITEMAP && (sin cuenta ligada)
    // con el interruptor en `true`, ese "!CAPO_SIN_RECLAMAR_EN_SITEMAP" es `false`: la ficha nunca lleva noindex por
    // esta causa — igual que aquí, donde el mismo artista sin reclamar entra al sitemap. Si alguna vez se apaga el
    // interruptor sin querer, esta prueba avisa antes que un cambio silencioso en las dos caras.
    expect(CAPO_SIN_RECLAMAR_EN_SITEMAP).toBe(true);
    const filas = [{ id: "sin-reclamar", slug: "sin-reclamar", visible: true, origen: "capo", actualizado_en: "2026-09-10T00:00:00Z", reclamado: false }];
    expect(artistasParaSitemap(filas).map((e) => e.url)).toEqual([`${ORIGEN}/artistas/sin-reclamar`]);
  });
});
