import { randomUUID } from "node:crypto";

/**
 * OL-471 (bitácora 503, migración 20261028180000): «Conectar Instagram». El token de la página vive en Vault (`instagram_token`) y solo la llave
 * de servicio lo guarda (`instagram_guardar_conexion`) o lo lee (`instagram_token`); el estado de la conexión, sin token, en `instagram_conexion`,
 * que lee la administración y nadie más. El banco no tiene Vault: primero se prueba sin él (no guarda nada y lo dice) y luego con un Vault de
 * mentira (tabla, vista y funciones con la forma de las de Supabase) dentro de una transacción que se deshace.
 */
const ADMIN = randomUUID();
const OTRA = randomUUID();
// Inventados para la prueba: nunca un token de verdad.
const TOKEN = "EAAtokeninventado471aaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OTRO_TOKEN = "EAAotrotokeninventado471bbbbbbbbbbbbbbbbbbbbbbbbb";
const PERMISOS = ["business_management", "instagram_basic", "instagram_content_publish", "instagram_manage_insights", "pages_manage_posts", "pages_read_engagement", "pages_show_list"];

export async function run({ as, check, expectError, query }) {
  await query("insert into public.admin_correos (correo) values ('ig-conexion-admin@local.test')");
  await query("insert into auth.users (id, email) values ($1, 'ig-conexion-admin@local.test'), ($2, 'ig-conexion-otra@local.test')", [ADMIN, OTRA]);
  const rol = (await query("select rol from public.perfiles where id = $1", [ADMIN])).rows[0]?.rol;
  check(rol === "admin", "la cuenta de prueba es de la administración", rol);
  const guardar = (token, quien = ADMIN, permisos = PERMISOS) =>
    query("select public.instagram_guardar_conexion($1, '1374800000000471', 'Somos Nosotrxs', '17841400000000471', 'smsnstrsapp', $2, $3)", [token, permisos, quien]);
  const leerToken = () => as("service_role", null, async () => (await query("select public.instagram_token() as t")).rows[0].t);

  // --- Nadie más que la llave de servicio guarda o lee el token.
  for (const [nombre, rolDb, sujeto] of [["un visitante", "anon", null], ["una cuenta cualquiera", "authenticated", OTRA], ["la administración", "authenticated", ADMIN]]) {
    await as(rolDb, sujeto, () => expectError(() => guardar(TOKEN), "42501", `${nombre} no guarda la conexión`));
    await as(rolDb, sujeto, () => expectError(() => query("select public.instagram_token()"), "42501", `${nombre} no lee el token`));
  }

  // --- Sin Vault: no hay token que leer, y guardar no guarda nada (ni el estado) y lo dice.
  check((await leerToken()) === null, "sin Vault, el token es null (la app usa el de respaldo)");
  await as("service_role", null, () => expectError(() => guardar(TOKEN), "55000", "sin Vault no se guarda la conexión"));
  check((await query("select count(*)::int as n from public.instagram_conexion")).rows[0].n === 0, "y no queda estado a medias");
  // Lo que se valida antes de llegar a Vault.
  await as("service_role", null, () => expectError(() => guardar("corto"), "22023", "un token que no lo parece no entra"));
  await as("service_role", null, () => expectError(() => guardar(`${TOKEN} x`), "22023", "un token con espacios no entra"));
  await as("service_role", null, () => expectError(() => guardar(TOKEN, OTRA), "42501", "quien conecta tiene que ser de la administración"));
  await as("service_role", null, () => expectError(() => guardar(TOKEN, null), "42501", "sin quién conectó, no se guarda"));

  // --- La tabla de estado: la lee la administración; nadie la escribe directo (tampoco la llave de servicio).
  await as("anon", null, () => expectError(() => query("select count(*) from public.instagram_conexion"), "42501", "un visitante no lee el estado"));
  await as("authenticated", ADMIN, () => expectError(() => query("insert into public.instagram_conexion (pagina_id, pagina_nombre, instagram_id) values ('1', 'x', '1')"), "42501", "la administración no escribe el estado directo"));
  await as("service_role", null, () => expectError(() => query("insert into public.instagram_conexion (pagina_id, pagina_nombre, instagram_id) values ('1', 'x', '1')"), "42501", "la llave de servicio tampoco: solo por instagram_guardar_conexion"));

  // --- Con un Vault de mentira (la forma de supabase_vault: vault.secrets, vault.decrypted_secrets, create_secret y update_secret).
  await query("begin");
  try {
    await query(`create schema vault;
      create table vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, description text, secret text);
      create view vault.decrypted_secrets as select id, name, description, secret as decrypted_secret from vault.secrets;
      create function vault.create_secret(new_secret text, new_name text default null, new_description text default '', new_key_id uuid default null) returns uuid
        language sql as $$ insert into vault.secrets (name, description, secret) values (new_name, new_description, new_secret) returning id $$;
      create function vault.update_secret(secret_id uuid, new_secret text default null, new_name text default null, new_description text default null, new_key_id uuid default null) returns void
        language sql as $$ update vault.secrets set secret = coalesce(new_secret, secret), name = coalesce(new_name, name), description = coalesce(new_description, description) where id = secret_id $$;`);
    check((await leerToken()) === null, "con Vault vacío, el token es null");
    await as("service_role", null, () => guardar(TOKEN));
    const secretos = (await query("select name, secret from vault.secrets")).rows;
    check(secretos.length === 1 && secretos[0].name === "instagram_token" && secretos[0].secret === TOKEN, "el token queda en Vault como instagram_token", secretos.map((s) => s.name));
    check((await leerToken()) === TOKEN, "la llave de servicio lo lee con instagram_token()");

    const fila = await as("authenticated", ADMIN, async () => (await query("select * from public.instagram_conexion")).rows);
    check(
      fila.length === 1 && fila[0].pagina_nombre === "Somos Nosotrxs" && fila[0].instagram_usuario === "smsnstrsapp" && fila[0].conectado_por === ADMIN && fila[0].permisos.includes("instagram_manage_insights"),
      "la administración lee el estado: página, cuenta, permisos y quién conectó",
      fila[0] && { ...fila[0] },
    );
    check(!JSON.stringify(fila).includes(TOKEN), "el estado no lleva el token en ninguna columna");
    const veOtra = await as("authenticated", OTRA, async () => (await query("select count(*)::int as n from public.instagram_conexion")).rows[0].n);
    check(veOtra === 0, "una cuenta cualquiera no ve el estado", veOtra);

    // Reconectar: el mismo secreto con el token nuevo, y el estado al día (aquí, sin el permiso de leer cuentas).
    await as("service_role", null, () => guardar(OTRO_TOKEN, ADMIN, PERMISOS.filter((p) => p !== "instagram_manage_insights")));
    const despues = (await query("select name, secret from vault.secrets")).rows;
    check(despues.length === 1 && despues[0].secret === OTRO_TOKEN, "reconectar cambia el token del mismo secreto (no crea otro)", despues.length);
    const estado = (await query("select count(*)::int as n, bool_and(not ('instagram_manage_insights' = any(permisos))) as sin from public.instagram_conexion")).rows[0];
    check(estado.n === 1 && estado.sin === true, "una sola fila de estado, con los permisos de la última vez", estado);
  } finally {
    await query("rollback");
  }
  check((await query("select count(*)::int as n from public.instagram_conexion")).rows[0].n === 0, "al deshacer la transacción no queda estado");

  // --- Las funciones: definer, search_path vacío, sin visitantes ni cuentas; la llave de servicio sí. La tabla no tiene dónde guardar un token.
  const { rows: f } = await query(`select proname, prosecdef, proconfig,
      has_function_privilege('anon', oid, 'execute') as anon, has_function_privilege('authenticated', oid, 'execute') as cuentas,
      has_function_privilege('service_role', oid, 'execute') as servicio
    from pg_proc where proname in ('instagram_guardar_conexion', 'instagram_token') and pronamespace = 'public'::regnamespace`);
  check(f.length === 2 && f.every((x) => x.prosecdef && x.proconfig?.includes('search_path=""') && !x.anon && !x.cuentas && x.servicio), "las dos funciones: definer, search_path vacío, solo la llave de servicio", f);
  const { rows: columnas } = await query("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'instagram_conexion'");
  check(!columnas.some((c) => /token|secret/.test(c.column_name)), "la tabla de estado no tiene columna para el token", columnas.map((c) => c.column_name));
}
