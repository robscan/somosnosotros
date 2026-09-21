import { describe, expect, it } from "vitest";
import { aArtista, aLugar, clasificarPagina, deducirTipoLugar, destinoReal, extraerRegistros, recortarDescripcion, separarDireccion, unirDuplicados } from "./capo";

const enlaceGoogle = (u: string) => `<a href="https://www.google.com/url?q=${encodeURIComponent(u)}&amp;sa=D&amp;sntz=1&amp;usg=AOvVaw">x</a>`;

const PAGINA = `
<html><body><nav><h2>Disciplinas</h2><a href="/catalogoartistaspotosino/x">x</a></nav>
<div role="main">
<h1 class="a">Rock, Metal &amp; Alternativo</h1>
<section>
<img src="https://lh3.googleusercontent.com/sitesv/AAA=w1280">
<h2 class="z"><div><a href="#h.1"><span></span></a></div><span>Vitalis </span></h2>
<p class="p"><span>Banda potosina de rock, con seis a&#241;os de trayectoria.</span></p>
<p class="p"><span>Su m&uacute;sica abarca el rock.</span></p>
${enlaceGoogle("https://www.facebook.com/vitalisbandaoficial")}
${enlaceGoogle("https://open.spotify.com/artist/1MLZ?si=abc")}
<a href="mailto:Contacto@Vitalis.mx?subject=hola"><img src="https://ssl.gstatic.com/atari/images/sociallinks/email.png"></a>
${enlaceGoogle("https://forms.gle/UczLzBPV4CiVir956")}
<img src="https://lh3.googleusercontent.com/sitesv/BBB=w1280">
<h2><span>"Trezde Xantos"</span></h2>
<h2><span>Juan Alberto Rodr&iacute;guez</span></h2>
<p><span style="font-weight:700">(San Luis Potos&iacute;, 1990)</span></p>
<p>Escritor de graffiti.</p>
<h2>SERES Arte Inclusivo</h2><p>Compa&ntilde;&iacute;a inclusiva.</p>
<h2>SERES Arte Inclusivo</h2><p>Compa&ntilde;&iacute;a inclusiva.</p>${enlaceGoogle("https://www.instagram.com/seres")}
<h2>Tristana Landeros</h2><h2>(San Luis Potos&iacute;, 1974)</h2><p>Poeta.</p>
</section>
<section><img src="https://lh3.googleusercontent.com/sitesv/EEE"><h1>Natalie Rodriguez</h1><p>(san luis Potos&iacute;, 1981)</p><p>Bailarina y core&oacute;grafa.</p></section>
<section><p><span style="font-weight:700">Xochitini</span></p><p>(san luis Potos&iacute;)</p><p>Surge en enero de 1995.</p></section>
<section><h2>&Aacute;tico Espacio Esc&eacute;nico</h2><p>Alberga procesos.</p><p>Flavio Ayala 310 colonia El Paseo</p><p>Gallery 337</p><p>es una escuela.</p><p>BajoCeiba somos un foro.</p><h2>Gallery 337</h2><p>(San Luis Potos&iacute;)</p><h2>BajoCeiba</h2><a href="http://www.bajoceiba.com">x</a></section>
<section>
<a href="/catalogoartistaspotosino/disciplinas/artes-visuales_1/cine"><h2>Cine</h2></a><img src="https://lh3.googleusercontent.com/sitesv/CCC">
<h2>Pintura</h2><img src="https://lh3.googleusercontent.com/sitesv/DDD">
<h2>Sin nada</h2>
</section>
</div>
<footer><h2>Registro</h2><p>pie</p></footer>
</body></html>`;

