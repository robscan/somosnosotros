// OL-275: contrato público de los sellos y del carril. Datos sintéticos, transacción aislada.
const id = (n) => `00000000-0000-4000-8000-00000275${String(n).padStart(4, '0')}`;
const CIUDAD = 'Banco OL275';
const FOTO = 'https://viesoxgrfvftkgpjbnml.supabase.co/storage/v1/object/public/fotos/ol275/prueba.jpg';

export async function run({ as, check, query }) {
  await query('begin');
  try {
    const [admin, autor, ligado, persona, otra] = [9001, 9002, 9003, 9004, 9005].map(id);
    await query("insert into public.admin_correos(correo) values ('ol275-pruebas-admin@local.test')");
    for (const [i, u] of [admin, autor, ligado, persona, otra].entries()) {
      await query('insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now())', [u, i === 0 ? 'ol275-pruebas-admin@local.test' : `ol275-pruebas-${i}@local.test`]);
    }
    for (let n = 1; n <= 30; n++) await query(
      'insert into public.artistas(id,nombre,ciudad,foto,creado_por,visible) values ($1,$2,$3,$4,$5,$6)',
      [id(n), `Artista OL275 ${n}`, n === 7 ? 'Otra OL275' : CIUDAD, n === 5 ? null : FOTO, autor, n !== 6],
    );
    await query('insert into public.artistas_cuentas(artista_id,perfil_id) values ($1,$2)', [id(2), ligado]);
    const novedad = async (n, artista, proveedor, edad, visible = true) => query(
      `insert into public.novedades_artista(id,artista_id,proveedor,url,embed_id,creado_en,visible,publicado_por)
       values ($1,$2,$3,$4,$5,now()-$6::interval,$7,$8)`,
      [id(n), id(artista), proveedor, 'https://prueba.invalid/publicacion', proveedor === 'bandcamp' ? 'album=123' : null, edad, visible, autor],
    );
    await novedad(1001, 1, 'youtube', '4 hours');
    await novedad(1002, 2, 'youtube', '2 hours');
    await novedad(1003, 2, 'soundcloud', '1 hour');
    await novedad(1004, 2, 'vimeo', '0 hours', false);
    await novedad(1005, 4, 'youtube', '1 hour');
    await novedad(1006, 5, 'soundcloud', '1 hour');
    await novedad(1007, 6, 'youtube', '1 hour');
    await novedad(1008, 7, 'youtube', '1 hour');
    await novedad(1009, 8, 'youtube', '168 hours');
    await novedad(1010, 9, 'youtube', '-1 second');
    await novedad(1011, 10, 'bandcamp', '3 hours');
    await novedad(1012, 11, 'mixcloud', '5 hours');
    await novedad(1013, 12, 'vimeo', '6 hours');
    await novedad(1014, 13, 'youtube', '167 hours 59 minutes 59.999 seconds');
    await query("insert into public.destacados(artista_id,hasta,quitado) values ($1,now()+interval '7 days',false),($2,now()+interval '7 days',true)", [id(1), id(4)]);
    const evento = (await query("insert into public.eventos(titulo,inicio,ciudad,sitio_texto,creado_por) values ('OL275 asistentes',now()+interval '1 day',$1,'Sitio sintético',$2) returning id", [CIUDAD, autor])).rows[0].id;
    await query('insert into public.eventos_artistas(evento_id,artista_id) values ($1,$2)', [evento, id(3)]);
    for (const u of [ligado, persona, otra]) await query("insert into public.asistencias(usuario_id,evento_id,estado) values ($1,$2,'voy')", [u, evento]);
    const leer = async (ids = null) => (await query('select * from public.novedades_recientes_artistas($1,$2)', [CIUDAD, ids])).rows;
    const tira = async () => (await query('select * from public.artistas_destacados_novedades($1)', [CIUDAD])).rows;
    for (const [rol, sujeto] of [['anon', null], ['authenticated', persona], ['authenticated', autor], ['authenticated', ligado], ['authenticated', admin], ['service_role', null]]) await as(rol, sujeto, async () => {
      const resumen = await leer();
      check(resumen.find(n => n.artista_id === id(2))?.novedad_id === id(1003), `${rol}: última visible, incluso con permiso para ver la oculta`);
      check(!resumen.some(n => [6, 7, 8, 9].map(id).includes(n.artista_id)), `${rol}: artista oculto, otra ciudad, frontera exacta y futuro excluidos`);
      check(resumen.some(n => n.artista_id === id(13)) && resumen.some(n => n.artista_id === id(5)), `${rol}: 1ms antes sigue vigente; sin foto conserva sello`);
      check(new Set(resumen.map(n => n.proveedor)).size === 5, `${rol}: los cinco proveedores`);
      check(resumen.every(n => Object.keys(n).sort().join() === 'artista_id,creado_en,novedad_id,proveedor'), `${rol}: solo metadatos mínimos`);
      const t = await tira();
      check(t[0].id === id(1) && t[0].motivo === 'elegido' && t[0].novedad_id === id(1001), `${rol}: elegido con novedad una vez y conserva prioridad`);
      check(t.at(-1).id === id(3) && t.at(-1).motivo === 'asistentes' && t.at(-1).van === 3, `${rol}: tres asistentes conservados después de novedades`);
      check(t.filter(n => n.id === id(1)).length === 1 && new Set(t.map(n => n.id)).size === t.length, `${rol}: ninguna duplicación`);
      check(!t.some(n => [4, 5, 6, 7].map(id).includes(n.id)), `${rol}: veto editorial, foto, visibilidad y ciudad`);
    });
    check((await leer([])).length === 0 && (await leer([id(2), id(2), id(7)])).length === 1, 'lote vacío/repetido y otra ciudad');
    await as('authenticated', admin, () => query('update public.novedades_artista set visible=false where id=$1', [id(1003)]));
    check((await leer([id(2)]))[0]?.novedad_id === id(1002), 'ocultar la más reciente recupera la anterior vigente');
    await as('authenticated', autor, () => query('delete from public.novedades_artista where id=any($1)', [[id(1002), id(1003)]]));
    check((await leer([id(2)])).length === 0, 'borrar las visibles deja sin sello aunque una oculta persista');
    await query('insert into public.bloqueos(quien,bloqueado) values ($1,$2),($3,$2)', [persona, autor, admin]);
    await as('authenticated', persona, async () => {
      check((await leer()).length === 0, 'bloquear emisor quita metadatos de publicaciones');
      check(!(await tira()).some(n => n.motivo === 'novedad') && (await tira()).some(n => n.id === id(1)), 'bloqueo quita grupo de novedades; elegido permanece sin sello');
    });
    await as('authenticated', admin, async () => check((await leer()).length > 0, 'administración conserva la excepción al bloqueo existente'));
    await query('delete from public.bloqueos where quien=any($1)', [[persona, admin]]);
    // Empate exacto: el UUID mayor fija cuál es la última.
    await novedad(1020, 2, 'youtube', '2 hours');
    await novedad(1021, 2, 'soundcloud', '2 hours');
    check((await leer([id(2)]))[0].novedad_id === id(1021), 'empate de creado_en desempata por id descendente');
    // Asistentes con novedad se promueven una vez.
    await novedad(1022, 3, 'vimeo', '1 hour');
    check((await tira()).filter(n => n.id === id(3)).length === 1 && (await tira()).find(n => n.id === id(3)).motivo === 'novedad', 'asistentes más novedad sale una vez como novedad');
    await query('delete from public.novedades_artista where id=$1', [id(1022)]);
    // Diez novedades + un elegido + un asistente: los tres grupos llegan al tope12.
    for (const a of [14, 15, 16, 17, 18]) await novedad(1100 + a, a, 'youtube', '7 hours');
    let t = await tira();
    check(t.length === 12 && t[0].motivo === 'elegido' && t.at(-1).motivo === 'asistentes', 'tope12 mezcla elegidos, diez novedades y asistentes');
    await novedad(1119, 19, 'youtube', '8 hours');
    check((await tira()).length === 12, 'el grupo de novedades no rebasa12');
    // Borde heredado de8: no cambiar la fuente editorial. La novena elección puede entrar por novedad.
    await query('delete from public.destacados where artista_id=any($1)', [Array.from({ length: 30 }, (_, i) => id(i + 1))]);
    for (let a = 20; a <= 28; a++) await query("insert into public.destacados(artista_id,hasta,creado_en) values ($1,now()+interval '7 days',now()-$2*interval '1 minute')", [id(a), a]);
    await novedad(1128, 28, 'youtube', '0 hours');
    t = await tira();
    check(t.filter(n => n.motivo === 'elegido').length === 8 && t.find(n => n.id === id(28))?.motivo === 'novedad', 'noveno elegido fuera de la tira8 entra como novedad');
    await query('update public.artistas set foto=null where id=$1', [id(20)]);
    t = await tira();
    check(t.filter(n => n.motivo === 'elegido').length === 7 && t.find(n => n.id === id(28))?.motivo === 'novedad', 'foto filtrada después de8 conserva la limitación existente');
    await query("insert into public.destacados(artista_id,hasta) values ($1,now()+interval '7 days')", [id(29)]);
    await novedad(1129, 29, 'youtube', '168 hours');
    check((await tira()).find(n => n.id === id(29))?.motivo === 'elegido' && !(await tira()).find(n => n.id === id(29))?.novedad_id, 'al vencer la novedad un elegido permanece sin sello');
    const { rows: funciones } = await query(`select prosecdef,provolatile,proconfig,
      not exists(select 1 from aclexplode(proacl) where grantee=0 and privilege_type='EXECUTE') as sin_public
      from pg_proc where oid in ('public.novedades_recientes_artistas(text,uuid[])'::regprocedure,'public.artistas_destacados_novedades(text)'::regprocedure)`);
    check(funciones.length === 2 && funciones.every(f => f.prosecdef && f.provolatile === 's' && f.proconfig?.includes('search_path=""') && f.sin_public), 'definer estable, search_path vacío y sin EXECUTE genérico PUBLIC');
    const permisos = (await query("select has_table_privilege('anon','public.destacados','select') as anon,has_table_privilege('authenticated','public.destacados','select') as persona")).rows[0];
    check(!permisos.anon, 'anon no obtiene SELECT de decisiones editoriales');
    await as('authenticated', persona, async () => check((await query('select id from public.destacados')).rowCount === 0, 'persona no administra decisiones: RLS conserva el cierre'));
  } finally { await query('rollback'); }
}
