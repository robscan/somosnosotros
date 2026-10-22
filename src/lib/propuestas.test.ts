import { describe, expect, it } from "vitest";
import { validarArtista } from "./artistas";
import { validarLugar } from "./lugares";
import {
  agruparConActos,
  agruparPorFuente,
  enOrdenDeAceptar,
  entradaDeArtista,
  entradaDeLugar,
  esMotivo,
  leerBandeja,
  nombreDe,
  notaDeFestival,
  ofrecerTodas,
  pasoDeTanda,
  textoAceptarTodas,
  textoActoPublicado,
  textoActoSinFestival,
  textoAceptarFestival,
  textoAvanceTodas,
  textoConfirmarTodas,
  textoDecidida,
  textoTandaHecha,
  urlSegura,
  vistaPropuesta,
} from "./propuestas";

const AHORA = new Date("2026-10-20T16:00:00Z");
const lugar = (datos: Record<string, unknown>) => ({ tipo: "lugar" as const, datos, creado_en: "2026-10-18T17:00:00Z" });

describe("la tarjeta de una propuesta", () => {
  it("un lugar: tipo, nombre, dirección con su ciudad, la fuente con su enlace y cuándo se leyó", () => {
    const v = vistaPropuesta(lugar({ nombre: "Foro Cultural La Nopalera", tipo: "foro", direccion: "Calle de Murguía 115, Centro", url: "https://www.sic.example/espacios/123", leida: "2026-10-18T15:00:00Z" }), "Oaxaca", AHORA);
    expect(v).toEqual({
      que: "Foro · propuesto por la rutina",
      titulo: "Foro Cultural La Nopalera",
      linea: "Calle de Murguía 115, Centro, Oaxaca",
      fuente: { texto: "sic.example", url: "https://www.sic.example/espacios/123" },
      leida: "leída el 18 oct",
    });
  });
  it("no repite la ciudad si la dirección ya la dice; sin tipo dice «Lugar»", () => {
    const v = vistaPropuesta(lugar({ nombre: "X", direccion: "Av. Juárez 1, Oaxaca de Juárez" }), "Oaxaca", AHORA);
    expect(v.que).toBe("Lugar · propuesto por la rutina");
    expect(v.linea).toBe("Av. Juárez 1, Oaxaca de Juárez");
    expect(v.leida).toBe("leída el 18 oct");
  });
  it("un enlace que no es web no se enseña: lo leído es dato", () => {
    expect(vistaPropuesta(lugar({ nombre: "X", url: "javascript:alert(1)" }), null, AHORA).fuente).toBeNull();
    expect(urlSegura("ftp://x.example")).toBeNull();
    expect(urlSegura("https://ok.example/a")).toBe("https://ok.example/a");
  });
  it("un artista y un evento", () => {
    expect(vistaPropuesta({ tipo: "artista", datos: { nombre: "Sones de la Costa", disciplina: "musica" }, creado_en: "2026-10-18T17:00:00Z" }, "Oaxaca", AHORA)).toMatchObject({ que: "Música · propuesto por la rutina", titulo: "Sones de la Costa", linea: "Oaxaca" });
    const e = vistaPropuesta({ tipo: "evento", datos: { titulo: "Noche de danzón", inicio: "2026-10-24T01:00:00Z", lugar: "Jardín Conzatti" }, creado_en: "2026-10-18T17:00:00Z" }, "Oaxaca", AHORA);
    expect(e.que).toBe("Evento · propuesto por la rutina");
    expect(e.titulo).toBe("Noche de danzón");
    expect(e.linea).toBe("23 oct, 7:00 pm · Jardín Conzatti");
    expect(nombreDe({ tipo: "evento", datos: {} })).toBe("Sin nombre");
  });
});

