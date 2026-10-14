import { describe, expect, it } from "vitest";
import type { ArtistaDelEvento, EventoPasado, LugarDelEvento } from "./historialFichas";
import { respaldoDe } from "./portadasSistema";
import { cifra, COLOR_PERSONA, delAnio, diaMes, hayTuAnio, hrefTuAnio, hrefVistaTuAnio, nombreTuAnio, resumirTuAnio, textoAlternativo, textoDesde, versionTuAnio, zonaDelAnio } from "./tuAnio";

/** «Tu año» (OL-394): qué cifras dice la imagen por sujeto, «lo más» con sus caídas, el periodo y lo que no se pinta. */

const ZONA = "America/Mexico_City";
const AHORA = new Date("2026-10-12T20:00:00Z");
const MAC: LugarDelEvento = { id: "l-mac", slug: "mac", nombre: "Museo de Arte Contemporáneo (MAC)", portada: null };
const ACHE: LugarDelEvento = { id: "l-ache", slug: "ache", nombre: "ACHE Galería", portada: null };
const CCUB: LugarDelEvento = { id: "l-ccub", slug: "ccub", nombre: "Centro Cultural Universitario Bicentenario", portada: null };
const art = (id: string, nombre = id): ArtistaDelEvento => ({ id, slug: id, nombre, foto: null });

let n = 0;
function ev(inicio: string, lugar: LugarDelEvento | null, artistas: ArtistaDelEvento[] = [], van = 0): EventoPasado {
  n++;
  return { id: `e${n}`, slug: `e${n}`, titulo: `Evento ${n}`, inicio, fin: null, zona: ZONA, imagen: null, cancelado: false, lugar_id: lugar?.id ?? null, sitio_texto: lugar ? null : "Jardín Colón", sitio_direccion: null, sitio_reservado: false, lugar, festival: null, artistas, van };
}

describe("lo cancelado (OL-391)", () => {
  it("no cuenta en «Tu año»", () => {
    const lista = [ev("2026-10-01T02:00:00Z", MAC), { ...ev("2026-09-17T02:00:00Z", ACHE), cancelado: true }];
    const r = resumirTuAnio({ tipo: "persona", id: "p1", nombre: "Ana", foto: null, eventos: lista, ahora: AHORA, zona: ZONA });
    expect(r.protagonista.n).toBe(1);
  });
});

describe("el periodo (P año)", () => {
  it("solo entra lo que empezó este año, en la zona de la ficha, del más viejo al más reciente", () => {
    const lista = [ev("2026-10-01T02:00:00Z", MAC), ev("2025-12-20T02:00:00Z", MAC), ev("2026-09-17T02:00:00Z", ACHE)];
    expect(delAnio(lista, AHORA, ZONA).map((e) => e.inicio)).toEqual(["2026-09-17T02:00:00Z", "2026-10-01T02:00:00Z"]);
  });
  it("la noche del 31 de diciembre en San Luis es del año que acaba, aunque en UTC ya sea enero", () => {
    expect(delAnio([ev("2026-01-01T03:00:00Z", MAC)], AHORA, ZONA)).toHaveLength(0);
    expect(delAnio([ev("2026-01-01T07:00:00Z", MAC)], AHORA, ZONA)).toHaveLength(1);
  });
  it("«del 17 sep al 12 oct»: del primer día con algo a hoy; sin nada, «todavía sin nada»", () => {
    expect(textoDesde([ev("2026-10-01T02:00:00Z", MAC), ev("2026-09-17T19:00:00Z", MAC)], AHORA, ZONA)).toBe("del 17 sep al 12 oct");
    expect(textoDesde([], AHORA, ZONA)).toBe("todavía sin nada");
    expect(diaMes("2026-09-17T19:00:00Z", ZONA)).toBe("17 sep");
  });
  it("el botón sale solo con algo pasado de este año", () => {
    expect(hayTuAnio([], AHORA)).toBe(false);
    expect(hayTuAnio([ev("2025-11-01T02:00:00Z", MAC)], AHORA)).toBe(false);
    expect(hayTuAnio([ev("2026-02-01T02:00:00Z", MAC)], AHORA)).toBe(true);
  });
  it("la zona: la de la ficha, si no la del evento más reciente, si no la de San Luis", () => {
    expect(zonaDelAnio([], "Europe/Madrid")).toBe("Europe/Madrid");
    expect(zonaDelAnio([{ ...ev("2026-01-01T00:00:00Z", MAC), zona: "Europe/Madrid" }, ev("2025-01-01T00:00:00Z", MAC)])).toBe("Europe/Madrid");
    expect(zonaDelAnio([])).toBe(ZONA);
  });
});

