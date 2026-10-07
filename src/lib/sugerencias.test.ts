import { describe, expect, it } from "vitest";
import {
  SIN_PISTAS,
  claveDeSitio,
  esApertura,
  esElMismoFestival,
  mencionDeFestival,
  mismoActo,
  nombraMuestra,
  nombreDeMuestra,
  pistasDe,
  pistasLimpias,
  sugerenciaDeExposicion,
  sugerenciaDeFestival,
  unaSugerencia,
  type OtroActo,
  type Publicado,
} from "./sugerencias";

// OL-323: las sugerencias al publicar (modelo §10: H1, H2, H4, H5 y las variantes que no deben disparar).

describe("mencionDeFestival: nombre y edición, solo si dice que es parte", () => {
  it.each([
    ["Festival de Cine UASLP 2026", "Festival de Cine UASLP 2026", "festival de cine uaslp|2026"],
    ["Concierto de clausura del Festival de Cine UASLP 2026", "Festival de Cine UASLP 2026", "festival de cine uaslp|2026"],
    ["9º Festival Internacional de Danza", "9º Festival Internacional de Danza", "festival internacional de danza|9"],
    ["XXIII Festival de las Artes: función de gala", "XXIII Festival de las Artes", "festival de las artes|23"],
    ["Noveno Festival del Desierto en el Teatro de la Paz", "Noveno Festival del Desierto", "festival del desierto|9"],
    ["Festival Umbral, 3a edición · Lectura de poesía", "Festival Umbral, 3a edición", "festival umbral|3"],
    ["Taller de gráfica — Festival Umbral 2026", "Festival Umbral 2026", "festival umbral|2026"],
    ["FESTIVAL DE JAZZ SLP 2026", "FESTIVAL DE JAZZ SLP 2026", "festival de jazz slp|2026"],
  ])("«%s» → %s", (texto, visto, clave) => {
    const m = mencionDeFestival(texto);
    expect(m?.texto).toBe(visto);
    expect(m?.clave).toBe(clave);
  });

  it.each([
    ["Ganador del Festival de Cine de Morelia 2025", "premio: antecedente, no pertenencia"],
    ["Trío Bruma, ganadores del 9º Festival de Jazz", "premio con ordinal"],
    ["Con el apoyo del Festival Umbral 2026", "patrocinio"],
    ["Selección oficial del Festival de Cannes 2025", "selección"],
    ["Festival de Cine UASLP", "sin edición no se resuelve por el nombre"],
    ["Festival 2026", "sin nombre"],
    ["Concierto de Trío Bruma", "no nombra ningún festival"],
    ["", "vacío"],
  ])("«%s» no cuenta (%s)", (texto) => {
    expect(mencionDeFestival(texto)).toBeNull();
  });

  it("el mismo nombre en otra edición es otra clave", () => {
    expect(mencionDeFestival("Festival de Cine UASLP 2025")?.clave).not.toBe(mencionDeFestival("Festival de Cine UASLP 2026")?.clave);
  });

  it("un festival guardado sin la edición en el título es el de la mención si empieza ese año", () => {
    const m = mencionDeFestival("Festival de Cine UASLP 2026")!;
    expect(esElMismoFestival(m, { titulo: "Festival de Cine UASLP", inicio: "2026-11-13T01:00:00Z" })).toBe(true);
    expect(esElMismoFestival(m, { titulo: "Festival de Cine UASLP", inicio: "2025-11-13T01:00:00Z" })).toBe(false);
    expect(esElMismoFestival(m, { titulo: "Festival de Cine UASLP 2025", inicio: "2026-01-01T00:00:00Z" })).toBe(false);
    expect(esElMismoFestival(m, { titulo: "Festival de Cine UASLP 2026", inicio: "2026-11-13T01:00:00Z" })).toBe(true);
  });
});

