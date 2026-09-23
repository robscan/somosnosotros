/**
 * JSON-LD (schema.org) que falta según `docs/rediseno/36-indexar-catalogo.md` (OL-143, bitácora 178): `Place` en la
 * ficha de lugar, `Person`/`PerformingGroup` en la de artista, `WebSite` en el inicio y `BreadcrumbList` en las tres
 * fichas. El de `Event` ya existía (`jsonLdEvento`, `src/lib/eventos.ts`, OL-059). Reglas puras, sin tocar la base,
 * para poder probarlas: nunca reciben ni mandan un dato que la propia página no muestre ya (sin correos ni
 * teléfonos de personas).
 */

const ORIGEN = "https://somosnosotros.org";

export type DatosJsonLdLugar = {
  nombre: string;
  descripcion: string | null;
  direccion: string | null;
  ciudad: string;
  lat: number;
  lng: number;
  imagen: string | null;
  url: string;
};

/** `Place` (no `LocalBusiness`: son centros culturales, no negocios) con lo que la ficha ya enseña. */
export function jsonLdLugar(l: DatosJsonLdLugar): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: l.nombre,
    url: `${ORIGEN}${l.url}`,
    geo: { "@type": "GeoCoordinates", latitude: l.lat, longitude: l.lng },
  };
  if (l.direccion) data.address = { "@type": "PostalAddress", streetAddress: l.direccion, addressLocality: l.ciudad };
  if (l.descripcion) data.description = l.descripcion;
  if (l.imagen) data.image = [l.imagen];
  return data;
}

export type DatosJsonLdArtista = {
  nombre: string;
  descripcion: string | null;
  imagen: string | null;
  url: string;
  /** "solista" es una persona; "grupo" y "colectivo" son un conjunto (decisión 4, doc rediseno). */
  esGrupo: boolean;
  /** Solo redes ya públicas y registradas en la ficha; nunca un dato de contacto que no se muestre ya. */
  redes: string[];
};

/** `Person` (solista) o `PerformingGroup` (grupo o colectivo), según el tipo de la ficha. */
export function jsonLdArtista(a: DatosJsonLdArtista): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": a.esGrupo ? "PerformingGroup" : "Person",
    name: a.nombre,
    url: `${ORIGEN}${a.url}`,
  };
  if (a.descripcion) data.description = a.descripcion;
  if (a.imagen) data.image = [a.imagen];
  if (a.redes.length > 0) data.sameAs = a.redes;
  return data;
}

/** `WebSite`, una sola vez en el inicio (`src/app/layout.tsx` la manda a todas las páginas: es del sitio, no de la ficha). */
export function jsonLdSitio(): Record<string, unknown> {
  return { "@context": "https://schema.org", "@type": "WebSite", name: "Somos Nosotros", url: ORIGEN };
}

export type MigajaPan = { nombre: string; url: string };

/** `BreadcrumbList`: Inicio › Lugares/Artistas/Agenda › Nombre. `url` ya lleva el dominio cuando hace falta (Inicio). */
export function jsonLdMigajas(migajas: MigajaPan[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: migajas.map((m, i) => ({ "@type": "ListItem", position: i + 1, name: m.nombre, item: m.url.startsWith("http") ? m.url : `${ORIGEN}${m.url}` })),
  };
}
