import { describe, expect, it } from "vitest";
import { localAIso } from "../fechas";
import {
  cadaCuantos,
  claseDeActo,
  claseDeLaAgenda,
  claveDeFestival,
  comoSeAgrupa,
  dentroDelFestival,
  diasSeguidos,
  etiquetaDeForma,
  leerFormaEvento,
  mismoPrograma,
  nombraAlFestival,
  nombreDeExposicion,
  programaDeAgenda,
} from "./formaEvento";

const ZONA = "America/Mexico_City";
const local = (fechaHora: string) => localAIso(fechaHora, ZONA)!;
const AHORA = new Date("2026-10-21T16:00:00Z");
const UUID = "00000000-0000-4000-8000-00000000f001";

describe("la clase de una fila de la agenda (OL-433)", () => {
  it("por el título (`claseSugerida`); con periodo de visita, exposición; una «exposición» sin periodo, evento", () => {
    expect(claseDeLaAgenda("Festival callejero de títeres", null)).toBe("festival");
    expect(claseDeLaAgenda("Encuentro de jaraneros", null)).toBe("festival");
    expect(claseDeLaAgenda("Taller de grabado en linóleo", null)).toBe("taller");
    expect(claseDeLaAgenda("Curso de fotografía", null)).toBe("taller");
    expect(claseDeLaAgenda("Concierto de piano", null)).toBe("puntual");
    expect(claseDeLaAgenda("Inauguración: Raíces", null)).toBe("puntual");
    expect(claseDeLaAgenda("Inauguración: Raíces", "2026-11-30")).toBe("exposicion");
    expect(claseDeLaAgenda("Exposición colectiva", null)).toBe("puntual");
    expect(claseDeLaAgenda("Master class · 9° Festival de Cine UASLP", null)).toBe("puntual");
  });

  it("un acto nunca es festival dentro de festival; el nombre de la exposición sin «Inauguración»", () => {
    expect(claseDeActo("festival")).toBe("puntual");
    expect(claseDeActo("taller")).toBe("taller");
    expect(nombreDeExposicion("Inauguración: Raíces")).toBe("Raíces");
    expect(nombreDeExposicion("Inauguración de la exposición Ecos del agua")).toBe("Ecos del agua");
    expect(nombreDeExposicion("Inauguración")).toBe("Inauguración");
    expect(nombreDeExposicion("Raíces")).toBe("Raíces");
  });
});

describe("festivales", () => {
  it("se reconocen por su nombre propio (sin año, número ni «festival»); un género solo exige el nombre entero", () => {
    expect(claveDeFestival("Xantolo 2026").propias).toEqual(["xantolo"]);
    expect(claveDeFestival("Fotovisión 31").propias).toEqual(["fotovision"]);
    expect(claveDeFestival("Festival Otoño Sonoro").propias).toEqual(["otono", "sonoro"]);
    expect(claveDeFestival("Festival de Jazz").propias).toEqual([]);
    expect(nombraAlFestival(["Fiesta de Luz", "Tres noches de luces en la plaza.", "Xantolo 2026"], "Xantolo 2026")).toBe(true);
    expect(nombraAlFestival(["Tzompantli", null, null, "Agenda programación XANTOLO en tu ciudad"], "Xantolo 2026")).toBe(true);
    expect(nombraAlFestival(["Fotovisión 31: recorrido guiado"], "Fotovisión 31")).toBe(true);
    expect(nombraAlFestival(["Otoño: noche de cuerdas"], "Festival Otoño Sonoro")).toBe(false);
    expect(nombraAlFestival(["Noche de jazz en el jardín"], "Festival de Jazz")).toBe(false);
    expect(nombraAlFestival(["Clausura del Festival de Jazz"], "Festival de Jazz 2026")).toBe(true);
    expect(nombraAlFestival(["Concierto de Otoño"], "Xantolo 2026")).toBe(false);
  });

  it("el mismo programa con otra forma de escribirlo", () => {
    expect(mismoPrograma("Xantolo", "XANTOLO 2026")).toBe(true);
    expect(mismoPrograma("Festival Otoño Sonoro", "Otoño Sonoro")).toBe(true);
    expect(mismoPrograma("Otoño Sonoro", "Fotovisión 31")).toBe(false);
  });

  it("el programa que dice la agenda vale si nombra algo propio: no una categoría, un mes, la agenda ni el sitio", () => {
    expect(programaDeAgenda("Xantolo 2026", "Plaza de Armas")).toBe("Xantolo 2026");
    expect(programaDeAgenda("Fotovisión 31", null)).toBe("Fotovisión 31");
    for (const p of ["Exposiciones", "Música", "Talleres", "Artes escénicas", "Octubre", "Agenda cultural de octubre", "Cartelera", "", null]) expect(programaDeAgenda(p, "Teatro de la Paz"), String(p)).toBeNull();
    expect(programaDeAgenda("Teatro de la Paz", "Teatro de la Paz")).toBeNull();
  });

  it("las fechas de un festival registrado, con tres días de margen (su periodo sale de los actos que ya tiene)", () => {
    const xantolo = { inicio: local("2026-10-23T10:00"), fin: local("2026-11-02T22:00") };
    expect(dentroDelFestival("2026-10-30", xantolo, ZONA)).toBe(true);
    expect(dentroDelFestival("2026-11-05", xantolo, ZONA)).toBe(true);
    expect(dentroDelFestival("2026-11-06", xantolo, ZONA)).toBe(false);
    expect(dentroDelFestival("2026-10-19", xantolo, ZONA)).toBe(false);
  });
});

