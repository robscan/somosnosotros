import { describe, expect, it } from "vitest";
import { armarSemana, cuandoDelDia, diaIso, diasDe, enlaceDeLaBio, estadoDelDia, lineaCandidato, lineaDelAviso, lineaDeLaQueViene, lineaDelPasado, lunesDe, lunesDeLaSemana, motivoDe, NADIE_ARTISTA, nadieConMaterial, queFalta, rangoDeLaSemana, razonDelPedido, resumenDeLaFalta, resumenSemana, salePara, SIN_CARTEL_DIA, sugerirDia, tocaArmarLaQueViene, type Candidato, type EventoCandidato } from "./semana";

const ZONA = "America/Mexico_City";
// Miércoles 7 de octubre de 2026, 10:00 en San Luis Potosí.
const AHORA = new Date("2026-10-07T16:00:00Z");
const LUNES_VIENE = "2026-10-12";

const cand = (id: string, o: Partial<Candidato> = {}): Candidato => ({
  id, slug: id, nombre: `Ficha ${id}`, ciudad: "San Luis Potosí", ciudad_slug: "san-luis-potosi", clase: "musica", detalle: null, foto: "f", portada: "p", descripcion: "d",
  redes: [], direccion: null, proxima_id: null, proxima_titulo: null, proxima_inicio: null, proxima_zona: null, proxima_lugar: null, proxima_lugar_redes: [],
  eventos_semana: 0, ultima_vez: null, ocupado_en: null, ...o,
});
const ev = (id: string, inicio: string, o: Partial<EventoCandidato> = {}): EventoCandidato => ({
  id, titulo: `Evento ${id}`, inicio, zona: ZONA, clase: "puntual", imagen: "c.jpg", lugar_nombre: "Foro", sitio_texto: null, lugar_redes: [], van: 0, interesa: 0, destacado: false, publicado_en: null, ...o,
});

describe("las fechas de la semana", () => {
  it("lunes, días y la semana que viene", () => {
    expect(diaIso("2026-10-07")).toBe(3);
    expect(diaIso("2026-10-11")).toBe(7);
    expect(lunesDe("2026-10-11")).toBe("2026-10-05");
    expect(diasDe("2026-10-05")).toEqual(["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"]);
    expect(lunesDeLaSemana("esta", AHORA, ZONA)).toBe("2026-10-05");
    expect(lunesDeLaSemana("viene", AHORA, ZONA)).toBe(LUNES_VIENE);
    expect(salePara("2026-10-12", "19:00", ZONA)).toBe("2026-10-13T01:00:00.000Z");
    expect(rangoDeLaSemana("2026-10-05")).toBe("Del 5 al 11 de octubre");
    expect(rangoDeLaSemana("2026-09-28")).toBe("Del 28 de septiembre al 4 de octubre");
  });
});

