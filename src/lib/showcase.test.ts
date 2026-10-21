import { describe, expect, it } from "vitest";
import {
  actividadDe,
  armarCandidatos,
  celdaCsv,
  chipsDisciplina,
  conteosEstado,
  csvConsejo,
  faltaEvidencia,
  filtrarCandidatos,
  hrefFicha,
  hrefShowcase,
  leerCsvRedes,
  leerVista,
  lineaCifras,
  miles,
  ordenarCandidatos,
  partirCsv,
  primeraLinea,
  redPrincipal,
  sumaRubrica,
  textoLectura,
  textoProgramadoPor,
  urlEvidencia,
  validarEvidencia,
  validarLectura,
  type Candidato,
  type FilasShowcase,
} from "./showcase";

const HOY = "2026-10-20";

function candidato(c: Partial<Candidato> & { nombre: string }): Candidato {
  return {
    id: c.nombre,
    slug: c.nombre.toLowerCase().replace(/\s+/g, "-"),
    disciplina: "musica",
    ciudad: "San Luis Potosí",
    foto: null,
    instagram: null,
    estado: "candidato",
    puntajes: { circulacion: null, obra: null, actividad: null, vinculo: null },
    suma: 0,
    nota: null,
    eventos: 0,
    foros: 0,
    festivales: 0,
    programadoPor: [],
    redes: null,
    ...c,
  };
}

describe("la rúbrica", () => {
  it("suma las cuatro señales; lo que no se ha puntuado cuenta 0", () => {
    expect(sumaRubrica({ circulacion: 2, obra: 1, actividad: 2, vinculo: 1 })).toBe(6);
    expect(sumaRubrica({ circulacion: 2, obra: null, actividad: 0, vinculo: null })).toBe(2);
    expect(sumaRubrica({ circulacion: null, obra: null, actividad: null, vinculo: null })).toBe(0);
  });
});

describe("la píldora de actividad", () => {
  it("hasta 10 días, cada semana; hasta 45, cada mes; si no, inactivo; sin lectura, nada", () => {
    expect(actividadDe("2026-10-18", HOY)?.clave).toBe("semana");
    expect(actividadDe("2026-10-10", HOY)?.clave).toBe("semana");
    expect(actividadDe("2026-10-09", HOY)?.clave).toBe("mes");
    expect(actividadDe("2026-09-05", HOY)?.clave).toBe("mes");
    expect(actividadDe("2026-09-04", HOY)?.clave).toBe("inactivo");
    expect(actividadDe(null, HOY)).toBeNull();
    expect(actividadDe("2026-10-25", HOY)?.texto).toBe("Publica cada semana");
  });
});

describe("las cifras", () => {
  it("miles y millones en palabras", () => {
    expect(miles(980)).toBe("980");
    expect(miles(1000)).toBe("1 mil");
    expect(miles(3200)).toBe("3,2 mil");
    expect(miles(1_000_000)).toBe("1 millón");
    expect(miles(1_250_000)).toBe("1,3 millones");
  });
  it("la lectura de una red en una línea", () => {
    expect(textoLectura({ red: "instagram", seguidores: 3200, publicaciones: 412, ultima_publicacion: "2026-10-18", leido_en: "2026-10-16T00:00:00Z" }, HOY)).toBe("3,2 mil seguidores · 412 publicaciones · última hace 2 días");
    expect(textoLectura({ red: "youtube", seguidores: 1, publicaciones: null, ultima_publicacion: "2026-10-19", leido_en: "2026-10-19T00:00:00Z" }, HOY, true)).toBe("1 seguidor · la última ayer");
  });
  it("la red principal es la de más seguidores entre las últimas lecturas", () => {
    const vieja = { red: "instagram" as const, seguidores: 9000, publicaciones: 1, ultima_publicacion: null, leido_en: "2026-01-01T00:00:00Z" };
    const nueva = { red: "instagram" as const, seguidores: 3200, publicaciones: 2, ultima_publicacion: null, leido_en: "2026-10-16T00:00:00Z" };
    const yt = { red: "youtube" as const, seguidores: 640, publicaciones: 38, ultima_publicacion: null, leido_en: "2026-10-16T00:00:00Z" };
    expect(redPrincipal([vieja, nueva, yt])).toEqual(nueva);
    expect(redPrincipal([])).toBeNull();
  });
  it("la primera línea de las notas", () => {
    expect(primeraLinea("\n  Propuesto por dos foros.  \nOtra cosa")).toBe("Propuesto por dos foros.");
    expect(primeraLinea("   ")).toBeNull();
    expect(primeraLinea(null)).toBeNull();
  });
  it("«Programado por» con los tres que más lo programan", () => {
    expect(textoProgramadoPor(["A", "B"])).toBe("A, B");
    expect(textoProgramadoPor(["A", "B", "C", "D", "E"])).toBe("A, B, C y 2 más");
    expect(textoProgramadoPor([])).toBeNull();
  });
});

