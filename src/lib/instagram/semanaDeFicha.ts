import { diaConMes, diaLocal, eventoPaso, horaCorta, localAIso } from "../fechas";
import { armarCarrusel, type ImagenCarrusel } from "./carrusel";
import { lunesDe } from "./semana";
import { usuarioDeInstagram } from "./texto";

/**
 * OL-516 (bitácora 549): el lugar o el artista de la semana (y el publicado a mano desde su ficha, OL-515) sale como carrusel cuando tiene eventos
 * esa semana. Founder (2026-11-12): «el usuario ve la ficha del lugar destacado y si hace swipe ve los dos carteles a los que se refieren».
 *   · Qué entra: sus eventos de la semana del día en que sale (de ese día al domingo), que no hayan terminado, sin los marcos de festival (cuentan
 *     sus funciones). Los mismos que cuenta la píldora de la tarjeta («Esta semana: N eventos»): la tarjeta y el carrusel dicen lo mismo.
 *   · Dos funciones de la misma obra (el mismo título, sin acentos ni signos) son una sola: la primera fecha manda, el texto dice todas.
 *   · Las imágenes: la tarjeta de siempre y, después, una por obra (su cartel o el diseño de Crear cartel si no tiene), en orden de fecha y hasta
 *     cinco. Lo arma `armarCarrusel` (el mismo del festival y de «Esta semana»): dos obras con el mismo cartel van en una imagen.
 * Puro: lo usan el trabajador, la vista previa, las dos hojas (en el teléfono) y sus pruebas (`semanaDeFicha.test.ts`).
 */

/** Hasta cinco imágenes de eventos (con la tarjeta, seis). */
export const TOPE_EVENTOS_FICHA = 5;

/** Un evento de la ficha esa semana, como sale de la base. `usuarios`: las cuentas de Instagram de sus artistas (sin @). */
export type EventoDeFicha = {
  id: string;
  slug?: string | null;
  titulo: string;
  inicio: string;
  fin: string | null;
  zona: string;
  imagen: string | null;
  huella?: string | null;
  usuarios?: string[];
  /** Dónde es (el artista: cada evento en su sitio). */
  lugar?: string | null;
  lugarRedes?: unknown;
};

/** Una obra de la semana: la primera función con sus datos y todas sus funciones por venir, en orden. */
export type ObraDeLaSemana = EventoDeFicha & { funciones: { inicio: string; fin: string | null }[] };

/** Lo que el texto necesita de una obra (las hojas lo reciben así del servidor). */
export type ObraEnTexto = Pick<ObraDeLaSemana, "titulo" | "inicio" | "zona"> & Partial<Pick<ObraDeLaSemana, "fin" | "funciones" | "lugar" | "lugarRedes">>;

/** El título para comparar: sin acentos, sin signos, en minúsculas y con un solo espacio. */
export const tituloNormalizado = (t: string): string =>
  t
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("es-MX")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/**
 * Las obras de la semana, en orden de su primera función: sin las que ya terminaron (`ahora`: cuando sale) y con las funciones de una misma obra
 * juntas. La imagen es la de la primera función que tenga cartel.
 */
export function obrasDeLaSemana(eventos: readonly EventoDeFicha[], ahora: Date): ObraDeLaSemana[] {
  const vienen = eventos.filter((e) => !eventoPaso(e.inicio, e.fin, ahora, e.zona)).sort((a, b) => a.inicio.localeCompare(b.inicio) || a.id.localeCompare(b.id));
  const porTitulo = new Map<string, ObraDeLaSemana>();
  for (const e of vienen) {
    const clave = tituloNormalizado(e.titulo) || e.id;
    const ya = porTitulo.get(clave);
    if (!ya) {
      porTitulo.set(clave, { ...e, usuarios: [...new Set(e.usuarios ?? [])], funciones: [{ inicio: e.inicio, fin: e.fin }] });
      continue;
    }
    ya.funciones.push({ inicio: e.inicio, fin: e.fin });
    ya.usuarios = [...new Set([...(ya.usuarios ?? []), ...(e.usuarios ?? [])])];
    if (!ya.imagen?.trim() && e.imagen?.trim()) {
      ya.imagen = e.imagen;
      ya.huella = e.huella ?? null;
    }
  }
  return [...porTitulo.values()];
}

