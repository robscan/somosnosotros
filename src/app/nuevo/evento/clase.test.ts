import { describe, expect, it } from "vitest";
import { localAIso } from "@/lib/fechas";
import { respuestasAlEditar } from "./alEditar";
import { respuestasDelCartel, type Leido } from "./cartelPorPasos";
import { OTRO_VACIO, avance, claseElegida, clasesALaVista, estadoInicial, faltaParaPublicar, faltan, finDe, flujo, inicioDe, pasoActual, preguntaDe, resumenPrograma, sesionesDe, type Accion, type Acto, type Estado, type Respuestas, type Sitio } from "./pasos";

// OL-321 (bitácora 350; doc 55 §2, prototipo `exposicion-festival-taller.html`): la clase se propone (el título o el cartel), se confirma en
// «Revisa» y cambia solo el paso del tiempo.
const ZONA = "America/Mexico_City";
const LUGAR = "0b0b0b0b-0000-4000-8000-000000000001";
const OTRO_LUGAR = "0b0b0b0b-0000-4000-8000-000000000002";
const SITIO: Sitio = { modo: "lugar", lugarId: LUGAR, otro: OTRO_VACIO };
const pasar = (e: Estado, ...acciones: Accion[]) => acciones.reduce(flujo, e);
const contestar = (cambios: Partial<Respuestas>): Accion => ({ tipo: "contestar", cambios });
const cambiar = (cambios: Partial<Respuestas>): Accion => ({ tipo: "cambiar", cambios });
const conNombre = (nombre: string) => pasar(estadoInicial(), { tipo: "seguir" }, cambiar({ nombre }), { tipo: "seguir" });

describe("el título propone la clase y su paso del tiempo", () => {
  it("«Exposición…» pregunta «¿Cuándo se puede visitar?» en lugar del día y la hora", () => {
    const e = conNombre("Exposición Ecos de papel");
    expect(e.r.clase).toBe("exposicion");
    expect(pasoActual(e)).toBe("visita");
    expect(preguntaDe("visita", e.r)).toBe("¿Cuándo se puede visitar?");
    expect(avance("visita")).toBe(avance("dia"));
    expect(faltan(e.r)).toEqual(["visita", "donde", "cuanto"]);
    expect(faltaParaPublicar(e.r)).toBe("Falta cuándo se puede visitar, el lugar y el precio");
  });

  it("la exposición completa llega a «Revisa» y se guarda del primer día al final del de cierre", () => {
    const e = pasar(conNombre("Exposición Ecos de papel"), cambiar({ visita: { desde: "2026-11-06", hasta: "2026-11-30" } }), { tipo: "seguir" }, contestar({ sitio: SITIO }), contestar({ costo: "gratis" }));
    expect(pasoActual(e)).toBe("revisa");
    expect(faltaParaPublicar(e.r)).toBeNull();
    expect({ inicio: inicioDe(e.r), fin: finDe(e.r) }).toEqual({ inicio: "2026-11-06T00:00", fin: "2026-11-30T23:59" });
    expect(sesionesDe(e.r)).toBeNull();
  });

  it("«Taller de…» pregunta los días de las sesiones; con su hora, un taller de tres sesiones en días sueltos", () => {
    let e = conNombre("Taller de grabado");
    expect(pasoActual(e)).toBe("sesiones");
    expect(faltaParaPublicar({ ...e.r, sitio: SITIO, costo: "gratis" })).toBe("Faltan las sesiones");
    e = pasar(e, cambiar({ sesionesDias: ["2026-10-24", "2026-10-10", "2026-10-17"], hora: "10:00", fin: "12:00" }), { tipo: "seguir" });
    expect(pasoActual(e)).toBe("donde");
    expect(sesionesDe(e.r)?.map((s) => s.dia)).toEqual(["2026-10-10", "2026-10-17", "2026-10-24"]);
    expect({ inicio: inicioDe(e.r), fin: finDe(e.r) }).toEqual({ inicio: "2026-10-10T10:00", fin: "2026-10-24T12:00" });
  });

  it("un taller de una sola sesión se guarda como un evento de un día (sin sesiones)", () => {
    const e = pasar(conNombre("Taller de grabado"), cambiar({ sesionesDias: ["2026-10-10"], hora: "10:00", fin: "" }));
    expect(sesionesDe(e.r)).toBeNull();
    expect({ inicio: inicioDe(e.r), fin: finDe(e.r) }).toEqual({ inicio: "2026-10-10T10:00", fin: "" });
  });

  it("un título sin pista es un evento, como siempre; una vez elegida, la clase ya no la cambia el título", () => {
    expect(pasoActual(conNombre("Concierto de son"))).toBe("dia");
    const e = pasar(estadoInicial(), cambiar({ nombre: "Lectura" }), cambiar({ clase: "exposicion", claseFijada: true }), cambiar({ nombre: "Taller de lectura" }));
    expect(e.r.clase).toBe("exposicion");
  });
});

