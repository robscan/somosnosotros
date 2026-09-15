/**
 * Paso 2 · Importa a Supabase lo capturado en scripts/capo/salida/ (artistas.json, lugares.json).
 * Cada ficha entra con origen 'capo', sin autor ni foto; sus correos van a contactos_importados.
 * Los lugares se geocodifican con Mapbox: entra el que resuelve a una dirección exacta; el resto queda en el informe.
 * Se puede repetir: lo que ya existe (mismo nombre en la ciudad) se salta.
 * Uso: node scripts/capo/correr.mjs importar [--simular] [--solo artistas|lugares]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { normalizarNombre } from "../../src/lib/lugares";
import type { ArtistaCapo, LugarCapo } from "./capo";

const SALIDA = "scripts/capo/salida";
const CIUDAD = "San Luis Potosí";
const CENTRO = { lat: 22.1565, lng: -100.9855 };
const args = process.argv.slice(2);
const simular = args.includes("--simular");
const solo = args[args.indexOf("--solo") + 1] ?? null;
const hacerArtistas = !args.includes("--solo") || solo === "artistas";
const hacerLugares = !args.includes("--solo") || solo === "lugares";

const urlSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
const tokenMapbox = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
if (!urlSupabase || !llave) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
  process.exit(1);
}
const db = createClient(urlSupabase, llave, { auth: { persistSession: false, autoRefreshToken: false } });

type Geo = { lat: number; lng: number; direccion: string; exacta: boolean };

/** La respuesta tiene que hablar de la misma calle: la primera palabra larga de la dirección debe aparecer en ella. */
function mismaCalle(pedida: string, devuelta: string): boolean {
  const palabra = normalizarNombre(pedida).split(" ").find((w) => w.length >= 4 && !/^(calle|avenida|av|prol|prolongacion|blvd|boulevard|plan)$/.test(w));
  return !palabra || normalizarNombre(devuelta).includes(palabra);
}

/** Caja que encierra la ciudad: sin ella Mapbox se va a otros municipios del estado con el mismo nombre de calle. */
const CAJA_CIUDAD = "-101.10,22.00,-100.85,22.30";

