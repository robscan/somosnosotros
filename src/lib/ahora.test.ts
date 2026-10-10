import { describe, expect, it } from "vitest";
import type { EventoAgenda } from "./agenda";
import { anilloDe, candidatosAhora, clasificarAhora, cuentaAtras, etiquetaAhora, metaAhora, rotuloCirculo, TOPE_AHORA, type EventoAhora } from "./ahora";

const ZONA = "America/Mexico_City"; // UTC−6: las 16:15 de San Luis son las 22:15Z
/** Un instante de San Luis Potosí: «2026-10-09 16:15» → Date. */
const sl = (dia: string, hora: string) => new Date(`${dia}T${hora}:00-06:00`);
const iso = (dia: string, hora: string) => sl(dia, hora).toISOString();

function ev(clave: string, dia: string, hora: string, cambios: Partial<EventoAhora> = {}): EventoAhora {
  return { clave, id: clave, href: `/eventos/${clave}`, titulo: clave, inicio: iso(dia, hora), fin: null, zona: ZONA, exposicion: false, cartel: null, sitio: "CEART", parte: null, destino: "CEART, San Luis Potosí", ...cambios };
}
const claves = (l: { e: EventoAhora }[]) => l.map((a) => a.e.clave);
const tipos = (l: { tipo: string }[]) => l.map((a) => a.tipo);