// OL-345 (bitácora 374; founder, 2026-10-08): bajo el nombre, los chips Evento · Exposición · Taller · Festival con la propuesta del título marcada;
// un toque la fija sin dejar el paso y «Siguiente» lleva al paso del tiempo de esa clase (el mismo camino que «Cambiar» en «Revisa»).
describe("la clase en el primer paso (chips bajo el nombre)", () => {
  const enNombre = (nombre = "") => pasar(estadoInicial(), { tipo: "seguir" }, cambiar({ nombre }));

  it("sin nombre no hay chips; en cuanto hay texto salen, con la propuesta del título marcada o «Evento» por omisión", () => {
    expect(clasesALaVista(enNombre().r)).toBe(false);
    expect(clasesALaVista(enNombre("   ").r)).toBe(false);
    expect(clasesALaVista(enNombre("C").r)).toBe(true);
    expect(enNombre("Concierto de son").r.clase).toBe("puntual");
    const e = enNombre("Festival de jazz");
    expect(e.r).toMatchObject({ clase: "festival", claseFijada: false });
    expect(pasoActual(e)).toBe("nombre");
  });

  it("mientras nadie elige, la propuesta sigue al nombre al escribir y al borrar", () => {
    const e = pasar(enNombre("Festival"), cambiar({ nombre: "Fest" }));
    expect(e.r.clase).toBe("puntual");
    expect(pasar(e, cambiar({ nombre: "Expo de grabado" })).r.clase).toBe("exposicion");
  });

  it("un chip fija la clase sin dejar el paso; a partir de ahí el nombre ya no la cambia", () => {
    let e = flujo(enNombre("Festival de grabado"), cambiar(claseElegida("exposicion")));
    expect(e.r).toMatchObject({ clase: "exposicion", claseFijada: true });
    expect(pasoActual(e)).toBe("nombre");
    e = pasar(e, cambiar({ nombre: "Taller de grabado" }), cambiar({ nombre: "" }));
    expect(e.r.clase).toBe("exposicion");
    // Con la clase ya fijada los chips siguen a la vista aunque se borre el nombre: lo elegido no desaparece.
    expect(clasesALaVista(e.r)).toBe(true);
    // Elegir «Evento» sobre un título que propone otra cosa también la fija.
    expect(pasar(enNombre("Taller de son"), cambiar(claseElegida("puntual")), cambiar({ nombre: "Taller de son jarocho" })).r.clase).toBe("puntual");
  });

  it("la clase del cartel también saca los chips, aunque el cartel no traiga nombre", () => {
    expect(clasesALaVista({ nombre: "", claseFijada: true })).toBe(true);
  });

  it("«Siguiente» lleva por los pasos que pide la clase elegida: el orden de cada una", () => {
    const orden = (clase: Parameters<typeof claseElegida>[0]) => {
      const e = pasar(enNombre("Lectura en el jardín"), cambiar(claseElegida(clase)), { tipo: "seguir" });
      return [pasoActual(e), ...faltan(e.r)];
    };
    expect(orden("puntual")).toEqual(["dia", "dia", "hora", "donde", "cuanto"]);
    expect(orden("exposicion")).toEqual(["visita", "visita", "donde", "cuanto"]);
    expect(orden("taller")).toEqual(["sesiones", "sesiones", "donde", "cuanto"]);
    // Un festival no pregunta dónde (cada actividad tiene su sede): primero su programa, armado a mano.
    expect(orden("festival")).toEqual(["programa", "programa", "cuanto"]);
    const festival = pasar(enNombre("Lectura en el jardín"), cambiar(claseElegida("festival")), { tipo: "seguir" });
    expect(preguntaDe("programa", festival.r)).toBe("¿Qué actividades tiene?");
  });

  it("el chip hace lo mismo que «Cambiar» en «Revisa»: la exposición del primer paso pregunta «¿Cuándo se puede visitar?» con la misma barra de avance", () => {
    const porChip = pasar(enNombre("Ecos de papel"), cambiar(claseElegida("exposicion")), { tipo: "seguir" });
    expect(pasoActual(porChip)).toBe("visita");
    expect(preguntaDe("visita", porChip.r)).toBe("¿Cuándo se puede visitar?");
    expect(avance("visita")).toBe(avance("dia"));
    const porTitulo = conNombre("Exposición Ecos de papel");
    expect(faltan(porChip.r)).toEqual(faltan(porTitulo.r));
  });

  it("vuelto al nombre desde «Revisa», un chip cambia la clase: «Siguiente» pregunta lo que le falte y regresa a «Revisa»", () => {
    const revisa = pasar(conNombre("Lectura en voz alta"), contestar({ dias: { desde: "2026-10-10", hasta: null } }), cambiar({ hora: "19:00" }), contestar({ fin: "" }), contestar({ sitio: SITIO }), contestar({ costo: "gratis" }));
    expect(pasoActual(revisa)).toBe("revisa");
    let e = pasar(revisa, { tipo: "abrir", paso: "nombre" }, cambiar(claseElegida("exposicion")), { tipo: "seguir" });
    // El día del evento es el primero de visita; falta hasta cuándo.
    expect(pasoActual(e)).toBe("visita");
    expect(e.r.visita).toEqual({ desde: "2026-10-10", hasta: null });
    e = pasar(e, cambiar({ visita: { desde: "2026-10-10", hasta: "2026-10-31" } }), { tipo: "seguir" });
    expect(pasoActual(e)).toBe("revisa");
    expect(e.r).toMatchObject({ clase: "exposicion", nombre: "Lectura en voz alta", sitio: SITIO, costo: "gratis" });
  });
});

