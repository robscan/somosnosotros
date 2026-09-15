"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { leerUrlSeccion } from "@/lib/memoriaPantalla";
import type { Seccion } from "./MemoriaPantalla";
import { IconoCalendario, IconoEstrella, IconoPin } from "./ui/Iconos";
import styles from "./NavInferior.module.css";

const DESTINOS = [
  { seccion: "agenda", href: "/", etiqueta: "Agenda", Icono: IconoCalendario },
  { seccion: "lugares", href: "/lugares", etiqueta: "Lugares", Icono: IconoPin },
  { seccion: "artistas", href: "/artistas", etiqueta: "Artistas", Icono: IconoEstrella },
] as const satisfies readonly { seccion: Seccion; href: string; etiqueta: string; Icono: typeof IconoPin }[];

/**
 * Barra de navegación inferior de las pantallas raíz: Agenda · Lugares · Artistas.
 * Navega, no actúa (publicar es el botón flotante). El destino activo lleva una píldora de color detrás del icono
 * y la etiqueta en el color de acción (ajuste del founder, 2026-09-14: la nav tiene que notarse).
 * Cada sección vuelve a la última URL que se vio en ella (su filtro), y la pantalla repone su scroll:
 * como las pestañas del teléfono (pedido del founder, 2026-09-15).
 */
function sinSuscripcion() {
  return () => {};
}
function leerUltimas() {
  return DESTINOS.map((d) => leerUrlSeccion(d.seccion) ?? "").join("\n");
}
/** Solo vale una URL de la propia sección (la raíz o la raíz con consulta). */
function ultimaValida(seccion: Seccion, raiz: string, url: string | undefined): string | null {
  if (!url) return null;
  if (raiz === "/") return url === "/" || url.startsWith("/?") ? url : null;
  return url === raiz || url.startsWith(`${raiz}?`) ? url : null;
}

export default function NavInferior() {
  const ruta = usePathname();
  // Las últimas URL se leen del teléfono en cada render (en el servidor no hay sessionStorage: se pintan las raíces).
  const guardadas = useSyncExternalStore(sinSuscripcion, leerUltimas, () => "");
  const ultimas = guardadas.split("\n");
  return (
    <nav className={styles.nav} aria-label="Secciones">
      {DESTINOS.map(({ seccion, href, etiqueta, Icono }, i) => {
        const activo = href === "/" ? ruta === "/" : ruta.startsWith(href);
        return (
          <Link key={href} href={activo ? href : ultimaValida(seccion, href, ultimas[i]) ?? href} className={`${styles.destino} ${activo ? styles.activo : ""}`} aria-current={activo ? "page" : undefined}>
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
