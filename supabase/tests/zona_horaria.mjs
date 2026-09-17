// Banco de pruebas de la migración de zona horaria (20260917100000), sin red ni producción.
// PGlite (Postgres en WebAssembly) imita lo mínimo de Supabase, aplica TODAS las migraciones del repo en orden y comprueba
// la zona de lugares y eventos, `eventos.termina`, la cascada al cambiar la zona de un lugar y que el panel oculte con la
// misma regla que las listas.
//
// PGlite no es dependencia del repo: se instala aparte, una vez, fuera del proyecto.
//   npm install --prefix /tmp/pglite @electric-sql/pglite@0.5.8
//   PGLITE=/tmp/pglite node supabase/tests/zona_horaria.mjs
// Sale con 0 si todo está en verde. FORZAR_FALLO=1 comprueba que el banco detecta un fallo.
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
  const r = await db.query(sql, params);
  return r.rows[0];
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

// ---------- Supabase mínimo ----------
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
// Los instantes se escriben en UTC: con la zona del sistema (la que toma PGlite 0.5 por defecto) cambia el formato.
await db.exec("set timezone to 'UTC'");

// ---------- todas las migraciones, en orden ----------
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

// ---------- personas ----------
const ADMIN = "00000000-0000-4000-8000-0000000000f1";
const ANA = "00000000-0000-4000-8000-0000000000a1";
const BETO = "00000000-0000-4000-8000-0000000000a2";
await db.exec(`insert into public.admin_correos (correo) values ('admin@ejemplo.org');`);
for (const [id, correo] of [
  [ADMIN, "admin@ejemplo.org"],
  [ANA, "ana@ejemplo.org"],
  [BETO, "beto@ejemplo.org"],
]) {
  await db.query("insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())", [id, correo]);
}
ok((await uno("select rol from public.perfiles where id = $1", [ADMIN])).rol === "admin", "el admin de prueba nace administrador");

// Un lugar de Ana, por PostgREST como ella; devuelve su id.
async function lugar(nombre, zona, extra = "") {
  await como("authenticated", ANA);
  const r = await uno(`insert into public.lugares (nombre, tipo, lat, lng, creado_por${zona ? ", zona" : ""}${extra ? ", privado" : ""}) values ($1, 'foro', 22.15, -100.97, $2${zona ? ", $3" : ""}${extra ? ", true" : ""}) returning id, zona`, zona ? [nombre, ANA, zona] : [nombre, ANA]);
  await como(null);
  return r;
}
// Un evento de Beto; devuelve la fila con termina y la hora de pared en su zona.
const FILA = "id, zona, termina::text, to_char(timezone(zona, inicio), 'YYYY-MM-DD HH24:MI') as pared, to_char(timezone(zona, fin), 'HH24:MI') as pared_fin";
async function evento(campos, valores) {
  await como("authenticated", BETO);
  const r = await uno(`insert into public.eventos (${Object.keys(campos).join(", ")}, creado_por) values (${Object.keys(campos).map((_, i) => `$${i + 1}`).join(", ")}, $${Object.keys(campos).length + 1}) returning ${FILA}`, [...Object.values(campos), ...valores]);
  await como(null);
  return r;
}

