import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Candidato } from "@/lib/instagram/semana";
import { armarLasQueVienen, type FilaDia } from "./semana";

/**
 * OL-487 (bitácora 519): el latido de redes arma «la que viene» los miércoles entre las 9:00 y las 9:59 de la hora de la ciudad, con la misma
 * función que la pestaña (`armarLoQueFalta`) y a nombre de la administración (`instagram_semana_latido`). Con el reloj fijo y una base de mentira
 * que contesta lo que contestaría la de verdad (la regla de la base que despierta al latido se prueba en `supabase/tests/pg/semana-miercoles`).
 */
const ZONA = "America/Mexico_City";
const SLP = "san-luis-potosi";
const MIE_930 = new Date("2026-10-07T15:30:00Z"); // miércoles 7 de octubre, 9:30 en San Luis Potosí
const JUE_930 = new Date("2026-10-08T15:30:00Z"); // jueves 8, 9:30
const LUNES_VIENE = "2026-10-12";
const SEMANA_VIENE = ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"];

const cand = (id: string): Candidato => ({
  id, slug: id, nombre: `Ficha ${id}`, ciudad: "San Luis Potosí", ciudad_slug: SLP, clase: "musica", detalle: null, foto: "f", portada: "p", descripcion: "d",
  redes: [], direccion: null, proxima_id: null, proxima_titulo: null, proxima_inicio: null, proxima_zona: null, proxima_lugar: null, proxima_lugar_redes: [],
  eventos_semana: 0, ultima_vez: null, ocupado_en: null,
});
const fila = (ciudad: string, fecha: string): FilaDia => ({
  id: `${ciudad}-${fecha}`, ciudad, fecha, tipo: "descanso", artista_id: null, lugar_id: null, evento_id: null, eventos: null, hora: null, programado_para: null,
  estado: "descanso", elegido_por: "sistema", motivo: null, reemplaza: null, trabajo_id: null, aviso_en: null, dijo_no_en: null,
});

type Llamada = { fn: string; args: Record<string, unknown> };

/** Una base de mentira: `instagram_semana` en memoria, `ciudades` con su zona y las funciones que pide el latido. */
function baseFalsa(o: { porArmar: string[]; filas?: FilaDia[]; fallaGuardar?: string[]; fallaPorArmar?: boolean }) {
  const llamadas: Llamada[] = [];
  const filas = [...(o.filas ?? [])];
  const desde = (tabla: string) => {
    const filtros: ((r: Record<string, unknown>) => boolean)[] = [];
    const b = {
      select: () => b,
      eq: (k: string, v: unknown) => (filtros.push((r) => r[k] === v), b),
      gte: (k: string, v: string) => (filtros.push((r) => String(r[k]) >= v), b),
      lte: (k: string, v: string) => (filtros.push((r) => String(r[k]) <= v), b),
      order: () => b,
      limit: () => b,
      abortSignal: () => b,
      maybeSingle: async () => ({ data: tabla === "ciudades" ? { zona: ZONA } : null, error: null }),
      then: (ok: (x: unknown) => unknown, mal?: (e: unknown) => unknown) =>
        Promise.resolve({ data: tabla === "instagram_semana" ? filas.filter((r) => filtros.every((f) => f(r as unknown as Record<string, unknown>))) : [], error: null }).then(ok, mal),
    };
    return b;
  };
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    llamadas.push({ fn, args });
    if (fn === "instagram_semana_por_armar") {
      return o.fallaPorArmar ? { data: null, error: { message: "sin base" } } : { data: o.porArmar.map((ciudad) => ({ ciudad, zona: ZONA, lunes: LUNES_VIENE })), error: null };
    }
    if (fn === "instagram_semana_latido") {
      const p = args.p_args as Record<string, unknown>;
      if (args.p_funcion === "instagram_candidatos") return { data: [cand(`${p.p_tipo}-1`)], error: null };
      if (args.p_funcion === "instagram_sugerencias") return { data: [], error: null };
      if (args.p_funcion === "instagram_semana_guardar") {
        if (o.fallaGuardar?.includes(String(p.p_ciudad))) return { data: null, error: { code: "XX000", message: "se cayó" } };
        const casillas = p.p_casillas as { fecha: string }[];
        for (const c of casillas) filas.push(fila(String(p.p_ciudad), c.fecha));
        return { data: casillas.length, error: null };
      }
    }
    return { data: null, error: { message: `sin ${fn}` } };
  };
  return { db: { from: desde, rpc } as unknown as SupabaseClient, llamadas, filas };
}
const guardados = (l: Llamada[]) => l.filter((x) => x.fn === "instagram_semana_latido" && x.args.p_funcion === "instagram_semana_guardar");

