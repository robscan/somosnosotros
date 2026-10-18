import { beforeEach, describe, expect, it, vi } from "vitest";
import { actualizarEvento, crearEvento, operacionDerivada, publicarBorrador } from "./acciones";

// OL-321 (bitácora 350): cómo ocurre un evento al guardar. Lo que no es un evento suelto viaja con `guardar_evento_con_clase` (la clase, el
// horario propio, la inauguración y el festival, en la misma transacción); un festival nuevo, con `publicar_programa`.
const m = vi.hoisted(() => ({ rpc: vi.fn(), sesion: vi.fn(), after: vi.fn(), invalidar: vi.fn(), redirect: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.invalidar }));
vi.mock("next/server", () => ({ after: m.after }));
vi.mock("next/navigation", () => ({ redirect: m.redirect, RedirectType: { replace: "replace" } }));
vi.mock("@/lib/supabase/sesion", () => ({ sesionOEntrar: m.sesion }));
vi.mock("@/lib/supabase/servidor", () => ({ clienteServidor: vi.fn(), esAdminDeSesion: vi.fn().mockResolvedValue(false) }));
vi.mock("@/lib/avisosWorker", () => ({ intentarDrenarAvisos: vi.fn() }));
vi.mock("@/lib/cartel", () => ({ leerCartel: vi.fn() }));

const ID = "00000000-0000-4000-8000-000000000001";
const FESTIVAL = "00000000-0000-4000-8000-0000000000f1";
const SITIO = { modo_sitio: "otro", sitio_texto: "Museo de prueba", sitio_direccion: "", sitio_lat: "22.15", sitio_lng: "-100.98", sitio_pin_pendiente: "no", revelar_horas: "24", ciudad: "San Luis Potosí" };

function formulario(campos: Record<string, string>) {
  const fd = new FormData();
  fd.set("operacion", ID);
  fd.set("revision", "2030-09-01T12:00:00Z");
  for (const [k, v] of Object.entries({ ...SITIO, titulo: "Ecos de papel", gratis: "si", quien: "[]", ...campos })) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.maybeSingle.mockResolvedValue({ data: null });
  const from = vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: m.maybeSingle })) })) }));
  m.sesion.mockResolvedValue({ supabase: { rpc: m.rpc, from }, user: { id: ID } });
  m.rpc.mockResolvedValue({ data: { id: ID, artistas: [], artistas_anteriores: [], lugar_anterior: null, cambio: null }, error: null });
  m.redirect.mockImplementation(() => {
    throw new Error("REDIRECT");
  });
});

describe("las claves derivadas", () => {
  it("son UUID válidos, siempre los mismos para la misma operación y distintos para cada cosa", async () => {
    const a = await operacionDerivada(ID, "inauguracion");
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(await operacionDerivada(ID, "inauguracion")).toBe(a);
    expect(await operacionDerivada(ID, "festival")).not.toBe(a);
  });
});

describe("una exposición", () => {
  it("se guarda con su clase, su horario propio y su inauguración en la hora de su sitio, con su clave derivada", async () => {
    const horario = JSON.stringify([{ dias: [2, 3, 4, 5, 6, 7], abre: "10:00", cierra: "18:00" }]);
    const fd = formulario({ clase: "exposicion", inicio: "2030-11-06T00:00", fin: "2030-11-30T23:59", horario, inauguracion: JSON.stringify({ dia: "2030-11-05", hora: "19:00" }) });
    expect((await crearEvento(null, fd)).ok).toBe(true);
    expect(m.rpc).toHaveBeenCalledWith("guardar_evento_con_clase", expect.objectContaining({
      p_evento: null,
      p_datos: expect.objectContaining({ inicio: "2030-11-06T06:00:00.000Z", fin: "2030-12-01T05:59:00.000Z" }),
      p_sesiones: null,
      p_clase: {
        clase: "exposicion",
        horario: [{ dias: [2, 3, 4, 5, 6, 7], abre: "10:00", cierra: "18:00" }],
        inauguracion: { inicio: "2030-11-06T01:00:00.000Z", fin: null, operacion: await operacionDerivada(ID, "inauguracion") },
        padre: null,
        padre_nuevo: null,
      },
    }));
  });

  it("con «Horario del lugar» manda el horario vacío (sin filas propias); un horario ilegible no llega a la base", async () => {
    await crearEvento(null, formulario({ clase: "exposicion", inicio: "2030-11-06T00:00", fin: "2030-11-30T23:59", horario: "" }));
    expect(m.rpc.mock.calls[0][1].p_clase).toMatchObject({ clase: "exposicion", horario: [], inauguracion: null });
    m.rpc.mockClear();
    const malo = await crearEvento(null, formulario({ clase: "exposicion", inicio: "2030-11-06T00:00", fin: "2030-11-30T23:59", horario: "no es json" }));
    expect(malo).toMatchObject({ ok: false, errores: { horario: expect.any(String) } });
    expect(m.rpc).not.toHaveBeenCalled();
  });
});

