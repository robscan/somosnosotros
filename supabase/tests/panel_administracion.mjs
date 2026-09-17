// Banco de pruebas de la migración del panel de administración (20260917090000), sin red ni producción.
// PGlite (Postgres en WebAssembly) imita lo mínimo de Supabase, aplica TODAS las migraciones del repo en orden, siembra
// datos y comprueba cada función, cada guarda del rol y cada permiso. Sirve también de humo para migraciones nuevas.
//
// PGlite no es dependencia del repo: se instala aparte, una vez, fuera del proyecto.
//   npm install --prefix /tmp/pglite @electric-sql/pglite@0.5.8
//   PGLITE=/tmp/pglite node supabase/tests/panel_administracion.mjs
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
async function filas(sql, params) {
  return (await db.query(sql, params)).rows;
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

// ---------- datos ----------
const F = "00000000-0000-4000-8000-0000000000f1"; // fundador, de origen
const L = "00000000-0000-4000-8000-0000000000a1"; // Luis
const A = "00000000-0000-4000-8000-0000000000a2"; // Ana
const M = "00000000-0000-4000-8000-0000000000a3"; // Marta, sin confirmar
const V = "00000000-0000-4000-8000-0000000000a4"; // Valeria
const J = "00000000-0000-4000-8000-0000000000a5"; // Jorge, publica
const O = "00000000-0000-4000-8000-0000000000f2"; // otra cuenta de origen
await db.exec(`insert into public.admin_correos (correo) values ('Fundador@Ejemplo.org'), ('otro@ejemplo.org');`);
const usuarios = [
  [F, "fundador@ejemplo.org", "now()", "now() - interval '1 hour'", "now() - interval '60 days'"],
  [L, "luis.rangel@ejemplo.org", "now()", "now() - interval '2 days'", "now() - interval '3 days'"],
  [A, "ana@ejemplo.org", "now()", "now() - interval '20 days'", "now() - interval '30 days'"],
  [M, "marta@ejemplo.org", "null", "null", "now() - interval '2 days'"],
  [V, "valeria@ejemplo.org", "now()", "now() - interval '10 days'", "now() - interval '10 days'"],
  [J, "jorge@ejemplo.org", "now()", "now() - interval '40 days'", "now() - interval '40 days'"],
  [O, "otro@ejemplo.org", "now()", "now() - interval '5 days'", "now() - interval '50 days'"],
];
for (const [id, correo, confirmado, entrada, alta] of usuarios) {
  await db.exec(`insert into auth.users (id, email, email_confirmed_at, last_sign_in_at) values ('${id}', '${correo}', ${confirmado}, ${entrada});
    update public.perfiles set creado_en = ${alta} where id = '${id}';`);
}
await db.exec(`update public.perfiles set avisos_correo_motivo = 'rebote' where id = '${A}';`);
ok((await uno(`select rol from public.perfiles where id = $1`, [F])).rol === "admin", "el fundador nace administrador (admin_correos, sin distinguir mayúsculas)");
ok((await uno(`select rol from public.perfiles where id = $1`, [L])).rol === "usuario", "Luis nace usuario");

await db.exec(`
  insert into public.lugares (id, nombre, tipo, lat, lng, creado_por, visible, privado, origen, portada) values
    ('00000000-0000-4000-8000-000000000101', 'Casa de Cultura Norte', 'casa_de_cultura', 22.15, -100.98, '${F}', true, false, null, 'https://x/a.jpg'),
    ('00000000-0000-4000-8000-000000000102', 'Foro Sur', 'foro', 22.17, -100.96, '${F}', true, false, null, 'https://x/b.jpg'),
    ('00000000-0000-4000-8000-000000000103', 'Galería Oculta', 'galeria', 22.19, -100.94, '${F}', false, false, null, 'https://x/c.jpg'),
    ('00000000-0000-4000-8000-000000000104', 'Mapeo Privado', 'otro', 22.21, -100.92, '${F}', true, true, null, null),
    ('00000000-0000-4000-8000-000000000105', 'Colectivo del Catálogo', 'colectivo', 22.23, -100.90, null, true, false, 'capo', null);
  insert into public.eventos (id, lugar_id, sitio_texto, titulo, inicio, fin, creado_por, visible, imagen, creado_en) values
    ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', null, 'Son huasteco', now() + interval '1 day', null, '${F}', true, null, now() - interval '20 days'),
    ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101', null, 'Jam de jazz', now() + interval '10 days', null, '${J}', true, 'https://x/e.jpg', now() - interval '2 days'),
    ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000101', null, 'Ya pasó', now() - interval '3 days', null, '${F}', true, null, now() - interval '30 days'),
    ('00000000-0000-4000-8000-000000000204', null, 'Parque', 'Oculto', now() + interval '2 days', null, '${F}', false, null, now() - interval '9 days'),
    ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000104', null, 'En lo privado', now() + interval '3 days', null, '${F}', true, null, now() - interval '9 days');
  insert into public.artistas (id, nombre, origen, foto, visible, creado_por) values
    ('00000000-0000-4000-8000-000000000301', 'Colectivo Barro', 'capo', null, true, null),
    ('00000000-0000-4000-8000-000000000302', 'Trío Norte', 'capo', null, true, null),
    ('00000000-0000-4000-8000-000000000303', 'Solista Oculta', null, 'https://x/s.jpg', false, '${F}');
  insert into public.artistas_cuentas (artista_id, perfil_id) values ('00000000-0000-4000-8000-000000000301', '${L}');
  insert into public.eventos_artistas (evento_id, artista_id) values ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000301');
  insert into public.invitaciones_enviadas (artista_id, correo) values ('00000000-0000-4000-8000-000000000301', 'a@x.org'), ('00000000-0000-4000-8000-000000000302', 'b@x.org');
  insert into public.asistencias (usuario_id, evento_id, estado, creado_en) values
    ('${F}', '00000000-0000-4000-8000-000000000201', 'voy', now() - interval '1 day'),
    ('${L}', '00000000-0000-4000-8000-000000000201', 'voy', now() - interval '1 day'),
    ('${A}', '00000000-0000-4000-8000-000000000201', 'voy', now() - interval '1 day'),
    ('${L}', '00000000-0000-4000-8000-000000000202', 'me_interesa', now() - interval '1 day');
  insert into public.seguimientos (usuario_id, lugar_id, creado_en) values ('${L}', '00000000-0000-4000-8000-000000000101', now() - interval '1 hour');
  insert into public.suscripciones_push (endpoint, usuario_id, p256dh, auth) values ('https://p/1', '${L}', 'k', 'a'), ('https://p/2', '${L}', 'k', 'a');
  insert into public.reportes (id, tipo, objeto_id, motivo, detalle, creado_por, creado_en, atendido) values
    ('00000000-0000-4000-8000-000000000401', 'lugar', '00000000-0000-4000-8000-000000000102', 'no_cultural', 'Es un bar', '${A}', now() - interval '2 days', false),
    ('00000000-0000-4000-8000-000000000402', 'artista', '00000000-0000-4000-8000-000000000302', 'es_mio', 'Soy yo', '${L}', now() - interval '5 hours', false),
    ('00000000-0000-4000-8000-000000000403', 'evento', '00000000-0000-4000-8000-000000000201', 'otro', null, '${A}', now() - interval '6 days', true),
    ('00000000-0000-4000-8000-000000000404', 'lugar', '00000000-0000-4000-8000-000000000999', 'falso', null, null, now() - interval '1 hour', false);
`);
console.log("✓ datos sembrados");

// ---------- quien no es administrador no ve ni hace nada ----------
await como("anon", null);
ok((await falla(`select public.panel_resumen()`))?.includes("permission denied"), "anon no ejecuta panel_resumen");
ok((await falla(`select public.marcar_visto()`))?.includes("permission denied"), "anon no ejecuta marcar_visto");
ok((await falla(`select public.cambiar_rol($1, 'admin')`, [L]))?.includes("permission denied"), "anon no ejecuta cambiar_rol");

await como("authenticated", L);
ok((await falla(`select public.panel_resumen()`))?.includes("solo la administración"), "un usuario no lee el resumen");
ok((await filas(`select * from public.panel_personas()`)).length === 0, "un usuario no lista personas");
ok((await filas(`select * from public.panel_pendientes()`)).length === 0, "un usuario no lee pendientes");
ok((await uno(`select public.panel_correo($1) as c`, [F])).c === null, "un usuario no lee correos");
ok((await uno(`select public.panel_persona($1) as p`, [F])).p === null, "un usuario no lee la ficha de administración");
ok((await uno(`select public.panel_fichas_conteos('lugares') as c`)).c === null, "un usuario no lee conteos de fichas");
ok((await uno(`select public.cambiar_rol($1, 'admin') as r`, [L])).r === "sin_permiso", "un usuario no se hace administrador");
ok((await falla(`select public.indicadores_ahora()`))?.includes("permission denied"), "con sesión no se ejecuta indicadores_ahora");
ok((await falla(`select public.guardar_indicadores()`))?.includes("permission denied"), "con sesión no se ejecuta guardar_indicadores");
ok((await falla(`update public.perfiles set rol = 'admin' where id = $1`, [L]))?.includes("solo quien fundó Somos Nosotros cambia el rol"), "el trigger proteger_rol sigue deteniendo el cambio directo de un usuario");
await como(null, null);
ok((await uno(`select has_column_privilege('authenticated', 'public.perfiles', 'rol', 'UPDATE') as p`)).p === true, "hallazgo P2: con el permiso de tabla, authenticated conserva UPDATE sobre rol pese al revoke de columna");

// ---------- abrió la app hoy ----------
await como("authenticated", L);
await db.query(`select public.marcar_visto()`);
await db.query(`select public.marcar_visto()`);
await como(null, null);
const visto = await filas(`select dia, (now() at time zone 'America/Mexico_City')::date as hoy from public.cuentas_vistas where perfil_id = $1`, [L]);
ok(visto.length === 1 && String(visto[0].dia) === String(visto[0].hoy), "marcar_visto guarda un solo renglón con el día de hoy en la ciudad", visto);
await como("authenticated", L);
ok((await filas(`select * from public.cuentas_vistas`)).length === 0, "un usuario no lee cuentas_vistas, ni la suya (RLS)");
await como("authenticated", F);
ok((await filas(`select * from public.cuentas_vistas`)).length === 1, "la administración sí la lee");
await como(null, null);

// ---------- resumen ----------
await como("authenticated", F);
let r = (await uno(`select public.panel_resumen() as r`)).r;
const a = r.ahora;
ok(a.cuentas === 5, "cuentas no administradoras: L, A, M, V, J", a.cuentas);
ok(a.activas === 3, "activas: Luis (entró, voy, siguió, abrió), Ana (voy), Jorge (publicó)", a);
ok(a.coincidencias === 1, "coincidencias: Son huasteco con Luis y Ana (el fundador no cuenta)", a.coincidencias);
ok(a.eventos_semana === 2, "eventos de la semana: Son huasteco y En lo privado", a.eventos_semana);
ok(a.proximos === 3 && a.comunidad === 1 && a.comunidad_nuevos === 1, "próximos 3, de la comunidad 1 (Jorge), nuevo esta semana 1", a);
ok(a.lugares === 3 && a.lugares_con_fecha === 1, "lugares visibles no privados 3, con fecha 1", a);
ok(a.desglose.con_2 === 1 && a.desglose.mayor?.titulo === "Son huasteco" && a.desglose.mayor?.n === 2, "desglose de coincidencias", a.desglose);
ok(a.desglose.publicaron === 1 && a.desglose.voy === 2 && a.desglose.siguieron === 1 && a.desglose.nuevas === 2, "desglose de activas", a.desglose);
const g = r.gestionar;
ok(g.personas === 7 && g.personas_nuevas === 2 && g.nunca_entraron === 1 && g.correo_con_problema === 1, "gestionar: personas", g);
ok(g.lugares === 3 && g.lugares_sin_fecha === 2 && g.lugares_ocultos === 1 && g.lugares_privados === 1, "gestionar: lugares", g);
ok(g.eventos === 3 && g.eventos_sin_imagen === 2, "gestionar: eventos", g);
ok(g.artistas === 2 && g.artistas_ocultos === 1 && g.artistas_llevados === 1 && g.invitaciones === 2, "gestionar: artistas", g);
ok(Array.isArray(r.historia) && r.historia.length === 0, "sin fotos anteriores, la historia viene vacía", r.historia);
await como(null, null);
ok((await filas(`select * from public.indicadores_diarios`)).length === 1, "el primer vistazo del día deja la foto de hoy");
await db.exec(`insert into public.indicadores_diarios (dia, activas, cuentas, coincidencias, eventos_semana, lugares_con_fecha, lugares, comunidad, proximos)
  values ((now() at time zone 'America/Mexico_City')::date - 7, 1, 4, 0, 1, 1, 3, 0, 2)`);
await como("service_role", null);
await db.query(`select public.guardar_indicadores()`);
await como("authenticated", F);
r = (await uno(`select public.panel_resumen() as r`)).r;
ok(r.historia.length === 1 && r.historia[0].activas === 1, "la historia trae la foto de hace 7 días y no la de hoy", r.historia);

// ---------- pendientes ----------
const p = await filas(`select * from public.panel_pendientes()`);
ok(p.length === 3, "tres pendientes (el atendido no sale)", p.length);
ok(p[0]?.motivo === "no_cultural" && p[0]?.objeto === "Foro Sur" && p[0]?.autor === "ana" && p[0]?.objeto_visible === true, "del más viejo al más nuevo, con ficha y autor", p[0]);
ok(p[1]?.motivo === "es_mio" && p[1]?.objeto === "Trío Norte", "el reclamo con el nombre del artista", p[1]);
ok(p[2]?.objeto === null && p[2]?.autor === null, "la ficha que ya no existe llega sin nombre", p[2]);

// ---------- personas ----------
const todas = await filas(`select * from public.panel_personas()`);
ok(todas.length === 7 && Number(todas[0].total) === 7, "siete personas", todas.length);
ok((await filas(`select id from public.panel_personas(null, 'sin_entrar')`)).map((x) => x.id).join() === M, "sin entrar: Marta");
ok((await filas(`select id from public.panel_personas(null, 'administracion')`)).length === 2, "administración: el fundador y la otra de origen");
ok((await filas(`select id from public.panel_personas(null, 'nuevas')`)).map((x) => x.id).sort().join() === [L, M].sort().join(), "nuevas: Luis y Marta");
ok((await filas(`select id from public.panel_personas('Rangel')`)).map((x) => x.id).join() === L, "buscar por nombre sin distinguir mayúsculas");
ok((await filas(`select id from public.panel_personas('jorge@')`)).map((x) => x.id).join() === J, "buscar por correo");
ok((await filas(`select id from public.panel_personas(null, 'todas', 2, 0)`)).length === 2, "páginas de 2");
ok((await filas(`select id from public.panel_personas('%')`)).length === 0, "PR #74: buscar % no encuentra a todos");
ok((await filas(`select id from public.panel_personas('_')`)).length === 0, "PR #74: buscar _ no encuentra a todos");
ok((await filas(`select id from public.panel_lugares('%')`)).length === 0, "PR #74: en las listas, buscar solo signos no encuentra nada");
const luis = todas.find((x) => x.id === L);
ok(luis?.correo_oculto === "lu…@ejemplo.org" && luis?.va_a === 1 && luis?.sigue === 1 && luis?.lleva === "Colectivo Barro" && luis?.lleva_n === 1 && luis?.visto !== null, "renglón de Luis", luis);
const conteos = (await uno(`select public.panel_personas_conteos() as c`)).c;
ok(conteos.todas === 7 && conteos.nuevas === 2 && conteos.sin_entrar === 1 && conteos.administracion === 2, "conteos de personas", conteos);
const ficha = (await uno(`select public.panel_persona($1) as p`, [L])).p;
ok(ficha.telefonos === 2 && ficha.va_a === 1 && ficha.le_interesa === 1 && ficha.sigue_lugares === 1 && ficha.reclamos === 1 && ficha.pendientes === 1, "ficha de Luis: actividad", ficha);
ok(ficha.lleva?.[0]?.nombre === "Colectivo Barro" && ficha.de_origen === false && ficha.es_yo === false && ficha.puedo_cambiar_rol === true && ficha.administradores === 2 && ficha.cambio_rol === null, "ficha de Luis: rol", ficha);
ok((await uno(`select public.panel_correo($1) as c`, [L])).c === "luis.rangel@ejemplo.org", "el correo completo al tocar Ver");

// ---------- hacer y quitar administradores ----------
ok((await uno(`select public.cambiar_rol($1, 'admin') as r`, [M])).r === "sin_confirmar", "no se hace administrador a quien no confirmó su correo");
ok((await uno(`select public.cambiar_rol($1, 'jefe') as r`, [V])).r === "rol_desconocido", "rol desconocido");
ok((await uno(`select public.cambiar_rol($1, 'admin') as r`, ["00000000-0000-4000-8000-000000009999"])).r === "no_existe", "cuenta que no existe");
ok((await uno(`select public.cambiar_rol($1, 'admin') as r`, [V])).r === "ok", "el fundador hace administradora a Valeria");
await como(null, null);
ok((await uno(`select rol from public.perfiles where id = $1`, [V])).rol === "admin", "Valeria quedó administradora");
const registro = await filas(`select * from public.cambios_de_rol where perfil_id = $1`, [V]);
ok(registro.length === 1 && registro[0].por === F && registro[0].rol === "admin", "queda registro de quién y cuándo", registro);
await como("authenticated", V);
ok((await uno(`select public.cambiar_rol($1, 'admin') as r`, [L])).r === "sin_permiso", "una administradora que no es de origen no hace administradores");
ok((await uno(`select public.cambiar_rol($1, 'usuario') as r`, [F])).r === "sin_permiso", "ni quita al fundador");
ok((await falla(`update public.perfiles set rol = 'admin' where id = $1`, [L]))?.includes("solo quien fundó Somos Nosotros cambia el rol"), "PR #74: un update directo de una administradora nombrada no hace administradores");
ok((await falla(`update public.perfiles set rol = 'usuario' where id = $1`, [F]))?.includes("solo quien fundó Somos Nosotros cambia el rol"), "PR #74: ni le quita el rol a una cuenta de origen");
await como(null, null);
ok((await uno(`select rol from public.perfiles where id = $1`, [F])).rol === "admin" && (await uno(`select rol from public.perfiles where id = $1`, [L])).rol === "usuario", "PR #74: los roles siguen como estaban");
await como("authenticated", F);
ok((await falla(`update public.perfiles set rol = 'usuario' where id = $1`, [O]))?.includes("a una cuenta de origen no se le quita el rol"), "PR #74: ni una cuenta de origen le baja el rol a otra por update directo");
ok((await falla(`update public.perfiles set rol = 'admin' where id = $1`, [L])) === null, "PR #74: una cuenta de origen sí cambia el rol por update directo");
await como(null, null);
const directo = await filas(`select * from public.cambios_de_rol where perfil_id = $1`, [L]);
ok(directo.length === 1 && directo[0].por === F && directo[0].rol === "admin", "PR #74: el update directo también queda registrado", directo);
await como("authenticated", F);
ok((await uno(`select public.cambiar_rol($1, 'usuario') as r`, [L])).r === "ok", "PR #74: y se deshace con cambiar_rol");
await como("authenticated", V);
ok((await uno(`select (public.panel_resumen() -> 'ahora' ->> 'cuentas')::int as n`)).n === 4, "pero sí lee el panel, y ya no cuenta como comunidad");
ok((await uno(`select public.panel_persona($1) ->> 'puedo_cambiar_rol' as p`, [L])).p === "false", "su ficha le dice que no puede cambiar roles");
await como("authenticated", F);
ok((await uno(`select public.panel_persona($1) -> 'cambio_rol' ->> 'por_nombre' as n`, [V])).n === "fundador", "la ficha dice quién la nombró");
ok((await uno(`select public.cambiar_rol($1, 'usuario') as r`, [F])).r === "a_ti_mismo", "nadie se quita a sí mismo");
ok((await uno(`select public.cambiar_rol($1, 'usuario') as r`, [O])).r === "de_origen", "a una cuenta de origen no se le quita desde la app");
ok((await uno(`select public.cambiar_rol($1, 'usuario') as r`, [V])).r === "ok", "el fundador le quita la administración a Valeria");
ok((await uno(`select public.cambiar_rol($1, 'usuario') as r`, [V])).r === "sin_cambio", "quitar dos veces no hace nada");
await como(null, null);
ok((await filas(`select * from public.cambios_de_rol where perfil_id = $1`, [V])).length === 2, "dos cambios registrados");

// ---------- listas de fichas ----------
await como("authenticated", F);
const ids = async (sql) => (await filas(sql)).map((x) => x.nombre ?? x.titulo).join(" | ");
ok((await ids(`select * from public.panel_lugares()`)) === "Casa de Cultura Norte | Colectivo del Catálogo | Foro Sur | Galería Oculta | Mapeo Privado", "lugares en orden alfabético real", await ids(`select * from public.panel_lugares()`));
ok((await ids(`select * from public.panel_lugares(null, 'sin_fecha')`)) === "Colectivo del Catálogo | Foro Sur", "lugares sin fecha próxima");
ok((await ids(`select * from public.panel_lugares(null, 'ocultos')`)) === "Galería Oculta", "lugares ocultos");
ok((await ids(`select * from public.panel_lugares(null, 'catalogo')`)) === "Colectivo del Catálogo", "lugares del catálogo");
ok((await ids(`select * from public.panel_lugares('catalogo')`)) === "Colectivo del Catálogo", "buscar sin acentos");
const norte = (await filas(`select * from public.panel_lugares('norte')`))[0];
ok(norte?.proximas === 2 && norte?.lleva === null, "próximas del lugar (sin contar lo pasado)", norte);
ok((await ids(`select * from public.panel_eventos()`)) === "Son huasteco | En lo privado | Jam de jazz", "eventos próximos por fecha");
ok((await ids(`select * from public.panel_eventos(null, 'semana')`)) === "Son huasteco | En lo privado", "eventos de la semana");
ok((await ids(`select * from public.panel_eventos(null, 'comunidad')`)) === "Jam de jazz", "eventos de la comunidad");
ok((await ids(`select * from public.panel_eventos(null, 'ocultos')`)) === "Oculto", "eventos ocultos");
ok((await ids(`select * from public.panel_eventos(null, 'sin_imagen')`)) === "Son huasteco | En lo privado", "eventos sin imagen");
const son = (await filas(`select * from public.panel_eventos('huasteco')`))[0];
ok(son?.van === 3 && son?.sitio === "Casa de Cultura Norte" && son?.autor_admin === true, "renglón de evento", son);
ok((await ids(`select * from public.panel_artistas(null, 'por_reclamar')`)) === "Trío Norte", "artistas por reclamar");
ok((await ids(`select * from public.panel_artistas(null, 'llevados')`)) === "Colectivo Barro", "artistas llevados por su gente");
ok((await ids(`select * from public.panel_artistas(null, 'ocultos')`)) === "Solista Oculta", "artistas ocultos");
const barro = (await filas(`select * from public.panel_artistas('barro')`))[0];
ok(barro?.proximas === 1 && barro?.lleva === "luis.rangel", "renglón de artista", barro);
const cl = (await uno(`select public.panel_fichas_conteos('lugares') as c`)).c;
ok(JSON.stringify(cl) === JSON.stringify({ todos: 5, ocultos: 1, sin_fecha: 2, sin_foto: 2, catalogo: 1 }), "conteos de lugares", cl);
const ce = (await uno(`select public.panel_fichas_conteos('eventos') as c`)).c;
ok(JSON.stringify(ce) === JSON.stringify({ proximos: 3, semana: 2, sin_imagen: 2, comunidad: 1, ocultos: 1 }), "conteos de eventos", ce);
const ca = (await uno(`select public.panel_fichas_conteos('artistas') as c`)).c;
ok(JSON.stringify(ca) === JSON.stringify({ todos: 3, por_reclamar: 1, llevados: 1, sin_foto: 2, ocultos: 1 }), "conteos de artistas", ca);

if (process.env.FORZAR_FALLO) ok(false, "fallo forzado para comprobar el banco");
console.log(fallos === 0 ? `✓ ${pasan} comprobaciones en verde` : `✗ ${fallos} fallaron, ${pasan} en verde`);
process.exit(fallos === 0 ? 0 : 1);
