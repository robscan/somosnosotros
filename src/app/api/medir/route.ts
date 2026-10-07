import { after } from "next/server";
import { validarMedicion } from "@/lib/medir";
import { enviarAGoogle } from "@/lib/medirGoogleServidor";

export const dynamic = "force-dynamic";

/** Lo más que se acepta de cuerpo: un nombre y dos datos caben de sobra. */
const MAX_CUERPO = 512;

/**
 * POST /api/medir — el relevo de `medirCliente` hacia Google Analytics por el Measurement Protocol (OL-325). El teléfono manda
 * `{ nombre, datos }`; aquí se vuelve a comprobar contra la lista cerrada (lo que no está, 400) y se manda a Google después de
 * responder (`after`), sin esperar. Solo desde el propio sitio (`Sec-Fetch-Site`): otra página no puede usarlo. No lee la sesión ni
 * guarda nada; la administración ya se salta en el teléfono (`medirCliente` no llama aquí si está la marca de admin). Sin
 * `GA_API_SECRET` o fuera de producción responde igual y no manda nada (`enviarAGoogle`).
 */
export async function POST(request: Request) {
  try {
    const sitio = request.headers.get("sec-fetch-site");
    if (sitio && sitio !== "same-origin") return new Response(null, { status: 403 });
    const texto = await request.text();
    if (texto.length > MAX_CUERPO) return new Response(null, { status: 413 });
    const entrada = JSON.parse(texto) as { nombre?: unknown; datos?: unknown };
    const datos = typeof entrada?.nombre === "string" ? validarMedicion(entrada.nombre, entrada.datos ?? {}) : null;
    if (!datos) return new Response(null, { status: 400 });
    const nombre = entrada.nombre as string;
    after(() => enviarAGoogle(nombre, datos));
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch {
    return new Response(null, { status: 400 });
  }
}
