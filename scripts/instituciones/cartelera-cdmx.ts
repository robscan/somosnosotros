/**
 * OL-448 · Carga inicial de la Cartelera de la Ciudad de México desde la Mac. El founder: «No quites nada, si cultura los mete nosotros también.
 * Me gusta que leas con calma para no tirar el sitio.» Es la misma lectura que hace «Buscar agendas y eventos» en Ciudad de México (la tarea
 * `cartelera` de `src/lib/rutinas/agendas.ts`, con el lector y la calma de `src/lib/rutinas/carteleraCdmx.ts`: una petición cada 1,5 s o más,
 * reintentos con espera creciente, User-Agent de somosnosotrxs.org), pero de un tirón: así la primera carga no espera ~30 latidos.
 *
 * Sin --simular: crea una corrida `agendas` de la ciudad (a nombre de --autor, tope 0,01 USD: no usa la API) con `solo_cartelera` (no publica lo
 * aceptado ni toca las agendas guardadas), la corre por pasos de 10 minutos guardando el avance en la corrida (si el guion se corta, el latido de
 * Supabase la retoma donde iba cuando venza su `ocupada_hasta`) y la deja «terminada» con sus propuestas en la bandeja de la ciudad: eventos y
 * recintos nuevos, con la fuente «Cartelera de la Ciudad de México». Si ya hay una búsqueda de agendas en curso en la ciudad, no empieza.
 * Con --simular: lee lo mismo (la cartelera de verdad, con la misma calma) y la base solo para leer; no escribe nada. Las dos imprimen el informe
 * (eventos listados, fichas leídas, nuevos, duplicados, recintos nuevos, por tipo) y lo guardan en --salida.
 *
 * Uso: node scripts/instituciones/correr.mjs cartelera-cdmx --autor <id del admin> [--simular] [--ciudad <slug>] [--salida <carpeta>]
 * Duración: unas 100 páginas de lista y unas 600–900 fichas a ~2,2 s cada una: de 25 a 40 minutos.
 */
import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { leerParametrosCiudad } from "../../src/lib/ciudadParametros";
import { esCiudadDeMexico, pasoAgendas, type ContadoresCartelera } from "../../src/lib/rutinas/agendas";
import { isoALocal } from "../../src/lib/fechas";
import { dormirDeVerdad, NOMBRE_FUENTE_CARTELERA, type NotaCartelera } from "../../src/lib/rutinas/carteleraCdmx";
import type { CiudadRutina, Contexto } from "../../src/lib/rutinas/lugares";
import { guardarInforme, requerida } from "./entorno";

const USO = "node scripts/instituciones/correr.mjs cartelera-cdmx --autor <id del admin> [--simular] [--ciudad <slug>] [--salida <carpeta>]";
/** Cada paso del guion: 10 minutos de lectura (unas 220 peticiones); al terminar cada uno se guarda el avance y se imprime. */
export const PASO_GUION_MS = 10 * 60_000;
/** Con --simular, todo en un solo paso (hasta 3 h). */
const SIMULACION_MS = 3 * 3600_000;
/** Lo que la corrida queda tomada mientras corre el guion (el latido no la toca); se renueva en cada paso. */
const OCUPADA_GUION_MS = 30 * 60_000;

type Escrita = { tabla: string; op: string; filas: unknown };

/**
 * La base solo para leer (--simular): lo que escribiría se anota y contesta «hecho» sin tocar nada. Solo se dejan pasar las funciones de la base
 * que leen.
 */
export function soloLectura(db: SupabaseClient, anotar: (e: Escrita) => void): SupabaseClient {
  const hecho = (): unknown => {
    const r = { data: null, error: null };
    const q: unknown = new Proxy(() => undefined, {
      get: (_, k) => (k === "then" ? (ok: (v: unknown) => unknown, mal: (e: unknown) => unknown) => Promise.resolve(r).then(ok, mal) : () => q),
      apply: () => q,
    });
    return q;
  };
  const LECTURAS = new Set(["eventos_parecidos"]);
  return new Proxy(db, {
    get(destino, k) {
      if (k === "from")
        return (tabla: string) => {
          const b = destino.from(tabla) as unknown as Record<string | symbol, unknown>;
          return new Proxy(b, {
            get(bd, bk) {
              if (bk === "insert" || bk === "update" || bk === "upsert" || bk === "delete")
                return (filas: unknown) => {
                  anotar({ tabla, op: String(bk), filas });
                  return hecho();
                };
              const v = bd[bk];
              return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(bd) : v;
            },
          });
        };
      if (k === "rpc")
        return (nombre: string, args: unknown) => {
          if (LECTURAS.has(nombre)) return destino.rpc(nombre, args as Record<string, unknown>);
          anotar({ tabla: nombre, op: "rpc", filas: args });
          return hecho();
        };
      return (destino as unknown as Record<string | symbol, unknown>)[k];
    },
  });
}

