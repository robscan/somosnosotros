import { describe, expect, it } from "vitest";
import { estadosInvestigacion, filtrarCandidatos, hechosDe, leerVista, ultimaPublicacionDe, type Candidato } from "./showcase";
import {
  BLOQUES,
  cuantosCon,
  faltaNombreGrupo,
  filtrosPuestos,
  grupoPuesto,
  leerFiltros,
  mismosFiltros,
  nombreGrupo,
  nPuestos,
  opcionesConCuenta,
  pasa,
  resumenFiltros,
  SIN_FILTROS,
  textoPuesto,
  type Filtros,
  type Hechos,
} from "./showcaseFiltros";

const HOY = "2026-10-22";
const f = (x: Partial<Filtros>): Filtros => ({ ...SIN_FILTROS, ...x });
const h = (x: Partial<Hechos> & { id: string }): Hechos => ({
  nombre: x.id,
  disciplina: "musica",
  estado: "candidato",
  suma: 0,
  reclamada: false,
  eventos: 0,
  foros: 0,
  festivales: 0,
  tipo: "solista",
  ultima: null,
  inv: "nunca",
  revisar: 0,
  ...x,
});
const LISTA: Hechos[] = [
  h({ id: "Tecolotes", suma: 7, reclamada: true, eventos: 6, foros: 4, festivales: 1, tipo: "grupo", ultima: "2026-10-17", inv: "reciente", revisar: 3, estado: "revisado" }),
  h({ id: "Feleal", suma: 7, reclamada: true, eventos: 4, foros: 3, festivales: 1, ultima: "2026-10-01", inv: "reciente", revisar: 2, estado: "invitado" }),
  h({ id: "Itzel", disciplina: "danza", suma: 6, eventos: 2, foros: 2, ultima: "2026-08-01", inv: "viejo" }),
  h({ id: "Orquesta", suma: 4, reclamada: true, eventos: 1, foros: 1, tipo: "colectivo", ultima: "2026-05-01" }),
  h({ id: "Rocío", disciplina: "teatro", suma: 2 }),
];
const nombres = (x: Filtros, q: string | null = null) => LISTA.filter((y) => pasa(y, x, HOY, q)).map((y) => y.id);

