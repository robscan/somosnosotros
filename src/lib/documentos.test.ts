import { describe, expect, it } from "vitest";
import {
  bloquesArtista,
  bloquesLugar,
  clavePeriodo,
  cuandoDocumento,
  cuentasInforme,
  DEFINICIONES,
  enPeriodo,
  etiquetasPeriodo,
  fechaElaborado,
  filaDocumento,
  hrefDocumento,
  informeLugar,
  nombreDocumento,
  nombrePeriodo,
  presentacionArtista,
  redesDocumento,
  type BloqueDocumento,
} from "./documentos";
import type { EventoPasado } from "./historialFichas";
import { opcionesInforme, opcionesPresentacion } from "./opcionesDocumento";
import { MARCA } from "./marca";

/** La lógica de la presentación y del informe (OL-396), con datos inventados. */

const AHORA = new Date("2026-10-12T20:00:00Z");
const Z = "America/Mexico_City";
const LUGAR = { id: "l-1", slug: "foro", nombre: "Foro La Pirámide", portada: null };
const a = (id: string, nombre: string) => ({ id, slug: id, nombre, foto: null });
function ev(id: string, inicio: string, extra: Partial<EventoPasado> = {}): EventoPasado {
  return { id, slug: id, titulo: `Evento ${id}`, inicio, fin: null, zona: Z, imagen: null, lugar_id: "l-1", sitio_texto: null, sitio_direccion: null, sitio_reservado: false, lugar: LUGAR, festival: null, artistas: [], van: 0, cancelado: false, ...extra };
}
const YO = { id: "a-1", slug: "leo", nombre: "Leo", detalle: "rock y metal", tipo: "solista", ciudad: "San Luis Potosí", descripcion: "Guitarrista.", redes: [{ url: "https://www.instagram.com/leo_/?hl=es" }], foto: null, portada: null };
const tipos = (b: BloqueDocumento[]) => b.map((x) => (x.tipo === "rotulo" || x.tipo === "anio" ? `${x.tipo}:${x.texto}` : x.tipo));

describe("la presentación del artista", () => {
  const pasados = [
    ev("e1", "2026-10-09T01:00:00Z", { artistas: [a("a-1", "Leo"), a("a-2", "Ana"), a("a-3", "Bea")], van: 3, festival: "Festival X" }),
    ev("e2", "2025-12-01T02:00:00Z", { artistas: [a("a-1", "Leo"), a("a-2", "Ana")], van: 1 }),
    ev("e3", "2026-09-20T02:00:00Z", { artistas: [a("a-1", "Leo")], cancelado: true, van: 5 }),
  ];
  const proximos = [ev("f2", "2026-11-02T02:00:00Z"), ev("f1", "2026-10-20T02:00:00Z", { fin: "2027-02-28T05:00:00Z", titulo: "Expo larga" })];

  it("reseña, trayectoria por año (lo más reciente primero), lugares y con quién, próximas fechas al final", () => {
    const b = bloquesArtista({ artista: YO, pasados, proximos, ahora: AHORA });
    expect(tipos(b)).toEqual(["rotulo:Reseña", "resena", "rotulo:Trayectoria · 2 fechas · 1 cancelado · 1 lugar", "anio:2026", "fila", "fila", "anio:2025", "fila", "columnas", "rotulo:Próximas fechas", "fila", "fila"]);
    const filas = b.filter((x): x is Extract<BloqueDocumento, { tipo: "fila" }> => x.tipo === "fila").map((x) => x.fila);
    expect(filas[0]).toEqual({ cuando: "8 oct · 7:00 pm", titulo: "Evento e1", detalle: "Foro La Pirámide · parte de Festival X · con Ana y Bea · 3 dijeron «Voy»", cancelado: false });
    // Lo cancelado se lista tachado y sin «Voy».
    expect(filas[1]).toMatchObject({ cancelado: true, detalle: "Foro La Pirámide" });
    expect(filas[2].detalle).toBe("Foro La Pirámide · con Ana · 1 dijo «Voy»");
    // Las próximas, en orden y sin «Voy»; una expo dice su rango.
    expect(filas[3]).toMatchObject({ titulo: "Expo larga", cuando: "19 oct – 27 feb" });
    const columnas = b.find((x) => x.tipo === "columnas") as Extract<BloqueDocumento, { tipo: "columnas" }>;
    expect(columnas.columnas[0]).toEqual({ rotulo: "Lugares", nombres: [{ nombre: "Foro La Pirámide", veces: "2 veces" }] });
    expect(columnas.columnas[1]).toEqual({ rotulo: "Ha tocado con", nombres: [{ nombre: "Ana", veces: "2 veces" }, { nombre: "Bea", veces: null }] });
  });

  it("sin reseña ni redes no hay sección; sin próximas, tampoco", () => {
    const b = bloquesArtista({ artista: { ...YO, descripcion: "  ", redes: null }, pasados: pasados.slice(1, 2), proximos: [], ahora: AHORA });
    expect(tipos(b)).toEqual(["rotulo:Trayectoria · 1 fecha · 1 lugar", "anio:2025", "fila", "columnas"]);
  });

  it("la cabecera: rótulo, meta, foto (o portada), dirección de la ficha y el día del pie", () => {
    const d = presentacionArtista({ artista: { ...YO, portada: "https://x.supabase.co/p.jpg" }, pasados, proximos, ahora: AHORA });
    expect(d).toMatchObject({ rotulo: "Presentación", meta: "Rock y metal · Solista · San Luis Potosí", foto: "https://x.supabase.co/p.jpg", enlace: "somosnosotros.org/artistas/leo", tituloCorto: "Presentación de Leo", elaborado: "12 oct 2026", reglas: null });
  });

  it("las redes, sin https, sin www, sin la consulta ni la barra final", () => {
    expect(redesDocumento(YO.redes)).toEqual(["Instagram: instagram.com/leo_"]);
    expect(redesDocumento(null)).toEqual([]);
  });
});

