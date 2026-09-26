import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Bloquear from "@/components/Bloquear";
import Desbloquear from "@/components/Desbloquear";
import FichaPersona from "@/components/FichaPersona";
import Barra from "@/components/ui/Barra";
import ficha from "@/components/ui/Ficha.module.css";
import MenuAcciones from "@/components/ui/MenuAcciones";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { avisosParaListas } from "@/app/avisos/paraListas";
import { cargarPersona, estaBloqueada, relacionDe } from "../consultas";

type Params = { params: Promise<{ id: string }> };

const ORIGEN = "https://somosnosotros.org";

/** Al compartir la ficha: nombre, foto y a cuántos eventos va, para que el enlace pegado en WhatsApp se vea. */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const d = await cargarPersona(id);
  // Fuera del índice de Google (OL-059): la ficha se comparte por enlace directo, pero no es lo que alguien busca
  // en Google, y así no hay que decidir a mano qué tanto de cada persona sale en un resultado de búsqueda.
  if (!d) return { title: "Persona · Somos Nosotros", robots: { index: false, follow: false } };
  const n = d.eventos.length;
  const descripcion = `${n === 0 ? "Está en Somos Nosotros" : n === 1 ? "Va a 1 evento próximo" : `Va a ${n} eventos próximos`} · San Luis Potosí`;
  const imagen = d.perfil.foto ?? undefined;
  return {
    title: `${d.perfil.nombre} · Somos Nosotros`,
    description: descripcion,
    robots: { index: false, follow: false },
    openGraph: { title: d.perfil.nombre, description: descripcion, url: `${ORIGEN}/personas/${d.perfil.id}`, type: "profile", images: imagen ? [{ url: imagen }] : undefined, locale: "es_MX", siteName: "Somos Nosotros" },
    twitter: { card: "summary", title: d.perfil.nombre, description: descripcion, images: imagen ? [imagen] : undefined },
  };
}

/** Ficha de una persona: la misma que Mi perfil, sin nada que tocar (decisión 5). Es la forma de reconocerse. */
export default async function PaginaPersona({ params }: Params) {
  const { id } = await params;
  const [d, actual] = await Promise.all([cargarPersona(id, { conProximos: true }), usuarioActual()]);
  if (!d) notFound();
  // La propia ficha, vista como la ven los demás ("Así te ven los demás" en Mi perfil): sin Ajustes, coincidencias ni gestos.
  const soyYo = actual?.perfil.id === id;
  // Los gestos son de quien mira (OL-057): lo que decidió en los eventos de esta ficha y lo que sigue de lo que ella sigue,
  // leídos con su sesión y solo para ella. De ahí sale también "Van a lo mismo" (decisión 7). Sin sesión, a Entrar.
  const mios = actual && !soyYo ? await cargarPersona(actual.perfil.id) : null;
  const gestos = soyYo ? null : { ...(mios ? relacionDe(mios, d) : { decididas: null, seguidos: null }), avisos: avisosParaListas(actual) };
  // ¿La bloqueé? (OL-203): solo tiene sentido en una ficha ajena y con sesión; sin sesión no hay bloqueos.
  const bloqueada = actual && !soyYo ? await estaBloqueada((await clienteServidor())!, actual.perfil.id, id) : false;
  return (
    <main className={ficha.pagina}>
      <Barra
        volver={{ href: soyYo ? "/perfil" : "/", texto: soyYo ? "Mi perfil" : "Agenda" }}
        derecha={
          !soyYo && !bloqueada ? (
            <MenuAcciones>
              <li className={ficha.menuItem}>
                <Bloquear personaId={id} nombre={d.perfil.nombre} volver={`/personas/${id}`} conSesion={!!actual} />
              </li>
            </MenuAcciones>
          ) : undefined
        }
      />
      {soyYo && (
        <p className="aviso-ok" role="status">
          Así te ven los demás.
        </p>
      )}
      <FichaPersona perfil={d.perfil} mia={false} eventos={d.eventos} lugares={d.lugares} artistas={d.artistas} gestos={gestos} origen={ORIGEN} bloqueado={bloqueada ? <Desbloquear personaId={id} /> : undefined} />
    </main>
  );
}
