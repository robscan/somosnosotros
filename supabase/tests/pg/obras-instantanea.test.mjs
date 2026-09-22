// OL-126 (bitácora 161), parte 4: el bucket privado «obras» de las instantáneas de la pared. Solo administración
// lee, sube, reemplaza y borra; ni anon ni una cuenta normal ven ni tocan nada; «fotos» sigue como estaba.
const ADMIN = "00000000-0000-4000-8000-00000000ab01";
const NORMAL = "00000000-0000-4000-8000-00000000ab02";
const OBRA = "00000000-0000-4000-8000-00000000ab0a";

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('instantanea-admin@local.test')");
  await query(`insert into auth.users (id, email, email_confirmed_at) values
    ($1, 'instantanea-admin@local.test', now()),
    ($2, 'instantanea-normal@local.test', now())`, [ADMIN, NORMAL]);
  const ruta = `${OBRA}/pared.png`;

  const bucket = await query("select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'obras'");
  check(bucket.rowCount === 1, "Instantánea: existe el bucket obras");
  check(bucket.rows[0]?.public === false, "Instantánea: el bucket obras es privado");
  check(Number(bucket.rows[0]?.file_size_limit) === 2097152, "Instantánea: tope de 2 MB por PNG");
  check(bucket.rows[0]?.allowed_mime_types.join(",") === "image/png", "Instantánea: solo PNG");

  const subida = await as("authenticated", ADMIN, () => query(
    "insert into storage.objects (bucket_id, name, owner) values ('obras', $1, auth.uid()) returning id", [ruta],
  ));
  check(subida.rowCount === 1, "Instantánea: administración sube obras/<id>/pared.png");
  const id = subida.rows[0]?.id;

  await as("authenticated", NORMAL, () => expectError(
    () => query("insert into storage.objects (bucket_id, name, owner) values ('obras', $1, auth.uid())", [`${OBRA}/otra.png`]),
    "42501", "Instantánea: una cuenta normal no sube al bucket obras",
  ));
  await as("anon", null, () => expectError(
    () => query("insert into storage.objects (bucket_id, name) values ('obras', $1)", [`${OBRA}/anon.png`]),
    "42501", "Instantánea: anon no sube al bucket obras",
  ));

  const ve = async (role, uid) => (await as(role, uid, () => query("select id from storage.objects where id = $1", [id]))).rowCount;
  check((await ve("authenticated", ADMIN)) === 1, "Instantánea: administración lee la instantánea");
  check((await ve("authenticated", NORMAL)) === 0, "Instantánea: una cuenta normal no la ve");
  check((await ve("anon", null)) === 0, "Instantánea: anon no la ve");

  check((await as("authenticated", ADMIN, () => query("update storage.objects set name = $2 where id = $1 returning id", [id, ruta]))).rowCount === 1, "Instantánea: administración reemplaza (upsert)");
  check((await as("authenticated", NORMAL, () => query("update storage.objects set name = $2 where id = $1 returning id", [id, ruta]))).rowCount === 0, "Instantánea: una cuenta normal no la cambia");
  await as("authenticated", ADMIN, () => expectError(
    () => query("update storage.objects set bucket_id = 'fotos' where id = $1", [id]), "42501", "Instantánea: ni administración la mueve a fotos (las políticas de fotos son por carpeta propia)",
  ));
  check((await as("authenticated", NORMAL, () => query("delete from storage.objects where id = $1 returning id", [id]))).rowCount === 0, "Instantánea: una cuenta normal no la borra");
  check((await as("authenticated", ADMIN, () => query("delete from storage.objects where id = $1 returning id", [id]))).rowCount === 1, "Instantánea: administración la borra (al borrar la obra)");

  const fotos = await query("select public from storage.buckets where id = 'fotos'");
  check(fotos.rows[0]?.public === true, "Instantánea: el bucket fotos no cambia");
}
