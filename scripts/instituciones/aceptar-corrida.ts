/**
 * OL-453 · Aceptar desde la Mac todas las propuestas de una corrida, por el mismo camino que la bandeja de Ciudades. Founder (22 de octubre): «no
 * me pongas a aprobar en front, aprueba tú por favor».
 *
 * Usa `aceptarLeida` (`src/lib/rutinas/aceptarPropuesta.ts`), la misma función que «Aceptar» de la bandeja: un lugar o un artista, validado y con
 * «¿es este?»; un evento, armado y comprobado (`prepararEvento`), publicado con la llave de servicio, ligado a su propuesta y con su imagen como
 * cartel; las mismas notas («se publicó sin cartel», «se publicó con costo por confirmar», un acto que espera a su festival…). Lo único distinto:
 * no hay sesión, así que la ficha se crea y la propuesta se marca con `aceptar_propuesta_como` (migración 20261022170000: llama
 * `aceptar_propuesta` tal cual, a nombre de --autor, que tiene que ser un admin; solo la llave de servicio puede llamarla).
 *
 * En orden: lugares primero, luego artistas, luego eventos (los festivales antes que los demás), para que los eventos se liguen a sus recintos
 * recién aceptados y los actos encuentren su festival. Solo las propuestas sin decidir: se puede volver a correr y lo ya aceptado no se toca. Lo
 * que no se puede aceptar (ya pasó, ya está, inválido, el mapa no lo ubica…) se deja como está y se lista con su motivo; nada se rechaza solo.
 * Con calma: en serie, 200 ms entre propuestas, y un reintento a los 2 s si la base no respondió.
 *
 * Uso: node scripts/instituciones/correr.mjs aceptar-corrida <corrida_id> --autor <id del admin> [--simular] [--solo lugar|evento|artista|ficha]
 *        [--limite N] [--salida <carpeta>]
 * Con --simular comprueba cada una (todo lo de antes de aceptarla) y no escribe nada.
 */
import { basename } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { almacenDeSupabase } from "../../src/lib/rutinas/aceptarCartel";
import { aceptarLeida, NOTA_NO_PUBLICADO, NOTA_SIN_CARTEL, type DepAceptar, type PropuestaLeida, type ResultadoAceptar } from "../../src/lib/rutinas/aceptarPropuesta";
import { guardarInforme, requerida } from "./entorno";

const USO = "node scripts/instituciones/correr.mjs aceptar-corrida <corrida_id> --autor <id del admin> [--simular] [--solo lugar|evento|artista|ficha] [--limite N] [--salida <carpeta>]";
export const PAUSA_MS = 200;
export const REINTENTO_MS = 2_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type TipoAceptable = "lugar" | "evento" | "artista" | "ficha";
/** OL-489: los campos de «Completar fichas» (`ficha`) al final: completan fichas que ya existen. */
const TIPOS: readonly TipoAceptable[] = ["lugar", "artista", "evento", "ficha"];

/** Las frases de la bandeja que dicen «inténtalo otra vez» (la base no respondió): esas se reintentan una vez. */
const DE_NUEVO = /Intenta de nuevo|Intenta más tarde|Sin conexión/;

/** El orden: lugares, artistas y eventos; entre los eventos, los festivales primero; dentro, como se propusieron. */
export function ordenar<T extends { tipo: string; datos: Record<string, unknown>; creado_en?: string | null }>(ps: readonly T[]): T[] {
  const peso = (p: T) => TIPOS.indexOf(p.tipo as TipoAceptable) * 2 + (p.tipo === "evento" && p.datos.clase !== "festival" ? 1 : 0);
  return [...ps].sort((a, b) => peso(a) - peso(b) || String(a.creado_en ?? "").localeCompare(String(b.creado_en ?? "")));
}

export type Linea = { id: string; tipo: TipoAceptable; nombre: string; resultado: ResultadoAceptar; cartel: "con" | "sin" | null };
export type Resumen = { lineas: Linea[] };

/** El motivo de lo no aceptado, sin el nombre de la propuesta (para agruparlo): «Ya está «X» ese día…» → «Ya está «…» ese día…». */
export const motivoAgrupado = (error: string) => error.replace(/«[^»]*»/g, "«…»");

