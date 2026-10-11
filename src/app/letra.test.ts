import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * OL-373 (bitácora 404): la letra de la app sigue al tamaño de texto del teléfono, hasta el doble de hoy. Como `layout.viewport.test.ts`, se
 * lee la fuente (el CSS y el layout no se importan). Lo que de verdad pinta cada navegador lo comprueban `npm run medir -- --letra=2`
 * (Chromium con la letra al doble) y el simulador de iPhone.
 */
const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
const tokens = new Map([...css.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map(([, nombre, valor]) => [nombre, valor.trim()]));

describe("la escala de letra de globals.css", () => {
  it("tiene un solo tope: el doble", () => {
    expect(tokens.get("--letra-tope")).toBe("2");
    expect(css.match(/--letra-tope:/g)).toHaveLength(1);
  });

  it("cada tamaño va en rem y se topa en sus px de hoy por el tope (o es otro nombre de uno que sí)", () => {
    const escala = [...tokens].filter(([nombre]) => nombre.startsWith("--letra-") && !["--letra-tope", "--letra-tope-tira", "--letra-campo"].includes(nombre));
    expect(escala.length).toBeGreaterThanOrEqual(14);
    for (const [nombre, valor] of escala) {
      const alias = valor.match(/^var\((--letra-[\w-]+)\)$/)?.[1];
      if (alias) {
        expect(tokens.get(alias), `${nombre} apunta a ${alias}`).toMatch(/^min\(/);
        continue;
      }
      const partes = valor.match(/^min\(([\d.]+)rem, calc\((\d+)px \* var\(--letra-tope\)\)\)$/);
      expect(partes, `${nombre}: ${valor}`).not.toBeNull();
      expect(Number(partes![1]) * 16, `${nombre}: los px del tope son los de la raíz de 16`).toBe(Number(partes![2]));
    }
  });

  it("un campo nunca baja de 16 px (Safari haría zoom al enfocarlo)", () => {
    expect(tokens.get("--letra-campo")).toBe("max(16px, var(--letra-md))");
  });

  it("las tiras de navegación y el logotipo crecen menos, con su propio tope", () => {
    expect(tokens.get("--letra-tope-tira")).toBe("16px");
    expect(tokens.get("--alto-logo")).toBe("min(1.75rem, 35px)");
    expect(tokens.get("--alto-logo-chico")).toBe("min(1.5rem, 30px)");
  });

  it("las filas que se reacomodan con la letra grande usan todas el mismo umbral, el de globals.css, que ningún teléfono cumple con la letra de fábrica", () => {
    const umbral = css.match(/`@container \(max-width: ([\d.]+)rem\)`/)?.[1] ?? "";
    expect(umbral).not.toBe("");
    // Con la raíz de 16 (Chrome, Android) y la de fábrica del iPhone (17), por debajo del teléfono más angosto que se mide (320) y del iPhone
    // más angosto de hoy (375); con la mayor normal del iPhone (23), por encima del más ancho (440).
    expect(Number(umbral) * 16).toBeLessThan(320);
    expect(Number(umbral) * 17).toBeLessThan(375);
    expect(Number(umbral) * 23).toBeGreaterThan(440);
    const consultas = readdirSync(new URL("../", import.meta.url), { recursive: true })
      .filter((f) => String(f).endsWith(".css"))
      .flatMap((f) => [...readFileSync(new URL(`../${f}`, import.meta.url), "utf8").matchAll(/@container \(max-width: ([\d.]+)rem\)/g)].map((m) => `${f}: ${m[1]}`));
    expect(consultas.length).toBeGreaterThanOrEqual(4);
    for (const c of consultas) expect(c).toMatch(new RegExp(`: ${umbral.replace(".", "\\.")}$`));
  });

  it("fuera de iOS la raíz es la letra del navegador (100 %)", () => {
    expect(css).toMatch(/html,\s*body\s*\{[^}]*font-size: 100%;/);
  });

  it("en iPhone y iPad la raíz es la letra del sistema, y vuelve a poner lo que el atajo `font` repone", () => {
    const desde = css.indexOf("@supports (-webkit-touch-callout: none) {");
    expect(desde).toBeGreaterThan(0);
    const bloque = css.slice(desde, css.indexOf("\n}\n", desde));
    expect(bloque).toMatch(/html \{\s*font: -apple-system-body;/);
    for (const declaracion of ["font-family: var(--fuente);", "font-weight: normal;", "line-height: 1.4;", "font-variation-settings: var(--ancho-texto);", "font-optical-sizing: auto;", "font-variant-numeric: tabular-nums;"]) {
      expect(bloque).toContain(declaracion);
    }
    // Solo ahí: en Safari de Mac la letra del sistema mide 13 px y la app se encogería.
    const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(sinComentarios.match(/-apple-system-body/g)).toHaveLength(1);
  });
});

describe("Android: la etiqueta text-scale del layout", () => {
  const layout = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");
  const inicio = layout.indexOf("export const metadata");
  const bloque = layout.slice(inicio, layout.indexOf("\n};", inicio));

  it("pide que la letra de la raíz sea la que la persona eligió en su teléfono", () => {
    expect(bloque).toContain('other: { "text-scale": "scale" }');
  });
});
