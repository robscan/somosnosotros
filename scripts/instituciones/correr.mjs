#!/usr/bin/env node
// Compila con esbuild un importador de scripts/instituciones/ (que reutiliza src/lib) y lo corre con las variables de .env.
// Uso: node scripts/instituciones/correr.mjs importar <lugares.json> --autor <id del admin> [--simular] [--salida <carpeta>]
//      node scripts/instituciones/correr.mjs importar-eventos <eventos.json> --autor <id del admin> [--simular] [--forzar-parecidos]
//        [--origen <texto> --fuente <url> [--historico]] [--salida <carpeta>]   (OL-424: procedencia y eventos pasados)
//      node scripts/instituciones/correr.mjs ligar-artistas <carpeta de los JSON o archivo.json> --autor <id del admin> [--simular]
//        [--salida <carpeta>]   (OL-440: liga a los artistas con sus eventos y propone a los que no tienen ficha)
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const [paso, ...resto] = process.argv.slice(2);
if (!["importar", "importar-eventos", "ligar-artistas"].includes(paso ?? "")) {
  console.error("Uso: node scripts/instituciones/correr.mjs importar | importar-eventos | ligar-artistas <archivo.json o carpeta> --autor <id del admin> [--simular] [--salida <carpeta>]");
  process.exit(1);
}
// Dentro de node_modules: el paquete compilado encuentra @supabase/supabase-js y no ensucia git.
const salida = `node_modules/.cache/instituciones/${paso}.mjs`;
let r = spawnSync("npx", ["esbuild", `scripts/instituciones/${paso}.ts`, "--bundle", "--platform=node", "--format=esm", "--target=node22", "--packages=external", "--alias:@=./src", `--outfile=${salida}`, "--log-level=warning"], { stdio: "inherit" });
if (r.status) process.exit(r.status);
const env = existsSync(".env") ? ["--env-file=.env"] : [];
r = spawnSync(process.execPath, [...env, salida, ...resto], { stdio: "inherit" });
process.exit(r.status ?? 1);