describe("el latido arma la que viene los miércoles", () => {
  it("miércoles 9:30 en San Luis, sin armar: la arma (los siete días, a nombre de la administración)", async () => {
    const b = baseFalsa({ porArmar: [SLP] });
    const avisos: string[] = [];
    expect(await armarLasQueVienen(b.db, MIE_930, (t) => avisos.push(t))).toEqual([{ ciudad: SLP, resultado: "armada" }]);
    const g = guardados(b.llamadas);
    expect(g).toHaveLength(1);
    const p = g[0].args.p_args as { p_ciudad: string; p_casillas: { fecha: string }[] };
    expect(p.p_ciudad).toBe(SLP);
    expect(p.p_casillas.map((c) => c.fecha)).toEqual(SEMANA_VIENE);
    // Los candidatos de la semana que viene, por la misma función que la pestaña; nada a la base sin pasar por `instagram_semana_latido`.
    expect(b.llamadas.some((x) => x.fn === "instagram_semana_latido" && x.args.p_funcion === "instagram_candidatos" && (x.args.p_args as { p_desde: string }).p_desde === LUNES_VIENE)).toBe(true);
    expect(b.llamadas.every((x) => ["instagram_semana_por_armar", "instagram_semana_latido"].includes(x.fn))).toBe(true);
    expect(avisos).toEqual([]);
  });
  it("jueves 9:30: no la arma (aunque la base dijera lo contrario)", async () => {
    const b = baseFalsa({ porArmar: [SLP] });
    expect(await armarLasQueVienen(b.db, JUE_930, () => {})).toEqual([{ ciudad: SLP, resultado: "fuera de hora" }]);
    expect(guardados(b.llamadas)).toHaveLength(0);
  });
  it("miércoles 9:30 con la que viene ya armada (por la pestaña u otra vuelta del latido): no hace nada", async () => {
    const b = baseFalsa({ porArmar: [SLP], filas: SEMANA_VIENE.map((d) => fila(SLP, d)) });
    expect(await armarLasQueVienen(b.db, MIE_930, () => {})).toEqual([{ ciudad: SLP, resultado: "ya estaba" }]);
    expect(guardados(b.llamadas)).toHaveLength(0);
    expect(b.llamadas.some((x) => x.args.p_funcion === "instagram_candidatos")).toBe(false);
  });
  it("dos vueltas seguidas del latido: la segunda ya no guarda", async () => {
    const b = baseFalsa({ porArmar: [SLP] });
    await armarLasQueVienen(b.db, MIE_930, () => {});
    expect(await armarLasQueVienen(b.db, new Date("2026-10-07T15:31:00Z"), () => {})).toEqual([{ ciudad: SLP, resultado: "ya estaba" }]);
    expect(guardados(b.llamadas)).toHaveLength(1);
    expect(b.filas.filter((f) => f.ciudad === SLP)).toHaveLength(7);
  });
  it("si una ciudad falla, lo anota sin secretos ni datos de personas y sigue con la siguiente; nunca lanza", async () => {
    const b = baseFalsa({ porArmar: ["oaxaca", SLP], fallaGuardar: ["oaxaca"] });
    const avisos: string[] = [];
    expect(await armarLasQueVienen(b.db, MIE_930, (t) => avisos.push(t))).toEqual([
      { ciudad: "oaxaca", resultado: "error" },
      { ciudad: SLP, resultado: "armada" },
    ]);
    expect(avisos).toEqual(["redes: no se pudo armar la semana que viene de Instagram de oaxaca; lo reintenta el latido"]);
  });
  it("si la base no dice qué falta, lo anota y no arma nada", async () => {
    const b = baseFalsa({ porArmar: [SLP], fallaPorArmar: true });
    const avisos: string[] = [];
    expect(await armarLasQueVienen(b.db, MIE_930, (t) => avisos.push(t))).toEqual([]);
    expect(avisos).toHaveLength(1);
    expect(guardados(b.llamadas)).toHaveLength(0);
  });
});