describe("apertura y muestra", () => {
  it("el título dice inauguración", () => {
    expect(esApertura("Inauguración de Ecos de papel")).toBe(true);
    expect(esApertura("Se inaugura la exposición")).toBe(true);
    expect(esApertura("Ecos de papel")).toBe(false);
  });

  it("una muestra en singular; ni «muestra de cine» ni varias exposiciones", () => {
    expect(nombraMuestra("Inauguración de la exposición Ecos de papel")).toBe(true);
    expect(nombraMuestra("Inauguración de la Expo Grabado")).toBe(true);
    expect(nombraMuestra("Muestra de Cine Mexicano")).toBe(false);
    expect(nombraMuestra("Inauguración de cinco exposiciones de Fotovisión")).toBe(false);
    expect(nombraMuestra("Inauguración de la Casa de Cultura")).toBe(false);
  });

  it.each([
    ["Inauguración de Ecos de papel", "Ecos de papel"],
    ["Inauguración de la exposición Ecos de papel", "Ecos de papel"],
    ["Inauguración: Levitaciones e hipersuperficies, de Ricardo Rendón", "Levitaciones e hipersuperficies, de Ricardo Rendón"],
    ["Inauguración de la exposición fotográfica colectiva «Cuerpo contra imagen»", "Cuerpo contra imagen"],
    ["Inauguración de la exposición de Lucía Montaño", "Exposición de Lucía Montaño"],
    ["Inauguración", ""],
    ["Ecos de papel", "Ecos de papel"],
  ])("el nombre de la muestra de «%s» es «%s»", (titulo, nombre) => {
    expect(nombreDeMuestra(titulo)).toBe(nombre);
  });

  it("mismo acto: los títulos iguales sin acentos ni mayúsculas", () => {
    expect(mismoActo("Función: La luz que queda", "funcion la luz que queda")).toBe(true);
    expect(mismoActo("Charla con la directora", "Función de clausura")).toBe(false);
  });
});

describe("pistas", () => {
  it("del cartel: la exposición con su fecha y hora antes de la visita es una apertura", () => {
    const p = pistasDe("Ecos de papel", { clase: "exposicion", visita: { desde: "2026-11-06", hasta: "2026-11-30" }, inicio: "2026-11-05T19:00", horaLeida: true, festival: null });
    expect(p).toEqual({ visita: { desde: "2026-11-06", hasta: "2026-11-30" }, apertura: true, muestra: true, festival: null });
  });

  it("sin hora leída no hay apertura por el cartel (solo por el título)", () => {
    expect(pistasDe("Ecos de papel", { clase: "exposicion", visita: null, inicio: "2026-11-05T19:00", horaLeida: false }).apertura).toBe(false);
    expect(pistasDe("Inauguración de Ecos de papel", null).apertura).toBe(true);
  });

  it("una visita al revés se queda sin «hasta»", () => {
    expect(pistasDe("X", { visita: { desde: "2026-11-06", hasta: "2026-11-01" } }).visita).toEqual({ desde: "2026-11-06", hasta: null });
  });

  it("lo que llega de la pantalla se limpia", () => {
    expect(pistasLimpias(null)).toEqual(SIN_PISTAS);
    expect(pistasLimpias({ visita: { desde: "6 nov", hasta: "30 nov" }, apertura: "si", muestra: true, festival: 3 })).toEqual({ visita: null, apertura: false, muestra: true, festival: null });
    expect(pistasLimpias({ visita: { desde: "2026-11-06", hasta: "2026-11-30" }, apertura: true, muestra: true, festival: " Festival Umbral 2026 " }).festival).toBe("Festival Umbral 2026");
  });
});

const LUGAR = "0b0b0b0b-0000-4000-8000-000000000001";
const evento = (cambios: Partial<Publicado> = {}): Publicado => ({ id: "e1", titulo: "Inauguración de Ecos de papel", clase: "puntual", dia: "2026-11-05", lugar: "Museo Federico Silva", sitio: LUGAR, sitioReservado: false, padre: null, inaugura: false, anotadas: {}, ...cambios });
const HOY = "2026-10-07";

