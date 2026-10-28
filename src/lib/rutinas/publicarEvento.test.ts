import { describe, expect, it } from "vitest";
import { SIN_PARAMETROS } from "../ciudadParametros";
import { localAIso } from "../fechas";
import { baseFalsa, type Fila } from "./baseFalsa";
import { fichasDeArtistas, insertarEvento, ligarFicha, prepararEvento, type CiudadDeEvento, type LugarDeCiudad } from "./publicarEvento";

const AHORA = new Date("2026-10-21T16:00:00Z");
const ZONA = "America/Mexico_City";
const ADMIN = "00000000-0000-4000-8000-0000000000ad";
const PAZ = "00000000-0000-4000-8000-00000000a002";
const SLP: CiudadDeEvento = { slug: "san-luis-potosi", nombre: "San Luis Potosí", alias: ["Soledad de Graciano Sánchez"], lat: 22.1497, lng: -100.9764, zona: ZONA, radioKm: 15, parametros: SIN_PARAMETROS };
const LUGARES: LugarDeCiudad[] = [{ id: PAZ, nombre: "Teatro de la Paz", ciudad: "San Luis Potosí", zona: ZONA, direccion: "Villerías 205" }];
const AGENDA = "https://d3dac9gdq8t83x.cloudfront.net/media/archivos/oct_2026.pdf";
const datos = (cambios: Record<string, unknown> = {}) => ({
  titulo: "Recital de guitarra",
  inicio: localAIso("2026-10-25T18:00", ZONA),
  lugar: "Teatro de la Paz",
  precio: "Gratis",
  descripcion: "Un recital de guitarra clásica con alumnos del conservatorio.",
  url: AGENDA,
  ...cambios,
});

/** Mapbox falso: «Plaza de Armas» por nombre y «Jardín Hidalgo» por dirección dentro de San Luis; «Foro Fantasma» no existe; algo lejos, fuera. */
const mapbox = {
  token: "t",
  pedir: (async (url: string) => {
    const u = new URL(url);
    const q = u.searchParams.get("q") ?? "";
    if (u.pathname.includes("/searchbox/v1/suggest")) return Response.json({ suggestions: q === "Plaza de Armas" ? [{ mapbox_id: "plaza", name: "Plaza de Armas" }] : q === "Teatro en Querétaro" ? [{ mapbox_id: "lejos", name: "Teatro en Querétaro" }] : [] });
    if (u.pathname.includes("/retrieve/plaza")) return Response.json({ features: [{ geometry: { coordinates: [-100.9755, 22.1518] }, properties: { full_address: "Jardín Hidalgo s/n, Centro, San Luis Potosí" } }] });
    if (u.pathname.includes("/retrieve/lejos")) return Response.json({ features: [{ geometry: { coordinates: [-100.39, 20.59] }, properties: { full_address: "Querétaro" } }] });
    return Response.json({ features: [] });
  }) as typeof fetch,
};

function mundo(eventos: Fila[] = [], parecidos: unknown[] = []) {
  return baseFalsa({ eventos, propuestas: [{ id: "p1", estado: "aceptada", ficha_id: null }] }, { eventos_parecidos: () => parecidos });
}

