import { beforeEach, describe, expect, it, vi } from "vitest";
import { slugDeSitio } from "@/lib/sitios";
import { ligarSitioALugar } from "./acciones";

/**
 * OL-366 (bitácora 397): ligar a un lugar del directorio los eventos del sitio que representa. La acción lee los eventos de la ficha del sitio
 * (la misma consulta), elige los que le tocan a quien liga (los suyos; todos si es administración) y se los pasa a la base
 * (`religar_sitio_a_lugar`, que tiene la regla de verdad). Dice cuántos ligó; sin sesión, con datos ilegibles o si la base no pudo, `ok: false`.
 */
const m = vi.hoisted(() => ({ cliente: vi.fn(), esAdmin: vi.fn(), rpc: vi.fn(), eventos: vi.fn(), lugar: vi.fn(), usuario: vi.fn(), revalidar: vi.fn(), despues: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidar }));
vi.mock("next/server", () => ({ after: m.despues }));
vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: m.cliente, esAdminDeSesion: m.esAdmin }));

const YO = "00000000-0000-4000-8000-0000000000a1";
const OTRA = "00000000-0000-4000-8000-0000000000a2";
const LUGAR = "00000000-0000-4000-8000-0000000000b1";
const SLUG = slugDeSitio("Bar La Oficina", "San Luis Potosí");

/** Una consulta encadenable: cualquier método intermedio la devuelve, y al esperarla (o con `maybeSingle`) da su resultado. */
function consulta(resultado: () => unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = {};
  for (const metodo of ["select", "is", "eq", "not", "or", "order", "limit"]) c[metodo] = vi.fn(() => c);
  c.maybeSingle = () => Promise.resolve(resultado());
  c.then = (ok: (v: unknown) => void, mal: (e: unknown) => void) => Promise.resolve(resultado()).then(ok, mal);
  return c;
}

const evento = (id: string, creado_por: string, extra: Record<string, unknown> = {}) => ({
  id, slug: `evento-${id.slice(-2)}`, lugar_id: null, sitio_texto: "Bar La Oficina", sitio_lat: 22.15, sitio_lng: -100.98, sitio_reservado: false, ciudad: "San Luis Potosí", clase: "puntual", creado_por, ...extra,
});
const E1 = "00000000-0000-4000-8000-0000000000c1";
const E2 = "00000000-0000-4000-8000-0000000000c2";
const E3 = "00000000-0000-4000-8000-0000000000c3";

beforeEach(() => {
  vi.clearAllMocks();
  m.usuario.mockResolvedValue({ data: { user: { id: YO } } });
  m.esAdmin.mockResolvedValue(false);
  m.eventos.mockReturnValue({ data: [evento(E1, YO), evento(E2, OTRA), evento(E3, YO, { sitio_texto: "Café Paz" })], error: null });
  m.lugar.mockReturnValue({ data: { id: LUGAR, slug: "bar-la-oficina" }, error: null });
  m.rpc.mockResolvedValue({ data: 1, error: null });
  m.cliente.mockResolvedValue({
    auth: { getUser: m.usuario },
    rpc: m.rpc,
    from: vi.fn((tabla: string) => {
      if (tabla === "eventos") return consulta(m.eventos);
      if (tabla === "lugares") return consulta(m.lugar);
      throw new Error(`tabla inesperada: ${tabla}`);
    }),
  });
});

const llamadas = () => m.rpc.mock.calls.filter(([n]) => n === "religar_sitio_a_lugar").map(([, args]) => args);
const revalidadas = () => m.revalidar.mock.calls.map(([ruta]) => ruta);

