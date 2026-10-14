import { generarTuAnio } from "@/lib/carteles/generar";
import { ANCHOS } from "@/lib/carteles/parametros";
import { cargarTuAnio } from "@/lib/cargarTuAnio";
import { esSujetoTuAnio } from "@/lib/tuAnio";

export const runtime = "nodejs";

const NO_HAY = () => new Response("No encontrado", { status: 404 });

/** El ancho pedido, al más cercano de los que se dibujan (360, 720, 1080); sin él, 1080. */
function anchoDe(valor: string | null): number {
  const pedido = Number(valor);
  return Number.isFinite(pedido) && pedido > 0 ? ANCHOS.reduce((a, b) => (Math.abs(b - pedido) < Math.abs(a - pedido) ? b : a)) : 1080;
}

/**
 * GET /api/tu-anio?que=persona | ?que=artista&id=… | ?que=lugar&id=… , con `ancho` (360, 720, 1080) y `descarga=1` — la imagen de «Tu año»
 * (OL-394) en JPEG, 4:5. Solo para quien gestiona (Q firmado): la persona, su propio año; el artista o el lugar, quien puede editar la ficha.
 * A cualquier otro (sin sesión, ficha ajena, nada pasado este año), 404. La caché del teléfono la guarda un día, como el cartel; con `descarga=1`
 * va como archivo y sin guardar. No llama a ninguna API externa: solo lee la base y, si la hay, la foto del Storage propio.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const que = q.get("que");
  if (!esSujetoTuAnio(que)) return NO_HAY();
  const datos = await cargarTuAnio(que, q.get("id"));
  if (!datos) return NO_HAY();
  let r: Awaited<ReturnType<typeof generarTuAnio>>;
  try {
    r = await generarTuAnio(datos.resumen, datos.id, { ancho: anchoDe(q.get("ancho")) });
  } catch (e) {
    console.error("tu-anio:", e instanceof Error ? e.message : e);
    return new Response("No se pudo dibujar la imagen", { status: 500 });
  }
  const cabeceras: Record<string, string> = {
    "Content-Type": r.tipo,
    "Server-Timing": `imagen;dur=${r.msImagen}, foto;dur=${r.ms.foto}, svg;dur=${r.ms.svg}, raster;dur=${r.ms.raster}`,
  };
  if (q.get("descarga") === "1") {
    cabeceras["Content-Disposition"] = `attachment; filename="${datos.archivo}"`;
    cabeceras["Cache-Control"] = "private, no-store";
  } else {
    cabeceras["Cache-Control"] = "private, max-age=86400";
  }
  return new Response(new Uint8Array(r.imagen), { headers: cabeceras });
}
