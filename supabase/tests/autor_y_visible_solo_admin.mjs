// Banco de pruebas de la migración 20260917120000_autor_y_visible_solo_admin.sql, sin red ni producción.
// Con las migraciones de antes reproduce el fallo: el autor le pasa su ficha a otra cuenta; una cuenta ligada se pone de
// autora y la borra, y con el lugar se va el evento que publicó otra persona; el autor y la cuenta ligada vuelven a mostrar
// lo que ocultó la administración. Después aplica la migración y las que sigan, y comprueba que el autor y la cuenta ligada
// siguen editando, que el autor y lo visible solo los cambia la administración ("Pasarle la ficha" sigue igual), que nadie
// más se hace autor para borrar, que quien publicó sigue borrando y que al borrar una cuenta sus fichas quedan sin autor.
//
// PGlite no es dependencia del repo: se instala aparte, una vez, fuera del proyecto.
//   npm install --prefix /tmp/pglite @electric-sql/pglite@0.5.8
//   PGLITE=/tmp/pglite node supabase/tests/autor_y_visible_solo_admin.mjs
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

const MIGRACION = "20260917120000_autor_y_visible_solo_admin.sql";
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
// Una escritura que debe devolver filas: si la base la rechaza, devuelve el mensaje y el banco sigue.
async function devuelve(sql, params) {
  try {
    return { filas: await filas(sql, params) };
  } catch (e) {
    return { filas: [], error: e.message };
  }
}
// Como la app: supabase.from(tabla).update(...).eq("id", id).select("id"), que en la base es UPDATE … RETURNING.
async function cambia(tabla, set, id, ...valores) {
  return devuelve(`update public.${tabla} set ${set} where id = $1 returning id`, [id, ...valores]);
}
async function aplicar(archivos) {
  for (const f of archivos) {
    try {
      await db.exec(readFileSync(join(dir, f), "utf8"));
    } catch (e) {
      console.log(`✗ migración ${f}: ${e.message}`);
      process.exit(1);
    }
  }
}
// El fallo borra fichas: cada escena de "antes" corre en una transacción que se deshace, y lo de después parte de lo sembrado.
async function yDeshacer(escena) {
  await como(null, null);
  await db.exec("begin");
  try {
    await escena();
  } finally {
    await db.exec("rollback");
    await como(null, null);
  }
}

