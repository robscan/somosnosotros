import { describe, expect, it } from "vitest";
import { armarGrafo, construirGrafo, hash01, proyectar, tramoDe, UMBRAL_ANONIMATO, type FilasGrafo } from "./grafo";

// Hoy = 2026-10-13 (día 20739 desde 1970)
const HOY = 20739;
const DIA = 86_400_000;
const dia = (n: number) => new Date(n * DIA + 18 * 3_600_000).toISOString();

const lugar = (id: string, lat: number, lng: number, extra: Partial<FilasGrafo["lugares"][number]> = {}) => ({ id, nombre: `Lugar ${id}`, tipo: "foro", lat, lng, ciudad: "San Luis Potosí", visible: true, privado: false, ...extra });
const artista = (id: string, extra: Partial<FilasGrafo["artistas"][number]> = {}) => ({ id, nombre: `Artista ${id}`, disciplina: "musica", ciudad: "San Luis Potosí", visible: true, ...extra });
const evento = (id: string, dias: number, lugar_id: string | null, extra: Partial<FilasGrafo["eventos"][number]> = {}) => ({
  id,
  lugar_id,
  inicio: dia(dias),
  termina: new Date(Date.parse(dia(dias)) + 2 * 3_600_000).toISOString(),
  visible: true,
  borrador: false,
  clase: "puntual",
  evento_padre_id: null,
  sitio_lat: null,
  sitio_lng: null,
  ...extra,
});
const vacio = (): FilasGrafo => ({ lugares: [], artistas: [], eventos: [], eventos_artistas: [], seguimientos: [], asistencias: [] });
const voy = (usuario_id: string, evento_id: string) => ({ usuario_id, evento_id, estado: "voy" });

// Centro de la ciudad: dos lugares simétricos fijan el centro en (22, -101)
const centro = { lat: 22, lng: -101 };
const kmEsteEnGrados = (km: number) => km / (111.32 * Math.cos((centro.lat * Math.PI) / 180));
const base = (): FilasGrafo => ({
  ...vacio(),
  lugares: [lugar("l1", 22.01, -101 - kmEsteEnGrados(1)), lugar("l2", 21.99, -101 + kmEsteEnGrados(1))],
});

describe("proyectar", () => {
  it("dos kilómetros al este quedan 200 unidades a la derecha (1 unidad = 10 m)", () => {
    const p = proyectar(centro.lat, centro.lng + kmEsteEnGrados(2), centro);
    expect(p.x).toBeCloseTo(200, 3);
    expect(p.z).toBeCloseTo(0, 3);
  });
  it("el norte queda hacia z negativa y el sur hacia z positiva", () => {
    expect(proyectar(centro.lat + 0.01, centro.lng, centro).z).toBeLessThan(0);
    expect(proyectar(centro.lat - 0.01, centro.lng, centro).z).toBeGreaterThan(0);
  });
  it("hasta 10 km es lineal; más allá se comprime en logaritmo y conserva el rumbo", () => {
    const justo = proyectar(centro.lat + 10 / 111.32, centro.lng, centro);
    expect(Math.hypot(justo.x, justo.z)).toBeCloseTo(1000, 3);
    const lejos = proyectar(centro.lat + 20 / 111.32, centro.lng, centro); // 2 000 unidades reales
    expect(Math.hypot(lejos.x, lejos.z)).toBeCloseTo(1000 + 300 * Math.log(2), 3);
    expect(lejos.z).toBeLessThan(0);
    expect(lejos.x).toBeCloseTo(0, 3);
    const muyLejos = proyectar(centro.lat + 140 / 111.32, centro.lng, centro);
    expect(Math.hypot(muyLejos.x, muyLejos.z)).toBeCloseTo(1000 + 300 * Math.log(14), 3); // 140 km reales caben a unos 18 km aparentes
  });
});

