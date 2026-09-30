"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import EnBarra from "../EnBarra";
import { AtrasIcono } from "./Atras";
import MenuAcciones from "./MenuAcciones";
import ficha from "./Ficha.module.css";

type Props = {
  /** A dónde vuelve Atrás cuando no hay pantalla anterior de la app (enlace compartido, app recién abierta). */
  volver: { href: string; texto: string };
  /** El título de la ficha: se ve cuando la portada ya se fue arriba. */
  titulo: string;
  /** Las filas del menú «···» (`<li>` con el renglón de Ajustes); sin ellas no hay menú. */
  children?: ReactNode;
  /** Sin portada (la ficha de una persona): una barra blanca con su raya, con el título siempre a la vista. */
  solida?: boolean;
};

/**
 * La barra de una ficha (docs/rediseno/50, P6). Sobre la portada: Atrás y el menú «···» en círculos blancos, sin fondo, y al pasar
 * la portada, `data-compacta` en la ficha la vuelve la barra compacta (la portada oscurecida detrás del título); ese aviso lo da
 * el propio desplazamiento, sin volver a pintar nada. Sólida: la barra blanca de una ficha sin portada. Desde 792 no se ve: su Atrás
 * y su menú se le prestan a la barra de la app (`EnBarra`), que ya los trae en su sitio.
 */
export default function BarraFicha({ volver, titulo, children, solida = false }: Props) {
  const barra = useRef<HTMLElement>(null);
  const menuEnLaBarraDeLaApp = useMemo(() => (children ? <MenuAcciones>{children}</MenuAcciones> : undefined), [children]);

  useEffect(() => {
    const el = barra.current!;
    const pantalla = el.parentElement!;
    const portada = pantalla.querySelector("[data-portada]");
    if (!portada) return;
    // La barra se vuelve compacta cuando la portada ya no asoma bajo ella.
    const observador = new IntersectionObserver(([entrada]) => pantalla.toggleAttribute("data-compacta", !entrada.isIntersecting), { rootMargin: `-${el.offsetHeight}px 0px 0px 0px` });
    observador.observe(portada);
    return () => {
      observador.disconnect();
      pantalla.removeAttribute("data-compacta");
    };
  }, []);

  return (
    <>
      <header ref={barra} className={solida ? ficha.barraSolida : ficha.barra}>
        <AtrasIcono href={volver.href} texto={volver.texto} tamano={solida ? "control" : "accion"} relieve={solida ? "contorno" : "elevado"} />
        <b className={ficha.tituloBarra} aria-hidden="true">{titulo}</b>
        {children && (
          <MenuAcciones tamano={solida ? "control" : "accion"} relieve={solida ? "plano" : "elevado"}>
            {children}
          </MenuAcciones>
        )}
      </header>
      <EnBarra volver={volver} menu={menuEnLaBarraDeLaApp} />
    </>
  );
}
