import { configPublica } from "@/lib/config";
import { calcularEstado } from "@/lib/estado";

export const dynamic = "force-dynamic";

/** GET /api/estado — para comprobar desde el teléfono que las variables llegaron a Vercel. */
export async function GET() {
  const estado = await calcularEstado(configPublica());
  return Response.json(estado, { headers: { "Cache-Control": "no-store" } });
}
