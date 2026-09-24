import { beforeEach, describe, expect, it, vi } from "vitest";
import { publicarNovedadArtista } from "./acciones";

const m = vi.hoisted(() => ({ sesion: vi.fn(), insertar: vi.fn(), revalidar: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidar }));
vi.mock("@/lib/supabase/sesion", () => ({ sesionOEntrar: m.sesion }));

const ARTISTA_ID = "00000000-0000-4000-8000-000000000301";
const VOLVER = "/artistas/trio-de-luis";
const URL_YT = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

function formulario(campos: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.resetAllMocks();
  const supabase = { from: () => ({ insert: m.insertar }) };
  m.sesion.mockResolvedValue({ supabase, user: { id: "persona" } });
  m.insertar.mockResolvedValue({ error: null });
});

describe("publicarNovedadArtista", () => {
  it("un id que no es UUID se rechaza sin pedir sesión ni tocar la base", async () => {
    const r = await publicarNovedadArtista("no-es-uuid", VOLVER, null, formulario({ url: URL_YT }));
    expect(r).toEqual({ ok: false, errores: {}, general: "No sé de qué artista es." });
    expect(m.sesion).not.toHaveBeenCalled();
    expect(m.insertar).not.toHaveBeenCalled();
  });

  it("sin sesión, sesionOEntrar manda a entrar (no se llega a insertar)", async () => {
    m.sesion.mockRejectedValue(new Error("redirect a /entrar"));
    await expect(publicarNovedadArtista(ARTISTA_ID, VOLVER, null, formulario({ url: URL_YT }))).rejects.toThrow();
    expect(m.insertar).not.toHaveBeenCalled();
  });

  it("un enlace vacío no llega a insertar y devuelve el error bajo el campo", async () => {
    const r = await publicarNovedadArtista(ARTISTA_ID, VOLVER, null, formulario({ url: "" }));
    expect(r).toEqual({ ok: false, errores: { url: "Pega el enlace de tu publicación." } });
    expect(m.insertar).not.toHaveBeenCalled();
  });

  it("un enlace que no es de YouTube no llega a insertar", async () => {
    const r = await publicarNovedadArtista(ARTISTA_ID, VOLVER, null, formulario({ url: "https://vimeo.com/123456789" }));
    expect(r).toEqual({ ok: false, errores: { url: "Solo enlaces de YouTube por ahora." } });
    expect(m.insertar).not.toHaveBeenCalled();
  });

  it("título por encima del tope no llega a insertar", async () => {
    const r = await publicarNovedadArtista(ARTISTA_ID, VOLVER, null, formulario({ url: URL_YT, titulo: "x".repeat(61) }));
    expect(r).toEqual({ ok: false, errores: { titulo: "Máximo 60 caracteres." } });
    expect(m.insertar).not.toHaveBeenCalled();
  });

  it("inserta con publicado_por de la sesión del servidor, nunca del formulario", async () => {
    const fd = formulario({ url: URL_YT, titulo: "Nuevo sencillo", texto: "Grabado en vivo" });
    fd.set("publicado_por", "otra-cuenta"); // si algo lo manda, se ignora: no forma parte de leer()
    const r = await publicarNovedadArtista(ARTISTA_ID, VOLVER, null, fd);
    expect(m.insertar).toHaveBeenCalledWith({
      artista_id: ARTISTA_ID,
      url: URL_YT,
      proveedor: "youtube",
      titulo: "Nuevo sencillo",
      texto: "Grabado en vivo",
      publicado_por: "persona",
    });
    expect(r).toEqual({ ok: true, volver: VOLVER });
    expect(m.revalidar).toHaveBeenCalledWith(VOLVER);
  });

  it("sin título ni texto, se guardan como null, no como cadena vacía", async () => {
    await publicarNovedadArtista(ARTISTA_ID, VOLVER, null, formulario({ url: URL_YT }));
    expect(m.insertar).toHaveBeenCalledWith(expect.objectContaining({ titulo: null, texto: null }));
  });

  it("el tope diario (check_violation) se muestra tal cual lo dice la base", async () => {
    m.insertar.mockResolvedValue({ error: { code: "23514", message: "Ya publicaste 5 novedades hoy. Mañana puedes seguir." } });
    const r = await publicarNovedadArtista(ARTISTA_ID, VOLVER, null, formulario({ url: URL_YT }));
    expect(r).toEqual({ ok: false, errores: {}, general: "Ya publicaste 5 novedades hoy. Mañana puedes seguir." });
    expect(m.revalidar).not.toHaveBeenCalled();
  });

  it("un rechazo de la base sin ser el tope (RLS: no gestiona la ficha) da un aviso genérico, no el código a secas", async () => {
    m.insertar.mockResolvedValue({ error: { code: "42501", message: "new row violates row-level security policy" } });
    const r = await publicarNovedadArtista(ARTISTA_ID, VOLVER, null, formulario({ url: URL_YT }));
    expect(r).toEqual({ ok: false, errores: {}, general: "No se pudo publicar. ¿Sigues con sesión y es tu ficha?" });
  });

  it("un corte de red al insertar llega al caller como fallo, no como éxito", async () => {
    m.insertar.mockRejectedValue(new Error("sin red"));
    await expect(publicarNovedadArtista(ARTISTA_ID, VOLVER, null, formulario({ url: URL_YT }))).rejects.toThrow("sin red");
  });
});
