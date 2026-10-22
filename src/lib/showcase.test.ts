import { describe, expect, it } from "vitest";
import {
  actividadDe,
  avanceInvestigar,
  avisoLote,
  botonLote,
  cadenaParada,
  investigadoHacePoco,
  LIMITE_LOTE,
  lineaLote,
  lineaTotalLote,
  mostrarLote,
  resumenLote,
  seleccionLote,
  textoInvestigarTarjeta,
  ultimasInvestigaciones,
  type CorridaLista,
  investigacionEnCurso,
  lineaCreditoInvestigar,
  textoInvestigar,
  type CorridaInvestigar,
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
  opcionesPuntaje,
  partirCsv,
  pasanAlConsejo,
  propuestaActividad,
  propuestaCirculacion,
  propuestaObra,
  propuestaVinculo,
  sumaValores,
  valorDe,
  primeraLinea,
  redPrincipal,
  sumaRubrica,
  textoLectura,
  textoProgramadoPor,
  urlEvidencia,
  validarEvidencia,
  validarLectura,
  valoresDe,
  SIN_PROPUESTAS,
  SIN_PUNTAJES,
  type Candidato,
  type FilasShowcase,
  type Propuestas,
  type Puntajes,
} from "./showcase";

const HOY = "2026-10-20";

