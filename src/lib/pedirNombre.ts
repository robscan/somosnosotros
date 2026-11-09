/**
 * Pedir el nombre al entrar (OL-512). Las cuentas nuevas ya no toman el nombre de su correo: nacen con él vacío si Apple o Google no lo dan.
 * A quien no lo tiene se la lleva una sola vez por sesión a la pantalla que ya existe para editar su ficha (`/ajustes/editar?pedir=nombre`),
 * con el campo del nombre abierto; si no quiere ponerlo, no se la vuelve a mandar en esa sesión (la marca vive en `sessionStorage`) y su
 * ficha propia le muestra el renglón «Ponle nombre a tu perfil». Puro: lo usa el teléfono (`IrAPonerNombre`) y lo prueba `pedirNombre.test.ts`.
 */

/** La marca de «ya se le pidió en esta sesión». */
export const CLAVE_NOMBRE_PEDIDO = "sn_nombre_pedido";

/** Donde no se la desvía: la propia pantalla de editar, entrar y sus vueltas, y las altas a medias (se le pide en la siguiente pantalla). */
const SIN_DESVIO = ["/ajustes/editar", "/entrar", "/auth", "/nuevo", "/obra"];

const dentroDe = (ruta: string, base: string) => ruta === base || ruta.startsWith(`${base}/`);

/**
 * A dónde llevarla, o null si no toca: ya se le pidió, o está en una pantalla de la que no se la saca. `siguiente` es donde estaba, para que
 * Atrás y Guardar la devuelvan ahí.
 */
export function destinoPedirNombre(ruta: string, consulta: string, yaPedido: boolean): string | null {
  if (yaPedido || !ruta.startsWith("/") || SIN_DESVIO.some((base) => dentroDe(ruta, base))) return null;
  const donde = `${ruta}${consulta ? (consulta.startsWith("?") ? consulta : `?${consulta}`) : ""}`;
  const pedir = new URLSearchParams({ pedir: "nombre" });
  if (donde !== "/ajustes") pedir.set("siguiente", donde);
  return `/ajustes/editar?${pedir.toString()}`;
}

/** Lee la marca sin romper: sin almacenamiento (navegación privada, bloqueado) se da por pedida, para no desviarla en cada pantalla. */
export function yaSePidio(almacen: Pick<Storage, "getItem"> | null | undefined): boolean {
  try {
    return !almacen || almacen.getItem(CLAVE_NOMBRE_PEDIDO) === "1";
  } catch {
    return true;
  }
}

/** Deja la marca; si no se puede, no pasa nada. */
export function marcarPedido(almacen: Pick<Storage, "setItem"> | null | undefined): void {
  try {
    almacen?.setItem(CLAVE_NOMBRE_PEDIDO, "1");
  } catch {
    // sin almacenamiento: `yaSePidio` ya la da por pedida
  }
}