describe("H1 y H2: la exposición tras la inauguración", () => {
  const leida = { visita: { desde: "2026-11-06", hasta: "2026-11-30" }, apertura: true, muestra: true, festival: null };

  it("H1: con el periodo leído se propone publicarla, con su nombre, el lugar y quién expone", () => {
    expect(sugerenciaDeExposicion(evento(), leida, ["Lucía Montaño"], [], HOY)).toEqual({ tipo: "exposicion", modo: "crear", titulo: "Ecos de papel", visita: { desde: "2026-11-06", hasta: "2026-11-30" }, lugar: "Museo Federico Silva", quien: ["Lucía Montaño"] });
  });

  it("H2: el título nombra la muestra pero no hay periodo: se pregunta desde el día siguiente a la apertura", () => {
    const s = sugerenciaDeExposicion(evento({ titulo: "Inauguración de la exposición Ecos de papel" }), SIN_PISTAS, [], [], HOY);
    expect(s).toEqual({ tipo: "exposicion", modo: "periodo", titulo: "Ecos de papel", desde: "2026-11-06", lugar: "Museo Federico Silva", quien: [] });
  });

  it("ya publicada (mismo nombre, mismo lugar, días que se cruzan): se propone ligar", () => {
    const propia = { id: "x1", slug: "ecos-de-papel", titulo: "Ecos de papel", sitio: LUGAR, desde: "2026-11-06", hasta: "2026-11-29", inaugurada: false };
    expect(sugerenciaDeExposicion(evento(), leida, [], [propia], HOY)).toMatchObject({ modo: "ligar", exposicion: { id: "x1" } });
    // En otro lugar, o ya con su inauguración, no es la misma: se propone crear.
    expect(sugerenciaDeExposicion(evento(), leida, [], [{ ...propia, sitio: "otro" }], HOY)).toMatchObject({ modo: "crear" });
    expect(sugerenciaDeExposicion(evento(), leida, [], [{ ...propia, inaugurada: true }], HOY)).toMatchObject({ modo: "crear" });
    // Del año pasado: no se cruza.
    expect(sugerenciaDeExposicion(evento(), leida, [], [{ ...propia, desde: "2025-11-06", hasta: "2025-11-30" }], HOY)).toMatchObject({ modo: "crear" });
  });

  it.each([
    ["«inauguración» sin muestra (un recinto)", evento({ titulo: "Inauguración de la Casa de Cultura" }), SIN_PISTAS],
    ["sin apertura (el evento no es la inauguración)", evento({ titulo: "Visita guiada por la exposición Ecos de papel" }), SIN_PISTAS],
    ["sin nombre de la muestra", evento({ titulo: "Inauguración" }), { ...SIN_PISTAS, muestra: true, apertura: true }],
    ["ya anotada (descartada o aceptada)", evento({ anotadas: { exposicion: { estado: "descartada" } } }), leida],
    ["ya inaugura otra", evento({ inaugura: true }), leida],
    ["en un sitio reservado", evento({ sitioReservado: true }), leida],
    ["publicada como exposición", evento({ clase: "exposicion" }), leida],
    ["con el periodo ya cerrado", evento({ dia: "2026-09-05" }), { ...leida, visita: { desde: "2026-09-06", hasta: "2026-09-30" } }],
  ])("no se ofrece: %s", (_, e, p) => {
    expect(sugerenciaDeExposicion(e, p, [], [], HOY)).toBeNull();
  });

  it("claves de sitio: el lugar o el nombre del sitio", () => {
    expect(claveDeSitio(LUGAR, "lo que sea")).toBe(LUGAR);
    expect(claveDeSitio(null, "Caja del Agua")).toBe(claveDeSitio(null, "caja del agua"));
  });
});

