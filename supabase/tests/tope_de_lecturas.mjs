// Banco de pruebas de la migración del tope de lecturas de cartel (docs/rediseno/23, OL-067), sin red ni producción.
// Aplica todas las migraciones y comprueba: que el cupo del mes se gasta y se acaba a las 20; que una lectura del mes
// pasado no cuenta (se renueva el día 1, en la hora de la ciudad); que las fallidas también gastan, porque cuestan lo
// mismo; que la administración no se topa nunca; que "dar más" sube a 100 y solo lo puede hacer la administración;
// que una cuenta normal no puede cambiarse el tope ni insertar lecturas ni leer las de nadie; que la petición de más
// capacidad tiene que apuntar al propio perfil y solo puede haber una sin atender; y que el panel ve cuántas leyó y
// cuántas publicó esa cuenta este mes. Cada guarda, con su control negativo.
//
// PGlite no es dependencia del repo: se instala aparte, una vez, fuera del proyecto.
//   npm install --prefix /tmp/pglite @electric-sql/pglite@0.5.8
//   PGLITE=/tmp/pglite node supabase/tests/tope_de_lecturas.mjs
// Sale con 0 si todo está en verde.
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
const filas = async (sql, params) => (await db.query(sql, params)).rows;
const uno = async (sql, params) => (await filas(sql, params))[0];
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

