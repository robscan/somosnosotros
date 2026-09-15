#!/usr/bin/env node
// Compila scripts/fotos/aplicar.ts con esbuild (reutiliza src/lib) y lo corre con las variables de .env.
// Uso: node scripts/fotos/correr.mjs <artistas|lugares|eventos> <fotos.json> --autor <id del admin> [--simular] [--hotlink] [--salida <carpeta>]
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const [tabla, ...resto] = process.argv.slice(2);
if (!["artistas", "lugares", "eventos"].includes(tabla ?? "")) {
  console.error("Uso: node scripts/fotos/correr.mjs <artistas|lugares|eventos> <fotos.json> --autor <id del admin> [--simular] [--hotlink] [--salida <carpeta>]");
  process.exit(1);
}
const salida = "node_modules/.cache/fotos/aplicar.mjs";
let r = spawnSync("npx", ["esbuild", "scripts/fotos/aplicar.ts", "--bundle", "--platform=node", "--format=esm", "--target=node22", "--packages=external", "--alias:@=./src", `--outfile=${salida}`, "--log-level=warning"], { stdio: "inherit" });
if (r.status) process.exit(r.status);
const env = existsSync(".env") ? ["--env-file=.env"] : [];
r = spawnSync(process.execPath, [...env, salida, tabla, ...resto], { stdio: "inherit" });
process.exit(r.status ?? 1);
