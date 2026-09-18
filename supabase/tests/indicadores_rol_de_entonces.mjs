// Banco de pruebas de la migración 20260917170000 (rol_en, OL-070, bitácora 101), sin red ni producción. Mismo
// patrón que supabase/tests/panel_como_va.mjs: PGlite aplica TODAS las migraciones del repo en orden.
//
// El caso real: el founder ascendió a una cuenta que ya había publicado y dicho «voy», y esa actividad desapareció
// de "Coincidencias", "Publica la comunidad" y del embudo. Aquí una cuenta (ASCENDIDA) publica un evento y dice
// «voy» ANTES de ser administradora, es ascendida, y publica otro evento y dice «voy» en otro DESPUÉS: lo de antes
// debe seguir contando; lo de después, no — el control negativo de cada caso. ADMIN_ORIGEN (de origen, sin fila en
// cambios_de_rol) nunca cuenta, pase lo que pase. COMPLETA es «el caso del founder entero» que pidió gestión de
// cambios tras revisar la pieza: se registra, publica lugar, artista y evento, y dice «voy», todo antes de ser
// ascendida; después de serlo, sigue un lugar — eso no debe contar. Prueba también que «Personas activas» y
// «Cómo va la comunidad» no se contradicen entre sí para la misma cuenta.
//
//   npm install --prefix /tmp/pglite @electric-sql/pglite@0.5.8
//   PGLITE=/tmp/pglite node supabase/tests/indicadores_rol_de_entonces.mjs
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
ok((await uno(`select count(*)::int as n from public.indicadores_diarios`)).n === 0, "sin fotos guardadas: la migración no deja ninguna fila de indicadores_diarios al aplicarse sola");

// ---------- cuentas ----------
const ADMIN_ORIGEN = "00000000-0000-4000-9000-000000000001"; // de origen: sin fila en cambios_de_rol, admin siempre
const ASCENDIDA = "00000000-0000-4000-9000-000000000002"; // usuaria, publica y dice voy, la ascienden, publica y dice voy otra vez
const OTRO_NO_ADMIN = "00000000-0000-4000-9000-000000000003"; // nunca cambia de rol, pareja de las coincidencias
const LUGAR = "00000000-0000-4000-9000-000000000101";
const EVENTO_ANTES = "00000000-0000-4000-9000-000000000201"; // publicado por Ascendida antes de serlo: cuenta
const EVENTO_DESPUES = "00000000-0000-4000-9000-000000000202"; // publicado por Ascendida después: no cuenta
const EVENTO_COINCIDE = "00000000-0000-4000-9000-000000000203"; // voy de Ascendida (antes) + Otro: coincidencia
const EVENTO_DESPUES_VOY = "00000000-0000-4000-9000-000000000204"; // voy de Ascendida (después) + Otro: no coincidencia
const EVENTO_ORIGEN = "00000000-0000-4000-9000-000000000205"; // publicado por el admin de origen: nunca cuenta
const COMPLETA = "00000000-0000-4000-9000-000000000004"; // el caso entero: registro, lugar, artista, evento y voy antes; sigue un lugar después
const LUGAR_COMPLETA = "00000000-0000-4000-9000-000000000102";
const ARTISTA_COMPLETA = "00000000-0000-4000-9000-000000000301";
const EVENTO_COMPLETA = "00000000-0000-4000-9000-000000000206"; // publicado por Completa antes de ascender: cuenta
const EVENTO_VOY_COMPLETA = "00000000-0000-4000-9000-000000000207"; // voy de Completa antes de ascender: cuenta