// ---------- Supabase mínimo ----------
// service_role salta las políticas por fila, como en Supabase.
await db.exec(`
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

// ---------- las migraciones de antes ----------
const archivos = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const corte = archivos.indexOf(MIGRACION);
if (corte < 0) {
  console.log(`✗ no está la migración ${MIGRACION}`);
  process.exit(1);
}
await aplicar(archivos.slice(0, corte));
console.log(`✓ ${corte} migraciones de antes aplicadas (la última: ${archivos[corte - 1]})`);

// ---------- datos ----------
const F = "00000000-0000-4000-8000-0000000000f1"; // fundador, administrador
const L = "00000000-0000-4000-8000-0000000000a1"; // Luis, autor de un lugar, un artista y un evento
const C = "00000000-0000-4000-8000-0000000000a2"; // Carla, cuenta ligada al lugar y al artista de Luis; no es autora
const J = "00000000-0000-4000-8000-0000000000a3"; // Jorge, publica un evento en el lugar de Luis, con el artista de Luis
const A = "00000000-0000-4000-8000-0000000000a4"; // Ana, sin relación con nada; pide llevar dos fichas del catálogo
const B = "00000000-0000-4000-8000-0000000000a5"; // Beto, autor de un lugar, un artista y un evento; borra su cuenta
const P_LUIS = "00000000-0000-4000-8000-000000000101";
const P_CATALOGO = "00000000-0000-4000-8000-000000000102";
const P_BETO = "00000000-0000-4000-8000-000000000103";
const E_LUIS = "00000000-0000-4000-8000-000000000201";
const E_JORGE = "00000000-0000-4000-8000-000000000202";
const E_BETO = "00000000-0000-4000-8000-000000000203";
const AR_LUIS = "00000000-0000-4000-8000-000000000301";
const AR_CATALOGO = "00000000-0000-4000-8000-000000000302";
const AR_BETO = "00000000-0000-4000-8000-000000000303";
await db.exec(`
  insert into public.admin_correos (correo) values ('fundador@ejemplo.org');
  insert into auth.users (id, email) values ('${F}', 'fundador@ejemplo.org'), ('${L}', 'luis@ejemplo.org'), ('${C}', 'carla@ejemplo.org'),
    ('${J}', 'jorge@ejemplo.org'), ('${A}', 'ana@ejemplo.org'), ('${B}', 'beto@ejemplo.org');
  insert into public.lugares (id, nombre, tipo, lat, lng, creado_por, origen) values
    ('${P_LUIS}', 'Foro de Luis', 'foro', 22.15, -100.98, '${L}', null),
    ('${P_CATALOGO}', 'Casa del Catálogo', 'casa_de_cultura', 22.17, -100.96, null, 'capo'),
    ('${P_BETO}', 'Taller de Beto', 'otro', 22.19, -100.94, '${B}', null);
  insert into public.lugares_cuentas (lugar_id, perfil_id) values ('${P_LUIS}', '${C}');
  insert into public.artistas (id, nombre, creado_por, origen) values
    ('${AR_LUIS}', 'Trío de Luis', '${L}', null),
    ('${AR_CATALOGO}', 'Colectivo del Catálogo', null, 'capo'),
    ('${AR_BETO}', 'Dúo de Beto', '${B}', null);
  insert into public.artistas_cuentas (artista_id, perfil_id) values ('${AR_LUIS}', '${C}');
  insert into public.eventos (id, lugar_id, titulo, inicio, creado_por) values
    ('${E_LUIS}', '${P_LUIS}', 'Ensayo de Luis', now() + interval '1 day', '${L}'),
    ('${E_JORGE}', '${P_LUIS}', 'Jam de Jorge', now() + interval '2 days', '${J}'),
    ('${E_BETO}', '${P_BETO}', 'Posada de Beto', now() + interval '3 days', '${B}');
  insert into public.eventos_artistas (evento_id, artista_id) values ('${E_JORGE}', '${AR_LUIS}');
  insert into public.reportes (tipo, objeto_id, motivo, creado_por) values
    ('artista', '${AR_CATALOGO}', 'es_mio', '${A}'), ('lugar', '${P_CATALOGO}', 'es_mio', '${A}');
`);
console.log("✓ datos sembrados");

const AUTOR = "solo la administración cambia el autor";
const OCULTAR = "solo la administración oculta o vuelve a mostrar";
const borra = (tabla, id) => devuelve(`delete from public.${tabla} where id = $1 returning id`, [id]);

// ---------- antes: el fallo ----------
await yDeshacer(async () => {
  await como("authenticated", L);
  ok((await cambia("lugares", "creado_por = $2", P_LUIS, A)).filas.length === 1, "antes: Luis le pasa su lugar a Ana (el fallo)");
  ok((await cambia("artistas", "creado_por = null", AR_LUIS)).filas.length === 1, "antes: y deja su artista sin autor");
});
await yDeshacer(async () => {
  await como("authenticated", C);
  ok((await borra("lugares", P_LUIS)).filas.length === 0, "antes: Carla, ligada al lugar de Luis, no lo borra de entrada");
  ok((await cambia("lugares", "creado_por = auth.uid()", P_LUIS)).filas.length === 1, "antes: pero se pone de autora (el fallo)");
  ok((await borra("lugares", P_LUIS)).filas.length === 1, "antes: y lo borra");
  ok((await cambia("artistas", "creado_por = auth.uid()", AR_LUIS)).filas.length === 1, "antes: lo mismo con el artista que lleva");
  ok((await borra("artistas", AR_LUIS)).filas.length === 1, "antes: también lo borra");
  await como(null, null);
  ok((await filas(`select id from public.eventos where id = $1`, [E_JORGE])).length === 0, "antes: con el lugar se fue el evento que publicó Jorge");
});
await yDeshacer(async () => {
  await como("authenticated", F);
  await db.query(`update public.lugares set visible = false where id = $1`, [P_LUIS]);
  await db.query(`update public.eventos set visible = false where id = $1`, [E_LUIS]);
  await como("authenticated", L);
  ok((await cambia("eventos", "visible = true", E_LUIS)).filas.length === 1, "antes: Luis vuelve a mostrar el evento que ocultó la administración (el fallo)");
  await como("authenticated", C);
  ok((await cambia("lugares", "visible = true", P_LUIS)).filas.length === 1, "antes: Carla vuelve a mostrar el lugar que ocultó la administración");
  ok((await cambia("artistas", "visible = false", AR_LUIS)).filas.length === 1, "antes: y oculta el artista que lleva");
});
ok((await filas(`select id from public.lugares where id = $1 and visible and creado_por = $2`, [P_LUIS, L])).length === 1, "antes: al deshacer, todo queda como se sembró");

// ---------- la migración y las que sigan ----------
await aplicar(archivos.slice(corte));
console.log(`✓ ${MIGRACION} y ${archivos.length - corte - 1} posteriores aplicadas`);

// ---------- el autor y la cuenta ligada siguen editando ----------
await como("authenticated", L);
ok((await cambia("lugares", "descripcion = 'Foro de barrio'", P_LUIS)).filas.length === 1, "Luis edita su lugar");
ok((await cambia("artistas", "detalle = 'son huasteco'", AR_LUIS)).filas.length === 1, "Luis edita su artista");
ok((await cambia("eventos", "titulo = 'Ensayo abierto'", E_LUIS)).filas.length === 1, "Luis edita su evento");
const comoApi = await devuelve(`with pgrst_source as (update public.lugares set descripcion = 'Foro de barrio, abierto' where id = $1 returning "public"."lugares"."id") select id from pgrst_source`, [P_LUIS]);
ok(comoApi.filas.length === 1, "también con la forma de consulta de la API", comoApi.error);
const mismos = await cambia("lugares", "descripcion = 'Foro de barrio', creado_por = $2, visible = true", P_LUIS, L);
ok(mismos.filas.length === 1, "mandar el autor y lo visible sin cambiarlos no estorba", mismos.error);
await como("authenticated", C);
ok((await cambia("lugares", "descripcion = 'Abre los sábados'", P_LUIS)).filas.length === 1, "Carla, ligada, edita el lugar");
ok((await cambia("artistas", "detalle = 'jarana'", AR_LUIS)).filas.length === 1, "Carla edita el artista");

// ---------- el autor solo lo cambia la administración ----------
await como("authenticated", L);
ok((await cambia("lugares", "creado_por = $2", P_LUIS, A)).error?.includes(AUTOR), "Luis ya no le pasa su lugar a Ana");
ok((await cambia("artistas", "creado_por = null", AR_LUIS)).error?.includes(AUTOR), "ni deja su artista sin autor");
ok((await cambia("eventos", "creado_por = $2", E_LUIS, A)).error?.includes(AUTOR), "ni le pasa su evento a Ana");
await como("authenticated", C);
ok((await cambia("lugares", "creado_por = auth.uid()", P_LUIS)).error?.includes(AUTOR), "Carla ya no se pone de autora del lugar");
ok((await cambia("artistas", "creado_por = auth.uid()", AR_LUIS)).error?.includes(AUTOR), "ni del artista");
const upsert = await devuelve(
  `insert into public.lugares (id, nombre, tipo, lat, lng, creado_por) values ($1, 'Foro de Luis', 'foro', 22.15, -100.98, auth.uid())
   on conflict (id) do update set creado_por = excluded.creado_por returning id`,
  [P_LUIS],
);
ok(upsert.error?.includes(AUTOR), "ni por upsert (lo que manda la API con resolution=merge-duplicates)", upsert);
ok((await borra("lugares", P_LUIS)).filas.length === 0, "así que no borra el lugar");
ok((await borra("artistas", AR_LUIS)).filas.length === 0, "ni el artista");
await como("authenticated", A);
ok((await cambia("lugares", "creado_por = auth.uid()", P_LUIS)).filas.length === 0, "Ana, sin relación, tampoco: la política ni le deja tocar la ficha");
await como(null, null);
const autores = (await filas(`select (select creado_por from public.lugares where id = $1) l, (select creado_por from public.artistas where id = $2) a, (select creado_por from public.eventos where id = $3) e`, [P_LUIS, AR_LUIS, E_LUIS]))[0];
ok(autores.l === L && autores.a === L && autores.e === L, "Luis sigue siendo el autor de su lugar, su artista y su evento", autores);
ok((await filas(`select 1 from public.eventos e join public.eventos_artistas ea on ea.evento_id = e.id where e.id = $1 and ea.artista_id = $2`, [E_JORGE, AR_LUIS])).length === 1, "el evento de Jorge sigue en el lugar de Luis, con su artista");

// ---------- "Pasarle la ficha" (decidirPendiente en src/app/admin/acciones.ts) sigue igual ----------
await como("authenticated", F);
const ligaArtista = await devuelve(`insert into public.artistas_cuentas (artista_id, perfil_id) values ($1, $2) on conflict (artista_id, perfil_id) do nothing returning artista_id`, [AR_CATALOGO, A]);
ok(ligaArtista.filas.length === 1, "el administrador liga a Ana con el artista del catálogo que pidió", ligaArtista.error);
const pasaArtista = await cambia("artistas", "creado_por = $2", AR_CATALOGO, A);
ok(pasaArtista.filas.length === 1, "y se lo pasa: Ana queda de autora", pasaArtista.error);
const ligaLugar = await devuelve(`insert into public.lugares_cuentas (lugar_id, perfil_id) values ($1, $2) on conflict (lugar_id, perfil_id) do nothing returning lugar_id`, [P_CATALOGO, A]);
ok(ligaLugar.filas.length === 1, "lo mismo con el lugar del catálogo: la liga", ligaLugar.error);
const pasaLugar = await cambia("lugares", "creado_por = $2", P_CATALOGO, A);
ok(pasaLugar.filas.length === 1, "y se lo pasa", pasaLugar.error);
ok((await devuelve(`update public.reportes set atendido = true where objeto_id in ($1, $2) returning id`, [AR_CATALOGO, P_CATALOGO])).filas.length === 2, "y cierra los dos pendientes");
await como("authenticated", A);
ok((await cambia("artistas", "detalle = 'cumbia'", AR_CATALOGO)).filas.length === 1, "Ana edita el artista que le pasaron");
ok((await cambia("lugares", "descripcion = 'Talleres los martes'", P_CATALOGO)).filas.length === 1, "y el lugar");
await como("authenticated", F);
ok((await cambia("lugares", "creado_por = null", P_CATALOGO)).filas.length === 1, "el administrador también deja una ficha sin autor");

// ---------- ocultar y volver a mostrar: solo la administración (decisión del founder, 2026-09-16) ----------
await como("authenticated", C);
ok((await cambia("lugares", "visible = false", P_LUIS)).error?.includes(OCULTAR), "Carla ya no oculta el lugar que lleva");
ok((await cambia("artistas", "visible = false", AR_LUIS)).error?.includes(OCULTAR), "ni el artista");
await como("authenticated", L);
ok((await cambia("lugares", "visible = false", P_LUIS)).error?.includes(OCULTAR), "Luis tampoco oculta su lugar");
ok((await cambia("artistas", "visible = false", AR_LUIS)).error?.includes(OCULTAR), "ni su artista");
ok((await cambia("eventos", "visible = false", E_LUIS)).error?.includes(OCULTAR), "ni su evento");
await como("authenticated", F);
const ocultos = [await cambia("lugares", "visible = false", P_LUIS), await cambia("artistas", "visible = false", AR_LUIS), await cambia("eventos", "visible = false", E_LUIS)];
ok(ocultos.every((r) => r.filas.length === 1), "el administrador oculta el lugar, el artista y el evento de Luis", ocultos);
await como("authenticated", L);
ok((await cambia("eventos", "visible = true", E_LUIS)).error?.includes(OCULTAR), "Luis ya no vuelve a mostrar lo que ocultó la administración: ni el evento");
ok((await cambia("lugares", "visible = true", P_LUIS)).error?.includes(OCULTAR), "ni el lugar");
ok((await cambia("artistas", "visible = true", AR_LUIS)).error?.includes(OCULTAR), "ni el artista");
ok((await cambia("lugares", "descripcion = 'Cerrado por obra'", P_LUIS)).filas.length === 1, "pero sigue editando su lugar oculto");
await como("authenticated", C);
ok((await cambia("lugares", "visible = true", P_LUIS)).error?.includes(OCULTAR), "Carla tampoco lo vuelve a mostrar");
await como("authenticated", F);
const mostrados = [await cambia("lugares", "visible = true", P_LUIS), await cambia("artistas", "visible = true", AR_LUIS), await cambia("eventos", "visible = true", E_LUIS)];
ok(mostrados.every((r) => r.filas.length === 1), "el administrador los vuelve a mostrar", mostrados);

// ---------- quien publicó lo sigue borrando ----------
await como("authenticated", L);
ok((await borra("eventos", E_LUIS)).filas.length === 1, "Luis borra su evento");

// ---------- borrar una cuenta: sus fichas se quedan sin autor, como antes ----------
// La llave foránea (on delete set null) cambia creado_por con la sesión de quien se borra, que no es administradora. Si el
// trigger vigilara también eso, "Borrar mi cuenta" fallaría a quien publicó algo.
await como("authenticated", B);
const borrarCuenta = await falla(`select public.borrar_mi_cuenta()`);
ok(borrarCuenta === null, "Beto borra su cuenta", borrarCuenta);
await como(null, null);
const deBeto = await filas(
  `select creado_por, visible from public.lugares where id = $1
   union all select creado_por, visible from public.artistas where id = $2
   union all select creado_por, visible from public.eventos where id = $3`,
  [P_BETO, AR_BETO, E_BETO],
);
ok(deBeto.length === 3 && deBeto.every((x) => x.creado_por === null && x.visible === true), "su lugar, su artista y su evento se quedan, sin autor y a la vista", deBeto);

// ---------- la llave de servicio no es una cuenta: esta regla no la toca, como tampoco las políticas ----------
await como("service_role", null);
ok((await cambia("lugares", "creado_por = $2", P_BETO, J)).filas.length === 1, "el servidor con la llave de servicio cambia el autor");
ok((await cambia("eventos", "visible = false", E_BETO)).filas.length === 1, "y oculta");
await como(null, null);

if (process.env.FORZAR_FALLO) ok(false, "fallo forzado para comprobar el banco");
console.log(fallos === 0 ? `✓ ${pasan} comprobaciones en verde` : `✗ ${fallos} fallaron, ${pasan} en verde`);
process.exit(fallos === 0 ? 0 : 1);
