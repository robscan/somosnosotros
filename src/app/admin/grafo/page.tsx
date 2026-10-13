import { redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import plantilla from "@/components/ui/Plantilla.module.css";
import { cargarGrafo, type Grafo as DatosGrafo } from "@/lib/grafo";
import { usuarioActual } from "@/lib/supabase/servidor";
import Reintentar from "../Reintentar";
import Grafo from "./Grafo";

export const metadata = { title: "Grafo cultural · Administración · Somos Nosotros", robots: { index: false, follow: false } };

/**
 * El grafo cultural en 3D (OL-401, bitácora 432): lugares en su sitio real, artistas sobre el lugar donde más tocan y asistentes anónimos,
 * con las líneas que los unen. Solo para administración: sin sesión pide entrar y quien no es admin vuelve al inicio. Los datos se leen en el
 * servidor con la llave de servicio y se guardan una hora (`cargarGrafo`); al navegador llegan sin ids ni nombres de personas.
 */
export default async function PaginaGrafo() {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/admin/grafo");
  if (actual.perfil.rol !== "admin") redirect("/");
  let grafo: DatosGrafo | null = null;
  try {
    grafo = await cargarGrafo();
  } catch (error) {
    console.error("grafo", error instanceof Error ? error.message : error);
  }
  if (!grafo)
    return (
      <main className={plantilla.paginaContenido}>
        <Barra volver={{ href: "/admin", texto: "Administración" }} />
        <Reintentar texto="No pudimos leer el grafo." />
      </main>
    );
  return <Grafo datos={grafo} />;
}
