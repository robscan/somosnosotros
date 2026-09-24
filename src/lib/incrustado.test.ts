import { describe, expect, it } from "vitest";
import { embedIdDesdeOembedBandcamp, incrustadoDeNovedad } from "./incrustado";

describe("incrustadoDeNovedad", () => {
  it("YouTube y Vimeo: 16:9, mismo sandbox/allow que ui/VideoEmbed", () => {
    const yt = incrustadoDeNovedad({ proveedor: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", embed_id: null });
    expect(yt).toEqual({ src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", sandbox: "allow-scripts allow-same-origin allow-presentation", allow: "encrypted-media; picture-in-picture", alto: "16:9" });

    const vi = incrustadoDeNovedad({ proveedor: "vimeo", url: "https://vimeo.com/123456789", embed_id: null });
    expect(vi).toEqual({ src: "https://player.vimeo.com/video/123456789", sandbox: "allow-scripts allow-same-origin allow-presentation", allow: "encrypted-media; picture-in-picture", alto: "16:9" });
  });

  it("una forma de YouTube/Vimeo irreconocible da null (mismo criterio que videoEmbedDe)", () => {
    expect(incrustadoDeNovedad({ proveedor: "youtube", url: "https://www.youtube.com/@artista", embed_id: null })).toBeNull();
    expect(incrustadoDeNovedad({ proveedor: "vimeo", url: "https://vimeo.com/cineastaslp", embed_id: null })).toBeNull();
  });

  it("SoundCloud: arma el widget con la URL codificada como parámetro, alto fijo 166, allow-scripts allow-same-origin", () => {
    const r = incrustadoDeNovedad({ proveedor: "soundcloud", url: "https://soundcloud.com/anareyes/set-de-otono", embed_id: null });
    expect(r).toEqual({
      src: "https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fanareyes%2Fset-de-otono&color=%236d34c8&auto_play=false&hide_related=true&show_comments=false&show_user=true&visual=false",
      sandbox: "allow-scripts allow-same-origin",
      allow: "",
      alto: 166,
    });
  });

  it("SoundCloud: un set también arma el widget", () => {
    const r = incrustadoDeNovedad({ proveedor: "soundcloud", url: "https://soundcloud.com/anareyes/sets/lo-mejor-2026", embed_id: null });
    expect(r?.src).toContain("url=https%3A%2F%2Fsoundcloud.com%2Fanareyes%2Fsets%2Flo-mejor-2026");
  });

  it("SoundCloud: solo el perfil (sin pista) no arma reproductor", () => {
    expect(incrustadoDeNovedad({ proveedor: "soundcloud", url: "https://soundcloud.com/anareyes", embed_id: null })).toBeNull();
  });

  it("Mixcloud: arma el widget con el feed codificado, alto fijo 120", () => {
    const r = incrustadoDeNovedad({ proveedor: "mixcloud", url: "https://www.mixcloud.com/anareyes/set-de-otono/", embed_id: null });
    expect(r).toEqual({
      src: "https://www.mixcloud.com/widget/iframe/?feed=%2Fanareyes%2Fset-de-otono%2F&hide_cover=1&light=1",
      sandbox: "allow-scripts allow-same-origin",
      allow: "",
      alto: 120,
    });
  });

  it("Bandcamp: sin embed_id, todavía no hay reproductor (no es un error, aún no se conoce el id)", () => {
    expect(incrustadoDeNovedad({ proveedor: "bandcamp", url: "https://anareyes.bandcamp.com/album/nuevo-disco", embed_id: null })).toBeNull();
  });

  it("Bandcamp: con embed_id ya resuelto, arma el src con la plantilla fija, alto fijo 120", () => {
    const r = incrustadoDeNovedad({ proveedor: "bandcamp", url: "https://anareyes.bandcamp.com/album/nuevo-disco", embed_id: "album=1234567890" });
    expect(r).toEqual({
      src: "https://bandcamp.com/EmbeddedPlayer/album=1234567890/size=large/bgcol=ffffff/linkcol=6d34c8/tracklist=false/artwork=small/transparent=true/",
      sandbox: "allow-scripts allow-same-origin",
      allow: "",
      alto: 120,
    });
  });

  it("Bandcamp: un embed_id mal formado (aunque venga de la base) no arma el src", () => {
    expect(incrustadoDeNovedad({ proveedor: "bandcamp", url: "https://anareyes.bandcamp.com/album/nuevo-disco", embed_id: "<script>1" })).toBeNull();
    expect(incrustadoDeNovedad({ proveedor: "bandcamp", url: "https://anareyes.bandcamp.com/album/nuevo-disco", embed_id: "album=" })).toBeNull();
    expect(incrustadoDeNovedad({ proveedor: "bandcamp", url: "https://anareyes.bandcamp.com/album/nuevo-disco", embed_id: "video=123" })).toBeNull();
  });

  it("intentos de inyección: nada de lo pegado (comillas, <, javascript:, otro dominio) llega al src", () => {
    // SoundCloud: la ruta con un intento de inyección no calza con la regex estricta
    expect(incrustadoDeNovedad({ proveedor: "soundcloud", url: 'https://soundcloud.com/anareyes/"><script>alert(1)</script>', embed_id: null })).toBeNull();
    // SoundCloud: un query string con basura no se cuela (solo se usa el pathname, ya validado)
    const conQuery = incrustadoDeNovedad({ proveedor: "soundcloud", url: 'https://soundcloud.com/anareyes/set-de-otono?x="><script>', embed_id: null });
    expect(conQuery?.src).not.toContain("<script>");
    expect(conQuery?.src).not.toContain('"');
    // Mixcloud: dominio ajeno con "mixcloud.com" solo en la ruta
    expect(incrustadoDeNovedad({ proveedor: "mixcloud", url: "https://evil.com/mixcloud.com/anareyes/set/", embed_id: null })).toBeNull();
    // Mixcloud: subdominio falso
    expect(incrustadoDeNovedad({ proveedor: "mixcloud", url: "https://mixcloud.com.evil.com/anareyes/set/", embed_id: null })).toBeNull();
    // esquema no http(s)
    expect(incrustadoDeNovedad({ proveedor: "soundcloud", url: "javascript:alert(1)", embed_id: null })).toBeNull();
    // Bandcamp: el id no se arma desde la URL, así que una URL con basura no cambia nada del src si el id es válido
    const bc = incrustadoDeNovedad({ proveedor: "bandcamp", url: 'https://anareyes.bandcamp.com/album/"><script>', embed_id: "album=42" });
    expect(bc?.src).not.toContain("<script>");
    expect(bc?.src).not.toContain('"');
  });

  it("un proveedor sin reconocer da null", () => {
    // @ts-expect-error: proveedor fuera de la lista blanca de esta pieza, a propósito para la prueba
    expect(incrustadoDeNovedad({ proveedor: "spotify", url: "https://open.spotify.com/track/abc", embed_id: null })).toBeNull();
  });
});

describe("embedIdDesdeOembedBandcamp", () => {
  // Ejemplo fijo de una respuesta real del oEmbed de Bandcamp (doc del encargo, OL-181): la red a bandcamp.com
  // está cerrada en este entorno, así que se construye y prueba contra este ejemplo, no contra una llamada real.
  const OEMBED_ALBUM = {
    version: "1.0",
    type: "rich",
    provider_name: "Bandcamp",
    html: '<iframe style="border: 0; width: 100%; height: 120px;" src="https://bandcamp.com/EmbeddedPlayer/album=1234567890/size=large/bgcol=ffffff/linkcol=0687f5/tracklist=false/artwork=small/transparent=true/" seamless><a href="…">…</a></iframe>',
  };

  it("de un oEmbed de álbum extrae 'album=<id>'", () => {
    expect(embedIdDesdeOembedBandcamp(OEMBED_ALBUM)).toBe("album=1234567890");
  });

  it("de un oEmbed de pista extrae 'track=<id>'", () => {
    const oembed = { ...OEMBED_ALBUM, html: OEMBED_ALBUM.html.replace("album=1234567890", "track=987654321") };
    expect(embedIdDesdeOembedBandcamp(oembed)).toBe("track=987654321");
  });

  it("sin campo html, o con un html sin EmbeddedPlayer, da null", () => {
    expect(embedIdDesdeOembedBandcamp({ version: "1.0" })).toBeNull();
    expect(embedIdDesdeOembedBandcamp({ html: "<iframe src=\"https://bandcamp.com/otra-cosa/\"></iframe>" })).toBeNull();
  });

  it("un JSON que no es un objeto, o html que no es texto, da null sin reventar", () => {
    expect(embedIdDesdeOembedBandcamp(null)).toBeNull();
    expect(embedIdDesdeOembedBandcamp(undefined)).toBeNull();
    expect(embedIdDesdeOembedBandcamp("no es un objeto")).toBeNull();
    expect(embedIdDesdeOembedBandcamp([])).toBeNull();
    expect(embedIdDesdeOembedBandcamp({ html: 12345 })).toBeNull();
  });

  it("nunca devuelve el HTML: solo el id con la forma 'album=123'/'track=123'", () => {
    const id = embedIdDesdeOembedBandcamp(OEMBED_ALBUM);
    expect(id).not.toContain("<iframe");
    expect(id).toMatch(/^(album|track)=[0-9]+$/);
  });
});
