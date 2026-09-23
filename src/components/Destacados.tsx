"use client";

import Link from "next/link";
import { useCallback, useId, useRef, type MouseEvent, type PointerEvent, type UIEvent } from "react";
import { ordenarTarjetasPorFoto, type Tarjeta } from "@/lib/destacados";
import { huboArrastre } from "@/lib/deslizar";
import { claveDeUrl, guardarScroll, leerScroll } from "@/lib/memoriaPantalla";
import BotonRenglon, { type EstadoBotonRenglon } from "./ui/BotonRenglon";
import { IconoPersonas } from "./ui/Iconos";
import styles from "./Destacados.module.css";

/**
 * La tira de destacados arriba de un listado (docs/rediseno/20). Se desliza con el dedo, sin avance automático, y la
 * siguiente tarjeta asoma (decisiones 1 y 2). Sin tarjetas no existe (decisión 4); con una sola, ocupa el ancho.
 * Solo «Destacados» (lo que elige la administración) va al doble y rectangular (`grande`, founder, 2026-09-18);
 * «Con eventos esta semana» conserva su tamaño de siempre (corrección del founder, 2026-09-19), y en Artistas sigue
 * en redondo, como su avatar. Al volver de una ficha queda donde estaba (decisión 12).
 *
 * `boton` (OL-106, bitácora 141): con él, cada tarjeta lleva el mismo botón de los renglones, flotando sobre la
 * esquina superior derecha de la foto (hermano del `<Link>`, nunca anidado dentro). Reutiliza el hook que la pantalla
 * ya tiene para sus renglones (`useAsistenciaEnLista`/`useSeguirEnLista`): `Tarjeta` ya trae `id`/`titulo` de la
 * propia entidad, así que no hace falta ninguna consulta nueva.
 *
 * `verTodos` (OL-153, bitácora 188): un enlace junto al título que abre la sección con sus listados y filtros de
 * siempre. Con esto, `grande`/`redondas`/(ninguno) son el canon de los tres tamaños de tarjeta de un carril —
 * grande, mediana (el tamaño de siempre) y chica (`redondas`, la más pequeña que ya existía) — y la pantalla de
 * Inicio no necesita un componente de tarjeta propio.
 */
export default function Destacados({ tarjetas, grande = false, redondas = false, encabezado = "Destacados", memoria = "destacados", detalleCompleto = false, boton, verTodos }: { tarjetas: Tarjeta[]; grande?: boolean; redondas?: boolean; encabezado?: string; memoria?: string; detalleCompleto?: boolean; boton?: (t: Tarjeta) => EstadoBotonRenglon; verTodos?: { href: string; texto?: string } }) {
  const titulo = useId();
  /** El guardado que espera: la URL donde se deslizó y su temporizador. */
  const pendiente = useRef<{ clave: string; temporizador: number } | null>(null);
  /** Dónde bajó el dedo la última vez, para no confundir recorrer el carril con tocar una tarjeta (founder,
   * 2026-09-21, L45). El carril es scroll nativo: no hay gesto propio que decidir, solo cancelar el toque si hubo
   * arrastre entre bajar y soltar. */
  const bajada = useRef<{ x: number; y: number } | null>(null);
  function alBajarCarril(e: PointerEvent<HTMLUListElement>) {
    bajada.current = { x: e.clientX, y: e.clientY };
  }
  function alTocarCarril(e: MouseEvent<HTMLUListElement>) {
    const inicio = bajada.current;
    // Un click sin puntero real (Enter con teclado, VoiceOver, `click()` por código) llega con detail 0 y sin
    // coordenadas: no hubo arrastre que cancelar, y comparar contra la última bajada (de otro toque) lo cerraría
    // sin querer (gestión de cambios, revisión de 6153f9a). La bajada se limpia siempre, para no arrastrarla al
    // siguiente click que no traiga la suya.
    if (inicio && e.detail !== 0 && huboArrastre(e.clientX - inicio.x, e.clientY - inicio.y)) {
      e.preventDefault();
      // OL-106: el botón de la tarjeta es hermano del <Link>, no su hijo — preventDefault() solo cancela la
      // navegación del enlace, no llega a detener el propio onClick del botón. stopPropagation() en la fase de
      // captura (antes de llegar al objetivo) sí lo hace: recorrer el carril empezando sobre el botón no lo dispara.
      e.stopPropagation();
    }
    bajada.current = null;
  }
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
  const ordenadas = ordenarTarjetasPorFoto(tarjetas);
  return (
    <section className={styles.destacados} aria-labelledby={titulo}>
      <div className={styles.cabecera}>
        <h2 id={titulo}>{encabezado}</h2>
        {verTodos && (
          <Link href={verTodos.href} className={styles.verTodos}>
            {verTodos.texto ?? "Ver todos"} →
          </Link>
        )}
      </div>
      <ul ref={recordar} className={`${styles.carril} ${ordenadas.length === 1 ? styles.uno : ""} ${grande ? styles.grande : ""} ${redondas ? styles.redondas : ""} ${detalleCompleto ? styles.detalleCompleto : ""}`} onScroll={alDesplazar} onPointerDown={alBajarCarril} onClickCapture={alTocarCarril}>
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
            {boton && <BotonRenglon {...boton(t)} />}
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
