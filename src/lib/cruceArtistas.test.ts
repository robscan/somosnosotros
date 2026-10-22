import { describe, expect, it } from "vitest";
import {
  cruzarNombre,
  disciplinaDeEvento,
  esNombreDeGrupo,
  esPersona,
  fichaDelTitulo,
  formasDeCiudad,
  indiceDeArtistas,
  palabrasDeGrupo,
  partesDeAlias,
  personasDe,
  sumarAlIndice,
  type FichaArtista,
} from "./cruceArtistas";

const ficha = (nombre: string, extra: Partial<FichaArtista> = {}): FichaArtista => ({ id: nombre, nombre, ...extra });
/** ¿El nombre de la agenda va con la ficha (y por qué nivel)? */
const cruce = (agenda: string, fichas: (string | FichaArtista)[]) => {
  const indice = indiceDeArtistas(fichas.map((f) => (typeof f === "string" ? ficha(f) : f)));
  return cruzarNombre(agenda, indice);
};
const une = (agenda: string, deLaFicha: string) => {
  const [u] = cruce(agenda, [deLaFicha]);
  return u?.ficha?.id === deLaFicha;
};

describe("cruzarNombre: pares que se unen", () => {
  it.each([
    // mayúsculas, acentos, comillas, «y/&», el artículo o «Grupo» delante (OL-430)
    ["ORQUESTA SINFONICA DE SAN LUIS POTOSI", "Orquesta Sinfónica de San Luis Potosí"],
    ["Juan Pérez «El Chato»", "El Chato"],
    ["Rosa & Luna", "Rosa y Luna"],
    ["Grupo Tonalli", "Tonalli"],
    ["Colectivo Pan y Sal", "Pan y Sal"],
    // la ciudad y el Gobierno del Estado como una sola marca, en un grupo
    ["Orquesta Sinfónica de San Luis", "Orquesta Sinfónica de San Luis Potosí"],
    ["Orquesta Sinfónica del Gobierno del Estado de San Luis Potosí", "Orquesta Sinfónica de San Luis Potosí"],
    ["Mariachi del Gobierno del Estado de San Luis Potosí", "Mariachi de Gobierno del Estado"],
    ["Banda Sinfónica del Estado", "Banda Sinfónica de Gobierno del Estado"],
    ["Camerata de Gobierno del Estado", "Camerata de San Luis"],
    ["Coral Clásica de S.L.P.", "Coral Clásica del Potosí"],
    // preposiciones de más en un grupo
    ["Ensamble Musical de la Casa de Cultura Barrio de Tlaxcala", "Ensamble musical de la Casa de Cultura del Barrio de Tlaxcala"],
    // títulos y «y sus»
    ["Dr. Chessani y sus Huapangueros de Rioverde", "Dr. Chessani y sus Huapangueros de Rioverde"],
    ["Chessani y sus Huapangueros de Rioverde", "Dr. Chessani y sus Huapangueros de Rioverde"],
    ["Dr. Chessani y los Huapangueros de Rioverde", "Chessani y sus Huapangueros de Rioverde"],
    ["Dr. Chessani y sus Huapangueros de Rioverde", "Chessani y sus Huapangueros"],
    ["Los Huapangueros de Rioverde", "Dr. Chessani y sus Huapangueros de Rioverde"],
    // un alias, de un lado o del otro
    ["La Lupita · Irma Zamora", "La Lupita"],
    ["La Lupita", "La Lupita · Irma Zamora"],
    ["Irma Zamora", "La Lupita · Irma Zamora"],
    ["Juan Pérez (piano)", "Juan Pérez"],
    // apellidos de más, de un lado o del otro
    ["Xiadani Robles Ugalde", "Xiadani Robles"],
    ["Renata Ibarra", "Renata Ibarra Solís"],
    ["Mtra. Renata Ibarra Solís", "Renata Ibarra"],
    // el nombre propio de un grupo entero en el otro
    ["Grupo de Danza Folclórica Viento Sur del IPBA", "Grupo de Danza Folclórica Viento Sur"],
    ["Viento Sur", "Grupo de Danza Folclórica Viento Sur"],
  ])("«%s» = «%s»", (agenda, deLaFicha) => {
    expect(une(agenda, deLaFicha)).toBe(true);
  });
});

