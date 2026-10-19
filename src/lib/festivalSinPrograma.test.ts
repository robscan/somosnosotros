import { describe, expect, it } from "vitest";
import type { EventoAgenda } from "./agenda";
import { esMarcoConPrograma, sinPuntoEnCalendario } from "./agendaPorClase";
import { festivalComoEvento, lineaDeFestivalSinPrograma, soloInteres } from "./claseEvento";
import { carrilEstaSemana, carrilFestivales } from "./inicio";
import { ocurrenciasDe, sinOcurrencias } from "./ocurrencias";
import { grupoDe } from "./series";

// OL-413 (bitácora 444): un festival sin programa (sin actos publicados) de pocos días se lista como un evento en todas las superficies; uno largo
// sin actos sigue como marco. Viernes 16 de octubre de 2026, 10:00 en San Luis Potosí.
const ahora = new Date("2026-10-16T16:00:00Z");
const ZONA = "America/Mexico_City";
const a = (dia: string, hora: string) => new Date(`${dia}T${hora}:00-06:00`).toISOString();
const evento = (id: string, cambios: Partial<EventoAgenda> = {}): EventoAgenda => ({ id, slug: id, titulo: id, inicio: a("2026-10-17", "20:00"), fin: null, zona: ZONA, imagen: null, precio: null, lugar_id: "lunaria", sitio_texto: null, sitio_reservado: false, lugar: { nombre: "Foro lunaria", portada: null }, creado_en: "2026-10-01T00:00:00Z", van: 0, ...cambios });

// Cumbiachella: una noche, de 8 pm a 2 am, sin actos.
const cumbiachella = evento("cumbiachella", { clase: "festival", inicio: a("2026-10-17", "20:00"), fin: a("2026-10-18", "02:00"), programa: { registrados: 0 } });
// Dos noches de jazz con la misma hora, sin actos.
const jazz = evento("jazz", { clase: "festival", inicio: a("2026-10-20", "20:00"), fin: a("2026-10-21", "23:00"), programa: { registrados: 0 } });
// Un festival de dos meses anunciado sin programa todavía, y uno con actos.
const largo = evento("largo", { clase: "festival", inicio: a("2026-10-10", "18:00"), fin: a("2026-12-10", "22:00"), programa: { registrados: 0 } });
const conActos = evento("con-actos", { clase: "festival", inicio: a("2026-10-17", "18:00"), fin: a("2026-10-19", "22:00"), programa: { registrados: 3 } });

describe("¿un festival sin programa va como evento?", () => {
  it("sí: una noche o pocos días sin actos publicados", () => {
    expect(festivalComoEvento(cumbiachella)).toBe(true);
    expect(festivalComoEvento(jazz)).toBe(true);
  });
  it("no: con actos, largo (más de 31 días), sin poder contar sus actos o si no es un festival", () => {
    expect(festivalComoEvento(conActos)).toBe(false);
    expect(festivalComoEvento(largo)).toBe(false);
    expect(festivalComoEvento({ ...cumbiachella, programa: undefined })).toBe(false);
    expect(festivalComoEvento({ ...cumbiachella, clase: "puntual" })).toBe(false);
  });
  it("lleva «Voy» como un evento; el marco y la exposición siguen con «Me interesa»", () => {
    expect(soloInteres("festival", festivalComoEvento(cumbiachella))).toBe(false);
    expect(soloInteres("festival", festivalComoEvento(conActos))).toBe(true);
    expect(soloInteres("exposicion")).toBe(true);
  });
  it("su línea bajo el título: su día y su hora (la noche que cruza la medianoche es un día) y su lugar; de varios días, sus días", () => {
    expect(lineaDeFestivalSinPrograma(cumbiachella, "Foro lunaria", ahora)).toBe("sáb 17 de oct · 8:00 pm–2:00 am · Foro lunaria");
    expect(lineaDeFestivalSinPrograma(jazz, "Foro lunaria", ahora)).toBe("Del 20 al 21 de oct · Foro lunaria");
  });
});

describe("en las listas", () => {
  it("tiene su día en la agenda (una ocurrencia por noche) y su punto en el calendario; el marco no", () => {
    expect(sinOcurrencias(cumbiachella)).toBe(false);
    expect(ocurrenciasDe(cumbiachella).map((o) => o.ocurrencia?.dia)).toEqual(["2026-10-17"]);
    expect(ocurrenciasDe(jazz).map((o) => o.ocurrencia?.dia)).toEqual(["2026-10-20", "2026-10-21"]);
    expect(sinOcurrencias(conActos)).toBe(true);
    expect(sinOcurrencias(largo)).toBe(true);
    expect(sinPuntoEnCalendario(cumbiachella)).toBe(false);
    expect(sinPuntoEnCalendario(conActos)).toBe(true);
    expect(esMarcoConPrograma(cumbiachella)).toBe(false);
    expect(esMarcoConPrograma(largo)).toBe(true);
  });
  it("en «Nuevos» va suelto (no es la tarjeta de un festival con actos nuevos)", () => {
    expect(grupoDe(cumbiachella, new Map())).toBeNull();
    expect(grupoDe(conActos, new Map())).toBe("festival:con-actos");
  });
  it("en Inicio sale solo en «Festivales y expos», no en «Esta semana» (OL-347: un festival, solo en su carril)", () => {
    const vistos = new Set<string>();
    expect(carrilEstaSemana([cumbiachella, evento("concierto")], vistos, ahora).map((e) => e.id)).toEqual(["concierto"]);
    expect(carrilFestivales([cumbiachella], vistos, ahora).map((e) => e.id)).toEqual(["cumbiachella"]);
  });
});
