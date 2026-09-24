import { describe, expect, it } from "vitest";
import { enlaceVisible, enlacesDesdeJson, etiquetaEnlace, LIMITE_TITULO_ENLACE, limpiarTituloEnlace, normalizarRedes, reconocerEnlace } from "./enlaces";

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
  it("OL-168: reconoce Mixcloud, Deezer, Tidal, Twitch y Audiomack por su dominio", () => {
    const mixcloud = reconocerEnlace("https://www.mixcloud.com/usuario/");
    expect(mixcloud?.red).toBe("mixcloud");
    expect(etiquetaEnlace(mixcloud!)).toBe("Mixcloud");
    expect(reconocerEnlace("deezer.com/mx/artist/123")?.red).toBe("deezer");
    expect(etiquetaEnlace(reconocerEnlace("deezer.com/mx/artist/123")!)).toBe("Deezer");
    expect(reconocerEnlace("https://tidal.com/browse/artist/1")?.red).toBe("tidal");
    expect(etiquetaEnlace(reconocerEnlace("https://tidal.com/browse/artist/1")!)).toBe("Tidal");
    expect(reconocerEnlace("twitch.tv/losvecinos")?.red).toBe("twitch");
    expect(etiquetaEnlace(reconocerEnlace("twitch.tv/losvecinos")!)).toBe("Twitch");
    expect(reconocerEnlace("https://audiomack.com/losvecinos")?.red).toBe("audiomack");
    expect(etiquetaEnlace(reconocerEnlace("https://audiomack.com/losvecinos")!)).toBe("Audiomack");
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

describe("S-02 (docs/rediseno/46): homógrafos IDN se rechazan como un enlace inválido", () => {
  it("una letra de otro alfabeto que se ve igual a una latina (\"а\" cirílica U+0430) se rechaza, no se acepta como sitio", () => {
    expect(reconocerEnlace("аpple.com")).toBeNull();
    expect(reconocerEnlace("https://аpple.com/")).toBeNull();
  });
  it("un dominio ya en punycode (xn--) se rechaza igual", () => {
    expect(reconocerEnlace("https://xn--pple-43d.com/")).toBeNull();
  });
  it("un IDN legítimo (acento latino, p. ej. ñ) también se rechaza por ahora (decisión explícita de esta pieza)", () => {
    expect(reconocerEnlace("https://peña.mx")).toBeNull();
  });
  it("un dominio ASCII normal, sin punycode, se sigue aceptando", () => {
    expect(reconocerEnlace("casa1100.mx")?.red).toBe("sitio");
  });
});

describe("S-05 (docs/rediseno/46): usuario/contraseña incrustados en la URL se rechazan", () => {
  it("\"https://ejemplo.com@evil.com\" no se acepta (el dominio real es evil.com, no ejemplo.com)", () => {
    expect(reconocerEnlace("https://ejemplo.com@evil.com")).toBeNull();
  });
  it("con contraseña también se rechaza", () => {
    expect(reconocerEnlace("https://usuario:clave@evil.com")).toBeNull();
  });
  it("una URL normal, sin arroba de usuario, sigue funcionando", () => {
    expect(reconocerEnlace("https://vimeo.com/cineastaslp")?.red).toBe("vimeo");
  });
});

describe("limpiarTituloEnlace (OL-168, hallazgo del gestor: vaciar el título a mano sigue funcionando)", () => {
  it("un título vacío (borrado a mano en el campo, sin la ✕ de vaciar) queda sin título: undefined, no ''", () => {
    expect(limpiarTituloEnlace("")).toBeUndefined();
    expect(limpiarTituloEnlace("   ")).toBeUndefined();
    expect(limpiarTituloEnlace(undefined)).toBeUndefined();
  });
  it("recorta a 30, colapsa espacios y saltos de línea", () => {
    expect(limpiarTituloEnlace("Mi\ncanal  favorito ".padEnd(50, "x"))).toHaveLength(LIMITE_TITULO_ENLACE);
    expect(limpiarTituloEnlace("Mi\ncanal")).toBe("Mi canal");
  });
  it("S-06 (docs/rediseno/46): quita caracteres de control/formato Unicode invisibles antes de recortar", () => {
    // U+202E (RTL override): invierte visualmente el texto que sigue; se quita, no se guarda.
    expect(limpiarTituloEnlace("Mi‮titulo")).toBe("Mititulo");
    // U+200B (espacio de ancho cero) también se quita.
    expect(limpiarTituloEnlace("Mi​canal")).toBe("Micanal");
    // Un título hecho solo de caracteres invisibles queda sin título (undefined), no una cadena vacía "visible".
    expect(limpiarTituloEnlace("‮​")).toBeUndefined();
  });
});

describe("titulo (OL-168): la persona puede cambiar la etiqueta de cada enlace", () => {
  it("etiquetaEnlace usa el título si lo hay; si no, la etiqueta automática", () => {
    expect(etiquetaEnlace({ red: "mixcloud", url: "https://mixcloud.com/x", titulo: "Mi mezcla favorita" })).toBe("Mi mezcla favorita");
    expect(etiquetaEnlace({ red: "mixcloud", url: "https://mixcloud.com/x" })).toBe("Mixcloud");
    expect(etiquetaEnlace({ red: "mixcloud", url: "https://mixcloud.com/x", titulo: "" })).toBe("Mixcloud");
  });
  it("normalizarRedes recorta el título a 30 caracteres, quita saltos de línea y lo descarta si queda vacío", () => {
    const treinta1 = "123456789012345678901234567890X"; // 31 caracteres
    const [conTope] = normalizarRedes([{ url: "https://vimeo.com/a", titulo: treinta1 }]);
    expect(conTope.titulo).toHaveLength(LIMITE_TITULO_ENLACE);
    expect(conTope.titulo).toBe(treinta1.slice(0, LIMITE_TITULO_ENLACE));

    const [conSalto] = normalizarRedes([{ url: "https://vimeo.com/b", titulo: "Mi\ncanal " }]);
    expect(conSalto.titulo).toBe("Mi canal");

    const [sinTitulo] = normalizarRedes([{ url: "https://vimeo.com/c", titulo: "   " }]);
    expect(sinTitulo.titulo).toBeUndefined();
  });
  it("enlacesDesdeJson (lo que llega del formulario) conserva el título de cada enlace", () => {
    expect(enlacesDesdeJson(JSON.stringify([{ url: "https://www.mixcloud.com/usuario/", titulo: "Set en vivo" }]))).toEqual([
      { red: "mixcloud", url: "https://www.mixcloud.com/usuario", titulo: "Set en vivo" },
    ]);
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
