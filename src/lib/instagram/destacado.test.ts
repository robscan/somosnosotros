import { describe, expect, it } from "vitest";
import { avisoPrevio, cejaArtista, cejaLugar, conversacionDe, gancho, proximaEnTarjeta, saludoDe, textoArtista, textoLugar, textoSemana, tituloSemana } from "./destacado";
import { revisarTexto } from "./texto";

// Miércoles 7 de octubre de 2026, 10:00 en San Luis Potosí.
const AHORA = new Date("2026-10-07T16:00:00Z");
const ZONA = "America/Mexico_City";
const ig = (u: string) => [{ url: `https://www.instagram.com/${u}` }];

const VALERIA = {
  nombre: "Valeria Quiroz",
  slug: "valeria-quiroz",
  descripcion: "Cantautora potosina. Escribe canciones sobre el desierto, la carretera y las abuelas, con guitarra y una loop station. Toca en museos, galerías y foros de la ciudad desde 2024 y prepara su primer disco.",
  disciplina: "musica",
  detalle: "canción",
  ciudad: "San Luis Potosí",
  redes: ig("valeriaquiroz"),
  proxima: { inicio: "2026-10-17T01:00:00Z", zona: ZONA, lugar: "Teatro de la Paz", lugarRedes: ig("teatrodelapazslp") },
};

describe("la frase gancho", () => {
  it("las primeras oraciones hasta tener 60 letras, cortada en una oración", () => {
    expect(gancho(VALERIA.descripcion)).toBe("Cantautora potosina. Escribe canciones sobre el desierto, la carretera y las abuelas, con guitarra y una loop station.");
  });
  it("una oración larga sola vale si no pasa de 220", () => {
    const d = "Antigua estación de ferrocarril convertida en museo, con locomotoras de vapor y salas sobre la historia del tren. Tiene un foro.";
    expect(gancho(d)).toBe("Antigua estación de ferrocarril convertida en museo, con locomotoras de vapor y salas sobre la historia del tren.");
  });
  it("no pasa de 220: si la segunda no cabe, va solo la primera", () => {
    const corta = "Hola.";
    const larga = `${"palabra ".repeat(40).trim()}.`;
    expect(gancho(`${corta} ${larga}`)).toBe("Hola.");
  });
  it("sin puntos y muy larga: se corta en una palabra, con «…»", () => {
    const g = gancho("palabra ".repeat(60));
    expect([...g].length).toBeLessThanOrEqual(220);
    expect(g.endsWith("palabra…")).toBe(true);
  });
  it("los espacios y saltos de más se limpian", () => {
    expect(gancho("  Uno   dos.\n\nTres.  ")).toBe("Uno dos. Tres.");
  });
});

describe("el texto del artista", () => {
  const t = textoArtista(VALERIA, AHORA);
  it("como en la bitácora 509", () => {
    expect(t).toBe(
      [
        "Cantautora potosina. Escribe canciones sobre el desierto, la carretera y las abuelas, con guitarra y una loop station.",
        "Música · Canción · San Luis Potosí\nPróxima fecha: viernes 16 de octubre, 7:00 pm, en el Teatro de la Paz @teatrodelapazslp.",
        "Lee su ficha en somosnosotrxs.org/artistas/valeria-quiroz (enlace en la bio).\nMás de su trabajo en @valeriaquiroz\nFoto: @valeriaquiroz",
        "Sigue a @smsnstrsapp para conocer a más artistas de tu ciudad.",
        "#SanLuisPotosi #ArtistasLocales #Musica #SomosNosotrxs",
      ].join("\n\n"),
    );
  });
  it("cabe en Instagram", () => {
    expect(revisarTexto(t).problema).toBeNull();
  });
  it("sin fecha próxima, sin esa línea", () => {
    expect(textoArtista({ ...VALERIA, proxima: null }, AHORA)).not.toContain("Próxima fecha");
  });
  it("sin la cuenta (la quitó la administración), sin mención ni crédito", () => {
    const s = textoArtista({ ...VALERIA, redes: [] }, AHORA);
    expect(s).not.toContain("@valeriaquiroz");
    expect(s).toContain("Lee su ficha en somosnosotrxs.org/artistas/valeria-quiroz");
  });
});

