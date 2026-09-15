import Link from "next/link";
import { redirect } from "next/navigation";
import FichaPersona from "@/components/FichaPersona";
import Barra from "@/components/ui/Barra";
import { usuarioActual } from "@/lib/supabase/servidor";
import { cargarPersona } from "@/app/personas/consultas";
import ficha from "@/components/ui/Ficha.module.css";
import styles from "./perfil.module.css";

export const metadata = { title: "Mi perfil · Somos Nosotros" };
const ORIGEN = "https://somosnosotros.org";

/** Mi perfil: la misma ficha que ven los demás, con Ajustes bajo la colonia. Lo que se configura vive en /ajustes (docs/rediseno/13, decisión 5). */
export default async function PaginaPerfil() {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/perfil");
  const persona = await cargarPersona(actual.perfil.id);
  if (!persona) redirect("/entrar?siguiente=/perfil");
  return (
    <main className={ficha.pagina}>
      <Barra volver={{ href: "/", texto: "Agenda" }} />
      <FichaPersona perfil={persona.perfil} mia eventos={persona.eventos} interesan={persona.interesan} lugares={persona.lugares} artistas={persona.artistas} origen={ORIGEN} />
      <p className={styles.pie}>
        <Link href={`/personas/${persona.perfil.id}`}>Así te ven los demás</Link>
      </p>
    </main>
  );
}
