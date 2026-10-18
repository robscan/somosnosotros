import { describe, expect, it } from "vitest";
import { nombresParaQuien } from "@/lib/actosLeidos";
import type { ActoLeido } from "@/lib/eventos";
import { localAIso } from "@/lib/fechas";
import type { LugarResumen } from "@/lib/lugares";
import { respuestasAlEditar } from "./alEditar";
import { claseSinResolver, pasosQueFaltan, respuestasDelCartel, sugeridoDelCartel, type Leido } from "./cartelPorPasos";
import { cuandoDeClase, sedesDelPrograma } from "./clasePorPasos";
import { OTRO_VACIO, actoListo, claseElegida, conPrograma, estadoInicial, faltaParaPublicar, faltan, finDe, flujo, inicioDe, pasoActual, pideDonde, preguntaDe, sesionesDe, type Accion, type Estado, type Respuestas } from "./pasos";

// OL-413 (bitácora 444): festival en una sola ficha cuando es un día y un lugar; la lectura de carteles deja de partir un evento en «varios
// eventos»; el lugar se reconoce por su dirección; y una sola pregunta «¿Qué es?» cuando no se puede resolver. Las lecturas de abajo son las que
// devolvería el modelo para los dos carteles del founder (el 18 de octubre): sin llamar a la API.

const ZONA = "America/Mexico_City";
const LUNARIA = "0b0b0b0b-0000-4000-8000-0000000000a1";
const LAB = "0b0b0b0b-0000-4000-8000-0000000000a2";
const CC200 = "0b0b0b0b-0000-4000-8000-0000000000a3";
const LUGAR_LAB: LugarResumen = { id: LAB, nombre: "Laboratorio Centro Histórico", tipo: "foro", direccion: "C. 5 de Mayo 1100, 78339 San Luis Potosí, Mexico", lat: 22.1469, lng: -100.9771, portada: null };
const pasar = (e: Estado, ...acciones: Accion[]) => acciones.reduce(flujo, e);

type Forma = NonNullable<Leido["valores"]["forma"]>;
const VALORES: Leido["valores"] = { titulo: "", inicio: "", fin: "", gratis: true, precio: "", descripcion: "", enlace: "", lugar: "", direccion: "", artistas: [], festival: "" };
const forma = (f: Partial<Forma> = {}): Forma => ({ clase: null, visita: null, sesiones: [], actos: [], ...f });
const leido = (valores: Partial<Leido["valores"]>, resto: Partial<Omit<Leido, "valores">> = {}): Leido => ({ ok: true, valores: { ...VALORES, ...valores }, lugarId: null, quien: [], horaLeida: false, costoLeido: false, sugerido: null, ...resto });
const acto = (titulo: string, fecha: string, hora: string, lugar = "", lugarId: string | null = null): ActoLeido => ({ titulo, fecha, hora, lugar, lugarId });
const ALINEACION = ["Sonido Satanás", "Juan Escumbia", "Sonido Blasfemo", "Vinyl Box"];

/** Cumbiachella como la lee el lector con el esquema nuevo: un festival de una noche, sin programa, con la alineación en los artistas. */
const CUMBIACHELLA = leido(
  { titulo: "Cumbiachella", inicio: "2026-10-30T20:00", fin: "2026-10-30T02:00", lugar: "Lunaria", descripcion: "Festival cumbiero potosino: cumbia, sonido, baile y disfraz.", artistas: ALINEACION, forma: forma({ clase: "festival" }) },
  { lugarId: LUNARIA, horaLeida: true, quien: ALINEACION.map((nombre) => ({ nombre })) },
);

