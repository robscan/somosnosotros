"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { altaDeRuta, enlaceDeAlta, enlaceDeBusqueda, vistaDeRuta } from "@/lib/armazon";
import { usePrestadoALaBarra } from "./prestamoBarra";
import { AtrasIcono } from "./ui/Atras";
import BotonIcono from "./ui/BotonIcono";
import { IconoBuscar, IconoCrear } from "./ui/Iconos";
import Logotipo from "./ui/Logotipo";
import styles from "./BarraApp.module.css";

/** Antes de que la ficha preste su Atrás (o si no lo presta), Atrás lleva al inicio. */
const VOLVER_AL_INICIO = { href: "/", texto: "Inicio" };

/**
 * La barra de la app (docs/rediseno/50, P4): una sola, arriba, en las tres medidas y en todas las pantallas. Tres
 * celdas: a la izquierda «+», Atrás y el acceso a administración; al centro el logotipo; a la derecha la lupa, la sesión
 * y el menú «···». Atrás y el menú solo se ven desde 792 y con una ficha a la vista (en el teléfono la ficha lleva su
 * propia cabecera y la barra de la app no se ve). «+» lleva al alta de la sección en que se está, con la ciudad que se
 * ve; la lupa abre la búsqueda de la pantalla y, si no tiene, lleva a la de Inicio; lo demás (Entrar o la campana, y
 * administración) lo arma el servidor y llega como `sesion` y `admin`. Los dos lados miden lo mismo
 * (BarraApp.module.css): el logotipo queda en el centro exacto pase lo que pase en ellos.
 */
export default function BarraApp({ admin, sesion }: { admin: ReactNode; sesion: ReactNode }) {
  const ruta = usePathname();
  const ciudad = useSearchParams().get("ciudad");
  const { buscar, volver = VOLVER_AL_INICIO, menu } = usePrestadoALaBarra();
  const alta = enlaceDeAlta(altaDeRuta(ruta), ciudad);
  const ficha = vistaDeRuta(ruta) === "ficha";

  function alBuscar(e: MouseEvent<HTMLAnchorElement>) {
    if (!buscar || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    buscar();
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
        <BotonIcono href={enlaceDeBusqueda(ciudad)} prefetch={false} onClick={alBuscar} aria-label="Buscar">
          <IconoBuscar width={26} height={26} />
        </BotonIcono>
        {sesion}
        <div className={styles.hueco}>{ficha && menu}</div>
      </div>
    </header>
  );
}
