import { describe, expect, it } from "vitest";
import {
  agruparPorMes,
  artistasDelHistorial,
  cabeceraHistorial,
  cabeceraTrayectoria,
  contarLugares,
  cuandoPasado,
  listaCon,
  lugaresDeTrayectoria,
  otrosArtistas,
  realizados,
  saltoLugares,
  textoFueron,
  type EventoPasado,
  type LugarDelEvento,
} from "./historialFichas";

const ZONA = "America/Mexico_City";
const CDC = { id: "l-cdc", slug: "centro-de-difusion-cultural-raul-gamboa", nombre: "Centro de Difusión Cultural Raúl Gamboa", portada: "/cdc.jpg" };
const COSSIO = { id: "l-cossio", slug: "museo-francisco-cossio", nombre: "Museo Francisco Cossío", portada: null };
const LEO = { id: "a-leo", slug: "leo-traeger", nombre: "Leo Traeger", foto: "/leo.jpg" };
const LATIFE = { id: "a-latife", slug: "latife-zetune", nombre: "Latife Zetune", foto: null };
const ANA = { id: "a-ana", slug: null, nombre: "Ana", foto: null };
const BETO = { id: "a-beto", slug: "beto", nombre: "Beto", foto: null };

function evento(id: string, inicio: string, extra: Partial<EventoPasado> = {}): EventoPasado {
  return { id, slug: id, titulo: id, inicio, fin: null, zona: ZONA, imagen: null, lugar_id: null, sitio_texto: null, sitio_direccion: null, sitio_reservado: false, lugar: null, festival: null, artistas: [], van: 0, cancelado: false, ...extra };
}
const en = (lugar: LugarDelEvento) => ({ lugar_id: lugar.id, lugar });

describe("la cabecera de la sección (OL-390)", () => {
  it("la trayectoria cuenta fechas y lugares, en singular cuando toca", () => {
    expect(cabeceraTrayectoria(3, 2)).toBe("3 fechas · 2 lugares");
    expect(cabeceraTrayectoria(1, 1)).toBe("1 fecha · 1 lugar");
    // Sin lugares con ficha (un sitio escrito), solo las fechas.
    expect(cabeceraTrayectoria(1, 0)).toBe("1 fecha");
  });

  it("el historial cuenta eventos y artistas", () => {
    expect(cabeceraHistorial(13, 11)).toBe("13 eventos · 11 artistas registrados");
    expect(cabeceraHistorial(1, 1)).toBe("1 evento · 1 artista registrado");
    expect(cabeceraHistorial(2, 0)).toBe("2 eventos");
  });

  it("con el tope de la lectura lleno dice «200+»", () => {
    expect(cabeceraTrayectoria(200, 12, true)).toBe("200+ fechas · 12 lugares");
    expect(cabeceraHistorial(200, 40, true)).toBe("200+ eventos · 40 artistas registrados");
  });
});

describe("con quién (H5) y cuántos fueron (H4)", () => {
  it("«A», «A y B», «A, B y 2 más»", () => {
    expect(listaCon(["Latife Zetune"])).toBe("Latife Zetune");
    expect(listaCon(["A", "B"])).toBe("A y B");
    expect(listaCon(["A", "B", "C"])).toBe("A, B y 1 más");
    expect(listaCon(["A", "B", "C", "D"])).toBe("A, B y 2 más");
  });

  it("los otros artistas de un evento, sin el de la ficha y en su orden", () => {
    expect(otrosArtistas(evento("e", "2026-10-08T01:00:00Z", { artistas: [LEO, LATIFE, ANA] }), LEO.id)).toEqual(["Latife Zetune", "Ana"]);
    expect(otrosArtistas(evento("e", "2026-10-08T01:00:00Z", { artistas: [LEO] }), LEO.id)).toEqual([]);
  });

  it("«2 fueron», «1 fue» y nada si nadie fue", () => {
    expect(textoFueron(2)).toBe("2 fueron");
    expect(textoFueron(1)).toBe("1 fue");
    expect(textoFueron(0)).toBeNull();
  });
});