/** Trayectos Interactivos con el esquema nuevo: una noche con varias actividades que no se anuncia como festival: un evento. Solo la dirección. */
const TRAYECTOS = leido(
  {
    titulo: "Trayectos Interactivos",
    inicio: "2026-10-17T19:00",
    direccion: "5 de mayo 1100 . Centro Histórico San Luis Potosí, México",
    descripcion: "Concierto, cortometraje, exposición, charla y cócteles.",
    artistas: ["Disonáuta", "El Ermitaño", "Las brujas de la Cañada"],
    forma: forma({ clase: "puntual" }),
  },
  { horaLeida: true, quien: [{ nombre: "Disonáuta" }, { nombre: "El Ermitaño" }, { nombre: "Las brujas de la Cañada" }], sugerido: LUGAR_LAB },
);

describe("Cumbiachella: un festival de un día en un lugar es una sola ficha", () => {
  it("con el esquema nuevo: festival, sin programa, con su día, su horario de 8 pm a 2 am, su lugar y la alineación en «Quién»", () => {
    const r = respuestasDelCartel(CUMBIACHELLA);
    expect(r).toMatchObject({ clase: "festival", claseFijada: true, dias: { desde: "2026-10-30", hasta: null }, hora: "20:00", fin: "2026-10-31T02:00" });
    expect(r.actos).toBeUndefined();
    expect(r.claseDudosa).toBeUndefined();
    expect(r.sitio).toEqual({ modo: "lugar", lugarId: LUNARIA, otro: OTRO_VACIO });
    expect(r.quien?.map((q) => q.nombre)).toEqual(ALINEACION);
    // Solo falta el precio: nada de sedes por acto.
    expect(pasosQueFaltan(CUMBIACHELLA)).toEqual(["cuanto"]);
  });

  it("de «Leyendo» a «¿Cuánto cuesta?» y a «Revisa»: «Publicar festival», un solo evento", () => {
    const e = pasar(estadoInicial(), { tipo: "contestar", cambios: respuestasDelCartel(CUMBIACHELLA) }, { tipo: "contestar", cambios: { costo: "por_confirmar" } });
    expect(pasoActual(e)).toBe("revisa");
    expect(conPrograma(e.r)).toBe(false);
    expect(faltaParaPublicar(e.r)).toBeNull();
    expect({ inicio: inicioDe(e.r), fin: finDe(e.r) }).toEqual({ inicio: "2026-10-30T20:00", fin: "2026-10-31T02:00" });
    expect(sesionesDe(e.r)).toBeNull();
    // Su cuándo en «Publicado» y al compartir es el de un evento (día y hora), no «Programa registrado: 0 actividades».
    expect(cuandoDeClase(e.r, ZONA)).toBeUndefined();
  });

  it("con la lectura de antes (cuatro actos el mismo día y en el mismo lugar), también: se juntan y no hay programa", () => {
    const actos = [acto("Sonido Satanás", "2026-10-30", "20:00", "Lunaria", LUNARIA), acto("Juan Escumbia", "2026-10-30", "22:00", "Lunaria", LUNARIA), acto("Sonido Blasfemo", "2026-10-31", "00:00", "Lunaria", LUNARIA), acto("Vinyl Box", "2026-10-31", "01:00", "Lunaria", LUNARIA)];
    // El servidor pasa los nombres de una noche a los artistas para cruzarlos con el directorio.
    const artistas = nombresParaQuien([], actos, "Lunaria");
    expect(artistas).toEqual(ALINEACION);
    const antes = leido({ titulo: "Cumbiachella", inicio: "2026-10-30T20:00", lugar: "Lunaria", descripcion: "Festival cumbiero potosino.", artistas, forma: forma({ clase: "festival", actos }) }, { lugarId: LUNARIA, horaLeida: true, quien: artistas.map((nombre) => ({ nombre })) });
    const r = respuestasDelCartel(antes);
    expect(r).toMatchObject({ clase: "festival", dias: { desde: "2026-10-30", hasta: null }, hora: "20:00", sitio: { modo: "lugar", lugarId: LUNARIA } });
    expect(r.actos).toBeUndefined();
    expect(r.quien?.map((q) => q.nombre)).toEqual(ALINEACION);
    expect(pasosQueFaltan(antes)).toEqual(["cuanto"]);
  });

  it("sin artistas del servidor (respaldo), los nombres de los actos llegan igual a «Quién»", () => {
    const actos = ALINEACION.map((t, i) => acto(t, "2026-10-30", `2${i}:00`, "Lunaria"));
    const r = respuestasDelCartel(leido({ titulo: "Cumbiachella", inicio: "2026-10-30T20:00", lugar: "Lunaria", descripcion: "Festival cumbiero potosino.", forma: forma({ clase: "festival", actos }) }, { lugarId: LUNARIA, horaLeida: true }));
    expect(r.quien?.map((q) => q.nombre)).toEqual(ALINEACION);
  });
});

