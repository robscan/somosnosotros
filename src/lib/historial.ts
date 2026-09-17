/**
 * Marca propia de navegación (Atrás coherente, OL-055): cada entrada del historial que pisa la app lleva en su estado
 * cuántas pantallas de la app tiene detrás y, si se apiló desde otra pantalla de la app, cuál era (ruta y consulta).
 * Atrás vuelve con el historial solo si hay alguna pantalla detrás; si no (enlace compartido, app recién abierta, o ya
 * de vuelta en la primera) va a la pantalla madre. `history.length` no sirve para decidirlo: cuenta también las entradas
 * de adelante y las de otros sitios. Terminar una tarea (guardar, entrar) mira de qué pantalla se vino para volver a ella.
 * La instala `Navegacion` (en el layout) sobre el historial del navegador; Atrás la lee al tocar.
 * Aquí vive también la vuelta de entrar con Apple o Google (OL-069), que es el único camino por el que la app sale del
 * sitio y regresa con una carga completa.
 */
import { rutaSegura } from "./rutas";

/** Dónde va la marca dentro del estado de la entrada (Next.js guarda ahí lo suyo con otras llaves). */
export const LLAVE_MARCA = "somosnosotros";
/** Dónde va la pantalla desde la que se apiló la entrada. */
export const LLAVE_DESDE = "somosnosotrosDesde";

function comoObjeto(estado: unknown): Record<string, unknown> {
  return typeof estado === "object" && estado !== null ? (estado as Record<string, unknown>) : {};
}

/** La marca de una entrada: cuántas pantallas de la app tiene detrás, o null si no lleva (entrada nueva o ajena). */
export function leerMarca(estado: unknown): number | null {
  const v = comoObjeto(estado)[LLAVE_MARCA];
  return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;
}

/** La pantalla desde la que se apiló la entrada (ruta y consulta), o null si no se sabe. */
export function leerDesde(estado: unknown): string | null {
  const v = comoObjeto(estado)[LLAVE_DESDE];
  return typeof v === "string" && v.startsWith("/") ? v : null;
}

/** El estado de la entrada con la marca (y, si se sabe, la pantalla de detrás) puesta, sin tocar lo demás. */
export function conMarca(estado: unknown, marca: number, desde: string | null = null): Record<string, unknown> {
  const nuevo: Record<string, unknown> = { ...comoObjeto(estado), [LLAVE_MARCA]: marca };
  if (desde) nuevo[LLAVE_DESDE] = desde;
  else delete nuevo[LLAVE_DESDE];
  return nuevo;
}

/** Al apilar una pantalla nueva: una más que la entrada de la que se sale. */
export function marcaAlApilar(desde: number | null): number {
  return (desde ?? 0) + 1;
}

/**
 * Al reemplazar (un filtro, "Ver más", la salida a la pantalla madre): la entrada es la misma y conserva su marca.
 * Si ya no la tiene, vale la que traiga el estado nuevo; si tampoco, ninguna pantalla detrás.
 */
export function marcaAlReemplazar(actual: number | null, nueva: number | null): number {
  return actual ?? nueva ?? 0;
}

/**
 * Rutas del sitio que no son pantallas: venir de ellas no es venir de una pantalla de la app. Hoy, la ida y la vuelta
 * de Apple y de Google (`/auth/...`), que pasan por el sitio pero dejan detrás al proveedor, no una pantalla nuestra.
 */
function esRutaTecnica(ruta: string): boolean {
  return ruta === "/auth" || ruta.startsWith("/auth/");
}

/**
 * Una entrada que se abre sin marca (enlace compartido, app instalada, carga completa desde otra pantalla):
 * tiene una pantalla de la app detrás solo si la trajo un enlace del mismo sitio y el historial tiene de dónde
 * (una pestaña nueva abierta desde la app trae el referente, pero nada detrás).
 * Volver de Apple o de Google no cuenta, aunque el referente sea del sitio: lo que queda detrás es la pantalla del
 * proveedor (OL-069). Su relevo (`/auth/[proveedor]`) no deja entrada propia —se reenvía antes de terminar de cargar,
 * y entonces el navegador reemplaza la entrada en vez de apilarla—, así que sin esto Atrás salía del sitio.
 */
