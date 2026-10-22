import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * OL-434: «Aceptar» de un evento en la bandeja dice lo que de verdad pasó. Un acto aceptado antes que su festival espera (su frase de
 * `datos.espera`, no «no se pudo publicar ahora»); un festival dice cuántos de sus actos que esperaban se publicaron con él. La publicación
 * (`publicarEvento.ts`, probada aparte con su base falsa) y la base se simulan aquí: solo se mira qué contesta la acción y a quién llama.
 */
const FEST = "f0000000-0000-4000-8000-000000000001";
const ACTO = "a0000000-0000-4000-8000-000000000001";
const SUELTO = "a0000000-0000-4000-8000-000000000002";
const m = vi.hoisted(() => ({
  actual: vi.fn(),
  revalidar: vi.fn(),
  propuestas: new Map<string, { id: string; tipo: string; datos: Record<string, unknown>; estado: string; corrida_id: string }>(),
  rpc: vi.fn(),
  preparar: vi.fn(),
  insertar: vi.fn(),
  ligar: vi.fn(),
  actos: { data: [] as { id: string; ficha_id: string | null }[], error: null as null | { message: string } },
  filtrosActos: [] as [string, unknown][],
}));

/** La sesión: lee la propuesta y su corrida; `aceptar_propuesta` la marca. */
function fromSesion(tabla: string) {
  let id = "";
  const q = {
    select: () => q,
    eq: (c: string, v: string) => ((id = c === "id" || c === "slug" ? v : id), q),
    maybeSingle: async () => {
      if (tabla === "propuestas") return { data: m.propuestas.get(id) ?? null, error: null };
      if (tabla === "rutinas_corridas") return { data: { ciudad: "san-luis-potosi" }, error: null };
      return { data: { nombre: "San Luis Potosí" }, error: null };
    },
  };
  return q;
}
/** La llave de servicio: solo la lectura de los actos del festival tras aceptarlo. */
function fromAdmin(tabla: string) {
  if (tabla !== "propuestas") throw new Error(`tabla inesperada: ${tabla}`);
  const q = {
    select: () => q,
    eq: (c: string, v: unknown) => (m.filtrosActos.push([c, v]), q),
    limit: async () => ({ data: m.actos.data, error: m.actos.error }),
  };
  return q;
}

