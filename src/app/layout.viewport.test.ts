import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * OL-308 (Android, bitácora 336): el `viewport` del layout pide `interactive-widget=resizes-content`, para que Chrome en Android encoja la
 * ventana de maquetación con el teclado (su valor por omisión, `resizes-visual`, se porta como Safari de iPhone). No se importa el layout
 * (trae `next/font`, que solo compila Next): se lee su fuente. Que el meta de verdad salga en el HTML lo comprueba `npm run medir`.
 */
describe("el viewport del layout para Android", () => {
  const fuente = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");
  const inicio = fuente.indexOf("export const viewport");
  const bloque = fuente.slice(inicio, fuente.indexOf("};", inicio));

  it("pide que el teclado encoja la ventana de maquetación", () => {
    expect(bloque).toContain('interactiveWidget: "resizes-content"');
  });
  it("conserva lo demás del viewport", () => {
    expect(bloque).toContain('width: "device-width"');
    expect(bloque).toContain('viewportFit: "cover"');
  });
});
