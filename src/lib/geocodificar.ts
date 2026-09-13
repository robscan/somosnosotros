/**
 * Autocompletado de direcciones con Mapbox (Geocoding v6). Se usa UNA vez, al dar de alta el lugar
 * (docs/heredado/mapa/MAPBOX_GEOCODING.md); la ficha nunca vuelve a geocodificar.
 */
export type Sugerencia = { nombre: string; direccion: string; lat: number; lng: number };

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export function urlGeocodificar(q: string, token: string, cerca: { lat: number; lng: number }): string {
  const p = new URLSearchParams({
    q,
    access_token: token,
    autocomplete: "true",
    country: "mx",
    language: "es",
    limit: "5",
    proximity: `${cerca.lng},${cerca.lat}`,
    types: "address,street,place,locality,neighborhood",
  });
  return `https://api.mapbox.com/search/geocode/v6/forward?${p.toString()}`;
}

type RespuestaV6 = {
  features?: Array<{
    properties?: { name?: string; full_address?: string; place_formatted?: string; coordinates?: { latitude: number; longitude: number } };
  }>;
};

export function interpretarRespuesta(json: RespuestaV6): Sugerencia[] {
  return (json.features ?? [])
    .map((f) => {
      const p = f.properties ?? {};
      if (!p.coordinates) return null;
      return {
        nombre: p.name ?? "",
        direccion: p.full_address ?? [p.name, p.place_formatted].filter(Boolean).join(", "),
        lat: p.coordinates.latitude,
        lng: p.coordinates.longitude,
      };
    })
    .filter((s): s is Sugerencia => !!s && !!s.direccion);
}

export async function buscarDirecciones(q: string, token: string, cerca: { lat: number; lng: number }, fetchFn: FetchFn = fetch): Promise<Sugerencia[]> {
  const texto = q.trim();
  if (texto.length < 3) return [];
  const res = await fetchFn(urlGeocodificar(texto, token, cerca));
  if (!res.ok) return [];
  return interpretarRespuesta((await res.json()) as RespuestaV6);
}