// ---------- 1. la zona de lugares y eventos ----------
const slp = await lugar("Casa de San Luis", null);
ok(slp.zona === "America/Mexico_City", "un lugar sin zona queda en la de la Ciudad de México", slp);
for (const mala of ["Marte/Olimpo", "CST", "UTC", "posix/America/Mexico_City", "America/Mexico_City; drop table x", "", "America/"]) {
  await como("authenticated", ANA);
  const e = await falla("insert into public.lugares (nombre, tipo, lat, lng, creado_por, zona) values ('Mala', 'foro', 22.15, -100.97, $1, $2)", [ANA, mala]);
  ok(!!e && /lugares_zona_valida/.test(e), `rechaza la zona «${mala}»`, e);
}
for (const buena of ["Europe/Madrid", "America/Argentina/Cordoba", "Etc/GMT+8", "America/Costa_Rica", "Atlantic/Canary"]) {
  await como("authenticated", ANA);
  const e = await falla("insert into public.lugares (nombre, tipo, lat, lng, creado_por, zona) values ('Buena', 'foro', 22.15, -100.97, $1, $2)", [ANA, buena]);
  ok(!e, `acepta la zona «${buena}»`, e);
}
await como(null);
const madrid = await lugar("Sala de Madrid", "Europe/Madrid");
const conMadrid = await evento({ lugar_id: madrid.id, titulo: "Concierto", inicio: "2026-09-20 19:00+02", zona: "America/Costa_Rica" }, [BETO]);
ok(conMadrid.zona === "Europe/Madrid", "un evento en un lugar toma la zona del lugar aunque mande otra", conMadrid);
ok(conMadrid.termina === "2026-09-20 22:00:00+00", "sin hora de fin, termina a las 00:00 de Madrid", conMadrid);
const conFin = await evento({ lugar_id: madrid.id, titulo: "Taller", inicio: "2026-09-20 10:00+02", fin: "2026-09-20 12:00+02" }, [BETO]);
ok(conFin.termina === "2026-09-20 10:00:00+00", "con hora de fin, termina es el fin", conFin);
const sitio = await evento({ sitio_texto: "Parque La Sabana", titulo: "Picnic", inicio: "2026-09-20 16:00-06", zona: "America/Costa_Rica" }, [BETO]);
ok(sitio.zona === "America/Costa_Rica" && sitio.termina === "2026-09-21 06:00:00+00", "en otro sitio se queda la zona del punto", sitio);
const privado = await (async () => {
  await como("authenticated", ADMIN);
  await db.query("insert into public.lugares (nombre, tipo, lat, lng, creado_por, privado, zona) values ('Casa privada', 'otro', 9.93, -84.09, $1, true, 'America/Costa_Rica')", [ADMIN]);
  await como(null);
  return uno("select id from public.lugares where nombre = 'Casa privada'");
})();
await como("authenticated", BETO);
ok((await uno("select count(*)::int as n from public.lugares where id = $1", [privado.id])).n === 0, "Beto no ve el lugar privado");
await como(null);
const enPrivado = await evento({ lugar_id: privado.id, titulo: "Huerto", inicio: "2026-09-20 09:00-06" }, [BETO]);
ok(enPrivado.zona === "America/Costa_Rica", "el evento en un lugar privado toma su zona aunque quien publica no lo vea", enPrivado);

// ---------- 2. termina por zona (los mismos valores que terminaDe en src/lib/fechas.test.ts) ----------
for (const [zona, inicio, termina] of [
  ["America/Mexico_City", "2026-09-20 19:00-06", "2026-09-21 06:00:00+00"],
  ["America/Bogota", "2026-09-20 19:00-05", "2026-09-21 05:00:00+00"],
  ["Europe/Madrid", "2026-09-20 19:00+02", "2026-09-20 22:00:00+00"],
  ["Europe/Madrid", "2026-03-29 01:30+01", "2026-03-29 22:00:00+00"], // adelanta el reloj: día de 23 horas
  ["Europe/Madrid", "2026-10-25 01:30+02", "2026-10-25 23:00:00+00"], // lo atrasa: día de 25 horas
]) {
  const e = await evento({ sitio_texto: "Sitio", titulo: `Termina ${zona}`, inicio, zona }, [BETO]);
  ok(e.termina === termina, `termina en ${zona} (${inicio})`, e);
}
await como("authenticated", BETO);
const escrito = await falla("insert into public.eventos (sitio_texto, titulo, inicio, creado_por, termina) values ('X', 'Trampa', now(), $1, '2030-01-01')", [BETO]);
ok(!!escrito && /non-DEFAULT|generated/i.test(escrito), "termina no se puede escribir a mano", escrito);
const malaConFin = await falla("insert into public.eventos (sitio_texto, titulo, inicio, fin, creado_por, zona) values ('X', 'X', now(), now() + interval '1 hour', $1, 'Marte/Olimpo')", [BETO]);
ok(!!malaConFin && /eventos_zona_valida/.test(malaConFin), "un evento con hora de fin y zona inválida no entra", malaConFin);
await como("anon");
const sinSesion = await uno("select count(*)::int as n, bool_and(zona is not null and termina is not null) as todo from public.eventos where visible and termina >= '2026-09-20 00:00+00'");
ok(sinSesion.n > 0 && sinSesion.todo, "sin sesión se leen zona y termina y se filtra por termina", sinSesion);
await como(null);

