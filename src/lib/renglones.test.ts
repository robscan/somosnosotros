import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Un aviso dentro de un renglón cerrado no se ve: se toca el botón y parece que no pasa nada (alta de evento,
 * 2026-09-17). Si un cuerpo que se esconde (`hidden={!algoAbierto}`) pinta un aviso, su formulario tiene que
 * abrirlo solo con useAbrirConError. Esta prueba lo exige en todas las pantallas.
 */
const RAIZ = new URL("../", import.meta.url).pathname;

function pantallas(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return pantallas(ruta);
    return ruta.endsWith(".tsx") ? [ruta] : [];
  });
}

/**
 * Los cuerpos que se esconden con `hidden={!x}` y si pintan algún aviso dentro: uno propio (`role="alert"`)
 * o el de un campo del canon, que lo pinta él (`error={…}`).
 */
export function cuerposQueSeEsconden(fuente: string): { estado: string; conAviso: boolean }[] {
  const marcas = [...fuente.matchAll(/<div[^>]*\bhidden=\{!(\w+)\}[^>]*>/g)];
  return marcas.map((marca) => {
    const desde = (marca.index ?? 0) + marca[0].length;
    // Hasta el cierre del renglón que lo contiene: basta el `</li>` siguiente (el canon los pinta así).
    const hasta = fuente.indexOf("</li>", desde);
    const dentro = fuente.slice(desde, hasta === -1 ? undefined : hasta);
    return { estado: marca[1], conAviso: dentro.includes('role="alert"') || /\berror=\{/.test(dentro) };
  });
}

describe("renglones", () => {
  it("todo cuerpo escondido con avisos se abre solo al llegar un error", () => {
    const culpables = pantallas(RAIZ).flatMap((ruta) => {
      const fuente = readFileSync(ruta, "utf8");
      return cuerposQueSeEsconden(fuente)
        .filter(({ estado, conAviso }) => {
          if (!conAviso) return false;
          // El que abre ese cuerpo, esté donde esté entre los argumentos.
          const abridor = new RegExp(`useAbrirConError\\([^)]*\\bset${estado[0].toUpperCase()}${estado.slice(1)}\\b`);
          return !abridor.test(fuente);
        })
        .map(({ estado }) => `${ruta.slice(RAIZ.length)}: el cuerpo de "${estado}" esconde avisos y no usa useAbrirConError`);
    });
    expect(culpables).toEqual([]);
  });

  it("sabe encontrar los cuerpos que se esconden y sus avisos", () => {
    expect(cuerposQueSeEsconden(`<div className={canon.cuerpo} hidden={!masAbierto}><p role="alert">x</p></div></li>`)).toEqual([{ estado: "masAbierto", conAviso: true }]);
    expect(cuerposQueSeEsconden(`<div hidden={!masAbierto}><input /></div></li>`)).toEqual([{ estado: "masAbierto", conAviso: false }]);
    expect(cuerposQueSeEsconden(`<div hidden={!masAbierto}><Campo error={errores.enlaces} /></div></li>`)).toEqual([{ estado: "masAbierto", conAviso: true }]);
    expect(cuerposQueSeEsconden(`<div className={canon.cuerpo}><p role="alert">x</p></div>`)).toEqual([]);
  });
});
