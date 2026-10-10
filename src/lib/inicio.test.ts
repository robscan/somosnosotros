import { describe, expect, it } from "vitest";
import {
  calcularCarrilesAgenda,
  carrilDestacados,
  carrilEstaSemana,
  carrilEstelar,
  carrilNuevos,
  carrilMasAdelante,
  carrilTusPlanes,
  eventosEstaSemana,
  MINIMO_NUEVOS,
  sinRepetidos,
  TOPE_ESTA_SEMANA,
  TOPE_ESTELAR,
  tituloEstelar,
} from "./inicio";
import { corteNuevos, eventosNuevos, LIMITE_NUEVOS, listarAgenda, SIN_FILTROS } from "./agenda";
import type { Agenda } from "./cargarAgenda";
import { claveDe, textoParte } from "./ocurrencias";
import { eventoPaso } from "./fechas";

const ahora = new Date("2026-09-23T18:00:00Z");
function evento(id: string, cambios: Partial<{ inicio: string; fin: string; van: number | null; titulo: string; creado_en: string }> = {}) {
  return { id, titulo: id, inicio: "2026-09-24T01:00:00Z", fin: "2026-09-24T03:00:00Z", zona: "America/Mexico_City", van: 0, creado_en: "2026-09-01T00:00:00Z", ...cambios };
}
function agenda(cambios: Partial<Agenda> = {}): Agenda {
  return { artistasSeguidos: null, eventos: [], seguidos: [], eventosSeguidos: [], asistencias: {}, destacados: [], ...cambios };
}
/** Un ISO fuera de la ventana de "Esta semana" (más de 7 días desde `ahora`): lo que necesita "Nuevos eventos". */
const fechaFueraDeEstaSemana = (horasDeMas = 0) => new Date(ahora.getTime() + (DIAS_ESTA_SEMANA_MS + horasDeMas * 3600000)).toISOString();
const DIAS_ESTA_SEMANA_MS = 8 * 86400000; // 8 días: de sobra, más allá de los 7 de la ventana.

describe("Inicio: candidatos de Más adelante", () => {
  it("rescata un evento futuro aunque Nuevos no alcance tres y excluye Voy/Me interesa", () => {
    const futuro = evento("futuro", { inicio: fechaFueraDeEstaSemana(), creado_en: ahora.toISOString() }) as Agenda["eventos"][number];
    const datos = agenda({ eventos: [futuro, {...futuro, id: "voy"}, {...futuro, id: "interesa"}], asistencias: {voy: "voy", interesa: "me_interesa"} });
    expect(calcularCarrilesAgenda(datos, ahora).nuevos).toHaveLength(0);
    expect(carrilMasAdelante(datos).map(e => e.id)).toEqual(["futuro"]);
  });
  it("elige los veinte próximos por fecha antes de la presentación por fotos", () => {
    const eventos = Array.from({length: 25}, (_, i) => ({ ...evento(String(i), {inicio: fechaFueraDeEstaSemana(i)}), imagen: i === 24 ? "/cartel.png" : null })) as Agenda["eventos"];
    const datos = agenda({eventos: eventos.toReversed(), asistencias: null});
    expect(carrilMasAdelante(datos).map(e => e.id)).toEqual(eventos.slice(0,20).map(e => e.id));
    expect(datos.eventos[0].id).toBe("24");
  });
});