describe("cuándo fue", () => {
  it("un día: «jue 8 · 19:00» en la zona del evento", () => {
    // 2026-10-09 01:00 UTC es el jueves 8 a las 19:00 en San Luis Potosí.
    expect(cuandoPasado({ inicio: "2026-10-09T01:00:00Z", fin: "2026-10-09T03:00:00Z", zona: ZONA })).toBe("jue 8 · 7:00 pm");
    expect(cuandoPasado({ inicio: "2026-10-09T01:00:00Z", fin: null, zona: ZONA })).toBe("jue 8 · 7:00 pm");
  });

  it("varios días: «del mar 6 al mié 7»", () => {
    // Del martes 6 a las 12:00 al miércoles 7 a las 14:00 en San Luis.
    expect(cuandoPasado({ inicio: "2026-10-06T18:00:00Z", fin: "2026-10-07T20:00:00Z", zona: ZONA })).toBe("del mar 6 al mié 7");
  });

  it("con la regla de siempre (`esDeVariosDias`): si termina al día siguiente antes de la hora en que empezó, es un día", () => {
    // La clase magistral de Leo Traeger en el prototipo: del mar 6 a las 12:00 al mié 7 a las 11:30. Su ficha dice un día; aquí también.
    expect(cuandoPasado({ inicio: "2026-10-06T18:00:00Z", fin: "2026-10-07T17:30:00Z", zona: ZONA })).toBe("mar 6 · 12:00 pm");
  });

  it("una noche que cruza la medianoche es un día", () => {
    expect(cuandoPasado({ inicio: "2026-10-10T04:00:00Z", fin: "2026-10-10T07:00:00Z", zona: ZONA })).toBe("vie 9 · 10:00 pm");
  });
});

describe("por mes, lo más reciente primero (H3)", () => {
  it("agrupa por el mes del inicio en la zona y ordena del más reciente al más viejo", () => {
    const grupos = agruparPorMes([
      evento("sep", "2026-09-27T01:00:00Z"),
      evento("oct-6", "2026-10-06T18:00:00Z"),
      // El 1 de octubre a las 00:30 UTC todavía es el 30 de septiembre en San Luis.
      evento("borde", "2026-10-01T00:30:00Z"),
      evento("oct-8", "2026-10-09T01:00:00Z"),
    ]);
    expect(grupos.map((g) => g.titulo)).toEqual(["Octubre de 2026", "Septiembre de 2026"]);
    expect(grupos[0].eventos.map((e) => e.id)).toEqual(["oct-8", "oct-6"]);
    expect(grupos[1].eventos.map((e) => e.id)).toEqual(["borde", "sep"]);
  });

  it("el año cambia el grupo", () => {
    const grupos = agruparPorMes([evento("2025", "2025-10-10T18:00:00Z"), evento("2026", "2026-10-10T18:00:00Z")]);
    expect(grupos.map((g) => g.titulo)).toEqual(["Octubre de 2026", "Octubre de 2025"]);
  });

  it("sin eventos, sin grupos", () => {
    expect(agruparPorMes([])).toEqual([]);
  });
});

describe("quiénes pasaron (Q1)", () => {
  it("«Se ha presentado en»: lugares con ficha, por veces y luego por nombre; los sitios sin ficha no entran", () => {
    const eventos = [
      evento("a", "2026-10-09T01:00:00Z", en(CDC)),
      evento("b", "2026-10-08T01:00:00Z", en(COSSIO)),
      evento("c", "2026-10-06T18:00:00Z", en(CDC)),
      evento("d", "2026-10-05T18:00:00Z", { sitio_texto: "Jardín Colón" }),
    ];
    expect(lugaresDeTrayectoria(eventos)).toEqual([
      { id: CDC.id, href: `/lugares/${CDC.slug}`, nombre: CDC.nombre, foto: CDC.portada, veces: 2, lugar: { slug: CDC.slug, tipo: "otro", direccion: null, privado: false } },
      { id: COSSIO.id, href: `/lugares/${COSSIO.slug}`, nombre: COSSIO.nombre, foto: null, veces: 1, lugar: { slug: COSSIO.slug, tipo: "otro", direccion: null, privado: false } },
    ]);
    expect(lugaresDeTrayectoria([evento("d", "2026-10-05T18:00:00Z", { sitio_texto: "Jardín Colón" })])).toEqual([]);
  });

  it("«Han pasado por aquí»: los artistas de los eventos, por veces y por nombre (como en español)", () => {
    const eventos = [evento("a", "2026-10-09T01:00:00Z", { artistas: [LEO, LATIFE] }), evento("b", "2026-10-08T01:00:00Z", { artistas: [BETO, LATIFE] }), evento("c", "2026-10-07T01:00:00Z", { artistas: [ANA] })];
    expect(artistasDelHistorial(eventos).map((p) => [p.nombre, p.veces])).toEqual([
      ["Latife Zetune", 2],
      ["Ana", 1],
      ["Beto", 1],
      ["Leo Traeger", 1],
    ]);
    // Sin slug, la ficha por su id.
    expect(artistasDelHistorial(eventos).find((p) => p.id === ANA.id)?.href).toBe(`/artistas/${ANA.id}`);
  });
});