describe("cambiar la clase en «Revisa» (hoja «¿Cómo ocurre?», caso 5)", () => {
  const revisaDeEvento = () => pasar(conNombre("Lectura en voz alta"), contestar({ dias: { desde: "2026-10-10", hasta: "2026-10-12" } }), cambiar({ hora: "19:00" }), contestar({ fin: "2026-10-12T21:00" }), contestar({ sitio: SITIO }), contestar({ costo: "gratis" }));

  it("de evento a exposición: lleva a su paso del tiempo con los días de partida y conserva nombre, lugar y precio", () => {
    const e = flujo(revisaDeEvento(), contestar({ clase: "exposicion", claseFijada: true }));
    expect(e.r.visita).toEqual({ desde: "2026-10-10", hasta: "2026-10-12" });
    // Con los días ya puestos no falta nada: se queda en «Revisa».
    expect(pasoActual(e)).toBe("revisa");
    expect(e.r).toMatchObject({ nombre: "Lectura en voz alta", sitio: SITIO, costo: "gratis" });
  });

  it("de evento a taller: los días del evento son las sesiones de partida, con su misma hora", () => {
    const e = flujo(revisaDeEvento(), contestar({ clase: "taller", claseFijada: true }));
    expect(e.r.sesionesDias).toEqual(["2026-10-10", "2026-10-11", "2026-10-12"]);
    expect(e.r.sesiones).toBeNull();
    expect(pasoActual(e)).toBe("revisa");
  });

  it("de evento de un día a exposición: falta hasta cuándo, y se pregunta", () => {
    const e = pasar(conNombre("Lectura"), contestar({ dias: { desde: "2026-10-10", hasta: null } }), cambiar({ hora: "19:00" }), contestar({ fin: "" }), contestar({ sitio: SITIO }), contestar({ costo: "gratis" }), contestar({ clase: "exposicion", claseFijada: true }));
    expect(pasoActual(e)).toBe("visita");
    expect(e.r.visita).toEqual({ desde: "2026-10-10", hasta: null });
  });
});

