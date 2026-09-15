/**
 * Paso 1 · Captura del Catálogo de Artistas Potosinos (CAPO): baja las páginas, saca las fichas y las deja
 * como JSON en scripts/capo/salida/ (fuera de git: traen correos personales). No toca la base.
 * Uso: node scripts/capo/correr.mjs capturar
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { aArtista, aLugar, CAPO_URL, clasificarPagina, extraerRegistros, unirDuplicados, type ArtistaCapo, type LugarCapo } from "./capo";

const SALIDA = "scripts/capo/salida";
const CABECERAS = { "User-Agent": "Mozilla/5.0 (compatible; somosnosotros.org; importación CAPO)" };

async function bajar(url: string): Promise<string> {
  const r = await fetch(url, { headers: CABECERAS });
  if (!r.ok) throw new Error(`${r.status} al bajar ${url}`);
  return r.text();
}

function enlacesInternos(html: string): string[] {
  const vistos = new Set<string>();
  for (const m of html.matchAll(/href="(\/catalogoartistaspotosino[^"#?]*)"/g)) vistos.add(m[1].replace(/\/$/, ""));
  return [...vistos].sort();
}

async function main() {
  mkdirSync(SALIDA, { recursive: true });
  const portada = await bajar(CAPO_URL + "/");
  const rutas = enlacesInternos(portada);
  const artistas: ArtistaCapo[] = [];
  const lugares: LugarCapo[] = [];
  const porPagina: string[] = [];
  const ignoradas: string[] = [];
  for (const ruta of rutas) {
    const url = new URL(ruta, CAPO_URL).toString();
    const pagina = clasificarPagina(decodeURIComponent(url));
    if (pagina.clase === "ignorar") {
      ignoradas.push(decodeURIComponent(ruta));
      continue;
    }
    const registros = extraerRegistros(await bajar(url));
    const fuente = { ...pagina, url: decodeURIComponent(url) };
    if (pagina.clase === "artista") for (const r of registros) artistas.push(aArtista(r, fuente));
    else for (const r of registros) lugares.push(aLugar(r, fuente));
    porPagina.push(`- ${registros.length} fichas · ${registros.filter((r) => r.conImagen).length} con imagen · ${registros.filter((r) => r.correos.length).length} con correo → ${decodeURIComponent(ruta)}`);
    process.stdout.write(`${registros.length}\t${decodeURIComponent(ruta)}\n`);
  }
  const a = unirDuplicados(artistas);
  const l = unirDuplicados(lugares);
  writeFileSync(`${SALIDA}/artistas.json`, JSON.stringify(a.unicas, null, 2));
  writeFileSync(`${SALIDA}/lugares.json`, JSON.stringify(l.unicas, null, 2));
  writeFileSync(`${SALIDA}/nombres.txt`, [...a.unicas.map((x) => `A\t${x.disciplina}\t${x.tipo}\t${x.nombre}`), ...l.unicas.map((x) => `L\t${x.tipo}\t${x.nombre}\t${x.direccion ?? "(sin dirección)"}`)].join("\n"));
  const conCorreo = a.unicas.filter((x) => x.correos.length).length + l.unicas.filter((x) => x.correos.length).length;
  const informe = [
    `# Captura del CAPO · ${new Date().toISOString().slice(0, 10)}`,
    "",
    `Páginas leídas: ${rutas.length - ignoradas.length} (ignoradas: ${ignoradas.length}).`,
    `Artistas: ${a.unicas.length} (repetidos unidos: ${a.repetidas.length}). Lugares: ${l.unicas.length} (repetidos unidos: ${l.repetidas.length}). Con correo: ${conCorreo}.`,
    `Lugares sin dirección: ${l.unicas.filter((x) => !x.direccion).map((x) => x.nombre).join(", ") || "ninguno"}.`,
    "",
    "## Por página",
    ...porPagina,
    "",
    "## Repetidos (se quedó la primera página, con las redes de ambas)",
    ...[...a.repetidas, ...l.repetidas].map((r) => `- ${r.nombre}: ${r.urls.join(" · ")}`),
    "",
    "## Ignoradas",
    ...ignoradas.map((r) => `- ${r}`),
  ].join("\n");
  writeFileSync(`${SALIDA}/informe-captura.md`, informe);
  console.log(`\nArtistas ${a.unicas.length} · Lugares ${l.unicas.length} · con correo ${conCorreo}. Ver ${SALIDA}/informe-captura.md y nombres.txt`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
