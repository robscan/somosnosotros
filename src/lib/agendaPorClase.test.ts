import { describe, expect, it } from "vitest";
import { contarAgenda, exposicionesEnAgenda, filtrosDeUrl, filtrosPuestos, filtrosRecordados, hrefAgenda, listarAgenda, paraVisitarEnAgenda, SIN_FILTROS, textoVer, type EventoAgenda, type FiltrosAgenda } from "./agenda";
import { abiertasEseDia, componerDia, entraEnQue, exposicionesVigentes, festivalesVigentes, marcosDe, notaDeVisita, plegarActos, queDe, rangosDeVisita, sinPuntoEnCalendario, textoAbre, textoBloque, textoHastaEl, tituloParaVisitar } from "./agendaPorClase";
import { archivoIcs } from "./calendario";
import type { Agenda } from "./cargarAgenda";
import { cuandoDeTarjeta, notaDeClase, selloDeTarjeta, tarjetaConClase, tarjetaEvento } from "./destacados";
import { calcularCarrilesAgenda, carrilDestacados, carrilEstaSemana, carrilEstelar, carrilFestivales, carrilMasAdelante, carrilNuevos, TOPE_FESTIVALES } from "./inicio";
import { ocurrenciasDe, proximaOcurrencia, textoParte } from "./ocurrencias";

// Miércoles 7 de octubre de 2026, 12:00 en la ciudad (seis horas detrás de UTC, sin horario de verano).
const ahora = new Date("2026-10-07T18:00:00Z");
const HOY = "2026-10-07";
const ZONA = "America/Mexico_City";
const a = (dia: string, hora: string) => new Date(`${dia}T${hora}:00-06:00`).toISOString();
const MA_DO = [{ dias: [2, 3, 4, 5, 6, 7], abre: "10:00", cierra: "18:00" }];

function evento(id: string, cambios: Partial<EventoAgenda> = {}): EventoAgenda {
  return { id, slug: id, titulo: id, inicio: a(HOY, "20:00"), fin: null, zona: ZONA, imagen: null, precio: null, lugar_id: null, sitio_texto: "Foro", sitio_reservado: false, lugar: null, creado_en: "2026-09-01T00:00:00Z", van: 0, ...cambios };
}
const expo = (id: string, desde: string, hasta: string, cambios: Partial<EventoAgenda> = {}) => evento(id, { clase: "exposicion", inicio: a(desde, "00:00"), fin: a(hasta, "23:59"), ...cambios });

// Exposiciones: abierta hoy con el horario de su lugar; sin horario; que abre el lunes; lejana; sin poder leer su horario.
const ecos = expo("ecos", "2026-10-04", "2026-10-31", { titulo: "Ecos de papel", horario: MA_DO, lugar_id: "muni" });
const grabado = expo("grabado", "2026-10-01", "2026-10-20", { titulo: "Grabado potosino", horario: [] });
const futura = expo("futura", "2026-10-12", "2026-11-30", { titulo: "Fotovisión", horario: [{ dias: [1, 2, 3, 4, 5], abre: "11:00", cierra: "19:00" }] });
const lejana = expo("lejana", "2026-10-25", "2026-12-01", { horario: MA_DO });
const sinLeer = expo("sin-leer", "2026-10-01", "2026-10-09");
// Un festival: el marco (del 9 al 11) con cuatro actos publicados; tres en la agenda y uno lejos. Un acto de un festival que no se cargó.
const cine = evento("cine", { clase: "festival", titulo: "Festival de Cine", inicio: a("2026-10-09", "19:00"), fin: a("2026-10-20", "21:00"), programa: { registrados: 4 } });
const cine1 = evento("cine1", { evento_padre_id: "cine", inicio: a("2026-10-09", "19:00") });
const cine2 = evento("cine2", { evento_padre_id: "cine", inicio: a("2026-10-10", "18:00"), lugar_id: "cineteca" });
const cine3 = evento("cine3", { evento_padre_id: "cine", inicio: a("2026-10-10", "20:00") });
const cine4 = evento("cine4", { evento_padre_id: "cine", inicio: a("2026-10-20", "19:00") });
// Un festival de un día que viene, sin actos en la semana (OL-342): el sábado 31, de las 18:00 a la medianoche.
const electric = evento("electric", { clase: "festival", titulo: "Electric Universe", inicio: a("2026-10-31", "18:00"), fin: a("2026-11-01", "00:00"), programa: { registrados: 3 } });
const huerfano = evento("huerfano", { evento_padre_id: "otro", inicio: a("2026-10-10", "12:00") });
// Un taller de tres sesiones y un evento de siempre.
const SESIONES = [
  { inicio: a("2026-10-08", "17:00"), fin: a("2026-10-08", "19:00") },
  { inicio: a("2026-10-10", "18:00"), fin: a("2026-10-10", "20:00") },
  { inicio: a("2026-10-12", "17:00"), fin: a("2026-10-12", "19:00") },
];
const taller = evento("taller", { clase: "taller", inicio: SESIONES[0].inicio, fin: SESIONES[2].fin, sesiones: SESIONES });
const concierto = evento("concierto", { inicio: a(HOY, "20:00") });

