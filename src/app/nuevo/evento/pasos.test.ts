import { describe, expect, it } from "vitest";
import type { LugarResumen } from "@/lib/lugares";
import { DURACIONES, NOMBRE_RESERVADO, OTRO_VACIO, avance, diasSugeridos, estadoInicial, etiquetaDuracion, eventoPublicado, faltaParaPublicar, faltan, finConHora, finDe, finesSugeridos, flujo, inicioDe, lugarAlLado, nombreDelSitio, pasoActual, puedeGuardarComoLugar, sitioDeCandidato, sitioDeLugar, usosDisponibles, type Accion, type Candidato, type Estado, type Respuestas, diasElegidos } from "./pasos";

const ZONA = "America/Mexico_City";
const pasar = (e: Estado, ...acciones: Accion[]) => acciones.reduce(flujo, e);
const contestar = (cambios: Partial<Respuestas>): Accion => ({ tipo: "contestar", cambios });
const LUGAR = { modo: "lugar" as const, lugarId: "0b0b0b0b-0000-4000-8000-000000000001", otro: OTRO_VACIO };

/** El camino corto del prototipo: sin cartel, un día, fin a dos horas, un lugar del directorio y gratis. */
function hastaRevisa(): Estado {
  return pasar(
    estadoInicial(),
    { tipo: "seguir" },
    { tipo: "cambiar", cambios: { nombre: "Lectura en voz alta" } },
    { tipo: "seguir" },
    contestar({ dias: { desde: "2026-10-10", hasta: null } }),
    { tipo: "cambiar", cambios: { hora: "19:00" } },
    contestar({ fin: "2026-10-10T21:00" }),
    contestar({ sitio: LUGAR }),
    contestar({ costo: "gratis" }),
  );
}

describe("qué se pregunta según lo que falta", () => {
  it("sin nada contestado, todo falta y en el orden del prototipo", () => {
    expect(faltan(estadoInicial().r)).toEqual(["nombre", "dia", "hora", "donde", "cuanto"]);
  });

  it("el camino corto pasa por cada pregunta una vez y llega a «Revisa», con la línea de avance creciendo", () => {
    let e = estadoInicial();
    const vistos = [pasoActual(e)];
    for (const a of [
      { tipo: "seguir" },
      { tipo: "cambiar", cambios: { nombre: "Lectura" } },
      { tipo: "seguir" },
      contestar({ dias: { desde: "2026-10-10", hasta: null } }),
      { tipo: "cambiar", cambios: { hora: "19:00" } },
      contestar({ fin: "" }),
      contestar({ sitio: LUGAR }),
      contestar({ costo: "cooperacion" }),
    ] as Accion[]) {
      e = flujo(e, a);
      if (vistos.at(-1) !== pasoActual(e)) vistos.push(pasoActual(e));
    }
    expect(vistos).toEqual(["inicio", "nombre", "dia", "hora", "donde", "cuanto", "revisa"]);
    expect(vistos.map(avance)).toEqual([0, 1, 2, 3, 4, 5, 6].map((n) => n / 7));
    expect(faltaParaPublicar(e.r)).toBeNull();
  });

  it("lo ya contestado no se vuelve a preguntar: con el nombre y el día puestos, «Siguiente» lleva a lo primero que falta", () => {
    const e = pasar(estadoInicial(), { tipo: "cambiar", cambios: { nombre: "Taller", dias: { desde: "2026-10-09", hasta: null } } }, { tipo: "seguir" });
    expect(pasoActual(e)).toBe("hora");
  });

  it("elegir la hora de inicio no avanza: falta el fin, y «Sin hora de fin» es una respuesta", () => {
    const e = pasar(estadoInicial(), { tipo: "seguir" }, { tipo: "cambiar", cambios: { nombre: "x" } }, { tipo: "seguir" }, contestar({ dias: { desde: "2026-10-09", hasta: null } }), { tipo: "cambiar", cambios: { hora: "20:00" } });
    expect(pasoActual(e)).toBe("hora");
    expect(faltan(e.r)).toContain("hora");
    expect(faltan(flujo(e, contestar({ fin: "" })).r)).not.toContain("hora");
  });

  it("«Tiene precio» sin número sigue faltando; con número, ya no", () => {
    const base = hastaRevisa();
    expect(faltaParaPublicar({ ...base.r, costo: "precio", precio: "" })).toBe("Falta el precio");
    expect(faltaParaPublicar({ ...base.r, costo: "precio", precio: "150" })).toBeNull();
  });

  it("el botón de «Revisa» dice todo lo que falta, sin punto", () => {
    expect(faltaParaPublicar({ ...hastaRevisa().r, dias: null, hora: null, fin: null })).toBe("Falta el día y la hora");
    expect(faltaParaPublicar(estadoInicial().r)).toBe("Falta el nombre, el día, la hora, el lugar y el precio");
  });
});

