import { cargarCandidatos } from "@/app/admin/showcase/consultas";
import { diaLocal } from "@/lib/fechas";
import { csvConsejo, filtrarCandidatos, leerVista, nombreCsvConsejo, ordenarCandidatos } from "@/lib/showcase";
import { usuarioActual } from "@/lib/supabase/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_HAY = () => new Response("No encontrado", { status: 404 });

/**
 * GET /api/showcase/csv?q=…&disciplina=…&estado=…&orden=… — «Exportar para el consejo» (OL-426): la lista de candidatos con los mismos filtros y
 * el mismo orden que la pantalla, entera (sin página), en CSV: rúbrica, estado, cifras, la ficha pública, Instagram y la primera línea de las
 * notas. Solo administración: a cualquier otro (sin sesión o sin el rol), 404, y la base tampoco le daría nada (las tablas del showcase son de
 * `es_admin()`). Sin caché compartida: son juicios sobre personas que no salen de Administración.
 */
export async function GET(req: Request) {
  const actual = await usuarioActual();
  if (!actual || actual.perfil.rol !== "admin") return NO_HAY();
  const q = Object.fromEntries(new URL(req.url).searchParams);
  const vista = leerVista(q);
  const ahora = new Date();
  const todos = await cargarCandidatos(ahora);
  if (!todos) return new Response("No pudimos leer el showcase", { status: 503 });
  const lista = ordenarCandidatos(filtrarCandidatos(todos, vista), vista.orden);
  return new Response(csvConsejo(lista), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreCsvConsejo(diaLocal(ahora))}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
