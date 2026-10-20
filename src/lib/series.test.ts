import { describe, expect, it } from "vitest";
import { contarAgenda, listarAgenda, listarNuevos, SIN_FILTROS, type EventoAgenda } from "./agenda";
import { marcosDe } from "./agendaPorClase";
import type { Agenda } from "./cargarAgenda";
import { eventoPaso } from "./fechas";
import { calcularCarrilesAgenda, carrilNuevos } from "./inicio";
import { agruparSeries, cabezaDe, grupoDe, juntarPiezas, mismaSerie, otrasFunciones, textoActosNuevos, textoDesde, textoFuncion, textoFunciones, textoNuevasCorto, type Pieza } from "./series";
import { cejaDeTarjeta, tarjetaDeInicio, tarjetaDePieza } from "./tarjetaInicio";

// Lunes 12 de octubre de 2026, 10:00 en San Luis Potosí (seis horas detrás de UTC): el día en que el founder vio las tarjetas repetidas.
const ahora = new Date("2026-10-12T16:00:00Z");
const ZONA = "America/Mexico_City";
const a = (dia: string, hora: string) => new Date(`${dia}T${hora}:00-06:00`).toISOString();
const hace = (horas: number) => new Date(ahora.getTime() - horas * 3600000).toISOString();

function evento(id: string, cambios: Partial<EventoAgenda> = {}): EventoAgenda {
  return { id, slug: id, titulo: id, inicio: a("2026-10-30", "20:00"), fin: null, zona: ZONA, imagen: null, precio: null, lugar_id: null, sitio_texto: null, sitio_reservado: false, lugar: null, creado_en: hace(2), van: 0, ...cambios };
}
const agenda = (eventos: EventoAgenda[]): Agenda => ({ eventos, seguidos: null, eventosSeguidos: [], artistasSeguidos: null, asistencias: null, destacados: [] });
const resumen = (piezas: Pieza<{ id: string }>[]) =>
  piezas.map((p) => (p.tipo === "suelto" ? p.evento.id : p.tipo === "festival" ? `festival:${p.marco.id}+${p.nuevos}` : `serie:${p.cabeza.id}x${p.funciones}`));

// 1. Xantolo: el festival se publicó hace semanas (no es nuevo); tres actos del Foro Infantil, con el mismo cartel y el mismo título, sí.
const xantolo = evento("xantolo", { clase: "festival", titulo: "Xantolo ¡Se vive en tu ciudad!", inicio: a("2026-10-28", "10:00"), fin: a("2026-11-02", "22:00"), creado_en: "2026-09-20T00:00:00Z", programa: { registrados: 12 } });
const foroInfantil = ["2026-10-30", "2026-10-31", "2026-11-01"].map((dia, i) =>
  evento(`foro-${i + 1}`, { titulo: "Foro Infantil Xantolo", evento_padre_id: "xantolo", lugar_id: "jardin", inicio: a(dia, "11:00"), creado_en: hace(3 + i) }),
);
// 2. «Las cosas extraordinarias»: seis funciones en tres días, dos por día, en el mismo teatro (una se publicó con el título en mayúsculas).
const extraordinarias = ["2026-10-16", "2026-10-17", "2026-10-18"].flatMap((dia, d) =>
  ["18:00", "20:00"].map((hora, h) => evento(`ext-${d * 2 + h + 1}`, { titulo: d === 2 && h === 1 ? "LAS COSAS EXTRAORDINARIAS" : "Las cosas extraordinarias", lugar_id: "teatro", inicio: a(dia, hora), creado_en: hace(1) })),
);
// 3. «El Sótano»: dos funciones el mismo día en un sitio fuera del directorio, escrito con y sin acento (no caben en `eventos_sesiones`).
const sotano = [
  evento("sotano-tarde", { titulo: "El Sótano", sitio_texto: "Foro Café", inicio: a("2026-10-24", "18:00"), creado_en: hace(5) }),
  evento("sotano-noche", { titulo: "El sótano", sitio_texto: "foro cafe", inicio: a("2026-10-24", "21:00"), creado_en: hace(4) }),
];
// 4. Tour de Cine Francés: un festival nuevo (el marco sí está en la lista) con sus películas en Cinema 7B; y la cartelera de Cinema 7B: la misma
//    película en tres funciones, que no es de ningún festival.
const tour = evento("tour", { clase: "festival", titulo: "Tour de Cine Francés", inicio: a("2026-10-22", "17:00"), fin: a("2026-10-25", "22:00"), creado_en: hace(6) });
const peliculas = ["Las ilusiones", "El hilo", "Cuerpo"].map((titulo, i) => evento(`tour-${i + 1}`, { titulo, evento_padre_id: "tour", lugar_id: "cinema7b", inicio: a("2026-10-2" + (2 + i), "19:00"), creado_en: hace(6) }));
const cartelera = ["2026-10-20", "2026-10-21", "2026-10-22"].map((dia, i) => evento(`7b-${i + 1}`, { titulo: "Coraline", lugar_id: "cinema7b", inicio: a(dia, "17:30"), creado_en: hace(7) }));

