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

  await as("authenticated", ADMIN, () =>
    expectError(
      () => query("insert into public.obras_colectivas (nombre, lugar_id, cierra_en, creado_por) values ('Con creado_por ajeno', $1, now() + interval '2 hours', $2)", [lugarUno, OTRA]),
      "42501",
      "un admin no puede insertar una obra con creado_por de otra persona",
    ),
  );

  const obraUno = await as("authenticated", ADMIN, () =>
    query("insert into public.obras_colectivas (nombre, lugar_id, cierra_en, creado_por) values ('Pincel en el lugar uno', $1, now() + interval '2 hours', auth.uid()) returning id, zona, tipo", [lugarUno]),
  );
  const obraUnoId = obraUno.rows[0]?.id;
  check(Boolean(obraUnoId), "administración crea una obra colectiva");
  check(obraUno.rows[0]?.zona === "America/Mexico_City", "la zona la puso sola el disparador, desde el lugar", obraUno.rows[0]);
  // "tipo" (doc rediseno/25, ajuste 1): Pincel es la primera obra colectiva; sin especificarlo, la fila queda
  // marcada "pincel" sola, para que el día que exista una segunda obra la columna ya distinga entre ambas.
  check(obraUno.rows[0]?.tipo === "pincel", "sin indicarlo, el tipo por defecto es 'pincel'", obraUno.rows[0]);

  // La zona la pone el disparador desde el lugar, aunque se mande otra explícita (mismo patrón que
  // eventos_zona_del_lugar): un lugar con su propia zona distinta de la de prueba por defecto lo prueba de verdad.
  const lugarMadrid = await as("authenticated", ADMIN, () =>
    query("insert into public.lugares (nombre, tipo, lat, lng, zona, creado_por) values ('Lugar en Madrid', 'foro', 40.4, -3.7, 'Europe/Madrid', auth.uid()) returning id"),
  );
  const lugarMadridId = lugarMadrid.rows[0].id;
  const obraConZonaDistinta = await as("authenticated", ADMIN, () =>
    query(
      "insert into public.obras_colectivas (nombre, lugar_id, zona, cierra_en, creado_por) values ('Pincel en Madrid', $1, 'America/Mexico_City', now() + interval '2 hours', auth.uid()) returning zona",
      [lugarMadridId],
    ),
  );
  check(obraConZonaDistinta.rows[0]?.zona === "Europe/Madrid", "el disparador sobrescribe la zona mandada con la del lugar", obraConZonaDistinta.rows[0]);

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
  const intentoAnon = await as("anon", null, () => query("update public.obras_colectivas set estado = 'cerrada' where id = $1 returning id", [obraDosId]));
  check(intentoAnon.rowCount === 0, "anon no termina una obra");
  const terminada = await as("authenticated", ADMIN, () => query("update public.obras_colectivas set estado = 'cerrada', cerrado_en = now() where id = $1 returning estado", [obraDosId]));
  check(terminada.rows[0]?.estado === "cerrada", "administración termina la obra");
  const reabreAjeno = await as("authenticated", OTRA, () => query("update public.obras_colectivas set estado = 'abierta', cerrado_en = null where id = $1 returning id", [obraDosId]));
  check(reabreAjeno.rowCount === 0, "una cuenta que no es admin no reabre una obra ajena");
  const reabierta = await as("authenticated", ADMIN, () => query("update public.obras_colectivas set estado = 'abierta', cerrado_en = null where id = $1 returning estado", [obraDosId]));
  check(reabierta.rows[0]?.estado === "abierta", "administración reabre la obra");

  // ---------- nadie borra, tampoco un admin (sin policy for delete) ----------
  const borraAdmin = await as("authenticated", ADMIN, () => query("delete from public.obras_colectivas where id = $1 returning id", [obraDosId]));
  check(borraAdmin.rowCount === 0, "ni un admin borra una obra: cerrarla basta, sin policy for delete");
  const borraAnon = await as("anon", null, () => query("delete from public.obras_colectivas where id = $1 returning id", [obraDosId]));
  check(borraAnon.rowCount === 0, "anon tampoco borra una obra");

  // Reabrir cuando ya hay otra obra abierta en el mismo lugar debe chocar con el mismo índice único: obraUno está
  // cerrada y su lugar (lugarUno) ya tiene una obra abierta (obraEvento); reabrirla debe fallar.
  await as("authenticated", ADMIN, () =>
    expectError(
      () => query("update public.obras_colectivas set estado = 'abierta', cerrado_en = null where id = $1", [obraUnoId]),
      "23505",
      "reabrir una obra no puede crear un segundo abierto en un lugar que ya tiene el suyo",
    ),
  );

  // ---------- lectura: sigue la visibilidad de lo que enlaza (gestión de cambios, revisión 2026-09-21) ----------
  const anonLee = await as("anon", null, () => query("select id, estado from public.obras_colectivas where id = $1", [obraDosId]));
  check(anonLee.rowCount === 1 && anonLee.rows[0].estado === "abierta", "anon lee una obra colectiva de un lugar visible, sin sesión");

  // Lugar oculto: su obra no debe verse desde fuera, aunque esté abierta.
  const lugarOculto = await as("authenticated", ADMIN, () =>
    query("insert into public.lugares (nombre, tipo, lat, lng, visible, creado_por) values ('Lugar oculto de prueba', 'foro', 22.16, -100.97, false, auth.uid()) returning id"),
  );
  const lugarOcultoId = lugarOculto.rows[0].id;
  const obraLugarOculto = await as("authenticated", ADMIN, () =>
    query("insert into public.obras_colectivas (nombre, lugar_id, cierra_en, creado_por) values ('Pincel en lugar oculto', $1, now() + interval '2 hours', auth.uid()) returning id", [lugarOcultoId]),
  );
  const obraLugarOcultoId = obraLugarOculto.rows[0].id;
  const anonNoVeLugarOculto = await as("anon", null, () => query("select id from public.obras_colectivas where id = $1", [obraLugarOcultoId]));
  check(anonNoVeLugarOculto.rowCount === 0, "anon no ve la obra de un lugar oculto");
  const adminSiVeLugarOculto = await as("authenticated", ADMIN, () => query("select id from public.obras_colectivas where id = $1", [obraLugarOcultoId]));
  check(adminSiVeLugarOculto.rowCount === 1, "administración sí ve la obra de un lugar oculto");

  // Evento oculto (lugar visible): tampoco debe verse desde fuera.
  await as("authenticated", ADMIN, () => query("update public.eventos set visible = false where id = $1", [eventoId]));
  const anonNoVeEventoOculto = await as("anon", null, () => query("select id from public.obras_colectivas where id = $1", [obraEvento.rows[0].id]));
  check(anonNoVeEventoOculto.rowCount === 0, "anon no ve la obra de un evento oculto, aunque su lugar sea visible");
  const adminSiVeEventoOculto = await as("authenticated", ADMIN, () => query("select id from public.obras_colectivas where id = $1", [obraEvento.rows[0].id]));
  check(adminSiVeEventoOculto.rowCount === 1, "administración sí ve la obra de un evento oculto");
}