describe("el texto del lugar", () => {
  const museo = {
    nombre: "Museo Leonora Carrington",
    slug: "museo-leonora-carrington",
    descripcion: "Museo dedicado a la obra surrealista de Leonora Carrington, con salas de exposición temporal, talleres para familias, visitas guiadas de noche y un foro.",
    tipo: "museo",
    ciudad: "San Luis Potosí",
    direccion: "Calzada de Guadalupe 705, Centro",
    redes: ig("museoleonora"),
    semana: [
      { titulo: "Taller de máscaras para familias", inicio: "2026-10-10T17:00:00Z", zona: ZONA },
      { titulo: "Visita guiada: Leonora y el teatro", inicio: "2026-10-12T01:00:00Z", zona: ZONA },
    ],
  };
  it("su gancho, qué es, dónde, lo de esta semana, la ficha, la cuenta y el crédito", () => {
    const t = textoLugar(museo, AHORA);
    expect(t).toContain("Museo · San Luis Potosí\n📍 Calzada de Guadalupe 705, Centro\nEsta semana: Taller de máscaras para familias (sáb 10, 11:00 am) y Visita guiada: Leonora y el teatro (dom 11, 7:00 pm).");
    expect(t).toContain("Lee su ficha en somosnosotrxs.org/lugares/museo-leonora-carrington (enlace en la bio).\nMás en @museoleonora\nFoto: @museoleonora");
    expect(t).toContain("Sigue a @smsnstrsapp para conocer más lugares de tu ciudad.");
    expect(t.endsWith("#SanLuisPotosi #EspaciosCulturales #Museo #SomosNosotrxs")).toBe(true);
    expect(revisarTexto(t).problema).toBeNull();
  });
  it("sin Instagram: sin cuenta, sin crédito", () => {
    const t = textoLugar({ ...museo, redes: [], semana: [] }, AHORA);
    expect(t).not.toContain("@museoleonora");
    expect(t).not.toContain("Foto:");
    expect(t).not.toContain("Esta semana:");
  });
});

describe("«Esta semana»", () => {
  it("los eventos del fin, uno por línea, y el título de la portada", () => {
    const t = textoSemana(
      {
        ciudad: "San Luis Potosí",
        eventos: [
          { titulo: "Valeria Quiroz: canciones nuevas", inicio: "2026-10-17T01:00:00Z", zona: ZONA, lugar: "Teatro de la Paz", lugarRedes: ig("teatrodelapazslp") },
          { titulo: "OCA", inicio: "2026-10-17T18:00:00Z", zona: ZONA, lugar: "Museo Nacional de la Máscara" },
        ],
      },
      AHORA,
    );
    expect(t.split("\n\n")[0]).toBe("Este fin en San Luis Potosí:\nVie 16 · 7:00 pm · Valeria Quiroz: canciones nuevas · Teatro de la Paz @teatrodelapazslp\nSáb 17 · 12:00 pm · OCA · Museo Nacional de la Máscara");
    expect(t).toContain("#FinDeSemana");
    expect(tituloSemana("2026-10-16", "2026-10-18", ZONA, AHORA)).toBe("Del viernes 16 al domingo 18 de octubre");
    expect(tituloSemana("2026-10-30", "2026-11-01", ZONA, AHORA)).toBe("Del viernes 30 de octubre al domingo 1 de noviembre");
  });
});

describe("la tarjeta y el aviso", () => {
  it("la ceja y la próxima fecha de la tarjeta", () => {
    expect(cejaArtista({ disciplina: "musica", detalle: "canción" })).toBe("Música · Canción");
    expect(cejaArtista({ disciplina: "teatro", detalle: null })).toBe("Teatro");
    expect(cejaLugar({ tipo: "museo" })).toBe("Museo");
    expect(cejaLugar({ tipo: "otro", detalle: "taller de cerámica" })).toBe("Taller de cerámica");
    expect(proximaEnTarjeta(VALERIA.proxima, AHORA)).toBe("Vie 16 de oct, 7:00 pm · Teatro de la Paz");
  });
  it("el aviso previo: qué día, qué se publica, el crédito y cómo decir que no", () => {
    const a = avisoPrevio({ saludo: saludoDe("Valeria Quiroz (demo)", false), dia: "viernes 16 de octubre", tipo: "artista", ficha: "somosnosotrxs.org/artistas/valeria-quiroz" });
    expect(a.startsWith("¡Hola, Valeria! Te escribimos de Somos Nosotrxs (@smsnstrsapp)")).toBe(true);
    expect(a).toContain("El viernes 16 de octubre queremos presentarte en nuestro Instagram entre lxs artistas destacadxs de la semana");
    expect(a).toContain("contéstanos «no» y no se publica");
    expect(saludoDe("Colectivo Nube de Papel", true)).toBe("Colectivo Nube de Papel");
    expect(conversacionDe("valeria.quiroz")).toBe("https://ig.me/m/valeria.quiroz");
  });
});