describe("un evento suelto y «Parte de un festival»", () => {
  it("sin festival se guarda como siempre, con la función de siempre", async () => {
    await crearEvento(null, formulario({ clase: "puntual", inicio: "2030-11-06T19:00" }));
    expect(m.rpc).toHaveBeenCalledWith("guardar_evento_con_avisos", expect.anything());
  });

  it("con un festival existente o uno nuevo con solo el nombre, con la clase (y la clave del nuevo, derivada)", async () => {
    await crearEvento(null, formulario({ clase: "puntual", inicio: "2030-11-06T19:00", padre: FESTIVAL }));
    expect(m.rpc.mock.calls[0][0]).toBe("guardar_evento_con_clase");
    expect(m.rpc.mock.calls[0][1].p_clase).toMatchObject({ clase: "puntual", padre: FESTIVAL, padre_nuevo: null });
    m.rpc.mockClear();
    await crearEvento(null, formulario({ clase: "puntual", inicio: "2030-11-06T19:00", padre_nuevo: "  Festival de Cine " }));
    expect(m.rpc.mock.calls[0][1].p_clase).toMatchObject({ padre: null, padre_nuevo: { titulo: "Festival de Cine", operacion: await operacionDerivada(ID, "festival") } });
  });

  it("al editar, un evento que deja de ser exposición (o de un festival) pasa por la función con la clase para quitarlo", async () => {
    m.maybeSingle.mockResolvedValue({ data: { clase: "exposicion", evento_padre_id: null, imagen: null, inicio: "2030-11-06T06:00:00Z", fin: null, zona: "America/Mexico_City", sitio_reservado: false, ciudad: "San Luis Potosí", sitio_lat: null, sitio_lng: null } });
    expect((await actualizarEvento(ID, null, formulario({ clase: "puntual", inicio: "2030-11-06T19:00" }))).ok).toBe(true);
    expect(m.rpc).toHaveBeenCalledWith("guardar_evento_con_clase", expect.objectContaining({ p_evento: ID, p_clase: expect.objectContaining({ clase: "puntual" }) }));
    m.rpc.mockClear();
    m.maybeSingle.mockResolvedValue({ data: { clase: "puntual", evento_padre_id: null, imagen: null, inicio: "2030-11-06T06:00:00Z", fin: null, zona: "America/Mexico_City", sitio_reservado: false, ciudad: "San Luis Potosí", sitio_lat: null, sitio_lng: null } });
    await actualizarEvento(ID, null, formulario({ clase: "puntual", inicio: "2030-11-06T19:00" }));
    expect(m.rpc).toHaveBeenCalledWith("editar_evento_con_sesiones", expect.anything());
  });
});

