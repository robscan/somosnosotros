import { randomUUID } from "node:crypto";

export async function run({ as, query, check }) {
  const [autora, otra, admin] = [randomUUID(), randomUUID(), randomUUID()];
  // now() fijo durante toda la matriz permite probar límites exactos sin temporizadores.
  await query('begin');
  try {
    await query("insert into public.admin_correos(correo) values ('ol257-ventana-admin@example.com')");
    await query("insert into auth.users(id,email,email_confirmed_at) values ($1,'ol257-ventana-autora@example.com',now()),($2,'ol257-ventana-otra@example.com',now()),($3,'ol257-ventana-admin@example.com',now())", [autora, otra, admin]);
    const leer = (rol, usuario, id) => as(rol, usuario, async () => (await query('select direccion,lat,lng,indicaciones from public.eventos_sitio_privado where evento_id=$1', [id])).rowCount === 1);
    const crear = async ({ fin = '1 hour', revelar = '-1 hour', visible = true, reservado = true } = {}) => {
      const id = randomUUID();
      await query("insert into public.eventos(id,titulo,inicio,fin,creado_por,visible,sitio_texto,sitio_reservado,sitio_revelar_desde) values ($1,'Ventana OL257',now()-interval '2 days',now()+$2::interval,$3,$4,'Alias OL257',$5,now()+$6::interval)", [id, fin, autora, visible, reservado, revelar]);
      await query("insert into public.eventos_sitio_privado(evento_id,direccion,lat,lng,indicaciones,revelar_desde) values ($1,'Dirección sintética OL257',22,-100,'Indicaciones sintéticas',now()+$2::interval)", [id, revelar]);
      return id;
    };
    for (const [caso, datos, permitido] of [
      ['antes de revelar', { revelar: '1 second' }, false],
      ['instante de revelación', { revelar: '0 seconds' }, true],
      ['evento en curso', {}, true],
      ['último instante de gracia', { fin: '-01:59:59' }, true],
      ['fin más dos horas exactas', { fin: '-2 hours' }, false],
      ['ventana vencida', { fin: '-3 hours' }, false],
      ['evento oculto', { visible: false }, false],
      ['copia residual de evento público', { reservado: false }, false],
    ]) {
      const id = await crear(datos);
      check(await leer('authenticated', otra, id) === permitido, `tercero: ${caso}`);
      check(!await leer('anon', null, id), `anon no recibe dirección: ${caso}`);
      check(await leer('authenticated', autora, id), `autora conserva consulta: ${caso}`);
      check(await leer('authenticated', admin, id), `admin conserva consulta: ${caso}`);
    }
    const revocable = await crear();
    check(await leer('authenticated', otra, revocable), 'dirección revelada inicialmente accesible');
    await query('update public.eventos set visible=false where id=$1', [revocable]);
    check(!await leer('authenticated', otra, revocable), 'ocultar revoca acceso inmediatamente');
    await query('update public.eventos set visible=true where id=$1', [revocable]);
    await query('insert into public.bloqueos(quien,bloqueado) values ($1,$2)', [otra, autora]);
    check(!await leer('authenticated', otra, revocable), 'no se elude el bloqueo leyendo la tabla privada directamente');
    await query('delete from public.bloqueos where quien=$1', [otra]);
    await query('delete from public.eventos where id=$1', [revocable]);
    check(!await leer('authenticated', otra, revocable), 'eliminar evento elimina su copia reservada');

    // El fin implícito lo calcula eventos.termina en su zona.
    for (const zona of ['America/Mexico_City', 'America/New_York', 'Asia/Tokyo']) {
      for (const dias of [-1, 0]) {
        const id = await crear();
        await query("update public.eventos set zona=$2, fin=null, inicio=timezone($2,date_trunc('day',timezone($2,now()))+make_interval(days=>$3)) where id=$1", [id, zona, dias]);
        const { permitida, fin_correcto } = (await query("select now()<termina+interval '2 hours' as permitida, termina=timezone(zona,date_trunc('day',timezone(zona,inicio))+interval '1 day') as fin_correcto from public.eventos where id=$1", [id])).rows[0];
        check(fin_correcto && await leer('authenticated', otra, id) === permitida, `sin fin respeta medianoche local + 2 h: ${zona}, día ${dias}`);
      }
    }
    // Lugares ocultos del admin y privados reutilizables no son copias de evento.
    for (const propietario of [autora, admin]) {
      const id = randomUUID();
      await query("insert into public.lugares(id,nombre,tipo,direccion,lat,lng,creado_por,visible,privado) values ($1,'Lugar reservado independiente','otro','Dirección del lugar',22,-100,$2,false,true)", [id, propietario]);
      const vencido = await crear({ fin: '-3 hours' });
      check(!await leer('authenticated', otra, vencido), 'vencer copia de evento revoca tercero');
      const lugar = await as('authenticated', propietario, () => query('select direccion,visible,privado from public.lugares where id=$1', [id]));
      check(lugar.rows[0]?.direccion === 'Dirección del lugar' && !lugar.rows[0].visible && lugar.rows[0].privado, 'lugar propio/administrativo oculto se conserva sin publicar ni caducar');
    }
  } finally { await query('rollback'); }
}
