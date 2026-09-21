// Banco de pruebas de la migración "subcategorías por disciplina" (OL-101, bitácora 136,
// 20260922110000_subcategorias_por_disciplina.sql): public.subcategorias_de(p_disciplina) une
// variantes de escritura de `detalle` ("Fotografía" / "fotografia" / "FOTOGRAFÍA") por su forma
// normalizada, devuelve la escritura más usada de cada grupo, no cuenta artistas ocultos, es
// global (no por ciudad) y no revela nada a quien no tiene sesión.
//
// PGlite no es dependencia del repo: se instala aparte, una vez, fuera del proyecto.
//   npm install --prefix /tmp/pglite @electric-sql/pglite@0.5.8
//   PGLITE=/tmp/pglite node supabase/tests/subcategorias_disciplina.mjs
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
const migracion = archivos.find((f) => f.endsWith("_subcategorias_por_disciplina.sql"));
if (!migracion) {
  console.log("✗ no está la migración 20260922110000_subcategorias_por_disciplina.sql");
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
const F = uuid(1);
const SLP = "San Luis Potosí";
const CORDOBA = "Córdoba"; // otra ciudad: la función no filtra por ciudad (docs/rediseno/27)

await db.exec(`insert into auth.users (id, email, email_confirmed_at) values ('${F}', 'f@ejemplo.org', now())`);

async function artista(n, { disciplina, detalle, visible = true, ciudad = SLP }) {
  const id = uuid(n);
  await db.query(
    `insert into public.artistas (id, nombre, disciplina, detalle, visible, ciudad, creado_por) values ($1,$2,$3,$4,$5,$6,$7)`,
    [id, `Fixture ${n}`, disciplina, detalle, visible, ciudad, F]
  );
  return id;
}

async function como(rol, sub) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [sub ?? ""]);
  if (rol) await db.exec(`set role ${rol}`);
}

// Artes visuales: "Fotografía" (3, dos escrituras) es más usada que "Pintura" (1); una oculta no cuenta.
await artista(101, { disciplina: "artes_visuales", detalle: "Fotografía" });
await artista(102, { disciplina: "artes_visuales", detalle: "fotografia" });
await artista(103, { disciplina: "artes_visuales", detalle: "FOTOGRAFÍA" });
await artista(104, { disciplina: "artes_visuales", detalle: "Pintura" });
await artista(105, { disciplina: "artes_visuales", detalle: "Pintura", visible: false });
await artista(106, { disciplina: "artes_visuales", detalle: null });
await artista(107, { disciplina: "artes_visuales", detalle: "  " }); // solo espacios: como sin detalle
await artista(108, { disciplina: "artes_visuales", detalle: "Fotografía", ciudad: CORDOBA }); // otra ciudad: cuenta igual
await artista(109, { disciplina: "musica", detalle: "Jazz" }); // otra disciplina: no debe mezclarse

await como("anon", null);
const visuales = await filas(`select detalle, artistas from public.subcategorias_de('artes_visuales')`);
ok(visuales.length === 2, "artes_visuales: dos grupos (fotografía y pintura), sin contar null ni solo-espacios", visuales);
const foto = visuales.find((r) => r.detalle === "Fotografía");
ok(!!foto && foto.artistas === 4, "une 'Fotografía'/'fotografia'/'FOTOGRAFÍA' en un solo grupo, con la escritura más usada como etiqueta, y suma la de otra ciudad (no filtra por ciudad)", foto);
const pintura = visuales.find((r) => /pintura/i.test(r.detalle));
ok(!!pintura && pintura.artistas === 1, "'Pintura' no cuenta la fila oculta (visible=false)", pintura);
ok(visuales[0].detalle === "Fotografía", "la más usada va primero", visuales);

// ---------- disciplina rara, vacía o sin subcategorías: cero filas, no error ----------
const rara = await filas(`select * from public.subcategorias_de('no-existe')`);
ok(rara.length === 0, "disciplina inexistente: cero filas, no error", rara);
const vacia = await filas(`select * from public.subcategorias_de('')`);
ok(vacia.length === 0, "disciplina vacía: cero filas, no error", vacia);
const cine = await filas(`select * from public.subcategorias_de('cine')`);
ok(cine.length === 0, "disciplina válida sin ningún detalle usado todavía: cero filas", cine);

// ---------- no mezcla disciplinas ----------
const musica = await filas(`select detalle from public.subcategorias_de('musica')`);
ok(musica.length === 1 && musica[0].detalle === "Jazz", "musica no trae las subcategorías de artes_visuales", musica);

// ---------- permisos: anon y authenticated pueden llamarla ----------
for (const rol of ["anon", "authenticated"]) {
  await como(rol, rol === "authenticated" ? F : null);
  let error = null;
  try {
    await db.query(`select * from public.subcategorias_de('musica')`);
  } catch (e) {
    error = e.message;
  }
  ok(error === null, `${rol} puede llamar subcategorias_de()`, error);
}

// ---------- estable, invoker, search_path vacío (mismo criterio que el resto de funciones del proyecto) ----------
const flags = (await filas(`select provolatile, prosecdef, proconfig from pg_proc where oid = 'public.subcategorias_de(text)'::regprocedure`))[0];
ok(flags.provolatile === "s" && flags.prosecdef === false && flags.proconfig?.includes('search_path=""'), "subcategorias_de: STABLE, security invoker y search_path vacío", flags);

console.log(`${fallos === 0 ? "✓" : "✗"} ${pasan} comprobaciones en verde${fallos ? `, ${fallos} en rojo` : ""}`);
process.exit(fallos === 0 ? 0 : 1);