describe("armar la semana", () => {
  const artistas = [
    cand("a-sin-fecha", { ultima_vez: null }),
    cand("a-con-fecha-martes", { proxima_inicio: "2026-10-14T02:00:00Z", proxima_zona: ZONA, proxima_lugar: "Aether" }),
    cand("a-con-fecha-fin", { proxima_inicio: "2026-10-17T01:00:00Z", proxima_zona: ZONA, proxima_lugar: "Teatro de la Paz" }),
    cand("a-ocupado", { ocupado_en: "2026-10-05" }),
  ];
  const lugares = [cand("l-sin", { eventos_semana: 0 }), cand("l-con", { eventos_semana: 2 })];
  const eventos = [
    ev("e-martes", "2026-10-13T20:00:00Z", { van: 1 }),
    ev("e-martes-mas", "2026-10-14T01:00:00Z", { destacado: true }),
    ev("e-vie", "2026-10-17T01:00:00Z"),
    ev("e-sab", "2026-10-17T18:00:00Z", { interesa: 4 }),
    ev("e-sab-publicado", "2026-10-17T20:00:00Z", { publicado_en: "2026-10-06T00:00:00Z", van: 9 }),
    ev("e-dom", "2026-10-19T02:00:00Z"),
    ev("e-dom-2", "2026-10-18T18:00:00Z", { imagen: null }),
  ];
  const semana = armarSemana({ lunes: LUNES_VIENE, zona: ZONA, ahora: AHORA, artistas, lugares, eventos, existentes: new Set() });
  const de = (fecha: string) => semana.find((c) => c.fecha === fecha)!;

  it("siete días con la regla: artista, evento, lugar, «Esta semana», artista con fecha el fin, evento, descanso", () => {
    expect(semana.map((c) => c.tipo)).toEqual(["artista", "evento", "lugar", "semana", "artista", "evento", "descanso"]);
    expect(semana.map((c) => c.hora)).toEqual(["19:00", "09:00", "19:00", "09:00", "19:00", "09:00", null]);
  });
  it("el viernes, quien tiene fecha del viernes al domingo; el lunes, el siguiente de la rotación (con fecha antes que sin ella)", () => {
    expect(de("2026-10-16").artista_id).toBe("a-con-fecha-fin");
    expect(de("2026-10-16").motivo).toBe("Artista con fecha ese mismo día en Teatro de la Paz, de San Luis Potosí, nunca en Instagram.");
    expect(de("2026-10-12").artista_id).toBe("a-sin-fecha");
  });
  it("nadie ocupado ni repetido", () => {
    expect(semana.some((c) => c.artista_id === "a-ocupado")).toBe(false);
  });
  it("el lugar con eventos esa semana primero", () => {
    expect(de("2026-10-14").lugar_id).toBe("l-con");
    expect(de("2026-10-14").motivo).toBe("Lugar con 2 eventos esta semana, de San Luis Potosí, nunca en Instagram.");
  });
  it("el evento del día: el de más señal de ese día, nunca uno ya publicado", () => {
    expect(de("2026-10-13").evento_id).toBe("e-martes-mas");
    expect(de("2026-10-17").evento_id).toBe("e-sab");
    expect(de("2026-10-13").motivo).toBe("El evento de ese día con más señal: destacado.");
  });
  it("«Esta semana»: los tres del fin con más señal que no salen solos ese fin, en orden de fecha", () => {
    expect(de("2026-10-15").eventos).toEqual(["e-vie", "e-sab-publicado", "e-dom"]);
    expect(de("2026-10-15").motivo).toBe("Carrusel de 4 imágenes: la portada y los carteles de los 3 eventos con más señal del fin.");
  });
  it("los días que ya están no se tocan; los que ya pasaron no se arman", () => {
    const hoy = armarSemana({ lunes: "2026-10-05", zona: ZONA, ahora: AHORA, artistas, lugares, eventos, existentes: new Set(["2026-10-09"]) });
    expect(hoy.map((c) => c.fecha)).toEqual(["2026-10-07", "2026-10-08", "2026-10-10", "2026-10-11"]);
  });
  it("sin nadie para un día, descansa y lo dice", () => {
    const vacia = armarSemana({ lunes: LUNES_VIENE, zona: ZONA, ahora: AHORA, artistas: [], lugares: [], eventos: [], existentes: new Set() });
    expect(vacia.every((c) => c.tipo === "descanso")).toBe(true);
    expect(vacia[0].motivo).toBe("No hay artistas con la ficha completa por salir.");
  });
});