describe("publicar un evento aceptado (OL-429)", () => {
  it("en un lugar registrado: lo que mandaría el formulario, con su procedencia y sin sesión (sin avisos)", async () => {
    const base = mundo();
    const r = await prepararEvento({ db: base.db, mapbox, ahora: AHORA }, datos(), SLP, LUGARES, ADMIN);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fila).toMatchObject({
      lugar_id: PAZ,
      sitio_texto: null,
      titulo: "Recital de guitarra",
      inicio: localAIso("2026-10-25T18:00", ZONA),
      precio: null, // gratis
      enlace: AGENDA,
      ciudad: "San Luis Potosí",
      creado_por: ADMIN,
      origen: "rutina-agendas",
      fuente_url: AGENDA,
      zona: ZONA,
    });
    expect(r.fila).not.toHaveProperty("privado");
    const creado = await insertarEvento(base.db, r.fila);
    expect(creado?.id).toBeTruthy();
    expect(await ligarFicha(base.db, "p1", creado!.id)).toBe(true);
    expect(base.tablas.propuestas[0].ficha_id).toBe(creado!.id);
    // La segunda vez ya no liga: la propuesta ya tiene su evento.
    expect(await ligarFicha(base.db, "p1", "otro")).toBe(false);
    // «¿Es este?» se preguntó con lo que se iba a publicar.
    expect(base.operaciones.find((o) => o.op === "rpc")?.valores).toMatchObject({ p_titulo: "Recital de guitarra", p_lugar_id: PAZ, p_sitio_texto: null, p_zona: ZONA });
  });

  it("en un sitio que no está en el directorio: con su punto de Mapbox dentro de la ciudad; la cooperación va en su casilla", async () => {
    const base = mundo();
    const r = await prepararEvento({ db: base.db, mapbox, ahora: AHORA }, datos({ lugar: "Plaza de Armas", precio: "Cooperación voluntaria", fin: localAIso("2026-10-25T21:00", ZONA) }), SLP, LUGARES, ADMIN);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fila).toMatchObject({ lugar_id: null, sitio_texto: "Plaza de Armas", sitio_lat: 22.1518, sitio_lng: -100.9755, sitio_direccion: "Jardín Hidalgo s/n, Centro, San Luis Potosí", precio: "Cooperación solidaria", fin: localAIso("2026-10-25T21:00", ZONA) });
  });

  it("sin punto en la ciudad (o fuera de ella, o sin Mapbox) no se publica, y la bandeja lo dice en una frase", async () => {
    const base = mundo();
    for (const [lugar, m] of [["Foro Fantasma", mapbox], ["Teatro en Querétaro", mapbox], ["Plaza de Armas", null]] as const) {
      const r = await prepararEvento({ db: base.db, mapbox: m, ahora: AHORA }, datos({ lugar }), SLP, LUGARES, ADMIN);
      expect(r).toEqual({ ok: false, motivo: "sin_punto", error: `No se publicó: «${lugar}» no está en el directorio y el mapa no lo encuentra en San Luis Potosí. Recházala o da de alta el lugar.` });
    }
    expect(base.tablas.eventos).toHaveLength(0);
  });

  it("lo que ya está (parecido o el mismo título a la misma hora), lo que ya pasó o lo que no se entiende, no se publica", async () => {
    const parecido = await prepararEvento({ db: mundo([], [{ titulo: "Recital de Guitarra Clásica" }]).db, mapbox, ahora: AHORA }, datos(), SLP, LUGARES, ADMIN);
    expect(parecido).toEqual({ ok: false, motivo: "parecido", error: "Ya está «Recital de Guitarra Clásica» ese día en ese sitio: recházala como duplicado." });
    const misma = mundo([{ id: "e1", titulo: "RECITAL de guitarra", inicio: localAIso("2026-10-25T18:00", ZONA), ciudad: "San Luis Potosí" }]);
    expect(await prepararEvento({ db: misma.db, mapbox, ahora: AHORA }, datos(), SLP, LUGARES, ADMIN)).toMatchObject({ ok: false, motivo: "parecido" });
    expect(await prepararEvento({ db: mundo().db, mapbox, ahora: AHORA }, datos({ inicio: localAIso("2026-10-20T18:00", ZONA) }), SLP, LUGARES, ADMIN)).toMatchObject({ ok: false, motivo: "pasado" });
    expect(await prepararEvento({ db: mundo().db, mapbox, ahora: AHORA }, datos({ inicio: "mañana" }), SLP, LUGARES, ADMIN)).toMatchObject({ ok: false, motivo: "invalido" });
    expect(await prepararEvento({ db: mundo().db, mapbox, ahora: AHORA }, datos({ precio: "Desde $150" }), SLP, LUGARES, ADMIN)).toMatchObject({ ok: true });
    const caida = mundo();
    caida.fallar("eventos_parecidos", "rpc");
    expect(await prepararEvento({ db: caida.db, mapbox, ahora: AHORA }, datos(), SLP, LUGARES, ADMIN)).toMatchObject({ ok: false, motivo: "base" });
  });
});