describe("el programa de un festival (H6, caso 4)", () => {
  const acto = (clave: string, sitio = SITIO, extra: Partial<Acto> = {}): Acto => ({ clave, titulo: `Acto ${clave}`, dia: "2026-11-12", hora: "19:00", sitio, sedeLeida: "", quien: [], marcado: true, leido: true, ...extra });
  const conPrograma = () => pasar(estadoInicial(), { tipo: "seguir" }, contestar({ nombre: "Festival de Cine", clase: "festival", claseFijada: true, actos: [acto("1"), acto("2", { modo: "otro", lugarId: "", otro: { ...OTRO_VACIO, sitioTexto: "Cineteca", pinPendiente: true } }, { sedeLeida: "Cineteca" }), acto("3", SITIO, { dia: "2026-11-14", marcado: false })] }));

  it("tras leer el cartel se ve primero el programa, aunque todo esté leído", () => {
    const e = conPrograma();
    expect(pasoActual(e)).toBe("programa");
    expect(preguntaDe("programa", e.r)).toBe("El cartel trae 3 eventos");
    expect(faltaParaPublicar(e.r)).toBe("Falta completar una actividad y el precio");
  });

  it("la sede de un acto se elige en «Dónde» y vuelve al programa; la del evento no cambia", () => {
    let e = flujo(conPrograma(), { tipo: "sedeDeActo", clave: "2" });
    expect(pasoActual(e)).toBe("donde");
    expect(e.sedeDe).toBe("2");
    e = flujo(e, contestar({ sitio: { modo: "lugar", lugarId: OTRO_LUGAR, otro: OTRO_VACIO } }));
    expect(pasoActual(e)).toBe("programa");
    expect(e.sedeDe).toBeNull();
    expect(e.r.actos[1].sitio).toEqual({ modo: "lugar", lugarId: OTRO_LUGAR, otro: OTRO_VACIO });
    expect(e.r.sitio.lugarId).toBe("");
    expect(faltaParaPublicar(e.r)).toBe("Falta el precio");
  });

  it("Atrás desde «Dónde» de una sede vuelve al programa sin cambiar nada", () => {
    const e = pasar(conPrograma(), { tipo: "sedeDeActo", clave: "2" }, { tipo: "atras", desde: "donde" });
    expect(pasoActual(e)).toBe("programa");
    expect(e.sedeDe).toBeNull();
    expect(e.r.actos[1].sitio.modo).toBe("otro");
  });

  it("un festival no pregunta dónde; publica los marcados y dice su programa", () => {
    const e = pasar(conPrograma(), { tipo: "sedeDeActo", clave: "2" }, contestar({ sitio: SITIO }), { tipo: "seguir" });
    expect(pasoActual(e)).toBe("cuanto");
    const listo = flujo(e, contestar({ costo: "gratis" }));
    expect(pasoActual(listo)).toBe("revisa");
    expect(resumenPrograma(listo.r, "2026-10-07")).toBe("Programa registrado: 2 actividades");
    expect(inicioDe(listo.r)).toBe("2026-11-12T19:00");
  });

  it("sin ningún acto marcado falta una actividad", () => {
    const e = flujo(conPrograma(), cambiar({ actos: conPrograma().r.actos.map((a) => ({ ...a, marcado: false })) }));
    expect(faltaParaPublicar({ ...e.r, costo: "gratis" })).toBe("Falta una actividad");
  });
});

