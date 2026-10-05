import { randomUUID } from "node:crypto";

/**
 * Tipo de lugar «Plaza, jardín o parque» (OL-287, migración 20261005120000): la lista cerrada de `lugares.tipo`
 * acepta `plaza`, sigue aceptando los tipos de antes y rechaza lo que no está en la lista.
 */
export async function run({ as, check, expectError, query }) {
  const user = randomUUID();
  const lugares = [];
  async function lugar(nombre, tipo) {
    const id = randomUUID();
    lugares.push(id);
    await query("insert into public.lugares(id, nombre, tipo, lat, lng, creado_por) values ($1, $2, $3, 22.15, -100.97, $4)", [id, nombre, tipo, user]);
    return id;
  }
  try {
    await query("insert into auth.users(id, email) values ($1, 'tipo-plaza@local.test')", [user]);

    const id = await as("authenticated", user, () => lugar("Jardín Botánico de prueba OL-287", "plaza"));
    const fila = (await query("select tipo from public.lugares where id = $1", [id])).rows[0];
    check(fila?.tipo === "plaza", "tipo plaza: se puede dar de alta", fila);

    // Los tipos de antes siguen valiendo (la lista solo creció).
    for (const tipo of ["casa_de_cultura", "museo", "foro", "galeria", "escuela", "colectivo", "biblioteca", "otro"]) {
      await as("authenticated", user, () => lugar(`Lugar ${tipo} OL-287`, tipo));
    }
    check(true, "tipos anteriores: los ocho siguen aceptados");

    // Fuera de la lista cerrada, no.
    await as("authenticated", user, () => expectError(() => lugar("Tipo inventado OL-287", "parque"), "23514", "tipo fuera de la lista (parque) rechazado"));

    // El check vigente incluye el valor nuevo.
    const def = (await query("select pg_get_constraintdef(oid) as d from pg_constraint where conname = 'lugares_tipo_check' and conrelid = 'public.lugares'::regclass")).rows[0];
    check(def?.d.includes("'plaza'") && def.d.includes("'otro'"), "lugares_tipo_check incluye plaza y otro", def);
  } finally {
    await query("delete from public.lugares where id = any($1::uuid[])", [lugares]);
    await query("delete from auth.users where id = any($1::uuid[])", [[user]]);
  }
}
