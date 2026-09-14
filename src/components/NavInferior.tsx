"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconoCalendario, IconoEstrella, IconoPin } from "./ui/Iconos";
import styles from "./NavInferior.module.css";

const DESTINOS = [
  { href: "/", etiqueta: "Agenda", Icono: IconoCalendario },
  { href: "/lugares", etiqueta: "Lugares", Icono: IconoPin },
  { href: "/artistas", etiqueta: "Artistas", Icono: IconoEstrella },
] as const;

/**
 * Barra de navegación inferior de las pantallas raíz: Agenda · Lugares · Artistas.
 * Navega, no actúa (publicar es el botón flotante). El destino activo va en color de texto y peso 700.
 */
export default function NavInferior() {
  const ruta = usePathname();
  return (
    <nav className={styles.nav} aria-label="Secciones">
      {DESTINOS.map(({ href, etiqueta, Icono }) => {
        const activo = href === "/" ? ruta === "/" : ruta.startsWith(href);
        return (
          <Link key={href} href={href} className={`${styles.destino} ${activo ? styles.activo : ""}`} aria-current={activo ? "page" : undefined}>
            <Icono />
            <span>{etiqueta}</span>
          </Link>
        );
      })}
    </nav>
  );
}
