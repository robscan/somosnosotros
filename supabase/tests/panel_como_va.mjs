// Banco de pruebas de panel_comunidad (migración 20260917150000), sin red ni producción. Mismo patrón que
// supabase/tests/panel_administracion.mjs: PGlite aplica TODAS las migraciones del repo en orden, siembra cuentas de
// edades y actividad distintas, y comprueba el embudo y sus guardas de permiso.
//
//   npm install --prefix /tmp/pglite @electric-sql/pglite@0.5.8
//   PGLITE=/tmp/pglite node supabase/tests/panel_como_va.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

if (!process.env.PGLITE) {
  console.error("Falta PGLITE: la carpeta donde se instaló @electric-sql/pglite (ver la cabecera de este archivo).");
  process.exit(2);
}
const modulo = (ruta) => import(pathToFileURL(join(process.env.PGLITE, "node_modules/@electric-sql/pglite/dist", ruta)).href);
const { PGlite } = await modulo("index.js");
const { unaccent } = await modulo("contrib/unaccent.js");

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));
const dir = join(RAIZ, "supabase/migrations");
const db = new PGlite({ extensions: { unaccent } });

let fallos = 0;
let pasan = 0;
function ok(condicion, que, detalle) {
  if (condicion) pasan++;
  else {
    fallos++;
    console.log("  ✗", que, detalle === undefined ? "" : JSON.stringify(detalle));
  }
}
async function uno(sql, params) {
  return (await db.query(sql, params)).rows[0];
}
async function como(rol, sub) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [sub ?? ""]);
  if (rol) await db.exec(`set role ${rol}`);
}
async function falla(sql, params) {
  try {
    await db.query(sql, params);
    return null;
  } catch (e) {
    return e.message;
  }
}

// ---------- Supabase mínimo (igual que panel_administracion.mjs) ----------
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  create schema auth; create schema storage; create schema extensions;
  grant usage on schema auth, storage, extensions to anon, authenticated, service_role;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}', email_confirmed_at timestamptz, last_sign_in_at timestamptz, created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
`);

const archivos = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
for (const f of archivos) {
  try {
    await db.exec(readFileSync(join(dir, f), "utf8"));
  } catch (e) {
    console.log(`✗ migración ${f}: ${e.message}`);
    process.exit(1);
  }
}
console.log(`✓ ${archivos.length} migraciones aplicadas (la última: ${archivos.at(-1)})`);

// ---------- cuentas de prueba: edad y actividad distintas, todas creadas hace 0 días por auth.users.created_at
//            (no importa aquí) pero con perfiles.creado_en movido a mano a la edad que hace falta ----------
const ADMIN = "00000000-0000-4000-9000-000000000001"; // admin activo: no debe sumar en nada (N2)
const MUY_NUEVA = "00000000-0000-4000-9000-000000000002"; // 2 días: cuenta en registradas e hizo_algo, no en vuelven_base
const VIEJA_ACTIVA = "00000000-0000-4000-9000-000000000003"; // 20 días: hizo_algo + volvió por last_sign_in_at
const VIEJA_VISTA = "00000000-0000-4000-9000-000000000004"; // 20 días: no hizo nada, volvió solo por cuentas_vistas
const VIEJA_QUIETA = "00000000-0000-4000-9000-000000000005"; // 15 días: ni hizo nada ni volvió
const VIEJA_AUTORA = "00000000-0000-4000-9000-000000000006"; // 12 días: hizo_algo publicando un lugar, no volvió
const FUERA_VENTANA = "00000000-0000-4000-9000-000000000007"; // 40 días: fuera de la ventana de 30, muy activa igual
const LUGAR_A = "00000000-0000-4000-9000-000000000101";

await db.exec(`insert into public.admin_correos (correo) values ('admin@ejemplo.org');`);
const cuentas = [
  [ADMIN, "admin@ejemplo.org", "now() - interval '5 days'"],
  [MUY_NUEVA, "nueva@ejemplo.org", "now() - interval '2 days'"],
  [VIEJA_ACTIVA, "activa@ejemplo.org", "now() - interval '20 days'"],
  [VIEJA_VISTA, "vista@ejemplo.org", "now() - interval '20 days'"],
  [VIEJA_QUIETA, "quieta@ejemplo.org", "now() - interval '15 days'"],
  [VIEJA_AUTORA, "autora@ejemplo.org", "now() - interval '12 days'"],
  [FUERA_VENTANA, "fuera@ejemplo.org", "now() - interval '40 days'"],
];
for (const [id, correo, alta] of cuentas) {
  await db.exec(`insert into auth.users (id, email, email_confirmed_at, last_sign_in_at) values ('${id}', '${correo}', now(), ${alta});
    update public.perfiles set creado_en = ${alta} where id = '${id}';`);
}
ok((await uno(`select rol from public.perfiles where id = $1`, [ADMIN])).rol === "admin", "el correo en admin_correos nace administrador");

await db.exec(`
  insert into public.lugares (id, nombre, tipo, lat, lng, creado_por, visible, creado_en) values
    ('${LUGAR_A}', 'Casa de prueba', 'casa_de_cultura', 22.15, -100.98, '${ADMIN}', true, now() - interval '60 days'),
    ('00000000-0000-4000-9000-000000000102', 'Lugar de la autora', 'foro', 22.16, -100.97, '${VIEJA_AUTORA}', true, now() - interval '9 days');
  insert into public.eventos (id, lugar_id, titulo, inicio, creado_por, visible, creado_en) values
    ('00000000-0000-4000-9000-000000000201', '${LUGAR_A}', 'Evento de prueba', now() + interval '5 days', '${ADMIN}', true, now() - interval '60 days');
  -- el admin hizo "algo" (para probar que aun así no suma): un Voy un día después de su propia alta.
  insert into public.asistencias (usuario_id, evento_id, estado, creado_en) values
    ('${ADMIN}', '00000000-0000-4000-9000-000000000201', 'voy', now() - interval '4 days');
  -- muy nueva: dijo Voy un día después de registrarse (dentro de su primera semana, que ni siquiera terminó).
  insert into public.asistencias (usuario_id, evento_id, estado, creado_en) values
    ('${MUY_NUEVA}', '00000000-0000-4000-9000-000000000201', 'me_interesa', now() - interval '1 day');
  -- vieja activa: siguió un lugar dos días después de su alta (dentro de su primera semana).
  insert into public.seguimientos (usuario_id, lugar_id, creado_en) values ('${VIEJA_ACTIVA}', '${LUGAR_A}', now() - interval '18 days');
  -- vieja autora: publicó un lugar 9 días atrás, 3 días después de su alta de hace 12 días (dentro de su primera semana).
  -- (el lugar ya está insertado arriba, con creado_por = vieja autora y creado_en = hace 9 días)
  -- fuera de ventana: muy activa, pero su alta es de hace 40 días, fuera del corte de 30.
  insert into public.seguimientos (usuario_id, lugar_id, creado_en) values ('${FUERA_VENTANA}', '${LUGAR_A}', now() - interval '1 day');