/** La hora de la ciudad de un instante guardado (ISO en UTC): «2026-10-25 11:00». */
export const horaDeLaCiudad = (iso: unknown): string => (typeof iso === "string" && !Number.isNaN(Date.parse(iso)) ? isoALocal(new Date(iso).toISOString(), ZONA_CDMX).replace("T", " ").slice(0, 16) : "—");
const ZONA_CDMX = "America/Mexico_City";

export type DatosInforme = {
  simular: boolean;
  ciudad: string;
  corrida: string | null;
  resumen: Record<string, unknown>;
  minutos: number;
  /** Lo que se escribiría (simulación) o se escribió: propuestas de evento y de lugar. */
  escritas: { eventos: number; lugares: number };
  muestra: { tipo: string; titulo: string; inicio: unknown; sesiones: number }[];
  sinHora: Extract<NotaCartelera, { tipo: "sin_hora" }>[];
  recintos: Extract<NotaCartelera, { tipo: "recinto" }>[];
  /** Las fichas que no se propusieron por `otra_ficha` o `no_guardada` (OL-451), con su enlace. */
  noPropuestas: Extract<NotaCartelera, { tipo: "no_propuesta" }>[];
};

const COMO: Record<string, string> = { exacto: "el mismo nombre", parecido: "nombre parecido", cercania: "cercanía" };

/** Los recintos que se pidió revisar (OL-451): si cruzan con el directorio. */
export const RECINTOS_A_REVISAR = ["Palacio de Bellas Artes", "Teatro de la Ciudad Esperanza Iris", "Museo de la Ciudad de México", "Colegio de San Ildefonso"];

/**
 * El informe, sin datos de personas. Las cuentas cuadran por ficha (OL-451): listados = ya propuestos antes + leídos + sin respuesta (+ por leer);
 * leídos = propuestos + cada motivo. Las horas, en la de la ciudad. Unos ejemplos sin hora y cómo cruzó cada recinto con el directorio.
 */
