import { describe, expect, it } from "vitest";
import { calleCorta, conProximo, diasConEvento, eleccionesPuestas, filtrarLugares, filtrarPorEleccion, hrefLugar, lugaresConEventoEn, lugaresEncuadreInicial, normalizarNombre, ordenarLugares, partesDeDireccion, SIN_ELECCION, tiposPresentes, validarLugar } from "./lugares";

describe("normalizarNombre", () => {
  it("quita acentos, mayúsculas y signos", () => {
    expect(normalizarNombre("  Casa de Cultura  #3 — Potosí ")).toBe("casa de cultura 3 potosi");
  });
});

describe("filtrarLugares", () => {
  const lugares = [
    { nombre: "Teatro de la Paz", direccion: "Villerías 2" },
    { nombre: "Galería Ángel", direccion: null },
  ];
  it("busca sin acentos y a medias", () => {
    expect(filtrarLugares(lugares, "angel").map((l) => l.nombre)).toEqual(["Galería Ángel"]);
    expect(filtrarLugares(lugares, "VILLER").map((l) => l.nombre)).toEqual(["Teatro de la Paz"]);
    expect(filtrarLugares(lugares, "")).toHaveLength(2);
  });
  it("sin nada escrito devuelve la misma lista", () => {
    expect(filtrarLugares(lugares, "  ")).toBe(lugares);
  });
});

describe("tiposPresentes", () => {
  it("cuenta cuántos lugares hay de cada tipo", () => {
    expect(tiposPresentes([{ tipo: "museo" }, { tipo: "foro" }, { tipo: "museo" }]).map((t) => `${t.valor}:${t.n}`)).toEqual(["museo:2", "foro:1"]);
  });
  it("Museo y Escuela entran en el orden de los chips con su etiqueta", () => {
    const l = [{ tipo: "escuela" }, { tipo: "foro" }, { tipo: "museo" }];
    expect(tiposPresentes(l).map((t) => t.etiqueta)).toEqual(["Museo", "Foro", "Escuela"]);
  });
});

describe("validarLugar", () => {
  const base = { nombre: "Foro X", tipo: "foro", direccion: "Calle 1", lat: "22.15", lng: "-100.97", descripcion: "", portada: "" };
  it("acepta un lugar mínimo y limpia", () => {
    const { datos, errores } = validarLugar({ ...base, enlaces: JSON.stringify([" @forox ", "vimeo.com/forox"]) });
    expect(errores).toEqual({});
    expect(datos.lat).toBeCloseTo(22.15);
    expect(datos.redes).toEqual([
      { red: "instagram", url: "https://www.instagram.com/forox/" },
      { red: "vimeo", url: "https://vimeo.com/forox" },
    ]);
    expect(datos.portada).toBeNull();
    expect(datos.privado).toBe(false);
    expect(validarLugar({ ...base, privado: "1" }).datos.privado).toBe(true);
    // "Qué es" solo cuenta con tipo Otro.
    expect(validarLugar({ ...base, tipo: "otro", detalle: " Taller de cerámica " }).datos.detalle).toBe("Taller de cerámica");
    expect(validarLugar({ ...base, detalle: "Taller" }).datos.detalle).toBeNull();
  });
  it("exige nombre, tipo válido y ubicación", () => {
    const { errores } = validarLugar({ ...base, nombre: "", tipo: "bar", lat: "0", lng: "0" });
    expect(errores.nombre).toBeTruthy();
    expect(errores.tipo).toBeTruthy();
    expect(errores.ubicacion).toBeTruthy();
  });
  it("reconoce el WhatsApp por el número y descarta lo que no es nada", () => {
    expect(validarLugar({ ...base, enlaces: JSON.stringify(["123"]) }).datos.redes).toEqual([]);
    expect(validarLugar({ ...base, enlaces: JSON.stringify(["4441234567"]) }).datos.redes).toEqual([{ red: "whatsapp", url: "https://wa.me/524441234567" }]);
  });
  describe("S-01 (docs/rediseno/46): la portada solo acepta cualquier dominio cuando esAdmin viene de la sesión", () => {
    it("sin esAdmin (por defecto), una portada de otro dominio se rechaza", () => {
      const { errores } = validarLugar({ ...base, portada: "https://evil.example/x.png" });
      expect(errores.portada).toBe("La foto no se subió bien. Intenta de nuevo.");
    });
    it("con esAdmin: true, la misma portada de otro dominio se acepta", () => {
      const { errores } = validarLugar({ ...base, portada: "https://evil.example/x.png" }, { esAdmin: true });
      expect(errores.portada).toBeUndefined();
    });
    it("igual a portadaActual, se acepta aunque no sea admin (ficha del CAPO con portada de otro dominio)", () => {
      const portada = "https://catalogo-externo.example/foto.jpg";
      const { errores } = validarLugar({ ...base, portada }, { esAdmin: false, portadaActual: portada });
      expect(errores.portada).toBeUndefined();
    });
  });
});

