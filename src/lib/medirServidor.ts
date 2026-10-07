import "server-only";
import { track } from "@vercel/analytics/server";
import { headers } from "next/headers";
import { after } from "next/server";
import { validarMedicion, type DatosDe, type NombreEvento } from "@/lib/medir";

/**
 * Medir una acción desde el servidor (OL-325): solo para lo que termina sin pasar por una pantalla que pueda medirlo, como la vuelta de
 * Apple o Google al entrar. Lo demás se mide en el teléfono con `medirCliente` (`src/lib/medir.ts`): así llega igual a Vercel y a
 * Google Analytics, que solo se alcanza desde el navegador. Va aparte de `medir.ts` porque el navegador no puede cargar `next/headers`.
 *
 * Solo a Vercel Analytics, solo en producción (`VERCEL_ENV`) y nunca para la administración (`esAdmin`, si quien llama sabe de quién
 * es la acción). Se manda después de la respuesta (`after`): no frena a nadie. No lanza nunca.
 *
 * A Vercel le pasamos solo el navegador y la IP de la petición (con eso cuenta visitantes sin cookies, igual que con las vistas):
 * nunca las cookies, que `track` mandaría por su cuenta y llevan la sesión. Llamarla solo desde rutas cuya dirección no diga nada
 * (`/auth/<proveedor>/fin`): Vercel anota la dirección de la petición junto al evento.
 */
export async function medirServidor<N extends NombreEvento>(nombre: N, datosPedidos: DatosDe<N>, opciones: { esAdmin?: () => Promise<boolean> } = {}): Promise<void> {
  try {
    const datos = validarMedicion(nombre, datosPedidos);
    if (!datos) return;
    if (process.env.VERCEL_ENV !== "production") {
      if (process.env.NEXT_PUBLIC_MEDIR_DEPURAR === "1") console.info("[medir servidor]", nombre, datos, "(fuera de producción: no se manda)");
      return;
    }
    const peticion = await headers();
    const cabeceras: Record<string, string> = {};
    const navegador = peticion.get("user-agent");
    const ip = peticion.get("x-forwarded-for");
    if (navegador) cabeceras["user-agent"] = navegador;
    if (ip) cabeceras["x-forwarded-for"] = ip;
    const enviar = async () => {
      try {
        if (opciones.esAdmin && (await opciones.esAdmin())) return;
        await track(nombre, datos, { headers: cabeceras });
      } catch {
        // medir nunca rompe la acción
      }
    };
    try {
      after(enviar);
    } catch {
      await enviar();
    }
  } catch {
    // medir nunca rompe la acción
  }
}
