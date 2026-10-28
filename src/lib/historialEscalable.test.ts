import { describe, expect, it } from "vitest";
import { aniosDeFilas, artistasDelHistorial, filasPasadas, lugaresDeTrayectoria, MINIMO_VER_LOS, notaPresencias, TANDA_HISTORIAL, tandaDelAnio, textoVeces, TOPE_CARRIL, type EventoPasado } from "./historialFichas";

/**
 * La sección escalable del historial de un lugar y la trayectoria de un artista (OL-473; prototipo firmado `historial-escalable.html`, bitácora
 * 501, «F1 · L1 · A1»): los renglones ya hechos en el servidor, un chip por año con su cuenta, ese año por mes de 20 en 20, la línea de la hoja
 * «Ver los N» y los datos del renglón de Artistas o de Lugares de cada uno.
 */

const ZONA = "America/Mexico_City";
const LEO = { id: "a-leo", slug: "leo-traeger", nombre: "Leo Traeger", foto: "/leo.jpg", disciplina: "musica" as const, detalle: "guitarra", tipo: "solista" as const };
const ANA = { id: "a-ana", slug: null, nombre: "Ana", foto: null };
const MUSEO = { id: "l-museo", slug: "museo", nombre: "Museo", portada: "/museo.jpg", tipo: "museo", direccion: "Calzada de Guadalupe 705, Centro", privado: false };

function evento(id: string, inicio: string, extra: Partial<EventoPasado> = {}): EventoPasado {
  return { id, slug: id, titulo: `Evento ${id}`, inicio, fin: null, zona: ZONA, imagen: null, lugar_id: null, sitio_texto: null, sitio_direccion: null, sitio_reservado: false, lugar: null, festival: null, artistas: [], van: 0, cancelado: false, ...extra };
}

/** `n` eventos de un año, uno por día desde el 28 de diciembre hacia atrás (para que caigan en varios meses). */
function delAnio(anio: number, n: number, prefijo = "e"): EventoPasado[] {
  return Array.from({ length: n }, (_, i) => evento(`${prefijo}${anio}-${String(i).padStart(3, "0")}`, new Date(Date.UTC(anio, 11, 28, 20) - i * 3 * 86400000).toISOString()));
}

describe("los renglones pasados, hechos en el servidor (OL-473)", () => {
  it("lo más reciente primero, con su año y su mes en la zona del evento", () => {
    // El 1 de noviembre a la 1:00 UTC aún es 31 de octubre en San Luis Potosí: cuenta en octubre.
    const filas = filasPasadas([evento("a", "2025-03-01T20:00:00Z"), evento("b", "2026-11-01T01:00:00Z"), evento("c", "2026-10-09T01:00:00Z")]);
    expect(filas.map((f) => [f.id, f.anio, f.mes, f.tituloMes])).toEqual([
      ["b", "2026", "2026-10", "Octubre de 2026"],
      ["c", "2026", "2026-10", "Octubre de 2026"],
      ["a", "2025", "2025-03", "Marzo de 2025"],
    ]);
  });

  it("en el lugar: quiénes de cada evento, sin sitio; el festival y «2 fueron» se conservan", () => {
    const [f] = filasPasadas([evento("a", "2026-10-09T01:00:00Z", { artistas: [LEO, ANA], festival: "FestiVal", van: 2, imagen: "/cartel.jpg" })]);
    expect(f).toMatchObject({ href: "/eventos/a", foto: "/cartel.jpg", titulo: "Evento a", sitio: null, festival: "FestiVal", gente: "Leo Traeger, Ana", van: 2, cancelado: false });
    expect(f.cuando).toBe("jue 8 · 7:00 pm");
  });

  it("en la trayectoria: el sitio de cada fecha y «con» los demás artistas", () => {
    const [f, g] = filasPasadas([evento("a", "2026-10-09T01:00:00Z", { artistas: [LEO, ANA], lugar_id: MUSEO.id, lugar: MUSEO }), evento("b", "2026-10-08T01:00:00Z", { artistas: [LEO], sitio_texto: "Jardín Colón" })], LEO.id);
    expect([f.sitio, f.gente]).toEqual(["Museo", "con Ana"]);
    expect([g.sitio, g.gente]).toEqual(["Jardín Colón", null]);
  });

  it("la miniatura es su cartel o nada (el símbolo SN), nunca la foto del lugar", () => {
    expect(filasPasadas([evento("a", "2026-10-09T01:00:00Z", { lugar_id: MUSEO.id, lugar: MUSEO })])[0].foto).toBeNull();
  });
});