describe("lugares", () => {
  it("el centro es el promedio de los lugares de San Luis Potosí y no cuenta los de otra ciudad", () => {
    const f = base();
    f.lugares.push(lugar("l3", 20.9, -100.74, { ciudad: "San Miguel de Allende" }));
    const g = construirGrafo(f, HOY);
    expect(g.centro.lat).toBeCloseTo(22, 4);
    expect(g.centro.lng).toBeCloseTo(-101, 4);
    const lejano = g.lugares[2];
    expect(Math.hypot(lejano.x, lejano.z)).toBeGreaterThan(1000);
  });
  it("seguidores, asistentes, eventos, próximos y días", () => {
    const f = base();
    f.eventos = [evento("e1", HOY - 5, "l1"), evento("e2", HOY + 3, "l1"), evento("e3", HOY + 3, "l1")];
    f.seguimientos = [
      { usuario_id: "u1", lugar_id: "l1", artista_id: null },
      { usuario_id: "u2", lugar_id: "l1", artista_id: null },
    ];
    f.asistencias = [voy("u1", "e1"), { usuario_id: "u2", evento_id: "e2", estado: "me_interesa" }];
    const l = construirGrafo(f, HOY).lugares.find((x) => x.nombre === "Lugar l1")!;
    expect(l.seguidores).toBe(2);
    expect(l.asistentes).toBe(2);
    expect(l.eventos).toBe(3);
    expect(l.proximos).toBe(2);
    expect(l.d).toEqual([HOY - 5, HOY + 3]);
  });
  it("lo oculto, lo privado y lo que no tiene coordenadas no entra", () => {
    const f = base();
    f.lugares.push(lugar("l3", 22, -101, { visible: false }), lugar("l4", 22, -101, { privado: true }), lugar("l5", 0, 0, { lat: null, lng: null }));
    f.eventos = [evento("e1", HOY, "l1", { borrador: true }), evento("e2", HOY, "l1", { visible: false })];
    const g = construirGrafo(f, HOY);
    expect(g.lugares).toHaveLength(2);
    expect(g.resumen.eventos).toBe(0);
  });
});