describe("lo que dice cada día", () => {
  it("el estado: programado, hoy, publicando (ya le toca), publicado, quitado, sin trabajo", () => {
    const base = { estado: "programado", tipo: "artista", fecha: "2026-10-12", programado_para: "2026-10-13T01:00:00Z" };
    expect(estadoDelDia({ ...base, trabajo: { estado: "en_cola", siguiente_en: "2026-10-13T01:00:00Z" } }, AHORA, ZONA)).toBe("programado");
    expect(estadoDelDia({ ...base, fecha: "2026-10-07", trabajo: { estado: "en_cola", siguiente_en: "2026-10-08T01:00:00Z" } }, AHORA, ZONA)).toBe("hoy");
    expect(estadoDelDia({ ...base, trabajo: { estado: "en_cola", siguiente_en: "2026-10-07T15:59:00Z" } }, AHORA, ZONA)).toBe("publicando");
    expect(estadoDelDia({ ...base, trabajo: { estado: "publicado", siguiente_en: "2026-10-07T15:59:00Z" } }, AHORA, ZONA)).toBe("publicado");
    expect(estadoDelDia({ ...base, estado: "quitado", trabajo: null }, AHORA, ZONA)).toBe("quitado");
    expect(estadoDelDia({ ...base, trabajo: null }, AHORA, ZONA)).toBe("sin");
    expect(estadoDelDia({ ...base, tipo: "descanso", estado: "descanso", trabajo: null }, AHORA, ZONA)).toBe("descanso");
  });
  it("la primera línea del renglón", () => {
    expect(cuandoDelDia({ fecha: "2026-10-12", hora: "19:00:00", tipo: "artista" }, AHORA, ZONA)).toBe("Lun 12 · 7:00 pm · Artista");
    expect(cuandoDelDia({ fecha: "2026-10-07", hora: "19:00", tipo: "lugar" }, AHORA, ZONA)).toBe("Hoy · 7:00 pm · Lugar");
    expect(cuandoDelDia({ fecha: "2026-10-16", hora: "19:00", tipo: "artista" }, AHORA, ZONA)).toBe("Vie 16 · 7:00 pm · Artista con fecha el fin");
    expect(cuandoDelDia({ fecha: "2026-10-15", hora: "09:00", tipo: "semana" }, AHORA, ZONA, 4)).toBe("Jue 15 · 9:00 am · Esta semana · carrusel de 4");
    expect(cuandoDelDia({ fecha: "2026-10-18", hora: null, tipo: "descanso" }, AHORA, ZONA)).toBe("Dom 18 · Descanso");
    expect(cuandoDelDia({ fecha: "2026-10-18", hora: "19:00", tipo: "lugar" }, AHORA, ZONA)).toBe("Dom 18 · 7:00 pm · Lugar");
  });
  it("el aviso: solo con Instagram y sin salir todavía", () => {
    const d = { tipo: "artista" as const, cuenta: "nube", aviso_en: null, reemplaza: null };
    expect(lineaDelAviso(d, "programado", AHORA, ZONA)).toEqual({ texto: "Falta avisarle", falta: true });
    expect(lineaDelAviso({ ...d, aviso_en: "2026-10-05T17:00:00Z" }, "programado", AHORA, ZONA)).toEqual({ texto: "Avisado el lun 5 · sin respuesta", falta: false });
    expect(lineaDelAviso({ ...d, aviso_en: "2026-10-07T15:00:00Z" }, "hoy", AHORA, ZONA)?.texto).toBe("Avisado hoy · sin respuesta");
    expect(lineaDelAviso({ ...d, reemplaza: "Colectivo Nube de Papel (demo)" }, "programado", AHORA, ZONA)?.texto).toBe("Falta avisarle · en lugar de Colectivo Nube de Papel");
    expect(lineaDelAviso({ ...d, cuenta: null }, "programado", AHORA, ZONA)).toBeNull();
    expect(lineaDelAviso(d, "publicado", AHORA, ZONA)).toBeNull();
  });
  it("el resumen y el porqué", () => {
    expect(resumenSemana([{ estado: "publicado", fecha: "2026-10-05", falta: false }, { estado: "publicado", fecha: "2026-10-06", falta: false }, { estado: "hoy", fecha: "2026-10-07", falta: false }, { estado: "programado", fecha: "2026-10-08", falta: true }, { estado: "descanso", fecha: "2026-10-11", falta: false }])).toBe("2 publicadas · 2 programadas · 1 por avisar · el domingo descansa");
    expect(motivoDe(cand("x", { ultima_vez: "2026-02-01T00:00:00Z" }), "artista", "2026-10-12", AHORA)).toBe("Artista sin fecha próxima, de San Luis Potosí, en Instagram hace 8 meses.");
    expect(lineaCandidato(cand("x"), AHORA)).toBe("Sin fecha próxima · nunca en Instagram");
  });
  it("el enlace de la bio lleva la marca de origen de esa semana y esa ficha", () => {
    expect(enlaceDeLaBio("/artistas/valeria", "2026-10-12", "valeria")).toBe("/artistas/valeria?utm_source=instagram&utm_medium=bio&utm_campaign=semana-2026-10-12&utm_content=valeria");
  });
});