describe("el informe del lugar: las cifras y sus reglas", () => {
  const marco = ev("fest", "2026-10-03T00:00:00Z", { clase: "festival", fin: "2026-10-10T05:00:00Z" });
  const actos = [
    ev("a1", "2026-10-04T01:00:00Z", { festival: "Fest", festivalId: "fest", artistas: [a("x", "Xochitl"), a("y", "Yair")], van: 2 }),
    ev("a2", "2026-10-05T01:00:00Z", { festival: "Fest", festivalId: "fest", artistas: [a("x", "Xochitl")], van: 1 }),
    ev("a3", "2026-10-06T01:00:00Z", { festival: "Fest", festivalId: "fest", artistas: [a("z", "Zoe")], van: 4, cancelado: true }),
  ];
  const expo = ev("expo", "2026-10-01T23:00:00Z", { clase: "exposicion", fin: "2026-10-11T05:00:00Z", van: 3 });
  const taller = ev("taller", "2026-10-07T16:00:00Z", { clase: "taller", fin: "2026-10-09T20:00:00Z" });
  const septiembre = ev("sep", "2026-09-10T02:00:00Z", { artistas: [a("w", "Wendy")] });
  const todos = [marco, ...actos, expo, taller, septiembre];

  it("un festival marco no se suma si sus actos están en el periodo; la expo y el taller cuentan una vez; lo cancelado no se realizó", () => {
    const c = cuentasInforme(todos, "mes", AHORA, Z);
    expect(c.actividades.map((e) => e.id)).toEqual(["expo", "a1", "a2", "a3", "taller"]);
    expect(c.realizadas).toBe(4);
    expect(c.artistas.map((p) => [p.nombre, p.veces])).toEqual([["Xochitl", 2], ["Yair", 1]]);
    expect(c.voy).toBe(6);
    expect(c.talleres).toBe(1);
  });

  it("un festival sin actos en el periodo sí cuenta como actividad", () => {
    expect(cuentasInforme([marco], "mes", AHORA, Z).actividades.map((e) => e.id)).toEqual(["fest"]);
  });

  it("el periodo por el día de inicio en la zona del lugar: mes, año o todo", () => {
    expect(cuentasInforme(todos, "anio", AHORA, Z).actividades).toHaveLength(6);
    expect(cuentasInforme(todos, "todo", AHORA, Z).actividades).toHaveLength(6);
    expect(cuentasInforme([ev("viejo", "2025-10-03T02:00:00Z")], "anio", AHORA, Z).actividades).toHaveLength(0);
    // 1 de octubre a las 05:00 UTC son las 23:00 del 30 de septiembre en San Luis.
    expect(enPeriodo("2026-10-01T05:00:00Z", "mes", AHORA, Z)).toBe(false);
    expect(enPeriodo("2026-10-01T07:00:00Z", "mes", AHORA, Z)).toBe(true);
  });

  it("los bloques: las cuatro cifras con su definición, la nota de talleres, la lista y los artistas a dos columnas", () => {
    const b = bloquesLugar({ lugar: { ...LUGAR, zona: Z }, pasados: todos, periodo: "mes", ahora: AHORA });
    expect(tipos(b)).toEqual(["cifras", "nota", "rotulo:Actividades del periodo", "fila", "fila", "fila", "fila", "fila", "columnas"]);
    const cifras = b[0] as Extract<BloqueDocumento, { tipo: "cifras" }>;
    expect(cifras.periodo).toBe("Periodo: Octubre de 2026");
    expect(cifras.cifras).toEqual([
      { n: 5, titulo: "Actividades registradas", definicion: DEFINICIONES.actividades },
      { n: 4, titulo: "Realizadas", definicion: DEFINICIONES.realizadas },
      { n: 2, titulo: "Artistas participantes", definicion: DEFINICIONES.artistas },
      { n: 6, titulo: "Dijeron «Voy»", definicion: DEFINICIONES.voy },
    ]);
    expect(DEFINICIONES.voy).toBe("Personas que marcaron «Voy» en la app. No es asistencia medida.");
    expect(b[1]).toEqual({ tipo: "nota", texto: "1 taller con sesiones; cada taller cuenta una vez." });
    const columnas = b[8] as Extract<BloqueDocumento, { tipo: "columnas" }>;
    expect(columnas.columnas.map((c) => c.rotulo)).toEqual(["Artistas que pasaron", null]);
    expect(columnas.columnas.map((c) => c.nombres.map((n) => n.nombre))).toEqual([["Xochitl"], ["Yair"]]);
  });

  it("sin nada en el periodo: ceros y «Ninguna en el periodo.»", () => {
    const b = bloquesLugar({ lugar: LUGAR, pasados: [septiembre], periodo: "mes", ahora: AHORA });
    expect((b[0] as Extract<BloqueDocumento, { tipo: "cifras" }>).cifras.map((c) => c.n)).toEqual([0, 0, 0, 0]);
    expect(b).toContainEqual({ tipo: "nota", texto: "Ninguna en el periodo." });
  });

  it("la fila del lugar: festival, artistas y cuántos dijeron «Voy» (nunca en lo cancelado)", () => {
    expect(filaDocumento(actos[0], { que: "lugar" }).detalle).toBe("parte de Fest · Xochitl, Yair · 2 dijeron «Voy»");
    expect(filaDocumento(actos[2], { que: "lugar" }).detalle).toBe("parte de Fest · Zoe");
  });

  it("el documento: rótulo, dirección y las reglas en el pie", () => {
    const d = informeLugar({ lugar: { ...LUGAR, direccion: "Calle 1", zona: Z }, pasados: todos, periodo: "anio", ahora: AHORA });
    expect(d).toMatchObject({ rotulo: "Informe de actividad", meta: "Calle 1", tituloCorto: "Informe de actividad · Foro La Pirámide", reglas: "un festival no se suma además de sus actividades; una expo cuenta una vez" });
    expect((d.bloques[0] as Extract<BloqueDocumento, { tipo: "cifras" }>).periodo).toBe("Periodo: 2026");
  });
});

