/**
 * Pone foto a fichas importadas sin foto (artistas del CAPO, instituciones) a partir de un JSON [{ nombre, url }]:
 * baja cada imagen (sin Referer: Google Sites la sirve así), la sube al espacio `fotos` de Supabase y guarda la URL
 * pública en `artistas.foto` o `lugares.portada`. Solo toca fichas que no tienen foto. Se puede repetir.
 * Uso: node scripts/fotos/correr.mjs <artistas|lugares|eventos> <fotos.json> --autor <id del admin> [--simular] [--hotlink]
 *   eventos: el JSON trae { titulo, url } y la imagen va a `eventos.imagen` (cartel de un evento importado).
 *   --hotlink: en vez de bajar y subir, guarda la URL externa tal cual (para sitios oficiales y Wikimedia Commons).
 */
import { readFileSync } from "node:fs";
import { normalizarNombre } from "../../src/lib/lugares";
import { guardarInforme, preparar } from "../instituciones/entorno";

type Entrada = { nombre?: string; titulo?: string; url?: string | null; portada?: string | null; foto_url?: string | null; foto_origen?: string | null };
const tabla = (["lugares", "eventos"].includes(process.argv[2] ?? "") ? process.argv[2] : "artistas") as "artistas" | "lugares" | "eventos";
process.argv.splice(2, 1); // preparar() espera <archivo.json> como primer argumento
const { archivo, autor, salida, simular, db } = preparar(`fotos ${tabla}`);
const hotlink = process.argv.includes("--hotlink");
const columna = tabla === "lugares" ? "portada" : tabla === "eventos" ? "imagen" : "foto";
const carpeta = tabla === "artistas" ? "artistas" : "lugares"; // los carteles de evento viven en lugares/<id>/ como en el alta
const nombreDe = (x: { nombre?: string; titulo?: string }) => x.titulo ?? x.nombre ?? "";

/** Google Sites sirve las fotos de bloque a cualquier tamaño (=w800 basta); las de carrusel (obras) no se pueden bajar y se saltan. */
function urlLimpia(e: Entrada): string {
  if (e.foto_origen && e.foto_origen !== "img") return "";
  const url = (e.url ?? e.portada ?? e.foto_url ?? "").trim();
  return /googleusercontent\.com\//.test(url) ? url.replace(/=[ws]\d+.*$/, "=w800") : url;
}
const entradas = (JSON.parse(readFileSync(archivo, "utf8")) as Entrada[]).map((e) => ({ nombre: nombreDe(e), url: urlLimpia(e) })).filter((e) => e.nombre && e.url.startsWith("https://"));

/** Nombre de archivo estable a partir del nombre de la ficha. */
function slug(nombre: string): string {
  return normalizarNombre(nombre).replace(/ /g, "-").slice(0, 60) || "ficha";
}

async function subir(nombre: string, url: string): Promise<string | null> {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (somosnosotros.org; fotos importadas)" }, referrerPolicy: "no-referrer" });
  if (!r.ok) return null;
  const tipo = (r.headers.get("content-type") ?? "").split(";")[0];
  if (!["image/jpeg", "image/png", "image/webp"].includes(tipo)) return null;
  const bytes = Buffer.from(await r.arrayBuffer());
  if (bytes.length > 5 * 1024 * 1024) return null;
  const ext = tipo === "image/png" ? "png" : tipo === "image/webp" ? "webp" : "jpg";
  const ruta = `${carpeta}/${autor}/importadas/${slug(nombre)}.${ext}`;
  const { error } = await db.storage.from("fotos").upload(ruta, bytes, { contentType: tipo, upsert: true });
  if (error) return null;
  return db.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
}

async function main() {
  const campoNombre = tabla === "eventos" ? "titulo" : "nombre";
  const { data } = await db.from(tabla).select(`id, ${campoNombre}, ${columna}`).limit(2000);
  type Fila = { id: string; nombre: string; foto?: string | null; portada?: string | null; imagen?: string | null };
  const porNombre = new Map<string, Fila>();
  for (const f of (data ?? []) as (Fila & { titulo?: string })[]) porNombre.set(normalizarNombre(nombreDe(f)), { ...f, nombre: nombreDe(f) });
  const lineas = [`# Fotos para ${tabla} · ${simular ? "simulación" : "carga"} · ${new Date().toISOString()}`, ""];
  const cambiadas: { id: string; nombre: string }[] = [];
  let sinFicha = 0, yaTenian = 0, fallidas = 0;
  for (const e of entradas) {
    const ficha = porNombre.get(normalizarNombre(e.nombre));
    if (!ficha) {
      sinFicha++;
      lineas.push(`- Sin ficha: ${e.nombre}`);
      continue;
    }
    if (ficha[columna as "foto" | "portada" | "imagen"]) {
      yaTenian++;
      continue;
    }
    if (simular) {
      cambiadas.push({ id: ficha.id, nombre: ficha.nombre });
      continue;
    }
    const url = hotlink ? e.url : await subir(ficha.nombre, e.url);
    if (!url) {
      fallidas++;
      lineas.push(`- No se pudo bajar: ${e.nombre} · ${e.url}`);
      continue;
    }
    const { error } = await db.from(tabla).update({ [columna]: url }).eq("id", ficha.id);
    if (error) {
      fallidas++;
      lineas.push(`- No se pudo guardar: ${e.nombre} · ${error.message}`);
      continue;
    }
    cambiadas.push({ id: ficha.id, nombre: ficha.nombre });
  }
  lineas.unshift(`${entradas.length} entradas · ${cambiadas.length} ${simular ? "por poner" : "puestas"} · ${yaTenian} ya tenían foto · ${sinFicha} sin ficha · ${fallidas} fallidas`, "");
  console.log(lineas[0]);
  console.log(`Informe: ${guardarInforme(salida, `fotos-${tabla}`, lineas, cambiadas, simular)}`);
}

main();
