// somosnosotros · OL-088 · Pincel en la app, Fase 2 bloque 2 (bitácora 123, doc rediseno/25 ajuste 4).
// Finge 20/50/100 mandos mandando al canal en vivo de una obra, para medir el cupo real de Supabase Realtime
// (mensajes por segundo, conexiones simultáneas, qué pasa al pasarse) antes de fijar la tasa de mensajes del
// mando de verdad. No toca ninguna tabla: solo abre canales de Broadcast y los cierra al terminar.
//
// Uso:
//   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
//     node scripts/pincel/simulador-mandos.mjs [--tandas 20,50,100] [--hz 9] [--segundos 20] [--canal obra:prueba-x]
//
// Sin --privado (por defecto): abre un canal SIN `private: true`, así que no exige sesión — mide el cupo bruto
// del servicio de Realtime del proyecto (conexiones y mensajes por segundo), que es el dato que decide la tasa
// y el límite de participantes. No hay manera de fabricar aquí N sesiones reales sin la llave de servicio (que
// este árbol nunca tiene, por regla del proyecto); si hace falta medir también el costo de verificar RLS en
// `realtime.messages` (canales `private: true`, los que usa la app de verdad), correrlo con --privado y --token
// <jwt de una cuenta real>, una sola sesión repetida en las N conexiones (basta para que RLS se evalúe en cada
// una; no hace falta que cada "mando" sea una persona distinta para medir el costo del lado del servidor).
//
// Nunca escribe en ninguna tabla. El nombre del canal por defecto lleva "prueba" para que sea obvio en cualquier
// panel de Supabase que lo vea mientras corre.

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
function arg(nombre, porDefecto) {
  const i = args.indexOf(`--${nombre}`);
  return i === -1 ? porDefecto : args[i + 1];
}
const privado = args.includes("--privado");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno.");
  console.error("La llave anónima es pública (va en el navegador): pedirla a gestión de cambios, no es un secreto.");
  process.exit(1);
}
const token = arg("token", null);
if (privado && !token) {
  console.error("--privado exige --token <jwt de una cuenta real>: un canal private:true no admite anon.");
  process.exit(1);
}

const TANDAS = (arg("tandas", "20,50,100") + "").split(",").map((n) => Number(n.trim()));
const HZ = Number(arg("hz", "9"));
const SEGUNDOS = Number(arg("segundos", "20"));
const CANAL = arg("canal", `obra:prueba-${Date.now().toString(36)}`);
const PAUSA_ENTRE_TANDAS_MS = 5000;

const TRAZOS = ["trazo", "aire", "spray", "organico"];
const TINTAS = ["#141414", "#e4552f", "#286b57", "#6d4fc2", "#dfb32f"];

function mensajeAlAzar() {
  return {
    trazo: TRAZOS[Math.floor(Math.random() * TRAZOS.length)],
    color: TINTAS[Math.floor(Math.random() * TINTAS.length)],
    dx: Math.random() * 2 - 1,
    dy: Math.random() * 2 - 1,
    ts: Date.now(),
  };
}

function clienteMando() {
  const opciones = { realtime: { params: { eventsPerSecond: HZ + 2 } } };
  if (privado) opciones.global = { headers: { Authorization: `Bearer ${token}` } };
  const supabase = createClient(url, anon, opciones);
  if (privado) supabase.realtime.setAuth(token);
  return supabase.channel(CANAL, { config: { private: privado, broadcast: { self: false, ack: false } } });
}

/** Abre N canales "mando" y uno "pared" que solo escucha; cada mando manda a HZ por segundo durante SEGUNDOS. */
async function correrTanda(n) {
  const resultado = {
    tanda: n,
    canal: CANAL,
    hz: HZ,
    segundos: SEGUNDOS,
    conexionesLogradas: 0,
    erroresDeConexion: 0,
    mandados: 0,
    fallosAlMandar: 0,
    recibidosPorLaPared: 0,
    latenciaMsPromedio: null,
    latenciasMs: [],
  };

  // ---------- la pared: solo escucha y cuenta ----------
  const pared = clienteMando();
  let paredLista = false;
  pared.on("broadcast", { event: "trazo" }, ({ payload }) => {
    resultado.recibidosPorLaPared++;
    if (typeof payload?.ts === "number") resultado.latenciasMs.push(Date.now() - payload.ts);
  });
  await new Promise((resuelve) => {
    pared.subscribe((estado) => {
      if (estado === "SUBSCRIBED") {
        paredLista = true;
        resuelve();
      }
      if (estado === "CHANNEL_ERROR" || estado === "TIMED_OUT") resuelve(); // se cuenta como fallo más abajo
    });
  });
  if (!paredLista) {
    resultado.erroresDeConexion++;
    console.error(`  ⚠ la pared de prueba no pudo suscribirse (tanda ${n})`);
  }

  // ---------- los N mandos ----------
  const mandos = [];
  await Promise.all(
    Array.from({ length: n }, () => clienteMando()).map(
      (canal) =>
        new Promise((resuelve) => {
          canal.subscribe((estado) => {
            if (estado === "SUBSCRIBED") {
              resultado.conexionesLogradas++;
              mandos.push(canal);
              resuelve();
            } else if (estado === "CHANNEL_ERROR" || estado === "TIMED_OUT" || estado === "CLOSED") {
              resultado.erroresDeConexion++;
              resuelve();
            }
          });
        }),
    ),
  );
  console.log(`  conexiones logradas: ${resultado.conexionesLogradas}/${n} (errores: ${resultado.erroresDeConexion})`);

  // ---------- cada mando manda a HZ por segundo durante SEGUNDOS ----------
  const finEn = Date.now() + SEGUNDOS * 1000;
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
    }, Math.round(1000 / HZ)),
  );
  await new Promise((resuelve) => setTimeout(resuelve, SEGUNDOS * 1000 + 500));
  intervalos.forEach(clearInterval);

  if (resultado.latenciasMs.length > 0) {
    resultado.latenciaMsPromedio = Math.round(resultado.latenciasMs.reduce((a, b) => a + b, 0) / resultado.latenciasMs.length);
  }
  delete resultado.latenciasMs; // ya se resumió en latenciaMsPromedio; no hace falta imprimir cada muestra

  // ---------- cerrar todo antes de la siguiente tanda ----------
  await Promise.all([...mandos, pared].map((canal) => canal.unsubscribe()));
  return resultado;
}

async function main() {
  console.log(`Simulador de mandos — canal "${CANAL}"${privado ? " (private: true, con el token dado)" : " (sin RLS: mide el cupo bruto)"}`);
  console.log(`Tandas: ${TANDAS.join(", ")} · ${HZ} Hz · ${SEGUNDOS} s cada una\n`);
  const resultados = [];
  for (const n of TANDAS) {
    console.log(`Tanda de ${n} mandos…`);
    const r = await correrTanda(n);
    resultados.push(r);
    console.log(`  mandados: ${r.mandados}, fallos al mandar: ${r.fallosAlMandar}`);
    console.log(`  recibidos por la pared: ${r.recibidosPorLaPared} (${((r.recibidosPorLaPared / Math.max(r.mandados, 1)) * 100).toFixed(1)}%)`);
    console.log(`  latencia promedio: ${r.latenciaMsPromedio ?? "sin datos"} ms\n`);
    if (n !== TANDAS[TANDAS.length - 1]) await new Promise((resuelve) => setTimeout(resuelve, PAUSA_ENTRE_TANDAS_MS));
  }
  console.log("Resumen:");
  console.table(resultados);
  process.exit(0);
}

main().catch((error) => {
  console.error("El simulador falló:", error);
  process.exit(1);
});
