import { describe, expect, it } from "vitest";
import type { EventoAgenda } from "./agenda";
import { cuandoDePeriodo } from "./claseEvento";
import { cuandoDeTarjeta } from "./destacados";
import { cabezaDeBloque, eventosDeFicha, lineaParaVisitar, primeroDeFicha, type PiezaFicha } from "./eventosFicha";
import { textoDePeriodo } from "./fechas";
import { textoProximo } from "./lugares";
import { textoParte } from "./ocurrencias";
import { cuandoEnInicio } from "./tarjetaInicio";

// Miércoles 14 de octubre de 2026, 12:00 en San Luis Potosí (la tarde en que el founder firmó OL-409): la ficha de Cinema 7B del prototipo.
const ahora = new Date("2026-10-14T18:00:00Z");
const ZONA = "America/Mexico_City";
const a = (dia: string, hora: string) => new Date(`${dia}T${hora}:00-06:00`).toISOString();
const sesion = (dia: string, desde: string, hasta: string) => ({ inicio: a(dia, desde), fin: a(dia, hasta) });

function evento(id: string, cambios: Partial<EventoAgenda> = {}): EventoAgenda {
  return { id, slug: id, titulo: id, inicio: a("2026-10-14", "20:00"), fin: null, zona: ZONA, imagen: null, precio: null, lugar_id: "cinema", sitio_texto: null, sitio_reservado: false, lugar: { nombre: "Cinema 7B", portada: null }, creado_en: "2026-10-01T00:00:00Z", van: 0, ...cambios };
}
/** Un acto con sus funciones (su horario por día): empieza con la primera y termina con la última. */
const acto = (id: string, padre: string, sesiones: { inicio: string; fin: string }[], cambios: Partial<EventoAgenda> = {}) => evento(id, { evento_padre_id: padre, inicio: sesiones[0].inicio, fin: sesiones[sesiones.length - 1].fin, sesiones, ...cambios });

// La cartelera (del 12 al 17, en curso) y sus actos con funciones en distintos días; CINEMA (del 29 de sep al 24 de oct) con una función aquí el 16.
const cartelera = evento("cartelera", { clase: "festival", titulo: "Cartelera de Cinema 7B", inicio: a("2026-10-12", "17:30"), fin: a("2026-10-17", "22:30"), programa: { registrados: 3 } });
const arrebato = acto("arrebato", "cartelera", [sesion("2026-10-12", "17:30", "19:20"), sesion("2026-10-14", "21:00", "22:50"), sesion("2026-10-16", "17:30", "19:20")], { precio: "$70" });
const spider = acto("spider", "cartelera", [sesion("2026-10-12", "20:00", "22:00"), sesion("2026-10-13", "17:00", "19:00"), sesion("2026-10-15", "17:00", "19:00")]);
const demon = acto("demon", "cartelera", [sesion("2026-10-14", "19:50", "22:00"), sesion("2026-10-17", "17:00", "19:10")]);
const cinemaXV = evento("cinema-xv", { clase: "festival", titulo: "CINEMA: XV Festival", inicio: a("2026-09-29", "18:00"), fin: a("2026-10-24", "20:00"), lugar_id: "otro", programa: { registrados: 3 } });
const paramo = evento("paramo", { evento_padre_id: "cinema-xv", inicio: a("2026-10-16", "18:00"), fin: a("2026-10-16", "20:00") });
// Un festival que ya no tiene funciones aquí por venir (la de aquí fue el 13) y uno de este lugar sin actos todavía.
const viejo = evento("viejo", { clase: "festival", titulo: "Ciclo pasado", inicio: a("2026-10-01", "18:00"), fin: a("2026-10-30", "20:00"), lugar_id: "otro", programa: { registrados: 2 } });
const porConfirmar = evento("por-confirmar", { clase: "festival", titulo: "Muestra de otoño", inicio: a("2026-10-20", "18:00"), fin: a("2026-10-25", "20:00"), programa: { registrados: 0 } });
// Un taller con tres sesiones y una exposición abierta (martes a domingo, 17:00–22:00) hasta el 8 de noviembre; otra que abre el 20.
const taller = evento("taller", { clase: "taller", titulo: "Taller de guion", inicio: a("2026-10-20", "18:00"), fin: a("2026-10-27", "20:00"), sesiones: [sesion("2026-10-20", "18:00", "20:00"), sesion("2026-10-22", "18:00", "20:00"), sesion("2026-10-27", "18:00", "20:00")] });
const fotogramas = evento("fotogramas", { clase: "exposicion", titulo: "Fotogramas", inicio: a("2026-10-05", "00:00"), fin: a("2026-11-08", "23:59"), horario: [{ dias: [2, 3, 4, 5, 6, 7], abre: "17:00", cierra: "22:00" }] });
const proxima = evento("proxima", { clase: "exposicion", titulo: "Próxima", inicio: a("2026-10-20", "00:00"), fin: a("2026-11-30", "23:59"), horario: [] });

