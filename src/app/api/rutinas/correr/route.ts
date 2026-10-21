import Anthropic from "@anthropic-ai/sdk";
import { after } from "next/server";
import { configPublica } from "@/lib/config";
import { atenderCorrer } from "@/lib/rutinas/atender";
import { dispararPaso, origenPropio } from "@/lib/rutinas/disparar";
import { correrUnPaso, PLAZO_PASO_MS } from "@/lib/rutinas/motor";
import { clienteAdmin } from "@/lib/supabase/admin";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * El motor de las rutinas de Administración › Ciudades (OL-428). Lo llama el cron de Vercel cada 5 minutos (vercel.json), la hoja «Correr»
 * al crear una corrida y cada paso al terminar, siempre con `CRON_SECRET` (Vercel lo manda como Bearer). Cada llamada corre un paso de
 * una corrida (`src/lib/rutinas/motor.ts`) con la llave de servicio, `ANTHROPIC_API_KEY` y el token de Mapbox que ya existen.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
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
    encadenar: () => dispararPaso(origenPropio(request.headers.get("x-forwarded-host") ?? url.host, request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", ""))),
  });
}
export const POST = GET;