describe("Trayectos Interactivos: una noche con varias actividades es un evento, y el lugar se reconoce por su dirección", () => {
  it("un evento de un día a las 7 p.m., con los nombres en «Quién»; el sitio queda por confirmar", () => {
    const r = respuestasDelCartel(TRAYECTOS);
    expect(r).toMatchObject({ claseFijada: true, dias: { desde: "2026-10-17", hasta: null }, hora: "19:00", fin: "" });
    expect(r.clase).toBeUndefined();
    expect(r.sitio?.otro).toMatchObject({ sitioTexto: "", direccion: "5 de mayo 1100 . Centro Histórico San Luis Potosí, México", pinPendiente: true });
  });

  it("«¿Es en Laboratorio Centro Histórico?» al llegar a «Dónde»; confirmarlo lo usa y sigue «¿Cuánto cuesta?»", () => {
    const sugerido = sugeridoDelCartel(TRAYECTOS, [LUGAR_LAB]);
    expect(sugerido).toMatchObject({ nombre: "Laboratorio Centro Histórico", lugarId: LAB, punto: { lat: 22.1469, lng: -100.9771 } });
    const e = pasar(estadoInicial(), { tipo: "sugerir", candidato: sugerido }, { tipo: "contestar", cambios: respuestasDelCartel(TRAYECTOS) });
    expect(pasoActual(e)).toBe("mapa");
    expect(e.pila).toEqual(["inicio", "donde", "mapa"]);
    expect(e.candidato?.lugarId).toBe(LAB);
    expect(preguntaDe("mapa", e.r, e.candidato)).toBe("¿Es en Laboratorio Centro Histórico?");
    // «Sí, es aquí»: el lugar del directorio (lo que hace `elegirLugar`).
    const listo = flujo(e, { tipo: "contestar", cambios: { sitio: { modo: "lugar", lugarId: LAB, otro: OTRO_VACIO } } });
    expect(pasoActual(listo)).toBe("cuanto");
    expect(listo.r.sitio.lugarId).toBe(LAB);
  });

  it("«Buscar otro» vuelve a «¿Dónde es?» de siempre y la propuesta no se repite", () => {
    const e = pasar(estadoInicial(), { tipo: "sugerir", candidato: sugeridoDelCartel(TRAYECTOS, [LUGAR_LAB]) }, { tipo: "contestar", cambios: respuestasDelCartel(TRAYECTOS) }, { tipo: "atras", desde: "mapa" });
    expect(pasoActual(e)).toBe("donde");
    expect(e.sugerido).toBeNull();
  });

  it("si el nombre ya cruzó con el directorio, no se propone nada por la dirección", () => {
    expect(sugeridoDelCartel({ ...TRAYECTOS, lugarId: LAB })).toBeNull();
    expect(sugeridoDelCartel({ ...TRAYECTOS, sugerido: null })).toBeNull();
  });

  it("con la lectura de antes (festival con cinco actos a la misma hora): se juntan y, como nada lo anuncia como festival, se pregunta «¿Qué es?»", () => {
    const actos = ["Concierto: Disonáuta", "Cortometraje: El Ermitaño", "Exposición: Las brujas de la Cañada", "Charla: Charlemos", "Cócteles: Sorpresas"].map((t) => acto(t, "2026-10-17", "19:00"));
    const antes = leido({ titulo: "Trayectos Interactivos", inicio: "2026-10-17T19:00", direccion: "5 de mayo 1100", artistas: ["Disonáuta", "El Ermitaño", "Las brujas de la Cañada"], forma: forma({ clase: "festival", actos }) }, { horaLeida: true, quien: [{ nombre: "Disonáuta" }, { nombre: "El Ermitaño" }, { nombre: "Las brujas de la Cañada" }] });
    const r = respuestasDelCartel(antes);
    expect(r.claseDudosa).toBe(true);
    expect(r.actos).toBeUndefined();
    expect(r).toMatchObject({ dias: { desde: "2026-10-17", hasta: null }, hora: "19:00" });
    // Las actividades van a la descripción (el lector no trajo una) y «Charlemos» con ellas: el lector ya dijo quién se presenta.
    expect(r.descripcion).toBe("Concierto, cortometraje, exposición, charla y cócteles: Charlemos.");
    expect(r.quien?.map((q) => q.nombre)).toEqual(["Disonáuta", "El Ermitaño", "Las brujas de la Cañada"]);
    expect(pasosQueFaltan(antes)).toEqual(["que", "donde", "cuanto"]);
    // «¿Qué es?» → Evento: ya no se pregunta y sigue «Dónde».
    const e = pasar(estadoInicial(), { tipo: "contestar", cambios: r });
    expect(pasoActual(e)).toBe("que");
    expect(preguntaDe("que", e.r)).toBe("¿Qué es?");
    const evento = flujo(e, { tipo: "contestar", cambios: claseElegida("puntual") });
    expect(pasoActual(evento)).toBe("donde");
    expect(evento.r).toMatchObject({ clase: "puntual", claseFijada: true, claseDudosa: false });
  });
});

