import { describe, expect, it } from "vitest";
import { alElegirDisciplina, alElegirSubcategoria, alQuitarDisciplina, artistaIgual, conArtistasLigados, deducirDisciplina, conProximaFecha, deducirTipoArtista, etiquetaArtista, filtroDesdeUrl, hrefArtistas, hrefLetreroArtista, nombreArchivoQr, pasoQueHace, preguntaSubcategoria, quienDesdeJson, subcategoriaParecida, textoLetrero, textoProximaFecha, unirNombres, validarArtista } from "./artistas";

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

describe("conArtistasLigados (OL-154, «Mis artistas» en Mi perfil)", () => {
  it("sin ninguno ligado, null: el bloque no se pinta", () => {
    expect(conArtistasLigados([])).toBeNull();
  });
  it("con uno o varios, la misma lista de vuelta", () => {
    expect(conArtistasLigados(["ana"])).toEqual(["ana"]);
    expect(conArtistasLigados(["ana", "marco"])).toEqual(["ana", "marco"]);
  });
});

describe("nombreArchivoQr, textoLetrero y hrefLetreroArtista (OL-159, doc 40e)", () => {
  it("el PNG del QR siempre se llama <slug>-qr.png", () => {
    expect(nombreArchivoQr("ana-reyes")).toBe("ana-reyes-qr.png");
    expect(nombreArchivoQr("trio-cantera")).toBe("trio-cantera-qr.png");
  });
  it("los dos textos fijos del letrero llevan el nombre y la invitación a seguir", () => {
    expect(textoLetrero("Ana Reyes")).toEqual({ titulo: "Soy Ana Reyes", subtitulo: "Sígueme en somosnosotros.org" });
    expect(textoLetrero("Trío Cantera")).toEqual({ titulo: "Soy Trío Cantera", subtitulo: "Sígueme en somosnosotros.org" });
  });
  it("la dirección del letrero cuelga de la ficha, con el slug si lo trae y el UUID si no", () => {
    expect(hrefLetreroArtista({ id: "1", slug: "ana-reyes" })).toBe("/artistas/ana-reyes/letrero");
    expect(hrefLetreroArtista({ id: "1", slug: null })).toBe("/artistas/1/letrero");
  });
});

describe("subcategoriaParecida", () => {
  const existentes = [
    { detalle: "Fotografía", artistas: 12 },
    { detalle: "Pintura", artistas: 51 },
    { detalle: "compañía de danza", artistas: 13 },
  ];
  it("sugiere la existente cuando solo cambian acentos o mayúsculas", () => {
    expect(subcategoriaParecida(existentes, "fotografia")?.detalle).toBe("Fotografía");
    expect(subcategoriaParecida(existentes, "FOTOGRAFÍA")?.detalle).toBe("Fotografía");
  });
  it("sugiere la existente cuando lo escrito es el principio (o al revés)", () => {
    expect(subcategoriaParecida(existentes, "Foto")?.detalle).toBe("Fotografía");
    expect(subcategoriaParecida(existentes, "Fotografía y video")?.detalle).toBe("Fotografía");
  });
  it("no sugiere nada si ya es exactamente lo mismo que ya existe (nada que ganar)", () => {
    expect(subcategoriaParecida(existentes, "Fotografía")).toBeNull();
  });
  it("no confunde palabras cortas sin relación ni entre disciplinas distintas", () => {
    expect(subcategoriaParecida(existentes, "cine")).toBeNull();
    expect(subcategoriaParecida(existentes, "grabado")).toBeNull();
  });
  it("sin nada escrito, o con una sola letra, no sugiere", () => {
    expect(subcategoriaParecida(existentes, "")).toBeNull();
    expect(subcategoriaParecida(existentes, "f")).toBeNull();
  });
  it("elige la más parecida cuando hay más de una candidata", () => {
    const varias = [{ detalle: "danza", artistas: 5 }, { detalle: "compañía de danza", artistas: 13 }];
    expect(subcategoriaParecida(varias, "danz")?.detalle).toBe("danza");
  });
});

describe("preguntaSubcategoria (OL-206, «Qué hace» en dos pasos)", () => {
  it("usa el nombre propio de la disciplina, en minúsculas", () => {
    expect(preguntaSubcategoria("artes_visuales")).toBe("¿Qué tipo de artes visuales?");
    expect(preguntaSubcategoria("musica")).toBe("¿Qué tipo de música?");
    expect(preguntaSubcategoria("teatro")).toBe("¿Qué tipo de teatro?");
    expect(preguntaSubcategoria("circo")).toBe("¿Qué tipo de artes circenses?");
  });
});

