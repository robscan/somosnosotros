import type { Punto } from "./geo";

export type ErrorUbicacion = "sin-soporte" | "negado" | "error";

/**
 * Una lectura de ubicación ya salió bien en esta carga de la app (y no se ha negado después). Solo en memoria, a propósito: es el
 * respaldo de `permissions.query`, que el WKWebView de la app de iPhone no soporta (lanza NotSupportedError), y ahí iOS vuelve a
 * preguntar «¿permitir a este sitio…?» en la primera lectura tras cada arranque de la app; recordarlo en disco soltaría ese aviso
 * sin que la persona toque nada (OL-255). Dentro de la misma sesión ya no pregunta de nuevo.
 */
let leidaEnEstaSesion = false;

/**
 * La ubicación de la persona, una sola vez (no se guarda). Rechaza con "sin-soporte", "negado" o "error".
 * `precisa` pide GPS (para poner un pin); sin ella basta la aproximada (para ordenar por cercanía), y `edadMaximaMs` es cuánto puede
 * tener de vieja la que el navegador ya tenga a mano.
 */
export function leerUbicacion(precisa = false, edadMaximaMs = 300000): Promise<Punto> {
  return new Promise((resolver, rechazar) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      rechazar("sin-soporte" satisfies ErrorUbicacion);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        leidaEnEstaSesion = true;
        resolver({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) leidaEnEstaSesion = false;
        rechazar((err.code === err.PERMISSION_DENIED ? "negado" : "error") satisfies ErrorUbicacion);
      },
      precisa ? { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 } : { enableHighAccuracy: false, timeout: 8000, maximumAge: edadMaximaMs },
    );
  });
}

const CLAVE_CACHE = "sn:ubicacion-cercana";
/**
 * Cuánto se sigue mostrando la última ubicación aproximada (OL-095, L25: "se supone que pedimos ubicación una vez y se mantienen
 * permisos"). Sirve de respaldo cuando no se puede releer sola (sin permiso consultable): la que dejó el último toque de la persona
 * no se repite al navegador (ni a su permiso) cada vez que se abre o se vuelve a Cercanos. Con el permiso ya concedido la pone al
 * día `releerUbicacionAlDia` mucho antes (RELECTURA_MS); estos 15 minutos son solo hasta cuándo se enseña una vieja mientras llega
 * la nueva.
 */
export const FRESCURA_CERCANA_MS = 15 * 60 * 1000;
/** Con el permiso concedido, a partir de cuánto un punto guardado es viejo y se relee sin que la persona toque nada (OL-255). */
export const RELECTURA_MS = 60 * 1000;

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

/** Cuántos ms tiene el punto guardado, sin mirar si sigue fresco; null si no hay ninguno. */
function edadUbicacionCercana(): number | null {
  const cache = leerCache();
  return cache ? Date.now() - cache.en : null;
}

/**
 * ¿El permiso de ubicación ya está concedido? Lo dice `permissions.query` (navegadores, Safari 16+). Donde no existe o lanza (el WKWebView
 * de la app de iPhone), vale haber leído ya bien en esta sesión; sin ninguna de las dos es que no, y entonces solo se pide tras un toque.
 */
export async function permisoConcedido(): Promise<boolean> {
  try {
    return (await navigator.permissions.query({ name: "geolocation" })).state === "granted";
  } catch {
    return leidaEnEstaSesion;
  }
}

/** ¿Hay que releer sola la ubicación? Solo con el permiso ya concedido y el último punto viejo (o ninguno). Nunca sin permiso: ese aviso es de un toque. */
export function debeReleer(concedido: boolean, edadMs: number | null): boolean {
  return concedido && (edadMs === null || edadMs > RELECTURA_MS);
}

let relectura: Promise<boolean> | null = null;
/**
 * Pone al día la ubicación aproximada guardada, sin toque de la persona, solo si el permiso ya estaba concedido y el último punto
 * tiene más de RELECTURA_MS (OL-255). Una sola lectura a la vez aunque la pidan varias pantallas. Resuelve true si guardó un punto
 * nuevo. Sin permiso, con permiso negado o con un error, no hace nada y resuelve false: no insiste ni avisa.
 */
export function releerUbicacionAlDia(): Promise<boolean> {
  relectura ??= (async () => {
    if (!debeReleer(await permisoConcedido(), edadUbicacionCercana())) return false;
    guardarCache(await leerUbicacion(false, RELECTURA_MS));
    return true;
  })()
    .catch(() => false)
    .finally(() => {
      relectura = null;
    });
  return relectura;
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
      (pos) => {
        leidaEnEstaSesion = true;
        resolver({ punto: { lat: pos.coords.latitude, lng: pos.coords.longitude }, precisionM: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : 0 });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) leidaEnEstaSesion = false;
        rechazar((err.code === err.PERMISSION_DENIED ? "negado" : "error") satisfies ErrorUbicacion);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  });
}
