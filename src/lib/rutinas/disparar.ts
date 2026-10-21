/**
 * Dispara un paso del motor sin esperar al cron (OL-428): al crear una corrida (la hoja «Correr») y al terminar un paso que dejó trabajo.
 * Llama a `/api/rutinas/correr` con `CRON_SECRET` desde el servidor, nunca desde el navegador. El secreto solo viaja a un sitio propio:
 * en producción, somosnosotros.org; fuera de ella, el host de la petición si es uno de los de Vercel de este despliegue o la Mac (localhost).
 * Cualquier otro host (una cabecera manipulada) no recibe nada. Sin secreto no dispara y lo dice en el registro; nunca lanza.
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

export type Disparo = "disparado" | "sin secreto" | "sin origen" | "falló";

/** Pide un paso. La ruta responde enseguida (corre el paso después de responder), así que se espera poco. */
export async function dispararPaso(
  origen: string | null,
  opciones: { secreto?: string; pedir?: typeof fetch; avisar?: (texto: string) => void } = {},
): Promise<Disparo> {
  const secreto = "secreto" in opciones ? opciones.secreto : process.env.CRON_SECRET;
  const avisar = opciones.avisar ?? ((t: string) => console.warn(t));
  if (!secreto) {
    avisar("rutinas: falta CRON_SECRET; la corrida espera al cron");
    return "sin secreto";
  }
  if (!origen) {
    avisar("rutinas: no se reconoce el sitio; la corrida espera al cron");
    return "sin origen";
  }
  try {
    const r = await (opciones.pedir ?? fetch)(`${origen}/api/rutinas/correr`, {
      method: "POST",
      headers: { authorization: `Bearer ${secreto}` },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    return r.ok ? "disparado" : "falló";
  } catch {
    return "falló";
  }
}
