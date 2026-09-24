import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { actualizarNovedadArtista, borrarNovedadArtista, publicarNovedadArtista } from "./acciones";

const m = vi.hoisted(() => ({ sesion: vi.fn(), insertar: vi.fn(), seleccionar: vi.fn(), actualizar: vi.fn(), borrar: vi.fn(), revalidar: vi.fn(), redirigir: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidar }));
vi.mock("next/navigation", () => ({ redirect: m.redirigir }));
vi.mock("@/lib/supabase/sesion", () => ({ sesionOEntrar: m.sesion }));

const ARTISTA_ID = "00000000-0000-4000-8000-000000000301";
const NOVEDAD_ID = "00000000-0000-4000-8000-000000000302";
const VOLVER = "/artistas/trio-de-luis";
const URL_YT = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const URL_BANDCAMP = "https://anareyes.bandcamp.com/album/nuevo-disco";
const OTRA_URL_BANDCAMP = "https://anareyes.bandcamp.com/track/otra-cancion";

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

/**
 * Un `builder` que imita la cadena de Supabase (`.eq().eq().maybeSingle()`, o directo `await` tras `.eq()`, como
 * hace `supabase-js` de verdad: sus consultas son "thenables"). `resultado` es lo que resuelve al final, sea por
 * `.maybeSingle()` o por `await` directo.
 */
function encadenar(resultado: unknown) {
  const b: Record<string, unknown> = {};
  b.eq = vi.fn(() => b);
  b.select = vi.fn(() => b);
  b.maybeSingle = vi.fn(() => Promise.resolve(resultado));
  b.then = (resuelve: (v: unknown) => void, rechaza: (e: unknown) => void) => Promise.resolve(resultado).then(resuelve, rechaza);
  return b;
}

