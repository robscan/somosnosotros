import { describe, expect, it } from "vitest";
import { cuantasSedes, descripcionDeNoche, formaDeActos, nocheDe, partirTitulo } from "./actosLeidos";
import type { ActoLeido } from "./eventos";

// OL-413: la lectura de carteles deja de partir un evento en «varios eventos».
const acto = (titulo: string, fecha: string, hora: string, lugar = "", lugarId: string | null = null): ActoLeido => ({ titulo, fecha, hora, lugar, lugarId });

describe("una noche en un lugar se junta", () => {
  it("Cumbiachella: cuatro sonidos el 30/10 de 8 pm a 2 am en Lunaria son un solo evento, con la alineación para «Quién»", () => {
    const actos = [acto("Sonido Satanás", "2026-10-30", "20:00", "Lunaria"), acto("Juan Escumbia", "2026-10-30", "22:00", "Lunaria"), acto("Sonido Blasfemo", "2026-10-31", "00:00", "Lunaria"), acto("Vinyl Box", "2026-10-31", "01:00")];
    expect(formaDeActos(actos, "Lunaria")).toEqual({ tipo: "junta", dia: "2026-10-30", hora: "20:00", nombres: ["Sonido Satanás", "Juan Escumbia", "Sonido Blasfemo", "Vinyl Box"], actividades: [] });
  });

  it("Trayectos Interactivos: cinco actividades a las 7 p.m. sin sede propia son un evento; las actividades y los nombres salen aparte", () => {
    const actos = ["Concierto: Disonáuta", "Cortometraje: El Ermitaño", "Exposición: Las brujas de la Cañada", "Charla: Charlemos", "Cócteles: Sorpresas"].map((t) => acto(t, "2026-10-17", "19:00"));
    expect(formaDeActos(actos)).toEqual({ tipo: "junta", dia: "2026-10-17", hora: "19:00", nombres: ["Disonáuta", "El Ermitaño", "Las brujas de la Cañada", "Charlemos"], actividades: ["Concierto", "Cortometraje", "Exposición", "Charla", "Cócteles"] });
  });

  it("«Lunaria» y «Foro Lunaria» son la misma sede; un acto sin sede es de la del cartel", () => {
    expect(cuantasSedes([acto("A", "2026-10-30", "20:00", "Lunaria"), acto("B", "2026-10-30", "21:00", "Foro Lunaria"), acto("C", "2026-10-30", "22:00")], "Lunaria")).toBe(1);
  });

  it("un solo acto es el propio evento", () => {
    expect(formaDeActos([acto("Sonido Satanás", "2026-10-30", "20:00")])).toMatchObject({ tipo: "junta", dia: "2026-10-30", hora: "20:00", nombres: ["Sonido Satanás"] });
  });

  it("sin actos no hay nada que decidir", () => {
    expect(formaDeActos([])).toBeNull();
  });
});

describe("lo que sí es un programa", () => {
  it("días distintos: programa", () => {
    expect(formaDeActos([acto("Inauguración", "2026-11-12", "19:00", "CC200"), acto("Función", "2026-11-14", "17:00", "CC200")])).toEqual({ tipo: "programa", sedes: 1 });
  });

  it("el mismo día en sedes distintas: programa", () => {
    expect(formaDeActos([acto("Escenario uno", "2026-11-12", "19:00", "Jardín de San Francisco"), acto("Escenario dos", "2026-11-12", "21:00", "Teatro de la Paz")])).toEqual({ tipo: "programa", sedes: 2 });
  });
});

describe("una obra en temporada", () => {
  it("el mismo título varios días seguidos en un lugar es un evento de varios días con la hora de cada uno", () => {
    const actos = [acto("Bodas de sangre", "2026-11-13", "20:00", "Teatro de la Paz"), acto("Bodas de sangre", "2026-11-14", "20:00", "Teatro de la Paz"), acto("Bodas de sangre", "2026-11-15", "18:00", "Teatro de la Paz")];
    expect(formaDeActos(actos, "Teatro de la Paz")).toEqual({ tipo: "temporada", dias: [{ dia: "2026-11-13", hora: "20:00" }, { dia: "2026-11-14", hora: "20:00" }, { dia: "2026-11-15", hora: "18:00" }] });
  });

  it("con días sueltos (no seguidos) todavía va como programa: pendiente anotado en la bitácora 444", () => {
    expect(formaDeActos([acto("Bodas de sangre", "2026-11-13", "20:00"), acto("Bodas de sangre", "2026-11-20", "20:00")])).toEqual({ tipo: "programa", sedes: 0 });
  });
});

describe("las piezas", () => {
  it("la madrugada es de la noche anterior", () => {
    expect(nocheDe("2026-10-31", "01:00")).toBe("2026-10-30");
    expect(nocheDe("2026-10-31", "20:00")).toBe("2026-10-31");
    expect(nocheDe("2026-10-31", "")).toBe("2026-10-31");
  });

  it("el título de un acto: actividad, nombre, las dos o ninguna", () => {
    expect(partirTitulo("Concierto: Disonáuta")).toEqual({ actividad: "Concierto", nombre: "Disonáuta" });
    expect(partirTitulo("Charla")).toEqual({ actividad: "Charla", nombre: null });
    expect(partirTitulo("Sonido Satanás")).toEqual({ actividad: null, nombre: "Sonido Satanás" });
    expect(partirTitulo("Cócteles | Sorpresas")).toEqual({ actividad: "Cócteles", nombre: null });
    expect(partirTitulo("Sorpresas")).toEqual({ actividad: null, nombre: null });
  });

  it("la descripción de una noche con varias actividades", () => {
    expect(descripcionDeNoche(["Concierto", "Cortometraje", "Exposición", "Charla", "Cócteles"])).toBe("Concierto, cortometraje, exposición, charla y cócteles.");
    expect(descripcionDeNoche(["Concierto", "Charla"], ["Charlemos"])).toBe("Concierto y charla: Charlemos.");
    expect(descripcionDeNoche([])).toBe("");
  });
});