describe("«¿Qué es?» solo cuando no se puede resolver", () => {
  const dudosa = (l: Leido) => claseSinResolver(l, null);

  it("sin clase y sin pista en el título, se pregunta; con pista («Taller de…»), no", () => {
    expect(dudosa(leido({ titulo: "Trayectos Interactivos", forma: forma({ clase: null }) }))).toBe(true);
    expect(dudosa(leido({ titulo: "Taller de grabado", forma: forma({ clase: null }) }))).toBe(false);
  });

  it("festival sin programa: no se pregunta si el título, la descripción o el festival que nombra lo anuncian; si nada lo dice, sí", () => {
    expect(dudosa(CUMBIACHELLA)).toBe(false);
    expect(dudosa(leido({ titulo: "Festival de Jazz", forma: forma({ clase: "festival" }) }))).toBe(false);
    expect(dudosa(leido({ titulo: "Noche de jazz", forma: forma({ clase: "festival" }) }))).toBe(true);
  });

  it("exposición sin periodo de visita se pregunta; la inauguración de una exposición es un evento y no", () => {
    expect(dudosa(leido({ titulo: "Ecos de papel", forma: forma({ clase: "exposicion" }) }))).toBe(true);
    expect(dudosa(leido({ titulo: "Ecos de papel", forma: forma({ clase: "exposicion", visita: { desde: "2026-11-06", hasta: "2026-11-30" } }) }))).toBe(false);
    expect(dudosa(leido({ titulo: "Inauguración de Ecos de papel", forma: forma({ clase: "exposicion" }) }))).toBe(false);
  });

  it("en los casos claros no se pregunta nada: evento, taller y festival con programa", () => {
    expect(dudosa(leido({ titulo: "Concierto", forma: forma({ clase: "puntual" }) }))).toBe(false);
    expect(dudosa(leido({ titulo: "Curso", forma: forma({ clase: "taller" }) }))).toBe(false);
    expect(claseSinResolver(leido({ titulo: "Muestra", forma: forma({ clase: "festival" }) }), { tipo: "programa", sedes: 1 })).toBe(false);
    // Un lector viejo, sin la forma: como siempre.
    expect(dudosa(leido({ titulo: "Algo" }))).toBe(false);
  });

  it("elegir en «¿Qué es?» una exposición convierte el día leído en el primero de visita", () => {
    const r = respuestasDelCartel(leido({ titulo: "Ecos de papel", inicio: "2026-11-06T19:00", forma: forma({ clase: "exposicion" }) }, { horaLeida: true }));
    const e = pasar(estadoInicial(), { tipo: "contestar", cambios: r }, { tipo: "contestar", cambios: claseElegida("exposicion") });
    expect(pasoActual(e)).toBe("visita");
    expect(e.r.visita).toEqual({ desde: "2026-11-06", hasta: null });
  });
});