describe("extraerRegistros", () => {
  const regs = extraerRegistros(PAGINA);
  it("una ficha por encabezado, con párrafos, redes (sin las de Google) y correo en minúsculas", () => {
    const v = regs.find((r) => r.nombre === "Vitalis")!;
    expect(v.parrafos).toEqual(["Banda potosina de rock, con seis años de trayectoria.", "Su música abarca el rock."]);
    expect(v.enlaces).toEqual(["https://www.facebook.com/vitalisbandaoficial", "https://open.spotify.com/artist/1MLZ?si=abc"]);
    expect(v.correos).toEqual(["contacto@vitalis.mx"]);
    expect(v.conImagen).toBe(true);
  });
  it("dos encabezados seguidos son alias y nombre: el segundo pasa a párrafo; el origen entre paréntesis se ignora", () => {
    const t = regs.find((r) => r.nombre === "Trezde Xantos")!; // las comillas que envuelven el nombre se quitan
    expect(t.parrafos).toEqual(["Juan Alberto Rodríguez", "(San Luis Potosí, 1990)", "Escritor de graffiti."]);
    expect(regs.find((r) => r.nombre === "Tristana Landeros")!.parrafos).toEqual(["Poeta."]);
    expect(regs.some((r) => r.nombre.startsWith("("))).toBe(false);
  });
  it("la misma ficha dos veces se une; los encabezados de menú, los vacíos y el pie no cuentan", () => {
    const s = regs.filter((r) => r.nombre === "SERES Arte Inclusivo");
    expect(s).toHaveLength(1);
    expect(s[0].enlaces).toEqual(["https://www.instagram.com/seres"]);
    expect(regs.map((r) => r.nombre)).toEqual(["Vitalis", "Trezde Xantos", "SERES Arte Inclusivo", "Tristana Landeros", "Natalie Rodriguez", "Xochitini", "Ático Espacio Escénico", "Gallery 337", "BajoCeiba"]);
  });
  it("el primer h1 es el título; los demás h1 son nombres; un párrafo corto seguido del origen también es un nombre", () => {
    expect(regs.find((r) => r.nombre === "Natalie Rodriguez")).toMatchObject({ parrafos: ["(san luis Potosí, 1981)", "Bailarina y coreógrafa."], conImagen: true });
    expect(regs.find((r) => r.nombre === "Xochitini")).toMatchObject({ parrafos: ["(san luis Potosí)", "Surge en enero de 1995."] });
    expect(regs.find((r) => r.nombre === "Tristana Landeros")!.parrafos).toEqual(["Poeta."]);
  });
  it("en páginas a columnas, el texto que venía antes del encabezado se reparte a su ficha", () => {
    expect(regs.find((r) => r.nombre === "Ático Espacio Escénico")!.parrafos).toEqual(["Alberga procesos.", "Flavio Ayala 310 colonia El Paseo"]);
    expect(regs.find((r) => r.nombre === "Gallery 337")!.parrafos).toEqual(["es una escuela."]);
    expect(regs.find((r) => r.nombre === "BajoCeiba")).toMatchObject({ parrafos: ["BajoCeiba somos un foro.", "(San Luis Potosí)"], enlaces: ["http://www.bajoceiba.com"] });
  });
  it("destinoReal desenvuelve el redirector de Google", () => {
    expect(destinoReal("https://www.google.com/url?q=https%3A%2F%2Fwww.instagram.com%2Fx%2F&amp;sa=D")).toBe("https://www.instagram.com/x/");
    expect(destinoReal("mailto:a@b.mx")).toBe("mailto:a@b.mx");
  });
});

describe("clasificarPagina", () => {
  const base = "https://www.catalogoartistaspotosino.com/catalogoartistaspotosino";
  it("música: género como detalle y tipo por la hoja", () => {
    expect(clasificarPagina(`${base}/disciplinas/música/rock-metal-alternativo/grupos`)).toMatchObject({ clase: "artista", disciplina: "musica", detalle: "rock, metal y alternativo", tipo: "grupo" });
    expect(clasificarPagina(`${base}/disciplinas/m%C3%BAsica/tradicional-folclore-canto-nuevo_1/solistas`)).toMatchObject({ disciplina: "musica", detalle: "tradicional, folclore y canto nuevo", tipo: "solista" });
    expect(clasificarPagina(`${base}/disciplinas/música/académica-clásica/académica-clásica`)).toMatchObject({ disciplina: "musica", detalle: "música académica y clásica", tipo: null });
  });
  it("escénicas, letras, visuales, cine y circo", () => {
    expect(clasificarPagina(`${base}/disciplinas/artes-escénicas/teatro/teatro_4`).disciplina).toBe("teatro");
    expect(clasificarPagina(`${base}/disciplinas/artes-escénicas/danza/02-danza`).disciplina).toBe("danza");
    expect(clasificarPagina(`${base}/disciplinas/artes-escénicas/artes-circenses/artes-circenses`)).toMatchObject({ disciplina: "circo", detalle: "" });
    expect(clasificarPagina(`${base}/disciplinas/literatura/literatura_2`).disciplina).toBe("letras");
    expect(clasificarPagina(`${base}/disciplinas/artes-visuales_1/fotografía/01-fotografía`)).toMatchObject({ disciplina: "artes_visuales", detalle: "fotografía" });
    expect(clasificarPagina(`${base}/disciplinas/artes-visuales_1/cine/01-cine`).disciplina).toBe("cine");
  });
  it("compañías son artistas (grupo); espacios son lugares; lo demás se ignora", () => {
    expect(clasificarPagina(`${base}/espacios-y-grupos-independientes/compañias-de-danza/compañias-de-danza-01`)).toMatchObject({ clase: "artista", disciplina: "danza", detalle: "compañía de danza", tipo: "grupo" });
    expect(clasificarPagina(`${base}/espacios-y-grupos-independientes/compañias-independientes-de-teatro`)).toMatchObject({ clase: "artista", disciplina: "teatro", tipo: "grupo" });
    expect(clasificarPagina(`${base}/espacios-y-grupos-independientes/espacios-de-divulgación`).clase).toBe("lugar");
    expect(clasificarPagina(`${base}/espacios-y-grupos-independientes/espacios-de-formación`).clase).toBe("lugar");
    expect(clasificarPagina(`${base}/disciplinas/artes-visuales`).clase).toBe("ignorar");
    expect(clasificarPagina(`${base}/recomendado/historico`).clase).toBe("ignorar");
    expect(clasificarPagina(`${base}`).clase).toBe("ignorar");
  });
});

