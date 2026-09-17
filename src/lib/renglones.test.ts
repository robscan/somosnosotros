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

/** Los avisos que el propio formulario levanta (no los del servidor) y que abren un renglón al llegar. */
export function avisosPropios(fuente: string): string[] {
  const llamada = fuente.match(/useAbrirConError\(([^)]*)\)/);
  if (!llamada) return [];
  return llamada[1]
    .split(",")
    .map((a) => a.trim())
    .filter((a) => /^error[A-Z]\w*$/.test(a));
}

/**
 * Lo que corre en cada reintento antes de subir: de la cabecera de la función que sube hasta la llamada misma.
 * Mirar el archivo entero no ata nada (una copia muerta en cualquier sitio lo daría por bueno); esto sí.
 */
export function antesDeSubir(fuente: string): string[] {
  return [...fuente.matchAll(/\bsubirFoto\(/g)].map((llamada) => {
    const hasta = llamada.index ?? 0;
    const cabecera = fuente.lastIndexOf("async function", hasta);
    return fuente.slice(cabecera === -1 ? 0 : cabecera, hasta);
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

  it("el aviso que abre un renglón se limpia en el propio reintento, antes de subir", () => {
    // Si un aviso viejo se queda pegado, el renglón ya no vuelve a abrirse solo con el siguiente error: el
    // formulario deja de avisar y volvemos al bug de OL-063. Salió en la revisión de la bitácora 095, y la
    // primera versión de esta prueba miraba el archivo entero, así que una copia muerta la engañaba.
    const culpables = pantallas(RAIZ).flatMap((ruta) => {
      const fuente = readFileSync(ruta, "utf8");
      const reintentos = antesDeSubir(fuente);
      if (!reintentos.length) return [];
      return avisosPropios(fuente)
        .filter((aviso) => !reintentos.every((trozo) => trozo.includes(`set${aviso[0].toUpperCase()}${aviso.slice(1)}(null)`)))
        .map((aviso) => `${ruta.slice(RAIZ.length)}: "${aviso}" abre un renglón y no se limpia al reintentar`);
    });
    expect(culpables).toEqual([]);
  });

  it("solo mira lo que corre antes de subir, no el archivo entero", () => {
    const bueno = `async function subir(a: File) {\n  setErrorImagen(null);\n  const r = await subirFoto(x);\n}`;
    const tarde = `async function subir(a: File) {\n  const r = await subirFoto(x);\n  setErrorImagen(null);\n}`;
    expect(antesDeSubir(bueno)[0]).toContain("setErrorImagen(null)");
    expect(antesDeSubir(tarde)[0]).not.toContain("setErrorImagen(null)");
  });

  it("sabe encontrar los cuerpos que se esconden y sus avisos", () => {
    expect(cuerposQueSeEsconden(`<div className={canon.cuerpo} hidden={!masAbierto}><p role="alert">x</p></div></li>`)).toEqual([{ estado: "masAbierto", conAviso: true }]);
    expect(cuerposQueSeEsconden(`<div hidden={!masAbierto}><input /></div></li>`)).toEqual([{ estado: "masAbierto", conAviso: false }]);
    expect(cuerposQueSeEsconden(`<div hidden={!masAbierto}><Campo error={errores.enlaces} /></div></li>`)).toEqual([{ estado: "masAbierto", conAviso: true }]);
    expect(cuerposQueSeEsconden(`<div className={canon.cuerpo}><p role="alert">x</p></div>`)).toEqual([]);
  });
});
