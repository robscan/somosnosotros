import { beforeEach, describe, expect, it, vi } from "vitest";
import { crearEvento } from "./acciones";
import { descartarSugerencia, ligarExposicionSugerida, publicarExposicionSugerida, relacionarFestivalSugerido, sugerenciaAlPublicar, unirParecidoSugerido } from "./sugerencias";

// OL-323 (bitácora 352): las acciones de las sugerencias al publicar. La base está simulada: cada `from(tabla)` contesta, en orden, lo que la
// prueba puso para esa tabla; las funciones de la base se prueban de verdad en `supabase/tests/pg/sugerencias-al-publicar.test.mjs`.
const m = vi.hoisted(() => ({ rpc: vi.fn(), sesion: vi.fn(), after: vi.fn(), invalidar: vi.fn(), redirect: vi.fn(), respuestas: {} as Record<string, unknown[]>, consultas: [] as { tabla: string; llamadas: [string, unknown[]][] }[] }));
vi.mock("next/cache", () => ({ revalidatePath: m.invalidar }));
vi.mock("next/server", () => ({ after: m.after }));
vi.mock("next/navigation", () => ({ redirect: m.redirect, RedirectType: { replace: "replace" } }));
vi.mock("@/lib/supabase/sesion", () => ({ sesionOEntrar: m.sesion }));
vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: vi.fn(), esAdminDeSesion: vi.fn().mockResolvedValue(false) }));
vi.mock("@/lib/avisosWorker", () => ({ intentarDrenarAvisos: vi.fn() }));
vi.mock("@/lib/cartel", () => ({ leerCartel: vi.fn() }));

const YO = "00000000-0000-4000-8000-0000000000a1";
const ID = "00000000-0000-4000-8000-000000000001";
const OTRO = "00000000-0000-4000-8000-000000000002";
const OP = "00000000-0000-4000-8000-0000000000c1";
const LUGAR = "0b0b0b0b-0000-4000-8000-000000000001";

/** Una consulta encadenable: cualquier método la devuelve a ella misma y, al esperarla, contesta lo que toca a su tabla. */
function consulta(tabla: string) {
  const registro = { tabla, llamadas: [] as [string, unknown[]][] };
  m.consultas.push(registro);
  const respuesta = () => Promise.resolve((m.respuestas[tabla] ?? []).shift() ?? { data: null, error: null });
  const q: Record<string, unknown> = {};
  const proxy: Record<string, unknown> = new Proxy(q, {
    get(_, nombre: string) {
      if (nombre === "then") return (ok: (v: unknown) => unknown, mal: (e: unknown) => unknown) => respuesta().then(ok, mal);
      if (nombre === "maybeSingle") return () => respuesta();
      return (...args: unknown[]) => {
        registro.llamadas.push([nombre, args]);
        return proxy;
      };
    },
  });
  return proxy;
}
const responder = (tabla: string, ...lista: unknown[]) => (m.respuestas[tabla] = [...(m.respuestas[tabla] ?? []), ...lista.map((data) => ({ data, error: null }))]);

const INAUGURACION = { id: ID, slug: "inauguracion-de-ecos", titulo: "Inauguración de Ecos de papel", clase: "puntual", inicio: "2030-11-06T01:00:00Z", fin: null, zona: "America/Mexico_City", lugar_id: LUGAR, sitio_texto: null, sitio_reservado: false, evento_padre_id: null, inaugura_id: null, sugerencias: {}, creado_por: YO, lugar: { nombre: "Museo Federico Silva" } };

beforeEach(() => {
  vi.clearAllMocks();
  m.respuestas = {};
  m.consultas = [];
  m.sesion.mockResolvedValue({ supabase: { rpc: m.rpc, from: consulta }, user: { id: YO } });
  m.rpc.mockResolvedValue({ data: null, error: null });
  m.redirect.mockImplementation(() => {
    throw new Error("REDIRECT");
  });
});

