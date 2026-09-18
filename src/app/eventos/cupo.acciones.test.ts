import { beforeEach, describe, expect, it, vi } from "vitest";
import { cupoDeCartel, leerCartelAccion, pedirMasLecturas } from "./acciones";

const m = vi.hoisted(() => ({ cliente: vi.fn(), sesion: vi.fn(), rpc: vi.fn(), cuota: vi.fn(), insertar: vi.fn(), modelo: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), RedirectType: {} }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/avisosWorker", () => ({ intentarDrenarAvisos: vi.fn() }));
vi.mock("@/lib/config", () => ({ configPublica: () => ({ supabaseUrl: "https://storage.invalid" }) }));
vi.mock("@/lib/cartel", () => ({ leerCartel: m.modelo }));
vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: m.cliente }));
vi.mock("@/lib/supabase/sesion", () => ({ sesionOEntrar: m.sesion }));

const foto = "https://storage.invalid/storage/v1/object/public/fotos/cartel.jpg";
const cuota = { usadas: 19, tope: 20, sin_tope: false, pedida: false };

beforeEach(() => {
  vi.resetAllMocks();
  const supabase = { rpc: m.rpc, from: () => ({ insert: m.insertar }) };
  m.cliente.mockResolvedValue(supabase);
  m.sesion.mockResolvedValue({ supabase, user: { id: "persona" } });
  m.cuota.mockResolvedValue({ data: cuota, error: null });
  m.rpc.mockImplementation((nombre) => nombre === "mi_cupo_de_cartel" ? { maybeSingle: m.cuota } : Promise.resolve({ data: true, error: null }));
  m.insertar.mockResolvedValue({ error: null });
  m.modelo.mockResolvedValue(null);
});

describe("acciones de cupo, sin base ni IA", () => {
  it("consulta la cuota real y conserva el permiso sin tope", async () => {
    m.cuota.mockResolvedValue({ data: { ...cuota, usadas: 70, sin_tope: true, pedida: true } });
    expect(await cupoDeCartel()).toEqual({ usadas: 70, tope: 20, sinTope: true, pedida: true });
    expect(m.rpc).toHaveBeenCalledWith("mi_cupo_de_cartel");
  });

  it("no inventa saldo cuando falta sesion o fila", async () => {
    m.cliente.mockResolvedValueOnce(null);
    expect(await cupoDeCartel()).toBeNull();
    expect(m.rpc).not.toHaveBeenCalled();
    m.cuota.mockResolvedValue({ data: null });
    expect(await cupoDeCartel()).toBeNull();
  });

  it("no acepta datos junto a un error de consulta", async () => {
    m.cuota.mockResolvedValue({ data: cuota, error: { message: "sin conexion" } });
    expect(await cupoDeCartel()).toBeNull();
  });

  it("un corte de consulta llega al caller como fallo, no como saldo", async () => {
    m.cuota.mockRejectedValue(new Error("corte"));
    await expect(cupoDeCartel()).rejects.toThrow("corte");
  });

  it("rechaza imagen ajena antes de reservar y llamar al modelo", async () => {
    expect(await leerCartelAccion("https://externo.invalid/foto.jpg")).toEqual({ ok: false, mensaje: "La imagen no es de aquí." });
    expect(m.rpc).not.toHaveBeenCalled();
    expect(m.modelo).not.toHaveBeenCalled();
  });

  it.each([{ data: false, error: null }, { data: null, error: { message: "rpc" } }])("no llama IA si la reserva no se confirma: %j", async (respuesta) => {
    m.rpc.mockResolvedValue(respuesta);
    expect((await leerCartelAccion(foto)).ok).toBe(false);
    expect(m.modelo).not.toHaveBeenCalled();
  });

  it("un fallo del modelo no devuelve exito ni reintegra la lectura", async () => {
    expect(await leerCartelAccion(foto)).toEqual({ ok: false, mensaje: "Llena los datos a mano; la imagen se queda puesta." });
    expect(m.rpc).toHaveBeenCalledExactlyOnceWith("apartar_lectura_de_cartel");
    expect(m.modelo).toHaveBeenCalledWith(foto);
    expect(m.rpc.mock.invocationCallOrder[0]).toBeLessThan(m.modelo.mock.invocationCallOrder[0]);
  });

  it("un modelo que lanza tampoco confirma exito", async () => {
    m.modelo.mockRejectedValue(new Error("corte"));
    await expect(leerCartelAccion(foto)).rejects.toThrow("corte");
    expect(m.rpc).toHaveBeenCalledTimes(1);
  });

  it("devuelve los valores de una lectura confirmada", async () => {
    m.modelo.mockResolvedValue({ titulo: "Cartel", artistas: [], gratis: true });
    expect(await leerCartelAccion(foto)).toMatchObject({ ok: true, valores: { titulo: "Cartel", gratis: true }, lugarId: null, quien: [] });
  });

  it.each([null, { code: "23505" }])("pedir mas confirma alta o peticion ya existente: %j", async (error) => {
    m.insertar.mockResolvedValue({ error });
    expect(await pedirMasLecturas()).toEqual({ ok: true });
    expect(m.insertar).toHaveBeenCalledWith({ tipo: "perfil", objeto_id: "persona", motivo: "mas_lecturas", creado_por: "persona" });
  });

  it("rechazo o corte al pedir mas no se confunden con exito", async () => {
    m.insertar.mockResolvedValueOnce({ error: { code: "42501" } });
    expect(await pedirMasLecturas()).toEqual({ ok: false });
    m.insertar.mockRejectedValueOnce(new Error("corte"));
    await expect(pedirMasLecturas()).rejects.toThrow("corte");
  });
});
