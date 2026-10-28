import { randomUUID } from "node:crypto";

/**
 * OL-461 (bitácora 493, migración 20261027120000): el espejo a Facebook y la marca de origen de las vistas. Lo publicado en Facebook solo lo ve
 * y anota la administración, solo espeja lo que salió en Instagram (con su evento y su formato, que pone la base), y no se cambia; las vistas
 * guardan de qué red llegaron (instagram | facebook, post | story) sin datos personales, con la misma regla para contar que OL-459.
 */
const ADMIN = randomUUID();
const OTRA = randomUUID();
const AUTOR = randomUUID();
const hora = (h) => `now() + interval '${h} hours'`;

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('fb-admin@local.test')");
  await query("insert into auth.users (id, email) values ($1, 'fb-admin@local.test'), ($2, 'fb-otra@local.test'), ($3, 'fb-autor@local.test')", [ADMIN, OTRA, AUTOR]);
  const L = (await query("insert into public.lugares (nombre, tipo, lat, lng, ciudad) values ('Foro FB OL-461', 'foro', 22.15, -100.97, 'Ciudad FB Prueba') returning id")).rows[0].id;
  const evento = async (titulo, inicioSql, finSql) =>
    (await query(`insert into public.eventos (lugar_id, titulo, inicio, fin, ciudad, creado_por) values ($1, $2, ${inicioSql}, ${finSql}, 'Ciudad FB Prueba', $3) returning id`, [L, titulo, AUTOR])).rows[0].id;
  const manana = await evento("FB mañana", hora(24), hora(26));
  const otro = await evento("FB pasado mañana", hora(48), hora(50));
  const pasado = await evento("FB ya pasó", hora(-30), hora(-28));

  // Lo publicado en Instagram: una publicación y un error.
  const ig = await as("authenticated", ADMIN, async () => (await query("insert into public.instagram_publicaciones (evento_id, formato, estado, media_id, permalink) values ($1, '9x16', 'publicada', '17900000000000461', 'https://www.instagram.com/p/FB461/') returning id", [manana])).rows[0].id);
  const igError = await as("authenticated", ADMIN, async () => (await query("insert into public.instagram_publicaciones (evento_id, formato, estado, error) values ($1, '4x5', 'error', 'otro') returning id", [manana])).rows[0].id);

  // --- Lo publicado en Facebook: la administración anota; quién, cuándo, el evento y el formato los pone la base.
  const fb = await as("authenticated", ADMIN, async () =>
    (await query("insert into public.facebook_publicaciones (instagram_id, evento_id, formato, estado, post_id, permalink, publicado_por, creado_en) values ($1, $2, '4x5', 'publicada', '1374817622385572_122100000000000461', 'https://www.facebook.com/1374817622385572/posts/122100000000000461', $3, '2000-01-01') returning publicado_por, creado_en, evento_id, formato", [ig, otro, OTRA])).rows[0]);
  check(fb.publicado_por === ADMIN && new Date(fb.creado_en).getFullYear() > 2000, "la publicación de Facebook queda a nombre de la sesión y con la hora de la base", fb);
  check(fb.evento_id === manana && fb.formato === "9x16", "el evento y el formato son los de la publicación de Instagram que espeja", fb);
  await as("authenticated", ADMIN, () => query("insert into public.facebook_publicaciones (instagram_id, evento_id, formato, estado, error) values ($1, $2, '9x16', 'error', 'permiso')", [ig, manana]));
  const errores = await as("authenticated", ADMIN, async () => (await query("select estado, error from public.facebook_publicaciones where instagram_id = $1 order by creado_en", [ig])).rows);
  check(errores.length === 2 && errores[1].error === "permiso", "un reintento es otra fila: lo publicado y el error de permiso", errores);
  await as("authenticated", ADMIN, () => expectError(() => query("insert into public.facebook_publicaciones (instagram_id, evento_id, formato, estado, error) values ($1, $2, '4x5', 'error', 'otro')", [igError, manana]), "42501", "no se espeja lo que no salió en Instagram"));
  const malo = (sql, valores, etiqueta, codigo = "23514") => as("authenticated", ADMIN, () => expectError(() => query(sql, valores), codigo, etiqueta));
  await malo("insert into public.facebook_publicaciones (instagram_id, evento_id, formato, estado) values ($1, $2, '9x16', 'publicada')", [ig, manana], "publicada sin id de Facebook no entra");
  await malo("insert into public.facebook_publicaciones (instagram_id, evento_id, formato, estado, error, post_id) values ($1, $2, '9x16', 'error', 'otro', '1_2')", [ig, manana], "un error no lleva id de Facebook");
  await malo("insert into public.facebook_publicaciones (instagram_id, evento_id, formato, estado, error) values ($1, $2, '9x16', 'error', 'cupo')", [ig, manana], "Facebook no tiene la clave de cupo");
  await malo("insert into public.facebook_publicaciones (instagram_id, evento_id, formato, estado, post_id, permalink) values ($1, $2, '9x16', 'publicada', '1_2', 'https://otro.example/p/1')", [ig, manana], "un enlace que no es de Facebook no entra");
  const veOtra = await as("authenticated", OTRA, async () => (await query("select count(*)::int as n from public.facebook_publicaciones")).rows[0].n);
  check(veOtra === 0, "una cuenta cualquiera no ve lo publicado en Facebook", veOtra);
  await as("authenticated", OTRA, () => expectError(() => query("insert into public.facebook_publicaciones (instagram_id, evento_id, formato, estado, error) values ($1, $2, '9x16', 'error', 'otro')", [ig, manana]), "42501", "una cuenta cualquiera no anota en Facebook"));
  const cambio = await as("authenticated", ADMIN, async () => {
    try {
      return (await query("update public.facebook_publicaciones set estado = 'error' returning id")).rowCount;
    } catch (e) {
      return e.code;
    }
  });
  check(cambio === "42501", "lo publicado en Facebook no se cambia", cambio);
  const borro = await as("authenticated", ADMIN, async () => {
    try {
      return (await query("delete from public.facebook_publicaciones returning id")).rowCount;
    } catch (e) {
      return e.code;
    }
  });
  check(borro === "42501", "lo publicado en Facebook no se borra", borro);
  await as("anon", null, () => expectError(() => query("select count(*) from public.facebook_publicaciones"), "42501", "un visitante no lee lo publicado en Facebook"));
  await as("authenticated", OTRA, () => expectError(() => query("select public.facebook_publicaciones_registro()"), "42501", "el disparador no se llama desde fuera"));

  // --- Las vistas con su origen: la misma regla que OL-459; sin datos personales.
  const vista = (ev, visitante, origen, medio, usuario = null) =>
    as("service_role", null, async () => (await query("select public.contar_vista_evento_origen($1, $2, $3, $4, $5) as conto", [ev, visitante, usuario, origen, medio])).rows[0].conto);
  const fila = async (ev) => (await query("select origen, medio from public.vistas_evento where evento_id = $1 order by origen nulls first, medio", [ev])).rows;
  check((await vista(manana, "visitante-ol461-0001", "facebook", "post")) === true, "una vista desde Facebook cuenta");
  check((await vista(manana, "visitante-ol461-0002", "instagram", "story")) === true, "una vista desde una historia de Instagram cuenta");
  check((await vista(manana, "visitante-ol461-0003", null, null)) === true, "una vista sin origen cuenta igual");
  check((await vista(manana, "visitante-ol461-0001", "facebook", "post")) === false, "la misma persona el mismo día no cuenta dos veces");
  const t = await fila(manana);
  check(JSON.stringify(t) === JSON.stringify([{ origen: null, medio: null }, { origen: "facebook", medio: "post" }, { origen: "instagram", medio: "story" }]), "guarda la red y el medio de cada vista", t);
  // Llegó primero sin origen y luego por Facebook: no cuenta otra vez, pero se anota de dónde; uno que ya tenía origen no se cambia.
  check((await vista(manana, "visitante-ol461-0003", "facebook", "story")) === false, "volver por un enlace de Facebook no cuenta otra vista");
  check((await vista(manana, "visitante-ol461-0002", "facebook", "post")) === false, "volver por otra red tampoco");
  const t2 = await fila(manana);
  check(JSON.stringify(t2) === JSON.stringify([{ origen: "facebook", medio: "post" }, { origen: "facebook", medio: "story" }, { origen: "instagram", medio: "story" }]), "el origen se pone si faltaba y no se cambia si ya estaba", t2);
  check((await vista(otro, "visitante-ol461-0004", "tiktok", "post")) === true, "una red que no es nuestra cuenta como vista sin origen");
  check((await vista(otro, "visitante-ol461-0005", "facebook", "reel")) === true, "un medio que no es post ni story cuenta, sin medio");
  const t3 = await fila(otro);
  check(JSON.stringify(t3) === JSON.stringify([{ origen: null, medio: null }, { origen: "facebook", medio: null }]), "lo desconocido no se guarda", t3);
  check((await vista(pasado, "visitante-ol461-0006", "facebook", "post")) === false, "un evento que ya pasó no cuenta vistas");
  check((await vista(otro, "visitante-ol461-0007", "facebook", "post", AUTOR)) === false && (await vista(otro, "visitante-ol461-0008", "facebook", "post", ADMIN)) === false, "ni quien lo publicó ni la administración cuentan");
  check((await vista(otro, "corto", "facebook", "post")) === false, "un visitante inválido no cuenta");
  await expectError(() => query("insert into public.vistas_evento (evento_id, dia, clave, origen) values ($1, current_date, repeat('a', 64), 'twitter')", [otro]), "23514", "solo instagram o facebook");
  await expectError(() => query("insert into public.vistas_evento (evento_id, dia, clave, medio) values ($1, current_date, repeat('b', 64), 'post')", [otro]), "23514", "un medio sin red no entra");
  for (const [rol, sujeto] of [["anon", null], ["authenticated", OTRA], ["authenticated", ADMIN]]) {
    await as(rol, sujeto, () => expectError(() => query("select public.contar_vista_evento_origen($1, 'visitante-ol461-0009', null, 'facebook', 'post')", [otro]), "42501", `${rol}: solo el servidor cuenta vistas`));
  }

  // --- Cuántas por red: solo la administración.
  const porRed = await as("authenticated", ADMIN, async () => (await query("select * from public.vistas_por_origen(30) where origen is not null")).rows);
  const de = (o, m) => porRed.filter((r) => r.origen === o && r.medio === m).reduce((n, r) => n + r.vistas, 0);
  check(de("facebook", "post") >= 1 && de("facebook", "story") >= 1 && de("instagram", "story") >= 1, "la administración ve las vistas por red y medio", porRed);
  const deOtra = await as("authenticated", OTRA, async () => (await query("select count(*)::int as n from public.vistas_por_origen(30)")).rows[0].n);
  check(deOtra === 0, "una cuenta cualquiera no ve las vistas por red", deOtra);
  await as("anon", null, () => expectError(() => query("select * from public.vistas_por_origen(30)"), "42501", "un visitante no llama las vistas por red"));
  const { rows: f } = await query(`select prosecdef, proconfig, not has_function_privilege('public', oid, 'execute') as sin_public from pg_proc where oid = 'public.contar_vista_evento_origen(uuid,text,uuid,text,text)'::regprocedure`);
  check(f[0]?.prosecdef && f[0].proconfig?.includes('search_path=""') && f[0].sin_public, "contar_vista_evento_origen: definer, search_path vacío, sin PUBLIC", f[0]);

  // Se limpia lo de esta prueba (los bancos comparten la base): borrar el lugar se lleva sus eventos, sus vistas y lo publicado.
  await query("delete from public.eventos where lugar_id = $1", [L]);
  await query("delete from public.lugares where id = $1", [L]);
}