export function lineasDeInforme(o: DatosInforme): string[] {
  const r = o.resumen;
  const c = (r.cartelera ?? {}) as Partial<ContadoresCartelera>;
  const n = (v: unknown) => (typeof v === "number" ? v : 0);
  const motivos = (c.motivos ?? {}) as Record<string, number>;
  const sumaMotivos = Object.values(motivos).reduce((a, b) => a + n(b), 0);
  const porLeer = Array.isArray((r.cursor as { cartelera?: { pendientes?: unknown[] } } | undefined)?.cartelera?.pendientes) ? (r.cursor as { cartelera: { pendientes: unknown[] } }).cartelera.pendientes.length : 0;
  const verbo = o.simular ? "se escribirían" : "se escribieron";
  const lineas = [
    `# Cartelera de la Ciudad de México · ${o.simular ? "simulación (no se escribió nada)" : "carga"} · ${new Date().toISOString().slice(0, 16)}`,
    "",
    `Ciudad: ${o.ciudad}${o.corrida ? ` · corrida ${o.corrida}` : ""} · ${o.minutos} min · horas en la de la ciudad (${ZONA_CDMX})`,
    "",
    "## Las cuentas (por ficha: una ficha es una propuesta)",
    "",
    `- Eventos listados: ${n(c.eventos)} = ya propuestos antes (no se pidieron) ${n(c.ya_propuestos)} + fichas leídas ${n(c.leidas)} + sin respuesta ${n(c.fallidas)}${porLeer ? ` + por leer ${porLeer}` : ""}`,
    `- Fichas leídas: ${n(c.leidas)} = propuestas ${n(c.propuestos)} + no propuestas ${sumaMotivos}${n(c.leidas) === n(c.propuestos) + sumaMotivos ? "" : " (NO CUADRA)"}`,
    `- No propuestas, por motivo: ${Object.keys(motivos).length ? Object.entries(motivos).map(([m, v]) => `${m} ${v}`).join(" · ") : "ninguna"}`,
    `- Recintos nuevos como lugares: ${n(c.recintos_nuevos)}`,
    `- Funciones sumadas a la propuesta de su ficha (sesiones): ${n(r.sesiones)}`,
    `- En total ${verbo} **${o.escritas.eventos} propuestas de evento y ${o.escritas.lugares} de lugar** (fuente «${NOMBRE_FUENTE_CARTELERA}»).`,
    "",
    "## Por tipo de la cartelera",
    "",
    "| Tipo | Leídos | Propuestos |",
    "| --- | ---: | ---: |",
    ...Object.entries(c.por_tipo ?? {})
      .sort((a, b) => b[1].leidos - a[1].leidos)
      .map(([t, v]) => `| ${t} | ${v.leidos} | ${v.propuestos} |`),
  ];
  const avisos = Array.isArray(r.avisos) ? (r.avisos as string[]) : [];
  if (avisos.length) lineas.push("", "## Avisos", "", ...avisos.map((a) => `- ${a}`));
  if (o.sinHora.length)
    lineas.push("", `## Sin hora (${n(motivos.sin_hora)}; ${Math.min(10, o.sinHora.length)} ejemplos)`, "", ...o.sinHora.slice(0, 10).map((x) => `- «${x.titulo}» · ${x.url}\n  > ${x.descripcion.slice(0, 220) || "(sin descripción)"}`));
  // Cada recinto una vez: cómo cruzó.
  const unicos = [...new Map(o.recintos.map((x) => [x.id ?? x.nombre, x])).values()];
  const cruzados = unicos.filter((x) => x.lugar);
  const nuevos = unicos.filter((x) => !x.lugar);
  if (unicos.length) {
    lineas.push("", `## Recintos (${unicos.length}: ${cruzados.length} cruzan con el directorio, ${nuevos.length} no)`, "");
    for (const nombre of RECINTOS_A_REVISAR) {
      const x = unicos.find((u) => u.nombre === nombre);
      lineas.push(`- ${nombre}: ${!x ? "no vino en la cartelera" : x.lugar ? `cruza con «${x.lugar}»` : `NO cruza${x.cercano ? ` (lo más cercano: «${x.cercano.nombre}» a ${x.cercano.metros} m)` : ""}`}`);
    }
    // Todos los que cruzan, para revisarlos uno por uno: con qué lugar, a qué distancia y por qué.
    lineas.push(
      "",
      `Cruzan (${cruzados.length}): recinto de la cartelera → lugar del directorio · distancia · por qué`,
      "",
      ...cruzados.map((x) => `- ${x.nombre} → «${x.lugar}» · ${x.metros != null ? `${x.metros} m` : "sin punto"} · ${x.como ? COMO[x.como] : "—"}`),
    );
    lineas.push("", "No cruzan (con lo más cercano del directorio a menos de 1 km):", "", ...nuevos.slice(0, 60).map((x) => `- ${x.nombre}${x.cercano ? ` · cerca: «${x.cercano.nombre}» a ${x.cercano.metros} m` : ""}`));
  }
  const otras = o.noPropuestas.filter((x) => x.motivo === "otra_ficha");
  const noGuardadas = o.noPropuestas.filter((x) => x.motivo === "no_guardada");
  if (otras.length)
    lineas.push(
      "",
      `## Sumadas a otra ficha (${n(motivos.otra_ficha)})`,
      "",
      "La misma actividad listada en dos fichas, con el mismo título y en el mismo sitio: sus funciones se sumaron a la propuesta de la otra.",
      "",
      ...otras.map((x) => `- «${x.titulo}» · ${x.url}${x.con ? ` → se sumó a «${x.con}»` : ""}`),
    );
  if (noGuardadas.length || n(motivos.no_guardada))
    lineas.push(
      "",
      `## No guardadas (${n(motivos.no_guardada)})`,
      "",
      "Se iban a proponer, no tenían ningún motivo para quedar fuera y no quedó nada escrito: la base no guardó la propuesta (aviso «No se pudieron guardar algunas propuestas») o la corrida dejó de estar «corriendo» a medio paso. Hay que volver a leerlas.",
      "",
      ...noGuardadas.map((x) => `- «${x.titulo}» · ${x.url}`),
    );
  if (o.muestra.length) lineas.push("", `## Muestra (${o.muestra.length})`, "", ...o.muestra.map((m) => `- ${horaDeLaCiudad(m.inicio)} · ${m.tipo}${m.sesiones ? ` · ${m.sesiones} funciones` : ""} · ${m.titulo}`));
  return lineas;
}