describe("armar la lista con lo de la base", () => {
  const filas: FilasShowcase = {
    artistas: [
      { id: "a1", slug: "sangre-de-coyote", nombre: "Sangre de Coyote", disciplina: "musica", ciudad: "San Luis Potosí", foto: null, redes: [{ url: "https://instagram.com/sangre" }] },
      { id: "a2", slug: null, nombre: "Sin Nada", disciplina: "teatro", ciudad: "San Luis Potosí", foto: null, redes: {} },
    ],
    candidatos: [{ artista_id: "a1", estado: "invitado", puntaje_circulacion: 2, puntaje_obra: 1, puntaje_actividad: 2, puntaje_vinculo: 1, notas: "Circula mucho.\nSegunda línea" }],
    lecturas: [{ artista_id: "a1", red: "instagram", seguidores: 3200, publicaciones: 412, ultima_publicacion: "2026-10-18", leido_en: "2026-10-16T00:00:00Z" }],
    eventos: [
      { id: "e1", titulo: "Concierto", slug: "e1", lugar_id: "paz", evento_padre_id: null, clase: "puntual", inicio: "2026-09-12T02:00:00Z", ciudad: "San Luis Potosí" },
      { id: "e2", titulo: "Otro", slug: "e2", lugar_id: "paz", evento_padre_id: null, clase: "puntual", inicio: "2026-08-12T02:00:00Z", ciudad: "San Luis Potosí" },
      { id: "e3", titulo: "Acto", slug: "e3", lugar_id: "miguelito", evento_padre_id: "f1", clase: "puntual", inicio: "2026-10-10T02:00:00Z", ciudad: "San Luis Potosí" },
      { id: "e4", titulo: "Fecha fuera", slug: "e4", lugar_id: null, evento_padre_id: null, clase: "puntual", inicio: "2026-06-27T02:00:00Z", ciudad: "Aguascalientes" },
    ],
    eventos_artistas: [
      { evento_id: "e1", artista_id: "a1" },
      { evento_id: "e2", artista_id: "a1" },
      { evento_id: "e3", artista_id: "a1" },
      { evento_id: "e4", artista_id: "a1" },
      { evento_id: "fuera-del-anio", artista_id: "a2" },
    ],
    lugares: [
      { id: "paz", nombre: "Teatro de la Paz", slug: "teatro-de-la-paz" },
      { id: "miguelito", nombre: "Casa de Cultura del Barrio de San Miguelito", slug: "miguelito" },
    ],
    festivales: [{ id: "f1", titulo: "Festival de las Linternas" }],
  };
  const [sangre, sinNada] = armarCandidatos(filas);
  it("cuenta eventos, foros y festivales de la base y dice quién lo programa", () => {
    expect(sangre).toMatchObject({ eventos: 4, foros: 2, festivales: 1, suma: 6, estado: "invitado", nota: "Circula mucho." });
    expect(sangre.programadoPor).toEqual(["Teatro de la Paz", "Casa de Cultura del Barrio de San Miguelito", "Festival de las Linternas"]);
    expect(sangre.instagram).toBe("https://www.instagram.com/sangre/");
    expect(sangre.redes?.seguidores).toBe(3200);
  });
  it("sin fila en el showcase es candidato implícito, sin puntajes, y su enlace usa el id si no tiene slug", () => {
    expect(sinNada).toMatchObject({ estado: "candidato", suma: 0, eventos: 0, foros: 0, festivales: 0, slug: "a2", redes: null, nota: null });
  });
});

