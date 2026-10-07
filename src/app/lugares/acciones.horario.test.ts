import { beforeEach, describe, expect, it, vi } from "vitest";
import { actualizarLugar, crearLugar, crearLugarDesdeEvento } from "./acciones";

/**
 * OL-315 (bitácora 343): el alta por pasos publica con `quedarse` (devuelve lo creado y se queda en «Publicado») y con el horario del lugar,
 * que viaja en `horario` y se guarda con el lugar en la misma transacción (`crear_lugar_con_horario`); editar lo reemplaza
 * (`guardar_horario_lugar`). Sin el campo, todo como siempre. Y un negocio que se guarda desde el alta de evento queda con su tipo.
 */
const m = vi.hoisted(() => ({ sesion: vi.fn(), rpc: vi.fn(), insert: vi.fn(), update: vi.fn(), rol: vi.fn(), existente: vi.fn(), filtro: vi.fn(), redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: m.redirect, RedirectType: { replace: "replace" } }));
vi.mock("@/lib/supabase/sesion", () => ({ sesionOEntrar: m.sesion }));

const USUARIO = "00000000-0000-4000-8000-0000000000f1";
const LUGAR_ID = "00000000-0000-4000-8000-0000000000f2";
const HORARIO = [
  { dias: [1, 2, 3, 4, 5], abre: "10:00", cierra: "14:00" },
  { dias: [1, 2, 3, 4, 5], abre: "16:00", cierra: "20:00" },
];

beforeEach(() => {
  vi.clearAllMocks();
  m.redirect.mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  });
  const consulta = { eq: m.filtro, maybeSingle: m.existente };
  m.filtro.mockReturnValue(consulta);
  m.sesion.mockResolvedValue({
    supabase: {
      rpc: m.rpc,
      from: vi.fn((tabla: string) => {
        if (tabla === "perfiles") return { select: () => ({ eq: () => ({ maybeSingle: m.rol }) }) };
        if (tabla === "lugares") return { insert: m.insert, update: m.update, select: () => consulta };
        throw new Error(`tabla inesperada: ${tabla}`);
      }),
    },
    user: { id: USUARIO },
  });
  m.rol.mockResolvedValue({ data: { rol: "miembro" } });
  m.existente.mockResolvedValue({ data: { portada: null, ciudad: "San Luis Potosí", lat: 22.15, lng: -100.97 } });
  m.rpc.mockImplementation(async (nombre: string) => {
    if (nombre === "lugares_parecidos") return { data: [], error: null };
    if (nombre === "crear_lugar_con_horario") return { data: { id: LUGAR_ID, slug: "cafe-del-jardin" }, error: null };
    return { data: null, error: null };
  });
  m.insert.mockReturnValue({ select: () => ({ single: () => Promise.resolve({ data: { id: LUGAR_ID, slug: "cafe-del-jardin" }, error: null }) }) });
  m.update.mockReturnValue({ eq: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: { id: LUGAR_ID, slug: "cafe-del-jardin" }, error: null }) }) }) });
});

function formulario(cambios: Record<string, string> = {}) {
  const fd = new FormData();
  const campos = { nombre: "Café del Jardín", tipo: "cafe_bar", direccion: "Jardín Guerrero 12", lat: "22.15", lng: "-100.97", descripcion: "", portada: "", enlaces: "[]", ciudad: "San Luis Potosí", ...cambios };
  for (const [clave, valor] of Object.entries(campos)) fd.set(clave, valor);
  return fd;
}
const llamadas = (nombre: string) => m.rpc.mock.calls.filter(([n]) => n === nombre).map(([, args]) => args);

describe("crearLugar con el alta por pasos (OL-315)", () => {
  it("con `quedarse` devuelve lo creado y no va a la ficha", async () => {
    const r = await crearLugar(null, formulario({ quedarse: "1" }));
    expect(r).toEqual({ ok: true, id: LUGAR_ID, slug: "cafe-del-jardin", volver: "/lugares/cafe-del-jardin" });
    expect(m.redirect).not.toHaveBeenCalled();
    expect(m.insert.mock.calls[0][0]).toMatchObject({ tipo: "cafe_bar", creado_por: USUARIO });
  });
  it("con horario, el lugar y sus franjas van juntos en `crear_lugar_con_horario` (sin el insert de siempre)", async () => {
    const r = await crearLugar(null, formulario({ quedarse: "1", horario: JSON.stringify(HORARIO) }));
    expect(r).toMatchObject({ ok: true, id: LUGAR_ID });
    expect(m.insert).not.toHaveBeenCalled();
    const [args] = llamadas("crear_lugar_con_horario");
    expect(args.p_franjas).toEqual(HORARIO);
    expect(args.p_datos).toMatchObject({ nombre: "Café del Jardín", tipo: "cafe_bar", ciudad: "San Luis Potosí", zona: "America/Mexico_City", privado: false, direccion: "Jardín Guerrero 12", descripcion: null });
    expect(args.p_datos).not.toHaveProperty("creado_por");
  });
  it("con el horario vacío, el insert de siempre", async () => {
    await crearLugar(null, formulario({ quedarse: "1", horario: "[]" }));
    expect(m.insert).toHaveBeenCalledTimes(1);
    expect(llamadas("crear_lugar_con_horario")).toEqual([]);
  });
  it("si la base rechaza el horario, no se publica y lo dice", async () => {
    m.rpc.mockImplementation(async (nombre: string) => (nombre === "crear_lugar_con_horario" ? { data: null, error: { code: "23514" } } : { data: [], error: null }));
    const r = await crearLugar(null, formulario({ quedarse: "1", horario: JSON.stringify(HORARIO) }));
    expect(r).toEqual({ ok: false, errores: {}, general: "No se pudo guardar el lugar. Intenta de nuevo." });
  });
  it("un horario ilegible no llega a la base", async () => {
    const r = await crearLugar(null, formulario({ quedarse: "1", horario: JSON.stringify([{ dias: [1], abre: "10:00", cierra: "10:00" }]) }));
    expect(r).toMatchObject({ ok: false, errores: { horario: "Un horario abre y cierra a la misma hora." } });
    expect(m.insert).not.toHaveBeenCalled();
    expect(llamadas("crear_lugar_con_horario")).toEqual([]);
  });
  it("sin `quedarse` ni `siguiente`, va a la ficha nueva como siempre", async () => {
    await expect(crearLugar(null, formulario())).rejects.toThrow("REDIRECT:/lugares/cafe-del-jardin?nuevo=1");
  });
});

