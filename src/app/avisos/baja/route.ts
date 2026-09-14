import { verificarBaja } from "@/lib/baja";
import { clienteAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Baja de avisos por correo con un toque, sin entrar. GET desde el enlace del correo;
 * POST desde el botón "Cancelar suscripción" de Gmail y Yahoo (List-Unsubscribe-Post).
 */
async function darDeBaja(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get("t");
  const id = verificarBaja(token, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
  const admin = clienteAdmin();
  if (!id || !admin) return pagina("Este enlace no sirve", "Puede que esté incompleto. Los avisos se cambian en tu perfil.", 400);
  const { error } = await admin.from("perfiles").update({ avisos_correo: false, avisos_correo_desde: null, avisos_correo_motivo: "baja" }).eq("id", id);
  if (error) return pagina("No se pudo", "Intenta de nuevo en un momento, o cámbialo en tu perfil.", 500);
  return pagina("Listo", "Ya no te escribimos. Si cambias de idea, actívalo en tu perfil.", 200);
}

export async function GET(request: Request) {
  return darDeBaja(request);
}
export async function POST(request: Request) {
  return darDeBaja(request);
}

function pagina(titulo: string, texto: string, status: number): Response {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${titulo} · Somos Nosotros</title>
<style>body{margin:0;padding:32px 20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1a1a1a;background:#fff;line-height:1.4}h1{font-size:26px;margin:0 0 8px}p{color:#5c5c5c;margin:0 0 20px;max-width:32em}a{color:#b3261e}</style></head>
<body><h1>${titulo}</h1><p>${texto}</p><p><a href="https://somosnosotros.org/perfil">Ir a mi perfil</a> · <a href="https://somosnosotros.org/">Ver la agenda</a></p></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
