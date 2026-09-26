// OL-213 (bitácora 242): tabla dispositivos_apns (migración 20260925160000) y su fanout dentro del canal 'push'
// del motor de avisos fiables (avisos_expandir/avisos_autorizar, bitácora 113). Mismo patrón que push.test.mjs
// (RLS "cada quien las suyas") más una integración real con el motor, igual que avisos-fiables.test.mjs.
import { randomUUID } from "node:crypto";

const TOKEN = "a".repeat(64);
const OTRO_TOKEN = "b".repeat(64);
const INSERT = "insert into public.dispositivos_apns (token, usuario_id, entorno) values ($1, $2, $3)";

export async function run({ as, check, expectError, query, connection }) {
  const PERSONA = randomUUID(), OTRA = randomUUID();
  await query("insert into auth.users (id, email) values ($1, 'apns1@local.test'), ($2, 'apns2@local.test')", [PERSONA, OTRA]);

  // ---------- RLS: "cada quien los suyos" (igual que suscripciones_push) ----------
  await as("anon", null, () => expectError(
    () => query(INSERT, [TOKEN, PERSONA, "sandbox"]), "42501", "anon no registra dispositivos",
  ));
  await as("authenticated", OTRA, () => expectError(
    () => query(INSERT, [TOKEN, PERSONA, "sandbox"]), "42501", "una cuenta no registra dispositivos ajenos",
  ));
  await as("authenticated", PERSONA, () => query(INSERT, [TOKEN, PERSONA, "sandbox"]));
  const propia = await as("authenticated", PERSONA, () => query("select token from public.dispositivos_apns where usuario_id=$1", [PERSONA]));
  check(propia.rowCount === 1 && propia.rows[0].token === TOKEN, "la cuenta ve su propio dispositivo");
  const ajena = await as("authenticated", OTRA, () => query("select token from public.dispositivos_apns where usuario_id=$1", [PERSONA]));
  check(ajena.rowCount === 0, "otra cuenta no ve dispositivos ajenos");
  // Bajo RLS, un UPDATE/DELETE de otra cuenta no lanza error: la fila ajena no entra en su USING y queda en 0 filas.
  const updateAjeno = await as("authenticated", OTRA, () => query("update public.dispositivos_apns set entorno='produccion' where token=$1", [TOKEN]));
  check(updateAjeno.rowCount === 0, "una cuenta no actualiza dispositivos ajenos (0 filas bajo RLS)");
  await as("authenticated", PERSONA, () => query("update public.dispositivos_apns set entorno='produccion' where token=$1", [TOKEN]));
  const borrarAjeno = await as("authenticated", OTRA, () => query("delete from public.dispositivos_apns where token=$1", [TOKEN]));
  check(borrarAjeno.rowCount === 0, "una cuenta no borra dispositivos ajenos (0 filas bajo RLS)");
  await as("authenticated", PERSONA, () => query("delete from public.dispositivos_apns where token=$1", [TOKEN]));
  check((await query("select 1 from public.dispositivos_apns where token=$1", [TOKEN])).rowCount === 0, "el borrado propio sí surte efecto");

  // ---------- Restricciones de la columna ----------
  await as("authenticated", PERSONA, () => expectError(
    () => query(INSERT, [TOKEN, PERSONA, "produccion-mal"]), "23514", "el entorno solo admite sandbox/produccion",
  ));
  await as("authenticated", PERSONA, () => expectError(
    () => query(INSERT, ["no-es-hex", PERSONA, "sandbox"]), "23514", "el token debe ser hexadecimal",
  ));
  await as("authenticated", PERSONA, () => expectError(
    () => query(INSERT, ["a".repeat(10), PERSONA, "sandbox"]), "23514", "un token demasiado corto se rechaza",
  ));

  // ---------- Cascada al borrar la cuenta ----------
  await as("authenticated", PERSONA, () => query(INSERT, [TOKEN, PERSONA, "sandbox"]));
  await query("delete from auth.users where id=$1", [PERSONA]);
  check((await query("select 1 from public.dispositivos_apns where token=$1", [TOKEN])).rowCount === 0, "borrar la cuenta borra sus dispositivos APNs (cascade)");

  // ---------- Integración con el motor de avisos fiables (bitácora 113): quien SOLO tiene la app también recibe ----------
  const AUTHOR = randomUUID(), SOLO_APP = randomUUID(), CON_AMBOS = randomUUID();
  await query(`insert into auth.users(id,email) values ($1,'apns-author@local.test'),($2,'apns-solo-app@local.test'),($3,'apns-ambos@local.test')`,
    [AUTHOR, SOLO_APP, CON_AMBOS]);
  await query("update public.avisos_config set capturar=true, corte=clock_timestamp(), entregar=true");
  const artist = (await as("authenticated", AUTHOR, () => query(
    `insert into public.artistas(nombre,disciplina,creado_por) values('Artista APNs','musica',auth.uid()) returning id`,
  ))).rows[0].id;
  await query("update public.perfiles set avisos_push=true where id=any($1::uuid[])", [[SOLO_APP, CON_AMBOS]]);
  await query("insert into public.seguimientos(usuario_id,artista_id) values($1,$2),($3,$2)", [SOLO_APP, artist, CON_AMBOS]);
  await as("authenticated", SOLO_APP, () => query(INSERT, [TOKEN, SOLO_APP, "sandbox"]));
  const key = Buffer.concat([Buffer.from([4]), Buffer.alloc(64)]).toString("base64url"), auth = Buffer.alloc(16).toString("base64url");
  await as("authenticated", CON_AMBOS, () => query(
    `insert into public.suscripciones_push(endpoint,usuario_id,p256dh,auth) values('https://fcm.googleapis.com/fcm/send/apns-ambos',auth.uid(),$1,$2)`,
    [key, auth],
  ));
  await as("authenticated", CON_AMBOS, () => query(INSERT, [OTRO_TOKEN, CON_AMBOS, "produccion"]));

  const op = randomUUID();
  const datos = { titulo: "Concierto APNs", inicio: new Date(Date.now() + 3 * 86400000).toISOString(), fin: null,
    lugar_id: null, sitio_texto: "Zona pública", sitio_lat: null, sitio_lng: null, sitio_reservado: false,
    sitio_revelar_desde: null, ciudad: "Prueba", zona: "America/Mexico_City", descripcion: null, imagen: null, precio: null, enlace: null };
  // p_evento=null crea un evento nuevo con el id de p_operacion (no de p_evento; ver guardar_evento_completo).
  await as("authenticated", AUTHOR, () => query(
    "select public.guardar_evento_con_avisos(null,$1::jsonb,null,$2::jsonb,null,$3) as r",
    [JSON.stringify(datos), JSON.stringify([{ id: artist, nombre: "Artista APNs" }]), op],
  ));
  const expandir = async () => { for (let n = 0; n < 100; n++) if (!(await query("select public.avisos_expandir() as r")).rows[0].r) return; throw new Error("expansion no termina"); };
  await expandir();

  const job = (await query("select id from public.avisos_jobs where evento_id=$1", [op])).rows[0].id;
  const entregas = (await query("select id,canal,endpoint,usuario_id from public.avisos_entregas where job_id=$1", [job])).rows;
  const pushSoloApp = entregas.find((e) => e.canal === "push" && e.usuario_id === SOLO_APP);
  const pushesAmbos = entregas.filter((e) => e.canal === "push" && e.usuario_id === CON_AMBOS);
  check(!!pushSoloApp && pushSoloApp.endpoint === `apns:${TOKEN}`, "quien solo tiene la app recibe una entrega 'push' con el token APNs como endpoint");
  check(pushesAmbos.length === 2, "quien tiene navegador y app recibe DOS entregas push (una por dispositivo)");
  check(entregas.filter((e) => e.canal === "correo").length === 0, "sin avisos_correo, ninguna entrega de correo");

  // `avisos_tomar()` reparte por los CUATRO slots globales entre TODOS los archivos de esta suite (una sola base
  // efímera compartida, no una por archivo): usarlo aquí competiría con lo que ya haya dejado pendiente
  // avisos-fiables.test.mjs. Se simula el "tomada" a mano, sobre las entregas de ESTE job únicamente (mismas
  // columnas que deja `avisos_tomar`: token + lease_hasta + estado), y se prueba solo `avisos_autorizar`.
  async function tomarPropia(entregaId) {
    const token = randomUUID();
    await query("update public.avisos_entregas set token=$2,lease_hasta=clock_timestamp()+interval '90 seconds',estado='tomada' where id=$1", [entregaId, token]);
    return { id: entregaId, token };
  }
  const autorizar = async (c) => (await query("select public.avisos_autorizar($1,$2) as r", [c.id, c.token])).rows[0].r;

  const claimApp = await tomarPropia(pushSoloApp.id);
  const dApp = await autorizar(claimApp);
  check(dApp?.suscripcion?.apns?.token === TOKEN && dApp.suscripcion.apns.entorno === "sandbox",
    "avisos_autorizar arma { apns: { token, entorno } } para un endpoint 'apns:'");

  const entregaWeb = pushesAmbos.find((e) => e.endpoint.startsWith("https://"));
  const claimWeb = await tomarPropia(entregaWeb.id);
  const dWeb = await autorizar(claimWeb);
  check(dWeb?.suscripcion?.endpoint?.startsWith("https://") && !("apns" in dWeb.suscripcion),
    "un endpoint web sigue armando { endpoint, keys }, sin mezclar con la forma de APNs");

  // Retirar el dispositivo después del claim: la misma regla que ya prueba avisos-fiables.test.mjs para un endpoint web.
  const entregaAmbosApns = pushesAmbos.find((e) => e.endpoint === `apns:${OTRO_TOKEN}`);
  const claimAmbosApns = await tomarPropia(entregaAmbosApns.id);
  await query("begin");
  try {
    await query("delete from public.dispositivos_apns where token=$1", [OTRO_TOKEN]);
    check(await autorizar(claimAmbosApns) === null, "el token APNs retirado despues del claim no recibe HTTP (sin_endpoint)");
  } finally {
    await query("rollback");
  }

  // El cupo de lecturas simultaneas no es parte de esta pieza (a diferencia de suscripciones_push): un token vencido
  // se reemplaza, no se acumula por reintentos del cliente, asi que no hace falta un limite por cuenta aqui.
  const concurrentes = await Promise.all(Array.from({ length: 3 }, (_, i) => connection(async (client) => {
    await client.query("select set_config('request.jwt.claim.sub', $1, false)", [SOLO_APP]);
    await client.query("set role authenticated");
    try {
      await client.query(INSERT, [`c${i}`.padEnd(64, "0"), SOLO_APP, "sandbox"]);
      return "ok";
    } catch (error) {
      return error.code;
    }
  })));
  check(concurrentes.every((r) => r === "ok"), "varios dispositivos por cuenta (varios teléfonos con la app) sin cupo especial", concurrentes);
}