// ---------- 3. la cascada: el lugar cambia de zona y sus eventos conservan la hora a la vista ----------
const casa = await lugar("Casa que se muda", null);
const cumbia = await evento({ lugar_id: casa.id, titulo: "Cumbia", inicio: "2026-09-20 19:00-06", fin: "2026-09-20 21:00-06" }, [BETO]);
const jazz = await evento({ lugar_id: casa.id, titulo: "Jazz", inicio: "2026-09-20 19:00-06" }, [BETO]);
await db.query("update public.eventos set sitio_revelar_desde = '2026-09-20 16:00-06' where id = $1", [cumbia.id]);
ok(cumbia.pared === "2026-09-20 19:00" && jazz.termina === "2026-09-21 06:00:00+00", "antes: 19:00 en San Luis", { cumbia, jazz });
for (const [zona, termina] of [
  ["Europe/Madrid", "2026-09-20 22:00:00+00"],
  ["America/Bogota", "2026-09-21 05:00:00+00"],
  ["America/Monterrey", "2026-09-21 06:00:00+00"],
]) {
  // Ana cambia la zona de su lugar; los eventos son de Beto (el disparador es definer).
  await como("authenticated", ANA);
  await db.query("update public.lugares set zona = $1 where id = $2", [zona, casa.id]);
  await como(null);
  const c = await uno(`select ${FILA}, to_char(timezone(zona, sitio_revelar_desde), 'HH24:MI') as revela from public.eventos where id = $1`, [cumbia.id]);
  const j = await uno(`select ${FILA} from public.eventos where id = $1`, [jazz.id]);
  ok(c.zona === zona && c.pared === "2026-09-20 19:00" && c.pared_fin === "21:00" && c.revela === "16:00", `→ ${zona}: sigue a las 19:00 (fin 21:00, revela 16:00)`, c);
  ok(j.zona === zona && j.pared === "2026-09-20 19:00" && j.termina === termina, `→ ${zona}: sin fin, termina a las 00:00 de allá`, j);
}
const antesDeGuardar = await uno("select inicio::text from public.eventos where id = $1", [jazz.id]);
await como("authenticated", ANA);
await db.query("update public.lugares set descripcion = 'Nueva foto' where id = $1", [casa.id]);
await db.query("update public.lugares set zona = zona where id = $1", [casa.id]);
await como(null);
const despuesDeGuardar = await uno("select inicio::text from public.eventos where id = $1", [jazz.id]);
ok(antesDeGuardar.inicio === despuesDeGuardar.inicio, "volver a guardar el lugar sin cambiar de zona no mueve sus eventos", { antesDeGuardar, despuesDeGuardar });
const mudado = await (async () => {
  await como("authenticated", BETO);
  await db.query("update public.eventos set lugar_id = $1 where id = $2", [slp.id, jazz.id]);
  await como(null);
  return uno(`select ${FILA} from public.eventos where id = $1`, [jazz.id]);
})();
ok(mudado.zona === "America/Mexico_City", "mudar un evento a otro lugar le pone la zona de ese lugar", mudado);

// ---------- 4. el panel oculta con la misma regla (termina, por zona) ----------
// Un evento sin hora de fin cuyo inicio cae entre el "hoy" de México y el de Madrid: la regla vieja (sin_pasar, con el día
// de México) y termina (con el de Madrid) no coinciden.
const { mx, mad } = await uno(`select
  (date_trunc('day', now() at time zone 'America/Mexico_City') at time zone 'America/Mexico_City') as mx,
  (date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid') as mad`);
const medio = new Date((new Date(mx).getTime() + new Date(mad).getTime()) / 2).toISOString();
const otraMadrid = await lugar("Otra sala de Madrid", "Europe/Madrid");
await como("authenticated", BETO);
const frontera = await uno("insert into public.eventos (lugar_id, titulo, inicio, creado_por) values ($1, 'Frontera', $2, $3) returning id, termina >= now() as se_ve, public.sin_pasar(inicio, fin) as regla_vieja", [otraMadrid.id, medio, BETO]);
ok(frontera.se_ve !== frontera.regla_vieja, "el evento de la frontera separa la regla vieja de la nueva", frontera);
await como("authenticated", ADMIN);
const enPanel = (await uno("select count(*)::int as n from public.panel_eventos(null, 'proximos', 600, 0) where id = $1", [frontera.id])).n;
ok(enPanel === 1 === frontera.se_ve, "panel_eventos lo trata como termina", { enPanel, se_ve: frontera.se_ve });
const conteos = (await uno("select (public.panel_fichas_conteos('eventos') ->> 'proximos')::int as n")).n;
const resumen = (await uno("select ((public.panel_resumen() -> 'ahora') ->> 'proximos')::int as n")).n;
await como(null);
const directo = (await uno("select count(*)::int as n from public.eventos where visible and termina >= now()")).n;
ok(conteos === directo && resumen === directo, "los próximos del panel y del resumen son los de termina >= now()", { conteos, resumen, directo });
await como("authenticated", ADMIN);
const negado = await falla("select public.indicadores_ahora()");
ok(!!negado && /permission denied/.test(negado), "las funciones del panel conservan sus permisos (indicadores_ahora no se llama directo)", negado);
await como("authenticated", BETO);
ok((await uno("select public.panel_fichas_conteos('eventos') as c")).c === null, "una cuenta que no es de administración no ve los conteos");
await como(null);

if (process.env.FORZAR_FALLO) ok(false, "fallo forzado para comprobar el banco");
console.log(fallos === 0 ? `✓ ${pasan} comprobaciones en verde` : `✗ ${fallos} fallaron, ${pasan} en verde`);
process.exit(fallos === 0 ? 0 : 1);
