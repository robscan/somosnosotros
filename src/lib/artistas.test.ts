import { describe, expect, it } from "vitest";
import { artistaIgual, deducirDisciplina, conProximaFecha, deducirTipoArtista, detallesDe, disciplinasPresentes, etiquetaArtista, filtrarArtistas, filtroDesdeUrl, hrefArtistas, ordenarArtistas, quienDesdeJson, textoProximaFecha, unirNombres, validarArtista } from "./artistas";

describe("deducirDisciplina", () => {
  it("lee la disciplina del nombre y, sin pista, propone música", () => {
    expect(deducirDisciplina("Ballet Folclórico Universitario")).toBe("danza");
    expect(deducirDisciplina("Compañía de Teatro La Carpa")).toBe("teatro");
    expect(deducirDisciplina("Taller de Gráfica Índigo")).toBe("artes_visuales");
    expect(deducirDisciplina("Cineclub Alameda")).toBe("cine");
    expect(deducirDisciplina("Los Vecinos")).toBe("musica");
    expect(deducirDisciplina("")).toBe("musica");
  });
});

describe("deducirTipoArtista", () => {
  it("propone grupo o colectivo por el nombre; solista se queda sin propuesta", () => {
    expect(deducirTipoArtista("Los Vecinos")).toBe("grupo");
    expect(deducirTipoArtista("Trío Xochitl")).toBe("grupo");
    expect(deducirTipoArtista("Compañía Trasluz")).toBe("grupo");
    expect(deducirTipoArtista("Colectivo Barro Vivo")).toBe("colectivo");
    expect(deducirTipoArtista("Mariana Ledesma")).toBeNull();
    expect(deducirTipoArtista("Loscuras")).toBeNull();
  });
});

describe("etiquetaArtista", () => {
  it("usa el detalle si lo hay, la disciplina si no, y avisa si está por completar", () => {
    expect(etiquetaArtista({ disciplina: "musica", detalle: "son huasteco", tipo: "grupo" })).toBe("Son huasteco · Grupo");
    expect(etiquetaArtista({ disciplina: "teatro", detalle: null, tipo: "colectivo" })).toBe("Teatro · Colectivo");
    expect(etiquetaArtista({ disciplina: "por_completar", detalle: null, tipo: "solista" })).toBe("Ficha por completar");
  });
});

describe("ordenarArtistas y filtrarArtistas", () => {
  const base = { disciplina: "musica" as const, detalle: null, tipo: "grupo" as const, foto: null };
  const lista = [
    { ...base, id: "1", nombre: "Zeta", proxima: null },
    { ...base, id: "2", nombre: "Beta", proxima: { id: "e2", inicio: "2026-09-20T01:00:00Z", sitio: "Foro", zona: "America/Mexico_City" } },
    { ...base, id: "3", nombre: "Alfa", proxima: null },
    { ...base, id: "4", nombre: "Gamma", proxima: { id: "e4", inicio: "2026-09-15T01:00:00Z", sitio: "Casa", zona: "America/Mexico_City" } },
  ];
  it("ordena alfabéticamente aunque tengan próxima fecha", () => {
    expect(ordenarArtistas(lista).map((a) => a.nombre)).toEqual(["Alfa", "Beta", "Gamma", "Zeta"]);
  });
  it("busca por nombre o detalle, sin acentos", () => {
    const l = [{ nombre: "Trío Xóchitl", detalle: "son huasteco" }, { nombre: "Pedro Ibarra", detalle: "jazz" }];
    expect(filtrarArtistas(l, "xochitl").map((a) => a.nombre)).toEqual(["Trío Xóchitl"]);
    expect(filtrarArtistas(l, "JAZZ").map((a) => a.nombre)).toEqual(["Pedro Ibarra"]);
    expect(filtrarArtistas(l, "")).toHaveLength(2);
  });
  it("encuentra al igual sin acentos ni mayúsculas", () => {
    expect(artistaIgual([{ nombre: "Trío Xóchitl" }], " trio xochitl ")?.nombre).toBe("Trío Xóchitl");
    expect(artistaIgual([{ nombre: "Trío Xóchitl" }], "trio")).toBeNull();
  });
});

