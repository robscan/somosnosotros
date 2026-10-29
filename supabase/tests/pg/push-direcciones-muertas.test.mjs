// OL-476 (bitácora 508): direcciones muertas (migración 20261029120000_avisos_direcciones_muertas.sql).
// Un 404/410 de Web Push, o un 410/BadDeviceToken de APNs, marca `muerta_en` (nada se borra); `avisos_expandir` deja de
// crear entregas para ellas, `avisos_autorizar` descarta las que ya estaban creadas, la pantalla las ve «apagadas», el cupo
// de diez solo cuenta las vivas y volver a darlas de alta las revive. Igual en el aviso a la administración.
// Como dispositivos-apns.test.mjs, no usa `avisos_tomar` (sus cuatro slots son globales a toda la suite): toma a mano
// solo las entregas de esta prueba, y al final descarta las que dejó pendientes.
import { randomUUID } from "node:crypto";

const KEY = Buffer.concat([Buffer.from([4]), Buffer.alloc(64)]).toString("base64url");
const AUTH = Buffer.alloc(16).toString("base64url");
const web = (nombre) => `https://fcm.googleapis.com/fcm/send/muertas-${nombre}`;
const apns = (letra) => letra.repeat(64);
const INSERT_WEB = "insert into public.suscripciones_push(endpoint,usuario_id,p256dh,auth) values($1,auth.uid(),$2,$3)";
const INSERT_APNS = "insert into public.dispositivos_apns(token,usuario_id,entorno) values($1,auth.uid(),'produccion')";

