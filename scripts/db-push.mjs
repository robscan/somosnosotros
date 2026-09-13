#!/usr/bin/env node
// Aplica las migraciones de supabase/migrations/ al proyecto de Supabase.
// Lee SUPABASE_DB_URL de .env (nunca de git) y codifica la contraseña como exige la CLI.
// Uso: npm run db:push [-- --dry-run]
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Sirve SUPABASE_DB_URL (Connect → Direct connection) o POSTGRES_URL_NON_POOLING (la que da la integración con Vercel).
const NOMBRES = ["SUPABASE_DB_URL", "POSTGRES_URL_NON_POOLING"];
let url = NOMBRES.map((n) => process.env[n]).find(Boolean);
if (!url) {
  try {
    const lineas = readFileSync(".env", "utf8").split("\n");
    for (const n of NOMBRES) {
      const linea = lineas.find((l) => l.startsWith(`${n}=`));
      if (linea) {
        url = linea.slice(n.length + 1).trim().replace(/^["']|["']$/g, "");
        break;
      }
    }
  } catch {}
}
if (!url) {
  console.error("Falta SUPABASE_DB_URL (o POSTGRES_URL_NON_POOLING) en .env.");
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
