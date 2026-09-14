import "server-only";

/** Los avisos por correo se activan con RESEND_API_KEY en el servidor. */
export function correoActivo(): boolean {
  return !!process.env.RESEND_API_KEY;
}

const REMITENTE = process.env.CORREO_REMITENTE || "somosnosotros <avisos@somosnosotros.org>";

/** Manda un correo con Resend. Devuelve false si no hay llave o falla; nunca lanza. */
export async function enviarCorreo(p: { para: string; asunto: string; texto: string; html: string }): Promise<boolean> {
  if (!correoActivo()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: REMITENTE, to: [p.para], subject: p.asunto, text: p.texto, html: p.html }),
    });
    if (!res.ok) console.error("enviarCorreo:", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("enviarCorreo:", e instanceof Error ? e.message : e);
    return false;
  }
}