describe("sesiones y series", () => {
  it("días seguidos o un taller se suman como sesiones; otra cadencia es una serie", () => {
    expect(diasSeguidos(["2026-10-30", "2026-10-31", "2026-11-01"])).toBe(true);
    expect(diasSeguidos(["2026-10-22", "2026-10-29"])).toBe(false);
    expect(comoSeAgrupa(["2026-10-30"], "2026-10-31", "puntual")).toBe("sesion");
    expect(comoSeAgrupa(["2026-10-22"], "2026-10-29", "puntual")).toBe("serie");
    expect(comoSeAgrupa(["2026-10-22", "2026-10-23"], "2026-10-29", "taller")).toBe("sesion");
    expect(cadaCuantos(["2026-10-26", "2026-11-02", "2026-11-09"])).toBe(7);
    expect(cadaCuantos(["2026-10-26", "2026-11-02", "2026-11-10"])).toBeNull();
  });
});

describe("lo que se lee de `datos` y lo que la bandeja puede decir (para OL-432)", () => {
  it("lo de antes se lee como un evento puntual, sin nada más", () => {
    expect(leerFormaEvento({ titulo: "Recital", inicio: local("2026-10-25T18:00") })).toEqual({
      clase: "puntual",
      marco: null,
      marcoPropuesto: null,
      programa: null,
      espera: null,
      actos: 0,
      sesiones: [],
      serie: null,
      termina: null,
      exposicion: null,
    });
    expect(etiquetaDeForma({ titulo: "Recital", inicio: local("2026-10-25T18:00") }, AHORA, ZONA)).toBeNull();
  });

  it("acto, festival, taller, días seguidos, serie y exposición", () => {
    expect(etiquetaDeForma({ marco: { id: UUID, titulo: "Xantolo 2026" } }, AHORA, ZONA)).toEqual({ que: "Acto de «Xantolo 2026»", detalle: null, espera: null });
    expect(etiquetaDeForma({ marco_propuesto: UUID, programa: "Otoño Sonoro", espera: "Se publica cuando aceptes el festival «Otoño Sonoro»." }, AHORA, ZONA)).toEqual({
      que: "Acto de «Otoño Sonoro»",
      detalle: null,
      espera: "Se publica cuando aceptes el festival «Otoño Sonoro».",
    });
    expect(etiquetaDeForma({ clase: "festival", actos: 6, inicio: local("2026-10-23T20:00"), termina: local("2026-11-02T23:00") }, AHORA, ZONA)).toMatchObject({ que: "Festival · 6 actos", detalle: expect.stringMatching(/23.*2 de nov/) });
    const taller = { clase: "taller", inicio: local("2026-10-22T17:00"), sesiones: ["22", "23", "24", "29"].map((d) => ({ inicio: local(`2026-10-${d}T17:00`), fin: local(`2026-10-${d}T19:00`) })) };
    expect(etiquetaDeForma(taller, AHORA, ZONA)).toMatchObject({ que: "Taller · 4 sesiones", detalle: expect.stringMatching(/^4 sesiones · .*oct · 5:00/) });
    const dias = { clase: "puntual", sesiones: ["30", "31"].map((d) => ({ inicio: local(`2026-10-${d}T19:00`) })) };
    expect(etiquetaDeForma(dias, AHORA, ZONA)?.que).toBe("Evento de 2 días");
    expect(etiquetaDeForma({ serie: { fechas: [local("2026-10-22T18:00"), local("2026-10-29T18:00")], cada: 7 } }, AHORA, ZONA)?.que).toBe("Serie · 2 fechas, cada semana");
    expect(etiquetaDeForma({ clase: "exposicion", exposicion: "Raíces", termina: local("2026-11-30T23:59") }, AHORA, ZONA)?.que).toMatch(/^Exposición «Raíces» · hasta el .*30 de nov/);
  });
});