describe("artistas", () => {
  it("con un solo lugar flota en un halo de radio 28 + 11·√k a su alrededor, entre 45 y 140 de alto", () => {
    const f = base();
    f.artistas = [artista("a1"), artista("a2")];
    f.eventos = [evento("e1", HOY + 1, "l1"), evento("e2", HOY + 2, "l1")];
    f.eventos_artistas = [
      { evento_id: "e1", artista_id: "a1" },
      { evento_id: "e2", artista_id: "a2" },
    ];
    const g = construirGrafo(f, HOY);
    const l = g.lugares.find((x) => x.nombre === "Lugar l1")!;
    const li = g.lugares.indexOf(l);
    const distancias = g.artistas.map((a) => Math.hypot(a.x - l.x, a.z - l.z)).sort((p, q) => p - q);
    expect(distancias[0]).toBeCloseTo(28 + 11, 0);
    expect(distancias[1]).toBeCloseTo(28 + 11 * Math.sqrt(2), 0);
    for (const a of g.artistas) {
      expect(a.lugar).toBe(li);
      expect(a.lugares).toBe(1);
      expect(a.y).toBeGreaterThanOrEqual(45);
      expect(a.y).toBeLessThanOrEqual(140);
    }
  });
  it("en dos lugares queda entre ellos, cargado hacia el que más pesa, y su lugar principal es ese", () => {
    const f = base();
    f.artistas = [artista("a1")];
    // dos próximos en l1 (peso 4) y uno pasado en l2 (peso 1)
    f.eventos = [evento("e1", HOY + 1, "l1"), evento("e2", HOY + 2, "l1"), evento("e3", HOY - 9, "l2")];
    f.eventos_artistas = ["e1", "e2", "e3"].map((evento_id) => ({ evento_id, artista_id: "a1" }));
    const g = construirGrafo(f, HOY);
    const [a] = g.artistas;
    const i1 = g.lugares.findIndex((x) => x.nombre === "Lugar l1");
    expect(a.lugares).toBe(2);
    expect(a.lugar).toBe(i1);
    const [l1, l2] = [g.lugares[i1], g.lugares[1 - i1]];
    const bx = (4 * l1.x + 1 * l2.x) / 5;
    const bz = (4 * l1.z + 1 * l2.z) / 5;
    expect(Math.hypot(a.x - bx, a.z - bz)).toBeCloseTo(18, 0);
    expect(g.resumen.artistasConectados).toBe(1);
  });
  it("solo en sitios libres se coloca en ese sitio, sin lugar", () => {
    const f = base();
    f.artistas = [artista("a1")];
    f.eventos = [evento("e1", HOY + 1, null, { sitio_lat: 22.05, sitio_lng: -101 })];
    f.eventos_artistas = [{ evento_id: "e1", artista_id: "a1" }];
    const g = construirGrafo(f, HOY);
    const a = g.artistas[0];
    expect(a.sitioLibre).toBe(true);
    expect(a.suelto).toBeUndefined();
    expect(a.lugar).toBe(-1);
    const sitio = proyectar(22.05, -101, g.centro);
    const d = Math.hypot(a.x - sitio.x, a.z - sitio.z);
    expect(d).toBeGreaterThanOrEqual(15 - 0.2);
    expect(d).toBeLessThanOrEqual(35 + 0.2);
    expect(g.aristas.filter((x) => x[0] === "a")).toHaveLength(0);
  });
  it("sin ningún evento va al anillo exterior (800 a 950) y entre −120 y 120 de alto", () => {
    const f = base();
    f.artistas = Array.from({ length: 12 }, (_, i) => artista(`s${i}`));
    const g = construirGrafo(f, HOY);
    expect(g.resumen.artistasSueltos).toBe(12);
    for (const a of g.artistas) {
      expect(a.suelto).toBe(true);
      const r = Math.hypot(a.x, a.z);
      expect(r).toBeGreaterThanOrEqual(800 - 0.2);
      expect(r).toBeLessThanOrEqual(950 + 0.2);
      expect(a.y).toBeGreaterThanOrEqual(-120);
      expect(a.y).toBeLessThanOrEqual(120);
    }
  });
  it("suma sus seguidores y las asistencias a sus eventos", () => {
    const f = base();
    f.artistas = [artista("a1")];
    f.eventos = [evento("e1", HOY + 1, "l1")];
    f.eventos_artistas = [{ evento_id: "e1", artista_id: "a1" }];
    f.seguimientos = [{ usuario_id: "u1", lugar_id: null, artista_id: "a1" }];
    f.asistencias = [voy("u1", "e1"), voy("u2", "e1")];
    const a = construirGrafo(f, HOY).artistas[0];
    expect(a.seguidores).toBe(1);
    expect(a.asistentes).toBe(2);
    expect(a.fechas).toBe(1);
  });
});

describe("personas", () => {
  const conGente = (n: number): FilasGrafo => {
    const f = base();
    f.artistas = [artista("a1")];
    f.eventos = [evento("e1", HOY + 1, "l1")];
    f.eventos_artistas = [{ evento_id: "e1", artista_id: "a1" }];
    f.asistencias = Array.from({ length: n }, (_, i) => voy(`usuario-secreto-${i}`, "e1"));
    return f;
  };
  it("salen anónimas: ni id, ni nombre, ni foto, ni enlace; solo posición, tramo y la marca de inventada", () => {
    const f = conGente(4);
    f.seguimientos = [{ usuario_id: "usuario-secreto-0", lugar_id: "l1", artista_id: null }];
    const g = construirGrafo(f, HOY);
    expect(g.personas).toHaveLength(4);
    for (const p of g.personas) {
      expect(Object.keys(p).sort()).toEqual(["inventada", "tramo", "x", "y", "z"]);
      expect(p.inventada).toBe(true);
      expect([1, 2, 3]).toContain(p.tramo);
      expect(p.y).toBeGreaterThanOrEqual(-140);
      expect(p.y).toBeLessThanOrEqual(-45);
    }
    expect(JSON.stringify(g)).not.toContain("usuario-secreto");
  });
  it("el tramo sale de las acciones y nunca es el número", () => {
    expect([0, 1, 2, 5, 6, 40].map(tramoDe)).toEqual([1, 1, 2, 2, 3, 3]);
    const f = conGente(1);
    f.seguimientos = Array.from({ length: 6 }, (_, i) => ({ usuario_id: "usuario-secreto-0", lugar_id: null, artista_id: `x${i}` }));
    // seguimientos a artistas que no están no suman al grafo ni a las acciones visibles
    expect(construirGrafo(f, HOY).personas[0].tramo).toBe(1);
    f.artistas = Array.from({ length: 6 }, (_, i) => artista(`x${i}`));
    expect(construirGrafo(f, HOY).personas[0].tramo).toBe(3);
  });
  it("quien solo sigue no se dibuja: sus seguimientos solo suman a los seguidores", () => {
    const f = conGente(1);
    f.seguimientos = [{ usuario_id: "otra-persona", lugar_id: "l1", artista_id: null }];
    const g = construirGrafo(f, HOY);
    expect(g.personas).toHaveLength(1);
    expect(g.resumen.personasQueSiguen).toBe(2);
    expect(g.lugares.find((l) => l.nombre === "Lugar l1")!.seguidores).toBe(1);
  });
  it("su posición se deriva de los lugares a los que va, corrida 30 a 90 unidades", () => {
    const g = construirGrafo(conGente(3), HOY);
    const l = g.lugares.find((x) => x.nombre === "Lugar l1")!;
    for (const p of g.personas) {
      const d = Math.hypot(p.x - l.x, p.z - l.z);
      expect(d).toBeGreaterThanOrEqual(30 - 0.2);
      expect(d).toBeLessThanOrEqual(90 + 0.2);
    }
  });
});

