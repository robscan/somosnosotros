import { randomUUID } from "node:crypto";

// OL-257: la FK protege también contra API directa, RLS invisible y carreras.
export async function run({ as, query, check, expectError, connection }) {
  const [autora, otra, admin] = [randomUUID(), randomUUID(), randomUUID()];
  await query("insert into public.admin_correos(correo) values ('ol257-borrado-admin@example.com')");
  await query("insert into auth.users(id,email,email_confirmed_at) values ($1,'ol257-borrado-autora@example.com',now()),($2,'ol257-borrado-otra@example.com',now()),($3,'ol257-borrado-admin@example.com',now())", [autora, otra, admin]);
  const lugares = [];
  const lugar = async () => {
    const id = randomUUID(); lugares.push(id);
    await query("insert into public.lugares(id,nombre,tipo,lat,lng,creado_por) values ($1,'Lugar OL257','otro',22,-100,$2)", [id, autora]);
    return id;
  };
  const evento = async (id, autor, visible = true) => {
    const e = randomUUID();
    await query("insert into public.eventos(id,titulo,inicio,lugar_id,creado_por,visible) values ($1,'Evento OL257',now()+interval '1 day',$2,$3,$4)", [e, id, autor, visible]);
    return e;
  };
  const borrar = id => query("select public.borrar_lugar($1) as ok", [id]);
  const existe = async (tabla, id) => (await query(`select 1 from public.${tabla} where id=$1`, [id])).rowCount === 1;
  try {
    for (const [autor, visible, caso] of [[otra, true, 'ajeno'], [otra, false, 'ajeno oculto'], [null, true, 'autor eliminado']]) {
      const id = await lugar(), e = await evento(id, autor, visible);
      await as('authenticated', autora, () => expectError(() => query('delete from public.lugares where id=$1', [id]), '23503', `DELETE directo rechaza evento ${caso}`));
      check(await existe('lugares', id) && await existe('eventos', e), `DELETE conserva lugar y evento ${caso}`);
    }
    const funcion = (await query("select to_regprocedure('public.borrar_lugar(uuid)') is not null as existe")).rows[0].existe;
    check(funcion, 'existe operación atómica de borrado de lugar');
    if (!funcion) return; // permite reproducir la vulnerabilidad antes de la migración.
    const permisos = (await query("select prosecdef, proconfig, has_function_privilege('anon',oid,'execute') as anon, has_function_privilege('authenticated',oid,'execute') as autenticado from pg_proc where oid='public.borrar_lugar(uuid)'::regprocedure")).rows[0];
    check(!permisos.prosecdef && permisos.proconfig.includes('search_path=""') && !permisos.anon && permisos.autenticado, 'RPC invoker, search_path vacío y solo sesión');
    const mixto = await lugar(), propio = await evento(mixto, autora), ajeno = await evento(mixto, otra, false);
    await as('authenticated', autora, () => expectError(() => borrar(mixto), '23503', 'RPC rechaza evento ajeno invisible para la autora'));
    check(await existe('lugares', mixto) && await existe('eventos', propio) && await existe('eventos', ajeno), 'fallo revierte también el borrado del evento propio');
    await as('authenticated', admin, () => expectError(() => borrar(mixto), '23503', 'administración tampoco borra implícitamente eventos ajenos'));
    await as('authenticated', admin, () => expectError(() => query('delete from public.lugares where id=$1', [mixto]), '23503', 'DELETE administrativo también está protegido'));
    const sinAutor = await lugar(); await evento(sinAutor, null);
    await as('authenticated', autora, () => expectError(() => borrar(sinAutor), '23503', 'NULL no se interpreta como autor propio'));
    const soloPropios = await lugar(), ePropio = await evento(soloPropios, autora);
    check(!(await as('authenticated', otra, () => borrar(soloPropios))).rows[0].ok, 'otra cuenta no puede borrar un lugar visible');
    await as('anon', null, () => expectError(() => borrar(soloPropios), '42501', 'anon no ejecuta la RPC'));
    check((await as('authenticated', autora, () => borrar(soloPropios))).rows[0].ok, 'autor borra lugar con sus propios eventos');
    check(!await existe('lugares', soloPropios) && !await existe('eventos', ePropio), 'borrado propio elimina ambas filas');
    check(!(await as('authenticated', autora, () => borrar(soloPropios))).rows[0].ok, 'reintento sobre lugar ausente no informa éxito');
    const vacio = await lugar();
    check((await as('authenticated', admin, () => borrar(vacio))).rows[0].ok, 'administración conserva borrado de lugar vacío');

    // Orden 1: el INSERT ya tomó el bloqueo de FK; el borrado no puede adelantarlo.
    const concurrente = await lugar();
    await connection(async c => {
      await c.query('begin');
      try {
        await c.query('set local role authenticated');
        await c.query("select set_config('request.jwt.claim.sub',$1,true)", [otra]);
        await c.query("insert into public.eventos(titulo,inicio,lugar_id,creado_por) values ('Concurrente OL257',now()+interval '1 day',$1,$2)", [concurrente, otra]);
        await query("set lock_timeout='150ms'");
        await as('authenticated', autora, () => expectError(() => borrar(concurrente), '55P03', 'borrado espera al INSERT concurrente'));
        await c.query('commit');
      } finally { await c.query('rollback'); await query("set lock_timeout=0"); }
    });
    await as('authenticated', autora, () => expectError(() => borrar(concurrente), '23503', 'tras commit concurrente el evento ajeno protege el lugar'));
    check(await existe('lugares', concurrente), 'carrera no elimina el lugar ocupado');

    // Orden 2: el borrado ya tomó FOR UPDATE; nadie agrega un hijo huérfano.
    const primeroBorrado = await lugar();
    await connection(async c => {
      await c.query('begin');
      try {
        await c.query('set local role authenticated');
        await c.query("select set_config('request.jwt.claim.sub',$1,true)", [autora]);
        await c.query('select public.borrar_lugar($1)', [primeroBorrado]);
        await query("set lock_timeout='150ms'");
        await expectError(() => evento(primeroBorrado, otra), '55P03', 'INSERT espera al borrado concurrente');
        await c.query('commit');
      } finally { await c.query('rollback'); await query('set lock_timeout=0'); }
    });
    await expectError(() => evento(primeroBorrado, otra), '23503', 'tras borrar no se puede insertar un huérfano');
  } finally {
    await query('delete from public.eventos where lugar_id=any($1::uuid[])', [lugares]);
    await query('delete from public.lugares where id=any($1::uuid[])', [lugares]);
    await query('delete from auth.users where id=any($1::uuid[])', [[autora, otra, admin]]);
    await query("delete from public.admin_correos where correo='ol257-borrado-admin@example.com'");
  }
}
