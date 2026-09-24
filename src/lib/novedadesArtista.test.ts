import { describe, expect, it } from "vitest";
import { fechaRelativaNovedadArtista, reconocerNovedadEnlace, validarNovedadArtista } from "./novedadesArtista";

describe("reconocerNovedadEnlace", () => {
  it("un enlace de YouTube se reconoce, normalizado", () => {
    const r = reconocerNovedadEnlace("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s");
    expect(r).toEqual({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s", proveedor: "youtube" });
  });

  it("youtu.be y un dominio pelón (sin https://) también se reconocen", () => {
    expect(reconocerNovedadEnlace("https://youtu.be/dQw4w9WgXcQ")?.proveedor).toBe("youtube");
    expect(reconocerNovedadEnlace("youtube.com/watch?v=dQw4w9WgXcQ")?.proveedor).toBe("youtube");
  });

  it("Vimeo se reconoce (OL-181, fase 2 del doc 44)", () => {
    expect(reconocerNovedadEnlace("https://vimeo.com/123456789")).toEqual({ url: "https://vimeo.com/123456789", proveedor: "vimeo" });
    expect(reconocerNovedadEnlace("https://vimeo.com/cineastaslp")).toBeNull(); // id no numérico: no se reconoce
  });

  it("SoundCloud: pista o set se reconocen; una forma sin pista (solo perfil) no", () => {
    expect(reconocerNovedadEnlace("https://soundcloud.com/anareyes/set-de-otono")).toEqual({ url: "https://soundcloud.com/anareyes/set-de-otono", proveedor: "soundcloud" });
    expect(reconocerNovedadEnlace("https://soundcloud.com/anareyes/sets/lo-mejor-2026")?.proveedor).toBe("soundcloud");
    expect(reconocerNovedadEnlace("https://soundcloud.com/anareyes")).toBeNull(); // solo el perfil, sin pista
  });

  it("Mixcloud: usuario/show se reconoce; solo el usuario, sin show, no", () => {
    // reconocerEnlace normaliza sin la barra final (lib/enlaces.ts, sin tocarlo).
    expect(reconocerNovedadEnlace("https://www.mixcloud.com/anareyes/set-de-otono/")).toEqual({ url: "https://www.mixcloud.com/anareyes/set-de-otono", proveedor: "mixcloud" });
    expect(reconocerNovedadEnlace("https://www.mixcloud.com/anareyes/")).toBeNull();
  });

  it("Bandcamp: álbum o pista de un subdominio de artista se reconocen; www.bandcamp.com y bandcamp.com pelón no", () => {
    expect(reconocerNovedadEnlace("https://anareyes.bandcamp.com/album/nuevo-disco")).toEqual({ url: "https://anareyes.bandcamp.com/album/nuevo-disco", proveedor: "bandcamp" });
    expect(reconocerNovedadEnlace("https://anareyes.bandcamp.com/track/otra-cancion")?.proveedor).toBe("bandcamp");
    expect(reconocerNovedadEnlace("https://www.bandcamp.com/album/nuevo-disco")).toBeNull();
    expect(reconocerNovedadEnlace("https://bandcamp.com/album/nuevo-disco")).toBeNull();
    expect(reconocerNovedadEnlace("https://anareyes.bandcamp.com/")).toBeNull(); // sin /album/ ni /track/
  });

  it("Spotify, Deezer y el resto del doc 44 no entran en esta pieza", () => {
    expect(reconocerNovedadEnlace("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC")).toBeNull();
    expect(reconocerNovedadEnlace("https://www.deezer.com/track/123456")).toBeNull();
  });

  it("un sitio cualquiera, un enlace vacío o mal formado no se reconoce", () => {
    expect(reconocerNovedadEnlace("misitio.com/cancion-nueva")).toBeNull();
    expect(reconocerNovedadEnlace("")).toBeNull();
    expect(reconocerNovedadEnlace("   ")).toBeNull();
    expect(reconocerNovedadEnlace("no es un enlace")).toBeNull();
  });

  it("una forma de YouTube sin id válido (canal, @usuario) tampoco se reconoce", () => {
    expect(reconocerNovedadEnlace("https://www.youtube.com/channel/UC1234567890")).toBeNull();
    expect(reconocerNovedadEnlace("https://www.youtube.com/@artista")).toBeNull();
  });

  it("intentos de inyección en la ruta de SoundCloud/Mixcloud no se reconocen (la regex es estricta)", () => {
    expect(reconocerNovedadEnlace('https://soundcloud.com/anareyes/<script>alert(1)</script>')).toBeNull();
    expect(reconocerNovedadEnlace("https://www.mixcloud.com/anareyes/../../admin/")).toBeNull();
  });
});

describe("validarNovedadArtista", () => {
  it("un enlace de YouTube reconocido, sin título ni texto, no trae errores", () => {
    const { datos, errores } = validarNovedadArtista({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", titulo: "", texto: "" });
    expect(errores).toEqual({});
    expect(datos).toEqual({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", proveedor: "youtube", titulo: null, texto: null });
  });

  it("un enlace de Bandcamp reconocido no trae error de enlace", () => {
    const { datos, errores } = validarNovedadArtista({ url: "https://anareyes.bandcamp.com/album/nuevo-disco", titulo: "", texto: "" });
    expect(errores.url).toBeUndefined();
    expect(datos).toEqual({ url: "https://anareyes.bandcamp.com/album/nuevo-disco", proveedor: "bandcamp", titulo: null, texto: null });
  });

  it("con título y texto dentro del tope, los conserva recortados de espacios", () => {
    const { datos, errores } = validarNovedadArtista({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", titulo: "  Nuestro nuevo EP  ", texto: " Grabado en vivo " });
    expect(errores).toEqual({});
    expect(datos.titulo).toBe("Nuestro nuevo EP");
    expect(datos.texto).toBe("Grabado en vivo");
  });

  it("sin enlace, pide uno", () => {
    const { errores, datos } = validarNovedadArtista({ url: "", titulo: "", texto: "" });
    expect(errores.url).toBe("Pega el enlace de tu publicación.");
    expect(datos.proveedor).toBeNull();
  });

  it("un enlace no reconocido (Spotify, o cualquier otro sitio) dice cuáles proveedores sí funcionan", () => {
    const { errores, datos } = validarNovedadArtista({ url: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC", titulo: "", texto: "" });
    expect(errores.url).toBe("Solo enlaces de YouTube, Vimeo, SoundCloud, Bandcamp o Mixcloud.");
    expect(datos.proveedor).toBeNull();
    expect(datos.url).toBe("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC");
  });

  it("título y texto por encima del tope (60 y 280) dan su propio error, sin tocar el del enlace", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const { errores } = validarNovedadArtista({ url, titulo: "x".repeat(61), texto: "x".repeat(281) });
    expect(errores.url).toBeUndefined();
    expect(errores.titulo).toBe("Máximo 60 caracteres.");
    expect(errores.texto).toBe("Máximo 280 caracteres.");
  });

  it("exactamente en el tope (60 y 280) no da error", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const { errores } = validarNovedadArtista({ url, titulo: "x".repeat(60), texto: "x".repeat(280) });
    expect(errores).toEqual({});
  });

  it("entradas que no son texto (null, un archivo) se leen como vacías, sin reventar", () => {
    const { errores } = validarNovedadArtista({ url: null, titulo: undefined, texto: null });
    expect(errores.url).toBe("Pega el enlace de tu publicación.");
  });
});

describe("fechaRelativaNovedadArtista", () => {
  const ahora = new Date("2026-09-24T18:00:00.000Z"); // martes, tarde en San Luis Potosí (UTC-6)

  it("hoy mismo dice «Hoy»", () => {
    expect(fechaRelativaNovedadArtista("2026-09-24T15:00:00.000Z", ahora)).toBe("Hoy");
  });

  it("temprano en la madrugada de hoy (en UTC, ayer) también es «Hoy» en la zona de la ciudad", () => {
    // 2026-09-24T02:00:00Z es 2026-09-23 20:00 en America/Mexico_City (UTC-6): parte del "hoy" de la ciudad, no de ayer.
    const madrugada = new Date("2026-09-25T04:00:00.000Z"); // 2026-09-24T22:00 en la ciudad
    expect(fechaRelativaNovedadArtista("2026-09-24T20:00:00.000Z", madrugada)).toBe("Hoy");
  });

  it("el día de calendario anterior en la ciudad dice «Ayer»", () => {
    expect(fechaRelativaNovedadArtista("2026-09-23T15:00:00.000Z", ahora)).toBe("Ayer");
  });

  it("más viejo que ayer, día y mes cortos, sin año ni día de la semana", () => {
    expect(fechaRelativaNovedadArtista("2026-09-12T15:00:00.000Z", ahora)).toBe("12 sep");
  });
});