await db.exec(`insert into public.admin_correos (correo) values ('origen@ejemplo.org');`);
await db.exec(`
  insert into auth.users (id, email, email_confirmed_at, last_sign_in_at) values
    ('${ADMIN_ORIGEN}', 'origen@ejemplo.org', now(), now() - interval '1 day'),
    ('${ASCENDIDA}', 'ascendida@ejemplo.org', now(), now() - interval '1 day'),
    ('${OTRO_NO_ADMIN}', 'otro@ejemplo.org', now(), now() - interval '1 day'),
    ('${COMPLETA}', 'completa@ejemplo.org', now(), null);
  update public.perfiles set creado_en = now() - interval '5 days' where id = '${ADMIN_ORIGEN}';
  update public.perfiles set creado_en = now() - interval '20 days' where id = '${ASCENDIDA}';
  update public.perfiles set creado_en = now() - interval '40 days' where id = '${OTRO_NO_ADMIN}';
  update public.perfiles set creado_en = now() - interval '6 days' where id = '${COMPLETA}';
`);
ok((await uno(`select rol from public.perfiles where id = $1`, [ADMIN_ORIGEN])).rol === "admin", "el correo en admin_correos nace administrador, de origen");
ok((await uno(`select rol from public.perfiles where id = $1`, [ASCENDIDA])).rol === "usuario", "Ascendida nace usuaria");

// ---------- lo que pasa ANTES de ascender a Ascendida (hace 17-18 días) ----------
await db.exec(`
  insert into public.lugares (id, nombre, tipo, lat, lng, creado_por, visible, creado_en) values
    ('${LUGAR}', 'Casa de prueba', 'casa_de_cultura', 22.15, -100.98, '${ADMIN_ORIGEN}', true, now() - interval '60 days');
  insert into public.eventos (id, lugar_id, titulo, inicio, creado_por, visible, creado_en) values
    ('${EVENTO_ANTES}', '${LUGAR}', 'Publicado antes', now() + interval '6 days', '${ASCENDIDA}', true, now() - interval '18 days'),
    ('${EVENTO_COINCIDE}', '${LUGAR}', 'Coincide', now() + interval '1 day', '${ADMIN_ORIGEN}', true, now() - interval '4 days'),
    ('${EVENTO_DESPUES_VOY}', '${LUGAR}', 'Voy después', now() + interval '2 days', '${ADMIN_ORIGEN}', true, now() - interval '4 days'),
    ('${EVENTO_ORIGEN}', '${LUGAR}', 'Publicado por origen', now() + interval '5 days', '${ADMIN_ORIGEN}', true, now() - interval '4 days'),
    ('${EVENTO_VOY_COMPLETA}', '${LUGAR}', 'Para el voy de Completa', now() + interval '3 days', '${ADMIN_ORIGEN}', true, now() - interval '4 days');
  insert into public.asistencias (usuario_id, evento_id, estado, creado_en) values
    ('${ASCENDIDA}', '${EVENTO_COINCIDE}', 'voy', now() - interval '17 days'),
    ('${OTRO_NO_ADMIN}', '${EVENTO_COINCIDE}', 'voy', now() - interval '16 days'),
    ('${ADMIN_ORIGEN}', '${EVENTO_COINCIDE}', 'voy', now() - interval '2 days');

  -- Completa: se registró hace 6 días; publica lugar, artista y evento, y dice voy, todo antes de ascender (hace 2).
  insert into public.lugares (id, nombre, tipo, lat, lng, creado_por, visible, creado_en) values
    ('${LUGAR_COMPLETA}', 'Lugar de Completa', 'foro', 22.14, -100.97, '${COMPLETA}', true, now() - interval '5 days');
  insert into public.artistas (id, nombre, origen, foto, visible, creado_por, creado_en) values
    ('${ARTISTA_COMPLETA}', 'Artista de Completa', null, null, true, '${COMPLETA}', now() - interval '5 days');
  insert into public.eventos (id, lugar_id, titulo, inicio, creado_por, visible, creado_en) values
    ('${EVENTO_COMPLETA}', '${LUGAR}', 'Publicado por Completa', now() + interval '9 days', '${COMPLETA}', true, now() - interval '5 days');
  insert into public.asistencias (usuario_id, evento_id, estado, creado_en) values
    ('${COMPLETA}', '${EVENTO_VOY_COMPLETA}', 'voy', now() - interval '4 days');
`);