describe("recortarDescripcion", () => {
  it("deja lo corto; corta en fin de frase; si no hay frase, en palabra con puntos suspensivos", () => {
    expect(recortarDescripcion("  Hola.  ")).toBe("Hola.");
    expect(recortarDescripcion("")).toBeNull();
    const frase = "Una frase completa que termina bien. ";
    const largo = frase.repeat(30);
    const r = recortarDescripcion(largo, 100)!;
    expect(r.length).toBeLessThanOrEqual(100);
    expect(r.endsWith(".")).toBe(true);
    const sinPuntos = "palabra ".repeat(40);
    const s = recortarDescripcion(sinPuntos, 100)!;
    expect(s.length).toBeLessThanOrEqual(100);
    expect(s.endsWith("…")).toBe(true);
  });
});

describe("aArtista", () => {
  const pagina = clasificarPagina("https://www.catalogoartistaspotosino.com/catalogoartistaspotosino/disciplinas/música/rock-metal-alternativo/solistas");
  it("nombre limpio, tipo corregido por el nombre, redes reconocidas, correos aparte", () => {
    const a = aArtista({ nombre: "Los Wornaut ", parrafos: ["(San Luis Potosí, 1999)", "Banda pionera."], enlaces: ["https://www.instagram.com/wornaut/", "https://forms.gle/x"], correos: ["w@w.mx"], conImagen: true }, pagina);
    expect(a).toMatchObject({ nombre: "Los Wornaut", disciplina: "musica", detalle: "rock, metal y alternativo", tipo: "grupo", descripcion: "Banda pionera.", correos: ["w@w.mx"], url_fuente: pagina.url });
    expect(a.redes).toEqual([{ red: "instagram", url: "https://www.instagram.com/wornaut/" }]);
  });
  it("nombre repetido dos veces y punto final se limpian; las iniciales conservan su punto", () => {
    const f = (nombre: string) => aArtista({ nombre, parrafos: ["x"], enlaces: [], correos: [], conImagen: false }, pagina).nombre;
    expect(f("¡Caracoles! Danza Teatro ¡Caracoles! Danza Teatro")).toBe("¡Caracoles! Danza Teatro");
    expect(f("Juan Bernardo torres segura.")).toBe("Juan Bernardo torres segura");
    expect(f("DREZZ. R.")).toBe("DREZZ. R.");
    expect(f("Teatro Carpa Medel Hns.")).toBe("Teatro Carpa Medel Hns.");
    expect(f("Orquesta de Cámara Sofía Cancino. OCSCAN")).toBe("Orquesta de Cámara Sofía Cancino. OCSCAN");
  });
  it("sin pista en el nombre manda el tipo de la página", () => {
    expect(aArtista({ nombre: "Ana Ruiz", parrafos: [], enlaces: [], correos: [], conImagen: false }, pagina).tipo).toBe("solista");
    expect(aArtista({ nombre: "Ana Ruiz", parrafos: [], enlaces: [], correos: [], conImagen: false }, { ...pagina, tipo: "grupo" }).tipo).toBe("grupo");
  });
});