describe("actualizarLugar y el horario (OL-315)", () => {
  it("con el campo, después de guardar el lugar se reemplaza su horario", async () => {
    const r = await actualizarLugar(LUGAR_ID, null, formulario({ horario: JSON.stringify(HORARIO) }));
    expect(r).toMatchObject({ ok: true, id: LUGAR_ID });
    expect(llamadas("guardar_horario_lugar")).toEqual([{ p_lugar: LUGAR_ID, p_franjas: HORARIO }]);
  });
  it("vacío, lo borra; sin el campo, no lo toca", async () => {
    await actualizarLugar(LUGAR_ID, null, formulario({ horario: "[]" }));
    expect(llamadas("guardar_horario_lugar")).toEqual([{ p_lugar: LUGAR_ID, p_franjas: [] }]);
    m.rpc.mockClear();
    await actualizarLugar(LUGAR_ID, null, formulario());
    expect(llamadas("guardar_horario_lugar")).toEqual([]);
  });
  it("si el horario no se guarda, se dice en su renglón", async () => {
    m.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    const r = await actualizarLugar(LUGAR_ID, null, formulario({ horario: JSON.stringify(HORARIO) }));
    expect(r).toEqual({ ok: false, errores: { horario: "No se pudo guardar el horario. Intenta de nuevo." } });
  });
});

describe("crearLugarDesdeEvento y los negocios (OL-315)", () => {
  it("un café que se guarda desde el alta de evento queda como «Café, bar o restaurante» por lo que dice el mapa", async () => {
    await crearLugarDesdeEvento({ nombre: "Tacuba", direccion: "Calle 1", lat: 22.15, lng: -100.97, ciudad: "San Luis Potosí", volverA: "/nuevo/evento", privado: false, categorias: ["cafe"] });
    expect(m.insert.mock.calls[0][0]).toMatchObject({ nombre: "Tacuba", tipo: "cafe_bar" });
  });
});

const OPERACION = "00000000-0000-4000-8000-0000000000f3";
describe("reintentos del alta de lugar (OL-330)", () => {
  it("usa una operación estable también sin horario", async () => {
    m.existente.mockResolvedValue({ data: null, error: null });
    await crearLugar(null, formulario({ quedarse: "1", operacion: OPERACION }));
    expect(m.filtro).toHaveBeenCalledWith("operacion_guardado", OPERACION);
    expect(m.filtro).toHaveBeenCalledWith("creado_por", USUARIO);
    expect(llamadas("crear_lugar_con_horario")[0]).toMatchObject({ p_datos: { operacion_guardado: OPERACION }, p_franjas: [] });
    expect(m.insert).not.toHaveBeenCalled();
  });
  it("recupera la respuesta perdida sin preguntar por el lugar que acaba de guardar", async () => {
    m.existente.mockResolvedValue({ data: { id: LUGAR_ID, slug: "cafe-del-jardin" }, error: null });
    const r = await crearLugar(null, formulario({ quedarse: "1", operacion: OPERACION, horario: JSON.stringify(HORARIO) }));
    expect(r).toMatchObject({ ok: true, id: LUGAR_ID });
    expect(m.rpc).not.toHaveBeenCalled();
    expect(m.insert).not.toHaveBeenCalled();
  });
  it("la comprobación de parecidos sigue antes de una operación nueva", async () => {
    m.existente.mockResolvedValue({ data: null, error: null });
    m.rpc.mockResolvedValue({ data: [{ id: LUGAR_ID, nombre: "Café existente" }], error: null });
    const r = await crearLugar(null, formulario({ quedarse: "1", operacion: OPERACION }));
    expect(r.ok).toBe(false);
    expect(llamadas("crear_lugar_con_horario")).toHaveLength(0);
  });
  it("un fallo al recuperar la operación no intenta escribir otra vez", async () => {
    m.existente.mockResolvedValue({ data: null, error: { message: "base no disponible" } });
    const r = await crearLugar(null, formulario({ quedarse: "1", operacion: OPERACION }));
    expect(r).toMatchObject({ ok: false, general: "No se pudo guardar el lugar. Intenta de nuevo." });
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("rechaza una clave inválida antes de consultar o escribir", async () => {
    const r = await crearLugar(null, formulario({ operacion: "no-es-uuid" }));
    expect(r.ok).toBe(false);
    expect(m.filtro).not.toHaveBeenCalled();
    expect(m.rpc).not.toHaveBeenCalled();
    expect(m.insert).not.toHaveBeenCalled();
  });
});