describe("clasificarAhora", () => {
  const viernes = [
    ev("dos-siglos", "2026-10-09", "10:00"),
    ev("caracolas", "2026-10-09", "17:30"),
    ev("trentina", "2026-10-09", "18:30"),
    ev("cancion", "2026-10-09", "19:00"),
    ev("desierto", "2026-10-09", "20:00"),
    ev("cactaceas", "2026-10-10", "09:00"),
  ];

  it("a las 18:00: Ahora, En un rato y Hoy, en ese orden; lo de las 10:00 ya terminó (3 h) y mañana no entra", () => {
    const l = clasificarAhora(viernes, sl("2026-10-09", "18:00"));
    expect(claves(l)).toEqual(["caracolas", "trentina", "cancion", "desierto"]);
    expect(tipos(l)).toEqual(["ahora", "rato", "rato", "hoy"]);
  });

  it("Ahora: con hora de fin, hasta su fin; sin ella, 3 h después de empezar", () => {
    const lab = ev("lab", "2026-10-09", "17:00", { fin: iso("2026-10-09", "17:30") });
    expect(claves(clasificarAhora([lab], sl("2026-10-09", "17:20")))).toEqual(["lab"]);
    expect(clasificarAhora([lab], sl("2026-10-09", "17:31"))).toEqual([]);
    const sinFin = ev("sin-fin", "2026-10-09", "10:00");
    expect(tipos(clasificarAhora([sinFin], sl("2026-10-09", "12:59")))).toEqual(["ahora"]);
    expect(clasificarAhora([sinFin], sl("2026-10-09", "13:00"))).toEqual([]);
  });

  it("En un rato: menos de 2 h; justo 2 h ya es Hoy", () => {
    const e = ev("e", "2026-10-09", "20:00");
    expect(tipos(clasificarAhora([e], sl("2026-10-09", "18:01")))).toEqual(["rato"]);
    expect(tipos(clasificarAhora([e], sl("2026-10-09", "18:00")))).toEqual(["hoy"]);
  });

  it("Mañana: solo si ya no queda nada hoy o desde las 20:00", () => {
    const hoy = ev("hoy", "2026-10-09", "21:00");
    const manana = ev("manana", "2026-10-10", "09:00");
    expect(claves(clasificarAhora([hoy, manana], sl("2026-10-09", "19:59")))).toEqual(["hoy"]);
    expect(claves(clasificarAhora([hoy, manana], sl("2026-10-09", "20:00")))).toEqual(["hoy", "manana"]);
    expect(tipos(clasificarAhora([manana], sl("2026-10-09", "15:00")))).toEqual(["manana"]);
    // Pasado mañana nunca.
    expect(clasificarAhora([ev("lejos", "2026-10-11", "09:00")], sl("2026-10-09", "22:00"))).toEqual([]);
  });

  it("exposiciones: el día que inaugura o el último, hasta las 18:00 sin horario o hasta el cierre de su franja de hoy", () => {
    const cierra = ev("agua", "2026-09-01", "10:00", { exposicion: true, fin: iso("2026-11-01", "23:59") });
    expect(tipos(clasificarAhora([cierra], sl("2026-11-01", "12:00")))).toEqual(["expo"]);
    expect(clasificarAhora([cierra], sl("2026-11-01", "18:00"))).toEqual([]);
    expect(clasificarAhora([cierra], sl("2026-10-31", "12:00"))).toEqual([]); // un día cualquiera de la exposición, no
    // Domingo (7) abre hasta las 20:00.
    const conHorario = { ...cierra, horario: [{ dias: [6, 7], abre: "10:00", cierra: "20:00" }] };
    expect(tipos(clasificarAhora([conHorario], sl("2026-11-01", "19:00")))).toEqual(["expo"]);
    const abre = ev("abre", "2026-10-09", "19:00", { exposicion: true, fin: iso("2026-12-01", "18:00") });
    expect(etiquetaAhora(clasificarAhora([abre], sl("2026-10-09", "11:00"))[0], sl("2026-10-09", "11:00"))).toBe("Inaugura hoy");
    expect(etiquetaAhora(clasificarAhora([cierra], sl("2026-11-01", "11:00"))[0], sl("2026-11-01", "11:00"))).toBe("Último día");
  });

  it("orden: Ahora · En un rato · exposición · Hoy · Mañana, y por hora dentro de cada grupo", () => {
    const lista = [
      ev("manana", "2026-10-10", "09:00"),
      ev("hoy-b", "2026-10-09", "22:30"),
      ev("hoy-a", "2026-10-09", "22:00"),
      ev("expo", "2026-10-09", "10:00", { exposicion: true, fin: iso("2026-12-01", "18:00"), horario: [{ dias: [5], abre: "10:00", cierra: "21:00" }] }),
      ev("rato", "2026-10-09", "20:30"),
      ev("ahora", "2026-10-09", "19:00"),
    ];
    expect(tipos(clasificarAhora(lista, sl("2026-10-09", "20:00")))).toEqual(["ahora", "rato", "expo", "hoy", "hoy", "manana"]);
    expect(claves(clasificarAhora(lista, sl("2026-10-09", "20:00")))).toEqual(["ahora", "rato", "expo", "hoy-a", "hoy-b", "manana"]);
  });

  it(`tope de ${TOPE_AHORA}`, () => {
    const muchos = Array.from({ length: 12 }, (_, i) => ev(`e${i}`, "2026-10-09", `${String(12 + (i % 10)).padStart(2, "0")}:${i < 10 ? "00" : "30"}`));
    expect(clasificarAhora(muchos, sl("2026-10-09", "11:00"))).toHaveLength(TOPE_AHORA);
  });

  it("cada evento en su zona: a la misma hora del mundo, lo de Madrid es de su propio día", () => {
    const madrid = { ...ev("madrid", "2026-10-09", "12:00"), zona: "Europe/Madrid", inicio: "2026-10-10T07:00:00Z" }; // 09:00 del sábado en Madrid
    // Son las 23:00 del viernes en San Luis = 07:00 del sábado en Madrid... un poco antes: 06:00Z = 08:00 en Madrid, «En 1 h».
    const l = clasificarAhora([madrid], new Date("2026-10-10T06:00:00Z"));
    expect(tipos(l)).toEqual(["rato"]);
  });
});