const FICHA = [fotogramas, proxima, cartelera, arrebato, spider, demon, paramo, taller, porConfirmar];
const MARCOS = [cinemaXV, viejo];
const f = eventosDeFicha(FICHA, MARCOS, ahora);
const dia = (clave: string) => f.dias.find((g) => g.clave === clave);
const bloque = (p: PiezaFicha | undefined) => (p?.tipo === "festival" ? p : null);

describe("F · el festival en la ficha va en bloque, por su siguiente función aquí (OL-410)", () => {
  it("el bloque de la cartelera va hoy, con todas sus funciones aquí por venir y en orden; ninguna función sale suelta", () => {
    expect(f.dias[0].titulo).toBe("Hoy");
    const b = bloque(f.dias[0].eventos[0]);
    expect(b?.marco.id).toBe("cartelera");
    expect(b?.funciones.map((e) => `${e.id}@${e.inicio}`)).toEqual([
      `demon@${a("2026-10-14", "19:50")}`,
      `arrebato@${a("2026-10-14", "21:00")}`,
      `spider@${a("2026-10-15", "17:00")}`,
      `arrebato@${a("2026-10-16", "17:30")}`,
      `demon@${a("2026-10-17", "17:00")}`,
    ]);
    const sueltos = f.dias.flatMap((g) => g.eventos).filter((p) => p.tipo === "renglon").map((p) => (p.tipo === "renglon" ? p.evento.id : ""));
    expect(sueltos).not.toContain("arrebato");
    expect(sueltos).not.toContain("cartelera");
  });
  it("CINEMA (empezó el 29 de sep, marco de otra ficha) va el 16, el día de su función aquí; nunca bajo su primer día", () => {
    expect(bloque(dia("2026-10-16")?.eventos[0])?.marco.id).toBe("cinema-xv");
    expect(f.dias.some((g) => g.clave < "2026-10-14")).toBe(false);
  });
  it("sin funciones por venir aquí, el festival no sale (lo pasado está en el Historial)", () => {
    const conPasada = eventosDeFicha([evento("vieja-funcion", { evento_padre_id: "viejo", inicio: a("2026-10-13", "18:00"), fin: a("2026-10-13", "20:00") })].filter((e) => Date.parse(e.fin!) > ahora.getTime()), [viejo], ahora);
    expect(conPasada.dias).toEqual([]);
    expect(f.dias.flatMap((g) => g.eventos).some((p) => p.tipo === "festival" && p.marco.id === "viejo")).toBe(false);
  });
  it("un festival de la ficha sin actos todavía es solo su cabecera, por su primer día; con actos pero ninguno aquí, no sale", () => {
    const b = bloque(dia("2026-10-20")?.eventos.find((p) => p.tipo === "festival"));
    expect(b?.marco.id).toBe("por-confirmar");
    expect(b?.funciones).toEqual([]);
    expect(eventosDeFicha([{ ...porConfirmar, programa: { registrados: 4 } }], [], ahora).dias).toEqual([]);
  });
  it("un acto cuyo festival no se cargó es un renglón más", () => {
    const solo = eventosDeFicha([evento("huerfano", { evento_padre_id: "nadie", inicio: a("2026-10-15", "20:00") })], [], ahora);
    expect(solo.dias[0].eventos[0]).toMatchObject({ tipo: "renglon", evento: { id: "huerfano" } });
  });
  it("la cabecera dice su cuándo y cuántas funciones tiene aquí (o suyas, en un artista)", () => {
    expect(cabezaDeBloque(cartelera, 7, "lugar", ahora)).toBe("Hasta el sáb 17 de oct · 7 funciones aquí");
    expect(cabezaDeBloque(cartelera, 1, "artista", ahora)).toBe("Hasta el sáb 17 de oct · 1 función suya");
    expect(cabezaDeBloque(porConfirmar, 0, "lugar", ahora)).toBe("Del 20 al 25 de oct · Programa por confirmar");
  });
});