export async function run({ as, check, expectError, query }) {
  const AUTOR = randomUUID(), PERSONA = randomUUID(), LLENA = randomUUID();
  await query(`insert into auth.users(id,email) values ($1,'muertas-autor@local.test'),($2,'muertas-persona@local.test'),($3,'muertas-llena@local.test')`,
    [AUTOR, PERSONA, LLENA]);
  await query("update public.avisos_config set capturar=true, corte=clock_timestamp(), entregar=true");

  // ---------- Columnas nuevas, nulas, sin borrar nada ----------
  const columnas = (await query(`select table_name, is_nullable from information_schema.columns
    where table_schema='public' and column_name='muerta_en' and table_name in ('suscripciones_push','dispositivos_apns') order by 1`)).rows;
  check(columnas.length === 2 && columnas.every((c) => c.is_nullable === "YES"), "muerta_en existe y es nula en suscripciones_push y dispositivos_apns", columnas);

  const artista = (await as("authenticated", AUTOR, () => query(
    `insert into public.artistas(nombre,disciplina,creado_por) values('Artista muertas','musica',auth.uid()) returning id`,
  ))).rows[0].id;
  await query("update public.perfiles set avisos_push=true where id=$1", [PERSONA]);
  await query("insert into public.seguimientos(usuario_id,artista_id) values($1,$2)", [PERSONA, artista]);
  await as("authenticated", PERSONA, async () => {
    for (const e of [web("viva"), web("muere")]) await query(INSERT_WEB, [e, KEY, AUTH]);
    for (const t of [apns("c"), apns("d")]) await query(INSERT_APNS, [t]);
  });

  const publicar = async (titulo) => {
    const op = randomUUID();
    const datos = { titulo, inicio: new Date(Date.now() + 3 * 86400000).toISOString(), fin: null,
      lugar_id: null, sitio_texto: "Zona pública", sitio_lat: 22.15, sitio_lng: -100.98, sitio_reservado: false,
      sitio_revelar_desde: null, ciudad: "Prueba", zona: "America/Mexico_City", descripcion: null, imagen: null, precio: null, enlace: null };
    await as("authenticated", AUTOR, () => query(
      "select public.guardar_evento_con_avisos(null,$1::jsonb,null,$2::jsonb,null,$3) as r",
      [JSON.stringify(datos), JSON.stringify([{ id: artista, nombre: "Artista muertas" }]), op],
    ));
    for (let n = 0; n < 100; n++) if (!(await query("select public.avisos_expandir() as r")).rows[0].r) break;
    const job = (await query("select id from public.avisos_jobs where evento_id=$1", [op])).rows[0].id;
    return (await query("select id,endpoint from public.avisos_entregas where job_id=$1 and canal='push' and usuario_id=$2", [job, PERSONA])).rows;
  };
  async function tomarPropia(entregaId, primerIntento = "clock_timestamp()") {
    const token = randomUUID();
    await query(`update public.avisos_entregas set token=$2,lease_hasta=clock_timestamp()+interval '90 seconds',estado='tomada',
      primer_intento=${primerIntento} where id=$1`, [entregaId, token]);
    return { id: entregaId, token };
  }
  const terminar = async (c, resultado, codigo) => (await query("select public.avisos_terminar($1,$2,$3,$4) as r", [c.id, c.token, resultado, codigo])).rows[0].r;
  const muertaWeb = async (e) => (await query("select muerta_en from public.suscripciones_push where endpoint=$1", [e])).rows[0]?.muerta_en ?? null;
  const muertaApns = async (t) => (await query("select muerta_en from public.dispositivos_apns where token=$1", [t])).rows[0]?.muerta_en ?? null;

  const primera = await publicar("Concierto muertas uno");
  const de = (endpoint) => primera.find((e) => e.endpoint === endpoint);
  check(primera.length === 4, "con todo vivo, cuatro entregas push (dos navegadores y dos teléfonos con la app)", primera);

  // ---------- avisos_terminar marca solo lo que el proveedor dio por muerto ----------
  check(await terminar(await tomarPropia(de(web("viva")).id), "fallida", "push_400"), "un 400 se termina");
  check(await muertaWeb(web("viva")) === null, "un 400 de Web Push no marca la suscripción (no dice que ya no exista)");
  check(await terminar(await tomarPropia(de(web("muere")).id), "fallida", "push_410"), "un 410 se termina");
  check(await muertaWeb(web("muere")) !== null, "un 410 de Web Push marca muerta_en en la suscripción");
  check((await query("select 1 from public.suscripciones_push where endpoint=$1", [web("muere")])).rowCount === 1, "la suscripción muerta no se borra");

  check(await terminar(await tomarPropia(de(`apns:${apns("c")}`).id), "fallida", "apns_410_unregistered"), "un 410 de APNs se termina");
  check(await muertaApns(apns("c")) !== null, "un 410 Unregistered de APNs marca muerta_en en el dispositivo");
  check((await query("select 1 from public.dispositivos_apns where token=$1", [apns("c")])).rowCount === 1, "el dispositivo muerto no se borra");

  // Carrera: la app volvió a registrar el token después de que salió el aviso (actualizado_en posterior): no se marca.
  const claimD = await tomarPropia(de(`apns:${apns("d")}`).id, "clock_timestamp() - interval '1 minute'");
  await query("update public.dispositivos_apns set actualizado_en=clock_timestamp() where token=$1", [apns("d")]);
  check(await terminar(claimD, "fallida", "apns_400_baddevicetoken"), "un BadDeviceToken se termina");
  check(await muertaApns(apns("d")) === null, "un token que la app volvió a registrar mientras Apple respondía no se marca");
  // Y sin esa carrera, BadDeviceToken sí marca.
  await query("update public.dispositivos_apns set actualizado_en=clock_timestamp() - interval '1 hour' where token=$1", [apns("d")]);
  await query("update public.avisos_entregas set estado='pendiente' where id=$1", [claimD.id]);
  check(await terminar(await tomarPropia(claimD.id), "fallida", "apns_400_baddevicetoken"), "el mismo BadDeviceToken otra vez");
  check(await muertaApns(apns("d")) !== null, "un 400 BadDeviceToken marca muerta_en en el dispositivo");
  await query("update public.dispositivos_apns set muerta_en=null where token=$1", [apns("d")]);

  // Un código que no es de dirección muerta (p. ej. un JWT rechazado) no marca nada.
  await query("update public.avisos_entregas set estado='pendiente' where id=$1", [claimD.id]);
  check(await terminar(await tomarPropia(claimD.id), "fallida", "apns_403_invalidprovidertoken"), "un 403 se termina");
  check(await muertaApns(apns("d")) === null, "un 403 InvalidProviderToken (la llave) no marca el dispositivo");
  await expectError(() => query("select public.avisos_terminar($1,$2,'fallida','excepcion:TypeError')", [claimD.id, randomUUID()]),
    null, "el código sigue limitado a ^[a-z0-9_]{1,60}$ (el trabajador lo normaliza antes)");

  // ---------- avisos_expandir deja de crear entregas para las muertas ----------
  const segunda = await publicar("Concierto muertas dos");
  const destinos = segunda.map((e) => e.endpoint).sort();
  check(destinos.length === 2 && destinos.includes(web("viva")) && destinos.includes(`apns:${apns("d")}`),
    "el siguiente aviso solo crea entregas para las direcciones vivas", destinos);

  // ---------- avisos_autorizar descarta una entrega ya creada si la dirección murió después ----------
  const entregaViva = segunda.find((e) => e.endpoint === web("viva"));
  await query("update public.suscripciones_push set muerta_en=clock_timestamp() where endpoint=$1", [web("viva")]);
  const claimViva = await tomarPropia(entregaViva.id);
  check((await query("select public.avisos_autorizar($1,$2) as r", [claimViva.id, claimViva.token])).rows[0].r === null,
    "una entrega para una dirección que murió después de expandirse no sale");
  const descartada = (await query("select estado,codigo from public.avisos_entregas where id=$1", [entregaViva.id])).rows[0];
  check(descartada.estado === "descartada" && descartada.codigo === "direccion_muerta", "queda descartada con código direccion_muerta", descartada);
  const entregaApps = segunda.find((e) => e.endpoint === `apns:${apns("d")}`);
  const claimApps = await tomarPropia(entregaApps.id);
  const autorizada = (await query("select public.avisos_autorizar($1,$2) as r", [claimApps.id, claimApps.token])).rows[0].r;
  check(autorizada?.suscripcion?.apns?.token === apns("d"), "un dispositivo vivo sigue autorizándose con { apns }");

  // ---------- la pantalla: una dirección muerta no cuenta como «encendido» ----------
  const activo = (args) => as("authenticated", PERSONA, async () => (await query(
    "select public.mi_push_activo($1,$2) as r", args)).rows[0].r);
  check(await activo([web("muere"), null]) === false, "mi_push_activo dice que no para una suscripción muerta");
  check(await activo([null, apns("c")]) === false, "mi_push_activo dice que no para un token APNs muerto");
  check(await activo([null, apns("d")]) === true, "mi_push_activo sigue diciendo que sí para un token vivo");

  // ---------- volver a darla de alta la revive (lo que manda perfil/acciones.ts) ----------
  await as("authenticated", PERSONA, () => query(
    `insert into public.suscripciones_push(endpoint,usuario_id,p256dh,auth,muerta_en) values($1,auth.uid(),$2,$3,null)
     on conflict(endpoint) do update set p256dh=excluded.p256dh, auth=excluded.auth, muerta_en=null`, [web("muere"), KEY, AUTH]));
  check(await muertaWeb(web("muere")) === null, "volver a dar de alta la suscripción la revive");
  await as("authenticated", PERSONA, () => query(
    `insert into public.dispositivos_apns(token,usuario_id,entorno,muerta_en) values($1,auth.uid(),'produccion',null)
     on conflict(token) do update set entorno=excluded.entorno, actualizado_en=now(), muerta_en=null`, [apns("c")]));
  check(await muertaApns(apns("c")) === null, "volver a registrar el token en la app lo revive");
  check(await activo([null, apns("c")]) === true, "y la pantalla lo vuelve a ver encendido");

  // ---------- el cupo de diez teléfonos solo cuenta los vivos ----------
  await as("authenticated", LLENA, async () => { for (let i = 0; i < 10; i++) await query(INSERT_WEB, [web(`llena-${i}`), KEY, AUTH]); });
  await as("authenticated", LLENA, () => expectError(() => query(INSERT_WEB, [web("llena-extra"), KEY, AUTH]), "23514",
    "con diez vivas, la undécima se rechaza como antes"));
  await query("update public.suscripciones_push set muerta_en=clock_timestamp() where usuario_id=$1 and endpoint like '%llena-%'", [LLENA]);
  await as("authenticated", LLENA, () => query(INSERT_WEB, [web("llena-extra"), KEY, AUTH]));
  check((await query("select 1 from public.suscripciones_push where endpoint=$1", [web("llena-extra")])).rowCount === 1,
    "con diez muertas, el teléfono nuevo sí se da de alta");
  const definer = (await query(`select p.proconfig from pg_proc p where p.oid='public.limitar_suscripciones_push()'::regprocedure`)).rows[0];
  check(definer.proconfig?.includes('search_path=""'), "limitar_suscripciones_push conserva el search_path vacío", definer);

  // ---------- el aviso a la administración, igual ----------
  const ADMIN = randomUUID();
  await query("insert into public.admin_correos values('muertas-admin@local.test')");
  await query("insert into auth.users(id,email) values($1,'muertas-admin@local.test')", [ADMIN]);
  await query("update public.perfiles set avisos_push=true where id=$1", [ADMIN]);
  await as("authenticated", ADMIN, async () => { for (const e of [web("admin-viva"), web("admin-muerta")]) await query(INSERT_WEB, [e, KEY, AUTH]); });
  await query("update public.suscripciones_push set muerta_en=clock_timestamp() where endpoint=$1", [web("admin-muerta")]);
  const jobAdmin = (await query(`insert into public.avisos_admin_jobs(clave,cierra,tope,motivos)
    values('muertas-' || gen_random_uuid(), clock_timestamp() - interval '1 second', clock_timestamp() + interval '1 hour', '{"nuevo_evento":1}') returning id`)).rows[0].id;
  for (let n = 0; n < 50; n++) if (!(await query("select public.avisos_admin_expandir() as r")).rows[0].r) break;
  const entregasAdmin = (await query("select id,endpoint from public.avisos_admin_entregas where job_id=$1 and usuario_id=$2", [jobAdmin, ADMIN])).rows;
  check(entregasAdmin.length === 1 && entregasAdmin[0].endpoint === web("admin-viva"), "el aviso a la administración no crea entregas para direcciones muertas", entregasAdmin);
  const tokenAdmin = randomUUID();
  await query("update public.avisos_admin_entregas set token=$2,lease_hasta=clock_timestamp()+interval '90 seconds',estado='tomada' where id=$1", [entregasAdmin[0].id, tokenAdmin]);
  check((await query("select public.avisos_admin_terminar($1,$2,'fallida','push_404') as r", [entregasAdmin[0].id, tokenAdmin])).rows[0].r, "admin: un 404 se termina");
  check(await muertaWeb(web("admin-viva")) !== null, "admin: un 404 de Web Push marca la suscripción");

  // ---------- permisos: los mismos de antes ----------
  for (const firma of ["public.avisos_expandir()", "public.avisos_autorizar(uuid,uuid)", "public.avisos_terminar(uuid,uuid,text,text)",
    "public.avisos_admin_expandir()", "public.avisos_admin_autorizar(uuid,uuid)", "public.avisos_admin_terminar(uuid,uuid,text,text)"]) {
    const p = (await query(`select has_function_privilege('authenticated',$1,'execute') a, has_function_privilege('anon',$1,'execute') n,
      has_function_privilege('service_role',$1,'execute') s, (select proconfig from pg_proc where oid=$1::regprocedure) c`, [firma])).rows[0];
    check(!p.a && !p.n && p.s && p.c?.includes('search_path=""'), `${firma}: solo service_role y search_path vacío`, p);
  }
  const mpa = (await query(`select has_function_privilege('authenticated','public.mi_push_activo(text,text)','execute') a,
    has_function_privilege('anon','public.mi_push_activo(text,text)','execute') n`)).rows[0];
  check(mpa.a && !mpa.n, "mi_push_activo: solo authenticated", mpa);

  // ---------- el relleno de la migración: las que ya respondieron 404/410 antes quedan marcadas ----------
  // Se corre el mismo `update` del archivo de la migración sobre filas sembradas aquí (la base de la suite nace vacía).
  const { readFileSync } = await import("node:fs");
  const migracion = readFileSync(new URL("../../migrations/20261029120000_avisos_direcciones_muertas.sql", import.meta.url), "utf8");
  const relleno = migracion.match(/update public\.suscripciones_push s set muerta_en = x\.cuando[\s\S]*?;\n/)?.[0];
  check(!!relleno, "la migración trae el relleno de las direcciones que ya respondieron 404/410");
  const RELLENO = randomUUID();
  await query("insert into auth.users(id,email) values($1,'muertas-relleno@local.test')", [RELLENO]);
  await as("authenticated", RELLENO, async () => { for (const e of ["r-410", "r-revivio", "r-400"].map(web)) await query(INSERT_WEB, [e, KEY, AUTH]); });
  const jobRelleno = (await query("select job_id from public.avisos_entregas where id=$1", [segunda[0].id])).rows[0].job_id;
  const sembrar = (endpoint, estado, codigo, haceMin) => query(`insert into public.avisos_entregas(job_id,usuario_id,canal,endpoint,estado,codigo,terminado_en)
    values($1,$2,'push',$3,$4,$5,clock_timestamp() - make_interval(mins => $6))`, [jobRelleno, RELLENO, endpoint, estado, codigo, haceMin]);
  await sembrar(web("r-410"), "fallida", "push_410", 60);
  await sembrar(web("r-revivio"), "fallida", "push_410", 60);
  await query("insert into public.avisos_entregas(job_id,usuario_id,canal,endpoint,estado,codigo,terminado_en) values($1,$2,'push',$3,'enviada','aceptado',clock_timestamp())",
    [(await query("select job_id from public.avisos_entregas where id=$1", [primera[0].id])).rows[0].job_id, RELLENO, web("r-revivio")]);
  await sembrar(web("r-400"), "fallida", "push_400", 60);
  await query(relleno);
  check(await muertaWeb(web("r-410")) !== null, "relleno: la que respondió 410 queda marcada");
  check(await muertaWeb(web("r-revivio")) === null, "relleno: la que después recibió un aviso con éxito no se marca");
  check(await muertaWeb(web("r-400")) === null, "relleno: un 400 no la marca");

  // Limpieza: lo pendiente de esta prueba no queda para los slots globales de las siguientes.
  await query(`update public.avisos_entregas set estado='descartada',codigo='prueba',token=null,lease_hasta=null
    where usuario_id=$1 and estado in ('pendiente','tomada')`, [PERSONA]);
  await query("update public.avisos_admin_entregas set estado='descartada',codigo='prueba',token=null,lease_hasta=null where usuario_id=$1 and estado in ('pendiente','tomada')", [ADMIN]);
  console.log("Direcciones muertas (OL-476): marcar, no expandir, descartar, revivir, cupo de vivas y aviso a la administración");
}