describe("Inicio: esta semana (próximos 7 días)", () => {
  it("incluye hoy y el séptimo día, excluye el octavo", () => {
    const dentro = evento("a", { inicio: "2026-09-30T17:59:00Z", fin: "2026-09-30T18:00:00Z" });
    const fuera = evento("b", { inicio: "2026-09-30T18:00:01Z", fin: "2026-09-30T19:00:00Z" });
    expect(eventosEstaSemana([dentro, fuera], ahora).map((e) => e.id)).toEqual(["a"]);
  });
  it("un evento en curso (empezó antes, no ha terminado) cuenta", () => {
    const enCurso = evento("c", { inicio: "2026-09-20T00:00:00Z", fin: "2026-09-23T20:00:00Z" });
    const yaTermino = evento("d", { inicio: "2026-09-20T00:00:00Z", fin: "2026-09-23T17:00:00Z" });
    expect(eventosEstaSemana([enCurso, yaTermino], ahora).map((e) => e.id)).toEqual(["c"]);
  });
  it("sin eventos no ofrece nada", () => expect(eventosEstaSemana([], ahora)).toEqual([]));
  it.each([
    ["antes del inicio", "America/Mexico_City", "2026-10-03T21:00:00Z", null, "2026-10-03T20:59:59Z", true],
    ["después del inicio", "America/Mexico_City", "2026-10-03T21:00:00Z", null, "2026-10-03T21:00:01Z", true],
    ["antes de las 3 h", "America/Mexico_City", "2026-10-03T21:00:00Z", null, "2026-10-03T23:59:59.999Z", true],
    ["frontera inclusiva de Agenda", "America/Mexico_City", "2026-10-03T21:00:00Z", null, "2026-10-04T00:00:00Z", true],
    ["pasadas las 3 h", "America/Mexico_City", "2026-10-03T21:00:00Z", null, "2026-10-04T00:00:00.001Z", false],
    ["las 3 h no dependen de la zona (Los Ángeles)", "America/Los_Angeles", "2026-10-03T21:00:00Z", null, "2026-10-04T00:00:00Z", true],
    ["terminado en Los Ángeles", "America/Los_Angeles", "2026-10-03T21:00:00Z", null, "2026-10-04T00:00:00.001Z", false],
    ["las 3 h en Tokio", "Asia/Tokyo", "2026-10-03T01:00:00Z", null, "2026-10-03T04:00:00Z", true],
    ["terminado en Tokio", "Asia/Tokyo", "2026-10-03T01:00:00Z", null, "2026-10-03T04:00:00.001Z", false],
    ["cambio de horario: 3 h reales", "America/New_York", "2026-11-01T05:30:00Z", null, "2026-11-01T08:30:00Z", true],
    ["fin explícito exacto", "America/Mexico_City", "2026-10-03T21:00:00Z", "2026-10-03T22:00:00Z", "2026-10-03T22:00:00Z", true],
    ["fin explícito cumplido", "America/Mexico_City", "2026-10-03T21:00:00Z", "2026-10-03T22:00:00Z", "2026-10-03T22:00:00.001Z", false],
  ])("usa el mismo fin efectivo que Agenda: %s", (_caso, zona, inicio, fin, instante, vigente) => {
    const e = eventoAgenda("evento", { zona, inicio, fin });
    const reloj = new Date(instante);
    // Agenda recibe de la base termina >= ahora; eventoPaso es su equivalente local.
    const deAgenda = listarAgenda(agenda({ eventos: [e].filter((x) => !eventoPaso(x.inicio, x.fin, reloj, x.zona)) }), SIN_FILTROS);
    expect(deAgenda.map((x) => x.id)).toEqual(vigente ? ["evento"] : []);
    expect(eventosEstaSemana([e], reloj)).toEqual(deAgenda);
    expect(calcularCarrilesAgenda(agenda({ eventos: [e] }), reloj).estaSemana).toEqual(deAgenda);
  });
});

describe("Inicio: sin duplicar eventos entre carriles", () => {
  it("un id ya visto no se repite y el conjunto de vistos crece", () => {
    const vistos = new Set(["a"]);
    const resultado = sinRepetidos([evento("a"), evento("b"), evento("c")], vistos);
    expect(resultado.map((e) => e.id)).toEqual(["b", "c"]);
    expect(vistos).toEqual(new Set(["a", "b", "c"]));
  });
  it("dos carriles consecutivos comparten el mismo conjunto: el segundo no repite lo del primero", () => {
    const vistos = new Set<string>();
    const favoritos = sinRepetidos([evento("a"), evento("b")], vistos);
    const destacados = sinRepetidos([evento("b"), evento("c")], vistos);
    expect(favoritos.map((e) => e.id)).toEqual(["a", "b"]);
    expect(destacados.map((e) => e.id)).toEqual(["c"]);
  });
});

describe("Inicio: carril Tus planes (Voy + Me interesa juntos, por fecha)", () => {
  it("junta las dos listas y ordena por fecha, sin importar de cuál vino cada una", () => {
    const voy = [evento("b", { inicio: "2026-09-26T01:00:00Z" })];
    const interesan = [evento("a", { inicio: "2026-09-24T01:00:00Z" }), evento("c", { inicio: "2026-09-28T01:00:00Z" })];
    expect(carrilTusPlanes(voy, interesan).map((e) => e.id)).toEqual(["a", "b", "c"]);
  });
  it("tiene el mismo tope que el carril estelar (12), aunque haya más planes", () => {
    expect(TOPE_ESTELAR).toBe(12);
    const voy = Array.from({ length: 8 }, (_, i) => evento(`voy${i}`, { inicio: new Date(ahora.getTime() + (i + 1) * 86400000).toISOString() }));
    const interesan = Array.from({ length: 8 }, (_, i) => evento(`interesa${i}`, { inicio: new Date(ahora.getTime() + (i + 20) * 86400000).toISOString() }));
    expect(carrilTusPlanes(voy, interesan)).toHaveLength(12);
  });
  it("sin nada en ninguna de las dos listas, no ofrece nada (el carril no existe)", () => expect(carrilTusPlanes([], [])).toEqual([]));
});