export type OpcionesAceptar = { corrida: string; autor: string; simular: boolean; solo: TipoAceptable | null; limite: number | null };
export type DepCorrida = {
  db: SupabaseClient;
  mapboxToken: string | null;
  ahora?: () => Date;
  dormir?: (ms: number) => Promise<void>;
  pedir?: typeof fetch;
  almacen?: DepAceptar["almacen"];
  /** Lo que se dice al ir aceptando (la consola). */
  avisar?: (texto: string) => void;
};

/** Acepta (o, con --simular, comprueba) las propuestas sin decidir de la corrida, en orden y en serie. */
export async function aceptarCorrida(dep: DepCorrida, o: OpcionesAceptar): Promise<Resumen> {
  const dormir = dep.dormir ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const ahora = dep.ahora ?? (() => new Date());
  const perfil = await dep.db.from("perfiles").select("rol").eq("id", o.autor).maybeSingle();
  if (perfil.error) throw new Error("No se pudo leer el perfil de --autor");
  if ((perfil.data as { rol?: string } | null)?.rol !== "admin") throw new Error("--autor tiene que ser una cuenta de administración");
  const corrida = await dep.db.from("rutinas_corridas").select("id, ciudad").eq("id", o.corrida).maybeSingle();
  if (corrida.error) throw new Error("No se pudo leer la corrida");
  if (!corrida.data) throw new Error("No encontré esa corrida");
  const slug = (corrida.data as { ciudad: string | null }).ciudad;
  const deCiudad = slug ? await dep.db.from("ciudades").select("nombre").eq("slug", slug).maybeSingle() : { data: null };
  const ciudad = ((deCiudad.data as { nombre?: string } | null)?.nombre as string | undefined) ?? null;

  const r = await dep.db.from("propuestas").select("id, tipo, datos, estado, corrida_id, creado_en").eq("corrida_id", o.corrida).eq("estado", "propuesta").limit(10_000);
  if (r.error) throw new Error("No se pudieron leer las propuestas de la corrida");
  const todas = ((r.data ?? []) as (PropuestaLeida & { creado_en?: string | null })[]).filter((p) => (TIPOS as readonly string[]).includes(p.tipo) && (!o.solo || p.tipo === o.solo));
  const cola = ordenar(todas).slice(0, o.limite ?? undefined);

  const depAceptar: DepAceptar = {
    yo: o.autor,
    admin: dep.db,
    consultas: dep.db,
    // `aceptar_propuesta` tal cual, a nombre del admin (migración 20261022170000: solo la llave de servicio puede llamarla).
    marcar: async (propuesta, ficha) => await dep.db.rpc("aceptar_propuesta_como", { p_autor: o.autor, p_id: propuesta, p_ficha: ficha }),
    mapbox: dep.mapboxToken ? { token: dep.mapboxToken } : null,
    almacen: dep.almacen ?? almacenDeSupabase,
    ahora,
    pedir: dep.pedir,
    soloComprobar: o.simular,
  };
  const lineas: Linea[] = [];
  for (const [i, p] of cola.entries()) {
    if (i) await dormir(PAUSA_MS);
    let resultado = await aceptarLeida(depAceptar, p, ciudad);
    if (!resultado.ok && DE_NUEVO.test(resultado.error)) {
      await dormir(REINTENTO_MS);
      resultado = await aceptarLeida(depAceptar, p, ciudad);
    }
    const nombre = `${String(p.datos.titulo ?? p.datos.nombre ?? "")}${p.tipo === "ficha" ? ` · ${String(p.datos.campo ?? "")}` : ""}`;
    const conImagen = p.tipo === "evento" && typeof p.datos.imagen === "string";
    const publicado = resultado.ok && !resultado.espera && resultado.nota !== NOTA_NO_PUBLICADO;
    const cartel = !o.simular && conImagen && publicado ? ((resultado.ok && resultado.nota?.includes(NOTA_SIN_CARTEL)) ? "sin" : "con") : null;
    lineas.push({ id: p.id, tipo: p.tipo as TipoAceptable, nombre, resultado, cartel });
    dep.avisar?.(`${i + 1}/${cola.length} · ${p.tipo} · ${resultado.ok ? (o.simular ? "se aceptaría" : "aceptada") : "no"}${resultado.ok ? (resultado.nota ? ` · ${resultado.nota}` : "") : ` · ${resultado.error}`} · ${nombre}`);
  }
  return { lineas };
}

