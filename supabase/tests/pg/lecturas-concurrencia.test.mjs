const PERSONA = "00000000-0000-4000-8000-0000000000c1";
const OTRA = "00000000-0000-4000-8000-0000000000c2";

export async function run({ as, query, check, expectError, connection }) {
  await query("insert into auth.users (id, email) values ($1, 'cupo-concurrente@local.test'), ($2, 'cupo-otra@local.test')", [PERSONA, OTRA]);
  await query("insert into public.lecturas_cartel (perfil_id) select $1 from generate_series(1, 19)", [PERSONA]);
  const reservas = await Promise.all(Array.from({ length: 8 }, () => connection(async (client) => {
    await client.query("set role authenticated");
    await client.query("select set_config('request.jwt.claim.sub', $1, false)", [PERSONA]);
    return (await client.query("select public.apartar_lectura_de_cartel() as ok")).rows[0].ok;
  })));
  check(reservas.filter(Boolean).length === 1, "ocho lecturas concurrentes disputan el ultimo sitio: solo una pasa", reservas);
  const cuenta = await query("select count(*)::int as n from public.lecturas_cartel where perfil_id = $1", [PERSONA]);
  check(cuenta.rows[0].n === 20, "la concurrencia no supera las veinte lecturas");
  const otra = await as("authenticated", OTRA, () => query("select public.apartar_lectura_de_cartel() as ok"));
  check(otra.rows[0].ok, "el cupo lleno de una cuenta no impide leer a otra");
  await as("anon", null, () => expectError(() => query("select public.apartar_lectura_de_cartel()"), "42501", "anon no aparta lecturas"));
  await connection(async (client) => {
    await client.query("begin isolation level repeatable read");
    try {
      await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claim.sub', $1, true)", [OTRA]);
      await expectError(() => client.query("select public.apartar_lectura_de_cartel()"), "25001", "un snapshot fijo no evade el cupo de lecturas");
    } finally {
      await client.query("rollback");
    }
  });
  await query("delete from auth.users where id = any($1::uuid[])", [[PERSONA, OTRA]]);
}