describe("calleCorta", () => {
  it("quita código postal, ciudad y estado", () => {
    expect(calleCorta("C. 5 de Mayo 1100, 78000 San Luis Potosí, S.L.P.")).toBe("C. 5 de Mayo 1100");
    expect(calleCorta("Av. Carranza 480, Centro, San Luis Potosí")).toBe("Av. Carranza 480");
    expect(calleCorta("Jardín de Tequis 3")).toBe("Jardín de Tequis 3");
    expect(calleCorta(null)).toBe("");
  });
});

describe("partesDeDireccion (la fila «Dónde» de una ficha)", () => {
  it("la calle y, aparte, lo demás", () => {
    expect(partesDeDireccion("Manuel José Othón s/n esq. Chico Sein, Centro Histórico, 78000, San Luis Potosí, S.L.P.")).toEqual({ calle: "Manuel José Othón s/n esq. Chico Sein", resto: "Centro Histórico, 78000, San Luis Potosí, S.L.P." });
  });
  it("sin comas, todo es la calle; sin dirección, nada", () => {
    expect(partesDeDireccion("Jardín de Tequis 3")).toEqual({ calle: "Jardín de Tequis 3", resto: "" });
    expect(partesDeDireccion(null)).toEqual({ calle: "", resto: "" });
  });
});

describe("ordenarLugares", () => {
  const base = { tipo: "foro" as const, direccion: null, portada: null };
  const a = { ...base, id: "a", nombre: "Zeta", lat: 22.15, lng: -100.98, proximo: { id: "e1", inicio: "2026-09-20T01:00:00Z", zona: "America/Mexico_City", titulo: "Evento" } };
  const b = { ...base, id: "b", nombre: "Alfa", lat: 22.16, lng: -100.98, proximo: null };
  const c = { ...base, id: "c", nombre: "Beta", lat: 22.2, lng: -100.9, proximo: { id: "e2", inicio: "2026-09-15T01:00:00Z", zona: "America/Mexico_City", titulo: "Evento" } };
  it("sin ubicación: alfabético", () => {
    expect(ordenarLugares([a, b, c], null).lista.map((l) => l.id)).toEqual(["b", "c", "a"]);
  });
  it("con ubicación: por distancia, con los km", () => {
    const { lista, km } = ordenarLugares([a, b, c], { lat: 22.16, lng: -100.98 });
    expect(lista.map((l) => l.id)).toEqual(["b", "a", "c"]);
    expect(km.get("b")).toBe(0);
    expect(km.get("c")!).toBeGreaterThan(5);
  });
});

