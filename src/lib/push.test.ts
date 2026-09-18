import { beforeEach, describe, expect, it, vi } from "vitest";
import { enviarPush } from "./push";
import { CONCURRENCIA_PUSH, ESPERA_PUSH_MS } from "./suscripcionPush";

const mocks = vi.hoisted(() => ({ enviar: vi.fn(), limite: vi.fn(), borrar: vi.fn(), disponible: true }));
vi.mock("web-push", () => ({ default: { setVapidDetails: vi.fn(), sendNotification: mocks.enviar } }));
vi.mock("./supabase/admin", () => ({ clienteAdmin: () => mocks.disponible ? {
  from: () => ({ select: () => ({ in: () => ({ limit: mocks.limite }) }), delete: () => ({ eq: mocks.borrar }) }),
} : null }));

const fila = (n: number) => ({ endpoint: `https://fcm.googleapis.com/fcm/send/${n}`, usuario_id: "persona", p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64)]).toString("base64url"), auth: Buffer.alloc(16).toString("base64url") });
const aviso = { titulo: "Un evento", cuerpo: "Esta tarde", url: "/eventos/1" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "prueba");
  vi.stubEnv("VAPID_PRIVATE_KEY", "prueba");
  mocks.disponible = true;
  mocks.enviar.mockReset().mockResolvedValue({ statusCode: 201 });
  mocks.limite.mockResolvedValue({ data: [fila(1)], error: null });
});

describe("envio push", () => {
  it("filtra filas antiguas no validas antes de acceder a la red", async () => {
    mocks.limite.mockResolvedValue({ data: [{ ...fila(1), endpoint: "https://example.invalid/push" }, { ...fila(2), auth: "incorrecta" }, fila(3)], error: null });
    expect(await enviarPush(["persona"], aviso)).toBe(1);
    expect(mocks.enviar).toHaveBeenCalledTimes(1);
    expect(mocks.enviar).toHaveBeenCalledWith({ endpoint: fila(3).endpoint, keys: { p256dh: fila(3).p256dh, auth: fila(3).auth } }, JSON.stringify(aviso), { TTL: 21600, timeout: ESPERA_PUSH_MS });
  });

  it("limita los envios simultaneos y procesa todas las filas", async () => {
    mocks.limite.mockResolvedValue({ data: Array.from({ length: 17 }, (_, i) => fila(i)), error: null });
    let activos = 0;
    let maximo = 0;
    mocks.enviar.mockImplementation(async () => {
      maximo = Math.max(maximo, ++activos);
      await new Promise((r) => setTimeout(r, 1));
      activos--;
    });
    expect(await enviarPush(["persona"], aviso)).toBe(17);
    expect(maximo).toBe(CONCURRENCIA_PUSH);
  });

  it.each([404, 410])("retira solamente el endpoint expirado (%s)", async (statusCode) => {
    mocks.enviar.mockRejectedValue({ statusCode });
    expect(await enviarPush(["persona"], aviso)).toBe(0);
    expect(mocks.borrar).toHaveBeenCalledWith("endpoint", fila(1).endpoint);
  });

  it("no retira suscripciones por un fallo temporal ni registra su URL", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.enviar.mockRejectedValue(new Error(fila(1).endpoint));
    expect(await enviarPush(["persona"], aviso)).toBe(0);
    expect(mocks.borrar).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("enviarPush: fallo del proveedor", "red");
    log.mockRestore();
  });

  it("no envia si falla la consulta", async () => {
    mocks.limite.mockResolvedValue({ data: [fila(1)], error: { message: "fallo" } });
    expect(await enviarPush(["persona"], aviso)).toBe(0);
    expect(mocks.enviar).not.toHaveBeenCalled();
  });

  it("sin destinatarios o configuracion no envia", async () => {
    expect(await enviarPush([], aviso)).toBe(0);
    mocks.disponible = false;
    expect(await enviarPush(["persona"], aviso)).toBe(0);
    expect(mocks.enviar).not.toHaveBeenCalled();
  });
});
