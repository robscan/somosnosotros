import { randomUUID } from "node:crypto";

/**
 * OL-447 (bitácora 479, migración 20261022150000): asignar desde Administración una ficha de lugar o de artista a una persona. Solo la
 * administración busca, asigna y quita; asignar escribe la misma liga que un reclamo aprobado, así que la persona asignada edita su ficha y
 * otra cuenta no; asignar a una ficha que ya tiene quien la lleve AGREGA (las dos la editan); todo queda en el registro con quién y cuándo, y
 * ese registro solo lo lee la administración. Los lugares privados no se buscan ni se asignan.
 */
const ADMIN = randomUUID();
const NUEVA = randomUUID();
const OTRA = randomUUID();
const PREVIA = randomUUID();

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('asignar-admin@local.test')");
  await query(
    "insert into auth.users (id, email) values ($1, 'asignar-admin@local.test'), ($2, 'asignar-nueva@local.test'), ($3, 'asignar-otra@local.test'), ($4, 'asignar-previa@local.test')",
    [ADMIN, NUEVA, OTRA, PREVIA],
  );
  await query("update public.perfiles set nombre = 'Previa OL-447' where id = $1", [PREVIA]);
  const L = (await query("insert into public.lugares (nombre, tipo, lat, lng, creado_por) values ('Foro Asignable OL-447', 'foro', 22.15, -100.98, $1) returning id", [ADMIN])).rows[0].id;
  const P = (await query("insert into public.lugares (nombre, tipo, lat, lng, creado_por, privado) values ('Foro Asignable Privado OL-447', 'otro', 22.15, -100.98, $1, true) returning id", [ADMIN])).rows[0].id;
  const A = (await query("insert into public.artistas (nombre, disciplina) values ('Foro Asignable Trío OL-447', 'musica') returning id")).rows[0].id;
  await query("insert into public.artistas_cuentas (artista_id, perfil_id) values ($1, $2)", [A, PREVIA]);

  const rpc = (quien, fn, ...args) => as("authenticated", quien, async () => (await query(`select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args)).rows[0].r);
  const buscar = (quien, texto) => as("authenticated", quien, async () => (await query("select * from public.admin_buscar_fichas($1, $2)", [texto, NUEVA])).rows);
  const edita = (quien, tabla, id) => as("authenticated", quien, async () => (await query(`update public.${tabla} set detalle = 'Editado OL-447' where id = $1 returning id`, [id])).rowCount);

  // --- Buscar: solo la administración; lugares y artistas a la vez; los privados no salen; dice quién más la lleva.
  const halladas = await buscar(ADMIN, "foro asignable");
  check(halladas.length === 2, "la administración encuentra el lugar y el artista a la vez, sin el privado", halladas.map((f) => f.nombre));
  check(!halladas.some((f) => f.id === P), "el lugar privado no se ofrece para asignar");
  const trio = halladas.find((f) => f.id === A);
  check(trio?.tipo === "artista" && trio.otros === "Previa OL-447" && trio.otros_n === 1 && trio.suya === false, "el artista dice quién más lo administra", trio);
  check(halladas.find((f) => f.id === L)?.clase === "foro", "el lugar trae su tipo");
  check((await buscar(OTRA, "foro asignable")).length === 0, "una cuenta cualquiera no encuentra nada");
  check((await buscar(ADMIN, "  ")).length === 0, "sin texto no se lista todo");
  await as("anon", null, () => expectError(() => query("select * from public.admin_buscar_fichas('foro', $1)", [NUEVA]), "42501", "un visitante no puede buscar"));

  // --- Antes de asignar, la persona nueva no edita ni el lugar ni el artista.
  check((await edita(NUEVA, "lugares", L)) === 0, "sin asignar, la persona nueva no edita el lugar");
  check((await edita(NUEVA, "artistas", A)) === 0, "sin asignar, la persona nueva no edita el artista");

  // --- Asignar: una cuenta cualquiera no puede; la administración sí; repetir dice «ya».
  check((await rpc(OTRA, "admin_asignar_ficha", "lugar", L, OTRA)) === "no_admin", "una cuenta cualquiera no se asigna una ficha");
  check((await query("select count(*)::int as n from public.lugares_cuentas where lugar_id = $1", [L])).rows[0].n === 0, "y no quedó ninguna liga");
  await as("anon", null, () => expectError(() => query("select public.admin_asignar_ficha('lugar', $1, $2)", [L, NUEVA]), "42501", "un visitante no puede asignar"));
  check((await rpc(ADMIN, "admin_asignar_ficha", "lugar", L, NUEVA)) === "ok", "la administración asigna el lugar");
  check((await rpc(ADMIN, "admin_asignar_ficha", "lugar", L, NUEVA)) === "ya", "asignar dos veces dice que ya la administraba");
  check((await rpc(ADMIN, "admin_asignar_ficha", "artista", A, NUEVA)) === "ok", "la administración asigna el artista que ya tenía quien lo llevara");
  check((await rpc(ADMIN, "admin_asignar_ficha", "lugar", P, NUEVA)) === "sin_ficha", "un lugar privado no se asigna");
  check((await rpc(ADMIN, "admin_asignar_ficha", "evento", L, NUEVA)) === "sin_ficha", "solo lugares y artistas");
  check((await rpc(ADMIN, "admin_asignar_ficha", "lugar", randomUUID(), NUEVA)) === "sin_ficha", "una ficha que no existe");
  check((await rpc(ADMIN, "admin_asignar_ficha", "lugar", L, randomUUID())) === "sin_persona", "una cuenta que no existe");

  // --- Los mismos efectos que un reclamo aprobado: la persona asignada edita; la que ya estaba sigue editando; otra no.
  check((await edita(NUEVA, "lugares", L)) === 1, "la persona asignada edita su lugar");
  check((await edita(NUEVA, "artistas", A)) === 1, "la persona asignada edita su artista");
  check((await edita(PREVIA, "artistas", A)) === 1, "asignar agrega: quien ya lo llevaba lo sigue editando");
  check((await edita(OTRA, "lugares", L)) === 0, "otra cuenta no edita el lugar");
  check((await edita(OTRA, "artistas", A)) === 0, "otra cuenta no edita el artista");
  const autor = (await query("select creado_por from public.lugares where id = $1", [L])).rows[0].creado_por;
  check(autor === ADMIN, "asignar no cambia la autoría", autor);
  check((await buscar(ADMIN, "foro asignable")).every((f) => f.suya), "la búsqueda ya las marca como suyas");

  // --- Quitar: una cuenta cualquiera no puede (ni la asignada, por esta vía); la administración sí y la persona deja de editar.
  check((await rpc(OTRA, "admin_quitar_ficha", "lugar", L, NUEVA)) === "no_admin", "una cuenta cualquiera no quita fichas");
  check((await rpc(NUEVA, "admin_quitar_ficha", "lugar", L, NUEVA)) === "no_admin", "la función de quitar es solo de la administración");
  await as("anon", null, () => expectError(() => query("select public.admin_quitar_ficha('lugar', $1, $2)", [L, NUEVA]), "42501", "un visitante no puede quitar"));
  check((await rpc(ADMIN, "admin_quitar_ficha", "lugar", L, NUEVA)) === "ok", "la administración quita el lugar");
  check((await rpc(ADMIN, "admin_quitar_ficha", "lugar", L, NUEVA)) === "no_estaba", "quitar dos veces dice que no estaba");
  check((await edita(NUEVA, "lugares", L)) === 0, "sin la liga, ya no edita el lugar");
  check((await edita(NUEVA, "artistas", A)) === 1, "el artista sigue siendo suyo");
  check((await query("select count(*)::int as n from public.lugares where id = $1", [L])).rows[0].n === 1, "quitar no borra la ficha");

  // --- El registro: quién, qué y cuándo; solo lo lee la administración y nadie lo escribe directo.
  const registro = await as("authenticated", ADMIN, async () => (await query("select tipo, ficha_id, perfil_id, accion, hecho_por, hecho_en from public.fichas_asignaciones where perfil_id = $1 order by hecho_en, accion", [NUEVA])).rows);
  check(registro.length === 3, "tres movimientos registrados (asignar lugar, asignar artista, quitar lugar)", registro);
  check(registro.every((r) => r.hecho_por === ADMIN && r.hecho_en), "cada uno con quién y cuándo");
  check(registro.filter((r) => r.accion === "quitar").length === 1 && registro.find((r) => r.accion === "quitar").ficha_id === L, "el quitar quedó con su ficha");
  check((await as("authenticated", OTRA, async () => (await query("select count(*)::int as n from public.fichas_asignaciones")).rows[0].n)) === 0, "una cuenta cualquiera no lee el registro");
  check((await as("authenticated", NUEVA, async () => (await query("select count(*)::int as n from public.fichas_asignaciones")).rows[0].n)) === 0, "ni la persona asignada");
  await as("authenticated", ADMIN, () => expectError(() => query("insert into public.fichas_asignaciones (tipo, ficha_id, perfil_id, accion) values ('lugar', $1, $2, 'asignar')", [L, NUEVA]), "42501", "ni la administración escribe el registro directo"));
  await as("anon", null, () => expectError(() => query("select count(*) from public.fichas_asignaciones"), "42501", "un visitante no lee el registro"));
}
