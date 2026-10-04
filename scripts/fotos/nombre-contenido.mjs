import { createHash } from "node:crypto";

/** Una URL inmutable para cada contenido: permite cachear sin mostrar una foto
 * anterior cuando se vuelve a importar la misma ficha. No sube ni borra nada.
 * @param {string} ruta
 * @param {Uint8Array} bytes Los bytes finales, después de cualquier reducción.
 */
export function rutaConContenido(ruta, bytes) {
  const hash = createHash("sha256").update(bytes).digest("hex");
  const punto = ruta.lastIndexOf(".");
  return punto > ruta.lastIndexOf("/")
    ? `${ruta.slice(0, punto)}-${hash}${ruta.slice(punto)}`
    : `${ruta}-${hash}`;
}

/** Solo el error de objeto existente permite reutilizar una URL con hash.
 * Storage tiene respuestas modernas con code y antiguas con HTTP400/409.
 * @param {{code?: string, statusCode?: string, status?: number, message?: string} | null} error
 */
export function objetoYaExiste(error) {
  if (!error) return false;
  if (error.code) return ["ResourceAlreadyExists", "KeyAlreadyExists"].includes(error.code);
  const status = Number(error.statusCode ?? error.status);
  return [400, 409].includes(status) && ["The resource already exists", "Asset Already Exists", "Duplicate"].includes(error.message ?? "");
}
