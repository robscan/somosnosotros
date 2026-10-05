// OL-285: una novedad posterior al «quitado» lo levanta. Datos sintéticos, transacción aislada.
const id = (n) => `00000000-0000-4000-8000-00000285${String(n).padStart(4, '0')}`;
const CIUDAD = 'Banco OL285';
const FOTO = 'https://viesoxgrfvftkgpjbnml.supabase.co/storage/v1/object/public/fotos/ol285/prueba.jpg';

export async function run({ as, check, query }) {
  await query('begin');
  try {
    const [admin, autor, p1, p2, p3] = [9001, 9002, 9003, 9004, 9005].map(id);
    await query("insert into public.admin_correos(correo) values ('ol285-pruebas-admin@local.test')");
    for (const [i, u] of [admin, autor, p1, p2, p3].entries()) {
      await query('insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now())', [u, i === 0 ? 'ol285-pruebas-admin@local.test' : `ol285-pruebas-${i}@local.test`]);
    }
    for (let n = 1; n <= 40; n++) await query(
      'insert into public.artistas(id,nombre,ciudad,foto,creado_por,visible) values ($1,$2,$3,$4,$5,true)',
      [id(n), `Artista OL285 ${String(n).padStart(2, '0')}`, CIUDAD, FOTO, autor],
    );
    const novedad = (n, artista, edad, visible = true) => query(
      `insert into public.novedades_artista(id,artista_id,proveedor,url,creado_en,visible,publicado_por)
       values ($1,$2,'youtube','https://prueba.invalid/publicacion',now()-$3::interval,$4,$5)`,
      [id(2000 + n), id(artista), edad, visible, autor],
    );
    // Fecha del quitado = creado_en de su renglón (lo que fija cambiar_destacado). hasta: vigente o vencido.
    const quitar = (artista, edad, vigente = true) => query(
      `insert into public.destacados(artista_id,quitado,hasta,creado_en)
       values ($1,true,now()${vigente ? "+interval '7 days'" : "-interval '1 day'"},now()-$2::interval)`,
      [id(artista), edad],
    );
    const tira = async () => (await query('select * from public.artistas_destacados_novedades($1)', [CIUDAD])).rows;
    const sale = (t, n) => t.find((r) => r.id === id(n));

    // 1 quitado vigente, novedad ANTERIOR al quitado: sigue vetado.
    await quitar(1, '1 hour'); await novedad(1, 1, '2 hours');
    // 2 quitado vigente, novedad POSTERIOR: vuelve por novedad.
    await quitar(2, '3 hours'); await novedad(2, 2, '1 hour');
    // 3 quitado y novedad en el mismo instante: el quitado gana (>=).
    await quitar(3, '2 hours'); await novedad(3, 3, '2 hours');
    // 4 quitado vencido con novedad: sale como hoy.
    await quitar(4, '10 days', false); await novedad(4, 4, '30 minutes');
    // 5 novedad posterior al quitado pero con 168 horas exactas: ya no es vigente.
    await quitar(5, '200 hours'); await novedad(5, 5, '168 hours');
    // 6 elegido con novedad: sigue en su grupo, una sola vez.
    await query("insert into public.destacados(artista_id,hasta) values ($1,now()+interval '7 days')", [id(6)]); await novedad(6, 6, '1 hour');
    // 7 quitado vigente + tres asistentes + novedad posterior: sale una vez, por novedad.
    await quitar(7, '5 hours'); await novedad(7, 7, '4 hours');
    // 8 quitado vigente + tres asistentes, sin novedad: no sale (tampoco por asistentes).
    await quitar(8, '5 hours');
    // 9 dos novedades: la vieja anterior al quitado y la nueva posterior; cuenta la más reciente.
    await quitar(9, '6 hours'); await novedad(9, 9, '10 hours'); await novedad(10, 9, '2 hours');
    // 10 la novedad posterior está oculta: no levanta el quitado; la visible es anterior.
    await quitar(10, '6 hours'); await novedad(11, 10, '8 hours'); await novedad(12, 10, '1 hour', false);
    // 11 control: sin quitado, novedad como hoy.
    await novedad(13, 11, '3 hours');
    const evento = (await query("insert into public.eventos(titulo,inicio,ciudad,sitio_texto,creado_por) values ('OL285 asistentes',now()+interval '1 day',$1,'Sitio sintético',$2) returning id", [CIUDAD, autor])).rows[0].id;
    for (const a of [7, 8]) await query('insert into public.eventos_artistas(evento_id,artista_id) values ($1,$2)', [evento, id(a)]);
    for (const u of [p1, p2, p3]) await query("insert into public.asistencias(usuario_id,evento_id,estado) values ($1,$2,'voy')", [u, evento]);

    for (const [rol, sujeto] of [['anon', null], ['authenticated', p1], ['authenticated', admin], ['service_role', null]]) await as(rol, sujeto, async () => {
      const t = await tira();
      check(!sale(t, 1), `${rol}: quitado vigente sin novedad posterior no sale`);
      const dos = sale(t, 2);
      check(dos && dos.motivo === 'novedad' && dos.novedad_id === id(2002), `${rol}: novedad posterior al quitado lo levanta, sale por novedad`);
      check(!sale(t, 3), `${rol}: novedad y quitado en el mismo instante: el quitado gana`);
      check(sale(t, 4)?.motivo === 'novedad', `${rol}: quitado vencido sale como hoy`);
      check(!sale(t, 5), `${rol}: novedad posterior de 168 horas exactas ya no es vigente`);
      check(sale(t, 6)?.motivo === 'elegido' && sale(t, 6).novedad_id === id(2006), `${rol}: el elegido sigue en su grupo con su sello`);
      check(sale(t, 7)?.motivo === 'novedad' && sale(t, 7).van === 0, `${rol}: quitado con asistentes y novedad posterior sale por novedad`);
      check(!sale(t, 8), `${rol}: quitado con asistentes y sin novedad no sale`);
      check(sale(t, 9)?.novedad_id === id(2010), `${rol}: cuenta la novedad vigente más reciente (posterior al quitado)`);
      check(!sale(t, 10), `${rol}: una novedad oculta no levanta el quitado`);
      check(sale(t, 11)?.motivo === 'novedad', `${rol}: sin quitado, novedad como hoy`);
      check(new Set(t.map((r) => r.id)).size === t.length, `${rol}: sin duplicados`);
      check(t[0].id === id(6) && t[0].motivo === 'elegido', `${rol}: elegido primero`);
      check(t.map((r) => r.motivo).join() === ['elegido', ...Array(t.length - 1).fill('novedad')].join(), `${rol}: orden de grupos conservado`);
      check(Object.keys(t[0]).join() === 'id,motivo,hasta,van,novedad_id,proveedor,novedad_creado_en', `${rol}: mismas columnas`);
    });

    // La administración quita otra vez (cambiar_destacado fecha el renglón con now()): el veto vuelve.
    await as('authenticated', admin, async () => {
      await query("select public.cambiar_destacado('artistas',$1,'quitado')", [id(2)]);
      const fecha = (await query('select creado_en = now() as ahora from public.destacados where artista_id=$1 and quitado', [id(2)])).rows[0];
      check(fecha?.ahora === true, 'cambiar_destacado fecha el quitado con now()');
      check(!sale(await tira(), 2), 'quitar de nuevo después de la novedad vuelve a vetar');
      // Deshacer repone la fecha anterior (3 horas): la novedad de hace 1 hora vuelve a levantar.
      await query("select public.cambiar_destacado('artistas',$1,'quitado',null,now()-interval '3 hours')", [id(2)]);
      check(sale(await tira(), 2)?.motivo === 'novedad', 'deshacer repone la fecha del quitado y la novedad posterior vuelve a levantarlo');
    });

    // Novedad nueva después de un quitado reciente: levanta; el artista no se duplica.
    await novedad(20, 1, '10 minutes'); // el artista 1 estaba vetado con quitado de hace 1 hora
    let t = await tira();
    check(t.filter((r) => r.id === id(1)).length === 1 && sale(t, 1).motivo === 'novedad', 'artista vetado publica una novedad nueva y vuelve una sola vez');

    // Tope de 12 con quitados levantados + novedades normales + elegido.
    for (let a = 12; a <= 30; a++) { await quitar(a, '9 hours'); await novedad(100 + a, a, '1 hour'); }
    t = await tira();
    check(t.length === 12 && t[0].motivo === 'elegido' && new Set(t.map((r) => r.id)).size === 12, 'tope de 12 sin duplicados con quitados levantados');
    const { rows: f } = await query(`select prosecdef,provolatile,proconfig,
      not exists(select 1 from aclexplode(proacl) where grantee=0 and privilege_type='EXECUTE') as sin_public
      from pg_proc where oid='public.artistas_destacados_novedades(text)'::regprocedure`);
    check(f.length === 1 && f[0].prosecdef && f[0].provolatile === 's' && f[0].proconfig?.includes('search_path=""') && f[0].sin_public, 'definer estable, search_path vacío y sin EXECUTE genérico PUBLIC');
  } finally { await query('rollback'); }
}
