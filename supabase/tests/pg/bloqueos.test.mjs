// OL-203 (bitácora 232, guía 1.2 de App Store) · bloquear a una persona. Prueba la migración
// 20260925150000_bloqueos.sql: RLS de `bloqueos` (cada cuenta ve, crea y borra solo sus propias filas; no se
// puede bloquear a uno mismo), `bloqueado_por_mi()` (falso sin sesión y sin bloqueo, verdadero solo para quien
// bloqueó), y el filtro que de ahí sale sobre lo que la persona bloqueada publicó: sus eventos (`creado_por`) y
// sus novedades de artista (`publicado_por`) dejan de verse para quien bloqueó, siguen viéndose para cualquier
// otra cuenta, para la propia persona bloqueada y para la administración (que no pierde nada por un bloqueo,
// ni el suyo propio ni el de quien reporta).
const ADMIN = "00000000-0000-4000-8000-000000000203"; // administración
const ANA = "00000000-0000-4000-8000-000000000204"; // Ana, bloquea a Beto
const BETO = "00000000-0000-4000-8000-000000000205"; // Beto, publica el evento y la novedad bloqueados
const CARLA = "00000000-0000-4000-8000-000000000206"; // Carla, sin relación: sigue viendo todo

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('bloqueos-admin@local.test')");
  await query(
    `insert into auth.users (id, email, email_confirmed_at) values
      ($1, 'bloqueos-admin@local.test', now()),
      ($2, 'bloqueos-ana@local.test', now()),
      ($3, 'bloqueos-beto@local.test', now()),
      ($4, 'bloqueos-carla@local.test', now())`,
    [ADMIN, ANA, BETO, CARLA],
  );
  const artista = (await query("insert into public.artistas (nombre, creado_por) values ('Artista de Beto (OL-203)', $1) returning id", [BETO])).rows[0].id;
  const evento = (
    await query(
      "insert into public.eventos (titulo, inicio, sitio_texto, zona, creado_por) values ('Función de Beto (OL-203)', now() + interval '10 days', 'Sitio de prueba', 'America/Mexico_City', $1) returning id",
      [BETO],
    )
  ).rows[0].id;
  const novedad = (
    await query(
      "insert into public.novedades_artista (artista_id, url, proveedor, publicado_por) values ($1, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', $2) returning id",
      [artista, BETO],
    )
  ).rows[0].id;

  // ---------- bloqueado_por_mi(): falso antes de bloquear, sin sesión ----------
  const antesDeBloquear = await as("authenticated", ANA, () => query("select public.bloqueado_por_mi($1) as v", [BETO]));
  check(antesDeBloquear.rows[0].v === false, "bloqueado_por_mi: falso antes de bloquear");
  const sinSesion = await as("anon", null, () => query("select public.bloqueado_por_mi($1) as v", [BETO]));
  check(sinSesion.rows[0].v === false, "bloqueado_por_mi: falso sin sesión (nunca revienta por auth.uid() null)");

  // ---------- no se puede bloquear a uno mismo ----------
  await as("authenticated", ANA, () =>
    expectError(() => query("insert into public.bloqueos (quien, bloqueado) values ($1, $1)", [ANA]), "23514", "el check quien <> bloqueado rechaza bloquearse a uno mismo"),
  );

  // ---------- solo con sesión, y solo la propia fila (quien = auth.uid()) ----------
  await as("anon", null, () =>
    expectError(() => query("insert into public.bloqueos (quien, bloqueado) values ($1, $2)", [ANA, BETO]), "42501", "anónimo no bloquea"),
  );
  await as("authenticated", CARLA, () =>
    expectError(
      () => query("insert into public.bloqueos (quien, bloqueado) values ($1, $2)", [ANA, BETO]),
      "42501",
      "Carla no puede insertar una fila de bloqueo a nombre de Ana",
    ),
  );

  // ---------- Ana bloquea a Beto ----------
  const bloquea = await as("authenticated", ANA, () => query("insert into public.bloqueos (quien, bloqueado) values ($1, $2) returning quien, bloqueado", [ANA, BETO]));
  check(bloquea.rowCount === 1, "Ana bloquea a Beto");

  const despuesDeBloquear = await as("authenticated", ANA, () => query("select public.bloqueado_por_mi($1) as v", [BETO]));
  check(despuesDeBloquear.rows[0].v === true, "bloqueado_por_mi: verdadero para Ana sobre Beto");
  const desdeBeto = await as("authenticated", BETO, () => query("select public.bloqueado_por_mi($1) as v", [ANA]));
  check(desdeBeto.rows[0].v === false, "bloqueado_por_mi: no es recíproco (Beto no bloqueó a Ana)");

  // ---------- lectura de bloqueos: cada cuenta ve solo las suyas ----------
  const anaVeLaSuya = await as("authenticated", ANA, () => query("select bloqueado from public.bloqueos where quien = $1", [ANA]));
  check(anaVeLaSuya.rowCount === 1 && anaVeLaSuya.rows[0].bloqueado === BETO, "Ana ve su propia fila de bloqueo");
  const betoNoVeQuienLoBloqueo = await as("authenticated", BETO, () => query("select quien from public.bloqueos where bloqueado = $1", [BETO]));
  check(betoNoVeQuienLoBloqueo.rowCount === 0, "Beto no ve quién lo bloqueó (la política es solo quien = auth.uid())");

  // ---------- el filtro: el evento y la novedad de Beto dejan de verse para Ana, no para nadie más ----------
  const anaVeElEvento = await as("authenticated", ANA, () => query("select id from public.eventos where id = $1", [evento]));
  check(anaVeElEvento.rowCount === 0, "Ana ya no ve el evento de Beto");
  const anaVeLaNovedad = await as("authenticated", ANA, () => query("select id from public.novedades_artista where id = $1", [novedad]));
  check(anaVeLaNovedad.rowCount === 0, "Ana ya no ve la novedad de Beto");

  const carlaVeElEvento = await as("authenticated", CARLA, () => query("select id from public.eventos where id = $1", [evento]));
  check(carlaVeElEvento.rowCount === 1, "Carla, sin bloqueo, sigue viendo el evento");
  const carlaVeLaNovedad = await as("authenticated", CARLA, () => query("select id from public.novedades_artista where id = $1", [novedad]));
  check(carlaVeLaNovedad.rowCount === 1, "Carla, sin bloqueo, sigue viendo la novedad");

  const betoSeVeASiMismo = await as("authenticated", BETO, () => query("select id from public.eventos where id = $1", [evento]));
  check(betoSeVeASiMismo.rowCount === 1, "Beto sigue viendo su propio evento (el bloqueo es de quien bloquea, no de quien publicó)");

  const anonVeElEvento = await as("anon", null, () => query("select id from public.eventos where id = $1", [evento]));
  check(anonVeElEvento.rowCount === 1, "anónimo (sin sesión, sin bloqueos) sigue viendo el evento visible");

  // ---------- la administración no pierde nada, aunque bloquee o la bloqueen ----------
  const adminVeElEvento = await as("authenticated", ADMIN, () => query("select id from public.eventos where id = $1", [evento]));
  check(adminVeElEvento.rowCount === 1, "la administración ve el evento aunque otra cuenta haya bloqueado a su autor");
  await as("authenticated", ADMIN, () => query("insert into public.bloqueos (quien, bloqueado) values ($1, $2)", [ADMIN, BETO]));
  const adminSigueViendoTrasBloquear = await as("authenticated", ADMIN, () => query("select id from public.eventos where id = $1", [evento]));
  check(adminSigueViendoTrasBloquear.rowCount === 1, "la administración sigue viendo el evento aunque ella misma haya bloqueado al autor (para poder moderar)");
  await as("authenticated", ADMIN, () => query("delete from public.bloqueos where quien = $1 and bloqueado = $2", [ADMIN, BETO]));

  // ---------- desbloquear: solo la propia fila, y deja de filtrar ----------
  const betoIntentaDesbloquear = await as("authenticated", BETO, () => query("delete from public.bloqueos where quien = $1 and bloqueado = $2 returning quien", [ANA, BETO]));
  check(betoIntentaDesbloquear.rowCount === 0, "Beto no puede borrar el bloqueo de Ana (no es su fila)");
  const anaDesbloquea = await as("authenticated", ANA, () => query("delete from public.bloqueos where quien = $1 and bloqueado = $2 returning quien", [ANA, BETO]));
  check(anaDesbloquea.rowCount === 1, "Ana desbloquea a Beto");
  const anaVeElEventoTrasDesbloquear = await as("authenticated", ANA, () => query("select id from public.eventos where id = $1", [evento]));
  check(anaVeElEventoTrasDesbloquear.rowCount === 1, "tras desbloquear, Ana vuelve a ver el evento de Beto");

  // Deja limpio lo insertado en esta pieza.
  await query("delete from public.eventos where id = $1", [evento]);
  await query("delete from public.novedades_artista where id = $1", [novedad]);
  await query("delete from public.artistas where id = $1", [artista]);
}
