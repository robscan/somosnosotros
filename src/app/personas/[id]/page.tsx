import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FichaPersona from "@/components/FichaPersona";
import Barra from "@/components/ui/Barra";
import ficha from "@/components/ui/Ficha.module.css";
import { usuarioActual } from "@/lib/supabase/servidor";
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
  const [d, actual] = await Promise.all([cargarPersona(id), usuarioActual()]);
  if (!d) notFound();
  // La propia ficha, vista como la ven los demás ("Así te ven los demás" en Mi perfil): sin Ajustes ni coincidencias.
  const soyYo = actual?.perfil.id === id;
  // "Van a lo mismo": los eventos a los que vamos los dos (decisión 7); lo calcula el sistema, solo con sesión.
  const mios = actual && !soyYo ? await cargarPersona(actual.perfil.id) : null;
  const misIds = new Set((mios?.eventos ?? []).map((e) => e.id));
  const juntos = d.eventos.filter((e) => misIds.has(e.id));
  return (
    <main className={ficha.pagina}>
      <Barra volver={{ href: soyYo ? "/perfil" : "/", texto: soyYo ? "Mi perfil" : "Agenda" }} />
      {soyYo && (
        <p className="aviso-ok" role="status">
          Así te ven los demás.
        </p>
      )}
      <FichaPersona perfil={d.perfil} mia={false} eventos={d.eventos} juntos={juntos} lugares={d.lugares} artistas={d.artistas} origen={ORIGEN} />
    </main>
  );
}
