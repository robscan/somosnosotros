import { after } from "next/server";
import { armarLasQueVienen } from "@/app/admin/instagram/semana";
import { herramientasReales } from "@/lib/redes/herramientas";
import { correrUnTrabajo, PLAZOS_MS } from "@/lib/redes/trabajar";
import { atenderCorrer } from "@/lib/rutinas/atender";
import { clienteAdmin } from "@/lib/supabase/admin";

/** Como `/api/rutinas/correr`: 300 s (Next pide el número escrito aquí). */
export const maxDuration = 300;
export const dynamic = "force-dynamic";
const LIMITE_MS = 300_000;
const MARGEN_MS = 3_000;

/**
 * El trabajador de la cola de redes (OL-465, bitácora 497): publica en Instagram y Facebook lo que «Publicar» dejó en `redes_trabajos`. Lo
 * llaman el latido de Supabase cada minuto mientras haya trabajos listos (`redes_latido`, `pg_cron` + `pg_net`, migración 20261028140000) y la
 * acción de publicar con `after()` para empezar de inmediato, siempre con `CRON_SECRET` (Bearer), como la ruta del motor de rutinas (la misma
 * atención: 401 sin el secreto, 202 enseguida y el trabajo después de responder; `?esperar=1` corre uno y devuelve qué pasó).
 */
export async function GET(request: Request) {
  const inicio = Date.now();
  // OL-487 (bitácora 519): una vez por llamada, antes de la cola, la semana de Instagram que toque armar (los miércoles de 9:00 a 9:59 en la
  // hora de cada ciudad; el latido llama también por eso). Nunca tumba la cola: lo que falle queda en los registros y la cola sigue.
  let semanaRevisada = false;
  return atenderCorrer(request, {
    secreto: process.env.CRON_SECRET,
    correr: async () => {
      const db = clienteAdmin();
      if (!db) throw new Error("sin base");
      if (!semanaRevisada) {
        semanaRevisada = true;
        await armarLasQueVienen(db, new Date()).catch(() => console.warn("redes: no se pudo revisar la semana de Instagram; lo reintenta el latido"));
      }
      return correrUnTrabajo({ db, ahora: () => new Date(), hasta: inicio + LIMITE_MS - MARGEN_MS, h: herramientasReales() });
    },
    despues: (tarea) => after(tarea),
    limiteMs: LIMITE_MS,
    // Otro trabajo solo si cabe al menos el paso más largo (lo que no quepa lo deja el trabajador para la siguiente llamada).
    pasoMaximoMs: PLAZOS_MS.instagram,
  });
}
export const POST = GET;
