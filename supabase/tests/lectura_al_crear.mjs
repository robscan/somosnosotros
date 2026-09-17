// Banco de pruebas de la migración 20260917093000_lectura_al_crear.sql, sin red ni producción.
// Con las migraciones de antes reproduce el fallo (un administrador no crea un lugar privado con INSERT … RETURNING, que
// es lo que manda supabase-js con .insert().select()); después aplica la migración y las que sigan, y comprueba que lo
// privado u oculto se crea y se devuelve, que nadie más lo ve, que las cuentas ligadas siguen leyendo y editando, y que
// de lo ya guardado cada quien ve exactamente las mismas filas que antes. Lo guardado incluye lugares privados que no son
// del administrador (de una autora que dejó de administrar, y uno ligado a otra cuenta): sin ellos, una regla que les
// quitara lo privado a esas cuentas pasaba el banco (bitácora 084).
//
// PGlite no es dependencia del repo: se instala aparte, una vez, fuera del proyecto.
//   npm install --prefix /tmp/pglite @electric-sql/pglite@0.5.8
//   PGLITE=/tmp/pglite node supabase/tests/lectura_al_crear.mjs
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

const MIGRACION = "20260917093000_lectura_al_crear.sql";
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
// Una escritura que debe devolver filas: si la base la rechaza, cuenta como fallo con su mensaje y el banco sigue.
async function devuelve(sql, params) {
  try {
    return { filas: await filas(sql, params) };
  } catch (e) {
    return { filas: [], error: e.message };
  }
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
const L = "00000000-0000-4000-8000-0000000000a1"; // Luis, publica
const A = "00000000-0000-4000-8000-0000000000a2"; // Ana, sin relación con nada
const C = "00000000-0000-4000-8000-0000000000a3"; // Carla, cuenta ligada a fichas del catálogo y a un lugar privado
const O = "00000000-0000-4000-8000-0000000000a4"; // Olga, ya no administra (se le quitó el rol): sus mapeos privados siguen siendo suyos
const P_CATALOGO = "00000000-0000-4000-8000-000000000102";
const P_OCULTO_LIGADO = "00000000-0000-4000-8000-000000000103";
const P_PRIVADO = "00000000-0000-4000-8000-000000000104";
const P_OCULTO_LUIS = "00000000-0000-4000-8000-000000000105";
const P_PRIVADO_OLGA = "00000000-0000-4000-8000-000000000106";
const P_OCULTO_PRIVADO_OLGA = "00000000-0000-4000-8000-000000000107";
const P_PRIVADO_LIGADO = "00000000-0000-4000-8000-000000000108";
const AR_OCULTO_LIGADO = "00000000-0000-4000-8000-000000000302";
await db.exec(`
  insert into public.admin_correos (correo) values ('fundador@ejemplo.org');
  insert into auth.users (id, email) values ('${F}', 'fundador@ejemplo.org'), ('${L}', 'luis@ejemplo.org'), ('${A}', 'ana@ejemplo.org'), ('${C}', 'carla@ejemplo.org'), ('${O}', 'olga@ejemplo.org');
  insert into public.lugares (id, nombre, tipo, lat, lng, creado_por, visible, privado, origen) values
    ('00000000-0000-4000-8000-000000000101', 'Casa de Cultura Norte', 'casa_de_cultura', 22.15, -100.98, '${F}', true, false, null),
    ('${P_CATALOGO}', 'Foro del Catálogo', 'foro', 22.17, -100.96, null, true, false, 'capo'),
    ('${P_OCULTO_LIGADO}', 'Galería Oculta', 'galeria', 22.19, -100.94, null, false, false, 'capo'),
    ('${P_PRIVADO}', 'Mapeo Privado', 'otro', 22.21, -100.92, '${F}', true, true, null),
    ('${P_OCULTO_LUIS}', 'Taller de Luis', 'otro', 22.23, -100.90, '${L}', false, false, null),
    ('${P_PRIVADO_OLGA}', 'Mapeo de Olga', 'otro', 22.27, -100.86, '${O}', true, true, null),
    ('${P_OCULTO_PRIVADO_OLGA}', 'Terreno de Olga', 'otro', 22.29, -100.84, '${O}', false, true, null),
    ('${P_PRIVADO_LIGADO}', 'Casona Privada', 'otro', 22.31, -100.82, '${F}', true, true, null);
  insert into public.lugares_cuentas (lugar_id, perfil_id) values ('${P_CATALOGO}', '${C}'), ('${P_OCULTO_LIGADO}', '${C}'), ('${P_PRIVADO_LIGADO}', '${C}');
  insert into public.artistas (id, nombre, visible, creado_por, origen) values
    ('00000000-0000-4000-8000-000000000301', 'Colectivo Barro', true, null, 'capo'),
    ('${AR_OCULTO_LIGADO}', 'Solista Oculta', false, null, 'capo'),
    ('00000000-0000-4000-8000-000000000303', 'Trío de Luis', false, '${L}', null);
  insert into public.artistas_cuentas (artista_id, perfil_id) values ('${AR_OCULTO_LIGADO}', '${C}');
`);
console.log("✓ datos sembrados");

const LUGAR = `insert into public.lugares (nombre, tipo, lat, lng, creado_por, visible, privado) values ($1, 'otro', 22.25, -100.88, auth.uid(), $2, $3)`;
const ARTISTA = `insert into public.artistas (nombre, visible, creado_por) values ($1, $2, auth.uid())`;
const RLS = "new row violates row-level security policy";

// ---------- antes: el fallo ----------
await como("authenticated", F);
ok((await falla(`${LUGAR} returning id`, ["Huerto de antes", true, true]))?.includes(RLS), "antes: el administrador no crea un lugar privado con RETURNING (el fallo)");
ok((await falla(`with pgrst_source as (${LUGAR} returning "public"."lugares"."id") select id from pgrst_source`, ["Huerto de antes", true, true]))?.includes(RLS), "antes: tampoco con la forma de consulta de la API (CTE con RETURNING, como supabase-js)");
ok((await falla(LUGAR, ["Huerto de antes", true, true])) === null, "antes: sin RETURNING sí se guardaba");
await como("authenticated", L);
ok((await falla(`${ARTISTA} returning id`, ["Dúo de antes", false]))?.includes(RLS), "antes: un artista oculto tampoco se creaba con RETURNING");
ok((await falla(ARTISTA, ["Dúo de antes", false])) === null, "antes: sin RETURNING sí se guardaba");

// Lo que ve cada quien de lo ya guardado (nombres de las fichas, en orden).
const QUIENES = [["anon", null, "sin sesión"], ["authenticated", L, "Luis"], ["authenticated", A, "Ana"], ["authenticated", C, "Carla"], ["authenticated", O, "Olga"], ["authenticated", F, "el administrador"]];
async function loQueVe() {
  const vista = {};
  for (const [rol, sub, nombre] of QUIENES) {
    await como(rol, sub);
    vista[nombre] = {
      lugares: (await filas(`select nombre from public.lugares order by nombre`)).map((x) => x.nombre),
      artistas: (await filas(`select nombre from public.artistas order by nombre`)).map((x) => x.nombre),
    };
  }
  await como(null, null);
  return vista;
}
const antes = await loQueVe();
ok(antes["sin sesión"].lugares.length === 2 && antes.Carla.lugares.includes("Galería Oculta") && antes.Carla.lugares.includes("Casona Privada") && antes.Olga.lugares.includes("Mapeo de Olga") && antes.Olga.lugares.includes("Terreno de Olga") && antes.Luis.lugares.includes("Taller de Luis") && antes["el administrador"].lugares.length === 9, "antes: cada quien ve algo distinto (la comparación no es vacía)", antes);

// ---------- la migración y las que sigan ----------
await aplicar(archivos.slice(corte));
console.log(`✓ ${MIGRACION} y ${archivos.length - corte - 1} posteriores aplicadas`);

// ---------- lo ya guardado: nada cambia ----------
const despues = await loQueVe();
for (const [, , nombre] of QUIENES) {
  ok(JSON.stringify(despues[nombre]) === JSON.stringify(antes[nombre]), `lo ya guardado: ${nombre} ve las mismas fichas que antes`, { antes: antes[nombre], despues: despues[nombre] });
}

// ---------- crear y leer lo recién creado ----------
await como("authenticated", F);
const privado = await devuelve(`${LUGAR} returning id`, ["Huerto Nuevo", true, true]);
ok(privado.filas.length === 1, "el administrador crea un lugar privado con RETURNING y recibe su id", privado.error);
const comoApi = await devuelve(`with pgrst_source as (${LUGAR} returning "public"."lugares"."id") select id from pgrst_source`, ["Casa Abandonada Centro", true, true]);
ok(comoApi.filas.length === 1, "también con la forma de consulta de la API (CTE con RETURNING)", comoApi.error);
const ocultoAdmin = await devuelve(`${LUGAR} returning id`, ["Bodega Oculta", false, false]);
ok(ocultoAdmin.filas.length === 1, "el administrador crea un lugar oculto con RETURNING", ocultoAdmin.error);

await como("authenticated", L);
const publicoLuis = await devuelve(`${LUGAR} returning id`, ["Foro Público de Luis", true, false]);
ok(publicoLuis.filas.length === 1, "Luis crea un lugar público con RETURNING (como siempre)", publicoLuis.error);
const ocultoLuis = await devuelve(`${LUGAR} returning id`, ["Estudio de Luis", false, false]);
ok(ocultoLuis.filas.length === 1, "Luis crea un lugar oculto con RETURNING", ocultoLuis.error);
ok((await falla(`${LUGAR} returning id`, ["Privado de Luis", true, true]))?.includes(RLS), "Luis no puede marcar un lugar privado (solo el administrador)");
const visibleLuis = await devuelve(`${ARTISTA} returning id`, ["Cuarteto Visible", true]);
ok(visibleLuis.filas.length === 1, "Luis crea un artista visible con RETURNING (como siempre)", visibleLuis.error);
const artistaOculto = await devuelve(`${ARTISTA} returning id`, ["Cuarteto Oculto", false]);
ok(artistaOculto.filas.length === 1, "Luis crea un artista oculto con RETURNING", artistaOculto.error);

// ---------- nadie más lo ve ----------
// Sin id (la creación falló) no hay fila que mirar: cuenta como fallo, para que "nadie más lo ve" no pase en falso.
async function loVe(rol, sub, tabla, id, llave = "id") {
  if (!id) {
    ok(false, `sin id no se puede mirar quién ve la fila de ${tabla}: la creación falló`);
    return false;
  }
  await como(rol, sub);
  const n = (await filas(`select ${llave} from public.${tabla} where ${llave} = $1`, [id])).length;
  await como(null, null);
  return n === 1;
}
const idPrivado = privado.filas[0]?.id;
ok(!(await loVe("anon", null, "lugares", idPrivado)), "el lugar privado nuevo: sin sesión no se ve");
ok(!(await loVe("authenticated", A, "lugares", idPrivado)), "el lugar privado nuevo: Ana no lo ve");
ok(!(await loVe("authenticated", L, "lugares", idPrivado)), "el lugar privado nuevo: Luis no lo ve");
ok(!(await loVe("authenticated", C, "lugares", idPrivado)), "el lugar privado nuevo: Carla no lo ve");
ok(await loVe("authenticated", F, "lugares", idPrivado), "el lugar privado nuevo: el administrador sí");
await como("anon", null);
ok((await filas(`select id from public.lugares_con_nombre('Huerto')`)).length === 0, "la búsqueda por nombre no lo revela");
ok((await filas(`select id from public.lugares_parecidos('Huerto Nuevo', 22.25, -100.88)`)).length === 0, "el aviso de duplicado no lo revela");
await como(null, null);

const idOcultoLuis = ocultoLuis.filas[0]?.id;
ok(!(await loVe("anon", null, "lugares", idOcultoLuis)) && !(await loVe("authenticated", A, "lugares", idOcultoLuis)) && !(await loVe("authenticated", C, "lugares", idOcultoLuis)), "el lugar oculto de Luis: ni sin sesión, ni Ana, ni Carla");
ok((await loVe("authenticated", L, "lugares", idOcultoLuis)) && (await loVe("authenticated", F, "lugares", idOcultoLuis)), "el lugar oculto de Luis: él y el administrador");
const idArtistaOculto = artistaOculto.filas[0]?.id;
ok(!(await loVe("anon", null, "artistas", idArtistaOculto)) && !(await loVe("authenticated", A, "artistas", idArtistaOculto)), "el artista oculto de Luis: ni sin sesión ni Ana");
ok((await loVe("authenticated", L, "artistas", idArtistaOculto)) && (await loVe("authenticated", F, "artistas", idArtistaOculto)), "el artista oculto de Luis: él y el administrador");

// ---------- lo privado que no es del administrador: su autora y la cuenta ligada lo siguen viendo ----------
ok((await loVe("authenticated", O, "lugares", P_PRIVADO_OLGA)) && (await loVe("authenticated", O, "lugares", P_OCULTO_PRIVADO_OLGA)), "Olga, que ya no administra, sigue viendo sus mapeos privados (el visible y el oculto)");
ok(await loVe("authenticated", C, "lugares", P_PRIVADO_LIGADO), "Carla ve el lugar privado que tiene ligado");
for (const [rol, sub, nombre] of [["anon", null, "sin sesión"], ["authenticated", A, "Ana"], ["authenticated", L, "Luis"]]) {
  const ve = [];
  for (const id of [P_PRIVADO_OLGA, P_OCULTO_PRIVADO_OLGA, P_PRIVADO_LIGADO]) ve.push(await loVe(rol, sub, "lugares", id));
  ok(!ve.includes(true), `${nombre}: ni los mapeos de Olga ni el privado ligado a Carla`, ve);
}
ok(!(await loVe("authenticated", C, "lugares", P_PRIVADO_OLGA)) && !(await loVe("authenticated", C, "lugares", P_OCULTO_PRIVADO_OLGA)) && !(await loVe("authenticated", O, "lugares", P_PRIVADO_LIGADO)), "Carla no ve los mapeos de Olga, ni Olga el privado ligado a Carla");

// ---------- las cuentas ligadas siguen leyendo y editando ----------
ok(await loVe("authenticated", C, "lugares", P_OCULTO_LIGADO), "Carla lee el lugar oculto que tiene ligado");
ok(await loVe("authenticated", C, "artistas", AR_OCULTO_LIGADO), "Carla lee el artista oculto que tiene ligado");
await como("authenticated", C);
const editaOculto = await devuelve(`update public.lugares set descripcion = 'Abre los sábados' where id = $1 returning id`, [P_OCULTO_LIGADO]);
ok(editaOculto.filas.length === 1, "Carla edita el lugar oculto ligado (con RETURNING)", editaOculto.error);
const editaPublico = await devuelve(`update public.lugares set descripcion = 'Foro al aire libre' where id = $1 returning id`, [P_CATALOGO]);
ok(editaPublico.filas.length === 1, "Carla edita el lugar público ligado (con RETURNING)", editaPublico.error);
const editaArtista = await devuelve(`update public.artistas set detalle = 'canto' where id = $1 returning id`, [AR_OCULTO_LIGADO]);
ok(editaArtista.filas.length === 1, "Carla edita el artista oculto ligado (con RETURNING)", editaArtista.error);
await como("authenticated", A);
ok((await devuelve(`update public.lugares set descripcion = 'x' where id = $1 returning id`, [P_OCULTO_LIGADO])).filas.length === 0, "Ana no edita el lugar oculto de otra cuenta");
ok((await devuelve(`update public.lugares set descripcion = 'x' where id = $1 returning id`, [P_PRIVADO])).filas.length === 0, "ni el privado del administrador");
await como(null, null);
ok(!(await loVe("authenticated", A, "artistas", AR_OCULTO_LIGADO)), "Ana no lee el artista oculto ligado a Carla");

// ---------- sitio reservado: no tenía el problema (gestiona_evento busca el evento, que ya está guardado) ----------
await como("authenticated", L);
const evento = await devuelve(`insert into public.eventos (sitio_texto, titulo, inicio, creado_por, sitio_reservado) values ('Casa en Tequis', 'Ensayo abierto', now() + interval '1 day', auth.uid(), true) returning id`);
ok(evento.filas.length === 1, "sitio reservado: Luis crea el evento con RETURNING", evento.error);
const idEvento = evento.filas[0]?.id;
const direccion = await devuelve(`insert into public.eventos_sitio_privado (evento_id, direccion, revelar_desde) values ($1, 'Calle Uno 1', now() + interval '1 day') returning evento_id`, [idEvento]);
ok(direccion.filas.length === 1, "sitio reservado: guarda la dirección con RETURNING", direccion.error);
const cambio = await devuelve(`insert into public.eventos_sitio_privado (evento_id, direccion, revelar_desde) values ($1, 'Calle Dos 2', now() + interval '1 day') on conflict (evento_id) do update set direccion = excluded.direccion returning evento_id`, [idEvento]);
ok(cambio.filas.length === 1, "sitio reservado: y la cambia con upsert", cambio.error);
await como(null, null);
ok(!(await loVe("anon", null, "eventos_sitio_privado", idEvento, "evento_id")) && !(await loVe("authenticated", A, "eventos_sitio_privado", idEvento, "evento_id")), "sitio reservado: antes de la hora no la leen ni sin sesión ni Ana");
ok(await loVe("authenticated", F, "eventos_sitio_privado", idEvento, "evento_id"), "sitio reservado: el administrador sí");

if (process.env.FORZAR_FALLO) ok(false, "fallo forzado para comprobar el banco");
console.log(fallos === 0 ? `✓ ${pasan} comprobaciones en verde` : `✗ ${fallos} fallaron, ${pasan} en verde`);
process.exit(fallos === 0 ? 0 : 1);
