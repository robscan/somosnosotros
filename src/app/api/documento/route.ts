import { generarDocumento } from "@/lib/carteles/generar";
import { cargarDocumento } from "@/lib/cargarDocumento";
import { esFormatoDocumento, esPeriodoInforme, esQueDocumento } from "@/lib/documentos";

export const runtime = "nodejs";

const NO_HAY = () => new Response("No encontrado", { status: 404 });

/**
 * GET /api/documento?que=artista&id=…&formato=carta|a4 · ?que=lugar&id=…&periodo=mes|anio|todo&formato=… — la «Presentación» del artista o el
 * «Informe de actividad» del lugar en PDF (OL-396). Solo para quien gestiona la ficha (Q firmado): su autor, una cuenta ligada o la
 * administración; a cualquier otro (sin sesión, ficha ajena, sin nada pasado), 404. Sin `formato`, carta; sin `periodo`, el mes en curso. La
 * caché del teléfono lo guarda un día (la dirección lleva `v`, que cambia con lo que dice el documento). No llama a ninguna API externa: solo
 * lee la base y, si la hay, la foto del Storage propio.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const que = q.get("que");
  const formato = q.get("formato") ?? "carta";
  const periodo = q.get("periodo") ?? "mes";
  if (!esQueDocumento(que) || !esFormatoDocumento(formato) || !esPeriodoInforme(periodo)) return NO_HAY();
  const datos = await cargarDocumento(que, q.get("id"), periodo);
  if (!datos) return NO_HAY();
  let r: Awaited<ReturnType<typeof generarDocumento>>;
  try {
    r = await generarDocumento(datos.documento, formato);
  } catch (e) {
    console.error("documento:", e instanceof Error ? e.message : e);
    return new Response("No se pudo preparar el PDF", { status: 500 });
  }
  return new Response(new Uint8Array(r.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${datos.archivo}"`,
      "Cache-Control": "private, max-age=86400",
      "Server-Timing": `imagen;dur=${r.ms.imagen}, foto;dur=${r.ms.foto}, svg;dur=${r.ms.svg}, raster;dur=${r.ms.raster}, pdf;dur=${r.ms.pdf}`,
    },
  });
}