describe("lugaresEncuadreInicial", () => {
  const AHORA = new Date("2026-09-19T16:00:00Z"); // sábado 19 sep, 10:00 local
  const centro = { lat: 22.1497, lng: -100.9764 };
  const base = { tipo: "foro" as const, direccion: null, portada: null, proximo: null };
  it("con tres o más lugares de esta semana o destacados, no completa con cercanos", () => {
    const conEvento = { ...base, id: "a", nombre: "A", lat: 22.15, lng: -100.97, proximo: { id: "e1", inicio: "2026-09-20T01:00:00Z", zona: "America/Mexico_City", titulo: "Evento" } };
    const destacado1 = { ...base, id: "b", nombre: "B", lat: 22.3, lng: -101.1 };
    const destacado2 = { ...base, id: "c", nombre: "C", lat: 22.4, lng: -101.2 };
    const lejano = { ...base, id: "d", nombre: "D", lat: 25, lng: -105 };
    const r = lugaresEncuadreInicial([conEvento, destacado1, destacado2, lejano], ["b", "c"], centro, AHORA);
    expect(r.map((l) => l.id)).toEqual(["a", "b", "c"]); // el lejano, sin evento ni destacado, se queda fuera
  });
  it("con menos de tres, completa con los más cercanos al centro hasta llegar a seis", () => {
    const conEvento = { ...base, id: "a", nombre: "A", lat: 22.15, lng: -100.97, proximo: { id: "e1", inicio: "2026-09-20T01:00:00Z", zona: "America/Mexico_City", titulo: "Evento" } };
    const cerca = { ...base, id: "b", nombre: "B", lat: 22.15, lng: -100.98 }; // el más cercano al centro
    const lejos = { ...base, id: "c", nombre: "C", lat: 25, lng: -105 };
    const r = lugaresEncuadreInicial([conEvento, cerca, lejos], [], centro, AHORA);
    expect(r.map((l) => l.id)).toEqual(["a", "b", "c"]); // se completan los dos restantes (solo hay dos, tope 6)
  });
  it("un evento fuera de la ventana de siete días no cuenta como candidato", () => {
    const lejano = { ...base, id: "a", nombre: "A", lat: 22.15, lng: -100.97, proximo: { id: "e1", inicio: "2026-10-05T01:00:00Z", zona: "America/Mexico_City", titulo: "Evento" } };
    const cerca = { ...base, id: "b", nombre: "B", lat: 22.15, lng: -100.98 };
    const r = lugaresEncuadreInicial([lejano, cerca], [], centro, AHORA);
    expect(r.map((l) => l.id)).toEqual(["b", "a"]); // ninguno es candidato: se completa por cercanía, "a" queda al final
  });
});

describe("conProximo", () => {
  it("toma el primer evento de cada lugar y deja null a los demás", () => {
    const r = conProximo([{ id: "a" }, { id: "b" }], [
      { id: "e1", inicio: "2026-09-15T01:00:00Z", lugar_id: "a", zona: "America/Mexico_City", titulo: "Uno" },
      { id: "e2", inicio: "2026-09-16T01:00:00Z", lugar_id: "a", zona: "America/Mexico_City", titulo: "Dos" },
      { id: "e3", inicio: "2026-09-17T01:00:00Z", lugar_id: null, zona: "America/Mexico_City", titulo: "Tres" },
    ]);
    expect(r[0].proximo).toEqual({ id: "e1", inicio: "2026-09-15T01:00:00Z", zona: "America/Mexico_City", titulo: "Uno" });
    expect(r[1].proximo).toBeNull();
  });
});

