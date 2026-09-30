export type Punto = { lat: number; lng: number };

/** Distancia en línea recta, en km (fórmula de haversine). La usan la agenda ("Cercanos") y Lugares ("Cerca de mí"). */
export function distanciaKm(a: Punto, b: Punto): number {
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Un punto que llega como texto (`?lat=…&lng=…`): solo si los dos son números decimales dentro de la Tierra; lo demás se ignora. */
export function puntoDeTexto(lat: string | undefined, lng: string | undefined): Punto | null {
  const decimal = /^-?\d+(?:\.\d+)?$/;
  if (!lat || !lng || !decimal.test(lat) || !decimal.test(lng)) return null;
  const punto = { lat: Number(lat), lng: Number(lng) };
  return Math.abs(punto.lat) <= 90 && Math.abs(punto.lng) <= 180 ? punto : null;
}