async function geocodificar(direccion: string): Promise<Geo | null> {
  if (!tokenMapbox) return null;
  // Solo la calle y el número: la ciudad va en la caja; el texto "San Luis Potosí, S.L.P." confunde (ciudad = estado).
  const calle = direccion.replace(/,?\s*(san luis potos[ií]|s\.?l\.?p\.?|m[eé]xico)\s*/gi, " ").replace(/\s+/g, " ").replace(/[,\s]+$/, "").trim();
  const p = new URLSearchParams({ q: calle, access_token: tokenMapbox, country: "mx", language: "es", limit: "1", bbox: CAJA_CIUDAD, proximity: `${CENTRO.lng},${CENTRO.lat}`, types: "address,street" });
  const r = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${p}`);
  if (!r.ok) return null;
  const json = (await r.json()) as { features?: Array<{ properties?: { feature_type?: string; full_address?: string; coordinates?: { latitude: number; longitude: number; accuracy?: string } } }> };
  const f = json.features?.[0]?.properties;
  if (!f?.coordinates) return null;
  const enCiudad = Math.abs(f.coordinates.latitude - CENTRO.lat) < 0.25 && Math.abs(f.coordinates.longitude - CENTRO.lng) < 0.25;
  if (!enCiudad) return null;
  const devuelta = f.full_address ?? direccion;
  // Solo entra lo que resuelve a un número exacto en la misma calle; lo aproximado se da de alta a mano.
  if (f.feature_type !== "address" || !mismaCalle(direccion, devuelta)) return null;
  return { lat: f.coordinates.latitude, lng: f.coordinates.longitude, direccion: devuelta, exacta: true };
}

async function nombresExistentes(tabla: "artistas" | "lugares"): Promise<Set<string>> {
  const { data, error } = await db.from(tabla).select("nombre").eq("ciudad", CIUDAD);
  if (error) throw error;
  return new Set((data ?? []).map((x: { nombre: string }) => normalizarNombre(x.nombre)));
}

async function guardarContactos(fila: { artista_id?: string; lugar_id?: string }, correos: string[], url_fuente: string) {
  if (!correos.length || simular) return;
  const { error } = await db.from("contactos_importados").insert(correos.map((correo) => ({ ...fila, correo, fuente: "capo", url_fuente })));
  if (error) throw error;
}

const informe: string[] = [`# Importación del CAPO · ${new Date().toISOString()}${simular ? " (simulación)" : ""}`, ""];
const resultado = { artistas: [] as { id: string; nombre: string }[], lugares: [] as { id: string; nombre: string; exacta: boolean }[] };

async function importarArtistas() {
  const fichas = JSON.parse(readFileSync(`${SALIDA}/artistas.json`, "utf8")) as ArtistaCapo[];
  const existentes = await nombresExistentes("artistas");
  let saltados = 0;
  const fallidos: string[] = [];
  for (const a of fichas) {
    if (existentes.has(normalizarNombre(a.nombre))) {
      saltados++;
      continue;
    }
    if (simular) {
      resultado.artistas.push({ id: "-", nombre: a.nombre });
      continue;
    }
    const { data, error } = await db
      .from("artistas")
      .insert({ nombre: a.nombre, disciplina: a.disciplina, detalle: a.detalle, tipo: a.tipo, descripcion: a.descripcion, foto: null, redes: a.redes, ciudad: CIUDAD, creado_por: null, visible: true, origen: "capo" })
      .select("id")
      .single();
    if (error || !data) {
      fallidos.push(`${a.nombre}: ${error?.message ?? "sin id"}`);
      continue;
    }
    resultado.artistas.push({ id: data.id, nombre: a.nombre });
    await guardarContactos({ artista_id: data.id }, a.correos, a.url_fuente);
    process.stdout.write(".");
  }
  informe.push(`## Artistas`, `Capturados ${fichas.length} · insertados ${resultado.artistas.length} · ya existían ${saltados} · fallaron ${fallidos.length}`, ...fallidos.map((f) => `- ${f}`), "");
}

async function importarLugares() {
  const fichas = JSON.parse(readFileSync(`${SALIDA}/lugares.json`, "utf8")) as LugarCapo[];
  const existentes = await nombresExistentes("lugares");
  const pendientes: string[] = [];
  const fallidos: string[] = [];
  let saltados = 0;
  for (const l of fichas) {
    if (existentes.has(normalizarNombre(l.nombre))) {
      saltados++;
      continue;
    }
    const geo = l.direccion ? await geocodificar(l.direccion) : null;
    if (!geo) {
      pendientes.push(`- ${l.nombre} · ${l.direccion ?? "sin dirección"} · ${l.url_fuente}`);
      process.stdout.write("?");
      continue;
    }
    informe.push(`- ${l.nombre} · "${l.direccion}" → ${geo.direccion} (${geo.exacta ? "exacta" : "aprox. calle"}) ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}`);
    if (simular) {
      resultado.lugares.push({ id: "-", nombre: l.nombre, exacta: geo.exacta });
      continue;
    }
    const { data, error } = await db
      .from("lugares")
      .insert({ nombre: l.nombre, tipo: l.tipo, descripcion: l.descripcion, direccion: l.direccion, lat: geo.lat, lng: geo.lng, ciudad: CIUDAD, redes: l.redes, portada: null, creado_por: null, visible: true, origen: "capo" })
      .select("id")
      .single();
    if (error || !data) {
      fallidos.push(`${l.nombre}: ${error?.message ?? "sin id"}`);
      continue;
    }
    resultado.lugares.push({ id: data.id, nombre: l.nombre, exacta: geo.exacta });
    await guardarContactos({ lugar_id: data.id }, l.correos, l.url_fuente);
  }
  informe.unshift(`## Lugares`, `Capturados ${fichas.length} · insertados ${resultado.lugares.length} · ya existían ${saltados} · sin coordenadas (a mano) ${pendientes.length} · fallaron ${fallidos.length}`, "", "### Geocodificados");
  informe.push("", "### Sin coordenadas: darlos de alta desde el teléfono", ...pendientes, "", ...fallidos.map((f) => `- FALLÓ ${f}`), "");
}

async function main() {
  if (hacerLugares) await importarLugares();
  if (hacerArtistas) await importarArtistas();
  const sello = new Date().toISOString().replace(/[:.]/g, "-");
  const sufijo = `${solo ? `-${solo}` : ""}${simular ? "-simulada" : ""}`;
  writeFileSync(`${SALIDA}/informe-importacion${sufijo}.md`, informe.join("\n"));
  if (!simular) writeFileSync(`${SALIDA}/importados-${sello}.json`, JSON.stringify(resultado, null, 2));
  console.log(`\n${informe.filter((l) => /^Capturados/.test(l)).join("\n")}\nInforme: ${SALIDA}/informe-importacion${sufijo}.md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
