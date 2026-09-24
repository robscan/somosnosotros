// OL-179 (bitácora 214): «si lo marca como privado sí se guarda ... solo lo ve él» -cualquier cuenta con sesión
// puede marcar privado SU PROPIO lugar (antes, solo la administración). Prueba la migración
// `20260925120000_lugares_privados_de_todos.sql`: alta y edición con privado desde una cuenta normal, que nadie
// más lo lea ni lo encuentre por nombre, que anónimo tampoco, que administración sí, y que las funciones públicas
// (`lugares_parecidos`, `lugares_con_nombre`) sigan sin verlo -ya lo hacían desde `20260915110000_lugares_privados.sql`,
// esta migración no las toca-.
const ADMIN = "00000000-0000-4000-8000-000000000179";
const DUENA = "00000000-0000-4000-8000-000000000180";
const OTRA = "00000000-0000-4000-8000-000000000181";

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('admin-179@local.test')");
  await query(
    `insert into auth.users (id, email, email_confirmed_at) values
      ($1, 'admin-179@local.test', now()),
      ($2, 'duena-179@local.test', now()),
      ($3, 'otra-179@local.test', now())`,
    [ADMIN, DUENA, OTRA],
  );

  // 1. Una cuenta normal (no administración) crea un lugar privado y lo lee: antes lo rechazaba la política de alta.
  const alta = await as("authenticated", DUENA, () =>
    query(
      "insert into public.lugares (nombre, tipo, lat, lng, privado, creado_por) values ('Cochera de Lupe', 'otro', 22.15, -100.98, true, auth.uid()) returning id, privado",
    ),
  );
  check(alta.rowCount === 1 && alta.rows[0]?.privado === true, "una cuenta normal crea su propio lugar privado", alta.rows[0]);
  const lugarId = alta.rows[0]?.id;

  const propiaLectura = await as("authenticated", DUENA, () => query("select id from public.lugares where id = $1", [lugarId]));
  check(propiaLectura.rowCount === 1, "su autora lo lee de vuelta");

  // 2. Otra cuenta normal no lo lee ni lo encuentra por nombre.
  const otraLectura = await as("authenticated", OTRA, () => query("select id from public.lugares where id = $1", [lugarId]));
  check(otraLectura.rowCount === 0, "otra cuenta no lo lee por id");
  const otraBusqueda = await as("authenticated", OTRA, () => query("select id from public.lugares_con_nombre('Cochera de Lupe')"));
  check(otraBusqueda.rowCount === 0, "otra cuenta no lo encuentra con lugares_con_nombre");
  const otraParecidos = await as("authenticated", OTRA, () =>
    query("select id from public.lugares_parecidos('Cochera de Lupe', 22.15, -100.98)"),
  );
  check(otraParecidos.rowCount === 0, "otra cuenta no lo ve como parecido (lugares_parecidos)");

  // 3. Anónimo tampoco.
  const anonLectura = await as("anon", null, () => query("select id from public.lugares where id = $1", [lugarId]));
  check(anonLectura.rowCount === 0, "anónimo no lo lee");
  const anonBusqueda = await as("anon", null, () => query("select id from public.lugares_con_nombre('Cochera de Lupe')"));
  check(anonBusqueda.rowCount === 0, "anónimo no lo encuentra con lugares_con_nombre");

  // 4. La administración sí.
  const adminLectura = await as("authenticated", ADMIN, () => query("select id, privado from public.lugares where id = $1", [lugarId]));
  check(adminLectura.rowCount === 1 && adminLectura.rows[0]?.privado === true, "administración lo lee");

  // 5. La propia cuenta también puede marcar privado por UPDATE (no solo al crear): un lugar público suyo que
  // marca privado después, para reutilizarlo sin ficha.
  const publico = await as("authenticated", DUENA, () =>
    query("insert into public.lugares (nombre, tipo, lat, lng, creado_por) values ('Salón de Lupe', 'otro', 22.16, -100.99, auth.uid()) returning id"),
  );
  const publicoId = publico.rows[0]?.id;
  const marcarPrivado = await as("authenticated", DUENA, () => query("update public.lugares set privado = true where id = $1 returning privado", [publicoId]));
  check(marcarPrivado.rowCount === 1 && marcarPrivado.rows[0]?.privado === true, "su autora marca privado un lugar propio ya existente por UPDATE");

  // 6. Otra cuenta no puede marcar privado el lugar de alguien más (la política de UPDATE sigue exigiendo
  // creado_por = auth.uid() o es_admin(): esto no cambió, solo se quitó la condición extra sobre "privado").
  const otraIntentaPrivado = await as("authenticated", OTRA, () => query("update public.lugares set privado = true where id = $1 returning id", [publicoId]));
  check(otraIntentaPrivado.rowCount === 0, "otra cuenta no puede marcar privado un lugar ajeno");

  // 7. La administración puede marcar privado cualquier lugar (como antes).
  const adminMarcaPrivado = await as("authenticated", ADMIN, () => query("update public.lugares set privado = true where id = $1 returning privado", [publicoId]));
  check(adminMarcaPrivado.rowCount === 1 && adminMarcaPrivado.rows[0]?.privado === true, "administración marca privado cualquier lugar");

  // 8. Sesión requerida: anónimo no puede crear ni marcar privado nada (sin cambios respecto a antes).
  await as("anon", null, () =>
    expectError(
      () => query("insert into public.lugares (nombre, tipo, lat, lng, privado, creado_por) values ('Sin sesión', 'otro', 22.15, -100.98, true, $1)", [DUENA]),
      "42501",
      "anónimo no crea lugares (con o sin privado)",
    ),
  );
}
