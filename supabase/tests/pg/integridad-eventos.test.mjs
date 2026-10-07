import { randomUUID } from 'node:crypto';

const AUTORA = randomUUID();
const OTRA = randomUUID();
const base = {
  titulo: 'Contrato de integridad', inicio: '2030-10-01T10:00:00Z', fin: '2030-11-01T12:00:00Z',
  sitio_texto: 'Sitio de prueba', sitio_lat: 22.15, sitio_lng: -100.98,
  sitio_reservado: false, ciudad: 'San Luis Potosí', zona: 'Etc/UTC',
};
const franjas = [{ dias: [1, 2], abre: '10:00', cierra: '18:00' }];
const json = (v) => v === null ? null : JSON.stringify(v);

export async function run({ as, check, expectError, query, connection }) {
  await query("insert into auth.users (id, email) values ($1, 'integridad-autora@local.test'), ($2, 'integridad-otra@local.test')", [AUTORA, OTRA]);
  await query("update public.avisos_config set capturar = true, corte = clock_timestamp()");
  const rpcLugar = (d, f = franjas) => [
    'select public.crear_lugar_con_horario($1::jsonb, $2::jsonb) as r', [json(d), json(f)],
  ];
  const lugar = { nombre: 'Foro de integridad', tipo: 'foro', ciudad: 'San Luis Potosí', lat: 22.15, lng: -100.98, privado: true, operacion_guardado: randomUUID() };
  const llamar = (args, quien = AUTORA) => as('authenticated', quien, async () => (await query(...args)).rows[0].r);
  const alta = (d = base, s = null) => llamar([
    "select public.guardar_evento_con_sesiones(null, $1::jsonb, null, '[]'::jsonb, $2::jsonb, null, $3::uuid) as r", [json(d), json(s), randomUUID()],
  ]);
  const contar = async (tabla) => Number((await query(`select count(*) as n from public.${tabla}`)).rows[0].n);
  const configurar = async (c) => {
    await c.query('set role authenticated');
    await c.query("select set_config('request.jwt.claim.sub', $1, false)", [AUTORA]);
  };
  // Dos conexiones reales; la segunda debe esperar a la primera, no un retraso supuesto.
  const carrera = async (aSQL, bSQL, aislamiento = '') => connection(async (a) => connection(async (b) => {
    await configurar(a); await configurar(b);
    const pid = (await b.query('select pg_backend_pid() as pid')).rows[0].pid;
    await a.query('begin'); await b.query(`begin ${aislamiento}`);
    if (aislamiento) await b.query('select count(*) from public.eventos');
    let pendiente;
    try {
      const primero = await a.query(...aSQL);
      pendiente = b.query(...bSQL).then(async (r) => { await b.query('commit'); return { r }; }).catch((error) => ({ error }));
      let espera = false;
      for (let n = 0; n < 60; n++) {
        espera = (await query('select cardinality(pg_blocking_pids($1)) > 0 as espera', [pid])).rows[0].espera;
        if (espera) break;
        await new Promise((r) => setTimeout(r, 10));
      }
      check(espera, 'la segunda conexión espera un bloqueo de la primera');
      await a.query('commit');
      return { primero, segundo: await pendiente };
    } finally {
      await a.query('rollback'); await b.query('rollback');
      if (pendiente) await pendiente;
    }
  }));

  const primero = await llamar(rpcLugar(lugar));
  const repetido = await llamar(rpcLugar(lugar));
  check(primero.id === repetido.id && repetido.repetido === true, 'repetir el alta devuelve el mismo lugar');
  check((await query('select count(*)::int as n from public.lugares_horarios where lugar_id = $1', [primero.id])).rows[0].n === 1, 'repetir no añade franjas');
  const deOtra = await llamar(rpcLugar({ ...lugar, nombre: 'Foro de otra cuenta' }), OTRA);
  check(deOtra.id !== primero.id, 'una clave de otra cuenta no devuelve su lugar privado');
  const legacy = { ...lugar, nombre: 'Contrato antiguo', operacion_guardado: undefined };
  const sinClave = await llamar(rpcLugar(legacy));
  check((await llamar(rpcLugar(legacy))).id === sinClave.id, 'el mismo contenido del cliente antiguo también es reintentable');
  const antes = await contar('lugares');
  await as('authenticated', AUTORA, () => expectError(() => query(...rpcLugar({ ...lugar, operacion_guardado: randomUUID() }, [{ dias: [8], abre: '10:00', cierra: '18:00' }])), '23514', 'un horario inválido rechaza el alta completa'));
  check(await contar('lugares') === antes, 'el horario rechazado no deja un lugar');
  await as('anon', null, () => expectError(() => query(...rpcLugar(lugar)), '42501', 'anon no puede dar de alta con horario'));
  await as('authenticated', AUTORA, () => expectError(() => query('update public.lugares set operacion_guardado = $2 where id = $1', [primero.id, randomUUID()]), '23514', 'la operación guardada no se puede cambiar'));
  const datosCarrera = { ...lugar, nombre: 'Alta simultánea', operacion_guardado: randomUUID() };
  const crLugar = await carrera(rpcLugar(datosCarrera), rpcLugar(datosCarrera));
  check(!crLugar.segundo.error && crLugar.primero.rows[0].r.id === crLugar.segundo.r.rows[0].r.id, 'dos reintentos simultáneos devuelven el mismo lugar');
  check((await query('select count(*)::int as n from public.lugares where operacion_guardado = $1', [datosCarrera.operacion_guardado])).rows[0].n === 1, 'alta simultánea: queda una sola fila');

  const inaug = await alta({ ...base, titulo: 'Inauguración de prueba', fin: null });
  const expo = (op) => ['select public.publicar_exposicion_de_inauguracion($1::uuid, $2, $3::timestamptz, $4::timestamptz, null, $5::uuid) as r', [inaug.id, 'Exposición de prueba', base.inicio, base.fin, op]];
  const antesEventos = await contar('eventos');
  const opExpo = randomUUID();
  const crExpo = await carrera(expo(opExpo), expo(randomUUID()));
  check(crExpo.segundo.error?.code === '23505', 'una inauguración no queda ligada dos veces por concurrencia');
  check(await contar('eventos') === antesEventos + 1, 'el rechazo simultáneo no deja una exposición huérfana');
  check((await query('select count(*)::int as n from public.eventos where inaugura_id = $1', [inaug.id])).rows[0].n === 1, 'una sola exposición por inauguración');
  check((await llamar(expo(opExpo))).id === crExpo.primero.rows[0].r.id, 'reintentar la operación de exposición conserva su id');
  const otraExpo = await alta({ ...base, titulo: 'Otra exposición' });
  await query("update public.eventos set clase = 'exposicion' where id = $1", [otraExpo.id]);
  await as('authenticated', AUTORA, () => expectError(() => query('update public.eventos set inaugura_id = $2 where id = $1', [otraExpo.id, inaug.id]), '23505', 'el enlace directo también exige una sola exposición'));

  const extremos = [{ inicio: base.inicio, fin: null }, { inicio: '2030-11-01T10:00:00Z', fin: null }];
  const creado = await alta(base, extremos);
  const filas = async (id) => Number((await query('select count(*) as n from public.eventos_sesiones where evento_id = $1', [id])).rows[0].n);
  const rechazo = async (sql, valores, etiqueta) => as('authenticated', AUTORA, () => expectError(() => query(sql, valores), '22023', etiqueta));
  await rechazo("insert into public.eventos_sesiones (evento_id, fecha, inicio) values ($1, '2030-10-02', '2030-10-03T10:00:00Z')", [creado.id], 'la fecha debe ser la del inicio en la zona del evento');
  await rechazo("insert into public.eventos_sesiones (evento_id, fecha, inicio) values ($1, '2030-12-02', '2030-12-02T10:00:00Z')", [creado.id], 'las sesiones directas respetan el periodo del evento');
  await rechazo("insert into public.eventos_sesiones (evento_id, fecha, inicio, fin) values ($1, '2030-10-02', '2030-10-02T10:00:00Z', '2030-10-03T01:00:00Z')", [creado.id], 'el fin no rebasa la medianoche local');
  await rechazo('delete from public.eventos_sesiones where evento_id = $1 and inicio = $2', [creado.id, base.inicio], 'no se puede dejar una única sesión');
  await rechazo("update public.eventos set inicio = inicio + interval '1 hour' where id = $1", [creado.id], 'el periodo del evento también debe coincidir con las sesiones');
  check(await filas(creado.id) === 2, 'todos los rechazos conservan las sesiones originales');
  await as('authenticated', OTRA, () => expectError(() => query("insert into public.eventos_sesiones (evento_id, fecha, inicio) values ($1, '2030-10-02', '2030-10-02T10:00:00Z')", [creado.id]), '42501', 'otra cuenta no escribe sesiones'));
  for (const rol of ['anon', 'authenticated', 'service_role']) await as(rol, rol === 'authenticated' ? AUTORA : null, () => expectError(() => query('select * from public.eventos_sesiones_guardia'), '42501', 'la guardia no se expone a ' + rol));
  const contract = (await query("select prosecdef, proconfig, has_function_privilege('authenticated', oid, 'EXECUTE') as ejecutar from pg_proc where oid = 'public.ordenar_escritura_sesiones()'::regprocedure")).rows[0];
  check(contract.prosecdef && contract.proconfig.includes('search_path=""') && !contract.ejecutar, 'la función elevada tiene ruta vacía y carece de grant directo');

  for (const aislamiento of ['', 'isolation level repeatable read']) {
    const sesiones = [...extremos, ...Array.from({ length: 28 }, (_, i) => ({ inicio: `2030-10-${String(i + 2).padStart(2, '0')}T10:00:00Z`, fin: null }))];
    const e = await alta({ ...base, titulo: 'Cupo concurrente ' + aislamiento }, sesiones);
    const insertar = (dia) => ['insert into public.eventos_sesiones (evento_id, fecha, inicio) values ($1, $2::date, $3::timestamptz)', [e.id, `2030-10-${dia}`, `2030-10-${dia}T10:00:00Z`]];
    const cr = await carrera(insertar(30), insertar(31), aislamiento);
    check(cr.segundo.error?.code === (aislamiento ? '40001' : '22023'), 'el cupo resiste dos conexiones con ' + (aislamiento || 'read committed'));
    check(await filas(e.id) === 31, 'la carrera conserva como máximo 31 sesiones');
    await rechazo("insert into public.eventos_sesiones (evento_id, fecha, inicio) values ($1, '2030-10-31', '2030-10-31T10:00:00Z')", [e.id], 'una sesión 32 directa se rechaza');
  }
  // Una escritura autorizada del lugar puede cambiar eventos de otra cuenta.
  // La validación diferida debe ver sus sesiones incluso con ese rol.
  const lZona = await llamar(rpcLugar({ ...lugar, nombre: 'Lugar de cambio de zona', zona: 'Etc/UTC', privado: false, operacion_guardado: randomUUID() }));
  const eZona = await llamar(["select public.guardar_evento_con_sesiones(null, $1::jsonb, null, '[]'::jsonb, $2::jsonb, null, $3::uuid) as r", [json({ ...base, lugar_id: lZona.id, sitio_texto: null }), json(extremos), randomUUID()]], OTRA);
  await as('authenticated', AUTORA, () => expectError(() => query("update public.lugares set zona = 'Asia/Tokyo' where id = $1", [lZona.id]), '22023', 'una propagación no puede dejar incoherentes las sesiones ajenas'));
  check((await query('select zona from public.lugares where id = $1', [lZona.id])).rows[0].zona === 'Etc/UTC' && await filas(eZona.id) === 2, 'la propagación rechazada revierte el lugar y conserva las sesiones');
  const actualizado = await llamar(["select public.editar_evento_con_sesiones($1, $2::jsonb, null, '[]'::jsonb, $3::jsonb, (select actualizado_en from public.eventos where id = $1), $4::uuid) as r", [creado.id, json({ ...base, inicio: '2030-10-02T10:00:00Z', fin: '2030-10-03T12:00:00Z' }), json([{ inicio: '2030-10-02T10:00:00Z', fin: null }, { inicio: '2030-10-03T10:00:00Z', fin: null }]), randomUUID()]]);
  check(actualizado.id === creado.id && await filas(creado.id) === 2, 'editar sustituye evento y sesiones en una transacción');
  await llamar(["select public.editar_evento_con_sesiones($1, $2::jsonb, null, '[]'::jsonb, null, (select actualizado_en from public.eventos where id = $1), $3::uuid) as r", [creado.id, json({ ...base, fin: null }), randomUUID()]]);
  check(await filas(creado.id) === 0, 'volver al horario común elimina todas las sesiones');
  const conSesiones = await alta(base, extremos);
  await as('authenticated', AUTORA, () => query('delete from public.eventos where id = $1', [conSesiones.id]));
  check(await filas(conSesiones.id) === 0, 'el borrado autorizado en cascada continúa funcionando');
}
