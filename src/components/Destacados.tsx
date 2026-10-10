"use client";

import Link from "next/link";
import { useCallback, useId, useRef, type MouseEvent, type PointerEvent, type UIEvent } from "react";
import { ordenarTarjetasPorFoto, type Tarjeta } from "@/lib/destacados";
import { huboArrastre, type Asistencia } from "@/lib/deslizar";
import { claveDeUrl, guardarScroll, leerScroll } from "@/lib/memoriaPantalla";
import CarrilEsqueleto, { columnasDe, type FormaCarril } from "./CarrilEsqueleto";
import { IconoChevronDerecha } from "./ui/Iconos";
import TarjetaAvatar from "./inicio/TarjetaAvatar";
import TarjetaEvento, { TarjetaArtista } from "./inicio/TarjetaEvento";
import styles from "./Destacados.module.css";

/**
 * Un carril de Inicio (docs/rediseno/20; doc 50, P10): el título, el enlace que dice a dónde lleva y una tira que se desliza con el dedo, sin
 * avance automático, con la siguiente tarjeta asomando (decisiones 1 y 2). Sin tarjetas no existe (decisión 4). Al volver de una ficha queda donde
 * estaba (decisión 12).
 *
 * Las tarjetas son las que firmó el founder el 2026-10-10 (prototipo `docs/rediseno/prototipos/inicio-tarjetas.html`, «Firmada»; bitácora 398), y
 * cada una es un solo enlace a su ficha, sin botón: decidir («Voy», «Me interesa») y seguir quedan en la ficha (y en las historias). `forma`:
 * - `grande` o `mediana` (OL-370): la tarjeta de un evento (`inicio/TarjetaEvento`), el cartel entero en 4:5 con su sello de fecha; grande en Tus
 *   planes, Destacados y Festivales y expos, mediana en Esta semana, Nuevos eventos y Más adelante (E5). Siempre con el tamaño de su carril: una
 *   sola tarjeta no se estira a lo ancho.
 * - `artista` (OL-372, E9): la de un artista en «Artistas destacadxs», que es la mediana de un evento (`TarjetaArtista`).
 * - `avatar` (OL-372, E5): el redondo de 64 de «Lugares de la semana» y «Artistas de la semana» (`inicio/TarjetaAvatar`).
 *
 * Una foto real va antes que lo que no la tiene; dentro de cada grupo se conserva el orden de la curaduría o de las fechas.
 *
 * `verTodos` (OL-153, bitácora 188; letrero honesto en P5, doc 50 puntos 60 y 61): un enlace a la derecha del título que dice
 * a dónde lleva («Ver la agenda», «Ver mi perfil», «Ver lugares», «Ver artistas»; nunca «Ver todo») y abre esa sección con
 * sus listados de siempre. El título es un `<h2>`, no un enlace; el enlace lleva su chevron y un alto mínimo de
 * `--toque-min` (44 px), y su nombre accesible dice también de qué carril viene («Ver la agenda: Destacados»), porque hay
 * varios iguales en la pantalla. Sin `verTodos` el carril no lleva enlace: un carril sin destino no lleva uno.
 *
 * `estadoDe` (OL-176, bitácora 211): solo en los carriles de eventos, lo que la persona ya decidió (el `estado(id)` de `useAsistenciaEnLista`):
 * la tarjeta dice «Te interesa» en su chip y «Vas» en el nombre del enlace. `Tarjeta` no lo trae: no es de la tarjeta, lo decide la persona.
 */
export default function Destacados({ tarjetas, forma, encabezado = "Destacados", memoria = "destacados", estadoDe, verTodos }: { tarjetas: Tarjeta[]; forma: FormaCarril; encabezado?: string; memoria?: string; estadoDe?: (id: string) => Asistencia; verTodos?: { href: string; etiqueta: string } }) {
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
      // Recorrer el carril no abre la tarjeta donde se soltó el dedo: en la fase de captura, el toque ni llega a ella.
      e.preventDefault();
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
  // Un carril que resulta vacío no deja hueco (OL-156, segunda vuelta): el esqueleto que ocupaba su lugar se recoge y se desvanece
  // (`.vacio`, CSS) en vez de desaparecer de golpe — sin salto para quien lo vio mientras cargaba, y sin nada que ver para quien
  // no (sin JavaScript, o entrando ya con la respuesta).
  if (tarjetas.length === 0) {
    return (
      <div className={styles.vacio} aria-hidden="true">
        <div>
          <CarrilEsqueleto forma={forma} />
        </div>
      </div>
    );
  }
  return (
    <section className={styles.destacados} aria-labelledby={titulo}>
      <div className={styles.cabecera}>
        <h2 id={titulo}>{encabezado}</h2>
        {verTodos && (
          <Link href={verTodos.href} className={styles.verTodo} aria-label={`${verTodos.etiqueta}: ${encabezado}`}>
            {verTodos.etiqueta}
            <IconoChevronDerecha width={18} height={18} strokeWidth={2} />
          </Link>
        )}
      </div>
      <ul ref={recordar} className={`${styles.carril} ${columnasDe(forma)}`} onScroll={alDesplazar} onPointerDown={alBajarCarril} onClickCapture={alTocarCarril}>
        {ordenarTarjetasPorFoto(tarjetas).map((t) => (
          <li key={t.clave ?? t.id}>{forma === "avatar" ? <TarjetaAvatar t={t} /> : forma === "artista" ? <TarjetaArtista t={t} /> : <TarjetaEvento t={t} tamano={forma} decision={estadoDe?.(t.id) ?? null} />}</li>
        ))}
      </ul>
    </section>
  );
}

/** El desplazamiento de la tira se guarda por URL, aparte del de la página. */
function claveTira(memoria: string) {
  return `${claveDeUrl(window.location)}#${memoria}`;
}
