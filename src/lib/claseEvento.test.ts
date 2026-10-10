import { describe, expect, it } from "vitest";
import { diaDeSemana, lineaDeTaller, rangoDelPeriodo, ultimoDiaDelPeriodo, horarioEfectivo, horariosDeTaller, kpisDeExposicion, lineaDeExposicion, periodoDePrograma, finEnPrograma, periodoDeVisita, resumenTaller, soloInteres, textoHoy, textoProgramaRegistrado, textoVisita, visitaDeEvento, yaPasoSegunClase } from "./claseEvento";
import { CLASES, claseSugerida, cortoDeClase, esClase, formaDelCartel, cartelAFormulario, nombreDeClase } from "./eventos";
import { localAIso } from "./fechas";

const ZONA = "America/Mexico_City";
// Ma–Do de 10:00 a 18:00 (cierra los lunes), como el museo del prototipo.
const MUSEO = [{ dias: [2, 3, 4, 5, 6, 7], abre: "10:00", cierra: "18:00" }];
// Exposición del vie 6 al lun 30 de noviembre de 2026, guardada como la guarda el alta.
const EXPO = { inicio: localAIso("2026-11-06T00:00", ZONA)!, fin: localAIso("2026-11-30T23:59", ZONA)!, zona: ZONA };
const en = (local: string) => new Date(localAIso(local, ZONA)!);

describe("la clase que proponen las palabras del título (doc 55 §2)", () => {
  it.each([
    ["Exposición Ecos de papel", "exposicion"],
    ["EXPO colectiva de grabado", "exposicion"],
    ["Muestra de fotografía", "exposicion"],
    ["Taller de grabado", "taller"],
    ["Curso de cerámica para principiantes", "taller"],
    ["Laboratorio de escritura", "taller"],
    ["Diplomado en gestión cultural", "taller"],
    ["Festival de Cine UASLP", "festival"],
    ["Encuentro de poetas", "festival"],
    ["Jornadas de danza", "festival"],
    ["Muestra de cine potosino", "festival"],
  ])("«%s» propone %s", (titulo, clase) => {
    expect(claseSugerida(titulo)).toBe(clase);
  });

  it("sin ninguna de esas palabras no propone nada (es un evento); solo cuentan palabras enteras", () => {
    expect(claseSugerida("Concierto de la Orquesta")).toBeNull();
    expect(claseSugerida("Expositores invitados")).toBeNull();
    expect(claseSugerida("Cursiva y caligrafía")).toBeNull();
    expect(claseSugerida("")).toBeNull();
  });

  it("con varias, gana la que aparece primero", () => {
    expect(claseSugerida("Taller de cine en el Festival de Invierno")).toBe("taller");
    expect(claseSugerida("Festival de talleres")).toBe("festival");
  });

  it("las cuatro formas con su nombre y su frase llana, en el orden de la hoja; lo que no se reconoce es un evento", () => {
    expect(CLASES.map((c) => c.nombre)).toEqual(["Evento", "Exposición", "Taller o curso", "Festival"]);
    // Lo que dicen sus chips en el primer paso (OL-345): una palabra cada uno, en el mismo orden fijo.
    expect(CLASES.map((c) => c.corto)).toEqual(["Evento", "Exposición", "Taller", "Festival"]);
    expect(CLASES[1].frase).toBe("Se puede visitar varios días, en un horario.");
    expect(nombreDeClase("exposicion")).toBe("Exposición");
    expect(nombreDeClase(undefined)).toBe("Evento");
    expect(esClase("festival")).toBe(true);
    expect(esClase("concierto")).toBe(false);
  });
});

