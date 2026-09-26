import { beforeEach, describe, expect, it, vi } from "vitest";
import { bloquear, desbloquear } from "./acciones";

const mocks = vi.hoisted(() => ({ cliente: vi.fn(), usuario: vi.fn(), upsert: vi.fn(), eliminar: vi.fn(), eq1: vi.fn(), eq2: vi.fn(), invalidar: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.invalidar }));
vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: mocks.cliente }));

const PERSONA = "00000000-0000-4000-8000-000000000001";
const OTRA = "00000000-0000-4000-8000-000000000002";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.usuario.mockResolvedValue({ data: { user: { id: PERSONA } }, error: null });
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.eq2.mockResolvedValue({ error: null });
  mocks.eq1.mockReturnValue({ eq: mocks.eq2 });
  mocks.eliminar.mockReturnValue({ eq: mocks.eq1 });
  mocks.cliente.mockResolvedValue({
    auth: { getUser: mocks.usuario },
    from: () => ({ upsert: mocks.upsert, delete: mocks.eliminar }),
  });
});

describe("bloquear", () => {
  it("exige sesión", async () => {
    mocks.usuario.mockResolvedValue({ data: { user: null }, error: null });
    expect(await bloquear(OTRA)).toEqual({ ok: false, error: "Necesitas iniciar sesión." });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("sin configuración de Supabase, no se puede bloquear", async () => {
    mocks.cliente.mockResolvedValue(null);
    expect(await bloquear(OTRA)).toEqual({ ok: false, error: "Necesitas iniciar sesión." });
  });
  it("rechaza un id que no es uuid, antes de tocar la base", async () => {
    expect(await bloquear("no-es-un-uuid")).toEqual({ ok: false, error: "No se pudo bloquear." });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("no se puede bloquear a uno mismo, antes de tocar la base", async () => {
    expect(await bloquear(PERSONA)).toEqual({ ok: false, error: "No se pudo bloquear." });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("bloquea con la propia cuenta como quien, e ignora un bloqueo repetido", async () => {
    expect(await bloquear(OTRA)).toEqual({ ok: true });
    expect(mocks.upsert).toHaveBeenCalledWith({ quien: PERSONA, bloqueado: OTRA }, { onConflict: "quien,bloqueado", ignoreDuplicates: true });
    expect(mocks.invalidar).toHaveBeenCalledWith(`/personas/${OTRA}`);
    expect(mocks.invalidar).toHaveBeenCalledWith("/ajustes/bloqueados");
  });
  it("un error de la base no se confirma como éxito", async () => {
    mocks.upsert.mockResolvedValue({ error: { message: "fallo" } });
    expect(await bloquear(OTRA)).toEqual({ ok: false, error: "No se pudo bloquear. Intenta de nuevo." });
    expect(mocks.invalidar).not.toHaveBeenCalled();
  });
});

describe("desbloquear", () => {
  it("exige sesión", async () => {
    mocks.usuario.mockResolvedValue({ data: { user: null }, error: null });
    expect(await desbloquear(OTRA)).toEqual({ ok: false, error: "Necesitas iniciar sesión." });
    expect(mocks.eliminar).not.toHaveBeenCalled();
  });
  it("rechaza un id que no es uuid, antes de tocar la base", async () => {
    expect(await desbloquear("no-es-un-uuid")).toEqual({ ok: false, error: "No se pudo desbloquear." });
    expect(mocks.eliminar).not.toHaveBeenCalled();
  });
  it("borra solo la fila de la propia cuenta hacia esa persona", async () => {
    expect(await desbloquear(OTRA)).toEqual({ ok: true });
    expect(mocks.eq1).toHaveBeenCalledWith("quien", PERSONA);
    expect(mocks.eq2).toHaveBeenCalledWith("bloqueado", OTRA);
    expect(mocks.invalidar).toHaveBeenCalledWith(`/personas/${OTRA}`);
    expect(mocks.invalidar).toHaveBeenCalledWith("/ajustes/bloqueados");
  });
  it("un error de la base no se confirma como éxito", async () => {
    mocks.eq2.mockResolvedValue({ error: { message: "fallo" } });
    expect(await desbloquear(OTRA)).toEqual({ ok: false, error: "No se pudo desbloquear. Intenta de nuevo." });
    expect(mocks.invalidar).not.toHaveBeenCalled();
  });
});
