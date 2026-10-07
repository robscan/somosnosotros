import { describe, expect, it } from "vitest";
import { cartelAFormulario, claseSugerida } from "@/lib/eventos";
import { respuestasDelCartel, type Leido } from "./cartelPorPasos";

// OL-323 (bitácora 352): una inauguración se publica como la apertura (un evento) y la exposición se sugiere en «Publicado»; el cartel anota
// el festival que nombra.
const LUGAR = "0b0b0b0b-0000-4000-8000-000000000001";
const VALORES = { titulo: "", inicio: "", fin: "", gratis: false, precio: "", descripcion: "", enlace: "", lugar: "", direccion: "", artistas: [] };
const leyendo = (valores: Partial<Leido["valores"]>): Leido => ({ ok: true, valores: { ...VALORES, ...valores }, lugarId: LUGAR, quien: [], horaLeida: true, costoLeido: false });
const EXPO = { clase: "exposicion" as const, visita: { desde: "2026-11-06", hasta: "2026-11-30" }, sesiones: [], actos: [] };

describe("una inauguración es un evento", () => {
  it("el título no propone exposición ni festival si dice que es la inauguración", () => {
    expect(claseSugerida("Inauguración de la exposición Ecos de papel")).toBeNull();
    expect(claseSugerida("Inauguración del Festival de Cine UASLP 2026")).toBeNull();
    expect(claseSugerida("Exposición Ecos de papel")).toBe("exposicion");
  });

  it("un acto que nombra su festival es un evento (se relaciona en «Publicado»); el festival mismo, con su edición antes, sigue siendo festival", () => {
    expect(claseSugerida("Master Class - 9° Festival de Cine UASLP")).toBeNull();
    expect(claseSugerida("Concierto de clausura del Festival Umbral 2026")).toBeNull();
    expect(claseSugerida("Taller de gráfica · Festival Umbral 2026")).toBe("taller");
    expect(claseSugerida("9° Festival de Cine UASLP")).toBe("festival");
    expect(claseSugerida("XXIII Festival de las Artes")).toBe("festival");
    expect(claseSugerida("Gran Festival del Desierto")).toBe("festival");
    expect(claseSugerida("Festival Umbral 2026")).toBe("festival");
  });

  it("el cartel de una inauguración (con su visita) se publica como evento, con su día y su hora; la visita queda para la sugerencia", () => {
    const r = respuestasDelCartel(leyendo({ titulo: "Inauguración de Ecos de papel", inicio: "2026-11-05T19:00", forma: EXPO }));
    expect(r).toMatchObject({ claseFijada: true, dias: { desde: "2026-11-05", hasta: null }, hora: "19:00", fin: "" });
    expect(r.clase).toBeUndefined();
    expect(r.visita).toBeUndefined();
  });

  it("el cartel de la exposición misma (sin «inauguración» en el título) sigue siendo exposición con su inauguración (OL-321, caso 1)", () => {
    expect(respuestasDelCartel(leyendo({ titulo: "Ecos de papel", inicio: "2026-11-05T19:00", forma: EXPO }))).toMatchObject({ clase: "exposicion", visita: EXPO.visita, inauguracion: { dia: "2026-11-05", hora: "19:00" } });
  });
});

describe("el festival que lee el cartel", () => {
  it("se limpia y se recorta", () => {
    expect(cartelAFormulario({ titulo: "X", fecha: null, hora: null, hora_fin: null, lugar: null, direccion: null, gratis: null, precio: null, descripcion: null, enlace: null, artistas: null, festival: "  Festival Umbral 2026 " }).festival).toBe("Festival Umbral 2026");
    expect(cartelAFormulario({ titulo: "X", fecha: null, hora: null, hora_fin: null, lugar: null, direccion: null, gratis: null, precio: null, descripcion: null, enlace: null, artistas: null }).festival).toBe("");
  });
});