describe("publicar con su forma (OL-433)", () => {
  const MRP = "00000000-0000-4000-8000-00000000a004";
  const CON_MUSEO: LugarDeCiudad[] = [...LUGARES, { id: MRP, nombre: "Museo Regional Potosino", ciudad: "San Luis Potosí", zona: ZONA, direccion: "Galeana 450" }];
  const FESTIVAL_P = "00000000-0000-4000-8000-0000000fe571";
  const XANTOLO = "00000000-0000-4000-8000-00000000f001";
  const dep = (db: ReturnType<typeof mundo>["db"]) => ({ db, mapbox, ahora: AHORA });

  it("la base toma por parecidas dos inauguraciones distintas del mismo día en el mismo museo; la regla de la rutina, no: se publica", async () => {
    const base = mundo([], [{ titulo: "Inauguración: Ecos del agua" }]);
    const r = await prepararEvento(dep(base.db), datos({ titulo: "Inauguración: Raíces", lugar: "Museo Regional Potosino" }), SLP, CON_MUSEO, ADMIN);
    expect(r.ok).toBe(true);
    // Y lo que sí es la misma función se sigue frenando.
    const igual = await prepararEvento(dep(mundo([], [{ titulo: "Inauguración: Raíces (exposición colectiva)" }]).db), datos({ titulo: "Inauguración: Raíces", lugar: "Museo Regional Potosino" }), SLP, CON_MUSEO, ADMIN);
    expect(igual).toMatchObject({ ok: false, motivo: "parecido" });
  });

  it("un acto cuyo festival propuesto se rechazó se publica suelto; uno cuyo festival registrado dejó de serlo, también", async () => {
    const base = baseFalsa(
      { eventos: [{ id: XANTOLO, titulo: "Xantolo 2026", clase: "puntual" }], propuestas: [{ id: FESTIVAL_P, estado: "rechazada", datos: { clase: "festival", titulo: "Otoño Sonoro", actos: 1 } }] },
      { eventos_parecidos: () => [] },
    );
    const acto = await prepararEvento(dep(base.db), datos({ marco_propuesto: FESTIVAL_P, programa: "Otoño Sonoro", clase: "puntual" }), SLP, LUGARES, ADMIN);
    expect(acto.ok && !acto.espera && acto.fila.evento_padre_id === undefined).toBe(true);
    const deXantolo = await prepararEvento(dep(base.db), datos({ marco: { id: XANTOLO, titulo: "Xantolo 2026" } }), SLP, LUGARES, ADMIN);
    expect(deXantolo.ok && deXantolo.fila.evento_padre_id === undefined).toBe(true);
  });

  it("el festival propuesto que ya está registrado en esas fechas no se publica dos veces", async () => {
    const base = baseFalsa(
      { eventos: [{ id: XANTOLO, titulo: "XANTOLO", clase: "festival", inicio: localAIso("2026-10-23T10:00", ZONA), termina: localAIso("2026-11-02T22:00", ZONA), ciudad: "San Luis Potosí" }] },
      { eventos_parecidos: () => [] },
    );
    const r = await prepararEvento(dep(base.db), datos({ titulo: "Xantolo 2026", clase: "festival", actos: 3, inicio: localAIso("2026-10-25T19:00", ZONA), termina: localAIso("2026-11-01T22:00", ZONA), lugar: "Plaza de Armas" }), SLP, LUGARES, ADMIN);
    expect(r).toEqual({ ok: false, motivo: "parecido", error: "Ya está el festival «XANTOLO» en esas fechas: recházala como duplicado." });
  });

  it("la exposición que ya está en el museo no se duplica: se le liga la inauguración", async () => {
    const expo = { id: "e-raices", titulo: "Raíces", clase: "exposicion", lugar_id: MRP, sitio_texto: null, inaugura_id: null, inicio: localAIso("2026-10-22T00:00", ZONA), termina: localAIso("2026-11-30T23:59", ZONA), ciudad: "San Luis Potosí" };
    const base = baseFalsa({ eventos: [expo] }, { eventos_parecidos: () => [] });
    const r = await prepararEvento(dep(base.db), datos({ titulo: "Inauguración: Raíces", lugar: "Museo Regional Potosino", clase: "exposicion", termina: localAIso("2026-11-30T23:59", ZONA), exposicion: "Raíces" }), SLP, CON_MUSEO, ADMIN);
    if (!r.ok) throw new Error(r.error);
    const creado = await insertarEvento(base.db, r.fila);
    expect(base.tablas.eventos.filter((e) => e.clase === "exposicion")).toHaveLength(1);
    expect(base.tablas.eventos.find((e) => e.id === "e-raices")?.inaugura_id).toBe(creado!.id);
  });

  it("si las sesiones de un taller no se pueden guardar, no queda el evento a medias; un taller a medias se publica con las sesiones que quedan", async () => {
    const sesiones = ["20", "22", "24"].map((d) => ({ inicio: localAIso(`2026-10-${d}T17:00`, ZONA), fin: localAIso(`2026-10-${d}T19:00`, ZONA) }));
    const taller = datos({ titulo: "Taller de grabado", clase: "taller", inicio: sesiones[0].inicio, fin: sesiones[0].fin, sesiones, precio: "$300" });
    const base = mundo();
    const r = await prepararEvento(dep(base.db), taller, SLP, LUGARES, ADMIN);
    if (!r.ok) throw new Error(r.error);
    // La del 20 ya pasó: quedan dos, del 22 al 24.
    expect(r.fila).toMatchObject({ clase: "taller", inicio: localAIso("2026-10-22T17:00", ZONA), fin: localAIso("2026-10-24T19:00", ZONA) });
    base.fallar("eventos_sesiones", "insert");
    expect(await insertarEvento(base.db, r.fila)).toBeNull();
    expect(base.tablas.eventos).toHaveLength(0);
    // Todas pasadas: ya pasó.
    const pasadas = sesiones.map((s) => ({ ...s, inicio: localAIso("2026-10-19T17:00", ZONA), fin: null }));
    expect(await prepararEvento(dep(mundo().db), datos({ clase: "taller", sesiones: pasadas }), SLP, LUGARES, ADMIN)).toMatchObject({ ok: false, motivo: "pasado" });
  });
});

