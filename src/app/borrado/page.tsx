import Link from "next/link";
import NavInferior from "@/components/NavInferior";
import Sesion from "@/components/Sesion";
import Barra from "@/components/ui/Barra";
import { IconoCalendario, IconoEstrella, IconoPin } from "@/components/ui/Iconos";
import styles from "./borrado.module.css";

export const metadata = { title: "Borrado · Somos Nosotros" };

/** Confirmación de borrado con estado vacío (pedido del founder, 2026-09-15): antes, borrar abría otra ficha. */
const TEXTOS = {
  evento: { titulo: "Evento borrado", texto: "Ya no aparece en la agenda ni en su lugar. Los \u201cVoy\u201d que tenía se fueron con él.", href: "/", accion: "Ir a la agenda", otro: "/eventos/nuevo", otroTexto: "Publicar otro evento", Icono: IconoCalendario },
  lugar: { titulo: "Lugar borrado", texto: "Ya no aparece en Lugares ni en la agenda.", href: "/lugares", accion: "Ver los lugares", otro: "/lugares/nuevo", otroTexto: "Registrar otro lugar", Icono: IconoPin },
  artista: { titulo: "Artista borrado", texto: "Ya no aparece en Artistas ni en los eventos donde se presentaba.", href: "/artistas", accion: "Ver los artistas", otro: "/artistas/nuevo", otroTexto: "Registrar otro artista", Icono: IconoEstrella },
} as const;

export default async function Borrado({ searchParams }: { searchParams: Promise<{ que?: string }> }) {
  const { que } = await searchParams;
  const t = TEXTOS[(que as keyof typeof TEXTOS) in TEXTOS ? (que as keyof typeof TEXTOS) : "evento"];
  return (
    <main className="raiz">
      <Barra derecha={<Sesion />} />
      <section className={styles.vacio} role="status" aria-live="polite">
        <span className={styles.icono} aria-hidden="true">
          <t.Icono width={28} height={28} />
        </span>
        <h1>{t.titulo}</h1>
        <p>{t.texto}</p>
        <Link href={t.href} className={styles.accion}>
          {t.accion}
        </Link>
        <Link href={t.otro} className={styles.otro}>
          {t.otroTexto}
        </Link>
      </section>
      <NavInferior />
    </main>
  );
}
