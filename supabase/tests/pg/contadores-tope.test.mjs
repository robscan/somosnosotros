// OL-485 (bitácora 517): lo que se cuenta sin sesión tiene tope por hora (migración 20261029210000_contadores_tope.sql).
// Vistas sin cuenta: 30 por evento y hora (las de cuenta, sin tope); avisos abiertos: 30 por tipo y hora o hasta los que salieron en dos días;
// medición: 300 por nombre y hora. `contadores_hora` solo guarda qué, de qué, la hora y el número. Datos sintéticos en una transacción que se
// deshace al final; la prueba de llamadas a la vez usa otras conexiones y borra lo suyo.
const id = (n) => `00000000-0000-4000-8000-00000485${String(n).padStart(4, '0')}`;
const CIUDAD = 'Banco OL485';
const visitante = (k) => `visitante-ol485-${String(k).padStart(5, '0')}`;

export async function run({ as, check, query, connection }) {
  await query('begin');
  try {
    const [autor, p1, p2, p3] = [9001, 9002, 9003, 9004].map(id);
    for (const [i, u] of [autor, p1, p2, p3].entries()) {
      await query('insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now())', [u, `ol485-pruebas-${i}@local.test`]);
    }
    const evento = async (n) => (await query(
      `insert into public.eventos(id,titulo,inicio,ciudad,sitio_texto,sitio_lat,sitio_lng,creado_por,visible)
       values ($1,$2,now()+interval '2 days',$3,'Sitio sintético',22.15,-100.98,$4,true) returning id`,
      [id(n), `Evento OL485 ${String(n).padStart(2, '0')}`, CIUDAD, autor],
    )).rows[0].id;
    const servicio = (sql, args) => as('service_role', null, () => query(sql, args));
    const vista = async (n, quien, usuario = null) => (await servicio('select public.contar_vista_evento($1,$2,$3) as conto', [id(n), quien, usuario])).rows[0].conto;
    const vistaOrigen = async (n, quien, origen, medio) => (await servicio(
      'select public.contar_vista_evento_origen($1,$2,null,$3,$4) as conto', [id(n), quien, origen, medio])).rows[0].conto;
    const guardadas = async (n) => (await query('select count(*)::int as n from public.vistas_evento where evento_id=$1', [id(n)])).rows[0].n;
    const contador = async (ambito, clave) => (await query(
      "select coalesce(sum(n),0)::int as n from public.contadores_hora where ambito=$1 and clave=$2 and hora=date_trunc('hour', now())", [ambito, clave])).rows[0].n;

    // ---------- la tabla: solo qué, de qué, la hora y el número; nadie la lee con la llave pública ----------
    const { rows: cols } = await query("select column_name from information_schema.columns where table_schema='public' and table_name='contadores_hora' order by ordinal_position");
    check(cols.map((r) => r.column_name).join() === 'ambito,clave,hora,n', 'contadores_hora solo guarda ámbito, clave, hora y número (nada de nadie)', cols);
    const { rows: vcols } = await query("select column_name from information_schema.columns where table_schema='public' and table_name='vistas_evento' order by ordinal_position");
    check(vcols.map((r) => r.column_name).join() === 'evento_id,dia,clave,origen,medio', 'vistas_evento no gana columnas', vcols);

    // ---------- vistas sin cuenta: 30 por evento y hora ----------
    await evento(1); // el que se intenta inflar
    await evento(2); // otro evento: su propio tope
    await evento(3); // dos «Voy» de verdad
    let contaron = 0;
    for (let k = 1; k <= 100; k++) if (await vista(1, visitante(k))) contaron += 1;
    check(contaron === 30, '100 vistas sin cuenta del mismo evento en la misma hora: cuentan 30', contaron);
    check(await guardadas(1) === 30, 'y solo 30 quedan guardadas (las de más no se guardan)', await guardadas(1));
    check(await contador('vista', id(1)) === 30, 'el contador de la hora dice 30', await contador('vista', id(1)));
    check(await vista(1, visitante(1)) === false && await contador('vista', id(1)) === 30, 'una vista repetida no cuenta ni gasta el tope');
    check(await vista(2, visitante(1)) === true, 'otro evento tiene su propio tope');
    check(await vista(1, p1, p1) === true && await guardadas(1) === 31, 'con cuenta no hay tope: una por cuenta y día ya lo limita');
    check(await vista(1, p1, p1) === false, 'y la misma cuenta no cuenta dos veces el mismo día');
    check(await contador('vista', id(1)) === 30, 'la vista con cuenta no gasta el tope de las anónimas');
    check(await vistaOrigen(1, visitante(200), 'instagram', 'story') === false && await guardadas(1) === 31,
      'la vista con origen de una red comparte el tope: pasada la raya, tampoco se guarda');
    const antes = (await query('select origen from public.vistas_evento where evento_id=$1 and origen is not null', [id(1)])).rowCount;
    check(await vistaOrigen(1, visitante(2), 'facebook', 'post') === false
      && (await query('select origen from public.vistas_evento where evento_id=$1 and origen is not null', [id(1)])).rowCount === antes + 1,
      'una vista ya guardada sigue anotando de qué red llegó, aunque el evento esté en el tope');

    // ---------- Destacados no se compran con vistas falsas ----------
    for (const u of [p2, p3]) await query("insert into public.asistencias(usuario_id,evento_id,estado) values ($1,$2,'voy')", [u, id(3)]);
    const tira = (await query("select * from public.tira_destacados('eventos',$1)", [CIUDAD])).rows;
    const lugar = (n) => tira.findIndex((r) => r.id === id(n));
    check(lugar(1) >= 0 && tira[lugar(1)].motivo === 'vistas', 'el evento inflado entra por vistas (31 de verdad: 30 anónimas + 1 con cuenta)', tira);
    check(lugar(3) >= 0 && lugar(3) < lugar(1), 'pero dos «Voy» (40 puntos) siguen delante de 100 vistas falsas (31 puntos, no 101)', tira);

    // ---------- la hora siguiente vuelve a empezar; lo de hace más de dos días se borra solo ----------
    await query("insert into public.contadores_hora(ambito,clave,hora,n) values ('medir','ol485_viejo',date_trunc('hour', now()) - interval '3 days',7)");
    await query("update public.contadores_hora set hora = hora - interval '1 hour' where ambito='vista' and clave=$1", [id(1)]);
    check(await vista(1, visitante(300)) === true, 'en la hora siguiente vuelve a haber lugar');
    check((await query("select 1 from public.contadores_hora where clave='ol485_viejo'")).rowCount === 0, 'la primera de la hora borra los contadores de hace más de dos días');
    check((await query('select 1 from public.contadores_hora where clave=$1', [id(1)])).rowCount === 2, 'el de la hora pasada sigue (dos días no han pasado)');

    // ---------- contador_tomar: entradas raras no cuentan ----------
    const tomar = async (a, c, t) => (await servicio('select public.contador_tomar($1,$2,$3) as r', [a, c, t])).rows[0].r;
    check(await tomar('vista', 'ol485-raro', 0) === false && await tomar('vista', 'ol485-raro', null) === false, 'un tope de 0 o nulo no deja contar');
    check(await tomar('otro', 'x', 5) === false && await tomar('medir', 'Con Mayúsculas', 5) === false && await tomar('medir', null, 5) === false
      && await tomar('medir', 'x'.repeat(41), 5) === false, 'un ámbito o una clave fuera de forma no cuentan');

    // ---------- avisos abiertos: 30 por tipo y hora, o hasta los que salieron ----------
    const abiertos = async (tipo) => (await query(
      "select coalesce(sum(n),0)::int as n from public.avisos_abiertos where tipo=$1 and dia=(clock_timestamp() at time zone 'America/Mexico_City')::date", [tipo])).rows[0].n;
    // Punto de partida limpio dentro de la transacción (se deshace al final): sin abiertos ni mandados de «cambio» de otras pruebas.
    await query("delete from public.contadores_hora where ambito='aviso_abierto'");
    await query(`update public.avisos_entregas e set terminado_en = now() - interval '3 days' from public.avisos_jobs j
      where j.id=e.job_id and j.tipo='cambio' and e.terminado_en >= now() - interval '2 days'`);
    const antesCambio = await abiertos('cambio');
    for (let k = 0; k < 40; k++) await servicio("select public.avisos_contar_abierto('cambio')");
    check(await abiertos('cambio') - antesCambio === 30, 'sin avisos mandados: 40 «abiertos» del mismo tipo en una hora cuentan 30', await abiertos('cambio') - antesCambio);
    const antesRecordatorio = await abiertos('recordatorio');
    for (let k = 0; k < 3; k++) await servicio("select public.avisos_contar_abierto('recordatorio')");
    check(await abiertos('recordatorio') - antesRecordatorio === 3, 'otro tipo tiene su propio tope');
    // 45 avisos de cambio que llegaron a un teléfono hoy (y 5 a la administración, que no cuentan): el tope sube a 45.
    const admin = id(9005);
    await query("insert into public.admin_correos(correo) values ('ol485-pruebas-admin@local.test')");
    await query("insert into auth.users(id,email,email_confirmed_at) values ($1,'ol485-pruebas-admin@local.test',now())", [admin]);
    const job = (await query(`insert into public.avisos_jobs(evento_id,clave,tipo,revision,vence,estado,expandido)
      values ($1,'ol485-cambio','cambio',now(),now()+interval '1 day','activo',true) returning id`, [id(3)])).rows[0].id;
    await query(`insert into public.avisos_entregas(job_id,usuario_id,canal,endpoint,estado,terminado_en)
      select $1,$2,'push','https://fcm.googleapis.com/fcm/send/ol485-'||g,'enviada',now() from generate_series(1,45) g`, [job, p1]);
    await query(`insert into public.avisos_entregas(job_id,usuario_id,canal,endpoint,estado,terminado_en)
      select $1,$2,'push','https://fcm.googleapis.com/fcm/send/ol485-admin-'||g,'enviada',now() from generate_series(1,5) g`, [job, admin]);
    for (let k = 0; k < 20; k++) await servicio("select public.avisos_contar_abierto('cambio')");
    check(await abiertos('cambio') - antesCambio === 45, 'con 45 mandados en dos días: se cuentan hasta 45 en la hora, no más (la administración no suma)', await abiertos('cambio') - antesCambio);

    // ---------- medición: 300 por nombre y hora ----------
    const medir = async (nombre) => (await servicio('select public.medir_contar($1) as r', [nombre])).rows[0].r;
    let medidas = 0;
    for (let k = 0; k < 310; k++) if (await medir('busqueda')) medidas += 1;
    check(medidas === 300, '310 «busqueda» en una hora: pasan 300 a Google', medidas);
    check(await medir('asistencia') === true, 'otro nombre tiene su propio tope');
    check(await medir('Busqueda') === false && await medir(null) === false && await medir('a'.repeat(41)) === false, 'un nombre fuera de forma no cuenta');

    // ---------- permisos: solo la llave de servicio ----------
    // A mano y no con `as`: el error aborta la transacción hasta volver al punto de guardado (que también deshace el rol).
    const negado = async (rol, sujeto, sql, args = []) => {
      await query('savepoint permiso');
      let r = false;
      try {
        await query("select set_config('request.jwt.claim.sub', $1, true)", [sujeto ?? '']);
        await query(`set local role ${rol}`);
        await query(sql, args);
      } catch (e) { r = e.code === '42501'; }
      await query('rollback to savepoint permiso');
      await query('reset role');
      return r;
    };
    for (const [rol, sujeto] of [['anon', null], ['authenticated', p1]]) {
      for (const [sql, que, args] of [
        ["select public.contador_tomar('medir','ol485_permiso',5)", 'tomar contadores'],
        ["select public.medir_contar('busqueda')", 'llamar medir_contar'],
        ['select * from public.contadores_hora', 'leer los contadores'],
        ["insert into public.contadores_hora values ('medir','x',now(),1)", 'escribir los contadores'],
        ['select public.contar_vista_evento($1,$2,null)', 'contar vistas', [id(2), visitante(9)]],
      ]) check(await negado(rol, sujeto, sql, args), `${rol}: sin permiso para ${que}`);
    }
    const { rows: fns } = await query(`select p.oid::regprocedure::text as f, p.prosecdef, p.proconfig,
        has_function_privilege('service_role', p.oid, 'execute') as servicio,
        exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0 and a.privilege_type = 'EXECUTE') as todos
      from pg_proc p where p.oid in ('public.contador_tomar(text,text,integer)'::regprocedure, 'public.medir_contar(text)'::regprocedure,
        'public.contar_vista_evento(uuid,text,uuid)'::regprocedure, 'public.contar_vista_evento_origen(uuid,text,uuid,text,text)'::regprocedure,
        'public.avisos_contar_abierto(text)'::regprocedure)`);
    check(fns.length === 5 && fns.every((f) => f.prosecdef && f.proconfig?.includes('search_path=""') && f.servicio && !f.todos),
      'las cinco funciones: definer, search_path vacío, solo la llave de servicio', fns);
  } finally {
    await query('rollback');
  }

  // ---------- llamadas a la vez: el tope no se pasa ----------
  const CLAVE = 'ol485_carrera';
  try {
    const resultados = await Promise.all(Array.from({ length: 12 }, () => connection(async (c) =>
      (await c.query("select public.contador_tomar('medir',$1,5) as r", [CLAVE])).rows[0].r)));
    check(resultados.filter(Boolean).length === 5, '12 llamadas a la vez con tope 5: pasan exactamente 5', resultados);
  } finally {
    await query("delete from public.contadores_hora where ambito='medir' and clave=$1", [CLAVE]);
  }
}