const TODOS = [ecos, grabado, futura, lejana, sinLeer, cine, cine1, cine2, cine3, cine4, huerfano, taller, concierto];
const agenda = (cambios: Partial<Agenda> = {}): Agenda => ({ eventos: TODOS, seguidos: null, eventosSeguidos: [], artistasSeguidos: null, asistencias: null, destacados: [], ...cambios });
const ids = (lista: { id: string }[]) => lista.map((e) => e.id);
const con = (f: Partial<FiltrosAgenda>): FiltrosAgenda => ({ ...SIN_FILTROS, ...f });

describe("ocurrencias por clase (OL-322)", () => {
  it("una exposición y el marco de un festival no tienen ocurrencias; sus actos y las sesiones del taller sí", () => {
    expect(ocurrenciasDe(ecos)).toEqual([]);
    expect(ocurrenciasDe(cine)).toEqual([]);
    expect(ocurrenciasDe(cine1)).toHaveLength(1);
    expect(ocurrenciasDe(taller).map((o) => o.inicio)).toEqual(SESIONES.map((s) => s.inicio));
  });
  it("el taller dice «Sesión n de N»; los demás, «Día n de N»", () => {
    expect(ocurrenciasDe(taller).map(textoParte)).toEqual(["Sesión 1 de 3", "Sesión 2 de 3", "Sesión 3 de 3"]);
    expect(ocurrenciasDe({ ...taller, clase: "puntual" }).map(textoParte)[1]).toBe("Día 2 de 3");
  });
  it("una exposición o un festival en su próximo día: el evento tal cual (los carriles que hablan del evento)", () => {
    expect(proximaOcurrencia(ecos, ahora)).toMatchObject({ id: "ecos", inicio: ecos.inicio });
  });
});

