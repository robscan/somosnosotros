import type { LugarLista } from "./lugares";

/**
 * Una sede en el mapa de una ficha (OL-350): lo que pinta la imagen estática de «Dónde» y, al tocarla, el mapa a pantalla completa (`MapaFicha`,
 * `CapaMapa`). La arma el servidor de cada ficha (evento, festival, lugar o sitio) con lo que ya tiene; solo viaja lo que se muestra.
 */
export type SedeMapa = {
  /** La de `sedesDeFestival` («l:<id>» o «s:<nombre>»); en una ficha de una sola sede, cualquiera que no se repita. */
  clave: string;
  nombre: string;
  punto: { lat: number; lng: number };
  /** Lo que dice la tarjeta del pin bajo el nombre: la dirección con una sede, «2 actividades» en un festival; null, nada. */
  meta: string | null;
  /** La ficha que abre el ángulo de la tarjeta (la del lugar o la del sitio, OL-348); null, sin ángulo: un sitio reservado o la ficha en la que ya se está. */
  href: string | null;
  /** Un sitio reservado ya revelado: el candado en vez del pin en la tarjeta. */
  reservado?: boolean;
  /** «Cómo llegar» a la sede: la misma ruta que la acción redonda de la ficha. */
  comoLlegar: string;
  /** Su próxima actividad, para el día del pin («Hoy», «Sáb»); null, el punto de tinta. */
  proximo: { inicio: string; zona: string } | null;
};

/**
 * Las sedes con la forma que pinta el mapa de Lugares (`components/Mapa`): mismos pines, mismo día, mismas reglas de nombres. Su `id` es la clave de
 * la sede; el tipo no se pinta.
 */
export function lugaresDelMapa(sedes: readonly SedeMapa[]): LugarLista[] {
  return sedes.map((s) => ({
    id: s.clave,
    nombre: s.nombre,
    tipo: "otro",
    direccion: null,
    lat: s.punto.lat,
    lng: s.punto.lng,
    portada: null,
    proximo: s.proximo ? { id: s.clave, inicio: s.proximo.inicio, zona: s.proximo.zona, titulo: "" } : null,
  }));
}
