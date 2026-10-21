"use client";

import { useLayoutEffect, useRef } from "react";
import Ayuda from "@/components/ui/Ayuda";
import { AYUDA_SHOWCASE, RUTA_MANUAL_SHOWCASE } from "../ayuda";
import s from "../showcase.module.css";

/**
 * La ⓘ de la ficha de showcase (`ui/Ayuda`, lo firmado en OL-425): fija abajo a la izquierda; abierta sin señalar nada dice la rúbrica en tres
 * líneas y, al pasar o tocar un control con `data-ayuda`, lo que hace. Su contenedor es el `<main>` de la página (por su id): la ficha es de
 * servidor y solo esta pieza es del navegador. El efecto de diseño corre antes que el oyente de `useAyuda`, así que lo encuentra puesto.
 */
export default function AyudaFicha({ raizId }: { raizId: string }) {
  const raiz = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    raiz.current = document.getElementById(raizId);
  }, [raizId]);
  return <Ayuda raiz={raiz} diccionario={AYUDA_SHOWCASE} manual={RUTA_MANUAL_SHOWCASE} memoria="showcase-admin:ayuda" inicial="rubrica" className={s.ayuda} />;
}