describe("un festival con programa: la sede se pregunta una sola vez", () => {
  const varios = (lugar: string, lugarId: string | null, actos: ActoLeido[]) => leido({ titulo: "Festival de Cine", lugar, forma: forma({ clase: "festival", actos }) }, { lugarId });

  it("varios días en la misma sede leída: los actos heredan la del festival y no se pregunta acto por acto", () => {
    const l = varios("Cineteca", null, [acto("Inauguración", "2026-11-12", "19:00", "Cineteca"), acto("Función", "2026-11-13", "18:00", "Cineteca"), acto("Clausura", "2026-11-14", "20:00")]);
    const r = respuestasDelCartel(l);
    expect(r.clase).toBe("festival");
    expect(r.actos?.map((a) => a.sitio)).toEqual([null, null, null]);
    expect(r.actos?.every(actoListo)).toBe(true);
    expect(r.sitio?.otro).toMatchObject({ sitioTexto: "Cineteca", pinPendiente: true });
    // Primero el programa (para revisarlo), luego «Dónde» una vez y el precio.
    const e = pasar(estadoInicial(), { tipo: "contestar", cambios: r });
    expect(pasoActual(e)).toBe("programa");
    expect(faltan(e.r)).toEqual(["donde", "cuanto"]);
    expect(pideDonde(e.r)).toBe(true);
    const sede = pasar(e, { tipo: "seguir" }, { tipo: "contestar", cambios: { sitio: { modo: "lugar", lugarId: CC200, otro: OTRO_VACIO } } });
    expect(pasoActual(sede)).toBe("cuanto");
    expect(sedesDelPrograma(sede.r, [{ id: CC200, nombre: "CC200", tipo: "foro", direccion: null, lat: 0, lng: 0, portada: null }])).toBe("CC200");
  });

  it("con la sede del festival del directorio no se pregunta ninguna", () => {
    const r = respuestasDelCartel(varios("CC200", CC200, [acto("Inauguración", "2026-11-12", "19:00", "CC200", CC200), acto("Función", "2026-11-14", "17:00")]));
    expect(faltan({ ...estadoInicial().r, ...r })).toEqual(["cuanto"]);
  });

  it("con sedes distintas cada acto lleva la suya; la que no se cruzó se confirma en su acto, y el festival no pregunta dónde", () => {
    const r = respuestasDelCartel(varios("", null, [acto("Inauguración", "2026-11-12", "19:00", "CC200", CC200), acto("Función", "2026-11-12", "21:00", "Cineteca")]));
    expect(r.actos?.map((a) => a.sitio?.modo)).toEqual(["lugar", "otro"]);
    const todo = { ...estadoInicial().r, ...r } as Respuestas;
    expect(pideDonde(todo)).toBe(false);
    expect(faltan(todo)).toEqual(["programa", "cuanto"]);
  });

  it("un acto agregado a mano hereda la sede del festival y no la pide", () => {
    const r: Respuestas = { ...estadoInicial().r, nombre: "Festival", clase: "festival", claseFijada: true, sitio: { modo: "lugar", lugarId: CC200, otro: OTRO_VACIO }, costo: "gratis", actos: [{ clave: "a", titulo: "Lectura", dia: "2026-11-12", hora: "19:00", sitio: null, sedeLeida: "", quien: [], marcado: true, leido: false }] };
    expect(faltan(r)).toEqual([]);
  });
});