describe("lo que el cartel dice de cómo ocurre, como respuestas", () => {
  const VALORES = { titulo: "", inicio: "", fin: "", gratis: false, precio: "", descripcion: "", enlace: "", lugar: "", direccion: "", artistas: [] };
  const leido = (valores: Partial<typeof VALORES> & { forma?: Leido["valores"]["forma"] }, resto: Partial<Omit<Leido, "valores">> = {}): Leido => ({ ok: true, valores: { ...VALORES, ...valores }, lugarId: LUGAR, quien: [], horaLeida: false, costoLeido: false, ...resto });

  it("una exposición con inauguración y visita (H1, caso 1): los dos renglones llegan llenos y se entra en «Revisa»", () => {
    const r = respuestasDelCartel(leido({ titulo: "Ecos de papel", inicio: "2026-11-05T19:00", gratis: true, forma: { clase: "exposicion", visita: { desde: "2026-11-06", hasta: "2026-11-30" }, sesiones: [], actos: [] } }, { horaLeida: true, costoLeido: true }));
    expect(r).toMatchObject({ clase: "exposicion", claseFijada: true, visita: { desde: "2026-11-06", hasta: "2026-11-30" }, inauguracion: { dia: "2026-11-05", hora: "19:00" } });
    expect(r.dias).toBeUndefined();
    expect(pasoActual(flujo(estadoInicial(), contestar(r)))).toBe("revisa");
  });

  it("un taller con sus días y su hora", () => {
    const r = respuestasDelCartel(leido({ titulo: "Curso de cerámica", inicio: "2026-10-10T10:00", fin: "2026-10-10T12:00", forma: { clase: "taller", visita: null, sesiones: ["2026-10-10", "2026-10-17"], actos: [] } }, { horaLeida: true }));
    expect(r).toMatchObject({ clase: "taller", sesionesDias: ["2026-10-10", "2026-10-17"], hora: "10:00", fin: "12:00" });
  });

  it("dos o más actos son un festival: cada uno marcado con su sede (la del directorio si se cruzó; si no, por confirmar)", () => {
    const r = respuestasDelCartel(leido({ titulo: "Festival de Cine", lugar: "CC200", forma: { clase: null, visita: null, sesiones: [], actos: [{ titulo: "Inauguración", fecha: "2026-11-12", hora: "19:00", lugar: "CC200", lugarId: LUGAR }, { titulo: "Función", fecha: "2026-11-14", hora: "17:00", lugar: "Cineteca", lugarId: null }] } }));
    expect(r.clase).toBe("festival");
    expect(r.actos?.map((a) => [a.titulo, a.sitio.modo, a.marcado, a.leido])).toEqual([["Inauguración", "lugar", true, true], ["Función", "otro", true, true]]);
    expect(r.actos?.[1].sitio.otro.pinPendiente).toBe(true);
  });

  it("un cartel que dice que es un evento fija la clase y lee el día y la hora como siempre", () => {
    const r = respuestasDelCartel(leido({ titulo: "Taller abierto de son", inicio: "2026-11-14T20:00", forma: { clase: "puntual", visita: null, sesiones: [], actos: [] } }, { horaLeida: true }));
    expect(r).toMatchObject({ claseFijada: true, dias: { desde: "2026-11-14", hasta: null }, hora: "20:00" });
    expect(flujo(estadoInicial(), contestar(r)).r.clase).toBe("puntual");
  });
});

