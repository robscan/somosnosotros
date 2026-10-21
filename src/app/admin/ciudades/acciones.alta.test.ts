import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * OL-432: «Añadir ciudad», «Abrir» y «Ocultar» con la base simulada (una tabla `ciudades` en memoria) y Mapbox simulado. Los permisos reales
 * de la tabla (solo la administración la escribe) se prueban en PostgreSQL (`supabase/tests/pg/ciudades-admin.test.mjs`).
 */
type Fila = Record<string, unknown> & { slug: string };
const m = vi.hoisted(() => ({
  actual: vi.fn(),
  revalidar: vi.fn(),
  db: { filas: [] as Fila[], inserts: [] as Record<string, unknown>[], updates: [] as { cambio: Record<string, unknown>; filtros: [string, unknown][] }[], errorInsert: null as null | { code: string } },
  mapbox: { sugerencias: vi.fn(), enPunto: vi.fn(), porNombre: vi.fn(), alrededor: vi.fn() },
}));

function from(tabla: string) {
  if (tabla !== "ciudades") throw new Error(`tabla inesperada: ${tabla}`);
  const filtros: [string, unknown][] = [];
  let cambio: Record<string, unknown> | null = null;
  const cumple = (f: Fila) => filtros.every(([c, v]) => (Array.isArray(v) ? v.includes(f[c]) : f[c] === v));
  const resolver = () => {
    if (!cambio) return { data: m.db.filas.filter(cumple).map((f) => ({ ...f })), error: null };
    const tocadas = m.db.filas.filter(cumple);
    m.db.updates.push({ cambio, filtros: [...filtros] });
    for (const f of tocadas) Object.assign(f, cambio);
    return { data: tocadas.map((f) => ({ slug: f.slug })), error: null };
  };
  const q = {
    select: () => q,
    eq: (c: string, v: unknown) => (filtros.push([c, v]), q),
    in: (c: string, v: unknown[]) => (filtros.push([c, v]), q),
    update: (x: Record<string, unknown>) => ((cambio = x), q),
    insert: async (x: Record<string, unknown>) => {
      m.db.inserts.push(x);
      return { error: m.db.errorInsert };
    },
    then: (ok: (v: unknown) => unknown, mal: (e: unknown) => unknown) => Promise.resolve(resolver()).then(ok, mal),
  };
  return q;
}
const panel = { ciudades: [{ slug: "san-luis-potosi", nombre: "San Luis Potosí", estado: "abierta", lat: 22.15, lng: -100.98, zona: "America/Mexico_City", creado_en: "2026-10-20T00:00:00Z", consultas: 125 }], corridas: [], credito: { usd: 200, vence: "2026-11-11", gastado: 0 } };