describe("lo que el cartel dice de cómo ocurre (Lectura)", () => {
  const vacia = { titulo: null, fecha: null, hora: null, hora_fin: null, lugar: null, direccion: null, gratis: null, precio: null, descripcion: null, enlace: null, artistas: null };

  it("una lectura vieja, sin nada de esto, no trae forma (todo opcional y tolerante a null)", () => {
    expect(formaDelCartel({})).toEqual({ clase: null, visita: null, sesiones: [], actos: [] });
    expect(formaDelCartel({ ...vacia, clase: null, visita: null, sesiones: null, actos: null })).toEqual({ clase: null, visita: null, sesiones: [], actos: [] });
  });

  it("una exposición con su visita; un cierre anterior a la apertura o mal escrito no cuenta", () => {
    expect(formaDelCartel({ clase: "exposicion", visita: { desde: "2026-11-06", hasta: "2026-11-30" } })).toMatchObject({ clase: "exposicion", visita: { desde: "2026-11-06", hasta: "2026-11-30" } });
    expect(formaDelCartel({ visita: { desde: "2026-11-06", hasta: "2026-11-01" } }).visita).toEqual({ desde: "2026-11-06", hasta: null });
    expect(formaDelCartel({ visita: { desde: "6 de noviembre", hasta: "2026-11-30" } }).visita).toBeNull();
  });

  it("un taller con sus días: solo los válidos, sin repetir y en orden", () => {
    expect(formaDelCartel({ clase: "taller", sesiones: ["2026-10-24", "2026-10-10", "sábado", "2026-10-10", "2026-10-17"] }).sesiones).toEqual(["2026-10-10", "2026-10-17", "2026-10-24"]);
  });

  it("un festival con su programa: los actos con nombre y día, en orden; una hora ilegible queda vacía; una clase desconocida no cuenta", () => {
    const forma = formaDelCartel({
      clase: "festival",
      actos: [
        { titulo: "Función de cortos", fecha: "2026-11-14", hora: "17:00", lugar: " Cineteca Alameda " },
        { titulo: "Inauguración", fecha: "2026-11-12", hora: "7 pm", lugar: null },
        { titulo: null, fecha: "2026-11-13", hora: "18:00", lugar: "Foro" },
        { titulo: "Sin día", fecha: null, hora: "18:00", lugar: null },
      ],
    });
    expect(forma.actos).toEqual([
      { titulo: "Inauguración", fecha: "2026-11-12", hora: "", lugar: "" },
      { titulo: "Función de cortos", fecha: "2026-11-14", hora: "17:00", lugar: "Cineteca Alameda" },
    ]);
    expect(formaDelCartel({ clase: "concierto" as never }).clase).toBeNull();
  });

  it("cartelAFormulario la pasa en `forma` junto a lo de siempre", () => {
    expect(cartelAFormulario({ ...vacia, titulo: "Ecos de papel", clase: "exposicion", visita: { desde: "2026-11-06", hasta: "2026-11-30" } }).forma).toMatchObject({ clase: "exposicion", visita: { desde: "2026-11-06", hasta: "2026-11-30" } });
  });
});

describe("las fechas de una exposición", () => {
  it("se guarda del primer minuto del primer día al último del de cierre, y se lee igual de vuelta", () => {
    expect(periodoDeVisita({ desde: "2026-11-06", hasta: "2026-11-30" })).toEqual({ inicio: "2026-11-06T00:00", fin: "2026-11-30T23:59" });
    expect(visitaDeEvento(EXPO.inicio, EXPO.fin, ZONA)).toEqual({ desde: "2026-11-06", hasta: "2026-11-30" });
    expect(visitaDeEvento(EXPO.inicio, null, ZONA)).toEqual({ desde: "2026-11-06", hasta: "2026-11-06" });
  });

  it("pasa al terminar su día de cierre (no antes); un taller al terminar su última sesión; un festival, su último acto", () => {
    expect(yaPasoSegunClase({ ...EXPO, clase: "exposicion" }, en("2026-11-30T21:00"))).toBe(false);
    expect(yaPasoSegunClase({ ...EXPO, clase: "exposicion" }, en("2026-12-01T00:00"))).toBe(true);
    const taller = { inicio: localAIso("2026-10-10T10:00", ZONA)!, fin: localAIso("2026-10-24T12:00", ZONA)!, zona: ZONA, clase: "taller" as const };
    expect(yaPasoSegunClase(taller, en("2026-10-17T12:00"))).toBe(false);
    expect(yaPasoSegunClase(taller, en("2026-10-24T12:01"))).toBe(true);
  });
});