describe("sugerenciaAlPublicar", () => {
  it("H1: la inauguración con el periodo leído propone publicar la exposición, con quién expone", async () => {
    responder("eventos", INAUGURACION, [], []);
    responder("eventos_artistas", [{ orden: 0, artista: { nombre: "Lucía Montaño" } }]);
    const s = await sugerenciaAlPublicar(ID, { visita: { desde: "2030-11-06", hasta: "2030-11-30" }, apertura: true, muestra: true, festival: null });
    expect(s).toEqual({ tipo: "exposicion", modo: "crear", titulo: "Ecos de papel", visita: { desde: "2030-11-06", hasta: "2030-11-30" }, lugar: "Museo Federico Silva", quien: ["Lucía Montaño"] });
  });

  it("H2: sin periodo, se pregunta desde el día siguiente a la apertura (el 5 a las 19:00 en San Luis)", async () => {
    responder("eventos", { ...INAUGURACION, titulo: "Inauguración de la exposición Ecos de papel" }, [], []);
    responder("eventos_artistas", []);
    expect(await sugerenciaAlPublicar(ID, null)).toMatchObject({ modo: "periodo", desde: "2030-11-06", titulo: "Ecos de papel" });
  });

  it("nada para un evento ajeno, un id que no es id o una apertura sin muestra", async () => {
    responder("eventos", { ...INAUGURACION, creado_por: OTRO });
    expect(await sugerenciaAlPublicar(ID, null)).toBeNull();
    expect(await sugerenciaAlPublicar("no-es-id", null)).toBeNull();
    responder("eventos", { ...INAUGURACION, titulo: "Inauguración de la Casa de Cultura" }, []);
    expect(await sugerenciaAlPublicar(ID, null)).toBeNull();
  });

  it("H4: el otro acto propio y reciente que nombra el mismo festival (por lo que anotó su cartel); busca solo lo propio, visible y de los últimos 60 días", async () => {
    // fila, quién inaugura, el evento igual (OL-341: nada ese día), los actos recientes y los festivales propios.
    responder("eventos", { ...INAUGURACION, titulo: "Taller de gráfica en vivo", inicio: "2030-11-08T17:00:00Z" }, [], []);
    responder("eventos", [{ id: OTRO, titulo: "Concierto de Trío Bruma", inicio: "2030-11-08T00:00:00Z", zona: "America/Mexico_City", lugar_id: null, sitio_texto: "Centro de las Artes", evento_padre_id: null, sugerencias: { mencion_festival: "Festival Umbral 2030" }, lugar: null }], []);
    const s = await sugerenciaAlPublicar(ID, { visita: null, apertura: false, muestra: false, festival: "Festival Umbral 2030" });
    expect(s).toEqual({ tipo: "festival", modo: "relacionar", mencion: "Festival Umbral 2030", clave: "festival umbral|2030", otro: { id: OTRO, titulo: "Concierto de Trío Bruma", dia: "2030-11-07", lugar: "Centro de las Artes" } });
    const recientes = m.consultas.find((c) => c.llamadas.some(([n, a]) => n === "gte" && a[0] === "creado_en"))!;
    expect(recientes.llamadas).toEqual(expect.arrayContaining([["eq", ["creado_por", YO]], ["eq", ["visible", true]], ["eq", ["borrador", false]], ["neq", ["id", ID]]]));
  });

  // OL-341 (bitácora 370): el caso Electric Universe. Lo que se lee es lo que cualquiera ve en la agenda (visible, sin borradores ni actos, del
  // día del evento en su zona); la regla misma se prueba en `lib/sugerenciasParecido.test.ts`.
  const ELECTRIC = { ...INAUGURACION, titulo: "Electric Universe Festival", inicio: "2030-11-09T02:00:00Z", lugar_id: null, sitio_texto: "Foro Aleph", lugar: null };
  const AJENO = { id: OTRO, slug: "electric-universe-festival", titulo: "ELECTRIC UNIVERSE FESTIVAL", clase: "puntual", inicio: "2030-11-09T03:00:00Z", fin: null, zona: "America/Mexico_City", creado_por: "00000000-0000-4000-8000-0000000000a2", evento_padre_id: null, lugar_id: null, sitio_texto: "Foro Aleph", lugar: null };

  it("OL-341 (b): el evento igual de otra cuenta ese día; con el mismo título, «<artista> en <festival>» con el primer artista de Quién", async () => {
    responder("eventos", ELECTRIC, [], [AJENO]);
    responder("eventos_artistas", [{ orden: 0, artista: { nombre: "DJ Nova" } }]);
    const s = await sugerenciaAlPublicar(ID, null);
    expect(s).toEqual({ tipo: "parecido", modo: "evento", titulo: "DJ Nova en ELECTRIC UNIVERSE FESTIVAL", editable: true, existente: { id: OTRO, titulo: "ELECTRIC UNIVERSE FESTIVAL", dia: "2030-11-08", lugar: "Foro Aleph" } });
    const busqueda = m.consultas.find((c) => c.llamadas.some(([n, a]) => n === "gte" && a[0] === "termina"))!;
    expect(busqueda.llamadas).toEqual(
      expect.arrayContaining([
        ["eq", ["visible", true]],
        ["eq", ["borrador", false]],
        ["in", ["clase", ["puntual", "festival"]]],
        ["is", ["evento_padre_id", null]],
        ["neq", ["id", ID]],
        // El 8 de noviembre en San Luis (UTC−6): de las 06:00 UTC del 8 a las 06:00 UTC del 9.
        ["lt", ["inicio", "2030-11-09T06:00:00.000Z"]],
        ["gte", ["termina", "2030-11-08T06:00:00.000Z"]],
      ]),
    );
    expect(busqueda.llamadas.some(([n, a]) => n === "eq" && a[0] === "creado_por")).toBe(false);
  });

  it("OL-341 (a): el festival publicado que cubre ese día, con su programa registrado", async () => {
    responder("eventos", { ...ELECTRIC, titulo: "DJ Nova en Electric Universe Festival" }, [], [{ ...AJENO, clase: "festival", titulo: "Electric Universe Festival", inicio: "2030-11-08T20:00:00Z", fin: "2030-11-10T06:00:00Z" }]);
    m.respuestas.eventos.push({ data: null, error: null, count: 2 } as never);
    const s = await sugerenciaAlPublicar(ID, null);
    expect(s).toMatchObject({ tipo: "parecido", modo: "festival", titulo: "DJ Nova en Electric Universe Festival", editable: false, marco: { id: OTRO, titulo: "Electric Universe Festival", desde: "2030-11-08", hasta: "2030-11-09", actos: 2 } });
    // Sin el mismo título no hace falta el artista.
    expect(m.consultas.some((c) => c.tabla === "eventos_artistas")).toBe(false);
  });

  it("OL-341: un título genérico no busca nada; sin nada igual, siguen las de OL-323", async () => {
    responder("eventos", { ...ELECTRIC, titulo: "Concierto" }, []);
    expect(await sugerenciaAlPublicar(ID, null)).toBeNull();
    expect(m.consultas.filter((c) => c.tabla === "eventos")).toHaveLength(2);
  });

  it("si algo falla, no hay sugerencia (el final se ve igual)", async () => {
    m.sesion.mockResolvedValue({ supabase: { from: () => { throw new Error("sin red"); } }, user: { id: YO } });
    expect(await sugerenciaAlPublicar(ID, null)).toBeNull();
  });
});