export function marcaDeLlegada(referente: string, origen: string, largoDelHistorial: number): number {
  if (!referente || largoDelHistorial <= 1) return 0;
  try {
    const u = new URL(referente);
    return u.origin === origen && !esRutaTecnica(u.pathname) ? 1 : 0;
  } catch {
    return 0;
  }
}

/** Lo que la pantalla de Entrar deja apuntado antes de salir hacia Apple o Google, para saber a dónde vuelve Atrás. */
export const APUNTE_VUELTA = "sn_vuelta";
/** El apunte caduca con el intento de entrar (10 minutos): pasado eso, la carga ya no es aquella vuelta. */
const VIGENCIA_APUNTE_MS = 600_000;

/** Lo que se usa del almacén de la pestaña (en las pruebas, uno de mentira). */
export type Almacen = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** De qué pantalla se vino y a cuál iba, apuntado al salir hacia el proveedor. */
export type Apunte = { desde: string; siguiente: string; cuando: number };

/**
 * La pantalla de la app de la que se vino, leída del referente. Sirve cuando la entrada no la anotó porque se llegó
 * con una carga completa (un toque antes de que la pantalla responda al dedo, un enlace compartido): entonces no hay
 * `somosnosotrosDesde`, pero el navegador sí dice de dónde vino. No cuenta si viene de fuera, de una ruta técnica
 * (la vuelta de un proveedor) o de esta misma pantalla (una recarga). Null cuando no se sabe.
 */