describe("ligarSitioALugar (OL-366)", () => {
  it("quien no es administración pide ligar solo sus eventos del sitio, y dice cuántos ligó la base", async () => {
    expect(await ligarSitioALugar(SLUG, LUGAR)).toEqual({ ok: true, ligados: 1 });
    expect(llamadas()).toEqual([{ p_lugar: LUGAR, p_eventos: [E1] }]);
  });

  it("la administración pide todos los del sitio (no los de otro sitio)", async () => {
    m.esAdmin.mockResolvedValue(true);
    m.rpc.mockResolvedValue({ data: 2, error: null });
    expect(await ligarSitioALugar(SLUG, LUGAR)).toEqual({ ok: true, ligados: 2 });
    expect(llamadas()).toEqual([{ p_lugar: LUGAR, p_eventos: [E1, E2] }]);
  });

  it("al ligar, revalida en el acto el lugar (por id y slug), la ficha del sitio y cada evento (por id y slug)", async () => {
    await ligarSitioALugar(SLUG, LUGAR);
    expect(m.despues).not.toHaveBeenCalled();
    expect(revalidadas()).toEqual(expect.arrayContaining(["/", "/lugares", `/lugares/${LUGAR}`, "/lugares/bar-la-oficina", `/sitios/${SLUG}`, `/eventos/${E1}`, "/eventos/evento-c1"]));
    expect(revalidadas()).not.toContain(`/eventos/${E2}`);
  });

  it("con `diferir` (desde la ficha del sitio), revalida después de contestar: esa ficha no se vuelve a pintar sin sus eventos", async () => {
    expect(await ligarSitioALugar(SLUG, LUGAR, true)).toEqual({ ok: true, ligados: 1 });
    expect(m.revalidar).not.toHaveBeenCalled();
    expect(m.despues).toHaveBeenCalledTimes(1);
    m.despues.mock.calls[0][0]();
    expect(revalidadas()).toContain(`/sitios/${SLUG}`);
  });

  it("sin nada que ligar no llama a la base; si la base no liga ninguno, cero y sin revalidar", async () => {
    m.esAdmin.mockResolvedValue(false);
    m.eventos.mockReturnValue({ data: [evento(E2, OTRA)], error: null });
    expect(await ligarSitioALugar(SLUG, LUGAR)).toEqual({ ok: true, ligados: 0 });
    expect(llamadas()).toEqual([]);
    m.eventos.mockReturnValue({ data: [evento(E1, YO)], error: null });
    m.rpc.mockResolvedValue({ data: 0, error: null });
    expect(await ligarSitioALugar(SLUG, LUGAR)).toEqual({ ok: true, ligados: 0 });
    expect(m.revalidar).not.toHaveBeenCalled();
  });

  it("si la base no pudo (leer o ligar), lo dice: `ok: false`, y queda en el registro del servidor", async () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    m.rpc.mockResolvedValue({ data: null, error: { message: "no existe la función" } });
    expect(await ligarSitioALugar(SLUG, LUGAR)).toEqual({ ok: false });
    m.eventos.mockReturnValue({ data: null, error: { message: "sin red" } });
    expect(await ligarSitioALugar(SLUG, LUGAR)).toEqual({ ok: false });
    expect(registro.mock.calls.map(([texto]) => texto)).toEqual(["ligar eventos del sitio:", "ligar eventos del sitio: no se pudieron leer sus eventos"]);
    registro.mockRestore();
  });

  it("sin sesión, con un lugar que no se ve o con datos que no tienen forma, no llega a la base", async () => {
    m.usuario.mockResolvedValue({ data: { user: null } });
    expect(await ligarSitioALugar(SLUG, LUGAR)).toEqual({ ok: false });
    m.usuario.mockResolvedValue({ data: { user: { id: YO } } });
    m.lugar.mockReturnValue({ data: null, error: null });
    expect(await ligarSitioALugar(SLUG, LUGAR)).toEqual({ ok: false });
    for (const [slug, lugar] of [["Bar La Oficina", LUGAR], ["../lugares", LUGAR], [SLUG, "no-es-uuid"]]) expect(await ligarSitioALugar(slug, lugar)).toEqual({ ok: false });
    expect(llamadas()).toEqual([]);
  });
});
