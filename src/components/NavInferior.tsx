"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import { DESTINOS, estaEnDestino } from "@/lib/armazon";
import { raizConCiudad } from "@/lib/ciudad";
import { leerUrlSeccion } from "@/lib/memoriaPantalla";
import { pedirVuelta } from "./MemoriaScroll";
import { IconoCalendario, IconoCasa, IconoEstrella, IconoPin } from "./ui/Iconos";
import styles from "./NavInferior.module.css";

const ICONOS = { inicio: IconoCasa, agenda: IconoCalendario, lugares: IconoPin, artistas: IconoEstrella } as const;

/**
 * Barra de navegación inferior de las pantallas raíz: Inicio · Agenda · Lugares · Artistas · Perfil (OL-156, segunda
 * vuelta: la app abre siempre en Inicio, que es la raíz del dominio, `/`; Agenda vive en `/agenda`; Perfil entra como
 * quinto destino en la reestructura, OL-232). Los destinos salen de `lib/armazon.ts`.
 * Navega, no actúa (publicar es el «+» de la barra de arriba). El destino activo lleva una píldora de color detrás del
 * icono y la etiqueta en el color de acción (ajuste del founder, 2026-09-14: la nav tiene que notarse). El icono de
 * Perfil llega armado (`perfil`, la foto de la persona) porque depende de la sesión, que se lee en el servidor.
 * Cada sección vuelve a la última URL que se vio en ella (su filtro), y la pantalla repone su scroll:
 * como las pestañas del teléfono (pedido del founder, 2026-09-15). Tocar la sección en la que ya se está la lleva a su
 * raíz sin apilar historial, con la ciudad que se está viendo: sigue siendo la misma pantalla (OL-055).
 */
function sinSuscripcion() {
  return () => {};
}
function leerUltimas() {
  return DESTINOS.map((d) => (d.recuerda ? (leerUrlSeccion(d.clave) ?? "") : "")).join("\n");
}
/** Solo vale una URL de la propia sección (la raíz o la raíz con consulta). */
function ultimaValida(raiz: string, url: string | undefined): string | null {
  if (!url) return null;
  if (raiz === "/") return url === "/" || url.startsWith("/?") ? url : null;
  return url === raiz || url.startsWith(`${raiz}?`) ? url : null;
}

export default function NavInferior({ perfil }: { perfil: ReactNode }) {
  const ruta = usePathname();
  const router = useRouter();
  /** La sección en la que ya se está: a su raíz, reemplazando y sin soltar la ciudad (se lee al tocar, no al pintar). */
  function aLaRaiz(e: React.MouseEvent<HTMLAnchorElement>, raiz: string) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    router.replace(raizConCiudad(raiz, window.location.search));
  }
  // Las últimas URL se leen del teléfono en cada render (en el servidor no hay sessionStorage: se pintan las raíces).
  const guardadas = useSyncExternalStore(sinSuscripcion, leerUltimas, () => "");
  const ultimas = guardadas.split("\n");
  return (
    <nav className={styles.nav} aria-label="Secciones">
      {DESTINOS.map((d, i) => {
        const activo = estaEnDestino(ruta, d.href);
        return (
          <Link key={d.href} href={activo ? d.href : (ultimaValida(d.href, ultimas[i]) ?? d.href)} replace={activo} onClick={activo ? (e) => aLaRaiz(e, d.href) : pedirVuelta} className={`${styles.destino} ${activo ? styles.activo : ""}`} aria-current={activo ? "page" : undefined}>
            <span className={styles.icono}>{d.clave === "perfil" ? perfil : <Icono clave={d.clave} />}</span>
            <span>{d.etiqueta}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Icono({ clave }: { clave: keyof typeof ICONOS }) {
  const Glifo = ICONOS[clave];
  return <Glifo width={26} height={26} />;
}
