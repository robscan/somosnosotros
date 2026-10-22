import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * SOLO PARA LAS PRUEBAS del motor de rutinas (OL-428): una base en memoria con la forma del cliente de Supabase que usa el motor (`from`,
 * `select`, `insert`, `update`, `eq`, `in`, `is`, `gte`, `lte`, `order`, `limit`, `maybeSingle`), con los filtros sobre jsonb que usa
 * (`resumen->>turno`, `resumen->turno`). Cada operación se ejecuta entera de una vez, como en la base: dos llamadas «a la vez» se
 * intercalan entre operaciones, nunca dentro de una. Sin red. Las reglas por fila y el SQL real se prueban aparte (test:db y el ensayo
 * contra PostgreSQL de la bitácora 461).
 */

export type Fila = Record<string, unknown>;
export type Operacion = { tabla: string; op: "select" | "insert" | "update" | "upsert" | "delete" | "rpc"; valores?: unknown };
/** Las funciones de la base que una prueba simula (`eventos_parecidos`…): reciben los argumentos y las tablas. */
export type FuncionesFalsas = Record<string, (args: Record<string, unknown>, tablas: Record<string, Fila[]>) => unknown>;

function valor(fila: Fila, columna: string): unknown {
  const texto = columna.match(/^(\w+)->>(\w+)$/);
  if (texto) {
    const v = (fila[texto[1]] as Record<string, unknown> | null | undefined)?.[texto[2]];
    return v == null ? null : String(v);
  }
  const json = columna.match(/^(\w+)->(\w+)$/);
  if (json) return (fila[json[1]] as Record<string, unknown> | null | undefined)?.[json[2]] ?? null;
  return fila[columna];
}

/** Números como números; fechas ISO y textos como texto (como compara la base un `timestamptz` en el mismo formato). */
const comparar = (a: unknown, b: number | string): number =>
  typeof b === "number" ? Number(a) - b : a == null ? -1 : String(a) < b ? -1 : String(a) > b ? 1 : 0;

