import "server-only";

export type ResultadoEnvio = { estado: "enviada" | "reintentar" | "fallida" | "descartada"; codigo: string };
export function correoActivo(): boolean { return !!process.env.RESEND_API_KEY; }

export function cuerpoCorreo(p: { para: string; asunto: string; texto: string; html: string; bajaUrl: string }): string {
  return JSON.stringify({ from: process.env.CORREO_REMITENTE || "Somos Nosotros <avisos@somosnosotros.org>",
    to: [p.para], subject: p.asunto, text: p.texto, html: p.html,
    headers: { "List-Unsubscribe": `<${p.bajaUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } });
}

/** El cuerpo persistido se manda sin volver a serializarlo ni renovar su clave. */
export async function enviarCorreoIdempotente(cuerpo: string, clave: string, signal: AbortSignal): Promise<ResultadoEnvio> {
  if (!correoActivo()) return { estado: "reintentar", codigo: "correo_config" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST", signal, redirect: "error",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": clave },
      body: cuerpo,
    });
    if (res.ok) return { estado: "enviada", codigo: "aceptado" };
    if (res.status === 409) {
      const detalle = await res.json().catch(() => null);
      return detalle?.name === "concurrent_idempotent_requests"
        ? { estado: "reintentar", codigo: "correo_concurrente" }
        : { estado: "fallida", codigo: "correo_conflicto" };
    }
    return { estado: res.status === 429 || res.status >= 500 || res.status === 408 ? "reintentar" : "fallida", codigo: `correo_${res.status}` };
  } catch { return { estado: "reintentar", codigo: "correo_red" }; }
}
