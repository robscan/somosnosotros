import { after } from "next/server";
import { validarMedicion } from "@/lib/medir";
import { leerCuerpoAcotado } from "@/lib/cuerpoAcotado";
import { enviarAGoogle, urlGoogle } from "@/lib/medirGoogleServidor";
import { vieneDelSitio } from "@/lib/mismoSitio";
import { clienteAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Lo más que se acepta de cuerpo: un nombre y dos datos caben de sobra. */
const MAX_CUERPO = 512;
/** Lo más que se espera a la base para saber si cabe en el tope: va después de responder, pero no debe quedarse colgado. */
const ESPERA_TOPE_MS = 1500;

/**
 * OL-485: ¿cabe este envío en el tope de la hora (`medir_contar`: 300 por nombre y hora)? Solo cuando de verdad se mandaría a Google
 * (producción con sus variables), para que la vista previa y lo local no gasten el contador. Sin la llave de servicio, o si la base no
 * contesta, se manda igual: medir no depende de la base y un fallo de la base no lo provoca nadie desde fuera.
 */
async function cabeEnElTope(nombre: string): Promise<boolean> {
  if (!urlGoogle()) return false;
  const admin = clienteAdmin();
  if (!admin) return true;
  try {
    const { data, error } = await admin.rpc("medir_contar", { p_nombre: nombre }).abortSignal(AbortSignal.timeout(ESPERA_TOPE_MS));
    return error ? true : data === true;
  } catch {
    return true;
  }
}

/**
 * POST /api/medir — el relevo de `medirCliente` hacia Google Analytics por el Measurement Protocol (OL-325). El teléfono manda
 * `{ nombre, datos }`; aquí se vuelve a comprobar contra la lista cerrada (lo que no está, 400) y se manda a Google después de
 * responder (`after`), sin esperar. Solo desde el propio sitio (`Sec-Fetch-Site: same-origin`; sin la cabecera también es 403, OL-485):
 * otra página no puede usarlo. No lee la sesión ni guarda nada de nadie; la administración ya se salta en el teléfono (`medirCliente` no
 * llama aquí si está la marca de admin). OL-485: antes de mandar, la base lleva la cuenta por nombre y hora y pasado el tope no se manda.
 * Sin `GA_API_SECRET` o fuera de producción responde igual y no manda nada (`enviarAGoogle`).
 */
export async function POST(request: Request) {
  try {
    if (!vieneDelSitio(request)) return new Response(null, { status: 403 });
    const texto = await leerCuerpoAcotado(request, MAX_CUERPO);
    if (texto === null) return new Response(null, { status: 413 });
    const entrada = JSON.parse(texto) as { nombre?: unknown; datos?: unknown };
    const datos = typeof entrada?.nombre === "string" ? validarMedicion(entrada.nombre, entrada.datos ?? {}) : null;
    if (!datos) return new Response(null, { status: 400 });
    const nombre = entrada.nombre as string;
    after(async () => {
      if (await cabeEnElTope(nombre)) await enviarAGoogle(nombre, datos);
    });
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch {
    return new Response(null, { status: 400 });
  }
}