describe("los filtros del Showcase (OL-446)", () => {
  it("no hay «Origen»: el founder lo quitó (22 de octubre)", () => {
    expect(BLOQUES.map((b) => b.clave)).toEqual(["puntaje", "actividad", "cuenta", "circ", "disciplina", "estado", "inv", "tipo"]);
    expect(BLOQUES.filter((b) => b.mas).map((b) => b.rotulo)).toEqual(["Estado", "Investigación", "Solista o grupo"]);
  });

  it("cada bloque filtra y se combinan con «y»", () => {
    expect(nombres(f({ puntaje: 6 }))).toEqual(["Tecolotes", "Feleal", "Itzel"]);
    expect(nombres(f({ actividad: "15" }))).toEqual(["Tecolotes"]);
    expect(nombres(f({ actividad: "30" }))).toEqual(["Tecolotes", "Feleal"]);
    expect(nombres(f({ actividad: "90" }))).toEqual(["Tecolotes", "Feleal", "Itzel"]);
    expect(nombres(f({ actividad: "sin" }))).toEqual(["Orquesta", "Rocío"]);
    expect(nombres(f({ cuenta: "con" }))).toEqual(["Tecolotes", "Feleal", "Orquesta"]);
    expect(nombres(f({ cuenta: "sin" }))).toEqual(["Itzel", "Rocío"]);
    expect(nombres(f({ circ: "eventos" }))).toEqual(["Tecolotes", "Feleal", "Itzel", "Orquesta"]);
    expect(nombres(f({ circ: "foros4" }))).toEqual(["Tecolotes"]);
    expect(nombres(f({ circ: "festival" }))).toEqual(["Tecolotes", "Feleal"]);
    expect(nombres(f({ estado: "invitado" }))).toEqual(["Feleal"]);
    expect(nombres(f({ inv: "nunca" }))).toEqual(["Orquesta", "Rocío"]);
    expect(nombres(f({ inv: "viejo" }))).toEqual(["Itzel"]);
    expect(nombres(f({ inv: "revisar" }))).toEqual(["Tecolotes", "Feleal"]);
    expect(nombres(f({ tipo: "grupo" }))).toEqual(["Tecolotes", "Orquesta"]);
    expect(nombres(f({ tipo: "solista" }))).toEqual(["Feleal", "Itzel", "Rocío"]);
    expect(nombres(f({ disciplina: "musica", puntaje: 4, cuenta: "con" }))).toEqual(["Tecolotes", "Feleal", "Orquesta"]);
    expect(nombres(f({ disciplina: "musica", puntaje: 4, actividad: "15" }))).toEqual(["Tecolotes"]);
    expect(nombres(SIN_FILTROS, "ROCIO")).toEqual(["Rocío"]);
  });

  it("sin investigaciones leídas, «Investigación» no deja fuera a nadie", () => {
    const sinLeer = LISTA.map((x) => ({ ...x, inv: null }));
    expect(sinLeer.filter((x) => pasa(x, f({ inv: "nunca" }), HOY)).length).toBe(5);
  });

  it("cada chip dice cuántos quedarían con lo demás puesto, y los que darían 0 se esconden", () => {
    const puesto = f({ disciplina: "musica" });
    expect(cuantosCon(LISTA, puesto, "puntaje", 5, HOY)).toBe(2);
    const actividad = opcionesConCuenta(LISTA, puesto, "actividad", HOY);
    expect(actividad.map((o) => [o.etiqueta, o.n])).toEqual([
      ["Cualquiera", 3],
      ["Publicó en 15 días", 1],
      ["En 30 días", 2],
      ["En 90 días", 2],
      ["Sin publicar en 90 días", 1],
    ]);
    // Danza no tiene a nadie con 4 foros: el chip se esconde; «Cualquiera» siempre se ve.
    const circ = opcionesConCuenta(LISTA, f({ disciplina: "danza" }), "circ", HOY);
    expect(circ.map((o) => o.valor)).toEqual(["", "eventos", "foros2"]);
    // El que está puesto se ve aunque dé 0 (si no, no se podría cambiar).
    const conCero = opcionesConCuenta(LISTA, f({ disciplina: "danza", circ: "foros4" }), "circ", HOY);
    expect(conCero.find((o) => o.valor === "foros4")).toMatchObject({ n: 0, activo: true });
    // La disciplina cuenta con lo demás puesto.
    expect(opcionesConCuenta(LISTA, f({ puntaje: 6 }), "disciplina", HOY).map((o) => [o.valor, o.n])).toEqual([
      ["todas", 3],
      ["musica", 2],
      ["danza", 1],
    ]);
  });

  it("lo puesto en palabras, con su ✕, y el resumen del grupo", () => {
    const x = f({ puntaje: 4, actividad: "15", disciplina: "musica" });
    expect(nPuestos(x)).toBe(3);
    expect(textoPuesto(x, "puntaje")).toBe("4 puntos o más");
    expect(textoPuesto(f({ actividad: "30" }), "actividad")).toBe("Publicó en 30 días");
    expect(textoPuesto(f({ inv: "viejo" }), "inv")).toBe("Investigado hace más de 30 días");
    expect(resumenFiltros(x)).toBe("4 puntos o más · Publicó en 15 días · Música");
  });

  it("el sistema propone el nombre del grupo con lo puesto", () => {
    expect(nombreGrupo(f({ disciplina: "musica", cuenta: "con", puntaje: 4 }))).toBe("Música con cuenta, 4+");
    expect(nombreGrupo(f({ disciplina: "musica", actividad: "15", puntaje: 4 }))).toBe("Música activos en 15 días, 4+");
    expect(nombreGrupo(f({ puntaje: 5 }))).toBe("Artistas, 5+");
    expect(nombreGrupo(f({ inv: "nunca", estado: "candidato" }))).toBe("Artistas candidatos, sin investigar");
    expect(nombreGrupo(f({ tipo: "grupo", circ: "festival" }))).toBe("Grupos con festival");
    expect(faltaNombreGrupo("  ")).toBe("Falta el nombre");
    expect(faltaNombreGrupo("x".repeat(81))).toBe("Hasta 80 letras");
    expect(faltaNombreGrupo("Música activa")).toBeNull();
  });

  it("un grupo guarda los filtros (no a las personas) y se reconoce puesto", () => {
    const x = f({ disciplina: "musica", cuenta: "con", puntaje: 4 });
    expect(filtrosPuestos(x)).toEqual({ puntaje: 4, cuenta: "con", disciplina: "musica" });
    // Lo guardado se vuelve a leer igual (de la base llega como números o cadenas).
    expect(mismosFiltros(leerFiltros({ puntaje: "4", cuenta: "con", disciplina: "musica" }), x)).toBe(true);
    expect(leerFiltros({ puntaje: 9, origen: "capo" } as Record<string, unknown>)).toEqual(SIN_FILTROS);
    const grupos = [{ id: "g1", nombre: "Música con cuenta, 4+", filtros: x }];
    expect(grupoPuesto(grupos, x)?.nombre).toBe("Música con cuenta, 4+");
    expect(grupoPuesto(grupos, f({ disciplina: "musica" }))).toBeNull();
    expect(grupoPuesto([{ id: "g0", nombre: "Todo", filtros: SIN_FILTROS }], SIN_FILTROS)).toBeNull();
    // Quien cumpla el filtro después entra solo: el grupo no tiene lista de personas.
    const nuevo = h({ id: "Nueva", suma: 5, reclamada: true });
    expect(pasa(nuevo, grupos[0].filtros, HOY)).toBe(true);
  });
});

