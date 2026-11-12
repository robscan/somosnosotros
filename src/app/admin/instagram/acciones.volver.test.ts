import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * OL-515: «Volver a publicar lo que se quedó sin salir» (OL-496) también sabe volver a mandar lo publicado a mano desde la ficha de un artista o de
 * un lugar (sin día de la semana): por `redes_encolar_ficha`, con su mismo pedido y ya confirmado; si ya va en camino, cuenta como «ya iba».
 */
const m = vi.hoisted(() => ({ usuario: vi.fn(), rpc: vi.fn(), sinSalir: vi.fn(), despues: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Map([["host", "somosnosotros.org"]]) }));
vi.mock("next/server", () => ({ after: m.despues }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/rutinas/disparar", () => ({ dispararPaso: vi.fn(), origenPropio: () => "https://somosnosotros.org" }));
vi.mock("@/lib/supabase/servidor", () => ({ usuarioActual: m.usuario, clienteServidor: async () => ({ rpc: m.rpc }) }));
vi.mock("./sinSalir", () => ({ cargarSinSalir: m.sinSalir }));

const { volverAPublicar } = await import("./acciones");

const LUGAR = "b0000000-0000-4000-8000-000000000515";
const ARTISTA = "c0000000-0000-4000-8000-000000000515";
const T1 = "e0000000-0000-4000-8000-000000000001";
const T2 = "e0000000-0000-4000-8000-000000000002";

beforeEach(() => {
  vi.clearAllMocks();
  m.usuario.mockResolvedValue({ perfil: { id: "admin-1", rol: "admin" } });
  m.sinSalir.mockResolvedValue({
    lista: [
      { id: T1, evento_id: null, artista_id: null, lugar_id: LUGAR, red: "instagram", formato: "4x5", casilla: null, pedido: { tipo: "lugar", facebook: false, texto: "Mi texto", quitadas: ["teatrorino"] } },
      { id: T2, evento_id: null, artista_id: ARTISTA, lugar_id: null, red: "instagram", formato: "4x5", casilla: null, pedido: { tipo: "artista", facebook: true, texto: null, quitadas: [] } },
    ],
  });
});

describe("volverAPublicar: lo publicado desde una ficha", () => {
  it("vuelve por `redes_encolar_ficha` con su mismo pedido y confirmado; un duplicado cuenta como «ya iba»", async () => {
    m.rpc.mockResolvedValueOnce({ data: { id: "nuevo" }, error: null }).mockResolvedValueOnce({ data: { duplicado: "otro" }, error: null });
    expect(await volverAPublicar([T1, T2])).toEqual({ ok: true, enCamino: 1, yaIban: 1, fallaron: [] });
    expect(m.rpc).toHaveBeenNthCalledWith(1, "redes_encolar_ficha", { p_tipo: "lugar", p_ficha: LUGAR, p_pedido: { texto: "Mi texto", quitadas: ["teatrorino"], facebook: false }, p_repetir: true });
    expect(m.rpc).toHaveBeenNthCalledWith(2, "redes_encolar_ficha", expect.objectContaining({ p_tipo: "artista", p_ficha: ARTISTA }));
    expect(m.rpc).not.toHaveBeenCalledWith("redes_encolar", expect.anything());
  });
  it("si la base no lo acepta (ya está oculta, por ejemplo), queda en «no se pudo»", async () => {
    m.rpc.mockResolvedValue({ data: null, error: { code: "22023", message: "Esa ficha está oculta: no se publica." } });
    expect(await volverAPublicar([T1])).toEqual({ ok: true, enCamino: 0, yaIban: 0, fallaron: [T1] });
  });
});
