import { beforeEach, describe, expect, it, vi } from "vitest";
import { marcarCancelado } from "./acciones";

// OL-391: «Se canceló» desde la ficha de un evento que ya pasó. Las políticas de la base (prueba PG `eventos-cancelado`) dejan editar solo a su
// autora y a la administración; la acción además rechaza lo que no ha pasado y lo que no se ve, y no deja nada a medias.
const m = vi.hoisted(() => ({ sesion: vi.fn(), admin: vi.fn(), invalidar: vi.fn(), update: vi.fn(), evento: null as Record<string, unknown> | null, guardado: { data: { id: "x" }, error: null } as { data: unknown; error: unknown } }));
vi.mock("next/cache", () => ({ revalidatePath: m.invalidar }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), RedirectType: { replace: "replace" } }));
vi.mock("@/lib/supabase/sesion", () => ({ sesionOEntrar: m.sesion }));
vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: vi.fn(), esAdminDeSesion: m.admin }));
vi.mock("@/lib/avisosWorker", () => ({ intentarDrenarAvisos: vi.fn() }));
vi.mock("@/lib/cartel", () => ({ leerCartel: vi.fn() }));

const AUTORA = "00000000-0000-4000-8000-0000000000a1";
const OTRA = "00000000-0000-4000-8000-0000000000a2";
const ID = "00000000-0000-4000-8000-0000000000e1";
const PASADO = { id: ID, slug: "noche-de-acordeon", inicio: "2000-01-01T19:00:00Z", fin: "2000-01-01T21:00:00Z", zona: "America/Mexico_City", creado_por: AUTORA, visible: true, borrador: false, lugar_id: "lugar-1", evento_padre_id: "festival-1", eventos_artistas: [{ artista_id: "artista-1" }] };

/** El cliente de la sesión: la lectura del evento y la escritura de la marca (lo que se escribió queda en `m.update`). */
function cliente() {
  return {
    from: (tabla: string) => {
      if (tabla !== "eventos") throw new Error(`tabla inesperada: ${tabla}`);
      return {
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: m.evento }) }) }),
        update: (cambio: unknown) => {
          m.update(cambio);
          return { eq: () => ({ select: () => ({ maybeSingle: () => Promise.resolve(m.guardado) }) }) };
        },
      };
    },
  };
}
const como = (usuario: string, esAdmin = false) => {
  m.sesion.mockResolvedValue({ supabase: cliente(), user: { id: usuario } });
  m.admin.mockResolvedValue(esAdmin);
};

beforeEach(() => {
  vi.clearAllMocks();
  m.evento = { ...PASADO };
  m.guardado = { data: { id: ID }, error: null };
  como(AUTORA);
});

describe("marcarCancelado (OL-391)", () => {
  it("la autora marca su evento que ya pasó, sin diálogo, y se revalida la ficha, su lugar, sus artistas y su festival", async () => {
    expect(await marcarCancelado(ID, true)).toEqual({ ok: true, cancelado: true });
    expect(m.update).toHaveBeenCalledWith({ cancelado: true });
    for (const ruta of [`/eventos/${ID}`, "/eventos/noche-de-acordeon", "/lugares/lugar-1", "/artistas/artista-1", "/eventos/festival-1"]) expect(m.invalidar).toHaveBeenCalledWith(ruta);
  });

  it("y lo deshace («No se canceló»)", async () => {
    expect(await marcarCancelado(ID, false)).toEqual({ ok: true, cancelado: false });
    expect(m.update).toHaveBeenCalledWith({ cancelado: false });
  });

  it("la administración también, aunque no sea suyo", async () => {
    como(OTRA, true);
    expect(await marcarCancelado(ID, true)).toEqual({ ok: true, cancelado: true });
  });

  it("otra cuenta no: ni lo intenta escribir", async () => {
    como(OTRA, false);
    expect(await marcarCancelado(ID, true)).toEqual({ ok: false, error: "sin_permiso" });
    expect(m.update).not.toHaveBeenCalled();
    expect(m.invalidar).not.toHaveBeenCalled();
  });

  it("un evento que no ha pasado no se marca (la ficha tampoco lo ofrece)", async () => {
    m.evento = { ...PASADO, inicio: "2099-01-01T19:00:00Z", fin: "2099-01-01T21:00:00Z" };
    expect(await marcarCancelado(ID, true)).toEqual({ ok: false, error: "no_paso" });
    // Sin fin, sigue vivo hasta 3 h después de empezar (la regla de siempre).
    m.evento = { ...PASADO, inicio: new Date(Date.now() - 3600e3).toISOString(), fin: null };
    expect(await marcarCancelado(ID, true)).toEqual({ ok: false, error: "no_paso" });
    expect(m.update).not.toHaveBeenCalled();
  });

  it("borradores y ocultos no cambian", async () => {
    m.evento = { ...PASADO, visible: false, borrador: true };
    expect(await marcarCancelado(ID, true)).toEqual({ ok: false, error: "no_visible" });
    m.evento = { ...PASADO, visible: false };
    expect(await marcarCancelado(ID, true)).toEqual({ ok: false, error: "no_visible" });
    expect(m.update).not.toHaveBeenCalled();
  });

  it("un id que no existe (o que la base no deja ver) responde como uno ajeno", async () => {
    m.evento = null;
    expect(await marcarCancelado(ID, true)).toEqual({ ok: false, error: "sin_permiso" });
    expect(await marcarCancelado("no-es-un-uuid", true)).toEqual({ ok: false, error: "sin_permiso" });
  });

  it("si la base no lo guardó (sin fila o con error), lo dice y no revalida", async () => {
    m.guardado = { data: null, error: null };
    expect(await marcarCancelado(ID, true)).toEqual({ ok: false, error: "fallo" });
    m.guardado = { data: null, error: { message: "fallo" } };
    expect(await marcarCancelado(ID, true)).toEqual({ ok: false, error: "fallo" });
    expect(m.invalidar).not.toHaveBeenCalled();
  });
});
