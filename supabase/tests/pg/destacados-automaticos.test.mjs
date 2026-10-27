// OL-459: destacados automáticos de eventos por «Voy», «Me interesa» o vistas, y el conteo de vistas sin datos personales.
// Datos sintéticos en una transacción que se deshace al final.
const id = (n) => `00000000-0000-4000-8000-00000459${String(n).padStart(4, '0')}`;
const CIUDAD = 'Banco OL459';
const OTRA = 'Banco OL459 otra';

export async function run({ as, check, query }) {
  await query('begin');
  try {
    const [admin, autor, p1, p2, p3, p4] = [9001, 9002, 9003, 9004, 9005, 9006].map(id);
    await query("insert into public.admin_correos(correo) values ('ol459-pruebas-admin@local.test')");
    for (const [i, u] of [admin, autor, p1, p2, p3, p4].entries()) {
      await query('insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now())', [u, i === 0 ? 'ol459-pruebas-admin@local.test' : `ol459-pruebas-${i}@local.test`]);
    }
    const evento = async (n, inicio, ciudad = CIUDAD, extra = {}) => (await query(
      `insert into public.eventos(id,titulo,inicio,ciudad,sitio_texto,sitio_lat,sitio_lng,creado_por,visible)
       values ($1,$2,now()+$3::interval,$4,'Sitio sintético',22.15,-100.98,$5,$6) returning id`,
      [id(n), `Evento OL459 ${String(n).padStart(2, '0')}`, inicio, ciudad, autor, extra.visible ?? true],
    )).rows[0].id;
    const asistir = (u, n, estado) => query('insert into public.asistencias(usuario_id,evento_id,estado) values ($1,$2,$3)', [u, id(n), estado]);
    const vista = (n, visitante, usuario = null) => as('service_role', null, async () =>
      (await query('select public.contar_vista_evento($1,$2,$3) as conto', [id(n), visitante, usuario])).rows[0].conto);
    const visitante = (k) => `visitante-ol459-${String(k).padStart(4, '0')}`;
    const tira = async (tipo = 'eventos', ciudad = CIUDAD) => (await query('select * from public.tira_destacados($1,$2)', [tipo, ciudad])).rows;
    const sale = (t, n) => t.find((r) => r.id === id(n));

    await evento(1, '2 days');   // 1 Voy: entra
    await evento(2, '2 days');   // 1 Me interesa: entra
    await evento(3, '2 days');   // 5 vistas: no
    await evento(4, '2 days');   // 6 vistas: entra
    await evento(5, '2 days');   // 3 Voy pero quitado: no
    await evento(6, '-2 days');  // pasado con Voy: no
    await evento(7, '2 days');   // solo el Voy de quien lo publicó: no
    await evento(8, '2 days');   // solo el Voy de la administración: no
    await evento(9, '5 days');   // elegido sin señales: entra primero
    await evento(10, '1 day');   // 1 Me interesa, más cercano que el 2: va antes
    await evento(11, '2 days', OTRA); // otra ciudad con Voy: no sale aquí
    await evento(12, '2 days', CIUDAD, { visible: false }); // oculto con Voy: no

    await asistir(p1, 1, 'voy');
    await asistir(p1, 2, 'me_interesa');
    for (const u of [p1, p2, p3]) await asistir(u, 5, 'voy');
    await asistir(p1, 6, 'voy');
    await asistir(autor, 7, 'voy');
    await asistir(admin, 8, 'voy');
    await asistir(p2, 10, 'me_interesa');
    await asistir(p1, 11, 'voy');
    await asistir(p1, 12, 'voy');
    await query("insert into public.destacados(evento_id,quitado) values ($1,true)", [id(5)]);
    await query("insert into public.destacados(evento_id) values ($1)", [id(9)]);

    // Vistas: cinco visitantes distintos al 3; seis al 4 (uno repite el mismo día y no cuenta dos veces).
    for (let k = 1; k <= 5; k++) check(await vista(3, visitante(k)) === true, `vista ${k} del evento 3 cuenta`);
    for (let k = 1; k <= 6; k++) await vista(4, visitante(k));
    check(await vista(4, visitante(1)) === false, 'el mismo visitante el mismo día no cuenta dos veces');
    // Con cuenta: la de la persona cuenta; la de quien lo publicó y la de la administración no.
    check(await vista(3, p4, p4) === true, 'una persona con cuenta cuenta una vez');
    check(await vista(3, p4, p4) === false, 'y no dos el mismo día');
    check(await vista(4, autor, autor) === false, 'quien publicó el evento no cuenta');
    check(await vista(4, admin, admin) === false, 'la administración no cuenta');
    check(await vista(6, visitante(1)) === false, 'un evento que ya pasó no cuenta vistas');
    check(await vista(12, visitante(1)) === false, 'un evento oculto no cuenta vistas');
    check(await vista(4, 'corto') === false && await vista(4, "x'; drop table--") === false && await vista(4, null) === false, 'un visitante inválido no cuenta');
    // El evento 3 queda con 6 vistas (5 anónimas + 1 con cuenta) y entra; para el «5 no» se usa el 13 con cinco exactas.
    await evento(13, '2 days');
    for (let k = 1; k <= 5; k++) await vista(13, visitante(k));
    const { rows: n } = await query('select evento_id, count(*)::int as n from public.vistas_evento where evento_id = any($1::uuid[]) group by 1', [[id(3), id(4), id(13)]]);
    const vistas = Object.fromEntries(n.map((r) => [r.evento_id, r.n]));
    check(vistas[id(3)] === 6 && vistas[id(4)] === 6 && vistas[id(13)] === 5, 'las vistas guardadas: 6, 6 y 5', vistas);
    const { rows: claves } = await query('select clave from public.vistas_evento where evento_id=$1', [id(3)]);
    check(claves.every((r) => /^[0-9a-f]{64}$/.test(r.clave) && !r.clave.includes(p4.replaceAll('-', ''))), 'la clave es un resumen: no guarda la cuenta ni la cookie');
    const { rows: cols } = await query("select column_name from information_schema.columns where table_schema='public' and table_name='vistas_evento' order by ordinal_position");
    check(cols.map((r) => r.column_name).join() === 'evento_id,dia,clave,origen,medio', 'la tabla de vistas solo guarda evento, día, clave y, desde OL-461, la red y el medio del enlace');

    for (const [rol, sujeto] of [['anon', null], ['authenticated', p1], ['authenticated', admin], ['service_role', null]]) await as(rol, sujeto, async () => {
      const t = await tira();
      check(sale(t, 1)?.motivo === 'asistentes' && sale(t, 1).van === 1, `${rol}: 1 Voy entra (motivo asistentes, van 1)`);
      check(sale(t, 2)?.motivo === 'interes' && sale(t, 2).van === 0, `${rol}: 1 Me interesa entra (motivo interes)`);
      check(!sale(t, 13), `${rol}: 5 vistas no entran`);
      check(sale(t, 4)?.motivo === 'vistas', `${rol}: 6 vistas entran (motivo vistas)`);
      check(sale(t, 3)?.motivo === 'vistas', `${rol}: 5 anónimas y 1 con cuenta son 6`);
      check(!sale(t, 5), `${rol}: quitado no sale aunque tenga 3 Voy`);
      check(!sale(t, 6), `${rol}: pasado no sale`);
      check(!sale(t, 7), `${rol}: el Voy de quien lo publicó no cuenta`);
      check(!sale(t, 8), `${rol}: el Voy de la administración no cuenta`);
      check(!sale(t, 11) && !sale(t, 12), `${rol}: otra ciudad y oculto no salen`);
      check(sale(t, 9)?.motivo === 'elegido', `${rol}: elegido sale`);
      // Orden: elegido (9); Voy (1: 20 puntos); Me interesa (10 y 2: 10 puntos, el 10 es antes); vistas (3 y 4: 6 puntos, misma fecha).
      const orden = t.map((r) => r.id);
      check(orden.slice(0, 4).join() === [id(9), id(1), id(10), id(2)].join(), `${rol}: elegidos, luego Voy, luego Me interesa por cercanía`, t.map((r) => r.id.slice(-4)));
      check(new Set(orden.slice(4)).size === 2 && orden.slice(4).every((x) => [id(3), id(4)].includes(x)), `${rol}: al final, lo que entra por vistas`);
      check(Object.keys(t[0]).join() === 'id,motivo,hasta,van', `${rol}: mismas columnas`);
    });

    // Lugares y artistas sin cambio: un lugar con 1 Voy en su evento no entra; con 3 personas sí.
    const lugar = (await query("insert into public.lugares(nombre,tipo,ciudad,direccion,lat,lng,creado_por,visible) values ('Lugar OL459','foro',$1,'Calle sintética 1',22.15,-100.98,$2,true) returning id", [CIUDAD, autor])).rows[0].id;
    await query('update public.eventos set lugar_id=$1 where id=$2', [lugar, id(1)]);
    check(!(await tira('lugares')).some((r) => r.id === lugar), 'lugar con 1 Voy no entra (sigue en 3 personas)');
    await asistir(p2, 1, 'voy'); await asistir(p3, 1, 'voy');
    check((await tira('lugares')).find((r) => r.id === lugar)?.motivo === 'asistentes', 'lugar con 3 personas entra como antes');

    // Tope de 12 (OL-460): ya entran 6 (9, 1, 10, 2, 3 y 4); con 7 más son 13 candidatos y salen 12.
    for (let n = 20; n < 27; n++) { await evento(n, '3 days'); await asistir(p4, n, 'voy'); }
    const t = await tira();
    check(t.length === 12 && t[0].id === id(9), 'tope de 12 con 13 candidatos y el elegido primero', t.length);
    // Sale el de menos puntos: el 3 o el 4 (6 visitas); el resto (Voy y Me interesa) se queda.
    check([id(1), id(2), id(10), ...Array.from({ length: 7 }, (_, i) => id(20 + i))].every((x) => t.some((r) => r.id === x)) && t.filter((r) => r.motivo === 'vistas').length === 1, 'con 13 candidatos queda fuera uno de los de menos puntos');

    // Permisos: nadie fuera del servidor cuenta vistas ni lee las tablas.
    for (const [rol, sujeto] of [['anon', null], ['authenticated', p1], ['authenticated', admin]]) {
      for (const [sql, que] of [
        ["select public.contar_vista_evento($1,'visitante-ol459-9999',null)", 'contar_vista_evento'],
        ['select count(*) from public.vistas_evento where evento_id=$1', 'vistas_evento'],
        ['select count(*) from public.vistas_sal where $1::uuid is not null', 'vistas_sal'],
      ]) {
        // A mano y no con `as`: el error aborta la transacción hasta volver al punto de guardado (que también deshace el rol).
        await query('savepoint permiso');
        let negado = false;
        try {
          await query("select set_config('request.jwt.claim.sub', $1, true)", [sujeto ?? '']);
          await query(`set local role ${rol}`);
          await query(sql, [id(4)]);
        } catch (e) { negado = e.code === '42501'; }
        await query('rollback to savepoint permiso');
        await query('reset role');
        check(negado, `${rol}${sujeto === admin ? ' (admin)' : ''}: sin permiso sobre ${que}`);
      }
    }
    const { rows: f } = await query(`select prosecdef, proconfig,
      not exists(select 1 from aclexplode(proacl) where grantee=0 and privilege_type='EXECUTE') as sin_public
      from pg_proc where oid='public.contar_vista_evento(uuid,text,uuid)'::regprocedure`);
    check(f[0]?.prosecdef && f[0].proconfig?.includes('search_path=""') && f[0].sin_public, 'contar_vista_evento: definer, search_path vacío, sin PUBLIC');
    const { rows: r } = await query("select relrowsecurity from pg_class where oid in ('public.vistas_evento'::regclass,'public.vistas_sal'::regclass)");
    check(r.length === 2 && r.every((x) => x.relrowsecurity), 'las dos tablas con RLS');
  } finally { await query('rollback'); }
}
