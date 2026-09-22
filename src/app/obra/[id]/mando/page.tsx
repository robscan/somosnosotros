import { notFound, redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import ficha from "@/components/ui/Ficha.module.css";
import { esUuid } from "@/lib/formulario";
import { usuarioActual } from "@/lib/supabase/servidor";
import { cargarObraParaPintar } from "../../consultas";
import Mando from "./Mando";
import styles from "./mando.module.css";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const obra = esUuid(id) ? await cargarObraParaPintar(id) : null;
  return { title: `Pintar en ${obra?.nombre ?? "una obra colectiva"} · Somos Nosotros`, robots: { index: false, follow: false } };
}

/**
 * El mando (Fase 2 bloque 3, OL-088): exige sesión, como cualquier acción de la app (patrón ya usado en
 * `redirect("/entrar?siguiente=…")`). Sin la comprobación de cercanía todavía (Fase 3) ni el cupo/fila (doc
 * rediseno/34, espera firma): hoy cualquier cuenta con sesión puede pintar en una obra abierta.
 */
export default async function MandoDeObra({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!esUuid(id)) notFound();
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=/obra/${id}/mando`);
  const obra = await cargarObraParaPintar(id);
  if (!obra) notFound();

  if (obra.estado !== "abierta") {
    return (
      <main className={ficha.pagina}>
        <Barra volver={{ href: "/", texto: "Agenda" }} />
        <p className={styles.cerrada}>«{obra.nombre}» ya cerró. Ya no se puede pintar ahí.</p>
      </main>
    );
  }

  return (
    <main className={ficha.pagina}>
      <Barra volver={{ href: "/", texto: "Salir" }} />
      <Mando obraId={obra.id} perfilId={actual.perfil.id} />
    </main>
  );
}
