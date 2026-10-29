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
    "panel_aportes()", "panel_comunidad()", "panel_correo(uuid)", "panel_fichas()", "panel_persona(uuid)",
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

// ---------------------------------------------------------------------------------------------------------------
// Regla general (OL-486, bitácora 518). La matriz de arriba es una lista fija de 2026-09-18: lo que se creó después
// no entraba y una función nueva mal hecha pasaba sin aviso. Esta regla recorre TODAS las funciones, tablas y vistas
// de los esquemas propios (hoy solo `public`; las funciones de extensiones como pgcrypto no son nuestras y se saltan)
// y exige lo que pide el Security Advisor de Supabase:
//   - toda función fija `search_path = ''` (lint function_search_path_mutable; obligatorio en las SECURITY DEFINER,
//     y hoy también lo cumplen todas las invoker, así que se exige a todas);
//   - ninguna función tiene EXECUTE para PUBLIC (PostgreSQL se lo da por omisión a toda función nueva: quien crea
//     una tiene que hacer `revoke all … from public` y conceder solo a quien la necesita);
//   - anon solo ejecuta las de ANON_PERMITIDAS; authenticated solo las de ANON_PERMITIDAS o AUTH_PERMITIDAS;
//   - toda tabla tiene RLS, toda vista es security_invoker y ninguna vista materializada ni tabla foránea queda a la
//     vista de anon o authenticated, salvo que esté en EXCEPCIONES con su razón (hoy no hay ninguna).
// Las listas son exactas: una entrada que ya no existe o que ya no tiene ese permiso también falla, para que no se
// pudran. Una función nueva para clientes entra aquí con su razón en el mismo PR.

// Esquemas que crea la plataforma (o el banco que la imita, scripts/test-db.mjs) y que no son nuestros.
const ESQUEMAS_DE_PLATAFORMA = new Set([
  "auth", "storage", "extensions", "realtime", "graphql", "graphql_public", "vault", "pgsodium", "pgsodium_masks",
  "net", "cron", "supabase_functions", "supabase_migrations", "pgbouncer", "pgmq", "topology", "tiger", "tiger_data",
]);
// Esquemas propios que la regla recorre. Una migración que cree otro esquema hace fallar la prueba hasta añadirlo aquí.
const ESQUEMAS_PROPIOS = new Set(["public"]);