// ---------- ascienden a Ascendida (el founder, en el chat) — se fija el momento a mano, como perfiles.creado_en ----------
await como("authenticated", ADMIN_ORIGEN);
ok((await uno(`select public.cambiar_rol($1, 'admin') as r`, [ASCENDIDA])).r === "ok", "el founder asciende a Ascendida");
await como(null, null);
await db.exec(`update public.cambios_de_rol set creado_en = now() - interval '10 days' where perfil_id = '${ASCENDIDA}'`);
const cambio = await uno(`select rol, creado_en from public.cambios_de_rol where perfil_id = $1`, [ASCENDIDA]);
ok(cambio.rol === "admin", "el ascenso queda registrado", cambio);

// Completa, ascendida hace 2 días — después de publicar lugar, artista y evento, y de decir voy, todos hace 4-5.
await como("authenticated", ADMIN_ORIGEN);
ok((await uno(`select public.cambiar_rol($1, 'admin') as r`, [COMPLETA])).r === "ok", "el founder asciende a Completa");
await como(null, null);
await db.exec(`update public.cambios_de_rol set creado_en = now() - interval '2 days' where perfil_id = '${COMPLETA}'`);

// ---------- lo que pasa DESPUÉS de ascenderlas ----------
await db.exec(`
  insert into public.eventos (id, lugar_id, titulo, inicio, creado_por, visible, creado_en) values
    ('${EVENTO_DESPUES}', '${LUGAR}', 'Publicado después', now() + interval '7 days', '${ASCENDIDA}', true, now() - interval '5 days');
  insert into public.asistencias (usuario_id, evento_id, estado, creado_en) values
    ('${ASCENDIDA}', '${EVENTO_DESPUES_VOY}', 'voy', now() - interval '3 days'),
    ('${OTRO_NO_ADMIN}', '${EVENTO_DESPUES_VOY}', 'voy', now() - interval '3 days');
  -- Completa sigue un lugar el día de ayer, ya ascendida: no debe contar como señal de "siguio".
  insert into public.seguimientos (usuario_id, lugar_id, creado_en) values ('${COMPLETA}', '${LUGAR_COMPLETA}', now() - interval '1 day');
`);
console.log("✓ datos sembrados");

// ---------- rol_en, directo ----------
await como("service_role", null);
ok((await uno(`select public.rol_en($1, now() - interval '18 days') as r`, [ASCENDIDA])).r === "usuario", "rol_en: Ascendida era usuaria hace 18 días");
ok((await uno(`select public.rol_en($1, now() - interval '5 days') as r`, [ASCENDIDA])).r === "admin", "rol_en: Ascendida ya era administradora hace 5 días");
ok((await uno(`select public.rol_en($1, now() - interval '100 days') as r`, [ADMIN_ORIGEN])).r === "admin", "rol_en: el de origen siempre fue administrador, sin fila en cambios_de_rol");
ok((await uno(`select public.rol_en($1, now() - interval '100 days') as r`, [OTRO_NO_ADMIN])).r === "usuario", "rol_en: quien nunca cambió, siempre usuario");
ok((await uno(`select public.rol_en($1, now() - interval '5 days') as r`, [COMPLETA])).r === "usuario", "rol_en: Completa era usuaria hace 5 días, antes de su ascenso de hace 2");
ok((await uno(`select public.rol_en($1, now() - interval '1 days') as r`, [COMPLETA])).r === "admin", "rol_en: Completa ya era administradora ayer");
await como(null, null);

