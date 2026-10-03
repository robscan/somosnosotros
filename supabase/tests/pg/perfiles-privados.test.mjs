import { createECDH, randomBytes, randomUUID } from 'node:crypto';

export async function run({ query, check, as, expectError }) {
  const firmas = ['public.mi_perfil()', 'public.mi_push_activo(text,text)', 'public.activar_mis_avisos_push()'];
  for (const firma of firmas) {
    const f = (await query("select prosecdef,proconfig,has_function_privilege('anon',oid,'execute') anon,has_function_privilege('authenticated',oid,'execute') titular,has_function_privilege('service_role',oid,'execute') servicio from pg_proc where oid=to_regprocedure($1)", [firma])).rows[0];
    check(f?.prosecdef && f.proconfig.includes('search_path=""') && !f.anon && f.titular && !f.servicio,
      `H03: RPC privada, search_path vacío y permiso autenticado: ${firma}`);
    if (!f) return;
  }
  const titular = randomUUID(), otra = randomUUID(), admin = randomUUID();
  await query("insert into public.admin_correos(correo) values ('ol260-admin@example.com')");
  await query("insert into auth.users(id,email) values ($1,'ol260-titular@example.com'),($2,'ol260-otra@example.com'),($3,'ol260-admin@example.com')", [titular,otra,admin]);
  const propia = () => query('select public.mi_perfil() p');
  const endpoint = 'https://fcm.googleapis.com/fcm/send/ol260', token = randomBytes(32).toString('hex');
  const ecdh = createECDH('prime256v1'); ecdh.generateKeys();
  try {
    for (const firma of ['mi_perfil()', 'mi_push_activo()', 'activar_mis_avisos_push()']) {
      await as('anon', null, () => expectError(() => query(`select public.${firma}`), '42501', `anon no usa ${firma}`));
    }
    await as('authenticated', null, () => expectError(propia, '42501', 'sin identidad verificada no obtiene perfil privado'));
    await as('authenticated', titular, async () => {
      const p = (await propia()).rows[0].p;
      check(p.id === titular && p.avisos_push === false && p.novedades_vistas_en === null, 'titular lee preferencias propias');
      check(!(await query('select public.activar_mis_avisos_push() ok')).rows[0].ok, 'sin dispositivo no anuncia activación');
      await query('insert into public.suscripciones_push(endpoint,usuario_id,p256dh,auth) values ($1,$2,$3,$4)', [endpoint,titular,ecdh.getPublicKey().toString('base64url'),randomBytes(16).toString('base64url')]);
      await query("insert into public.dispositivos_apns(token,usuario_id,entorno) values ($1,$2,'sandbox')",[token,titular]);
      check(!(await query('select public.mi_push_activo($1) ok',[endpoint])).rows[0].ok, 'registro no equivale a consentimiento');
      check((await query('select public.activar_mis_avisos_push() ok')).rows[0].ok, 'activa consentimiento propio con dispositivo');
      check((await query('select public.mi_push_activo($1) ok',[endpoint])).rows[0].ok, 'web propia activa');
      check((await query('select public.mi_push_activo(null,$1) ok',[token])).rows[0].ok, 'APNs propio activo');
      check(!(await query('select public.mi_push_activo($1,$2) ok',[endpoint,token])).rows[0].ok, 'ambos identificadores a la vez no confirman estado');
      await query('update public.perfiles set avisos_push=false where id=auth.uid()');
      check(!(await query('select public.mi_push_activo($1) ok',[endpoint])).rows[0].ok, 'revocación apaga el dispositivo conservado');
    });
    for (const actor of [otra, admin]) await as('authenticated', actor, async () => {
      check((await propia()).rows[0].p.id === actor, 'mi_perfil no permite escoger a otra persona, ni al admin');
      check(!(await query('select public.mi_push_activo($1) ok',[endpoint])).rows[0].ok, 'endpoint ajeno no revela pertenencia');
      check(!(await query('select public.mi_push_activo(null,$1) ok',[token])).rows[0].ok, 'token ajeno no revela pertenencia');
    });

    // Ensaya el paso 2 dentro de una transacción reversible. Cuando se publique
    // esa migración estas mismas pruebas se ejecutan con el cierre ya aplicado.
    await query('begin');
    try {
      const columnas = (await query("select quote_ident(attname) n from pg_attribute where attrelid='public.perfiles'::regclass and attnum>0 and not attisdropped order by attnum")).rows.map(r=>r.n).join(',');
      await query('revoke select on public.perfiles from public,anon,authenticated');
      await query(`revoke select (${columnas}) on public.perfiles from public,anon,authenticated`);
      await query('grant select(id,nombre,foto,colonia,bio,rol,reservado) on public.perfiles to anon,authenticated');
      const privadas = ['avisos_correo','avisos_push','avisos_correo_desde','avisos_push_desde','avisos_correo_motivo','avisos_preguntado','novedades_vistas_en','creado_en','actualizado_en'];
      // Cada rechazo necesita savepoint: un error SQL aborta la transacción externa.
      const rechazada = async (sql, valores, texto) => {
        await query('savepoint rechazo');
        try { await expectError(() => query(sql,valores),'42501',texto); }
        finally { await query('rollback to savepoint rechazo'); }
      };
      for (const [rol, actor] of [['anon',null],['authenticated',otra],['authenticated',titular]]) {
        await as(rol,actor,async()=>{
          check((await query('select id,nombre,foto,colonia,bio,rol,reservado from public.perfiles where id=$1',[titular])).rowCount===1, `${rol}: identidad pública disponible`);
          for (const c of privadas) await rechazada(`select ${c} from public.perfiles where id=$1`,[titular],`${rol}: no lee ${c} por tabla`);
          await rechazada('select id from public.perfiles where avisos_push=true',[],`${rol}: no infiere preferencias filtrando`);
          await rechazada('select id from public.perfiles order by novedades_vistas_en',[],`${rol}: no infiere actividad ordenando`);
          await rechazada('select row_to_json(p) from public.perfiles p',[],`${rol}: fila compuesta no elude permisos`);
        });
      }
      await as('authenticated', titular,async()=>{
        check((await propia()).rows[0].p.id===titular, 'sesión funciona con permisos finales');
        await query("update public.perfiles set avisos_correo=true,avisos_correo_desde=now(),avisos_correo_motivo=null,avisos_preguntado=true,novedades_vistas_en=now(),reservado=true where id=auth.uid()");
        const p=(await propia()).rows[0].p;
        check(p.avisos_correo && p.avisos_preguntado && p.novedades_vistas_en && p.reservado,'ajustes, consentimiento y Novedades conservan escrituras propias');
        check((await query('select public.activar_mis_avisos_push() ok')).rows[0].ok,'activar push funciona sin SELECT privado');
        check((await query('select public.mi_push_activo($1) ok',[endpoint])).rows[0].ok,'estado web privado funciona tras cierre');
        check((await query('select public.mi_push_activo(null,$1) ok',[token])).rows[0].ok,'estado APNs privado funciona tras cierre');
        check((await query('update public.perfiles set avisos_push=false where id=$1 returning id',[otra])).rowCount===0,'titular no cambia preferencias ajenas');
      });
      await as('authenticated',admin, async()=>{
        const p=(await query('select public.panel_persona($1) p',[titular])).rows[0].p;
        check(p.id===titular && p.avisos_correo, 'panel admin conserva acceso operativo autorizado');
      });
      await as('authenticated',otra,async()=>check(!(await query('select public.panel_persona($1) p',[titular])).rows[0].p,'panel no revela perfil privado a otra cuenta'));
      const lugar=randomUUID(), evento=randomUUID();
      await query("insert into public.lugares(id,nombre,tipo,direccion,lat,lng,creado_por) values ($1,'Lugar H03','otro','Dirección ficticia',22,-100,$2)",[lugar,otra]);
      await query("insert into public.eventos(id,lugar_id,titulo,inicio,creado_por) values ($1,$2,'Evento H03',now()+interval '1 day',$3)",[evento,lugar,otra]);
      await query("insert into public.asistencias(usuario_id,evento_id,estado) values ($1,$2,'voy')",[titular,evento]);
      await query('insert into public.seguimientos(usuario_id,lugar_id) values ($1,$2)',[titular,lugar]);
      for (const [rol,actor] of [['anon',null],['authenticated',otra],['authenticated',titular],['authenticated',admin]]) {
        await as(rol,actor,async()=>{
          const autorizado=actor===titular || actor===admin;
          check((await query('select a.usuario_id,p.nombre,p.foto from public.asistencias a join public.perfiles p on p.id=a.usuario_id where a.evento_id=$1',[evento])).rowCount===(autorizado?1:0), `${rol}: embed y RLS de asistencia reservada conservados`);
          check((await query('select s.usuario_id from public.seguimientos s where s.lugar_id=$1',[lugar])).rowCount===(autorizado?1:0),`${rol}: RLS de seguimientos usa columnas públicas`);
          check((await query('select e.id,p.nombre from public.eventos e join public.perfiles p on p.id=e.creado_por where e.id=$1',[evento])).rowCount===1,`${rol}: autor público de evento sigue disponible`);
          check((await query('select l.id,p.nombre from public.lugares l join public.perfiles p on p.id=l.creado_por where l.id=$1',[lugar])).rowCount===1,`${rol}: autor público de lugar sigue disponible`);
          check(Number((await query('select n from public.van_por_evento($1)',[[evento]])).rows[0].n)===1,`${rol}: conteo incluye reservas sin revelar identidades`);
          if(rol==='authenticated') {
            check((await query("select id from public.panel_eventos('Evento H03')")).rowCount===(actor===admin?1:0),'panel_eventos invoker conserva autorización sin columnas privadas');
            const conteos=(await query("select public.panel_fichas_conteos('eventos') c")).rows[0].c;
            check(actor===admin?conteos.proximos>=1:conteos===null,'panel_fichas_conteos invoker conserva autorización');
          }
        });
      }
      const invocadoras=(await query("select proname,prosrc from pg_proc where pronamespace='public'::regnamespace and not prosecdef and prosrc like '%perfiles%'")).rows;
      check(invocadoras.every(f=>!/(avisos_(correo|push|preguntado)|novedades_vistas_en)/.test(f.prosrc)), 'inventario: funciones invoker que leen perfiles no piden estado privado');
      const politicas=(await query("select policyname,qual,with_check from pg_policies where schemaname='public' and (qual like '%perfiles%' or with_check like '%perfiles%')")).rows;
      check(politicas.every(p=>!/(avisos_(correo|push|preguntado)|novedades_vistas_en)/.test(`${p.qual} ${p.with_check}`)), 'inventario: políticas que leen perfiles no piden estado privado');
      await as('service_role',null,async()=>{
        check((await query('select avisos_push from public.perfiles where id=$1',[titular])).rows[0].avisos_push,'servicio conserva lectura para worker');
        await query("update public.perfiles set avisos_correo=false,avisos_correo_desde=null,avisos_correo_motivo='baja' where id=$1",[titular]);
        check((await query('select avisos_correo_motivo from public.perfiles where id=$1',[titular])).rows[0].avisos_correo_motivo==='baja','baja y webhook mantienen escritura de servicio');
      });
      await query('alter table public.perfiles add column futura_privada text');
      await as('anon',null,()=>rechazada('select futura_privada from public.perfiles',[],'columnas futuras no se vuelven públicas automáticamente'));
    } finally { await query('rollback'); }
  } finally {
    await query('delete from auth.users where id=any($1::uuid[])',[[titular,otra,admin]]);
    await query("delete from public.admin_correos where correo='ol260-admin@example.com'");
  }
}