// anon (sin sesión) solo ejecuta estas. Cada una con su razón.
const ANON_PERMITIDAS = new Map([
  ["public.artistas_con_nombre(text)", "buscador y alta de artista sin sesión; invoker, lee bajo RLS"],
  ["public.artistas_destacados_novedades(text)", "carril público de Inicio; definer que solo devuelve artistas visibles con novedades visibles"],
  ["public.bloqueado_por_mi(uuid)", "la evalúan las políticas de lectura de eventos y novedades_artista, también para anon; sin sesión devuelve false"],
  ["public.ciudades_agregadas(timestamp with time zone)", "conteos públicos por ciudad del selector; invoker con RLS"],
  ["public.ciudades_artistas_agregadas()", "conteo público de artistas por ciudad; invoker con RLS"],
  ["public.cuenta_seguidores(uuid,uuid)", "conteo público de seguidores de una ficha; definer sin identidades y sin abrir fichas ocultas"],
  ["public.detalles_de_disciplina(text,text,integer)", "filtros públicos de Artistas; invoker"],
  ["public.disciplinas_con_artistas(text)", "filtros públicos de Artistas; invoker"],
  ["public.distancia_m(double precision,double precision,double precision,double precision)", "cálculo puro que usa lugares_parecidos"],
  ["public.es_admin()", "la evalúan las políticas de RLS para cualquier rol; invoker, sin sesión false"],
  ["public.eventos_parecidos(text,timestamp with time zone,text,uuid,text,uuid)", "«¿Es este?» antes de publicar; invoker, solo lo visible"],
  ["public.gestiona_artista(uuid)", "ayudante de la RLS de lectura de artistas (definer para no ser recursiva); sin sesión false"],
  ["public.gestiona_evento(uuid)", "ayudante de RLS; invoker, sin sesión false"],
  ["public.gestiona_lugar(uuid)", "ayudante de la RLS de lectura de lugares (definer para no ser recursiva); sin sesión false"],
  ["public.lugares_con_nombre(text)", "buscador público de lugares; invoker con RLS"],
  ["public.lugares_parecidos(text,double precision,double precision,uuid)", "«¿Es este?» del alta de lugar; invoker con RLS"],
  ["public.normalizar_nombre(text)", "función pura de las búsquedas públicas"],
  ["public.novedades_recientes_artistas(text,uuid[])", "carril público de novedades; definer que solo devuelve lo visible"],
  ["public.pincel_activo()", "la pared y el mando la consultan desde el servidor, también sin sesión; invoker, falla cerrado"],
  ["public.push_endpoint_permitido(text)", "check de push_suscripciones; función pura"],
  ["public.registrar_ciudad_vista(text)", "Inicio y Lugares la llaman sin sesión; suma 1 a una ciudad existente, sin persona y con techo"],
  ["public.subcategorias_de(text)", "sugerencias del alta de artista; solo agrega lo visible"],
  ["public.tira_destacados(text,text)", "tira pública de Inicio; definer que excluye ocultos y lugares privados"],
  ["public.van_por_evento(uuid[])", "conteo público de asistentes sin identidades"],
  ["public.zona_valida(text)", "check de lugares y eventos; función pura"],
]);