describe("una pieza por serie (OL-385)", () => {
  it("Xantolo: los tres actos nuevos van dentro de la tarjeta del festival, aunque el festival no sea nuevo; ninguno sale afuera", () => {
    const piezas = agruparSeries(foroInfantil, marcosDe([xantolo, ...foroInfantil]));
    expect(resumen(piezas)).toEqual(["festival:xantolo+3"]);
    // Sin el festival cargado no hay tarjeta a la cual ir: los actos van sueltos (no se inventa una serie con actos de un festival).
    expect(resumen(agruparSeries(foroInfantil))).toEqual(["foro-1", "foro-2", "foro-3"]);
  });
  it("«Las cosas extraordinarias»: seis funciones, una pieza; la cabeza es la más próxima, con desde y hasta", () => {
    const [pieza, ...resto] = agruparSeries([...extraordinarias].reverse());
    expect(resto).toEqual([]);
    expect(pieza).toMatchObject({ tipo: "serie", cabeza: { id: "ext-1" }, funciones: 6, desde: a("2026-10-16", "18:00"), hasta: a("2026-10-18", "20:00") });
    expect(textoFunciones(6)).toBe("6 funciones");
  });
  it("«El Sótano»: dos funciones el mismo día en un sitio escrito, sin importar acentos ni mayúsculas", () => {
    expect(resumen(agruparSeries(sotano))).toEqual(["serie:sotano-tardex2"]);
    expect(mismaSerie(sotano[0], { ...sotano[1], sitio_texto: "Otro foro" })).toBe(false);
    // Sin sitio no hay con qué comparar: el mismo título solo no basta.
    expect(resumen(agruparSeries(sotano.map((e) => ({ ...e, sitio_texto: null }))))).toEqual(["sotano-tarde", "sotano-noche"]);
  });
  it("Tour de Cine Francés: el festival nuevo junta sus películas (lo que antes hacía `plegarActos`); la cartelera de Cinema 7B, en su serie", () => {
    expect(resumen(agruparSeries([tour, ...peliculas, ...cartelera]))).toEqual(["festival:tour+3", "serie:7b-1x3"]);
    // Un festival nuevo sin actos nuevos sigue siendo su pieza (la pestaña Nuevos lo enseña como un evento más).
    expect(resumen(agruparSeries([tour]))).toEqual(["festival:tour+0"]);
  });
  it("mixto: cada pieza va donde va el primero de los suyos; lo distinto, suelto", () => {
    const concierto = evento("concierto", { titulo: "Concierto", lugar_id: "teatro" });
    const otraObra = evento("otra-obra", { titulo: "Las cosas extraordinarias", lugar_id: "otro-teatro" }); // mismo título, otro lugar
    const expoA = evento("expo-a", { clase: "exposicion", titulo: "Ecos", lugar_id: "muni" });
    const expoB = evento("expo-b", { clase: "exposicion", titulo: "Ecos", lugar_id: "muni" }); // una exposición no tiene funciones
    const huerfano = evento("huerfano", { evento_padre_id: "otro-festival", titulo: "Foro Infantil Xantolo", lugar_id: "jardin" });
    const lista = [concierto, extraordinarias[3], foroInfantil[0], otraObra, extraordinarias[0], foroInfantil[1], expoA, sotano[0], expoB, huerfano, sotano[1], foroInfantil[2]];
    const piezas = agruparSeries(lista, marcosDe([xantolo, ...lista]));
    expect(resumen(piezas)).toEqual(["concierto", "serie:ext-1x2", "festival:xantolo+3", "otra-obra", "expo-a", "serie:sotano-tardex2", "expo-b", "huerfano"]);
    expect(piezas.map((p) => p.primero.id)).toEqual(["concierto", "ext-4", "foro-1", "otra-obra", "expo-a", "sotano-tarde", "expo-b", "huerfano"]);
    expect(piezas.map(cabezaDe).map((e) => e.id)).toEqual(["concierto", "ext-1", "xantolo", "otra-obra", "expo-a", "sotano-tarde", "expo-b", "huerfano"]);
  });
  it("la llave de cada uno: el festival, la serie o nada; la misma regla junta tarjetas en el teléfono", () => {
    const marcos = marcosDe([xantolo]);
    expect(grupoDe(foroInfantil[0], marcos)).toBe("festival:xantolo");
    expect(grupoDe(xantolo, marcos)).toBe("festival:xantolo");
    expect(grupoDe(extraordinarias[5], marcos)).toBe(grupoDe(extraordinarias[0], marcos));
    expect(grupoDe(sotano[1], marcos)).toBe("serie:sitio:foro cafe|el sotano");
    expect(grupoDe(evento("sin-sitio"), marcos)).toBeNull();
    const tarjetas = [...foroInfantil, ...extraordinarias].map((e) => ({ id: e.id, inicio: e.inicio, grupo: grupoDe(e, marcos) }));
    expect(resumen(juntarPiezas(tarjetas, (t) => t.grupo, (id) => (id === "xantolo" ? { id, inicio: xantolo.inicio, grupo: null } : undefined)))).toEqual(["festival:xantolo+3", "serie:ext-1x6"]);
  });
});

