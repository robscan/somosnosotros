// Pincel en la app, Fase 1 (OL-088, bitácora 123): RLS de obras_colectivas y los dos índices únicos parciales
// ("una sola obra abierta por lugar, y una sola por evento", founder 2026-09-19), más los índices de sus claves
// foráneas (Security Advisor).

const ADMIN = "00000000-0000-4000-8000-0000000000f1";
const OTRA = "00000000-0000-4000-8000-0000000000f2";

const FK_INDEXES = [
  ["obras_colectivas", "lugar_id", "obras_colectivas_lugar_id_idx"],
  ["obras_colectivas", "evento_id", "obras_colectivas_evento_id_idx"],
  ["obras_colectivas", "creado_por", "obras_colectivas_creado_por_idx"],
];

async function crearLugar(as, query, autor) {
  const r = await as("authenticated", autor, () =>
    query("insert into public.lugares (nombre, tipo, lat, lng, creado_por) values ('Lugar de pruebas Pincel', 'foro', 22.15, -100.98, auth.uid()) returning id"),
  );
  return r.rows[0].id;
}

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('pincel-admin@local.test')");
  await query(
    `insert into auth.users (id, email, email_confirmed_at) values ($1, 'pincel-admin@local.test', now()), ($2, 'pincel-otra@local.test', now())`,
    [ADMIN, OTRA],
  );

  // ---------- índices de las claves foráneas (Security Advisor) ----------
  for (const [tabla, columna, indice] of FK_INDEXES) {
    const { rows } = await query(
      `select ix.relname as indice, a.attname as columna
       from pg_index i
       join pg_class t on t.oid = i.indrelid
       join pg_class ix on ix.oid = i.indexrelid
       join pg_attribute a on a.attrelid = t.oid and a.attnum = i.indkey[0]
       where t.relname = $1 and ix.relname = $2`,
      [tabla, indice],
    );
    check(rows.length === 1 && rows[0].columna === columna, `${tabla}.${columna}: índice ${indice} existe y empieza por esa columna`, rows[0]);
  }

  const lugarUno = await crearLugar(as, query, OTRA);
  const lugarDos = await crearLugar(as, query, OTRA);
  check(lugarUno !== lugarDos, "los dos lugares de prueba son distintos");

  // ---------- RLS: alta ----------
  await as("anon", null, () =>
    expectError(
      () => query("insert into public.obras_colectivas (nombre, lugar_id, cierra_en, creado_por) values ('Sin sesión', $1, now() + interval '2 hours', $2)", [lugarUno, ADMIN]),
      "42501",
      "anon no crea una obra colectiva",
    ),
  );
  await as("authenticated", OTRA, () =>
    expectError(
      () => query("insert into public.obras_colectivas (nombre, lugar_id, cierra_en, creado_por) values ('Cuenta normal', $1, now() + interval '2 hours', auth.uid())", [lugarUno]),
      "42501",
      "una cuenta que no es admin no crea una obra colectiva",
    ),
  );

  const obraUno = await as("authenticated", ADMIN, () =>
    query("insert into public.obras_colectivas (nombre, lugar_id, cierra_en, creado_por) values ('Pincel en el lugar uno', $1, now() + interval '2 hours', auth.uid()) returning id, zona", [lugarUno]),
  );
  const obraUnoId = obraUno.rows[0]?.id;
  check(Boolean(obraUnoId), "administración crea una obra colectiva");
  check(obraUno.rows[0]?.zona === "America/Mexico_City", "la zona la puso sola el disparador, desde el lugar", obraUno.rows[0]);

  // ---------- una sola obra abierta por lugar ----------
  await as("authenticated", ADMIN, () =>
    expectError(
      () => query("insert into public.obras_colectivas (nombre, lugar_id, cierra_en, creado_por) values ('Segunda en el mismo lugar', $1, now() + interval '2 hours', auth.uid())", [lugarUno]),
      "23505",
      "no se puede abrir una segunda obra en un lugar que ya tiene una abierta",
    ),
  );
  const obraDos = await as("authenticated", ADMIN, () =>
    query("insert into public.obras_colectivas (nombre, lugar_id, cierra_en, creado_por) values ('Pincel en el lugar dos', $1, now() + interval '2 hours', auth.uid()) returning id", [lugarDos]),
  );
  const obraDosId = obraDos.rows[0]?.id;
  check(Boolean(obraDosId), "un lugar distinto sí admite su propia obra abierta a la vez");

  // ---------- una sola obra abierta por evento (aunque el lugar no coincida, cinturón extra) ----------
  const evento = await as("authenticated", OTRA, () =>
    query("insert into public.eventos (lugar_id, titulo, inicio, creado_por) values ($1, 'Evento con Pincel', now() + interval '1 day', auth.uid()) returning id", [lugarUno]),
  );
  const eventoId = evento.rows[0]?.id;
  check(Boolean(eventoId), "se publica un evento de prueba");
  // El lugar del evento (lugarUno) ya tiene su obra abierta (obraUno), así que primero se cierra para aislar la
  // prueba del índice de evento_id y no confundirla con la de lugar_id.
  await as("authenticated", ADMIN, () => query("update public.obras_colectivas set estado = 'cerrada', cerrado_en = now() where id = $1", [obraUnoId]));
  const obraEvento = await as("authenticated", ADMIN, () =>
    query("insert into public.obras_colectivas (nombre, lugar_id, evento_id, cierra_en, creado_por) values ('Pincel del evento', $1, $2, now() + interval '2 hours', auth.uid()) returning id", [lugarUno, eventoId]),
  );
  check(Boolean(obraEvento.rows[0]?.id), "una obra ligada a un evento se crea");
  await as("authenticated", ADMIN, () =>
    expectError(
      // Mismo evento_id, otro lugar (lugarDos ya tiene su propia obra abierta, pero eso no es lo que se prueba aquí:
      // se prueba el índice de evento_id en sí, con lugar_id deliberadamente distinto).
      () => query("insert into public.obras_colectivas (nombre, lugar_id, evento_id, cierra_en, creado_por) values ('Duplicado del mismo evento', $1, $2, now() + interval '2 hours', auth.uid())", [lugarDos, eventoId]),
      "23505",
      "no se puede abrir una segunda obra para el mismo evento",
    ),
  );

  // ---------- RLS: terminar y reabrir ----------
  // `using (es_admin())` no depende de la fila: a quien no es admin la política simplemente no le da ninguna fila
  // que actualizar (0 filas, sin error), igual que "otra cuenta no edita el lugar ajeno" en rls.test.mjs.
  const intentoAjeno = await as("authenticated", OTRA, () => query("update public.obras_colectivas set estado = 'cerrada' where id = $1 returning id", [obraDosId]));
  check(intentoAjeno.rowCount === 0, "una cuenta que no es admin no termina una obra ajena");
  const terminada = await as("authenticated", ADMIN, () => query("update public.obras_colectivas set estado = 'cerrada', cerrado_en = now() where id = $1 returning estado", [obraDosId]));
  check(terminada.rows[0]?.estado === "cerrada", "administración termina la obra");
  const reabierta = await as("authenticated", ADMIN, () => query("update public.obras_colectivas set estado = 'abierta', cerrado_en = null where id = $1 returning estado", [obraDosId]));
  check(reabierta.rows[0]?.estado === "abierta", "administración reabre la obra");

  // Reabrir cuando ya hay otra obra abierta en el mismo lugar debe chocar con el mismo índice único: obraUno está
  // cerrada y su lugar (lugarUno) ya tiene una obra abierta (obraEvento); reabrirla debe fallar.
  await as("authenticated", ADMIN, () =>
    expectError(
      () => query("update public.obras_colectivas set estado = 'abierta', cerrado_en = null where id = $1", [obraUnoId]),
      "23505",
      "reabrir una obra no puede crear un segundo abierto en un lugar que ya tiene el suyo",
    ),
  );

  // ---------- lectura pública ----------
  const anonLee = await as("anon", null, () => query("select id, estado from public.obras_colectivas where id = $1", [obraDosId]));
  check(anonLee.rowCount === 1 && anonLee.rows[0].estado === "abierta", "anon lee una obra colectiva sin sesión");
}