describe("pasoQueHace, alElegirDisciplina, alQuitarDisciplina y alElegirSubcategoria (OL-206)", () => {
  it("sin elegir a mano está en el paso 1, aunque el nombre haya deducido algo", () => {
    expect(pasoQueHace("")).toBe(1);
  });
  it("con una disciplina elegida a mano (o la que trae la ficha al editar) está en el paso 2", () => {
    expect(pasoQueHace("artes_visuales")).toBe(2);
  });
  it("elegir una disciplina fija esa y suelta el detalle y «Otra…» de una anterior", () => {
    expect(alElegirDisciplina("artes_visuales")).toEqual({ disciplinaElegida: "artes_visuales", detalle: "", otraAbierta: false });
  });
  it("la ✕ deshace los dos pasos: vuelve al paso 1 sin subcategoría", () => {
    const vacio = alQuitarDisciplina();
    expect(vacio).toEqual({ disciplinaElegida: "", detalle: "", otraAbierta: false });
    expect(pasoQueHace(vacio.disciplinaElegida)).toBe(1);
  });
  it("elegir una subcategoría ya usada fija el detalle y cierra «Otra…»", () => {
    expect(alElegirSubcategoria("Fotografía")).toEqual({ detalle: "Fotografía", otraAbierta: false });
  });
});

describe("artistaIgual", () => {
  it("encuentra al igual sin acentos ni mayúsculas", () => {
    expect(artistaIgual([{ nombre: "Trío Xóchitl" }], " trio xochitl ")?.nombre).toBe("Trío Xóchitl");
    expect(artistaIgual([{ nombre: "Trío Xóchitl" }], "trio")).toBeNull();
  });
});

describe("hrefArtistas y filtroDesdeUrl", () => {
  it("arma la URL sin parámetros vacíos y la lee de vuelta con valores seguros", () => {
    expect(hrefArtistas({})).toBe("/artistas");
    expect(hrefArtistas({ hace: "musica", que: "jazz, blues y soul", n: 200 })).toBe("/artistas?hace=musica&que=jazz%2C+blues+y+soul&n=200");
    expect(filtroDesdeUrl({ hace: "musica", que: "jazz", n: "200" })).toEqual({ hace: "musica", que: "jazz", n: 200 });
    expect(filtroDesdeUrl({ hace: "no-existe", que: "jazz", n: "abc" })).toEqual({ hace: null, que: null, n: 100 });
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
  const base = { disciplina: "musica" as const, detalle: null, tipo: "grupo" as const, foto: null, portada: null, slug: "x" };
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
    expect(datos).toMatchObject({ nombre: "Los Vecinos", disciplina: "musica", detalle: "son huasteco", tipo: "grupo", foto: null, portada: null, redes: [{ red: "instagram", url: "https://www.instagram.com/losvecinos/" }] });
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
  describe("OL-247: la portada sigue la misma regla que la foto", () => {
    it("sin portada queda null y no estorba", () => {
      expect(validarArtista({ nombre: "Los Vecinos" }).datos.portada).toBeNull();
    });
    it("una portada de otro dominio se rechaza salvo para la administración o si ya estaba guardada", () => {
      const url = "https://evil.example/x.png";
      expect(validarArtista({ nombre: "Los Vecinos", portada: url }).errores.portada).toBe("La portada no se subió bien. Intenta de nuevo.");
      expect(validarArtista({ nombre: "Los Vecinos", portada: url }, { esAdmin: true }).errores.portada).toBeUndefined();
      expect(validarArtista({ nombre: "Los Vecinos", portada: url }, { portadaActual: url }).errores.portada).toBeUndefined();
    });
  });

  describe("S-01 (docs/rediseno/46): la foto solo acepta cualquier dominio cuando esAdmin viene de la sesión", () => {
    it("sin esAdmin (por defecto), una foto de otro dominio se rechaza", () => {
      const { errores } = validarArtista({ nombre: "Los Vecinos", foto: "https://evil.example/x.png" });
      expect(errores.foto).toBe("La foto no se subió bien. Intenta de nuevo.");
    });
    it("con esAdmin: true, la misma foto de otro dominio se acepta", () => {
      const { errores } = validarArtista({ nombre: "Los Vecinos", foto: "https://evil.example/x.png" }, { esAdmin: true });
      expect(errores.foto).toBeUndefined();
    });
    it("igual a fotoActual, se acepta aunque no sea admin (ficha del CAPO con foto de otro dominio)", () => {
      const foto = "https://catalogo-externo.example/foto.jpg";
      const { errores } = validarArtista({ nombre: "Los Vecinos", foto }, { esAdmin: false, fotoActual: foto });
      expect(errores.foto).toBeUndefined();
    });
  });
});
