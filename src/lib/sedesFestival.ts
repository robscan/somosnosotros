import { hrefLugar, normalizarNombre } from "./lugares";
import { hrefSitio } from "./sitios";

/**
 * Las sedes de un festival (OL-339), sin DOM ni base. Regla del founder (2026-10-07): «Que la o las ubicaciones de un festival se alimenten de
 * las registradas en sus eventos, se muestran todas y se actualizan cuando los eventos las cambian». No se guarda nada derivado: se calculan al
 * leer, de los actos publicados del festival, así cambian en cuanto un acto cambia de lugar, se oculta o se publica.
 *
 * - Un lugar del directorio es una sede (por su id); un sitio fuera del directorio, otra (por su nombre normalizado: «Jardín de San Juan» y
 *   «jardin de san juan» son la misma).
 * - El orden es el de su primer acto.
 * - Lo capturado en el marco mismo (su lugar o su sitio) solo cuenta sin actos que digan dónde: es el respaldo de un festival recién dado de
 *   alta, o de uno cuyo programa aún no tiene sede.
 */

/** Lo que dice «Varias sedes» donde la app resume el lugar de un festival en una línea (renglón, tarjeta, compartir, .ics, cartel). */
export const VARIAS_SEDES = "Varias sedes";

/** Un acto (o el marco, como respaldo) con lo que dice dónde es. El lugar llega anidado como lo da la consulta (`lugar:lugares(...)`). */
export type ActoConSitio = {
  inicio: string;
  lugar_id: string | null;
  lugar?: { id?: string; slug?: string | null; nombre: string; direccion?: string | null; lat?: number | null; lng?: number | null } | null;
  sitio_texto: string | null;
  sitio_direccion?: string | null;
  sitio_lat?: number | null;
  sitio_lng?: number | null;
  sitio_reservado?: boolean;
  /** La ciudad del acto: con ella se arma la dirección de la ficha de un sitio fuera del directorio (`hrefSitio`, OL-348). */
  ciudad?: string | null;
  /** Su cartel, si lo tiene (OL-346): el del próximo acto es la portada de un festival sin imagen propia (`portadaDeFestival`). */
  imagen?: string | null;
};

/** Una sede: su nombre, el lugar del directorio si lo es (para enlazar su ficha), su dirección, su punto en el mapa y cuántos actos tiene ahí. */
export type Sede = {
  /** «l:<id>» para un lugar del directorio, «s:<nombre normalizado>» para un sitio fuera de él. */
  clave: string;
  nombre: string;
  lugar: { id: string; slug: string | null } | null;
  direccion: string | null;
  /** Sin punto (un sitio sin coordenadas, o reservado: su dirección no se publica) la sede sale en la lista y no en el mapa. */
  punto: { lat: number; lng: number } | null;
  /** Un sitio reservado: su nombre se dice, su dirección no (la revela la ficha de su acto cuando toca). */
  reservado: boolean;
  /** La ficha que abre su renglón (OL-348): la del lugar del directorio o la del sitio fuera de él (`/sitios/<slug>`); null en un sitio reservado. */
  href: string | null;
  /** Cuántos actos tiene; 0 en la sede de respaldo (lo capturado en el marco). */
  actos: number;
};

const numero = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

/** La sede de un acto, o null si no dice dónde («Sitio por confirmar» no es una sede). */
function sedeDe(a: ActoConSitio): Omit<Sede, "actos"> | null {
  const lugar = a.lugar;
  if (a.lugar_id && lugar?.nombre) {
    return {
      clave: `l:${a.lugar_id}`,
      nombre: lugar.nombre,
      lugar: { id: lugar.id ?? a.lugar_id, slug: lugar.slug ?? null },
      direccion: lugar.direccion ?? null,
      punto: numero(lugar.lat) && numero(lugar.lng) ? { lat: lugar.lat, lng: lugar.lng } : null,
      reservado: false,
      href: hrefLugar({ id: lugar.id ?? a.lugar_id, slug: lugar.slug }),
    };
  }
  const texto = a.sitio_texto?.trim();
  if (!texto) return null;
  const reservado = !!a.sitio_reservado;
  return {
    clave: `s:${normalizarNombre(texto)}`,
    nombre: reservado ? `${texto} · sitio reservado` : texto,
    lugar: null,
    direccion: reservado ? null : (a.sitio_direccion ?? null),
    punto: !reservado && numero(a.sitio_lat) && numero(a.sitio_lng) ? { lat: a.sitio_lat, lng: a.sitio_lng } : null,
    reservado,
    href: hrefSitio({ lugar_id: null, sitio_texto: texto, sitio_reservado: reservado, ciudad: a.ciudad }),
  };
}

