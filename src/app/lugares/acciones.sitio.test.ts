import { beforeEach, describe, expect, it, vi } from "vitest";
import { slugDeSitio } from "@/lib/sitios";
import { crearLugar } from "./acciones";

/**
 * OL-366 (bitácora 397): el alta de lugar que vino de «Agregar al directorio» en la ficha de un sitio trae su clave (`sitio`). Al quedar el
 * lugar, se le ligan los eventos de ese sitio que le tocan a quien lo registra (los suyos; todos si es administración), con la regla de la base
 * (`religar_sitio_a_lugar`). Lo que devuelve el alta no cambia («Publicado» es el de siempre) y, si ligar falla, el lugar queda igual.
 */
const m = vi.hoisted(() => ({ sesion: vi.fn(), rpc: vi.fn(), insert: vi.fn(), rol: vi.fn(), previo: vi.fn(), eventos: vi.fn(), redirect: vi.fn(), revalidar: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidar }));
vi.mock("next/navigation", () => ({ redirect: m.redirect, RedirectType: { replace: "replace" } }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/supabase/sesion", () => ({ sesionOEntrar: m.sesion }));

const YO = "00000000-0000-4000-8000-0000000000f1";
const OTRA = "00000000-0000-4000-8000-0000000000f3";
const LUGAR_ID = "00000000-0000-4000-8000-0000000000f2";
const OPERACION = "00000000-0000-4000-8000-0000000000f9";
const SITIO = slugDeSitio("Bar La Oficina", "San Luis Potosí");
const E1 = "00000000-0000-4000-8000-0000000000e1";
const E2 = "00000000-0000-4000-8000-0000000000e2";

function consulta(resultado: () => unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = {};
  for (const metodo of ["select", "is", "eq", "not", "or", "order", "limit"]) c[metodo] = vi.fn(() => c);
  c.maybeSingle = () => Promise.resolve(resultado());
  c.then = (ok: (v: unknown) => void, mal: (e: unknown) => void) => Promise.resolve(resultado()).then(ok, mal);
  return c;
}
const evento = (id: string, creado_por: string) => ({ id, slug: null, lugar_id: null, sitio_texto: "Bar La Oficina", sitio_lat: 22.15, sitio_lng: -100.98, sitio_reservado: false, ciudad: "San Luis Potosí", clase: "puntual", creado_por });

beforeEach(() => {
  vi.clearAllMocks();
  m.redirect.mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  });
  m.sesion.mockResolvedValue({
    supabase: {
      rpc: m.rpc,
      from: vi.fn((tabla: string) => {
        if (tabla === "perfiles") return { select: () => ({ eq: () => ({ maybeSingle: m.rol }) }) };
        if (tabla === "lugares") return { insert: m.insert, select: () => consulta(m.previo) };
        if (tabla === "eventos") return consulta(m.eventos);
        throw new Error(`tabla inesperada: ${tabla}`);
      }),
    },
    user: { id: YO },
  });
  m.rol.mockResolvedValue({ data: { rol: "usuario" } });
  m.previo.mockReturnValue({ data: null, error: null });
  m.eventos.mockReturnValue({ data: [evento(E1, YO), evento(E2, OTRA)], error: null });
  m.rpc.mockImplementation(async (nombre: string) => {
    if (nombre === "lugares_parecidos") return { data: [], error: null };
    if (nombre === "crear_lugar_con_horario") return { data: { id: LUGAR_ID, slug: "bar-la-oficina" }, error: null };
    if (nombre === "religar_sitio_a_lugar") return { data: 1, error: null };
    return { data: null, error: null };
  });
  m.insert.mockReturnValue({ select: () => ({ single: () => Promise.resolve({ data: { id: LUGAR_ID, slug: "bar-la-oficina" }, error: null }) }) });
});

function formulario(cambios: Record<string, string> = {}) {
  const fd = new FormData();
  const campos = { nombre: "Bar La Oficina", tipo: "cafe_bar", direccion: "Calle 1", lat: "22.1502", lng: "-100.9801", descripcion: "", portada: "", enlaces: "[]", ciudad: "San Luis Potosí", quedarse: "1", ...cambios };
  for (const [clave, valor] of Object.entries(campos)) fd.set(clave, valor);
  return fd;
}
const ligadas = () => m.rpc.mock.calls.filter(([n]) => n === "religar_sitio_a_lugar").map(([, args]) => args);

