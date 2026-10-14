// Banco de pruebas de «¿Es este?» antes de publicar un evento (OL-384, bitácora 415, migración 20261012120000_eventos_parecidos.sql).
// Pedido del founder (2026-10-12): «haga una manera de evitar que se publiquen eventos duplicados, así como ya hacemos con lugares». Comprueba
// `eventos_parecidos`: el caso Pargazz (dos títulos en distinto orden, mismo día y lugar), el mismo título genérico, otro día, otro sitio, el
// sitio escrito a mano contra el lugar del directorio, lo que no se ve (oculto, borrador, retirado, pasado), exposiciones y festivales fuera,
// `p_excluir`, el día local en la zona del evento, el tope de cinco y que la pueden llamar `anon`, `authenticated` y `service_role`.
//
// PGlite no es dependencia del repo: se instala aparte, una vez, fuera del proyecto.
//   npm install --prefix /tmp/pglite @electric-sql/pglite@0.5.8
//   PGLITE=/tmp/pglite node supabase/tests/eventos_parecidos.mjs
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
  -- Supabase Realtime (como scripts/test-db.mjs): la migración 20260922130000 pone políticas en realtime.messages.
  create schema realtime;
  create table realtime.messages (id uuid primary key default gen_random_uuid(), topic text not null, extension text not null, payload jsonb, event text,
    private boolean default false, inserted_at timestamptz not null default now(), updated_at timestamptz not null default now());
  alter table realtime.messages enable row level security;
  create function realtime.topic() returns text language sql stable as $$ select nullif(current_setting('realtime.topic', true), '') $$;
  grant usage on schema public, realtime to anon, authenticated, service_role;
  grant all on all tables in schema storage to anon, authenticated, service_role;
  grant all on realtime.messages to anon, authenticated, service_role;
