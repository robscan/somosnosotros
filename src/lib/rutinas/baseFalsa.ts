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
export type Operacion = { tabla: string; op: "select" | "insert" | "update"; valores?: unknown };

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

export function baseFalsa(tablas: Record<string, Fila[]>) {
  const operaciones: Operacion[] = [];
  const fallas = new Set<string>();
  const antes: ((o: Operacion) => void)[] = [];

  class Consulta {
    op: Operacion["op"] = "select";
    filtros: ((f: Fila) => boolean)[] = [];
    orden: { columna: string; asc: boolean; nulosPrimero: boolean } | null = null;
    limite: number | null = null;
    valores: Fila | null = null;
    nuevas: Fila[] = [];
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
    gte(c: string, v: number) {
      this.filtros.push((f) => Number(valor(f, c)) >= v);
      return this;
    }
    lte(c: string, v: number) {
      this.filtros.push((f) => Number(valor(f, c)) <= v);
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
      const o: Operacion = { tabla: this.tabla, op: this.op, valores: this.op === "insert" ? this.nuevas : (this.valores ?? undefined) };
      for (const h of antes) h(o);
      operaciones.push(o);
      if (fallas.has(`${this.tabla}:${this.op}`)) return { data: null, error: { message: "falla de prueba" } };
      const tabla = (tablas[this.tabla] ??= []);
      if (this.op === "insert") {
        const hechas = this.nuevas.map((f) => ({ id: randomUUID(), creado_en: new Date().toISOString(), ...structuredClone(f) }));
        tabla.push(...hechas);
        return { data: this.devolver ? structuredClone(hechas) : null, error: null };
      }
      let elegidas = tabla.filter((f) => this.filtros.every((p) => p(f)));
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
      if (this.limite != null) elegidas = elegidas.slice(0, this.limite);
      const copia = structuredClone(elegidas);
      return { data: this.uno ? (copia[0] ?? null) : copia, error: null };
    }
  }

  const db = { from: (tabla: string) => new Consulta(tabla) } as unknown as SupabaseClient;
  return {
    db,
    tablas,
    operaciones,
    /** Hace fallar cada operación `op` sobre `tabla` (hasta `reparar`). */
    fallar: (tabla: string, op: Operacion["op"]) => void fallas.add(`${tabla}:${op}`),
    reparar: () => fallas.clear(),
    /** Corre algo justo antes de cada operación (para simular a otro que cambia la base a medio paso). */
    antesDe: (h: (o: Operacion) => void) => void antes.push(h),
  };
}