describe("Atrás y volver desde «Revisa»", () => {
  it("Atrás vuelve al paso anterior sin perder lo contestado", () => {
    const revisa = hastaRevisa();
    const atras = pasar(revisa, { tipo: "atras", desde: "revisa" }, { tipo: "atras", desde: "cuanto" }, { tipo: "atras", desde: "donde" });
    expect(pasoActual(atras)).toBe("hora");
    expect(atras.direccion).toBe("vuelve");
    expect(atras.r).toEqual(revisa.r);
  });

  it("en el primer paso no hay Atrás, y un Atrás que llega tarde (la hoja «¿Dónde es?» cierra tras contestar) no hace nada", () => {
    expect(flujo(estadoInicial(), { tipo: "atras", desde: "inicio" }).pila).toEqual(["inicio"]);
    const enDonde = pasar(estadoInicial(), { tipo: "cambiar", cambios: { nombre: "x", dias: { desde: "2026-10-09", hasta: null } } }, { tipo: "cambiar", cambios: { hora: "19:00", fin: "" } }, { tipo: "seguir" });
    expect(pasoActual(enDonde)).toBe("donde");
    const tras = pasar(enDonde, contestar({ sitio: LUGAR }), { tipo: "atras", desde: "donde" });
    expect(pasoActual(tras)).toBe("cuanto");
  });

  it("tocar un renglón abre solo su pregunta y, al contestarla, vuelve a «Revisa» con la transición de vuelta", () => {
    const e = pasar(hastaRevisa(), { tipo: "abrir", paso: "cuanto" });
    expect(pasoActual(e)).toBe("cuanto");
    expect(e.direccion).toBe("entra");
    const vuelta = flujo(e, contestar({ costo: "precio", precio: "150" }));
    expect(pasoActual(vuelta)).toBe("revisa");
    expect(vuelta.direccion).toBe("vuelve");
    expect(vuelta.pila).toEqual(hastaRevisa().pila);
  });

  it("cambiar «Cuándo» es elegir el día y después la hora: el día nuevo vuelve a preguntar la hora", () => {
    const dia = pasar(hastaRevisa(), { tipo: "abrir", paso: "dia" }, contestar({ dias: { desde: "2026-10-17", hasta: "2026-10-18" } }));
    expect(pasoActual(dia)).toBe("hora");
    expect(dia.r.hora).toBeNull();
    expect(dia.r.fin).toBeNull();
    const vuelta = pasar(dia, { tipo: "cambiar", cambios: { hora: "17:00" } }, contestar({ fin: "2026-10-18T20:00" }));
    expect(pasoActual(vuelta)).toBe("revisa");
    // La hora ya estaba en el camino de ida: volver a preguntarla no recorta lo andado, y Atrás desde «Revisa» sigue yendo a «¿Cuánto cuesta?».
    expect(vuelta.pila).toEqual(hastaRevisa().pila);
    expect(inicioDe(vuelta.r)).toBe("2026-10-17T17:00");
  });

  it("Atrás desde una pregunta abierta en «Revisa» regresa a «Revisa» sin cambiar nada", () => {
    const revisa = hastaRevisa();
    const e = pasar(revisa, { tipo: "abrir", paso: "donde" }, { tipo: "atras", desde: "donde" });
    expect(pasoActual(e)).toBe("revisa");
    expect(e.r).toEqual(revisa.r);
  });

  it("lo opcional (artistas, descripción, enlace) se abre desde «Revisa» y «Listo» vuelve", () => {
    const e = pasar(hastaRevisa(), { tipo: "abrir", paso: "mas" }, { tipo: "cambiar", cambios: { enlace: "https://ejemplo.org" } }, { tipo: "seguir" });
    expect(pasoActual(e)).toBe("revisa");
    expect(e.r.enlace).toBe("https://ejemplo.org");
  });
});