describe("el horario de una exposición: propio → del lugar → por confirmar", () => {
  it("el propio manda; sin él, el del lugar; sin ninguno, ninguno", () => {
    const propio = [{ dias: [4, 5], abre: "12:00", cierra: "20:00" }];
    expect(horarioEfectivo(propio, MUSEO)).toEqual({ franjas: propio, origen: "propio" });
    expect(horarioEfectivo([], MUSEO)).toEqual({ franjas: MUSEO, origen: "lugar" });
    expect(horarioEfectivo(null, [{ dias: [], abre: "10:00", cierra: "12:00" }])).toEqual({ franjas: [], origen: null });
  });

  it("lo que dice de hoy: abre, cierra o por confirmar; fuera del periodo, nada", () => {
    const visita = { desde: "2026-11-06", hasta: "2026-11-30" };
    expect(diaDeSemana("2026-11-08")).toBe(7);
    expect(textoHoy(visita, MUSEO, "2026-11-08")).toBe("Abre hoy 10:00 a.m.–6:00 p.m.");
    expect(textoHoy(visita, MUSEO, "2026-11-09")).toBe("Hoy cierra");
    expect(textoHoy(visita, [], "2026-11-08")).toBe("Horario por confirmar");
    expect(textoHoy(visita, MUSEO, "2026-12-01")).toBeNull();
  });

  it("la línea de la ficha: «Hasta el …» con lo de hoy; antes de abrir, sus días", () => {
    expect(lineaDeExposicion(EXPO, MUSEO, en("2026-11-08T12:00"))).toBe("Hasta el lun 30 de nov · Abre hoy 10:00 a.m.–6:00 p.m.");
    expect(lineaDeExposicion(EXPO, [], en("2026-11-08T12:00"))).toBe("Hasta el lun 30 de nov · Horario por confirmar");
    expect(lineaDeExposicion(EXPO, MUSEO, en("2026-11-01T12:00"))).toBe("Del 6 al 30 de nov");
    expect(textoVisita({ desde: "2026-11-06", hasta: "2026-11-30" }, "2026-11-08", en("2026-11-08T12:00"), ZONA)).toBe("Hasta el lun 30 de nov");
  });

  it("los números de la ficha: hasta cuándo y el horario de hoy en 24 h (o cerrado, o por confirmar)", () => {
    expect(kpisDeExposicion(EXPO, MUSEO, en("2026-11-08T12:00"))).toEqual({ hasta: "lun 30 nov", hoy: { etiqueta: "Hoy", valor: "10:00–18:00" } });
    expect(kpisDeExposicion(EXPO, MUSEO, en("2026-11-09T12:00")).hoy).toEqual({ etiqueta: "Hoy", valor: "Cerrado" });
    expect(kpisDeExposicion(EXPO, [], en("2026-11-08T12:00")).hoy).toEqual({ etiqueta: "Horario", valor: "Por confirmar" });
  });

  it("«Me interesa» sin «Voy» para la exposición y el festival; el taller y el evento, «Voy»", () => {
    expect([soloInteres("exposicion"), soloInteres("festival"), soloInteres("taller"), soloInteres("puntual"), soloInteres(undefined)]).toEqual([true, true, false, false, false]);
  });
});