describe("H4 y H5: el festival tras el segundo acto", () => {
  const acto = (cambios: Partial<Publicado> = {}) => evento({ id: "b", titulo: "Taller de gráfica en vivo", dia: "2026-11-08", ...cambios });
  const conCartel = { ...SIN_PISTAS, festival: "Festival Umbral 2026" };
  const otro = (cambios: Partial<OtroActo> = {}): OtroActo => ({ id: "a", titulo: "Concierto de Trío Bruma", dia: "2026-11-07", lugar: "Centro de las Artes", padre: null, anotadas: { mencion_festival: "Festival Umbral 2026" }, ...cambios });

  it("H4: dos actos distintos que nombran el mismo festival y edición (el primero por lo que anotó su cartel)", () => {
    expect(sugerenciaDeFestival(acto(), conCartel, [otro()], [])).toEqual({ tipo: "festival", modo: "relacionar", mencion: "Festival Umbral 2026", clave: "festival umbral|2026", otro: { id: "a", titulo: "Concierto de Trío Bruma", dia: "2026-11-07", lugar: "Centro de las Artes" } });
  });

  it("H4 con la mención en los títulos y los dos el mismo día", () => {
    const b = acto({ titulo: "Clausura · Festival de Cine UASLP 2026", dia: "2026-11-07" });
    const a = otro({ titulo: "Inauguración · Festival de Cine UASLP 2026", anotadas: {} });
    expect(sugerenciaDeFestival(b, SIN_PISTAS, [a], [])).toMatchObject({ modo: "relacionar", mencion: "Festival de Cine UASLP 2026" });
  });

  it("primer acto sin festival propio: nada (se espera al segundo)", () => {
    expect(sugerenciaDeFestival(acto(), conCartel, [], [])).toBeNull();
  });

  it("H5: con el festival propio, desde el primer acto (y con el otro acto suelto, los dos)", () => {
    const marco = { id: "f", slug: "festival-umbral-2026", titulo: "Festival Umbral 2026", inicio: "2026-11-07T00:00:00Z", actos: 2 };
    expect(sugerenciaDeFestival(acto(), conCartel, [], [marco])).toMatchObject({ modo: "marco", marco: { id: "f", actos: 2 }, otro: null, mencion: "Festival Umbral 2026" });
    expect(sugerenciaDeFestival(acto(), conCartel, [otro()], [marco])).toMatchObject({ modo: "marco", otro: { id: "a" } });
  });

  it.each([
    ["otra edición", [otro({ anotadas: { mencion_festival: "Festival Umbral 2025" } })]],
    ["el mismo acto otra vez (duplicado o corrección)", [otro({ titulo: "Taller de gráfica en vivo" })]],
    ["la segunda función de la misma obra (otro día, mismo título)", [otro({ titulo: "TALLER DE GRÁFICA EN VIVO", dia: "2026-11-15" })]],
    ["el otro ya es parte de un festival", [otro({ padre: "z" })]],
    ["el otro la descartó: no se insiste con un tercero", [otro({ anotadas: { mencion_festival: "Festival Umbral 2026", festival: { estado: "descartada", clave: "festival umbral|2026" } } })]],
    ["el otro solo lo nombra como premio en su título", [otro({ titulo: "Trío Bruma, ganadores del Festival Umbral 2026", anotadas: {} })]],
  ])("no se ofrece: %s", (_, otros) => {
    expect(sugerenciaDeFestival(acto(), conCartel, otros, [])).toBeNull();
  });

  it("no se ofrece a un festival, a una exposición, a un acto que ya es parte de uno ni a uno ya anotado", () => {
    expect(sugerenciaDeFestival(acto({ clase: "festival" }), conCartel, [otro()], [])).toBeNull();
    expect(sugerenciaDeFestival(acto({ clase: "exposicion" }), conCartel, [otro()], [])).toBeNull();
    expect(sugerenciaDeFestival(acto({ padre: "f" }), conCartel, [otro()], [])).toBeNull();
    expect(sugerenciaDeFestival(acto({ anotadas: { festival: { estado: "descartada" } } }), conCartel, [otro()], [])).toBeNull();
  });

  it("un taller también puede ser parte del festival", () => {
    expect(sugerenciaDeFestival(acto({ clase: "taller" }), conCartel, [otro()], [])).toMatchObject({ modo: "relacionar" });
  });
});

describe("una sola sugerencia", () => {
  it("el periodo visitable gana al festival", () => {
    const expo = sugerenciaDeExposicion(evento(), { visita: { desde: "2026-11-06", hasta: "2026-11-30" }, apertura: true, muestra: true, festival: "Festival Umbral 2026" }, [], [], HOY);
    const fest = sugerenciaDeFestival(evento(), { ...SIN_PISTAS, festival: "Festival Umbral 2026" }, [{ id: "a", titulo: "Concierto", dia: "2026-11-07", lugar: null, padre: null, anotadas: { mencion_festival: "Festival Umbral 2026" } }], []);
    expect(fest?.tipo).toBe("festival");
    expect(unaSugerencia(expo, fest)?.tipo).toBe("exposicion");
    expect(unaSugerencia(null, fest)?.tipo).toBe("festival");
    expect(unaSugerencia(null, null)).toBeNull();
  });
});