describe("los días que se sugieren, en la zona del evento", () => {
  it("lunes: el viernes y el sábado de esta semana", () => {
    expect(diasSugeridos("2026-10-05")).toEqual([
      { etiqueta: "Este viernes", dia: "2026-10-09" },
      { etiqueta: "Este sábado", dia: "2026-10-10" },
    ]);
  });
  it("viernes y sábado cuentan el mismo día; el domingo, los de la semana que sigue", () => {
    expect(diasSugeridos("2026-10-09").map((d) => d.dia)).toEqual(["2026-10-09", "2026-10-10"]);
    expect(diasSugeridos("2026-10-10").map((d) => d.dia)).toEqual(["2026-10-16", "2026-10-10"]);
    expect(diasSugeridos("2026-10-11").map((d) => d.dia)).toEqual(["2026-10-16", "2026-10-17"]);
  });
  it("cruzan el mes y el año", () => {
    expect(diasSugeridos("2026-12-29").map((d) => d.dia)).toEqual(["2027-01-01", "2027-01-02"]);
  });
});

describe("la duración: el fin a una, dos y tres horas", () => {
  const conHora = (hora: string, hasta: string | null = null): Respuestas => ({ ...estadoInicial().r, dias: { desde: "2026-10-09", hasta }, hora });

  it("19:00 termina a las 20:00, 21:00 o 22:00 del mismo día", () => {
    expect(finesSugeridos(conHora("19:00"), ZONA)).toEqual(["2026-10-09T20:00", "2026-10-09T21:00", "2026-10-09T22:00"]);
  });
  it("lo que pasa de la medianoche cae en el día siguiente (sumarHoras de lib/fechas)", () => {
    expect(finesSugeridos(conHora("22:30"), ZONA)).toEqual(["2026-10-09T23:30", "2026-10-10T00:30", "2026-10-10T01:30"]);
  });
  it("en un evento de varios días, el fin es el último día a esa hora", () => {
    expect(finesSugeridos(conHora("19:00", "2026-10-11"), ZONA)[1]).toBe("2026-10-11T21:00");
  });
  it("en otra zona, con su cambio de horario, se suma en esa zona", () => {
    // En Madrid, el 29 de marzo de 2026 a las 2:00 se adelanta el reloj a las 3:00: una hora después de la 1:30 son las 3:30.
    expect(finesSugeridos({ ...conHora("01:30"), dias: { desde: "2026-03-29", hasta: null } }, "Europe/Madrid")[0]).toBe("2026-03-29T03:30");
  });
  it("cada fin sugerido es una duración de DURACIONES, en su orden (1, 2 y 3 horas), con su rótulo", () => {
    expect([...DURACIONES]).toEqual([1, 2, 3]);
    expect(DURACIONES.map(etiquetaDuracion)).toEqual(["1 hora", "2 horas", "3 horas"]);
    // 22:00 + 3 h = 01:00 del día siguiente.
    expect(finesSugeridos(conHora("22:00"), ZONA)[DURACIONES.indexOf(3)]).toBe("2026-10-10T01:00");
    // 19:00 + 1 h = 20:00 del mismo día.
    expect(finesSugeridos(conHora("19:00"), ZONA)[DURACIONES.indexOf(1)]).toBe("2026-10-09T20:00");
  });
  it("sin día o sin hora no hay sugerencias", () => {
    expect(finesSugeridos(estadoInicial().r, ZONA)).toEqual([]);
  });

  it("«Otra hora» y «Sin hora de fin» siguen la regla de lib/cuandoEvento (conHoraFin)", () => {
    expect(finConHora(conHora("19:00"), "22:15")).toBe("2026-10-09T22:15");
    expect(finConHora(conHora("19:00"), "")).toBe("");
    // Varios días sin hora de fin: acaba con su último día.
    expect(finConHora(conHora("19:00", "2026-10-11"), "")).toBe("2026-10-11T23:59");
    expect(finConHora(conHora("19:00", "2026-10-11"), "18:00")).toBe("2026-10-11T18:00");
    // Un fin de un día que no es posterior al inicio es la madrugada del día siguiente (ya no se rechaza en silencio).
    expect(finConHora(conHora("19:00"), "18:00")).toBe("2026-10-10T18:00");
    expect(finConHora(conHora("22:00"), "01:00")).toBe("2026-10-10T01:00");
    // En el cambio de mes cae en el día 1.
    expect(finConHora({ ...conHora("22:00"), dias: { desde: "2026-10-31", hasta: null } }, "01:00")).toBe("2026-11-01T01:00");
  });
});