// ---------- indicadores_ahora(), visto por la administración ----------
await como("authenticated", ADMIN_ORIGEN);
const r = (await uno(`select public.panel_resumen() as r`)).r;
const a = r.ahora;
const g = r.gestionar;
ok(a.comunidad === 2, "comunidad: 'Publicado antes' y 'Publicado por Completa' (lo de después de ascender, de ninguna de las dos, cuenta)", a);
ok(a.coincidencias === 1, "coincidencias: solo 'Coincide' (voy de Ascendida de antes + Otro; el de origen no cuenta)", a);
ok(a.desglose.con_2 === 1 && a.desglose.mayor?.titulo === "Coincide" && a.desglose.mayor?.n === 2, "desglose: 'Coincide' con 2, sin contar al de origen", a.desglose);
ok(a.desglose.personas_que_publican === 2, "Ascendida y Completa cuentan como quien publica (antes de ascender, cada una)", a.desglose);

// Personas activas (ampliación pedida por gestión de cambios: N2 nombra los tres indicadores, no dos)
ok(a.cuentas === 3, "cuentas: Ascendida, Otro y Completa eran usuarias al registrarse (el de origen nunca cuenta)", a.cuentas);
ok(a.activas === 2, "activas: Otro (voy de hace 3 días) y Completa (voy y publicó hace 4-5, antes de ascender); Ascendida no tiene nada suyo en los últimos 7 días", a.activas);
ok(a.desglose.nuevas === 1, "nuevas: solo Completa se registró hace 7 días o menos", a.desglose);
ok(a.desglose.publicaron === 1, "publicaron: solo Completa publicó en los últimos 7 días antes de ascender (lo de Ascendida es de hace 17-18 días, fuera de la ventana)", a.desglose);
ok(a.desglose.voy === 2, "voy: Otro y Completa, ambas antes de que la otra cuenta ascendida ya contara como admin en su propio voy", a.desglose);
ok(a.desglose.siguieron === 0, "siguieron: el único seguimiento (Completa) es de después de ascender, no cuenta", a.desglose);
ok(g.personas_nuevas === a.desglose.nuevas, "personas_nuevas (Gestionar) coincide con 'nuevas' de Personas activas: misma pantalla, ya no se contradicen", { personas_nuevas: g.personas_nuevas, nuevas: a.desglose.nuevas });

await como(null, null);

// control negativo: 'Voy después' no es coincidencia (el voy de Ascendida ya no cuenta, queda 1 solo) — rol_en
// no lo ejecuta authenticated directo (revocado a propósito), se comprueba con service_role.
await como("service_role", null);
const conVan = await db.query(
  `select count(*)::int as n from public.asistencias a where a.evento_id = $1 and a.estado = 'voy' and public.rol_en(a.usuario_id, a.creado_en) <> 'admin'`,
  [EVENTO_DESPUES_VOY]
);
ok(conVan.rows[0].n === 1, "control negativo: 'Voy después' se queda con 1 solo voy que cuenta (Otro), no llega a coincidencia", conVan.rows[0]);
await como(null, null);

// ---------- panel_comunidad(), el embudo ----------
await como("authenticated", ADMIN_ORIGEN);
const f = (await uno(`select public.panel_comunidad() as f`)).f;
ok(f.registradas === 2, "registradas: Ascendida y Completa (de origen nunca cuenta, Otro está fuera de los 30 días)", f);
ok(f.hicieron_algo === 2, "hicieron_algo: las dos publicaron en su primera semana ('Publicado antes' y 'Publicado por Completa')", f);
await como(null, null);

// Personas activas y Cómo va la comunidad no se contradicen para Completa: publicó/dijo voy antes de ascender y
// cuenta en las dos pantallas; lo de después de ascender no cuenta en ninguna.
ok(a.desglose.publicaron >= 1 && f.hicieron_algo >= 1, "Completa cuenta como activa y como 'hizo algo': las dos pantallas están de acuerdo", { publicaron: a.desglose.publicaron, hicieron_algo: f.hicieron_algo });

console.log(fallos === 0 ? `✓ ${pasan} comprobaciones en verde` : `✗ ${fallos} de ${pasan + fallos} fallaron`);
process.exit(fallos === 0 ? 0 : 1);