/**
 * La semana de la ficha: la del día en que sale (`fecha`, AAAA-MM-DD; sin ella, hoy), de su lunes a su domingo en la zona de su ciudad (`desde` y
 * `hasta`, para la consulta por el inicio), y desde cuándo cuenta (`desdeDia`: ese día a las 0:00, o ahora si ya es ese día o después): lo que ya
 * terminó entonces no entra.
 */
export function ventanaDeLaSemana(fecha: string | undefined, ahora: Date, zona: string): { desde: string; hasta: string; desdeDia: Date } {
  const lunes = lunesDe(fecha ?? diaLocal(ahora, zona));
  const [a, m, d] = lunes.split("-").map(Number);
  const siguiente = new Date(Date.UTC(a, m - 1, d + 7)).toISOString().slice(0, 10);
  const desdeDia = new Date(Math.max(ahora.getTime(), fecha ? new Date(localAIso(`${fecha}T00:00`, zona) ?? ahora).getTime() : 0));
  return { desde: localAIso(`${lunes}T00:00`, zona) ?? `${lunes}T06:00:00Z`, hasta: localAIso(`${siguiente}T00:00`, zona) ?? `${siguiente}T06:00:00Z`, desdeDia };
}

/** Un evento como lo lee `cargarFicha` (con su lugar y las cuentas de sus artistas). */
export type FilaDeFicha = {
  id: string;
  slug: string | null;
  titulo: string;
  inicio: string;
  fin: string | null;
  zona: string;
  clase: string | null;
  imagen: string | null;
  cartel_huella?: string | null;
  sitio_texto?: string | null;
  lugar?: { nombre: string; redes: unknown } | null;
  artistas?: unknown[];
};

/**
 * De las filas de la base a las obras de la semana: sin los marcos de festival (cuentan sus funciones), sin lo que ya terminó (`desdeDia`) y con
 * las funciones juntas. Las cuentas de cada evento: las de sus artistas y (el artista: cada evento en su sitio) la de su lugar. `delLugar`: la
 * ficha es el lugar, que no se repite en cada renglón.
 */
export function obrasDeFilas(filas: readonly FilaDeFicha[], desdeDia: Date, delLugar: boolean): ObraDeLaSemana[] {
  const eventos: EventoDeFicha[] = filas
    .filter((e) => e.clase !== "festival")
    .map((e) => {
      const artistas = (e.artistas ?? []).map((redes) => usuarioDeInstagram(redes)).filter((u): u is string => !!u);
      const cuentaLugar = delLugar ? null : usuarioDeInstagram(e.lugar?.redes);
      return {
        id: e.id, slug: e.slug, titulo: e.titulo, inicio: e.inicio, fin: e.fin, zona: e.zona, imagen: e.imagen, huella: e.cartel_huella ?? null,
        usuarios: [...new Set([...(cuentaLugar ? [cuentaLugar] : []), ...artistas])],
        lugar: delLugar ? null : (e.lugar?.nombre ?? e.sitio_texto ?? null),
        lugarRedes: delLugar ? [] : (e.lugar?.redes ?? []),
      };
    });
  return obrasDeLaSemana(eventos, desdeDia);
}

/**
 * Las imágenes del carrusel de la ficha: la tarjeta (`portada`, que dibuja `dibujarFicha`) y una por cada una de sus primeras cinco obras (su
 * cartel, o `imagen: null`: el diseño de Crear cartel). Sin obras, la tarjeta sola.
 */