describe("aceptar y descartar", () => {
  it("publicar la exposición manda su periodo en la hora del sitio (del primer minuto al último del cierre) y su clave", async () => {
    responder("eventos", { zona: "America/Mexico_City", lugar_id: LUGAR });
    m.rpc.mockResolvedValue({ data: { id: OTRO, slug: "ecos-de-papel" }, error: null });
    const r = await publicarExposicionSugerida(ID, { titulo: "Ecos de papel", desde: "2030-11-06", hasta: "2030-11-30", horario: null }, OP);
    expect(r).toEqual({ ok: true, creado: { id: OTRO, href: "/eventos/ecos-de-papel" } });
    expect(m.rpc).toHaveBeenCalledWith("publicar_exposicion_de_inauguracion", { p_inauguracion: ID, p_titulo: "Ecos de papel", p_inicio: "2030-11-06T06:00:00.000Z", p_fin: "2030-12-01T05:59:00.000Z", p_horario: null, p_operacion: OP });
    expect(m.after).toHaveBeenCalled();
  });

  it("sin días, al revés o con un horario ilegible no llega a la base; el error de la base se dice en la sugerencia", async () => {
    expect(await publicarExposicionSugerida(ID, { titulo: "Ecos", desde: "2030-11-30", hasta: "2030-11-06" }, OP)).toMatchObject({ ok: false });
    expect(await publicarExposicionSugerida(ID, { titulo: "Ecos", desde: "2030-11-06", hasta: "2030-11-30", horario: "no" }, OP)).toMatchObject({ ok: false });
    expect(m.rpc).not.toHaveBeenCalled();
    responder("eventos", { zona: "America/Mexico_City", lugar_id: null });
    m.rpc.mockResolvedValue({ data: null, error: { code: "23505" } });
    expect(await publicarExposicionSugerida(ID, { titulo: "Ecos", desde: "2030-11-06", hasta: "2030-11-30" }, OP)).toEqual({ ok: false, error: "Esta inauguración ya tiene su exposición." });
  });

  it("ligar la inauguración a la exposición ya publicada", async () => {
    m.rpc.mockResolvedValue({ data: { id: OTRO, slug: null }, error: null });
    expect(await ligarExposicionSugerida(ID, OTRO)).toEqual({ ok: true, creado: { id: OTRO, href: `/eventos/${OTRO}` } });
    expect(m.rpc).toHaveBeenCalledWith("ligar_inauguracion", { p_exposicion: OTRO, p_inauguracion: ID });
  });

  it("relacionar: los dos actos con un festival nuevo (con el nombre de la mención) o este con el propio que ya existe", async () => {
    m.rpc.mockResolvedValue({ data: { id: OP, slug: "festival-umbral-2030", actos: 2 }, error: null });
    expect(await relacionarFestivalSugerido(ID, { otro: OTRO, marco: null, titulo: "Festival Umbral 2030" }, OP)).toEqual({ ok: true, creado: { id: OP, href: "/eventos/festival-umbral-2030" }, actos: 2 });
    expect(m.rpc).toHaveBeenLastCalledWith("relacionar_en_festival", { p_eventos: [ID, OTRO], p_marco: null, p_titulo: "Festival Umbral 2030", p_operacion: OP });
    await relacionarFestivalSugerido(ID, { otro: null, marco: OTRO, titulo: "Festival Umbral 2030" }, OP);
    expect(m.rpc).toHaveBeenLastCalledWith("relacionar_en_festival", { p_eventos: [ID], p_marco: OTRO, p_titulo: null, p_operacion: null });
  });

  it("OL-341: «Sí» liga el evento al festival (a) o convierte el evento igual en festival con los dos (b), con el nombre de la participación", async () => {
    m.rpc.mockResolvedValue({ data: { id: OTRO, slug: "electric-universe-festival", actos: 3 }, error: null });
    expect(await unirParecidoSugerido(ID, { modo: "festival", con: OTRO, titulo: " DJ Nova en Electric Universe Festival " }, OP)).toEqual({ ok: true, creado: { id: OTRO, href: "/eventos/electric-universe-festival" }, actos: 3 });
    expect(m.rpc).toHaveBeenLastCalledWith("unir_a_festival_parecido", { p_evento: ID, p_festival: OTRO, p_titulo: "DJ Nova en Electric Universe Festival" });
    m.rpc.mockResolvedValue({ data: { id: OP, slug: "electric-universe-festival-op", actos: 2 }, error: null });
    expect(await unirParecidoSugerido(ID, { modo: "evento", con: OTRO, titulo: "DJ Nova en Electric Universe Festival" }, OP)).toMatchObject({ ok: true, actos: 2 });
    expect(m.rpc).toHaveBeenLastCalledWith("festival_de_dos_parecidos", { p_existente: OTRO, p_nuevo: ID, p_titulo: "DJ Nova en Electric Universe Festival", p_operacion: OP });
  });

  it("OL-341: sin nombre no llega a la base; si la base ya no lo ve igual, se dice", async () => {
    expect(await unirParecidoSugerido(ID, { modo: "festival", con: OTRO, titulo: "  " }, OP)).toEqual({ ok: false, error: "Escribe el nombre de tu participación." });
    expect(await unirParecidoSugerido(ID, { modo: "evento", con: OTRO, titulo: "X" }, "no-es-id")).toMatchObject({ ok: false });
    expect(m.rpc).not.toHaveBeenCalled();
    m.rpc.mockResolvedValue({ data: null, error: { code: "23514" } });
    expect(await unirParecidoSugerido(ID, { modo: "evento", con: OTRO, titulo: "X" }, OP)).toEqual({ ok: false, error: "Ese evento ya cambió y no coincide con el tuyo." });
  });

  it("descartar anota la sugerencia con su clave", async () => {
    await descartarSugerencia(ID, "festival", "festival umbral|2030");
    expect(m.rpc).toHaveBeenCalledWith("anotar_sugerencia", { p_evento: ID, p_tipo: "festival", p_estado: "descartada", p_clave: "festival umbral|2030" });
    m.rpc.mockClear();
    await descartarSugerencia("no-es-id", "exposicion");
    expect(m.rpc).not.toHaveBeenCalled();
  });
});

