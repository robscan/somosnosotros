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
