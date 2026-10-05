import { beforeEach, describe, expect, it, vi } from "vitest";
import { actualizarLugar } from "./acciones";

const m = vi.hoisted(() => ({ sesion: vi.fn(), rol: vi.fn(), existente: vi.fn(), update: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw new Error("REDIRECT"); }), RedirectType: { replace: "replace" } }));
vi.mock("@/lib/supabase/sesion", () => ({ sesionOEntrar: m.sesion }));

const ID = "00000000-0000-4000-8000-0000000000e3";
const USUARIO = "00000000-0000-4000-8000-0000000000e4";
const SIN_CIUDAD = "No pudimos saber en qué ciudad está. Intenta de nuevo.";

beforeEach(() => {
  vi.clearAllMocks();
  m.sesion.mockResolvedValue({
    supabase: {
      from: vi.fn((tabla: string) => {
        if (tabla === "perfiles") return { select: () => ({ eq: () => ({ maybeSingle: m.rol }) }) };
        if (tabla === "lugares") return { select: () => ({ eq: () => ({ maybeSingle: m.existente }) }), update: m.update };
        throw new Error(`tabla inesperada: ${tabla}`);
      }),
    },
    user: { id: USUARIO },
  });
  m.rol.mockResolvedValue({ data: { rol: "miembro" } });
  m.existente.mockResolvedValue({ data: { portada: null, ciudad: "Querétaro", lat: 20.5888, lng: -100.3899 } });
  m.update.mockReturnValue({ eq: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: { id: ID, slug: "foro" }, error: null }) }) }) });
});

/** Lo que manda el formulario de edición de un lugar; `ciudad` y el punto se cambian por caso. */
function formulario(cambios: Record<string, string> = {}) {
  const fd = new FormData();
  const campos = { nombre: "Foro del Carmen", tipo: "foro", direccion: "Calle 1", lat: "20.5888", lng: "-100.3899", descripcion: "Una descripción nueva", portada: "", enlaces: "[]", ciudad: "Querétaro", ...cambios };
  for (const [clave, valor] of Object.entries(campos)) fd.set(clave, valor);
  return fd;
}

/** OL-299: editar un lugar que ya existe no puede perder su ciudad; el rechazo es solo para un punto nuevo sin ciudad. */
describe("actualizarLugar y la ciudad (OL-299)", () => {
  it("(a) editar solo la descripción: guarda con la ciudad de siempre", async () => {
    const r = await actualizarLugar(ID, null, formulario());
    expect(r).toMatchObject({ ok: true, id: ID });
    expect(m.update.mock.calls[0][0]).toMatchObject({ ciudad: "Querétaro", descripcion: "Una descripción nueva" });
  });
  it("(a) aunque el formulario no mande ciudad (sin contexto ni Mapbox) y el punto sea el mismo: usa la del registro", async () => {
    const r = await actualizarLugar(ID, null, formulario({ ciudad: "" }));
    expect(r).toMatchObject({ ok: true });
    expect(m.update.mock.calls[0][0]).toMatchObject({ ciudad: "Querétaro" });
  });
  it("(d) un lugar antiguo con la ciudad guardada vacía se puede seguir editando si no se mueve el pin", async () => {
    m.existente.mockResolvedValue({ data: { portada: null, ciudad: "", lat: 20.5888, lng: -100.3899 } });
    const r = await actualizarLugar(ID, null, formulario({ ciudad: "" }));
    expect(r).toMatchObject({ ok: true });
    expect(m.update.mock.calls[0][0]).toMatchObject({ ciudad: "" });
  });
  it("(c) moviendo el pin a un punto sin ciudad: no guarda, dice por qué y no toca la base", async () => {
    const r = await actualizarLugar(ID, null, formulario({ ciudad: "", lat: "22.15", lng: "-100.97" }));
    expect(r).toEqual({ ok: false, errores: { ciudad: SIN_CIUDAD } });
    expect(m.update).not.toHaveBeenCalled();
  });
  it("moviendo el pin a un punto con ciudad: guarda la nueva", async () => {
    const r = await actualizarLugar(ID, null, formulario({ ciudad: "San Luis Potosí", lat: "22.15", lng: "-100.97" }));
    expect(r).toMatchObject({ ok: true });
    expect(m.update.mock.calls[0][0]).toMatchObject({ ciudad: "San Luis Potosí", lat: 22.15, lng: -100.97 });
  });
});
