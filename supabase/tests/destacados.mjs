// Banco de pruebas de la migración de destacados (docs/rediseno/20, OL-052), sin red ni producción.
// Aplica todas las migraciones y comprueba la tira de cada sección: lo que elige la administración y lo que tiene al menos
// 3 «Voy» sin contar a la administración (D1, D2); que se quita también lo que entra por asistentes (D3); la ciudad, lo
// oculto, lo privado y lo que ya pasó; hasta 8 y su orden; que un lugar o un artista caduca a las dos semanas y un evento
// al pasar; que la tabla se lee sin sesión y solo se escribe con cambiar_destacado, de la administración; que la tira no
// devuelve datos de personas; y que borrar la ficha borra su renglón.
//
// PGlite no es dependencia del repo: se instala aparte, una vez, fuera del proyecto.
//   npm install --prefix /tmp/pglite @electric-sql/pglite@0.5.8
//   PGLITE=/tmp/pglite node supabase/tests/destacados.mjs
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
const migracion = archivos.find((f) => f.endsWith("_destacados.sql"));
if (!migracion) {
  console.log("✗ no está la migración de destacados");
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
const [U1, U2, U3, U4] = [uuid(11), uuid(12), uuid(13), uuid(14)]; // personas
const SLP = "San Luis Potosí";
const P_FORO = uuid(101); // con eventos que llenan
const P_CASA = uuid(102); // sin asistentes
const P_PRIVADO = uuid(103);
const P_OCULTO = uuid(104);
const P_MADRID = uuid(105);
const E_LLENO = uuid(201); // 3 personas y el fundador van
const E_MEDIO = uuid(202); // 2 personas
const E_PASADO = uuid(203); // 4 personas, ya pasó
const E_OCULTO = uuid(204); // 4 personas, oculto
const E_SITIO = uuid(205); // sin lugar ni asistentes
const E_MADRID = uuid(206); // 3 personas, en Madrid
const A_LLENO = uuid(301); // se presenta en E_LLENO
const A_MEDIO = uuid(302); // se presenta en E_MEDIO
const A_MADRID = uuid(303);
await db.exec(`
  insert into public.admin_correos (correo) values ('fundador@ejemplo.org');
  insert into auth.users (id, email) values ('${F}', 'fundador@ejemplo.org'), ('${U1}', 'u1@ejemplo.org'), ('${U2}', 'u2@ejemplo.org'),
    ('${U3}', 'u3@ejemplo.org'), ('${U4}', 'u4@ejemplo.org');
  insert into public.lugares (id, nombre, tipo, lat, lng, creado_por, ciudad, privado, visible) values
    ('${P_FORO}', 'Foro Lleno', 'foro', 22.15, -100.98, '${F}', '${SLP}', false, true),
    ('${P_CASA}', 'Casa Tranquila', 'casa_de_cultura', 22.16, -100.97, '${F}', '${SLP}', false, true),
    ('${P_PRIVADO}', 'Estudio Privado', 'otro', 22.17, -100.96, '${F}', '${SLP}', true, true),
    ('${P_OCULTO}', 'Galería Oculta', 'galeria', 22.18, -100.95, '${F}', '${SLP}', false, false);
  insert into public.lugares (id, nombre, tipo, lat, lng, creado_por, ciudad, zona) values
    ('${P_MADRID}', 'Sala de Madrid', 'foro', 40.41, -3.70, '${F}', 'Madrid', 'Europe/Madrid');
  insert into public.eventos (id, lugar_id, titulo, inicio, creado_por, ciudad, visible) values
    ('${E_LLENO}', '${P_FORO}', 'Concierto lleno', now() + interval '2 days', '${F}', '${SLP}', true),
    ('${E_MEDIO}', '${P_FORO}', 'Ensayo abierto', now() + interval '1 day', '${F}', '${SLP}', true),
    ('${E_PASADO}', '${P_FORO}', 'Función pasada', now() - interval '3 days', '${F}', '${SLP}', true),
    ('${E_OCULTO}', '${P_CASA}', 'Taller oculto', now() + interval '3 days', '${F}', '${SLP}', false),
    ('${E_MADRID}', '${P_MADRID}', 'Recital en Madrid', now() + interval '2 days', '${F}', 'Madrid', true);
  insert into public.eventos (id, titulo, inicio, creado_por, ciudad, sitio_texto) values
    ('${E_SITIO}', 'Feria en la plaza', now() + interval '4 days', '${F}', '${SLP}', 'Plaza de Armas');
  insert into public.asistencias (usuario_id, evento_id, estado) values
    ('${U1}', '${E_LLENO}', 'voy'), ('${U2}', '${E_LLENO}', 'voy'), ('${U3}', '${E_LLENO}', 'voy'), ('${F}', '${E_LLENO}', 'voy'),
    ('${U4}', '${E_LLENO}', 'me_interesa'),
    ('${U1}', '${E_MEDIO}', 'voy'), ('${U2}', '${E_MEDIO}', 'voy'), ('${F}', '${E_MEDIO}', 'voy'),
    ('${U1}', '${E_PASADO}', 'voy'), ('${U2}', '${E_PASADO}', 'voy'), ('${U3}', '${E_PASADO}', 'voy'), ('${U4}', '${E_PASADO}', 'voy'),
    ('${U1}', '${E_OCULTO}', 'voy'), ('${U2}', '${E_OCULTO}', 'voy'), ('${U3}', '${E_OCULTO}', 'voy'), ('${U4}', '${E_OCULTO}', 'voy'),
    ('${U1}', '${E_MADRID}', 'voy'), ('${U2}', '${E_MADRID}', 'voy'), ('${U3}', '${E_MADRID}', 'voy');
  insert into public.artistas (id, nombre, creado_por, ciudad) values
    ('${A_LLENO}', 'Trío Lleno', '${F}', '${SLP}'), ('${A_MEDIO}', 'Dúo Medio', '${F}', '${SLP}'), ('${A_MADRID}', 'Coro de Madrid', '${F}', 'Madrid');
  insert into public.eventos_artistas (evento_id, artista_id) values ('${E_LLENO}', '${A_LLENO}'), ('${E_MEDIO}', '${A_MEDIO}'), ('${E_MADRID}', '${A_MADRID}');
`);
ok((await filas(`select rol from public.perfiles where id = $1`, [F]))[0]?.rol === "admin", "el fundador nace administrador");
console.log("✓ datos sembrados");

const tira = async (tipo, ciudad = SLP) => filas(`select id, motivo, hasta, van from public.tira_destacados($1, $2)`, [tipo, ciudad]);
const ids = (r) => r.map((x) => x.id);
const cambiar = (tipo, id, estado) => db.query(`select public.cambiar_destacado($1, $2, $3)`, [tipo, id, estado]);

// ---------- por asistentes, sin que nadie elija ----------
await como("anon", null);
let t = await tira("eventos");
ok(JSON.stringify(ids(t)) === JSON.stringify([E_LLENO]), "eventos: entra solo el de 3 personas; 2 no bastan, y lo pasado y lo oculto no cuentan", t);
ok(t[0]?.motivo === "asistentes" && t[0]?.van === 3 && t[0]?.hasta === null, "eventos: por asistentes, 3 (el «Voy» del fundador y el «Me interesa» no cuentan)", t[0]);
t = await tira("lugares");
ok(JSON.stringify(ids(t)) === JSON.stringify([P_FORO]), "lugares: el foro suma los que van a sus próximos eventos (3 + 2); el pasado no cuenta", t);
ok(t[0]?.van === 5, "lugares: 5 van a sus eventos", t[0]);
t = await tira("artistas");
ok(JSON.stringify(ids(t)) === JSON.stringify([A_LLENO]), "artistas: el trío va con 3; el dúo, con 2, no", t);
ok(ids(await tira("eventos", "Madrid")).join() === E_MADRID && ids(await tira("lugares", "Madrid")).join() === P_MADRID, "Madrid: cada ciudad con lo suyo");
ok((await tira("eventos", "Córdoba")).length === 0, "una ciudad sin nada: tira vacía");
ok((await tira("otro", SLP)).length === 0, "un tipo que no existe: tira vacía");
ok(JSON.stringify((await db.query(`select * from public.tira_destacados('eventos', $1)`, [SLP])).fields.map((c) => c.name)) === JSON.stringify(["id", "motivo", "hasta", "van"]), "la tira solo dice qué ficha, por qué, hasta cuándo y cuántos van: nada de quién");

// ---------- solo la administración cambia ----------
ok((await falla(`select public.cambiar_destacado('lugares', $1, 'elegido')`, [P_CASA])) !== null, "sin sesión no se puede destacar");
ok(/permission denied/.test((await falla(`select * from public.panel_destacados('lugares')`)) ?? ""), "sin sesión no se abre el panel de destacados");
ok(Array.isArray(await filas(`select * from public.destacados`)), "la tabla se lee sin sesión");
ok((await falla(`insert into public.destacados (lugar_id, hasta) values ($1, now() + interval '1 day')`, [P_CASA])) !== null, "sin sesión no se escribe en la tabla");
await como("authenticated", U1);
ok(/sin_permiso/.test((await falla(`select public.cambiar_destacado('lugares', $1, 'elegido')`, [P_CASA])) ?? ""), "una persona no puede destacar: sin_permiso");
ok((await falla(`insert into public.destacados (lugar_id, hasta) values ($1, now() + interval '1 day')`, [P_CASA])) !== null, "ni escribir en la tabla");
ok((await filas(`select * from public.panel_destacados('lugares')`)).length === 0, "ni ver el panel de destacados: vacío");

await como("authenticated", F);
ok((await falla(`insert into public.destacados (lugar_id, hasta) values ($1, now() + interval '1 day')`, [P_CASA])) !== null, "tampoco la administración escribe de frente: solo con cambiar_destacado");
ok((await falla(`select public.cambiar_destacado('plazas', $1, 'elegido')`, [P_CASA])) !== null, "un tipo que no existe se rechaza");
ok((await falla(`select public.cambiar_destacado('lugares', $1, 'fijo')`, [P_CASA])) !== null, "un estado que no existe se rechaza");
await como(null, null);
ok((await falla(`insert into public.destacados (lugar_id, artista_id, hasta) values ($1, $2, now())`, [P_CASA, A_MEDIO])) !== null, "un renglón no puede ser de dos fichas");
ok((await falla(`insert into public.destacados (evento_id, hasta) values ($1, now())`, [E_SITIO])) !== null, "un evento no lleva fecha de caducidad");
ok((await falla(`insert into public.destacados (lugar_id) values ($1)`, [P_CASA])) !== null, "un lugar sí la lleva");
await como("authenticated", F);

// ---------- elegir ----------
await cambiar("lugares", P_CASA, "elegido");
await cambiar("eventos", E_SITIO, "elegido");
await cambiar("artistas", A_MEDIO, "elegido");
await cambiar("lugares", P_PRIVADO, "elegido");
await cambiar("lugares", P_OCULTO, "elegido");
const renglon = (await filas(`select hasta from public.destacados where lugar_id = $1`, [P_CASA]))[0];
ok(renglon && Math.abs(new Date(renglon.hasta) - Date.now() - 14 * 864e5) < 60e3, "elegir un lugar: dos semanas", renglon);
await como("anon", null);
t = await tira("lugares");
ok(JSON.stringify(ids(t)) === JSON.stringify([P_CASA, P_FORO]), "lugares: primero lo elegido y después por asistentes; lo privado y lo oculto no salen aunque se elijan", t);
ok(t[0]?.motivo === "elegido", "lugares: el elegido dice por qué", t[0]);
t = await tira("eventos");
ok(JSON.stringify(ids(t)) === JSON.stringify([E_LLENO, E_SITIO]), "eventos: por día y hora, sea elegido o por asistentes", t);
ok(t[1]?.motivo === "elegido" && t[1]?.hasta === null, "eventos: el elegido no caduca por fecha; vale hasta que pasa", t[1]);
t = await tira("artistas");
ok(JSON.stringify(ids(t)) === JSON.stringify([A_MEDIO, A_LLENO]), "artistas: el elegido y el de asistentes", t);
await como(null, null);
await db.query(`update public.artistas set visible = false where id = $1`, [A_MEDIO]);
await db.query(`update public.eventos set visible = false where id = $1`, [E_SITIO]);
await como("anon", null);
ok(!ids(await tira("artistas")).includes(A_MEDIO) && !ids(await tira("eventos")).includes(E_SITIO), "lo elegido que después se oculta no sale");
await como(null, null);
await db.query(`update public.artistas set visible = true where id = $1`, [A_MEDIO]);
await db.query(`update public.eventos set visible = true where id = $1`, [E_SITIO]);

// ---------- quitar, también lo que entra por asistentes (D3) ----------
await como("authenticated", F);
await cambiar("artistas", A_LLENO, "quitado");
await cambiar("lugares", P_CASA, "quitado");
await como("anon", null);
ok(JSON.stringify(ids(await tira("artistas"))) === JSON.stringify([A_MEDIO]), "artistas: quitar el de asistentes lo saca");
ok(JSON.stringify(ids(await tira("lugares"))) === JSON.stringify([P_FORO]), "lugares: quitar el elegido lo saca");
await como("authenticated", F);
await cambiar("artistas", A_LLENO, "ninguno");
await como("anon", null);
ok(JSON.stringify(ids(await tira("artistas"))) === JSON.stringify([A_MEDIO, A_LLENO]), "deshacer lo quitado: vuelve por asistentes");

// ---------- caducar ----------
await como(null, null);
await db.query(`update public.destacados set hasta = now() - interval '1 minute' where artista_id = $1`, [A_MEDIO]);
await db.query(`insert into public.destacados (artista_id, quitado, hasta) values ($1, true, now() - interval '1 minute') on conflict do nothing`, [A_LLENO]);
await como("anon", null);
ok(JSON.stringify(ids(await tira("artistas"))) === JSON.stringify([A_LLENO]), "a las dos semanas, el elegido sin asistentes se va y lo quitado vuelve por asistentes");
await como(null, null);
await db.query(`update public.eventos set inicio = now() - interval '5 days' where id = $1`, [E_SITIO]);
await como("anon", null);
ok(!ids(await tira("eventos")).includes(E_SITIO), "un evento elegido se va cuando pasa");

// ---------- hasta 8, los elegidos más recientes ----------
await como(null, null);
const nuevos = Array.from({ length: 10 }, (_, i) => uuid(400 + i));
for (const [i, id] of nuevos.entries()) {
  await db.query(`insert into public.lugares (id, nombre, tipo, lat, lng, creado_por, ciudad) values ($1, $2, 'foro', 22.2, -100.9, $3, $4)`, [id, `Lugar ${i}`, F, SLP]);
}
await como("authenticated", F);
for (const id of nuevos) {
  await cambiar("lugares", id, "elegido");
  await db.exec(`select pg_sleep(0.002)`);
}
await como("anon", null);
t = await tira("lugares");
ok(t.length === 8, "lugares: nunca más de 8", t.length);
ok(JSON.stringify(ids(t)) === JSON.stringify(nuevos.slice(2).reverse()), "lugares: con más de 8 elegidos, los 8 más recientes, el último primero", ids(t));

// ---------- el panel ----------
await como("authenticated", F);
const panel = await filas(`select * from public.panel_destacados('lugares')`);
ok(panel.length === 9 && panel.some((x) => x.id === P_MADRID && x.nombre === "Sala de Madrid"), "panel: los destacados de todas las ciudades, con su nombre", panel.length);
ok((await filas(`select id from public.destacados`)).length > 0, "la administración lee lo que decidió");

// ---------- borrar la ficha borra su renglón ----------
await como(null, null);
await db.query(`delete from public.lugares where id = $1`, [nuevos[0]]);
ok((await filas(`select id from public.destacados where lugar_id = $1`, [nuevos[0]])).length === 0, "borrar un lugar borra su destacado");
await db.query(`delete from public.eventos where id = $1`, [E_SITIO]);
await db.query(`delete from public.artistas where id = $1`, [A_MEDIO]);
ok((await filas(`select id from public.destacados where evento_id = $1 or artista_id = $2`, [E_SITIO, A_MEDIO])).length === 0, "y borrar un evento o un artista, el suyo");

console.log(fallos ? `✗ ${fallos} fallos, ${pasan} pasan` : `✓ ${pasan} comprobaciones en verde`);
process.exit(fallos ? 1 : 0);
