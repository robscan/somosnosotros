import { redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import plantilla from "@/components/ui/Plantilla.module.css";
import { diaLocal } from "@/lib/fechas";
import { leerVista, type ConsultaVista } from "@/lib/showcase";
import { usuarioActual } from "@/lib/supabase/servidor";
import Reintentar from "../Reintentar";
import { cargarCandidatos, cargarGrupos, cargarInvestigaciones } from "./consultas";
import VistaCandidatos from "./VistaCandidatos";
import admin from "../admin.module.css";
import { tituloDePagina } from "@/lib/marca";

export const metadata = { title: tituloDePagina("Showcase", "Administración"), robots: { index: false, follow: false } };

/**
 * Administración › Showcase (OL-426; lo firmado en OL-425, bitácora 458): la lista de candidatos para el showcase, al nivel de Grafo cultural y
 * Obras colectivas. Solo administración: sin sesión pide entrar y quien no lo es vuelve al inicio; la base, además, no le devuelve nada (las
 * tablas del showcase son de `es_admin()`). Nada de aquí va a una ruta pública ni al sitemap. OL-439: «Investigar» a varios desde la lista. OL-446: los filtros
 * de la hoja y los grupos guardados.
 */
export default async function Showcase({ searchParams }: { searchParams: Promise<ConsultaVista> }) {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/admin/showcase");
  if (actual.perfil.rol !== "admin") redirect("/");
  const vista = leerVista(await searchParams);
  const ahora = new Date();
  // OL-439: las investigaciones van aparte; si no se leen, la lista sigue sin el renglón «Investigar».
  const [todos, investigaciones, grupos] = await Promise.all([cargarCandidatos(ahora), cargarInvestigaciones(ahora), cargarGrupos()]);
  return (
    <main className={`${plantilla.paginaContenido} ${admin.lista}`}>
      <Barra volver={{ href: "/admin", texto: "Administración" }} />
      <h1 className={admin.titulo}>Showcase</h1>
      {todos ? <VistaCandidatos todos={todos} vista={vista} hoy={diaLocal(ahora)} ahora={ahora.toISOString()} investigaciones={investigaciones} grupos={grupos} /> : <Reintentar texto="No pudimos leer el showcase." />}
    </main>
  );
}