describe("chips de disciplina y detalle", () => {
  const l = [
    { nombre: "A", disciplina: "musica", detalle: "rock, metal y alternativo" },
    { nombre: "B", disciplina: "musica", detalle: "Rock, metal y alternativo" },
    { nombre: "C", disciplina: "musica", detalle: "rock, metal y alternativo" },
    { nombre: "D", disciplina: "musica", detalle: "jazz, blues y soul" },
    { nombre: "E", disciplina: "musica", detalle: "jazz, blues y soul" },
    { nombre: "F", disciplina: "musica", detalle: "jazz, blues y soul" },
    { nombre: "G", disciplina: "musica", detalle: "cumbia" },
    { nombre: "H", disciplina: "teatro", detalle: null },
    { nombre: "I", disciplina: "teatro", detalle: "compañía de teatro" },
  ];
  it("lista las disciplinas presentes en el orden cerrado", () => {
    expect(disciplinasPresentes(l).map((d) => d.valor)).toEqual(["musica", "teatro"]);
  });
  it("filtra por disciplina y por detalle sin distinguir mayúsculas", () => {
    expect(filtrarArtistas(l, "", { disciplina: "teatro" }).map((a) => a.nombre)).toEqual(["H", "I"]);
    expect(filtrarArtistas(l, "", { disciplina: "musica", detalle: "rock, metal y alternativo" }).map((a) => a.nombre)).toEqual(["A", "B", "C"]);
    expect(filtrarArtistas(l, "b", { disciplina: "musica", detalle: "rock, metal y alternativo" }).map((a) => a.nombre)).toEqual(["B"]);
  });
  it("da el segundo nivel solo con detalles compartidos por varios, de más a menos", () => {
    expect(detallesDe(l, "musica").map((d) => d.etiqueta)).toEqual(["Jazz, blues y soul", "Rock, metal y alternativo"]);
    expect(detallesDe(l, "teatro")).toEqual([]);
  });
});

describe("hrefArtistas y filtroDesdeUrl", () => {
  it("arma la URL sin parámetros vacíos y la lee de vuelta con valores seguros", () => {
    expect(hrefArtistas({})).toBe("/artistas");
    expect(hrefArtistas({ hace: "musica", que: "jazz, blues y soul", q: " Pedro ", n: 200 })).toBe("/artistas?hace=musica&que=jazz%2C+blues+y+soul&q=Pedro&n=200");
    expect(filtroDesdeUrl({ hace: "musica", que: "jazz", q: "x", letra: "á", n: "200" })).toEqual({ hace: "musica", que: "jazz", q: "x", letra: null, n: 200 });
    expect(filtroDesdeUrl({ hace: "no-existe", que: "jazz", letra: "b", n: "abc" })).toEqual({ hace: null, que: null, q: null, letra: "B", n: 100 });
  });
  it("la ciudad va en la URL, salvo que sea la inicial (crecimiento orgánico, bitácora 051)", () => {
    expect(hrefArtistas({ ciudad: "san-luis-potosi" })).toBe("/artistas");
    expect(hrefArtistas({ ciudad: "queretaro", hace: "musica" })).toBe("/artistas?ciudad=queretaro&hace=musica");
  });
});

describe("conProximaFecha y textoProximaFecha", () => {
  const SLP = "America/Mexico_City";
  // Como pueden llegar de la base: la Orquesta tiene dos fechas y la más lejana llega primero; el Mariachi tiene dos a la
  // misma hora (va la del título que va antes en orden alfabético, "Demostración").
  const llegada = [
    { artista_id: "orquesta", evento: { id: "e-mayas", titulo: "La noche de los Mayas", inicio: "2026-09-26T02:00:00Z", sitio: "Teatro de la Paz", zona: SLP } },
    { artista_id: "mariachi", evento: { id: "e-mariachi", titulo: "Mariachi Universitario", inicio: "2026-09-18T01:00:00Z", sitio: "Patio de la UASLP", zona: SLP } },
    { artista_id: "coro", evento: { id: "e-poemas", titulo: "Presentación editorial", inicio: "2026-09-18T23:30:00Z", sitio: "CEART", zona: SLP } },
    { artista_id: "orquesta", evento: { id: "e-sinfonica", titulo: "Sinfónica en San Sebastián", inicio: "2026-09-18T02:00:00Z", sitio: "Parroquia de San Sebastián", zona: SLP } },
    { artista_id: "mariachi", evento: { id: "e-demostracion", titulo: "Demostración folclórica", inicio: "2026-09-18T01:00:00Z", sitio: "Teatro de la Paz", zona: SLP } },
  ];
  const base = { disciplina: "musica" as const, detalle: null, tipo: "grupo" as const, foto: null };
  const artistas = [
    { ...base, id: "coro", nombre: "Coro Vuela Alto" },
    { ...base, id: "orquesta", nombre: "Orquesta de Cámara" },
    { ...base, id: "mariachi", nombre: "Mariachi Femenil" },
    { ...base, id: "sin-fechas", nombre: "Afinque" },
  ];
  it("toma la fecha más próxima de cada artista llegue como llegue, y a la misma hora desempata por título", () => {
    for (const fechas of [llegada, [...llegada].reverse()]) {
      const r = conProximaFecha(artistas, fechas);
      expect(r.map((a) => [a.id, a.proxima?.id ?? null])).toEqual([["coro", "e-poemas"], ["orquesta", "e-sinfonica"], ["mariachi", "e-demostracion"], ["sin-fechas", null]]);
      expect(r[1].proxima).toEqual({ id: "e-sinfonica", inicio: "2026-09-18T02:00:00Z", sitio: "Parroquia de San Sebastián", zona: SLP });
      expect(ordenarArtistas(r).map((a) => a.id)).toEqual(["sin-fechas", "coro", "mariachi", "orquesta"]);
    }
  });
  it("escribe la próxima fecha con el sitio", () => {
    const ahora = new Date("2026-09-14T18:00:00Z");
    expect(textoProximaFecha({ id: "e1", inicio: "2026-09-15T01:30:00Z", sitio: "Casa", zona: SLP }, ahora)).toMatch(/^Próximo: hoy · 19:30 · Casa$/);
    // En Madrid, la misma hora es la 3:30 del martes.
    expect(textoProximaFecha({ id: "e2", inicio: "2026-09-15T01:30:00Z", sitio: "Sala", zona: "Europe/Madrid" }, ahora)).toBe("Próximo: mañana · 03:30 · Sala");
  });
});

