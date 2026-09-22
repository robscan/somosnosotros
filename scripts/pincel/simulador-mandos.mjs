// somosnosotros · OL-088 · Pincel en la app, Fase 2 bloque 2 (bitácora 123, doc rediseno/25 ajuste 4).
// Corrida escalonada y corta contra el cupo real de Supabase Realtime del plan gratuito (gestión de cambios,
// revisión 2026-09-21, con la fuente citada en la bitácora 123): 200 conexiones simultáneas, 100 mensajes por
// segundo, 256 KB por mensaje, 2 000 000 de mensajes al mes (https://supabase.com/docs/guides/realtime/limits).
// SUBE hasta encontrar el límite en vez de empezar encima de él, y se DETIENE sola al primer indicio de que se
// pasó (errores de conexión, mensajes no confirmados, o menos del 95 % de lo mandado llega a la pared) — no
// sigue a la siguiente tanda. No escribe en ninguna tabla: Broadcast no las toca. Canal sin `private` y con
// nombre inequívoco de prueba, para que sea obvio en cualquier panel de Supabase que lo vea mientras corre.
//
// Uso: node scripts/pincel/simulador-mandos.mjs [--tandas-desde N]
// --tandas-desde 2 empieza en la tanda 2 (útil para reaprovechar una tanda anterior ya limpia sin repetirla).
// Lee NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY directamente de /Users/apple-1/somosnosotros/.env
// (la ruta del proyecto principal, NUNCA copiado a esta carpeta), solo esas dos variables, solo en este proceso,
// sin imprimirlas ni guardarlas en ningún archivo. Nunca lee ni usa SUPABASE_SERVICE_ROLE_KEY ni ninguna otra
// variable de ese archivo — la llave anónima es pública por diseño (viaja en el navegador de cualquier
// visitante); la de servicio no se toca aquí.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

export const RUTA_ENV_REAL = "/Users/apple-1/somosnosotros/.env";

