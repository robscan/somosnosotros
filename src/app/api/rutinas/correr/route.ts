import Anthropic from "@anthropic-ai/sdk";
import { after } from "next/server";
import { configPublica } from "@/lib/config";
import { tokenInstagram } from "@/lib/instagram/token";
import type { CuentaGraph } from "@/lib/rutinas/descubrir";
import { programarSemanales } from "@/lib/rutinas/semanales";
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
 * OL-489: antes de dar pasos deja las corridas semanales que tocan («Completar fichas», `semanales.ts`), y «Completar fichas» lee Instagram con
 * la cuenta de «Conectar Instagram» (el token de Vault y el id de `instagram_conexion`; si no, `INSTAGRAM_TOKEN` e `INSTAGRAM_USER_ID`).
 */
async function cuentaDe(db: NonNullable<ReturnType<typeof clienteAdmin>>): Promise<CuentaGraph | null> {
  const token = await tokenInstagram(db);
  const fila = await db.from("instagram_conexion").select("instagram_id").eq("id", 1).maybeSingle<{ instagram_id: string }>();
  const usuario = fila.data?.instagram_id ?? process.env.INSTAGRAM_USER_ID;
  return token && usuario && /^[0-9]{1,40}$/.test(usuario) ? { token, usuario } : null;
}

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
        cuentaInstagram: () => cuentaDe(db),
      });
    },
    programar: async () => {
      const db = clienteAdmin();
      if (db) await programarSemanales(db);
    },
    despues: (tarea) => after(tarea),
    limiteMs: LIMITE_RUTA_MS,
    pasoMaximoMs: PLAZO_PASO_AGENDAS_MS,
  });
}
export const POST = GET;
