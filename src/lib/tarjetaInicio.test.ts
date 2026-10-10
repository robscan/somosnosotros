import { describe, expect, it } from "vitest";
import type { EventoAgenda } from "./agenda";
import { cejaDeTarjeta, chipDeTarjeta, cortarEnPalabra, cuandoEnInicio, nombreDeTarjeta, selloDeFecha, selloFechaDe, tarjetaDeInicio } from "./tarjetaInicio";

// Sábado 10 de octubre de 2026, 11:49 en San Luis Potosí: la hora del prototipo firmado (bitácora 398).
const AHORA = new Date("2026-10-10T17:49:00Z");
const ZONA = "America/Mexico_City";
/** Un instante en la hora de la ciudad (UTC−6, sin horario de verano). */
const local = (dia: string, hora = "00:00") => new Date(`${dia}T${hora}:00-06:00`).toISOString();
/** El último minuto de un día de visita, como guarda la base el cierre de una exposición. */
const cierre = (dia: string) => local(dia, "23:59");

const evento = (cambios: Partial<EventoAgenda> = {}): EventoAgenda => ({
  id: "e1", titulo: "Presentación de Kopk Poj: el aliento de la montaña", inicio: local("2026-10-10", "13:00"), fin: null, imagen: "/kopk.jpg", precio: null, lugar_id: "l1", sitio_texto: null,
  sitio_reservado: false, zona: ZONA, lugar: { nombre: "CEART", portada: null }, creado_en: "2026-10-01T00:00:00Z", van: 1, ...cambios,
});

describe("selloDeFecha (E8 firmado): mes arriba, día abajo, en la zona del evento", () => {
  it("un día: «oct» / «11»", () => {
    expect(selloDeFecha({ inicio: local("2026-10-11", "19:00"), fin: null, zona: ZONA }, false, AHORA)).toEqual({ mes: "oct", dia: "11", flecha: null, texto: "11 de octubre" });
  });
  it("lo que no es un rango dice el día de su inicio aunque termine otro día", () => {
    expect(selloDeFecha({ inicio: local("2026-10-10", "22:00"), fin: local("2026-10-11", "02:00"), zona: ZONA }, false, AHORA)).toMatchObject({ mes: "oct", dia: "10", flecha: null });
  });
  it("el día es el de su zona: el mismo instante es otro día en otra ciudad", () => {
    const instante = "2026-10-10T22:30:00Z"; // 16:30 en San Luis Potosí; 00:30 del 11 en Madrid
    expect(selloDeFecha({ inicio: instante, fin: null, zona: ZONA }, false, AHORA).dia).toBe("10");
    expect(selloDeFecha({ inicio: instante, fin: null, zona: "Europe/Madrid" }, false, AHORA).dia).toBe("11");
  });
  it("un rango del mismo mes: «oct» / «16–18»; el fin a la medianoche es el final del día anterior", () => {
    expect(selloDeFecha({ inicio: local("2026-10-16", "19:00"), fin: local("2026-10-19"), zona: ZONA }, true, AHORA)).toEqual({ mes: "oct", dia: "16–18", flecha: null, texto: "del 16 al 18 de octubre" });
    expect(selloDeFecha({ inicio: local("2026-10-01"), fin: cierre("2026-10-31"), zona: ZONA }, true, AHORA)).toMatchObject({ mes: "oct", dia: "1–31" });
  });
  it("un rango entre meses que ya empezó dice hasta cuándo, con el mes del cierre: «oct» / «→ 28»", () => {
    // Ciclo Fellini: del 29 de sep a la medianoche del 29 de oct, es decir, hasta el 28.
    expect(selloDeFecha({ inicio: local("2026-09-29", "18:00"), fin: local("2026-10-29"), zona: ZONA }, true, AHORA)).toEqual({ mes: "oct", dia: "28", flecha: "antes", texto: "hasta el 28 de octubre" });
    expect(selloDeFecha({ inicio: local("2026-09-20"), fin: cierre("2026-11-08"), zona: ZONA }, true, AHORA)).toMatchObject({ mes: "nov", dia: "8", flecha: "antes" });
  });
  it("un rango entre meses que no ha empezado dice desde cuándo: «oct» / «12 →»", () => {
    expect(selloDeFecha({ inicio: local("2026-10-12"), fin: cierre("2026-11-15"), zona: ZONA }, true, AHORA)).toEqual({ mes: "oct", dia: "12", flecha: "despues", texto: "desde el 12 de octubre" });
  });
  it("«ya empezó» es por día: el que empieza hoy más tarde ya dice hasta cuándo", () => {
    expect(selloDeFecha({ inicio: local("2026-10-10", "19:00"), fin: local("2026-11-02"), zona: ZONA }, true, AHORA)).toMatchObject({ mes: "nov", dia: "1", flecha: "antes" });
  });
  it("entre años, el mes del cierre; sin fin, un solo día", () => {
    const enero = new Date("2027-01-02T18:00:00Z");
    expect(selloDeFecha({ inicio: local("2026-12-20"), fin: cierre("2027-01-10"), zona: ZONA }, true, enero)).toMatchObject({ mes: "ene", dia: "10", flecha: "antes" });
    expect(selloDeFecha({ inicio: local("2026-10-20"), fin: null, zona: ZONA }, true, AHORA)).toMatchObject({ mes: "oct", dia: "20", flecha: null });
  });
});