describe("Inicio: carril estelar (Seleccionados para ti)", () => {
  it("los destacados salen primero, en el orden de la administración (no el de fecha ni el de «Voy») y sean o no de lo que se sigue", () => {
    const vistos = new Set<string>();
    const r = carrilEstelar(
      [evento("d2", { van: 0, inicio: "2026-09-28T01:00:00Z" }), evento("d1", { van: 5, inicio: "2026-09-24T01:00:00Z" })], // la administración puso d2 antes que d1
      [evento("a", { van: 30, inicio: "2026-09-24T01:00:00Z" }), evento("b", { van: 1, inicio: "2026-09-25T01:00:00Z" })],
      vistos,
    );
    expect(r.map((e) => e.id)).toEqual(["d2", "d1", "a", "b"]);
  });
  it("después de los destacados, el resto de lo que se sigue va por «Voy» y luego por fecha", () => {
    const r = carrilEstelar(
      [evento("d")],
      [
        evento("poco", { van: 1, inicio: "2026-09-24T01:00:00Z" }),
        evento("tarde", { van: 20, titulo: "tarde", inicio: "2026-09-26T01:00:00Z" }),
        evento("temprano", { van: 20, titulo: "temprano", inicio: "2026-09-25T01:00:00Z" }),
      ],
      new Set(),
    );
    expect(r.map((e) => e.id)).toEqual(["d", "temprano", "tarde", "poco"]); // empatan en «Voy»: desempata la fecha
  });
  it("un destacado que además se sigue sale una sola vez, en su lugar de destacado", () => {
    const d = evento("d", { van: 1, inicio: "2026-09-28T01:00:00Z" });
    const r = carrilEstelar([d], [evento("a", { van: 50 }), d], new Set());
    expect(r.map((e) => e.id)).toEqual(["d", "a"]);
  });
  it("tiene tope de 12, aunque haya más entre destacados y favoritos; los destacados se conservan y el corte cae en los favoritos", () => {
    expect(TOPE_ESTELAR).toBe(12);
    const destacados = Array.from({ length: 5 }, (_, i) => evento(`d${i}`));
    const muchos = Array.from({ length: 20 }, (_, i) => evento(`e${i}`, { van: i }));
    const r = carrilEstelar(destacados, muchos, new Set());
    expect(r).toHaveLength(12);
    expect(r.slice(0, 5).map((e) => e.id)).toEqual(["d0", "d1", "d2", "d3", "d4"]);
    expect(r.slice(5, 8).map((e) => e.id)).toEqual(["e19", "e18", "e17"]); // entre los favoritos, los que más van
  });
  it("no repite lo que ya usó otro carril", () => {
    const vistos = new Set(["ya-usado"]);
    const r = carrilEstelar([evento("ya-usado")], [evento("ya-usado"), evento("nuevo")], vistos);
    expect(r.map((e) => e.id)).toEqual(["nuevo"]);
  });
  it("solo queda como visto lo que sale: lo que deja fuera el tope de 12 puede salir en otro carril", () => {
    const vistos = new Set<string>();
    const muchos = Array.from({ length: 15 }, (_, i) => evento(`e${i}`, { van: 100 - i }));
    const r = carrilEstelar([], muchos, vistos);
    expect(vistos).toEqual(new Set(r.map((e) => e.id)));
    expect(vistos.has("e14")).toBe(false);
  });
  it("el título dice cuál de los dos es: con favoritos, 'Seleccionados para ti'; sin ellos, el respaldo 'Destacados'", () => {
    expect(tituloEstelar(true)).toBe("Seleccionados para ti");
    expect(tituloEstelar(false)).toBe("Destacados");
  });
});

describe("Inicio: carril Destacados (respaldo del estelar, sin sesión o sin favoritos)", () => {
  it("conserva el orden de la curaduría, sin recortar por fecha (puede incluir semanas siguientes)", () => {
    const vistos = new Set<string>();
    // Antes (carrilDestacadosEstaSemana) un evento así de lejano habría quedado fuera; ya no.
    const lejano = evento("lejano", { inicio: "2026-11-01T01:00:00Z", fin: "2026-11-01T03:00:00Z" });
    const cercano = evento("cercano", { inicio: "2026-09-24T01:00:00Z" });
    expect(carrilDestacados([lejano, cercano], vistos).map((e) => e.id)).toEqual(["lejano", "cercano"]);
  });
  it("tiene tope de 12", () => {
    const vistos = new Set<string>();
    const muchos = Array.from({ length: 20 }, (_, i) => evento(`d${i}`));
    expect(carrilDestacados(muchos, vistos)).toHaveLength(12);
  });
  it("no repite lo que ya usó otro carril", () => {
    const vistos = new Set(["ya-usado"]);
    const r = carrilDestacados([evento("ya-usado"), evento("nuevo")], vistos);
    expect(r.map((e) => e.id)).toEqual(["nuevo"]);
  });
});

