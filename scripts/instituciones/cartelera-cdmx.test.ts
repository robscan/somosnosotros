import { describe, expect, it } from "vitest";
import { baseFalsa } from "../../src/lib/rutinas/baseFalsa";
import { lineasDeInforme, soloLectura } from "./cartelera-cdmx";

describe("la carga inicial de la cartelera (OL-448)", () => {
  it("con --simular la base solo se lee: lo que se escribiría se anota y contesta «hecho» sin tocar nada", async () => {
    const base = baseFalsa({ propuestas: [{ id: "p1", tipo: "evento", estado: "propuesta" }], rutinas_corridas: [] }, { eventos_parecidos: () => [] });
    const anotadas: { tabla: string; op: string }[] = [];
    const db = soloLectura(base.db, (e) => anotadas.push(e));
    // Leer pasa tal cual (la base falsa devuelve la fila entera).
    expect((await db.from("propuestas").select("id").eq("tipo", "evento")).data).toEqual([{ id: "p1", tipo: "evento", estado: "propuesta" }]);
    expect(await db.from("propuestas").insert({ id: "p2", tipo: "lugar" })).toEqual({ data: null, error: null });
    expect(await db.from("propuestas").insert([{ id: "p3" }]).select("id").single()).toEqual({ data: null, error: null });
    expect(await db.from("propuestas").update({ estado: "rechazada" }).eq("id", "p1").select("id")).toEqual({ data: null, error: null });
    expect(await db.from("configuracion").upsert({ clave: "x", valor: {} }, { onConflict: "clave" })).toEqual({ data: null, error: null });
    expect(await db.rpc("aceptar_propuesta", { p_propuesta: "p1" })).toEqual({ data: null, error: null });
    expect((await db.rpc("eventos_parecidos", {})).error).toBeNull();
    expect(base.tablas.propuestas).toEqual([{ id: "p1", tipo: "evento", estado: "propuesta" }]);
    expect(base.tablas.configuracion ?? []).toEqual([]);
    expect(anotadas.map((a) => `${a.tabla}:${a.op}`)).toEqual(["propuestas:insert", "propuestas:insert", "propuestas:update", "configuracion:upsert", "aceptar_propuesta:rpc"]);
    expect(base.operaciones.filter((o) => o.op !== "select" && o.op !== "rpc")).toEqual([]);
  });

  it("el informe cuadra por ficha, dice cuántas propuestas de evento y de lugar, en hora de la ciudad, con ejemplos sin hora y el cruce de recintos", () => {
    const lineas = lineasDeInforme({
      simular: true,
      ciudad: "Ciudad de México",
      corrida: null,
      minutos: 29,
      resumen: {
        sesiones: 1200,
        cartelera: {
          eventos: 910,
          ya_propuestos: 0,
          leidas: 908,
          fallidas: 2,
          propuestos: 700,
          recintos_nuevos: 95,
          motivos: { pasado: 99, sin_hora: 77, fuera_de_la_ciudad: 3, ya_existe: 18, unido: 9, otra_ficha: 1, no_guardada: 1 },
          por_tipo: { "Cursos y Talleres": { leidos: 100, propuestos: 60 }, "Artes Escénicas": { leidos: 128, propuestos: 120 } },
        },
        avisos: ["La cartelera pidió esperar: se sigue en el siguiente paso"],
      },
      escritas: { eventos: 700, lugares: 95 },
      muestra: [{ tipo: "festival", titulo: "4° Festival de Xantolo", inicio: "2026-10-25T17:00:00.000Z", sesiones: 0 }, { tipo: "puntual", titulo: "Temporada: Hamlet", inicio: "2026-10-24T00:00:00.000Z", sesiones: 8 }],
      sinHora: [{ tipo: "sin_hora", url: "https://cartelera.cdmx.gob.mx/40980/22-10-2026/fantasmitas", titulo: "Fantasmitas", descripcion: "Se utilizará pintura." }],
      recintos: [
        { tipo: "recinto", id: "651", nombre: "Colegio de San Ildefonso", lugar: "Antiguo Colegio de San Ildefonso", como: "parecido", metros: 70, cercano: null },
        { tipo: "recinto", id: "651", nombre: "Colegio de San Ildefonso", lugar: "Antiguo Colegio de San Ildefonso", como: "parecido", metros: 70, cercano: null },
        { tipo: "recinto", id: "80", nombre: "Palacio de Bellas Artes", lugar: "Palacio de Bellas Artes", como: "exacto", metros: 4, cercano: null },
        { tipo: "recinto", id: "64", nombre: "Museo de la Ciudad de México", lugar: null, cercano: { nombre: "Templo Mayor", metros: 420 } },
      ],
      noPropuestas: [
        { tipo: "no_propuesta", motivo: "otra_ficha", url: "https://cartelera.cdmx.gob.mx/16/30-10-2026/taller-de-titeres", titulo: "Taller de títeres", con: "Taller de títeres" },
        { tipo: "no_propuesta", motivo: "no_guardada", url: "https://cartelera.cdmx.gob.mx/7/24-10-2026/concierto", titulo: "Concierto" },
      ],
    });
    const texto = lineas.join("\n");
    expect(texto).toContain("simulación (no se escribió nada)");
    expect(texto).toContain("- Eventos listados: 910 = ya propuestos antes (no se pidieron) 0 + fichas leídas 908 + sin respuesta 2");
    expect(texto).toContain("- Fichas leídas: 908 = propuestas 700 + no propuestas 208");
    expect(texto).not.toContain("NO CUADRA");
    expect(texto).toContain("- En total se escribirían **700 propuestas de evento y 95 de lugar**");
    // Por tipo, de más leídos a menos.
    expect(lineas.filter((l) => l.startsWith("| ") && !l.startsWith("| Tipo") && !l.startsWith("| ---"))).toEqual(["| Artes Escénicas | 128 | 120 |", "| Cursos y Talleres | 100 | 60 |"]);
    // En hora de la ciudad: las 17:00 UTC del Xantolo son las 11:00; las 00:00 UTC del 24, las 18:00 del 23.
    expect(texto).toContain("- 2026-10-25 11:00 · festival · 4° Festival de Xantolo");
    expect(texto).toContain("- 2026-10-23 18:00 · puntual · 8 funciones · Temporada: Hamlet");
    expect(texto).toContain("## Sin hora (77; 1 ejemplos)");
    expect(texto).toContain("- «Fantasmitas» · https://cartelera.cdmx.gob.mx/40980/22-10-2026/fantasmitas\n  > Se utilizará pintura.");
    expect(texto).toContain("## Recintos (3: 2 cruzan con el directorio, 1 no)");
    // Todos los que cruzan, con el lugar, la distancia y por qué.
    expect(texto).toContain("Cruzan (2): recinto de la cartelera → lugar del directorio · distancia · por qué");
    expect(texto).toContain("- Colegio de San Ildefonso → «Antiguo Colegio de San Ildefonso» · 70 m · nombre parecido");
    expect(texto).toContain("- Palacio de Bellas Artes → «Palacio de Bellas Artes» · 4 m · el mismo nombre");
    // Las que no se propusieron por otra ficha o sin guardarse: qué es y cuáles, con su enlace.
    expect(texto).toContain("## Sumadas a otra ficha (1)");
    expect(texto).toContain("- «Taller de títeres» · https://cartelera.cdmx.gob.mx/16/30-10-2026/taller-de-titeres → se sumó a «Taller de títeres»");
    expect(texto).toContain("## No guardadas (1)");
    expect(texto).toContain("- «Concierto» · https://cartelera.cdmx.gob.mx/7/24-10-2026/concierto");
    expect(texto).toContain("- Colegio de San Ildefonso: cruza con «Antiguo Colegio de San Ildefonso»");
    expect(texto).toContain("- Museo de la Ciudad de México: NO cruza (lo más cercano: «Templo Mayor» a 420 m)");
    expect(texto).toContain("- Palacio de Bellas Artes: cruza con «Palacio de Bellas Artes»");
    // Si no cuadra, lo dice.
    expect(lineasDeInforme({ simular: false, ciudad: "x", corrida: "c", minutos: 1, resumen: { cartelera: { leidas: 5, propuestos: 3, motivos: { pasado: 1 } } }, escritas: { eventos: 3, lugares: 0 }, muestra: [], sinHora: [], recintos: [], noPropuestas: [] }).join("\n")).toContain("(NO CUADRA)");
  });
});
