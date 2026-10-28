import { mismoCartel } from "../carteles/huella";
import { eventoPaso } from "../fechas";
import { TOPE_ETIQUETAS_FOTO } from "./texto";

/**
 * Las imágenes de un carrusel de Instagram (y de la publicación con varias fotos de Facebook) (OL-464, bitácora 496). Puro: lo prueban
 * `carrusel.test.ts` y lo usan la hoja (en el teléfono), la vista previa y la acción de publicar (en el servidor).
 *
 * Un festival: la primera imagen es su portada (el cartel del marco o, sin él, su diseño de Crear cartel); después, los carteles DISTINTOS de sus
 * actos por venir, en orden de fecha y sin repetir (varios actos con el mismo cartel → una imagen, con los artistas de todos). «El mismo» se
 * decide por la dirección o, si no coincide, por el contenido (`huella`, `lib/carteles/huella`): al aceptar cada acto se guarda su propia copia
 * del cartel del día, con otra dirección (founder: «Este festival tiene más eventos que carteles. Asegúrate de que no se repitan las imágenes»). Instagram deja 10:
 * las que no caben son las últimas, y la hoja lo dice. Todas van a 4:5 con el margen de su color (Instagram recorta a la proporción de la primera).
 *
 * La misma función sirve para una lista cualquiera de eventos con una portada aparte (p. ej. «Esta semana»: una portada de la semana y sus 9
 * eventos, cada uno con su cartel o su diseño de Crear cartel, `sinCartel: "diseno"`). Todavía sin pantalla.
 */

/** Instagram deja de 2 a 10 imágenes en un carrusel. */
export const TOPE_CARRUSEL = 10;
/** La clave de la portada (la primera imagen por omisión). Las demás usan el id del primer evento que lleva ese cartel. */
export const PORTADA = "portada";

/** Un evento que puede aportar una imagen: su cartel (o null) y las cuentas de Instagram de sus artistas. */
export type ParaCarrusel = {
  id: string;
  titulo: string;
  imagen: string | null;
  inicio: string;
  fin: string | null;
  /** Sus funciones (horario por día): está por venir si le queda alguna. */
  sesiones?: { inicio: string; fin: string | null }[];
  /** Las cuentas de Instagram de sus artistas (sin @). */
  usuarios: string[];
  /** La huella de su cartel (`eventos.cartel_huella` o calculada al vuelo); sin ella solo se compara la dirección. */
  huella?: string | null;
};

/** Una imagen del carrusel. `imagen` null: un diseño de Crear cartel (la portada sin cartel, o un evento sin cartel con `sinCartel: "diseno"`). */
export type ImagenCarrusel = {
  clave: string;
  titulo: string;
  imagen: string | null;
  /** Los eventos que lleva (los que comparten ese cartel), en orden de fecha. */
  eventos: string[];
  /** Las cuentas de sus artistas, sin repetir: se etiquetan en esta imagen. */
  usuarios: string[];
  /** La huella de su cartel, para reconocer otra copia del mismo. */
  huella?: string | null;
};