describe("el costo que no es cifra se publica «Por confirmar» (OL-441)", () => {
  const MUSEO = "00000000-0000-4000-8000-00000000a005";
  const CON_MUSEO: LugarDeCiudad[] = [...LUGARES, { id: MUSEO, nombre: "Museo Regional Potosino", ciudad: "San Luis Potosí", zona: ZONA, direccion: "Galeana 450" }];
  const XANTOLO = "00000000-0000-4000-8000-00000000f001";
  const dep = (db: ReturnType<typeof mundo>["db"]) => ({ db, mapbox, ahora: AHORA });
  const altar = (cambios: Record<string, unknown> = {}) =>
    datos({ titulo: "Altar vivo, instalación inmersiva", lugar: "Museo Regional Potosino", clase: "puntual", precio: "Entrada con acceso al museo", descripcion: "Una instalación inmersiva sobre el Día de Muertos.", ...cambios });

  it("el caso del founder: un evento suelto con «Entrada con acceso al museo» se publica con «Por confirmar» y el texto al final de la descripción", async () => {
    const base = mundo();
    const r = await prepararEvento(dep(base.db), altar(), SLP, CON_MUSEO, ADMIN);
    if (!r.ok) throw new Error(r.error);
    expect(r.nota).toBe("se publicó con costo por confirmar");
    // Escrito: en un evento suelto un precio vacío se lee «Gratis» (`textoCosto`), y no lo es.
    expect(r.fila).toMatchObject({ titulo: "Altar vivo, instalación inmersiva", lugar_id: MUSEO, clase: "puntual", precio: "Por confirmar" });
    expect(r.fila.descripcion).toBe("Una instalación inmersiva sobre el Día de Muertos. Costo: Entrada con acceso al museo.");
    const creado = await insertarEvento(base.db, r.fila);
    expect(creado?.id).toBeTruthy();
    expect(base.tablas.eventos[0]).toMatchObject({ precio: "Por confirmar", origen: "rutina-agendas" });
    expect(await ligarFicha(base.db, "p1", creado!.id)).toBe(true);
  });

  it("donde el costo es opcional (taller, acto de festival) queda vacío, como lo firmado en OL-411, con la misma nota", async () => {
    const sesiones = ["27", "29"].map((d) => ({ inicio: localAIso(`2026-10-${d}T17:00`, ZONA), fin: localAIso(`2026-10-${d}T19:00`, ZONA) }));
    const taller = await prepararEvento(dep(mundo().db), altar({ titulo: "Taller de papel picado", clase: "taller", inicio: sesiones[0].inicio, sesiones, precio: "Incluida en el boleto" }), SLP, CON_MUSEO, ADMIN);
    if (!taller.ok) throw new Error(taller.error);
    expect(taller.fila).toMatchObject({ clase: "taller", precio: null });
    expect(taller.nota).toBe("se publicó con costo por confirmar");
    expect(String(taller.fila.descripcion).endsWith("Costo: Incluida en el boleto.")).toBe(true);
    const conFestival = baseFalsa({ eventos: [{ id: XANTOLO, titulo: "Xantolo 2026", clase: "festival" }] }, { eventos_parecidos: () => [] });
    const acto = await prepararEvento(dep(conFestival.db), altar({ marco: { id: XANTOLO, titulo: "Xantolo 2026" }, precio: "Consultar" }), SLP, CON_MUSEO, ADMIN);
    if (!acto.ok) throw new Error(acto.error);
    expect(acto.fila).toMatchObject({ evento_padre_id: XANTOLO, precio: null });
    expect(String(acto.fila.descripcion).endsWith("Costo: Consultar.")).toBe(true);
  });

  it("los demás costos de las agendas: cifra, gratis y cooperación como en el formulario; lo que dice de más, a la descripción y sin nota en la línea", async () => {
    const casos: [string, unknown, string | null][] = [
      ["$150 general, $100 niños", "$150", "Costo: $150 general, $100 niños."],
      ["Gratis con boleto", null, "Costo: Gratis con boleto."],
      ["Costo de recuperación", "Cooperación solidaria", null],
      ["Donativo", "Cooperación solidaria", null],
      ["Entrada libre", null, null],
      ["$150", "$150", null],
    ];
    for (const [precio, guardado, nota] of casos) {
      const r = await prepararEvento(dep(mundo().db), altar({ precio }), SLP, CON_MUSEO, ADMIN);
      if (!r.ok) throw new Error(`${precio}: ${r.error}`);
      expect(r.fila.precio, precio).toBe(guardado);
      expect(r.nota, precio).toBeUndefined();
      const descripcion = String(r.fila.descripcion);
      if (nota) expect(descripcion.endsWith(nota), precio).toBe(true);
      else expect(descripcion, precio).toBe("Una instalación inmersiva sobre el Día de Muertos.");
    }
  });

  it("sin costo en la agenda, como antes: gratis en un evento suelto y vacío donde es opcional, sin nota", async () => {
    const suelto = await prepararEvento(dep(mundo().db), altar({ precio: null }), SLP, CON_MUSEO, ADMIN);
    expect(suelto.ok && suelto.fila.precio === null && suelto.nota === undefined).toBe(true);
    const festival = await prepararEvento(dep(mundo().db), altar({ precio: "", clase: "festival", titulo: "Festival de Altares" }), SLP, CON_MUSEO, ADMIN);
    expect(festival.ok && festival.fila.precio === null && festival.nota === undefined).toBe(true);
  });

  it("ningún texto de costo deja el evento sin publicar, en ninguna clase", async () => {
    const textos = ["Entrada con acceso al museo", "Gratis con boleto", "Incluida en el boleto", "Costo de recuperación", "$150 general, $100 niños", "Donativo", "Consultar", "Para mayores de 18 años", "Por confirmar", "$9,999,999"];
    for (const clase of ["puntual", "taller", "festival"])
      for (const precio of textos) {
        const r = await prepararEvento(dep(mundo().db), altar({ precio, clase, titulo: `Altar vivo ${clase}` }), SLP, CON_MUSEO, ADMIN);
        expect(r.ok ? "publica" : r.error, `${clase} · ${precio}`).toBe("publica");
      }
  });
});

