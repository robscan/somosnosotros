import { describe, expect, it } from "vitest";
import { bloquesHitos, presentacionArtista } from "./documentos";
import { resumirTuAnio, textoAlternativo } from "./tuAnio";
import { anioHito, claseHito, detalleHito, diaMesHito, etiquetaHito, hitosDelAnio, hitosPorAnio, ordenarHitos, resumenHitos, type Hito } from "./hitos";

const h = (titulo: string, tipo: Hito["tipo"], fecha: string | null, extra: Partial<Hito> = {}): Hito => ({ id: titulo, tipo, titulo, url: "https://cultura.example.org/x", fuente: null, fecha, ...extra });

describe("hitos (OL-445)", () => {
  it("la clase sale del tipo y del título: disco, libro, exposición, residencia y selección", () => {
    expect(claseHito(h("Premio Estatal de Composición", "premio", null))).toBe("premio");
    expect(claseHito(h("Residencia artística en Oaxaca", "beca", null))).toBe("residencia");
    expect(claseHito(h("Beca PECDA jóvenes creadores", "beca", null))).toBe("beca");
    expect(claseHito(h("Seleccionada en el Festival de Morelia", "presentacion", null))).toBe("seleccion");
    expect(claseHito(h("Disco «Altiplano» en Bandcamp", "obra", null))).toBe("disco");
    expect(claseHito(h("Su EP Fuego", "obra", null))).toBe("disco");
    expect(claseHito(h("Sencillo en plataformas", "obra", null))).toBe("obra");
    expect(claseHito(h("Poemario «Sal»", "obra", null))).toBe("libro");
    expect(claseHito(h("Exposición individual en el MAC", "obra", null))).toBe("exposicion");
    expect(claseHito(h("Mural en el centro", "obra", null))).toBe("obra");
    expect(claseHito(h("Concierto en Guadalajara", "presentacion", null))).toBe("presentacion");
    expect(claseHito(h("Entrevista en El Sol", "prensa", null))).toBe("prensa");
    expect(etiquetaHito(h("Seleccionado oficial", "obra", null))).toBe("Selección oficial");
  });

  it("orden: por año de lo más reciente a lo más viejo, sin fecha al final; en cada año premios y becas, luego obra, luego presentaciones y prensa", () => {
    const lista = [
      h("Concierto en Morelia", "presentacion", "2026-05-01"),
      h("Nota en La Jornada", "prensa", "2026-09-01"),
      h("Disco Altiplano", "obra", "2026-02-01"),
      h("Beca de creación", "beca", "2025-01-10"),
      h("Premio Estatal", "premio", "2026-11-20"),
      h("Sin fecha conocida", "premio", null),
      h("Otro premio", "premio", "2026-03-01"),
    ];
    expect(ordenarHitos(lista).map((x) => x.titulo)).toEqual(["Premio Estatal", "Otro premio", "Disco Altiplano", "Concierto en Morelia", "Nota en La Jornada", "Beca de creación", "Sin fecha conocida"]);
    expect(hitosPorAnio(lista).map((g) => [g.titulo, g.hitos.length])).toEqual([
      ["2026", 5],
      ["2025", 1],
      ["Sin fecha", 1],
    ]);
  });

  it("el año y los del año: sin fecha no cuenta en ninguno", () => {
    expect(anioHito({ fecha: "2026-03-14" })).toBe("2026");
    expect(anioHito({ fecha: null })).toBeNull();
    const lista = [h("A", "premio", "2026-01-01"), h("B", "obra", "2025-12-31"), h("C", "beca", null)];
    expect(hitosDelAnio(lista, "2026").map((x) => x.titulo)).toEqual(["A"]);
  });

  it("el resumen: «2 premios · 1 disco · 5 presentaciones», hasta cuatro clases (tres en «Tu año») y lo demás en «N más»", () => {
    const lista = [
      h("P1", "premio", null),
      h("P2", "premio", null),
      h("Disco X", "obra", null),
      ...[1, 2, 3, 4, 5].map((n) => h(`Concierto ${n}`, "presentacion", null)),
    ];
    expect(resumenHitos(lista)).toBe("2 premios · 1 disco · 5 presentaciones");
    const conPrensa = [...lista, h("Nota", "prensa", null), h("Otra nota", "prensa", null)];
    expect(resumenHitos(conPrensa)).toBe("2 premios · 1 disco · 5 presentaciones · 2 notas de prensa");
    expect(resumenHitos(conPrensa, 3)).toBe("2 premios · 1 disco · 5 presentaciones · 2 más");
    expect(resumenHitos([...conPrensa, h("Beca X", "beca", null)])).toBe("2 premios · 1 beca · 1 disco · 5 presentaciones · 2 más");
    expect(resumenHitos([h("Beca", "beca", null)])).toBe("1 beca");
    expect(resumenHitos([])).toBeNull();
  });

  it("el detalle: la fuente o el dominio, y el día", () => {
    expect(detalleHito({ fuente: "Secretaría de Cultura", url: "https://cultura.gob.mx/x", fecha: "2026-03-14" })).toBe("Secretaría de Cultura · 14 mar");
    expect(detalleHito({ fuente: null, url: "https://www.cultura.gob.mx/x", fecha: null })).toBe("cultura.gob.mx");
    expect(diaMesHito("2026-12-01")).toBe("1 dic");
  });
});

