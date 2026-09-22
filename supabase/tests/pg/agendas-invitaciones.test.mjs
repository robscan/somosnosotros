// OL-122 · contrato de agendas_invitaciones_enviadas: solo service_role la toca; un envío por tipo y buzón.
import { randomUUID } from "node:crypto";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

export async function run({ as, check, expectError, query }) {
  const usuario = randomUUID();
  await query("insert into auth.users (id, email, email_confirmed_at) values ($1, 'agendas-usuario@local.test', now())", [usuario]);
  const lugar = await query("insert into public.lugares (nombre, tipo, lat, lng, creado_por) values ('Museo de prueba OL-122', 'museo', 22.15, -100.98, $1) returning id", [usuario]);
  const lugarId = lugar.rows[0].id;

  const inserta = (valores) => query(
    "insert into public.agendas_invitaciones_enviadas (lugar_id, organismo, correo_hash, tipo, resend_id) values ($1, $2, $3, $4, $5) returning id",
    valores,
  );

  for (const rol of ["anon", "authenticated"]) {
    const uid = rol === "authenticated" ? usuario : null;
    await as(rol, uid, () => expectError(() => query("select id from public.agendas_invitaciones_enviadas"), "42501", `agendas: ${rol} no lee`));
    await as(rol, uid, () => expectError(() => inserta([lugarId, null, HASH_A, "tanda", null]), "42501", `agendas: ${rol} no escribe`));
  }

  const primero = await as("service_role", null, () => inserta([lugarId, null, HASH_A, "comprobacion", "re_1"]));
  check(primero.rowCount === 1, "agendas: service_role anota un envío de comprobación");
  await as("service_role", null, () => expectError(() => inserta([lugarId, null, HASH_A, "comprobacion", "re_2"]), "23505", "agendas: no se repite un envío del mismo tipo al mismo hash"));
  const recordatorio = await as("service_role", null, () => inserta([lugarId, null, HASH_A, "recordatorio", "re_3"]));
  check(recordatorio.rowCount === 1, "agendas: otro tipo al mismo hash sí entra (recordatorio)");
  const organismo = await as("service_role", null, () => inserta([null, "Organismo de prueba", HASH_B, "tanda", "re_4"]));
  check(organismo.rowCount === 1, "agendas: un organismo se anota sin lugar_id");

  await as("service_role", null, () => expectError(() => inserta([lugarId, null, HASH_B, "otro", null]), "23514", "agendas: tipo fuera de comprobacion/tanda/recordatorio rechazado"));
  await as("service_role", null, () => expectError(() => inserta([null, null, HASH_B, "tanda", null]), "23514", "agendas: sin lugar ni organismo rechazado"));
  await as("service_role", null, () => expectError(() => inserta([lugarId, null, "correo@en-claro.test", "tanda", null]), "23514", "agendas: solo cabe un hash SHA-256, nunca un correo en claro"));

  const leidos = await as("service_role", null, () => query("select count(*)::int as n from public.agendas_invitaciones_enviadas where correo_hash in ($1, $2)", [HASH_A, HASH_B]));
  check(leidos.rows[0].n === 3, "agendas: service_role lee lo anotado", leidos.rows[0]);
  const rls = await query("select relrowsecurity from pg_class where oid = 'public.agendas_invitaciones_enviadas'::regclass");
  check(rls.rows[0].relrowsecurity === true, "agendas: RLS activa");
  const politicas = await query("select count(*)::int as n from pg_policies where tablename = 'agendas_invitaciones_enviadas'");
  check(politicas.rows[0].n === 0, "agendas: sin políticas para clientes");
}
