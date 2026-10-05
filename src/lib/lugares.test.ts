import { describe, expect, it } from "vitest";
import { agruparLugares, calleCorta, etiquetaTipo, TIPOS, primerosDeGrupos, conProximo, diasConEvento, eleccionesPuestas, filtrarPorEleccion, hrefLugar, lugaresAEncuadrar, puntoDeCercania, lugaresConEventoEn, lugaresEncuadreInicial, normalizarNombre, ordenarLugares, partesDeDireccion, SIN_ELECCION, tiposPresentes, validarLugar } from "./lugares";

describe("normalizarNombre", () => {
  it("quita acentos, mayúsculas y signos", () => {
    expect(normalizarNombre("  Casa de Cultura  #3 — Potosí ")).toBe("casa de cultura 3 potosi");
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

describe("Plaza, jardín o parque", () => {
  it("va justo antes de Otro, con su etiqueta, y se cuenta como cualquier tipo", () => {
    const valores = TIPOS.map((t) => t.valor);
    expect(valores.at(-2)).toBe("plaza");
    expect(valores.at(-1)).toBe("otro");
    expect(etiquetaTipo("plaza")).toBe("Plaza, jardín o parque");
    const base = { nombre: "Jardín Botánico El Izotal", tipo: "plaza", direccion: "Calle 1", lat: "22.15", lng: "-100.97", descripcion: "", portada: "", detalle: "Jardín", ciudad: "San Luis Potosí" };
    const { datos, errores } = validarLugar(base);
    expect(errores).toEqual({});
    expect(datos.tipo).toBe("plaza");
    expect(datos.detalle).toBeNull();
    expect(tiposPresentes([{ tipo: "otro" }, { tipo: "plaza" }, { tipo: "museo" }]).map((t) => t.etiqueta)).toEqual(["Museo", "Plaza, jardín o parque", "Otro"]);
  });
});

describe("validarLugar", () => {
  const base = { nombre: "Foro X", tipo: "foro", direccion: "Calle 1", lat: "22.15", lng: "-100.97", descripcion: "", portada: "", ciudad: "San Luis Potosí" };
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
  it("sin ciudad no se publica (OL-299): ya no cae en San Luis Potosí en silencio", () => {
    const sin = { ...base, ciudad: "" };
    expect(validarLugar(sin).errores.ciudad).toBe("No pudimos saber en qué ciudad está. Intenta de nuevo.");
    expect(validarLugar({ ...base, ciudad: undefined }).errores.ciudad).toBeDefined();
    expect(validarLugar({ ...base, ciudad: "   " }).errores.ciudad).toBeDefined();
  });
  it("la ciudad que trae se guarda canónica: con su país fuera de México y unida a su área metropolitana", () => {
    expect(validarLugar({ ...base, ciudad: "Córdoba, España" }).datos.ciudad).toBe("Córdoba, España");
    expect(validarLugar({ ...base, ciudad: "Soledad de Graciano Sánchez" }).datos.ciudad).toBe("San Luis Potosí");
    expect(validarLugar({ ...base, ciudad: "Querétaro" }).errores.ciudad).toBeUndefined();
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

describe("agruparLugares", () => {
  const base = { tipo: "foro" as const, direccion: null, portada: null };
  const evento = (id: string, inicio: string) => ({ id, inicio, zona: "America/Mexico_City", titulo: "Evento" });
  const sinEvento = { ...base, id: "s1", nombre: "Zeta", lat: 22.15, lng: -100.98, proximo: null };
  const otroSinEvento = { ...base, id: "s2", nombre: "Alfa", lat: 22.3, lng: -100.9, proximo: null };
  const tarde = { ...base, id: "c1", nombre: "Beta", lat: 22.16, lng: -100.98, proximo: evento("e1", "2026-09-25T01:00:00Z") };
  const pronto = { ...base, id: "c2", nombre: "Ñandú", lat: 22.2, lng: -100.9, proximo: evento("e2", "2026-09-20T01:00:00Z") };
  const mismoDia = { ...base, id: "c3", nombre: "Aether", lat: 22.18, lng: -100.95, proximo: evento("e3", "2026-09-20T01:00:00Z") };
  const todos = [sinEvento, tarde, otroSinEvento, pronto, mismoDia];
  it("dos grupos con su título: primero «Con eventos» y luego «Sin eventos próximos»", () => {
    const { grupos } = agruparLugares(todos, null);
    expect(grupos.map((g) => [g.clave, g.titulo])).toEqual([
      ["con-eventos", "Con eventos"],
      ["sin-eventos", "Sin eventos próximos"],
    ]);
  });
  it("sin ubicación: los de eventos, del más próximo al más lejano en fecha (a igual fecha, por nombre), y los demás por nombre", () => {
    const { grupos } = agruparLugares(todos, null);
    expect(grupos[0].lugares.map((l) => l.id)).toEqual(["c3", "c2", "c1"]);
    expect(grupos[1].lugares.map((l) => l.id)).toEqual(["s2", "s1"]);
  });
  it("con ubicación: cada grupo por distancia, con los km de todos", () => {
    const { grupos, km } = agruparLugares(todos, { lat: 22.16, lng: -100.98 });
    expect(grupos[0].lugares.map((l) => l.id)).toEqual(["c1", "c3", "c2"]);
    expect(grupos[1].lugares.map((l) => l.id)).toEqual(["s1", "s2"]);
    expect(km.get("c1")).toBe(0);
    expect([...km.keys()].sort()).toEqual(["c1", "c2", "c3", "s1", "s2"]);
  });
  it("la cercanía ordena dentro de cada grupo, nunca por encima: un lugar sin eventos más cercano no sube sobre uno con eventos más lejano", () => {
    const yo = { lat: 22.15, lng: -100.98 }; // s1 (sin eventos) está encima de mí; pronto (con eventos) es el más lejano
    const { grupos, km } = agruparLugares(todos, yo);
    expect(km.get("s1")!).toBeLessThan(km.get("c2")!);
    expect(grupos.map((g) => g.clave)).toEqual(["con-eventos", "sin-eventos"]);
    expect(grupos.flatMap((g) => g.lugares.map((l) => l.id)).indexOf("c2")).toBeLessThan(grupos.flatMap((g) => g.lugares.map((l) => l.id)).indexOf("s1"));
  });
  it("un grupo sin lugares no existe: con filtros puestos queda uno, o ninguno", () => {
    expect(agruparLugares([tarde, pronto], null).grupos.map((g) => g.clave)).toEqual(["con-eventos"]);
    expect(agruparLugares([sinEvento], null).grupos.map((g) => g.clave)).toEqual(["sin-eventos"]);
    expect(agruparLugares([], null).grupos).toEqual([]);
  });
  it("no pierde ni repite lugares y no toca la lista que recibe", () => {
    const copia = [...todos];
    const { grupos } = agruparLugares(todos, null);
    expect(grupos.flatMap((g) => g.lugares.map((l) => l.id)).sort()).toEqual(["c1", "c2", "c3", "s1", "s2"]);
    expect(todos).toEqual(copia);
  });
});

describe("primerosDeGrupos", () => {
  const grupos = [
    { clave: "con-eventos" as const, titulo: "Con eventos", lugares: ["a", "b", "c"] },
    { clave: "sin-eventos" as const, titulo: "Sin eventos próximos", lugares: ["d", "e"] },
  ];
  it("llena el primer grupo y, si sobra, el siguiente; cada grupo conserva su total", () => {
    expect(primerosDeGrupos(grupos, 4)).toEqual([
      { ...grupos[0], total: 3 },
      { ...grupos[1], lugares: ["d"], total: 2 },
    ]);
    expect(primerosDeGrupos(grupos, 99).flatMap((g) => g.lugares)).toEqual(["a", "b", "c", "d", "e"]);
  });
  it("un grupo que no llega a pintar ningún renglón no sale", () => {
    expect(primerosDeGrupos(grupos, 2)).toEqual([{ ...grupos[0], lugares: ["a", "b"], total: 3 }]);
    expect(primerosDeGrupos(grupos, 3).map((g) => g.clave)).toEqual(["con-eventos"]);
    expect(primerosDeGrupos(grupos, 0)).toEqual([]);
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

describe("lugaresAEncuadrar: lo que encuadra «Encuadrar los lugares»", () => {
  const AHORA = new Date("2026-09-19T16:00:00Z");
  const centro = { lat: 22.1497, lng: -100.9764 };
  const base = { tipo: "foro" as const, direccion: null, portada: null, proximo: null };
  const conEvento = { ...base, id: "a", nombre: "A", lat: 22.15, lng: -100.97, proximo: { id: "e1", inicio: "2026-09-20T01:00:00Z", zona: "America/Mexico_City", titulo: "Evento" } };
  const cerca = { ...base, id: "b", nombre: "B", lat: 22.15, lng: -100.98 };
  const lejos = { ...base, id: "c", nombre: "C", lat: 25, lng: -105 };
  const visibles = [conEvento, cerca, lejos];

  it("con una ficha abierta, su lugar y nada más: como al abrirla", () => {
    expect(lugaresAEncuadrar({ ficha: lejos, hayFiltros: false, visibles, destacados: [], centro, ahora: AHORA }).map((l) => l.id)).toEqual(["c"]);
    expect(lugaresAEncuadrar({ ficha: lejos, hayFiltros: true, visibles, destacados: [], centro, ahora: AHORA }).map((l) => l.id)).toEqual(["c"]);
  });

  it("con filtros puestos, todo lo que dejan pasar: como al elegirlos", () => {
    expect(lugaresAEncuadrar({ ficha: null, hayFiltros: true, visibles: [cerca, lejos], destacados: [], centro, ahora: AHORA }).map((l) => l.id)).toEqual(["b", "c"]);
  });

  it("sin filtros ni ficha, lo mismo que al abrir el mapa: esta semana, destacados y, si faltan, los cercanos al centro", () => {
    const esperado = lugaresEncuadreInicial(visibles, ["c"], centro, AHORA).map((l) => l.id);
    expect(lugaresAEncuadrar({ ficha: null, hayFiltros: false, visibles, destacados: ["c"], centro, ahora: AHORA }).map((l) => l.id)).toEqual(esperado);
    expect(esperado).toContain("a");
    expect(esperado).toContain("c");
  });

  it("sin lugares que ver, nada que encuadrar", () => {
    expect(lugaresAEncuadrar({ ficha: null, hayFiltros: true, visibles: [], destacados: [], centro, ahora: AHORA })).toEqual([]);
    expect(lugaresAEncuadrar({ ficha: null, hayFiltros: false, visibles: [], destacados: [], centro, ahora: AHORA })).toEqual([]);
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

describe("puntoDeCercania (OL-255)", () => {
  const pedido = { lat: 1, lng: 1 };
  const fresca = { lat: 2, lng: 2 };
  it("con el permiso concedido ordena sin toque, con la ubicación al día", () => {
    expect(puntoDeCercania(null, fresca, true)).toBe(fresca);
  });
  it("sin permiso ni toque no hay punto, aunque quede uno guardado", () => {
    expect(puntoDeCercania(null, fresca, false)).toBeNull();
    expect(puntoDeCercania(null, null, false)).toBeNull();
  });
  it("tras el toque sigue al punto más reciente, o se queda con el pedido", () => {
    expect(puntoDeCercania(pedido, fresca, false)).toBe(fresca);
    expect(puntoDeCercania(pedido, null, false)).toBe(pedido);
  });
  it("concedido pero sin punto todavía: nada hasta que llegue", () => {
    expect(puntoDeCercania(null, null, true)).toBeNull();
  });
});