describe("la tarjeta de una pieza en «Nuevos eventos» (OL-385)", () => {
  const conFecha = (e: EventoAgenda) => tarjetaDeInicio(e, ahora);
  it("festival: la tarjeta del festival, con «3 nuevas» en la ceja junto a «Festival» (OL-422), y lleva a su ficha", () => {
    const t = tarjetaDePieza({ tipo: "festival", marco: conFecha(xantolo), actos: foroInfantil.map(conFecha), nuevos: 3, primero: conFecha(foroInfantil[0]) }, ahora);
    expect(cejaDeTarjeta(t)).toEqual(["Festival", "3 nuevas"]);
    expect(t.href).toBe("/eventos/xantolo");
    expect(t.clave).toBe("festival-xantolo");
    // En corto solo en la ceja de la tarjeta (founder, 2026-10-19: «Puedes dejar solo 1 nueva. 7 nuevas.»); el renglón de la agenda, entero.
    expect([1, 7, 13].map(textoNuevasCorto)).toEqual(["1 nueva", "7 nuevas", "13 nuevas"]);
    expect([1, 7].map(textoActosNuevos)).toEqual(["1 actividad nueva", "7 actividades nuevas"]);
  });
  it("serie: la tarjeta de la más próxima, «6 funciones» en la ceja, «desde …» en su cuándo y el sello del primer día al último", () => {
    const funciones = extraordinarias.map(conFecha);
    const t = tarjetaDePieza({ tipo: "serie", cabeza: funciones[0], eventos: funciones, funciones: 6, desde: funciones[0].inicio, hasta: funciones[5].inicio, primero: funciones[0] }, ahora);
    expect(cejaDeTarjeta(t)).toEqual(["6 funciones"]);
    expect(t.detalle).toBe("desde vie 16 · 6:00 pm"); // sin el mes: lo dice el sello
    expect(textoDesde(funciones[0], ahora, true)).toBe("desde vie 16 de oct · 6:00 pm"); // en el renglón de la agenda, con él
    expect(t.selloFecha).toMatchObject({ mes: "oct", dia: "16–18" });
    expect(t.href).toBe("/eventos/ext-1");
    // Dos funciones el mismo día: el sello es ese día.
    const dos = sotano.map(conFecha);
    expect(tarjetaDePieza({ tipo: "serie", cabeza: dos[0], eventos: dos, funciones: 2, desde: dos[0].inicio, hasta: dos[1].inicio, primero: dos[0] }, ahora).selloFecha).toMatchObject({ mes: "oct", dia: "24" });
    expect(textoDesde({ inicio: a("2026-10-12", "20:00"), zona: ZONA }, ahora)).toBe("desde hoy · 8:00 pm");
    expect(textoDesde({ inicio: a("2026-10-13", "20:00"), zona: ZONA }, ahora, true)).toBe("desde mañana · 8:00 pm");
  });
});