describe("un festival con su programa (H6)", () => {
  const acto = (titulo: string, inicio: string, marcado = true) => ({ titulo, inicio, fin: "", sitio: SITIO, quien: [{ nombre: "Cine Club" }], marcado });

  it("publica el marco y sus actos en una sola llamada: los marcados se publican y el desmarcado va como borrador, cada uno con su clave", async () => {
    m.rpc.mockResolvedValue({ data: { id: ID, actos: ["a1", "a2"], borradores: ["b1"] }, error: null });
    m.maybeSingle.mockResolvedValue({ data: { slug: "festival-de-cine-ab12" } });
    const fd = formulario({ clase: "festival", titulo: "Festival de Cine", actos: JSON.stringify([acto("Inauguración", "2030-11-12T19:00"), acto("Charla", "2030-11-13T18:00"), acto("Clausura", "2030-11-16T19:00", false)]) });
    const resultado = await crearEvento(null, fd);
    expect(resultado).toMatchObject({ ok: true, id: ID, slug: "festival-de-cine-ab12", programa: { actos: 2, borradores: 1 } });
    expect(m.rpc).toHaveBeenCalledTimes(1);
    const [funcion, args] = m.rpc.mock.calls[0];
    expect(funcion).toBe("publicar_programa");
    expect(args.p_operacion).toBe(ID);
    // «Gratis» elegido en un festival se guarda escrito (OL-411): ahí el vacío es «Por confirmar».
    expect(args.p_marco).toEqual({ datos: { titulo: "Festival de Cine", imagen: null, precio: "Gratis", descripcion: null, enlace: null }, quien: [] });
    expect(args.p_actos.every((a: { datos: { precio: string | null } }) => a.datos.precio === "Gratis")).toBe(true);
    expect(args.p_actos.map((a: { publicar: boolean }) => a.publicar)).toEqual([true, true, false]);
    expect(args.p_actos[0].datos).toMatchObject({ titulo: "Inauguración", inicio: "2030-11-13T01:00:00.000Z", sitio_texto: "Museo de prueba" });
    expect(args.p_actos[0].quien).toEqual([{ nombre: "Cine Club", tipo: expect.any(String) }]);
    expect(args.p_actos[2].operacion).toBe(await operacionDerivada(ID, "acto:2"));
  });

  it("un acto que no se puede publicar no deja nada: el error dice cuál y la base no se toca", async () => {
    const fd = formulario({ clase: "festival", titulo: "Festival de Cine", actos: JSON.stringify([acto("Charla", "2030-11-13T18:00"), acto("Sin fecha", "")]) });
    expect(await crearEvento(null, fd)).toMatchObject({ ok: false, general: expect.stringContaining("«Sin fecha»") });
    expect(m.rpc).not.toHaveBeenCalled();
  });

  it("sin ningún acto marcado es un festival sin programa (OL-413): sin su día y su hora no se publica ni se llama a la base", async () => {
    const fd = formulario({ clase: "festival", titulo: "Festival de Cine", actos: JSON.stringify([acto("Charla", "2030-11-13T18:00", false)]) });
    expect(await crearEvento(null, fd)).toMatchObject({ ok: false, errores: { inicio: expect.any(String) } });
    expect(m.rpc).not.toHaveBeenCalled();
  });
});

