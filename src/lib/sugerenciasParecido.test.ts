import { describe, expect, it } from "vitest";
import type { Publicado } from "./sugerencias";
import { diasDe, mismoTitulo, sugerenciaDeParecido, tituloDeParticipacion, tituloDistintivo, titulosParecidos, type Candidato } from "./sugerenciasParecido";

// OL-341 (bitácora 370): «Este festival ya está publicado. ¿Es tu participación?». La regla de los títulos (con sus falsos positivos), los días
// y lo que se propone.

describe("tituloDistintivo: tres palabras con contenido o una palabra de festival", () => {
  it.each([
    ["Electric Universe Festival", true],
    ["Rock Fest", true],
    ["FEST", true],
    ["Encuentro", true],
    ["Muestra de cine", true],
    ["Ciclo Fellini", true],
    ["Jornadas", true],
    ["Noche de luna nueva", true],
    ["Concierto de la Orquesta Sinfónica", true],
  ])("«%s» sí", (titulo, esperado) => expect(tituloDistintivo(titulo)).toBe(esperado));

  it.each([
    ["Concierto"],
    ["Taller de cerámica"],
    ["Noche de jazz"],
    ["Festivales"],
    ["Manifest"],
    [""],
    ["¡¡!!"],
  ])("«%s» no (un género, no un nombre propio)", (titulo) => expect(tituloDistintivo(titulo)).toBe(false));
});

describe("titulosParecidos: normalizados, iguales o uno dentro del otro por palabras enteras", () => {
  it.each([
    ["Electric Universe Festival", "ELECTRIC UNIVERSE FESTIVAL"],
    ["Electric Universe Festival", "electric universe festival!!"],
    ["Electric Universe Festival", "DJ Nova en Electric Universe Festival"],
    ["Encuentro de Jaraneros", "Encuentro de jaraneros · noche de fandango"],
    ["Festival del Desierto", "Festíval del desiérto"],
  ])("«%s» ≈ «%s»", (a, b) => {
    expect(titulosParecidos(a, b)).toBe(true);
    expect(titulosParecidos(b, a)).toBe(true);
  });

  it.each([
    ["Concierto", "Concierto", "genérico aunque sea igual"],
    ["Taller de cerámica", "Taller de cerámica", "genérico de dos palabras con contenido"],
    ["Concierto", "Concierto de la Orquesta Sinfónica", "el corto es genérico"],
    ["Fest", "Festival de Jazz", "«fest» no está dentro de «festival» (palabras enteras)"],
    ["Electric Universe Festival", "Electric Universe", "el corto («Electric Universe») no es distintivo"],
    ["Electric Universe Festival", "Universo eléctrico festival", "otras palabras"],
    ["", "Electric Universe Festival", "vacío"],
  ])("«%s» ≠ «%s» (%s)", (a, b) => expect(titulosParecidos(a, b)).toBe(false));

  it("mismoTitulo solo con la misma normalización", () => {
    expect(mismoTitulo("Electric Universe Festival", "electric universe festival")).toBe(true);
    expect(mismoTitulo("Electric Universe Festival", "DJ Nova en Electric Universe Festival")).toBe(false);
  });
});

describe("diasDe: del día del inicio al del fin, en la zona del evento", () => {
  it("un festival que termina a las 00:00 del día siguiente terminó la víspera", () => {
    expect(diasDe({ inicio: "2026-10-10T02:00:00Z", fin: "2026-10-13T06:00:00Z", zona: "America/Mexico_City" })).toEqual({ desde: "2026-10-09", hasta: "2026-10-12" });
  });
  it("sin fin, un solo día; las 8 p.m. de San Luis son las 2 a.m. UTC del día siguiente", () => {
    expect(diasDe({ inicio: "2026-10-11T02:00:00Z", fin: null, zona: "America/Mexico_City" })).toEqual({ desde: "2026-10-10", hasta: "2026-10-10" });
  });
});

describe("tituloDeParticipacion", () => {
  it("si es el mismo título del festival, «<artista> en <festival>»", () => {
    expect(tituloDeParticipacion("Electric Universe Festival", "Electric Universe Festival", "DJ Nova")).toBe("DJ Nova en Electric Universe Festival");
  });
  it("si no, o sin artista, el que escribió la persona", () => {
    expect(tituloDeParticipacion("DJ Nova en Electric Universe", "Electric Universe Festival", "DJ Nova")).toBe("DJ Nova en Electric Universe");
    expect(tituloDeParticipacion("Electric Universe Festival", "Electric Universe Festival", null)).toBe("Electric Universe Festival");
    expect(tituloDeParticipacion("Electric Universe Festival", "Electric Universe Festival", "  ")).toBe("Electric Universe Festival");
  });
});

