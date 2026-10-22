import { describe, expect, it } from "vitest";
import { SIN_PROPUESTAS, valoresDe, type EvidenciaBreve, type Puntajes } from "./showcase";
import { detalleArtista, efectoAlAceptar, esMotivoRechazo, lineaPorAprobar, MOTIVOS_RECHAZO, ordenarHallazgos, renglonPorAprobar, totalConTodo } from "./showcasePorAprobar";

const HOY = "2026-10-22";
const fijados = (x: Partial<Puntajes> = {}): Puntajes => ({ circulacion: null, obra: null, actividad: null, vinculo: null, ...x });
const prop = (n: 0 | 1 | 2) => ({ puntaje: n, motivo: "de la base" });
const ev = (x: Partial<EvidenciaBreve> & { titulo: string }): EvidenciaBreve => ({ senal: "obra", tipo: "obra", fecha: "2026-06-01", estado: "propuesta", ...x });
// Feleal: circulación 2 fijada a mano, obra 1 propuesta por un sencillo aceptado, actividad 2 y vínculo 2 propuestos: 7 de 8.
const SENCILLO = ev({ titulo: "Sencillo en plataformas", estado: "aceptada" });
const FELEAL = valoresDe(fijados({ circulacion: 2 }), { ...SIN_PROPUESTAS, obra: prop(1), actividad: prop(2), vinculo: prop(2) });

describe("lo que cambia al aceptar (OL-446)", () => {
  it("un premio sube la obra y el total, en verde, con lo que dice la línea de lo hecho", () => {
    const e = efectoAlAceptar(FELEAL, [SENCILLO], ev({ titulo: "Mención estatal", tipo: "premio" }), HOY);
    expect(e).toEqual({ sube: true, texto: "Si la aceptas: Obra 1 → 2 · total 7 → 8", corto: "Obra 1 → 2" });
  });

  it("no cambia: la señal está fijada a mano (aceptar no la suelta)", () => {
    const e = efectoAlAceptar(FELEAL, [SENCILLO], ev({ titulo: "Nota de su gira", senal: "circulacion", tipo: "prensa" }), HOY);
    expect(e).toEqual({ sube: false, texto: "No cambia el puntaje: Circulación está fijada a mano en 2", corto: null });
    const obraFija = valoresDe(fijados({ obra: 1 }), SIN_PROPUESTAS);
    expect(efectoAlAceptar(obraFija, [], ev({ titulo: "Premio", tipo: "premio" }), HOY).texto).toBe("No cambia el puntaje: Obra está fijada a mano en 1");
  });

  it("no cambia: otra obra igual no sube lo que ya está", () => {
    expect(efectoAlAceptar(FELEAL, [SENCILLO], ev({ titulo: "Disco" }), HOY).texto).toBe("No cambia el puntaje: Obra ya está en 1");
  });

  it("no cambia: circulación, actividad y vínculo salen de la base, no de las evidencias", () => {
    const v = valoresDe(fijados(), { ...SIN_PROPUESTAS, circulacion: prop(1) });
    expect(efectoAlAceptar(v, [], ev({ titulo: "Gira", senal: "circulacion", tipo: "presentacion" }), HOY).texto).toBe("No cambia el puntaje: Circulación se cuenta con sus eventos en la base");
    expect(efectoAlAceptar(v, [], ev({ titulo: "Perfil", senal: "actividad", tipo: "redes" }), HOY).texto).toBe("No cambia el puntaje: Actividad sale de sus lecturas de redes");
    expect(efectoAlAceptar(v, [], ev({ titulo: "Perfil", senal: "vinculo", tipo: "redes" }), HOY).texto).toBe("No cambia el puntaje: Vínculo sale de su ficha en la app");
  });

  it("de «sin datos» a un número: lo dice; si el total no sube, no va en verde", () => {
    const v = valoresDe(fijados(), SIN_PROPUESTAS);
    expect(efectoAlAceptar(v, [], ev({ titulo: "Obra reciente" }), HOY)).toEqual({ sube: true, texto: "Si la aceptas: Obra sin datos → 1 · total 0 → 1", corto: "Obra sin datos → 1" });
    expect(efectoAlAceptar(v, [], ev({ titulo: "Obra vieja", fecha: "2020-01-01" }), HOY)).toEqual({ sube: false, texto: "Si la aceptas: Obra sin datos → 0 · total 0 → 0", corto: "Obra sin datos → 0" });
  });

  it("con todo: el total si se acepta lo pendiente; primero lo que sube", () => {
    const premio = ev({ titulo: "Premio", tipo: "premio" });
    const nota = ev({ titulo: "Nota", senal: "circulacion", tipo: "prensa" });
    expect(totalConTodo(FELEAL, [SENCILLO], [nota, premio], HOY)).toBe(8);
    expect(totalConTodo(FELEAL, [SENCILLO], [nota], HOY)).toBe(7);
    expect(ordenarHallazgos([nota, premio], FELEAL, [SENCILLO], HOY).map((x) => x.titulo)).toEqual(["Premio", "Nota"]);
    expect(detalleArtista("Música", "Invitado", 7, 8)).toBe("Música · Invitado · 7 de 8 · con todo, 8");
    expect(detalleArtista("Música", "Invitado", 7, 7)).toBe("Música · Invitado · 7 de 8");
  });

  it("la línea de la pantalla y el renglón de la portada", () => {
    expect(lineaPorAprobar(26, 9, "ayer")).toBe("26 evidencias de 9 artistas · las trajo la rutina ayer. Solo cuenta lo que aceptas.");
    expect(lineaPorAprobar(1, 1, null)).toBe("1 evidencia de 1 artista. Solo cuenta lo que aceptas.");
    expect(lineaPorAprobar(0, 0, "hoy")).toBe("Todo decidido. Lo aceptado ya cuenta en su rúbrica.");
    expect(renglonPorAprobar({ n: 26, artistas: 9, ultima: "2026-10-21" }, HOY)).toEqual({
      corrida: "showcase-por-aprobar",
      tipo: "showcase",
      titulo: "Evidencias del showcase",
      detalle: "26 por aprobar · de 9 artistas, investigados ayer",
      n: 26,
      href: "/admin/showcase/por-aprobar",
    });
    expect(renglonPorAprobar({ n: 0, artistas: 0, ultima: null }, HOY)).toBeNull();
    expect(renglonPorAprobar(null, HOY)).toBeNull();
  });

  it("los motivos de un rechazo son los de la base", () => {
    expect(MOTIVOS_RECHAZO.map((m) => m.valor)).toEqual(["duplicado", "no_es_esta_persona", "no_relevante", "otro"]);
    expect(esMotivoRechazo("no_es_esta_persona")).toBe(true);
    expect(esMotivoRechazo("me cae mal")).toBe(false);
  });
});
