/**
 * Paso 3 · Invita por correo a los artistas del CAPO a reclamar su ficha ("Soy yo / es mi grupo").
 * Manda en tandas de 15 a 20 al día (decisión del founder, OL-011) para no verse como correo masivo.
 * Los correos de contacto viven en la tabla privada `contactos_importados` (solo la llave de servicio
 * la lee); cada envío se anota en `invitaciones_enviadas` para no invitar dos veces a la misma persona.
 * Un rebote o una queja los apaga el webhook de Resend (src/app/api/resend/route.ts) para los avisos
 * normales; aquí basta con no reintentar sobre un envío que ya falló.
 *
 * Modo por defecto: --ensayo. No manda nada ni escribe: imprime a quién le tocaría, el asunto y el
 * cuerpo del primer artista de la tanda, y cuántos quedarían pendientes. Solo con --enviar manda de
 * verdad (exige RESEND_API_KEY).
 *
 * Uso: npx tsx scripts/capo/invitar.ts [N] [--ensayo|--enviar]
 *      N: cuántos invitar (por defecto 15).
 *
 * Las llaves salen de /Users/apple-1/somosnosotros/.env (no se imprimen). Si trabajas en otra copia
 * del repo, pon esas mismas variables en el entorno antes de correr el script.
 */
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cargarEnv, enmascarar, mandarCorreo, RUTA_ENV } from "../lib/correo-envio";

// cargarEnv, mandarCorreo y enmascarar viven ahora en scripts/lib/correo-envio.ts (OL-122: el envío a
// instituciones usa exactamente las mismas); se reexportan para que nada que importe de aquí cambie.
export { cargarEnv, enmascarar, mandarCorreo };
export const SITIO = "https://somosnosotros.org";
cargarEnv();

// ---------- puro: armar el correo ----------

export type Variante = "A" | "B";

/** Dos variantes de asunto, para que el founder elija (docs en scripts/capo/invitacion.md). */
export function asuntoDe(nombre: string, variante: Variante = "A"): string {
  return variante === "A" ? `${nombre}, tu ficha ya está en Somos Nosotros` : `¿Eres ${nombre}? Tu ficha te espera en Somos Nosotros`;
}

/** La ficha por su slug (la dirección de hoy) o, si aún no tiene, por el UUID (la vieja, que el proxy
 * sigue resolviendo con un 308 a la de slug: OL-123, bitácora 158). */
export function urlFicha(artistaId: string, slug?: string | null): string {
  return `${SITIO}/artistas/${slug || artistaId}`;
}

export function cuerpoTexto(nombre: string, url: string): string {
  return `Hola,

Tomamos tu ficha del Catálogo de Artistas Potosinos (el catálogo de la Dirección de Cultura Municipal) para armar el directorio de Somos Nosotros, donde la gente de San Luis Potosí encuentra centros culturales y eventos.

Tu ficha está aquí: ${url}

Ábrela y toca "Soy yo / es mi grupo" para hacerla tuya: le pones foto, la editas y publicas tus próximas fechas.

Si prefieres que no aparezcas, ábrela y toca "Soy yo / es mi grupo" también: ahí puedes pedir que se quite.

Somos Nosotros`;
}

/** El cuerpo no lleva el nombre (se dice con "Hola,"; ver scripts/capo/invitacion.md); el parámetro
 * queda por si una variante futura lo necesita. */
export function cuerpoHtml(_nombre: string, url: string): string {
  return [
    "<p>Hola,</p>",
    `<p>Tomamos tu ficha del Catálogo de Artistas Potosinos (el catálogo de la Dirección de Cultura Municipal) para armar el directorio de Somos Nosotros, donde la gente de San Luis Potosí encuentra centros culturales y eventos.</p>`,
    `<p>Tu ficha está aquí: <a href="${url}">${url}</a></p>`,
    `<p>Ábrela y toca “Soy yo / es mi grupo” para hacerla tuya: le pones foto, la editas y publicas tus próximas fechas.</p>`,
    `<p>Si prefieres que no aparezcas, ábrela y toca “Soy yo / es mi grupo” también: ahí puedes pedir que se quite.</p>`,
    "<p>Somos Nosotros</p>",
  ].join("\n");
}

export function armarCorreo(nombre: string, artistaId: string, slug?: string | null, variante: Variante = "A"): { asunto: string; texto: string; html: string; url: string } {
  const url = urlFicha(artistaId, slug);
  return { asunto: asuntoDe(nombre, variante), texto: cuerpoTexto(nombre, url), html: cuerpoHtml(nombre, url), url };
}

// ---------- puro: elegir la tanda ----------

export type Candidato = { artistaId: string; nombre: string; correo: string; slug?: string | null };

/** Como mucho un correo por artista (el primero que llegue) y hasta `n`, respetando el orden recibido. */
export function elegirTanda(candidatos: Candidato[], n: number): Candidato[] {
  if (n <= 0) return [];
  const vistos = new Set<string>();
  const tanda: Candidato[] = [];
  for (const c of candidatos) {
    if (vistos.has(c.artistaId)) continue;
    vistos.add(c.artistaId);
    tanda.push(c);
    if (tanda.length >= n) break;
  }
  return tanda;
}