describe("la persona: eventos, lugares y artistas", () => {
  const base = { tipo: "persona" as const, id: "p1", nombre: "Marcos Ledesma", foto: null, ahora: AHORA, zona: ZONA };

  it("cifras y «Donde más fuiste» con «N veces» si un lugar repite", () => {
    const eventos = [ev("2026-09-17T02:00:00Z", MAC, [art("a1")]), ev("2026-09-20T02:00:00Z", MAC, [art("a2")]), ev("2026-10-01T02:00:00Z", ACHE, [art("a1"), art("a3")]), ev("2026-10-05T02:00:00Z", null)];
    const r = resumirTuAnio({ ...base, eventos });
    expect(r.periodo).toEqual({ titulo: "Tu 2026", desde: "del 16 sep al 12 oct" });
    expect(r.protagonista).toEqual({ n: 4, frase: "eventos a los que fuiste" });
    // Lugares con ficha (el jardín no cuenta) y artistas distintos.
    expect(r.secundarios).toEqual([
      { n: 2, palabra: "lugares" },
      { n: 3, palabra: "artistas" },
    ]);
    expect(r.mas).toEqual({ que: "Donde más fuiste", quien: "Museo de Arte Contemporáneo (MAC)", cuantas: "2 veces" });
    expect(r.color).toBe(COLOR_PERSONA);
    expect(r.quien).toEqual({ nombre: "Marcos Ledesma", foto: null, tipo: "persona" });
  });

  it("sin lugar que repita, «A quien más viste»", () => {
    const r = resumirTuAnio({ ...base, eventos: [ev("2026-09-17T02:00:00Z", MAC, [art("a1", "Feleal")]), ev("2026-10-01T02:00:00Z", ACHE, [art("a1", "Feleal")])] });
    expect(r.mas).toEqual({ que: "A quien más viste", quien: "Feleal", cuantas: "2 veces" });
  });

  it("sin lugar ni artista que repita, «El mes más movido» (si hay más de un mes y el ganador tiene más de uno)", () => {
    const r = resumirTuAnio({ ...base, eventos: [ev("2026-09-17T18:00:00Z", MAC), ev("2026-10-01T18:00:00Z", ACHE), ev("2026-10-05T18:00:00Z", CCUB)] });
    expect(r.mas).toEqual({ que: "El mes más movido", quien: "Octubre", cuantas: "2 eventos" });
  });

  it("sin nada que destacar no hay «lo más»; una cifra en 0 no se pinta; uno solo va en singular", () => {
    const r = resumirTuAnio({ ...base, eventos: [ev("2026-10-01T02:00:00Z", null)] });
    expect(r.protagonista).toEqual({ n: 1, frase: "evento al que fuiste" });
    expect(r.secundarios).toEqual([]);
    expect(r.mas).toBeNull();
    const uno = resumirTuAnio({ ...base, eventos: [ev("2026-10-01T02:00:00Z", MAC, [art("a1")])] });
    expect(uno.secundarios).toEqual([
      { n: 1, palabra: "lugar" },
      { n: 1, palabra: "artista" },
    ]);
  });

  it("lo del año pasado no cuenta", () => {
    const r = resumirTuAnio({ ...base, eventos: [ev("2025-10-01T02:00:00Z", MAC), ev("2026-10-01T02:00:00Z", ACHE)] });
    expect(r.protagonista.n).toBe(1);
    expect(r.secundarios).toEqual([{ n: 1, palabra: "lugar" }]);
  });
});

describe("el artista: fechas, lugares y cuántos fueron", () => {
  const base = { tipo: "artista" as const, id: "a-leo", nombre: "Leo Traeger", foto: null, ahora: AHORA, zona: ZONA };
  const leo = art("a-leo", "Leo Traeger");

  it("«fechas en 2 lugares», los que fueron y «Donde más tocó»", () => {
    const r = resumirTuAnio({ ...base, eventos: [ev("2026-10-06T18:00:00Z", CCUB, [leo], 2), ev("2026-10-08T02:00:00Z", CCUB, [leo], 1), ev("2026-10-07T02:00:00Z", MAC, [leo])] });
    expect(r.protagonista).toEqual({ n: 3, frase: "fechas en 2 lugares" });
    expect(r.secundarios).toEqual([
      { n: 2, palabra: "lugares" },
      { n: 3, palabra: "fueron" },
    ]);
    expect(r.mas).toEqual({ que: "Donde más tocó", quien: CCUB.nombre, cuantas: "2 veces" });
    expect(r.color).toBe(respaldoDe("a-leo"));
  });

  it("sin lugar que repita, «Con quien más» (nunca él mismo); nadie fue: no se pinta", () => {
    const r = resumirTuAnio({ ...base, eventos: [ev("2026-10-06T18:00:00Z", CCUB, [leo, art("o", "Oscar Formacio")]), ev("2026-10-07T02:00:00Z", MAC, [leo, art("o", "Oscar Formacio")])] });
    expect(r.mas).toEqual({ que: "Con quien más", quien: "Oscar Formacio", cuantas: "2 veces" });
    expect(r.secundarios).toEqual([{ n: 2, palabra: "lugares" }]);
  });

  it("una fecha en un sitio sin ficha: «fecha», sin lugares", () => {
    const r = resumirTuAnio({ ...base, eventos: [ev("2026-10-06T18:00:00Z", null, [leo], 1)] });
    expect(r.protagonista).toEqual({ n: 1, frase: "fecha" });
    expect(r.secundarios).toEqual([{ n: 1, palabra: "fue" }]);
    expect(r.mas).toBeNull();
  });

  it("el mes más movido, en fechas", () => {
    const r = resumirTuAnio({ ...base, eventos: [ev("2026-09-06T18:00:00Z", MAC, [leo]), ev("2026-10-06T18:00:00Z", CCUB, [leo]), ev("2026-10-09T18:00:00Z", ACHE, [leo])] });
    expect(r.mas).toEqual({ que: "El mes más movido", quien: "Octubre", cuantas: "2 fechas" });
  });
});

