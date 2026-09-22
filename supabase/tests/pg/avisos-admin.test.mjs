import { randomUUID } from "node:crypto";

/**
 * OL-115. Contratos SQL del aviso al administrador: dos tablas nuevas (avisos_admin_jobs/avisos_admin_entregas),
 * disparadores que nunca rompen la accion original, agrupado por bucket con tope, exclusion del actor admin y
 * del catalogo, y el conteo de la cabecera (RLS sobre reportes, sin funcion nueva). No toca avisos_jobs/avisos_entregas.
 */
export async function run({ as, query, check, expectError }) {
  const ADMIN = randomUUID(), OTRO_ADMIN = randomUUID(), USUARIO = randomUUID();
  await query("insert into public.admin_correos values('avisos-admin-root@local.test'),('avisos-admin-otro@local.test')");
  await query(`insert into auth.users(id,email) values ($1,'avisos-admin-root@local.test'),($2,'avisos-admin-otro@local.test'),($3,'avisos-admin-usuario@local.test')`,
    [ADMIN, OTRO_ADMIN, USUARIO]);
  check((await query("select rol from public.perfiles where id=$1", [ADMIN])).rows[0].rol === "admin", "la cuenta de admin_correos nace admin");

  const servicio = (sql, args) => as("service_role", null, () => query(sql, args));
  const jobs = async () => (await query("select * from public.avisos_admin_jobs order by creado_en, id")).rows;
  const expandir = async () => (await servicio("select public.avisos_admin_expandir() as r")).rows[0].r;
  const tomar = async () => (await servicio("select public.avisos_admin_tomar() as r")).rows[0].r;
  const autorizar = async (c) => (await servicio("select public.avisos_admin_autorizar($1,$2) as r", [c.id, c.token])).rows[0].r;
  const preparar = async (c, cuerpo) => (await servicio("select public.avisos_admin_preparar($1,$2,$3) as r", [c.id, c.token, cuerpo])).rows[0].r;
  const terminar = async (c, resultado = "enviada") => (await servicio("select public.avisos_admin_terminar($1,$2,$3,'prueba') as r", [c.id, c.token, resultado])).rows[0].r;

  // ---------- 1. Los disparadores nunca rompen la accion original ----------
  await query(`create or replace function public.avisos_admin_encolar(p_motivo text, p_actor uuid) returns void
    language plpgsql security definer set search_path = '' as $$ begin raise exception 'fallo forzado de prueba'; end $$`);
  const lugarId = randomUUID();
  await as("authenticated", USUARIO, () => query(
    `insert into public.lugares(id,nombre,tipo,direccion,lat,lng,ciudad,creado_por,visible) values($1,'Lugar de prueba','galeria','Calle 1',22.15,-100.98,'San Luis Potosí',auth.uid(),true)`,
    [lugarId]));
  check((await query("select 1 from public.lugares where id=$1", [lugarId])).rowCount === 1, "el disparador que falla no impide publicar el lugar");
  await query(`insert into public.reportes(tipo,objeto_id,motivo,creado_por) values('lugar',$1,'ofensivo',$2)`, [lugarId, USUARIO]);
  check((await query("select 1 from public.reportes where objeto_id=$1", [lugarId])).rowCount === 1, "el disparador que falla no impide reportar");
  await query(`insert into auth.users(id,email) values($1,'avisos-admin-nuevo@local.test')`, [randomUUID()]);
  check(true, "el disparador que falla no impide el registro (crear_perfil no lanzo)");

  // Restaura la funcion real leida del archivo de migracion (mismo texto que aplica la migracion).
  // CREATE OR REPLACE exige ser dueno de la funcion: corre con el rol del runner, no con service_role.
  await query(`
    create or replace function public.avisos_admin_encolar(p_motivo text, p_actor uuid) returns void
    language plpgsql security definer set search_path = '' as $$
    declare
      ventana constant interval := interval '10 minutes';
      techo constant interval := interval '60 minutes';
      ahora timestamptz := clock_timestamp();
      bucket text := 'admin:' || to_char(date_trunc('hour', ahora) + floor(extract(minute from ahora)::int / 10) * interval '10 minutes', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
      j public.avisos_admin_jobs;
      existe public.avisos_admin_jobs;
    begin
      if p_actor is not null and exists (select 1 from public.perfiles where id = p_actor and rol = 'admin') then
        return;
      end if;
      select * into j from public.avisos_admin_jobs where not expandido order by creado_en desc limit 1 for update;
      if found and j.tope > ahora then
        update public.avisos_admin_jobs set
          motivos = jsonb_set(motivos, array[p_motivo], to_jsonb(coalesce((motivos ->> p_motivo)::int, 0) + 1)),
          cierra = greatest(cierra, least(j.tope, ahora + ventana))
          where id = j.id;
        return;
      end if;
      select * into existe from public.avisos_admin_jobs where clave = bucket for update;
      if found and existe.expandido then
        bucket := bucket || ':' || extract(epoch from ahora)::bigint::text;
      end if;
      insert into public.avisos_admin_jobs(clave, cierra, tope, motivos)
        values (bucket, ahora + ventana, ahora + techo, jsonb_build_object(p_motivo, 1))
        on conflict (clave) do update set
          motivos = jsonb_set(public.avisos_admin_jobs.motivos, array[p_motivo], to_jsonb(coalesce((public.avisos_admin_jobs.motivos ->> p_motivo)::int, 0) + 1)),
          cierra = greatest(public.avisos_admin_jobs.cierra, least(public.avisos_admin_jobs.tope, ahora + ventana));
    end $$`);
  await query("delete from public.avisos_admin_jobs");

  // ---------- 2. Agrupado en un bucket ----------
  await as("authenticated", USUARIO, () => query(
    `insert into public.artistas(id,nombre,disciplina,ciudad,creado_por,visible) values(gen_random_uuid(),'Artista de prueba','musica','San Luis Potosí',auth.uid(),true)`));
  await query(`insert into public.reportes(tipo,objeto_id,motivo,creado_por) values('lugar',$1,'es_mio',$2)`, [lugarId, USUARIO]);
  let filas = await jobs();
  check(filas.length === 1, "dos motivos en la misma ventana coalescen en un solo job");
  check(filas[0].motivos.nuevo_artista === 1 && filas[0].motivos.reclamo_ficha === 1, "cada motivo cuenta por separado dentro del job");
  check(!filas[0].expandido, "el job sigue abierto, sin contenido congelado todavia");

  // ---------- 3. El actor admin no genera aviso de su propia accion ----------
  await as("authenticated", ADMIN, () => query(
    `insert into public.lugares(id,nombre,tipo,direccion,lat,lng,ciudad,creado_por,visible) values(gen_random_uuid(),'Lugar del admin','galeria','Calle 2',22.15,-100.98,'San Luis Potosí',auth.uid(),true)`));
  filas = await jobs();
  check(filas.length === 1 && filas[0].motivos.nuevo_lugar === undefined, "publicar como admin no encola aviso");

  // ---------- 4. El catalogo (CAPO/instituciones sin autor) no genera aviso ----------
  await query(`insert into public.artistas(id,nombre,disciplina,ciudad,creado_por,visible,origen) values(gen_random_uuid(),'Artista catalogo','musica','San Luis Potosí',null,true,'capo')`);
  filas = await jobs();
  check(filas.length === 1, "la importacion de catalogo (creado_por null) no abre otro job");

  // ---------- 5. Borde: bucket ya expandido no recibe mas conteo (el tope lo expulso antes de que
  // pasara su ventana natural; el siguiente motivo del MISMO bucket debe abrir otra clave) ----------
  await query("update public.avisos_admin_jobs set cierra=clock_timestamp()-interval '1 second'");
  check(await expandir() === true, "expandir toma el job del bucket");
  const expandido = (await jobs())[0];
  check(expandido.expandido && expandido.contenido !== null, "el job queda marcado expandido con su contenido congelado");
  // Misma formula exacta que usa avisos_admin_encolar para el bucket de "ahora": forzamos la colision.
  const { rows: [{ bucket: bucketAhora }] } = await query(
    `select 'admin:' || to_char(date_trunc('hour', clock_timestamp()) + floor(extract(minute from clock_timestamp())::int / 10) * interval '10 minutes', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as bucket`);
  await query("update public.avisos_admin_jobs set clave=$1 where id=$2", [bucketAhora, expandido.id]);
  await as("authenticated", USUARIO, () => query(
    `insert into public.artistas(id,nombre,disciplina,ciudad,creado_por,visible) values(gen_random_uuid(),'Otro artista','musica','San Luis Potosí',auth.uid(),true)`));
  filas = await jobs();
  check(filas.length === 2, "el bucket ya expandido no recibe el conteo nuevo: se abre una segunda clave");
  const nuevoJob = filas.find((f) => f.id !== expandido.id);
  check(!nuevoJob.expandido && nuevoJob.motivos.nuevo_artista === 1, "el job nuevo, sin expandir, es el que trae el conteo");
  check(filas.find((f) => f.id === expandido.id).motivos.nuevo_artista === 1, "el job ya expandido queda intacto (no sube de 1 a 2)");

  // ---------- 6. El worker entrega solo a admins con avisos_push, sin datos personales en el cuerpo ----------
  await query("update public.perfiles set avisos_push=true where id in ($1,$2)", [ADMIN, OTRO_ADMIN]);
  const key = Buffer.concat([Buffer.from([4]), Buffer.alloc(64)]).toString("base64url"), auth = Buffer.alloc(16).toString("base64url");
  await as("authenticated", ADMIN, () => query(
    `insert into public.suscripciones_push(endpoint,usuario_id,p256dh,auth) values('https://fcm.googleapis.com/fcm/send/admin1',auth.uid(),$1,$2)`, [key, auth]));
  await as("authenticated", USUARIO, () =>
    query(`insert into public.suscripciones_push(endpoint,usuario_id,p256dh,auth) values('https://fcm.googleapis.com/fcm/send/usuario1',auth.uid(),$1,$2)`, [key, auth])
      .catch(() => {})); // el usuario normal no es admin; su endpoint no debe recibir nada de todas formas
  // El job del punto 5 sigue abierto con cierra/tope futuros: lo vencemos para que el worker lo tome ya.
  await query("update public.avisos_admin_jobs set cierra=clock_timestamp()-interval '1 second' where not expandido");
  for (let n = 0; n < 20 && (await expandir()); n++);
  const entregas = (await query("select * from public.avisos_admin_entregas").catch(() => ({ rows: [] }))).rows;
  check(entregas.every((e) => e.usuario_id === ADMIN || e.usuario_id === OTRO_ADMIN), "solo cuentas con rol admin reciben entrega");
  check(entregas.some((e) => e.usuario_id === ADMIN), "el admin con push activado recibe una entrega");

  const c = await tomar();
  check(c !== null, "tomar devuelve una entrega pendiente con token/lease");
  const autorizada = await autorizar(c);
  check(autorizada !== null && typeof autorizada.motivos === "object", "autorizar devuelve los conteos, no ids de fichas ni de personas");
  check(JSON.stringify(autorizada.motivos).length < 500, "el contenido es un objeto chico de conteos, no una lista de eventos");
  const cuerpo = await preparar(c, JSON.stringify({ titulo: "somosnosotros", cuerpo: "Cosas por revisar", url: "/admin" }));
  check(cuerpo !== null, "preparar persiste el cuerpo");
  check(await terminar(c) === true, "terminar cierra la entrega");

  // ---------- 7. ACL: RLS cerrado, service_role manda ----------
  await as("anon", null, () => expectError(() => query("select 1 from public.avisos_admin_jobs"), undefined, "anon no lee avisos_admin_jobs"));
  await as("authenticated", USUARIO, () => expectError(() => query("select 1 from public.avisos_admin_jobs"), undefined, "authenticated no lee avisos_admin_jobs"));
  await as("authenticated", USUARIO, () => expectError(() => query("select public.avisos_admin_expandir()"), "42501", "authenticated no ejecuta el worker"));
  await as("anon", null, () => expectError(() => query("select public.avisos_admin_encolar('x',null)"), "42501", "anon no llama avisos_admin_encolar directamente"));

  // ---------- 8. El punto de la cabecera reutiliza contarPendientes() (src/app/admin/consultas.ts): mismo
  // select count(*) from reportes where not atendido, protegido por la politica RLS "reportes: el admin lee"
  // (es_admin()), sin funcion nueva. Comprobamos que ese conteo, leido tal cual lo hace el TS, coincide con lo
  // que panel_pendientes() lista y se apaga solo al atender, no al mandarse el push. ----------
  const contarPendientesComoTS = (rol) => as("authenticated", rol, () => query("select count(*)::int as n from public.reportes where not atendido")).then((r) => r.rows[0].n);
  const pendientesPanel = (await as("authenticated", ADMIN, () => query("select * from public.panel_pendientes()"))).rows.length;
  const conteoCabecera = await contarPendientesComoTS(ADMIN);
  check(conteoCabecera === pendientesPanel, "el conteo de la cabecera coincide con lo que panel_pendientes() lista");
  check(await contarPendientesComoTS(USUARIO) === 0, "quien no es admin ve 0 (RLS 'reportes: el admin lee'), nunca un error que tumbe la cabecera");
  await query("update public.reportes set atendido=true where objeto_id=$1", [lugarId]);
  const conteoTrasAtender = await contarPendientesComoTS(ADMIN);
  check(conteoTrasAtender === conteoCabecera - 2, "el punto se apaga al resolver los reportes, no al mandarse el push");
}
