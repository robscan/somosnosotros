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
 * La barra de la app (docs/rediseno/50, P4): una sola, arriba, en las tres medidas y en todas las pantallas:
 * «+» · Atrás · logotipo · lupa · sesión · menú. Atrás y el menú «···» solo se ven desde 792 y con una ficha a la vista
 * (en el teléfono la ficha lleva su propia cabecera y la barra de la app no se ve). «+» lleva al alta de la sección
 * en que se está, con la ciudad que se ve; la lupa abre la búsqueda de la pantalla y, si no tiene, lleva a la de Inicio;
 * lo demás (campana, Entrar, administración) lo arma el servidor y llega como `sesion`.
 */
export default function BarraApp({ sesion }: { sesion: ReactNode }) {
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
      <BotonIcono href={alta.href} className={styles.publicar} aria-label={alta.etiqueta}>
        <IconoCrear width={26} height={26} />
      </BotonIcono>
      {ficha && <AtrasIcono href={volver.href} texto={volver.texto} className={styles.atras} />}
      <Logotipo className={styles.logotipo} />
      <BotonIcono href={enlaceDeBusqueda(ciudad)} prefetch={false} onClick={alBuscar} className={styles.buscar} aria-label="Buscar">
        <IconoBuscar width={26} height={26} />
      </BotonIcono>
      {sesion}
      {ficha && menu && <div className={styles.menu}>{menu}</div>}
    </header>
  );
}
