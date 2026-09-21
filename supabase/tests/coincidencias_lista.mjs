// Banco de pruebas de "Coincidencias abre sus eventos" (OL-102, bitácora 137, migración
// 20260922100000_coincidencias_lista.sql). Decisión del founder (2026-09-21): «Coincidencias debe abrir eventos con
// coincidencias.» La tarjeta «Coincidencias» de Administración enlazaba a /admin/eventos?filtro=semana (la lista
// genérica de la semana), no a los eventos que cuenta el número. Este banco comprueba que indicadores_ahora().
// coincidencias, panel_eventos(filtro='coincidencias') y panel_fichas_conteos('eventos').coincidencias salen del
// MISMO criterio, letra por letra (evento visible, no terminado, dentro de los próximos 7 días, con 2 o más «voy»
// de personas que NO eran administradoras cuando lo dijeron — rol_en, no el rol de hoy), con 0, 1 y 3 eventos.
//
// PGlite no es dependencia del repo: se instala aparte, una vez, fuera del proyecto.
//   npm install --prefix /tmp/pglite @electric-sql/pglite@0.5.8
//   PGLITE=/tmp/pglite node supabase/tests/coincidencias_lista.mjs
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

// ---------- migraciones, en orden real ----------
const archivos = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const migracion = archivos.find((f) => f.endsWith("_coincidencias_lista.sql"));
if (!migracion) {
  console.log("✗ no está la migración 20260922100000_coincidencias_lista.sql");
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
const [U1, U2, U3, U4, U5, U6, U7, U8, U9] = [11, 12, 13, 14, 15, 16, 17, 18, 19].map(uuid); // personas, usuarias normales
const SLP = "San Luis Potosí";
const P_FORO = uuid(101);
const E_A = uuid(201); // 2 voy de usuarias normales: coincidencia
const E_B = uuid(202); // 2 voy de usuarias normales, una asciende a admin DESPUÉS: sigue siendo coincidencia
const E_C = uuid(203); // voy del fundador (admin de origen) + una usuaria normal: solo 1 cuenta, no es coincidencia
const E_D = uuid(204); // 2 voy de usuarias normales: coincidencia

await db.exec(`
  insert into public.admin_correos (correo) values ('fundador@ejemplo.org');
  insert into auth.users (id, email, email_confirmed_at) values
    ('${F}', 'fundador@ejemplo.org', now()), ('${U1}', 'u1@ejemplo.org', now()), ('${U2}', 'u2@ejemplo.org', now()),
    ('${U3}', 'u3@ejemplo.org', now()), ('${U4}', 'u4@ejemplo.org', now()), ('${U5}', 'u5@ejemplo.org', now()),
    ('${U6}', 'u6@ejemplo.org', now()), ('${U7}', 'u7@ejemplo.org', now()), ('${U8}', 'u8@ejemplo.org', now()),
    ('${U9}', 'u9@ejemplo.org', now());
  insert into public.lugares (id, nombre, tipo, lat, lng, creado_por, ciudad, visible) values
    ('${P_FORO}', 'Foro', 'foro', 22.15, -100.98, '${F}', '${SLP}', true);
  insert into public.eventos (id, lugar_id, titulo, inicio, creado_por, ciudad, visible) values
    ('${E_A}', '${P_FORO}', 'Son huasteco', now() + interval '2 days', '${F}', '${SLP}', true),
    ('${E_B}', '${P_FORO}', 'Jam de jazz', now() + interval '3 days', '${F}', '${SLP}', true),
    ('${E_C}', '${P_FORO}', 'Charla', now() + interval '4 days', '${F}', '${SLP}', true),
    ('${E_D}', '${P_FORO}', 'Feria', now() + interval '5 days', '${F}', '${SLP}', true);
`);

async function como(rol, sub) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [sub ?? ""]);
  if (rol) await db.exec(`set role ${rol}`);
}
async function voy(usuario, evento) {
  await como("authenticated", usuario);
  await db.query(`insert into public.asistencias (usuario_id, evento_id, estado) values ($1, $2, 'voy')`, [usuario, evento]);
}
async function comoAdmin() {
  return como("authenticated", F);
}
async function leerCoincidencias() {
  await comoAdmin();
  const ahora = (await filas(`select public.panel_resumen() as j`))[0].j.ahora;
  const lista = await filas(`select id from public.panel_eventos(null, 'coincidencias', 30, 0)`);
  const conteos = (await filas(`select public.panel_fichas_conteos('eventos') as j`))[0].j;
  return { numero: ahora.coincidencias, lista: lista.map((r) => r.id).sort(), conteo: conteos.coincidencias };
}