beforeEach(() => {
  vi.resetAllMocks();
  const supabase = { from: () => ({ insert: m.insertar, select: m.seleccionar, update: m.actualizar, delete: m.borrar }) };
  m.sesion.mockResolvedValue({ supabase, user: { id: "persona" } });
  m.insertar.mockResolvedValue({ error: null });
  // Por omisión, la novedad ya guardada es de YouTube: la mayoría de las pruebas de actualizar no son sobre
  // Bandcamp y no necesitan otra cosa.
  m.seleccionar.mockImplementation(() => encadenar({ data: { url: URL_YT, proveedor: "youtube", embed_id: null }, error: null }));
  m.actualizar.mockImplementation(() => encadenar({ data: { id: NOVEDAD_ID }, error: null }));
  m.borrar.mockImplementation(() => encadenar({ data: null, error: null }));
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

// OL-185 (founder, 2026-09-24: «crea opción de editar publicaciones de artista, para borrar o corregir subidas»):
// corregir y borrar una novedad ya publicada.
describe("actualizarNovedadArtista", () => {
  it("un id que no es UUID no llega a la base", async () => {
    const r = await actualizarNovedadArtista("no-es-uuid", NOVEDAD_ID, VOLVER, null, formulario({ url: URL_YT }));
    expect(r).toEqual({ ok: false, errores: {}, general: "No sé de qué novedad es." });
    expect(m.sesion).not.toHaveBeenCalled();
    expect(m.seleccionar).not.toHaveBeenCalled();
    expect(m.actualizar).not.toHaveBeenCalled();
  });

  it("corrige título, texto y enlace (sin Bandcamp): llama a update con lo nuevo, sin tocar fetch", async () => {
    const fetchEspia = vi.fn();
    vi.stubGlobal("fetch", fetchEspia);
    const r = await actualizarNovedadArtista(ARTISTA_ID, NOVEDAD_ID, VOLVER, null, formulario({ url: "https://vimeo.com/123456789", titulo: "Corregido", texto: "Texto corregido" }));
    expect(m.actualizar).toHaveBeenCalledWith({ url: "https://vimeo.com/123456789", proveedor: "vimeo", embed_id: null, titulo: "Corregido", texto: "Texto corregido" });
    expect(fetchEspia).not.toHaveBeenCalled();
    expect(r).toEqual({ ok: true, volver: VOLVER });
    expect(m.revalidar).toHaveBeenCalledWith(VOLVER);
  });

  it("editar sin cambiar la URL de Bandcamp no llama al oEmbed: reusa el embed_id ya guardado", async () => {
    m.seleccionar.mockImplementation(() => encadenar({ data: { url: URL_BANDCAMP, proveedor: "bandcamp", embed_id: "album=999" }, error: null }));
    const fetchEspia = vi.fn();
    vi.stubGlobal("fetch", fetchEspia);

    const r = await actualizarNovedadArtista(ARTISTA_ID, NOVEDAD_ID, VOLVER, null, formulario({ url: URL_BANDCAMP, titulo: "Nuevo título" }));

    expect(fetchEspia).not.toHaveBeenCalled();
    expect(m.actualizar).toHaveBeenCalledWith(expect.objectContaining({ proveedor: "bandcamp", embed_id: "album=999" }));
    expect(r).toEqual({ ok: true, volver: VOLVER });
  });

  it("editar cambiando a otra URL de Bandcamp sí vuelve a consultar el oEmbed", async () => {
    m.seleccionar.mockImplementation(() => encadenar({ data: { url: URL_BANDCAMP, proveedor: "bandcamp", embed_id: "album=999" }, error: null }));
    const fetchEspia = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(jsonOembedBandcamp("track=42")) });
    vi.stubGlobal("fetch", fetchEspia);

    const r = await actualizarNovedadArtista(ARTISTA_ID, NOVEDAD_ID, VOLVER, null, formulario({ url: OTRA_URL_BANDCAMP }));

    expect(fetchEspia).toHaveBeenCalledTimes(1);
    expect(fetchEspia.mock.calls[0][0]).toBe(`https://bandcamp.com/oembed?url=${encodeURIComponent(OTRA_URL_BANDCAMP)}&format=json`);
    expect(m.actualizar).toHaveBeenCalledWith(expect.objectContaining({ url: OTRA_URL_BANDCAMP, proveedor: "bandcamp", embed_id: "track=42" }));
    expect(r).toEqual({ ok: true, volver: VOLVER });
  });

  it("si el proveedor nuevo no es Bandcamp, embed_id queda en null aunque antes fuera Bandcamp", async () => {
    m.seleccionar.mockImplementation(() => encadenar({ data: { url: URL_BANDCAMP, proveedor: "bandcamp", embed_id: "album=999" }, error: null }));
    const r = await actualizarNovedadArtista(ARTISTA_ID, NOVEDAD_ID, VOLVER, null, formulario({ url: URL_YT }));
    expect(m.actualizar).toHaveBeenCalledWith(expect.objectContaining({ proveedor: "youtube", embed_id: null }));
    expect(r).toEqual({ ok: true, volver: VOLVER });
  });

  it("sin la fila (novedad ajena o borrada) da el aviso genérico, sin llamar a update", async () => {
    m.seleccionar.mockImplementation(() => encadenar({ data: null, error: null }));
    const r = await actualizarNovedadArtista(ARTISTA_ID, NOVEDAD_ID, VOLVER, null, formulario({ url: URL_YT }));
    expect(r).toEqual({ ok: false, errores: {}, general: "No se pudo guardar. ¿Sigues con sesión y es tu ficha?" });
    expect(m.actualizar).not.toHaveBeenCalled();
  });

  it("el disparador de \"visible\"/\"artista_id\" (check_violation) se muestra tal cual lo dice la base", async () => {
    m.actualizar.mockImplementation(() => encadenar({ data: null, error: { code: "23514", message: "Esa parte de la novedad no se puede cambiar." } }));
    const r = await actualizarNovedadArtista(ARTISTA_ID, NOVEDAD_ID, VOLVER, null, formulario({ url: URL_YT }));
    expect(r).toEqual({ ok: false, errores: {}, general: "Esa parte de la novedad no se puede cambiar." });
  });

  it("quien no gestiona la ficha: 0 filas sin error da el aviso genérico, no un falso éxito", async () => {
    m.actualizar.mockImplementation(() => encadenar({ data: null, error: null }));
    const r = await actualizarNovedadArtista(ARTISTA_ID, NOVEDAD_ID, VOLVER, null, formulario({ url: URL_YT }));
    expect(r).toEqual({ ok: false, errores: {}, general: "No se pudo guardar. ¿Sigues con sesión y es tu ficha?" });
  });
});

describe("borrarNovedadArtista", () => {
  it("llama a delete con eq(\"id\") y eq(\"artista_id\"), revalida la ficha y redirige", async () => {
    const cadena = encadenar({ data: null, error: null });
    m.borrar.mockImplementation(() => cadena);

    await borrarNovedadArtista(ARTISTA_ID, NOVEDAD_ID, VOLVER);

    expect(m.borrar).toHaveBeenCalledWith();
    expect(cadena.eq).toHaveBeenNthCalledWith(1, "id", NOVEDAD_ID);
    expect(cadena.eq).toHaveBeenNthCalledWith(2, "artista_id", ARTISTA_ID);
    expect(m.revalidar).toHaveBeenCalledWith(VOLVER);
    expect(m.redirigir).toHaveBeenCalledWith(VOLVER);
  });
});
