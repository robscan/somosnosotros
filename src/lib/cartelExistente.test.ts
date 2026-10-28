import { describe, expect, it } from "vitest";
import { avisoAlDueno, completarDelFormulario, finalDeCartel, mensajeDeError, precioParaCompletar, respuestaDe } from "./cartelExistente";
import type { EventoParecido } from "./eventosParecidos";

// OL-467 (bitácora 499): lo que no depende de la pantalla ni del servidor en «Sí, es este: ponerle mi cartel».
const P: EventoParecido = { id: "00000000-0000-4000-8000-0000000000d1", slug: "noche-de-danzon", titulo: "Noche de danzón", inicio: "2026-10-10T02:00:00.000Z", zona: "America/Mexico_City", imagen: null, lugar_id: null, lugar_nombre: "Teatro de la Paz", sitio_texto: null };

describe("la respuesta de «¿Es este?»", () => {
  it("sin cartel: ponerle el mío", () => {
    expect(respuestaDe([P])).toEqual({ tipo: "poner", parecido: P });
  });
  it("con cartel: ir al evento; cambiarlo solo si el servidor dijo que puede", () => {
    expect(respuestaDe([{ ...P, imagen: "x.jpg" }])).toMatchObject({ tipo: "ir", puedeCambiar: false });
    expect(respuestaDe([{ ...P, imagen: "x.jpg", puede_cambiar: true }])).toMatchObject({ tipo: "ir", puedeCambiar: true });
  });
  it("con dos o más, ninguna: cada renglón abre su ficha (decisión 4)", () => {
    expect(respuestaDe([P, { ...P, id: "otro" }])).toBeNull();
    expect(respuestaDe([])).toBeNull();
    expect(respuestaDe(undefined)).toBeNull();
  });
});

describe("el precio que se completa", () => {
  it("el número del cartel, con su signo", () => {
    expect(precioParaCompletar({ gratis: "no", cooperacion: "no", precio: "150" }, false)).toBe("$150");
  });
  it("cooperación solidaria", () => {
    expect(precioParaCompletar({ gratis: "no", cooperacion: "si", precio: "" }, false)).toBe("Cooperación solidaria");
  });
  it("gratis solo donde vacío no es gratis (costo opcional); en un evento suelto vacío ya se ve «Gratis»", () => {
    expect(precioParaCompletar({ gratis: "si", cooperacion: "no", precio: "" }, true)).toBe("Gratis");
    expect(precioParaCompletar({ gratis: "si", cooperacion: "no", precio: "" }, false)).toBeUndefined();
  });
  it("sin precio leído, nada", () => {
    expect(precioParaCompletar({ gratis: "no", cooperacion: "no", precio: "" }, false)).toBeUndefined();
  });
});

describe("lo que se manda para completar", () => {
  it("del formulario del alta, con el fin en la zona del evento que ya estaba", () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries({ descripcion: " Baile de salón. ", gratis: "no", cooperacion: "no", precio: "150", fin: "2026-10-09T23:00", quien: JSON.stringify([{ nombre: "Orquesta Típica de San Luis" }]) })) fd.set(k, v);
    expect(completarDelFormulario(fd, { zona: "America/Mexico_City", clase: "puntual" })).toEqual({
      descripcion: "Baile de salón.",
      precio: "$150",
      fin: "2026-10-10T05:00:00.000Z",
      quien: [{ nombre: "Orquesta Típica de San Luis", tipo: "grupo" }],
    });
  });
  it("lo vacío no se manda", () => {
    const fd = new FormData();
    fd.set("gratis", "si");
    fd.set("fin", "");
    expect(completarDelFormulario(fd, { zona: "America/Mexico_City" })).toEqual({});
  });
});

describe("el final", () => {
  it("dice solo lo que se completó, en orden", () => {
    expect(finalDeCartel({ completado: ["artistas", "descripcion", "precio"], reemplazado: false })).toEqual({
      titulo: "Listo: tu cartel ya está en el evento",
      frase: "Le pusimos tu cartel y completamos su precio, su descripción y quién se presenta. Así lo ve la gente:",
    });
    expect(finalDeCartel({ completado: ["precio"], reemplazado: false }).frase).toBe("Le pusimos tu cartel y completamos su precio. Así lo ve la gente:");
    expect(finalDeCartel({ completado: ["fin", "descripcion"], reemplazado: false }).frase).toBe("Le pusimos tu cartel y completamos su hora de fin y su descripción. Así lo ve la gente:");
  });
  it("sin nada que completar, solo el cartel", () => {
    expect(finalDeCartel({ completado: [], reemplazado: false }).frase).toBe("Le pusimos tu cartel. Así lo ve la gente:");
  });
  it("al cambiar el cartel, todo lo demás sigue igual", () => {
    expect(finalDeCartel({ completado: [], reemplazado: true })).toEqual({ titulo: "Listo: cambiamos su cartel por el tuyo", frase: "Todo lo demás sigue igual. Así lo ve la gente:" });
  });
});

describe("el aviso a quien lo publicó", () => {
  it("con el nombre de quien puso el cartel y el del evento; abre su ficha", () => {
    expect(avisoAlDueno({ nombre: "Ana", titulo: "Noche de danzón", href: "/eventos/noche-de-danzon", id: "e1", reemplazado: false })).toEqual({
      titulo: "Tu evento tiene cartel",
      cuerpo: "Ana le puso cartel a tu evento «Noche de danzón»",
      url: "/eventos/noche-de-danzon",
      tag: "cartel-e1",
    });
  });
  it("sin nombre, «Alguien»; un título largo se corta", () => {
    const aviso = avisoAlDueno({ nombre: "  ", titulo: "x".repeat(120), href: "/eventos/x", id: "e2", reemplazado: false });
    expect(aviso.cuerpo.startsWith("Alguien le puso cartel a tu evento «")).toBe(true);
    expect(aviso.cuerpo).toContain("…»");
  });
  it("la administración que lo cambia lo dice", () => {
    expect(avisoAlDueno({ nombre: "Admin", titulo: "Feleal", href: "/eventos/feleal", id: "e3", reemplazado: true }).cuerpo).toBe("Admin cambió el cartel de tu evento «Feleal»");
  });
});

describe("los «no» de la base", () => {
  it("cada código con su frase", () => {
    expect(mensajeDeError({ code: "23505" })).toEqual({ mensaje: "Alguien le acaba de poner cartel a ese evento.", yaTieneCartel: true });
    expect(mensajeDeError({ code: "42501" }).mensaje).toBe("Solo quien lo publicó puede cambiarlo.");
    expect(mensajeDeError({ code: "P0002" }).mensaje).toBe("Ese evento ya no está publicado.");
    expect(mensajeDeError({ code: "22023", message: "evento_pasado" }).mensaje).toBe("Ese evento ya pasó.");
    expect(mensajeDeError({ code: "08006" }).mensaje).toBe("No se pudo poner tu cartel. Intenta de nuevo.");
  });
});