describe("Inicio: carril Esta semana (todos los próximos 7 días, tope 20)", () => {
  it("en orden de fecha, no de llegada", () => {
    const vistos = new Set<string>();
    const r = carrilEstaSemana([evento("b", { inicio: "2026-09-25T01:00:00Z" }), evento("a", { inicio: "2026-09-24T01:00:00Z" })], vistos, ahora);
    expect(r.map((e) => e.id)).toEqual(["a", "b"]);
  });
  it("sin mínimo: una sola tarjeta no vacía el carril (a diferencia de Nuevos eventos)", () => {
    const vistos = new Set<string>();
    expect(carrilEstaSemana([evento("sola")], vistos, ahora).map((e) => e.id)).toEqual(["sola"]);
  });
  it("no repite lo ya visto (por ejemplo, por Tus planes o el carril estelar)", () => {
    const vistos = new Set(["ya-usado"]);
    const r = carrilEstaSemana([evento("ya-usado"), evento("nuevo", { inicio: "2026-09-25T01:00:00Z" })], vistos, ahora);
    expect(r.map((e) => e.id)).toEqual(["nuevo"]);
  });
  it("deja fuera lo de fuera de la ventana de 7 días", () => {
    const vistos = new Set<string>();
    const r = carrilEstaSemana([evento("dentro"), evento("fuera", { inicio: fechaFueraDeEstaSemana() })], vistos, ahora);
    expect(r.map((e) => e.id)).toEqual(["dentro"]);
  });
  it("tope de 20 tarjetas, aunque haya más en la semana", () => {
    expect(TOPE_ESTA_SEMANA).toBe(20);
    const vistos = new Set<string>();
    const muchos = Array.from({ length: 25 }, (_, i) => evento(`e${i}`, { inicio: new Date(ahora.getTime() + (i + 1) * 3600000).toISOString() }));
    expect(carrilEstaSemana(muchos, vistos, ahora)).toHaveLength(20);
  });
});