describe("los artistas del evento al publicarlo (OL-462)", () => {
  const A = "a0000000-0000-4000-8000-000000000001";
  const B = "a0000000-0000-4000-8000-000000000002";
  const OCULTO = "a0000000-0000-4000-8000-000000000003";
  const PROP = "b0000000-0000-4000-8000-000000000001";
  const SIN = "b0000000-0000-4000-8000-000000000002";
  const base = () =>
    baseFalsa({
      eventos: [],
      eventos_artistas: [],
      artistas: [
        { id: A, nombre: "Ballroom SLP", ciudad: "San Luis Potosí", visible: true },
        { id: B, nombre: "Martha Franco", ciudad: "San Luis Potosí", visible: true },
        { id: OCULTO, nombre: "Oculto", ciudad: "San Luis Potosí", visible: false },
        { id: "a0000000-0000-4000-8000-000000000009", nombre: "Lena", ciudad: "Morelia", visible: true },
      ],
      propuestas: [
        { id: PROP, estado: "aceptada", ficha_id: B },
        { id: SIN, estado: "propuesta", ficha_id: null },
      ],
    }, { eventos_parecidos: () => [] });
  it("la ficha de `id`, la de la propuesta aceptada y la del mismo nombre en la ciudad; ni ocultas, ni sin aceptar, ni de otra ciudad", async () => {
    const b = base();
    const lista = [
      { nombre: "Martha Franco", id: null, propuesta: PROP },
      { nombre: "Ballroom SLP", id: null, propuesta: null },
      { nombre: "Nadie", id: null, propuesta: SIN },
      { nombre: "Oculto", id: OCULTO, propuesta: null },
      { nombre: "Lena", id: null, propuesta: null },
      { nombre: "Otra vez", id: B, propuesta: null },
    ];
    expect(await fichasDeArtistas(b.db, lista, ["San Luis Potosí"])).toEqual([B, A]);
    b.fallar("propuestas", "select");
    expect(await fichasDeArtistas(b.db, lista, ["San Luis Potosí"])).toBe("error");
  });
  it("se ligan al insertar el evento, en su orden", async () => {
    const b = base();
    const p = await prepararEvento({ db: b.db, mapbox: null, ahora: AHORA }, datos({ artistas: [{ nombre: "Ballroom SLP", id: A }, "Martha Franco"] }), SLP, LUGARES, ADMIN);
    if (!p.ok) throw new Error(p.error);
    const creado = await insertarEvento(b.db, p.fila);
    expect(b.tablas.eventos_artistas.map(({ evento_id, artista_id, orden }) => ({ evento_id, artista_id, orden }))).toEqual([
      { evento_id: creado!.id, artista_id: A, orden: 0 },
      { evento_id: creado!.id, artista_id: B, orden: 1 },
    ]);
  });
});
