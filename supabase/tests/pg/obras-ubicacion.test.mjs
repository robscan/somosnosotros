// OL-127 (bitácora 162): una obra puede no tener lugar del directorio y llevar coordenadas propias («Crear pared
// aquí»). lugar_id admite nulo, lat/lng con sus topes, «lugar o coordenadas» obligatorio, y las políticas de lectura y
// del canal en vivo aceptan una obra sin lugar.
const ADMIN = "00000000-0000-4000-8000-00000000ab21";
const NORMAL = "00000000-0000-4000-8000-00000000ab22";

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('ubicacion-admin@local.test')");
  await query(`insert into auth.users (id, email, email_confirmed_at) values
    ($1, 'ubicacion-admin@local.test', now()),
    ($2, 'ubicacion-normal@local.test', now())`, [ADMIN, NORMAL]);

  const columnas = await query("select column_name, is_nullable, data_type from information_schema.columns where table_schema = 'public' and table_name = 'obras_colectivas' and column_name in ('lugar_id', 'lat', 'lng') order by column_name");
  const porNombre = Object.fromEntries(columnas.rows.map((c) => [c.column_name, c]));
  check(porNombre.lugar_id?.is_nullable === "YES", "Ubicación: lugar_id admite nulo");
  check(porNombre.lat?.data_type === "double precision" && porNombre.lng?.data_type === "double precision", "Ubicación: lat y lng existen (double precision)");

  // Sin lugar y sin coordenadas: rechazada. Coordenadas fuera de rango: rechazada.
  await as("authenticated", ADMIN, () => expectError(
    () => query("insert into public.obras_colectivas (nombre, cierra_en, creado_por, estado, cerrado_en) values ('Sin dónde', now() + interval '2 hours', auth.uid(), 'cerrada', now())"),
    "23514", "Ubicación: una obra sin lugar y sin coordenadas se rechaza",
  ));
  await as("authenticated", ADMIN, () => expectError(
    () => query("insert into public.obras_colectivas (nombre, lat, lng, cierra_en, creado_por, estado, cerrado_en) values ('Fuera del mundo', 95, 10, now() + interval '2 hours', auth.uid(), 'cerrada', now())"),
    "23514", "Ubicación: una latitud fuera de -90..90 se rechaza",
  ));

  // El freno global (dos obras abiertas) lo pueden ocupar otras pruebas: se deja sitio y se repone al final.
  const abiertas = await query("select id from public.obras_colectivas where estado = 'abierta' order by creado_en limit 2");
  const cerradaTemporal = abiertas.rowCount >= 2 ? abiertas.rows[0].id : null;
  if (cerradaTemporal) await query("update public.obras_colectivas set estado = 'cerrada', cerrado_en = now() where id = $1", [cerradaTemporal]);

  const creada = await as("authenticated", ADMIN, () => query(
    "insert into public.obras_colectivas (nombre, lat, lng, cierra_en, creado_por) values ('Pincel · aquí', 22.1497, -100.9794, now() + interval '2 hours', auth.uid()) returning id, lugar_id, lat, lng, zona",
  ));
  const id = creada.rows[0]?.id;
  check(creada.rowCount === 1 && creada.rows[0].lugar_id === null && Number(creada.rows[0].lat) === 22.1497, "Ubicación: administración crea una obra abierta sin lugar, con coordenadas propias");
  check(creada.rows[0]?.zona === "America/Mexico_City", "Ubicación: sin lugar, la zona queda la de siempre (el disparador no la cambia)");

  const veNormal = await as("authenticated", NORMAL, () => query("select id from public.obras_colectivas where id = $1", [id]));
  check(veNormal.rowCount === 1, "Ubicación: una cuenta con sesión lee la obra sin lugar (política de lectura repuesta)");
  const veAnon = await as("anon", null, () => query("select id from public.obras_colectivas where id = $1", [id]));
  check(veAnon.rowCount === 1, "Ubicación: la lectura sin lugar sigue el mismo criterio que con lugar visible (anon también la lee)");

  // Canal en vivo: las cuatro políticas aceptan la obra sin lugar (mismo patrón que realtime-canal-obra.test.mjs).
  await query("select set_config('realtime.topic', $1, false)", [`obra:${id}`]);
  try {
    const trazo = await as("authenticated", NORMAL, () => query("insert into realtime.messages (topic, extension, payload) values ($1, 'broadcast', '{}'::jsonb) returning id", [`obra:${id}`]));
    check(trazo.rowCount === 1, "Ubicación: se manda trazo en el canal de una obra sin lugar");
    const presencia = await as("authenticated", NORMAL, () => query("insert into realtime.messages (topic, extension, payload) values ($1, 'presence', '{}'::jsonb) returning id", [`obra:${id}`]));
    check(presencia.rowCount === 1, "Ubicación: se manda presence en el canal de una obra sin lugar");
    const lee = await as("authenticated", NORMAL, () => query("select id from realtime.messages where topic = $1", [`obra:${id}`]));
    check(lee.rowCount === 2, "Ubicación: se reciben trazo y presence en el canal de una obra sin lugar");
  } finally {
    await query("select set_config('realtime.topic', '', false)");
  }

  await query("update public.obras_colectivas set estado = 'cerrada', cerrado_en = now() where id = $1", [id]);
  if (cerradaTemporal) await query("update public.obras_colectivas set estado = 'abierta', cerrado_en = null where id = $1", [cerradaTemporal]);
}