describe("los hitos en la presentación y en «Tu año» (OL-445)", () => {
  const lista = [h("Concierto en Morelia", "presentacion", "2026-05-01", { fuente: "Festival de Morelia" }), h("Premio Estatal", "premio", "2026-11-20"), h("Beca de creación", "beca", "2025-01-10")];

  it("el PDF suma «Reconocimientos y obra» tras la reseña: por año, premios primero, con la fuente; sin hitos, nada", () => {
    expect(bloquesHitos([])).toEqual([]);
    const b = bloquesHitos(lista);
    expect(b[0]).toEqual({ tipo: "rotulo", texto: "Reconocimientos y obra · 1 premio · 1 beca · 1 presentación" });
    expect(b.slice(1).map((x) => (x.tipo === "anio" ? x.texto : x.tipo === "fila" ? `${x.fila.cuando}: ${x.fila.titulo} (${x.fila.detalle})` : x.tipo))).toEqual([
      "2026",
      "Premio: Premio Estatal (cultura.example.org · 20 nov)",
      "Presentación: Concierto en Morelia (Festival de Morelia · 1 may)",
      "2025",
      "Beca: Beca de creación (cultura.example.org · 10 ene)",
    ]);
    const d = presentacionArtista({ artista: { id: "a", nombre: "Leo", descripcion: "Cantautor.", redes: [] }, pasados: [], proximos: [], hitos: lista, ahora: new Date("2026-12-01T12:00:00Z") });
    expect(d.bloques.map((x) => x.tipo).slice(0, 3)).toEqual(["rotulo", "resena", "rotulo"]);
    expect(d.bloques[2]).toMatchObject({ texto: expect.stringMatching(/^Reconocimientos y obra/) });
  });

  it("«Tu año» del artista cuenta los hitos con fecha de este año; los de otro año y la persona, no", () => {
    const ahora = new Date("2026-12-01T12:00:00Z");
    const r = resumirTuAnio({ tipo: "artista", id: "a", nombre: "Leo", foto: null, eventos: [], ahora, hitos: lista });
    expect(r.logros).toBe("1 premio · 1 presentación");
    expect(textoAlternativo(r)).toContain("Reconocimientos y obra: 1 premio · 1 presentación");
    expect("logros" in resumirTuAnio({ tipo: "artista", id: "a", nombre: "Leo", foto: null, eventos: [], ahora, hitos: [lista[2]] })).toBe(false);
    expect("logros" in resumirTuAnio({ tipo: "persona", id: "a", nombre: "Leo", foto: null, eventos: [], ahora, hitos: lista })).toBe(false);
  });
});