// ---------- impuro: Supabase y Resend ----------

type FilaContacto = { artista_id: string; correo: string; artistas: { nombre: string; visible: boolean; slug: string | null } | { nombre: string; visible: boolean; slug: string | null }[] | null };

function artistaDe(f: FilaContacto["artistas"]): { nombre: string; visible: boolean; slug: string | null } | null {
  return Array.isArray(f) ? (f[0] ?? null) : f;
}

/** Artistas ya invitados (para no repetir). Si la migración de `invitaciones_enviadas` aún no está
 * aplicada, se trata como si nadie hubiera sido invitado todavía (la tabla no existe en producción
 * hasta que el founder la apruebe). */
export async function invitadosPrevios(db: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await db.from("invitaciones_enviadas").select("artista_id");
  if (error) {
    // 42P01: Postgres directo, "relation ... does not exist". PGRST205: PostgREST, tabla fuera de su caché de esquema
    // (mismo caso: la migración es nueva y aún no está aplicada a producción).
    if (error.code === "42P01" || error.code === "PGRST205" || /does not exist|could not find the table/i.test(error.message)) return new Set();
    throw error;
  }
  return new Set((data ?? []).map((r: { artista_id: string }) => r.artista_id));
}

/** Artistas del CAPO con correo de contacto y sin invitación previa, en el orden en que se capturaron. */
export async function candidatosPendientes(db: SupabaseClient): Promise<Candidato[]> {
  const { data, error } = await db
    .from("contactos_importados")
    .select("artista_id, correo, artistas!inner(nombre, visible, slug)")
    .not("artista_id", "is", null)
    .order("capturado_en", { ascending: true });
  if (error) throw error;
  const yaInvitados = await invitadosPrevios(db);
  const filas = (data ?? []) as unknown as FilaContacto[];
  const candidatos: Candidato[] = [];
  for (const f of filas) {
    const artista = artistaDe(f.artistas);
    if (!artista?.visible) continue;
    if (yaInvitados.has(f.artista_id)) continue;
    candidatos.push({ artistaId: f.artista_id, nombre: artista.nombre, correo: f.correo, slug: artista.slug });
  }
  return candidatos;
}

function leerArgumentos(argv: string[]): { n: number; enviar: boolean } {
  const enviar = argv.includes("--enviar");
  const posicional = argv.find((a) => !a.startsWith("--"));
  const n = posicional ? Number(posicional) : 15;
  if (!Number.isInteger(n) || n <= 0) {
    console.error("N debe ser un entero positivo. Uso: npx tsx scripts/capo/invitar.ts [N] [--ensayo|--enviar]");
    process.exit(1);
  }
  return { n, enviar };
}

async function main() {
  const { n, enviar } = leerArgumentos(process.argv.slice(2));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !llave) {
    console.error(`Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (se buscaron en ${RUTA_ENV} y en el entorno).`);
    process.exit(1);
  }
  const db = createClient(url, llave, { auth: { persistSession: false, autoRefreshToken: false } });

  const pendientes = await candidatosPendientes(db);
  const tanda = elegirTanda(pendientes, n);

  if (tanda.length === 0) {
    console.log("No hay artistas pendientes de invitar (ya se invitó a todos los que tienen correo, o no hay correos).");
    return;
  }

  if (!enviar) {
    const primero = tanda[0];
    const correo = armarCorreo(primero.nombre, primero.artistaId, primero.slug);
    console.log(`Ensayo: no se manda nada ni se escribe en la base.`);
    console.log("");
    console.log(`Tanda de ${tanda.length} (de ${pendientes.length} pendientes en total):`);
    for (const c of tanda) console.log(`- ${c.nombre} · ${enmascarar(c.correo)}`);
    console.log("");
    console.log(`Asunto (con el primero de la tanda, ${primero.nombre}): ${correo.asunto}`);
    console.log("Cuerpo:");
    console.log(correo.texto);
    console.log("");
    console.log(`Quedarían ${pendientes.length - tanda.length} pendientes después de esta tanda.`);
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("Falta RESEND_API_KEY: no se puede mandar de verdad.");
    process.exit(1);
  }

  let mandados = 0;
  let fallidos = 0;
  for (const c of tanda) {
    const correo = armarCorreo(c.nombre, c.artistaId, c.slug);
    const r = await mandarCorreo({ para: c.correo, asunto: correo.asunto, texto: correo.texto, html: correo.html });
    if (r.ok) {
      const { error } = await db.from("invitaciones_enviadas").insert({ artista_id: c.artistaId, correo: c.correo, resend_id: r.id });
      if (error) console.error(`Mandado a ${c.nombre} pero no se pudo anotar: ${error.message}`);
      mandados++;
      console.log(`Mandado a ${c.nombre} (${enmascarar(c.correo)}).`);
    } else {
      fallidos++;
      console.error(`Falló ${c.nombre} (${enmascarar(c.correo)}): ${r.error} — sigue con el siguiente.`);
    }
  }
  console.log("");
  console.log(`Mandados ${mandados} · fallidos ${fallidos} · quedan ${pendientes.length - tanda.length} pendientes.`);
}

const esPrincipal = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];
if (esPrincipal) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