describe("diasConEvento y los filtros de Lugares (docs/rediseno/45, OL-174; docs/rediseno/50, P5b: Con eventos, Tipo y Siguiendo)", () => {
  const eventos = [
    { inicio: "2026-09-25T01:00:00Z", lugar_id: "a", zona: "America/Mexico_City" }, // jue 24, 19:00 SLP
    { inicio: "2026-09-27T01:00:00Z", lugar_id: "a", zona: "America/Mexico_City" }, // sáb 26, 19:00 SLP: segundo evento del mismo lugar
    { inicio: "2026-09-25T01:00:00Z", lugar_id: "b", zona: "America/Mexico_City" },
    { inicio: "2026-09-25T01:00:00Z", lugar_id: null, zona: "America/Mexico_City" }, // sin lugar: se ignora
    { inicio: "2026-10-03T01:00:00Z", lugar_id: "c", zona: "America/Mexico_City" }, // vie 2 oct, 19:00 SLP: fuera de la semana
  ];
  const lugares = [
    { id: "a", tipo: "foro" },
    { id: "b", tipo: "museo" },
    { id: "c", tipo: "foro" },
    { id: "d", tipo: "museo" },
  ];
  const conDias = diasConEvento(lugares, eventos);

  it("junta, por lugar, los días (en la zona del evento) en que tiene evento, sin repetir", () => {
    expect(conDias.find((l) => l.id === "a")!.diasEvento).toEqual(["2026-09-24", "2026-09-26"]);
    expect(conDias.find((l) => l.id === "b")!.diasEvento).toEqual(["2026-09-24"]);
    expect(conDias.find((l) => l.id === "d")!.diasEvento).toEqual([]); // sin eventos: lista vacía, no undefined
  });
  it("un evento de varios días cuenta en cada día que ocupa (OL-218)", () => {
    // Un evento del 6 al 8 de octubre hace que el lugar salga «con eventos» los tres días (bitácora 247).
    const conRango = [{ inicio: "2026-10-06T17:00:00Z", fin: "2026-10-09T02:00:00Z", lugar_id: "a", zona: "America/Mexico_City" }]; // 11:00-20:00 SLP, del 6 al 8
    const r = diasConEvento([{ id: "a" }], conRango);
    expect(r[0].diasEvento).toEqual(["2026-10-06", "2026-10-07", "2026-10-08"]);
    expect(lugaresConEventoEn(r, "2026-10-07", "2026-10-07").map((l) => l.id)).toEqual(["a"]);
    expect(lugaresConEventoEn(r, "2026-10-09", "2026-10-09")).toEqual([]);
  });
  it("con eventos entre dos días: los dos extremos cuentan", () => {
    expect(lugaresConEventoEn(conDias, "2026-09-24", "2026-09-24").map((l) => l.id)).toEqual(["a", "b"]);
    expect(lugaresConEventoEn(conDias, "2026-09-25", "2026-09-26").map((l) => l.id)).toEqual(["a"]);
    expect(lugaresConEventoEn(conDias, "2026-09-21", "2026-09-23")).toEqual([]);
  });

  const hoy = "2026-09-24"; // jueves: «esta semana» son los siete días del 24 al 30
  const ids = (r: { id: string }[]) => r.map((l) => l.id);
  it("sin nada puesto salen todos", () => {
    expect(filtrarPorEleccion(conDias, SIN_ELECCION, null, hoy)).toEqual(conDias);
    expect(eleccionesPuestas(SIN_ELECCION)).toBe(0);
  });
  it("con eventos hoy: solo los que tienen evento hoy", () => {
    expect(ids(filtrarPorEleccion(conDias, { ...SIN_ELECCION, conEventos: "hoy" }, null, hoy))).toEqual(["a", "b"]);
    expect(ids(filtrarPorEleccion(conDias, { ...SIN_ELECCION, conEventos: "hoy" }, null, "2026-09-25"))).toEqual([]);
  });
  it("con eventos esta semana: los próximos siete días desde hoy, ni antes ni después", () => {
    expect(ids(filtrarPorEleccion(conDias, { ...SIN_ELECCION, conEventos: "semana" }, null, hoy))).toEqual(["a", "b"]); // c es el 2 de octubre: día 9
    expect(ids(filtrarPorEleccion(conDias, { ...SIN_ELECCION, conEventos: "semana" }, null, "2026-09-27"))).toEqual(["c"]); // 27 al 3: solo c
    expect(ids(filtrarPorEleccion(conDias, { ...SIN_ELECCION, conEventos: "semana" }, null, "2026-09-27"))).not.toContain("a"); // a fue el 24 y el 26
  });
  it("tipo y con eventos se suman", () => {
    expect(ids(filtrarPorEleccion(conDias, { ...SIN_ELECCION, tipo: "foro", conEventos: "semana" }, null, hoy))).toEqual(["a"]);
    expect(ids(filtrarPorEleccion(conDias, { ...SIN_ELECCION, tipo: "museo" }, null, hoy))).toEqual(["b", "d"]);
  });
  it("solo lo que sigo: los lugares que sigue; sin sesión (o sin saberlo todavía) ninguno", () => {
    expect(ids(filtrarPorEleccion(conDias, { ...SIN_ELECCION, soloSigo: true }, ["b", "c"], hoy))).toEqual(["b", "c"]);
    expect(ids(filtrarPorEleccion(conDias, { ...SIN_ELECCION, soloSigo: true }, null, hoy))).toEqual([]);
    expect(ids(filtrarPorEleccion(conDias, { tipo: "foro", conEventos: null, soloSigo: true }, ["b", "c"], hoy))).toEqual(["c"]);
  });
  it("cuenta lo que hay puesto", () => {
    expect(eleccionesPuestas({ tipo: "foro", conEventos: "hoy", soloSigo: true })).toBe(3);
    expect(eleccionesPuestas({ tipo: null, conEventos: "semana", soloSigo: false })).toBe(1);
  });
});

describe("hrefLugar", () => {
  it("usa el slug cuando lo trae; el UUID solo como respaldo (OL-119, mismo criterio que artistas)", () => {
    expect(hrefLugar({ id: "a1", slug: "casa-de-la-cultura" })).toBe("/lugares/casa-de-la-cultura");
    expect(hrefLugar({ id: "a1", slug: null })).toBe("/lugares/a1");
    expect(hrefLugar({ id: "a1" })).toBe("/lugares/a1");
    expect(hrefLugar({ id: "a1", slug: "" })).toBe("/lugares/a1");
  });
});
