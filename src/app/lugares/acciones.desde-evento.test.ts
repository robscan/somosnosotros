import { beforeEach, describe, expect, it, vi } from "vitest";
import { crearLugarDesdeEvento } from "./acciones";

const m = vi.hoisted(() => ({ sesion: vi.fn(), rpc: vi.fn(), insert: vi.fn(), rol: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw new Error("REDIRECT"); }), RedirectType: { replace: "replace" } }));
vi.mock("@/lib/supabase/sesion", () => ({ sesionOEntrar: m.sesion }));

const USUARIO = "00000000-0000-4000-8000-0000000000e1";
const LUGAR_ID = "00000000-0000-4000-8000-0000000000e2";

function supabaseDoble() {
  return {
    rpc: m.rpc,
    from: vi.fn((tabla: string) => {
      if (tabla === "perfiles") return { select: () => ({ eq: () => ({ maybeSingle: m.rol }) }) };
      if (tabla === "lugares") return { insert: m.insert };
      throw new Error(`tabla inesperada: ${tabla}`);
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  m.sesion.mockResolvedValue({ supabase: supabaseDoble(), user: { id: USUARIO } });
  m.rol.mockResolvedValue({ data: { rol: "miembro" } });
  m.rpc.mockResolvedValue({ data: [], error: null }); // sin parecidos, por defecto
  m.insert.mockReturnValue({ select: () => ({ single: () => Promise.resolve({ data: { id: LUGAR_ID, slug: "casa-de-cultura" }, error: null }) }) });
});

const datos = { nombre: "Casa de Cultura del Barrio", direccion: "Universidad 165, Barrio de Tlaxcala", lat: 22.15, lng: -100.97, ciudad: "San Luis Potosí", volverA: "/eventos/nuevo", privado: false };

describe("crearLugarDesdeEvento (OL-173, panel Agregar lugar)", () => {
  it("registra el lugar y deduce el tipo del nombre (sin pedirlo en el panel corto)", async () => {
    const r = await crearLugarDesdeEvento(datos);
    expect(r).toEqual({ ok: true, id: LUGAR_ID, reutilizado: false });
    expect(m.insert).toHaveBeenCalledTimes(1);
    expect(m.insert.mock.calls[0][0]).toMatchObject({ nombre: "Casa de Cultura del Barrio", tipo: "casa_de_cultura", direccion: "Universidad 165, Barrio de Tlaxcala", lat: 22.15, lng: -100.97, privado: false, creado_por: USUARIO });
  });
  it("sin ninguna pista de tipo en el nombre, cae en «otro»", async () => {
    await crearLugarDesdeEvento({ ...datos, nombre: "El Teatrito de la esquina".replace("Teatrito", "Espacio") });
    expect(m.insert.mock.calls[0][0]).toMatchObject({ tipo: "otro" });
  });
  it("con un parecido a menos de 150 m, reutiliza ese lugar y no duplica (un lugar es un lugar)", async () => {
    m.rpc.mockResolvedValue({ data: [{ id: LUGAR_ID, nombre: "Casa de Cultura", tipo: "casa_de_cultura", direccion: "Universidad 165", lat: 22.15, lng: -100.97, portada: null }], error: null });
    const r = await crearLugarDesdeEvento(datos);
    expect(r).toEqual({ ok: true, id: LUGAR_ID, reutilizado: true });
    expect(m.insert).not.toHaveBeenCalled();
  });
  it("nombre vacío: no llama a la base y devuelve el error de validación", async () => {
    const r = await crearLugarDesdeEvento({ ...datos, nombre: "  " });
    expect(r).toEqual({ ok: false, error: "Escribe el nombre del lugar." });
    expect(m.rpc).not.toHaveBeenCalled();
    expect(m.insert).not.toHaveBeenCalled();
  });
  it("manda «siguiente» para que crearLugar nunca intente redirigir (se usa el resultado en línea, sin navegar)", async () => {
    await expect(crearLugarDesdeEvento(datos)).resolves.toMatchObject({ ok: true });
  });
});

describe("crearLugarDesdeEvento con privado (OL-179, founder 2026-09-24: «si lo marca como privado sí se guarda»)", () => {
  it("cualquier cuenta con sesión (no solo administración) lo guarda con privado = true", async () => {
    const r = await crearLugarDesdeEvento({ ...datos, privado: true });
    expect(r).toEqual({ ok: true, id: LUGAR_ID, reutilizado: false });
    expect(m.insert.mock.calls[0][0]).toMatchObject({ privado: true, creado_por: USUARIO });
    // El rol de la cuenta ("miembro", no admin) ya no decide «privado»: el doble responde "miembro" y aun así se
    // guarda privado. El rol sí se consulta, pero para otra cosa: la foto de la ficha (S-01, OL-180, `esAdminDeSesion`).
    expect(m.rol).toHaveBeenCalledTimes(1);
  });
  it("con un parecido PÚBLICO a menos de 150 m: se reutiliza ese (lugares_parecidos nunca ve privados, así que un match aquí es siempre público)", async () => {
    m.rpc.mockResolvedValue({ data: [{ id: LUGAR_ID, nombre: "Casa de Cultura", tipo: "casa_de_cultura", direccion: "Universidad 165", lat: 22.15, lng: -100.97, portada: null }], error: null });
    const r = await crearLugarDesdeEvento({ ...datos, privado: true });
    expect(r).toEqual({ ok: true, id: LUGAR_ID, reutilizado: true });
    expect(m.insert).not.toHaveBeenCalled();
  });
});