export function desdeElReferente(referente: string, origen: string, aqui: string): string | null {
  if (!referente) return null;
  try {
    const u = new URL(referente);
    if (u.origin !== origen || esRutaTecnica(u.pathname) || u.pathname === aqui) return null;
    return `${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

/** Entrar lo apunta al tocar "Continuar con Apple" o "Continuar con Google". Si el almacén no está, no pasa nada. */
export function apuntarVuelta(almacen: Almacen | null, apunte: Apunte): void {
  try {
    almacen?.setItem(APUNTE_VUELTA, JSON.stringify(apunte));
  } catch {}
}

/**
 * La pantalla a la que debe volver Atrás, leída del apunte y borrándolo (sirve una sola vez, como el intento). Null si
 * no hay apunte, si no se entiende, si caducó o si esta carga no es la vuelta que esperaba: por cualquier otro camino
 * Atrás hace lo de siempre. Una ruta que no sea del sitio se cambia por el inicio: el apunte vive en la pestaña y
 * nadie puede usarlo para mandar a la persona fuera.
 */
export function leerVuelta(almacen: Almacen | null, url: string, ahora: number): string | null {
  let crudo: string | null = null;
  try {
    crudo = almacen?.getItem(APUNTE_VUELTA) ?? null;
    almacen?.removeItem(APUNTE_VUELTA);
  } catch {
    return null;
  }
  if (!crudo) return null;
  try {
    const a = JSON.parse(crudo) as Partial<Apunte>;
    if (typeof a.desde !== "string" || typeof a.siguiente !== "string" || typeof a.cuando !== "number") return null;
    if (ahora - a.cuando > VIGENCIA_APUNTE_MS || a.cuando > ahora + 60_000) return null;
    if (a.siguiente !== url) return null;
    return rutaSegura(a.desde, "/");
  } catch {
    return null;
  }
}

/** Atrás vuelve con el historial si la entrada tiene una pantalla de la app detrás y el historial tiene de dónde. */
export function hayPantallaAnterior(marca: number | null, largoDelHistorial: number): boolean {
  return (marca ?? 0) > 0 && largoDelHistorial > 1;
}

/** La ruta de una URL de la app, sin consulta ni ancla. */
export function rutaDe(url: string): string {
  return url.split(/[?#]/)[0];
}

/**
 * Si terminar una tarea puede volver con el historial a `destino`: la pantalla de detrás es de la app y tiene su misma
 * ruta (se vino de la ficha a editarla, de la ficha a entrar, del alta de evento a registrar un lugar).
 */
export function vuelveA(estado: unknown, largoDelHistorial: number, destino: string): boolean {
  const desde = leerDesde(estado);
  return hayPantallaAnterior(leerMarca(estado), largoDelHistorial) && desde !== null && rutaDe(desde) === rutaDe(destino);
}

/** Lo que se usa del historial del navegador (en las pruebas, uno de mentira). */
export type Historial = {
  readonly state: unknown;
  pushState(estado: unknown, titulo: string, url?: string | URL | null): void;
  replaceState(estado: unknown, titulo: string, url?: string | URL | null): void;
};

/**
 * Pone la marca donde se escribe el historial. Next.js reescribe el estado de la entrada al navegar y al refrescar sin
 * conservar lo ajeno, así que apilar y reemplazar se envuelven:
 * - apilar suma una a la entrada de la que se sale y anota esa pantalla (`ubicacion`, la URL que aún está en la barra);
 * - reemplazar conserva la marca y la pantalla de detrás de la entrada.
 * La entrada actual, si no tiene marca, recibe la de llegada. Envolver dos veces da las mismas marcas: las dos capas
 * las calculan de la misma entrada.
 */
export function ponerMarca(h: Historial, llegada: number, ubicacion: () => string): void {
  const apilar = h.pushState;
  const reemplazar = h.replaceState;
  h.pushState = function (estado, titulo, url) {
    apilar.call(h, conMarca(estado, marcaAlApilar(leerMarca(h.state)), ubicacion()), titulo, url);
  };
  h.replaceState = function (estado, titulo, url) {
    reemplazar.call(h, conMarca(estado, marcaAlReemplazar(leerMarca(h.state), leerMarca(estado)), leerDesde(h.state) ?? leerDesde(estado)), titulo, url);
  };
  if (leerMarca(h.state) === null) reemplazar.call(h, conMarca(h.state, llegada), "");
}

/**
 * Lo que Next.js pone en el estado de sus entradas (`__NA` y la pantalla guardada). Su router mira dos cosas: al
 * escribir el historial, si el estado ya lleva `__NA` o `_N` lo deja pasar tal cual en vez de copiarle lo suyo y dar
 * la URL por navegada; al volver a una entrada, si no lleva `__NA` recarga la página. Una entrada con `_N` es, para
 * él, de fuera: no la toca al crearla y la recarga al volver. Justo lo que necesita la pantalla que reponemos.
 */
const AJENA_A_NEXT = { _N: true } as const;

/**
 * Repone la pantalla de la que se vino al entrar con Apple o con Google (OL-069). La vuelta del proveedor llega con una
 * carga completa y deja su pantalla pegada detrás del destino, así que el primer Atrás (botón o gesto) salía del sitio.
 * Aquí la entrada que ocupa el destino pasa a ser la pantalla de origen y el destino se apila encima, con el estado que
 * Next.js ya le había puesto: queda una pantalla nuestra de por medio y Atrás vuelve a donde estaba la persona.
 * La entrada repuesta no lleva la pantalla guardada de Next.js —no la tenemos, es de otra ruta—, así que al volver a
 * ella su router recarga: la pantalla llega entera y `MemoriaScroll` repone la posición, como en cualquier recarga.
 * Devuelve a dónde se repuso, o null si esta carga no es la vuelta de entrar con un proveedor.
 */
export function reponerPantallaAnterior(h: Historial, almacen: Almacen | null, url: string, ahora: number): string | null {
  const origen = leerVuelta(almacen, url, ahora);
  if (origen === null) return null;
  const delDestino = h.state;
  h.replaceState({ ...AJENA_A_NEXT }, "", origen);
  h.pushState(delDestino, "", url);
  return origen;
}