describe("«Nuevos eventos» de Inicio y la pestaña Nuevos cuentan piezas (OL-385)", () => {
  // Lo que vio el founder: los tres actos de Xantolo y la cartelera de Cinema 7B, después de «Esta semana» (del 20 en adelante).
  const lejos = (e: EventoAgenda, dias: number) => ({ ...e, inicio: new Date(Date.parse(e.inicio) + dias * 86400000).toISOString() });
  const eventos = [xantolo, ...foroInfantil, ...cartelera.map((e) => lejos(e, 1)), ...sotano];

  it("Inicio: los actos de Xantolo y la cartelera son dos piezas más El Sótano: tres, el carril se pinta; ningún festival sale por ser nuevo", () => {
    const vistos = new Set<string>();
    const nuevos = carrilNuevos(eventos, vistos, ahora);
    // Por publicación, lo último primero (a igual publicación, por fecha del evento): los eventos de las tres piezas, para que el teléfono las junte.
    expect(nuevos.map((e) => e.id)).toEqual(["foro-1", "sotano-noche", "foro-2", "sotano-tarde", "foro-3", "7b-1", "7b-2", "7b-3"]);
    expect(resumen(agruparSeries(nuevos, marcosDe(eventos)))).toEqual(["festival:xantolo+3", "serie:sotano-tardex2", "serie:7b-1x3"]);
    expect(vistos.has("xantolo")).toBe(false);
    expect(calcularCarrilesAgenda(agenda(eventos), ahora).nuevos.some((e) => e.clase === "festival")).toBe(false);
  });
  it("Inicio: el piso de tres cuenta piezas: seis funciones de una obra y una más son dos tarjetas y el carril no se pinta", () => {
    const tarde = extraordinarias.map((e) => lejos(e, 7));
    expect(carrilNuevos([...tarde, evento("otro", { creado_en: hace(1) })], new Set(), ahora)).toEqual([]);
    expect(carrilNuevos([...tarde, evento("otro", { creado_en: hace(1) }), evento("otro-mas", { creado_en: hace(1) })], new Set(), ahora)).toHaveLength(8);
  });
  it("la pestaña Nuevos: un renglón por pieza (lo que pinta y lo que cuenta su botón), con el festival aunque no sea nuevo", () => {
    const todo = agenda([xantolo, ...foroInfantil, ...extraordinarias, tour, ...peliculas, evento("suelto", { creado_en: hace(0.5) })]);
    const desde = ahora.getTime() - 7 * 86400000;
    expect(resumen(listarNuevos(todo, SIN_FILTROS, desde))).toEqual(["suelto", "serie:ext-1x6", "festival:xantolo+3", "festival:tour+3"]);
    expect(listarAgenda(todo, SIN_FILTROS, desde, ahora).map((e) => e.id)).toEqual(["suelto", "ext-1", "xantolo", "tour"]);
    expect(contarAgenda(todo, SIN_FILTROS, "2026-10-12", desde, ahora).renglones).toBe(4);
  });
});

describe("la ficha de una función: «Otras funciones» (OL-385)", () => {
  const paso = (e: EventoAgenda) => eventoPaso(e.inicio, e.fin, ahora, e.zona);
  it("las de su mismo título y sitio que no han pasado, sin ella misma, por hora; y cuál es ella («Función 2 de 6»)", () => {
    const yaPaso = evento("ext-0", { titulo: "Las cosas extraordinarias", lugar_id: "teatro", inicio: a("2026-10-10", "20:00") });
    const otra = evento("otra", { titulo: "Otra obra", lugar_id: "teatro" });
    const candidatos = [...extraordinarias].reverse().concat([yaPaso, otra]);
    const otras = otrasFunciones(extraordinarias[1], candidatos, paso);
    expect(otras.map((e) => e.id)).toEqual(["ext-1", "ext-3", "ext-4", "ext-5", "ext-6"]);
    expect(textoFuncion(extraordinarias[1], otras)).toBe("Función 2 de 6");
  });
  it("sin funciones hermanas, nada; un festival o una exposición no las tienen", () => {
    expect(otrasFunciones(evento("solo", { lugar_id: "teatro" }), extraordinarias, paso)).toEqual([]);
    expect(textoFuncion(extraordinarias[0], [])).toBeNull();
    expect(otrasFunciones({ ...extraordinarias[0], clase: "exposicion" }, extraordinarias, paso)).toEqual([]);
    expect(otrasFunciones(sotano[1], sotano, paso).map((e) => e.id)).toEqual(["sotano-tarde"]);
  });
});