describe("crearEvento anota el festival que leyó el cartel", () => {
  const formulario = (campos: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries({ operacion: ID, modo_sitio: "otro", sitio_texto: "Museo de prueba", sitio_direccion: "", sitio_lat: "", sitio_lng: "", sitio_pin_pendiente: "no", revelar_horas: "24", ciudad: "", titulo: "Concierto de Trío Bruma", inicio: "2030-11-07T18:00", gratis: "si", quien: "[]", ...campos })) fd.set(k, v);
    return fd;
  };

  it("con la mención y su edición, en `sugerencias`", async () => {
    m.rpc.mockResolvedValue({ data: { id: ID, artistas: [], artistas_anteriores: [], lugar_anterior: null, cambio: null }, error: null });
    responder("eventos", null, { slug: "concierto" });
    expect((await crearEvento(null, formulario({ festival_leido: "Festival Umbral 2030" }))).ok).toBe(true);
    const update = m.consultas.find((c) => c.llamadas.some(([n]) => n === "update"));
    expect(update?.llamadas).toEqual(expect.arrayContaining([["update", [{ sugerencias: { mencion_festival: "Festival Umbral 2030" } }]], ["eq", ["id", ID]]]));
  });

  it("sin edición (o como premio) no se anota nada", async () => {
    m.rpc.mockResolvedValue({ data: { id: ID, artistas: [], artistas_anteriores: [], lugar_anterior: null, cambio: null }, error: null });
    await crearEvento(null, formulario({ festival_leido: "Ganadores del Festival Umbral 2029" }));
    await crearEvento(null, formulario({ festival_leido: "Festival Umbral" }));
    expect(m.consultas.some((c) => c.llamadas.some(([n]) => n === "update"))).toBe(false);
  });
});