// ---------- 0 eventos con coincidencias: antes de cualquier "voy" ----------
let r = await leerCoincidencias();
ok(r.numero === 0, "0 eventos: el número empieza en 0", r.numero);
ok(r.lista.length === 0, "0 eventos: la lista está vacía", r.lista);
ok(r.conteo === 0, "0 eventos: el badge coincide con el número", r.conteo);

// ---------- 1 evento con coincidencias: E_A, 2 «voy» de usuarias normales ----------
await voy(U1, E_A);
await voy(U2, E_A);
r = await leerCoincidencias();
ok(r.numero === 1, "1 evento: el número sube a 1 (Son huasteco, 2 voy)", r.numero);
ok(r.lista.length === 1 && r.lista[0] === E_A, "1 evento: la lista trae exactamente ese evento", r.lista);
ok(r.conteo === r.numero, "1 evento: número y badge coinciden", r);

// ---------- 3 eventos con coincidencias: se suman E_B y E_D, cada uno con 2 «voy» de usuarias normales ----------
await voy(U3, E_B);
await voy(U4, E_B);
await voy(U6, E_D);
await voy(U7, E_D);
r = await leerCoincidencias();
ok(r.numero === 3, "3 eventos: el número sube a 3 (Son huasteco, Jam de jazz, Feria)", r.numero);
ok(r.lista.length === 3 && JSON.stringify(r.lista) === JSON.stringify([E_A, E_B, E_D].sort()), "3 eventos: la lista trae exactamente esos 3, ni uno más ni uno menos", r.lista);
ok(r.conteo === r.numero, "3 eventos: número y badge coinciden en 3", r);

// ---------- una persona que dijo «voy» y DESPUÉS asciende a admin sigue contando (rol de entonces) ----------
await comoAdmin();
const cambio = (await filas(`select public.cambiar_rol($1, 'admin') as r`, [U3]))[0];
ok(cambio.r === "ok", "se pudo ascender a U3 (que ya dijo voy en Jam de jazz) a administradora", cambio);
r = await leerCoincidencias();
ok(r.numero === 3, "tras ascender a U3: el número sigue en 3, no baja (rol de entonces, no el de hoy)", r.numero);
ok(r.lista.includes(E_B), "tras ascender a U3: Jam de jazz sigue en la lista", r.lista);
ok(r.conteo === r.numero, "tras ascender a U3: número y badge siguen coincidiendo", r);

// ---------- un «voy» de quien YA era administrador cuando lo dijo no cuenta ----------
// E_C: el fundador (admin de origen, admin desde siempre) dice «voy», y U5 (normal) también. Solo U5 cuenta: 1, no 2.
await voy(F, E_C);
await voy(U5, E_C);
r = await leerCoincidencias();
ok(r.numero === 3, "el voy del fundador (ya admin cuando lo dijo) no suma: la Charla no es coincidencia, el número sigue en 3", r.numero);
ok(!r.lista.includes(E_C), "la Charla (1 voy real + 1 de un admin de origen) no aparece en la lista", r.lista);
ok(r.conteo === r.numero, "número y badge siguen coincidiendo tras el voy del fundador", r);

// ---------- un usuario normal no puede llamar a las funciones del panel ----------
await como("authenticated", U9); // U9: cuenta normal, nunca administradora
const listaNormal = await filas(`select id from public.panel_eventos(null, 'coincidencias', 30, 0)`);
ok(listaNormal.length === 0, "un usuario normal no ve ninguna fila de panel_eventos (es_admin() lo filtra por dentro)", listaNormal);
const conteosNormal = (await filas(`select public.panel_fichas_conteos('eventos') as j`))[0].j;
ok(conteosNormal === null, "un usuario normal recibe null de panel_fichas_conteos (es_admin() lo bloquea)", conteosNormal);
const resumenNormal = await falla(`select public.panel_resumen()`);
ok(resumenNormal !== null && /admin/i.test(resumenNormal), "un usuario normal no puede llamar a panel_resumen (excepción 'solo la administración')", resumenNormal);

await como("anon", null);
const anonEventos = await falla(`select public.panel_eventos(null, 'coincidencias', 30, 0)`);
ok(anonEventos !== null && /permission denied/i.test(anonEventos), "anon (sin sesión) no ejecuta panel_eventos: permission denied", anonEventos);
const anonConteos = await falla(`select public.panel_fichas_conteos('eventos')`);
ok(anonConteos !== null && /permission denied/i.test(anonConteos), "anon (sin sesión) no ejecuta panel_fichas_conteos: permission denied", anonConteos);

console.log(`${fallos === 0 ? "✓" : "✗"} ${pasan} comprobaciones en verde${fallos ? `, ${fallos} en rojo` : ""}`);
process.exit(fallos === 0 ? 0 : 1);
