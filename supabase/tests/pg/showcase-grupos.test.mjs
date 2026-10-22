import { randomUUID } from "node:crypto";

/**
 * OL-446 (bitácora 478, migración 20261022140000): los grupos guardados del Showcase y el motivo de un rechazo. Solo la administración lee y
 * escribe los grupos; una cuenta cualquiera no ve ni escribe nada y un visitante no tiene permiso; quién y cuándo los pone la base. El motivo es
 * una lista cerrada, solo cabe en una evidencia rechazada y se borra solo al deshacer.
 */
const ADMIN = randomUUID();
const OTRA = randomUUID();

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('grupos-admin@local.test')");
  await query("insert into auth.users (id, email) values ($1, 'grupos-admin@local.test'), ($2, 'grupos-otra@local.test')", [ADMIN, OTRA]);
  const A = (await query("insert into public.artistas (nombre, disciplina) values ('Grupos Uno OL-446', 'musica') returning id")).rows[0].id;

  // --- Un visitante: sin permiso.
  await as("anon", null, () => expectError(() => query("select count(*) from public.showcase_grupos"), "42501", "anon no lee los grupos"));
  await as("anon", null, () => expectError(() => query("insert into public.showcase_grupos (nombre, filtros) values ('X', '{}')"), "42501", "anon no crea grupos"));

  // --- La administración crea, renombra y borra; el autor y la hora los pone la base.
  const g = await as("authenticated", ADMIN, async () => (await query("insert into public.showcase_grupos (nombre, filtros, creado_por, creado_en) values ('Música con cuenta, 4+', '{\"disciplina\":\"musica\",\"cuenta\":\"con\",\"puntaje\":4}', $1, '2000-01-01') returning id, creado_por, creado_en", [OTRA])).rows[0]);
  check(g.creado_por === ADMIN && new Date(g.creado_en).getFullYear() > 2000, "el grupo queda a nombre de la sesión y con la hora de la base", g);
  const renombrado = await as("authenticated", ADMIN, async () => (await query("update public.showcase_grupos set nombre = 'Música activa', creado_por = $2 where id = $1 returning nombre, creado_por", [g.id, OTRA])).rows[0]);
  check(renombrado.nombre === "Música activa" && renombrado.creado_por === ADMIN, "renombrar cambia el nombre y no el autor", renombrado);

  // --- Una cuenta cualquiera: no ve, no crea, no cambia ni borra.
  const ve = await as("authenticated", OTRA, async () => (await query("select count(*)::int as n from public.showcase_grupos")).rows[0].n);
  check(ve === 0, "una cuenta que no es administración no ve los grupos", ve);
  await as("authenticated", OTRA, () => expectError(() => query("insert into public.showcase_grupos (nombre) values ('Mío')"), "42501", "una cuenta cualquiera no crea grupos"));
  const tocadas = await as("authenticated", OTRA, async () => (await query("update public.showcase_grupos set nombre = 'Otro' returning id")).rowCount + (await query("delete from public.showcase_grupos returning id")).rowCount);
  check(tocadas === 0, "una cuenta cualquiera no renombra ni borra", tocadas);

  // --- Los límites del grupo.
  const malo = (sql, valores, etiqueta, codigo = "23514") => as("authenticated", ADMIN, () => expectError(() => query(sql, valores), codigo, etiqueta));
  await malo("insert into public.showcase_grupos (nombre) values ('   ')", [], "un grupo sin nombre no entra");
  await malo("insert into public.showcase_grupos (nombre) values (repeat('x', 81))", [], "un nombre de más de 80 letras no entra");
  await malo("insert into public.showcase_grupos (nombre, filtros) values ('Lista', '[1,2]')", [], "los filtros son un objeto, no una lista");
  await malo("insert into public.showcase_grupos (nombre, filtros) values ('Enorme', jsonb_build_object('x', repeat('y', 3000)))", [], "unos filtros enormes no entran");
  const borrado = await as("authenticated", ADMIN, async () => (await query("delete from public.showcase_grupos where id = $1 returning id", [g.id])).rowCount);
  check(borrado === 1, "la administración borra un grupo", borrado);

  // --- El motivo de un rechazo.
  const ev = (await query("insert into public.showcase_evidencias (artista_id, senal, tipo, titulo, url, leida_por) values ($1, 'obra', 'premio', 'Mención', 'https://cultura.example.org/m', 'rutina') returning id", [A])).rows[0].id;
  const sinMotivo = await as("authenticated", ADMIN, async () => (await query("update public.showcase_evidencias set motivo_rechazo = 'duplicado' where id = $1 returning motivo_rechazo", [ev])).rows[0]);
  check(sinMotivo.motivo_rechazo === null, "una propuesta no guarda motivo de rechazo", sinMotivo);
  await as("authenticated", ADMIN, () => query("update public.showcase_evidencias set estado = 'rechazada' where id = $1", [ev]));
  await malo("update public.showcase_evidencias set motivo_rechazo = 'me cae mal' where id = $1", [ev], "un motivo que no está en la lista no entra");
  const conMotivo = await as("authenticated", ADMIN, async () => (await query("update public.showcase_evidencias set motivo_rechazo = 'no_es_esta_persona' where id = $1 returning motivo_rechazo, decidida_por", [ev])).rows[0]);
  check(conMotivo.motivo_rechazo === "no_es_esta_persona" && conMotivo.decidida_por === ADMIN, "una rechazada guarda su motivo y quién la rechazó", conMotivo);
  const otraCuenta = await as("authenticated", OTRA, async () => (await query("update public.showcase_evidencias set motivo_rechazo = 'otro' where id = $1 returning id", [ev])).rowCount);
  check(otraCuenta === 0, "una cuenta cualquiera no cambia el motivo", otraCuenta);
  const deshecha = await as("authenticated", ADMIN, async () => (await query("update public.showcase_evidencias set estado = 'propuesta' where id = $1 returning estado, motivo_rechazo", [ev])).rows[0]);
  check(deshecha.estado === "propuesta" && deshecha.motivo_rechazo === null, "deshacer el rechazo borra el motivo", deshecha);
  const deUna = await as("authenticated", ADMIN, async () => (await query("update public.showcase_evidencias set estado = 'rechazada', motivo_rechazo = 'duplicado' where id = $1 returning motivo_rechazo", [ev])).rows[0]);
  check(deUna.motivo_rechazo === "duplicado", "rechazar con motivo en una sola escritura", deUna);
  const aceptada = await as("authenticated", ADMIN, async () => (await query("update public.showcase_evidencias set estado = 'aceptada' where id = $1 returning motivo_rechazo", [ev])).rows[0]);
  check(aceptada.motivo_rechazo === null, "aceptar una rechazada borra su motivo", aceptada);
  await as("authenticated", OTRA, () => expectError(() => query("select public.showcase_evidencias_motivo()"), "42501", "el disparador del motivo no se llama desde fuera"));

  // Se limpia lo de esta prueba (los bancos comparten la base): borrar el artista se lleva su evidencia.
  await query("delete from public.artistas where id = $1", [A]);
  await query("delete from public.showcase_grupos");
}
