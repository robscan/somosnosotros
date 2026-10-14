/**
 * Cuándo sale el banner para compartir la app en Inicio (OL-387; prototipo firmado `inicio-propuestas.html`, B1 «tras Destacados», bitácora 417).
 * El founder (2026-10-12): «aparecerá para usuarios logueados que hayan entrado más de 2 veces». Se cuenta en el teléfono, no en el servidor: en
 * `localStorage`, la lista de días distintos (YYYY-MM-DD, el día de la ciudad) en que se abrió Inicio, así recargar no cuenta. Salía desde
 * el tercer día distinto y solo con sesión; desde OL-397 (founder, la noche del 12: «mejor que lo vea todos siempre. Luego volvemos a este
 * criterio de 3 días») sale desde el primer día y con o sin sesión (`DIAS_PARA_BANNER`).
 *
 * La × y compartir, desde OL-407 (founder, 2026-10-14: «Que el banner de compartir no se oculte al compartir una vez. Si se cierra se vuelve a
 * abrir al siguiente inicio de sesión»): compartir ya no lo esconde (antes, tras compartir no volvía nunca) y la × lo esconde solo en esta sesión
 * de uso de la app (antes, OL-387 y OL-397, 30 días). La marca de la × vive en `sessionStorage`, como lo «ya visto» de la fila Ahora
 * (`FilaAhora`) y la memoria de pantalla (`lib/memoriaPantalla`): en la app instalada muere al cerrar la app, en Safari al cerrar la pestaña, y la
 * siguiente vez que se abre, el banner vuelve. Lo que guardaban los teléfonos antes (`cerradoHasta`, `compartido`) se lee y se ignora.
 *
 * Sin red, sin tabla y sin saber nada de la persona en el servidor. Sin almacenamiento (bloqueado o lleno), no sale: si no se puede recordar la ×,
 * no se insiste.
 */

/** Lo que guarda el teléfono (en `localStorage`). */
export type EstadoCompartir = {
  /** Los días distintos en que se abrió Inicio, del más viejo al más nuevo; como mucho los últimos `MAXIMO_DIAS`. */
  dias: string[];
};

export const LLAVE_COMPARTIR = "somosnosotros:inicio-compartir";
/** La × en esta sesión de uso (en `sessionStorage`): "1" mientras dure. */
export const LLAVE_CERRADO = "somosnosotros:inicio-compartir-cerrado";
/** Desde el primer día: el founder (2026-10-12, noche): «mejor que lo vea todos siempre. Luego volvemos a este criterio de 3 días» (OL-397).
 * La regla de OL-387 («más de 2 veces»: desde el tercer día distinto) se vuelve a poner cambiando este número a 3. */
export const DIAS_PARA_BANNER = 1;
export const MAXIMO_DIAS = 10;

/** Lo que se usa del almacén (en las pruebas, uno de mentira). */
export type Almacen = Pick<Storage, "getItem" | "setItem">;
/** Lo que se usa del almacén de la sesión de uso: además, quitar la marca («Deshacer»). */
export type AlmacenSesion = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const NADA: EstadoCompartir = { dias: [] };
const DIA = /^\d{4}-\d{2}-\d{2}$/;

function almacenLocal(): Almacen | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // almacenamiento bloqueado
  }
}

function almacenSesion(): AlmacenSesion | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Lo guardado lo pudo tocar cualquiera: solo pasa lo que tiene la forma; con algo ilegible, como si no hubiera nada. Lo de antes de OL-407
 * (`cerradoHasta`, `compartido`) se ignora. */
export function leerEstado(crudo: string | null): EstadoCompartir {
  try {
    const x: unknown = JSON.parse(crudo ?? "null");
    if (typeof x !== "object" || x === null) return NADA;
    const r = x as Record<string, unknown>;
    const dias = Array.isArray(r.dias) ? [...new Set(r.dias.filter((d): d is string => typeof d === "string" && DIA.test(d)))].sort().slice(-MAXIMO_DIAS) : [];
    return { dias };
  } catch {
    return NADA;
  }
}

/** Abrió Inicio hoy: el día cuenta una sola vez. */
export function anotarVisita(e: EstadoCompartir, hoy: string): EstadoCompartir {
  if (e.dias.includes(hoy)) return e;
  return { ...e, dias: [...e.dias, hoy].sort().slice(-MAXIMO_DIAS) };
}

