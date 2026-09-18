import { randomBytes } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Client } from "pg";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MIGRATIONS_DIR = join(ROOT, "supabase/migrations");
const TESTS_DIR = join(ROOT, "supabase/tests/pg");
const ROLE_SPECS = [
  { name: "anon", bypassRls: false },
  { name: "authenticated", bypassRls: false },
  { name: "service_role", bypassRls: true },
];
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "[::1]"]);

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function fail(message) {
  throw new Error(`test:db: ${message}`);
}

function testDatabaseUrl() {
  const rawUrl = process.env.TEST_DATABASE_URL;
  if (!rawUrl) fail("falta TEST_DATABASE_URL; no se usan DATABASE_URL, SUPABASE ni archivos .env");

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    fail("TEST_DATABASE_URL no es una URL PostgreSQL valida");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) fail("TEST_DATABASE_URL debe usar postgres:// o postgresql://");
  if (!LOOPBACK_HOSTS.has(url.hostname.toLowerCase())) fail("TEST_DATABASE_URL solo acepta hosts loopback");
  if (url.search || url.hash) fail("TEST_DATABASE_URL no acepta parametros ni fragmentos");

  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!database || !/^[a-zA-Z0-9_]+$/.test(database)) fail("la base de TEST_DATABASE_URL debe tener un nombre simple");
  if (/^sn_test_/i.test(database) || /(prod|production|supabase)/i.test(database)) {
    fail("TEST_DATABASE_URL debe apuntar a una base local de control, no a una base de pruebas previa ni de produccion");
  }
  return url;
}

function urlForDatabase(baseUrl, database) {
  const url = new URL(baseUrl);
  url.pathname = `/${database}`;
  return url.toString();
}

function databaseName() {
  return `sn_test_${Date.now().toString(36)}_${randomBytes(6).toString("hex")}`;
}

function fixtureSql() {
  return `
    set time zone 'UTC';
    create extension if not exists pgcrypto;
    create schema auth;
    create schema storage;
    create schema extensions;
    create table auth.users (
      id uuid primary key,
      email text not null,
      raw_user_meta_data jsonb not null default '{}'::jsonb,
      email_confirmed_at timestamptz,
      last_sign_in_at timestamptz,
      created_at timestamptz not null default now()
    );
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create table storage.buckets (
      id text primary key,
      name text not null,
      public boolean not null default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    create table storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text not null,
      name text not null,
      owner uuid
    );
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$
      select string_to_array(name, '/')
    $$;
    grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
    grant all on all tables in schema storage to anon, authenticated, service_role;
    grant all on all sequences in schema storage to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  `;
}

async function assertRolesAreUnused(client) {
  const { rows } = await client.query(
    "select rolname from pg_roles where rolname = any($1::text[])",
    [ROLE_SPECS.map(({ name }) => name)],
  );
  if (rows.length > 0) fail(`los roles de prueba ya existen: ${rows.map((row) => row.rolname).join(", ")}`);
}

async function createRoles(client, createdRoles) {
  const { rows } = await client.query("select current_user as name");
  const runnerRole = rows[0].name;
  for (const { name, bypassRls } of ROLE_SPECS) {
    await client.query(`create role ${quoteIdentifier(name)} nologin nosuperuser nocreatedb nocreaterole noinherit ${bypassRls ? "bypassrls" : "nobypassrls"}`);
    createdRoles.push(name);
  }
  await client.query(`grant ${ROLE_SPECS.map(({ name }) => quoteIdentifier(name)).join(", ")} to ${quoteIdentifier(runnerRole)}`);
}

async function applyMigrations(client) {
  const migrations = readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith(".sql")).sort();
  if (migrations.length === 0) fail("no hay migraciones SQL en supabase/migrations");
  for (const migration of migrations) {
    try {
      await client.query(readFileSync(join(MIGRATIONS_DIR, migration), "utf8"));
    } catch (error) {
      error.message = `migracion ${migration}: ${error.message}`;
      throw error;
    }
  }
  return migrations.length;
}

