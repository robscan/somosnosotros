/**
 * El cuerpo como texto, leído con tope (F12 de OL-327): null en cuanto pasa de `max` bytes, sin leer el resto. Primero se mira
 * `Content-Length` (si dice más, ni se empieza); si no viene o miente (chunked), el lector corta al pasarse.
 */
export async function leerCuerpoAcotado(request: Request, max: number): Promise<string | null> {
  const declarado = request.headers.get("content-length");
  if (declarado !== null && (!/^\d+$/.test(declarado.trim()) || Number(declarado) > max)) return null;
  if (!request.body) return "";
  const lector = request.body.getReader();
  const trozos: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await lector.cancel().catch(() => {});
      return null;
    }
    trozos.push(value);
  }
  const todo = new Uint8Array(total);
  let pos = 0;
  for (const t of trozos) {
    todo.set(t, pos);
    pos += t.byteLength;
  }
  return new TextDecoder().decode(todo);
}
