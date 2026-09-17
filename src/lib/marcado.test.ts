import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Un <label> manda el toque a UN solo campo: el primero que encuentra dentro. Si envuelve dos, el segundo queda muerto
 * (alta de evento, 2026-09-17: la cámara del cartel vivía dentro del <label> del nombre y tocarla enfocaba el nombre).
 * Esta prueba lee el JSX y no deja que vuelva a pasar en ninguna pantalla.
 */
const RAIZ = new URL("../", import.meta.url).pathname;
const CAMPOS = /<(input|select|textarea)[\s/>]/g;

function pantallas(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return pantallas(ruta);
    return ruta.endsWith(".tsx") ? [ruta] : [];
  });
}

/** Cada <label> del archivo con cuántos campos envuelve (cuenta la anidación para casar la etiqueta de cierre). */
function labelsConSusCampos(fuente: string): { linea: number; campos: number }[] {
  const marcas = [...fuente.matchAll(/<label[\s/>]|<\/label>/g)];
  const abiertos: { linea: number; desde: number }[] = [];
  const encontrados: { linea: number; campos: number }[] = [];
  for (const marca of marcas) {
    if (marca[0] === "</label>") {
      const abierto = abiertos.pop();
      if (!abierto) continue;
      const dentro = fuente.slice(abierto.desde, marca.index);
      encontrados.push({ linea: abierto.linea, campos: (dentro.match(CAMPOS) ?? []).length });
    } else {
      abiertos.push({ linea: fuente.slice(0, marca.index).split("\n").length, desde: marca.index });
    }
  }
  return encontrados;
}

describe("marcado", () => {
  it("ningún <label> envuelve más de un campo", () => {
    const culpables = pantallas(RAIZ).flatMap((ruta) =>
      labelsConSusCampos(readFileSync(ruta, "utf8"))
        .filter((l) => l.campos > 1)
        .map((l) => `${ruta.slice(RAIZ.length)}:${l.linea} envuelve ${l.campos} campos`),
    );
    expect(culpables).toEqual([]);
  });

  it("sabe contar los campos de un <label>", () => {
    expect(labelsConSusCampos(`<label><input /></label>`)).toEqual([{ linea: 1, campos: 1 }]);
    expect(labelsConSusCampos(`<label><input /><span><input /></span></label>`)).toEqual([{ linea: 1, campos: 2 }]);
    expect(labelsConSusCampos(`<div><label><input /></label><label><input /></label></div>`)).toHaveLength(2);
  });
});