describe("filtrar y ordenar", () => {
  const lista = [
    candidato({ nombre: "Pargazz", suma: 5, foros: 2, festivales: 1, eventos: 4, estado: "revisado", redes: { red: "instagram", seguidores: 1100, publicaciones: 1, ultima_publicacion: "2026-10-08", leido_en: "2026-10-16" } }),
    candidato({ nombre: "Sangre de Coyote", suma: 6, foros: 4, festivales: 1, eventos: 7, estado: "invitado", redes: { red: "instagram", seguidores: 3200, publicaciones: 1, ultima_publicacion: "2026-10-18", leido_en: "2026-10-16" } }),
    candidato({ nombre: "Ángela Teatro", disciplina: "teatro", suma: 5, foros: 3, festivales: 1, eventos: 2 }),
    candidato({ nombre: "Un León Marinero", suma: 6, foros: 3, festivales: 1, eventos: 5, estado: "confirmado", redes: { red: "instagram", seguidores: 5800, publicaciones: 1, ultima_publicacion: null, leido_en: "2026-10-16" } }),
  ];
  it("puntaje por defecto, y el empate lo rompe la convocatoria (foros + festivales)", () => {
    expect(ordenarCandidatos(lista, "puntaje").map((c) => c.nombre)).toEqual(["Sangre de Coyote", "Un León Marinero", "Ángela Teatro", "Pargazz"]);
  });
  it("convocatoria, seguidores, última publicación (lo vacío al final) y nombre", () => {
    expect(ordenarCandidatos(lista, "convocatoria").map((c) => c.nombre)).toEqual(["Sangre de Coyote", "Un León Marinero", "Ángela Teatro", "Pargazz"]);
    expect(ordenarCandidatos(lista, "seguidores").map((c) => c.nombre)).toEqual(["Un León Marinero", "Sangre de Coyote", "Pargazz", "Ángela Teatro"]);
    expect(ordenarCandidatos(lista, "ultima").map((c) => c.nombre)).toEqual(["Sangre de Coyote", "Pargazz", "Ángela Teatro", "Un León Marinero"]);
    expect(ordenarCandidatos(lista, "nombre").map((c) => c.nombre)).toEqual(["Ángela Teatro", "Pargazz", "Sangre de Coyote", "Un León Marinero"]);
  });
  it("busca sin acentos ni mayúsculas y filtra por disciplina y estado", () => {
    expect(filtrarCandidatos(lista, { q: "angela", disciplina: "todas", estado: "todos" }).map((c) => c.nombre)).toEqual(["Ángela Teatro"]);
    expect(filtrarCandidatos(lista, { q: "LEON", disciplina: "musica", estado: "todos" }).map((c) => c.nombre)).toEqual(["Un León Marinero"]);
    expect(filtrarCandidatos(lista, { q: null, disciplina: "teatro", estado: "todos" })).toHaveLength(1);
    expect(filtrarCandidatos(lista, { q: null, disciplina: "todas", estado: "invitado" }).map((c) => c.nombre)).toEqual(["Sangre de Coyote"]);
  });
  it("chips con su cuenta, conteos por estado y la línea de cifras", () => {
    expect(chipsDisciplina(lista)).toEqual([
      { valor: "todas", etiqueta: "Todas", n: 4 },
      { valor: "musica", etiqueta: "Música", n: 3 },
      { valor: "teatro", etiqueta: "Teatro", n: 1 },
    ]);
    const conteos = conteosEstado(lista);
    expect(conteos).toEqual({ todos: 4, candidato: 1, revisado: 1, invitado: 1, confirmado: 1, descartado: 0 });
    expect(lineaCifras(4, conteos, null)).toBe("4 candidatos · 1 invitado · 1 confirmado · pasan al consejo con 5 de 8");
    expect(lineaCifras(4, conteos, 2)).toBe("2 de 4 candidatos");
  });
});