/** Hasta «¿Dónde es?»: sin cartel, con nombre, día y hora ya contestados. */
function enDonde(): Estado {
  return pasar(estadoInicial(), { tipo: "cambiar", cambios: { nombre: "Noche de son", dias: { desde: "2026-10-09", hasta: null } } }, { tipo: "cambiar", cambios: { hora: "19:00", fin: "" } }, { tipo: "seguir" });
}
const JARDIN: Candidato = { nombre: "Jardín de San Juan de Dios", direccion: "Calle Madero 1, Centro Histórico", punto: { lat: 22.1511, lng: -100.9772 }, ciudad: "San Luis Potosí", categorias: ["park"], origen: "busqueda" };
const SOLO_DIRECCION: Candidato = { nombre: "", direccion: "Galeana 423, Centro", punto: { lat: 22.15, lng: -100.98 }, ciudad: "San Luis Potosí", categorias: [], origen: "busqueda" };
const BAR: Candidato = { nombre: "La Cantina", direccion: "Calle Zaragoza 12", punto: { lat: 22.152, lng: -100.979 }, ciudad: "San Luis Potosí", categorias: ["bar"], origen: "busqueda" };
const LUGAR_DIR: LugarResumen = { id: "0b0b0b0b-0000-4000-8000-000000000001", nombre: "Teatro de la Paz", tipo: "foro", direccion: "Villerías 205", lat: 22.15, lng: -100.97, portada: null };