describe("umbral de anonimato", () => {
  const evento3 = (n: number): FilasGrafo => {
    const f = base();
    f.artistas = [artista("a1")];
    f.eventos = [evento("e1", HOY + 1, "l1")];
    f.eventos_artistas = [{ evento_id: "e1", artista_id: "a1" }];
    f.asistencias = Array.from({ length: n }, (_, i) => voy(`u${i}`, "e1"));
    return f;
  };
  const deGente = (g: ReturnType<typeof construirGrafo>) => g.aristas.filter((x) => x[0] === "pl" || x[0] === "pa" || x[0] === "pp");
  it("el umbral es 3", () => expect(UMBRAL_ANONIMATO).toBe(3));
  it("un evento con 2 Voy no produce líneas de personas, pero las personas suman a los tamaños", () => {
    const g = construirGrafo(evento3(2), HOY);
    expect(deGente(g)).toHaveLength(0);
    expect(g.personas).toHaveLength(2);
    expect(g.lugares.find((l) => l.nombre === "Lugar l1")!.asistentes).toBe(2);
    expect(g.artistas[0].asistentes).toBe(2);
    expect(g.aristas.filter((x) => x[0] === "a")).toHaveLength(1);
  });
  it("con 3 Voy salen sus líneas a lugar, a artista y entre ellas", () => {
    const g = construirGrafo(evento3(3), HOY);
    expect(g.aristas.filter((x) => x[0] === "pl")).toHaveLength(3);
    expect(g.aristas.filter((x) => x[0] === "pa")).toHaveLength(3);
    expect(g.aristas.filter((x) => x[0] === "pp")).toHaveLength(3);
  });
  it("Me interesa también cuenta para el umbral", () => {
    const f = evento3(2);
    f.asistencias.push({ usuario_id: "u9", evento_id: "e1", estado: "me_interesa" });
    expect(deGente(construirGrafo(f, HOY)).length).toBeGreaterThan(0);
  });
});