describe("un festival sin programa en el alta y al editar", () => {
  const base = (): Respuestas => ({ ...estadoInicial().r, nombre: "Noches de jazz", ...claseElegida("festival") });

  it("pide día, hora y dónde como un evento; con todo, se publica sin actos", () => {
    expect(faltan(base())).toEqual(["dia", "hora", "donde", "cuanto"]);
    const lista: Respuestas = { ...base(), dias: { desde: "2026-11-06", hasta: null }, hora: "20:00", fin: "", sitio: { modo: "lugar", lugarId: CC200, otro: OTRO_VACIO }, costo: "por_confirmar" };
    expect(faltan(lista)).toEqual([]);
    expect(faltaParaPublicar(lista)).toBeNull();
  });

  it("de varias noches con la hora de cada una: viajan sus sesiones (horario por día)", () => {
    const sesiones = [{ dia: "2026-11-06", hora: "20:00", fin: "" }, { dia: "2026-11-07", hora: "19:00", fin: "" }];
    expect(sesionesDe({ ...base(), dias: { desde: "2026-11-06", hasta: "2026-11-07" }, hora: "20:00", fin: "", sesiones })).toEqual(sesiones);
  });

  it("al editar uno guardado sin actividades: su día, su hora y su lugar como un evento, nada de «programa»", () => {
    const evento = { titulo: "Cumbiachella", lugar_id: LUNARIA, precio: null, descripcion: null, enlace: null, imagen: null, sitio_texto: null, sitio_direccion: null, sitio_lat: null, sitio_lng: null, sitio_reservado: false, sitio_revelar_desde: null, zona: ZONA, clase: "festival" as const, inicio: localAIso("2026-10-30T20:00", ZONA)!, fin: localAIso("2026-10-31T02:00", ZONA)! };
    const r = respuestasAlEditar({ evento, privado: null, lugares: [{ id: LUNARIA, nombre: "Foro lunaria", tipo: "foro", direccion: null, lat: 22.15, lng: -100.98, portada: null }], quien: [], zona: ZONA, clase: { actos: 0 } });
    expect(r).toMatchObject({ clase: "festival", programaGuardado: 0, dias: { desde: "2026-10-30", hasta: null }, hora: "20:00", fin: "2026-10-31T02:00" });
    expect(faltan(r)).toEqual([]);
    expect(pideDonde(r)).toBe(true);
    expect({ inicio: inicioDe(r), fin: finDe(r) }).toEqual({ inicio: "2026-10-30T20:00", fin: "2026-10-31T02:00" });
  });
});

describe("una obra en temporada", () => {
  it("el mismo título tres días seguidos en un lugar: un evento de varios días con la hora de cada uno", () => {
    const actos = [acto("Bodas de sangre", "2026-11-13", "20:00", "Teatro de la Paz"), acto("Bodas de sangre", "2026-11-14", "20:00", "Teatro de la Paz"), acto("Bodas de sangre", "2026-11-15", "18:00", "Teatro de la Paz")];
    const r = respuestasDelCartel(leido({ titulo: "Bodas de sangre", lugar: "Teatro de la Paz", forma: forma({ clase: "puntual", actos }) }));
    expect(r).toMatchObject({ dias: { desde: "2026-11-13", hasta: "2026-11-15" }, hora: "20:00", fin: "2026-11-15T23:59" });
    expect(r.sesiones?.map((s) => [s.dia, s.hora])).toEqual([["2026-11-13", "20:00"], ["2026-11-14", "20:00"], ["2026-11-15", "18:00"]]);
    expect(r.actos).toBeUndefined();
  });
});
