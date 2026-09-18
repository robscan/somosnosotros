const ADMIN = "00000000-0000-4000-8000-0000000000a1";
const AUTORA = "00000000-0000-4000-8000-0000000000a2";
const OTRA = "00000000-0000-4000-8000-0000000000a3";

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('admin-pruebas@local.test')");
  await query(
    `insert into auth.users (id, email, email_confirmed_at) values
      ($1, 'admin-pruebas@local.test', now()),
      ($2, 'autora-pruebas@local.test', now()),
      ($3, 'otra-pruebas@local.test', now())`,
    [ADMIN, AUTORA, OTRA],
  );

  const anonProfiles = await as("anon", null, () => query("select id from public.perfiles where id = $1", [AUTORA]));
  check(anonProfiles.rowCount === 1, "anon lee el perfil publico");
  await as("anon", null, () => expectError(
    () => query("insert into public.lugares (nombre, tipo, lat, lng, creado_por) values ('Sin sesion', 'foro', 22.15, -100.98, $1)", [AUTORA]),
    "42501",
    "anon no crea lugares",
  ));

  const lugar = await as("authenticated", AUTORA, () => query(
    "insert into public.lugares (nombre, tipo, lat, lng, creado_por) values ('Foro de prueba', 'foro', 22.15, -100.98, auth.uid()) returning id",
  ));
  const lugarId = lugar.rows[0]?.id;
  check(Boolean(lugarId), "autenticada crea un lugar y recibe su id");

  const ownUpdate = await as("authenticated", AUTORA, () => query(
    "update public.lugares set descripcion = 'Editado por su autora' where id = $1 returning id",
    [lugarId],
  ));
  check(ownUpdate.rowCount === 1, "la autora edita su lugar");

  const otherUpdate = await as("authenticated", OTRA, () => query(
    "update public.lugares set descripcion = 'No deberia escribir' where id = $1 returning id",
    [lugarId],
  ));
  check(otherUpdate.rowCount === 0, "otra cuenta no edita el lugar ajeno");

  await as("authenticated", AUTORA, () => expectError(
    () => query("update public.lugares set creado_por = $2 where id = $1", [lugarId, OTRA]),
    "42501",
    "la autora no puede transferir la propiedad por SQL directo",
  ));
  await as("authenticated", AUTORA, () => expectError(
    () => query("update public.lugares set visible = false where id = $1", [lugarId]),
    "42501",
    "la autora no puede ocultar el lugar por SQL directo",
  ));

  const adminChange = await as("authenticated", ADMIN, () => query(
    "update public.lugares set creado_por = $2, visible = false where id = $1 returning id",
    [lugarId, OTRA],
  ));
  check(adminChange.rowCount === 1, "administracion cambia autor y visibilidad");
  const anonHidden = await as("anon", null, () => query("select id from public.lugares where id = $1", [lugarId]));
  const formerOwnerHidden = await as("authenticated", AUTORA, () => query("select id from public.lugares where id = $1", [lugarId]));
  const newOwnerHidden = await as("authenticated", OTRA, () => query("select id from public.lugares where id = $1", [lugarId]));
  const adminHidden = await as("authenticated", ADMIN, () => query("select id from public.lugares where id = $1", [lugarId]));
  check(anonHidden.rowCount === 0 && formerOwnerHidden.rowCount === 0 && newOwnerHidden.rowCount === 1 && adminHidden.rowCount === 1, "un lugar oculto solo queda para su nueva cuenta autora y administracion");

  await as("authenticated", AUTORA, () => expectError(
    () => query("update public.perfiles set rol = 'admin' where id = auth.uid()"),
    "42501",
    "una cuenta no se asciende a administracion",
  ));

  const evento = await as("authenticated", AUTORA, () => query(
    "insert into public.eventos (lugar_id, sitio_texto, titulo, inicio, creado_por) values (null, 'Sede de pruebas', 'Evento de prueba', now() + interval '1 day', auth.uid()) returning id",
  ));
  const eventoId = evento.rows[0]?.id;
  check(Boolean(eventoId), "autenticada publica un evento propio");
  const attendance = await as("authenticated", AUTORA, () => query(
    "insert into public.asistencias (usuario_id, evento_id, estado) values (auth.uid(), $1, 'voy') returning usuario_id",
    [eventoId],
  ));
  check(attendance.rowCount === 1, "la cuenta guarda su asistencia");
  const follow = await as("authenticated", AUTORA, () => query(
    "insert into public.seguimientos (usuario_id, lugar_id) values (auth.uid(), $1) returning id",
    [lugarId],
  ));
  check(follow.rowCount === 1, "la cuenta guarda un seguimiento propio");
  const reserve = await as("authenticated", AUTORA, () => query(
    "update public.perfiles set reservado = true where id = auth.uid() returning reservado",
  ));
  check(reserve.rows[0]?.reservado === true, "la cuenta reserva su perfil");

  const otherPrivate = await as("authenticated", OTRA, () => query(
    "select (select count(*) from public.asistencias where usuario_id = $1)::int as asistencias, (select count(*) from public.seguimientos where usuario_id = $1)::int as seguimientos",
    [AUTORA],
  ));
  check(otherPrivate.rows[0].asistencias === 0 && otherPrivate.rows[0].seguimientos === 0, "otra cuenta no ve actividad de perfil reservado");
  const adminPrivate = await as("authenticated", ADMIN, () => query(
    "select (select count(*) from public.asistencias where usuario_id = $1)::int as asistencias, (select count(*) from public.seguimientos where usuario_id = $1)::int as seguimientos",
    [AUTORA],
  ));
  check(adminPrivate.rows[0].asistencias === 1 && adminPrivate.rows[0].seguimientos === 1, "administracion ve actividad de perfil reservado");

  const stored = await as("authenticated", AUTORA, () => query(
    "insert into storage.objects (bucket_id, name, owner) values ('fotos', $1, auth.uid()) returning id",
    [`perfiles/${AUTORA}/foto.jpg`],
  ));
  check(stored.rowCount === 1, "autenticada escribe en su carpeta de Storage");
  await as("authenticated", OTRA, () => expectError(
    () => query("insert into storage.objects (bucket_id, name, owner) values ('fotos', $1, auth.uid())", [`perfiles/${AUTORA}/intrusion.jpg`]),
    "42501",
    "otra cuenta no escribe en la carpeta de Storage ajena",
  ));

  const serviceUpdate = await as("service_role", null, () => query(
    "update public.lugares set descripcion = 'Mantenimiento de servicio' where id = $1 returning id",
    [lugarId],
  ));
  check(serviceUpdate.rowCount === 1, "service_role conserva acceso administrativo aislado");
}
