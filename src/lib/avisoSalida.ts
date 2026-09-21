/**
 * Aviso al salir de la plataforma (OL-105, docs/rediseno/29-aviso-al-salir.md): antes de abrir un enlace de
 * evento (boletos/más información) o una red/sitio de artista o lugar, una hoja dice a qué dominio se va y
 * que ahí pueden pedir un pago o datos. La preferencia "no volver a avisarme" vive en el teléfono
 * (localStorage), nunca en la cuenta ni en la base: no hace falta migración ni sesión.
 */
export const CLAVE_SIN_AVISO_SALIDA = "sn-sin-aviso-salida";

type AlmacenLectura = Pick<Storage, "getItem">;
type AlmacenEscritura = Pick<Storage, "setItem" | "removeItem">;

/** Solo http/https: nunca se ofrece "Continuar" a un esquema raro colado en un campo de enlace (`javascript:`, etc). */
export function esquemaSeguro(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/**
 * true si la persona ya pidió no volver a avisarle. Sin almacén (modo privado, o antes de hidratar en el
 * servidor) responde false: el aviso se sigue mostrando de más, nunca de menos.
 */
export function sinAvisoSalida(almacen: AlmacenLectura | null): boolean {
  try {
    return almacen?.getItem(CLAVE_SIN_AVISO_SALIDA) === "1";
  } catch {
    return false;
  }
}

/** Guarda o quita la preferencia. Si falla (modo privado u otro bloqueo), no truena: el aviso sigue saliendo. */
export function guardarSinAvisoSalida(almacen: AlmacenEscritura | null, valor: boolean): void {
  try {
    if (!almacen) return;
    if (valor) almacen.setItem(CLAVE_SIN_AVISO_SALIDA, "1");
    else almacen.removeItem(CLAVE_SIN_AVISO_SALIDA);
  } catch {
    // Modo privado u otro bloqueo del navegador: el aviso simplemente se sigue mostrando.
  } finally {
    notificarCambioAvisoSalida();
  }
}

type Escucha = () => void;
const escuchas = new Set<Escucha>();

/** Para leer la preferencia con `useSyncExternalStore` (renglón de Ajustes): re-renderiza cuando cambia, sin `useEffect` + `setState`. */
export function suscribirseAvisoSalida(escucha: Escucha): () => void {
  escuchas.add(escucha);
  return () => {
    escuchas.delete(escucha);
  };
}

function notificarCambioAvisoSalida(): void {
  escuchas.forEach((escucha) => escucha());
}

/**
 * Si el clic debe interceptarse para mostrar la hoja, o dejarse pasar tal cual (clic central, Ctrl/Cmd/Shift/Alt
 * + clic, un esquema que no sea http/https, o la persona ya pidió no avisarle): el enlace real sigue navegando
 * en todos esos casos, la hoja es una mejora, no un requisito para que funcione.
 */
export function debeAvisar(args: { href: string; boton: number; meta: boolean; ctrl: boolean; shift: boolean; alt: boolean; sinAviso: boolean }): boolean {
  if (args.boton !== 0 || args.meta || args.ctrl || args.shift || args.alt) return false;
  if (!esquemaSeguro(args.href)) return false;
  if (args.sinAviso) return false;
  return true;
}
