import { createECDH, randomBytes } from "node:crypto";

const PERSONA = "00000000-0000-4000-8000-0000000000b1";
const OTRA = "00000000-0000-4000-8000-0000000000b2";
const ecdh = createECDH("prime256v1");
ecdh.generateKeys();
const p256dh = ecdh.getPublicKey().toString("base64url");
const auth = randomBytes(16).toString("base64url");
const INSERT = "insert into public.suscripciones_push (endpoint, usuario_id, p256dh, auth) values ($1, $2, $3, $4)";

export async function run({ as, check, expectError, query, connection }) {
  await query("insert into auth.users (id, email) values ($1, 'push1@local.test'), ($2, 'push2@local.test')", [PERSONA, OTRA]);
  const validos = [
    "https://fcm.googleapis.com/fcm/send/abc-_:123", "https://fcm.googleapis.com/wp/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc", "https://web.push.apple.com/Qabc",
    "https://wns2-abc.notify.windows.com/w/?token=ab%2Bcd%3D",
  ];
  const invalidos = [
    "https://example.invalid/push", "https://127.0.0.1/push", "https://[::1]/push",
    "http://fcm.googleapis.com/push", "https://fcm.googleapis.com.ejemplo.invalid/push",
    "https://usuario@fcm.googleapis.com/push", "https://fcm.googleapis.com:443/push",
    "https://fcm.googleapis.com:8080/push", "https://fcm.googleapis.com./push",
    "https://fcm.googleapis.com/push#fragmento", "https://fcm.googleapis.com/push\\otra",
    "https://fcm.googleapis.com/push\n", "https://fcm.googleapis.com/ñ",
    "https://fcm.googleapis.com/", `https://fcm.googleapis.com/${"a".repeat(4096)}`,
  ];
  for (const endpoint of validos) {
    const r = await query("select public.push_endpoint_permitido($1) as permitido", [endpoint]);
    check(r.rows[0].permitido, `SQL acepta proveedor ${new URL(endpoint).hostname}`);
  }
  for (const endpoint of invalidos) {
    await as("authenticated", PERSONA, () => expectError(
      () => query(INSERT, [endpoint, PERSONA, p256dh, auth]), "23514", "SQL rechaza destino no permitido",
    ));
  }
  await as("anon", null, () => expectError(
    () => query(INSERT, [validos[0], PERSONA, p256dh, auth]), "42501", "anon no registra suscripciones",
  ));
  await as("authenticated", OTRA, () => expectError(
    () => query(INSERT, [validos[0], PERSONA, p256dh, auth]), "42501", "una cuenta no registra dispositivos ajenos",
  ));
  await as("authenticated", PERSONA, () => expectError(
    () => query(INSERT, [validos[0], PERSONA, p256dh, "a"]), "23514", "SQL rechaza llave auth incompleta",
  ));

  const resultados = await Promise.all(Array.from({ length: 14 }, (_, i) => connection(async (client) => {
    await client.query("select set_config('request.jwt.claim.sub', $1, false)", [PERSONA]);
    await client.query("set role authenticated");
    try {
      await client.query(INSERT, [`https://fcm.googleapis.com/fcm/send/concurrente-${i}`, PERSONA, p256dh, auth]);
      return "ok";
    } catch (error) {
      return error.code;
    }
  })));
  check(resultados.filter((r) => r === "ok").length === 10, "exactamente diez altas simultaneas tienen cupo", resultados);
  check(resultados.filter((r) => r === "23514").length === 4, "las cuatro altas sobrantes son rechazadas por cupo", resultados);
  const count = await query("select count(*)::int as n from public.suscripciones_push where usuario_id = $1", [PERSONA]);
  check(count.rows[0].n === 10, "el cupo se respeta en PostgreSQL bajo concurrencia");
  await as("authenticated", OTRA, () => expectError(
    () => query(INSERT, [validos[0], PERSONA, p256dh, auth]), "42501", "el cupo ajeno no cambia el rechazo de permisos",
  ));
  await connection(async (client) => {
    await client.query("begin isolation level repeatable read");
    try {
      await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claim.sub', $1, true)", [OTRA]);
      await expectError(() => client.query(INSERT, [validos[0], OTRA, p256dh, auth]), "25000", "un snapshot fijo no permite saltarse el cupo");
    } finally {
      await client.query("rollback");
    }
  });

  const { rows: [existente] } = await query("select endpoint from public.suscripciones_push where usuario_id = $1 limit 1", [PERSONA]);
  const renovada = await as("authenticated", PERSONA, () => query(
    `${INSERT} on conflict (endpoint) do update set auth = excluded.auth returning endpoint`, [existente.endpoint, PERSONA, p256dh, auth],
  ));
  check(renovada.rowCount === 1, "se puede renovar una suscripcion existente con el cupo lleno");
  const moverYRenovar = await Promise.all([
    connection(async (client) => {
      await client.query("select set_config('request.jwt.claim.sub', $1, false)", [PERSONA]);
      await client.query("set role authenticated");
      try {
        await client.query("update public.suscripciones_push set endpoint = $2 where endpoint = $1", [existente.endpoint, validos[1]]);
        return "movida";
      } catch (error) {
        return error.code;
      }
    }),
    connection(async (client) => {
      await client.query("select set_config('request.jwt.claim.sub', $1, false)", [PERSONA]);
      await client.query("set role authenticated");
      try {
        await client.query(`${INSERT} on conflict (endpoint) do update set auth = excluded.auth`, [existente.endpoint, PERSONA, p256dh, auth]);
        return "renovada";
      } catch (error) {
        return error.code;
      }
    }),
  ]);
  check(moverYRenovar[0] === "42501", "el endpoint es inmutable incluso al renovar en otra conexion", moverYRenovar);
  check(moverYRenovar[1] === "renovada", "renovar el mismo endpoint sigue permitido durante un intento de moverlo", moverYRenovar);
  const trasRenovar = await query("select count(*)::int as n from public.suscripciones_push where usuario_id = $1", [PERSONA]);
  check(trasRenovar.rows[0].n === 10, "mover y renovar no crea un telefono once");
  await as("authenticated", PERSONA, () => expectError(
    () => query("update public.suscripciones_push set usuario_id = $2 where endpoint = $1", [existente.endpoint, OTRA]),
    "42501", "una suscripcion no se transfiere de cuenta",
  ));
  const otraLectura = await as("authenticated", OTRA, () => query("select endpoint from public.suscripciones_push where usuario_id = $1", [PERSONA]));
  check(otraLectura.rowCount === 0, "otra cuenta no lee endpoints ajenos");
  const estadoSql = `select s.endpoint from public.suscripciones_push s
    join public.perfiles p on p.id = s.usuario_id
    where s.endpoint = $1 and s.usuario_id = auth.uid() and p.avisos_push = true`;
  const sinConsentir = await as("authenticated", PERSONA, () => query(estadoSql, [existente.endpoint]));
  check(sinConsentir.rowCount === 0, "un endpoint registrado sin consentimiento no esta activo");
  await as("authenticated", PERSONA, () => query("update public.perfiles set avisos_push = true where id = auth.uid()"));
  const activo = await as("authenticated", PERSONA, () => query(estadoSql, [existente.endpoint]));
  check(activo.rowCount === 1, "endpoint propio y consentimiento habilitan el estado activo bajo RLS");
  const enOtraCuenta = await as("authenticated", OTRA, () => query(estadoSql, [existente.endpoint]));
  check(enOtraCuenta.rowCount === 0, "el mismo navegador no hereda el estado activo de otra cuenta");
  await as("authenticated", PERSONA, () => query("update public.perfiles set avisos_push = false where id = auth.uid()"));
  const revocado = await as("authenticated", PERSONA, () => query(estadoSql, [existente.endpoint]));
  check(revocado.rowCount === 0, "revocar consentimiento apaga el estado aunque se conserve el endpoint");
  await as("authenticated", PERSONA, () => query("delete from public.suscripciones_push where endpoint = $1", [existente.endpoint]));
  const reemplazo = await as("authenticated", PERSONA, () => query(`${INSERT} returning endpoint`, [validos[0], PERSONA, p256dh, auth]));
  check(reemplazo.rowCount === 1, "al dar de baja un dispositivo queda sitio para otro");
  await query("delete from auth.users where id = any($1::uuid[])", [[PERSONA, OTRA]]);
}