describe("de la propuesta a la ficha (la misma validación de las altas)", () => {
  it("un lugar completo pasa validarLugar con la ciudad de la corrida", () => {
    const entrada = entradaDeLugar({ datos: { nombre: " Galería  Siete Regiones ", tipo: "galeria", direccion: "Avenida Juárez 402", lat: "17.07", lng: -96.72, redes: ["https://instagram.com/siete", { url: "javascript:x" }, { url: "https://siete.example" }] } }, "Oaxaca");
    const { datos, errores } = validarLugar(entrada, { esAdmin: true });
    expect(errores).toEqual({});
    expect(datos).toMatchObject({ nombre: "Galería Siete Regiones", tipo: "galeria", ciudad: "Oaxaca", lat: 17.07, lng: -96.72 });
    // Los enlaces pasan por la misma normalización del alta (Instagram con su forma canónica); el `javascript:` no llega.
    expect(datos.redes.map((r) => r.url)).toEqual(["https://www.instagram.com/siete/", "https://siete.example"]);
  });
  it("sin ubicación no se crea: lo dice la validación del alta", () => {
    const { errores } = validarLugar(entradaDeLugar({ datos: { nombre: "Sin punto", tipo: "foro" } }, "Oaxaca"), { esAdmin: true });
    expect(errores.ubicacion).toMatch(/Falta la ubicación/);
  });
  it("la ciudad de la propuesta gana a la de la corrida y se une a su área (MISMA_CIUDAD)", () => {
    expect(entradaDeLugar({ datos: { ciudad: "Soledad de Graciano Sánchez" } }, "San Luis Potosí").ciudad).toBe("San Luis Potosí");
    expect(entradaDeLugar({ datos: { ciudad: "Santa Lucía del Camino" } }, "Oaxaca").ciudad).toBe("Santa Lucía del Camino");
  });
  it("un artista: ficha mínima con su disciplina, o por completar", () => {
    const { datos, errores } = validarArtista(entradaDeArtista({ datos: { nombre: "Sones de la Costa", disciplina: "musica" } }, "Oaxaca"), { esAdmin: true });
    expect(errores).toEqual({});
    expect(datos).toMatchObject({ nombre: "Sones de la Costa", disciplina: "musica", ciudad: "Oaxaca", tipo: "solista" });
    expect(validarArtista(entradaDeArtista({ datos: { nombre: "Sin disciplina" } }, "Oaxaca"), { esAdmin: true }).datos.disciplina).toBe("por_completar");
  });
});

describe("la bandeja", () => {
  it("por fuente: primero la que ya tuvo una tanda aprobada, luego la que trae más, luego por nombre", () => {
    const lista = [{ fuente: "Búsqueda web", id: 1 }, { fuente: "Búsqueda web", id: 2 }, { fuente: "Cultura", id: 3 }, { fuente: "SIC", id: 4 }, { fuente: "Agenda", id: 5 }];
    expect(agruparPorFuente(lista, ["SIC"]).map((x) => [x.fuente, x.propuestas.map((p) => p.id)])).toEqual([["SIC", [4]], ["Búsqueda web", [1, 2]], ["Agenda", [5]], ["Cultura", [3]]]);
    expect(agruparPorFuente(lista).map((x) => x.fuente)).toEqual(["Búsqueda web", "Agenda", "Cultura", "SIC"]);
  });
  it("«Aceptar las N» siempre que queden 2 o más, sin esperar a una tanda anterior (OL-438)", () => {
    expect(ofrecerTodas(3)).toBe(true);
    expect(ofrecerTodas(2)).toBe(true);
    expect(ofrecerTodas(1)).toBe(false);
    expect(ofrecerTodas(0)).toBe(false);
    // Una fuente bajo la cabecera de su búsqueda: sale si no es todo lo que queda (si lo es, repetiría «Aceptar las N» de la cabecera).
    expect(ofrecerTodas(3, 5)).toBe(true);
    expect(ofrecerTodas(5, 5)).toBe(false);
    expect(ofrecerTodas(1, 5)).toBe(false);
  });
  it("los cuatro motivos y la línea de lo hecho", () => {
    expect(esMotivo("duplicado")).toBe(true);
    expect(esMotivo("me cae mal")).toBe(false);
    expect(textoDecidida("Café X", { aceptada: false, motivo: "fuera_de_la_ciudad" })).toBe("Rechazaste Café X · fuera de la ciudad");
    expect(textoDecidida("Foro X", { aceptada: true, tipo: "lugar" })).toBe("Aceptaste Foro X");
    // OL-429: un evento aceptado ya se publica al aceptarlo; si no se pudo en ese momento, la nota del servidor va detrás.
    expect(textoDecidida("Noche", { aceptada: true, tipo: "evento" })).toBe("Aceptaste Noche");
    expect(textoDecidida("Noche", { aceptada: true, tipo: "evento" }, "no se pudo publicar ahora: se publica con la siguiente corrida de agendas")).toBe(
      "Aceptaste Noche · no se pudo publicar ahora: se publica con la siguiente corrida de agendas",
    );
  });
  it("lee lo que da panel_propuestas; sin corrida, null", () => {
    const b = leerBandeja({
      corrida: { id: "c", tipo: "lugares", ciudad: "oaxaca", ciudad_nombre: "Oaxaca", estado: "terminada", creado_en: "2026-10-18T17:00:00Z", tope_usd: 3, gasto_usd: "1.1000", propuestas: 14, aceptadas: 9, rechazadas: 0, por_revisar: 5 },
      propuestas: [{ id: "p", tipo: "lugar", fuente: "SIC", datos: { nombre: "X" }, creado_en: "2026-10-18T17:00:00Z" }],
      fuentes_con_tanda: ["SIC"],
    });
    expect(b?.corrida.gasto_usd).toBe(1.1);
    expect(b?.propuestas[0].datos.nombre).toBe("X");
    expect(leerBandeja(null)).toBeNull();
  });
});

