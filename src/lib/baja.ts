import { esUuid } from "./formulario";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Baja de avisos por correo con un toque, sin entrar: el enlace lleva un token firmado con la llave
 * de servicio (secreta, solo en el servidor). Quien tenga el correo puede darse de baja; nadie puede
 * dar de baja a otra persona sin la llave.
 */
const ORIGEN = "https://somosnosotros.org";

function firma(usuarioId: string, llave: string): string {
  return createHmac("sha256", llave).update(`baja:${usuarioId}`).digest("hex").slice(0, 32);
}

export function firmarBaja(usuarioId: string, llave: string): string {
  return `${usuarioId}.${firma(usuarioId, llave)}`;
}

/** Devuelve el id de la persona si el token es válido; null si no. */
export function verificarBaja(token: string | null | undefined, llave: string): string | null {
  if (!token || !llave) return null;
  const [id, sig] = token.split(".");
  if (!id || !sig || !esUuid(id) || sig.length !== 32) return null;
  const esperada = Buffer.from(firma(id, llave));
  const recibida = Buffer.from(sig);
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida) ? id : null;
}

export function urlBaja(usuarioId: string, llave: string): string {
  return `${ORIGEN}/avisos/baja?t=${firmarBaja(usuarioId, llave)}`;
}