describe("fechas, nombres y direcciones", () => {
  it("las fechas del renglón y del pie", () => {
    expect(cuandoDocumento({ inicio: "2026-10-09T01:00:00Z", fin: null, zona: Z })).toBe("8 oct · 7:00 pm");
    expect(cuandoDocumento({ inicio: "2026-10-06T16:00:00Z", fin: "2026-10-07T20:00:00Z", zona: Z })).toBe("6 oct – 7 oct");
    expect(fechaElaborado(AHORA, Z)).toBe("12 oct 2026");
    expect(nombrePeriodo("mes", AHORA, Z)).toBe("Octubre de 2026");
    expect(nombrePeriodo("todo", AHORA, Z)).toBe("todo lo registrado");
    expect(etiquetasPeriodo(AHORA, Z)).toEqual({ mes: "Octubre", anio: "2026", todo: "Todo" });
  });

  it("el archivo y la dirección del PDF", () => {
    expect(nombreDocumento("artista", "leo-traeger")).toBe("presentacion-leo-traeger.pdf");
    expect(nombreDocumento("lugar", "cc200", clavePeriodo("mes", AHORA, Z))).toBe("informe-cc200-2026-10.pdf");
    expect(nombreDocumento("lugar", "cc200", clavePeriodo("todo", AHORA, Z))).toBe("informe-cc200-todo.pdf");
    expect(hrefDocumento({ que: "artista", id: "leo", formato: "a4", v: "x1" })).toBe("/api/documento?que=artista&id=leo&formato=a4&v=x1");
    expect(hrefDocumento({ que: "lugar", id: "cc200", formato: "carta", periodo: "anio" })).toBe("/api/documento?que=lugar&id=cc200&periodo=anio&formato=carta");
  });

  it("las opciones de la hoja: páginas, dirección con versión y archivo por elección", () => {
    const p = opcionesPresentacion({ artista: YO, pasados: [ev("e1", "2026-10-09T01:00:00Z")], proximos: [], ahora: AHORA });
    expect(p.map((o) => [o.formato, o.paginas, o.archivo])).toEqual([["carta", 1, "presentacion-leo.pdf"], ["a4", 1, "presentacion-leo.pdf"]]);
    expect(p[0].href).toMatch(/^\/api\/documento\?que=artista&id=leo&formato=carta&v=[a-z0-9]+$/);
    expect(p[0].ayuda).toBe(`Tus fechas en ${MARCA}, tu reseña y tus redes, listas para enviar: 1 página.`);
    const i = opcionesInforme({ lugar: { ...LUGAR, zona: Z }, pasados: [ev("e1", "2026-10-09T01:00:00Z")], ahora: AHORA });
    expect(i.map((o) => `${o.periodo}/${o.formato}`)).toEqual(["mes/carta", "mes/a4", "anio/carta", "anio/a4", "todo/carta", "todo/a4"]);
    expect(i[0].ayuda).toBe("Lo que pasó en Foro La Pirámide en el periodo, con las definiciones de cada cifra: 1 página.");
    expect(i[2].archivo).toBe("informe-foro-2026.pdf");
  });
});