describe("crearLugar desde la ficha de un sitio (OL-366)", () => {
  it("con `sitio`, el lugar nuevo se queda con los eventos de ese sitio que publicó quien lo registra; «Publicado», el de siempre", async () => {
    const r = await crearLugar(null, formulario({ sitio: SITIO }));
    expect(r).toEqual({ ok: true, id: LUGAR_ID, slug: "bar-la-oficina", volver: "/lugares/bar-la-oficina" });
    expect(ligadas()).toEqual([{ p_lugar: LUGAR_ID, p_eventos: [E1] }]);
    // Se liga después de crear el lugar (con su id) y antes de contestar.
    const religar = m.rpc.mock.calls.findIndex(([n]) => n === "religar_sitio_a_lugar");
    expect(m.insert.mock.invocationCallOrder[0]).toBeLessThan(m.rpc.mock.invocationCallOrder[religar]);
    expect(m.revalidar.mock.calls.map(([ruta]) => ruta)).toEqual(expect.arrayContaining([`/sitios/${SITIO}`, `/eventos/${E1}`, `/lugares/${LUGAR_ID}`, "/lugares/bar-la-oficina"]));
  });

  it("si lo registra la administración, todos los del sitio", async () => {
    m.rol.mockResolvedValue({ data: { rol: "admin" } });
    await crearLugar(null, formulario({ sitio: SITIO }));
    expect(ligadas()).toEqual([{ p_lugar: LUGAR_ID, p_eventos: [E1, E2] }]);
  });

  it("con horario y operación (la ruta del alta por pasos), igual: se liga al lugar que creó la transacción", async () => {
    await crearLugar(null, formulario({ sitio: SITIO, operacion: OPERACION, horario: JSON.stringify([{ dias: [1], abre: "10:00", cierra: "14:00" }]) }));
    expect(m.insert).not.toHaveBeenCalled();
    expect(ligadas()).toEqual([{ p_lugar: LUGAR_ID, p_eventos: [E1] }]);
  });

  it("al recuperar una respuesta perdida (la misma operación ya guardó el lugar), vuelve a pedir ligar: la base solo liga los que siguen sin lugar", async () => {
    m.previo.mockReturnValue({ data: { id: LUGAR_ID, slug: "bar-la-oficina" }, error: null });
    const r = await crearLugar(null, formulario({ sitio: SITIO, operacion: OPERACION }));
    expect(r).toMatchObject({ ok: true, id: LUGAR_ID });
    expect(m.rpc.mock.calls.map(([n]) => n)).not.toContain("crear_lugar_con_horario");
    expect(ligadas()).toEqual([{ p_lugar: LUGAR_ID, p_eventos: [E1] }]);
  });

  it("si ligar falla, el lugar queda publicado igual (sus eventos siguen como sitio)", async () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    m.rpc.mockImplementation(async (nombre: string) => (nombre === "religar_sitio_a_lugar" ? { data: null, error: { message: "sin la migración" } } : nombre === "lugares_parecidos" ? { data: [], error: null } : { data: null, error: null }));
    const r = await crearLugar(null, formulario({ sitio: SITIO }));
    expect(r).toEqual({ ok: true, id: LUGAR_ID, slug: "bar-la-oficina", volver: "/lugares/bar-la-oficina" });
    expect(registro).toHaveBeenCalledWith("ligar eventos del sitio:", "sin la migración");
    registro.mockRestore();
  });

  it("sin `sitio`, o con uno que no tiene forma de clave, no se liga nada (el alta de siempre)", async () => {
    await crearLugar(null, formulario());
    await crearLugar(null, formulario({ sitio: "Bar La Oficina" }));
    await crearLugar(null, formulario({ sitio: "../../lugares" }));
    expect(ligadas()).toEqual([]);
  });

  it("si hay uno parecido sin confirmar, pregunta «¿Es este?» antes de crear nada ni ligar", async () => {
    const parecido = { id: "00000000-0000-4000-8000-0000000000d1", slug: "bar-la-oficina", nombre: "Bar La Oficina", tipo: "cafe_bar", direccion: "Calle 1", lat: 22.15, lng: -100.98, portada: null };
    m.rpc.mockImplementation(async (nombre: string) => (nombre === "lugares_parecidos" ? { data: [parecido], error: null } : { data: null, error: null }));
    const r = await crearLugar(null, formulario({ sitio: SITIO }));
    expect(r).toEqual({ ok: false, errores: {}, parecidos: [parecido] });
    expect(m.insert).not.toHaveBeenCalled();
    expect(ligadas()).toEqual([]);
  });
});
