/**
 * El giro de las portadas del sistema (OL-375, P8 del prototipo firmado `portadas-sistema.html`; bitácora 405): con la inclinación del teléfono,
 * las figuras de adelante de las portadas a la vista se corren hasta `MAX_UNIDADES` y las de atrás la mitad, desde la postura en que se activó;
 * el título, el chip y el sello no se mueven. Aquí lo que se prueba sin navegador: la preferencia, que vive en el teléfono (`localStorage`, nunca
 * en la cuenta ni en la base: no hace falta migración ni sesión), y las cuentas de la inclinación. El permiso, el sensor y el pintado van en
 * `components/inicio/giroPortadas`; el interruptor, en Ajustes (`app/ajustes/GiroPortadasAjuste`).
 *
 * Decisión del 2026-10-11 (recomendación del gestor, aceptada por el founder con «Continúa. Vamos a prod»): el permiso del iPhone se pide en
 * Ajustes, con el interruptor «Mover las portadas con el teléfono» (Safari solo lo pide tras un toque); en Android no hay permiso y viene
 * encendido. Nunca se mueve con «Reducir movimiento». Sin respaldo de arrastrar con el dedo: competiría con el desplazamiento.
 */
import { MAX_UNIDADES } from "./portadasSistema";

export const CLAVE_GIRO = "sn-giro-portadas";
/** Lo que la persona eligió en este teléfono; sin elegir, null (vale lo de fábrica, `giroQuerido`). */
export type PreferenciaGiro = "encendido" | "apagado";

type AlmacenLectura = Pick<Storage, "getItem">;
type AlmacenEscritura = Pick<Storage, "setItem">;

/** La preferencia guardada. Sin almacén (modo privado, el servidor) o con otro valor: null, lo de fábrica. Nunca truena. */
export function leerGiro(almacen: AlmacenLectura | null): PreferenciaGiro | null {
  try {
    const valor = almacen?.getItem(CLAVE_GIRO);
    return valor === "encendido" || valor === "apagado" ? valor : null;
  } catch {
    return null;
  }
}

/** Guarda la preferencia. Si el teléfono no deja guardar (modo privado), no truena: queda lo de fábrica. Avisa siempre a quien escucha. */
export function guardarGiro(almacen: AlmacenEscritura | null, valor: PreferenciaGiro): void {
  try {
    almacen?.setItem(CLAVE_GIRO, valor);
  } catch {
    // Sin almacenamiento: vale lo de fábrica.
  } finally {
    escuchas.forEach((escucha) => escucha());
  }
}

type Escucha = () => void;
const escuchas = new Set<Escucha>();

/** Para leer la preferencia con `useSyncExternalStore` (el renglón de Ajustes, las portadas de Inicio): avisa cuando se guarda. */
export function suscribirseGiro(escucha: Escucha): () => void {
  escuchas.add(escucha);
  return () => {
    escuchas.delete(escucha);
  };
}

/**
 * ¿La persona quiere el giro? Lo que eligió; sin elegir, encendido donde no hay permiso que pedir (Android) y apagado donde sí (iPhone: Safari
 * solo pide el permiso tras un toque, y ese toque es el del interruptor).
 */
export const giroQuerido = (preferencia: PreferenciaGiro | null, pidePermiso: boolean): boolean => (preferencia ?? (pidePermiso ? "apagado" : "encendido")) === "encendido";

/** ±25° desde la postura de partida llenan el recorrido (como el prototipo). */
export const RECORRIDO_GRADOS = 25;

export type Postura = { gamma: number; beta: number };
const acotar = (v: number) => Math.max(-MAX_UNIDADES, Math.min(MAX_UNIDADES, v));

/**
 * A dónde va la capa de adelante con una postura, desde la de partida, en unidades de la portada: inclinar a la derecha corre las figuras a la
 * derecha; hacia uno, hacia abajo. Acotado a ±`MAX_UNIDADES`.
 */
export const destinoDeGiro = (base: Postura, ahora: Postura): { x: number; y: number } => ({
  x: acotar(((ahora.gamma - base.gamma) / RECORRIDO_GRADOS) * MAX_UNIDADES),
  y: acotar(((ahora.beta - base.beta) / RECORRIDO_GRADOS) * MAX_UNIDADES),
});

/** Un cuadro de la suavización (`requestAnimationFrame`): se acerca un quinto de lo que falta. */
export const suavizar = (actual: number, destino: number): number => actual + (destino - actual) * 0.2;

/** Ya llegó: menos de dos centésimas de unidad en cada eje. Entonces el cálculo se detiene hasta la siguiente lectura que cambie algo. */
export const llego = (actual: { x: number; y: number }, destino: { x: number; y: number }): boolean => Math.abs(destino.x - actual.x) <= 0.02 && Math.abs(destino.y - actual.y) <= 0.02;

/** La traslación de cada capa con el giro en (x, y): la de atrás la mitad que la de adelante, así parece que tienen profundidad. */
export const traslaciones = (x: number, y: number): { atras: string; delante: string } => ({
  atras: `translate(${(x * 0.5).toFixed(2)} ${(y * 0.5).toFixed(2)})`,
  delante: `translate(${x.toFixed(2)} ${y.toFixed(2)})`,
});
