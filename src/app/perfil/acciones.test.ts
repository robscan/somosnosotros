import { beforeEach, describe, expect, it, vi } from "vitest";
import { guardarSuscripcionPush } from "./acciones";

const mocks = vi.hoisted(() => ({ cliente: vi.fn(), usuario: vi.fn(), upsert: vi.fn(), perfil: vi.fn(), invalidar: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.invalidar }));
vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: mocks.cliente }));

const sub = { endpoint: "https://fcm.googleapis.com/fcm/send/prueba", keys: {
  p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64)]).toString("base64url"), auth: Buffer.alloc(16).toString("base64url"),
} };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.usuario.mockResolvedValue({ data: { user: { id: "persona" } } });
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.perfil.mockResolvedValue({ error: null });
  mocks.cliente.mockResolvedValue({
    auth: { getUser: mocks.usuario },
    from: (table: string) => table === "suscripciones_push" ? { upsert: mocks.upsert } : { update: () => ({ eq: mocks.perfil }) },
  });
});

describe("guardarSuscripcionPush", () => {
  it("rechaza destinos externos antes de consultar la base", async () => {
    expect(await guardarSuscripcionPush({ ...sub, endpoint: "https://example.invalid/push" })).toBe(false);
    expect(mocks.cliente).not.toHaveBeenCalled();
  });
  it("rechaza llaves invalidas antes de consultar la base", async () => {
    expect(await guardarSuscripcionPush({ ...sub, keys: { ...sub.keys, auth: "corta" } })).toBe(false);
    expect(mocks.cliente).not.toHaveBeenCalled();
  });
  it("exige sesion", async () => {
    mocks.usuario.mockResolvedValue({ data: { user: null } });
    expect(await guardarSuscripcionPush(sub)).toBe(false);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("registra solo en la cuenta autenticada", async () => {
    expect(await guardarSuscripcionPush(sub)).toBe(true);
    expect(mocks.upsert).toHaveBeenCalledWith({ endpoint: sub.endpoint, usuario_id: "persona", ...sub.keys });
    expect(mocks.perfil).toHaveBeenCalledWith("id", "persona");
    expect(mocks.invalidar).toHaveBeenCalledTimes(2);
  });
  it("un rechazo de cupo no activa las preferencias", async () => {
    mocks.upsert.mockResolvedValue({ error: { code: "23514" } });
    expect(await guardarSuscripcionPush(sub)).toBe(false);
    expect(mocks.perfil).not.toHaveBeenCalled();
    expect(mocks.invalidar).not.toHaveBeenCalled();
  });
  it("no confirma exito si fallan las preferencias", async () => {
    mocks.perfil.mockResolvedValue({ error: { message: "fallo" } });
    expect(await guardarSuscripcionPush(sub)).toBe(false);
    expect(mocks.invalidar).not.toHaveBeenCalled();
  });
});
