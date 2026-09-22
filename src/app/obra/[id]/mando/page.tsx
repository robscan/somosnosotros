import { notFound, redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import ficha from "@/components/ui/Ficha.module.css";
import { esUuid } from "@/lib/formulario";
import { usuarioActual } from "@/lib/supabase/servidor";
import { cargarObraParaPintar, cargarPincelActivo } from "../../consultas";
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
export default async function MandoDeObra({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sonda?: string }> }) {
  const { id } = await params;
  if (!esUuid(id)) notFound();
  // OL-126: `?sonda=1` enseña un recuadro con los eventos que llegan, para leerlo en el iPhone del founder.
  // Sin el parámetro no cambia nada visible.
  const sonda = (await searchParams).sonda === "1";
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=/obra/${id}/mando`);
  // Interruptor «Pincel apagado» (OL-121): igual que la pared, se comprueba antes de leer la obra — sin
  // controles, sin abrir el canal.
  if (!(await cargarPincelActivo())) {
    return (
      <main className={ficha.pagina}>
        <Barra volver={{ href: "/", texto: "Salir" }} />
        <p className={styles.cerrada}>Pincel está apagado por ahora.</p>
      </main>
    );
  }
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
      <Mando
        obraId={obra.id}
        perfilId={actual.perfil.id}
        nombre={actual.perfil.nombre}
        cupo={obra.cupoMandos}
        sonda={sonda}
        // Cercanía (OL-127): administración queda exenta (prueba desde donde sea); el resto, a menos de 200 m del lugar.
        esAdmin={actual.perfil.rol === "admin"}
        referencia={obra.referencia}
        lugarNombre={obra.lugar?.nombre ?? null}
        lugarHref={obra.lugar ? `/lugares/${obra.lugar.id}` : null}
      />
    </main>
  );
}