/** OL-487 (bitácora 519): la que viene se arma sola los miércoles entre las 9:00 y las 9:59 de la hora de la ciudad. */
describe("cuándo se arma sola la que viene", () => {
  it("el miércoles de 9:00 a 9:59 en la hora de la ciudad; ni antes, ni después, ni otro día", () => {
    expect(tocaArmarLaQueViene(new Date("2026-10-07T15:30:00Z"), ZONA)).toBe(true); // mié 9:30 en San Luis
    expect(tocaArmarLaQueViene(new Date("2026-10-07T15:00:00Z"), ZONA)).toBe(true); // mié 9:00
    expect(tocaArmarLaQueViene(new Date("2026-10-07T15:59:59Z"), ZONA)).toBe(true); // mié 9:59
    expect(tocaArmarLaQueViene(new Date("2026-10-07T14:59:00Z"), ZONA)).toBe(false); // mié 8:59
    expect(tocaArmarLaQueViene(new Date("2026-10-07T16:00:00Z"), ZONA)).toBe(false); // mié 10:00
    expect(tocaArmarLaQueViene(new Date("2026-10-08T15:30:00Z"), ZONA)).toBe(false); // jue 9:30
    expect(tocaArmarLaQueViene(new Date("2026-10-06T15:30:00Z"), ZONA)).toBe(false); // mar 9:30
  });
  it("en la hora de cada ciudad: el mismo instante es miércoles 9:30 en San Luis y 17:30 en Madrid", () => {
    expect(tocaArmarLaQueViene(new Date("2026-10-07T15:30:00Z"), "Europe/Madrid")).toBe(false);
    expect(tocaArmarLaQueViene(new Date("2026-10-07T07:30:00Z"), "Europe/Madrid")).toBe(true);
  });
  it("la línea de la portada: armada (con su día), se arma el miércoles, o no se armó", () => {
    expect(lineaDeLaQueViene("2026-10-07T15:30:12Z", AHORA, ZONA)).toBe("la que viene, armada el mié 7");
    expect(lineaDeLaQueViene("2026-10-04T23:00:00Z", AHORA, ZONA)).toBe("la que viene, armada el dom 4");
    expect(lineaDeLaQueViene(null, new Date("2026-10-05T18:00:00Z"), ZONA)).toBe("la que viene se arma el miércoles"); // lun
    expect(lineaDeLaQueViene(null, new Date("2026-10-07T15:30:00Z"), ZONA)).toBe("la que viene se arma el miércoles"); // mié 9:30
    expect(lineaDeLaQueViene(null, AHORA, ZONA)).toBe("la que viene no se armó"); // mié 10:00
    expect(lineaDeLaQueViene(null, new Date("2026-10-09T18:00:00Z"), ZONA)).toBe("la que viene no se armó"); // vie
  });
});

