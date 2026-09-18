const ADMIN = "00000000-0000-4000-8000-0000000000e1";
const AUTORA = "00000000-0000-4000-8000-0000000000e2";
const OTRA = "00000000-0000-4000-8000-0000000000e3";

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('storage-admin@local.test')");
  await query(`insert into auth.users (id, email, email_confirmed_at) values
    ($1, 'storage-admin@local.test', now()),
    ($2, 'storage-autora@local.test', now()),
    ($3, 'storage-otra@local.test', now())`, [ADMIN, AUTORA, OTRA]);
  const ids = [];
  for (const carpeta of ["perfiles", "lugares", "artistas"]) {
    const own = await as("authenticated", AUTORA, () => query(
      "insert into storage.objects (bucket_id, name, owner) values ('fotos', $1, auth.uid()) returning id",
      [`${carpeta}/${AUTORA}/storage-prueba.jpg`],
    ));
    ids.push(own.rows[0]?.id);
    check(own.rowCount === 1, `Storage: autora sube y recibe metadatos de ${carpeta}`);
  }
  const others = await query(`insert into storage.objects (bucket_id, name, owner) values
    ('fotos', $1, $3), ('fotos', $2, $4), ('otro-bucket', $1, $3) returning id`,
  [`perfiles/${OTRA}/storage-prueba.jpg`, `desconocida/${AUTORA}/storage-prueba.jpg`, OTRA, AUTORA]);
  ids.push(...others.rows.map(({ id }) => id));
  const listed = async (role, uid) => as(role, uid, () => query(
    "select id from storage.objects where id = any($1::uuid[]) order by id", [ids],
  ));
  check((await listed("anon", null)).rowCount === 0, "Storage: anon no enumera objetos de fotos");
  check((await listed("authenticated", AUTORA)).rowCount === 3, "Storage: autora lista solo las tres carpetas propias admitidas");
  check((await listed("authenticated", OTRA)).rowCount === 1, "Storage: otra cuenta no lista fotos ajenas");
  check((await listed("authenticated", null)).rowCount === 0, "Storage: rol autenticado sin uid no lista fotos");
  check((await listed("authenticated", ADMIN)).rowCount === 5, "Storage: administracion lista fotos pero no otros buckets");
  check((await listed("service_role", null)).rowCount === 6, "Storage: service_role conserva mantenimiento entre buckets");

  const update = (id, name) => query("update storage.objects set name = $2 where id = $1 returning id", [id, name]);
  check((await as("authenticated", OTRA, () => update(ids[0], `perfiles/${OTRA}/robada.jpg`))).rowCount === 0, "Storage: otra cuenta no cambia una foto ajena");
  check((await as("authenticated", ADMIN, () => update(ids[0], `perfiles/${ADMIN}/robada.jpg`))).rowCount === 0, "Storage: permiso de listado admin no concede escritura ajena");
  await as("authenticated", AUTORA, () => expectError(
    () => update(ids[0], `perfiles/${OTRA}/transferida.jpg`), "42501", "Storage: autora no mueve una foto a otra cuenta",
  ));
  await as("authenticated", AUTORA, () => expectError(
    () => query("update storage.objects set bucket_id = 'otro-bucket' where id = $1", [ids[0]]), "42501", "Storage: autora no mueve una foto a otro bucket",
  ));
  check((await as("authenticated", AUTORA, () => update(ids[0], `perfiles/${AUTORA}/renombrada.jpg`))).rowCount === 1, "Storage: autora puede cambiar una foto propia");
  check((await as("authenticated", OTRA, () => query("delete from storage.objects where id = $1 returning id", [ids[0]]))).rowCount === 0, "Storage: otra cuenta no borra una foto ajena");
  check((await as("authenticated", AUTORA, () => query("delete from storage.objects where id = $1 returning id", [ids[0]]))).rowCount === 1, "Storage: autora puede borrar una foto propia");
  const bucket = await query("select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'fotos'");
  check(bucket.rows[0]?.public === true, "Storage: bucket conserva URL publicas (prueba SQL, no HTTP)");
  check(Number(bucket.rows[0]?.file_size_limit) === 5242880, "Storage: conserva limite de 5 MB");
  check(bucket.rows[0]?.allowed_mime_types.join(",") === "image/jpeg,image/png,image/webp,image/heic", "Storage: conserva formatos de imagen permitidos");
}
