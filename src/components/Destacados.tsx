"use client";

import Link from "next/link";
import { useCallback, useId, useRef, type UIEvent } from "react";
import type { Tarjeta } from "@/lib/destacados";
import { claveDeUrl, guardarScroll, leerScroll } from "@/lib/memoriaPantalla";
import { IconoPersonas } from "./ui/Iconos";
import styles from "./Destacados.module.css";

/**
 * La tira de destacados arriba de un listado (docs/rediseno/20). Se desliza con el dedo, sin avance automático, y la
 * siguiente tarjeta asoma (decisiones 1 y 2). Sin tarjetas no existe (decisión 4); con una sola, ocupa el ancho.
 * Lo de artistas va en redondo, como su avatar. Al volver de una ficha queda donde estaba (decisión 12).
 */
export default function Destacados({ tarjetas, encabezado = "Destacados", memoria = "destacados", detalleCompleto = false }: { tarjetas: Tarjeta[]; encabezado?: string; memoria?: string; detalleCompleto?: boolean }) {
  const titulo = useId();
  /** El guardado que espera: la URL donde se deslizó y su temporizador. */
  const pendiente = useRef<{ clave: string; temporizador: number } | null>(null);
  // Al aparecer, el carril vuelve a donde estaba; al irse, guarda lo que esperaba, y quien desliza y toca una tarjeta antes
  // de 100 ms no pierde la posición. Al irse el carril sigue en la página, pero la URL ya puede ser la de la ficha: por eso
  // se guarda con la URL del desplazamiento.
  const recordar = useCallback((carril: HTMLUListElement) => {
    const x = leerScroll(claveTira(memoria));
    if (x) carril.scrollLeft = x;
    return () => {
      const espera = pendiente.current;
      if (!espera) return;
      window.clearTimeout(espera.temporizador);
      pendiente.current = null;
      guardarScroll(espera.clave, carril.scrollLeft);
    };
  }, [memoria]);
  // Como MemoriaScroll: se guarda al vuelo, como mucho cada 100 ms.
  function alDesplazar(e: UIEvent<HTMLUListElement>) {
    if (pendiente.current) return;
    const carril = e.currentTarget;
    const clave = claveTira(memoria);
    const temporizador = window.setTimeout(() => {
      pendiente.current = null;
      guardarScroll(clave, carril.scrollLeft);
    }, 100);
    pendiente.current = { clave, temporizador };
  }
  if (tarjetas.length === 0) return null;
  // La curaduría (o la fecha semanal) conserva su orden dentro de cada grupo; una foto real va antes del placeholder.
  const ordenadas = tarjetas.toSorted((a, b) => Number(b.foto.includes("/sin-foto")) - Number(a.foto.includes("/sin-foto")));
  return (
    <section className={styles.destacados} aria-labelledby={titulo}>
      <h2 id={titulo}>{encabezado}</h2>
      <ul ref={recordar} className={`${styles.carril} ${ordenadas.length === 1 ? styles.uno : ""} ${detalleCompleto ? styles.detalleCompleto : ""}`} onScroll={alDesplazar}>
        {ordenadas.map((t) => (
          <li key={t.id}>
            <Link href={t.href} className={styles.tarjeta}>
              {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
              <img src={t.foto} alt="" className={styles.foto} loading="lazy" decoding="async" />
              <b>{t.titulo}</b>
              <small>{t.detalle}</small>
              {/* Va al final para que se oiga después del título; el grid lo pone sobre la foto. */}
              {t.van > 0 && (
                <span className={styles.van}>
                  <IconoPersonas width={14} height={14} />
                  {t.van === 1 ? "1 va" : `${t.van} van`}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** El desplazamiento de la tira se guarda por URL, aparte del de la página. */
function claveTira(memoria: string) {
  return `${claveDeUrl(window.location)}#${memoria}`;
}
