#!/usr/bin/env node
// Aplica las migraciones de supabase/migrations/ al proyecto de Supabase.
// Lee SUPABASE_DB_URL de .env (nunca de git) y codifica la contraseña como exige la CLI.
// Uso: npm run db:push [-- --dry-run]
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

let url = process.env.SUPABASE_DB_URL;
if (!url) {
  try {
    const linea = readFileSync(".env", "utf8").split("\n").find((l) => l.startsWith("SUPABASE_DB_URL="));
    url = linea?.slice("SUPABASE_DB_URL=".length).trim().replace(/^["']|["']$/g, "");
  } catch {}
}
if (!url) {
  console.error("Falta SUPABASE_DB_URL en .env (Supabase → Connect → Direct connection, con la contraseña).");
  process.exit(1);
}
const m = url.match(/^(postgres(?:ql)?):\/\/([^:]+):(.*)@([^@]+)$/);
if (!m) {
  console.error("SUPABASE_DB_URL no tiene la forma postgresql://usuario:contraseña@host:puerto/base");
  process.exit(1);
}
const [, esquema, usuario, clave, resto] = m;
const codificada = `${esquema}://${usuario}:${encodeURIComponent(decodeURIComponent(clave))}@${resto}`;
const extra = process.argv.slice(2);
const r = spawnSync("npx", ["supabase@2.117.0", "db", "push", "--db-url", codificada, "--yes", ...extra], { stdio: "inherit" });
process.exit(r.status ?? 1);
