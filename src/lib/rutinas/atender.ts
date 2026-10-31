import { autorizadoPorSecreto } from "../autorizacionCron";
import type { ResultadoPaso } from "./motor";

/**
 * Lo que hace `/api/rutinas/correr` (OL-428), sin Next para poder probarlo: sin el secreto, 401. Con él, responde enseguida (202) y corre los
 * pasos después de responder (`after()`), así quien la llama —el latido de Supabase cada minuto, la hoja «Correr», Ciudades al ver una corrida
 * varada o el cron diario de Vercel— no espera. Con `?esperar=1` corre UN paso y devuelve su resultado (para probar a mano).
 *
 * OL-444: antes, cada paso pedía el siguiente llamando otra vez a esta misma ruta por la red (`encadenar`). Vercel ve en eso una función que se
 * llama a sí misma y, a la tercera o cuarta vuelta, la corta con 508 («Loop Detected»): la corrida se quedaba «corriendo» hasta que alguien
 * abría Ciudades o llegaba el cron del día siguiente (registros del 22 de octubre). Ahora un paso nunca llama a la ruta: la misma función da
 * el siguiente paso mientras le quede tiempo para el más largo (`pasoMaximoMs`), y lo que no le cabe lo retoma el latido de Supabase
 * (`pg_cron` + `pg_net`, migración 20261022120000), que llama a esta ruta cada minuto solo si hay corridas vivas.
 */
export type DependenciasRuta = {
  secreto: string | undefined;
  correr: () => Promise<ResultadoPaso>;
  /** OL-489: antes de dar pasos, deja las corridas semanales que tocan (`semanales.ts`). Nunca debe tumbar la llamada. */
  programar?: () => Promise<unknown>;
  /** `after()` de Next: corre la tarea después de responder. */
  despues: (tarea: () => Promise<unknown>) => void;
  /** Cuánto puede durar la función (su `maxDuration`), en ms. */
  limiteMs: number;
  /** Lo que puede tardar el paso más largo: solo se da otro paso si cabe entero antes de que se acabe la función. */
  pasoMaximoMs: number;
  /** Como mucho, cuántos pasos da una llamada (por omisión `MAX_PASOS_POR_LLAMADA`). */
  maxPasos?: number;
  ahora?: () => number;
};

/** Lo que se deja al final de la función para cerrarla bien. */
const MARGEN_MS = 3_000;
/** Un tope de pasos por llamada, por si un paso vuelve enseguida una y otra vez (un tropiezo de la base). */
export const MAX_PASOS_POR_LLAMADA = 12;

/** Los pasos de una llamada: uno, y otro más mientras haya una corrida que tomar y quepa el paso más largo. Devuelve cuántos dio. */
export async function pasosSeguidos(d: Pick<DependenciasRuta, "correr" | "pasoMaximoMs" | "maxPasos">, hasta: number, ahora: () => number): Promise<number> {
  const max = Math.max(1, d.maxPasos ?? MAX_PASOS_POR_LLAMADA);
  let n = 0;
  while (n < max) {
    const r = await d.correr();
    if (!r.corrida) break;
    n++;
    if (ahora() + d.pasoMaximoMs > hasta) break;
  }
  return n;
}

export async function atenderCorrer(request: Request, d: DependenciasRuta): Promise<Response> {
  const ahora = d.ahora ?? Date.now;
  const hasta = ahora() + d.limiteMs - MARGEN_MS;
  if (!autorizadoPorSecreto(request.headers, d.secreto)) return new Response("No autorizado", { status: 401 });
  const esperar = new URL(request.url).searchParams.get("esperar") === "1";
  const programar = async () => {
    try {
      await d.programar?.();
    } catch {
      console.warn("rutinas: no se pudieron dejar las corridas semanales");
    }
  };
  if (esperar) {
    try {
      await programar();
      const r = await d.correr();
      return Response.json({ ok: true, ...r });
    } catch {
      return Response.json({ ok: false, error: "motor_no_disponible" }, { status: 503 });
    }
  }
  d.despues(async () => {
    await programar();
    try {
      await pasosSeguidos(d, hasta, ahora);
    } catch {
      console.warn("rutinas: el paso no se pudo correr; lo retoma el latido de Supabase");
    }
  });
  return Response.json({ ok: true, aceptado: true }, { status: 202 });
}
