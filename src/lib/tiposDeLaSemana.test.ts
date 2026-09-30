import { describe, expect, it } from "vitest";
import { tiposDeLaSemana } from "./tiposDeLaSemana";

const AHORA = new Date("2026-09-29T18:00:00Z");
const evento = (dias: number, tipo: string | null) => ({ inicio: new Date(AHORA.getTime() + dias * 86400000).toISOString(), fin: null, lugar: tipo ? { tipo } : null });

describe("tiposDeLaSemana: los atajos de «Esta semana» en Buscar", () => {
  it("cuenta los tipos de lugar de los eventos de los próximos siete días, del que más tiene al que menos", () => {
    const eventos = [evento(1, "museo"), evento(2, "foro"), evento(3, "foro"), evento(4, "galeria"), evento(5, "foro"), evento(6, "museo")];
    expect(tiposDeLaSemana(eventos, AHORA)).toEqual(["Foro", "Museo", "Galería"]);
  });
  it("a igualdad, por orden alfabético; hasta cinco; «Otro» y lo que no tiene lugar no cuentan", () => {
    const tipos = ["museo", "foro", "galeria", "escuela", "biblioteca", "casa_de_cultura"];
    // «Otro» tiene más eventos que cualquiera: si contara, saldría primero.
    const eventos = [...tipos.map((t, i) => evento(i + 1, t)), evento(1, "otro"), evento(2, "otro"), evento(3, "otro"), evento(2, null)];
    expect(tiposDeLaSemana(eventos, AHORA)).toEqual(["Biblioteca", "Casa de cultura", "Escuela", "Foro", "Galería"]);
  });
  it("lo que pasa después de la semana, o ya pasó, no cuenta; sin eventos, ningún atajo", () => {
    expect(tiposDeLaSemana([evento(9, "museo"), evento(-3, "foro")], AHORA)).toEqual([]);
    expect(tiposDeLaSemana([], AHORA)).toEqual([]);
  });
});
