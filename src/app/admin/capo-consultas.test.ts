import { beforeEach, expect, it, vi } from "vitest";
import { cargarCapo } from "./capo-consultas";
import { clienteServidor } from "@/lib/supabase/servidor";

vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: vi.fn() }));
const cliente = vi.mocked(clienteServidor);
beforeEach(() => vi.resetAllMocks());

it("una caída de red o cliente ausente no produce ceros", async () => {
  cliente.mockRejectedValueOnce(new Error("red"));
  expect(await cargarCapo()).toBeNull();
  cliente.mockResolvedValueOnce(null);
  expect(await cargarCapo()).toBeNull();
});
it("un fallo de permisos o migración no aplicada no produce ceros", async () => {
  const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "42501" } });
  cliente.mockResolvedValue({ rpc } as unknown as NonNullable<Awaited<ReturnType<typeof clienteServidor>>>);
  expect(await cargarCapo()).toBeNull();
  expect(rpc).toHaveBeenCalledWith("panel_capo");
});
it("valida el contrato antes de entregar los agregados", async () => {
  const m = { invitados: 0, ya_vinculados_al_invitar: 0, elegibles: 0, solicitaron_despues: 0, vinculados_despues: 0, primer_envio: null, ultimo_envio: null, corte: "2026-09-18T18:00:00Z" };
  const rpc = vi.fn().mockResolvedValueOnce({ data: { sorpresa: true }, error: null }).mockResolvedValueOnce({ data: m, error: null });
  cliente.mockResolvedValue({ rpc } as unknown as NonNullable<Awaited<ReturnType<typeof clienteServidor>>>);
  expect(await cargarCapo()).toBeNull();
  expect(await cargarCapo()).toEqual(m);
});
