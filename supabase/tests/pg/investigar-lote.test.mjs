import { randomUUID } from "node:crypto";

// OL-439 · «Investigar» a varios desde la lista del Showcase, sin migración: lo que la acción `investigarVarios` da por hecho de las tablas que ya
// existen (20261020130000_showcase y 20261020140000_ciudades). Una orden son hasta 60 corridas `showcase` sin ciudad, pendientes a la vez, de un
// solo insert y con el mismo `parametros.lote`; el índice «una en curso por botón y ciudad» no las estorba (es solo para las que tienen ciudad).
// Antes de crearlas, la acción lee las corridas en curso y los descartados de la orden. Todo dentro de una transacción que se deshace.
export async function run({ as, check, expectError, query }) {
  const admin = randomUUID(), persona = randomUUID();
  const adminCorreo = `investigar-lote-${admin}@local.test`;
  const uno = async (sql, params) => (await query(sql, params)).rows[0];
  await query("begin");
  try {
    await query("insert into public.admin_correos(correo) values ($1)", [adminCorreo]);
    await query("insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now()),($3,$4,now())", [admin, adminCorreo, persona, `investigar-lote-persona-${persona}@local.test`]);
    const artistas = (
      await query("insert into public.artistas (nombre, disciplina, tipo, ciudad) select 'Artista OL-439 ' || g, 'musica', 'solista', 'San Luis Potosí' from generate_series(1, 60) g returning id")
    ).rows.map((r) => r.id);
    check(artistas.length === 60, "sesenta artistas de prueba", artistas.length);
    // Uno descartado: la acción lo lee y no lo manda.
    await as("authenticated", admin, () => query("insert into public.showcase_candidatos(artista_id, estado) values ($1, 'descartado')", [artistas[59]]));

    // La orden: un solo insert con las 60 filas, todas de la misma orden, a nombre de la administración (la regla de la base).
    const lote = randomUUID();
    const filas = artistas.map((artista_id) => ({ tipo: "showcase", ciudad: null, tope_usd: 1, creado_por: admin, parametros: { artista_id, lote } }));
    const creadas = await as("authenticated", admin, async () =>
      (await query("insert into public.rutinas_corridas(tipo,ciudad,tope_usd,creado_por,parametros) select tipo, ciudad, tope_usd, creado_por, parametros from jsonb_to_recordset($1::jsonb) as x(tipo text, ciudad text, tope_usd numeric, creado_por uuid, parametros jsonb) returning id, estado", [JSON.stringify(filas)])).rows,
    );
    check(creadas.length === 60 && creadas.every((c) => c.estado === "pendiente"), "sesenta corridas de showcase sin ciudad caben pendientes a la vez, de un solo insert", creadas.length);
    // Lo que lee la lista: la orden por su lote y el artista de cada una (`parametros->>…`, los filtros de PostgREST).
    const deLaOrden = await as("authenticated", admin, async () => (await uno("select count(*)::int as n, count(distinct parametros->>'artista_id')::int as artistas from public.rutinas_corridas where tipo='showcase' and parametros->>'lote' = $1", [lote])));
    check(deLaOrden?.n === 60 && deLaOrden.artistas === 60, "la orden se encuentra por su lote, una corrida por artista", deLaOrden);
    // Lo que lee la acción antes de crear: las corridas en curso (de cualquier rutina) y los descartados de la orden.
    const enCurso = await as("authenticated", admin, async () => (await uno("select count(*)::int as n from public.rutinas_corridas where estado in ('pendiente','corriendo') and parametros->>'lote' = $1", [lote])));
    check(enCurso?.n === 60, "las sesenta, en curso", enCurso);
    const descartados = await as("authenticated", admin, async () => (await query("select artista_id from public.showcase_candidatos where estado='descartado' and artista_id = any($1::uuid[])", [artistas])).rows);
    check(descartados.length === 1 && descartados[0].artista_id === artistas[59], "la administración lee a los descartados de la orden", descartados);

    // Una cuenta sin administración no crea órdenes ni ve las de nadie.
    await as("authenticated", persona, async () => {
      await query("savepoint antes_del_error");
      await expectError(() => query("insert into public.rutinas_corridas(tipo,ciudad,tope_usd,creado_por,parametros) values ('showcase',null,1,$1,$2),('showcase',null,1,$1,$3)", [persona, JSON.stringify({ artista_id: artistas[0], lote }), JSON.stringify({ artista_id: artistas[1], lote })]), "42501", "una cuenta sin administración no investiga a varios");
      await query("rollback to savepoint antes_del_error");
    });
    await as("authenticated", persona, async () => check((await query("select id from public.rutinas_corridas where parametros->>'lote' = $1", [lote])).rowCount === 0, "una cuenta cualquiera no ve la orden"));
  } finally {
    await query("rollback");
  }
}
