import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * OL-444: «Aceptar» de un cartel en la bandeja. Primero se pone en el evento (`ponerCartel`, probado aparte con su base y su Storage falsos);
 * si no se puede, no se acepta y la tarjeta dice por qué. Si se puede, se marca con la sesión y se liga a su evento: «Ver ficha» lleva a él.
 */
const PROP = "c0000000-0000-4000-8000-0000000000aa";
const EV = "e0000000-0000-4000-8000-0000000000ee";
const m = vi.hoisted(() => ({
  actual: vi.fn(),
  revalidar: vi.fn(),
  rpc: vi.fn(),
  poner: vi.fn(),
  ligar: vi.fn(),
  orden: [] as string[],
}));

function fromSesion(tabla: string) {
  const q = {
    select: () => q,
    eq: () => q,
    maybeSingle: async () => {
      if (tabla === "propuestas") return { data: { id: PROP, tipo: "cartel", datos: { evento_id: EV, imagen: "https://forositio.mx/c.jpg", titulo: "Jazz" }, estado: "propuesta", corrida_id: "c1" }, error: null };
      if (tabla === "rutinas_corridas") return { data: { ciudad: "san-luis-potosi" }, error: null };
      return { data: { nombre: "San Luis Potosí" }, error: null };
    },
  };
  return q;
}

vi.mock("@/lib/supabase/servidor", () => ({ usuarioActual: m.actual, clienteServidor: async () => ({ from: fromSesion, rpc: m.rpc }) }));
vi.mock("@/lib/supabase/admin", () => ({ clienteAdmin: () => ({ from: () => ({}) }) }));
vi.mock("@/lib/config", () => ({ configPublica: () => ({ mapboxToken: "pk.prueba" }) }));
vi.mock("@/lib/rutinas/aceptarCartel", () => ({ ponerCartel: m.poner, almacenDeSupabase: () => ({ subir: vi.fn() }) }));
vi.mock("@/lib/rutinas/publicarEvento", () => ({ ciudadDeCorrida: vi.fn(), lugaresDeCiudad: vi.fn(), prepararEvento: vi.fn(), insertarEvento: vi.fn(), ligarFicha: m.ligar }));
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

beforeEach(() => {
  vi.clearAllMocks();
  m.orden = [];
  m.actual.mockResolvedValue({ perfil: { id: "admin-1", rol: "admin" } });
  m.rpc.mockImplementation(async () => (m.orden.push("aceptar"), { data: { estado: "aceptada", ficha_id: null }, error: null }));
  m.poner.mockImplementation(async () => (m.orden.push("poner"), { ok: true, evento: { id: EV, slug: "jazz", lugar_id: "L1" }, url: "https://x.supabase.co/storage/v1/object/public/fotos/lugares/admin-1/evento-1.jpg" }));
  m.ligar.mockImplementation(async () => (m.orden.push("ligar"), true));
});

describe("aceptar un cartel desde la bandeja (OL-444)", () => {
  it("pone el cartel, luego marca la propuesta y la liga a su evento; «Ver ficha» lleva al evento", async () => {
    const r = await aceptarPropuesta(PROP);
    expect(r).toEqual({ ok: true, href: "/eventos/jazz" });
    expect(m.orden).toEqual(["poner", "aceptar", "ligar"]);
    expect(m.poner.mock.calls[0][1]).toMatchObject({ evento_id: EV });
    expect(m.poner.mock.calls[0][2]).toBe("admin-1");
    expect(m.rpc).toHaveBeenCalledWith("aceptar_propuesta", { p_propuesta: PROP, p_ficha: {} });
    expect(m.ligar.mock.calls[0].slice(1)).toEqual([PROP, EV]);
    expect(m.revalidar).toHaveBeenCalledWith("/eventos/jazz");
    expect(m.revalidar).toHaveBeenCalledWith("/lugares/L1");
  });

  it("si no se pudo poner, no se acepta y la tarjeta dice por qué", async () => {
    m.poner.mockResolvedValueOnce({ ok: false, error: "Ese evento ya tiene cartel: recházala como duplicado." });
    expect(await aceptarPropuesta(PROP)).toEqual({ ok: false, error: "Ese evento ya tiene cartel: recházala como duplicado." });
    expect(m.rpc).not.toHaveBeenCalled();
    expect(m.ligar).not.toHaveBeenCalled();
  });
});
