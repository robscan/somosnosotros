// Banco de pruebas de la migración "rol de entonces en las listas" (OL-093, bitácora 128, migración
// 20260921100000_rol_de_entonces_en_listas.sql). El número de un indicador y la lista o el carril que abre deben
// salir del mismo criterio (rol_en, el rol que tenía la cuenta CUANDO actuó, no el de hoy): la bitácora 101 ya lo
// arregló en indicadores_ahora()/panel_comunidad(), pero panel_eventos(), panel_fichas_conteos() y tira_destacados()
// seguían comparando contra el rol de hoy. Reproduce L1 («Publica la comunidad» cuenta con un criterio y su lista con
// otro) y L27 (un evento de hoy con 3 asistentes cae del carril de Destacados en cuanto uno de ellos asciende).
//
// PGlite no es dependencia del repo: se instala aparte, una vez, fuera del proyecto.
//   npm install --prefix /tmp/pglite @electric-sql/pglite@0.5.8
//   PGLITE=/tmp/pglite node supabase/tests/agenda_numeros.mjs
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

// ---------- migraciones, en orden real ----------
const archivos = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const migracion = archivos.find((f) => f.endsWith("_rol_de_entonces_en_listas.sql"));
if (!migracion) {
  console.log("✗ no está la migración 20260921100000_rol_de_entonces_en_listas.sql");
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
const F = uuid(1); // fundador, administrador de origen
const [U1, U2, U3] = [uuid(11), uuid(12), uuid(13)]; // personas, usuarias normales
const SLP = "San Luis Potosí";
const P_FORO = uuid(101);
const E_HOY = uuid(201); // evento de hoy, con 3 asistentes
const E_COMUNIDAD = uuid(202); // evento publicado por U1, siendo usuaria

await db.exec(`
  insert into public.admin_correos (correo) values ('fundador@ejemplo.org');
  insert into auth.users (id, email, email_confirmed_at) values
    ('${F}', 'fundador@ejemplo.org', now()), ('${U1}', 'u1@ejemplo.org', now()),
    ('${U2}', 'u2@ejemplo.org', now()), ('${U3}', 'u3@ejemplo.org', now());
  insert into public.lugares (id, nombre, tipo, lat, lng, creado_por, ciudad, visible) values
    ('${P_FORO}', 'Foro', 'foro', 22.15, -100.98, '${F}', '${SLP}', true);
  insert into public.eventos (id, lugar_id, titulo, inicio, creado_por, ciudad, visible) values
    ('${E_HOY}', '${P_FORO}', 'Evento de hoy', now() + interval '2 hours', '${F}', '${SLP}', true);
`);

async function como(rol, sub) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [sub ?? ""]);
  if (rol) await db.exec(`set role ${rol}`);
}

// ---------- L27: un evento de hoy con 3 asistentes, uno de ellos asciende a admin DESPUÉS de decir "voy" ----------
await como("authenticated", U1);
await db.query(`insert into public.asistencias (usuario_id, evento_id, estado) values ($1, $2, 'voy')`, [U1, E_HOY]);
await como("authenticated", U2);
await db.query(`insert into public.asistencias (usuario_id, evento_id, estado) values ($1, $2, 'voy')`, [U2, E_HOY]);
await como("authenticated", U3);
await db.query(`insert into public.asistencias (usuario_id, evento_id, estado) values ($1, $2, 'voy')`, [U3, E_HOY]);

await como("anon", null);
let tira = await filas(`select id, motivo, van from public.tira_destacados('eventos', $1)`, [SLP]);
ok(tira.length === 1 && tira[0].id === E_HOY && tira[0].motivo === "asistentes" && tira[0].van === 3, "L27 antes: el evento de hoy sale con van=3", tira);

await como("authenticated", F);
const cambio1 = (await filas(`select public.cambiar_rol($1, 'admin') as r`, [U1]))[0];
ok(cambio1.r === "ok", "se pudo ascender a U1 (que ya dijo voy) a administrador", cambio1);

await como("anon", null);
tira = await filas(`select id, motivo, van from public.tira_destacados('eventos', $1)`, [SLP]);
ok(tira.length === 1 && tira[0].id === E_HOY && tira[0].van === 3, "L27 después de ascender a U1: el evento sigue en el carril con van=3 (rol de entonces, no borra el «voy» de antes)", tira);

const asistenciasCrudo = await filas(`select count(*)::int as n from public.asistencias where evento_id = $1`, [E_HOY]);
ok(asistenciasCrudo[0].n === 3, "las 3 asistencias siguen intactas en la tabla", asistenciasCrudo);

// ---------- L1: "Publica la comunidad" — el número y la lista, con el mismo criterio tras un ascenso ----------
await como("authenticated", U2);
await db.query(`insert into public.eventos (id, titulo, inicio, creado_por, ciudad, sitio_texto) values ($1, 'Feria de la comunidad', now() + interval '2 days', $2, $3, 'Plaza')`, [E_COMUNIDAD, U2, SLP]);

