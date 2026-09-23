import { describe, expect, it } from "vitest";
import { enlaceVisible, enlacesDesdeJson, etiquetaEnlace, normalizarRedes, reconocerEnlace } from "./enlaces";

describe("reconocerEnlace", () => {
  it("reconoce la red por el dominio, con o sin https", () => {
    expect(reconocerEnlace("https://www.instagram.com/losvecinos")).toEqual({ red: "instagram", url: "https://www.instagram.com/losvecinos/" });
    expect(reconocerEnlace("https://instagram.com/losvecinos/")).toEqual({ red: "instagram", url: "https://www.instagram.com/losvecinos/" });
    expect(reconocerEnlace("vimeo.com/cineastaslp")).toEqual({ red: "vimeo", url: "https://vimeo.com/cineastaslp" });
    expect(reconocerEnlace("soundcloud.com/pedro-ibarra")?.red).toBe("soundcloud");
    expect(reconocerEnlace("https://losvecinos.bandcamp.com/")?.red).toBe("bandcamp");
    expect(reconocerEnlace("https://open.spotify.com/artist/abc")?.red).toBe("spotify");
    expect(reconocerEnlace("youtu.be/xyz")?.red).toBe("youtube");
    expect(reconocerEnlace("https://twitter.com/x")?.red).toBe("x");
    expect(reconocerEnlace("music.apple.com/mx/artist/1")?.red).toBe("applemusic");
  });
  it("@usuario es Instagram con www y barra final; un teléfono con lada es WhatsApp", () => {
    expect(reconocerEnlace("@losvecinos")).toEqual({ red: "instagram", url: "https://www.instagram.com/losvecinos/" });
    expect(reconocerEnlace("@cinemacuarentena")).toEqual({ red: "instagram", url: "https://www.instagram.com/cinemacuarentena/" });
    expect(reconocerEnlace("@usuario.con.puntos")).toEqual({ red: "instagram", url: "https://www.instagram.com/usuario.con.puntos/" });
    expect(reconocerEnlace("444 123 4567")).toEqual({ red: "whatsapp", url: "https://wa.me/524441234567" });
    expect(reconocerEnlace("+52 444 123 4567")?.url).toBe("https://wa.me/524441234567");
  });
  it("L17: @cinemacuarentena en todos los casos (con/sin espacio, mayúsculas, URL directa)", () => {
    // Caso base
    expect(reconocerEnlace("@cinemacuarentena")).toEqual({ red: "instagram", url: "https://www.instagram.com/cinemacuarentena/" });
    // Con espacio o salto de línea al final (simula pegar desde móvil)
    expect(reconocerEnlace("@cinemacuarentena ")).toEqual({ red: "instagram", url: "https://www.instagram.com/cinemacuarentena/" });
    expect(reconocerEnlace("@cinemacuarentena\n")).toEqual({ red: "instagram", url: "https://www.instagram.com/cinemacuarentena/" });
    expect(reconocerEnlace("@cinemacuarentena\t")).toEqual({ red: "instagram", url: "https://www.instagram.com/cinemacuarentena/" });
    // Con mayúsculas (la regex lo permite)
    expect(reconocerEnlace("@CinemaCuarentena")).toEqual({ red: "instagram", url: "https://www.instagram.com/CinemaCuarentena/" });
    // Como URL directa sin @
    expect(reconocerEnlace("instagram.com/cinemacuarentena")).toEqual({ red: "instagram", url: "https://www.instagram.com/cinemacuarentena/" });
    expect(reconocerEnlace("https://instagram.com/cinemacuarentena")).toEqual({ red: "instagram", url: "https://www.instagram.com/cinemacuarentena/" });
    expect(reconocerEnlace("https://www.instagram.com/cinemacuarentena/")).toEqual({ red: "instagram", url: "https://www.instagram.com/cinemacuarentena/" });
  });
  it("lo demás queda como sitio con etiqueta 'Sitio web'; lo que no es nada, null", () => {
    const e = reconocerEnlace("www.casa1100.mx/agenda");
    expect(e?.red).toBe("sitio");
    expect(etiquetaEnlace(e!)).toBe("Sitio web");
    expect(reconocerEnlace("")).toBeNull();
    expect(reconocerEnlace("hola")).toBeNull();
    expect(reconocerEnlace("123")).toBeNull();
  });
});

describe("normalizarRedes", () => {
  it("convierte la forma vieja (objeto por red) y acepta la nueva (lista), sin repetidos", () => {
    expect(normalizarRedes({ instagram: "@casa", whatsapp: "444 123 4567", sitio: "casa.mx", facebook: "" })).toEqual([
      { red: "instagram", url: "https://www.instagram.com/casa/" },
      { red: "whatsapp", url: "https://wa.me/524441234567" },
      { red: "sitio", url: "https://casa.mx" },
    ]);
    expect(normalizarRedes([{ red: "vimeo", url: "https://vimeo.com/a" }, { url: "https://vimeo.com/a" }])).toHaveLength(1);
    expect(normalizarRedes(null)).toEqual([]);
  });
  it("L17: formato viejo con @cinemacuarentena normaliza correctamente", () => {
    // Formato viejo de fichas: { instagram: "@usuario" }
    expect(normalizarRedes({ instagram: "@cinemacuarentena" })).toEqual([{ red: "instagram", url: "https://www.instagram.com/cinemacuarentena/" }]);
    // Formato viejo con espacios
    expect(normalizarRedes({ instagram: "@cinemacuarentena " })).toEqual([{ red: "instagram", url: "https://www.instagram.com/cinemacuarentena/" }]);
    // Formato viejo como URL
    expect(normalizarRedes({ instagram: "https://instagram.com/cinemacuarentena" })).toEqual([{ red: "instagram", url: "https://www.instagram.com/cinemacuarentena/" }]);
  });
});

describe("enlacesDesdeJson", () => {
  it("lee la lista del formulario, vuelve a reconocer cada uno y descarta basura", () => {
    expect(enlacesDesdeJson(JSON.stringify(["@casa", "hola", { url: "vimeo.com/x" }]))).toEqual([
      { red: "instagram", url: "https://www.instagram.com/casa/" },
      { red: "vimeo", url: "https://vimeo.com/x" },
    ]);
    expect(enlacesDesdeJson("no json")).toEqual([]);
  });
});

describe("enlaceVisible", () => {
  it("quita el esquema http(s) para el campo de la hoja de compartir (OL-154)", () => {
    expect(enlaceVisible("https://somosnosotros.org/artistas/ana-reyes")).toBe("somosnosotros.org/artistas/ana-reyes");
    expect(enlaceVisible("http://somosnosotros.org/artistas/ana-reyes")).toBe("somosnosotros.org/artistas/ana-reyes");
    expect(enlaceVisible("HTTPS://somosnosotros.org/artistas/ana-reyes")).toBe("somosnosotros.org/artistas/ana-reyes");
  });
  it("sin esquema, se queda igual", () => {
    expect(enlaceVisible("somosnosotros.org/artistas/ana-reyes")).toBe("somosnosotros.org/artistas/ana-reyes");
  });
});
