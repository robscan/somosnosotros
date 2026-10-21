import { autorizadoPorSecreto } from "../autorizacionCron";
import type { ResultadoPaso } from "./motor";

/**
 * Lo que hace `/api/rutinas/correr` (OL-428), sin Next para poder probarlo: sin el secreto, 401. Con él, responde enseguida (202) y corre UN
 * paso después de responder (`after()`), así quien la llama —el cron de Vercel, la hoja «Correr» o el paso anterior— no espera los 45 s.
 * Si el paso tomó una corrida, al terminar pide el siguiente (`encadenar`): una corrida avanza paso a paso sin esperar al cron, y el cron de
 * cada 5 minutos la retoma si la cadena se corta. Con `?esperar=1` corre el paso y devuelve su resultado (para probar a mano).
 */
export type DependenciasRuta = {
  secreto: string | undefined;
  correr: () => Promise<ResultadoPaso>;
  /** `after()` de Next: corre la tarea después de responder. */
  despues: (tarea: () => Promise<unknown>) => void;
  encadenar: () => Promise<unknown>;
};

export async function atenderCorrer(request: Request, d: DependenciasRuta): Promise<Response> {
  if (!autorizadoPorSecreto(request.headers, d.secreto)) return new Response("No autorizado", { status: 401 });
  const esperar = new URL(request.url).searchParams.get("esperar") === "1";
  if (esperar) {
    try {
      const r = await d.correr();
      if (r.corrida) d.despues(() => d.encadenar());
      return Response.json({ ok: true, ...r });
    } catch {
      return Response.json({ ok: false, error: "motor_no_disponible" }, { status: 503 });
    }
  }
  d.despues(async () => {
    try {
      const r = await d.correr();
      if (r.corrida) await d.encadenar();
    } catch {
      console.warn("rutinas: el paso no se pudo correr; lo retoma el cron");
    }
  });
  return Response.json({ ok: true, aceptado: true }, { status: 202 });
}