describe("festivales y sus actos en la bandeja (OL-434)", () => {
  it("un acto que espera dice su frase como continuación de la línea, no «no se pudo publicar»", () => {
    expect(textoDecidida("Danza de Huehues", { aceptada: true, tipo: "evento" }, "Se publica cuando aceptes el festival «Xantolo 2026».")).toBe(
      "Aceptaste Danza de Huehues · se publica cuando aceptes el festival «Xantolo 2026»",
    );
    expect(textoDecidida("Noche", { aceptada: true, tipo: "evento" }, "  ")).toBe("Aceptaste Noche");
  });
  it("«Aceptar» del festival cuenta sus actos aceptados que esperan", () => {
    expect(textoAceptarFestival(0)).toBe("Aceptar");
    expect(textoAceptarFestival(1)).toBe("Aceptar el festival y su acto aceptado");
    expect(textoAceptarFestival(3)).toBe("Aceptar el festival y sus 3 actos aceptados");
  });
  it("lo que se publicó con el festival", () => {
    expect(notaDeFestival(0, 0)).toBeUndefined();
    expect(notaDeFestival(1, 0)).toBe("se publicó con su acto");
    expect(notaDeFestival(3, 0)).toBe("se publicó con sus 3 actos");
    expect(notaDeFestival(2, 1)).toBe("se publicó con 2 de sus 3 actos; el otro se publica con la siguiente corrida de agendas");
    expect(notaDeFestival(1, 2)).toBe("se publicó con 1 de sus 3 actos; los demás se publican con la siguiente corrida de agendas");
    expect(notaDeFestival(0, 2)).toBe("sus 2 actos se publican con la siguiente corrida de agendas");
    expect(textoActoPublicado("Danza de Huehues")).toBe("Aceptaste Danza de Huehues · se publicó con el festival");
  });
  it("el festival va antes que sus actos, con ellos debajo aunque lleguen por otra fuente o antes que él", () => {
    const p = (id: string, fuente: string, festival: string | null = null) => ({ id, fuente, festival });
    const grupos = agruparConActos([p("acto-1", "Web", "fest"), p("suelta", "Agenda"), p("fest", "Agenda"), p("acto-2", "Agenda", "fest"), p("otra", "Web")], ["Agenda"]);
    expect(grupos.map((g) => [g.fuente, g.propuestas.map((x) => x.id)])).toEqual([
      ["Agenda", ["suelta", "fest", "acto-1", "acto-2"]],
      ["Web", ["otra"]],
    ]);
    // Un acto cuyo festival no está en la lista va suelto en su fuente; nada se pierde aunque un «festival» sea a su vez acto de otro.
    expect(agruparConActos([p("acto", "Web", "no-esta")]).flatMap((g) => g.propuestas.map((x) => x.id))).toEqual(["acto"]);
    expect(agruparConActos([p("a", "Web", "b"), p("b", "Web", "c"), p("c", "Web")]).flatMap((g) => g.propuestas.map((x) => x.id)).sort()).toEqual(["a", "b", "c"]);
  });
  it("la línea de un evento puede omitir el cuándo o el dónde (los dice su forma)", () => {
    const e = { tipo: "evento" as const, datos: { titulo: "Xantolo 2026", inicio: "2026-10-29T01:00:00Z", lugar: "Plaza de Armas" }, creado_en: "2026-10-18T17:00:00Z" };
    expect(vistaPropuesta(e, "San Luis Potosí", AHORA).linea).toMatch(/^28 oct, 7:00 pm · Plaza de Armas$/);
    expect(vistaPropuesta(e, "San Luis Potosí", AHORA, { cuando: true }).linea).toBe("Plaza de Armas");
    expect(vistaPropuesta(e, "San Luis Potosí", AHORA, { cuando: true, donde: true }).linea).toBeNull();
  });
});

