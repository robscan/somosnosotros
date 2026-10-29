// OL-480 (bitácora 512): la forma de los avisos y cuántos se abren (migración 20261029170000_avisos_forma.sql).
// `avisos_expandir` guarda por persona por qué le llega un evento nuevo (`motivo`: el artista que sigue va antes que el lugar); `avisos_autorizar`
// lo devuelve con la descripción y la dirección del lugar (nunca la de un sitio reservado); `avisos_abiertos` cuenta por día y tipo sin nadie
// detrás y solo la escribe el servidor; `panel_avisos` es solo de la administración y no la cuenta a ella.
// Como push-direcciones-muertas.test.mjs, no usa `avisos_tomar` (sus cuatro slots son globales a toda la suite): toma a mano sus entregas.
import { randomUUID } from "node:crypto";

const KEY = Buffer.concat([Buffer.from([4]), Buffer.alloc(64)]).toString("base64url");
const AUTH = Buffer.alloc(16).toString("base64url");
const INSERT_WEB = "insert into public.suscripciones_push(endpoint,usuario_id,p256dh,auth) values($1,auth.uid(),$2,$3)";

export async function run({ as, check, expectError, query }) {
  const AUTOR = randomUUID(), ARTE = randomUUID(), LUGAR = randomUUID(), AMBOS = randomUUID(), ADMIN = randomUUID();
  await query("insert into public.admin_correos values('forma-admin@local.test')");
  await query(`insert into auth.users(id,email) values ($1,'forma-autor@local.test'),($2,'forma-arte@local.test'),($3,'forma-lugar@local.test'),
    ($4,'forma-ambos@local.test'),($5,'forma-admin@local.test')`, [AUTOR, ARTE, LUGAR, AMBOS, ADMIN]);
  await query("update public.avisos_config set capturar=true, corte=clock_timestamp(), entregar=true");
  const servicio = (sql, args) => as("service_role", null, () => query(sql, args));

  // ---------- la columna nueva: nula y con su forma ----------
  const col = (await query(`select is_nullable from information_schema.columns where table_schema='public' and table_name='avisos_entregas' and column_name='motivo'`)).rows[0];
  check(col?.is_nullable === "YES", "avisos_entregas.motivo existe y es nula", col);

  const lugar = (await as("authenticated", AUTOR, () => query(
    `insert into public.lugares(nombre,tipo,lat,lng,direccion,creado_por) values('Teatro forma','foro',22.15,-100.98,'Villerías 2, Centro',auth.uid()) returning id`))).rows[0].id;
  const artistas = [];
  for (const nombre of ["Luna forma", "Sol forma"]) {
    artistas.push((await as("authenticated", AUTOR, () => query(
      `insert into public.artistas(nombre,disciplina,creado_por) values($1,'musica',auth.uid()) returning id`, [nombre]))).rows[0].id);
  }
  // ARTE sigue a Sol (el segundo del cartel); LUGAR sigue el lugar; AMBOS sigue el lugar y a Luna; ADMIN sigue el lugar (y es administración).
  await query(`insert into public.seguimientos(usuario_id,artista_id) values ($1,$2),($3,$4)`, [ARTE, artistas[1], AMBOS, artistas[0]]);
  await query(`insert into public.seguimientos(usuario_id,lugar_id) values ($1,$3),($2,$3),($4,$3)`, [LUGAR, AMBOS, lugar, ADMIN]);
  for (const persona of [ARTE, LUGAR, AMBOS, ADMIN]) {
    await query("update public.perfiles set avisos_push=true where id=$1", [persona]);
    await as("authenticated", persona, () => query(INSERT_WEB, [`https://fcm.googleapis.com/fcm/send/forma-${persona}`, KEY, AUTH]));
  }

  const publicar = async (titulo, extra = {}, privado = null) => {
    const op = randomUUID();
    const datos = { titulo, inicio: new Date(Date.now() + 3 * 86400000).toISOString(), fin: null, lugar_id: lugar, sitio_texto: null,
      sitio_lat: null, sitio_lng: null, sitio_reservado: false, sitio_revelar_desde: null, ciudad: "Prueba", zona: "America/Mexico_City",
      descripcion: "Baile de salón con orquesta en vivo", imagen: null, precio: null, enlace: null, ...extra };
    await as("authenticated", AUTOR, () => query("select public.guardar_evento_con_avisos(null,$1::jsonb,$4::jsonb,$2::jsonb,null,$3) as r",
      [JSON.stringify(datos), JSON.stringify([{ id: artistas[0], nombre: "Luna forma" }, { id: artistas[1], nombre: "Sol forma" }]), op, privado && JSON.stringify(privado)]));
    for (let n = 0; n < 100; n++) if (!(await servicio("select public.avisos_expandir() as r")).rows[0].r) break;
    return op;
  };
  const entregas = async (evento) => (await query(`select e.id, e.usuario_id, e.motivo from public.avisos_entregas e join public.avisos_jobs j on j.id=e.job_id
    where j.evento_id=$1 and e.canal='push'`, [evento])).rows;

  // ---------- avisos_expandir: el motivo por persona ----------
  const evento = await publicar("Noche forma");
  const lista = await entregas(evento);
  const motivo = (u) => lista.find((e) => e.usuario_id === u)?.motivo;
  check(lista.length === 4, "una entrega push por persona que sigue algo del evento", lista);
  check(motivo(ARTE) === "artista:Sol forma", "quien sigue a un artista del cartel: artista:<nombre>", motivo(ARTE));
  check(motivo(LUGAR) === "lugar", "quien sigue solo el lugar: lugar", motivo(LUGAR));
  check(motivo(AMBOS) === "artista:Luna forma", "quien sigue el lugar y a un artista: el artista va antes que el lugar", motivo(AMBOS));
  await expectError(() => query("update public.avisos_entregas set motivo='fulano publicó' where id=$1", [lista[0].id]), "23514",
    "motivo solo admite lugar o artista:<nombre>");

  // ---------- avisos_autorizar: motivo, descripción y dirección del lugar ----------
  const tomarPropia = async (id) => {
    const token = randomUUID();
    await query(`update public.avisos_entregas set token=$2,lease_hasta=clock_timestamp()+interval '90 seconds',estado='tomada' where id=$1`, [id, token]);
    return { id, token };
  };
  const autorizar = async (c) => (await servicio("select public.avisos_autorizar($1,$2) as r", [c.id, c.token])).rows[0].r;
  const aut = await autorizar(await tomarPropia(lista.find((e) => e.usuario_id === AMBOS).id));
  check(aut?.motivo === "artista:Luna forma" && aut?.descripcion === "Baile de salón con orquesta en vivo" && aut?.direccion === "Villerías 2, Centro",
    "autorizar devuelve el motivo, la descripción y la dirección del lugar", aut);
  check(aut?.suscripcion?.endpoint?.endsWith(AMBOS) && aut?.evento?.titulo === "Noche forma", "y lo de siempre (la suscripción, la foto del evento)", aut);

  // Un evento en sitio reservado: la dirección nunca sale.
  const revelar = new Date(Date.now() + 2 * 86400000).toISOString();
  const reservado = await publicar("Casa forma", { lugar_id: null, sitio_texto: "Casa de Ana", sitio_reservado: true, sitio_revelar_desde: revelar },
    { direccion: "NO DEBE VIAJAR", lat: 22.123456, lng: -100.98765, indicaciones: "SECRETO", revelar_desde: revelar });
  const deReservado = await entregas(reservado);
  check(deReservado.length === 2, "el evento sin lugar llega a quien sigue a sus artistas", deReservado);
  if (deReservado.length) {
    const r = await autorizar(await tomarPropia(deReservado[0].id));
    check(r !== null && r.direccion === null && !JSON.stringify(r).includes("NO DEBE VIAJAR"), "con sitio reservado, autorizar no da ninguna dirección", r);
  }
  check(deReservado.every((e) => e.motivo === "artista:Luna forma" || e.motivo === "artista:Sol forma"),
    "sin lugar, solo llega a quien sigue a un artista del cartel, con su motivo", deReservado);
  await query("update public.avisos_entregas set estado='descartada',token=null,lease_hasta=null where estado in ('pendiente','tomada') and job_id in (select id from public.avisos_jobs where evento_id in ($1,$2))", [evento, reservado]);

  // ---------- avisos_abiertos: solo el servidor cuenta, sin nadie detrás ----------
  const columnas = (await query(`select column_name from information_schema.columns where table_schema='public' and table_name='avisos_abiertos' order by 1`)).rows.map((r) => r.column_name);
  check(columnas.join(",") === "dia,n,tipo", "avisos_abiertos solo tiene día, tipo y conteo", columnas);
  for (const rol of ["anon", "authenticated"]) {
    await as(rol, rol === "anon" ? null : LUGAR, () => expectError(() => query("select public.avisos_contar_abierto('nuevo')"), "42501", `${rol} no puede contar`));
    await as(rol, rol === "anon" ? null : LUGAR, () => expectError(() => query("select * from public.avisos_abiertos"), "42501", `${rol} no lee los conteos`));
    await as(rol, rol === "anon" ? null : LUGAR, () => expectError(() => query("insert into public.avisos_abiertos values(current_date,'nuevo',99)"), "42501", `${rol} no escribe los conteos`));
  }
  for (const tipo of ["nuevo", "nuevo", "recordatorio", "fulano", null]) await servicio("select public.avisos_contar_abierto($1)", [tipo]);
  const conteo = Object.fromEntries((await query("select tipo, n from public.avisos_abiertos where dia=(clock_timestamp() at time zone 'America/Mexico_City')::date")).rows.map((r) => [r.tipo, r.n]));
  check(conteo.nuevo === 2 && conteo.recordatorio === 1 && !("fulano" in conteo) && Object.keys(conteo).length === 2,
    "el servidor suma uno por apertura y por tipo; un tipo fuera de la lista no se cuenta", conteo);
  // Un día de la semana anterior, para la comparación.
  await query("insert into public.avisos_abiertos values(((clock_timestamp() at time zone 'America/Mexico_City')::date - 9), 'nuevo', 5)");

  // ---------- panel_avisos: solo la administración, sin contarla ----------
  await as("authenticated", LUGAR, () => expectError(() => query("select public.panel_avisos()"), "42501", "una persona no ve el panel de avisos"));
  await as("anon", null, () => expectError(() => query("select public.panel_avisos()"), "42501", "sin sesión, tampoco"));
  // Dos enviadas hoy (una a la administración) y una hace 10 días.
  const [a, b, c] = lista.filter((e) => e.usuario_id !== ARTE).map((e) => e.id);
  const deAdmin = lista.find((e) => e.usuario_id === ADMIN).id;
  await query("update public.avisos_entregas set estado='enviada', terminado_en=clock_timestamp() where id = any($1)", [[a, b, c, deAdmin].filter(Boolean)]);
  await query("update public.avisos_entregas set estado='enviada', terminado_en=clock_timestamp() - interval '10 days' where id=$1", [lista.find((e) => e.usuario_id === ARTE).id]);
  const panel = (await as("authenticated", ADMIN, () => query("select public.panel_avisos() as r"))).rows[0].r;
  check(panel.mandados === 2 && panel.mandados_antes === 1, "salieron: los de 7 días sin la administración, y los de antes aparte", panel);
  check(panel.abiertos === 3 && panel.abiertos_antes === 5, "abiertos: los de 7 días y los de la semana anterior", panel);
  check(panel.tipos?.nuevo?.mandados === 2 && panel.tipos?.nuevo?.abiertos === 2 && panel.tipos?.recordatorio?.abiertos === 1 && panel.tipos?.cancelado?.mandados === 0,
    "con el desglose por tipo", panel.tipos);
  check(!JSON.stringify(panel).match(/[0-9a-f]{8}-[0-9a-f]{4}/), "sin ids de nadie", panel);

  // ---------- permisos y search_path ----------
  const funciones = (await query(`select p.proname, p.proconfig, p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('avisos_expandir','avisos_autorizar','avisos_contar_abierto','panel_avisos')`)).rows;
  check(funciones.length === 4 && funciones.every((f) => f.prosecdef && f.proconfig?.includes('search_path=""')), "las cuatro: security definer con search_path vacío", funciones);
  const ejecutan = (await query(`select f, r, has_function_privilege(r, f, 'execute') as puede from unnest(array['public.avisos_expandir()','public.avisos_autorizar(uuid,uuid)',
    'public.avisos_contar_abierto(text)','public.panel_avisos()']) f, unnest(array['anon','authenticated','service_role']) r`)).rows;
  const puede = (f, r) => ejecutan.find((x) => x.f === f && x.r === r)?.puede;
  check(!puede("public.avisos_expandir()", "authenticated") && !puede("public.avisos_autorizar(uuid,uuid)", "anon") && puede("public.avisos_expandir()", "service_role"),
    "expandir y autorizar siguen solo para el servidor", ejecutan);
  check(!puede("public.avisos_contar_abierto(text)", "anon") && !puede("public.avisos_contar_abierto(text)", "authenticated") && puede("public.avisos_contar_abierto(text)", "service_role"),
    "contar solo el servidor");
  check(!puede("public.panel_avisos()", "anon") && puede("public.panel_avisos()", "authenticated"), "el panel: con sesión (y por dentro solo la administración)");
  const rls = (await query("select relrowsecurity from pg_class where oid='public.avisos_abiertos'::regclass")).rows[0];
  check(rls.relrowsecurity, "avisos_abiertos con RLS encendida");
  console.log("Forma de los avisos (OL-480): motivo por persona, autorizar con lo público, conteo de abiertos sin nadie y panel solo de la administración");
}