describe("la vista en la URL", () => {
  it("lee valores seguros y escribe solo lo que no vale por defecto", () => {
    expect(leerVista({})).toEqual({ q: null, disciplina: "todas", estado: "todos", orden: "puntaje", tabla: false, n: 10 });
    expect(leerVista({ q: "  co ", disciplina: "danza", estado: "invitado", orden: "nombre", vista: "tabla", n: "51" })).toEqual({ q: "co", disciplina: "danza", estado: "invitado", orden: "nombre", tabla: true, n: 100 });
    expect(leerVista({ disciplina: "magia", estado: "ganador", orden: "fama", n: "-4" })).toMatchObject({ disciplina: "todas", estado: "todos", orden: "puntaje", n: 10 });
    expect(hrefShowcase({ q: "co", disciplina: "todas", estado: "todos", orden: "puntaje", tabla: false, n: 10 })).toBe("/admin/showcase?q=co");
    expect(hrefShowcase({ disciplina: "teatro", orden: "seguidores", tabla: true, n: 100 })).toBe("/admin/showcase?disciplina=teatro&orden=seguidores&vista=tabla&n=100");
    expect(hrefShowcase({})).toBe("/admin/showcase");
    expect(hrefFicha({ id: "a1", slug: "sangre-de-coyote" })).toBe("/admin/showcase/sangre-de-coyote");
    expect(hrefFicha({ id: "a2", slug: "manual" })).toBe("/admin/showcase/a2");
  });
});

describe("evidencias: sin enlace no hay evidencia", () => {
  it("solo http(s), con dominio de verdad, sin usuario delante ni espacios", () => {
    expect(urlEvidencia("https://cultura.example.org/premios?id=3")).toBe("https://cultura.example.org/premios?id=3");
    expect(urlEvidencia("http://Prensa-Local.mx")).toBe("http://prensa-local.mx/");
    for (const mala of ["", "ftp://cultura.example.org", "javascript:alert(1)", "cultura.example.org/x", "https://localhost/x", "https://a@cultura.example.org", "https://cultura.example.org/a b", "https://123"]) {
      expect(urlEvidencia(mala), mala).toBeNull();
    }
  });
  it("el botón dice qué falta y la validación explica el error en palabras", () => {
    expect(faltaEvidencia({ titulo: "", url: "" })).toBe("Falta el título");
    expect(faltaEvidencia({ titulo: "Premio", url: " " })).toBe("Falta el enlace");
    expect(faltaEvidencia({ titulo: "Premio", url: "x" })).toBeNull();
    const malo = validarEvidencia({ senal: "obra", tipo: "premio", titulo: "Premio", url: "ftp://x.example.com", fecha: "", fuente: "" });
    expect(malo.ok).toBe(false);
    if (!malo.ok) expect(malo.errores.url).toBe("El enlace tiene que empezar con http:// o https://.");
    const bueno = validarEvidencia({ senal: "obra", tipo: "premio", titulo: "  Mención   estatal ", url: "https://www.cultura.example.org/p", fecha: "2025-05-01", fuente: "" });
    expect(bueno).toEqual({ ok: true, evidencia: { senal: "obra", tipo: "premio", titulo: "Mención estatal", url: "https://www.cultura.example.org/p", fecha: "2025-05-01", fuente: "cultura.example.org" } });
    expect(validarEvidencia({ senal: "fama", tipo: "rumor", titulo: "x", url: "https://a.example.com", fecha: "ayer", fuente: "" }).ok).toBe(false);
  });
});