`);

// vieja activa (alta hace 20 días, su primera semana cerró hace 13): volvió por un inicio de sesión real hace 5 días,
// más reciente que esos 13 — sí volvió después.
await db.exec(`update auth.users set last_sign_in_at = now() - interval '5 days' where id = '${VIEJA_ACTIVA}'`);
// vieja vista: no volvió a iniciar sesión (se queda en su alta, antes de que cerrara la primera semana), pero abrió la
// app instalada hace 5 días según cuentas_vistas — también más reciente que sus 13 días.
await como("authenticated", VIEJA_VISTA);
await db.query(`select public.marcar_visto()`);
await como(null, null);
await db.exec(`update public.cuentas_vistas set dia = (now() - interval '5 days')::date where perfil_id = '${VIEJA_VISTA}'`);
// fuera de ventana: también "volvió" hace poco, para probar que ni así entra (está fuera de los 30 días).
await db.exec(`update auth.users set last_sign_in_at = now() - interval '1 day' where id = '${FUERA_VENTANA}'`);
console.log("✓ datos sembrados");

// ---------- permisos ----------
await como("anon", null);
ok((await falla(`select public.panel_comunidad()`))?.includes("permission denied"), "anon no ejecuta panel_comunidad");

await como("authenticated", VIEJA_ACTIVA);
ok((await falla(`select public.panel_comunidad()`))?.includes("solo la administración"), "una cuenta que no es administradora no ejecuta panel_comunidad");

// ---------- el embudo, visto por la administración ----------
await como("authenticated", ADMIN);
const r = (await uno(`select public.panel_comunidad() as r`)).r;
ok(r.registradas === 5, "registradas: las 5 cuentas nuevas sin contar al admin ni a la de hace 40 días", r);
ok(r.hicieron_algo === 3, "hicieron_algo: muy nueva, vieja activa y vieja autora (no el admin, no vieja quieta/vista)", r);
ok(r.vuelven_base === 4, "vuelven_base: las 4 cuentas con más de 7 días de vida (muy nueva queda fuera, es de hace 2 días)", r);
ok(r.vuelven === 2, "vuelven: vieja activa (por last_sign_in_at) y vieja vista (por cuentas_vistas); no vieja quieta ni vieja autora", r);
await como(null, null);

console.log(fallos === 0 ? `✓ ${pasan} comprobaciones en verde` : `✗ ${fallos} de ${pasan + fallos} fallaron`);
process.exit(fallos === 0 ? 0 : 1);