async function main() {
  const args = process.argv.slice(2);
  const opcion = (nombre: string): string | undefined => {
    const k = args.indexOf(`--${nombre}`);
    return k >= 0 ? args[k + 1] : undefined;
  };
  const simular = args.includes("--simular");
  const autor = requerida(opcion("autor"), "--autor", USO);
  const salida = opcion("salida") ?? "scripts/instituciones/salida";
  const url = requerida(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL en .env", USO);
  const llave = requerida(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY en .env", USO);
  const real = createClient(url, llave, { auth: { persistSession: false, autoRefreshToken: false } });
  const escritas: Escrita[] = [];
  const db = simular ? soloLectura(real, (e) => escritas.push(e)) : real;

  // La ciudad: la del slug, o la que es Ciudad de México.
  const leidas = await real.from("ciudades").select("slug, nombre, lat, lng, zoom, zona, alias, estado, parametros");
  if (leidas.error) throw new Error("No se pudieron leer las ciudades");
  const filas = (leidas.data ?? []) as Record<string, unknown>[];
  const pedida = opcion("ciudad");
  const fila = filas.find((c) => (pedida ? c.slug === pedida : esCiudadDeMexico({ slug: String(c.slug), nombre: String(c.nombre), alias: Array.isArray(c.alias) ? (c.alias as string[]) : [] })));
  if (!fila) {
    console.error(pedida ? `No hay una ciudad «${pedida}».` : "No encontré Ciudad de México entre las ciudades.");
    process.exit(1);
  }
  const ciudad: CiudadRutina = {
    slug: String(fila.slug),
    nombre: String(fila.nombre),
    lat: typeof fila.lat === "number" ? fila.lat : null,
    lng: typeof fila.lng === "number" ? fila.lng : null,
    zoom: typeof fila.zoom === "number" ? fila.zoom : 13,
    zona: typeof fila.zona === "string" ? fila.zona : "America/Mexico_City",
    alias: Array.isArray(fila.alias) ? (fila.alias as string[]).filter((a) => typeof a === "string") : [],
    estado: String(fila.estado),
    parametros: leerParametrosCiudad(fila.parametros),
  };
  if (!esCiudadDeMexico(ciudad)) {
    console.error(`«${ciudad.nombre}» no es Ciudad de México: la cartelera es de esa ciudad.`);
    process.exit(1);
  }

  const parametros = { fuentes: ["agenda-cultura"], solo_cartelera: true };
  const empezo = Date.now();
  let corridaId: string | null = null;
  const ocupada = () => new Date(Date.now() + OCUPADA_GUION_MS).toISOString();
  if (!simular) {
    const r = await real
      .from("rutinas_corridas")
      .insert({ tipo: "agendas", ciudad: ciudad.slug, tope_usd: 0.01, creado_por: autor, parametros, estado: "corriendo", inicio: new Date().toISOString(), resumen: { turno: 1, ocupada_hasta: ocupada(), intentos: 0 } })
      .select("id")
      .single();
    if (r.error?.code === "23505") {
      console.error("Ya hay una búsqueda de agendas en curso en esta ciudad: espera a que termine o cancélala, y vuelve a correr el guion.");
      process.exit(1);
    }
    if (r.error || !r.data) throw new Error(`No se pudo crear la corrida: ${r.error?.message ?? "sin respuesta"}`);
    corridaId = (r.data as { id: string }).id;
    console.log(`Corrida ${corridaId} creada (agendas · ${ciudad.slug}, solo la cartelera).`);
  }

  let resumen: Record<string, unknown> = {};
  const notas: NotaCartelera[] = [];
  let turno = 1;
  for (let paso = 1; ; paso++) {
    const ctx: Contexto = {
      corrida: { id: corridaId ?? randomUUID(), tipo: "agendas", ciudad: ciudad.slug, parametros, tope_usd: 0.01, gasto_usd: 0, resumen },
      ciudad,
      db,
      api: null,
      mapbox: process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? { token: process.env.NEXT_PUBLIC_MAPBOX_TOKEN } : null,
      pedir: fetch,
      ahora: () => new Date(),
      // Simulando, de un tirón (lo «escrito» no queda en la base: un paso nuevo no lo vería); de verdad, por pasos que guardan el avance.
      hasta: Date.now() + (simular ? SIMULACION_MS : PASO_GUION_MS),
      gastar: () => undefined,
      gastado: () => 0,
      sigueCorriendo: async () => {
        if (!corridaId) return true;
        const r = await real.from("rutinas_corridas").select("estado").eq("id", corridaId).maybeSingle();
        return r.data?.estado === "corriendo";
      },
      dormir: dormirDeVerdad,
      anotarCartelera: (nota) => notas.push(nota),
    };
    const salidaPaso = await pasoAgendas(ctx);
    resumen = salidaPaso.resumen;
    const c = (resumen.cartelera ?? {}) as Partial<ContadoresCartelera>;
    const cursor = (resumen.cursor ?? {}) as { cartelera?: { pagina?: number; paginas?: number | null; pendientes?: unknown[] } };
    console.log(
      `Paso ${paso} · ${Math.round((Date.now() - empezo) / 60_000)} min · lista ${cursor.cartelera?.pagina ? cursor.cartelera.pagina - 1 : "—"}/${cursor.cartelera?.paginas ?? "—"} · fichas leídas ${c.leidas ?? 0}, por leer ${cursor.cartelera?.pendientes?.length ?? 0} · propuestos ${c.propuestos ?? 0} · recintos nuevos ${c.recintos_nuevos ?? 0}`,
    );
    if (corridaId) {
      turno++;
      const final = salidaPaso.terminada;
      const guardado: Record<string, unknown> = { ...resumen, turno, ocupada_hasta: final ? null : ocupada(), intentos: 0, actualizada: new Date().toISOString() };
      if (final) delete guardado.cursor;
      const r = await real
        .from("rutinas_corridas")
        .update({ resumen: guardado, ...(final ? { estado: "terminada", fin: new Date().toISOString() } : {}) })
        .eq("id", corridaId)
        .eq("estado", "corriendo")
        .select("id");
      if (r.error || !r.data?.length) {
        console.error("La corrida ya no está «corriendo» (¿la cancelaron?): el guion se detiene. Lo propuesto hasta aquí queda en la bandeja.");
        break;
      }
    }
    if (salidaPaso.terminada) break;
  }

  // Una muestra de lo propuesto (o de lo que se propondría).
  const deEventos: { id?: string; tipo: string; datos: Record<string, unknown> }[] = simular
    ? escritas.filter((e) => e.tabla === "propuestas" && e.op === "insert").flatMap((e) => (Array.isArray(e.filas) ? e.filas : [e.filas]) as { id?: string; tipo: string; datos: Record<string, unknown> }[])
    : (((await real.from("propuestas").select("id, tipo, datos").eq("corrida_id", corridaId!).limit(5000)).data ?? []) as { id?: string; tipo: string; datos: Record<string, unknown> }[]);
  const eventos = deEventos.filter((p) => p.tipo === "evento");
  const muestra = eventos.slice(0, 40).map((p) => ({
    tipo: String(p.datos.clase ?? "evento"),
    titulo: String(p.datos.titulo ?? ""),
    inicio: p.datos.inicio,
    sesiones: Array.isArray(p.datos.sesiones) ? p.datos.sesiones.length : 0,
  }));
  const lineas = lineasDeInforme({
    simular,
    ciudad: ciudad.nombre,
    corrida: corridaId,
    resumen,
    minutos: Math.round((Date.now() - empezo) / 60_000),
    escritas: { eventos: eventos.length, lugares: deEventos.filter((p) => p.tipo === "lugar").length },
    muestra,
    sinHora: notas.filter((x): x is Extract<NotaCartelera, { tipo: "sin_hora" }> => x.tipo === "sin_hora"),
    recintos: notas.filter((x): x is Extract<NotaCartelera, { tipo: "recinto" }> => x.tipo === "recinto"),
    noPropuestas: notas.filter((x): x is Extract<NotaCartelera, { tipo: "no_propuesta" }> => x.tipo === "no_propuesta"),
  });
  console.log(`\n${lineas.join("\n")}`);
  // Sin --simular, los ids de lo propuesto (para deshacer: borrar esas propuestas o la corrida entera).
  const entraron = deEventos.filter((p) => typeof p.id === "string").map((p) => ({ id: p.id!, nombre: String(p.datos.titulo ?? p.datos.nombre ?? "") }));
  const ruta = guardarInforme(salida, "cartelera-cdmx", lineas, entraron, simular);
  console.log(`\nInforme: ${ruta}`);
}

// Solo al correrlo (las pruebas importan las funciones sin correr nada).
if (/^cartelera-cdmx\.(m?js|ts)$/.test(basename(process.argv[1] ?? ""))) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
