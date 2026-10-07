import { describe, expect, it } from "vitest";
import { contarAgenda, exposicionesEnAgenda, filtrosDeUrl, filtrosPuestos, filtrosRecordados, hrefAgenda, listarAgenda, paraVisitarEnAgenda, SIN_FILTROS, textoVer, type EventoAgenda, type FiltrosAgenda } from "./agenda";
import { abiertasEseDia, componerDia, entraEnQue, exposicionesVigentes, marcosDe, notaDeVisita, plegarActos, queDe, rangosDeVisita, sinPuntoEnCalendario, textoAbre, textoBloque, textoHastaEl, tituloParaVisitar } from "./agendaPorClase";
import { archivoIcs } from "./calendario";
import type { Agenda } from "./cargarAgenda";
import { cuandoDeTarjeta, notaDeClase, tarjetaEvento } from "./destacados";
import { calcularCarrilesAgenda, carrilEstaSemana, carrilMasAdelante, carrilNuevos, carrilParaVisitar } from "./inicio";
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
  it("en una lista por evento (Nuevos, carriles) los actos de un marco presente se pliegan en él", () => {
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
  it("«Esta semana»: el marco una vez, con cuántas actividades caen en la semana, y no sus actos; la exposición no está", () => {
    const vistos = new Set<string>();
    const carril = carrilEstaSemana(TODOS, vistos, ahora);
    expect(ids(carril)).toEqual(["concierto", "taller", "cine", "huerfano", "taller", "taller"]);
    expect(carril.find((e) => e.id === "cine")?.programa).toEqual({ registrados: 4, estaSemana: 3 });
    // Los actos plegados quedan vistos: no salen sueltos en «Nuevos eventos».
    expect(vistos.has("cine2")).toBe(true);
  });
  it("«Para visitar»: las vigentes, la que cierra antes primero, sin las que ya salieron en otro carril", () => {
    expect(ids(carrilParaVisitar(TODOS, new Set(["grabado"]), ahora))).toEqual(["sin-leer", "ecos", "futura"]);
    expect(carrilParaVisitar([concierto], new Set(), ahora)).toEqual([]);
  });
  it("los carriles juntos: «Para visitar» entre «Esta semana» y «Nuevos eventos», sin repetir", () => {
    const carriles = calcularCarrilesAgenda(agenda(), ahora);
    expect(ids(carriles.paraVisitar)).toEqual(["sin-leer", "grabado", "ecos", "futura"]);
    expect(carriles.estaSemana.some((e) => e.clase === "exposicion")).toBe(false);
  });
  it("«Nuevos eventos» y «Más adelante»: un festival nuevo como su marco", () => {
    const tarde = (e: EventoAgenda, dias: number) => ({ ...e, inicio: new Date(Date.parse(e.inicio) + dias * 86400000).toISOString(), fin: null, creado_en: "2026-10-06T00:00:00Z" });
    const nuevos = carrilNuevos([tarde(cine, 20), tarde(cine1, 20), tarde(cine2, 20), tarde(concierto, 20), tarde(huerfano, 20)], new Set(), ahora);
    expect(ids(nuevos).toSorted()).toEqual(["cine", "concierto", "huerfano"]);
    expect(carrilMasAdelante(agenda(), ahora).some((e) => e.evento_padre_id === "cine")).toBe(false);
  });
  it("la tarjeta: «Hasta el …» y «Horario por confirmar»; el marco con su periodo y su programa; sin «Voy»", () => {
    expect(cuandoDeTarjeta(ecos, ahora)).toBe("Hasta el sáb 31 de oct");
    expect(cuandoDeTarjeta(grabado, ahora)).toBe("Hasta el mar 20 de oct");
    expect(notaDeClase(grabado)).toBe("Horario por confirmar");
    expect(notaDeClase(ecos)).toBeNull();
    expect(notaDeClase(sinLeer)).toBeNull(); // sin poder leer su horario no se dice nada
    expect(cuandoDeTarjeta(futura, ahora)).toBe("Del 12 de oct al 30 de nov");
    expect(cuandoDeTarjeta(cine, ahora)).toBe("Del 9 al 20 de oct");
    expect(notaDeClase({ ...cine, programa: { registrados: 4, estaSemana: 3 } })).toBe("3 actividades esta semana");
    expect(notaDeClase(cine)).toBe("Programa registrado: 4 actividades");
    expect(tarjetaEvento(ecos, ahora)).toMatchObject({ sinVoy: true, hoy: false, detalle: "Hasta el sáb 31 de oct", sitio: "Foro" });
    expect(tarjetaEvento(grabado, ahora).sitio).toBe("Foro · Horario por confirmar");
    expect(tarjetaEvento(cine, ahora).sitio).toBe("Programa registrado: 4 actividades");
    expect(tarjetaEvento(cine, ahora).sinVoy).toBe(true);
    expect(tarjetaEvento(concierto, ahora).sinVoy).toBeUndefined();
    expect(tarjetaEvento(ocurrenciasDe(taller)[1], ahora).parte).toBe("Sesión 2 de 3");
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
