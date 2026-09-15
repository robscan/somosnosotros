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
 * Navega, no actúa (publicar es el botón flotante). El destino activo lleva una píldora de color detrás del icono
 * y la etiqueta en el color de acción (ajuste del founder, 2026-09-14: la nav tiene que notarse).
 */
export default function NavInferior() {
  const ruta = usePathname();
  return (
    <nav className={styles.nav} aria-label="Secciones">
      {DESTINOS.map(({ href, etiqueta, Icono }) => {
        const activo = href === "/" ? ruta === "/" : ruta.startsWith(href);
        return (
          <Link key={href} href={href} className={`${styles.destino} ${activo ? styles.activo : ""}`} aria-current={activo ? "page" : undefined}>
            <span className={styles.icono}>
              <Icono width={26} height={26} />
            </span>
            <span>{etiqueta}</span>
          </Link>
        );
      })}
    </nav>
  );
}
