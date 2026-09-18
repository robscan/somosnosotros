const FOUNDER = "00000000-0000-4000-8000-0000000000b1";
const ADMIN = "00000000-0000-4000-8000-0000000000b2";
const OWNER = "00000000-0000-4000-8000-0000000000b3";
const OTHER = "00000000-0000-4000-8000-0000000000b4";
const DELETED = "00000000-0000-4000-8000-0000000000b5";

// Matriz independiente del SQL de migracion: identidad exacta, modo y acceso cliente.
const GROUPS = [
  ["public", false, [
    "artistas_con_nombre(text)", "detalles_de_disciplina(text,text,integer)",
    "disciplinas_con_artistas(text)", "distancia_m(double precision,double precision,double precision,double precision)",
    "es_admin()", "gestiona_evento(uuid)", "lugares_con_nombre(text)",
    "lugares_parecidos(text,double precision,double precision,uuid)", "normalizar_nombre(text)",
    "push_endpoint_permitido(text)", "zona_valida(text)",
  ]],
  ["public", true, [
    "cuenta_seguidores(uuid,uuid)", "gestiona_artista(uuid)", "gestiona_lugar(uuid)",
    "tira_destacados(text,text)", "van_por_evento(uuid[])",
  ]],
  ["session", false, [
    "inicio_del_mes()", "panel_artistas(text,text,integer,integer)", "panel_destacados(text)",
    "panel_eventos(text,text,integer,integer)", "panel_fichas_conteos(text)",
    "panel_lugares(text,text,integer,integer)", "panel_pendientes()",
  ]],
  ["session", true, [
    "apartar_lectura_de_cartel()", "borrar_mi_cuenta()",
    "cambiar_destacado(text,uuid,text,timestamp with time zone,timestamp with time zone)",
    "cambiar_rol(uuid,text)", "dar_mas_lecturas(uuid)", "marcar_visto()", "mi_cupo_de_cartel()",
    "panel_comunidad()", "panel_correo(uuid)", "panel_persona(uuid)",
    "panel_personas_conteos()", "panel_personas(text,text,integer,integer)", "panel_resumen()",
  ]],
  ["internal", false, [
    "artista_sin_duplicado()", "poner_nombre_orden()", "proteger_autor_y_visible()", "tocar_actualizado_en()",
    "tope_de_cartel_base()", "sin_pasar(timestamp with time zone,timestamp with time zone)",
  ]],
  ["internal", true, [
    "crear_perfil()", "eventos_zona_del_lugar()", "limitar_suscripciones_push()",
    "lugares_zona_a_sus_eventos()", "proteger_rol()", "es_admin_de_origen()",
    "guardar_indicadores()", "indicadores_ahora()", "rol_en(uuid,timestamp with time zone)",
  ]],
];