describe("líneas entre iguales", () => {
  it("dos artistas que comparten dos eventos tienen una sola línea de peso 2, con sus días", () => {
    const f = base();
    f.artistas = [artista("a1"), artista("a2"), artista("a3")];
    f.eventos = [evento("e1", HOY + 1, "l1"), evento("e2", HOY + 4, "l2")];
    f.eventos_artistas = [
      { evento_id: "e1", artista_id: "a1" },
      { evento_id: "e1", artista_id: "a2" },
      { evento_id: "e2", artista_id: "a2" },
      { evento_id: "e2", artista_id: "a1" },
      { evento_id: "e2", artista_id: "a3" },
    ];
    const aa = construirGrafo(f, HOY).aristas.filter((x) => x[0] === "aa");
    expect(aa).toHaveLength(3);
    const par = aa.find((x) => x[3] === 2)!;
    expect(par[4]).toEqual([HOY + 1, HOY + 4]);
    expect(par[1]).toBeLessThan(par[2]);
    expect(new Set(aa.map((x) => `${x[1]}|${x[2]}`)).size).toBe(3);
  });
  it("dos artistas del mismo festival que no comparten evento no se unen", () => {
    const f = base();
    f.artistas = [artista("a1"), artista("a2")];
    f.eventos = [evento("fest", HOY, "l1", { clase: "festival" }), evento("e1", HOY + 1, "l1", { evento_padre_id: "fest" }), evento("e2", HOY + 2, "l2", { evento_padre_id: "fest" })];
    f.eventos_artistas = [
      { evento_id: "e1", artista_id: "a1" },
      { evento_id: "e2", artista_id: "a2" },
    ];
    const g = construirGrafo(f, HOY);
    expect(g.aristas.filter((x) => x[0] === "aa")).toHaveLength(0);
    // pero sus sedes sí: lugar–lugar por el mismo festival
    const ll = g.aristas.filter((x) => x[0] === "ll");
    expect(ll).toHaveLength(1);
    expect(ll[0][3]).toBe(1);
    expect(ll[0][4]).toEqual([HOY + 1, HOY + 2]);
    expect(g.resumen.festivales).toBe(1);
  });
  it("dos festivales con las mismas sedes dan una línea de peso 2", () => {
    const f = base();
    f.eventos = [
      evento("f1", HOY, null, { clase: "festival" }),
      evento("f2", HOY, null, { clase: "festival" }),
      evento("a", HOY + 1, "l1", { evento_padre_id: "f1" }),
      evento("b", HOY + 1, "l2", { evento_padre_id: "f1" }),
      evento("c", HOY + 9, "l1", { evento_padre_id: "f2" }),
      evento("d", HOY + 9, "l2", { evento_padre_id: "f2" }),
    ];
    const ll = construirGrafo(f, HOY).aristas.filter((x) => x[0] === "ll");
    expect(ll).toHaveLength(1);
    expect(ll[0][3]).toBe(2);
  });
  it("personas que coinciden en dos eventos con umbral tienen una línea de peso 2", () => {
    const f = base();
    f.eventos = [evento("e1", HOY + 1, "l1"), evento("e2", HOY + 2, "l2")];
    f.asistencias = ["e1", "e2"].flatMap((e) => ["u1", "u2", "u3"].map((u) => voy(u, e)));
    const pp = construirGrafo(f, HOY).aristas.filter((x) => x[0] === "pp");
    expect(pp).toHaveLength(3);
    expect(pp.every((x) => x[3] === 2 && x[1] < x[2])).toBe(true);
  });
});