describe("«Para visitar»: vigencia, orden y horario", () => {
  it("vigentes en Inicio: las que no han cerrado y ya abrieron o abren esta semana, la que cierra antes primero", () => {
    expect(ids(exposicionesVigentes(TODOS, ahora))).toEqual(["sin-leer", "grabado", "ecos", "futura"]);
  });
  it("abierta un día según su horario propio o del lugar (ya resuelto en `horario`); sin horario, o sin poder leerlo, no", () => {
    expect(ids(abiertasEseDia(TODOS, HOY))).toEqual(["ecos"]);
    // El lunes 12 el MUNI cierra; Fotovisión abre ese día de 11 a 19.
    expect(ids(abiertasEseDia(TODOS, "2026-10-12"))).toEqual(["futura"]);
    expect(textoAbre(rangosDeVisita(ecos, HOY))).toBe("Abre 10:00 a.m.–6:00 p.m.");
    expect(rangosDeVisita(grabado, HOY)).toEqual([]);
    expect(rangosDeVisita(ecos, "2026-11-01")).toEqual([]); // fuera de su periodo
  });
  it("lo que dice de un día la lista de exposiciones", () => {
    expect(notaDeVisita(ecos, HOY, HOY)).toBe("Abre hoy 10:00 a.m.–6:00 p.m.");
    expect(notaDeVisita(ecos, "2026-10-10", HOY)).toBe("Abre 10:00 a.m.–6:00 p.m.");
    expect(notaDeVisita(ecos, "2026-10-12", HOY)).toBe("Cierra ese día");
    expect(notaDeVisita(grabado, HOY, HOY)).toBeNull(); // su cuándo ya dice «Horario por confirmar»
    expect(notaDeVisita(sinLeer, HOY, HOY)).toBeNull();
    expect(notaDeVisita(futura, HOY, HOY)).toBeNull();
  });
  it("textos: hasta cuándo y el título de la sección", () => {
    expect(textoHastaEl(ecos, ahora)).toBe("hasta el sáb 31 de oct");
    expect(tituloParaVisitar(HOY, HOY)).toBe("Para visitar hoy");
    expect(tituloParaVisitar("2026-10-08", HOY)).toBe("Para visitar mañana");
    expect(tituloParaVisitar("2026-10-10", HOY, ahora, ZONA)).toBe("Para visitar el sáb 10 de oct");
  });
});

describe("el festival en la agenda de un día", () => {
  it("sus actos del día van en un bloque, donde va el primero; un acto sin su marco cargado es un renglón", () => {
    const dia = [huerfano, taller, cine2, cine3];
    const piezas = componerDia(dia, marcosDe(TODOS));
    expect(piezas.map((p) => (p.tipo === "festival" ? `festival:${p.marco.id}:${ids(p.actos)}` : p.evento.id))).toEqual(["huerfano", "taller", "festival:cine:cine2,cine3"]);
  });
  it("«Programa registrado: 4 actividades · hoy 2» o «· 2 este día»", () => {
    expect(textoBloque(4, 2, true)).toBe("Programa registrado: 4 actividades · hoy 2");
    expect(textoBloque(1, 1, false)).toBe("Programa registrado: 1 actividad · 1 este día");
  });
  it("en una lista por evento (la pestaña Nuevos de la agenda) los actos de un marco presente se pliegan en él", () => {
    expect(ids(plegarActos([cine, cine1, cine2, huerfano, concierto]))).toEqual(["cine", "huerfano", "concierto"]);
    expect(ids(plegarActos([cine1, cine2]))).toEqual(["cine1", "cine2"]); // sin su marco, salen sueltos
  });
});

