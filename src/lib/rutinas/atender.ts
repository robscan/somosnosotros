import { autorizadoPorSecreto } from "../autorizacionCron";
import type { ResultadoPaso } from "./motor";

/**
 * Lo que hace `/api/rutinas/correr` (OL-428), sin Next para poder probarlo: sin el secreto, 401. Con él, responde enseguida (202) y corre UN
 * paso después de responder (`after()`), así quien la llama —el cron de Vercel, la hoja «Correr», el paso anterior o Ciudades al ver una
 * corrida varada— no espera. Si el paso tomó una corrida, al terminar pide el siguiente (`encadenar`) con lo que le queda a la función para
 * reintentar (OL-429): una corrida avanza paso a paso sin esperar al cron diario. Con `?esperar=1` corre el paso y devuelve su resultado.
 */
export type DependenciasRuta = {
  secreto: string | undefined;
  correr: () => Promise<ResultadoPaso>;
  /** `after()` de Next: corre la tarea después de responder. */
  despues: (tarea: () => Promise<unknown>) => void;
  /** Pide el siguiente paso; `hasta` es cuándo se acaba la función (Date.now()). */
  encadenar: (hasta: number) => Promise<unknown>;
  /** Cuánto puede durar la función (su `maxDuration`), en ms. */
  limiteMs: number;
  ahora?: () => number;
};

/** Lo que se deja al final de la función para cerrarla bien. */
const MARGEN_MS = 3_000;

export async function atenderCorrer(request: Request, d: DependenciasRuta): Promise<Response> {
  const ahora = d.ahora ?? Date.now;
  const hasta = ahora() + d.limiteMs - MARGEN_MS;
  if (!autorizadoPorSecreto(request.headers, d.secreto)) return new Response("No autorizado", { status: 401 });
  const esperar = new URL(request.url).searchParams.get("esperar") === "1";
  if (esperar) {
    try {
      const r = await d.correr();
      if (r.corrida) d.despues(() => d.encadenar(hasta));
      return Response.json({ ok: true, ...r });
    } catch {
      return Response.json({ ok: false, error: "motor_no_disponible" }, { status: 503 });
    }
  }
  d.despues(async () => {
    try {
      const r = await d.correr();
      if (r.corrida) await d.encadenar(hasta);
    } catch {
      console.warn("rutinas: el paso no se pudo correr; lo retoma Ciudades o el cron");
    }
  });
  return Response.json({ ok: true, aceptado: true }, { status: 202 });
}