describe("unirNombres", () => {
  it("une con comas y una 'y' final", () => {
    expect(unirNombres([])).toBe("");
    expect(unirNombres(["A"])).toBe("A");
    expect(unirNombres(["A", "B"])).toBe("A y B");
    expect(unirNombres(["A", "B", "C"])).toBe("A, B y C");
  });
});

describe("quienDesdeJson", () => {
  it("acepta registrados y por crear, limpia, quita repetidos y tope de seis", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    expect(quienDesdeJson(JSON.stringify([{ id, nombre: " Los  Vecinos " }, { nombre: "los vecinos" }, { nombre: "Trío Xochitl" }, { id: "no-es-uuid", nombre: "X" }]))).toEqual([
      { id, nombre: "Los Vecinos" },
      { nombre: "Trío Xochitl" },
      { nombre: "X" },
    ]);
    expect(quienDesdeJson("no es json")).toEqual([]);
    expect(quienDesdeJson("")).toEqual([]);
    expect(quienDesdeJson(JSON.stringify(Array.from({ length: 9 }, (_, i) => ({ nombre: `A${i}` }))))).toHaveLength(6);
  });
});

describe("validarArtista", () => {
  it("acepta lo mínimo y limpia", () => {
    const { datos, errores } = validarArtista({ nombre: "  Los Vecinos ", disciplina: "musica", detalle: "son huasteco", tipo: "grupo", enlaces: JSON.stringify(["@losvecinos"]), foto: "" });
    expect(errores).toEqual({});
    expect(datos).toMatchObject({ nombre: "Los Vecinos", disciplina: "musica", detalle: "son huasteco", tipo: "grupo", foto: null, redes: [{ red: "instagram", url: "https://instagram.com/losvecinos" }] });
  });
  it("avisa del nombre vacío y la disciplina desconocida; un enlace que no es nada se descarta sin error", () => {
    const { datos, errores } = validarArtista({ nombre: "", disciplina: "pintura", tipo: "grupo", enlaces: JSON.stringify(["hola"]) });
    expect(errores.nombre).toBeDefined();
    expect(errores.disciplina).toBeDefined();
    expect(datos.redes).toEqual([]);
  });
  it("toma la ciudad del renglón Ciudad, unida a su área metropolitana; sin ciudad, la inicial", () => {
    expect(validarArtista({ nombre: "Los Vecinos", ciudad: "Querétaro" }).datos.ciudad).toBe("Querétaro");
    expect(validarArtista({ nombre: "Los Vecinos", ciudad: "Soledad de Graciano Sánchez" }).datos.ciudad).toBe("San Luis Potosí");
    expect(validarArtista({ nombre: "Los Vecinos", ciudad: "" }).datos.ciudad).toBe("San Luis Potosí");
    expect(validarArtista({ nombre: "Los Vecinos" }).datos.ciudad).toBe("San Luis Potosí");
  });
});
