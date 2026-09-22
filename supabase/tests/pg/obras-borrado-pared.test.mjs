// OL-126 (bitácora 161), «Borrar la pared»: la columna obras_colectivas.borrado_pared_en existe y solo administración
// la escribe (es la comprobación del lado del servidor: la pared solo limpia si hay un borrado registrado y reciente).
const ADMIN = "00000000-0000-4000-8000-00000000ab11";
const NORMAL = "00000000-0000-4000-8000-00000000ab12";

export async function run({ as, check, query }) {
  await query("insert into public.admin_correos (correo) values ('borrado-admin@local.test')");
  await query(`insert into auth.users (id, email, email_confirmed_at) values
    ($1, 'borrado-admin@local.test', now()),
    ($2, 'borrado-normal@local.test', now())`, [ADMIN, NORMAL]);

  const columna = await query("select data_type from information_schema.columns where table_schema = 'public' and table_name = 'obras_colectivas' and column_name = 'borrado_pared_en'");
  check(columna.rowCount === 1 && columna.rows[0].data_type === "timestamp with time zone", "Borrar la pared: existe obras_colectivas.borrado_pared_en (timestamptz)");

  const lugar = await as("authenticated", NORMAL, () => query(
    "insert into public.lugares (nombre, tipo, lat, lng, creado_por) values ('Lugar de pruebas borrado', 'foro', 22.15, -100.98, auth.uid()) returning id",
  ));
  const obra = await as("authenticated", ADMIN, () => query(
    // Cerrada al nacer: el freno global (dos obras abiertas como mucho) ya lo ocupan otras pruebas; aquí solo importa la columna y quién la escribe.
    "insert into public.obras_colectivas (nombre, lugar_id, cierra_en, creado_por, estado, cerrado_en) values ('Pared que se borra', $1, now() + interval '2 hours', auth.uid(), 'cerrada', now()) returning id, borrado_pared_en",
    [lugar.rows[0].id],
  ));
  const id = obra.rows[0]?.id;
  check(obra.rowCount === 1 && obra.rows[0].borrado_pared_en === null, "Borrar la pared: una obra nueva no tiene borrado registrado");

  check((await as("authenticated", NORMAL, () => query("update public.obras_colectivas set borrado_pared_en = now() where id = $1 returning id", [id]))).rowCount === 0, "Borrar la pared: una cuenta normal no registra un borrado");
  check((await as("anon", null, () => query("update public.obras_colectivas set borrado_pared_en = now() where id = $1 returning id", [id]))).rowCount === 0, "Borrar la pared: anon no registra un borrado");
  const registrado = await as("authenticated", ADMIN, () => query("update public.obras_colectivas set borrado_pared_en = now() where id = $1 returning borrado_pared_en", [id]));
  check(registrado.rowCount === 1 && registrado.rows[0].borrado_pared_en !== null, "Borrar la pared: administración registra la hora del borrado en la obra");
  const leida = await as("authenticated", NORMAL, () => query("select borrado_pared_en from public.obras_colectivas where id = $1", [id]));
  check(leida.rowCount === 1 && leida.rows[0].borrado_pared_en !== null, "Borrar la pared: la pared (cualquier sesión) lee la hora registrada para comprobar el «borrar»");
}
