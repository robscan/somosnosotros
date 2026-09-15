#!/usr/bin/env node
// Compila con esbuild un paso de scripts/capo/ (que reutiliza src/lib) y lo corre con las variables de .env.
// Uso: node scripts/capo/correr.mjs capturar
//      node scripts/capo/correr.mjs importar [--simular] [--solo artistas|lugares]
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";

const [paso, ...resto] = process.argv.slice(2);
if (!["capturar", "importar"].includes(paso ?? "")) {
  console.error("Uso: node scripts/capo/correr.mjs capturar | importar [--simular] [--solo artistas|lugares]");
  process.exit(1);
}
mkdirSync("scripts/capo/salida", { recursive: true });
const salida = `scripts/capo/salida/${paso}.mjs`;
let r = spawnSync("npx", ["esbuild", `scripts/capo/${paso}.ts`, "--bundle", "--platform=node", "--format=esm", "--target=node22", "--packages=external", "--alias:@=./src", `--outfile=${salida}`, "--log-level=warning"], { stdio: "inherit" });
if (r.status) process.exit(r.status);
const env = existsSync(".env") ? ["--env-file=.env"] : [];
r = spawnSync(process.execPath, [...env, salida, ...resto], { stdio: "inherit" });
process.exit(r.status ?? 1);