// authenticated (con sesión) ejecuta además estas, por grupos con su razón.
const AUTH_GRUPOS = [
  ["administración: cada una exige es_admin() (o el origen) por dentro y devuelve vacío, null o sin_permiso al resto", [
    "aceptar_propuesta(uuid,jsonb)", "admin_asignar_ficha(text,uuid,uuid)", "admin_buscar_fichas(text,uuid,integer)",
    "admin_quitar_ficha(text,uuid,uuid)", "borrar_lugar_excepcional_admin(uuid,text,text)",
    "cambiar_destacado(text,uuid,text,timestamp with time zone,timestamp with time zone)", "cambiar_rol(uuid,text)",
    "dar_mas_lecturas(uuid)", "impacto_borrado_lugar_admin(uuid)", "instagram_sugerencias(text,integer)",
    "panel_aportes()", "panel_artistas(text,text,integer,integer)", "panel_artistas(text,text,text,integer,integer)",
    "panel_avisos()", "panel_capo()", "panel_ciudades_de(text)", "panel_ciudades()", "panel_comunidad()", "panel_correo(uuid)",
    "panel_destacados(text)", "panel_en_ciudad(text,text,uuid[])", "panel_eventos(text,text,integer,integer)",
    "panel_eventos(text,text,text,integer,integer)", "panel_fichas_conteos(text,text)", "panel_fichas_conteos(text)",
    "panel_fichas()", "panel_lugares(text,text,integer,integer)", "panel_lugares(text,text,text,integer,integer)",
    "panel_pendientes()", "panel_persona(uuid)", "panel_personas_conteos()", "panel_personas_conteos(text)",
    "panel_personas(text,text,integer,integer)", "panel_personas(text,text,text,integer,integer)", "panel_propuestas(uuid)",
    "panel_resumen()", "redes_encolar(uuid,text,text,jsonb,boolean)", "redes_reciente(uuid,text,text)",
    "rol_en_para_admin(uuid,timestamp with time zone)", "vistas_por_origen(integer)",
  ]],
  ["la propia cuenta: actúan solo sobre auth.uid()", [
    "activar_mis_avisos_push()", "anotar_sugerencia(uuid,text,text,text)", "apartar_lectura_de_cartel()",
    "artistas_con_mi_correo()", "borrar_mi_cuenta()", "marcar_visto()", "mi_cupo_de_cartel()", "mi_perfil()",
    "mi_push_activo(text,text)", "reclamar_si_correo_coincide(uuid)",
  ]],
  ["publicar y editar: el alta y la edición de fichas propias; las invoker pasan por la RLS y las definer comprueban autor, gestor o admin", [
    "borrar_lugar(uuid)", "crear_lugar_con_horario(jsonb,jsonb)",
    "editar_evento_con_sesiones(uuid,jsonb,jsonb,jsonb,jsonb,timestamp with time zone,uuid)",
    "festival_de_dos_parecidos(uuid,uuid,text,uuid)",
    "guardar_evento_completo(uuid,jsonb,jsonb,jsonb,timestamp with time zone,uuid)",
    "guardar_evento_con_avisos(uuid,jsonb,jsonb,jsonb,timestamp with time zone,uuid)",
    "guardar_evento_con_clase(uuid,jsonb,jsonb,jsonb,jsonb,jsonb,timestamp with time zone,uuid)",
    "guardar_evento_con_sesiones(uuid,jsonb,jsonb,jsonb,jsonb,timestamp with time zone,uuid)",
    "guardar_horario_lugar(uuid,jsonb)", "ligar_inauguracion(uuid,uuid)",
    "poner_cartel_a_evento(uuid,text,jsonb,jsonb,boolean)", "programa_ocultar_borrador(uuid)",
    "publicar_borrador_de_programa(uuid)",
    "publicar_exposicion_de_inauguracion(uuid,text,timestamp with time zone,timestamp with time zone,jsonb,uuid)",
    "publicar_festival_sin_programa(jsonb,jsonb,jsonb,jsonb,uuid)", "publicar_programa(jsonb,jsonb,uuid)",
    "recalcular_festival(uuid)", "relacionar_en_festival(uuid[],uuid,text,uuid)", "religar_sitio_a_lugar(uuid,uuid[])",
    "unir_a_festival_parecido(uuid,uuid,text)",
  ]],
  ["ayudantes de cálculo que usan las de arriba (invoker, sin datos propios)", [
    "ciudad_slug(text)", "fin_en_programa(timestamp with time zone,timestamp with time zone,text)",
    "imagen_origen_permitido(text,boolean,boolean)", "inicio_del_mes()", "slug_de_evento(text,timestamp with time zone,text,uuid)",
    "slug_de_nombre(text)",
  ]],
];
const AUTH_PERMITIDAS = new Map(AUTH_GRUPOS.flatMap(([razon, firmas]) => firmas.map((f) => [`public.${f}`, razon])));

// Tablas sin RLS, vistas sin security_invoker y vistas materializadas o tablas foráneas a la vista de los clientes que
// se aceptan, cada una con su razón. Hoy no hay ninguna.
const EXCEPCIONES = new Map([]);