describe("editar con la clase", () => {
  const base = { titulo: "Ecos de papel", lugar_id: LUGAR, precio: null, descripcion: null, enlace: null, imagen: null, sitio_texto: null, sitio_direccion: null, sitio_lat: null, sitio_lng: null, sitio_reservado: false, sitio_revelar_desde: null, zona: ZONA };
  const lugares = [{ id: LUGAR, nombre: "Museo", tipo: "museo" as const, direccion: null, lat: 22.15, lng: -100.97, portada: null }];

  it("una exposición entra con su visita, su horario propio y su inauguración, ya confirmada", () => {
    const evento = { ...base, clase: "exposicion" as const, inicio: localAIso("2026-11-06T00:00", ZONA)!, fin: localAIso("2026-11-30T23:59", ZONA)! };
    const r = respuestasAlEditar({ evento, privado: null, lugares, quien: [], zona: ZONA, clase: { horario: [{ dias: [4], abre: "12:00", cierra: "20:00" }], inauguracion: { inicio: localAIso("2026-11-05T19:00", ZONA)! }, padre: null } });
    expect(r).toMatchObject({ clase: "exposicion", claseFijada: true, visita: { desde: "2026-11-06", hasta: "2026-11-30" }, horario: [{ dias: [4], abre: "12:00", cierra: "20:00" }], inauguracion: { dia: "2026-11-05", hora: "19:00" } });
    expect({ inicio: inicioDe(r), fin: finDe(r) }).toEqual({ inicio: "2026-11-06T00:00", fin: "2026-11-30T23:59" });
    expect(faltan(r)).toEqual([]);
  });

  it("un taller entra con sus sesiones sueltas; guardar sin tocar nada manda las mismas", () => {
    const sesiones = ["2026-10-10", "2026-10-17", "2026-10-24"].map((d) => ({ inicio: localAIso(`${d}T10:00`, ZONA)!, fin: localAIso(`${d}T12:00`, ZONA)! }));
    const evento = { ...base, titulo: "Taller", clase: "taller" as const, inicio: sesiones[0].inicio, fin: sesiones[2].fin };
    const r = respuestasAlEditar({ evento, privado: null, lugares, quien: [], sesiones, zona: ZONA });
    expect(r).toMatchObject({ clase: "taller", sesionesDias: ["2026-10-10", "2026-10-17", "2026-10-24"], hora: "10:00", fin: "12:00", sesiones: null });
    expect(sesionesDe(r)?.length).toBe(3);
    expect({ inicio: inicioDe(r), fin: finDe(r) }).toEqual({ inicio: "2026-10-10T10:00", fin: "2026-10-24T12:00" });
  });

  it("un festival guardado no pide programa (se edita en la ficha de cada acto) y conserva su periodo", () => {
    const evento = { ...base, titulo: "Festival", clase: "festival" as const, inicio: localAIso("2026-11-12T19:00", ZONA)!, fin: localAIso("2026-11-15T00:00", ZONA)! };
    const r = respuestasAlEditar({ evento, privado: null, lugares, quien: [], zona: ZONA, clase: { actos: 3 } });
    expect(r.programaGuardado).toBe(3);
    expect(faltan(r)).toEqual([]);
    expect(inicioDe(r)).toBe("2026-11-12T19:00");
  });

  it("un acto entra con su festival; un evento de antes (sin clase) es un evento", () => {
    const evento = { ...base, titulo: "Charla", inicio: localAIso("2026-11-13T18:00", ZONA)!, fin: null };
    expect(respuestasAlEditar({ evento, privado: null, lugares, quien: [], zona: ZONA, clase: { padre: { id: "f1", titulo: "Festival de Cine" } } })).toMatchObject({ clase: "puntual", padre: { id: "f1", titulo: "Festival de Cine" } });
  });
});
