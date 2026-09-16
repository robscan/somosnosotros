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
    { ...base, id: "2", nombre: "Beta", proxima: { id: "e2", inicio: "2026-09-20T01:00:00Z", sitio: "Foro" } },
    { ...base, id: "3", nombre: "Alfa", proxima: null },
    { ...base, id: "4", nombre: "Gamma", proxima: { id: "e4", inicio: "2026-09-15T01:00:00Z", sitio: "Casa" } },
  ];
  it("con fechas primero (por fecha), luego alfabético", () => {
    expect(ordenarArtistas(lista).map((a) => a.nombre)).toEqual(["Gamma", "Beta", "Alfa", "Zeta"]);
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
    expect(filtroDesdeUrl({ hace: "musica", que: "jazz", q: "x", n: "200" })).toEqual({ hace: "musica", que: "jazz", q: "x", n: 200 });
    expect(filtroDesdeUrl({ hace: "no-existe", que: "jazz", n: "abc" })).toEqual({ hace: null, que: null, q: null, n: 100 });
  });
  it("la ciudad va en la URL, salvo que sea la inicial (crecimiento orgánico, bitácora 051)", () => {
    expect(hrefArtistas({ ciudad: "san-luis-potosi" })).toBe("/artistas");
    expect(hrefArtistas({ ciudad: "queretaro", hace: "musica" })).toBe("/artistas?ciudad=queretaro&hace=musica");
  });
});

describe("conProximaFecha y textoProximaFecha", () => {
  it("toma la fecha más cercana de cada artista y la escribe con el sitio", () => {
    const r = conProximaFecha([{ id: "a" }, { id: "b" }], [
      { artista_id: "a", evento: { id: "e2", inicio: "2026-09-20T01:00:00Z", sitio: "Foro" } },
      { artista_id: "a", evento: { id: "e1", inicio: "2026-09-15T01:00:00Z", sitio: "Casa" } },
    ]);
    expect(r[0].proxima?.id).toBe("e1");
    expect(r[1].proxima).toBeNull();
    const ahora = new Date("2026-09-14T18:00:00Z");
    expect(textoProximaFecha({ id: "e1", inicio: "2026-09-15T01:30:00Z", sitio: "Casa" }, ahora)).toMatch(/^Próximo: hoy · 19:30 · Casa$/);
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
  it("toma la ciudad en la que estaba la persona (un artista no tiene punto del que deducirla); sin ciudad, la inicial", () => {
    expect(validarArtista({ nombre: "Los Vecinos", ciudad: "Querétaro" }).datos.ciudad).toBe("Querétaro");
    expect(validarArtista({ nombre: "Los Vecinos", ciudad: "" }).datos.ciudad).toBe("San Luis Potosí");
    expect(validarArtista({ nombre: "Los Vecinos" }).datos.ciudad).toBe("San Luis Potosí");
  });
});