describe("cruzarNombre: pares que NO se unen (nunca dos personas ni dos grupos distintos)", () => {
  it.each([
    // nombres de pila que parecen apellido
    ["José Luis Mendoza", "José Luis"],
    ["Miguel Ángel Ortega", "Miguel Ángel Treviño"],
    ["Miguel Ángel Treviño", "Miguel Ángel"],
    ["Paola del Carmen", "Paola del Carmen Medrano"],
    ["Ana Isabel Quiroz", "Laura Quiroz"],
    ["Jorge Salinas", "Manuel Salinas"],
    ["Mateo Rangel Ochoa", "Rodolfo Ochoa"],
    // sin parecido de letras
    ["Xia Robles", "Xiadani Robles"],
    ["Yesenia Lugo", "Yessenia Lugo"],
    ["Grupo Tlali-Xocco", "Grupo Tlali-Xoco"],
    // demasiados apellidos de más, o lo corto sin apellido
    ["Ana Yaretzi Lara Mora Peña", "Ana Yaretzi"],
    ["Selene la voz del norte", "Selene"],
    // grupos distintos aunque se parezcan
    ["Coro Polifónico", "Coro Polifónico del IPBA"],
    ["Coro Polifónico de la Escuela Estatal de Música del SEER", "Coro Polifónico del IPBA"],
    ["Banda de Música de Gobierno del Estado", "Banda Sinfónica de Gobierno del Estado"],
    ["Orquesta Sinfónica Nacional Juvenil de México", "Orquesta Sinfónica de San Luis Potosí"],
    ["Orquesta Sinfónica", "Orquesta Sinfónica de San Luis Potosí"],
    ["Rondalla San Luis", "Rondalla Serenata de San Luis Potosí"],
    ["Ensamble Potosino de Flautas", "Cuarteto Potosino de Flautas"],
    ["Grupo Universitario Tonalli", "Grupo Tonalli Cuicatl"],
    ["Andantes del Foro", "Andante del Foro"],
    // una persona no es su grupo; una institución no es su orquesta
    ["Juan Pérez", "Juan Pérez y su Banda"],
    ["Escuela Estatal de Iniciación Musical Julián Carrillo", "Orquesta de guitarras de la Escuela Estatal de Iniciación Musical Julián Carrillo"],
    // una palabra suelta de un alias no basta
    ["Lupita Aranda", "La Lupita · Irma Zamora"],
  ])("«%s» ≠ «%s»", (agenda, deLaFicha) => {
    expect(une(agenda, deLaFicha)).toBe(false);
    expect(une(deLaFicha, agenda)).toBe(false);
  });
});

describe("cruzarNombre: varias personas, integrantes y lo ambiguo", () => {
  const pargazz = ficha("Pargazz", { tipo: "grupo", disciplina: "musica", descripcion: "Dúo de jazz manouche integrado por Carlos de Santos (clarinete) y Óscar Loredo (guitarra)." });

  it("cada persona de «Carlos de Santos y Óscar Loredo» se cruza por su lado: integrantes de Pargazz", () => {
    const unidades = cruce("Carlos de Santos y Óscar Loredo", [pargazz, "Óscar Chávez"]);
    expect(unidades.map((u) => [u.nombre, u.ficha?.nombre, u.ficha ? (u as { como: string }).como : null])).toEqual([
      ["Carlos de Santos", "Pargazz", "integrante"],
      ["Óscar Loredo", "Pargazz", "integrante"],
    ]);
  });

  it("un integrante solo cuenta en un grupo o colectivo, y con nombre y apellido", () => {
    const solista = ficha("Ana Ruiz", { tipo: "solista", descripcion: "Ha tocado con Carlos de Santos y Óscar Loredo." });
    expect(cruce("Carlos de Santos", [solista])[0]?.ficha).toBeNull();
    const grupo = ficha("Trío Óscar", { tipo: "grupo", descripcion: "Con Óscar en la voz." });
    expect(cruce("Óscar", [grupo])[0]?.ficha).toBeNull();
  });

  it("sin ficha, cada persona queda aparte para proponerla; un grupo con «y» no se parte", () => {
    expect(cruce("Elena Vallarta y Lupita Aranda", []).map((u) => u.nombre)).toEqual(["Elena Vallarta", "Lupita Aranda"]);
    expect(cruce("Pan y Sal", []).map((u) => u.nombre)).toEqual(["Pan y Sal"]);
    expect(cruce("Dr. Chessani y sus Huapangueros de Rioverde", []).map((u) => u.nombre)).toEqual(["Dr. Chessani y sus Huapangueros de Rioverde"]);
    expect(cruce("Coro Cantábile, Arte y Cultura de la Universidad", []).map((u) => u.nombre)).toEqual(["Coro Cantábile, Arte y Cultura de la Universidad"]);
  });

  it("dos fichas al mismo nivel: ambiguo, no se adivina", () => {
    const [u] = cruce("Renata Ibarra", ["Renata Ibarra Solís", "Renata Ibarra Cano"]);
    expect(u?.ficha).toBeNull();
    expect(u && !u.ficha && u.ambiguas?.map((f) => f.nombre)).toEqual(["Renata Ibarra Solís", "Renata Ibarra Cano"]);
  });

  it("el nivel más seguro manda: el mismo nombre gana a los apellidos de más", () => {
    const [u] = cruce("Xiadani Robles", ["Xiadani Robles", "Xiadani Robles Ugalde"]);
    expect(u?.ficha?.nombre).toBe("Xiadani Robles");
  });

  it("el índice crece con lo que se va proponiendo (así se juntan las variantes)", () => {
    const indice = indiceDeArtistas([]);
    expect(cruzarNombre("Orquesta Sinfónica de San Luis Potosí", indice)[0]?.ficha).toBeNull();
    sumarAlIndice(indice, ficha("Orquesta Sinfónica de San Luis Potosí"));
    expect(cruzarNombre("Orquesta Sinfónica de San Luis", indice)[0]?.ficha?.nombre).toBe("Orquesta Sinfónica de San Luis Potosí");
  });

  it("nada de dos letras", () => {
    expect(cruce(" ", ["A"])).toEqual([]);
  });
});