describe("cuandoEnInicio: la línea violeta bajo el lugar", () => {
  it("un evento dice su día y su hora; «hoy» va en la línea, no en un chip", () => {
    expect(cuandoEnInicio(evento(), true, AHORA)).toBe("hoy · 13:00");
    expect(cuandoEnInicio(evento({ inicio: local("2026-10-11", "19:00") }), false, AHORA)).toBe("mañana · 19:00");
  });
  it("un festival que ya empezó dice cuándo termina, como las exposiciones: «Hasta el sáb 24 de oct»", () => {
    const cinema = evento({ clase: "festival", inicio: local("2026-09-29", "18:00"), fin: local("2026-10-24", "23:00") });
    expect(cuandoEnInicio(cinema, false, AHORA)).toBe("Hasta el sáb 24 de oct");
    const fellini = evento({ clase: "festival", inicio: local("2026-09-29", "18:00"), fin: local("2026-10-29") });
    expect(cuandoEnInicio(fellini, false, AHORA)).toBe("Hasta el mié 28 de oct");
  });
  it("el festival que no ha empezado conserva su rango", () => {
    expect(cuandoEnInicio(evento({ clase: "festival", inicio: local("2026-10-16", "19:00"), fin: local("2026-10-19") }), false, AHORA)).toBe("Del 16 al 18 de oct");
  });
  it("el festival que empieza hoy ya dice hasta cuándo, con «hoy» delante", () => {
    expect(cuandoEnInicio(evento({ clase: "festival", inicio: local("2026-10-10", "19:00"), fin: local("2026-10-13") }), true, AHORA)).toBe("hoy · hasta el lun 12 de oct");
  });
  it("una exposición sigue como siempre: hasta cuándo, o sus días antes de abrir", () => {
    expect(cuandoEnInicio(evento({ clase: "exposicion", inicio: local("2026-09-20"), fin: cierre("2026-11-08") }), false, AHORA)).toBe("Hasta el dom 8 de nov");
    expect(cuandoEnInicio(evento({ clase: "exposicion", inicio: local("2026-10-12"), fin: cierre("2026-11-15") }), false, AHORA)).toBe("Del 12 de oct al 15 de nov");
  });
});

describe("tarjetaDeInicio", () => {
  it("la tarjeta con su clase, su línea de cuándo y su sello", () => {
    const t = tarjetaDeInicio(evento({ clase: "festival", titulo: "CINEMA: XV Festival de Cine México-Alemania", inicio: local("2026-09-29", "18:00"), fin: local("2026-10-24", "23:00") }), AHORA);
    expect(t).toMatchObject({ clase: "Festival", corto: "CINEMA", detalle: "Hasta el sáb 24 de oct", sinVoy: true, selloFecha: { mes: "oct", dia: "24", flecha: "antes" } });
    expect(tarjetaDeInicio(evento(), AHORA)).toMatchObject({ clase: "Evento", detalle: "hoy · 13:00", hoy: true, selloFecha: { mes: "oct", dia: "10", flecha: null } });
  });
});

describe("selloFechaDe: el sello de una tarjeta guardada en el teléfono", () => {
  const base = { id: "e1", href: "/eventos/e1", foto: null, titulo: "Ecos de papel", detalle: "Hasta el dom 8 de nov", van: 0 };
  it("usa el que trae; si no, lo calcula con su clase; sin fechas, ninguno", () => {
    const propio = { mes: "oct", dia: "9", flecha: null, texto: "9 de octubre" } as const;
    expect(selloFechaDe({ ...base, selloFecha: propio }, AHORA)).toBe(propio);
    expect(selloFechaDe({ ...base, clase: "Exposición", inicio: local("2026-09-20"), fin: cierre("2026-11-08"), zona: ZONA }, AHORA)).toMatchObject({ mes: "nov", dia: "8", flecha: "antes" });
    expect(selloFechaDe({ ...base, clase: "Evento", inicio: local("2026-09-20"), fin: cierre("2026-11-08"), zona: ZONA }, AHORA)).toMatchObject({ mes: "sep", dia: "20", flecha: null });
    expect(selloFechaDe(base, AHORA)).toBeNull();
  });
});