/** Un cartel, para comparar: sin espacios ni consulta (la misma imagen con otra versión en la URL es la misma). */
const mismaImagen = (url: string) => url.trim().replace(/[?#].*$/, "");

/** Cuándo empieza lo que le queda a un evento (su primera función por venir); null si ya pasó. */
function proximaFuncion(e: ParaCarrusel, ahora: Date, zona: string): string | null {
  const funciones = e.sesiones?.length ? e.sesiones : [{ inicio: e.inicio, fin: e.fin }];
  const vienen = funciones.filter((f) => !eventoPaso(f.inicio, f.fin, ahora, zona)).map((f) => f.inicio).sort();
  return vienen[0] ?? null;
}

const unir = (a: readonly string[], b: readonly string[]) => [...new Set([...a, ...b])];

/**
 * Todas las imágenes posibles, en su orden: la portada y luego un cartel por cada cartel distinto de los eventos por venir (por la fecha de su
 * próxima función). Sin tope (lo pone `elegirImagenes`). Un evento sin cartel no aporta imagen (`sinCartel: "fuera"`, el festival) o aporta su
 * diseño de Crear cartel (`"diseno"`, una lista como «Esta semana»). Un evento con el mismo cartel que la portada se suma a la portada.
 */
export function armarCarrusel(o: {
  portada: { titulo: string; imagen: string | null; usuarios?: string[]; huella?: string | null };
  eventos: readonly ParaCarrusel[];
  ahora: Date;
  zona: string;
  sinCartel?: "fuera" | "diseno";
}): ImagenCarrusel[] {
  const portada: ImagenCarrusel = { clave: PORTADA, titulo: o.portada.titulo, imagen: o.portada.imagen, eventos: [], usuarios: [...new Set(o.portada.usuarios ?? [])], huella: o.portada.huella ?? null };
  const lista: ImagenCarrusel[] = [portada];
  // El mismo cartel: la misma dirección o, si no, el mismo contenido (dos copias en Storage).
  const igual = (i: ImagenCarrusel, cartel: string, huella: string | null | undefined) => !!i.imagen && (mismaImagen(i.imagen) === cartel || mismoCartel(i.huella, huella));
  const vienen = o.eventos
    .map((e) => ({ e, cuando: proximaFuncion(e, o.ahora, o.zona) }))
    .filter((x): x is { e: ParaCarrusel; cuando: string } => !!x.cuando)
    .sort((a, b) => a.cuando.localeCompare(b.cuando) || a.e.id.localeCompare(b.e.id));
  for (const { e } of vienen) {
    const cartel = e.imagen?.trim() ? mismaImagen(e.imagen) : null;
    const ya = cartel ? lista.find((i) => igual(i, cartel, e.huella)) : undefined;
    if (ya) {
      ya.eventos.push(e.id);
      ya.usuarios = unir(ya.usuarios, e.usuarios);
      continue;
    }
    if (!cartel && o.sinCartel !== "diseno") continue;
    lista.push({ clave: e.id, titulo: e.titulo, imagen: cartel ? e.imagen!.trim() : null, eventos: [e.id], usuarios: [...new Set(e.usuarios)], huella: cartel ? (e.huella ?? null) : null });
  }
  return lista;
}

/**
 * Las que van y las que no, con lo que eligió la hoja. `orden`: las claves en el orden de la hoja (las que no dice van después, en su orden);
 * `quitadas`: las que se quitaron con su ✕. Van las primeras 10 (`tope`); las demás quedan fuera (las últimas).
 */
export function elegirImagenes<T extends { clave: string }>(todas: readonly T[], o: { orden?: readonly string[] | null; quitadas?: readonly string[]; tope?: number } = {}): { van: T[]; fuera: T[] } {
  const porClave = new Map(todas.map((i) => [i.clave, i]));
  const claves = [...new Set([...(o.orden ?? []).filter((c) => porClave.has(c)), ...todas.map((i) => i.clave)])];
  const quitadas = new Set(o.quitadas ?? []);
  const quedan = claves.filter((c) => !quitadas.has(c)).map((c) => porClave.get(c)!);
  const tope = Math.max(1, Math.min(o.tope ?? TOPE_CARRUSEL, TOPE_CARRUSEL));
  return { van: quedan.slice(0, tope), fuera: quedan.slice(tope) };
}

/**
 * Las que pidió la hoja al publicar, en su orden: solo claves que existen, sin repetir y hasta 10 (nunca una imagen que mande el teléfono).
 */
export function imagenesPedidas(todas: readonly ImagenCarrusel[], claves: unknown): ImagenCarrusel[] {
  if (!Array.isArray(claves)) return [];
  const porClave = new Map(todas.map((i) => [i.clave, i]));
  const pedidas = [...new Set(claves.filter((c): c is string => typeof c === "string" && porClave.has(c)))];
  return pedidas.slice(0, TOPE_CARRUSEL).map((c) => porClave.get(c)!);
}

/**
 * A quién se etiqueta en cada imagen: el lugar en todas; los artistas de cada evento en la imagen de su cartel. `permitidas`: las cuentas que se
 * pueden etiquetar (las de la foto, ya sin las quitadas y con el tope de 20: `etiquetasDeLaFoto`). Una cuenta permitida que no quedó en ninguna
 * imagen (quien organiza, o un acto cuyo cartel quedó fuera) va en la portada o, si la portada no va, en la primera. Hasta 20 por imagen.
 */
export function etiquetasPorImagen(van: readonly ImagenCarrusel[], o: { lugar: string | null; permitidas: readonly string[] }): string[][] {
  const permitidas = new Set(o.permitidas);
  const lugar = o.lugar && permitidas.has(o.lugar) ? [o.lugar] : [];
  const porImagen = van.map((i) => unir(lugar, i.usuarios.filter((u) => permitidas.has(u))));
  const puestas = new Set(porImagen.flat());
  const sueltas = o.permitidas.filter((u) => !puestas.has(u));
  if (sueltas.length && porImagen.length) {
    const donde = Math.max(0, van.findIndex((i) => i.clave === PORTADA));
    porImagen[donde] = unir(porImagen[donde], sueltas);
  }
  return porImagen.map((us) => us.slice(0, TOPE_ETIQUETAS_FOTO));
}

/** «1 imagen», «5 imágenes». */
export const textoImagenes = (n: number): string => `${n} ${n === 1 ? "imagen" : "imágenes"}`;

/** Lo que dice la hoja sobre el carrusel: cuántas van y, si sobran, cuáles quedan fuera (las últimas). */
export function resumenCarrusel(van: readonly { titulo: string }[], fuera: readonly { titulo: string }[]): { resumen: string; fuera: string | null } {
  const resumen = van.length > 1 ? `Carrusel de ${textoImagenes(van.length)}, en este orden:` : "Solo queda 1 imagen: se publica como una foto.";
  const nombres = fuera.map((i) => `«${i.titulo}»`);
  const dicho = nombres.length > 1 ? `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}` : (nombres[0] ?? "");
  return { resumen, fuera: fuera.length ? `Instagram deja ${TOPE_CARRUSEL}: ${fuera.length === 1 ? "queda fuera" : "quedan fuera"} ${dicho}.` : null };
}