// Devuelve la lista de incumplimientos de la regla sobre el catálogo actual (vacía = cumple) y cuántas funciones revisó.
async function incumplimientosDeLaRegla(query) {
  const fallos = [];
  const { rows: esquemas } = await query(`select nspname from pg_namespace
    where nspname not like 'pg\\_%' and nspname <> 'information_schema' order by 1`);
  for (const { nspname } of esquemas) {
    if (!ESQUEMAS_PROPIOS.has(nspname) && !ESQUEMAS_DE_PLATAFORMA.has(nspname)) {
      fallos.push(`esquema ${nspname}: no es de la plataforma ni está en ESQUEMAS_PROPIOS (añádelo para que la regla lo recorra)`);
    }
  }
  const propios = [...ESQUEMAS_PROPIOS];
  const { rows: funciones } = await query(`
    select n.nspname || '.' || p.proname || '(' || replace(oidvectortypes(p.proargtypes), ', ', ',') || ')' as firma,
      p.prosecdef as definer, coalesce(p.proconfig, '{}') @> array['search_path=""'] as path_vacio,
      exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
        where a.grantee = 0 and a.privilege_type = 'EXECUTE') as publico,
      has_function_privilege('anon', p.oid, 'execute') as anon,
      has_function_privilege('authenticated', p.oid, 'execute') as authenticated
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = any($1::text[]) and p.prokind in ('f', 'p', 'a', 'w')
      and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
    order by 1`, [propios]);
  const porFirma = new Map(funciones.map((f) => [f.firma, f]));
  for (const f of funciones) {
    if (!f.path_vacio) fallos.push(`${f.firma}: ${f.definer ? "SECURITY DEFINER" : "función"} sin search_path = ''`);
    if (f.publico) fallos.push(`${f.firma}: EXECUTE concedido a PUBLIC (falta revoke all … from public)`);
    if (f.anon && !ANON_PERMITIDAS.has(f.firma)) fallos.push(`${f.firma}: anon la ejecuta y no está en ANON_PERMITIDAS`);
    if (f.authenticated && !ANON_PERMITIDAS.has(f.firma) && !AUTH_PERMITIDAS.has(f.firma)) {
      fallos.push(`${f.firma}: authenticated la ejecuta y no está en AUTH_PERMITIDAS`);
    }
  }
  for (const firma of ANON_PERMITIDAS.keys()) {
    const f = porFirma.get(firma);
    if (!f?.anon) fallos.push(`${firma}: está en ANON_PERMITIDAS pero ${f ? "anon ya no la ejecuta" : "ya no existe"} (lista desactualizada)`);
  }
  for (const firma of AUTH_PERMITIDAS.keys()) {
    const f = porFirma.get(firma);
    if (!f?.authenticated || f.anon) {
      fallos.push(`${firma}: está en AUTH_PERMITIDAS pero ${!f ? "ya no existe" : f.anon ? "anon también la ejecuta (va en ANON_PERMITIDAS)" : "authenticated ya no la ejecuta"} (lista desactualizada)`);
    }
  }

  const { rows: relaciones } = await query(`
    select n.nspname || '.' || c.relname as nombre, c.relkind, c.relrowsecurity,
      coalesce(c.reloptions, '{}') && array['security_invoker=true', 'security_invoker=on', 'security_invoker=1'] as invoker,
      has_table_privilege('anon', c.oid, 'select') or has_table_privilege('authenticated', c.oid, 'select') as expuesta
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = any($1::text[]) and c.relkind in ('r', 'p', 'v', 'm', 'f')
      and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')
    order by 1`, [propios]);
  for (const r of relaciones) {
    if (EXCEPCIONES.has(r.nombre)) continue;
    if ((r.relkind === "r" || r.relkind === "p") && !r.relrowsecurity) fallos.push(`${r.nombre}: tabla sin RLS`);
    if (r.relkind === "v" && !r.invoker) fallos.push(`${r.nombre}: vista sin security_invoker (corre con los permisos de su dueño)`);
    if ((r.relkind === "m" || r.relkind === "f") && r.expuesta) {
      fallos.push(`${r.nombre}: ${r.relkind === "m" ? "vista materializada" : "tabla foránea"} legible por anon o authenticated (sin RLS posible)`);
    }
  }
  for (const nombre of EXCEPCIONES.keys()) {
    if (!relaciones.some((r) => r.nombre === nombre)) fallos.push(`${nombre}: está en EXCEPCIONES pero ya no existe (lista desactualizada)`);
  }
  return { fallos, funciones: funciones.length, relaciones: relaciones.length };
}