describe("el lugar: eventos, artistas y cuántos fueron", () => {
  const base = { tipo: "lugar" as const, id: "l-ccub", nombre: CCUB.nombre, foto: null, ahora: AHORA, zona: ZONA };

  it("«eventos con 11 artistas» y «Quien más pasó»", () => {
    const daniel = art("dgc", "Daniel Giménez Cacho");
    const r = resumirTuAnio({ ...base, eventos: [ev("2026-10-05T18:00:00Z", CCUB, [daniel, art("x")], 2), ev("2026-10-06T18:00:00Z", CCUB, [daniel])] });
    expect(r.protagonista).toEqual({ n: 2, frase: "eventos con 2 artistas" });
    expect(r.secundarios).toEqual([
      { n: 2, palabra: "artistas" },
      { n: 2, palabra: "fueron" },
    ]);
    expect(r.mas).toEqual({ que: "Quien más pasó", quien: "Daniel Giménez Cacho", cuantas: "2 veces" });
  });

  it("sin artistas: «eventos», solo los que fueron, y si no repite nadie, el mes", () => {
    const r = resumirTuAnio({ ...base, eventos: [ev("2026-09-05T18:00:00Z", CCUB), ev("2026-10-05T18:00:00Z", CCUB, [], 1), ev("2026-10-06T18:00:00Z", CCUB)] });
    expect(r.protagonista).toEqual({ n: 3, frase: "eventos" });
    expect(r.secundarios).toEqual([{ n: 1, palabra: "fue" }]);
    expect(r.mas).toEqual({ que: "El mes más movido", quien: "Octubre", cuantas: "2 eventos" });
  });

  it("un color guardado gana al de respaldo", () => {
    expect(resumirTuAnio({ ...base, eventos: [], color: "#0077b6" }).color).toBe("#0077b6");
  });
});

describe("direcciones, archivo y lo demás", () => {
  it("la imagen y la vista previa", () => {
    expect(hrefTuAnio({ que: "persona", id: "ignorado", ancho: 720 })).toBe("/api/tu-anio?que=persona&ancho=720");
    expect(hrefTuAnio({ que: "artista", id: "a1", ancho: 1080, descarga: true, v: "x" })).toBe("/api/tu-anio?que=artista&id=a1&ancho=1080&descarga=1&v=x");
    expect(hrefVistaTuAnio("persona")).toBe("/tu-anio");
    expect(hrefVistaTuAnio("lugar", "/lugares/ache-galeria")).toBe("/lugares/ache-galeria/tu-anio");
  });
  it("el nombre del archivo y las cifras", () => {
    expect(nombreTuAnio("2026")).toBe("tu-2026.jpg");
    expect(nombreTuAnio("2026", "Feleal!")).toBe("tu-2026-feleal.jpg");
    expect(cifra(1000)).toBe("1000");
    expect(cifra(12500)).toBe("12,500");
  });
  it("la versión cambia si cambia lo que dice; el texto alternativo lo dice todo", () => {
    const r = resumirTuAnio({ tipo: "persona", id: "p", nombre: "Ana", foto: null, ahora: AHORA, zona: ZONA, eventos: [ev("2026-10-01T02:00:00Z", MAC), ev("2026-10-02T02:00:00Z", MAC)] });
    expect(versionTuAnio(r)).not.toBe(versionTuAnio({ ...r, protagonista: { ...r.protagonista, n: 3 } }));
    expect(textoAlternativo(r)).toBe("Tu 2026 de Ana, del 30 sep al 12 oct: 2 eventos a los que fuiste. 1 lugar. Donde más fuiste: Museo de Arte Contemporáneo (MAC), 2 veces.");
  });
});
