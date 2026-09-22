import type { Punto } from "./geo";

export type ErrorUbicacion = "sin-soporte" | "negado" | "error";

/**
 * La ubicación de la persona, una sola vez (no se guarda). Rechaza con "sin-soporte", "negado" o "error".
 * `precisa` pide GPS (para poner un pin); sin ella basta la aproximada (para ordenar por cercanía).
 */
export function leerUbicacion(precisa = false): Promise<Punto> {
  return new Promise((resolver, rechazar) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      rechazar("sin-soporte" satisfies ErrorUbicacion);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolver({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => rechazar((err.code === err.PERMISSION_DENIED ? "negado" : "error") satisfies ErrorUbicacion),
      precisa ? { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 } : { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  });
}

const CLAVE_CACHE = "sn:ubicacion-cercana";
/**
 * Cuánto dura fresca la última ubicación aproximada antes de volver a pedirla (OL-095, L25: "se supone que pedimos
 * ubicación una vez y se mantienen permisos"). Solo para ordenar por cercanía; 15 minutos de sobra para eso y evita
 * llamar de nuevo al navegador (y su permiso) cada vez que se abre o se vuelve a Cercanos.
 */
export const FRESCURA_CERCANA_MS = 15 * 60 * 1000;

type CacheUbicacion = { punto: Punto; en: number };

function leerCache(): CacheUbicacion | null {
  try {
    if (typeof window === "undefined") return null;
    const crudo = window.localStorage.getItem(CLAVE_CACHE);
    if (!crudo) return null;
    const datos = JSON.parse(crudo) as Partial<CacheUbicacion>;
    if (typeof datos.en !== "number" || !datos.punto || typeof datos.punto.lat !== "number" || typeof datos.punto.lng !== "number") return null;
    return { punto: datos.punto, en: datos.en };
  } catch {
    return null;
  }
}

/** A 3 decimales (~100 m): de sobra para ordenar por cercanía y no vale la pena guardar más precisión (gestor, OL-095). */
function redondear(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function guardarCache(punto: Punto): void {
  try {
    if (typeof window === "undefined") return;
    const redondeado = { lat: redondear(punto.lat), lng: redondear(punto.lng) };
    window.localStorage.setItem(CLAVE_CACHE, JSON.stringify({ punto: redondeado, en: Date.now() } satisfies CacheUbicacion));
  } catch {
    // Privado o lleno: sin caché se vuelve a pedir la próxima vez, no es grave.
  }
}

/** Borra la caché (modo privado sin storage: no falla, simplemente no había nada que borrar). */
export function borrarUbicacionCercana(): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(CLAVE_CACHE);
  } catch {
    // Sin storage no hay nada que borrar.
  }
}

/**
 * La última ubicación aproximada guardada en el teléfono, si sigue fresca; si no, null (y de paso se borra:
 * gestor, OL-095, para no dejar una posición vieja tirada). Vive solo en el teléfono (localStorage): nunca se
 * manda al servidor ni se guarda en la base (DEFINICION: "sirve para ordenar por cercanía, nada más").
 */
export function ubicacionCercanaFresca(): Punto | null {
  const cache = leerCache();
  if (!cache) return null;
  if (Date.now() - cache.en > FRESCURA_CERCANA_MS) {
    borrarUbicacionCercana();
    return null;
  }
  return cache.punto;
}

/**
 * La ubicación para ordenar por cercanía (Cercanos, en Agenda y Lugares): si hay una fresca guardada en el
 * teléfono la reutiliza sin volver a llamar al navegador (ni pedir el permiso otra vez); si no, la pide
 * (aproximada, siempre tras un toque de la persona en el botón — la caché evita repetir, no sustituye ese primer
 * permiso) y la guarda para la próxima.
 */
export async function leerUbicacionCercana(): Promise<Punto> {
  const fresca = ubicacionCercanaFresca();
  if (fresca) return fresca;
  const punto = await leerUbicacion(false);
  guardarCache(punto);
  return punto;
}

/**
 * La ubicación precisa con la precisión que reporta el aparato, en metros (OL-127: la cercanía del mando suma esa
 * precisión al radio). Mismos rechazos que `leerUbicacion`. Siempre tras un toque de la persona (el de encender).
 */
export function leerUbicacionConPrecision(): Promise<{ punto: Punto; precisionM: number }> {
  return new Promise((resolver, rechazar) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      rechazar("sin-soporte" satisfies ErrorUbicacion);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolver({ punto: { lat: pos.coords.latitude, lng: pos.coords.longitude }, precisionM: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : 0 }),
      (err) => rechazar((err.code === err.PERMISSION_DENIED ? "negado" : "error") satisfies ErrorUbicacion),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  });
}
