"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { altaDeRuta, buscarDesdeRuta, enlaceDeAlta, enlaceDeBusqueda, fichaConMenu, vistaDeRuta } from "@/lib/armazon";
import { borrarMemoria } from "@/lib/memoriaPantalla";
import { usePrestadoALaBarra } from "./prestamoBarra";
import { AtrasIcono } from "./ui/Atras";
import BotonIcono from "./ui/BotonIcono";
import { IconoBuscar, IconoCrear, IconoPuntos } from "./ui/Iconos";
import Logotipo from "./ui/Logotipo";
import styles from "./BarraApp.module.css";

/** Antes de que la ficha preste su Atrás (o si no lo presta), Atrás lleva al inicio. */
const VOLVER_AL_INICIO = { href: "/", texto: "Inicio" };

/**
 * Buscar enfoca su campo al llegar, y en el iPhone eso ya no es un toque: sin el dedo el teclado no sale. El toque de la lupa sí lo
 * es, así que enfoca un campo escondido (`layout.tsx`) y el teclado se queda abierto mientras llega Buscar, que solo le quita el foco
 * al pasárselo a su campo. Si Buscar no llega, el campo escondido suelta el foco solo.
 */
function alzarTeclado() {
  const cebo = document.getElementById("cebo-de-teclado");
  if (!(cebo instanceof HTMLInputElement)) return;
  cebo.focus({ preventScroll: true });
  window.setTimeout(() => document.activeElement === cebo && cebo.blur(), 3000);
}

/**
 * La barra de la app (docs/rediseno/50, P4): una sola, arriba, en las tres medidas y en todas las pantallas. Tres
 * celdas: a la izquierda «+», Atrás y el acceso a administración; al centro el logotipo; a la derecha la lupa, la sesión
 * y el menú «···». Atrás y el menú solo se ven desde 792 y con una ficha a la vista (en el teléfono la ficha lleva su
 * propia cabecera y la barra de la app no se ve). «+» lleva al alta de la sección en que se está, con la ciudad que se
 * ve; la lupa lleva a Buscar, siempre la misma, con la ciudad y la sección de donde se abre (estando ya en Buscar, enfoca su
 * campo); lo demás (la campana con sesión, y administración) lo arma el servidor y llega como `sesion` y `admin`. Los dos lados miden lo mismo
 * (BarraApp.module.css): el logotipo queda en el centro exacto pase lo que pase en ellos.
 */
export default function BarraApp({ admin, sesion }: { admin: ReactNode; sesion: ReactNode }) {
  const ruta = usePathname();
  const ciudad = useSearchParams().get("ciudad");
  const { buscar, volver = VOLVER_AL_INICIO, menu } = usePrestadoALaBarra();
  const alta = enlaceDeAlta(altaDeRuta(ruta), ciudad);
  const hrefBuscar = enlaceDeBusqueda(ciudad, buscarDesdeRuta(ruta));
  const ficha = vistaDeRuta(ruta) === "ficha";
  // El menú lo presta la ficha al hidratar; mientras, su botón ya está donde va (en el HTML del servidor), sin hacer nada todavía.
  const menuDeLaFicha = menu ?? (fichaConMenu(ruta) ? <BotonIcono aria-label="Más acciones" aria-haspopup="dialog" tabIndex={-1}><IconoPuntos /></BotonIcono> : null);

  function alBuscar(e: MouseEvent<HTMLAnchorElement>) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (buscar) {
      e.preventDefault();
      buscar();
    } else {
      borrarMemoria(hrefBuscar); // una búsqueda que se abre empieza vacía; solo al volver de una ficha se repone
      alzarTeclado();
    }
  }

  return (
    <header className={styles.barra}>
      <div className={styles.lado}>
        <BotonIcono href={alta.href} aria-label={alta.etiqueta}>
          <IconoCrear width={26} height={26} />
        </BotonIcono>
        <div className={styles.hueco}>{ficha && <AtrasIcono href={volver.href} texto={volver.texto} />}</div>
        {admin}
      </div>
      <Logotipo className={styles.logotipo} />
      <div className={`${styles.lado} ${styles.derecho}`}>
        <BotonIcono href={hrefBuscar} prefetch={false} onClick={alBuscar} aria-label="Buscar">
          <IconoBuscar width={26} height={26} />
        </BotonIcono>
        {sesion}
        <div className={styles.hueco}>{ficha && menuDeLaFicha}</div>
      </div>
    </header>
  );
}