/** El informe: aceptadas por tipo, con cartel y sin cartel, las notas, lo no aceptado por motivo (con ejemplos). */
export function lineasDeInforme(o: { simular: boolean; corrida: string; resumen: Resumen; minutos: number }): string[] {
  const { lineas } = o.resumen;
  const ok = lineas.filter((l) => l.resultado.ok);
  const no = lineas.filter((l) => !l.resultado.ok);
  const verbo = o.simular ? "Se aceptarían" : "Aceptadas";
  const porTipo = (ls: Linea[]) => TIPOS.map((t) => `${t} ${ls.filter((l) => l.tipo === t).length}`).join(" · ");
  const notas = new Map<string, number>();
  for (const l of ok) if (l.resultado.ok && l.resultado.nota) for (const n of l.resultado.nota.split(" · ")) notas.set(n, (notas.get(n) ?? 0) + 1);
  const motivos = new Map<string, Linea[]>();
  for (const l of no) {
    const m = motivoAgrupado(l.resultado.ok ? "" : l.resultado.error);
    motivos.set(m, [...(motivos.get(m) ?? []), l]);
  }
  const salida = [
    `# Aceptar la corrida ${o.corrida} · ${o.simular ? "simulación (no se escribió nada)" : "hecho"} · ${new Date().toISOString().slice(0, 16)}`,
    "",
    `- Propuestas sin decidir revisadas: ${lineas.length} (${porTipo(lineas)}) · ${o.minutos} min`,
    `- ${verbo}: ${ok.length} (${porTipo(ok)})`,
  ];
  if (!o.simular) {
    const conImagen = ok.filter((l) => l.cartel);
    salida.push(`- Eventos con imagen: ${conImagen.length} · con cartel ${conImagen.filter((l) => l.cartel === "con").length} · sin cartel ${conImagen.filter((l) => l.cartel === "sin").length}`);
  }
  salida.push(`- No aceptadas (se quedan en la bandeja como estaban): ${no.length}`);
  if (notas.size) salida.push("", "## Notas de lo aceptado", "", ...[...notas].sort((a, b) => b[1] - a[1]).map(([n, k]) => `- ${n}: ${k}`));
  if (motivos.size)
    salida.push(
      "",
      "## No aceptadas, por motivo",
      "",
      ...[...motivos]
        .sort((a, b) => b[1].length - a[1].length)
        .flatMap(([m, ls]) => [`- **${m}** (${ls.length})`, ...ls.slice(0, 5).map((l) => `  - ${l.tipo} · ${l.nombre} · ${l.id}`)]),
    );
  return salida;
}

async function main() {
  const args = process.argv.slice(2);
  const opcion = (nombre: string): string | undefined => {
    const k = args.indexOf(`--${nombre}`);
    return k >= 0 ? args[k + 1] : undefined;
  };
  const corrida = requerida(args[0] && UUID.test(args[0]) ? args[0] : undefined, "el id de la corrida", USO);
  const autor = requerida(opcion("autor"), "--autor", USO);
  const solo = opcion("solo");
  if (solo && !(TIPOS as readonly string[]).includes(solo)) requerida(undefined, "--solo lugar, evento, artista o ficha", USO);
  const limite = opcion("limite") ? Number(opcion("limite")) : null;
  if (limite !== null && !(Number.isInteger(limite) && limite > 0)) requerida(undefined, "--limite con un número mayor que 0", USO);
  const simular = args.includes("--simular");
  const url = requerida(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL en .env", USO);
  const llave = requerida(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY en .env", USO);
  const db = createClient(url, llave, { auth: { persistSession: false, autoRefreshToken: false } });
  const empezo = Date.now();
  const resumen = await aceptarCorrida({ db, mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? null, avisar: (t) => console.log(t) }, { corrida, autor, simular, solo: (solo as TipoAceptable) ?? null, limite });
  const lineas = lineasDeInforme({ simular, corrida, resumen, minutos: Math.round((Date.now() - empezo) / 60_000) });
  console.log(`\n${lineas.join("\n")}`);
  const entraron = resumen.lineas.filter((l) => l.resultado.ok).map((l) => ({ id: l.id, nombre: l.nombre }));
  const ruta = guardarInforme(opcion("salida") ?? "scripts/instituciones/salida", "aceptar-corrida", lineas, entraron, simular);
  console.log(`\nInforme: ${ruta}`);
}

if (/^aceptar-corrida\.(m?js|ts)$/.test(basename(process.argv[1] ?? ""))) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
