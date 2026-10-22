import { describe, expect, it } from "vitest";
import { aplicarSugerencia, perfilDeArtista, sugerenciasCompletar, type FichaACompletar, type PropuestaAceptada } from "./completarFicha";

const vacia: FichaACompletar = { disciplina: "por_completar", detalle: null, descripcion: null, redes: [] };
const propuesta: PropuestaAceptada = {
  id: "p1",
  fuente: "PECDA 2026",
  datos: { nombre: "Marta Solís", disciplina: "letras", detalle: "Poesía", redes: ["https://instagram.com/martasolis", "https://open.spotify.com/artist/abc"], obra: "Seleccionada en poesía con un poemario sobre el altiplano.", url: "https://cultura.example.org/pecda" },
};

describe("Completar ficha (OL-445)", () => {
  it("propone solo lo que falta, con su origen", () => {
    const s = sugerenciasCompletar({ ficha: vacia, propuestas: [propuesta], evidencias: [] });
    expect(s.map((x) => [x.campo, x.valor])).toEqual([
      ["disciplina", "letras"],
      ["detalle", "Poesía"],
      ["descripcion", "Seleccionada en poesía con un poemario sobre el altiplano."],
      ["enlace", "https://www.instagram.com/martasolis/"],
      ["enlace", "https://open.spotify.com/artist/abc"],
    ]);
    expect(s[0].origen).toEqual({ texto: "Propuesta aceptada · PECDA 2026", url: "https://cultura.example.org/pecda" });
  });

  it("no propone lo que la ficha ya tiene: disciplina, qué hace, sobre, la misma dirección o la misma red", () => {
    const llena: FichaACompletar = { disciplina: "musica", detalle: "Jazz", descripcion: "Cuarteto de jazz.", redes: [{ url: "https://instagram.com/otra" }, { url: "https://open.spotify.com/artist/abc/" }] };
    expect(sugerenciasCompletar({ ficha: llena, propuestas: [propuesta], evidencias: [] })).toEqual([]);
  });

  it("con 8 enlaces no propone ninguno más", () => {
    const ocho = Array.from({ length: 8 }, (_, i) => ({ url: `https://sitio${i}.example.com` }));
    const s = sugerenciasCompletar({ ficha: { ...vacia, redes: ocho }, propuestas: [propuesta], evidencias: [] });
    expect(s.some((x) => x.campo === "enlace")).toBe(false);
  });

  it("lo descartado no vuelve", () => {
    const s = sugerenciasCompletar({ ficha: vacia, propuestas: [propuesta], evidencias: [], descartadas: ["detalle:poesía", "disciplina:letras"] });
    expect(s.some((x) => x.campo === "detalle" || x.campo === "disciplina")).toBe(false);
  });

  it("de una evidencia aceptada de obra, solo la página de artista en una plataforma; nunca de una propuesta ni de un premio", () => {
    const evidencias = [
      { id: "e1", tipo: "obra", titulo: "Disco Altiplano", url: "https://martasolis.bandcamp.com/album/altiplano", estado: "aceptada" },
      { id: "e2", tipo: "obra", titulo: "Sencillo", url: "https://soundcloud.com/martasolis/sencillo", estado: "propuesta" },
      { id: "e3", tipo: "premio", titulo: "Premio", url: "https://open.spotify.com/artist/zzz", estado: "aceptada" },
      { id: "e4", tipo: "obra", titulo: "Video", url: "https://youtube.com/watch?v=123", estado: "aceptada" },
    ];
    const s = sugerenciasCompletar({ ficha: { ...vacia, disciplina: "musica" }, propuestas: [], evidencias });
    expect(s.map((x) => x.valor)).toEqual(["https://martasolis.bandcamp.com"]);
    expect(s[0].origen.url).toBe("https://martasolis.bandcamp.com/album/altiplano");
  });

  it("la página de artista: Spotify con /artist/, Bandcamp por subdominio, SoundCloud por su primer tramo, YouTube por canal", () => {
    expect(perfilDeArtista("https://open.spotify.com/intl-es/artist/abc?si=1")?.url).toBe("https://open.spotify.com/intl-es/artist/abc");
    expect(perfilDeArtista("https://open.spotify.com/album/xyz")).toBeNull();
    expect(perfilDeArtista("https://bandcamp.com/discover")).toBeNull();
    expect(perfilDeArtista("https://soundcloud.com/martasolis/tema")?.url).toBe("https://soundcloud.com/martasolis");
    expect(perfilDeArtista("https://www.youtube.com/@martasolis/videos")?.url).toBe("https://youtube.com/@martasolis");
    expect(perfilDeArtista("https://instagram.com/festival")).toBeNull();
    expect(perfilDeArtista("https://cultura.gob.mx/nota")).toBeNull();
  });

  it("aceptar escribe solo lo que falta y nunca pisa lo que hay", () => {
    const [disciplina, detalle, descripcion, instagram] = sugerenciasCompletar({ ficha: vacia, propuestas: [propuesta], evidencias: [] });
    expect(aplicarSugerencia(vacia, disciplina, false)).toEqual({ ok: true, cambios: { disciplina: "letras" } });
    expect(aplicarSugerencia(vacia, detalle, false)).toEqual({ ok: true, cambios: { detalle: "Poesía" } });
    expect(aplicarSugerencia(vacia, descripcion, false)).toEqual({ ok: true, cambios: { descripcion: "Seleccionada en poesía con un poemario sobre el altiplano." } });
    const conRedes = { ...vacia, redes: [{ url: "https://martasolis.mx" }] };
    expect(aplicarSugerencia(conRedes, instagram, false)).toEqual({ ok: true, cambios: { redes: [{ red: "sitio", url: "https://martasolis.mx" }, { red: "instagram", url: "https://www.instagram.com/martasolis/" }] } });
    // Mientras tanto alguien la completó: no se pisa.
    const yaLlena: FichaACompletar = { disciplina: "teatro", detalle: "Clown", descripcion: "Otra cosa.", redes: [{ url: "https://instagram.com/otra" }] };
    for (const s of [disciplina, detalle, descripcion, instagram]) expect(aplicarSugerencia(yaLlena, s, false).ok).toBe(false);
  });

  it("con la ficha reclamada no se cambia nada", () => {
    const [disciplina] = sugerenciasCompletar({ ficha: vacia, propuestas: [propuesta], evidencias: [] });
    const r = aplicarSugerencia(vacia, disciplina, true);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.motivo).toMatch(/no se cambia/);
  });
});
