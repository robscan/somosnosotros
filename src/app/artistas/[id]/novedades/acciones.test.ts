import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { publicarNovedadArtista } from "./acciones";

const m = vi.hoisted(() => ({ sesion: vi.fn(), insertar: vi.fn(), revalidar: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidar }));
vi.mock("@/lib/supabase/sesion", () => ({ sesionOEntrar: m.sesion }));

const ARTISTA_ID = "00000000-0000-4000-8000-000000000301";
const VOLVER = "/artistas/trio-de-luis";
const URL_YT = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const URL_BANDCAMP = "https://anareyes.bandcamp.com/album/nuevo-disco";

// Ejemplo fijo de una respuesta real del oEmbed de Bandcamp (doc del encargo, OL-181): la red a bandcamp.com está
// cerrada en este entorno, así que estas pruebas simulan `fetch`, no llaman a la red real.
function jsonOembedBandcamp(idHtml = "album=1234567890") {
  return {
    version: "1.0",
    type: "rich",
    provider_name: "Bandcamp",
    html: `<iframe style="border: 0; width: 100%; height: 120px;" src="https://bandcamp.com/EmbeddedPlayer/${idHtml}/size=large/bgcol=ffffff/linkcol=0687f5/tracklist=false/artwork=small/transparent=true/" seamless><a href="…">…</a></iframe>`,
  };
}

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

afterEach(() => {
  vi.unstubAllGlobals();
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

  it("un enlace que no reconoce ningún proveedor de esta pieza (p. ej. Spotify) no llega a insertar", async () => {
    const r = await publicarNovedadArtista(ARTISTA_ID, VOLVER, null, formulario({ url: "https://open.spotify.com/track/abc123" }));
    expect(r).toEqual({ ok: false, errores: { url: "Solo enlaces de YouTube, Vimeo, SoundCloud, Bandcamp o Mixcloud." } });
    expect(m.insertar).not.toHaveBeenCalled();
  });

  it("título por encima del tope no llega a insertar", async () => {
    const r = await publicarNovedadArtista(ARTISTA_ID, VOLVER, null, formulario({ url: URL_YT, titulo: "x".repeat(61) }));
    expect(r).toEqual({ ok: false, errores: { titulo: "Máximo 60 caracteres." } });
    expect(m.insertar).not.toHaveBeenCalled();
  });

  it("inserta con publicado_por de la sesión del servidor, nunca del formulario; embed_id null fuera de Bandcamp", async () => {
    const fd = formulario({ url: URL_YT, titulo: "Nuevo sencillo", texto: "Grabado en vivo" });
    fd.set("publicado_por", "otra-cuenta"); // si algo lo manda, se ignora: no forma parte de leer()
    const r = await publicarNovedadArtista(ARTISTA_ID, VOLVER, null, fd);
    expect(m.insertar).toHaveBeenCalledWith({
      artista_id: ARTISTA_ID,
      url: URL_YT,
      proveedor: "youtube",
      embed_id: null,
      titulo: "Nuevo sencillo",
      texto: "Grabado en vivo",
      publicado_por: "persona",
    });
    expect(r).toEqual({ ok: true, volver: VOLVER });
    expect(m.revalidar).toHaveBeenCalledWith(VOLVER);
  });

  it("Vimeo, SoundCloud y Mixcloud insertan directo, sin llamar a fetch (solo Bandcamp necesita el oEmbed)", async () => {
    const fetchEspia = vi.fn();
    vi.stubGlobal("fetch", fetchEspia);

    await publicarNovedadArtista(ARTISTA_ID, VOLVER, null, formulario({ url: "https://vimeo.com/123456789" }));
    expect(m.insertar).toHaveBeenCalledWith(expect.objectContaining({ proveedor: "vimeo", embed_id: null }));

    await publicarNovedadArtista(ARTISTA_ID, VOLVER, null, formulario({ url: "https://soundcloud.com/anareyes/set-de-otono" }));
    expect(m.insertar).toHaveBeenCalledWith(expect.objectContaining({ proveedor: "soundcloud", embed_id: null }));

    await publicarNovedadArtista(ARTISTA_ID, VOLVER, null, formulario({ url: "https://www.mixcloud.com/anareyes/set-de-otono/" }));
    expect(m.insertar).toHaveBeenCalledWith(expect.objectContaining({ proveedor: "mixcloud", embed_id: null }));

    expect(fetchEspia).not.toHaveBeenCalled();
  });

  it("Bandcamp: consulta el oEmbed, guarda solo el embed_id ('album=123'), nunca el HTML", async () => {
    const fetchEspia = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(jsonOembedBandcamp("album=1234567890")) });
    vi.stubGlobal("fetch", fetchEspia);

    const r = await publicarNovedadArtista(ARTISTA_ID, VOLVER, null, formulario({ url: URL_BANDCAMP }));

    expect(fetchEspia).toHaveBeenCalledTimes(1);
    const [urlLlamada, opciones] = fetchEspia.mock.calls[0];
    expect(urlLlamada).toBe(`https://bandcamp.com/oembed?url=${encodeURIComponent(URL_BANDCAMP)}&format=json`);
    expect(opciones).toMatchObject({ redirect: "error" });
    expect(opciones.signal).toBeInstanceOf(AbortSignal);

    expect(m.insertar).toHaveBeenCalledWith(expect.objectContaining({ proveedor: "bandcamp", url: URL_BANDCAMP, embed_id: "album=1234567890" }));
    const filaInsertada = m.insertar.mock.calls[0][0];
    expect(JSON.stringify(filaInsertada)).not.toContain("iframe"); // nunca se guarda el HTML del oEmbed
    expect(r).toEqual({ ok: true, volver: VOLVER });
  });

  it("Bandcamp: una pista ('track=123') también se guarda", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(jsonOembedBandcamp("track=42")) }));
    await publicarNovedadArtista(ARTISTA_ID, VOLVER, null, formulario({ url: "https://anareyes.bandcamp.com/track/otra-cancion" }));
    expect(m.insertar).toHaveBeenCalledWith(expect.objectContaining({ proveedor: "bandcamp", embed_id: "track=42" }));
  });

  it("Bandcamp: si el oEmbed no trae un id reconocible, no se guarda y el error queda bajo el campo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ html: "<iframe src=\"https://bandcamp.com/otra-cosa/\"></iframe>" }) }));
    const r = await publicarNovedadArtista(ARTISTA_ID, VOLVER, null, formulario({ url: URL_BANDCAMP }));
    expect(r).toEqual({ ok: false, errores: { url: "No pude leer ese enlace de Bandcamp. Revisa que sea la página de un álbum o una pista." } });
    expect(m.insertar).not.toHaveBeenCalled();
  });

  it("Bandcamp: si el oEmbed responde con error HTTP, no se guarda", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) }));
    const r = await publicarNovedadArtista(ARTISTA_ID, VOLVER, null, formulario({ url: URL_BANDCAMP }));
    expect(r).toEqual({ ok: false, errores: { url: "No pude leer ese enlace de Bandcamp. Revisa que sea la página de un álbum o una pista." } });
    expect(m.insertar).not.toHaveBeenCalled();
  });

  it("Bandcamp: si fetch falla (red, tiempo agotado), no se guarda y no revienta", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sin red")));
    const r = await publicarNovedadArtista(ARTISTA_ID, VOLVER, null, formulario({ url: URL_BANDCAMP }));
    expect(r).toEqual({ ok: false, errores: { url: "No pude leer ese enlace de Bandcamp. Revisa que sea la página de un álbum o una pista." } });
    expect(m.insertar).not.toHaveBeenCalled();
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
