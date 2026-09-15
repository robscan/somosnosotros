import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FichaPersona from "@/components/FichaPersona";
import Barra from "@/components/ui/Barra";
import ficha from "@/components/ui/Ficha.module.css";
import { cargarPersona } from "../consultas";

type Params = { params: Promise<{ id: string }> };

const ORIGEN = "https://somosnosotros.org";

/** Al compartir la ficha: nombre, foto y a cuántos eventos va, para que el enlace pegado en WhatsApp se vea. */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const d = await cargarPersona(id);
  if (!d) return { title: "Persona · Somos Nosotros" };
  const n = d.eventos.length;
  const descripcion = `${n === 0 ? "Está en Somos Nosotros" : n === 1 ? "Va a 1 evento próximo" : `Va a ${n} eventos próximos`} · San Luis Potosí`;
  const imagen = d.perfil.foto ?? undefined;
  return {
    title: `${d.perfil.nombre} · Somos Nosotros`,
    description: descripcion,
    openGraph: { title: d.perfil.nombre, description: descripcion, url: `${ORIGEN}/personas/${d.perfil.id}`, type: "profile", images: imagen ? [{ url: imagen }] : undefined, locale: "es_MX", siteName: "Somos Nosotros" },
    twitter: { card: "summary", title: d.perfil.nombre, description: descripcion, images: imagen ? [imagen] : undefined },
  };
}

/** Ficha de una persona: la misma que Mi perfil, sin nada que tocar (decisión 5). Es la forma de reconocerse. */
export default async function PaginaPersona({ params }: Params) {
  const { id } = await params;
  const d = await cargarPersona(id);
  if (!d) notFound();
  return (
    <main className={ficha.pagina}>
      <Barra volver={{ href: "/", texto: "Agenda" }} />
      <FichaPersona perfil={d.perfil} mia={false} eventos={d.eventos} lugares={d.lugares} artistas={d.artistas} origen={ORIGEN} />
    </main>
  );
}
