/**
 * Recuerdo de las decisiones de esta visita (OL-222, bitácora 251): Next reutiliza una página ya vista hasta 60 s
 * (`experimental.staleTimes.dynamic`, bitácora 043) y siempre con Atrás/Adelante (nunca vuelve a pedirla), y desde
 * el PR #257 (OL-212, tercera vuelta) guardar Voy/Me interesa/Seguir desde una lista aplaza su `revalidatePath` con
 * `after()` para no repintar la pantalla desde la que se guarda. Esa página vieja, al volver a verla, no sabe nada
 * de lo decidido después: «Tus planes» seguía mostrando un evento ya quitado, con su check y todo.
 *
 * Mismo estilo que `lib/memoriaPantalla.ts`: sessionStorage (muere con la pestaña, nunca sale del teléfono), con
 * `Almacen` inyectable para las pruebas y try/catch en cada acceso (modo privado o almacenamiento bloqueado: sin
 * memoria, sin romper nada). Una sola entrada, con la cuenta que decidió adentro: si otra cuenta entra en la misma
 * pestaña (o nadie cerró sesión de verdad), lo de la cuenta anterior no aplica — se trata como si no hubiera nada.
 *
 * Cómo se corrige (decisión de este operador, ver bitácora 251): en vez de pasarle a cada lista la hora en que el
 * servidor armó la página —tocaría `CarrilTusPlanes`, `CarrilAgenda`, cada ficha, Agenda, Artistas y también
 * Lugares/`VistaLugares`, fuera de esta pieza—, cada decisión guardada se compara contra lo que trae el servidor:
 * si ya coincide, la página está al día y la decisión se limpia (ya no hace falta); si no coincide, manda la
 * decisión. Así ninguna pantalla ni componente nuevo tiene que enterarse de esto — los dos hooks (`useAsistenciaEnLista`,
 * `useSeguirEnLista`) lo resuelven solos y todo el que ya los use queda corregido, incluida Lugares. Límite conocido:
 * si otro dispositivo cambiara la misma decisión antes de que el servidor la reflejara aquí, esta pestaña tardaría en
 * verlo (se queda con lo decidido aquí hasta que el servidor coincida) — más seguro que el bug de hoy, que siempre
 * muestra lo viejo.
 */

import type { Asistencia } from "./deslizar";

export type Almacen = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type Decidido<V> = { valor: V; hora: number };
type Datos = {
  cuenta: string;
  asistencia: Record<string, Decidido<Asistencia>>;
  seguirLugar: Record<string, Decidido<boolean>>;
  seguirArtista: Record<string, Decidido<boolean>>;
};

const CLAVE = "somosnosotros:visita";

function vacio(cuenta: string): Datos {
  return { cuenta, asistencia: {}, seguirLugar: {}, seguirArtista: {} };
}

function almacenDelNavegador(): Almacen | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null; // modo privado o almacenamiento bloqueado: sin memoria, sin romper nada
  }
}

/** Lo guardado, si es de esta cuenta; si no (u otra cuenta, o no hay nada, o está roto), como si no hubiera nada. */
function leer(cuenta: string, almacen: Almacen | null): Datos {
  if (!almacen) return vacio(cuenta);
  try {
    const crudo = almacen.getItem(CLAVE);
    if (!crudo) return vacio(cuenta);
    const d = JSON.parse(crudo) as Partial<Datos> | null;
    if (!d || typeof d !== "object" || d.cuenta !== cuenta) return vacio(cuenta);
    return { cuenta, asistencia: d.asistencia ?? {}, seguirLugar: d.seguirLugar ?? {}, seguirArtista: d.seguirArtista ?? {} };
  } catch {
    return vacio(cuenta);
  }
}

function escribir(datos: Datos, almacen: Almacen | null): void {
  if (!almacen) return;
  try {
    almacen.setItem(CLAVE, JSON.stringify(datos));
  } catch {}
}

/** Voy, Me interesa o quitar (`null`) en un evento, decidido ahora mismo desde una lista. */
export function guardarDecisionAsistencia(cuenta: string, eventoId: string, valor: Asistencia, almacen: Almacen | null = almacenDelNavegador()): void {
  if (!cuenta) return;
  const datos = leer(cuenta, almacen);
  datos.asistencia[eventoId] = { valor, hora: Date.now() };
  escribir(datos, almacen);
}