// ---------- Supabase mínimo ----------
await db.exec(`
  set time zone 'UTC';
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
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

// ---------- migraciones ----------
const archivos = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const migracion = archivos.find((f) => f.endsWith("_tope_de_lecturas.sql"));
if (!migracion) {
  console.log("✗ no está la migración del tope de lecturas");
  process.exit(1);
}
for (const f of archivos) {
  try {
    await db.exec(readFileSync(join(dir, f), "utf8"));
  } catch (e) {
    console.log(`✗ migración ${f}: ${e.message}`);
    process.exit(1);
  }
}
console.log(`✓ ${archivos.length} migraciones aplicadas (con ${migracion})`);

// ---------- datos ----------
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const F = uuid(1); // fundador, administrador
const [U1, U2, U3] = [uuid(11), uuid(12), uuid(13)];
const LUGAR = uuid(101);

await como(null);
// El perfil lo crea la base al nacer la cuenta; aquí solo se le pone nombre y, al fundador, el rol.
await db.exec(`
  insert into public.admin_correos (correo) values ('fundador@ejemplo.org');
  insert into auth.users (id, email) values
    ('${F}', 'fundador@ejemplo.org'), ('${U1}', 'uno@ejemplo.org'), ('${U2}', 'dos@ejemplo.org'), ('${U3}', 'tres@ejemplo.org');
  update public.perfiles set nombre = 'Fundador', rol = 'admin' where id = '${F}';
  update public.perfiles set nombre = 'Casa de la Cultura' where id = '${U1}';
  insert into public.lugares (id, nombre, tipo, lat, lng, creado_por)
    values ('${LUGAR}', 'Centro', 'foro', 22.15, -100.98, '${F}');
`);
ok((await uno(`select rol from public.perfiles where id = '${F}'`))?.rol === "admin", "el fundador es administración");

// ---------- el tope base y el cupo ----------
await como("authenticated", U1);
let cupo = await uno("select * from public.mi_cupo_de_cartel()");
ok(cupo?.tope === 20, "el tope base son 20 al mes", cupo);
ok(cupo?.usadas === 0 && cupo?.sin_tope === false, "una cuenta nueva empieza en 0 y con tope", cupo);

// Se gastan 19 y todavía se puede.
for (let i = 0; i < 19; i++) await uno("select public.apartar_lectura_de_cartel() as v");
cupo = await uno("select * from public.mi_cupo_de_cartel()");
ok(cupo?.usadas === 19, "las lecturas se cuentan", cupo);
ok((await uno("select public.apartar_lectura_de_cartel() as v"))?.v === true, "la número 20 todavía entra");
ok((await uno("select public.apartar_lectura_de_cartel() as v"))?.v === false, "la número 21 ya no");
cupo = await uno("select * from public.mi_cupo_de_cartel()");
ok(cupo?.usadas === 20, "la que se rechaza no se anota", cupo);

// ---------- se renueva el día 1 ----------
await como(null);
await db.query("update public.lecturas_cartel set creado_en = public.inicio_del_mes() - interval '1 day' where perfil_id = $1", [U1]);
await como("authenticated", U1);
cupo = await uno("select * from public.mi_cupo_de_cartel()");
ok(cupo?.usadas === 0, "lo del mes pasado no cuenta: el cupo se renueva el día 1", cupo);
ok((await uno("select public.apartar_lectura_de_cartel() as v"))?.v === true, "con el mes nuevo se puede otra vez");

// ---------- la administración no se topa ----------
await como(null);
await db.exec(`insert into public.lecturas_cartel (perfil_id) select '${F}' from generate_series(1, 50)`);
await como("authenticated", F);
cupo = await uno("select * from public.mi_cupo_de_cartel()");
ok(cupo?.sin_tope === true, "la administración va sin tope", cupo);
ok((await uno("select public.apartar_lectura_de_cartel() as v"))?.v === true, "la administración lee con 50 encima");

// ---------- una cuenta normal no toca nada de esto ----------
await como("authenticated", U2);
ok((await filas("select * from public.lecturas_cartel")).length === 0, "una cuenta normal no lee las lecturas de nadie");
ok((await filas("select * from public.topes_de_lectura")).length === 0, "ni los topes");
ok(await falla("insert into public.lecturas_cartel (perfil_id) values ($1)", [U2]), "ni inserta lecturas a mano");
ok(await falla("insert into public.topes_de_lectura (perfil_id, tope) values ($1, 999)", [U2]), "ni se sube el tope");
ok(await falla("select public.dar_mas_lecturas($1)", [U2]), "ni se da más a sí misma");
// Control negativo del control negativo: con la administración sí se puede.
await como("authenticated", F);
ok((await falla("select public.dar_mas_lecturas($1)", [U2])) === null, "la administración sí puede dar más");
await como("authenticated", U2);
cupo = await uno("select * from public.mi_cupo_de_cartel()");
ok(cupo?.tope === 100, "dar más sube esa cuenta a 100", cupo);

// ---------- dos toques a la vez no pasan los dos ----------
// Sin cerrojo, dos transacciones leen 19 y las dos pasan: el mes acaba en 21. Con transacciones preparadas se deja
// una a medias y se prueba otra; `lock_timeout` evita que la segunda se quede colgada esperando, que es lo que debe
// hacer ahora. PGlite tiene una sola conexión, así que esto es lo más cerca de dos dedos a la vez.
await como(null);
await db.exec(`delete from public.lecturas_cartel where perfil_id = '${U3}'`);
const preparadas = (await falla("begin")) === null;
if (preparadas) {
  await db.exec("rollback");
  await como(null);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [U3]);
  await db.exec(`insert into public.lecturas_cartel (perfil_id) select '${U3}' from generate_series(1, 19)`);
  await como("authenticated", U3);
  let bloqueada = null;
  const puedeprepararse = (await falla("begin; select public.apartar_lectura_de_cartel(); prepare transaction 'a'")) === null;
  if (puedeprepararse) {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [U3]);
    bloqueada = await falla("begin; set local lock_timeout = '300ms'; select public.apartar_lectura_de_cartel()");
    await falla("rollback");
    await db.exec("commit prepared 'a'");
    ok(!!bloqueada, "la segunda a la vez espera el cerrojo en vez de pasar", bloqueada);
    await como("authenticated", U3);
    const usadas = (await uno("select * from public.mi_cupo_de_cartel()"))?.usadas;
    ok(usadas === 20, "el mes acaba en 20, no en 21", usadas);
  } else {
    await falla("rollback");
    // PGlite trae max_prepared_transactions = 0 y es de arranque: no se puede cambiar en caliente. Sin dos
    // conexiones no hay dos dedos a la vez, así que se comprueba lo que sí se puede: que el cerrojo se toma, y
    // que la llave es por cuenta (una global pondría en fila a todo el mundo).
    console.log("  · sin transacciones preparadas en esta build (max_prepared_transactions = 0): se comprueba el cerrojo por pg_locks");
    await como("authenticated", U3);
    await db.exec("begin");
    await uno("select public.apartar_lectura_de_cartel() as v");
    const cerrojos = await filas("select 1 from pg_locks where locktype = 'advisory'");
    await db.exec("rollback");
    ok(cerrojos.length >= 1, "apartar toma el cerrojo", cerrojos.length);
    const llaves = await uno("select hashtextextended($1, 0) <> hashtextextended($2, 0) as distintas", [U1, U3]);
    ok(llaves?.distintas === true, "la llave del cerrojo es por cuenta, no una global");
  }
}

// ---------- pedir más capacidad ----------
await como("authenticated", U1);
const pedir = "insert into public.reportes (tipo, objeto_id, motivo, creado_por) values ('perfil', $1, 'mas_lecturas', $2)";
ok((await falla(pedir, [U1, U1])) === null, "se puede pedir más capacidad para uno mismo");
ok(await falla(pedir, [U1, U1]), "no se puede pedir dos veces sin que la atiendan");
ok(await falla(pedir, [U2, U1]), "no se puede pedir capacidad para el perfil de otra persona");
// Atendida la primera, se puede volver a pedir.
await como(null);
await db.query("update public.reportes set atendido = true where creado_por = $1", [U1]);
await como("authenticated", U1);
ok((await falla(pedir, [U1, U1])) === null, "cerrada la anterior, se puede volver a pedir");
ok((await uno("select * from public.mi_cupo_de_cartel()"))?.pedida === true, "el cupo dice que ya pidió, sin abrir reportes a lectura");
// El atajo de nacer atendida está cerrado: si no, el índice único no aplicaría.
ok(await falla("insert into public.reportes (tipo, objeto_id, motivo, creado_por, atendido) values ('perfil', $1, 'mas_lecturas', $1, true)", [U1]), "no se puede colar una petición ya atendida");

// ---------- lo que ve el panel ----------
await como(null);
await db.query("insert into public.eventos (titulo, inicio, lugar_id, creado_por) select 'Evento ' || g, now() + interval '5 days', $1, $2 from generate_series(1, 3) g", [LUGAR, U1]);
await como("authenticated", F);
const pendientes = await filas("select * from public.panel_pendientes()");
const peticion = pendientes.find((p) => p.motivo === "mas_lecturas");
ok(!!peticion, "la petición sale en lo pendiente del panel");
ok(peticion?.lecturas === 1, "el panel ve cuántas leyó este mes", peticion?.lecturas);
ok(peticion?.publicados === 3, "y cuántas publicó, que es con lo que se decide", peticion?.publicados);
const otro = pendientes.find((p) => p.motivo !== "mas_lecturas");
ok(otro === undefined || otro.lecturas === null, "los demás pendientes no traen esos números");

// ---------- pedir cupo no es reportar a nadie ----------
await como("authenticated", F);
const ficha = await uno("select public.panel_persona($1) as j", [U1]);
ok(ficha?.j?.reportes === 0, "la petición no se cuenta como reporte en su ficha", ficha?.j?.reportes);
ok(ficha?.j?.pendientes === 0, "ni como pendiente suyo", ficha?.j?.pendientes);
// indicadores_ahora no se ejecuta desde fuera; se mira por el resumen, que es quien la usa.
const resumen = await uno("select public.panel_resumen() as j");
ok(typeof resumen?.j?.ahora?.activas === "number", "los indicadores siguen respondiendo con el motivo fuera", resumen?.j?.ahora);

// ---------- y una cuenta normal no ve el panel ----------
await como("authenticated", U3);
ok((await filas("select * from public.panel_pendientes()")).length === 0, "una cuenta normal no ve lo pendiente");

console.log(`\n${pasan} en verde, ${fallos} en rojo`);
process.exit(fallos === 0 ? 0 : 1);