export function baseFalsa(tablas: Record<string, Fila[]>, funciones: FuncionesFalsas = {}) {
  const operaciones: Operacion[] = [];
  const fallas = new Set<string>();
  const antes: ((o: Operacion) => void)[] = [];

  class Consulta {
    op: Operacion["op"] = "select";
    filtros: ((f: Fila) => boolean)[] = [];
    orden: { columna: string; asc: boolean; nulosPrimero: boolean } | null = null;
    limite: number | null = null;
    desde = 0;
    valores: Fila | null = null;
    nuevas: Fila[] = [];
    conflicto = "id";
    devolver = false;
    uno = false;
    constructor(readonly tabla: string) {}
    select() {
      if (this.op !== "select") this.devolver = true;
      return this;
    }
    insert(filas: Fila | Fila[]) {
      this.op = "insert";
      this.nuevas = Array.isArray(filas) ? filas : [filas];
      return this;
    }
    update(valores: Fila) {
      this.op = "update";
      this.valores = valores;
      return this;
    }
    upsert(filas: Fila | Fila[], o: { onConflict?: string } = {}) {
      this.op = "upsert";
      this.nuevas = Array.isArray(filas) ? filas : [filas];
      this.conflicto = o.onConflict ?? "id";
      return this;
    }
    delete() {
      this.op = "delete";
      return this;
    }
    single() {
      this.uno = true;
      return this;
    }
    eq(c: string, v: unknown) {
      this.filtros.push((f) => valor(f, c) != null && String(valor(f, c)) === String(v));
      return this;
    }
    in(c: string, vs: unknown[]) {
      this.filtros.push((f) => vs.map(String).includes(String(valor(f, c))));
      return this;
    }
    is(c: string, v: null) {
      this.filtros.push((f) => (valor(f, c) ?? null) === v);
      return this;
    }
    gte(c: string, v: number | string) {
      this.filtros.push((f) => comparar(valor(f, c), v) >= 0);
      return this;
    }
    lte(c: string, v: number | string) {
      this.filtros.push((f) => comparar(valor(f, c), v) <= 0);
      return this;
    }
    order(columna: string, o: { ascending?: boolean; nullsFirst?: boolean } = {}) {
      this.orden = { columna, asc: o.ascending ?? true, nulosPrimero: o.nullsFirst ?? false };
      return this;
    }
    limit(n: number) {
      this.limite = n;
      return this;
    }
    /** Las filas de `desde` a `hasta`, ambas incluidas (como PostgREST; OL-440 lee de mil en mil). */
    range(desde: number, hasta: number) {
      this.desde = desde;
      this.limite = hasta - desde + 1;
      return this;
    }
    maybeSingle() {
      this.uno = true;
      return this;
    }
    then<A, B>(ok?: (r: { data: unknown; error: { message: string } | null }) => A, mal?: (e: unknown) => B) {
      return Promise.resolve()
        .then(() => this.ejecutar())
        .then(ok, mal);
    }
    ejecutar(): { data: unknown; error: { message: string } | null } {
      const o: Operacion = { tabla: this.tabla, op: this.op, valores: this.op === "insert" || this.op === "upsert" ? this.nuevas : (this.valores ?? undefined) };
      for (const h of antes) h(o);
      operaciones.push(o);
      if (fallas.has(`${this.tabla}:${this.op}`)) return { data: null, error: { message: "falla de prueba" } };
      const tabla = (tablas[this.tabla] ??= []);
      if (this.op === "insert") {
        const hechas = this.nuevas.map((f) => ({ id: randomUUID(), creado_en: new Date().toISOString(), ...structuredClone(f) }));
        tabla.push(...hechas);
        const datos = this.devolver ? structuredClone(hechas) : null;
        return { data: this.uno ? (datos?.[0] ?? null) : datos, error: null };
      }
      if (this.op === "upsert") {
        for (const f of this.nuevas) {
          const hay = tabla.find((x) => x[this.conflicto] === f[this.conflicto]);
          if (hay) Object.assign(hay, structuredClone(f));
          else tabla.push({ ...structuredClone(f) });
        }
        return { data: null, error: null };
      }
      let elegidas = tabla.filter((f) => this.filtros.every((p) => p(f)));
      if (this.op === "delete") {
        for (const f of elegidas) tabla.splice(tabla.indexOf(f), 1);
        return { data: null, error: null };
      }
      if (this.op === "update") {
        for (const f of elegidas) Object.assign(f, structuredClone(this.valores));
        return { data: this.devolver ? structuredClone(elegidas) : null, error: null };
      }
      if (this.orden) {
        const { columna, asc, nulosPrimero } = this.orden;
        elegidas = [...elegidas].sort((a, b) => {
          const x = valor(a, columna), y = valor(b, columna);
          if (x == null || y == null) return x == null && y == null ? 0 : (x == null) === nulosPrimero ? -1 : 1;
          return (String(x) < String(y) ? -1 : String(x) > String(y) ? 1 : 0) * (asc ? 1 : -1);
        });
      }
      if (this.desde || this.limite != null) elegidas = elegidas.slice(this.desde, this.limite != null ? this.desde + this.limite : undefined);
      const copia = structuredClone(elegidas);
      return { data: this.uno ? (copia[0] ?? null) : copia, error: null };
    }
  }

  const rpc = async (nombre: string, args: Record<string, unknown> = {}) => {
    const o: Operacion = { tabla: nombre, op: "rpc", valores: args };
    for (const h of antes) h(o);
    operaciones.push(o);
    if (fallas.has(`${nombre}:rpc`)) return { data: null, error: { message: "falla de prueba" } };
    const f = funciones[nombre];
    return f ? { data: structuredClone(f(args, tablas)), error: null } : { data: null, error: { message: `sin la función ${nombre}` } };
  };
  const db = { from: (tabla: string) => new Consulta(tabla), rpc } as unknown as SupabaseClient;
  return {
    db,
    tablas,
    operaciones,
    /** Hace fallar cada operación `op` sobre `tabla` (hasta `reparar`). */
    fallar: (tabla: string, op: Operacion["op"]) => void fallas.add(`${tabla}:${op}`),
    /** Una función de la base (`rpc`) que falla: `fallar(nombre, "rpc")`. */
    reparar: () => fallas.clear(),
    /** Corre algo justo antes de cada operación (para simular a otro que cambia la base a medio paso). */
    antesDe: (h: (o: Operacion) => void) => void antes.push(h),
  };
}