await como("authenticated", F);
const ahoraAntes = (await filas(`select public.panel_resumen() as j`))[0].j.ahora;
ok(ahoraAntes.comunidad >= 1, "antes de ascender a U2: «Publica la comunidad» ya cuenta el evento", ahoraAntes.comunidad);
let listaComunidadAntes = await filas(`select id from public.panel_eventos(null, 'comunidad', 30, 0)`);
ok(listaComunidadAntes.some((r) => r.id === E_COMUNIDAD), "antes de ascender: el evento está en la lista de 'comunidad'", listaComunidadAntes);

const cambio2 = (await filas(`select public.cambiar_rol($1, 'admin') as r`, [U2]))[0];
ok(cambio2.r === "ok", "se pudo ascender a U2 (que ya publicó) a administrador", cambio2);

const ahoraDespues = (await filas(`select public.panel_resumen() as j`))[0].j.ahora;
const listaComunidadDespues = await filas(`select id from public.panel_eventos(null, 'comunidad', 30, 0)`);
const conteosDespues = (await filas(`select public.panel_fichas_conteos('eventos') as j`))[0].j;
ok(ahoraDespues.comunidad === ahoraAntes.comunidad, "el número de «Publica la comunidad» no cambia al ascender a la autora (rol de entonces)", { antes: ahoraAntes.comunidad, despues: ahoraDespues.comunidad });
ok(listaComunidadDespues.some((r) => r.id === E_COMUNIDAD), "la lista sigue mostrando el evento tras ascender a la autora: número y lista, mismo criterio", listaComunidadDespues);
ok(conteosDespues.comunidad === ahoraDespues.comunidad, "panel_fichas_conteos('eventos').comunidad coincide con indicadores_ahora().comunidad", { badge: conteosDespues.comunidad, indicador: ahoraDespues.comunidad });
ok(listaComunidadDespues.length === ahoraDespues.comunidad, "la lista trae exactamente tantas filas como dice el número", { filas: listaComunidadDespues.length, numero: ahoraDespues.comunidad });

// ---------- panel_personas(), filtro 'nuevas', y su badge panel_personas_conteos() (tercer sitio, OL-093) ----------
// U3 sigue siendo usuaria normal aquí (recién sembrada, dentro de los 7 días); se mira el badge y la lista como
// administrador (F), que es quien de verdad ve la pantalla Personas.
await como("authenticated", F);
const nuevasAntes = (await filas(`select public.panel_personas_conteos() as j`))[0].j.nuevas;
ok(nuevasAntes >= 1, "antes de ascender a U3: el badge 'nuevas' ya la cuenta (recién sembrada, hace <7 días)", nuevasAntes);
let listaNuevasAntes = await filas(`select id from public.panel_personas(null, 'nuevas', 30, 0)`);
ok(listaNuevasAntes.some((r) => r.id === U3), "antes de ascender: U3 está en la lista de 'nuevas'", listaNuevasAntes);

await como("authenticated", F);
const cambio3 = (await filas(`select public.cambiar_rol($1, 'admin') as r`, [U3]))[0];
ok(cambio3.r === "ok", "se pudo ascender a U3 a administradora", cambio3);
const nuevasDespues = (await filas(`select public.panel_personas_conteos() as j`))[0].j.nuevas;
const listaNuevasDespues = await filas(`select id from public.panel_personas(null, 'nuevas', 30, 0)`);
ok(nuevasDespues === nuevasAntes, "el badge 'nuevas' no cambia al ascender a U3 (rol de entonces)", { antes: nuevasAntes, despues: nuevasDespues });
ok(listaNuevasDespues.some((r) => r.id === U3), "la lista de 'nuevas' sigue mostrando a U3 tras ascenderla: badge y lista, mismo criterio", listaNuevasDespues);

// ---------- negativo: rol_en_para_admin() y rol_en() no se abren a una cuenta normal ----------
// U1, U2 y U3 ya son admin a esta altura (las ascendimos arriba): se prueba con una cuenta nueva, sin ascender.
const U4 = uuid(14);
await db.exec("reset role"); // como al sembrar los datos iniciales: sin rol de sesión, auth.users no es de authenticated
await db.query(`insert into auth.users (id, email, email_confirmed_at) values ($1, 'u4@ejemplo.org', now())`, [U4]); // el trigger al_crear_usuario siembra su perfil

await como("authenticated", U4); // U4: cuenta normal, nunca administradora
const negativo = (await filas(`select public.rol_en_para_admin($1, now()) as r`, [F]))[0];
ok(negativo.r === null, "rol_en_para_admin() devuelve null para quien no es administrador (nunca 'admin' ni 'usuario' filtrado)", negativo);
let negativoRolEn = null;
try {
  await db.query(`select public.rol_en($1, now())`, [F]);
} catch (e) {
  negativoRolEn = e.message;
}
ok(negativoRolEn !== null && /permission denied/i.test(negativoRolEn), "rol_en() sigue dando 'permission denied' a una cuenta normal: el EXECUTE no se amplió", negativoRolEn);

console.log(`${fallos === 0 ? "✓" : "✗"} ${pasan} comprobaciones en verde${fallos ? `, ${fallos} en rojo` : ""}`);
process.exit(fallos === 0 ? 0 : 1);
