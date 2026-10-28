import Anthropic from "@anthropic-ai/sdk";
import { after } from "next/server";
import { configPublica } from "@/lib/config";
import { atenderCorrer } from "@/lib/rutinas/atender";
import { correrUnPaso, LIMITE_RUTA_MS, PLAZO_PASO_AGENDAS_MS, PLAZO_PASO_MS } from "@/lib/rutinas/motor";
import { clienteAdmin } from "@/lib/supabase/admin";

/** Igual a `LIMITE_RUTA_MS` (Next pide un número escrito aquí): un paso de agendas dura hasta 200 s. */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * El motor de las rutinas de Administración › Ciudades (OL-428, OL-429, OL-444). Lo llaman el latido de Supabase cada minuto mientras haya
 * corridas vivas (`pg_cron` + `pg_net`, migración 20261022120000), la hoja «Correr» al crear una corrida, Ciudades o Corridas al encontrar
 * una corrida varada y el cron de Vercel una vez al día (vercel.json), siempre con `CRON_SECRET` (Bearer). Cada llamada da pasos de las
 * corridas (`src/lib/rutinas/motor.ts`) mientras le quede tiempo, con la llave de servicio, `ANTHROPIC_API_KEY` y el token de Mapbox que ya
 * existen. Un paso nunca vuelve a llamar a esta ruta: Vercel corta esa cadena con 508 (OL-444, `atender.ts`).
 */
export async function GET(request: Request) {
  return atenderCorrer(request, {
    secreto: process.env.CRON_SECRET,
    correr: async () => {
      const db = clienteAdmin();
      if (!db) throw new Error("sin base");
      const token = configPublica().mapboxToken;
      return correrUnPaso({
        db,
        api: process.env.ANTHROPIC_API_KEY ? new Anthropic() : null,
        mapbox: token ? { token } : null,
        pedir: fetch,
        ahora: () => new Date(),
        plazoMs: PLAZO_PASO_MS,
      });
    },
    despues: (tarea) => after(tarea),
    limiteMs: LIMITE_RUTA_MS,
    pasoMaximoMs: PLAZO_PASO_AGENDAS_MS,
  });
}
export const POST = GET;