describe("Inicio: carril Nuevos eventos (publicado hace ≤7 días Y empieza después de Esta semana)", () => {
  it("de 100 candidatos entrega los 20 más recientes al cliente y solo marca esos como vistos", () => {
    const eventos = Array.from({ length: 100 }, (_, i) => eventoAgenda(`nuevo-${i}`, {
      inicio: fechaFueraDeEstaSemana(i), fin: null,
      creado_en: new Date(ahora.getTime() - i * 60000).toISOString(),
    })).reverse();
    const vistos = new Set(["previo", "nuevo-0"]);
    const r = carrilNuevos(eventos, vistos, ahora);
    expect(LIMITE_NUEVOS).toBe(20);
    expect(r.map((e) => e.id)).toEqual(Array.from({ length: 20 }, (_, i) => `nuevo-${i + 1}`));
    expect(vistos).toEqual(new Set(["previo", "nuevo-0", ...r.map((e) => e.id)]));
    expect(calcularCarrilesAgenda(agenda({ eventos }), ahora).nuevos).toHaveLength(20);
    expect(listarAgenda(agenda({ eventos }), SIN_FILTROS)).toHaveLength(100);
  });
  it("un evento dentro de la ventana de Esta semana no cuenta como Nuevo, aunque se haya publicado hace poco", () => {
    const vistos = new Set<string>();
    const dentroDeEstaSemana = evento("dentro", { creado_en: ahora.toISOString(), inicio: "2026-09-25T01:00:00Z" });
    // Otros tres, todos fuera de la ventana: con "dentro" excluido, siguen llegando al mínimo de 3.
    const a = evento("a", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(1) });
    const b = evento("b", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(2) });
    const c = evento("c", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(3) });
    expect(carrilNuevos([dentroDeEstaSemana, a, b, c], vistos, ahora).map((e) => e.id).sort()).toEqual(["a", "b", "c"]);
  });
  it("con al menos 3 candidatos: de lo más reciente a lo más viejo; a igual publicación, el orden de siempre de la agenda", () => {
    const vistos = new Set<string>();
    const r = carrilNuevos([
      evento("viejo", { creado_en: "2026-09-20T00:00:00Z", inicio: fechaFueraDeEstaSemana(3) }),
      evento("nuevo", { creado_en: "2026-09-22T00:00:00Z", inicio: fechaFueraDeEstaSemana(1) }),
      evento("empate", { creado_en: "2026-09-22T00:00:00Z", titulo: "aa", inicio: fechaFueraDeEstaSemana(2) }),
    ], vistos, ahora);
    // "nuevo" y "empate" empatan en publicación (22 sep): desempata compararEventos por fecha del evento (inicio).
    expect(r.map((e) => e.id)).toEqual(["nuevo", "empate", "viejo"]);
  });
  it("excluye lo publicado hace más de 7 días", () => {
    const vistos = new Set<string>();
    const dentroDe7 = evento("a", { creado_en: new Date(ahora.getTime() - 7 * 86400000).toISOString(), inicio: fechaFueraDeEstaSemana(1) });
    const fueraDe7 = evento("b", { creado_en: new Date(ahora.getTime() - 8 * 86400000).toISOString(), inicio: fechaFueraDeEstaSemana(2) });
    const otroDentro = evento("c", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(3) });
    // Con "b" descartado por antiguo, solo quedan 2 candidatos ("a", "c"): bajo el mínimo, el carril no se pinta.
    expect(carrilNuevos([dentroDe7, fueraDe7, otroDentro], vistos, ahora)).toEqual([]);
  });
  it("con menos de 3 candidatos no se pinta (ni con 1 ni con 2) — el mínimo de Destacados", () => {
    expect(MINIMO_NUEVOS).toBe(3);
    const uno = [evento("a", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(1) })];
    expect(carrilNuevos(uno, new Set(), ahora)).toEqual([]);
    const dos = [...uno, evento("b", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(2) })];
    expect(carrilNuevos(dos, new Set(), ahora)).toEqual([]);
  });
  it("un candidato descartado por no llegar al mínimo no toca el conjunto compartido", () => {
    const vistos = new Set(["ya-usado"]);
    const r = carrilNuevos([evento("ya-usado", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(1) }), evento("solo", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(2) })], vistos, ahora);
    expect(r).toEqual([]);
    expect(vistos).toEqual(new Set(["ya-usado"]));
  });
  it("«nuevo» es lo mismo que en la pestaña Nuevos de Agenda: el carril trae lo de la pestaña que no cae en Esta semana ni sale en otro carril", () => {
    const hace = (dias: number) => new Date(ahora.getTime() - dias * 86400000).toISOString();
    const lejos = (id: string, publicadoHace: number, horas: number) => eventoAgenda(id, { creado_en: hace(publicadoHace), inicio: fechaFueraDeEstaSemana(horas), fin: null });
    const eventos = [lejos("a", 1, 1), lejos("b", 2, 2), lejos("c", 3, 3), lejos("d", 4, 4), lejos("viejo", 9, 5), eventoAgenda("de-la-semana", { creado_en: hace(0.5) })];
    const pestana = (desde: number) => listarAgenda(agenda({ eventos }), SIN_FILTROS, desde).map((e) => e.id);
    // Sin última visita, nuevo es lo de los últimos 7 días, en los dos: «viejo» no entra a ninguno y «de-la-semana» solo a la pestaña (en el carril sería repetirlo).
    expect(pestana(corteNuevos(null, ahora))).toEqual(["de-la-semana", "a", "b", "c", "d"]);
    const carril = carrilNuevos(eventos, new Set(), ahora);
    expect(carril.map((e) => e.id)).toEqual(["a", "b", "c", "d"]);
    // Con una última visita, `CarrilNuevos` recorta en el teléfono con la misma función que la pestaña: lo que ya se vio se va de los dos.
    const desdeLaVisita = corteNuevos(hace(2.5), ahora);
    expect(pestana(desdeLaVisita)).toEqual(["de-la-semana", "a", "b"]);
    expect(eventosNuevos(carril, desdeLaVisita).map((e) => e.id)).toEqual(["a", "b"]);
    // Lo que sale en un carril anterior no se repite en este carril, pero la pestaña lo sigue teniendo.
    expect(carrilNuevos(eventos, new Set(["b"]), ahora).map((e) => e.id)).toEqual(["a", "c", "d"]);
    expect(pestana(corteNuevos(null, ahora))).toContain("b");
  });
  it("con el mínimo cumplido, sí extiende el conjunto compartido (no repite lo ya visto en un carril anterior)", () => {
    const vistos = new Set(["ya-usado"]);
    const r = carrilNuevos([
      evento("ya-usado", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(1) }),
      evento("a", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(2) }),
      evento("b", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(3) }),
      evento("c", { creado_en: ahora.toISOString(), inicio: fechaFueraDeEstaSemana(4) }),
    ], vistos, ahora);
    // Los tres empatan en publicación (mismo `ahora`): desempata compararEventos por fecha del evento, ascendente.
    expect(r.map((e) => e.id)).toEqual(["a", "b", "c"]);
    expect(vistos).toEqual(new Set(["ya-usado", "a", "b", "c"]));
  });
});