describe("S · cada función y cada sesión con su hora, en su día (OL-410)", () => {
  it("el taller sale en cada sesión que viene, con «Sesión n de N»", () => {
    const sesiones = f.dias.flatMap((g) => g.eventos.filter((p) => p.tipo === "renglon" && p.evento.id === "taller").map((p) => (p.tipo === "renglon" ? [g.clave, textoParte(p.evento)] : [])));
    expect(sesiones).toEqual([
      ["2026-10-20", "Sesión 1 de 3"],
      ["2026-10-22", "Sesión 2 de 3"],
      ["2026-10-27", "Sesión 3 de 3"],
    ]);
  });
  it("cada función lleva su inicio y su fin de ese día (nunca el primer inicio con el último fin) y no dice «Día n de N»", () => {
    const funcion = bloque(f.dias[0].eventos[0])!.funciones[1];
    expect([funcion.inicio, funcion.fin]).toEqual([a("2026-10-14", "21:00"), a("2026-10-14", "22:50")]);
    expect(textoParte(funcion)).toBeNull();
  });
  it("lo que se cuenta es lo que se lista: renglones, funciones, la cabecera sola y las exposiciones", () => {
    // 2 exposiciones + 5 funciones de la cartelera + 1 de CINEMA + 3 sesiones del taller + la cabecera de «Muestra de otoño».
    expect(f.cuenta).toBe(12);
    expect(eventosDeFicha([], [], ahora)).toEqual({ visitar: [], dias: [], cuenta: 0 });
    expect(primeroDeFicha(f)?.id).toBe("demon");
  });
});

describe("E · las exposiciones en «Para visitar», sin Voy (OL-410)", () => {
  it("van arriba de los días, la abierta primero, y no en ningún día", () => {
    expect(f.visitar.map((e) => e.id)).toEqual(["fotogramas", "proxima"]);
    expect(f.dias.flatMap((g) => g.eventos).some((p) => p.tipo === "renglon" && p.evento.clase === "exposicion")).toBe(false);
  });
  it("abierta: sus horas de hoy con el reloj y hasta cuándo; nunca «00:00»", () => {
    expect(lineaParaVisitar(fotogramas, ahora)).toEqual({ cuando: "Abre 17:00–22:00", horas: true, nota: "hasta el dom 8 de nov" }); // en 24 h, como las horas de los renglones
    expect(lineaParaVisitar({ ...fotogramas, horario: [] }, ahora)).toEqual({ cuando: "Horario por confirmar", horas: true, nota: "hasta el dom 8 de nov" });
    expect(lineaParaVisitar(fotogramas, new Date("2026-10-19T18:00:00Z")).cuando).toBe("Hoy cierra"); // lunes
  });
  it("por abrir: sus días, con el calendario", () => {
    expect(lineaParaVisitar(proxima, ahora)).toEqual({ cuando: "Del 20 de oct al 30 de nov", horas: false, nota: null });
  });
});

describe("U · una sola regla para el cuándo de un festival y una exposición (OL-409)", () => {
  it("en curso «Hasta el …», por venir «Del … al …», de un día, ese día", () => {
    expect(textoDePeriodo("2026-10-12", "2026-10-17", ahora, ZONA)).toBe("Hasta el sáb 17 de oct");
    expect(textoDePeriodo("2026-10-20", "2026-10-25", ahora, ZONA)).toBe("Del 20 al 25 de oct");
    expect(textoDePeriodo("2026-10-14", "2026-10-17", ahora, ZONA)).toBe("Hasta el sáb 17 de oct"); // empieza hoy: ya es uno de sus días
    expect(textoDePeriodo("2026-11-12", "2026-11-12", ahora, ZONA)).toBe("jue 12 de nov");
  });
  it("la misma en la tarjeta, Inicio, el renglón del lugar y la ficha (`cuandoDePeriodo`)", () => {
    for (const e of [cartelera, cinemaXV, fotogramas]) {
      const regla = cuandoDePeriodo(e, ahora);
      expect(cuandoDeTarjeta(e, ahora)).toBe(regla);
      expect(cuandoEnInicio(e, false, ahora)).toBe(regla);
      expect(textoProximo({ inicio: e.inicio, fin: e.fin, zona: e.zona, clase: e.clase }, ahora)).toMatch(new RegExp(`${regla.charAt(0).toLowerCase()}${regla.slice(1)}$`));
    }
    expect(cuandoDePeriodo(cinemaXV, ahora)).toBe("Hasta el sáb 24 de oct");
    expect(cuandoDePeriodo(porConfirmar, ahora)).toBe("Del 20 al 25 de oct");
  });
  it("el festival termina en su último acto: un fin a la medianoche es el día anterior", () => {
    expect(cuandoDePeriodo({ ...cartelera, fin: a("2026-10-18", "00:00") }, ahora)).toBe("Hasta el sáb 17 de oct");
  });
});