describe("un festival sin programa (OL-413)", () => {
  const CUMBIACHELLA = { clase: "festival", titulo: "Cumbiachella", inicio: "2030-10-30T20:00", fin: "2030-10-31T02:00", gratis: "no", por_confirmar: "si", quien: JSON.stringify([{ nombre: "Sonido Satanás" }, { nombre: "Vinyl Box" }]) };

  it("se publica como un evento con clase festival, en una sola llamada (`publicar_festival_sin_programa`): su día, su hora de 8 pm a 2 am, su sitio y su alineación", async () => {
    m.maybeSingle.mockResolvedValue({ data: { slug: "cumbiachella-ab12" } });
    const r = await crearEvento(null, formulario(CUMBIACHELLA));
    expect(r).toMatchObject({ ok: true, id: ID, slug: "cumbiachella-ab12" });
    expect(r).not.toHaveProperty("programa");
    expect(m.rpc).toHaveBeenCalledTimes(1);
    const [funcion, args] = m.rpc.mock.calls[0];
    expect(funcion).toBe("publicar_festival_sin_programa");
    expect(args).toMatchObject({ p_operacion: ID, p_sesiones: null, p_privado: null });
    expect(args.p_datos).toMatchObject({ titulo: "Cumbiachella", inicio: "2030-10-31T02:00:00.000Z", fin: "2030-10-31T08:00:00.000Z", sitio_texto: "Museo de prueba", precio: null, ciudad: "San Luis Potosí" });
    expect(args.p_quien).toEqual([{ nombre: "Sonido Satanás", tipo: expect.any(String) }, { nombre: "Vinyl Box", tipo: expect.any(String) }]);
  });

  it("con su horario por día (varias noches), las sesiones viajan con él", async () => {
    const sesiones = JSON.stringify([{ inicio: "2030-11-06T20:00", fin: "" }, { inicio: "2030-11-07T19:00", fin: "" }]);
    await crearEvento(null, formulario({ ...CUMBIACHELLA, inicio: "2030-11-06T20:00", fin: "2030-11-07T23:59", sesiones }));
    const [funcion, args] = m.rpc.mock.calls[0];
    expect(funcion).toBe("publicar_festival_sin_programa");
    expect(args.p_sesiones).toHaveLength(2);
  });

  it("si la base no lo publica (por ejemplo, sin la migración), lo dice y no inventa un evento", async () => {
    m.rpc.mockResolvedValue({ data: null, error: { message: "sin la función", code: "PGRST202" } });
    expect(await crearEvento(null, formulario(CUMBIACHELLA))).toMatchObject({ ok: false, general: "No se pudo publicar el festival. Intenta de nuevo." });
    expect(m.rpc).toHaveBeenCalledTimes(1);
  });
});

describe("el costo por confirmar (OL-411)", () => {
  const SIN_COSTO = { gratis: "no", cooperacion: "no", precio: "", por_confirmar: "si" };
  const acto = (titulo: string, inicio: string) => ({ titulo, inicio, fin: "", sitio: SITIO, quien: [], marcado: true });

  it("un festival sin costo se publica: el marco y cada acto van sin precio (nada que copiar)", async () => {
    m.rpc.mockResolvedValue({ data: { id: ID, actos: ["a1", "a2"], borradores: [] }, error: null });
    m.maybeSingle.mockResolvedValue({ data: { slug: "festival-ab12" } });
    const fd = formulario({ ...SIN_COSTO, clase: "festival", titulo: "Festival", actos: JSON.stringify([acto("Uno", "2030-11-12T19:00"), acto("Dos", "2030-11-13T19:00")]) });
    expect((await crearEvento(null, fd)).ok).toBe(true);
    const [, args] = m.rpc.mock.calls[0];
    expect(args.p_marco.datos.precio).toBeNull();
    expect(args.p_actos.map((a: { datos: { precio: string | null } }) => a.datos.precio)).toEqual([null, null]);
  });

  it("una exposición, un taller o un acto de festival se guardan sin costo; «Gratis» elegido, escrito", async () => {
    const casos: Record<string, string>[] = [{ clase: "exposicion", inicio: "2030-11-06T00:00", fin: "2030-11-30T23:59", horario: "" }, { clase: "taller", inicio: "2030-11-06T18:00" }, { clase: "puntual", inicio: "2030-11-06T18:00", padre: FESTIVAL }];
    for (const campos of casos) {
      m.rpc.mockClear();
      expect((await crearEvento(null, formulario({ ...SIN_COSTO, ...campos }))).ok, campos.clase).toBe(true);
      expect(m.rpc.mock.calls.at(-1)?.[1].p_datos.precio).toBeNull();
      m.rpc.mockClear();
      expect((await crearEvento(null, formulario({ ...campos, gratis: "si" }))).ok).toBe(true);
      expect(m.rpc.mock.calls.at(-1)?.[1].p_datos.precio).toBe("Gratis");
    }
  });

  it("un evento suelto no se publica sin costo, y gratis sigue siendo vacío", async () => {
    expect(await crearEvento(null, formulario({ ...SIN_COSTO, clase: "puntual", inicio: "2030-11-06T18:00" }))).toMatchObject({ ok: false, errores: { precio: expect.any(String) } });
    expect(m.rpc).not.toHaveBeenCalled();
    expect((await crearEvento(null, formulario({ clase: "puntual", inicio: "2030-11-06T18:00", gratis: "si", confirmado: "1" }))).ok).toBe(true);
    expect(m.rpc.mock.calls.at(-1)?.[1].p_datos.precio).toBeNull();
  });

  it("al editar, cuenta la clase que llega; sin ella (una pantalla de antes), la guardada", async () => {
    m.maybeSingle.mockResolvedValue({ data: { clase: "exposicion", evento_padre_id: null, imagen: null, inicio: "2030-11-06T06:00:00Z", fin: null, zona: "America/Mexico_City", sitio_reservado: false, ciudad: "San Luis Potosí", sitio_lat: null, sitio_lng: null } });
    expect((await actualizarEvento(ID, null, formulario({ ...SIN_COSTO, inicio: "2030-11-06T00:00", fin: "2030-11-30T23:59" }))).ok).toBe(true);
    expect(await actualizarEvento(ID, null, formulario({ ...SIN_COSTO, clase: "puntual", inicio: "2030-11-06T19:00" }))).toMatchObject({ ok: false, errores: { precio: expect.any(String) } });
  });
});

