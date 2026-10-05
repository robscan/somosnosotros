import { randomUUID } from "node:crypto";

export async function run({ as, query, check }) {
  const autora = randomUUID(), admin = randomUUID();
  await query("begin");
  try {
    await query("insert into public.admin_correos(correo) values ('ol268-admin@example.com')");
    await query("insert into auth.users(id,email,email_confirmed_at) values ($1,'ol268-autora@example.com',now()),($2,'ol268-admin@example.com',now())", [autora, admin]);
    // Una ciudad sintética exclusiva evita depender de lo que dejaron otros contratos.
    await query(`insert into public.lugares(nombre,tipo,lat,lng,ciudad,zona,creado_por,visible,privado)
      values ('OL268 público A','otro',20,-100,'OL268 Pública','America/Mexico_City',$1,true,false),
      ('OL268 público B','otro',22,-102,'OL268 Pública','America/Mexico_City',$1,true,false),
      ('OL268 oculto admin','otro',80,80,'OL268 Oculta','America/Mexico_City',$2,false,false),
      ('OL268 reservado','otro',80,80,'OL268 Privada','America/Mexico_City',$1,true,true)`, [autora, admin]);
    await query(`insert into public.eventos(titulo,inicio,fin,ciudad,zona,creado_por,visible,sitio_texto)
      select 'OL268 evento '||n,now()-interval '1 hour',now()+interval '1 day','OL268 Pública','America/Mexico_City',$1,true,'Sitio sintético'
      from generate_series(1,5001) n`, [autora]);
    await query(`insert into public.eventos(titulo,inicio,fin,ciudad,zona,creado_por,visible,sitio_texto)
      values ('OL268 límite exacto',now()-interval '1 hour',now(),'OL268 Pública','America/Mexico_City',$1,true,'Sitio'),
      ('OL268 vencido',now()-interval '1 hour',now()-interval '1 microsecond','OL268 Vencida','America/Mexico_City',$1,true,'Sitio'),
      ('OL268 oculto',now(),now()+interval '1 day','OL268 Oculta','America/Mexico_City',$1,false,'Sitio')`, [autora]);
    await query(`insert into public.artistas(nombre,ciudad,creado_por,visible)
      select 'OL268 artista '||n,'OL268 Pública',$1,true from generate_series(1,5001) n`, [autora]);
    await query("insert into public.artistas(nombre,ciudad,creado_por,visible) values ('OL268 artista oculto','OL268 Oculta',$1,false)", [autora]);

    for (const [rol, sujeto] of [['anon', null], ['authenticated', autora], ['authenticated', admin], ['service_role', null]]) {
      await as(rol, sujeto, async () => {
        const ciudades = (await query('select public.ciudades_agregadas() as datos')).rows[0].datos;
        const grupo = ciudades.find(c => c.ciudad === 'OL268 Pública');
        check(grupo?.lugares === 2 && grupo?.eventos === 5002, `${rol}/${sujeto === admin ? 'admin' : 'público'}: más de 5000 eventos y frontera inclusiva sin recorte`, grupo);
        check(grupo?.lat_suma === 42 && grupo?.lng_suma === -202, 'centro usa exclusivamente lugares públicos', grupo);
        check(!ciudades.some(c => ['OL268 Privada', 'OL268 Oculta', 'OL268 Vencida'].includes(c.ciudad)), 'agregado no publica ocultos, reservados ni vencidos');
        check(ciudades.every(c => Object.keys(c).sort().join() === 'ciudad,ev_lat_suma,ev_lng_suma,eventos,eventos_con_punto,lat_suma,lng_suma,lugares,zona'), 'solo expone el contrato agregado, sin identificadores ni direcciones');
        const artistas = (await query('select public.ciudades_artistas_agregadas() as datos')).rows[0].datos;
        check(artistas.find(c => c.ciudad === 'OL268 Pública')?.artistas === 5001 && !artistas.some(c => c.ciudad === 'OL268 Oculta'), 'artistas completos y visibles incluso para admin');
        check(artistas.every(c => Object.keys(c).sort().join() === 'artistas,ciudad'), 'artistas sin datos individuales');
      });
    }
    // La terminación sin fin explícito debe proceder de la columna canónica, en cada zona.
    for (const zona of ['America/Mexico_City', 'America/New_York', 'Asia/Tokyo']) {
      const ciudad = `OL268 ${zona}`;
      const { rows: [evento] } = await query(`insert into public.eventos(titulo,inicio,fin,ciudad,zona,creado_por,visible,sitio_texto)
        values ('OL268 sin fin',now(),null,$1,$2,$3,true,'Sitio') returning termina`, [ciudad, zona, autora]);
      await as('anon', null, async () => {
        const leer = async corte => (await query('select public.ciudades_agregadas($1) as datos', [corte])).rows[0].datos.find(c => c.ciudad === ciudad)?.eventos ?? 0;
        check(await leer(evento.termina) === 1, `medianoche local inclusiva: ${zona}`);
        check(await leer(new Date(+evento.termina + 1)) === 0, `después de medianoche local: ${zona}`);
      });
    }
    // Política restrictiva sintética demuestra que invoker no salta RLS aunque una fila sea visible.
    await query("create policy ol268_prueba_rls on public.eventos as restrictive for select to anon using (ciudad <> 'OL268 Pública')");
    await query("create policy ol268_prueba_rls on public.artistas as restrictive for select to anon using (ciudad <> 'OL268 Pública')");
    await as('anon', null, async () => {
      check((await query('select public.ciudades_agregadas() as datos')).rows[0].datos.find(c => c.ciudad === 'OL268 Pública')?.eventos === 0, 'ciudades obedece RLS del invocador');
      check(!(await query('select public.ciudades_artistas_agregadas() as datos')).rows[0].datos.some(c => c.ciudad === 'OL268 Pública'), 'artistas obedece RLS del invocador');
    });
    const { rows: funciones } = await query(`select proname,prosecdef,provolatile,proconfig,
      not exists(select 1 from aclexplode(proacl) where grantee=0 and privilege_type='EXECUTE') as sin_public
      from pg_proc where oid in ('public.ciudades_agregadas(timestamptz)'::regprocedure,'public.ciudades_artistas_agregadas()'::regprocedure)`);
    check(funciones.length === 2 && funciones.every(f => !f.prosecdef && f.provolatile === 's' && f.proconfig?.includes('search_path=""') && f.sin_public), 'ambas RPC invoker, estables, sin search_path implícito ni execute PUBLIC', funciones);
  } finally { await query('rollback'); }
}