describe("lo que el candidato trae para filtrar (OL-446)", () => {
  it("la última publicación en cualquier red y el estado de su investigación", () => {
    expect(
      ultimaPublicacionDe([
        { red: "instagram", seguidores: 10, publicaciones: 1, ultima_publicacion: "2026-09-01", leido_en: "2026-10-01T00:00:00Z" },
        { red: "facebook", seguidores: 1, publicaciones: 1, ultima_publicacion: "2026-10-05", leido_en: "2026-10-06T00:00:00Z" },
      ]),
    ).toBe("2026-10-05");
    expect(ultimaPublicacionDe([])).toBeNull();
    const ahora = new Date("2026-10-22T12:00:00Z");
    const m = estadosInvestigacion([{ artista_id: "c", estado: "corriendo" }], { a: "2026-10-20T00:00:00Z", b: "2026-08-01T00:00:00Z", c: "2026-01-01T00:00:00Z" }, ahora);
    expect(Object.fromEntries(m)).toEqual({ a: "reciente", b: "viejo", c: "reciente" });
  });

  it("filtrar candidatos con la vista de la URL y lo que se sabe de sus investigaciones", () => {
    const base = { slug: "x", ciudad: "SLP", foto: null, instagram: null, marcado: true, valores: {} as Candidato["valores"], nota: null, eventos: 0, foros: 0, festivales: 0, programadoPor: [], redes: null, tipo: "solista", ultimaPublicacion: null } as const;
    const lista: Candidato[] = [
      { ...base, id: "a", nombre: "A", disciplina: "musica", estado: "candidato", suma: 6, reclamada: true },
      { ...base, id: "b", nombre: "B", disciplina: "musica", estado: "candidato", suma: 2, reclamada: false },
    ];
    const vista = leerVista({ puntaje: "5", inv: "nunca" });
    const ctx = { hoy: HOY, investigacion: new Map([["b", "reciente" as const]]), porRevisar: {} };
    expect(filtrarCandidatos(lista, vista, ctx).map((c) => c.id)).toEqual(["a"]);
    expect(hechosDe(lista[1], ctx).inv).toBe("reciente");
    expect(hechosDe(lista[0], ctx).inv).toBe("nunca");
    expect(hechosDe(lista[0]).inv).toBeNull();
  });
});
