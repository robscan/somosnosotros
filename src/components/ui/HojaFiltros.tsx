"use client";

import type { ReactNode } from "react";
import Boton from "./Boton";
import Hoja from "./Hoja";
import styles from "./HojaFiltros.module.css";

type Props = {
  titulo: string;
  /** Una línea que dice para qué sirve, arriba de los bloques. */
  nota?: string;
  /** Lo que dice el botón que aplica: «Ver 14 eventos», «Sin eventos». */
  resultado: string;
  /** Sin nada que ver, el botón se apaga (y su texto dice por qué). */
  sinResultados?: boolean;
  onLimpiar: () => void;
  onVer: () => void;
  onCerrar: () => void;
  /** Los bloques de la hoja (`BloqueFiltro`). */
  children: ReactNode;
};

/**
 * La hoja de las opciones de una pantalla (Cuándo, Filtros; docs/rediseno/50): el título y sus bloques arriba, y abajo,
 * siempre a la vista, «Limpiar» y el botón que aplica lo elegido y dice cuántos resultados da. Cerrar con la ✕ o tocando
 * fuera no aplica nada.
 */
export default function HojaFiltros({ titulo, nota, resultado, sinResultados = false, onLimpiar, onVer, onCerrar, children }: Props) {
  return (
    <Hoja
      etiqueta={titulo}
      titulo={titulo}
      onCerrar={onCerrar}
      pie={
        <>
          <Boton variante="texto" ancho="contenido" onClick={onLimpiar}>
            Limpiar
          </Boton>
          <Boton onClick={onVer} disabled={sinResultados}>
            {resultado}
          </Boton>
        </>
      }
    >
      {nota && <p className={styles.nota}>{nota}</p>}
      {children}
    </Hoja>
  );
}

/** Un bloque de la hoja: su rótulo chico y, debajo, lo que se elige (chips, una palanca). */
export function BloqueFiltro({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <section className={styles.bloque}>
      <h4>{rotulo}</h4>
      {children}
    </section>
  );
}
