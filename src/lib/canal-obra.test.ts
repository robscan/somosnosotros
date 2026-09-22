import { describe, expect, it, vi } from "vitest";
import { abrirCanalObra, nombreCanalObra } from "./canal-obra";

describe("nombreCanalObra", () => {
  it("un canal por obra, no por persona", () => {
    expect(nombreCanalObra("00000000-0000-4000-8000-000000000001")).toBe("obra:00000000-0000-4000-8000-000000000001");
  });
});

describe("abrirCanalObra", () => {
  it("pide el canal de la obra con private: true (RLS sobre realtime.messages)", () => {
    const channel = vi.fn().mockReturnValue("el-canal");
    const supabase = { channel } as unknown as Parameters<typeof abrirCanalObra>[0];
    const resultado = abrirCanalObra(supabase, "abc");
    expect(channel).toHaveBeenCalledWith("obra:abc", { config: { private: true } });
    expect(resultado).toBe("el-canal");
  });
  it("con ack (OL-132, solo la sonda del mando) pide confirmación de cada broadcast; sin ack, nada cambia", () => {
    const channel = vi.fn().mockReturnValue("el-canal");
    const supabase = { channel } as unknown as Parameters<typeof abrirCanalObra>[0];
    abrirCanalObra(supabase, "abc", { ack: true });
    expect(channel).toHaveBeenCalledWith("obra:abc", { config: { private: true, broadcast: { ack: true } } });
    abrirCanalObra(supabase, "abc", { ack: false });
    expect(channel).toHaveBeenLastCalledWith("obra:abc", { config: { private: true } });
  });
});