function eventoAgenda(id: string, cambios: Partial<import("./agenda").EventoAgenda> = {}): import("./agenda").EventoAgenda {
  return { id, titulo: id, inicio: "2026-09-24T01:00:00Z", fin: "2026-09-24T03:00:00Z", imagen: null, precio: null, lugar_id: null, sitio_texto: null, sitio_reservado: false, zona: "America/Mexico_City", lugar: null, creado_en: "2026-09-01T00:00:00Z", van: 0, ...cambios };
}

describe("Inicio: los carriles de una sola agenda (estelar, esta semana, nuevos), sin repetirse", () => {
  it("con favoritos: el estelar es 'Seleccionados para ti' y 'Esta semana' se lleva lo que no siguió", () => {
    const seguido = eventoAgenda("favorito", { lugar_id: "lugar-1" }); // dentro de la semana (fecha por defecto)
    const otroDeLaSemana = eventoAgenda("otro-de-la-semana", { van: 10 });
    const lejano = eventoAgenda("lejano", { van: 10, inicio: "2026-10-25T01:00:00Z", fin: "2026-10-25T03:00:00Z" });
    const r = calcularCarrilesAgenda(agenda({ eventos: [seguido, otroDeLaSemana, lejano], seguidos: ["lugar-1"] }), ahora);
    expect(r.titulo).toBe("Seleccionados para ti");
    expect(r.estelar.map((e) => e.id)).toEqual(["favorito"]);
    expect(r.estaSemana.map((e) => e.id)).toEqual(["otro-de-la-semana"]);
    expect(r.nuevos).toEqual([]);
  });
  it("un evento que calificaría para varios carriles solo sale en el primero (estelar gana sobre esta semana y nuevos)", () => {
    const e = eventoAgenda("el-mismo", { lugar_id: "lugar-1", van: 50, creado_en: ahora.toISOString() });
    const r = calcularCarrilesAgenda(agenda({ eventos: [e], seguidos: ["lugar-1"] }), ahora);
    expect(r.estelar.map((x) => x.id)).toEqual(["el-mismo"]);
    expect(r.estaSemana).toEqual([]);
    expect(r.nuevos).toEqual([]);
  });
  it("sin favoritos (o sin sesión), el estelar cae al respaldo 'Destacados' — ya sin recorte de 7 días", () => {
    const destacado = eventoAgenda("destacado", { inicio: "2026-11-01T01:00:00Z", fin: "2026-11-01T03:00:00Z" });
    const r = calcularCarrilesAgenda(agenda({ eventos: [destacado], seguidos: null, destacados: [{ id: "destacado", motivo: "elegido", hasta: null, van: 0 }] }), ahora);
    expect(r.titulo).toBe("Destacados");
    expect(r.estelar.map((e) => e.id)).toEqual(["destacado"]);
    expect(r.estaSemana).toEqual([]);
  });
  it("con sesión y seguimientos, un destacado de un lugar que no se sigue sale en «Seleccionados para ti», primero, y no se repite en «Esta semana» ni «Nuevos»", () => {
    const seguido = eventoAgenda("seguido", { lugar_id: "lugar-1", van: 9 });
    const destacadoAjeno = eventoAgenda("destacado-ajeno", { lugar_id: "lugar-2", van: 0, inicio: "2026-09-27T01:00:00Z", fin: "2026-09-27T03:00:00Z" }); // esta semana y no se sigue
    const otro = eventoAgenda("otro-de-la-semana", { lugar_id: "lugar-3", van: 3 });
    const publicadoHaceUnDia = "2026-09-22T18:00:00Z";
    const lejanos = ["n1", "n2", "n3"].map((id) => eventoAgenda(id, { inicio: "2026-10-20T01:00:00Z", fin: "2026-10-20T03:00:00Z", creado_en: publicadoHaceUnDia }));
    const r = calcularCarrilesAgenda(agenda({ eventos: [seguido, destacadoAjeno, otro, ...lejanos], seguidos: ["lugar-1"], destacados: [{ id: "destacado-ajeno", motivo: "elegido", hasta: null, van: 0 }] }), ahora);
    expect(r.titulo).toBe("Seleccionados para ti");
    expect(r.estelar.map((e) => e.id)).toEqual(["destacado-ajeno", "seguido"]);
    expect(r.estaSemana.map((e) => e.id)).toEqual(["otro-de-la-semana"]);
    expect(r.nuevos.map((e) => e.id).sort()).toEqual(["n1", "n2", "n3"]);
    const todos = [...r.estelar, ...r.estaSemana, ...r.nuevos].map((e) => e.id);
    expect(new Set(todos).size).toBe(todos.length);
  });
  it("con sesión y seguimientos, los destacados van en el orden de la administración y los demás favoritos, después", () => {
    const f1 = eventoAgenda("f1", { lugar_id: "lugar-1", van: 40 });
    const d1 = eventoAgenda("d1", { lugar_id: "lugar-9", inicio: "2026-09-25T01:00:00Z" });
    const d2 = eventoAgenda("d2", { lugar_id: "lugar-8", inicio: "2026-09-24T02:00:00Z" });
    const r = calcularCarrilesAgenda(
      agenda({ eventos: [f1, d1, d2], seguidos: ["lugar-1"], destacados: [{ id: "d1", motivo: "elegido", hasta: null, van: 0 }, { id: "d2", motivo: "elegido", hasta: null, van: 0 }] }),
      ahora,
    );
    expect(r.estelar.map((e) => e.id)).toEqual(["d1", "d2", "f1"]); // d1 antes que d2 aunque d2 sea más temprano, y f1 (el que más va) después
  });
  it("con más de 12 candidatos, el estelar se corta a 12 y los que no caben quedan para «Esta semana»", () => {
    const eventos = Array.from({ length: 14 }, (_, i) => eventoAgenda(`e${i}`, { lugar_id: `lugar-${i}`, van: 100 - i }));
    const r = calcularCarrilesAgenda(agenda({ eventos, seguidos: eventos.map((e) => e.lugar_id!) }), ahora);
    expect(r.estelar).toHaveLength(12);
    expect(r.estaSemana.map((e) => e.id).sort()).toEqual(["e12", "e13"]);
  });
  describe("lo que ya está en Tus planes (founder, 2026-10-01)", () => {
    const enPlanes = (id: string, cambios = {}) => eventoAgenda(id, { lugar_id: "lugar-1", ...cambios });
    it("un destacado que ya está en Tus planes no sale en el estelar", () => {
      const planeado = enPlanes("planeado", { lugar_id: "lugar-9" });
      const otro = enPlanes("otro", { lugar_id: "lugar-9" });
      const r = calcularCarrilesAgenda(agenda({ eventos: [planeado, otro], seguidos: [], asistencias: { planeado: "voy" }, destacados: [{ id: "planeado", motivo: "elegido", hasta: null, van: 0 }, { id: "otro", motivo: "elegido", hasta: null, van: 0 }] }), ahora);
      expect(r.estelar.map((e) => e.id)).toEqual(["otro"]);
    });
    it("un favorito con Voy o Me interesa no sale en el estelar, y un evento de Tus planes no sale en ninguna otra fila", () => {
      const voy = enPlanes("voy", { van: 9 });
      const interesa = enPlanes("interesa", { van: 8 });
      const libre = enPlanes("libre", { van: 1 });
      const nuevos = ["n1", "n2", "n3"].map((id) => eventoAgenda(id, { inicio: "2026-10-20T01:00:00Z", fin: "2026-10-20T03:00:00Z", creado_en: "2026-09-22T18:00:00Z" }));
      const planeadoNuevo = eventoAgenda("n-planeado", { inicio: "2026-10-21T01:00:00Z", fin: "2026-10-21T03:00:00Z", creado_en: "2026-09-22T18:00:00Z" });
      const r = calcularCarrilesAgenda(agenda({ eventos: [voy, interesa, libre, planeadoNuevo, ...nuevos], seguidos: ["lugar-1"], asistencias: { voy: "voy", interesa: "me_interesa", "n-planeado": "voy" } }), ahora);
      expect(r.titulo).toBe("Seleccionados para ti");
      expect(r.estelar.map((e) => e.id)).toEqual(["libre"]);
      expect(r.estaSemana).toEqual([]);
      expect(r.nuevos.map((e) => e.id).sort()).toEqual(["n1", "n2", "n3"]);
      const todos = [...r.estelar, ...r.estaSemana, ...r.nuevos].map((e) => e.id);
      expect(todos).not.toContain("voy");
      expect(todos).not.toContain("interesa");
      expect(todos).not.toContain("n-planeado");
    });
    it("lo de Esta semana que ya está en Tus planes tampoco sale ahí", () => {
      const r = calcularCarrilesAgenda(agenda({ eventos: [eventoAgenda("a"), eventoAgenda("b")], seguidos: [], asistencias: { a: "me_interesa" } }), ahora);
      expect(r.estaSemana.map((e) => e.id)).toEqual(["b"]);
    });
    it("sin sesión (asistencias null) nada cambia", () => {
      const e = eventoAgenda("a");
      const r = calcularCarrilesAgenda(agenda({ eventos: [e], seguidos: null, asistencias: null, destacados: [{ id: "a", motivo: "elegido", hasta: null, van: 0 }] }), ahora);
      expect(r.estelar.map((x) => x.id)).toEqual(["a"]);
    });
  });
});