describe("L1: un chip por año y ese año de 20 en 20 (OL-473)", () => {
  const filas = filasPasadas([...delAnio(2026, 48), ...delAnio(2025, 26), ...delAnio(2024, 10)]);

  it("los años del más reciente al más viejo, con cuántos renglones tiene cada uno (los cancelados también: se quedan tachados)", () => {
    const conCancelado = filasPasadas([...delAnio(2025, 2), evento("x", "2025-06-01T20:00:00Z", { cancelado: true })]);
    expect(aniosDeFilas(filas)).toEqual([
      { anio: "2026", n: 48 },
      { anio: "2025", n: 26 },
      { anio: "2024", n: 10 },
    ]);
    expect(aniosDeFilas(conCancelado)).toEqual([{ anio: "2025", n: 3 }]);
    expect(aniosDeFilas([])).toEqual([]);
  });

  it("la primera tanda: 20 renglones del año, por mes, y cuántos quedan", () => {
    const t = tandaDelAnio(filas, "2026", TANDA_HISTORIAL);
    expect(TANDA_HISTORIAL).toBe(20);
    expect(t.vistos).toBe(20);
    expect(t.quedan).toBe(28);
    expect(t.meses.flatMap((m) => m.filas)).toHaveLength(20);
    expect(t.meses.every((m) => m.filas.every((f) => f.anio === "2026" && f.mes === m.mes))).toBe(true);
    // Diciembre primero (del 28 hacia atrás), con su título.
    expect(t.meses[0]).toMatchObject({ mes: "2026-12", titulo: "Diciembre de 2026" });
  });

  it("«Ver más»: la segunda tanda trae otros 20 del mismo año (un mes partido sigue bajo el mismo título) y la tercera lo que queda", () => {
    const segunda = tandaDelAnio(filas, "2026", 40);
    expect([segunda.vistos, segunda.quedan]).toEqual([40, 8]);
    expect(new Set(segunda.meses.map((m) => m.mes)).size).toBe(segunda.meses.length);
    expect(tandaDelAnio(filas, "2026", 60)).toMatchObject({ vistos: 48, quedan: 0 });
  });

  it("otro año: solo sus renglones", () => {
    const t = tandaDelAnio(filas, "2024", TANDA_HISTORIAL);
    expect([t.vistos, t.quedan]).toEqual([10, 0]);
    expect(t.meses.every((m) => m.mes.startsWith("2024-"))).toBe(true);
  });

  it("un año que ya no está (la memoria de una visita vieja): el más reciente", () => {
    expect(tandaDelAnio(filas, "2019", TANDA_HISTORIAL).meses[0].mes).toBe("2026-12");
    expect(tandaDelAnio([], "2026", TANDA_HISTORIAL)).toEqual({ meses: [], vistos: 0, quedan: 0 });
  });
});

describe("F1: quiénes pasaron y la hoja «Ver los N» (OL-473)", () => {
  it("el carril lleva hasta 12 y «Ver los N» sale desde 4", () => {
    expect([TOPE_CARRIL, MINIMO_VER_LOS]).toEqual([12, 4]);
  });

  it("«9 veces», «1 vez»", () => {
    expect([textoVeces(9), textoVeces(1)]).toEqual(["9 veces", "1 vez"]);
  });

  it("la línea de la hoja dice qué cuenta: los artistas registrados en el lugar, los lugares con ficha en el artista", () => {
    expect(notaPresencias("lugar", 9)).toBe("9 artistas registrados: los que tienen ficha en el catálogo y están en algún evento de aquí. Una exposición colectiva o un evento sin artistas ligados no suma.");
    expect(notaPresencias("artista", 8)).toBe("8 lugares con ficha. Una fecha en un sitio sin ficha cuenta en la trayectoria, pero no aquí.");
    expect(notaPresencias("artista", 1)).toBe("1 lugar con ficha. Una fecha en un sitio sin ficha cuenta en la trayectoria, pero no aquí.");
  });

  it("cada artista lleva lo que pide su renglón de Artistas (qué hace y si es solista o grupo); sin dato, «por completar»", () => {
    const p = artistasDelHistorial([evento("a", "2026-10-09T01:00:00Z", { artistas: [LEO, ANA] })]);
    expect(p.find((x) => x.id === LEO.id)?.artista).toEqual({ slug: "leo-traeger", disciplina: "musica", detalle: "guitarra", tipo: "solista" });
    expect(p.find((x) => x.id === ANA.id)?.artista).toEqual({ slug: null, disciplina: "por_completar", detalle: null, tipo: "solista" });
  });

  it("cada lugar lleva lo que pide su renglón de Lugares (tipo, calle, si es privado)", () => {
    const [p] = lugaresDeTrayectoria([evento("a", "2026-10-09T01:00:00Z", { lugar_id: MUSEO.id, lugar: MUSEO })]);
    expect(p.lugar).toEqual({ slug: "museo", tipo: "museo", direccion: "Calzada de Guadalupe 705, Centro", privado: false });
  });
});