describe("lugares", () => {
  const pagina = clasificarPagina("https://www.catalogoartistaspotosino.com/catalogoartistaspotosino/espacios-y-grupos-independientes/espacios-de-divulgación");
  it("separa la dirección por la etiqueta o por las últimas líneas con pinta de calle", () => {
    expect(separarDireccion(["Galería independiente", "Dirección", "Av. Potosí 646", "San Luis Potosí, S.L.P."])).toEqual({ descripcion: ["Galería independiente"], direccion: ["Av. Potosí 646", "San Luis Potosí, S.L.P."] });
    expect(separarDireccion(["Espacio de talleres desde 1998.", "Comonfort 1005. Col. Alamitos"])).toEqual({ descripcion: ["Espacio de talleres desde 1998."], direccion: ["Comonfort 1005. Col. Alamitos"] });
    expect(separarDireccion(["Librería y foro.", "Rayon 557"])).toEqual({ descripcion: ["Librería y foro."], direccion: ["Rayon 557"] });
    expect(separarDireccion(["Fundada en 1950 con 30 obras."])).toEqual({ descripcion: ["Fundada en 1950 con 30 obras."], direccion: [] });
    expect(separarDireccion(["Foro.", "Dirección", "Plan de Guadalupe con Coronel Espinoza.", "Espacios de formación"])).toEqual({ descripcion: ["Foro."], direccion: ["Plan de Guadalupe con Coronel Espinoza."] });
  });
  it("ficha de lugar con tipo deducido y ciudad añadida a la dirección", () => {
    const l = aLugar({ nombre: "VAGO GALERÍA", parrafos: ["Galería independiente de arte contemporáneo", "Dirección", "Av. Potosí 646"], enlaces: ["https://instagram.com/vago"], correos: [], conImagen: false }, pagina);
    expect(l).toMatchObject({ nombre: "VAGO GALERÍA", tipo: "galeria", descripcion: "Galería independiente de arte contemporáneo", direccion: "Av. Potosí 646, San Luis Potosí, S.L.P." });
    expect(aLugar({ nombre: "Índigo", parrafos: ["Taller.", "Independeiocnia 860. Zona Centro"], enlaces: [], correos: [], conImagen: false }, pagina).direccion).toBe("Independencia 860. Zona Centro, San Luis Potosí, S.L.P.");
    expect(aLugar({ nombre: "La Carrilla", parrafos: ["Teatro independiente", "Dirección", "Himno Nacional 4000-A", "San Luis Potosí, S.L.P."], enlaces: [], correos: [], conImagen: false }, pagina).direccion).toBe("Himno Nacional 4000-A, San Luis Potosí, S.L.P.");
    expect(deducirTipoLugar("Aurora Co-Lab espacio cultural")).toBe("colectivo");
    expect(deducirTipoLugar("Librería Rem")).toBe("otro");
    expect(deducirTipoLugar("Teatro Carpa Medel")).toBe("foro");
    expect(aLugar({ nombre: "Ático Espacio Escénico", parrafos: ["Exposiciones en la galería del foro."], enlaces: [], correos: [], conImagen: false }, pagina).tipo).toBe("foro");
  });
});

describe("unirDuplicados", () => {
  it("el mismo nombre en dos páginas se queda una vez, con las redes de ambas", () => {
    const a = { nombre: "Ana Ruiz", redes: [{ red: "instagram" as const, url: "https://instagram.com/ana" }], correos: ["a@a.mx"], descripcion: null, url_fuente: "u1" };
    const b = { nombre: "ANA RUÍZ", redes: [{ red: "youtube" as const, url: "https://youtube.com/@ana" }], correos: ["b@b.mx"], descripcion: "Cantante.", url_fuente: "u2" };
    const { unicas, repetidas } = unirDuplicados([a, b]);
    expect(unicas).toHaveLength(1);
    expect(unicas[0]).toMatchObject({ nombre: "Ana Ruiz", descripcion: "Cantante.", correos: ["a@a.mx", "b@b.mx"] });
    expect(unicas[0].redes.map((r) => r.red)).toEqual(["instagram", "youtube"]);
    expect(repetidas).toEqual([{ nombre: "ANA RUÍZ", urls: ["u1", "u2"] }]);
  });
});