describe("recuentos de Agenda no disponibles", () => {
  it("con algún dato desconocido usa fecha para todo el grupo, sin alterar los destacados", () => {
    const temprano = evento("temprano", { van: 0, inicio: "2026-10-04T10:00:00Z" });
    const sinRecuento = evento("desconocido", { van: null, inicio: "2026-10-04T11:00:00Z" });
    const tarde = evento("tarde", { van: 100, inicio: "2026-10-04T12:00:00Z" });
    const destacado = evento("destacado", { van: null, inicio: "2026-10-08T10:00:00Z" });
    expect(carrilEstelar([destacado], [tarde, sinRecuento, temprano], new Set()).map((e) => e.id))
      .toEqual(["destacado", "temprano", "desconocido", "tarde"]);
  });
});

describe("Inicio: los eventos con varios días (OL-320)", () => {
  // `ahora`: miércoles 23 de sep, 12:00 de la ciudad. El taller: viernes 25 y sábado 26 (esta semana) y sábado 3 de oct (después).
  const hora = (d: string, h: string) => new Date(`${d}T${h}:00-06:00`).toISOString();
  const sesiones = [
    { inicio: hora("2026-09-25", "18:00"), fin: hora("2026-09-25", "20:00") },
    { inicio: hora("2026-09-26", "11:00"), fin: hora("2026-09-26", "13:00") },
    { inicio: hora("2026-10-03", "17:00"), fin: hora("2026-10-03", "19:00") },
  ];
  const taller = eventoAgenda("taller", { titulo: "Taller", inicio: sesiones[0].inicio, fin: sesiones[2].fin, sesiones, lugar_id: "lugar-1" });

  it("«Esta semana» pone el evento en cada día de la semana en que pasa algo, con la hora de ese día, y deja fuera el de después", () => {
    const r = carrilEstaSemana([taller], new Set(), ahora);
    expect(r.map((e) => [claveDe(e), e.inicio])).toEqual([["taller:2026-09-25", sesiones[0].inicio], ["taller:2026-09-26", sesiones[1].inicio]]);
    expect(r.map(textoParte)).toEqual(["Día 1 de 3", "Día 2 de 3"]);
  });
  it("«Esta semana» marca el evento como visto una sola vez: ningún otro carril lo repite", () => {
    const vistos = new Set<string>();
    carrilEstaSemana([taller], vistos, ahora);
    expect([...vistos]).toEqual(["taller"]);
    expect(carrilEstaSemana([taller], vistos, ahora)).toEqual([]);
  });
  it("«Esta semana» no enseña un día que ya pasó aunque el evento siga en curso", () => {
    const r = carrilEstaSemana([taller], new Set(), new Date(hora("2026-09-25", "21:00")));
    expect(r.map((e) => claveDe(e))).toEqual(["taller:2026-09-26"]);
  });
  it("un evento en curso (empezó, sigue) sin sesión esta semana no está en «Esta semana»", () => {
    const lejana = { inicio: hora("2026-10-10", "17:00"), fin: hora("2026-10-10", "19:00") };
    const enCurso = eventoAgenda("curso", { inicio: sesiones[0].inicio, fin: lejana.fin, sesiones: [sesiones[0], lejana] });
    expect(carrilEstaSemana([enCurso], new Set(), new Date(hora("2026-09-27", "12:00")))).toEqual([]);
  });
  it("un evento de varios días sin horario por día sale una vez por día de la semana, hoy incluido", () => {
    const festival = eventoAgenda("festival", { inicio: hora("2026-09-23", "20:00"), fin: hora("2026-10-07", "21:00") }); // cada día de 20:00 a 21:00, 15 días
    expect(carrilEstaSemana([festival], new Set(), ahora).map((e) => e.ocurrencia?.dia)).toEqual(["2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29"]);
  });
  it("«Seleccionados para ti», «Nuevos» y «Más adelante» presentan el evento en su próximo día, no en el primero", () => {
    const despues = new Date(hora("2026-09-25", "21:00"));
    const r = calcularCarrilesAgenda(agenda({ eventos: [taller], seguidos: ["lugar-1"] }), despues);
    expect(r.estelar).toHaveLength(1);
    expect(r.estelar[0]).toMatchObject({ id: "taller", inicio: sesiones[1].inicio });
    expect(textoParte(r.estelar[0])).toBe("Día 2 de 3");
    expect(carrilMasAdelante(agenda({ eventos: [taller], asistencias: null }), despues)[0].inicio).toBe(sesiones[1].inicio);
  });
});