/** Seguir o dejar de seguir un lugar o artista, decidido ahora mismo desde una lista. */
export function guardarDecisionSeguir(cuenta: string, que: "lugar" | "artista", id: string, valor: boolean, almacen: Almacen | null = almacenDelNavegador()): void {
  if (!cuenta) return;
  const datos = leer(cuenta, almacen);
  const mapa = que === "lugar" ? datos.seguirLugar : datos.seguirArtista;
  mapa[id] = { valor, hora: Date.now() };
  escribir(datos, almacen);
}

/**
 * Lo que dio el servidor (`decididas`/`asistencias` de la lista), corregido con las decisiones de esta visita que
 * el servidor todavía no refleje. Sin sesión (`servidor` null) no hay nada que corregir. Puro: no toca el almacén.
 */
export function corregirAsistencias(cuenta: string | null, servidor: Record<string, Asistencia> | null, almacen: Almacen | null = almacenDelNavegador()): Record<string, Asistencia> | null {
  if (!cuenta || !servidor) return servidor;
  const datos = leer(cuenta, almacen);
  let corregido = servidor;
  for (const [id, decidido] of Object.entries(datos.asistencia)) {
    const actual = servidor[id] ?? null;
    if (actual === decidido.valor) continue; // el servidor ya lo refleja
    if (corregido === servidor) corregido = { ...servidor };
    corregido[id] = decidido.valor;
  }
  return corregido;
}

/** Lo mismo que `corregirAsistencias`, para `iniciales` (los ids que sigue) de lugares o artistas. */
export function corregirSeguidos(cuenta: string | null, que: "lugar" | "artista", servidor: string[] | null, almacen: Almacen | null = almacenDelNavegador()): string[] | null {
  if (!cuenta || !servidor) return servidor;
  const datos = leer(cuenta, almacen);
  const mapa = que === "lugar" ? datos.seguirLugar : datos.seguirArtista;
  const entradas = Object.entries(mapa);
  if (entradas.length === 0) return servidor;
  const conjunto = new Set(servidor);
  let cambio = false;
  for (const [id, decidido] of entradas) {
    if (conjunto.has(id) === decidido.valor) continue; // el servidor ya lo refleja
    cambio = true;
    if (decidido.valor) conjunto.add(id);
    else conjunto.delete(id);
  }
  return cambio ? [...conjunto] : servidor;
}

/** Llegó una foto nueva del servidor: lo que ya coincide se limpia, para no seguir corrigiendo con eso ni dejarlo tirado. */
export function limpiarAsistenciasResueltas(cuenta: string | null, servidor: Record<string, Asistencia> | null, almacen: Almacen | null = almacenDelNavegador()): void {
  if (!cuenta || !servidor) return;
  const datos = leer(cuenta, almacen);
  let cambio = false;
  for (const [id, decidido] of Object.entries(datos.asistencia)) {
    if ((servidor[id] ?? null) === decidido.valor) {
      delete datos.asistencia[id];
      cambio = true;
    }
  }
  if (cambio) escribir(datos, almacen);
}

/** Lo mismo que `limpiarAsistenciasResueltas`, para Seguir. */
export function limpiarSeguidosResueltos(cuenta: string | null, que: "lugar" | "artista", servidor: string[] | null, almacen: Almacen | null = almacenDelNavegador()): void {
  if (!cuenta || !servidor) return;
  const datos = leer(cuenta, almacen);
  const mapa = que === "lugar" ? datos.seguirLugar : datos.seguirArtista;
  const conjunto = new Set(servidor);
  let cambio = false;
  for (const [id, decidido] of Object.entries(mapa)) {
    if (conjunto.has(id) === decidido.valor) {
      delete mapa[id];
      cambio = true;
    }
  }
  if (cambio) escribir(datos, almacen);
}

/** Al cerrar sesión (`BotonSalir`): el recuerdo es de la cuenta que se fue, no de quien entre después en la misma pestaña. */
export function borrarDecisionesVisita(almacen: Almacen | null = almacenDelNavegador()): void {
  if (!almacen) return;
  try {
    almacen.removeItem(CLAVE);
  } catch {}
}
