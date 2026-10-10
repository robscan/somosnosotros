import { randomUUID } from 'node:crypto';

// OL-360: eventos.colores_cartel (cuatro #rrggbb o null) y su limpieza al cambiar el cartel.
const STORAGE = 'https://viesoxgrfvftkgpjbnml.supabase.co/storage/v1/object/public/fotos/';
const COLORES = '["#0b1340","#2d3fd6","#a43fd6","#48c6ef"]';

export async function run({ query, check, as, expectError }) {
  const persona = randomUUID(), lugar = randomUUID(), evento = randomUUID();
  await query("insert into auth.users(id,email) values ($1,'colores-persona@local.test')", [persona]);
  const leer = async () => (await query('select colores_cartel c from public.eventos where id=$1', [evento])).rows[0].c;
  await as('authenticated', persona, async () => {
    await query("insert into public.lugares(id,nombre,tipo,lat,lng,creado_por) values ($1,'Lugar colores','foro',22.13,-100.98,$2)", [lugar, persona]);
    await query("insert into public.eventos(id,titulo,lugar_id,inicio,creado_por,imagen) values ($1,'Evento colores',$2,now()+interval '1 day',$3,$4)", [evento, lugar, persona, `${STORAGE}a.jpg`]);
    check((await leer()) === null, 'un evento nuevo nace sin colores (null = sin calcular)');
    await query('update public.eventos set colores_cartel=$1::jsonb where id=$2', [COLORES, evento]);
    check(JSON.stringify(await leer()) === COLORES, 'quien publica guarda los colores de su cartel');
    await expectError(() => query(`update public.eventos set colores_cartel='["#000000"]'::jsonb where id=$1`, [evento]), '23514', 'menos de cuatro colores se rechaza');
    await expectError(() => query(`update public.eventos set colores_cartel='["red","#000000","#ffffff","#123456"]'::jsonb where id=$1`, [evento]), '23514', 'un color que no es #rrggbb se rechaza');
    await expectError(() => query(`update public.eventos set colores_cartel='{"a":1}'::jsonb where id=$1`, [evento]), '23514', 'un objeto se rechaza');
    await query("update public.eventos set titulo='Evento colores 2' where id=$1", [evento]);
    check((await leer()) !== null, 'cambiar otra cosa conserva los colores');
    await query('update public.eventos set imagen=$1 where id=$2', [`${STORAGE}b.jpg`, evento]);
    check((await leer()) === null, 'un cartel nuevo sin sus colores deja los colores sin calcular');
    await query('update public.eventos set imagen=$1, colores_cartel=$2::jsonb where id=$3', [`${STORAGE}c.jpg`, COLORES, evento]);
    check((await leer()) !== null, 'un cartel nuevo con sus colores en la misma escritura los guarda');
  });
}
