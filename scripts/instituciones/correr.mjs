#!/usr/bin/env node
// Compila con esbuild un importador de scripts/instituciones/ (que reutiliza src/lib) y lo corre con las variables de .env.
// Uso: node scripts/instituciones/correr.mjs importar <lugares.json> --autor <id del admin> [--simular] [--salida <carpeta>]
//      node scripts/instituciones/correr.mjs importar-eventos <eventos.json> --autor <id del admin> [--simular] [--forzar-parecidos]
//        [--origen <texto> --fuente <url> [--historico]] [--salida <carpeta>]   (OL-424: procedencia y eventos pasados)
//      node scripts/instituciones/correr.mjs ligar-artistas <carpeta de los JSON o archivo.json> --autor <id del admin> [--simular]
//        [--salida <carpeta>]   (OL-440: liga a los artistas con sus eventos y propone a los que no tienen ficha)
//      node scripts/instituciones/correr.mjs cartelera-cdmx --autor <id del admin> [--simular] [--ciudad <slug>] [--salida <carpeta>]
//        (OL-448: la carga inicial de la Cartelera de la Ciudad de México, con la calma del lector)
//      node scripts/instituciones/correr.mjs aceptar-corrida <corrida_id> --autor <id del admin> [--simular] [--solo lugar|evento|artista]
//        [--limite N] [--salida <carpeta>]   (OL-453: acepta las propuestas de una corrida por el camino de la bandeja)
//      node scripts/instituciones/correr.mjs proponer <carpeta con propuestas.json> --autor <id del admin> [--simular] [--salida <carpeta>]
//        (OL-462: carga a mano lugares, artistas y eventos —un festival con sus actos— como una corrida de la bandeja)
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const [paso, ...resto] = process.argv.slice(2);
if (!["importar", "importar-eventos", "ligar-artistas", "cartelera-cdmx", "aceptar-corrida", "proponer"].includes(paso ?? "")) {
  console.error("Uso: node scripts/instituciones/correr.mjs importar | importar-eventos | ligar-artistas <archivo.json o carpeta> --autor <id del admin> [--simular] [--salida <carpeta>]");
  console.error("     node scripts/instituciones/correr.mjs cartelera-cdmx --autor <id del admin> [--simular] [--ciudad <slug>] [--salida <carpeta>]");
  console.error("     node scripts/instituciones/correr.mjs aceptar-corrida <corrida_id> --autor <id del admin> [--simular] [--solo lugar|evento|artista] [--limite N]");
  console.error("     node scripts/instituciones/correr.mjs proponer <carpeta con propuestas.json> --autor <id del admin> [--simular] [--salida <carpeta>]");
  process.exit(1);
}
// Dentro de node_modules: el paquete compilado encuentra @supabase/supabase-js y no ensucia git.
const salida = `node_modules/.cache/instituciones/${paso}.mjs`;
let r = spawnSync("npx", ["esbuild", `scripts/instituciones/${paso}.ts`, "--bundle", "--platform=node", "--format=esm", "--target=node22", "--packages=external", "--alias:@=./src",
  // OL-448: la carga de la cartelera reutiliza la rutina del servidor; fuera de Next, «server-only» se resuelve vacío (como en las pruebas).
  "--alias:server-only=./node_modules/server-only/empty.js", `--outfile=${salida}`, "--log-level=warning"], { stdio: "inherit" });
if (r.status) process.exit(r.status);
const env = existsSync(".env") ? ["--env-file=.env"] : [];
r = spawnSync(process.execPath, [...env, salida, ...resto], { stdio: "inherit" });
process.exit(r.status ?? 1);
