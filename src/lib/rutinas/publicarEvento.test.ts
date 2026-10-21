import { describe, expect, it } from "vitest";
import { SIN_PARAMETROS } from "../ciudadParametros";
import { localAIso } from "../fechas";
import { baseFalsa, type Fila } from "./baseFalsa";
import { insertarEvento, ligarFicha, prepararEvento, type CiudadDeEvento, type LugarDeCiudad } from "./publicarEvento";

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
