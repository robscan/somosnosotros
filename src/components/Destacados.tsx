"use client";

import Link from "next/link";
import { useId, useLayoutEffect, useRef } from "react";
import type { Tarjeta } from "@/lib/destacados";
import { claveDeUrl, guardarScroll, leerScroll } from "@/lib/memoriaPantalla";
import { IconoPersonas } from "./ui/Iconos";
import styles from "./Destacados.module.css";

/**
 * La tira de destacados arriba de un listado (docs/rediseno/20). Se desliza con el dedo, sin avance automático, y la
 * siguiente tarjeta asoma (decisiones 1 y 2). Sin tarjetas no existe (decisión 4); con una sola, ocupa el ancho.
 * Lo de artistas va en redondo, como su avatar. Al volver de una ficha queda donde estaba (decisión 12).
 */
export default function Destacados({ tarjetas, redondas = false }: { tarjetas: Tarjeta[]; redondas?: boolean }) {
  const titulo = useId();
  const carril = useRef<HTMLUListElement>(null);
  useLayoutEffect(() => {
    const x = leerScroll(claveTira());
    if (x && carril.current) carril.current.scrollLeft = x;
  }, []);
  if (tarjetas.length === 0) return null;
  return (
    <section className={styles.destacados} aria-labelledby={titulo}>
      <h2 id={titulo}>Destacados</h2>
      <ul ref={carril} className={`${styles.carril} ${tarjetas.length === 1 ? styles.uno : ""} ${redondas ? styles.redondas : ""}`} onScroll={(e) => guardarScroll(claveTira(), e.currentTarget.scrollLeft)}>
        {tarjetas.map((t) => (
          <li key={t.id}>
            <Link href={t.href} className={styles.tarjeta}>
              {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
              <img src={t.foto} alt="" className={styles.foto} loading="lazy" decoding="async" />
              {t.van > 0 && (
                <span className={styles.van}>
                  <IconoPersonas width={14} height={14} />
                  {t.van === 1 ? "1 va" : `${t.van} van`}
                </span>
              )}
              <b>{t.titulo}</b>
              <small>{t.detalle}</small>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** El desplazamiento de la tira se guarda por URL, aparte del de la página. */
function claveTira() {
  return `${claveDeUrl(window.location)}#destacados`;
}