vi.mock("@/lib/supabase/servidor", () => ({ usuarioActual: m.actual, clienteServidor: async () => ({ from: fromSesion, rpc: m.rpc }) }));
vi.mock("@/lib/supabase/admin", () => ({ clienteAdmin: () => ({ from: fromAdmin }) }));
vi.mock("@/lib/config", () => ({ configPublica: () => ({ mapboxToken: "pk.prueba" }) }));
vi.mock("@/lib/rutinas/publicarEvento", () => ({
  ciudadDeCorrida: async () => ({ slug: "san-luis-potosi", nombre: "San Luis Potosí", alias: [], lat: 22.15, lng: -100.98, zona: "America/Mexico_City", radioKm: 15, parametros: {} }),
  lugaresDeCiudad: async () => [],
  prepararEvento: m.preparar,
  insertarEvento: m.insertar,
  ligarFicha: m.ligar,
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidar }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("./mapbox", () => ({ sugerenciasMapbox: vi.fn(), lugarEnPunto: vi.fn(), lugarPorNombre: vi.fn(), nombresAlrededor: vi.fn() }));

const { aceptarPropuesta } = await import("./acciones");
const { textoDecidida } = await import("@/lib/propuestas");

const propuesta = (id: string, datos: Record<string, unknown>) => m.propuestas.set(id, { id, tipo: "evento", datos, estado: "propuesta", corrida_id: "c0000000-0000-4000-8000-000000000001" });

beforeEach(() => {
  vi.clearAllMocks();
  m.actual.mockResolvedValue({ perfil: { id: "admin-1", rol: "admin" } });
  m.propuestas.clear();
  m.rpc.mockResolvedValue({ data: { estado: "aceptada", ficha_id: null }, error: null });
  m.actos = { data: [], error: null };
  m.filtrosActos = [];
  propuesta(FEST, { titulo: "Xantolo 2026", clase: "festival", actos: 4 });
  propuesta(ACTO, { titulo: "Danza de Huehues", marco_propuesto: FEST, espera: "Se publica cuando aceptes el festival «Xantolo 2026»." });
  propuesta(SUELTO, { titulo: "Recital de guitarra" });
});

describe("aceptar un evento en la bandeja (OL-434)", () => {
  it("un acto antes que su festival: queda aceptado, no se inserta y la línea dice que espera", async () => {
    m.preparar.mockResolvedValue({ ok: true, fila: {}, titulo: "Danza de Huehues", espera: "Se publica cuando aceptes el festival «Xantolo 2026»." });
    expect(await aceptarPropuesta(ACTO)).toEqual({ ok: true, href: null, nota: "Se publica cuando aceptes el festival «Xantolo 2026».", espera: true });
    expect(m.rpc).toHaveBeenCalledWith("aceptar_propuesta", { p_propuesta: ACTO, p_ficha: {} });
    expect(m.insertar).not.toHaveBeenCalled();
    expect(m.ligar).not.toHaveBeenCalled();
  });

  it("un festival: se publica, «Ver ficha» a él y la línea dice cuántos de sus actos se publicaron con él", async () => {
    m.preparar.mockResolvedValue({ ok: true, fila: { clase: "festival" }, titulo: "Xantolo 2026" });
    m.insertar.mockResolvedValue({ id: "e0000000-0000-4000-8000-000000000001", slug: "xantolo-2026" });
    m.ligar.mockResolvedValue(true);
    m.actos.data = [
      { id: "acto-1", ficha_id: "evento-1" },
      { id: "acto-2", ficha_id: "evento-2" },
      { id: "acto-3", ficha_id: null },
    ];
    expect(await aceptarPropuesta(FEST)).toEqual({
      ok: true,
      href: "/eventos/xantolo-2026",
      nota: "se publicó con 2 de sus 3 actos; el otro se publica con la siguiente corrida de agendas",
      actos: ["acto-1", "acto-2"],
    });
    expect(m.filtrosActos).toEqual([
      ["tipo", "evento"],
      ["estado", "aceptada"],
      ["datos->>marco_propuesto", FEST],
    ]);
  });

  it("un festival sin actos que lo esperaran, o si no se pueden leer: la línea no dice nada de más", async () => {
    m.preparar.mockResolvedValue({ ok: true, fila: {}, titulo: "Xantolo 2026" });
    m.insertar.mockResolvedValue({ id: "e0000000-0000-4000-8000-000000000001", slug: "xantolo-2026" });
    m.ligar.mockResolvedValue(true);
    expect(await aceptarPropuesta(FEST)).toEqual({ ok: true, href: "/eventos/xantolo-2026", nota: undefined, actos: [] });
    m.actos.error = { message: "sin conexión" };
    expect(await aceptarPropuesta(FEST)).toEqual({ ok: true, href: "/eventos/xantolo-2026", nota: undefined, actos: [] });
  });

  it("un evento de siempre: como en OL-429, sin nota ni lectura de actos", async () => {
    m.preparar.mockResolvedValue({ ok: true, fila: {}, titulo: "Recital de guitarra" });
    m.insertar.mockResolvedValue({ id: "e0000000-0000-4000-8000-000000000002", slug: "recital-de-guitarra" });
    m.ligar.mockResolvedValue(true);
    expect(await aceptarPropuesta(SUELTO)).toEqual({ ok: true, href: "/eventos/recital-de-guitarra" });
    expect(m.filtrosActos).toEqual([]);
    // Si no se pudo insertar, la frase de siempre.
    m.insertar.mockResolvedValue(null);
    expect(await aceptarPropuesta(SUELTO)).toEqual({ ok: true, href: null, nota: "no se pudo publicar ahora: se publica con la siguiente corrida de agendas" });
  });

  it("OL-441: un costo de la agenda que no es cifra quedó «Por confirmar» y la línea de lo hecho lo dice", async () => {
    m.preparar.mockResolvedValue({ ok: true, fila: {}, titulo: "Altar vivo, instalación inmersiva", nota: "se publicó con costo por confirmar" });
    m.insertar.mockResolvedValue({ id: "e0000000-0000-4000-8000-000000000003", slug: "altar-vivo-instalacion-inmersiva" });
    m.ligar.mockResolvedValue(true);
    const r = await aceptarPropuesta(SUELTO);
    expect(r).toEqual({ ok: true, href: "/eventos/altar-vivo-instalacion-inmersiva", nota: "se publicó con costo por confirmar" });
    expect(m.insertar).toHaveBeenCalled();
    // Así la lee la bandeja.
    expect(textoDecidida("Altar vivo, instalación inmersiva", { aceptada: true, tipo: "evento" }, r.ok ? r.nota : undefined)).toBe("Aceptaste Altar vivo, instalación inmersiva · se publicó con costo por confirmar");
  });
});