describe("«Dónde» en tres pasos: buscar, confirmar en el mapa y qué hacer con el sitio (OL-301)", () => {
  it("un lugar del directorio contesta «¿Dónde es?» y salta el mapa y «No está en el directorio»: sigue «¿Cuánto cuesta?»", () => {
    const e = flujo(enDonde(), contestar({ sitio: sitioDeLugar(LUGAR_DIR, OTRO_VACIO) }));
    expect(pasoActual(e)).toBe("cuanto");
    expect(e.pila).toEqual(["inicio", "donde", "cuanto"]);
    expect(e.r.sitio).toEqual({ modo: "lugar", lugarId: LUGAR_DIR.id, otro: OTRO_VACIO });
  });

  it("un resultado del mapa o «Estoy aquí» van a «¿Es aquí?»; «Sí, es aquí» a «No está en el directorio»; elegir qué hacer sigue con «¿Cuánto cuesta?»", () => {
    const mapa = flujo(enDonde(), { tipo: "elegir", candidato: JARDIN });
    expect(pasoActual(mapa)).toBe("mapa");
    expect(mapa.candidato).toEqual(JARDIN);
    // Mientras no se resuelve, el sitio sigue sin respuesta: nada se publica con un pin sin confirmar.
    expect(faltan(mapa.r)).toContain("donde");
    const uso = flujo(mapa, { tipo: "confirmar", candidato: JARDIN });
    expect(pasoActual(uso)).toBe("uso");
    expect(faltan(uso.r)).toContain("donde");
    const cuanto = flujo(uso, { tipo: "usar", uso: "evento" });
    expect(pasoActual(cuanto)).toBe("cuanto");
    expect(faltan(cuanto.r)).not.toContain("donde");
    expect(cuanto.pila).toEqual(["inicio", "donde", "mapa", "uso", "cuanto"]);
    expect(cuanto.direccion).toBe("entra");
  });

  it("«Buscar otro» (Atrás desde el mapa) vuelve a «¿Dónde es?» sin perder lo contestado, y Atrás desde «No está en el directorio» vuelve al mapa con el pin confirmado", () => {
    const mapa = flujo(enDonde(), { tipo: "elegir", candidato: JARDIN });
    const otro = flujo(mapa, { tipo: "atras", desde: "mapa" });
    expect(pasoActual(otro)).toBe("donde");
    expect(otro.r.nombre).toBe("Noche de son");
    const movido = { ...JARDIN, punto: { lat: 22.152, lng: -100.978 } };
    const uso = pasar(mapa, { tipo: "confirmar", candidato: movido });
    const atras = flujo(uso, { tipo: "atras", desde: "uso" });
    expect(pasoActual(atras)).toBe("mapa");
    expect(atras.candidato).toEqual(movido);
  });

  it("«Usarlo solo en este evento» deja el sitio como «otro» con su nombre, su dirección y su punto", () => {
    const otro = sitioDeCandidato(JARDIN, "evento", OTRO_VACIO);
    expect(otro).toMatchObject({ modo: "otro", lugarId: "", otro: { reservado: false, sitioTexto: "Jardín de San Juan de Dios", direccion: "Calle Madero 1, Centro Histórico", sitioPunto: JARDIN.punto, ciudad: "San Luis Potosí", pinPendiente: false, direccionPrivada: "", privadoPunto: null } });
  });

  it("«Guardarlo como lugar» creado: el sitio pasa a ser ese lugar (modo «lugar» con su id, sin sitio «otro») y sigue «¿Cuánto cuesta?»", () => {
    const creado: LugarResumen = { id: "0b0b0b0b-0000-4000-8000-0000000000aa", nombre: JARDIN.nombre, tipo: "plaza", direccion: JARDIN.direccion, lat: JARDIN.punto.lat, lng: JARDIN.punto.lng, portada: null };
    const uso = pasar(enDonde(), { tipo: "elegir", candidato: JARDIN }, { tipo: "confirmar", candidato: JARDIN });
    expect(faltan(uso.r)).toContain("donde");
    const e = flujo(uso, contestar({ sitio: sitioDeLugar(creado, uso.r.sitio.otro) }));
    expect(pasoActual(e)).toBe("cuanto");
    expect(e.r.sitio).toEqual({ modo: "lugar", lugarId: creado.id, otro: OTRO_VACIO });
    expect(faltan(e.r)).not.toContain("donde");
    expect(nombreDelSitio(e.r.sitio, creado)).toBe("Jardín de San Juan de Dios");
  });

  it("un sitio reservado guarda la dirección y el punto como privados y deja los públicos vacíos; conserva «cuántas horas antes» e indicaciones", () => {
    const base = { ...OTRO_VACIO, revelarHoras: 6, indicaciones: "Toca el timbre" };
    const r = sitioDeCandidato(JARDIN, "reservado", base);
    expect(r).toMatchObject({ modo: "reservado", otro: { reservado: true, sitioTexto: "Jardín de San Juan de Dios", direccion: "", sitioPunto: null, direccionPrivada: "Calle Madero 1, Centro Histórico", privadoPunto: JARDIN.punto, revelarHoras: 6, indicaciones: "Toca el timbre" } });
    expect(faltan({ ...estadoInicial().r, nombre: "x", dias: { desde: "2026-10-09", hasta: null }, hora: "19:00", fin: "", sitio: r, costo: "gratis" })).toEqual([]);
  });

  it("una dirección sin nombre: el título es la dirección, y reservada sale con «Sitio reservado», nunca con la dirección como nombre público", () => {
    const publico = sitioDeCandidato(SOLO_DIRECCION, "evento", OTRO_VACIO);
    expect(publico.otro.sitioTexto).toBe("Galeana 423, Centro");
    const reservado = sitioDeCandidato(SOLO_DIRECCION, "reservado", OTRO_VACIO);
    expect(reservado.otro.sitioTexto).toBe(NOMBRE_RESERVADO);
    expect(reservado.otro.direccionPrivada).toBe("Galeana 423, Centro");
    expect(nombreDelSitio(reservado, undefined)).toBe(NOMBRE_RESERVADO);
  });

  it("un negocio (bar, café, restaurante) no ofrece «Guardarlo como lugar»; tampoco una dirección sin nombre", () => {
    expect(usosDisponibles(JARDIN)).toEqual(["evento", "lugar", "reservado"]);
    expect(usosDisponibles(BAR)).toEqual(["evento", "reservado"]);
    expect(puedeGuardarComoLugar(BAR)).toBe(false);
    expect(usosDisponibles(SOLO_DIRECCION)).toEqual(["evento", "reservado"]);
    expect(usosDisponibles({ ...JARDIN, nombre: "Café del Jardín", categorias: ["cafe"] })).toEqual(["evento", "reservado"]);
    expect(usosDisponibles({ ...JARDIN, nombre: "Museo Federico Silva", categorias: ["museum"] })).toEqual(["evento", "lugar", "reservado"]);
  });

  it("un lugar privado del directorio va como sitio reservado, nunca por su id", () => {
    const s = sitioDeLugar({ ...LUGAR_DIR, privado: true }, OTRO_VACIO);
    expect(s).toMatchObject({ modo: "reservado", lugarId: "", otro: { reservado: true, sitioTexto: "Teatro de la Paz", direccionPrivada: "Villerías 205", privadoPunto: { lat: 22.15, lng: -100.97 } } });
  });

  it("un lugar del directorio a menos de 50 m del pin se ofrece como el sitio; a más, no", () => {
    // 0.0004° de latitud son unos 44 m; 0.001° son unos 111 m.
    expect(lugarAlLado([LUGAR_DIR], { lat: 22.1504, lng: -100.97 })).toEqual({ lugar: LUGAR_DIR, metros: 44 });
    expect(lugarAlLado([LUGAR_DIR], { lat: 22.151, lng: -100.97 })).toBeNull();
    const otro = { ...LUGAR_DIR, id: "otro", lat: 22.15001 };
    expect(lugarAlLado([LUGAR_DIR, otro], { lat: 22.1504, lng: -100.97 })?.lugar.id).toBe("otro");
  });

  it("la línea de avance no cuenta el mapa ni «No está en el directorio» como pasos aparte", () => {
    expect(avance("mapa")).toBe(avance("donde"));
    expect(avance("uso")).toBe(avance("donde"));
  });

  it("cambiar el sitio desde «Revisa» y elegir otro del mapa regresa a «Revisa» con el sitio nuevo", () => {
    const revisa = hastaRevisa();
    const e = pasar(revisa, { tipo: "abrir", paso: "donde" }, { tipo: "elegir", candidato: JARDIN }, { tipo: "confirmar", candidato: JARDIN }, { tipo: "usar", uso: "reservado" });
    expect(pasoActual(e)).toBe("revisa");
    expect(e.direccion).toBe("vuelve");
    expect(e.r.sitio.modo).toBe("reservado");
    expect(nombreDelSitio(e.r.sitio, undefined)).toBe("Jardín de San Juan de Dios");
  });
});