// Control negativo: cada caso crea algo mal hecho DENTRO de una transacción, comprueba que la regla lo señala con el
// motivo esperado y deshace todo con rollback. Si la regla dejara pasar alguno, la prueba falla.
const CONTROLES = [
  ["SECURITY DEFINER sin search_path", `create function public.sa_control_definer() returns int
     language sql security definer as $$ select 1 $$`, /sa_control_definer\(\): SECURITY DEFINER sin search_path/],
  ["EXECUTE concedido a PUBLIC", `create function public.sa_control_publico() returns int
     language sql set search_path = '' as $$ select 1 $$;
   revoke all on function public.sa_control_publico() from public, anon, authenticated;
   grant execute on function public.sa_control_publico() to public`, /sa_control_publico\(\): EXECUTE concedido a PUBLIC/],
  ["anon fuera de la lista", `create function public.sa_control_anon() returns int
     language sql set search_path = '' as $$ select 1 $$;
   revoke all on function public.sa_control_anon() from public, authenticated;
   grant execute on function public.sa_control_anon() to anon`, /sa_control_anon\(\): anon la ejecuta y no está en ANON_PERMITIDAS/],
  ["authenticated fuera de la lista", `create function public.sa_control_auth() returns int
     language sql set search_path = '' as $$ select 1 $$;
   revoke all on function public.sa_control_auth() from public, anon;
   grant execute on function public.sa_control_auth() to authenticated`, /sa_control_auth\(\): authenticated la ejecuta y no está en AUTH_PERMITIDAS/],
  ["tabla sin RLS", "create table public.sa_control_tabla(id int)", /public\.sa_control_tabla: tabla sin RLS/],
  ["vista sin security_invoker", "create view public.sa_control_vista as select 1 as uno", /public\.sa_control_vista: vista sin security_invoker/],
  ["esquema nuevo sin declarar", "create schema sa_control_esquema", /esquema sa_control_esquema: no es de la plataforma/],
];

export async function run({ as, check, expectError, query }) {
  const start = Date.now();

  // Regla general sobre el catálogo real. Con FORZAR_ADVISOR_MAL=1 se deja a propósito una función mal hecha (sin
  // rollback) para ver que la corrida entera falla: es el control negativo forzado de la bitácora 518.
  if (process.env.FORZAR_ADVISOR_MAL === "1") {
    await query("create function public.sa_forzada_mal() returns int language sql security definer as $$ select 1 $$");
  }
  const regla = await incumplimientosDeLaRegla(query);
  check(regla.funciones > 100 && regla.relaciones > 30, "regla general: recorre las funciones y tablas propias", regla);
  for (const fallo of regla.fallos) check(false, `regla general: ${fallo}`);
  for (const [caso, sql, esperado] of CONTROLES) {
    await query("begin");
    try {
      await query(sql);
      const { fallos } = await incumplimientosDeLaRegla(query);
      check(fallos.some((f) => esperado.test(f)), `control negativo: la regla señala «${caso}»`, fallos);
    } finally {
      await query("rollback");
    }
  }
  check((await incumplimientosDeLaRegla(query)).fallos.length === regla.fallos.length,
    "control negativo: el rollback no deja nada de los controles");
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
    ["panel_aportes()"], ["panel_artistas()"], ["panel_comunidad()"], ["panel_correo($1)", [OWNER]], ["panel_fichas()"],
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
    for (const call of ["panel_resumen()", "panel_comunidad()", "panel_fichas()", "panel_aportes()", "dar_mas_lecturas($1)", "cambiar_destacado('eventos',$1,'elegido')"]) {
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
    && (await as("authenticated", OTHER, () => query("select * from public.mi_cupo_de_cartel()"))).rows[0].tope === 6,
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
  console.log(`Security Advisor: regla general sobre ${regla.funciones} funciones y ${regla.relaciones} tablas y vistas propias`
    + ` (${ANON_PERMITIDAS.size} para anon, ${AUTH_PERMITIDAS.size} más para authenticated, ${CONTROLES.length} controles negativos),`
    + ` matriz fija de 53 firmas y contratos negativos/positivos (${Date.now() - start} ms)`);
}