describe("«Aceptar todas» (OL-438)", () => {
  const p = (id: string, fuente: string, festival: string | null = null) => ({ id, fuente, festival });
  it("el orden de la tanda es el de la pantalla: el festival antes que sus actos, aunque un acto llegara antes o por otra fuente", () => {
    const orden = enOrdenDeAceptar([p("acto-1", "Web", "fest"), p("suelta", "Agenda"), p("fest", "Agenda"), p("acto-2", "Agenda", "fest"), p("otra", "Web")]);
    expect(orden.map((x) => x.id)).toEqual(["suelta", "fest", "acto-1", "acto-2", "otra"]);
    expect(orden.indexOf(orden.find((x) => x.id === "fest")!)).toBeLessThan(orden.findIndex((x) => x.id === "acto-1"));
    // Ninguna se pierde ni sale dos veces.
    expect(orden.map((x) => x.id).sort()).toEqual(["acto-1", "acto-2", "fest", "otra", "suelta"]);
  });
  it("antes de cada una: salta lo decidido o en camino, acepta, y deja con su razón un acto cuyo festival no se aceptó", () => {
    type E = { decidida?: { rechazo: boolean }; enCamino?: string };
    const estados: Record<string, E> = {};
    const nombres: Record<string, string> = { fest: "Xantolo 2026" };
    const paso = (x: { id: string; festival?: string | null }) => pasoDeTanda(x, (id) => estados[id], (id) => nombres[id]);
    expect(paso(p("suelta", "Agenda"))).toEqual({ accion: "aceptar" });
    estados.suelta = { decidida: { rechazo: true } };
    expect(paso(p("suelta", "Agenda"))).toEqual({ accion: "saltar" });
    estados.otra = { enCamino: "aceptar" };
    expect(paso(p("otra", "Web"))).toEqual({ accion: "saltar" });
    // El festival falló (sigue sin decidir): su acto se queda por revisar con su razón.
    expect(paso(p("acto-1", "Web", "fest"))).toEqual({ accion: "dejar", razon: "Su festival «Xantolo 2026» no se aceptó: acéptalo antes que este acto." });
    expect(textoActoSinFestival("Xantolo 2026")).toBe("Su festival «Xantolo 2026» no se aceptó: acéptalo antes que este acto.");
    // Aceptado, el acto cuelga de él; rechazado, el acto se publica suelto (OL-433): en los dos casos se acepta.
    estados.fest = { decidida: { rechazo: false } };
    expect(paso(p("acto-1", "Web", "fest"))).toEqual({ accion: "aceptar" });
    estados.fest = { decidida: { rechazo: true } };
    expect(paso(p("acto-1", "Web", "fest"))).toEqual({ accion: "aceptar" });
    // Un acto cuyo festival no está en esta bandeja va como siempre (el servidor dice si espera).
    expect(paso(p("acto-x", "Web", "en-otra"))).toEqual({ accion: "aceptar" });
  });
  it("la hoja: cuántas, de qué y de qué ciudad, con los ejemplos de lo que se acepta", () => {
    const lugares = Array.from({ length: 17 }, () => ({ tipo: "lugar" as const }));
    expect(textoConfirmarTodas(lugares, "San Luis Potosí")).toEqual({
      que: "Vas a aceptar 17 propuestas de lugares de San Luis Potosí.",
      siNo: "Las que no se puedan publicar (un repetido, un sitio sin punto) se quedan por revisar con su razón.",
    });
    const eventos = [{ tipo: "evento" as const }, { tipo: "evento" as const, festival: "fest" }, { tipo: "evento" as const }];
    expect(textoConfirmarTodas(eventos, "San Luis Potosí")).toEqual({
      que: "Vas a aceptar 3 propuestas de eventos de San Luis Potosí.",
      siNo: "Las que no se puedan publicar (un repetido, un sitio sin punto, un acto cuyo festival no se ha aceptado) se quedan por revisar con su razón.",
    });
    expect(textoConfirmarTodas([{ tipo: "artista" }, { tipo: "artista" }], "Oaxaca").siNo).toBe("Las que no se puedan publicar (un repetido) se quedan por revisar con su razón.");
    expect(textoConfirmarTodas([{ tipo: "artista" }, { tipo: "lugar" }], null).que).toBe("Vas a aceptar 2 propuestas.");
  });
  it("el botón, su avance y la cuenta final", () => {
    expect(textoAceptarTodas(17)).toBe("Aceptar las 17");
    expect(textoAvanceTodas(5, 17)).toBe("Aceptando 5 de 17…");
    expect(textoTandaHecha(15, 2)).toBe("15 aceptadas · 2 por revisar");
    expect(textoTandaHecha(17, 0)).toBe("17 aceptadas");
    expect(textoTandaHecha(1, 1)).toBe("1 aceptada · 1 por revisar");
    expect(textoTandaHecha(0, 3)).toBe("Ninguna aceptada · 3 por revisar");
  });
});