describe("las piezas del cruce", () => {
  it("formasDeCiudad: entera, dos palabras, la última, iniciales y gentilicio", () => {
    expect(formasDeCiudad("San Luis Potosí")).toEqual(expect.arrayContaining(["san luis potosi", "san luis", "potosi", "slp", "s l p", "potosino", "potosina"]));
    expect(formasDeCiudad("San Miguel de Allende")).toEqual(expect.arrayContaining(["san miguel de allende", "san miguel", "allende", "sma"]));
  });

  it("palabrasDeGrupo: la ciudad y el Gobierno del Estado como una marca, sin preposiciones", () => {
    const slp = formasDeCiudad("San Luis Potosí");
    expect(palabrasDeGrupo("Mariachi del Gobierno del Estado de San Luis Potosí", slp)).toEqual(["mariachi", "zzciudad"]);
    expect(palabrasDeGrupo("Ensamble Potosino de Flautas", slp)).toEqual(["ensamble", "zzciudad", "flautas"]);
  });

  it("esNombreDeGrupo y esPersona", () => {
    expect(esNombreDeGrupo("Los Trasnochados")).toBe(true);
    expect(esNombreDeGrupo("Foro360 Teatro Musical")).toBe(true);
    expect(esNombreDeGrupo("Dr. Chessani y sus Huapangueros")).toBe(true);
    expect(esNombreDeGrupo("Juan de las Casas")).toBe(false);
    expect(esPersona("Carlos de Santos")).toBe(true);
    expect(esPersona("Selene")).toBe(false);
    expect(esPersona("Coro Allegro")).toBe(false);
  });

  it("personasDe y partesDeAlias", () => {
    expect(personasDe("Ana López, Luis Pérez y Eva Ruiz")).toEqual(["Ana López", "Luis Pérez", "Eva Ruiz"]);
    expect(personasDe("Ana López y el Coro Cielo Abierto")).toEqual(["Ana López y el Coro Cielo Abierto"]);
    expect(partesDeAlias("La Lupita · Irma Zamora")).toEqual(["La Lupita", "Irma Zamora"]);
    expect(partesDeAlias("Grupo Tlali-Xoco")).toEqual([]);
  });
});

describe("fichaDelTitulo", () => {
  const indice = indiceDeArtistas([
    ficha("Pargazz", { disciplina: "musica", tipo: "grupo" }),
    ficha("Raíces", { disciplina: "musica", tipo: "grupo" }),
    ficha("Concierto", { disciplina: "musica" }),
    ficha("Mar Adentro", { disciplina: "por_completar" }),
  ]);
  it("la ficha que un tramo del título nombra, de la misma disciplina que el evento", () => {
    expect(fichaDelTitulo("Gitanos mexicanos 2ª edición: PARGAZZ", "musica", indice)?.nombre).toBe("Pargazz");
  });
  it("otra disciplina, sin disciplina, por completar o un nombre genérico: nada", () => {
    expect(fichaDelTitulo("Inauguración: Raíces", "artes_visuales", indice)).toBeNull();
    expect(fichaDelTitulo("Gitanos mexicanos: PARGAZZ", null, indice)).toBeNull();
    expect(fichaDelTitulo("Lectura: Mar Adentro", "letras", indice)).toBeNull();
    expect(fichaDelTitulo("Gala: Concierto", "musica", indice)).toBeNull();
  });
  it("un tramo que solo contiene el nombre no basta", () => {
    expect(fichaDelTitulo("Raíces de México en concierto", "musica", indice)).toBeNull();
  });
});

describe("disciplinaDeEvento", () => {
  it.each([
    ["Concierto de Equinoccio de Primavera", null, "musica"],
    ["Serenata en Plaza de Armas", null, "musica"],
    ["Obra: La casa del viento", null, "teatro"],
    ["Teatro musical: Vaselina", null, "teatro"],
    ["Exposición: Paisajes del altiplano", null, "artes_visuales"],
    ["Presentación del libro Cartas al río", null, "letras"],
    ["Presentación editorial: Cartas al río", null, "letras"],
    ["Presentación de danza folklórica", null, "danza"],
    ["Proyección: Roma", null, "cine"],
    ["Conferencia: La voz del barrio", "Conferencia de Marina Soto con música regional mexicana.", "musica"],
    ["Narraciones y Percepciones", "Lectura de textos literarios de Elena Vallarta.", "letras"],
    ["Todos los lunes son de Palique", null, "letras"],
    ["Conferencia: historia del barrio", "Charla abierta.", null],
  ])("«%s» → %s", (titulo, descripcion, esperada) => {
    expect(disciplinaDeEvento(titulo, descripcion)).toBe(esperada);
  });
});