`);

// ---------- migraciones, en orden real ----------
const archivos = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const migracion = archivos.find((f) => f.endsWith("_eventos_parecidos.sql"));
if (!migracion) {
  console.log("✗ no está la migración 20261012120000_eventos_parecidos.sql");
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
const ANA = uuid(1);
const BETO = uuid(2);
const SLP = "San Luis Potosí";
const COSSIO = uuid(101); // Museo Francisco Cossío
const TEATRO = uuid(102); // Teatro de la Paz
// Un día que no ha pasado (dentro de cuatro días, en San Luis). Las 19:00 de allá son la 01:00 UTC del día siguiente: cuenta el día local.
const D = (await filas(`select to_char((now() at time zone 'America/Mexico_City')::date + 4, 'YYYY-MM-DD') as d`))[0].d;
const a = (hora, dias = 0) => `((('${D}'::date + ${dias})::timestamp + time '${hora}') at time zone 'America/Mexico_City')`;

const E = {
  pargazzPdf: uuid(201), // «Gitanos mexicanos 2.ª edición: Pargazz», en el Cossío, a las 19:00 (sin cartel)
  concierto: uuid(202), // «Concierto», en el Cossío, a las 12:00
  otroDia: uuid(203), // «Lectura de poesía joven», en el Cossío, al día siguiente
  otroSitio: uuid(204), // «Lectura de poesía joven», en el Teatro de la Paz, ese día
  aMano: uuid(205), // «Noche de son jarocho», escrito a mano como «Museo Francisco Cossio», ese día
  oculto: uuid(206), // «Cine club Buñuel», oculto
  borrador: uuid(207), // «Cine club Buñuel», borrador de un programa
  retirado: uuid(208), // «Cine club Buñuel», retirado por la administración
  expo: uuid(209), // «Gitanos mexicanos: fotografía», exposición que cubre el día
  festival: uuid(210), // «Gitanos mexicanos fest», marco de festival ese día
  taller: uuid(211), // «Taller de grabado en linóleo», taller ese día
  unaPalabra: uuid(212), // «Danza mexicana», una sola palabra en común con «Música mexicana»
  ano: uuid(213), // «Gala 2026 México», el año no cuenta
  pasado: uuid(214), // «Lectura de poesía joven», en el Cossío, hace una semana
};

await db.exec(`
  insert into auth.users (id, email, email_confirmed_at) values ('${ANA}', 'ana@ejemplo.org', now()), ('${BETO}', 'beto@ejemplo.org', now());
  insert into public.lugares (id, nombre, tipo, lat, lng, creado_por, ciudad, visible) values
    ('${COSSIO}', 'Museo Francisco Cossío', 'museo', 22.1497, -100.9733, '${ANA}', '${SLP}', true),
    ('${TEATRO}', 'Teatro de la Paz', 'foro', 22.1508, -100.9762, '${ANA}', '${SLP}', true);
  insert into public.eventos (id, lugar_id, sitio_texto, sitio_lat, sitio_lng, titulo, inicio, fin, creado_por, ciudad, visible, clase) values
    ('${E.pargazzPdf}', '${COSSIO}', null, null, null, 'Gitanos mexicanos 2.ª edición: Pargazz', ${a("19:00")}, null, '${ANA}', '${SLP}', true, 'puntual'),
    ('${E.concierto}', '${COSSIO}', null, null, null, 'Concierto', ${a("12:00")}, null, '${ANA}', '${SLP}', true, 'puntual'),
    ('${E.otroDia}', '${COSSIO}', null, null, null, 'Lectura de poesía joven', ${a("18:00", 1)}, null, '${ANA}', '${SLP}', true, 'puntual'),
    ('${E.otroSitio}', '${TEATRO}', null, null, null, 'Lectura de poesía joven', ${a("18:00")}, null, '${ANA}', '${SLP}', true, 'puntual'),
    ('${E.aMano}', null, 'Museo Francisco Cossio', 22.1497, -100.9733, 'Noche de son jarocho', ${a("21:00")}, null, '${ANA}', '${SLP}', true, 'puntual'),
    ('${E.oculto}', '${COSSIO}', null, null, null, 'Cine club Buñuel', ${a("16:00")}, null, '${ANA}', '${SLP}', false, 'puntual'),
    ('${E.retirado}', '${COSSIO}', null, null, null, 'Cine club Buñuel', ${a("16:30")}, null, '${ANA}', '${SLP}', true, 'puntual'),
    ('${E.expo}', '${COSSIO}', null, null, null, 'Gitanos mexicanos: fotografía', ${a("10:00", -3)}, ${a("18:00", 20)}, '${ANA}', '${SLP}', true, 'exposicion'),
    ('${E.festival}', '${COSSIO}', null, null, null, 'Gitanos mexicanos fest', ${a("17:00")}, ${a("23:00")}, '${ANA}', '${SLP}', true, 'festival'),
    ('${E.taller}', '${COSSIO}', null, null, null, 'Taller de grabado en linóleo', ${a("10:00")}, ${a("13:00")}, '${ANA}', '${SLP}', true, 'taller'),
    ('${E.unaPalabra}', '${COSSIO}', null, null, null, 'Danza mexicana', ${a("13:00")}, null, '${ANA}', '${SLP}', true, 'puntual'),
    ('${E.ano}', '${COSSIO}', null, null, null, 'Gala 2026 México', ${a("14:00")}, null, '${ANA}', '${SLP}', true, 'puntual');
  insert into public.eventos (id, lugar_id, titulo, inicio, creado_por, ciudad, visible, clase, borrador, evento_padre_id) values
    ('${E.borrador}', '${COSSIO}', 'Cine club Buñuel', ${a("15:00")}, '${ANA}', '${SLP}', false, 'puntual', true, '${E.festival}');
  insert into public.eventos (id, lugar_id, titulo, inicio, creado_por, ciudad, visible, clase) values
    ('${E.pasado}', '${COSSIO}', 'Lectura de poesía joven', ${a("18:00", -7)}, '${ANA}', '${SLP}', true, 'puntual');
  update public.eventos set retirado_por_admin = true, visible = false where id = '${E.retirado}';
