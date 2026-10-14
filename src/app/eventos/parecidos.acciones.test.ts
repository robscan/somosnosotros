import { beforeEach, describe, expect, it, vi } from "vitest";
import { crearEvento } from "./acciones";

// OL-384: «¿Es este?» antes de publicar un evento, como el lugar. La regla vive en la base (`eventos_parecidos`, banco en
// supabase/tests/eventos_parecidos.mjs); aquí, cuándo se pregunta y qué se devuelve.
const m = vi.hoisted(() => ({ rpc: vi.fn(), sesion: vi.fn(), after: vi.fn(), previo: vi.fn(), slug: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: m.after }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), RedirectType: { replace: "replace" } }));
vi.mock("@/lib/supabase/sesion", () => ({ sesionOEntrar: m.sesion }));
vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: vi.fn(), esAdminDeSesion: vi.fn().mockResolvedValue(false) }));
vi.mock("@/lib/avisosWorker", () => ({ intentarDrenarAvisos: vi.fn() }));
vi.mock("@/lib/cartel", () => ({ leerCartel: vi.fn() }));

const USUARIA = "00000000-0000-4000-8000-0000000000a1";
const OPERACION = "00000000-0000-4000-8000-0000000000b1";
const NUEVO = "00000000-0000-4000-8000-0000000000c1";
const PARECIDO = {
  id: "00000000-0000-4000-8000-0000000000d1",
  slug: "gitanos-mexicanos-2-edicion-pargazz",
  titulo: "Gitanos mexicanos 2.ª edición: Pargazz",
  inicio: "2030-10-17T01:00:00.000Z",
  zona: "America/Mexico_City",
  imagen: null,
  lugar_id: null,
  lugar_nombre: null,
  sitio_texto: "Museo Francisco Cossío",
};

function formulario(cambios: Record<string, string> = {}) {
  const fd = new FormData();
  const campos = { operacion: OPERACION, modo_sitio: "otro", sitio_texto: "Museo Francisco Cossío", sitio_lat: "22.15", sitio_lng: "-100.97", ciudad: "San Luis Potosí", titulo: "Pargazz: Gitanos mexicanos, 2ª Edición", inicio: "2030-10-16T19:00", gratis: "si", ...cambios };
  for (const [k, v] of Object.entries(campos)) fd.set(k, v);
  return fd;
}
const llamadas = (nombre: string) => m.rpc.mock.calls.filter(([n]) => n === nombre);

let parecidos: { data: unknown; error: unknown };
beforeEach(() => {
  vi.clearAllMocks();
  parecidos = { data: [PARECIDO], error: null };
  m.previo.mockResolvedValue({ data: null, error: null });
  m.slug.mockResolvedValue({ data: { slug: "pargazz" } });
  // Dos lecturas de `eventos`: la de una respuesta perdida (operación y autora) y la del slug de lo recién creado.
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn((columna: string) => (columna === "operacion_guardado" ? { eq: vi.fn(() => ({ maybeSingle: m.previo })) } : { maybeSingle: m.slug })),
    })),
    update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
  }));
  m.sesion.mockResolvedValue({ supabase: { rpc: m.rpc, from }, user: { id: USUARIA } });
  m.rpc.mockImplementation(async (nombre: string) => (nombre === "eventos_parecidos" ? parecidos : { data: { id: NUEVO, artistas: [] }, error: null }));
});

describe("«¿Es este?» al publicar un evento (OL-384)", () => {
  it("con uno parecido y sin confirmar, no publica y lo devuelve para preguntar", async () => {
    expect(await crearEvento(null, formulario())).toEqual({ ok: false, errores: {}, parecidos: [PARECIDO] });
    expect(llamadas("eventos_parecidos")).toEqual([
      ["eventos_parecidos", { p_titulo: "Pargazz: Gitanos mexicanos, 2ª Edición", p_inicio: "2030-10-17T01:00:00.000Z", p_zona: "America/Mexico_City", p_lugar_id: null, p_sitio_texto: "Museo Francisco Cossío" }],
    ]);
    expect(llamadas("guardar_evento_con_avisos")).toHaveLength(0);
    expect(m.previo).toHaveBeenCalledTimes(1);
  });

  it("«No, es otro: publicar de todos modos» (confirmado) publica sin volver a preguntar", async () => {
    const r = await crearEvento(null, formulario({ confirmado: "1" }));
    expect(r).toMatchObject({ ok: true, id: NUEVO });
    expect(llamadas("eventos_parecidos")).toHaveLength(0);
    expect(llamadas("guardar_evento_con_avisos")).toHaveLength(1);
  });

  it("sin parecidos publica como siempre", async () => {
    parecidos = { data: [], error: null };
    expect(await crearEvento(null, formulario())).toMatchObject({ ok: true, id: NUEVO });
    expect(llamadas("guardar_evento_con_avisos")).toHaveLength(1);
  });

  it("un reintento de una operación que ya guardó no se encuentra a sí mismo: no pregunta y recupera lo guardado", async () => {
    m.previo.mockResolvedValue({ data: { id: NUEVO }, error: null });
    expect(await crearEvento(null, formulario())).toMatchObject({ ok: true, id: NUEVO });
    expect(llamadas("eventos_parecidos")).toHaveLength(0);
  });

  it("sin la migración (o si la lectura falla) publica: preguntar es una ayuda, no un candado", async () => {
    parecidos = { data: null, error: { message: "function public.eventos_parecidos does not exist" } };
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await crearEvento(null, formulario())).toMatchObject({ ok: true, id: NUEVO });
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("un taller también pregunta; una exposición no (ocupa un periodo)", async () => {
    expect(await crearEvento(null, formulario({ clase: "taller", fin: "2030-10-16T21:00" }))).toMatchObject({ ok: false, parecidos: [PARECIDO] });
    vi.clearAllMocks();
    m.rpc.mockImplementation(async (nombre: string) => (nombre === "eventos_parecidos" ? parecidos : { data: { id: NUEVO, artistas: [] }, error: null }));
    await crearEvento(null, formulario({ clase: "exposicion", visita_desde: "2030-10-16", visita_hasta: "2030-10-30" }));
    expect(llamadas("eventos_parecidos")).toHaveLength(0);
  });

  it("con un lugar del directorio manda su id", async () => {
    const LUGAR = "00000000-0000-4000-8000-0000000000e1";
    const fd = formulario({ modo_sitio: "lugar", lugar_id: LUGAR });
    fd.delete("sitio_texto");
    fd.delete("sitio_lat");
    fd.delete("sitio_lng");
    await crearEvento(null, fd);
    expect(llamadas("eventos_parecidos")[0]?.[1]).toMatchObject({ p_lugar_id: LUGAR });
  });
});