function makeContext(client, connectionString) {
  let assertions = 0;
  let failures = 0;

  function check(condition, label, detail) {
    assertions += 1;
    if (condition) return;
    failures += 1;
    console.error(`  x ${label}${detail === undefined ? "" : `: ${JSON.stringify(detail)}`}`);
  }

  async function as(role, subject, action) {
    await client.query("reset role");
    await client.query("select set_config('request.jwt.claim.sub', $1, false)", [subject ?? ""]);
    if (role) await client.query(`set role ${quoteIdentifier(role)}`);
    try {
      return await action();
    } finally {
      await client.query("reset role");
      await client.query("select set_config('request.jwt.claim.sub', '', false)");
    }
  }

  async function expectError(action, code, label) {
    try {
      await action();
      check(false, label, "la consulta termino sin error");
    } catch (error) {
      check(!code || error.code === code, label, { code: error.code, message: error.message });
    }
  }

  return {
    as,
    check,
    expectError,
    query: (text, values) => client.query(text, values),
    // Cada llamada usa otra conexion real para probar escrituras concurrentes.
    connection: async (action) => {
      const other = new Client({ connectionString, connectionTimeoutMillis: 5000 });
      await other.connect();
      try {
        await other.query("set statement_timeout = '15s'");
        return await action(other);
      } finally {
        await other.end();
      }
    },
    summary: () => ({ assertions, failures }),
  };
}

async function cleanup(admin, dbName, databaseCreated, createdRoles) {
  const cleanupErrors = [];
  if (databaseCreated) {
    try {
      await admin.query("select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()", [dbName]);
      await admin.query(`drop database ${quoteIdentifier(dbName)}`);
    } catch (error) {
      cleanupErrors.push(`no se pudo borrar la base creada ${dbName}: ${error.message}`);
    }
  }
  for (const name of [...createdRoles].reverse()) {
    try {
      const { rows } = await admin.query("select rolsuper, rolcreaterole, rolcreatedb, rolinherit, rolcanlogin, rolbypassrls from pg_roles where rolname = $1", [name]);
      const role = rows[0];
      const expectedBypassRls = ROLE_SPECS.find((spec) => spec.name === name).bypassRls;
      if (!role || role.rolsuper || role.rolcreaterole || role.rolcreatedb || role.rolinherit || role.rolcanlogin || role.rolbypassrls !== expectedBypassRls) {
        cleanupErrors.push(`el rol ${name} ya no coincide con el rol aislado creado por este runner; no se borro`);
        continue;
      }
      await admin.query(`drop role ${quoteIdentifier(name)}`);
    } catch (error) {
      cleanupErrors.push(`no se pudo borrar el rol creado ${name}: ${error.message}`);
    }
  }
  return cleanupErrors;
}

let admin;
let database;
let databaseCreated = false;
const createdRoles = [];
let exitCode = 0;

try {
  const controlUrl = testDatabaseUrl();
  database = databaseName();
  admin = new Client({ connectionString: controlUrl.toString(), connectionTimeoutMillis: 5000 });
  await admin.connect();
  const lock = await admin.query("select pg_try_advisory_lock(7302, 1) as acquired");
  if (!lock.rows[0].acquired) fail("ya hay otro banco de pruebas usando este servidor local");
  await assertRolesAreUnused(admin);
  await createRoles(admin, createdRoles);
  await admin.query(`create database ${quoteIdentifier(database)}`);
  databaseCreated = true;

  const connectionString = urlForDatabase(controlUrl, database);
  const testClient = new Client({ connectionString, connectionTimeoutMillis: 5000 });
  await testClient.connect();
  try {
    await testClient.query(fixtureSql());
    const migrationCount = await applyMigrations(testClient);
    console.log(`ok ${migrationCount} migraciones aplicadas en ${database}`);

    const context = makeContext(testClient, connectionString);
    const tests = readdirSync(TESTS_DIR).filter((file) => file.endsWith(".test.mjs")).sort();
    if (tests.length === 0) fail("no hay archivos *.test.mjs en supabase/tests/pg");
    for (const test of tests) {
      const testModule = await import(pathToFileURL(join(TESTS_DIR, test)).href);
      if (typeof testModule.run !== "function") fail(`${test} no exporta run(context)`);
      await testModule.run(context);
    }
    if (process.env.FORZAR_FALLO === "1" || process.env.FORZAR_FALLO === "true") {
      context.check(false, "fallo forzado del runner");
    }
    const { assertions, failures } = context.summary();
    console.log(`${failures === 0 ? "ok" : "x"} ${assertions} pruebas: ${failures} fallaron`);
    if (failures > 0) exitCode = 1;
  } finally {
    await testClient.end();
  }
} catch (error) {
  exitCode = 1;
  console.error(`x ${error.message}`);
} finally {
  if (admin) {
    const cleanupErrors = await cleanup(admin, database, databaseCreated, createdRoles);
    for (const error of cleanupErrors) console.error(`x limpieza: ${error}`);
    if (cleanupErrors.length > 0) exitCode = 1;
    await admin.end();
  }
}

process.exitCode = exitCode;
