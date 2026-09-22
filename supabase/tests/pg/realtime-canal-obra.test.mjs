// OL-088 (Pincel), migración 20260922130000_pincel_canal_y_cupo.sql: el canal privado de una obra en
// realtime.messages y el cupo de mandos. Contrato mínimo (gestor, 2026-09-21): sin sesión no se recibe ni se manda;
// con sesión, solo en el canal de una obra ABIERTA y VISIBLE; una fila colada en un canal cerrado tampoco se lee;
// el cupo va de 1 a 20 con 10 por defecto. Corre sobre la imitación de `realtime` de scripts/test-db.mjs.

const PINTOR = "10000000-0000-4000-8000-000000000001";
const LUGAR_VISIBLE = "20000000-0000-4000-8000-000000000001";
const LUGAR_OCULTO = "20000000-0000-4000-8000-000000000002";
const OBRA_ABIERTA = "30000000-0000-4000-8000-000000000001";
const OBRA_CERRADA = "30000000-0000-4000-8000-000000000002";
const OBRA_EN_OCULTO = "30000000-0000-4000-8000-000000000003";
const RLS = "42501"; // insufficient_privilege: new row violates row-level security policy
const CHECK = "23514"; // check_violation

const topic = (obraId) => `obra:${obraId}`;

export async function run({ as, check, expectError, query }) {
  await query("insert into auth.users (id, email) values ($1, 'pintor@prueba.local')", [PINTOR]);
  await query(
    `insert into public.lugares (id, nombre, tipo, zona, visible, privado, lat, lng) values
       ($1, 'Centro visible', 'casa_de_cultura', 'America/Mexico_City', true, false, 22.15, -100.98),
       ($2, 'Centro oculto', 'casa_de_cultura', 'America/Mexico_City', false, false, 22.15, -100.98)`,
    [LUGAR_VISIBLE, LUGAR_OCULTO],
  );
  await query(
    `insert into public.obras_colectivas (id, nombre, lugar_id, cierra_en, estado, cerrado_en) values
       ($1, 'Obra abierta', $4, now() + interval '1 day', 'abierta', null),
       ($2, 'Obra cerrada', $4, now() + interval '1 day', 'cerrada', now()),
       ($3, 'Obra en lugar oculto', $5, now() + interval '1 day', 'abierta', null)`,
    [OBRA_ABIERTA, OBRA_CERRADA, OBRA_EN_OCULTO, LUGAR_VISIBLE, LUGAR_OCULTO],
  );

  // `realtime.topic()` lee el tema del canal de un ajuste de sesión, como hace el servicio real.
  async function enCanal(role, subject, obraId, action) {
    return as(role, subject, async () => {
      await query("select set_config('realtime.topic', $1, false)", [topic(obraId)]);
      try {
        return await action();
      } finally {
        await query("select set_config('realtime.topic', '', false)");
      }
    });
  }
  const manda = (obraId, extension = "broadcast") =>
    query("insert into realtime.messages (topic, extension, payload) values ($1, $2, '{}'::jsonb)", [topic(obraId), extension]);
  const recibe = async (obraId, extension = "broadcast") => {
    const { rows } = await query("select count(*)::int as n from realtime.messages where topic = $1 and extension = $2", [topic(obraId), extension]);
    return rows[0].n;
  };

  // Sin sesión: ni manda ni recibe, aunque la obra esté abierta.
  await expectError(() => enCanal("anon", null, OBRA_ABIERTA, () => manda(OBRA_ABIERTA)), RLS, "anon no manda trazo en una obra abierta");

  // Con sesión, obra abierta y visible: manda (broadcast y presence) y recibe lo mandado.
  await enCanal("authenticated", PINTOR, OBRA_ABIERTA, () => manda(OBRA_ABIERTA, "broadcast"));
  await enCanal("authenticated", PINTOR, OBRA_ABIERTA, () => manda(OBRA_ABIERTA, "presence"));
  check((await enCanal("authenticated", PINTOR, OBRA_ABIERTA, () => recibe(OBRA_ABIERTA, "broadcast"))) === 1, "con sesión recibe el broadcast de una obra abierta y visible");
  check((await enCanal("authenticated", PINTOR, OBRA_ABIERTA, () => recibe(OBRA_ABIERTA, "presence"))) === 1, "con sesión recibe presence de una obra abierta y visible");
  check((await enCanal("anon", null, OBRA_ABIERTA, () => recibe(OBRA_ABIERTA))) === 0, "anon no recibe nada aunque la fila exista");

  // Obra cerrada: no se manda, y una fila colada por service_role tampoco se lee.
  await expectError(() => enCanal("authenticated", PINTOR, OBRA_CERRADA, () => manda(OBRA_CERRADA)), RLS, "con sesión no manda en una obra cerrada");
  await as("service_role", null, () => manda(OBRA_CERRADA));
  check((await enCanal("authenticated", PINTOR, OBRA_CERRADA, () => recibe(OBRA_CERRADA))) === 0, "una fila colada en el canal de una obra cerrada no se lee");

  // Obra abierta pero en un lugar oculto: sigue el criterio de lectura de obras_colectivas.
  await expectError(() => enCanal("authenticated", PINTOR, OBRA_EN_OCULTO, () => manda(OBRA_EN_OCULTO)), RLS, "con sesión no manda si el lugar de la obra está oculto");

  // Solo broadcast y presence: otra extensión no cuela por ninguna política.
  await expectError(() => enCanal("authenticated", PINTOR, OBRA_ABIERTA, () => manda(OBRA_ABIERTA, "postgres_changes")), RLS, "otra extensión no entra al canal");

  // Cupo de mandos (doc rediseno/34): 10 por defecto, entre 1 y 20.
  const { rows: cupo } = await query("select cupo_mandos from public.obras_colectivas where id = $1", [OBRA_ABIERTA]);
  check(cupo[0].cupo_mandos === 10, "cupo_mandos por defecto es 10", cupo[0]);
  await expectError(() => query("update public.obras_colectivas set cupo_mandos = 21 where id = $1", [OBRA_ABIERTA]), CHECK, "cupo 21 rebasa el tope");
  await expectError(() => query("update public.obras_colectivas set cupo_mandos = 0 where id = $1", [OBRA_ABIERTA]), CHECK, "cupo 0 está bajo el mínimo");
  await query("update public.obras_colectivas set cupo_mandos = 20 where id = $1", [OBRA_ABIERTA]);
  const { rows: tope } = await query("select cupo_mandos from public.obras_colectivas where id = $1", [OBRA_ABIERTA]);
  check(tope[0].cupo_mandos === 20, "cupo 20 (el tope) se acepta", tope[0]);
}