vi.mock("@/lib/supabase/servidor", () => ({ usuarioActual: m.actual, clienteServidor: async () => ({ from, rpc: async () => ({ data: panel, error: null }) }) }));
vi.mock("@/lib/supabase/admin", () => ({ clienteAdmin: () => null }));
vi.mock("@/lib/config", () => ({ configPublica: () => ({ mapboxToken: "pk.prueba" }) }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidar }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("./mapbox", () => ({ sugerenciasMapbox: m.mapbox.sugerencias, lugarEnPunto: m.mapbox.enPunto, lugarPorNombre: m.mapbox.porNombre, nombresAlrededor: m.mapbox.alrededor }));

const { abrirCiudad, mostrarCiudad, ocultarCiudad, resolverCiudad, sugerirCiudades } = await import("./acciones");

const fila = (slug: string, nombre: string, estado: string, extra: Partial<Fila> = {}): Fila => ({ slug, nombre, estado, alias: [], parametros: {}, lat: null, lng: null, zona: "America/Mexico_City", ...extra });
const oaxaca = { desde: null, nombre: "Oaxaca", largo: "Oaxaca de Juárez", lat: 17.0654, lng: -96.7236, radioKm: 15, municipios: ["Santa Lucía del Camino", "Santa Cruz Xoxocotlán"] };

beforeEach(() => {
  vi.clearAllMocks();
  m.actual.mockResolvedValue({ perfil: { id: "admin-1", rol: "admin" } });
  m.db.filas = [fila("san-luis-potosi", "San Luis Potosí", "abierta", { alias: ["Soledad de Graciano Sánchez"], lat: 22.1497, lng: -100.9764 })];
  m.db.inserts = [];
  m.db.updates = [];
  m.db.errorInsert = null;
});

describe("«Abrir Oaxaca»", () => {
  it("crea la fila con lo que resolvió el sistema y entra a su panel", async () => {
    expect(await abrirCiudad(oaxaca)).toEqual({ ok: true, href: "/admin/ciudades/oaxaca" });
    expect(m.db.inserts).toHaveLength(1);
    const [nueva] = m.db.inserts;
    expect(nueva).toMatchObject({
      slug: "oaxaca",
      nombre: "Oaxaca",
      lat: 17.0654,
      lng: -96.7236,
      zoom: 13,
      zona: "America/Mexico_City",
      estado: "abierta",
      alias: ["Oaxaca de Juárez", "Santa Lucía del Camino", "Santa Cruz Xoxocotlán"],
      parametros: { radio_km: 15, municipios: ["Santa Lucía del Camino", "Santa Cruz Xoxocotlán"] },
    });
    expect(typeof (nueva.parametros as Record<string, unknown>).abierta_en).toBe("string");
    expect(m.revalidar).toHaveBeenCalledWith("/admin/ciudades", "layout");
  });
  it("no crea dos: si ya está abierta (por su nombre o un alias), lleva a su panel sin tocar nada", async () => {
    m.db.filas.push(fila("oaxaca", "Oaxaca", "abierta"));
    expect(await abrirCiudad(oaxaca)).toEqual({ ok: true, href: "/admin/ciudades/oaxaca" });
    expect(await abrirCiudad({ ...oaxaca, nombre: "Soledad de Graciano Sánchez", largo: "Soledad de Graciano Sánchez" })).toEqual({ ok: true, href: "/admin/ciudades/san-luis-potosi" });
    expect(m.db.inserts).toHaveLength(0);
    expect(m.db.updates).toHaveLength(0);
  });
  it("si otra pestaña la dio de alta a la vez, también entra a su panel", async () => {
    m.db.errorInsert = { code: "23505" };
    expect(await abrirCiudad(oaxaca)).toEqual({ ok: true, href: "/admin/ciudades/oaxaca" });
    m.db.errorInsert = { code: "XX000" };
    expect(await abrirCiudad(oaxaca)).toEqual({ ok: false, error: "No se pudo abrir. Intenta de nuevo." });
  });
  it("una detectada se abre en su misma fila (conserva sus consultas), con el nombre que se le dio y el de antes como alias", async () => {
    m.db.filas.push(fila("oaxaca-de-juarez", "Oaxaca de Juárez", "detectada", { parametros: { otra: 1 } }));
    expect(await abrirCiudad({ ...oaxaca, desde: "oaxaca-de-juarez" })).toEqual({ ok: true, href: "/admin/ciudades/oaxaca-de-juarez" });
    expect(m.db.inserts).toHaveLength(0);
    const [{ cambio, filtros }] = m.db.updates;
    expect(filtros).toEqual([["slug", "oaxaca-de-juarez"], ["estado", ["detectada", "cerrada"]]]);
    expect(cambio).toMatchObject({ nombre: "Oaxaca", estado: "abierta", alias: ["Oaxaca de Juárez", "Santa Lucía del Camino", "Santa Cruz Xoxocotlán"], parametros: { otra: 1, radio_km: 15 } });
  });
  it("una oculta que se vuelve a buscar por su nombre también se abre en su fila", async () => {
    m.db.filas.push(fila("aguascalientes", "Aguascalientes", "cerrada"));
    expect(await abrirCiudad({ ...oaxaca, nombre: "Aguascalientes", largo: "Aguascalientes", municipios: ["Jesús María"] })).toEqual({ ok: true, href: "/admin/ciudades/aguascalientes" });
    expect(m.db.filas.find((f) => f.slug === "aguascalientes")?.estado).toBe("abierta");
  });
  it("Ciudad de México conserva sus alcaldías y su radio (OL-429)", async () => {
    m.db.filas.push(fila("ciudad-de-mexico", "Ciudad de México", "detectada", { parametros: { alcaldias: ["Cuauhtémoc"], radio_km: 12 } }));
    await abrirCiudad({ ...oaxaca, desde: "ciudad-de-mexico", nombre: "Ciudad de México", largo: "Ciudad de México", radioKm: 12, municipios: ["Iztapalapa"] });
    expect(m.db.updates[0].cambio.parametros).toMatchObject({ alcaldias: ["Cuauhtémoc"], radio_km: 12 });
    expect((m.db.updates[0].cambio.parametros as Record<string, unknown>).municipios).toBeUndefined();
  });
  it("sin nombre o sin centro no se abre; sin sesión de administración, a entrar", async () => {
    expect((await abrirCiudad({ ...oaxaca, nombre: "  " })).ok).toBe(false);
    expect((await abrirCiudad({ ...oaxaca, lat: 200 })).ok).toBe(false);
    expect((await abrirCiudad({ ...oaxaca, desde: "no-esta" })).ok).toBe(false);
    m.actual.mockResolvedValue({ perfil: { id: "x", rol: "usuario" } });
    await expect(abrirCiudad(oaxaca)).rejects.toThrow("REDIRECT:/");
    expect(m.db.inserts).toHaveLength(0);
  });
});

describe("«Ocultar» una detectada (respuesta 6)", () => {
  it("la cierra y se deshace en el momento", async () => {
    m.db.filas.push(fila("aguascalientes", "Aguascalientes", "detectada"));
    expect(await ocultarCiudad("aguascalientes")).toEqual({ ok: true });
    expect(m.db.updates[0]).toEqual({ cambio: { estado: "cerrada" }, filtros: [["slug", "aguascalientes"], ["estado", "detectada"]] });
    expect(await mostrarCiudad("aguascalientes")).toEqual({ ok: true });
    expect(m.db.filas.find((f) => f.slug === "aguascalientes")?.estado).toBe("detectada");
  });
  it("una abierta no se oculta por aquí", async () => {
    expect(await ocultarCiudad("san-luis-potosi")).toEqual({ ok: false, error: "Ya no está detectada. Recarga la página." });
    expect(m.db.filas[0].estado).toBe("abierta");
    expect((await ocultarCiudad("No Es Slug")).ok).toBe(false);
  });
});

describe("sugerir y resolver (Mapbox simulado)", () => {
  it("al escribir: las que ya están primero y las de Mapbox después; sin Mapbox, lo dice", async () => {
    m.mapbox.sugerencias.mockResolvedValue([
      { nombre: "San Luis Potosí", region: "San Luis Potosí", pais: "México", codigoPais: "MX", lat: 22.15, lng: -100.98 },
      { nombre: "San Juan del Río", region: "Querétaro", pais: "México", codigoPais: "MX", lat: 20.39, lng: -99.99 },
    ]);
    const r = await sugerirCiudades("San");
    expect(r.ok && r.sugerencias.map((s) => (s.tipo === "existente" ? `${s.slug}:${s.estado}` : s.lugar.nombre))).toEqual(["san-luis-potosi:abierta", "San Juan del Río"]);
    expect(r.ok && r.sinMapa).toBe(false);
    m.mapbox.sugerencias.mockResolvedValue(null);
    const sin = await sugerirCiudades("San");
    expect(sin.ok && sin.sinMapa).toBe(true);
    expect(await sugerirCiudades("S")).toEqual({ ok: true, sugerencias: [], sinMapa: false });
  });
  it("al elegir una de Mapbox: el nombre corto, la hora comparada con San Luis y los municipios del área", async () => {
    m.mapbox.alrededor.mockResolvedValue(["Oaxaca de Juárez", "Santa Lucía del Camino", null, "Santa Cruz Xoxocotlán"]);
    const r = await resolverCiudad({ lugar: { nombre: "Oaxaca de Juárez", region: "Oaxaca", pais: "México", codigoPais: "MX", lat: 17.0654, lng: -96.7236 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.alta).toMatchObject({
      desde: null,
      nombre: "Oaxaca",
      largo: "Oaxaca de Juárez",
      region: "Oaxaca, México",
      zona: "America/Mexico_City",
      hora: { titulo: "Hora del centro de México", detalle: "La misma de San Luis Potosí" },
      radioKm: 15,
      municipios: ["Santa Lucía del Camino", "Santa Cruz Xoxocotlán"],
      area: { titulo: "15 km alrededor del centro", detalle: "Cuenta también Santa Lucía del Camino y Santa Cruz Xoxocotlán" },
    });
    expect(r.alta.mapa).toContain("access_token=pk.prueba");
  });
  it("una detectada sin centro se ubica por su nombre; con alcaldías no se buscan municipios", async () => {
    m.db.filas.push(fila("aguascalientes", "Aguascalientes", "detectada"));
    m.mapbox.porNombre.mockResolvedValue({ nombre: "Aguascalientes", region: "Aguascalientes", pais: "México", codigoPais: "MX", lat: 21.88, lng: -102.29 });
    m.mapbox.alrededor.mockResolvedValue(["Aguascalientes", "Jesús María"]);
    const r = await resolverCiudad({ slug: "aguascalientes" });
    expect(r.ok && r.alta).toMatchObject({ desde: "aguascalientes", nombre: "Aguascalientes", municipios: ["Jesús María"], lat: 21.88 });
    m.db.filas.push(fila("ciudad-de-mexico", "Ciudad de México", "detectada", { lat: 19.43, lng: -99.13, parametros: { alcaldias: ["Cuauhtémoc", "Miguel Hidalgo"], radio_km: 12 } }));
    m.mapbox.alrededor.mockClear();
    m.mapbox.enPunto.mockResolvedValue({ nombre: "Ciudad de México", region: "Ciudad de México", pais: "México", codigoPais: "MX", lat: 19.43, lng: -99.13 });
    const cdmx = await resolverCiudad({ slug: "ciudad-de-mexico" });
    expect(cdmx.ok && cdmx.alta.area).toEqual({ titulo: "12 km alrededor del centro", detalle: "Solo cuentan Cuauhtémoc y Miguel Hidalgo" });
    expect(m.mapbox.alrededor).not.toHaveBeenCalled();
  });
  it("sin respuesta de Mapbox para el área, lo dice en su renglón; una que ya no está, error", async () => {
    m.mapbox.alrededor.mockResolvedValue(null);
    const r = await resolverCiudad({ lugar: { nombre: "Zacatecas", region: "Zacatecas", pais: "México", codigoPais: "MX", lat: 22.77, lng: -102.58 } });
    expect(r.ok && r.alta.area.detalle).toBe("No pudimos ver qué municipios caen en el área");
    expect(r.ok && r.alta.municipios).toBeNull();
    expect(await resolverCiudad({ slug: "no-esta" })).toEqual({ ok: false, error: "Esa ciudad ya no está. Recarga la página." });
  });
});
