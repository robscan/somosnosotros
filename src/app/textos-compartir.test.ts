import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * OL-333 (bitácora 362): lo que se ve al compartir el sitio no nombra una ciudad (el catálogo se abre a más, OL-290) y dice claro que mirar no
 * pide cuenta («No necesitas cuenta para mirar.»). Se lee la fuente de cada archivo, como `layout.viewport.test.ts`: el layout trae `next/font`
 * y no se importa fuera de Next. Los títulos por ciudad de Lugares y Artistas (OL-059) nombran la ciudad como dato y no entran aquí.
 */
const archivos = ["./layout.tsx", "./agenda/page.tsx", "../lib/perfil.ts", "./manifest.ts"];
const fuente = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), "utf8");

describe("los textos de compartir el sitio", () => {
  for (const ruta of archivos) {
    it(`${ruta} no nombra San Luis ni dice «Sin cuenta»`, () => {
      const texto = fuente(ruta);
      expect(texto).not.toMatch(/San Luis/i);
      expect(texto).not.toMatch(/Sin cuenta/);
    });
  }

  it("layout (descripción, Open Graph y Twitter), Agenda e invitar dicen «No necesitas cuenta para mirar»", () => {
    expect(fuente("./layout.tsx").match(/No necesitas cuenta para mirar\./g)).toHaveLength(3);
    expect(fuente("./agenda/page.tsx")).toContain("No necesitas cuenta para mirar.");
    expect(fuente("../lib/perfil.ts")).toContain("conoce a la gente. No necesitas cuenta para mirar:");
  });

  it("la fuente de la imagen de compartir lleva el lema genérico, sin ciudad", () => {
    const html = readFileSync(new URL("../../docs/diseno/logotipo/portada.html", import.meta.url), "utf8");
    expect(html).toContain("Agenda cultural y lugares para conocer gente");
    expect(html).not.toMatch(/San Luis/i);
  });
});