describe("taller y festival", () => {
  it("las sesiones de un taller: un día por sesión, en orden, con la misma hora; su línea", () => {
    const sesiones = horariosDeTaller(["2026-10-24", "2026-10-10", "2026-10-17", "2026-10-10"], "10:00", "12:00");
    expect(sesiones.map((s) => s.dia)).toEqual(["2026-10-10", "2026-10-17", "2026-10-24"]);
    expect(resumenTaller(sesiones, "2026-10-07")).toBe("3 sesiones · sáb 10, sáb 17 y sáb 24 de oct · 10:00 a.m.–12:00 p.m.");
    expect(resumenTaller([...sesiones.slice(0, 2), { dia: "2026-11-07", hora: "11:00", fin: "" }], "2026-10-07")).toBe("3 sesiones · sáb 10 y sáb 17 de oct y sáb 7 de nov · horario por sesión");
    expect(resumenTaller([{ dia: "2027-01-09", hora: "10:00", fin: "" }], "2026-10-07")).toBe("1 sesión · sáb 9 de ene de 2027 · 10:00 a.m.");
  });

  it("OL-362: un último acto sin hora de fin no le suma un día al rango del festival; uno con fin que cruza la medianoche, sí", () => {
    const primero = { inicio: localAIso("2026-11-12T19:00", ZONA)!, fin: null };
    // 22:00 sin fin: 3 h serían la 1:00 del 15; cuenta hasta la medianoche del 14, que es el final del 14.
    const tarde = { inicio: localAIso("2026-11-14T22:00", ZONA)!, fin: null };
    expect(finEnPrograma(tarde.inicio, null, ZONA)).toBe(localAIso("2026-11-15T00:00", ZONA));
    const p = periodoDePrograma([primero, tarde], ZONA)!;
    expect(rangoDelPeriodo(p.inicio, p.fin, ZONA, en("2026-10-07T12:00"))).toBe("Del 12 al 14 de nov");
    // 18:00 sin fin: las 3 h caben en su día.
    expect(finEnPrograma(localAIso("2026-11-14T18:00", ZONA)!, null, ZONA)).toBe(localAIso("2026-11-14T21:00", ZONA));
    // Con fin a la 1:00 del 15: se respeta, y el rango llega al 15.
    const conFin = { inicio: localAIso("2026-11-14T22:00", ZONA)!, fin: localAIso("2026-11-15T01:00", ZONA)! };
    const q = periodoDePrograma([primero, conFin], ZONA)!;
    expect(q.fin).toBe(localAIso("2026-11-15T01:00", ZONA));
    expect(rangoDelPeriodo(q.inicio, q.fin, ZONA, en("2026-10-07T12:00"))).toBe("Del 12 al 15 de nov");
  });

  it("el periodo de un festival: del primer acto al final del último (sin hora de fin, 3 h después de empezar, OL-358)", () => {
    const actos = [
      { inicio: localAIso("2026-11-13T18:00", ZONA)!, fin: localAIso("2026-11-13T20:00", ZONA)! },
      { inicio: localAIso("2026-11-12T19:00", ZONA)!, fin: null },
      { inicio: localAIso("2026-11-14T17:00", ZONA)!, fin: null },
    ];
    expect(periodoDePrograma(actos, ZONA)).toEqual({ inicio: localAIso("2026-11-12T19:00", ZONA), fin: localAIso("2026-11-14T20:00", ZONA) });
    expect(periodoDePrograma([], ZONA)).toBeNull();
    // Su fin a la medianoche (un último acto sin hora de fin) es el final del día anterior, no un día más.
    expect(rangoDelPeriodo(localAIso("2026-11-12T19:00", ZONA)!, localAIso("2026-11-15T00:00", ZONA)!, ZONA, en("2026-10-07T12:00"))).toBe("Del 12 al 14 de nov");
    expect(rangoDelPeriodo(localAIso("2026-11-12T19:00", ZONA)!, localAIso("2026-11-13T00:00", ZONA)!, ZONA, en("2026-10-07T12:00"))).toBe("jue 12 de nov");
    // La misma regla, sola (OL-336: la usa el cartel): las 00:00 cierran el día anterior; 23:59 y cualquier otra hora, su día; sin fin, el de inicio.
    expect(ultimoDiaDelPeriodo(localAIso("2026-10-07T10:00", ZONA)!, localAIso("2026-10-15T00:00", ZONA)!, ZONA)).toBe("2026-10-14");
    expect(ultimoDiaDelPeriodo(localAIso("2026-10-07T10:00", ZONA)!, localAIso("2026-10-14T23:59", ZONA)!, ZONA)).toBe("2026-10-14");
    expect(ultimoDiaDelPeriodo(localAIso("2026-10-07T10:00", ZONA)!, localAIso("2026-10-15T00:01", ZONA)!, ZONA)).toBe("2026-10-15");
    expect(ultimoDiaDelPeriodo(localAIso("2026-10-07T10:00", ZONA)!, null, ZONA)).toBe("2026-10-07");
    expect(textoProgramaRegistrado(1)).toBe("Programa registrado: 1 actividad");
    expect(textoProgramaRegistrado(3)).toBe("Programa registrado: 3 actividades");
  });
});

describe("la cabecera oscura (OL-351): la etiqueta y la línea del taller", () => {
  it("la etiqueta es la palabra de la clase; una que no se reconoce es un evento", () => {
    expect(["exposicion", "taller", "festival"].map((c) => cortoDeClase(c as "taller"))).toEqual(["Exposición", "Taller", "Festival"]);
    expect(cortoDeClase(null)).toBe("Evento");
  });
  it("un taller de un día dice ese día, su hora y dónde; de varios, sus días y dónde (las horas van en «Sesiones»)", () => {
    const una = { inicio: localAIso("2026-10-08T17:00", ZONA)!, fin: localAIso("2026-10-08T19:00", ZONA)!, zona: ZONA };
    expect(lineaDeTaller(una, "Foro lunaria", en("2026-10-07T12:00"))).toBe("jue 8 de oct · 17:00 · Foro lunaria");
    const varias = { inicio: localAIso("2026-10-09T17:00", ZONA)!, fin: localAIso("2026-10-13T19:00", ZONA)!, zona: ZONA };
    expect(lineaDeTaller(varias, "Foro lunaria", en("2026-10-07T12:00"))).toBe("Del 9 al 13 de oct · Foro lunaria");
    expect(lineaDeTaller(varias, null, en("2026-10-07T12:00"))).toBe("Del 9 al 13 de oct");
  });
});