export function leerDosVariables(ruta, nombres) {
  const texto = readFileSync(ruta, "utf8"); // nunca se guarda ni se loguea; vive solo en esta variable local
  const valores = {};
  for (const linea of texto.split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(linea.trim());
    if (m && nombres.includes(m[1]) && !(m[1] in valores)) valores[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return valores;
}

// ---------- el plan escalonado (gestión de cambios, 2026-09-21): sube hasta encontrar el límite ----------
const SEGUNDOS_POR_TANDA = 10;
const PAUSA_ENTRE_TANDAS_MS = 10_000;
const UMBRAL_PERDIDA = 0.05; // 5 %: por encima de esto, o con errores de conexión/envío, se detiene sola
const TANDAS = [
  { mandos: 10, hz: 2 }, // 20 mensajes/s
  { mandos: 20, hz: 2 }, // 40 mensajes/s
  { mandos: 40, hz: 2 }, // 80 mensajes/s
  { mandos: 60, hz: 2 }, // 120 mensajes/s — ya por encima del cupo citado (100/s)
];

const TRAZOS = ["trazo", "aire", "spray", "organico"];
const TINTAS = ["#141414", "#e4552f", "#286b57", "#6d4fc2", "#dfb32f"];

function mensajeAlAzar() {
  // Un delta por mensaje basta para medir el cupo (el arreglo agrupado de MensajeTrazo no cambia cuántos
  // mensajes por segundo se mandan, que es lo que se está midiendo aquí).
  return {
    trazo: TRAZOS[Math.floor(Math.random() * TRAZOS.length)],
    color: TINTAS[Math.floor(Math.random() * TINTAS.length)],
    deltas: [{ dx: Math.random() * 2 - 1, dy: Math.random() * 2 - 1 }],
    ts: Date.now(), // solo para medir latencia en esta corrida; no es parte de MensajeTrazo
  };
}

export function percentil(valoresOrdenados, p) {
  if (valoresOrdenados.length === 0) return null;
  const i = Math.min(valoresOrdenados.length - 1, Math.ceil((p / 100) * valoresOrdenados.length) - 1);
  return valoresOrdenados[Math.max(0, i)];
}

/**
 * Conecta un canal y resuelve UNA sola vez con el primer estado que importa (`SUBSCRIBED`, o un fallo real antes
 * de llegar a abrir). Cualquier cambio de estado DESPUÉS de ese primero se ignora — en particular el `CLOSED`
 * que dispara `unsubscribe()` al terminar una tanda, que es un cierre ordenado, no un fallo (bug medido en la
 * corrida del 2026-09-21: sin este candado, cada cierre normal se contaba otra vez como error de conexión y
 * frenaba la corrida sin motivo real). `timeoutMs` es una red de seguridad: si el canal nunca manda ningún
 * estado, no se cuelga la corrida para siempre.
 */
export function conectarCanal(canal, { timeoutMs = 8000 } = {}) {
  return new Promise((resuelve) => {
    let resuelto = false;
    const marcar = (ok, estado) => {
      if (resuelto) return;
      resuelto = true;
      clearTimeout(temporizador);
      resuelve({ ok, estado });
    };
    const temporizador = setTimeout(() => marcar(false, "TIMEOUT_LOCAL"), timeoutMs);
    canal.subscribe((estado) => {
      if (estado === "SUBSCRIBED") marcar(true, estado);
      else if (estado === "CHANNEL_ERROR" || estado === "TIMED_OUT" || estado === "CLOSED") marcar(false, estado);
    });
  });
}

// Margen tras el último mensaje antes de medir pérdida y desconectar (gestión de cambios, revisión 2026-09-21,
// punto 2): un mensaje mandado justo antes de que termine la tanda puede seguir "en vuelo" cuando se cuenta lo
// recibido. La p95 de la tanda 1 fue 279 ms; 2 s de margen deja de sobra hasta para tandas más cargadas, sin
// alargar mucho la corrida (10 s de tanda + 2 s de margen, no 1 s).
const MARGEN_TRAS_ULTIMO_ENVIO_MS = 2000;

async function correrTanda({ mandos: n, hz, url, anon, canal: CANAL }) {
  function clienteMando() {
    const supabase = createClient(url, anon, { realtime: { params: { eventsPerSecond: 10 } } });
    return supabase.channel(CANAL, { config: { private: false, broadcast: { self: false, ack: true } } });
  }
  const resultado = {
    tanda: `${n} mandos × ${hz} Hz`,
    mensajesPorSegundoObjetivo: n * hz,
    conexionesLogradas: 0,
    erroresDeConexion: 0,
    mandados: 0,
    fallosAlMandar: 0,
    recibidosPorLaPared: 0,
    latenciaMedianaMs: null,
    latenciaP95Ms: null,
  };
  const latencias = [];

  const pared = clienteMando();
  pared.on("broadcast", { event: "trazo" }, ({ payload }) => {
    resultado.recibidosPorLaPared++;
    if (typeof payload?.ts === "number") latencias.push(Date.now() - payload.ts);
  });
  const paredConectada = await conectarCanal(pared);
  if (!paredConectada.ok) resultado.erroresDeConexion++;

  const mandos = [];
  const conexiones = await Promise.all(
    Array.from({ length: n }, () => clienteMando()).map(async (canal) => {
      const r = await conectarCanal(canal);
      if (r.ok) {
        resultado.conexionesLogradas++;
        mandos.push(canal);
      } else {
        resultado.erroresDeConexion++;
      }
      return r;
    }),
  );
  void conexiones;

  const finEn = Date.now() + SEGUNDOS_POR_TANDA * 1000;
  const intervalos = mandos.map((canal) =>
    setInterval(async () => {
      if (Date.now() > finEn) return;
      try {
        const r = await canal.send({ type: "broadcast", event: "trazo", payload: mensajeAlAzar() });
        resultado.mandados++;
        if (r !== "ok") resultado.fallosAlMandar++;
      } catch {
        resultado.fallosAlMandar++;
      }
    }, Math.round(1000 / hz)),
  );
  await new Promise((resuelve) => setTimeout(resuelve, SEGUNDOS_POR_TANDA * 1000 + MARGEN_TRAS_ULTIMO_ENVIO_MS));
  intervalos.forEach(clearInterval);

  latencias.sort((a, b) => a - b);
  resultado.latenciaMedianaMs = percentil(latencias, 50);
  resultado.latenciaP95Ms = percentil(latencias, 95);

  await Promise.all([...mandos, pared].map((canal) => canal.unsubscribe()));

  const tasaDePerdida = resultado.mandados > 0 ? 1 - resultado.recibidosPorLaPared / resultado.mandados : 1;
  const pasoElLimite = resultado.erroresDeConexion > 0 || resultado.fallosAlMandar > 0 || tasaDePerdida > UMBRAL_PERDIDA;
  return { resultado, pasoElLimite, tasaDePerdida, conexionesTotales: resultado.conexionesLogradas + (paredConectada.ok ? 1 : 0) };
}

async function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf("--tandas-desde");
  // "empieza en la 2" (gestión de cambios, revisión 2026-09-21): reaprovecha la tanda 1 (ya limpia, 190/190,
  // 0 % de pérdida) sin volver a correrla; por defecto sigue empezando en la 1.
  const desde = i === -1 ? 1 : Number(args[i + 1]);
  const tandas = TANDAS.slice(Math.max(0, desde - 1));
  if (tandas.length === 0) {
    console.error(`--tandas-desde ${desde} no deja ninguna tanda por correr (hay ${TANDAS.length}).`);
    process.exit(1);
  }

  let url, anon;
  try {
    const vars = leerDosVariables(RUTA_ENV_REAL, ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
    url = vars.NEXT_PUBLIC_SUPABASE_URL;
    anon = vars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  } catch (error) {
    console.error(`No se pudo leer ${RUTA_ENV_REAL}: ${error.message}`);
    process.exit(1);
  }
  if (!url || !anon) {
    console.error(`Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en ${RUTA_ENV_REAL}.`);
    process.exit(1);
  }

  const HOY = new Date().toISOString().slice(0, 10);
  const CANAL = `prueba-cupo-${HOY}-${Date.now().toString(36).slice(-4)}`;

  console.log(`Simulador de mandos — canal "${CANAL}" (sin private, sin tocar tablas)`);
  console.log(`Cupo citado (plan gratuito): 200 conexiones, 100 mensajes/s, 256 KB/mensaje, 2 000 000 mensajes/mes.`);
  console.log(`Empieza en la tanda ${desde} de ${TANDAS.length}. ${tandas.length} tanda(s) de ${SEGUNDOS_POR_TANDA} s, pausa de ${PAUSA_ENTRE_TANDAS_MS / 1000} s entre cada una; se detiene sola al pasar el ${UMBRAL_PERDIDA * 100}% de pérdida o al primer error.\n`);

  const resultados = [];
  let conexionesMaximas = 0;
  for (const tanda of tandas) {
    console.log(`Tanda: ${tanda.mandos} mandos × ${tanda.hz} Hz (objetivo ${tanda.mandos * tanda.hz} mensajes/s)…`);
    const { resultado, pasoElLimite, tasaDePerdida, conexionesTotales } = await correrTanda({ ...tanda, url, anon, canal: CANAL });
    resultados.push(resultado);
    conexionesMaximas = Math.max(conexionesMaximas, conexionesTotales);
    console.log(`  conexiones: ${resultado.conexionesLogradas}/${tanda.mandos} (errores: ${resultado.erroresDeConexion})`);
    console.log(`  mandados: ${resultado.mandados}, fallos al mandar: ${resultado.fallosAlMandar}`);
    console.log(`  recibidos por la pared: ${resultado.recibidosPorLaPared} (pérdida ${(tasaDePerdida * 100).toFixed(1)}%)`);
    console.log(`  latencia mediana: ${resultado.latenciaMedianaMs ?? "sin datos"} ms · p95: ${resultado.latenciaP95Ms ?? "sin datos"} ms\n`);
    if (pasoElLimite) {
      console.log(`⚠ Esta tanda pasó el límite (errores de conexión/envío o más del ${UMBRAL_PERDIDA * 100}% de pérdida). Deteniendo la corrida aquí, sin seguir a la siguiente tanda.\n`);
      break;
    }
    if (tanda !== tandas[tandas.length - 1]) await new Promise((resuelve) => setTimeout(resuelve, PAUSA_ENTRE_TANDAS_MS));
  }

  const totalMandados = resultados.reduce((a, r) => a + r.mandados, 0);
  const totalRecibidos = resultados.reduce((a, r) => a + r.recibidosPorLaPared, 0);
  const totalErrores = resultados.reduce((a, r) => a + r.erroresDeConexion + r.fallosAlMandar, 0);

  console.log("Resumen por tanda:");
  console.table(resultados);
  console.log(`\nTotales: ${totalMandados} mensajes mandados, ${totalRecibidos} recibidos por la pared, conexiones máximas simultáneas: ${conexionesMaximas}, errores/fallos totales: ${totalErrores}.`);
  process.exit(0);
}

// Correr solo cuando se invoca directamente (`node scripts/pincel/simulador-mandos.mjs`), nunca al importar sus
// funciones puras (`conectarCanal`, `percentil`, `leerDosVariables`) desde el banco de pruebas.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("El simulador falló:", error.message);
    process.exit(1);
  });
}