/** ¿Sale? Desde el día `DIAS_PARA_BANNER` (hoy el primero), si no se cerró con la × en esta sesión de uso. Compartir no cuenta (OL-407). */
export function tocaBanner(e: EstadoCompartir, cerradoEnEstaSesion: boolean): boolean {
  return !cerradoEnEstaSesion && e.dias.length >= DIAS_PARA_BANNER;
}

/** Lo guardado ahora mismo; sin almacén, null (y el banner no sale). */
export function leerGuardado(almacen: Almacen | null = almacenLocal()): EstadoCompartir | null {
  if (!almacen) return null;
  try {
    return leerEstado(almacen.getItem(LLAVE_COMPARTIR));
  } catch {
    return null;
  }
}

/** Guarda; false si no se pudo (lleno o bloqueado). */
export function guardar(e: EstadoCompartir, almacen: Almacen | null = almacenLocal()): boolean {
  if (!almacen) return false;
  try {
    almacen.setItem(LLAVE_COMPARTIR, JSON.stringify(e));
    return true;
  } catch {
    return false;
  }
}

/** ¿Se cerró con la × en esta sesión de uso? null si no se puede saber (sin almacén de sesión). */
export function cerradoEnEstaSesion(sesion: AlmacenSesion | null = almacenSesion()): boolean | null {
  if (!sesion) return null;
  try {
    return sesion.getItem(LLAVE_CERRADO) === "1";
  } catch {
    return null;
  }
}

/** La ×: no vuelve en esta sesión de uso; la siguiente vez que se abre la app, sí. false si no se pudo anotar. */
export function cerrarEnEstaSesion(sesion: AlmacenSesion | null = almacenSesion()): boolean {
  if (!sesion) return false;
  try {
    sesion.setItem(LLAVE_CERRADO, "1");
    return true;
  } catch {
    return false;
  }
}

/** «Deshacer» la ×. */
export function reabrirEnEstaSesion(sesion: AlmacenSesion | null = almacenSesion()): void {
  try {
    sesion?.removeItem(LLAVE_CERRADO);
  } catch {
    // Bloqueado: si no se pudo leer ni escribir, tampoco quedó la marca.
  }
}

/** Se abrió Inicio (con o sin sesión): anota el día y dice si sale el banner. Si no se puede leer o guardar, no sale (sin memoria, la × no se
 * recordaría). */
export function visitaDeInicio(hoy: string, almacen: Almacen | null = almacenLocal(), sesion: AlmacenSesion | null = almacenSesion()): boolean {
  const antes = leerGuardado(almacen);
  if (!antes) return false;
  const despues = anotarVisita(antes, hoy);
  if (despues !== antes && !guardar(despues, almacen)) return false;
  const cerrado = cerradoEnEstaSesion(sesion);
  return cerrado !== null && tocaBanner(despues, cerrado);
}

/*
 * Si el banner está a la vista en esta página, como un almacén externo (`useSyncExternalStore`, mismo patrón que `lib/recientesBusqueda`): Inicio
 * lo decide al montarse (`abrirInicio`, en un efecto), la × lo quita, «Deshacer» lo devuelve. En el servidor y al hidratar, no se ve: el
 * servidor no sabe nada de las visitas.
 */
let aLaVista = false;
const escuchas = new Set<() => void>();

function fijarBanner(visible: boolean) {
  if (visible === aLaVista) return;
  aLaVista = visible;
  for (const escucha of escuchas) escucha();
}

export function suscribirseBanner(escucha: () => void): () => void {
  escuchas.add(escucha);
  return () => escuchas.delete(escucha);
}

export const bannerALaVista = (): boolean => aLaVista;

/** Se abrió Inicio: anota el día y muestra el banner si toca. */
export function abrirInicio(hoy: string, almacen: Almacen | null = almacenLocal(), sesion: AlmacenSesion | null = almacenSesion()): void {
  fijarBanner(visitaDeInicio(hoy, almacen, sesion));
}

export const mostrarBanner = (): void => fijarBanner(true);
export const ocultarBanner = (): void => fijarBanner(false);