// ---------------------------------------------------------------- La sugerencia

const PUBLICADO: Publicado = { id: "nuevo", titulo: "Electric Universe Festival", clase: "puntual", dia: "2026-10-10", lugar: "Foro Aleph", sitio: "sitio:foro aleph", sitioReservado: false, padre: null, inaugura: false, anotadas: {} };
const SUELTO: Candidato = { id: "existente", slug: "electric-universe-festival", titulo: "Electric Universe Festival", clase: "puntual", desde: "2026-10-10", hasta: "2026-10-10", propio: false, padre: null, lugar: "Foro Aleph" };
const FESTIVAL: Candidato = { id: "marco", slug: "electric-universe-festival-2", titulo: "Electric Universe Festival", clase: "festival", desde: "2026-10-09", hasta: "2026-10-11", propio: false, padre: null, lugar: "Foro Aleph" };

describe("sugerenciaDeParecido", () => {
  it("(b) el evento suelto de otra cuenta, el mismo día: «Ya hay un evento igual», con el título propuesto con el artista", () => {
    expect(sugerenciaDeParecido(PUBLICADO, [SUELTO], "DJ Nova")).toEqual({
      tipo: "parecido",
      modo: "evento",
      titulo: "DJ Nova en Electric Universe Festival",
      editable: true,
      existente: { id: "existente", titulo: "Electric Universe Festival", dia: "2026-10-10", lugar: "Foro Aleph" },
    });
  });

  it("(a) el festival publicado que cubre ese día gana al evento suelto; con otro título, el suyo y sin campo", () => {
    const s = sugerenciaDeParecido({ ...PUBLICADO, titulo: "DJ Nova en Electric Universe Festival" }, [SUELTO, FESTIVAL], "DJ Nova");
    expect(s).toEqual({ tipo: "parecido", modo: "festival", titulo: "DJ Nova en Electric Universe Festival", editable: false, marco: { id: "marco", slug: "electric-universe-festival-2", titulo: "Electric Universe Festival", desde: "2026-10-09", hasta: "2026-10-11", lugar: "Foro Aleph", actos: 0 } });
  });

  it("(a) también un festival propio", () => {
    expect(sugerenciaDeParecido(PUBLICADO, [{ ...FESTIVAL, propio: true }], null)).toMatchObject({ modo: "festival", titulo: "Electric Universe Festival", editable: true });
  });

  it("el sitio puede ser otro (no se compara)", () => {
    expect(sugerenciaDeParecido({ ...PUBLICADO, lugar: "Otro foro", sitio: "sitio:otro foro" }, [SUELTO], null)).toMatchObject({ modo: "evento" });
  });

  it.each<[string, Publicado, Candidato[]]>([
    ["otro día", PUBLICADO, [{ ...SUELTO, desde: "2026-10-11", hasta: "2026-10-11" }]],
    ["un festival que ya terminó la víspera", PUBLICADO, [{ ...FESTIVAL, desde: "2026-10-08", hasta: "2026-10-09" }]],
    ["un evento suelto propio (un duplicado, no una participación)", PUBLICADO, [{ ...SUELTO, propio: true }]],
    ["un evento que ya es acto de un festival", PUBLICADO, [{ ...SUELTO, padre: "marco" }]],
    ["una exposición o un taller", PUBLICADO, [{ ...SUELTO, clase: "exposicion" }, { ...SUELTO, id: "t", clase: "taller" }]],
    ["títulos genéricos («Concierto»)", { ...PUBLICADO, titulo: "Concierto" }, [{ ...SUELTO, titulo: "Concierto" }]],
    ["títulos genéricos («Taller de cerámica»)", { ...PUBLICADO, titulo: "Taller de cerámica" }, [{ ...SUELTO, titulo: "Taller de cerámica" }, { ...FESTIVAL, titulo: "Taller de cerámica" }]],
    ["otro título", PUBLICADO, [{ ...SUELTO, titulo: "Universo eléctrico" }]],
    ["el mismo evento", PUBLICADO, [{ ...SUELTO, id: "nuevo" }]],
    ["un evento que ya es parte de un festival", { ...PUBLICADO, padre: "marco" }, [SUELTO]],
    ["un taller recién publicado", { ...PUBLICADO, clase: "taller" }, [SUELTO]],
    ["la sugerencia ya anotada", { ...PUBLICADO, anotadas: { parecido: { estado: "descartada" } } }, [SUELTO]],
  ])("nada con %s", (_, e, candidatos) => expect(sugerenciaDeParecido(e, candidatos, "DJ Nova")).toBeNull());
});
