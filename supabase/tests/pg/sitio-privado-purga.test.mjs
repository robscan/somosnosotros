import { randomUUID } from 'node:crypto';

export async function run({ as, query, check, expectError, connection }) {
  const autora = randomUUID(), admin = randomUUID();
  await query("insert into public.admin_correos(correo) values ('ol258-admin@example.com')");
  await query("insert into auth.users(id,email,email_confirmed_at) values ($1,'ol258-autora@example.com',now()),($2,'ol258-admin@example.com',now())", [autora, admin]);
  const ids = [], lugares = [];
  const crear = async (fin = '-169 hours') => {
    const id = randomUUID(); ids.push(id);
    // Nace vigente y después termina: también funciona cuando el trigger impide
    // escribir directamente una dirección que ya agotó la retención.
    await query("insert into public.eventos(id,titulo,inicio,fin,creado_por,sitio_texto,sitio_reservado,sitio_revelar_desde) values ($1,'Purga OL258',now(),now()+interval '1 hour',$2,'Alias',true,now()-interval '1 hour')", [id, autora]);
    await query("insert into public.eventos_sitio_privado(evento_id,direccion,lat,lng,indicaciones,revelar_desde) values ($1,'Dirección sintética OL258',22,-100,'Indicaciones sintéticas',now()-interval '1 hour')", [id]);
    await query("update public.eventos set inicio=now()-interval '10 days', fin=now()+$2::interval where id=$1", [id, fin]);
    return id;
  };
  const purgar = (limite = 500) => as('service_role', null, async () => (await query('select public.purgar_sitios_privados($1) as n', [limite])).rows[0].n);
  const privada = async id => (await query('select 1 from public.eventos_sitio_privado where evento_id=$1', [id])).rowCount === 1;
  const leer = usuario => as('authenticated', usuario, () => query('select evento_id from public.eventos_sitio_privado where evento_id=any($1::uuid[])', [ids]));
  try {
    const vencido = await crear();
    check((await leer(autora)).rowCount === 0 && (await leer(admin)).rowCount === 0, 'a los siete días autor/admin ya no leen la copia, aunque el cron no haya corrido');
    await as('service_role', null, () => expectError(() => query("update public.eventos_sitio_privado set direccion='Reposición vencida' where evento_id=$1", [vencido]), '23514', 'escritura de copia vencida rechazada'));
    const existe = (await query("select to_regprocedure('public.purgar_sitios_privados(integer)') is not null as ok")).rows[0].ok;
    check(existe, 'hay función de purga acotada e idempotente');
    if (!existe) return;
    const f = (await query("select prosecdef,proconfig,has_function_privilege('anon',oid,'execute') anon,has_function_privilege('authenticated',oid,'execute') usuario,has_function_privilege('service_role',oid,'execute') servicio from pg_proc where oid='public.purgar_sitios_privados(integer)'::regprocedure")).rows[0];
    check(f.prosecdef && f.proconfig.includes('search_path=""') && !f.anon && !f.usuario && f.servicio, 'definer con search_path vacío; solo service_role ejecuta');
    // Una conexión nueva todavía no conoce el parámetro app.avisos_outbox.
    // CREATE FUNCTION ... SET lo rechaza sin superusuario (como Supabase).
    const definicion = (await query("select pg_get_functiondef('public.purgar_sitios_privados(integer)'::regprocedure) sql")).rows[0].sql;
    await connection(async c => {
      await c.query('begin');
      try {
        await c.query('create schema ol258_instalacion authorization authenticated');
        await c.query('set local role authenticated');
        check(!(await c.query('select rolsuper from pg_roles where rolname=current_user')).rows[0].rolsuper, 'instalación se comprueba sin superusuario');
        await c.query(definicion.replace('public.purgar_sitios_privados', 'ol258_instalacion.purgar_sitios_privados'));
        check(true, 'función de purga se instala con parámetro desconocido y sin superusuario');
        await c.query("select set_config('app.avisos_outbox','on',true)");
        check((await c.query('select ol258_instalacion.purgar_sitios_privados() n')).rows[0].n === 0, 'set_config funciona también al ejecutar sin superusuario');
        check((await c.query("select current_setting('app.avisos_outbox') valor")).rows[0].valor === 'on', 'restaura opt-in del llamador al terminar');
        await c.query('savepoint error_purga');
        try {
          await c.query('select ol258_instalacion.purgar_sitios_privados(0)');
          check(false, 'purga inválida debe fallar');
        } catch (e) {
          await c.query('rollback to savepoint error_purga');
          check(e.code === '22023', 'error de purga conserva su código sin superusuario');
          check((await c.query("select current_setting('app.avisos_outbox') valor")).rows[0].valor === 'on', 'error no altera el opt-in del llamador');
        }
      } catch (e) { check(false, `instalar/ejecutar purga sin superusuario: ${e.code}`); }
      finally { await c.query('rollback'); }
    });
    for (const [rol, user] of [['anon', null], ['authenticated', autora], ['authenticated', admin]]) {
      await as(rol, user, () => expectError(() => query('select public.purgar_sitios_privados()'), '42501', `${rol}/${user === admin ? 'admin' : 'usuario'} no ejecuta purga`));
    }
    for (const limite of [0, -1, 1001, null]) await as('service_role', null, () => expectError(() => query('select public.purgar_sitios_privados($1)', [limite]), '22023', 'límite inválido rechazado'));

    // Límite exacto, sin depender de cuánto tarda el ordenador.
    await query('begin');
    try {
      const exacto = await crear('-168 hours'), anterior = await crear('-167:59:59');
      const n = await purgar();
      check(n >= 2 && !await privada(exacto) && await privada(anterior), 'siete días exactos son elegibles; un segundo antes se conserva');
    } finally { await query('rollback'); }

    const e = (await query('select *,actualizado_en::text as revision from public.eventos where id=$1', [vencido])).rows[0];
    const p = (await query('select * from public.eventos_sitio_privado where evento_id=$1', [vencido])).rows[0];
    p.revelar_desde = e.sitio_revelar_desde;
    const jobsAntes = (await query('select count(*)::int n from public.avisos_jobs')).rows[0].n;
    const vigente = await crear('1 hour');
    for (const propietario of [autora, admin]) {
      const id = randomUUID(); lugares.push(id);
      await query("insert into public.lugares(id,nombre,tipo,direccion,lat,lng,creado_por,visible,privado) values ($1,'Lugar independiente OL258','otro','Dirección de lugar',22,-100,$2,false,true)", [id, propietario]);
    }
    await query("select set_config('app.avisos_outbox','on',false)");
    try {
      check(await purgar(1) === 1 && !await privada(vencido), 'purga borra la copia vencida incluso si el llamador tenía opt-in activo');
      check((await query("select current_setting('app.avisos_outbox') valor")).rows[0].valor === 'on', 'purga real restaura el opt-in después de borrar');
    } finally { await query("select set_config('app.avisos_outbox','',false)"); }
    const posterior = (await query('select *,actualizado_en::text as revision from public.eventos where id=$1', [vencido])).rows[0];
    check(posterior.titulo === e.titulo && posterior.sitio_reservado && posterior.creado_por === autora && posterior.revision !== e.revision, 'conserva evento/autor/alias e invalida la edición antigua');
    check(await privada(vigente), 'no elimina copia aún vigente');
    const sitios = await query('select direccion,visible,privado from public.lugares where id=any($1::uuid[])', [lugares]);
    check(sitios.rowCount === 2 && sitios.rows.every(l => l.direccion === 'Dirección de lugar' && !l.visible && l.privado), 'no cambia lugares ocultos de admin ni privados reutilizables');
    check((await query('select count(*)::int n from public.avisos_jobs')).rows[0].n === jobsAntes, 'la purga de mantenimiento no genera envíos');
    check(await purgar() === 0, 'repetir purga no elimina nada adicional');
    await as('authenticated', autora, () => expectError(() => query('select public.guardar_evento_completo($1,$2::jsonb,$3::jsonb,\'[]\',$4,$5)', [vencido, JSON.stringify(e), JSON.stringify(p), e.revision, randomUUID()]), '40001', 'pestaña antigua no restaura dirección ni metadatos tras la purga'));
    await as('authenticated', autora, () => expectError(() => query("insert into public.eventos_sitio_privado(evento_id,direccion,lat,lng,revelar_desde) values ($1,'Reposición',22,-100,now())", [vencido]), '23514', 'INSERT directo no resucita copia vencida'));
    const guardar = (id, datos, privado, revision, operacion = randomUUID(), usuario = autora) => as('authenticated', usuario,
      () => query("select public.guardar_evento_completo($1,$2::jsonb,$3::jsonb,'[]',$4,$5) resultado", [id, JSON.stringify(datos), JSON.stringify(privado), revision, operacion]));
    const actual = async id => (await query('select *,actualizado_en::text as revision from public.eventos where id=$1', [id])).rows[0];
    const historico = { ...await actual(vencido), titulo: 'Metadatos conservados' };
    const operacion = randomUUID();
    try {
      await guardar(vencido, historico, null, historico.revision, operacion);
      check((await actual(vencido)).titulo === historico.titulo && !await privada(vencido), 'metadatos de reservado purgado se editan sin reponer dirección');
      check((await guardar(vencido, historico, null, historico.revision, operacion)).rows[0].resultado.repetido, 'reintento de metadatos conserva idempotencia');
    } catch (e) { check(false, `edición de metadatos tras purga: ${e.code}`); }
    const reprogramado = { ...await actual(vencido), inicio: new Date(Date.now()+3600000).toISOString(), fin: new Date(Date.now()+7200000).toISOString() };
    await expectError(() => guardar(vencido, reprogramado, null, reprogramado.revision), '23514', 'reprogramar sin dirección nueva se rechaza');
    check((await actual(vencido)).inicio < new Date(), 'rechazo revierte también la fecha');
    await expectError(() => guardar(null, historico, null, null), '23514', 'un alta no aprovecha la excepción de retención');
    const activo = await actual(vigente);
    await expectError(() => guardar(vigente, activo, null, activo.revision), '23514', 'un reservado vigente no puede omitir su dirección');
    await guardar(vencido, reprogramado, { ...p, direccion: 'Dirección nueva confirmada', revelar_desde: reprogramado.sitio_revelar_desde }, reprogramado.revision);
    check(await privada(vencido) && (await actual(vencido)).inicio > new Date(), 'reprogramar con dirección nueva vuelve a crear una copia vigente');
    const pendiente = await crear();
    const antesCron = { ...await actual(pendiente), titulo: 'Editado antes del cron' };
    try {
      await guardar(pendiente, antesCron, null, antesCron.revision, randomUUID(), admin);
      check((await actual(pendiente)).titulo === antesCron.titulo && await privada(pendiente), 'admin edita al vencer aunque la copia espere todavía al cron');
    } catch (e) { check(false, `metadatos antes de purga física: ${e.code}`); }
    await purgar();
    for (let i = 0; i < 3; i++) await crear();
    check(await purgar(2) === 2 && await purgar(2) === 1 && await purgar(2) === 0, 'lotes respetan el tope y drenan sin duplicar trabajo');

    // La reprogramación toma el cerrojo primero: se salta esa fila, nunca la borra.
    const movido = await crear();
    await connection(async c => {
      await c.query('begin');
      try {
        await c.query("update public.eventos set inicio=now(),fin=now()+interval '1 day' where id=$1", [movido]);
        check(await purgar() === 0, 'SKIP LOCKED no se adelanta a una reprogramación');
        await c.query('commit');
      } finally { await c.query('rollback'); }
    });
    check(await purgar() === 0 && await privada(movido), 'la dirección reprogramada se conserva tras commit');
    // Purga primero: la reprogramación no puede usar la revisión anterior.
    const ocupado = await crear();
    await connection(async c => {
      await c.query('begin');
      try {
        await c.query('set local role service_role');
        check((await c.query('select public.purgar_sitios_privados() n')).rows[0].n === 1, 'la purga concurrente toma el evento');
        await query("set lock_timeout='150ms'");
        await expectError(() => query("update public.eventos set inicio=now(),fin=now()+interval '1 day' where id=$1", [ocupado]), '55P03', 'la edición espera al commit de la purga');
        await c.query('commit');
      } finally { await c.query('rollback'); await query('set lock_timeout=0'); }
    });
    check(!await privada(ocupado), 'no reaparece copia tras la carrera');
  } finally {
    await query('delete from public.eventos where id=any($1::uuid[])', [ids]);
    await query('delete from public.lugares where id=any($1::uuid[])', [lugares]);
    await query('delete from auth.users where id=any($1::uuid[])', [[autora, admin]]);
    await query("delete from public.admin_correos where correo='ol258-admin@example.com'");
  }
}