describe("cejaDeTarjeta (E3 + E3b): la clase solo si no es un evento, con su sesión al lado", () => {
  it("un evento no lleva ceja; el día de uno de varios, sí", () => {
    expect(cejaDeTarjeta({ clase: "Evento" })).toEqual([]);
    expect(cejaDeTarjeta({})).toEqual([]);
    expect(cejaDeTarjeta({ clase: "Evento", parte: "Día 2 de 3" })).toEqual(["Día 2 de 3"]);
  });
  it("taller con su sesión, expo en corto y festival", () => {
    expect(cejaDeTarjeta({ clase: "Taller", parte: "Sesión 1 de 4" })).toEqual(["Taller", "Sesión 1 de 4"]);
    expect(cejaDeTarjeta({ clase: "Exposición" })).toEqual(["Expo"]);
    expect(cejaDeTarjeta({ clase: "Festival" })).toEqual(["Festival"]);
  });
});

describe("chipDeTarjeta: un solo chip sobre el cartel", () => {
  it("«Te interesa» gana a cuántos van", () => {
    expect(chipDeTarjeta({ van: 3 }, "me_interesa")).toEqual({ texto: "Te interesa", tuyo: true });
  });
  it("si no, cuántos van; también en lo tuyo, porque «Vas» no se dice", () => {
    expect(chipDeTarjeta({ van: 1 }, null)).toEqual({ texto: "1 va", tuyo: false });
    expect(chipDeTarjeta({ van: 2 }, "voy")).toEqual({ texto: "2 van", tuyo: false });
  });
  it("sin nadie (o sin recuento), ninguno", () => {
    expect(chipDeTarjeta({ van: 0 }, null)).toBeNull();
    expect(chipDeTarjeta({ van: null }, null)).toBeNull();
    expect(chipDeTarjeta({ van: 0 }, "voy")).toBeNull();
  });
});

describe("nombreDeTarjeta: lo que dice el enlace", () => {
  it("el título completo, la clase con su sesión, cuándo, dónde, «Vas» y el chip", () => {
    const taller = { titulo: "Laboratorio de exploración sonora: escucha activa", clase: "Taller", parte: "Sesión 1 de 4", detalle: "hoy · 17:00", sitio: "Aurora Co-Lab", van: 1 };
    expect(nombreDeTarjeta(taller, null)).toBe("Laboratorio de exploración sonora: escucha activa. Taller · Sesión 1 de 4. hoy · 17:00. Aurora Co-Lab. 1 va");
    expect(nombreDeTarjeta({ titulo: "Presentación de Kopk Poj", clase: "Evento", detalle: "hoy · 13:00", sitio: "CEART", van: 1 }, "voy")).toBe("Presentación de Kopk Poj. hoy · 13:00. CEART. Vas. 1 va");
    expect(nombreDeTarjeta({ titulo: "Tributo a The Beatles", clase: "Evento", detalle: "hoy · 20:00", sitio: "Cineteca Alameda", van: 0 }, "me_interesa")).toBe("Tributo a The Beatles. hoy · 20:00. Cineteca Alameda. Te interesa");
  });
});

describe("cortarEnPalabra (E1): dos líneas como mucho, cortado en palabra entera con «…»", () => {
  const hasta = (n: number) => (texto: string) => texto.length <= n;
  it("lo que cabe se queda entero", () => {
    expect(cortarEnPalabra("Presentación de Kopk Poj", hasta(40))).toBe("Presentación de Kopk Poj");
  });
  it("lo que no cabe pierde palabras desde el final, nunca media palabra", () => {
    expect(cortarEnPalabra("Día Nacional de las Cactáceas en el Jardín Botánico", hasta(36))).toBe("Día Nacional de las Cactáceas en el…");
    expect(cortarEnPalabra("Día Nacional de las Cactáceas en el Jardín Botánico", hasta(20))).toBe("Día Nacional de las…");
  });
  it("sin la puntuación que queda colgando antes de «…»", () => {
    expect(cortarEnPalabra("Concierto: música, danza y teatro", hasta(18))).toBe("Concierto: música…");
    expect(cortarEnPalabra("Feria – libros y discos", hasta(7))).toBe("Feria…");
  });
  it("si nada cabe queda la primera palabra con «…»; una sola palabra se queda entera", () => {
    expect(cortarEnPalabra("Laboratorio de exploración", hasta(3))).toBe("Laboratorio…");
    expect(cortarEnPalabra("Supercalifragilístico", hasta(3))).toBe("Supercalifragilístico");
  });
  it("prueba primero el entero y luego cada corte, en orden", () => {
    const probados: string[] = [];
    cortarEnPalabra("uno dos tres cuatro", (t) => (probados.push(t), t.length <= 8));
    expect(probados).toEqual(["uno dos tres cuatro", "uno dos tres…", "uno dos…"]);
  });
});
