import { beforeEach, describe, expect, it, vi } from "vitest";
import * as acciones from "./acciones";
import { cupoDeCartel, leerCartelAccion } from "./acciones";

const m = vi.hoisted(() => ({ cliente: vi.fn(), sesion: vi.fn(), rpc: vi.fn(), cuota: vi.fn(), modelo: vi.fn(), admin: vi.fn(), devolver: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), RedirectType: {} }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/avisosWorker", () => ({ intentarDrenarAvisos: vi.fn() }));
vi.mock("@/lib/config", () => ({ configPublica: () => ({ supabaseUrl: "https://storage.invalid" }) }));
vi.mock("@/lib/cartel", () => ({ leerCartel: m.modelo }));
vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: m.cliente }));
vi.mock("@/lib/supabase/admin", () => ({ clienteAdmin: m.admin }));
vi.mock("@/lib/supabase/sesion", () => ({ sesionOEntrar: m.sesion }));

const foto = "https://storage.invalid/storage/v1/object/public/fotos/cartel.jpg";
const cuota = { usadas: 5, tope: 6, sin_tope: false, pedida: false };

beforeEach(() => {
  vi.resetAllMocks();
  const supabase = { rpc: m.rpc };
  m.cliente.mockResolvedValue(supabase);
  m.sesion.mockResolvedValue({ supabase, user: { id: "persona" } });
  m.cuota.mockResolvedValue({ data: cuota, error: null });
  m.rpc.mockImplementation((nombre) => nombre === "mi_cupo_de_cartel" ? { maybeSingle: m.cuota } : Promise.resolve({ data: true, error: null }));
  m.modelo.mockResolvedValue(null);
  m.devolver.mockResolvedValue({ data: true, error: null });
  m.admin.mockReturnValue({ rpc: m.devolver });
});

describe("acciones de cupo, sin base ni IA", () => {
  it("consulta la cuota real y conserva el permiso sin tope", async () => {
    m.cuota.mockResolvedValue({ data: { ...cuota, usadas: 70, tope: 6, sin_tope: true, pedida: true } });
    expect(await cupoDeCartel()).toEqual({ usadas: 70, tope: 6, sinTope: true });
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

  it("un fallo del modelo no devuelve exito, y la lectura se devuelve: no se descuenta", async () => {
    expect(await leerCartelAccion(foto)).toEqual({ ok: false, mensaje: "Llena los datos a mano; la imagen se queda puesta." });
    expect(m.rpc).toHaveBeenCalledExactlyOnceWith("apartar_lectura_de_cartel");
    expect(m.modelo).toHaveBeenCalledWith(foto);
    expect(m.rpc.mock.invocationCallOrder[0]).toBeLessThan(m.modelo.mock.invocationCallOrder[0]);
    // La devolución la pide el servidor con su llave de servicio, nunca la sesión de quien lee, y después de la lectura.
    expect(m.devolver).toHaveBeenCalledExactlyOnceWith("devolver_lectura_de_cartel", { p_perfil: "persona" });
    expect(m.modelo.mock.invocationCallOrder[0]).toBeLessThan(m.devolver.mock.invocationCallOrder[0]);
  });

  it("un modelo que lanza tampoco confirma exito: se devuelve la lectura y el error sigue su camino", async () => {
    m.modelo.mockRejectedValue(new Error("corte"));
    await expect(leerCartelAccion(foto)).rejects.toThrow("corte");
    expect(m.rpc).toHaveBeenCalledTimes(1);
    expect(m.devolver).toHaveBeenCalledExactlyOnceWith("devolver_lectura_de_cartel", { p_perfil: "persona" });
  });

  it("si la devolución falla (la base rechaza, se corta o no hay llave de servicio), el fallo se dice igual y la lectura queda descontada", async () => {
    m.devolver.mockRejectedValueOnce(new Error("corte"));
    expect(await leerCartelAccion(foto)).toEqual({ ok: false, mensaje: "Llena los datos a mano; la imagen se queda puesta." });
    m.admin.mockReturnValueOnce(null);
    expect(await leerCartelAccion(foto)).toEqual({ ok: false, mensaje: "Llena los datos a mano; la imagen se queda puesta." });
    m.devolver.mockClear();
    m.devolver.mockResolvedValueOnce({ data: false, error: null });
    expect((await leerCartelAccion(foto)).ok).toBe(false);
  });

  it("una lectura buena no se devuelve, y sin cupo no se lee ni se devuelve nada", async () => {
    m.modelo.mockResolvedValue({ titulo: "Cartel", artistas: [], gratis: true });
    expect((await leerCartelAccion(foto)).ok).toBe(true);
    m.rpc.mockResolvedValue({ data: false, error: null });
    expect(await leerCartelAccion(foto)).toEqual({ ok: false, sinCupo: true });
    expect(m.devolver).not.toHaveBeenCalled();
  });

  it("devuelve los valores de una lectura confirmada", async () => {
    m.modelo.mockResolvedValue({ titulo: "Cartel", artistas: [], gratis: true });
    expect(await leerCartelAccion(foto)).toMatchObject({ ok: true, valores: { titulo: "Cartel", gratis: true }, lugarId: null, quien: [] });
  });

  it("dice qué se leyó del cartel y qué es relleno: la hora (las 19:00) y el precio («gratis»)", async () => {
    m.modelo.mockResolvedValue({ titulo: "Cartel", fecha: "2026-11-05", hora: "20:30", gratis: true, precio: null, artistas: [] });
    expect(await leerCartelAccion(foto)).toMatchObject({ ok: true, valores: { inicio: "2026-11-05T20:30", gratis: true }, horaLeida: true, costoLeido: true });
    m.modelo.mockResolvedValue({ titulo: "Cartel", fecha: "2026-11-05", hora: null, gratis: null, precio: null, artistas: [] });
    expect(await leerCartelAccion(foto)).toMatchObject({ ok: true, valores: { inicio: "2026-11-05T19:00", gratis: true }, horaLeida: false, costoLeido: false });
    m.modelo.mockResolvedValue({ titulo: "Cartel", fecha: "2026-11-05", hora: "20:30", gratis: false, precio: "$150", artistas: [] });
    expect(await leerCartelAccion(foto)).toMatchObject({ ok: true, valores: { precio: "150", gratis: false }, costoLeido: true });
  });

  it("ya no hay «pedir más lecturas»: la acción no existe", () => {
    expect("pedirMasLecturas" in acciones).toBe(false);
  });
});
