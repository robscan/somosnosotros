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

  it("el informe dice cuántos, por qué no y por tipo, sin datos de personas", () => {
    const lineas = lineasDeInforme({
      simular: true,
      ciudad: "Ciudad de México",
      corrida: null,
      minutos: 31,
      resumen: {
        descartados: { ya_existe: 3, ya_propuesto: 2, unido: 1, fuera_de_la_ciudad: 40, sin_hora: 5 },
        sesiones: 12,
        cartelera: { eventos: 906, leidas: 610, fallidas: 2, propuestos: 380, recintos_nuevos: 41, por_tipo: { "Cursos y Talleres": { leidos: 100, propuestos: 60 }, "Museos y Exposiciones": { leidos: 300, propuestos: 200 } } },
        avisos: ["La cartelera pidió esperar: se sigue en el siguiente paso"],
      },
      muestra: [{ tipo: "taller", titulo: "Taller. Teatro popular y máscaras", cuando: "2026-10-23T18:00" }],
    });
    const texto = lineas.join("\n");
    expect(texto).toContain("simulación (no se escribió nada)");
    expect(texto).toContain("- Eventos listados en la cartelera: 906");
    expect(texto).toContain("- Fichas leídas: 610 (sin respuesta: 2)");
    expect(texto).toContain("- Eventos nuevos que se propondrían: 380");
    expect(texto).toContain("- Recintos nuevos que se propondrían como lugares: 41");
    expect(texto).toContain("- Duplicados (ya estaban, ya propuestos o la misma función): 6");
    expect(texto).toContain("- Fuera de la ciudad (lejos o en otra alcaldía): 40");
    // Por tipo, de más leídos a menos.
    expect(lineas.filter((l) => l.startsWith("| ") && !l.startsWith("| Tipo") && !l.startsWith("| ---"))).toEqual(["| Museos y Exposiciones | 300 | 200 |", "| Cursos y Talleres | 100 | 60 |"]);
    expect(texto).toContain("- 2026-10-23T18:00 · taller · Taller. Teatro popular y máscaras");
  });
});