describe("publicar un borrador del programa (OL-328)", () => {
  it("publicado, vuelve a la ficha del festival", async () => {
    m.rpc.mockResolvedValue({ data: { id: ID, padre: FESTIVAL }, error: null });
    await expect(publicarBorrador(ID, "/eventos/festival-de-cine")).rejects.toThrow("REDIRECT");
    expect(m.rpc).toHaveBeenCalledWith("publicar_borrador_de_programa", { p_evento: ID });
    expect(m.redirect).toHaveBeenCalledWith("/eventos/festival-de-cine");
  });

  it("si la administración lo retiró, la ficha lo dice", async () => {
    m.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "no_publicable" } });
    await expect(publicarBorrador(ID, "/eventos/festival-de-cine")).rejects.toThrow("REDIRECT");
    expect(m.redirect).toHaveBeenCalledWith("/eventos/festival-de-cine?error=no_publicable");
  });

  it("otro rechazo vuelve con un aviso de publicación", async () => {
    m.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "sin_permiso" } });
    await expect(publicarBorrador(ID, "/eventos/festival-de-cine")).rejects.toThrow("REDIRECT");
    expect(m.redirect).toHaveBeenCalledWith("/eventos/festival-de-cine?error=publicar");
  });
  it.each(["https://ejemplo.org/salir", "//ejemplo.org", "/\\ejemplo.org", "/eventos\n/otra"])("descarta un regreso inseguro: %s", async (volver) => {
    m.rpc.mockResolvedValue({ data: { id: ID }, error: null });
    await expect(publicarBorrador(ID, volver)).rejects.toThrow("REDIRECT");
    expect(m.sesion).toHaveBeenCalledWith(`/eventos/${ID}`);
    expect(m.redirect).toHaveBeenCalledWith(`/eventos/${ID}`);
    expect(m.invalidar).not.toHaveBeenCalledWith(volver);
  });
  it("añade el error conservando la consulta y el ancla del regreso", async () => {
    m.rpc.mockResolvedValue({ data: null, error: { message: "sin_permiso" } });
    await expect(publicarBorrador(ID, "/eventos/festival?desde=agenda&error=viejo#programa")).rejects.toThrow("REDIRECT");
    expect(m.redirect).toHaveBeenCalledWith("/eventos/festival?desde=agenda&error=publicar#programa");
    expect(m.invalidar).toHaveBeenCalledWith("/eventos/festival");
  });
  it("un id inválido no llega a la función de publicar", async () => {
    await expect(publicarBorrador("no-es-id", "//ejemplo.org")).rejects.toThrow("REDIRECT");
    expect(m.rpc).not.toHaveBeenCalled();
    expect(m.redirect).toHaveBeenCalledWith("/eventos?error=publicar");
  });
});
