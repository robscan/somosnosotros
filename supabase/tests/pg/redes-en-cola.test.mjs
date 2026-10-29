import { randomUUID } from "node:crypto";

/**
 * OL-465 (bitácora 497, migración 20261028140000): publicar en redes en segundo plano. La cola (`redes_trabajos`) solo la lee la administración y
 * nadie la escribe desde la app salvo `redes_encolar`, que no guarda dos veces el mismo evento con el mismo formato mientras está en camino o si
 * salió hace menos de 15 minutos (salvo que se pida repetir), ni con dos toques a la vez. El latido de la cola llama a /api/redes/correr solo si
 * hay trabajos listos. Y `cartel_lecturas`: cada quien ve las suyas y solo el servidor escribe.
 */
const ADMIN = randomUUID();
const OTRA = randomUUID();
const AUTOR = randomUUID();

export async function run({ as, check, expectError, query, connection }) {
  await query("insert into public.admin_correos (correo) values ('redes-admin@local.test')");
  await query("insert into auth.users (id, email) values ($1, 'redes-admin@local.test'), ($2, 'redes-otra@local.test'), ($3, 'redes-autor@local.test')", [ADMIN, OTRA, AUTOR]);
  const L = (await query("insert into public.lugares (nombre, tipo, lat, lng, ciudad) values ('Foro Redes OL-465', 'foro', 22.15, -100.97, 'Ciudad Redes Prueba') returning id")).rows[0].id;
  const evento = async (titulo) =>
    (await query("insert into public.eventos (lugar_id, titulo, inicio, fin, ciudad, creado_por) values ($1, $2, now() + interval '2 days', now() + interval '2 days 2 hours', 'Ciudad Redes Prueba', $3) returning id", [L, titulo, AUTOR])).rows[0].id;
  const A = await evento("Redes A");
  const B = await evento("Redes B");
  const C = await evento("Redes C");
  const encolar = (sujeto, ev, red, formato, pedido = {}, repetir = false) =>
    as("authenticated", sujeto, async () => (await query("select public.redes_encolar($1, $2, $3, $4, $5) as r", [ev, red, formato, JSON.stringify(pedido), repetir])).rows[0].r);
  const reciente = (ev, red, formato) => as("authenticated", ADMIN, async () => (await query("select public.redes_reciente($1, $2, $3) as r", [ev, red, formato])).rows[0].r);

  try {
    // --- Guardar: solo la administración; quién y cuándo los pone la base.
    const uno = await encolar(ADMIN, A, "instagram", "4x5", { facebook: true, texto: "Hola", quitadas: ["x"] });
    check(typeof uno.id === "string", "la administración guarda un trabajo en la cola", uno);
    const fila = (await query("select estado, pedido_por, red, formato, pedido, intentos, siguiente_en <= now() as listo from public.redes_trabajos where id = $1", [uno.id])).rows[0];
    check(fila.estado === "en_cola" && fila.pedido_por === ADMIN && fila.pedido.facebook === true && fila.intentos === 0 && fila.listo, "queda en cola, a nombre de quien la pidió, con lo decidido en la hoja", fila);
    await as("authenticated", OTRA, () => expectError(() => query("select public.redes_encolar($1, 'instagram', '4x5', '{}'::jsonb, false)", [B]), "42501", "una cuenta cualquiera no guarda trabajos"));
    await as("anon", null, () => expectError(() => query("select public.redes_encolar($1, 'instagram', '4x5', '{}'::jsonb, false)", [B]), "42501", "un visitante no guarda trabajos"));
    await as("authenticated", ADMIN, () => expectError(() => query("select public.redes_encolar($1, 'tiktok', '4x5', '{}'::jsonb, false)", [B]), "22023", "una red que no es nuestra no entra"));
    await as("authenticated", ADMIN, () => expectError(() => query("select public.redes_encolar($1, 'instagram', 'carrusel', '{}'::jsonb, false)", [B]), "22023", "el formato es 4x5 o 9x16 (un carrusel es 4x5)"));
    await as("authenticated", ADMIN, () => expectError(() => query("select public.redes_encolar($1, 'instagram', '4x5', '[]'::jsonb, false)", [B]), "22023", "el pedido es un objeto"));
    await as("authenticated", ADMIN, () => expectError(() => query("select public.redes_encolar($1, 'instagram', '4x5', '{}'::jsonb, false)", [randomUUID()]), "23503", "un evento que no existe no entra"));

    // --- Nadie escribe la cola directo desde la app; la administración solo lee.
    await as("authenticated", ADMIN, () => expectError(() => query("insert into public.redes_trabajos (evento_id, red, formato) values ($1, 'instagram', '4x5')", [B]), "42501", "la administración no inserta directo (solo por redes_encolar)"));
    const cambio = await as("authenticated", ADMIN, async () => {
      try {
        return (await query("update public.redes_trabajos set estado = 'publicado' returning id")).rowCount;
      } catch (e) {
        return e.code;
      }
    });
    check(cambio === "42501", "la administración no cambia un trabajo (solo el servidor)", cambio);
    const veAdmin = await as("authenticated", ADMIN, async () => (await query("select count(*)::int as n from public.redes_trabajos where evento_id = $1", [A])).rows[0].n);
    const veOtra = await as("authenticated", OTRA, async () => (await query("select count(*)::int as n from public.redes_trabajos")).rows[0].n);
    check(veAdmin === 1 && veOtra === 0, "la administración ve la cola; una cuenta cualquiera no", { veAdmin, veOtra });
    await as("anon", null, () => expectError(() => query("select count(*) from public.redes_trabajos"), "42501", "un visitante no lee la cola"));

    // --- Sin duplicados: en cola o publicándose, «Se está publicando».
    check(JSON.stringify(await reciente(A, "instagram", "4x5")) === JSON.stringify({ estado: "publicando" }), "en cola: «se está publicando»");
    const dos = await encolar(ADMIN, A, "instagram", "4x5");
    check(dos.duplicado?.estado === "publicando" && !dos.id, "el segundo toque no guarda otro: dice que se está publicando", dos);
    check((await reciente(A, "instagram", "9x16")) === null, "otro formato del mismo evento no es repetido");
    check((await reciente(A, "facebook", "4x5"))?.estado === "publicando", "Facebook: un trabajo de Instagram con «también en Facebook» cuenta");
    check((await reciente(B, "instagram", "4x5")) === null, "otro evento no es repetido");
    const repetido = await encolar(ADMIN, A, "instagram", "4x5", {}, true);
    check(typeof repetido.id === "string", "confirmando, se guarda otro", repetido);
    const deOtra = await as("authenticated", OTRA, async () => (await query("select public.redes_reciente($1, 'instagram', '4x5') as r", [A])).rows[0].r);
    check(deOtra === null, "a una cuenta cualquiera redes_reciente no le dice nada", deOtra);

    // --- Publicado hace menos de 15 minutos: «Ya se publicó hace N min»; un carrusel cuenta como 4:5.
    await query("update public.redes_trabajos set estado = 'publicado', terminado_en = now() where evento_id = $1", [A]);
    check((await reciente(A, "instagram", "4x5")) === null, "terminado y sin publicación en Instagram: ya no se está publicando");
    await as("authenticated", ADMIN, () => query("insert into public.instagram_publicaciones (evento_id, formato, imagenes, estado, media_id, permalink, carrusel) values ($1, 'carrusel', 2, 'publicada', '17900000000000465', 'https://www.instagram.com/p/R465/', '{https://a.test/1.jpg,https://a.test/2.jpg}')", [A]));
    const hace = await reciente(A, "instagram", "4x5");
    check(hace?.estado === "publicado" && hace.minutos === 0, "un carrusel de hace un momento: «ya se publicó hace 0 min»", hace);
    check((await encolar(ADMIN, A, "instagram", "4x5")).duplicado?.estado === "publicado", "y pide confirmar para repetir");
    await query("update public.instagram_publicaciones set creado_en = now() - interval '7 minutes' where evento_id = $1", [A]);
    check((await reciente(A, "instagram", "4x5"))?.minutos === 7, "dice cuántos minutos hace");
    await query("update public.instagram_publicaciones set creado_en = now() - interval '16 minutes' where evento_id = $1", [A]);
    check((await reciente(A, "instagram", "4x5")) === null, "después de 15 minutos ya no es repetido");
    // Facebook, igual, con lo publicado en la página.
    const ig = (await query("select id from public.instagram_publicaciones where evento_id = $1", [A])).rows[0].id;
    await as("authenticated", ADMIN, () => query("insert into public.facebook_publicaciones (instagram_id, evento_id, formato, estado, post_id) values ($1, $2, '4x5', 'publicada', '1_465')", [ig, A]));
    check((await reciente(A, "facebook", "4x5"))?.estado === "publicado", "Facebook: publicado hace un momento");
    check((await encolar(ADMIN, A, "facebook", "4x5")).duplicado?.estado === "publicado", "Facebook: pide confirmar para repetir");

    // --- Dos toques a la vez (dos conexiones): solo uno se guarda.
    const aLaVez = () =>
      connection(async (c) => {
        await c.query("begin");
        await c.query("set local role authenticated");
        await c.query("select set_config('request.jwt.claim.sub', $1, true)", [ADMIN]);
        const r = (await c.query("select public.redes_encolar($1, 'instagram', '9x16', '{}'::jsonb, false) as r", [C])).rows[0].r;
        // Se queda un momento con el candado, para que el otro toque llegue mientras.
        await c.query("select pg_sleep(0.3)");
        await c.query("commit");
        return r;
      });
    const [r1, r2] = await Promise.all([aLaVez(), aLaVez()]);
    const guardados = [r1, r2].filter((r) => r.id).length;
    const n = (await query("select count(*)::int as n from public.redes_trabajos where evento_id = $1 and formato = '9x16'", [C])).rows[0].n;
    check(guardados === 1 && n === 1 && [r1, r2].some((r) => r.duplicado?.estado === "publicando"), "dos toques a la vez guardan un solo trabajo", { r1, r2, n });

    // --- Los `check`.
    const malo = (sql, valores, etiqueta) => as("service_role", null, () => expectError(() => query(sql, valores), "23514", etiqueta));
    await malo("insert into public.redes_trabajos (evento_id, red, formato, estado) values ($1, 'instagram', '4x5', 'publicado')", [B], "publicado sin cuándo terminó no entra");
    await malo("insert into public.redes_trabajos (evento_id, red, formato, estado, terminado_en) values ($1, 'instagram', '4x5', 'fallido', now())", [B], "fallido sin su error no entra");
    await malo("insert into public.redes_trabajos (evento_id, red, formato, error) values ($1, 'instagram', '4x5', 'raro')", [B], "un error que no conocemos no entra");
    // El servidor (llave de servicio) reclama con el turno: el segundo que llega con el mismo turno no lo toma.
    const T = (await as("service_role", null, async () => (await query("insert into public.redes_trabajos (evento_id, red, formato, pedido_por) values ($1, 'instagram', '4x5', $2) returning id, pedido_por", [B, ADMIN])).rows[0]));
    check(T.pedido_por === ADMIN, "el servidor guarda a nombre de quien lo pidió", T);
    const reclamar = () => as("service_role", null, async () => (await query("update public.redes_trabajos set estado = 'publicando', turno = turno + 1, ocupada_hasta = now() + interval '5 minutes' where id = $1 and estado = 'en_cola' and turno = 0 returning id", [T.id])).rowCount);
    check((await reclamar()) === 1 && (await reclamar()) === 0, "el reclamo por turno: el segundo no lo toma");

    // --- El latido: sin trabajos listos no llama; con ellos, a /api/redes/correr con el secreto de Vault. Todo en una transacción que se deshace.
    for (const [rol, sujeto] of [["anon", null], ["authenticated", OTRA], ["authenticated", ADMIN], ["service_role", null]]) {
      await as(rol, sujeto, async () => {
        await expectError(() => query("select public.redes_latido()"), "42501", `${rol}${sujeto === ADMIN ? " (administración)" : ""}: no corre el latido de la cola`);
        await expectError(() => query("select public.redes_vivos()"), "42501", `${rol}: no cuenta los trabajos vivos`);
      });
    }
    await query("begin");
    try {
      await query("update public.redes_trabajos set estado = 'publicado', terminado_en = now() where estado in ('en_cola', 'publicando')");
      // OL-487: el latido cuenta también las ciudades a las que toca armar la semana de Instagram (los miércoles a las 9 en su hora); sin
      // ciudades abiertas no hay ninguna, así esta prueba no depende de la hora a la que corra (lo del miércoles: semana-miercoles.test.mjs).
      await query("update public.ciudades set estado = 'cerrada' where estado = 'abierta'");
      const latido = async () => (await query("select public.redes_latido() as n")).rows[0].n;
      check((await latido()) === 0, "sin trabajos listos, el latido no llama a nada");
      const listo = (await as("service_role", null, async () => (await query("insert into public.redes_trabajos (evento_id, red, formato) values ($1, 'instagram', '4x5') returning id", [B])).rows[0].id));
      check((await latido()) === 0, "sin Vault ni pg_net no llama (y no falla)");
      await query(`create schema net;
        create table net.llamadas (n serial primary key, url text, body jsonb, headers jsonb, timeout_milliseconds integer);
        create function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb, headers jsonb default '{}'::jsonb, timeout_milliseconds integer default 5000)
          returns bigint language sql as $$ insert into net.llamadas(url, body, headers, timeout_milliseconds) values (url, body, headers, timeout_milliseconds) returning n::bigint $$;
        create schema vault;
        create table vault.decrypted_secrets (name text primary key, decrypted_secret text);
        insert into vault.decrypted_secrets values ('avisos_url','https://somosnosotros.org/api/avisos-pendientes'),('avisos_cron_secret','s3cr3t');`);
      check((await latido()) === 1, "un trabajo listo: una llamada");
      const l = (await query("select url, headers from net.llamadas")).rows;
      check(l[0]?.url === "https://somosnosotros.org/api/redes/correr" && l[0].headers.Authorization === "Bearer s3cr3t", "llama a /api/redes/correr con el secreto de los avisos", l);
      await query("update public.redes_trabajos set siguiente_en = now() + interval '2 minutes' where id = $1", [listo]);
      check((await latido()) === 0, "uno que espera su reintento (siguiente_en futuro) no cuenta");
      await query("update public.redes_trabajos set estado = 'publicando', ocupada_hasta = now() + interval '2 minutes', siguiente_en = now() where id = $1", [listo]);
      check((await latido()) === 0, "uno que alguien trabaja no cuenta");
      await query("update public.redes_trabajos set ocupada_hasta = now() - interval '1 minute' where id = $1", [listo]);
      check((await latido()) === 1, "uno publicándose con ocupada_hasta vencido cuenta (la función se cayó)");
      await query("insert into vault.decrypted_secrets values ('redes_url','http://atacante.example/api/redes/correr')");
      await query("delete from net.llamadas");
      check((await latido()) === 0 && (await query("select count(*)::int as n from net.llamadas")).rows[0].n === 0, "una dirección que no es https de la ruta de la cola no recibe nada");
    } finally {
      await query("rollback");
    }

    // --- Lo leído de un cartel: cada quien ve las suyas; solo el servidor escribe.
    await as("service_role", null, () => query("insert into public.cartel_lecturas (usuario_id, imagen) values ($1, 'https://x.test/c1.jpg'), ($2, 'https://x.test/c2.jpg')", [OTRA, AUTOR]));
    const suyas = await as("authenticated", OTRA, async () => (await query("select imagen, estado from public.cartel_lecturas")).rows);
    check(suyas.length === 1 && suyas[0].imagen === "https://x.test/c1.jpg" && suyas[0].estado === "leyendo", "cada quien ve solo sus lecturas", suyas);
    await as("authenticated", OTRA, () => expectError(() => query("insert into public.cartel_lecturas (usuario_id, imagen) values ($1, 'https://x.test/c3.jpg')", [OTRA]), "42501", "nadie escribe lecturas desde la app"));
    const cambiaLectura = await as("authenticated", OTRA, async () => {
      try {
        return (await query("update public.cartel_lecturas set estado = 'leida' returning imagen")).rowCount;
      } catch (e) {
        return e.code;
      }
    });
    check(cambiaLectura === "42501", "ni la cambia", cambiaLectura);
    await as("anon", null, () => expectError(() => query("select count(*) from public.cartel_lecturas"), "42501", "un visitante no lee lecturas"));
    await as("service_role", null, () => expectError(() => query("update public.cartel_lecturas set estado = 'leida' where usuario_id = $1", [OTRA]), "23514", "una lectura terminada lleva cuándo terminó"));
    await as("service_role", null, () => query("update public.cartel_lecturas set estado = 'leida', terminado_en = now(), resultado = '{\"ok\":true}' where usuario_id = $1", [OTRA]));

    // --- Las funciones: definer, search_path vacío y sin PUBLIC.
    const { rows: f } = await query(`select proname, prosecdef, proconfig, has_function_privilege('anon', oid, 'execute') as anon from pg_proc where proname in ('redes_encolar', 'redes_reciente', 'redes_latido', 'redes_vivos', 'redes_trabajos_registro') and pronamespace = 'public'::regnamespace`);
    check(f.length === 5 && f.every((x) => x.prosecdef && x.proconfig?.includes('search_path=""') && !x.anon), "las funciones de la cola: definer, search_path vacío, sin visitantes", f);
  } finally {
    // Se limpia lo de esta prueba (los bancos comparten la base): borrar el lugar se lleva sus eventos, sus trabajos y lo publicado.
    await query("delete from public.cartel_lecturas where usuario_id in ($1, $2, $3)", [ADMIN, OTRA, AUTOR]);
    await query("delete from public.eventos where lugar_id = $1", [L]);
    await query("delete from public.lugares where id = $1", [L]);
  }
}