export function carruselDeFicha(f: { nombre: string; cuenta: string | null; semana: readonly ObraDeLaSemana[] }, ahora: Date): ImagenCarrusel[] {
  const obras = f.semana.slice(0, TOPE_EVENTOS_FICHA);
  return armarCarrusel({
    portada: { titulo: f.nombre, imagen: null, usuarios: f.cuenta ? [f.cuenta] : [] },
    eventos: obras.map((o) => ({ id: o.id, titulo: o.titulo, imagen: o.imagen, inicio: o.inicio, fin: o.fin, sesiones: o.funciones, usuarios: o.usuarios ?? [], huella: o.huella ?? null })),
    ahora,
    zona: obras[0]?.zona ?? "America/Mexico_City",
    sinCartel: "diseno",
  });
}

/** «Sáb 14»: el día corto con mayúscula, como en «Esta semana». */
const diaCorto = (iso: string, zona: string, ahora: Date) => diaConMes(iso, ahora, zona).replace(/ de .*$/, "");
const conMayuscula = (s: string) => (s ? `${s[0].toLocaleUpperCase("es-MX")}${s.slice(1)}` : s);
const enLista = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} y ${xs.at(-1)}` : (xs[0] ?? ""));

/**
 * El renglón de una obra en el texto, con el formato de «Esta semana» («Vie 16 · 7:00 pm · Título · Lugar @cuenta»). Varias funciones: «Sáb 14 y
 * dom 15 · 8:00 pm · …» si son a la misma hora; si no, «Sáb 14, 8:00 pm y dom 15, 7:00 pm · …». `conLugar`: el artista (el lugar ya es la ficha).
 */
export function renglonDeObra(o: ObraEnTexto, ahora: Date, conLugar: boolean): string {
  const funciones = o.funciones?.length ? o.funciones : [{ inicio: o.inicio, fin: o.fin ?? null }];
  const horas = [...new Set(funciones.map((f) => horaCorta(f.inicio, o.zona)))];
  const dias = funciones.map((f) => diaCorto(f.inicio, o.zona, ahora));
  const cuando = horas.length === 1 ? `${conMayuscula(enLista([...new Set(dias)]))} · ${horas[0]}` : conMayuscula(enLista(funciones.map((f, i) => `${dias[i]}, ${horaCorta(f.inicio, o.zona)}`)));
  const cuenta = conLugar ? usuarioDeInstagram(o.lugarRedes) : null;
  const lugar = conLugar && o.lugar?.trim() ? ` · ${o.lugar.trim()}${cuenta ? ` @${cuenta}` : ""}` : "";
  return `${cuando} · ${o.titulo.trim()}${lugar}`;
}

/** «Y 2 más en su ficha.» */
export const masEnSuFicha = (n: number): string => `Y ${n} más en su ficha.`;

/**
 * El bloque del texto con sus eventos de la semana: «Esta semana:» y un renglón por obra, hasta `cuantas` (cinco: las mismas de las imágenes); si
 * hay más, «Y N más en su ficha.». Null si no tiene.
 */
export function bloqueDeLaSemana(obras: readonly ObraEnTexto[], ahora: Date, o: { conLugar: boolean; cuantas?: number }): string | null {
  if (!obras.length) return null;
  const n = Math.max(1, Math.min(o.cuantas ?? TOPE_EVENTOS_FICHA, TOPE_EVENTOS_FICHA, obras.length));
  const lineas = obras.slice(0, n).map((x) => renglonDeObra(x, ahora, o.conLugar));
  const resto = obras.length - n;
  return [`Esta semana:`, ...lineas, ...(resto > 0 ? [masEnSuFicha(resto)] : [])].join("\n");
}

/**
 * Lo que dicen las hojas bajo la tarjeta: «Sale con 3 imágenes: su tarjeta y sus 2 eventos de esta semana.» Null si sale la tarjeta sola. `n`:
 * cuántas imágenes salen (con la tarjeta); `eventos`: cuántas obras llevan (si dos comparten cartel, son más que las imágenes).
 */
export function lineaDelCarrusel(n: number, eventos = n - 1): string | null {
  if (n < 2) return null;
  const suyos = eventos === 1 ? "su evento" : `sus ${eventos} eventos`;
  return eventos === n - 1 ? `Sale con ${n} imágenes: su tarjeta y ${suyos} de esta semana.` : `Sale con ${n} imágenes: su tarjeta y los carteles de ${suyos} de esta semana.`;
}