`);

/** Lo que devuelve `eventos_parecidos` para un evento nuevo: título, hora local de ese día, lugar o sitio escrito, excluir. */
async function parecidos({ titulo, hora = "19:00", dias = 0, lugar = COSSIO, sitio = null, excluir = null, zona = "America/Mexico_City" }) {
  return filas(`select * from public.eventos_parecidos($1, ${a(hora, dias)}, $2, $3, $4, $5)`, [titulo, zona, lugar, sitio, excluir]);
}
const ids = (r) => r.map((x) => x.id);

await como("authenticated", BETO);

// ---------- el caso Pargazz ----------
let r = await parecidos({ titulo: "Pargazz: Gitanos mexicanos, 2ª Edición" });
ok(ids(r).includes(E.pargazzPdf), "Pargazz: «Pargazz: Gitanos mexicanos, 2ª Edición» encuentra «Gitanos mexicanos 2.ª edición: Pargazz» el mismo día en el mismo lugar", r);
const pargazz = r.find((x) => x.id === E.pargazzPdf);
ok(pargazz && pargazz.lugar_nombre === "Museo Francisco Cossío" && pargazz.slug && pargazz.zona === "America/Mexico_City" && pargazz.titulo === "Gitanos mexicanos 2.ª edición: Pargazz", "devuelve lo que pinta el aviso: título, slug, zona y el nombre del lugar", pargazz);
ok(!ids(r).includes(E.expo) && !ids(r).includes(E.festival), "una exposición y un festival con títulos parecidos que cubren el día no cuentan (lo puntual y los talleres)", ids(r));
r = await parecidos({ titulo: "Pargazz: Gitanos mexicanos, 2ª Edición", hora: "21:30" });
ok(ids(r).includes(E.pargazzPdf), "Pargazz a otra hora del mismo día: también (el mismo día, no la misma hora)", ids(r));
r = await parecidos({ titulo: "Gitanos mexicanos" });
ok(ids(r).includes(E.pargazzPdf), "«Gitanos mexicanos»: dos palabras con contenido en común bastan", ids(r));
r = await parecidos({ titulo: "Pargazz: Gitanos mexicanos, 2ª Edición", excluir: E.pargazzPdf });
ok(!ids(r).includes(E.pargazzPdf), "p_excluir: el mismo evento no se encuentra a sí mismo", ids(r));
r = await parecidos({ titulo: "Pargazz: Gitanos mexicanos, 2ª Edición", dias: 1 });
ok(!ids(r).includes(E.pargazzPdf), "Pargazz al día siguiente: no", ids(r));
r = await parecidos({ titulo: "Pargazz: Gitanos mexicanos, 2ª Edición", lugar: TEATRO });
ok(!ids(r).includes(E.pargazzPdf), "Pargazz en otro lugar ese día: no", ids(r));

// ---------- el mismo título genérico ----------
r = await parecidos({ titulo: "Concierto", hora: "20:00" });
ok(ids(r).includes(E.concierto), "«Concierto» y «Concierto» el mismo día en el mismo sitio: sí (el mismo título normalizado, aunque no sea distintivo; por confirmar)", ids(r));
r = await parecidos({ titulo: "Concierto de jazz", hora: "20:00" });
ok(!ids(r).includes(E.concierto), "«Concierto de jazz» contra «Concierto»: no (el corto no es distintivo y una sola palabra en común)", ids(r));
r = await parecidos({ titulo: "¡CONCIERTO!", hora: "20:00" });
ok(ids(r).includes(E.concierto), "el mismo título con mayúsculas y signos: sí", ids(r));

// ---------- otro día, otro sitio ----------
r = await parecidos({ titulo: "Lectura de poesía joven", hora: "18:00" });
ok(!ids(r).includes(E.otroDia), "el mismo título al día siguiente: no", ids(r));
ok(!ids(r).includes(E.otroSitio), "el mismo título el mismo día en otro lugar: no", ids(r));
ok(!ids(r).includes(E.pasado), "el mismo título hace una semana (ya pasó): no", ids(r));
r = await parecidos({ titulo: "Lectura de poesía joven", hora: "18:00", lugar: TEATRO });
ok(ids(r).includes(E.otroSitio), "y en su lugar, sí", ids(r));

// ---------- el sitio escrito a mano y el lugar del directorio ----------
r = await parecidos({ titulo: "Noche de son jarocho", hora: "20:00" });
ok(ids(r).includes(E.aMano), "en el Cossío del directorio encuentra el evento escrito a mano «Museo Francisco Cossio» (el nombre normalizado)", ids(r));
r = await parecidos({ titulo: "Gitanos mexicanos 2ª edición", lugar: null, sitio: "museo francisco cossío" });
ok(ids(r).includes(E.pargazzPdf), "escrito a mano «museo francisco cossío» encuentra el del lugar del directorio", ids(r));
r = await parecidos({ titulo: "Gitanos mexicanos 2ª edición", lugar: null, sitio: "Casa del Poeta" });
ok(r.length === 0, "escrito a mano en otro sitio: nada", ids(r));
r = await parecidos({ titulo: "Gitanos mexicanos 2ª edición", lugar: null, sitio: "" });
ok(r.length === 0, "sin lugar ni sitio: nada (no se compara contra todos)", ids(r));

// ---------- lo que no se ve ----------
r = await parecidos({ titulo: "Cine club Buñuel", hora: "16:00" });
ok(r.length === 0, "oculto, borrador y retirado por la administración: ninguno", ids(r));
await como("authenticated", ANA);
r = await parecidos({ titulo: "Cine club Buñuel", hora: "16:00" });
ok(r.length === 0, "tampoco para su autora (que sí los lee por la política): solo lo que ve la agenda", ids(r));
await como("authenticated", BETO);

// ---------- palabras ----------
r = await parecidos({ titulo: "Taller de grabado", hora: "11:00" });
ok(ids(r).includes(E.taller), "un taller ese día: sí cuenta («taller» y «grabado» en común)", ids(r));
r = await parecidos({ titulo: "Música mexicana", hora: "13:00" });
ok(!ids(r).includes(E.unaPalabra), "«Música mexicana» y «Danza mexicana»: una sola palabra en común, no", ids(r));
r = await parecidos({ titulo: "Gala 2026 Jalisco", hora: "14:00" });
ok(!ids(r).includes(E.ano), "«Gala 2026 Jalisco» y «Gala 2026 México»: el año no cuenta, una sola palabra, no", ids(r));
r = await parecidos({ titulo: "Gala de México", hora: "14:00" });
ok(ids(r).includes(E.ano), "«Gala de México» y «Gala 2026 México»: dos palabras (gala, mexico), sí", ids(r));
r = await parecidos({ titulo: "De la y el", hora: "14:00" });
ok(r.length === 0, "un título solo de palabras vacías no encuentra nada", ids(r));

// ---------- el día local ----------
// 23:30 en San Luis ya es el día siguiente en UTC: tiene que seguir siendo el mismo día local que el de las 19:00.
r = await parecidos({ titulo: "Pargazz Gitanos mexicanos", hora: "23:30" });
ok(ids(r).includes(E.pargazzPdf), "23:30 local (día siguiente en UTC) sigue siendo el mismo día", ids(r));
r = await parecidos({ titulo: "Pargazz Gitanos mexicanos", hora: "00:30", dias: 1 });
ok(!ids(r).includes(E.pargazzPdf), "00:30 del día siguiente local: ya no", ids(r));

// ---------- el orden y el tope ----------
const muchos = Array.from({ length: 7 }, (_, i) => uuid(300 + i));
await como(null, null);
for (const [i, id] of muchos.entries())
  await db.query(`insert into public.eventos (id, lugar_id, titulo, inicio, creado_por, ciudad, visible) values ($1, $2, 'Jam de jazz latino', ${a(`${10 + i}:00`)}, $3, $4, true)`, [id, TEATRO, ANA, SLP]);
await como("authenticated", BETO);
r = await parecidos({ titulo: "Jam de jazz latino", hora: "16:10", lugar: TEATRO });
ok(r.length === 5, "hasta cinco", r.length);
ok(r[0]?.id === muchos[6], "el más cercano en hora primero (16:00 para las 16:10)", ids(r));

// ---------- quién la puede llamar ----------
await como("anon", null);
r = await parecidos({ titulo: "Pargazz: Gitanos mexicanos, 2ª Edición" });
ok(ids(r).includes(E.pargazzPdf), "anon la puede llamar (lee solo lo visible)", ids(r));
await como("service_role", null);
r = await parecidos({ titulo: "Pargazz: Gitanos mexicanos, 2ª Edición" });
ok(ids(r).includes(E.pargazzPdf), "service_role (el importador) también", ids(r));
r = await parecidos({ titulo: "Cine club Buñuel", hora: "16:00" });
ok(r.length === 0, "y con la llave de servicio (salta la política) tampoco ve lo oculto", ids(r));
await como(null, null);
const def = (await filas(`select prosecdef, provolatile from pg_proc where proname = 'eventos_parecidos'`))[0];
ok(def && def.prosecdef === false && def.provolatile === "s", "security invoker y stable", def);
const publico = (await filas(`select has_function_privilege('public', 'public.eventos_parecidos(text, timestamptz, text, uuid, text, uuid)', 'execute') as p`))[0];
ok(publico.p === false, "sin EXECUTE para public (solo los tres roles)", publico);
await como("authenticated", BETO);
ok((await falla(`select public.titulos_parecidos('a', 'b')`)) !== null, "las internas de OL-341 siguen sin EXECUTE para las cuentas (no se tocaron)");
await como(null, null);

if (process.env.FORZAR_FALLO) ok(false, "FORZAR_FALLO");
console.log(`${fallos === 0 ? "✓" : "✗"} ${pasan} comprobaciones en verde${fallos ? `, ${fallos} en rojo` : ""}`);
process.exit(fallos === 0 ? 0 : 1);