describe("lecturas de redes", () => {
  it("a mano: números con separadores, al menos una cifra y nada del futuro", () => {
    expect(validarLectura({ red: "instagram", seguidores: "3,200", publicaciones: "412", ultima: "2026-10-18" }, HOY)).toEqual({ ok: true, lectura: { red: "instagram", seguidores: 3200, publicaciones: 412, ultima_publicacion: "2026-10-18" } });
    expect(validarLectura({ red: "instagram", seguidores: "", publicaciones: "", ultima: "" }, HOY).ok).toBe(false);
    expect(validarLectura({ red: "instagram", seguidores: "3,2 mil", publicaciones: "", ultima: "" }, HOY).ok).toBe(false);
    expect(validarLectura({ red: "instagram", seguidores: "10", publicaciones: "", ultima: "2026-10-21" }, HOY).ok).toBe(false);
    expect(validarLectura({ red: "myspace", seguidores: "10", publicaciones: "", ultima: "" }, HOY).ok).toBe(false);
  });
  it("el CSV: comillas, BOM, CRLF y columnas en cualquier orden", () => {
    expect(partirCsv('\uFEFFa,b\r\n"x, y","di ""hola"""\n\n')).toEqual([["a", "b"], ["x, y", 'di "hola"']]);
    const texto = [
      "red,artista_slug,seguidores,publicaciones,ultima_publicacion,leido_en",
      "instagram,sangre-de-coyote,3200,412,2026-10-18,2026-10-19",
      "youtube,sangre-de-coyote,640,38,,",
      ",sin-red,10,,,",
      "instagram,,10,,,",
      "instagram,futuro,10,,,2027-01-01",
      "instagram,al-reves,10,,2026-10-19,2026-10-10",
      "instagram,sin-cifras,,,,",
    ].join("\r\n");
    const { filas, errores } = leerCsvRedes(texto, new Date("2026-10-20T18:00:00Z"));
    expect(filas.map((f) => [f.linea, f.artista_slug, f.red, f.seguidores, f.ultima_publicacion, f.leido_en])).toEqual([
      [2, "sangre-de-coyote", "instagram", 3200, "2026-10-18", "2026-10-19T12:00:00.000Z"],
      [3, "sangre-de-coyote", "youtube", 640, null, null],
    ]);
    expect(errores.map((e) => e.linea)).toEqual([4, 5, 6, 7, 8]);
    expect(errores[0].motivo).toBe("Elige la red.");
  });
  it("sin las columnas de la cabecera no lee nada", () => {
    expect(leerCsvRedes("slug,red\nx,instagram", new Date()).errores[0].motivo).toMatch(/^Faltan columnas en la cabecera: artista_slug, seguidores/);
    expect(leerCsvRedes("", new Date()).errores[0].motivo).toBe("El archivo está vacío.");
  });
});

describe("el CSV para el consejo", () => {
  it("escapa comas, comillas y saltos, y desactiva fórmulas", () => {
    expect(celdaCsv("Hola, mundo")).toBe('"Hola, mundo"');
    expect(celdaCsv('Dice "sí"')).toBe('"Dice ""sí"""');
    expect(celdaCsv("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(celdaCsv("-2")).toBe("'-2");
    expect(celdaCsv(-2)).toBe("-2");
    expect(celdaCsv(null)).toBe("");
  });
  it("una fila por candidato con la rúbrica, el estado, los enlaces y la primera línea de la nota", () => {
    const csv = csvConsejo([
      candidato({ nombre: "Sangre de Coyote", estado: "invitado", puntajes: { circulacion: 2, obra: 1, actividad: 2, vinculo: null }, suma: 5, eventos: 7, foros: 4, festivales: 1, instagram: "https://www.instagram.com/sangre/", nota: "Propuesto por dos foros, sin disco." }),
    ]);
    const lineas = csv.split("\r\n");
    expect(lineas[0]).toBe("\uFEFFartista,disciplina,ciudad,estado,circulacion,obra,actividad,vinculo,total,eventos,foros,festivales,seguidores,publicaciones,ultima_publicacion,ficha,instagram,nota");
    expect(lineas[1]).toBe('Sangre de Coyote,Música,San Luis Potosí,Invitado,2,1,2,,5,7,4,1,,,,https://somosnosotros.org/artistas/sangre-de-coyote,https://www.instagram.com/sangre/,"Propuesto por dos foros, sin disco."');
    expect(lineas[2]).toBe("");
  });
});