describe("el final: «Publicado» (OL-304)", () => {
  it("al publicar se llega a «Publicado», con la línea de avance completa y lo contestado intacto (la tarjeta lo usa)", () => {
    const revisa = hastaRevisa();
    const e = flujo(revisa, { tipo: "publicado" });
    expect(pasoActual(e)).toBe("publicado");
    expect(avance("publicado")).toBe(1);
    expect(e.direccion).toBe("entra");
    expect(e.r).toEqual(revisa.r);
  });

  it("no hay vuelta: la pila queda en el final y Atrás no hace nada", () => {
    const e = flujo(hastaRevisa(), { tipo: "publicado" });
    expect(e.pila).toEqual(["publicado"]);
    expect(flujo(e, { tipo: "atras", desde: "publicado" })).toBe(e);
  });

  it("antes de publicar, ningún paso llega a 1: el avance completo es solo del final", () => {
    for (const paso of ["inicio", "nombre", "dia", "hora", "donde", "mapa", "uso", "cuanto", "revisa", "mas"] as const) expect(avance(paso), paso).toBeLessThan(1);
  });

  describe("el evento como quedó (la tarjeta)", () => {
    const CREADO = { id: "0e0e0e0e-0000-4000-8000-000000000001", slug: "lectura-en-voz-alta-ab12", creadoEn: "2026-10-07T16:00:00.000Z" };
    const teatro = { nombre: "Teatro de la Paz", portada: "https://x.test/teatro.jpg" };

    it("en un lugar del directorio: su nombre y su portada, la hora en la zona del sitio y sin precio si es gratis", () => {
      const e = eventoPublicado(hastaRevisa().r, CREADO, { lugar: teatro, zona: ZONA, imagen: null });
      expect(e).toMatchObject({ id: CREADO.id, slug: CREADO.slug, titulo: "Lectura en voz alta", inicio: "2026-10-11T01:00:00.000Z", fin: "2026-10-11T03:00:00.000Z", zona: ZONA, imagen: null, precio: null, lugar_id: LUGAR.lugarId, sitio_texto: null, sitio_reservado: false, lugar: teatro, van: null });
    });

    it("el precio sale como lo guarda el servidor: con signo, o «Cooperación solidaria»", () => {
      const base = hastaRevisa().r;
      expect(eventoPublicado({ ...base, costo: "precio", precio: "150" }, CREADO, { lugar: teatro, zona: ZONA, imagen: null }).precio).toBe("$150");
      expect(eventoPublicado({ ...base, costo: "cooperacion" }, CREADO, { lugar: teatro, zona: ZONA, imagen: null }).precio).toBe("Cooperación solidaria");
    });

    it("con cartel lleva la imagen; sin hora de fin, no hay fin; el título se recorta como lo recorta el servidor", () => {
      const base = hastaRevisa().r;
      const e = eventoPublicado({ ...base, fin: "", nombre: `  ${"x".repeat(130)}  ` }, CREADO, { lugar: teatro, zona: ZONA, imagen: "https://x.test/cartel.jpg" });
      expect(e.imagen).toBe("https://x.test/cartel.jpg");
      expect(e.fin).toBeNull();
      expect(e.titulo).toBe("x".repeat(120));
    });

    it("en otro sitio: su nombre y su dirección públicos y ningún lugar; reservado: el nombre sin la dirección", () => {
      const otro = { ...OTRO_VACIO, sitioTexto: "Jardín de San Juan de Dios", direccion: "Calle Madero 1", sitioPunto: { lat: 22.15, lng: -100.97 } };
      const base = hastaRevisa().r;
      const publico = eventoPublicado({ ...base, sitio: { modo: "otro", lugarId: "", otro } }, CREADO, { lugar: undefined, zona: ZONA, imagen: null });
      expect(publico).toMatchObject({ lugar_id: null, lugar: null, sitio_texto: "Jardín de San Juan de Dios", sitio_direccion: "Calle Madero 1", sitio_reservado: false });
      const reservado = eventoPublicado({ ...base, sitio: { modo: "reservado", lugarId: "", otro: { ...otro, reservado: true, direccionPrivada: "Calle Secreta 9" } } }, CREADO, { lugar: undefined, zona: ZONA, imagen: null });
      expect(reservado).toMatchObject({ lugar: null, sitio_texto: "Jardín de San Juan de Dios", sitio_direccion: null, sitio_reservado: true });
      expect(JSON.stringify(reservado)).not.toContain("Calle Secreta");
    });
  });
});