describe("textos", () => {
  const a = sl("2026-10-09", "16:15");
  it("cuenta atrás al minuto de arriba", () => {
    expect(cuentaAtras(iso("2026-10-09", "16:45"), a)).toBe("En 30 min");
    expect(cuentaAtras(iso("2026-10-09", "17:15"), a)).toBe("En 1 h");
    expect(cuentaAtras(iso("2026-10-09", "17:30"), a)).toBe("En 1 h 15 min");
    expect(cuentaAtras(iso("2026-10-09", "16:45"), new Date(a.getTime() + 30_000))).toBe("En 30 min");
  });
  it("rótulo del círculo y línea de la historia", () => {
    const ahora = { tipo: "ahora" as const, e: ev("x", "2026-10-09", "15:30") };
    expect(rotuloCirculo(ahora, a)).toBe("Ahora");
    expect(metaAhora(ahora)).toBe("Desde 15:30 · CEART");
    expect(metaAhora({ ...ahora, e: { ...ahora.e, fin: iso("2026-10-09", "20:00"), parte: "Sesión 1 de 4" } })).toBe("Hasta 20:00 · CEART · Sesión 1 de 4");
    expect(rotuloCirculo({ tipo: "rato", e: ev("y", "2026-10-09", "16:45") }, a)).toBe("En 30 min");
    expect(rotuloCirculo({ tipo: "hoy", e: ev("z", "2026-10-09", "20:00") }, a)).toBe("20:00");
    expect(rotuloCirculo({ tipo: "manana", e: ev("m", "2026-10-10", "09:00") }, a)).toBe("Mañana 09:00");
  });
  it("anillo", () => {
    expect([anilloDe("ahora", false), anilloDe("rato", false), anilloDe("expo", false), anilloDe("hoy", false), anilloDe("manana", false), anilloDe("ahora", true)]).toEqual(["ahora", "pronto", "pronto", "resto", "resto", "visto"]);
  });
});

describe("candidatosAhora", () => {
  const base = { slug: null, imagen: null, precio: null, lugar_id: "l", sitio_texto: null, sitio_direccion: null, sitio_reservado: false, zona: ZONA, lugar: { nombre: "CEART", portada: "p.webp" }, creado_en: "2026-09-01T00:00:00Z", van: 0 };
  const e = (id: string, cambios: Partial<EventoAgenda>): EventoAgenda => ({ ...base, id, titulo: id, inicio: iso("2026-10-09", "19:00"), fin: null, ...cambios }) as EventoAgenda;
  const ahora = sl("2026-10-09", "16:00");

  it("los actos de un festival sí, el festival entero nunca", () => {
    const l = candidatosAhora([e("festival", { clase: "festival" }), e("acto", { evento_padre_id: "festival" })], "San Luis Potosí", ahora);
    expect(l.map((x) => x.id)).toEqual(["acto"]);
  });
  it("el cartel es la imagen del evento, nunca la foto del lugar; sitio reservado sin destino", () => {
    const [sin, con, reservado] = candidatosAhora([e("sin", {}), e("con", { imagen: "c.webp" }), e("reservado", { sitio_reservado: true, lugar: null, sitio_texto: "Casa" })], "San Luis Potosí", ahora);
    expect([sin.cartel, con.cartel]).toEqual([null, "c.webp"]);
    expect(sin.destino).toBe("CEART, San Luis Potosí");
    expect(reservado.destino).toBeNull();
  });
  it("lo que ya terminó o empieza en más de 2 días no viaja; cada día de un taller va con su clave y su parte", () => {
    const taller = e("taller", { inicio: iso("2026-10-09", "17:00"), fin: iso("2026-10-16", "19:00"), sesiones: [
      { inicio: iso("2026-10-08", "17:00"), fin: iso("2026-10-08", "19:00") },
      { inicio: iso("2026-10-09", "17:00"), fin: iso("2026-10-09", "19:00") },
      { inicio: iso("2026-10-16", "17:00"), fin: iso("2026-10-16", "19:00") },
    ] } as Partial<EventoAgenda>);
    const l = candidatosAhora([taller, e("viejo", { inicio: iso("2026-10-09", "09:00") })], "San Luis Potosí", ahora);
    expect(l.map((x) => [x.clave, x.parte])).toEqual([["taller:2026-10-09", "Sesión 2 de 3"]]);
  });
  it("exposición: solo si inaugura o cierra en los próximos días", () => {
    const l = candidatosAhora([e("cierra", { clase: "exposicion", inicio: iso("2026-09-01", "10:00"), fin: iso("2026-10-10", "18:00") }), e("lejos", { clase: "exposicion", inicio: iso("2026-09-01", "10:00"), fin: iso("2026-12-10", "18:00") })], "San Luis Potosí", ahora);
    expect(l.map((x) => [x.clave, x.exposicion])).toEqual([["cierra", true]]);
  });
});
