"use client";

import Link from "next/link";
import { useCallback, useId, useRef, type MouseEvent, type PointerEvent, type UIEvent } from "react";
import { ordenarTarjetasPorFoto, selloDeTarjeta, type Tarjeta } from "@/lib/destacados";
import { huboArrastre, type Asistencia } from "@/lib/deslizar";
import { SIN_FOTO } from "@/lib/imagen";
import { claveDeUrl, guardarScroll, leerScroll } from "@/lib/memoriaPantalla";
import CarrilEsqueleto from "./CarrilEsqueleto";
import BotonRenglon, { type EstadoBotonRenglon } from "./ui/BotonRenglon";
import { Chip } from "./ui/Chip";
import { IconoChevronDerecha } from "./ui/Iconos";
import MarcaDestacado from "./ui/MarcaDestacado";
import styles from "./Destacados.module.css";

/**
 * La tira de destacados arriba de un listado (docs/rediseno/20; doc 50, P10). Se desliza con el dedo, sin avance automático, y la
 * siguiente tarjeta asoma (decisiones 1 y 2). Sin tarjetas no existe (decisión 4); con una sola, ocupa el ancho con la imagen
 * arriba (OL-226), salvo las redondas. `tamano`: `grande` (cartel vertical, lo que elige la administración: founder, 2026-09-18),
 * `mediana` (la de siempre) o `chica` (redonda, la de un lugar o un artista). Al volver de una ficha queda donde estaba (decisión 12).
 *
 * La tarjeta: la foto con, encima, un solo rótulo (`selloDeTarjeta`, H-02) y el botón; el título, a dos líneas como mucho, y los
 * datos en dos (cuándo, dónde), cada una con su elipsis (doc 50, punto 57). Sin foto (H-03) no hay bloque de imagen: el nombre
 * grande sobre un fondo suave. Cada tarjeta comparte las filas del carril con `subgrid`, así los títulos y los datos de todas
 * quedan alineados.
 *
 * `boton` (OL-106, bitácora 141): con él, cada tarjeta lleva el mismo botón de los renglones, flotando sobre la esquina superior
 * derecha de la foto (hermano del `<Link>`, nunca anidado dentro). Reutiliza el hook que la pantalla ya tiene para sus renglones
 * (`useAsistenciaEnLista`/`useSeguirEnLista`): `Tarjeta` ya trae `id`/`titulo` de la propia entidad, así que no hace falta ninguna
 * consulta nueva.
 *
 * `verTodos` (OL-153, bitácora 188; letrero honesto en P5, doc 50 puntos 60 y 61): un enlace a la derecha del título que dice
 * a dónde lleva («Ver la agenda», «Ver mi perfil», «Ver lugares», «Ver artistas»; nunca «Ver todo») y abre esa sección con
 * sus listados de siempre. El título es un `<h2>`, no un enlace; el enlace lleva su chevron y un alto mínimo de
 * `--toque-min` (44 px), y su nombre accesible dice también de qué carril viene («Ver la agenda: Destacados»), porque hay
 * varios iguales en la pantalla. Sin `verTodos` el carril no lleva enlace: un carril sin destino no lleva uno.
 *
 * `estadoDe` (OL-176, bitácora 211): solo en los carriles de eventos, lo que la persona ya decidió («Te interesa»). `Tarjeta` no
 * trae lo que la persona decidió (no es suyo: lo decide en la ficha, no al armar la tarjeta); en vez de eso, el llamador pasa el
 * `estado(id)` que ya expone `useAsistenciaEnLista` — el mismo hook que le da `boton` — sin tocar ese hook ni el tipo `Tarjeta`.
 * Sin `estadoDe` (lugares, artistas) no aparece nada.
 */
export default function Destacados({ tarjetas, tamano = "mediana", encabezado = "Destacados", memoria = "destacados", boton, estadoDe, verTodos }: { tarjetas: Tarjeta[]; tamano?: "grande" | "mediana" | "chica"; encabezado?: string; memoria?: string; boton?: (t: Tarjeta) => EstadoBotonRenglon; estadoDe?: (id: string) => Asistencia; verTodos?: { href: string; etiqueta: string } }) {
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
  // Un carril que resulta vacío no deja hueco (OL-156, segunda vuelta): el esqueleto que ocupaba su lugar se recoge y se desvanece
  // (`.vacio`, CSS) en vez de desaparecer de golpe — sin salto para quien lo vio mientras cargaba, y sin nada que ver para quien
  // no (sin JavaScript, o entrando ya con la respuesta).
  if (tarjetas.length === 0) {
    return (
      <div className={styles.vacio} aria-hidden="true">
        <div>
          <CarrilEsqueleto tamano={tamano} />
        </div>
      </div>
    );
  }
  // La curaduría (o la fecha semanal) conserva su orden dentro de cada grupo; una foto real va antes del placeholder.
  const ordenadas = ordenarTarjetasPorFoto(tarjetas);
  // Una sola tarjeta ocupa el ancho del carril (las redondas no).
  const forma = ordenadas.length === 1 && tamano !== "chica" ? "sola" : tamano;
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
      <ul ref={recordar} className={`${styles.carril} ${styles[forma]}`} onScroll={alDesplazar} onPointerDown={alBajarCarril} onClickCapture={alTocarCarril}>
        {ordenadas.map((t) => {
          const sello = selloDeTarjeta(t, estadoDe?.(t.id) === "me_interesa");
          // La redonda de un lugar o un artista sin foto lleva el símbolo SN ya generado; las demás, el nombre grande sobre fondo suave (H-03).
          const foto = t.foto ?? (tamano === "chica" ? SIN_FOTO : null);
          return (
            <li key={t.id}>
              <Link href={t.href} className={foto ? styles.tarjeta : `${styles.tarjeta} ${styles.sinFoto}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage */}
                {foto && <img src={foto} alt="" className={styles.foto} loading="lazy" decoding="async" />}
                <b>{t.titulo}</b>
                <small>
                  <span className={t.cuando ? styles.cuando : undefined}>{t.detalle}</span>
                  {t.sitio && <span>{t.sitio}</span>}
                </small>
                {/* Al final para que se oiga después del título; un solo rótulo por foto, abajo a la izquierda, y la marca de destacado, arriba. */}
                {sello && (
                  <Chip variante={sello.tuyo ? "estado" : "sello"} className={sello.hoy ? `${styles.rotulo} ${styles.hoy}` : styles.rotulo}>
                    {sello.texto}
                  </Chip>
                )}
                {t.destacado && <MarcaDestacado className={styles.marca} />}
              </Link>
              {boton && <BotonRenglon {...boton(t)} sobreFoto />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** El desplazamiento de la tira se guarda por URL, aparte del de la página. */
function claveTira(memoria: string) {
  return `${claveDeUrl(window.location)}#${memoria}`;
}