/**
 * Las sedes de un festival sin repetir, en el orden de su primer acto, con cuántos actos tiene cada una. Sin actos que digan dónde, la sede
 * capturada en el marco (`respaldo`, con 0 actos); sin ninguna de las dos, vacío.
 */
export function sedesDeFestival(actos: readonly ActoConSitio[], respaldo?: ActoConSitio | null): Sede[] {
  const sedes = new Map<string, Sede>();
  for (const a of [...actos].sort((x, y) => Date.parse(x.inicio) - Date.parse(y.inicio))) {
    const sede = sedeDe(a);
    if (!sede) continue;
    const ya = sedes.get(sede.clave);
    if (ya) {
      ya.actos++;
      // Un sitio fuera del directorio que se repite puede traer el punto o la dirección en un acto y no en otro: se toma el primero que lo diga.
      ya.punto ??= sede.punto;
      ya.direccion ??= sede.direccion;
    } else sedes.set(sede.clave, { ...sede, actos: 1 });
  }
  if (sedes.size) return [...sedes.values()];
  const propia = respaldo ? sedeDe(respaldo) : null;
  return propia ? [{ ...propia, actos: 0 }] : [];
}

/**
 * El lugar de un festival en una línea: «Varias sedes» con más de una, el nombre de la única con una; null sin sedes (quien llama dice lo de
 * siempre: lo capturado o «Sitio por confirmar»). Lo usa `nombreSitio`, así cada pantalla lo dice igual sin resolverlo por su cuenta.
 */
export function nombreDeSedes(sedes: readonly Pick<Sede, "nombre">[] | null | undefined): string | null {
  if (!sedes?.length) return null;
  return sedes.length > 1 ? VARIAS_SEDES : sedes[0].nombre;
}

/** Lo que viaja a las listas: solo el nombre de cada sede (la lista dice «Varias sedes» o el nombre; Buscar busca por cada uno). */
export const sedesParaLista = (sedes: readonly Sede[]): { nombre: string }[] => sedes.map(({ nombre }) => ({ nombre }));

/** «3 actividades» junto al nombre de una sede en la ficha del festival. */
export const textoActosEnSede = (n: number): string => `${n} ${n === 1 ? "actividad" : "actividades"}`;

/**
 * La portada de un festival sin imagen propia (OL-346, founder 2026-10-08: «En CINEMA no tiene cartel […]; deberíamos usar un cartel del próximo
 * evento»): el cartel de su próximo acto que tenga uno (el primero que todavía no empieza, por fecha); si todos empezaron ya, el del último. Null si
 * ningún acto tiene cartel (quien pinta sigue con lo de siempre: la portada de su lugar o el símbolo SN). Como las sedes, se deriva al leer de los
 * actos publicados y nunca se guarda: cambia sola cuando un acto pasa, cambia de cartel o se oculta. Quien llama la usa solo si el festival no
 * tiene `imagen` propia.
 */
export function portadaDeFestival(actos: readonly Pick<ActoConSitio, "inicio" | "imagen">[], ahora: Date = new Date()): string | null {
  const conCartel = actos.filter((a) => a.imagen).toSorted((x, y) => Date.parse(x.inicio) - Date.parse(y.inicio));
  const proximo = conCartel.find((a) => Date.parse(a.inicio) >= ahora.getTime()) ?? conCartel.at(-1);
  return proximo?.imagen ?? null;
}