describe("la agenda (Todos y Nuevos) por clase", () => {
  it("Todos: ni exposiciones ni el marco son renglones; las sesiones y los actos sí", () => {
    const lista = listarAgenda(agenda(), SIN_FILTROS, undefined, ahora);
    expect(lista.some((e) => e.clase === "exposicion" || e.clase === "festival")).toBe(false);
    // El sábado 10 a las 18:00 empatan una sesión y un acto: van por título.
    expect(ids(lista)).toEqual(["concierto", "taller", "cine1", "huerfano", "cine2", "taller", "cine3", "taller", "cine4"]);
  });
  it("«Qué»: eventos, talleres y festivales eligen su clase", () => {
    expect(ids(listarAgenda(agenda(), con({ que: "eventos" }), undefined, ahora))).toEqual(["concierto"]);
    expect(ids(listarAgenda(agenda(), con({ que: "talleres" }), undefined, ahora))).toEqual(["taller", "taller", "taller"]);
    expect(ids(listarAgenda(agenda(), con({ que: "festivales" }), undefined, ahora))).toEqual(["cine1", "huerfano", "cine2", "cine3", "cine4"]);
    expect(listarAgenda(agenda(), con({ que: "exposiciones" }), undefined, ahora)).toEqual([]);
    expect(entraEnQue(huerfano, "eventos")).toBe(false);
  });
  it("«Solo lo que sigo» elige actos y los agrupa bajo su festival", () => {
    const lista = listarAgenda(agenda({ seguidos: ["cineteca"] }), con({ siguiendo: true }), undefined, ahora);
    expect(ids(lista)).toEqual(["cine2"]);
    expect(componerDia(lista, marcosDe(TODOS))[0]).toMatchObject({ tipo: "festival", marco: { id: "cine" } });
  });
  it("«Para visitar hoy»: hoy, o el primer día de Cuándo; con otro «Qué» o en Nuevos, no hay sección", () => {
    expect(paraVisitarEnAgenda(agenda(), SIN_FILTROS, HOY)).toMatchObject({ dia: HOY, exposiciones: [{ id: "ecos" }] });
    expect(paraVisitarEnAgenda(agenda(), con({ cuando: { desde: "2026-10-12", hasta: "2026-10-12" } }), HOY)).toMatchObject({ dia: "2026-10-12", exposiciones: [{ id: "futura" }] });
    expect(paraVisitarEnAgenda(agenda(), con({ que: "talleres" }), HOY)).toBeNull();
    expect(paraVisitarEnAgenda(agenda(), SIN_FILTROS, HOY, 0)).toBeNull();
    // Cuánto también filtra lo que hay para visitar.
    expect(paraVisitarEnAgenda(agenda(), con({ cuanto: ["costo"] }), HOY)?.exposiciones).toEqual([]);
  });
  it("«Qué» en Exposiciones: todas las que no han cerrado (con o sin horario), o las de esas fechas, la que cierra antes primero", () => {
    expect(ids(exposicionesEnAgenda(agenda(), con({ que: "exposiciones" })))).toEqual(["sin-leer", "grabado", "ecos", "futura", "lejana"]);
    expect(ids(exposicionesEnAgenda(agenda(), con({ que: "exposiciones", cuando: { desde: "2026-10-21", hasta: "2026-10-25" } })))).toEqual(["ecos", "futura", "lejana"]);
  });
  it("Nuevos: la exposición y el marco son un evento más; los actos de un festival nuevo se pliegan en él", () => {
    expect(ids(listarAgenda(agenda(), SIN_FILTROS, 0, ahora))).toEqual(["grabado", "sin-leer", "ecos", "concierto", "taller", "cine", "huerfano", "futura", "lejana"]);
    expect(ids(listarAgenda(agenda(), con({ que: "exposiciones" }), 0, ahora))).toEqual(["grabado", "sin-leer", "ecos", "futura", "lejana"]);
  });
});

describe("los números de la agenda", () => {
  it("cuentan renglones (sesiones y actos; el marco no) y aparte lo que hay para visitar", () => {
    expect(contarAgenda(agenda(), SIN_FILTROS, HOY, undefined, ahora)).toEqual({ renglones: 9, visitar: 1 });
    expect(contarAgenda(agenda(), con({ cuando: { desde: "2026-10-10", hasta: "2026-10-10" } }), HOY, undefined, ahora)).toEqual({ renglones: 4, visitar: 1 });
    expect(contarAgenda(agenda(), con({ que: "exposiciones" }), HOY, undefined, ahora)).toEqual({ renglones: 0, visitar: 5 });
  });
  it("lo que dice el botón", () => {
    expect(textoVer({ renglones: 9, visitar: 1 })).toBe("Ver 9 eventos y 1 para visitar");
    expect(textoVer({ renglones: 1, visitar: 0 })).toBe("Ver 1 evento");
    expect(textoVer({ renglones: 0, visitar: 2 })).toBe("Ver 2 para visitar");
    expect(textoVer({ renglones: 0, visitar: 0 })).toBe("Sin eventos");
    expect(textoVer({ renglones: 0, visitar: 5 }, "exposiciones")).toBe("Ver 5 exposiciones");
    expect(textoVer({ renglones: 0, visitar: 0 }, "exposiciones")).toBe("Sin exposiciones");
    expect(textoVer(null)).toBe("Ver eventos");
  });
  it("el calendario de Cuándo: sin punto por una exposición ni por el marco", () => {
    expect([ecos, cine, cine1, taller].map(sinPuntoEnCalendario)).toEqual([true, true, false, false]);
  });
});