export async function run({ as, check, expectError, query }) {
  const start = Date.now();
  for (const [access, definer, signatures] of GROUPS) {
    for (const signature of signatures) {
      const { rows: [p] } = await query(`
        select p.prosecdef, p.proconfig,
          has_function_privilege('anon', p.oid, 'execute') as anon,
          has_function_privilege('authenticated', p.oid, 'execute') as authenticated,
          has_function_privilege('service_role', p.oid, 'execute') as service,
          exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
            where a.grantee = 0 and a.privilege_type = 'EXECUTE') as everyone
        from pg_proc p where p.oid = $1::regprocedure`, [`public.${signature}`]);
      check(p.prosecdef === definer && p.proconfig?.includes('search_path=""'), `${signature}: modo y path fijo`, p);
      check(p.anon === (access === "public") && p.authenticated === (access !== "internal")
        && p.service && !p.everyone, `${signature}: ACL minima explicita, servicio conservado`, p);
    }
  }

  await query("insert into public.admin_correos(correo) values ('sa-founder@local.test')");
  await query(`insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data) values
    ($1, 'sa-founder@local.test', now(), '{}'), ($2, 'sa-admin@local.test', now(), '{}'),
    ($3, 'sa-owner@local.test', now(), '{"rol":"admin","email":"sa-founder@local.test"}'),
    ($4, 'sa-other@local.test', now(), '{}'), ($5, 'sa-delete@local.test', now(), '{}')`,
  [FOUNDER, ADMIN, OWNER, OTHER, DELETED]);
  check((await query("select rol from public.perfiles where id=$1", [OWNER])).rows[0].rol === "usuario",
    "registro: metadata manipulable no da rol admin y crear_perfil sigue disparando");
  check((await as("authenticated", FOUNDER, () => query("select public.cambiar_rol($1, 'admin') as r", [ADMIN]))).rows[0].r === "ok",
    "origen nombra admin por RPC aun con ayudante y trigger sin EXECUTE cliente");

  const lugar = (await as("authenticated", OWNER, () => query(`insert into public.lugares(nombre,tipo,lat,lng,creado_por)
    values ('SA Foro','foro',22.15,-100.98,auth.uid()) returning id,nombre_orden`))).rows[0];
  const artista = (await as("authenticated", OWNER, () => query(`insert into public.artistas(nombre,disciplina,creado_por)
    values ('SA Musica','musica',auth.uid()) returning id,nombre_orden`))).rows[0];
  const evento = (await as("authenticated", OWNER, () => query(`insert into public.eventos(titulo,inicio,lugar_id,creado_por)
    values ('SA Evento',now()+interval '5 days',$1,auth.uid()) returning id,zona`, [lugar.id]))).rows[0];
  check(lugar.nombre_orden === "sa foro" && artista.nombre_orden === "sa musica" && evento.zona === "America/Mexico_City",
    "triggers de orden y zona funcionan despues de revocar EXECUTE");
  await as("authenticated", OWNER, () => expectError(() => query(`insert into public.artistas(nombre,disciplina,creado_por)
    values ('SA Musica','musica',auth.uid())`), "23505", "sigue activo el trigger antiduplicados"));
  await as("authenticated", OWNER, () => query(`insert into public.eventos_artistas(evento_id,artista_id) values ($1,$2)`, [evento.id, artista.id]));
  await as("authenticated", OWNER, () => query(`insert into public.eventos_sitio_privado(evento_id,direccion,revelar_desde)
    values ($1,'SA direccion reservada',now()+interval '4 days')`, [evento.id]));
  await as("authenticated", OWNER, () => query("update public.perfiles set reservado=true where id=auth.uid()"));
  await as("authenticated", OWNER, () => query("insert into public.asistencias(usuario_id,evento_id,estado) values(auth.uid(),$1,'voy')", [evento.id]));
  await as("authenticated", OWNER, () => query("insert into public.seguimientos(usuario_id,lugar_id) values(auth.uid(),$1)", [lugar.id]));
  await as("authenticated", OWNER, () => query("insert into public.seguimientos(usuario_id,artista_id) values(auth.uid(),$1)", [artista.id]));
  await as("authenticated", OWNER, () => query("insert into public.reportes(tipo,objeto_id,motivo,creado_por) values('evento',$1,'otro',auth.uid())", [evento.id]));

  // Anon tampoco puede entrar a RPC con sesion, aunque el cuerpo pudiera devolver vacio.
  const sessionCalls = [
    ["apartar_lectura_de_cartel()"], ["borrar_mi_cuenta()"],
    ["cambiar_destacado('eventos',$1,'elegido')", [evento.id]], ["cambiar_rol($1,'admin')", [OWNER]],
    ["dar_mas_lecturas($1)", [OWNER]], ["inicio_del_mes()"], ["marcar_visto()"], ["mi_cupo_de_cartel()"],
    ["panel_artistas()"], ["panel_comunidad()"], ["panel_correo($1)", [OWNER]],
    ["panel_destacados('eventos')"], ["panel_eventos()"], ["panel_fichas_conteos('eventos')"],
    ["panel_lugares()"], ["panel_pendientes()"], ["panel_persona($1)", [OWNER]],
    ["panel_personas_conteos()"], ["panel_personas()"], ["panel_resumen()"],
  ];
  for (const [call, params] of sessionCalls) {
    await as("anon", null, () => expectError(() => query(`select * from public.${call}`, params), "42501", `anon: denegado ${call}`));
  }
  const internalCalls = [
    "crear_perfil()", "proteger_rol()", "eventos_zona_del_lugar()", "lugares_zona_a_sus_eventos()",
    "limitar_suscripciones_push()", "artista_sin_duplicado()", "poner_nombre_orden()",
    "proteger_autor_y_visible()", "tocar_actualizado_en()", "es_admin_de_origen()",
    "guardar_indicadores()", "indicadores_ahora()", "tope_de_cartel_base()", "sin_pasar(now(),null)", "rol_en(null,now())",
  ];
  for (const [role, subject] of [["anon", null], ["authenticated", OWNER], ["authenticated", ADMIN]]) {
    for (const call of internalCalls) {
      await as(role, subject, () => expectError(() => query(`select public.${call}`), "42501", `${role}/${subject}: interno ${call}`));
    }
  }

  const panelLists = ["panel_personas()", "panel_lugares()", "panel_eventos()", "panel_artistas()", "panel_pendientes()", "panel_destacados('eventos')"];
  for (const subject of [OWNER, OTHER]) {
    for (const call of panelLists) {
      check((await as("authenticated", subject, () => query(`select * from public.${call}`))).rowCount === 0,
        `${subject}: no lista datos de ${call}`);
    }
    for (const call of ["panel_persona($1)", "panel_correo($1)", "panel_personas_conteos()", "panel_fichas_conteos('eventos')"]) {
      const r = await as("authenticated", subject, () => query(`select public.${call} as r`, call.includes("$1") ? [OWNER] : []));
      check(r.rows[0].r === null, `${subject}: ${call} no filtra datos ni siquiera del propio perfil`);
    }
    for (const call of ["panel_resumen()", "panel_comunidad()", "dar_mas_lecturas($1)", "cambiar_destacado('eventos',$1,'elegido')"]) {
      await as("authenticated", subject, () => expectError(() => query(`select public.${call}`, call.includes("$1") ? [evento.id] : []),
        "42501", `${subject}: operacion administrativa denegada ${call}`));
    }
    const denied = await as("authenticated", subject, () => query("select public.cambiar_rol($1,'admin') as r", [subject]));
    check(denied.rows[0].r === "sin_permiso", "RPC no permite autoascenso");
    await as("authenticated", subject, () => expectError(() => query("update public.perfiles set rol='admin' where id=auth.uid()"),
      "42501", "UPDATE directo tampoco permite autoascenso"));
  }
  check((await query("select count(*)::int as n from public.cambios_de_rol where perfil_id=any($1::uuid[])", [[OWNER, OTHER]])).rows[0].n === 0,
    "denegaciones sin cambios de rol ni auditoria falsa");
  check((await query("select count(*)::int as n from public.destacados where evento_id=$1", [evento.id])).rows[0].n === 0,
    "denegaciones sin destacado creado");

  for (const target of [OWNER, FOUNDER]) {
    const r = await as("authenticated", ADMIN, () => query("select public.cambiar_rol($1,'usuario') as r", [target]));
    check(r.rows[0].r === "sin_permiso", "admin nombrado no cambia roles ni al fundador");
    await as("authenticated", ADMIN, () => expectError(() => query("update public.perfiles set rol=case rol when 'admin' then 'usuario' else 'admin' end where id=$1", [target]),
      "42501", "admin nombrado no elude la regla con UPDATE directo"));
  }
  await as("authenticated", FOUNDER, () => expectError(() => query("update public.perfiles set rol='usuario' where id=auth.uid()"),
    "42501", "ni el fundador quita por UPDATE el rol de origen"));

  await as("authenticated", ADMIN, () => query("select public.cambiar_destacado('eventos',$1,'elegido')", [evento.id]));
  await as("authenticated", ADMIN, () => query("select public.dar_mas_lecturas($1)", [OWNER]));
  for (const subject of [ADMIN, FOUNDER]) {
    for (const call of panelLists) {
      const r = await as("authenticated", subject, () => query(`select * from public.${call}`));
      check(r.rowCount > 0, `administracion conserva resultados en ${call}`);
      const bypass = await as(null, subject, () => query(`select * from public.${call}`));
      check(JSON.stringify(r.rows) === JSON.stringify(bypass.rows), `${call}: RLS de admin conserva todo el resultado sin bypass`);
    }
    const r = await as("authenticated", subject, () => query(`select public.panel_persona($1) as persona,
      public.panel_correo($1) as correo, public.panel_personas_conteos() as conteos,
      public.panel_fichas_conteos('eventos') as fichas, public.panel_resumen() as resumen,
      public.panel_comunidad() as comunidad`, [OWNER]));
    check(r.rows[0].persona?.id === OWNER && r.rows[0].correo === "sa-owner@local.test"
      && r.rows[0].conteos?.todas > 0 && r.rows[0].fichas?.proximos > 0
      && r.rows[0].resumen?.ahora && r.rows[0].comunidad, "admin conserva detalle, correo y agregados completos");
    check(r.rows[0].persona.puedo_cambiar_rol === (subject === FOUNDER), "solo el origen recibe puedo_cambiar_rol");
  }

  const noSession = await as("authenticated", null, () => query(`select public.es_admin() as admin,
    public.apartar_lectura_de_cartel() as reserva, public.cambiar_rol($1,'admin') as cambio`, [OTHER]));
  check(!noSession.rows[0].admin && !noSession.rows[0].reserva && noSession.rows[0].cambio === "sin_permiso",
    "authenticated sin identidad no obtiene privilegios ni reserva lecturas");
  check((await as("authenticated", null, () => query("select * from public.mi_cupo_de_cartel()"))).rowCount === 0,
    "sin identidad no devuelve cupo");
  await as("authenticated", null, () => expectError(() => query("select public.borrar_mi_cuenta()"),
    "P0001", "sin identidad no borra ninguna cuenta"));

  // El caller controla su path e incluso podria tener objetos temporales homonimos.
  await query("create schema sa_hostil");
  await query("grant usage on schema sa_hostil to anon, authenticated");
  await query("create function sa_hostil.es_admin() returns boolean language sql as $$ select true $$");
  await query("create function sa_hostil.lower(text) returns text language sql as $$ select 'suplantado'::text $$");
  await query("create temporary table perfiles(id uuid, rol text)");
  await query("insert into pg_temp.perfiles values($1,'admin')", [OWNER]);
  await query("grant select on pg_temp.perfiles to anon, authenticated");
  try {
    await query("set search_path=sa_hostil, public, pg_catalog");
    const r = await as("authenticated", OWNER, () => query("select public.es_admin() as admin, public.normalizar_nombre('CASA') as nombre"));
    check(!r.rows[0].admin && r.rows[0].nombre === "casa", "path hostil y tabla temporal no suplantan perfil ni funciones");
    await as("authenticated", OWNER, () => expectError(() => query("select public.panel_resumen()"), "42501", "path hostil no abre el panel"));
    check((await as("authenticated", ADMIN, () => query("select public.panel_correo($1) as r", [OWNER]))).rows[0].r === "sa-owner@local.test",
      "path hostil no rompe RPC legitima");
  } finally {
    await query("reset search_path");
    await query("drop table pg_temp.perfiles");
    await query("drop schema sa_hostil cascade");
  }

  // Revocar tambien impide instalar triggers privilegiados en una tabla controlada.
  await as("authenticated", OWNER, async () => {
    await query("create temporary table sa_trigger(id uuid, email text, raw_user_meta_data jsonb)");
    try {
      await expectError(() => query("create trigger sa_escalar after insert on sa_trigger for each row execute function public.crear_perfil()"),
        "42501", "cliente no reutiliza crear_perfil con un email de origen falsificado");
      await expectError(() => query("create trigger sa_escalar before update on sa_trigger for each row execute function public.proteger_rol()"),
        "42501", "cliente no instala proteger_rol en una tabla propia");
    } finally { await query("drop table sa_trigger"); }
  });

  for (const [role, subject, canManage] of [["anon", null, false], ["authenticated", OTHER, false], ["authenticated", OWNER, true], ["authenticated", ADMIN, true]]) {
    const r = await as(role, subject, () => query(`select public.gestiona_lugar($1) as lugar,
      public.gestiona_artista($2) as artista, public.gestiona_evento($3) as evento`, [lugar.id, artista.id, evento.id]));
    check(Object.values(r.rows[0]).every((v) => v === canManage), `${role}/${subject}: ayudantes RLS conservan propiedad`);
    const address = await as(role, subject, () => query("select direccion from public.eventos_sitio_privado where evento_id=$1", [evento.id]));
    check(address.rowCount === (canManage ? 1 : 0), "RLS de direccion privada conserva autor/admin y bloquea anon/ajeno");
  }
  await as("authenticated", OTHER, () => expectError(() => query("insert into public.lugares_cuentas(lugar_id,perfil_id) values($1,auth.uid())", [lugar.id]),
    "42501", "ajeno no se liga para escalar permisos de lugar"));
  await as("authenticated", OTHER, () => expectError(() => query("insert into public.artistas_cuentas(artista_id,perfil_id) values($1,auth.uid())", [artista.id]),
    "42501", "ajeno no se liga para escalar permisos de artista"));
  await as("authenticated", ADMIN, () => query("insert into public.lugares_cuentas(lugar_id,perfil_id) values($1,$2)", [lugar.id, OTHER]));
  await as("authenticated", ADMIN, () => query("insert into public.artistas_cuentas(artista_id,perfil_id) values($1,$2)", [artista.id, OTHER]));
  const linked = await as("authenticated", OTHER, () => query(`select public.gestiona_lugar($1) as lugar,
    public.gestiona_artista($2) as artista, public.gestiona_evento($3) as evento`, [lugar.id, artista.id, evento.id]));
  check(linked.rows[0].lugar && linked.rows[0].artista && !linked.rows[0].evento, "ligado gestiona fichas sin heredar eventos ajenos");
  await as("authenticated", OTHER, () => expectError(() => query("update public.lugares set creado_por=auth.uid() where id=$1", [lugar.id]),
    "42501", "ligado no se hace autor mediante trigger invoker"));
  const zone = await as("authenticated", OTHER, () => query("update public.lugares set zona='Europe/Madrid' where id=$1 returning id", [lugar.id]));
  check(zone.rowCount === 1 && (await query("select zona from public.eventos where id=$1", [evento.id])).rows[0].zona === "Europe/Madrid",
    "trigger de zona conserva propagacion a eventos ajenos sin EXECUTE cliente");

  // Agregados publicos deliberados: cuentan al perfil reservado, no revelan su identidad.
  for (const [role, subject] of [["anon", null], ["authenticated", OTHER]]) {
    const count = await as(role, subject, () => query("select * from public.van_por_evento(array[$1]::uuid[])", [evento.id]));
    const follows = await as(role, subject, () => query("select public.cuenta_seguidores($1,null) as n", [lugar.id]));
    check(Number(count.rows[0]?.n) === 1 && Number(follows.rows[0]?.n) === 1, "conteos incluyen perfil reservado sin identidad");
    check((await as(role, subject, () => query("select * from public.asistencias where usuario_id=$1", [OWNER]))).rowCount === 0,
      "RLS mantiene privada la asistencia individual");
    const highlights = await as(role, subject, () => query("select * from public.tira_destacados('eventos','San Luis Potosí')"));
    check(highlights.rows.some((r) => r.id === evento.id), "tira publica conserva evento elegido");
    check((await as(role, subject, () => query("select * from public.lugares_con_nombre('SA Foro')"))).rows.some((r) => r.id === lugar.id),
      "busqueda publica de lugar conserva contrato");
    check((await as(role, subject, () => query("select * from public.artistas_con_nombre('SA Musica')"))).rows.some((r) => r.id === artista.id),
      "busqueda publica de artista conserva contrato");
  }

  await as("authenticated", ADMIN, () => query("update public.lugares set privado=true where id=$1", [lugar.id]));
  await as("authenticated", ADMIN, () => query("update public.artistas set visible=false where id=$1", [artista.id]));
  await as("authenticated", ADMIN, () => query("update public.eventos set visible=false where id=$1", [evento.id]));
  for (const [role, subject, visible] of [["anon", null, false], ["authenticated", DELETED, false], ["authenticated", OWNER, true], ["authenticated", ADMIN, true]]) {
    const r = await as(role, subject, () => query(`select
      (select count(*)::int from public.lugares where id=$1) as lugar,
      (select count(*)::int from public.artistas where id=$2) as artista,
      (select count(*)::int from public.eventos where id=$3) as evento`, [lugar.id, artista.id, evento.id]));
    check(Object.values(r.rows[0]).every((n) => n === Number(visible)), "RLS oculta las fichas privadas/ocultas salvo autor y admin");
    const counts = await as(role, subject, () => query(`select
      (select n from public.van_por_evento(array[$1]::uuid[])) as evento,
      public.cuenta_seguidores($2,null) as lugar, public.cuenta_seguidores(null,$3) as artista,
      public.cuenta_seguidores($2,$3) as ambos`, [evento.id, lugar.id, artista.id]));
    check(Number(counts.rows[0].evento ?? 0) === Number(visible)
      && Number(counts.rows[0].lugar) === Number(visible) && Number(counts.rows[0].artista) === Number(visible)
      && Number(counts.rows[0].ambos) === 2 * Number(visible),
    "UUID conocido no abre conteos de fichas inaccesibles; autor/admin conservan los reservados", counts.rows[0]);
    const found = await as(role, subject, () => query(`select
      (select count(*) from public.lugares_con_nombre('SA Foro')) as lugar,
      (select count(*) from public.lugares_parecidos('SA Foro',22.15,-100.98)) as parecido,
      (select count(*) from public.artistas_con_nombre('SA Musica')) as artista`));
    check(Object.values(found.rows[0]).every((n) => Number(n) === 0), "sugerencias no publican fichas ocultas/privadas ni al admin");
    check(!(await as(role, subject, () => query("select * from public.tira_destacados('eventos','San Luis Potosí')"))).rows.some((r) => r.id === evento.id),
      "tira publica excluye evento oculto y lugar privado");
  }
  const linkedCounts = await as("authenticated", OTHER, () => query(`select
    (select n from public.van_por_evento(array[$1]::uuid[])) as evento,
    public.cuenta_seguidores($2,$3) as fichas`, [evento.id, lugar.id, artista.id]));
  check(linkedCounts.rows[0].evento === null && Number(linkedCounts.rows[0].fichas) === 2,
    "ligado cuenta sus fichas privadas sin recibir conteos de eventos ajenos ocultos");

  await as("authenticated", OWNER, () => query("select public.marcar_visto()"));
  const views = await query("select perfil_id from public.cuentas_vistas where perfil_id=any($1::uuid[])", [[OWNER, OTHER]]);
  check(views.rowCount === 1 && views.rows[0].perfil_id === OWNER, "marcar_visto solo escribe la identidad propia");
  check((await as("authenticated", OWNER, () => query("select * from public.mi_cupo_de_cartel()"))).rows[0].tope === 100
    && (await as("authenticated", OTHER, () => query("select * from public.mi_cupo_de_cartel()"))).rows[0].tope === 20,
  "mi_cupo no devuelve la ampliacion ajena");
  const service = await as("service_role", null, () => query("select public.guardar_indicadores()"));
  check(service.rowCount === 1, "tarea de servicio conserva guardar_indicadores");

  // Las cuatro tablas internas siguen cerradas, tambien para admin por API directa.
  for (const table of ["admin_correos", "avisos_enviados", "contactos_importados", "invitaciones_enviadas"]) {
    const meta = (await query(`select c.relrowsecurity, (select count(*)::int from pg_policy where polrelid=c.oid) as policies
      from pg_class c where c.oid=$1::regclass`, [`public.${table}`])).rows[0];
    check(meta.relrowsecurity && meta.policies === 0, `${table}: RLS sin politicas es denegacion deliberada`);
    for (const [role, subject] of [["anon", null], ["authenticated", OWNER], ["authenticated", ADMIN]]) {
      check((await as(role, subject, () => query(`select * from public.${table}`))).rowCount === 0, `${role}: no lee ${table}`);
    }
  }
  const authored = (await as("authenticated", DELETED, () => query(`insert into public.lugares(nombre,tipo,lat,lng,creado_por)
    values ('SA legado','foro',22.15,-100.98,auth.uid()) returning id`))).rows[0].id;
  await as("authenticated", DELETED, () => query("select public.borrar_mi_cuenta()"));
  check((await query("select id from auth.users where id=$1", [DELETED])).rowCount === 0
    && (await query("select creado_por from public.lugares where id=$1", [authored])).rows[0].creado_por === null
    && (await query("select id from auth.users where id=$1", [OWNER])).rowCount === 1,
  "borrar_mi_cuenta solo borra la propia y conserva fichas sin autor");
  console.log(`Security Advisor: matriz de 51 firmas y contratos negativos/positivos (${Date.now() - start} ms)`);
}
