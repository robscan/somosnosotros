import { describe, expect, it } from "vitest";
import { lugarPorNombre, palabrasDistintivas } from "./lugarDelCartel";
import { normalizarNombre } from "./lugares";

// OL-413 (verificación del gestor con la lectura real): «Lunaria Foro Expandido» no cruzaba con «Foro lunaria».
type Lugar = { id: string; nombre: string; ciudad: string };
const SLP = "San Luis Potosí";
const DIRECTORIO: Lugar[] = [
  { id: "lunaria", nombre: "Foro lunaria", ciudad: SLP },
  { id: "lab", nombre: "Laboratorio Centro Histórico", ciudad: SLP },
  { id: "roma-cafe", nombre: "Café Roma", ciudad: SLP },
  { id: "roma-sur", nombre: "Roma Sur Espacio", ciudad: SLP },
  { id: "aurora-slp", nombre: "Galería Aurora", ciudad: SLP },
  { id: "aurora-ags", nombre: "Teatro Aurora", ciudad: "Aguascalientes" },
];
/** Como `lugares_con_nombre`: el nombre normalizado contiene lo buscado (de 4 letras o más), cinco como mucho. */
const buscar = async (texto: string) => {
  const q = normalizarNombre(texto);
  return q.length < 4 ? [] : DIRECTORIO.filter((l) => normalizarNombre(l.nombre).includes(q)).slice(0, 5);
};

describe("las palabras distintivas de un nombre", () => {
  it("sin las genéricas, sin acentos, de 4 letras o más", () => {
    expect(palabrasDistintivas("Lunaria Foro Expandido")).toEqual(["lunaria"]);
    expect(palabrasDistintivas("Roma Lab")).toEqual(["roma"]);
    expect(palabrasDistintivas("Casa de la Cultura Ángel Ruiz")).toEqual(["cultura", "angel", "ruiz"]);
    expect(palabrasDistintivas("Foro Cultural del Centro")).toEqual([]);
    expect(palabrasDistintivas("Bar Ojo")).toEqual([]);
  });
});

describe("el lugar que nombra el cartel", () => {
  it("«Lunaria Foro Expandido» es «Foro lunaria»: el nombre completo no cruza, su palabra distintiva sí, y es una sola", async () => {
    expect(await buscar("Lunaria Foro Expandido")).toEqual([]);
    expect((await lugarPorNombre("Lunaria Foro Expandido", buscar, SLP))?.id).toBe("lunaria");
    expect((await lugarPorNombre("Lunaria Foro Expandido", buscar))?.id).toBe("lunaria");
  });

  it("ambiguo: «Roma Lab» da dos lugares con «roma» y no se sugiere ninguno", async () => {
    expect(await lugarPorNombre("Roma Lab", buscar, SLP)).toBeNull();
  });

  it("con la ciudad, uno de otra ciudad no cuenta; sin ella, dos son ambiguos", async () => {
    expect((await lugarPorNombre("Aurora Foro", buscar, SLP))?.id).toBe("aurora-slp");
    expect(await lugarPorNombre("Aurora Foro", buscar)).toBeNull();
  });

  it("el nombre completo manda como siempre: uno, ese; varios, ninguno (sin probar palabras)", async () => {
    expect((await lugarPorNombre("Laboratorio Centro Histórico", buscar))?.id).toBe("lab");
    expect(await lugarPorNombre("Roma", buscar)).toBeNull();
  });

  it("solo palabras genéricas o cortas: nada", async () => {
    expect(await lugarPorNombre("Foro Cultural", buscar, SLP)).toBeNull();
    expect(await lugarPorNombre("Bar Ojo", buscar, SLP)).toBeNull();
  });
});
