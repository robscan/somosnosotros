import { notFound } from "next/navigation";
import FichaPersona from "@/components/FichaPersona";
import Barra from "@/components/ui/Barra";
import ficha from "@/components/ui/Ficha.module.css";
import { cargarPersona } from "../consultas";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  const d = await cargarPersona(id);
  return { title: d ? `${d.perfil.nombre} · Somos Nosotros` : "Persona · Somos Nosotros" };
}

/** Ficha de una persona: la misma que Mi perfil, sin nada que tocar (decisión 5). Es la forma de reconocerse. */
export default async function PaginaPersona({ params }: Params) {
  const { id } = await params;
  const d = await cargarPersona(id);
  if (!d) notFound();
  return (
    <main className={ficha.pagina}>
      <Barra volver={{ href: "/", texto: "Agenda" }} />
      <FichaPersona perfil={d.perfil} mia={false} eventos={d.eventos} lugares={d.lugares} artistas={d.artistas} />
    </main>
  );
}
