/**
 * Dispara un paso del motor sin esperar al latido (OL-428): al crear una corrida (la hoja «Correr») y cuando Ciudades o Corridas encuentran
 * una corrida varada (OL-429, `rescate.ts`). Un paso ya no la usa para pedir el siguiente (OL-444: Vercel cortaba esa cadena con 508). Llama a `/api/rutinas/correr` con `CRON_SECRET` desde el
 * servidor, nunca desde el navegador. El secreto solo viaja a un sitio propio: en producción, somosnosotros.org; fuera de ella, el host de la
 * petición si es uno de los de Vercel de este despliegue o la Mac (localhost). Cualquier otro host (una cabecera manipulada) no recibe nada.
 *
 * La cadena de pasos es un solo hilo: cada paso pide el siguiente una vez. Si esa petición se pierde (la noche del 20 de octubre, con la puesta
 * en producción de #546 a medias, una corrida de San Luis se quedó «corriendo» siete minutos), nadie la volvía a pedir hasta el cron del día
 * siguiente y no quedaba rastro. Por eso (OL-429): hasta tres intentos dentro del tiempo que le queda a la función (un 401 no se reintenta: el
 * secreto no cambia), la respuesta se cierra sin leerla y, si no se logra, una línea en el registro del servidor con el motivo. Nunca lanza.
 *
 * OL-444: un 508 («Loop Detected») es Vercel diciendo que la petición viene de una cadena de la misma función; reintentar no sirve y no es un
 * fallo de la corrida: se deja al latido de Supabase (cada minuto, mientras haya corridas vivas) y se dice así en el registro.
 */

export const ORIGEN_PRODUCCION = "https://somosnosotros.org";
const PROPIOS = ["somosnosotros.org", "www.somosnosotros.org"];

type Entorno = Record<string, string | undefined>;

/** El origen al que se puede mandar el secreto, o null. */
export function origenPropio(host: string | null | undefined, protocolo: string | null | undefined, env: Entorno = process.env): string | null {
  if (env.VERCEL_ENV === "production") return ORIGEN_PRODUCCION;
  const h = (host ?? "").trim().toLowerCase();
  if (!h || !/^[a-z0-9.-]+(:\d{1,5})?$/.test(h)) return null;
  if (/^(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(h)) return `${protocolo === "https" ? "https" : "http"}://${h}`;
  const deVercel = [env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL].filter((x): x is string => !!x).map((x) => x.toLowerCase());
  return PROPIOS.includes(h) || deVercel.includes(h) ? `https://${h}` : null;
}

export type Disparo = "disparado" | "sin secreto" | "sin origen" | "rechazado" | "cortado" | "falló";

/** Cuánto espera cada intento la respuesta (la ruta responde 202 enseguida y corre el paso después de responder). */
export const PLAZO_INTENTO_MS = 8_000;
/** Las pausas entre intentos. */
export const PAUSAS_MS = [1_000, 3_000] as const;
/** Con menos de esto por delante no se intenta: la función se acaba antes de saber si llegó. */
const MINIMO_MS = 1_500;

export type OpcionesDisparo = {
  /** La ruta que se pide: la del motor de rutinas (por omisión) o la de la cola de redes (OL-465), con el mismo secreto. */
  ruta?: "/api/rutinas/correr" | "/api/redes/correr";
  secreto?: string;
  pedir?: typeof fetch;
  avisar?: (texto: string) => void;
  /** Hasta cuándo (Date.now()) puede durar todo, reintentos incluidos; por omisión, lo que tarden tres intentos. */
  hasta?: number;
  intentos?: number;
  /** Para las pruebas: la espera entre intentos y el reloj. */
  esperar?: (ms: number) => Promise<void>;
  ahora?: () => number;
};

const dormir = (ms: number) => new Promise<void>((listo) => setTimeout(listo, ms));

/** Pide un paso. Devuelve qué pasó; si no se pudo, lo dice en el registro (sin el secreto ni la dirección). */
export async function dispararPaso(origen: string | null, opciones: OpcionesDisparo = {}): Promise<Disparo> {
  const secreto = "secreto" in opciones ? opciones.secreto : process.env.CRON_SECRET;
  const avisar = opciones.avisar ?? ((t: string) => console.warn(t));
  const ahora = opciones.ahora ?? Date.now;
  const esperar = opciones.esperar ?? dormir;
  if (!secreto) {
    avisar("rutinas: falta CRON_SECRET; la corrida espera al latido");
    return "sin secreto";
  }
  if (!origen) {
    avisar("rutinas: no se reconoce el sitio; la corrida espera al latido");
    return "sin origen";
  }
  const intentos = Math.max(1, opciones.intentos ?? 3);
  const hasta = opciones.hasta ?? ahora() + intentos * PLAZO_INTENTO_MS + PAUSAS_MS.reduce((s, p) => s + p, 0);
  let motivo = "sin tiempo";
  for (let i = 0; i < intentos; i++) {
    if (i > 0) {
      const pausa = PAUSAS_MS[Math.min(i - 1, PAUSAS_MS.length - 1)];
      if (hasta - ahora() < pausa + MINIMO_MS) break;
      await esperar(pausa);
    }
    const queda = hasta - ahora();
    if (queda < MINIMO_MS) break;
    try {
      const r = await (opciones.pedir ?? fetch)(`${origen}${opciones.ruta ?? "/api/rutinas/correr"}`, {
        method: "POST",
        headers: { authorization: `Bearer ${secreto}` },
        signal: AbortSignal.timeout(Math.min(PLAZO_INTENTO_MS, queda)),
        cache: "no-store",
      });
      // La respuesta no se lee: se cierra para no dejar la conexión ocupada.
      await r.body?.cancel().catch(() => undefined);
      if (r.ok) return "disparado";
      motivo = `respondió ${r.status}`;
      if (r.status === 508) {
        avisar("rutinas: Vercel cortó la cadena (508); lo retoma el latido de Supabase");
        return "cortado";
      }
      if (r.status === 401 || r.status === 403) {
        avisar(`rutinas: el motor no aceptó el secreto (${r.status}); la corrida espera al latido`);
        return "rechazado";
      }
    } catch {
      motivo = "no respondió";
    }
  }
  avisar(`rutinas: no se pudo pedir el paso (${motivo}); lo retoma el latido de Supabase`);
  return "falló";
}
