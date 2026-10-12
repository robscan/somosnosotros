/**
 * Cuándo sale el banner para compartir la app en Inicio (OL-387; prototipo firmado `inicio-propuestas.html`, B1 «tras Destacados», bitácora 417).
 * El founder (2026-10-12): «aparecerá para usuarios logueados que hayan entrado más de 2 veces». Se cuenta en el teléfono, no en el servidor: en
 * `localStorage`, la lista de días distintos (YYYY-MM-DD, el día de la ciudad) en que se abrió Inicio con sesión, así recargar no cuenta. Sale desde
 * el tercer día distinto. La × lo esconde 30 días; tras compartir no vuelve. Todo en una sola llave; sin red, sin tabla y sin saber nada de la
 * persona en el servidor. Sin almacenamiento (modo privado, bloqueado o lleno), no sale: si no se puede recordar la ×, no se insiste.
 */

/** Lo que guarda el teléfono. */
export type EstadoCompartir = {
  /** Los días distintos en que se abrió Inicio con sesión, del más viejo al más nuevo; como mucho los últimos `MAXIMO_DIAS`. */
  dias: string[];
  /** La × lo esconde hasta este día (sin incluirlo): hoy + `DESCANSO_DIAS`. */
  cerradoHasta: string | null;
  /** Tocó «Compartir» y no canceló la hoja (o se copió el enlace): no vuelve. */
  compartido: boolean;
};

export const LLAVE_COMPARTIR = "somosnosotros:inicio-compartir";
/** «Más de 2 veces»: desde el tercer día distinto. */
export const DIAS_PARA_BANNER = 3;
export const MAXIMO_DIAS = 10;
export const DESCANSO_DIAS = 30;

/** Lo que se usa del almacén (en las pruebas, uno de mentira). */
export type Almacen = Pick<Storage, "getItem" | "setItem">;

const NADA: EstadoCompartir = { dias: [], cerradoHasta: null, compartido: false };
const DIA = /^\d{4}-\d{2}-\d{2}$/;

function almacenLocal(): Almacen | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // modo privado o almacenamiento bloqueado
  }
}

/** "2026-10-12" + 30 → "2026-11-11": días de calendario, sin horas de por medio. */
export function sumarDias(dia: string, n: number): string {
  const [anio, mes, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, d + n)).toISOString().slice(0, 10);
}

/** Lo guardado lo pudo tocar cualquiera: solo pasa lo que tiene la forma; con algo ilegible, como si no hubiera nada. */
export function leerEstado(crudo: string | null): EstadoCompartir {
  try {
    const x: unknown = JSON.parse(crudo ?? "null");
    if (typeof x !== "object" || x === null) return NADA;
    const r = x as Record<string, unknown>;
    const dias = Array.isArray(r.dias) ? [...new Set(r.dias.filter((d): d is string => typeof d === "string" && DIA.test(d)))].sort().slice(-MAXIMO_DIAS) : [];
    const cerradoHasta = typeof r.cerradoHasta === "string" && DIA.test(r.cerradoHasta) ? r.cerradoHasta : null;
    return { dias, cerradoHasta, compartido: r.compartido === true };
  } catch {
    return NADA;
  }
}

/** Abrió Inicio con sesión hoy: el día cuenta una sola vez. */
export function anotarVisita(e: EstadoCompartir, hoy: string): EstadoCompartir {
  if (e.dias.includes(hoy)) return e;
  return { ...e, dias: [...e.dias, hoy].sort().slice(-MAXIMO_DIAS) };
}

/** ¿Sale hoy? Desde el tercer día distinto, si no compartió y si la × ya descansó. */
export function tocaBanner(e: EstadoCompartir, hoy: string): boolean {
  if (e.compartido || e.dias.length < DIAS_PARA_BANNER) return false;
  return e.cerradoHasta === null || hoy >= e.cerradoHasta;
}

/** La ×: no vuelve en 30 días. */
export const cerrarBanner = (e: EstadoCompartir, hoy: string): EstadoCompartir => ({ ...e, cerradoHasta: sumarDias(hoy, DESCANSO_DIAS) });

/** Compartió: no vuelve. */
export const marcarCompartido = (e: EstadoCompartir): EstadoCompartir => ({ ...e, compartido: true });

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

/** Se abrió Inicio con sesión: anota el día y dice si sale el banner. Si no se puede leer o guardar, no sale (sin memoria, la × no se recordaría). */
export function visitaDeInicio(hoy: string, almacen: Almacen | null = almacenLocal()): boolean {
  const antes = leerGuardado(almacen);
  if (!antes) return false;
  const despues = anotarVisita(antes, hoy);
  if (despues !== antes && !guardar(despues, almacen)) return false;
  return tocaBanner(despues, hoy);
}

/** La × o «Compartir»: aplica el cambio a lo guardado ahora (no a una copia vieja). */
export function cambiarGuardado(cambio: (e: EstadoCompartir) => EstadoCompartir, almacen: Almacen | null = almacenLocal()): boolean {
  const e = leerGuardado(almacen);
  return e ? guardar(cambio(e), almacen) : false;
}

/*
 * Si el banner está a la vista en esta página, como un almacén externo (`useSyncExternalStore`, mismo patrón que `lib/recientesBusqueda`): Inicio
 * lo decide al montarse (`abrirInicio`, en un efecto), la × y «Compartir» lo quitan, «Deshacer» lo devuelve. En el servidor y al hidratar, no se
 * ve: el servidor no sabe nada de las visitas.
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

/** Se abrió Inicio con sesión: anota el día y muestra el banner si toca. */
export function abrirInicio(hoy: string, almacen: Almacen | null = almacenLocal()): void {
  fijarBanner(visitaDeInicio(hoy, almacen));
}

export const mostrarBanner = (): void => fijarBanner(true);
export const ocultarBanner = (): void => fijarBanner(false);