describe("«Qué» en la URL y en la memoria de pantalla", () => {
  it("va y vuelve como los demás filtros; «todo» o lo que no se reconoce no se guarda", () => {
    expect(hrefAgenda(con({ que: "exposiciones" }))).toBe("/agenda?que=exposiciones");
    expect(filtrosDeUrl({ que: "talleres" })).toEqual(con({ que: "talleres" }));
    expect(filtrosDeUrl({ que: "cercanos" })).toEqual(SIN_FILTROS);
    expect(filtrosRecordados({ ...SIN_FILTROS, que: "festivales" })).toEqual(con({ que: "festivales" }));
    expect(filtrosRecordados({ ...SIN_FILTROS, que: "todo" })).toEqual(SIN_FILTROS);
    expect(queDe(undefined)).toBe("todo");
  });
  it("cuenta como un filtro puesto", () => {
    expect(filtrosPuestos(con({ que: "talleres" }))).toBe(1);
    expect(filtrosPuestos(con({ que: "todo" }))).toBe(0);
  });
});

describe("Inicio por clase", () => {
  it("«Esta semana»: los actos de un festival sueltos, cada uno en su día; ni el marco ni la exposición (OL-347)", () => {
    const vistos = new Set<string>();
    const carril = carrilEstaSemana(TODOS, vistos, ahora);
    expect(ids(carril)).toEqual(["concierto", "taller", "cine1", "huerfano", "cine2", "taller", "cine3", "taller"]);
    expect(carril.some((e) => e.clase === "festival" || e.clase === "exposicion")).toBe(false);
    expect(vistos.has("cine")).toBe(false); // el marco no salió aquí
  });
  it("«Festivales y exposiciones»: las exposiciones vigentes y el festival que viene, sin las que ya salieron en otro carril", () => {
    expect(ids(carrilFestivales(TODOS, new Set(["grabado"]), ahora))).toEqual(["sin-leer", "ecos", "cine", "futura"]);
    expect(carrilFestivales([concierto], new Set(), ahora)).toEqual([]);
  });
  it("los carriles juntos: el festival con actos en la semana sale solo en «Festivales y exposiciones»; sus actos, en «Esta semana» (OL-347)", () => {
    const carriles = calcularCarrilesAgenda(agenda(), ahora);
    expect(ids(carriles.estaSemana)).not.toContain("cine");
    expect(ids(carriles.estaSemana)).toEqual(expect.arrayContaining(["cine1", "cine2", "cine3"]));
    expect(ids(carriles.festivales)).toEqual(["sin-leer", "grabado", "ecos", "cine", "futura"]);
    expect(carriles.festivales.find((e) => e.id === "cine")?.programa).toEqual({ registrados: 4 }); // su programa entero
    expect(carriles.estaSemana.some((e) => e.clase === "exposicion")).toBe(false);
    // Un festival sin actos en la semana no está en «Esta semana»: sale aquí, en su lugar por cercanía.
    expect(ids(calcularCarrilesAgenda(agenda({ eventos: [...TODOS, electric] }), ahora).festivales)).toEqual(["sin-leer", "grabado", "ecos", "cine", "futura", "electric"]);
  });
  it("un festival destacado no sale en «Destacados» sino en su carril; uno en «Tus planes», también; una exposición ya vista, no (OL-346, OL-347)", () => {
    const carriles = calcularCarrilesAgenda(agenda({ eventos: [...TODOS, electric], destacados: [{ id: "electric", motivo: "elegido", hasta: null, van: 0 }, { id: "ecos", motivo: "elegido", hasta: null, van: 0 }] }), ahora);
    expect(ids(carriles.estelar)).toEqual(["ecos"]);
    expect(ids(carriles.festivales)).toEqual(["sin-leer", "grabado", "cine", "futura", "electric"]);
    const conPlanes = calcularCarrilesAgenda(agenda({ eventos: [...TODOS, electric], asistencias: { electric: "me_interesa" } }), ahora);
    expect(ids(conPlanes.festivales)).toContain("electric");
  });
  it("«Nuevos eventos» y «Más adelante»: un festival nuevo no sale; sus actos sí, como cualquier evento (OL-347)", () => {
    const tarde = (e: EventoAgenda, dias: number) => ({ ...e, inicio: new Date(Date.parse(e.inicio) + dias * 86400000).toISOString(), fin: null, creado_en: "2026-10-06T00:00:00Z" });
    const nuevos = carrilNuevos([tarde(cine, 20), tarde(cine1, 20), tarde(cine2, 20), tarde(concierto, 20), tarde(huerfano, 20)], new Set(), ahora);
    expect(ids(nuevos).toSorted()).toEqual(["cine1", "cine2", "concierto", "huerfano"]);
    const masAdelante = carrilMasAdelante(agenda(), ahora);
    expect(masAdelante.some((e) => e.clase === "festival")).toBe(false);
    expect(masAdelante.some((e) => e.evento_padre_id === "cine")).toBe(true);
  });
  it("la tarjeta: «Hasta el …» y «Horario por confirmar»; el marco con su periodo y su programa; sin «Voy»", () => {
    expect(cuandoDeTarjeta(ecos, ahora)).toBe("Hasta el sáb 31 de oct");
    expect(cuandoDeTarjeta(grabado, ahora)).toBe("Hasta el mar 20 de oct");
    expect(notaDeClase(grabado)).toBe("Horario por confirmar");
    expect(notaDeClase(ecos)).toBeNull();
    expect(notaDeClase(sinLeer)).toBeNull(); // sin poder leer su horario no se dice nada
    expect(cuandoDeTarjeta(futura, ahora)).toBe("Del 12 de oct al 30 de nov");
    expect(cuandoDeTarjeta(cine, ahora)).toBe("Del 9 al 20 de oct");
    expect(notaDeClase(cine)).toBe("Programa registrado: 4 actividades");
    expect(tarjetaEvento(ecos, ahora)).toMatchObject({ sinVoy: true, hoy: false, detalle: "Hasta el sáb 31 de oct", sitio: "Foro" });
    expect(tarjetaEvento(grabado, ahora).sitio).toBe("Foro · Horario por confirmar");
    expect(tarjetaEvento(cine, ahora).sitio).toBe("Programa registrado: 4 actividades");
    expect(tarjetaEvento(cine, ahora).sinVoy).toBe(true);
    expect(tarjetaEvento(concierto, ahora).sinVoy).toBeUndefined();
    expect(tarjetaEvento(ocurrenciasDe(taller)[1], ahora).parte).toBe("Sesión 2 de 3");
  });
});

