import type { DatosDe } from "@/lib/medir";

/**
 * La marca que deja «No se pudo cargar» (OL-501, `public/sin-conexion.html`) en `localStorage` cuando el service worker la enseña: sin red no
 * se puede medir en ese momento, así que se mide en la siguiente carga buena (`MedirCargaFallida`). La página escribe
 * `{ cuando, motivo: "red" | "servidor", app: "pwa" | "tienda" }`; aquí se lee, se borra siempre y se devuelve lo que se manda, o null.
 */
export const CLAVE_CARGA_FALLIDA = "sn_carga_fallida";
/** Una marca más vieja que esto ya no dice nada de esta apertura (la persona no volvió en una semana): se borra sin medirla. */
const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000;

type Almacen = Pick<Storage, "getItem" | "removeItem">;

export function tomarCargaFallida(almacen: Almacen, ahora = Date.now()): DatosDe<"carga_fallida"> | null {
  let crudo: string | null = null;
  try {
    crudo = almacen.getItem(CLAVE_CARGA_FALLIDA);
    if (crudo !== null) almacen.removeItem(CLAVE_CARGA_FALLIDA);
  } catch {
    return null; // modo privado o sin memoria: nada que medir
  }
  if (!crudo) return null;
  try {
    const marca = JSON.parse(crudo) as { cuando?: unknown; motivo?: unknown; app?: unknown };
    const cuando = typeof marca.cuando === "string" ? Date.parse(marca.cuando) : NaN;
    if (!Number.isFinite(cuando) || ahora - cuando > VIGENCIA_MS) return null;
    const motivo = marca.motivo === "servidor" ? "servidor" : marca.motivo === "red" ? "red" : null;
    const app = marca.app === "tienda" ? "tienda" : marca.app === "pwa" ? "pwa" : null;
    return motivo && app ? { app, motivo } : null;
  } catch {
    return null;
  }
}
