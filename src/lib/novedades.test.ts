import { describe, expect, it } from "vitest";
import { agruparNovedades, esNueva, queJuntos, tituloDia, type Novedad } from "./novedades";

const AHORA = new Date("2026-09-15T18:00:00Z"); // martes 15, 12:00 en la ciudad
const n = (clave: string, fecha: string, nueva = false): Novedad => ({ clave, tipo: "nuevo", que: "Nuevo", eventoId: "e", titulo: "T", cuando: "", fecha, nueva });

describe("novedades", () => {
  it("titula por cuándo pasó: Hoy, Ayer, Esta semana, Hace más", () => {
    expect(tituloDia("2026-09-15T14:00:00Z", AHORA)).toBe("Hoy");
    expect(tituloDia("2026-09-14T20:00:00Z", AHORA)).toBe("Ayer");
    expect(tituloDia("2026-09-11T20:00:00Z", AHORA)).toBe("Esta semana");
    expect(tituloDia("2026-09-03T20:00:00Z", AHORA)).toBe("Hace más");
  });
  it("agrupa de más reciente a más antigua", () => {
    const g = agruparNovedades([n("a", "2026-09-03T20:00:00Z"), n("b", "2026-09-15T14:00:00Z"), n("c", "2026-09-15T10:00:00Z")], AHORA);
    expect(g.map((x) => x.titulo)).toEqual(["Hoy", "Hace más"]);
    expect(g[0].novedades.map((x) => x.clave)).toEqual(["b", "c"]);
  });
  it("escribe quién más va y sabe qué es nuevo", () => {
    expect(queJuntos(["Ana", "Luis"])).toBe("Van a lo mismo · Ana y Luis");
    expect(queJuntos(["Ana", "Luis", "Pepe", "Mar"])).toBe("Van a lo mismo · Ana, Luis y 2 más");
    expect(esNueva("2026-09-15T14:00:00Z", null)).toBe(true);
    expect(esNueva("2026-09-15T14:00:00Z", "2026-09-15T15:00:00Z")).toBe(false);
  });
});