describe("«Festivales y exposiciones» (OL-342)", () => {
  // Un festival en curso (del 5 al 7: su fin se guardó a las 00:00 del 8, el cierre del 7), uno de un día que viene (sáb 31, de 18:00 a las 00:00),
  // uno que se sabe sin actos, uno que ya pasó y una exposición que es parte de un festival cargado.
  const fiesta = evento("fiesta", { clase: "festival", titulo: "Fiesta del barrio", inicio: a("2026-10-05", "18:00"), fin: a("2026-10-08", "00:00"), programa: { registrados: 2 } });
  const vacio = evento("vacio", { clase: "festival", inicio: a("2026-10-15", "18:00"), fin: a("2026-10-16", "00:00"), programa: { registrados: 0 } });
  const pasado = evento("pasado", { clase: "festival", inicio: a("2026-10-02", "18:00"), fin: a("2026-10-06", "23:00"), programa: { registrados: 3 } });
  const expoDelFestival = expo("expo-electric", "2026-10-03", "2026-10-30", { evento_padre_id: "electric" });
  const LISTA = [ecos, grabado, futura, lejana, sinLeer, fiesta, electric, vacio, pasado, expoDelFestival, concierto, cine1];

  it("lo que está en curso primero, lo que termina antes; luego lo que viene, por su inicio; festivales y exposiciones mezclados", () => {
    expect(ids(carrilFestivales(LISTA, new Set(), ahora))).toEqual(["fiesta", "sin-leer", "grabado", "ecos", "futura", "vacio", "electric"]);
  });
  it("un festival en curso va antes que una exposición que abre después", () => {
    expect(ids(carrilFestivales([futura, fiesta], new Set(), ahora))).toEqual(["fiesta", "futura"]);
  });
  it("el acto de un festival cargado no sale suelto (lo dice su marco), aunque sea una exposición; sin el marco, sí", () => {
    expect(ids(carrilFestivales(LISTA, new Set(), ahora))).not.toContain("expo-electric");
    expect(ids(carrilFestivales([expoDelFestival], new Set(), ahora))).toEqual(["expo-electric"]);
  });
  it("todos los festivales que no han pasado: también el que aún no tiene actos (OL-346) y el que no se pudo contar; el que ya pasó, no", () => {
    expect(ids(festivalesVigentes([fiesta, electric, vacio, pasado], ahora))).toEqual(["fiesta", "electric", "vacio"]);
    expect(ids(festivalesVigentes([{ ...vacio, programa: undefined }], ahora))).toEqual(["vacio"]);
  });
  it("un festival sin actos dice «Programa por confirmar» junto a lo capturado; sin poder contarlo, nada (OL-346)", () => {
    expect(notaDeClase(vacio)).toBe("Programa por confirmar");
    expect(tarjetaConClase(vacio, ahora)).toMatchObject({ clase: "Festival", sitio: "Foro · Programa por confirmar" });
    expect(tarjetaConClase({ ...vacio, sitio_texto: null }, ahora).sitio).toBe("Programa por confirmar"); // sin decir dos veces «por confirmar»
    expect(notaDeClase({ ...vacio, programa: undefined })).toBeNull();
  });
  it("un festival ya visto en un carril anterior sale igual; una exposición ya vista, no; lo que sale queda visto para el que sigue", () => {
    const vistos = new Set(["fiesta", "sin-leer"]);
    expect(ids(carrilFestivales(LISTA, vistos, ahora)).slice(0, 2)).toEqual(["fiesta", "grabado"]);
    expect(vistos.has("electric")).toBe(true);
    expect(vistos.has("vacio")).toBe(true);
    expect(vistos.has("lejana")).toBe(false);
  });
  it("los actos de un festival que salió aquí no quedan vistos: salen después en «Nuevos eventos» como cualquier evento (OL-347)", () => {
    const vistos = new Set<string>();
    const lejano = (e: EventoAgenda) => ({ ...e, inicio: new Date(Date.parse(e.inicio) + 20 * 86400000).toISOString(), fin: null, creado_en: "2026-10-06T00:00:00Z" });
    const lista = [lejano(cine), lejano(cine1), lejano(cine2), lejano(cine3), lejano(concierto)];
    expect(ids(carrilFestivales(lista, vistos, ahora))).toEqual(["cine"]);
    expect(ids(carrilNuevos(lista, vistos, ahora)).toSorted()).toEqual(["cine1", "cine2", "cine3", "concierto"]);
  });
  it("con tope; sin nada, vacío (el carril no se pinta)", () => {
    const muchos = Array.from({ length: TOPE_FESTIVALES + 5 }, (_, i) => evento(`f${i}`, { clase: "festival", inicio: a("2026-11-01", "18:00"), fin: a("2026-11-02", "00:00") }));
    expect(carrilFestivales(muchos, new Set(), ahora)).toHaveLength(TOPE_FESTIVALES);
    expect(carrilFestivales([concierto, cine1, taller], new Set(), ahora)).toEqual([]);
  });
  it("la tarjeta dice qué es («Festival», «Exposición») en su rótulo y su fecha propia", () => {
    expect(tarjetaConClase(electric, ahora)).toMatchObject({ clase: "Festival", detalle: "sáb 31 de oct", sinVoy: true });
    expect(tarjetaConClase(fiesta, ahora)).toMatchObject({ clase: "Festival", detalle: "Del 5 al 7 de oct" });
    expect(tarjetaConClase(ecos, ahora)).toMatchObject({ clase: "Exposición", detalle: "Hasta el sáb 31 de oct" });
    expect(tarjetaEvento(ecos, ahora).clase).toBeUndefined(); // los demás carriles no cambian
    expect(selloDeTarjeta(tarjetaConClase(ecos, ahora))).toEqual({ texto: "Exposición", tuyo: false, hoy: false });
    expect(selloDeTarjeta({ ...tarjetaConClase(electric, ahora), hoy: true })).toEqual({ texto: "Hoy · Festival", tuyo: false, hoy: true });
    expect(selloDeTarjeta(tarjetaConClase(fiesta, ahora), true)).toEqual({ texto: "Te interesa", tuyo: true, hoy: false });
  });
});