describe("«Lugares» cuenta todos (K1)", () => {
  it("lugares distintos de las fechas próximas y de las pasadas, sin los sitios sin ficha", () => {
    expect(contarLugares([{ lugar_id: "l1" }, { lugar_id: null }], [{ lugar_id: "l1" }, { lugar_id: "l2" }])).toBe(2);
    expect(contarLugares([], [])).toBe(0);
  });

  it("con próximas baja a «Próximas fechas»; sin ellas, a la trayectoria; sin lugares, a ninguna parte", () => {
    expect(saltoLugares(2, 1, 3)).toBe("fechas");
    expect(saltoLugares(2, 0, 3)).toBe("trayectoria");
    expect(saltoLugares(0, 0, 1)).toBeUndefined();
    expect(saltoLugares(0, 0, 0)).toBeUndefined();
  });
});

describe("«Se canceló»: anunciado vs. realizado (OL-391, C1)", () => {
  // El caso del prototipo (captura 15 de la bitácora 420): Leo Traeger con dos fechas que ocurrieron en dos lugares y la clase magistral en el
  // CDC marcada «se canceló».
  const flamenco = evento("flamenco", "2026-10-09T01:00:00Z", { ...en(CDC), artistas: [LEO], van: 3 });
  const cossio = evento("cossio", "2026-10-08T01:00:00Z", { ...en(COSSIO), artistas: [LEO, LATIFE] });
  const clase = evento("clase", "2026-10-06T18:00:00Z", { ...en(CDC), artistas: [LEO, BETO], van: 2, cancelado: true });

  it("la cabecera: «2 fechas · 1 cancelado · 2 lugares»; el cancelado no cuenta en las fechas", () => {
    expect(cabeceraTrayectoria(2, 2, false, 1)).toBe("2 fechas · 1 cancelado · 2 lugares");
    expect(cabeceraTrayectoria(3, 1, false, 2)).toBe("3 fechas · 2 cancelados · 1 lugar");
    expect(cabeceraHistorial(12, 11, false, 1)).toBe("12 eventos · 1 cancelado · 11 artistas registrados");
    // Sin cancelados, la de siempre.
    expect(cabeceraTrayectoria(2, 2, false, 0)).toBe("2 fechas · 2 lugares");
    // Todo lo pasado se canceló: solo eso, sin «0 fechas»; y con el tope lleno, la cuenta sigue diciendo «200+».
    expect(cabeceraTrayectoria(0, 0, false, 1)).toBe("1 cancelado");
    expect(cabeceraHistorial(0, 0, false, 2)).toBe("2 cancelados");
    expect(cabeceraTrayectoria(198, 12, true, 2)).toBe("198+ fechas · 2 cancelados · 12 lugares");
  });

  it("lo realizado es lo pasado menos lo cancelado", () => {
    expect(realizados([flamenco, cossio, clase]).map((e) => e.id)).toEqual(["flamenco", "cossio"]);
  });

  it("no cuenta en «Se ha presentado en» ni en «Han pasado por aquí»", () => {
    // El CDC sigue por el flamenco, pero una vez y no dos.
    expect(lugaresDeTrayectoria([flamenco, cossio, clase]).map((p) => [p.nombre, p.veces])).toEqual([
      [CDC.nombre, 1],
      [COSSIO.nombre, 1],
    ]);
    // Si solo hubo lo cancelado en un lugar, el lugar no sale.
    expect(lugaresDeTrayectoria([clase])).toEqual([]);
    // Beto solo estaba en la clase cancelada: no pasó por aquí.
    expect(artistasDelHistorial([flamenco, clase]).map((p) => [p.nombre, p.veces])).toEqual([["Leo Traeger", 1]]);
  });

  it("no cuenta en «Lugares» (K1) ni lleva a la trayectoria si es lo único pasado", () => {
    expect(contarLugares([], realizados([clase]))).toBe(0);
    expect(contarLugares([], realizados([cossio, clase]))).toBe(1);
    expect(saltoLugares(contarLugares([], realizados([clase])), 0, realizados([clase]).length)).toBeUndefined();
  });

  it("se queda en su mes, en su sitio", () => {
    const grupos = agruparPorMes([flamenco, cossio, clase]);
    expect(grupos[0].eventos.map((e) => [e.id, e.cancelado])).toEqual([
      ["flamenco", false],
      ["cossio", false],
      ["clase", true],
    ]);
  });
});