/** Un candidato de prueba: con `fijados` y `propuestos` arma lo que vale y su suma. */
function candidato(c: Partial<Candidato> & { nombre: string; fijados?: Partial<Puntajes>; propuestos?: Partial<Propuestas> }): Candidato {
  const { fijados, propuestos, ...resto } = c;
  const valores = valoresDe({ ...SIN_PUNTAJES, ...fijados }, { ...SIN_PROPUESTAS, ...propuestos });
  return {
    id: c.nombre,
    slug: c.nombre.toLowerCase().replace(/\s+/g, "-"),
    disciplina: "musica",
    ciudad: "San Luis Potosí",
    foto: null,
    instagram: null,
    estado: "candidato",
    marcado: false,
    valores,
    suma: Object.values(valores).reduce((n, v) => n + (v.puntaje ?? 0), 0),
    nota: null,
    eventos: 0,
    foros: 0,
    festivales: 0,
    programadoPor: [],
    redes: null,
    ...resto,
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
  const [sangre, sinNada] = armarCandidatos(filas, HOY);
  it("cuenta eventos, foros y festivales de la base y dice quién lo programa", () => {
    expect(sangre).toMatchObject({ eventos: 4, foros: 2, festivales: 1, suma: 6, estado: "invitado", nota: "Circula mucho." });
    expect(sangre.programadoPor).toEqual(["Teatro de la Paz", "Casa de Cultura del Barrio de San Miguelito", "Festival de las Linternas"]);
    expect(sangre.instagram).toBe("https://www.instagram.com/sangre/");
    expect(sangre.redes?.seguidores).toBe(3200);
  });
  it("lo fijado a mano manda sobre lo que propone la base, aunque la base proponga otra cosa", () => {
    // La base propone circulación 2 (un festival y una fecha en Aguascalientes) y actividad 2 (publicó hace 2 días); valen los fijados.
    expect(sangre.valores.circulacion).toMatchObject({ puntaje: 2, origen: "fijado", fijado: 2, propuesta: { puntaje: 2 } });
    expect(sangre.valores.obra).toEqual({ puntaje: 1, origen: "fijado", fijado: 1, propuesta: null });
    expect(sangre.valores.vinculo).toMatchObject({ puntaje: 1, origen: "fijado", propuesta: { puntaje: 0, motivo: "Nadie lleva su ficha" } });
  });
  it("sin fila en el showcase es candidato implícito; sin eventos ni lecturas solo tiene la propuesta del vínculo (0), y su enlace usa el id", () => {
    expect(sangre.marcado).toBe(true); // OL-439: tiene fila en el showcase
    expect(sinNada).toMatchObject({ marcado: false, estado: "candidato", suma: 0, eventos: 0, foros: 0, festivales: 0, slug: "a2", redes: null, nota: null });
    expect(Object.fromEntries(Object.entries(sinNada.valores).map(([k, v]) => [k, v.origen]))).toEqual({ circulacion: "sin_datos", obra: "sin_datos", actividad: "sin_datos", vinculo: "propuesto" });
  });
  it("sin nada fijado, la base propone y la suma, el orden y quienes pasan al consejo usan lo propuesto", () => {
    const nuevas: FilasShowcase = {
      ...filas,
      artistas: [...filas.artistas, { id: "a3", slug: "rosa", nombre: "Rosa Mística", disciplina: "musica", ciudad: "San Luis Potosí", foto: null, redes: [], portada: "https://img.example/r.jpg" }],
      candidatos: [...filas.candidatos, { artista_id: "a3", estado: "revisado", puntaje_circulacion: null, puntaje_obra: null, puntaje_actividad: null, puntaje_vinculo: null, notas: null }],
      eventos_artistas: [...filas.eventos_artistas, ...["e1", "e3", "e4"].map((evento_id) => ({ evento_id, artista_id: "a3" }))],
      lecturas: [...filas.lecturas, { artista_id: "a3", red: "instagram", seguidores: 500, publicaciones: 90, ultima_publicacion: "2026-09-25", leido_en: "2026-10-19T00:00:00Z" }],
      cuentas: [{ artista_id: "a3" }],
      novedades: [],
      evidencias: [
        { artista_id: "a3", senal: "obra", tipo: "premio", titulo: "Premio estatal de composición", fecha: "2025-06-01", estado: "aceptada" },
        { artista_id: "a2", senal: "obra", tipo: "premio", titulo: "Premio que nadie aceptó", fecha: null, estado: "propuesta" },
      ],
    };
    const lista = armarCandidatos(nuevas, HOY);
    const rosa = lista.find((c) => c.id === "a3")!;
    expect(Object.fromEntries(Object.entries(rosa.valores).map(([k, v]) => [k, [v.puntaje, v.origen]]))).toEqual({
      circulacion: [2, "propuesto"], // 2 foros y un festival, y una fecha en Aguascalientes
      obra: [2, "propuesto"], // un premio aceptado
      actividad: [1, "propuesto"], // publicó hace 25 días
      vinculo: [2, "propuesto"], // reclamada y con portada
    });
    expect(rosa.suma).toBe(7);
    expect(lista.find((c) => c.id === "a2")!.valores.obra.origen).toBe("sin_datos"); // lo propuesto por la rutina no cuenta
    expect(ordenarCandidatos(lista, "puntaje").map((c) => c.id)).toEqual(["a3", "a1", "a2"]);
    expect(pasanAlConsejo(lista)).toBe(2);
    expect(pasanAlConsejo(lista.map((c) => (c.id === "a3" ? { ...c, estado: "descartado" as const } : c)))).toBe(1);
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
    expect(lineaCifras(4, conteos, null, pasanAlConsejo(lista))).toBe("4 candidatos · 1 invitado · 1 confirmado · 4 pasan al consejo con 5 de 8");
    expect(lineaCifras(4, conteos, null, 1)).toBe("4 candidatos · 1 invitado · 1 confirmado · 1 pasa al consejo con 5 de 8");
    expect(lineaCifras(4, conteos, 2, 4)).toBe("2 de 4 candidatos");
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
  it("una fila por candidato con la rúbrica que vale, lo propuesto y lo fijado aparte, el estado, los enlaces y la primera línea de la nota", () => {
    const csv = csvConsejo([
      candidato({
        nombre: "Sangre de Coyote",
        estado: "invitado",
        // Circulación: la base propone 1 y alguien fijó 2 (vale 2). Obra: fijada en 1. Actividad: propuesta en 2. Vínculo: sin datos.
        fijados: { circulacion: 2, obra: 1 },
        propuestos: { circulacion: { puntaje: 1, motivo: "un festival este año" }, actividad: { puntaje: 2, motivo: "Publicó ayer en Instagram" } },
        eventos: 7,
        foros: 4,
        festivales: 1,
        instagram: "https://www.instagram.com/sangre/",
        nota: "Propuesto por dos foros, sin disco.",
      }),
    ]);
    const lineas = csv.split("\r\n");
    expect(lineas[0]).toBe("\uFEFFartista,disciplina,ciudad,estado,circulacion,obra,actividad,vinculo,total,circulacion_propuesto,obra_propuesto,actividad_propuesto,vinculo_propuesto,circulacion_fijado,obra_fijado,actividad_fijado,vinculo_fijado,eventos,foros,festivales,seguidores,publicaciones,ultima_publicacion,ficha,instagram,nota");
    expect(lineas[1]).toBe('Sangre de Coyote,Música,San Luis Potosí,Invitado,2,1,2,,5,1,,2,,2,1,,,7,4,1,,,,https://somosnosotros.org/artistas/sangre-de-coyote,https://www.instagram.com/sangre/,"Propuesto por dos foros, sin disco."');
    expect(lineas[2]).toBe("");
  });
});

describe("lo que propone la base (OL-437)", () => {
  const circ = (foros: number, festivales = 0, fuera = 0, eventos = foros) => ({ eventos, foros, festivales, fuera });
  it("circulación: 0, 1 y 2 foros; 4 o más; un festival; festival y fechas fuera; sin eventos, sin datos", () => {
    const p = (c: ReturnType<typeof circ>) => propuestaCirculacion(c, "San Luis Potosí");
    expect(p(circ(0, 0, 0, 0))).toBeNull();
    expect(p(circ(0, 0, 0, 2))).toEqual({ puntaje: 0, motivo: "2 eventos este año, en sitios sin ficha" });
    expect(p(circ(1))).toEqual({ puntaje: 0, motivo: "un foro este año" });
    expect(p(circ(2))).toEqual({ puntaje: 1, motivo: "2 foros este año" });
    expect(p(circ(3))?.puntaje).toBe(1);
    expect(p(circ(4, 1))).toEqual({ puntaje: 2, motivo: "4 foros y un festival este año" });
    expect(p(circ(1, 1))).toEqual({ puntaje: 1, motivo: "un foro y un festival este año" });
    expect(p(circ(0, 1, 0, 0))).toEqual({ puntaje: 1, motivo: "un festival este año" });
    expect(p(circ(1, 1, 2))).toEqual({ puntaje: 2, motivo: "un foro y un festival este año; 2 fechas fuera de San Luis Potosí" });
    expect(p(circ(1, 0, 3))).toEqual({ puntaje: 0, motivo: "un foro este año; 3 fechas fuera de San Luis Potosí" }); // fuera sin festival no sube
    expect(p(circ(2, 2))?.motivo).toBe("2 foros y 2 festivales este año");
  });
  it("actividad: 3, 7, 8, 20, 45, 46 y 120 días; cada semana por sus lecturas; sin lecturas o sin fecha, sin datos", () => {
    const leida = (ultima: string | null, publicaciones: number | null = 100, leido_en = "2026-10-19T00:00:00Z", red: "instagram" | "facebook" = "instagram") => ({ red, seguidores: 10, publicaciones, ultima_publicacion: ultima, leido_en });
    const p = (...l: ReturnType<typeof leida>[]) => propuestaActividad(l, HOY);
    expect(p(leida("2026-10-17"))).toEqual({ puntaje: 2, motivo: "Publicó hace 3 días en Instagram" });
    expect(p(leida("2026-10-13"))?.puntaje).toBe(2);
    expect(p(leida("2026-10-12"))).toEqual({ puntaje: 1, motivo: "Publicó hace 8 días en Instagram" });
    expect(p(leida("2026-09-30"))).toEqual({ puntaje: 1, motivo: "Publicó hace 20 días en Instagram" });
    expect(p(leida("2026-09-05"))?.puntaje).toBe(1); // 45 días: la holgura de «cada mes»
    expect(p(leida("2026-09-04"))).toEqual({ puntaje: 0, motivo: "Sin publicar desde hace 46 días en Instagram" });
    expect(p(leida("2026-06-22"))).toEqual({ puntaje: 0, motivo: "Sin publicar desde hace 120 días en Instagram" });
    expect(p(leida("2026-10-20"))?.motivo).toBe("Publicó hoy en Instagram");
    expect(p()).toBeNull();
    expect(p(leida(null))).toBeNull();
    // La más reciente de todas sus redes manda.
    expect(p(leida("2026-07-01", 5, "2026-10-19T00:00:00Z", "facebook"), leida("2026-10-18"))?.motivo).toBe("Publicó hace 2 días en Instagram");
    // Cada semana por sus lecturas: 12 publicaciones en 28 días (3 por semana) con la última hace 12 días.
    const semanal = [leida("2026-10-08", 112, "2026-10-19T00:00:00Z"), leida("2026-09-20", 100, "2026-09-21T00:00:00Z")];
    expect(p(...semanal)).toEqual({ puntaje: 2, motivo: "Publica unas 3 veces por semana en Instagram" });
    // El mismo ritmo, pero con la última publicación hace 40 días, ya no es semanal ahora.
    expect(p(leida("2026-09-10", 112, "2026-10-19T00:00:00Z"), leida("2026-09-01", 100, "2026-09-21T00:00:00Z"))?.puntaje).toBe(1);
    // Sin fecha de la última publicación, el ritmo basta si la lectura es del último mes.
    expect(p(leida(null, 112, "2026-10-19T00:00:00Z"), leida(null, 108, "2026-10-12T00:00:00Z"))).toEqual({ puntaje: 2, motivo: "Publica unas 4 veces por semana en Instagram" });
    // Lecturas con menos de 7 días entre ellas no dicen el ritmo.
    expect(p(leida(null, 112, "2026-10-19T00:00:00Z"), leida(null, 100, "2026-10-16T00:00:00Z"))).toBeNull();
  });
  it("vínculo: sin cuenta, reclamada, con novedades o portada", () => {
    expect(propuestaVinculo({ reclamada: false, novedades: true, portada: true })).toEqual({ puntaje: 0, motivo: "Nadie lleva su ficha" });
    expect(propuestaVinculo({ reclamada: true, novedades: false, portada: false })).toEqual({ puntaje: 1, motivo: "Ficha reclamada, sin novedades ni portada" });
    expect(propuestaVinculo({ reclamada: true, novedades: true, portada: false })).toEqual({ puntaje: 2, motivo: "Ficha reclamada, con novedades" });
    expect(propuestaVinculo({ reclamada: true, novedades: true, portada: true })).toEqual({ puntaje: 2, motivo: "Ficha reclamada, con novedades y portada" });
  });
  it("obra: solo con evidencias aceptadas de obra; premio, beca, residencia o selección 2; obra de 24 meses 1; más vieja 0", () => {
    const ev = (tipo: "obra" | "premio" | "beca" | "prensa", titulo: string, fecha: string | null, estado: "aceptada" | "propuesta" | "rechazada" = "aceptada", senal: "obra" | "circulacion" = "obra") => ({ senal, tipo, titulo, fecha, estado });
    const p = (...e: ReturnType<typeof ev>[]) => propuestaObra(e, HOY);
    expect(p()).toBeNull();
    expect(p(ev("premio", "Premio propuesto", null, "propuesta"), ev("obra", "Disco rechazado", null, "rechazada"), ev("premio", "Otra señal", null, "aceptada", "circulacion"))).toBeNull();
    expect(p(ev("obra", "Sencillo en plataformas", "2026-03-01"))).toEqual({ puntaje: 1, motivo: "Obra: «Sencillo en plataformas»" });
    expect(p(ev("obra", "Disco", null), ev("prensa", "Reseña del disco", "2025-12-01"))).toEqual({ puntaje: 1, motivo: "Prensa: «Reseña del disco» y 1 más" });
    expect(p(ev("obra", "Disco de 2022", "2022-05-01"))).toEqual({ puntaje: 0, motivo: "Su obra aceptada es de hace más de 24 meses" });
    expect(p(ev("obra", "Disco", "2026-01-01"), ev("premio", "Mención estatal de acordeón", "2025-11-20"))).toEqual({ puntaje: 2, motivo: "Premio: «Mención estatal de acordeón»" });
    expect(p(ev("beca", "PECDA 2024", "2024-02-01"))?.motivo).toBe("Beca: «PECDA 2024»");
    expect(p(ev("obra", "Residencia artística en Oaxaca", null))).toEqual({ puntaje: 2, motivo: "Reconocimiento: «Residencia artística en Oaxaca»" });
    expect(p(ev("prensa", "Seleccionada en la muestra nacional de teatro", null))?.puntaje).toBe(2);
    expect(p(ev("obra", "Selección de canciones en vivo", null))?.puntaje).toBe(1); // «selección» sola no es reconocimiento
    expect(p(ev("premio", "x".repeat(120), null))?.motivo).toBe(`Premio: «${"x".repeat(79)}…»`);
  });
  it("qué vale: lo fijado manda (también un 0 fijado); sin fijado, lo propuesto; sin los dos, sin datos y no suma", () => {
    const dos = { puntaje: 2 as const, motivo: "4 foros este año" };
    expect(valorDe(1, dos)).toEqual({ puntaje: 1, origen: "fijado", fijado: 1, propuesta: dos });
    expect(valorDe(0, dos)).toMatchObject({ puntaje: 0, origen: "fijado" });
    expect(valorDe(null, dos)).toEqual({ puntaje: 2, origen: "propuesto", fijado: null, propuesta: dos });
    expect(valorDe(null, null)).toEqual({ puntaje: null, origen: "sin_datos", fijado: null, propuesta: null });
    expect(sumaValores(valoresDe({ circulacion: 1, obra: null, actividad: null, vinculo: 0 }, { circulacion: dos, obra: null, actividad: dos, vinculo: dos }))).toBe(3);
  });
  it("la hoja: tocar un número lo fija; lo propuesto lleva el destello; con algo fijado, «Volver al propuesto» o «Sin puntuar»", () => {
    const niveles = ["Cero", "Uno", "Dos"];
    const dos = { puntaje: 2 as const, motivo: "4 foros este año" };
    const marcas = (v: ReturnType<typeof valorDe>) => opcionesPuntaje(niveles, v).map((o) => [o.etiqueta, o.marca]);
    expect(marcas(valorDe(null, dos))).toEqual([["0", null], ["1", null], ["2", "propuesto"]]);
    expect(marcas(valorDe(null, null))).toEqual([["0", null], ["1", null], ["2", null]]);
    expect(opcionesPuntaje(niveles, valorDe(1, dos)).map((o) => [o.etiqueta, o.marca, o.valor, o.detalle])).toEqual([
      ["0", null, 0, "Cero"],
      ["1", "fijado", 1, "Uno"],
      ["2", null, 2, "Dos"],
      ["Volver al propuesto", "propuesto", null, "Vale el 2 en vez del 1 fijado a mano"],
    ]);
    expect(opcionesPuntaje(niveles, valorDe(2, dos)).at(-1)?.detalle).toBe("El mismo 2, sin fijar: cambia si cambian sus datos");
    expect(opcionesPuntaje(niveles, valorDe(0, null)).at(-1)).toEqual({ valor: null, etiqueta: "Sin puntuar", detalle: "No cuenta en la suma", marca: null });
  });
});

describe("«Investigar» en la ficha (OL-430)", () => {
  const dia = (iso: string) => iso.slice(0, 10);
  const c = (cambios: Partial<CorridaInvestigar>): CorridaInvestigar => ({ id: "c", estado: "terminada", tope_usd: 1, gasto_usd: 0.38, resumen: { propuestas: 5 }, creado_en: "2026-10-21T15:00:00Z", inicio: "2026-10-21T15:00:05Z", fin: "2026-10-21T15:03:00Z", ...cambios });
  it("cada estado en una línea", () => {
    expect(textoInvestigar(null, 0, "2026-10-21", dia)).toBe("Prensa, premios, festivales y obra publicada");
    expect(textoInvestigar(c({ estado: "pendiente", gasto_usd: 0 }), 0, "2026-10-21", dia)).toBe("Investigando · por empezar · 0,00 de 1,00 USD");
    expect(textoInvestigar(c({ estado: "corriendo", gasto_usd: 0.12, resumen: { paso: "2 de 4 búsquedas", avance: 0.5 } }), 0, "2026-10-21", dia)).toBe("Investigando · 2 de 4 búsquedas · 0,12 de 1,00 USD");
    expect(textoInvestigar(c({}), 5, "2026-10-21", dia)).toBe("Investigado el 21 oct · 5 evidencias por revisar · 0,38 USD");
    expect(textoInvestigar(c({}), 1, "2026-10-21", dia)).toBe("Investigado el 21 oct · 1 evidencia por revisar · 0,38 USD");
    expect(textoInvestigar(c({}), 0, "2026-10-21", dia)).toBe("Investigado el 21 oct · todo revisado · 0,38 USD");
    expect(textoInvestigar(c({ resumen: { propuestas: 0, tope: true } }), 0, "2026-11-02", dia)).toBe("Investigado el 21 oct · llegó al tope · sin evidencias nuevas · 0,38 USD");
    expect(textoInvestigar(c({ estado: "fallida", gasto_usd: 0.12 }), 0, "2026-10-21", dia)).toBe("No se pudo investigar el 21 oct · 0,12 USD");
    expect(textoInvestigar(c({ estado: "cancelada" }), 0, "2026-10-21", dia)).toBe("Cancelada el 21 oct");
  });
  it("la barra solo mientras corre; en curso es pendiente o corriendo", () => {
    expect(avanceInvestigar(c({ estado: "corriendo", resumen: { avance: 0.5 } }))).toBe(0.5);
    expect(avanceInvestigar(c({ estado: "corriendo", resumen: { avance: 7 } }))).toBe(1);
    expect(avanceInvestigar(c({ estado: "pendiente" }))).toBeNull();
    expect(avanceInvestigar(null)).toBeNull();
    expect([null, c({ estado: "pendiente" }), c({ estado: "corriendo" }), c({})].map(investigacionEnCurso)).toEqual([false, true, true, false]);
  });
  it("el crédito que queda, con su vencimiento", () => {
    expect(lineaCreditoInvestigar({ usd: 200, gastado: 12.6, vence: "2026-11-11" }, "2026-10-21")).toBe("Crédito: 187,40 USD · vence el 11 de noviembre");
    expect(lineaCreditoInvestigar({ usd: 200, gastado: 250, vence: "2026-11-11" }, "2026-11-12")).toBe("Crédito: 0,00 USD · venció el 11 de noviembre");
    expect(lineaCreditoInvestigar(null, "2026-10-21")).toBeNull();
  });
});

describe("«Investigar» a varios desde la lista (OL-439)", () => {
  const AHORA = new Date("2026-10-21T16:00:00Z");
  const dia = (iso: string) => iso.slice(0, 10);
  const corrida = (artista_id: string, cambios: Partial<CorridaLista> = {}): CorridaLista => ({
    id: `c-${artista_id}-${cambios.creado_en ?? ""}`,
    artista_id,
    lote: null,
    estado: "terminada",
    tope_usd: 1,
    gasto_usd: 0.39,
    resumen: { propuestas: 3 },
    creado_en: "2026-10-21T15:00:00Z",
    inicio: "2026-10-21T15:00:05Z",
    fin: "2026-10-21T15:03:00Z",
    ...cambios,
  });

  it("la última investigación de cada artista, y si cuenta como reciente: en curso, o terminada hace menos de 30 días", () => {
    const viejas = [corrida("a", { creado_en: "2026-09-01T00:00:00Z", fin: "2026-09-01T00:05:00Z" }), corrida("a", { estado: "fallida" }), corrida("b")];
    const ultimas = ultimasInvestigaciones(viejas);
    expect(ultimas.get("a")?.estado).toBe("fallida");
    expect(ultimas.size).toBe(2);
    expect(investigadoHacePoco(corrida("x", { estado: "pendiente", fin: null }), AHORA)).toBe(true);
    expect(investigadoHacePoco(corrida("x", { estado: "corriendo", fin: null }), AHORA)).toBe(true);
    expect(investigadoHacePoco(corrida("x", { fin: "2026-09-22T17:00:00Z" }), AHORA)).toBe(true); // hace 29 días
    expect(investigadoHacePoco(corrida("x", { fin: "2026-09-20T15:00:00Z" }), AHORA)).toBe(false); // hace 31 días
    expect(investigadoHacePoco(corrida("x", { estado: "fallida" }), AHORA)).toBe(false); // se puede repetir
    expect(investigadoHacePoco(corrida("x", { estado: "cancelada" }), AHORA)).toBe(false);
    expect(investigadoHacePoco(null, AHORA)).toBe(false);
  });

  describe("a quiénes", () => {
    const lista = [
      candidato({ nombre: "Marcado sin investigar", marcado: true }),
      candidato({ nombre: "Marcado revisado", marcado: true, estado: "revisado" }),
      candidato({ nombre: "Marcado investigado ayer", marcado: true }),
      candidato({ nombre: "Marcado investigando", marcado: true }),
      candidato({ nombre: "Marcado que falló", marcado: true }),
      candidato({ nombre: "Invitado", marcado: true, estado: "invitado" }),
      candidato({ nombre: "Descartado", marcado: true, estado: "descartado" }),
      candidato({ nombre: "Implícito", disciplina: "teatro" }),
    ];
    const ultimas = new Map([
      ["Marcado investigado ayer", corrida("Marcado investigado ayer", { fin: "2026-10-20T15:00:00Z" })],
      ["Marcado investigando", corrida("Marcado investigando", { estado: "corriendo", fin: null })],
      ["Marcado que falló", corrida("Marcado que falló", { estado: "fallida" })],
    ]);
    it("por omisión, los candidatos marcados (candidato o revisado) sin investigación en curso ni de los últimos 30 días; nunca descartados ni invitados", () => {
      expect(seleccionLote(lista, lista, ultimas, AHORA).candidatos).toEqual(["Marcado sin investigar", "Marcado revisado", "Marcado que falló"]);
    });
    it("los que se ven: con el filtro de ahora, sin descartados ni investigados hace poco, y cuántos quedan fuera por cada cosa", () => {
      expect(seleccionLote(lista, lista, ultimas, AHORA)).toMatchObject({
        visibles: ["Marcado sin investigar", "Marcado revisado", "Marcado que falló", "Invitado", "Implícito"],
        fueraRecientes: 2,
        fueraDescartados: 1,
      });
      const teatro = filtrarCandidatos(lista, { q: null, disciplina: "teatro", estado: "todos" });
      expect(seleccionLote(lista, teatro, ultimas, AHORA)).toEqual({ candidatos: ["Marcado sin investigar", "Marcado revisado", "Marcado que falló"], visibles: ["Implícito"], fueraRecientes: 0, fueraDescartados: 0 });
    });
    it("hasta 60 en una orden: con más, la hoja lo dice y su salida es filtrar; con nadie, también lo dice", () => {
      expect(LIMITE_LOTE).toBe(60);
      expect(avisoLote(26)).toBeNull();
      expect(avisoLote(60)).toBeNull();
      expect(avisoLote(61)).toBe("Son 61: elige hasta 60 o filtra por disciplina.");
      expect(avisoLote(692)).toBe("Son 692: elige hasta 60 o filtra por disciplina.");
      expect(avisoLote(0)).toBe("Nadie por investigar con esta opción.");
      expect(botonLote(26)).toBe("Investigar a los 26");
      expect(botonLote(1)).toBe("Investigar a 1 artista");
    });
  });

  it("el total antes de investigar: a cuántos, hasta cuánto y el crédito que queda", () => {
    expect(lineaTotalLote(26, 1, 192.4)).toBe("26 artistas · hasta 26,00 USD · crédito 192,40");
    expect(lineaTotalLote(1, 0.5, 192.4)).toBe("1 artista · hasta 0,50 USD · crédito 192,40");
    expect(lineaTotalLote(26, null, 192.4)).toBe("26 artistas · crédito 192,40"); // tope que no vale: el campo lo dice
    expect(lineaTotalLote(26, 1.5, null)).toBe("26 artistas · hasta 39,00 USD"); // sin crédito leído
  });

  describe("la línea de la orden", () => {
    const LOTE = "lote-1";
    const de = (artista: string, cambios: Partial<CorridaLista>) => corrida(artista, { lote: LOTE, creado_en: "2026-10-21T15:00:00Z", ...cambios });
    const enCurso = [
      de("a", { gasto_usd: 0.4 }),
      de("b", { gasto_usd: 0.35 }),
      de("c", { estado: "corriendo", gasto_usd: 0.12, fin: null, resumen: { paso: "2 de 4 búsquedas", avance: 0.5 } }),
      de("d", { estado: "pendiente", gasto_usd: 0, fin: null, inicio: null }),
      // Una de la ficha (sin lote) y una de una orden anterior no cuentan.
      corrida("e", { estado: "corriendo", fin: null }),
      corrida("f", { lote: "lote-viejo", creado_en: "2026-10-01T15:00:00Z" }),
    ];
    it("mientras corre: a cuántos, cuántos terminaron, lo gastado y su barra", () => {
      const r = resumenLote(enCurso, { a: 2, c: 1, f: 9 })!;
      expect(r).toMatchObject({ lote: LOTE, total: 4, enCurso: 2, terminados: 2, fallidos: 0, usd: 0.87, porRevisar: 3, fin: null });
      expect(r.avance).toBeCloseTo((1 + 1 + 0.5 + 0) / 4);
      expect(lineaLote(r, "2026-10-21", dia)).toBe("Investigando a 4 · 2 terminados · 0,87 USD");
      expect(mostrarLote(r, "2026-10-21", dia)).toBe(true);
    });
    it("acabada: cuántos y cuándo, lo que dejó por revisar (o todo revisado) y lo gastado; se dice mientras deja algo o el día que acabó", () => {
      const hecha = [de("a", { fin: "2026-10-21T16:10:00Z" }), de("b", { estado: "fallida", fin: "2026-10-21T16:20:00Z" })];
      const r = resumenLote(hecha, { a: 3 })!;
      expect(r).toMatchObject({ total: 2, enCurso: 0, terminados: 1, fallidos: 1, porRevisar: 3, fin: "2026-10-21T16:20:00Z" });
      expect(lineaLote(r, "2026-10-21", dia)).toBe("2 investigados hoy · 1 no se pudo · 3 evidencias por revisar · 0,78 USD");
      expect(lineaLote({ ...r, porRevisar: 0 }, "2026-10-22", dia)).toBe("2 investigados ayer · 1 no se pudo · todo revisado · 0,78 USD");
      expect(mostrarLote({ ...r, porRevisar: 0 }, "2026-10-21", dia)).toBe(true); // el día que acabó
      expect(mostrarLote({ ...r, porRevisar: 0 }, "2026-10-22", dia)).toBe(false); // después, el renglón vuelve a proponer
      expect(mostrarLote({ ...r, porRevisar: 1 }, "2026-11-30", dia)).toBe(true); // mientras deje algo por revisar
      expect(resumenLote([corrida("a")], {})).toBeNull(); // sin órdenes de la lista
      expect(mostrarLote(null, "2026-10-21", dia)).toBe(false);
    });
  });

  it("la tarjeta dice cómo va su investigación o cuántas evidencias deja por revisar", () => {
    const hoy = "2026-10-21";
    expect(textoInvestigarTarjeta(null, 0, hoy, dia)).toBeNull();
    expect(textoInvestigarTarjeta(null, 2, hoy, dia)).toBe("2 evidencias por revisar");
    expect(textoInvestigarTarjeta(corrida("a", { estado: "pendiente", fin: null }), 0, hoy, dia)).toBe("Investigando · por empezar");
    expect(textoInvestigarTarjeta(corrida("a", { estado: "corriendo", fin: null, resumen: { paso: "2 de 4 búsquedas" } }), 0, hoy, dia)).toBe("Investigando · 2 de 4 búsquedas");
    expect(textoInvestigarTarjeta(corrida("a", { estado: "corriendo", fin: null, resumen: { paso: "2 de 4 búsquedas" } }), 1, hoy, dia)).toBe("Investigando · 2 de 4 búsquedas · 1 evidencia por revisar");
    expect(textoInvestigarTarjeta(corrida("a"), 3, hoy, dia)).toBe("Investigado hoy · 3 evidencias por revisar");
    expect(textoInvestigarTarjeta(corrida("a"), 1, "2026-10-22", dia)).toBe("Investigado ayer · 1 evidencia por revisar");
    expect(textoInvestigarTarjeta(corrida("a"), 0, "2026-11-02", dia)).toBe("Investigado el 21 oct · todo revisado");
    expect(textoInvestigarTarjeta(corrida("a", { resumen: { propuestas: 0 } }), 0, hoy, dia)).toBe("Investigado hoy · sin evidencias nuevas");
    expect(textoInvestigarTarjeta(corrida("a", { estado: "fallida" }), 0, hoy, dia)).toBe("No se pudo investigar hoy");
    expect(textoInvestigarTarjeta(corrida("a", { estado: "cancelada" }), 2, hoy, dia)).toBe("2 evidencias por revisar");
  });

  it("la cadena del motor se paró solo si TODAS las corridas en curso están varadas: en una orden, las que esperan su turno no", () => {
    const iso = (min: number) => new Date(AHORA.getTime() - min * 60_000).toISOString();
    const esperando = (min: number) => ({ id: `p${min}`, estado: "pendiente", resumen: {}, creado_en: iso(min) });
    const avanzando = { id: "c1", estado: "corriendo", resumen: { actualizada: iso(0.5) }, creado_en: iso(20), inicio: iso(19) };
    const ocupada = { id: "c2", estado: "corriendo", resumen: { ocupada_hasta: new Date(AHORA.getTime() + 60_000).toISOString(), actualizada: iso(10) }, creado_en: iso(20), inicio: iso(19) };
    const quieta = { id: "c3", estado: "corriendo", resumen: { ocupada_hasta: null, actualizada: iso(10) }, creado_en: iso(20), inicio: iso(19) };
    expect(cadenaParada([], AHORA)).toBe(false);
    expect(cadenaParada([esperando(10), esperando(10), avanzando], AHORA)).toBe(false); // una avanzó hace 30 s: la cadena llegará a las demás
    expect(cadenaParada([esperando(10), quieta, ocupada], AHORA)).toBe(false); // una se está trabajando
    expect(cadenaParada([esperando(1)], AHORA)).toBe(false); // su primer paso se pidió hace un minuto
    expect(cadenaParada([esperando(10), esperando(3), quieta], AHORA)).toBe(true); // nadie avanza: se pide UN paso
    expect(cadenaParada([{ ...quieta, estado: "terminada" }], AHORA)).toBe(false);
  });
});
