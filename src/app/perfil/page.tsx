import Link from "next/link";
import { redirect } from "next/navigation";
import FichaPersona from "@/components/FichaPersona";
import Barra from "@/components/ui/Barra";
import { usuarioActual } from "@/lib/supabase/servidor";
import { avisosParaListas } from "@/app/avisos/paraListas";
import { cargarMisArtistas } from "@/app/artistas/consultas";
import { cargarPersona, relacionDe } from "@/app/personas/consultas";
import { conArtistasLigados } from "@/lib/artistas";
import ficha from "@/components/ui/Ficha.module.css";
import MisArtistas from "./MisArtistas";
import styles from "./perfil.module.css";

export const metadata = { title: "Mi perfil · Somos Nosotros", robots: { index: false, follow: false } };
const ORIGEN = "https://somosnosotros.org";

/** Mi perfil: la misma ficha que ven los demás, con Ajustes bajo la colonia. Lo que se configura vive en /ajustes (docs/rediseno/13, decisión 5). */
export default async function PaginaPerfil() {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/perfil");
  const [persona, ligados] = await Promise.all([cargarPersona(actual.perfil.id, { conProximos: true }), cargarMisArtistas(actual.perfil.id)]);
  if (!persona) redirect("/entrar?siguiente=/perfil");
  // Mis gestos sobre mis listas: quitar desaparece al instante y Deshacer lo devuelve (OL-057).
  const gestos = { ...relacionDe(persona), avisos: avisosParaListas(actual) };
  return (
    <main className={ficha.pagina}>
      <Barra volver={{ href: "/", texto: "Agenda" }} />
      <FichaPersona
        perfil={persona.perfil}
        mia
        eventos={persona.eventos}
        interesan={persona.interesan}
        lugares={persona.lugares}
        artistas={persona.artistas}
        gestos={gestos}
        origen={ORIGEN}
        // Antes de "Lo que sigues" (lo tuyo primero, doc 40b); sin artistas ligados, ni se pinta (OL-154).
        misArtistas={conArtistasLigados(ligados) && <MisArtistas artistas={ligados} />}
      />
      <p className={styles.pie}>
        <Link href={`/personas/${persona.perfil.id}`}>Así te ven los demás</Link>
      </p>
    </main>
  );
}