describe("los festivales solo en su carril (OL-347)", () => {
  // Founder, 2026-10-08: «Evita poner festivales en otros carriles». El festival, destacado, seguido y nuevo a la vez; sus actos, en la semana y lejos.
  const nuevo = (e: EventoAgenda, dias = 0) => ({ ...e, inicio: new Date(Date.parse(e.inicio) + dias * 86400000).toISOString(), creado_en: "2026-10-06T00:00:00Z" });
  const eventos = [nuevo(cine), nuevo(cine1), nuevo(cine2), nuevo(cine3), nuevo(cine4), nuevo(electric), nuevo(concierto), nuevo(huerfano, 20), nuevo(evento("lejos", { inicio: a("2026-10-25", "20:00") }))];
  const destacados = [{ id: "cine", motivo: "elegido" as const, hasta: null, van: 0 }, { id: "electric", motivo: "elegido" as const, hasta: null, van: 0 }, { id: "cine2", motivo: "elegido" as const, hasta: null, van: 0 }];
  const deFestival = (lista: EventoAgenda[]) => lista.filter((e) => e.clase === "festival");

  it("nunca en «Destacados», «Esta semana», «Nuevos eventos» ni «Más adelante», aunque esté destacado o sea nuevo; sí en su carril", () => {
    const carriles = calcularCarrilesAgenda(agenda({ eventos, destacados }), ahora);
    expect(deFestival(carriles.estelar)).toEqual([]);
    expect(deFestival(carriles.estaSemana)).toEqual([]);
    expect(deFestival(carriles.nuevos)).toEqual([]);
    expect(deFestival(carrilMasAdelante(agenda({ eventos, destacados }), ahora))).toEqual([]);
    expect(ids(carriles.festivales)).toEqual(["cine", "electric"]);
  });
  it("sus actos sí, como cualquier evento: el destacado en «Destacados», los de la semana en «Esta semana», el nuevo y lejano en «Nuevos eventos»", () => {
    const carriles = calcularCarrilesAgenda(agenda({ eventos, destacados }), ahora);
    expect(ids(carriles.estelar)).toEqual(["cine2"]);
    expect(ids(carriles.estaSemana)).toEqual(expect.arrayContaining(["cine1", "cine3"]));
    expect(ids(carriles.nuevos)).toContain("cine4");
  });
  it("«Seleccionados para ti»: ni el festival destacado ni el que se sigue; sus actos, sí", () => {
    expect(ids(carrilEstelar([cine, cine2], [electric, cine1], new Set()))).toEqual(["cine2", "cine1"]);
    expect(ids(carrilDestacados([electric, cine2], new Set()))).toEqual(["cine2"]);
  });
});

describe("el archivo de calendario de una exposición", () => {
  it("todo el día, del primer día de visita al de cierre (el fin es el día siguiente), sin alerta", () => {
    const ics = archivoIcs({ id: "ecos", slug: "ecos", titulo: "Ecos de papel", inicio: ecos.inicio, fin: ecos.fin, descripcion: null, lugar: "MUNI" }, ahora, [], { desde: "2026-10-04", hasta: "2026-10-31" });
    expect(ics).toContain("DTSTART;VALUE=DATE:20261004");
    expect(ics).toContain("DTEND;VALUE=DATE:20261101");
    expect(ics).not.toContain("VALARM");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });
});
