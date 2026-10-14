import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AYUDA, BLOQUES, seccionesManual } from "./ayuda";

const leer = (archivo: string) => readFileSync(new URL(archivo, import.meta.url), "utf8");
const FUENTES = [leer("./Grafo.tsx"), leer("./motor.ts")].join("\n");
/** Los textos entre comillas dobles de la pantalla (las claves se escriben siempre como literales, a propósito, para poder comprobarlas). */
const literales = new Set([...FUENTES.matchAll(/"([a-z][a-z0-9-]*)"/g)].map((m) => m[1]));
const claves = Object.keys(AYUDA);

describe("el diccionario del grafo", () => {
  it("cada entrada tiene nombre y texto, y el texto cabe en el panel", () => {
    for (const [clave, e] of Object.entries(AYUDA)) {
      expect(e.titulo.length, clave).toBeGreaterThan(0);
      expect(e.texto.length, clave).toBeGreaterThan(10);
      expect(e.texto.length, `${clave}: el texto del panel debe medir dos o tres líneas`).toBeLessThanOrEqual(150);
    }
  });
  it("una entrada con detalle trae su ancla del manual, y una ancla solo se pone si hay detalle", () => {
    for (const [clave, e] of Object.entries(AYUDA)) expect(!!e.detalle, clave).toBe(!!e.manual);
  });
  it("las anclas no se repiten ni chocan con otra clave ni con un bloque", () => {
    const ids = seccionesManual().flatMap((b) => [b.id, ...b.entradas.map((e) => e.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("el manual sale del mismo diccionario", () => {
  it("lista todas las entradas, cada una en un solo bloque", () => {
    const enBloques = BLOQUES.flatMap((b) => b.claves);
    expect(new Set(enBloques).size).toBe(enBloques.length);
    expect([...enBloques].sort()).toEqual([...claves].sort());
    const titulos = seccionesManual().flatMap((b) => b.entradas.map((e) => e.titulo));
    expect(titulos.sort()).toEqual(claves.map((c) => AYUDA[c].titulo).sort());
  });
  it("cada sección lleva el detalle de su entrada", () => {
    const entradas = seccionesManual().flatMap((b) => b.entradas);
    const conDetalle = Object.values(AYUDA).filter((e) => e.detalle).length;
    expect(entradas.filter((e) => e.detalle).length).toBe(conDetalle);
  });
});

describe("la pantalla y el diccionario concuerdan", () => {
  it("toda clave usada en Grafo.tsx o motor.ts existe en el diccionario", () => {
    const usadas = [
      ...FUENTES.matchAll(/(?:data-ayuda=|dataset\.ayuda = |ayuda: )"([a-z][a-z0-9-]*)"/g), // atributos, asignaciones y la clave de cada lente
      ...FUENTES.matchAll(/\), "([a-z][a-z0-9-]*)"\)/g), // conAyuda(elemento, "clave")
    ].map((m) => m[1]);
    expect(usadas.length).toBeGreaterThan(30);
    for (const k of usadas) expect(claves, `«${k}» no está en ayuda.ts`).toContain(k);
    // las familias con prefijo (lentes, filtros, cámara, ajustes) se reconocen aunque se compongan de otro modo
    for (const l of literales) if (/^(lente|filtro|camara|ajuste)-/.test(l)) expect(claves, `«${l}» no está en ayuda.ts`).toContain(l);
  });
  it("toda entrada del diccionario se usa en la pantalla", () => {
    for (const k of claves) expect(literales.has(k), `«${k}» no la usa ningún control`).toBe(true);
  });
  it("la pantalla ya no trae los textos que se mudaron al diccionario", () => {
    for (const viejo of ["Líneas: blancas entre tipos", "Lugares a escala real", "Datos reales de solo lectura", "la posición la dan las conexiones", "mapa desde arriba; las zonas en naranja"])
      expect(FUENTES, viejo).not.toContain(viejo);
  });
});