describe("OL-488: solo con material, y la sugerencia de un día sin publicación", () => {
  // Jueves 8 de octubre de 2026, 10:30 en San Luis Potosí: «Esta semana» (9:00) ya pasó.
  const JUEVES = new Date("2026-10-08T16:30:00Z");
  const LUNES = "2026-10-05";
  const FOTOS = "https://app.test/storage/v1/object/public/fotos/";
  const propio = (e: EventoCandidato) => !!e.imagen?.startsWith(FOTOS);
  const eventos = [
    ev("e-vie", "2026-10-10T02:00:00Z", { imagen: `${FOTOS}vie.jpg`, van: 3 }),
    ev("e-sab-sin", "2026-10-10T20:00:00Z", { imagen: null, destacado: true }),
    ev("e-sab-ajeno", "2026-10-10T21:00:00Z", { imagen: "https://otra.test/c.jpg", van: 9 }),
    ev("e-sab", "2026-10-10T22:00:00Z", { imagen: `${FOTOS}sab.jpg` }),
  ];

  it("un evento sin cartel, o con uno que la app no puede bajar, no sale el día del evento ni en «Esta semana»", () => {
    const semana = armarSemana({ lunes: LUNES, zona: ZONA, ahora: new Date("2026-10-04T16:00:00Z"), artistas: [], lugares: [], eventos, existentes: new Set(), conCartel: propio });
    const de = (fecha: string) => semana.find((c) => c.fecha === fecha)!;
    expect(de("2026-10-10").evento_id).toBe("e-sab");
    expect(de("2026-10-08").eventos).toEqual(["e-vie"]);
    // Sin ningún evento con cartel ese día, descansa y dice por qué.
    const sinCartel = armarSemana({ lunes: LUNES, zona: ZONA, ahora: new Date("2026-10-04T16:00:00Z"), artistas: [], lugares: [], eventos: [ev("e-mar", "2026-10-06T20:00:00Z", { imagen: null })], existentes: new Set(), conCartel: propio });
    expect(sinCartel.find((c) => c.fecha === "2026-10-06")).toMatchObject({ tipo: "descanso", motivo: SIN_CARTEL_DIA });
  });

  it("la sugerencia de hoy aunque su hora ya pasó (para «Publicar ahora»); el domingo y fuera de la semana, nada", () => {
    const hoy = sugerirDia({ fecha: "2026-10-08", lunes: LUNES, zona: ZONA, ahora: JUEVES, artistas: [], lugares: [], eventos, conCartel: propio });
    // Solo ese día: los dos del fin con cartel (el sábado no está apartado), nunca los que no tienen cartel propio.
    expect(hoy).toMatchObject({ fecha: "2026-10-08", tipo: "semana", hora: "09:00", eventos: ["e-vie", "e-sab"] });
    expect(sugerirDia({ fecha: "2026-10-11", lunes: LUNES, zona: ZONA, ahora: JUEVES, artistas: [], lugares: [], eventos })).toBeNull();
    expect(sugerirDia({ fecha: "2026-10-14", lunes: LUNES, zona: ZONA, ahora: JUEVES, artistas: [], lugares: [], eventos })).toBeNull();
    // Un día de artista sin nadie con material: descansa con el motivo de la regla.
    expect(sugerirDia({ fecha: "2026-10-09", lunes: LUNES, zona: ZONA, ahora: JUEVES, artistas: [], lugares: [], eventos })).toMatchObject({ tipo: "descanso", motivo: NADIE_ARTISTA });
    // Lo ya usado en la semana no se sugiere otra vez.
    const a = [cand("a-1"), cand("a-2")];
    expect(sugerirDia({ fecha: "2026-10-09", lunes: LUNES, zona: ZONA, ahora: JUEVES, artistas: a, lugares: [], eventos, usados: new Set(["a-1"]) })?.artista_id).toBe("a-2");
  });

  it("lo que dicen los renglones nuevos", () => {
    expect(nadieConMaterial("2026-10-08", JUEVES, ZONA)).toBe("Nadie con material para hoy");
    expect(nadieConMaterial("2026-10-09", JUEVES, ZONA)).toBe("Nadie con material para el vie 9");
    expect(lineaDelPasado("2026-10-07", "sin-armar", JUEVES, ZONA)).toBe("Mié 7 · antes de armar la semana");
    expect(lineaDelPasado("2026-10-06", "nadie", JUEVES, ZONA)).toBe("Mar 6 · nadie con material");
    expect(queFalta(["portada"])).toBe("Falta la portada");
    expect(queFalta(["foto", "portada"])).toBe("Falta la foto y la portada");
    expect(queFalta(["portada_ajena"])).toBe("Su portada es de otra página: hay que subirla a la app");
    expect(queFalta(["foto", "portada_ajena"])).toBe("Falta la foto; su portada es de otra página: hay que subirla a la app");
    expect(resumenDeLaFalta(3, 2)).toBe("3 artistas y 2 lugares con fecha se quedaron fuera por falta de foto o portada");
    expect(resumenDeLaFalta(1, 0)).toBe("1 artista con fecha se quedó fuera por falta de foto o portada");
    expect(resumenDeLaFalta(0, 0)).toBeNull();
    expect(razonDelPedido(["portada"])).toBe("Completa tu portada y te presentamos en Instagram");
    expect(razonDelPedido(["foto", "portada_ajena"])).toBe("Completa tu foto y tu portada y te presentamos en Instagram");
  });
});