describe("determinismo", () => {
  const completo = (): FilasGrafo => {
    const f = base();
    f.artistas = Array.from({ length: 9 }, (_, i) => artista(`a${i}`));
    f.eventos = [evento("e1", HOY + 1, "l1"), evento("e2", HOY + 2, "l2"), evento("e3", HOY - 3, "l1"), evento("e4", HOY + 5, null, { sitio_lat: 22.02, sitio_lng: -101.01 })];
    f.eventos_artistas = [
      { evento_id: "e1", artista_id: "a0" },
      { evento_id: "e1", artista_id: "a1" },
      { evento_id: "e2", artista_id: "a1" },
      { evento_id: "e3", artista_id: "a2" },
      { evento_id: "e4", artista_id: "a3" },
    ];
    f.asistencias = ["u1", "u2", "u3", "u4"].flatMap((u) => [voy(u, "e1"), voy(u, "e2")]);
    f.seguimientos = [{ usuario_id: "u9", lugar_id: "l2", artista_id: null }];
    return f;
  };
  it("dos llamadas iguales dan el mismo resultado", () => {
    expect(construirGrafo(completo(), HOY)).toEqual(construirGrafo(completo(), HOY));
  });
  it("el orden en que llegan las filas no cambia el resultado", () => {
    const f = completo();
    const al_reves: FilasGrafo = {
      lugares: [...f.lugares].reverse(),
      artistas: [...f.artistas].reverse(),
      eventos: [...f.eventos].reverse(),
      eventos_artistas: [...f.eventos_artistas].reverse(),
      seguimientos: [...f.seguimientos].reverse(),
      asistencias: [...f.asistencias].reverse(),
    };
    expect(construirGrafo(al_reves, HOY)).toEqual(construirGrafo(f, HOY));
  });
  it("el azar fijo siempre está en [0, 1) y no cambia", () => {
    expect(hash01("a", "x")).toBe(hash01("a", "x"));
    for (const s of ["a", "b", "c", "zzz"]) expect(hash01(s, "y")).toBeGreaterThanOrEqual(0);
    for (const s of ["a", "b", "c", "zzz"]) expect(hash01(s, "y")).toBeLessThan(1);
  });
  it("sin datos devuelve un grafo vacío válido", () => {
    const g = construirGrafo(vacio(), HOY);
    expect(g.lugares).toEqual([]);
    expect(g.aristas).toEqual([]);
    expect(g.primerDia).toBe(HOY);
    expect(g.extraido).toBe("2026-10-13");
  });
});

describe("el punto de quien mira (el interruptor «Yo»)", () => {
  const uuid = (n: number) => `${String(n).padStart(8, "0")}-aaaa-4bbb-8ccc-${String(n).padStart(12, "0")}`;
  const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
  const conUuid = (): FilasGrafo => {
    const f = vacio();
    f.lugares = [{ ...lugar(uuid(1), 22.01, -101.01), nombre: "Teatro" }, { ...lugar(uuid(2), 21.99, -100.99), nombre: "Galería" }];
    f.artistas = [{ ...artista(uuid(3)), nombre: "Dúo" }];
    f.eventos = [evento(uuid(4), HOY + 1, uuid(1)), evento(uuid(5), HOY + 2, uuid(2))];
    f.eventos_artistas = [{ evento_id: uuid(4), artista_id: uuid(3) }];
    f.asistencias = [10, 11, 12, 13].map((n) => voy(uuid(n), uuid(4))).concat([voy(uuid(10), uuid(5))]);
    f.seguimientos = [{ usuario_id: uuid(20), lugar_id: uuid(1), artista_id: null }];
    return f;
  };
  it("cada usuario con asistencias tiene un punto distinto, y el de otro usuario o el que solo sigue no tiene", () => {
    const { grafo, indicePorUsuario } = armarGrafo(conUuid(), HOY);
    const indices = [10, 11, 12, 13].map((n) => indicePorUsuario[uuid(n)]);
    expect(new Set(indices).size).toBe(4);
    for (const i of indices) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(grafo.personas.length);
    }
    expect(Object.keys(indicePorUsuario)).toHaveLength(grafo.personas.length);
    expect(indicePorUsuario[uuid(20)]).toBeUndefined();
    // la persona 10 fue a dos eventos: su punto tiene el tramo de dos acciones (2 a 5)
    expect(grafo.personas[indicePorUsuario[uuid(10)]].tramo).toBe(2);
    expect(grafo.personas[indicePorUsuario[uuid(11)]].tramo).toBe(1);
  });
  it("lo que recibe el componente del navegador (el grafo y un número) no contiene ningún id", () => {
    const { grafo, indicePorUsuario } = armarGrafo(conUuid(), HOY);
    const yo = indicePorUsuario[uuid(10)] ?? null;
    const props = JSON.stringify({ datos: grafo, yo });
    expect(props).not.toMatch(UUID);
    expect(typeof yo).toBe("number");
    // el mapa privado, en cambio, sí lleva los ids: por eso se queda en el servidor
    expect(JSON.stringify(indicePorUsuario)).toMatch(UUID);
  });
  it("armarGrafo y construirGrafo dan el mismo grafo", () => {
    expect(armarGrafo(conUuid(), HOY).grafo).toEqual(construirGrafo(conUuid(), HOY));
  });
});