describe("diasElegidos: lo que devuelve la hoja del calendario como respuesta", () => {
  it("un solo día («Listo, un solo día» devuelve el mismo día como último) se guarda sin hasta", () => {
    expect(diasElegidos("2026-10-10", "2026-10-10")).toEqual({ desde: "2026-10-10", hasta: null });
    expect(diasElegidos("2026-10-10", null)).toEqual({ desde: "2026-10-10", hasta: null });
  });
  it("un rango de días conserva el último", () => {
    expect(diasElegidos("2026-10-10", "2026-10-12")).toEqual({ desde: "2026-10-10", hasta: "2026-10-12" });
  });
  it("un «último» anterior al primero no es un rango", () => {
    expect(diasElegidos("2026-10-10", "2026-10-08")).toEqual({ desde: "2026-10-10", hasta: null });
  });
});


describe("horario por día (OL-311): sesiones, y de ahí el inicio y el fin del evento", () => {
  /** Un festival del 9 al 11 de octubre, de 8:00 a 9:00 p.m., con la casilla marcada (sin sesiones). */
  const festival = () =>
    pasar(estadoInicial(), { tipo: "seguir" }, { tipo: "cambiar", cambios: { nombre: "Festival" } }, { tipo: "seguir" }, contestar({ dias: { desde: "2026-10-09", hasta: "2026-10-11" } }), { tipo: "cambiar", cambios: { hora: "20:00" } }, contestar({ fin: "2026-10-11T21:00" }));
  const sesiones = [
    { dia: "2026-10-09", hora: "20:00", fin: "21:00" },
    { dia: "2026-10-10", hora: "18:00", fin: "21:00" },
    { dia: "2026-10-11", hora: "19:00", fin: "" },
  ];

  it("sin sesiones (la casilla marcada) el inicio y el fin son los de siempre", () => {
    const r = festival().r;
    expect(r.sesiones).toBeNull();
    expect({ inicio: inicioDe(r), fin: finDe(r) }).toEqual({ inicio: "2026-10-09T20:00", fin: "2026-10-11T21:00" });
  });

  it("con sesiones salen de la primera y la última: el inicio del primer día y el fin del último (sin hora de fin, el fin de ese día)", () => {
    const r = { ...festival().r, sesiones };
    expect({ inicio: inicioDe(r), fin: finDe(r) }).toEqual({ inicio: "2026-10-09T20:00", fin: "2026-10-11T23:59" });
    const conFin = { ...r, sesiones: sesiones.map((h) => (h.dia === "2026-10-11" ? { ...h, fin: "22:30" } : h)) };
    expect(finDe(conFin)).toBe("2026-10-11T22:30");
    expect(inicioDe({ ...r, sesiones: [{ ...sesiones[0], hora: "12:00" }, ...sesiones.slice(1)] })).toBe("2026-10-09T12:00");
  });

  it("guardar el horario por día no pide nada más: la hora común sigue contestada y no se vuelve a preguntar", () => {
    const e = flujo(festival(), { tipo: "cambiar", cambios: { sesiones } });
    expect(faltan(e.r)).toEqual(["donde", "cuanto"]);
    expect(e.r.hora).toBe("20:00");
    expect(e.r.fin).toBe("2026-10-11T21:00");
  });

  it("elegir otros días borra el horario por día, con la hora y el fin (eran de otros días)", () => {
    const e = pasar(festival(), { tipo: "cambiar", cambios: { sesiones } }, contestar({ dias: { desde: "2026-10-16", hasta: "2026-10-18" } }));
    expect(e.r.sesiones).toBeNull();
    expect(e.r.hora).toBeNull();
    expect(e.r.fin).toBeNull();
  });

  it("volver a marcar la casilla (sesiones nulas) conserva el horario común", () => {
    const e = pasar(festival(), { tipo: "cambiar", cambios: { sesiones } }, { tipo: "cambiar", cambios: { sesiones: null } });
    expect(e.r.sesiones).toBeNull();
    expect({ inicio: inicioDe(e.r), fin: finDe(e.r) }).toEqual({ inicio: "2026-10-09T20:00", fin: "2026-10-11T21:00" });
  });

  it("el evento publicado (la tarjeta) toma su inicio y su fin de las sesiones", () => {
    const r = { ...festival().r, sesiones: [sesiones[0], sesiones[1], { ...sesiones[2], fin: "22:30" }], sitio: LUGAR, costo: "gratis" as const };
    const e = eventoPublicado(r, { id: "0e0e0e0e-0000-4000-8000-000000000001", slug: null, creadoEn: "2026-10-07T16:00:00.000Z" }, { lugar: undefined, zona: ZONA, imagen: null });
    expect(e.inicio).toBe("2026-10-10T02:00:00.000Z");
    expect(e.fin).toBe("2026-10-12T04:30:00.000Z");
  });
});
