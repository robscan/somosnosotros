"use client";

import { Fragment, useEffect, useRef, type ReactNode, type Ref } from "react";
import { registrarVolverVisible } from "./Navegacion";
import { useSalirSinPublicar } from "./SalirSinPublicar";
import Barra from "./ui/Barra";
import BotonIcono from "./ui/BotonIcono";
import Cerrar from "./ui/Cerrar";
import { IconoChevronIzquierda } from "./ui/Iconos";
import useAreaVisible from "./ui/useAreaVisible";
import styles from "./PorPasos.module.css";

/** Hacia dónde se movió el paso: el siguiente entra por la derecha y el anterior (Atrás, o la vuelta a «Revisa») por la izquierda. */
export type Direccion = "entra" | "vuelve";

type Props = {
  /** El título de la barra («Publicar», «Revisa»). */
  titulo: string;
  /** El paso a la vista: al cambiar, lo suyo entra con la transición y el foco va a su campo o a su pregunta. */
  paso: string;
  /** Null en la primera pantalla: lo que se ve al llegar no entra de lado. */
  direccion: Direccion | null;
  /** Lo recorrido, de 0 a 1: la línea bajo la barra. */
  avance: number;
  /** A dónde sale la ✕ del primer paso si no hay pantalla anterior. */
  salida: { href: string; texto: string };
  /** Atrás del paso; sin él es el primero y la barra lleva la ✕. */
  onAtras?: () => void;
  /** La única pregunta del paso, su encabezado. */
  pregunta?: string;
  /** Lo que no cambia de un paso a otro (el formulario escondido que publica): no entra de lado ni se vuelve a montar. */
  fijo?: ReactNode;
  /** Lo del paso, en orden: sus controles y, si lo lleva, su `PiePaso`. */
  children: ReactNode;
};

/**
 * El armazón de un alta por pasos (OL-300; doc 51 y prototipo firmado `publicar-por-pasos.html`, bitácora 323): una pregunta por
 * pantalla. Una sola columna, `main` con sus hijos directos: la barra (la ✕ del primer paso o el Atrás de los demás, el título y la línea
 * de avance), la pregunta, sus controles y el pie pegado abajo con el botón que dice qué falta. Los pasos son estado de la pantalla y no
 * entradas del historial (en Safari del iPhone el atrás del navegador retrocede al documento anterior, y filtrar no es navegar): Atrás
 * vuelve al paso anterior con lo contestado intacto, y la ✕ sale de la tarea pasando por «¿Salir sin publicar?» (`useSalirSinPublicar`,
 * que también avisa con `beforeunload`), que compara los formularios de esta pantalla con cómo se abrió. Lo usa el alta de evento y lo
 * usarán las de lugar y de artista.
 */
export default function PorPasos({ titulo, paso, direccion, avance, salida, onAtras, pregunta, fijo, children }: Props) {
  const pantalla = useRef<HTMLElement>(null);
  const hojaSalir = useSalirSinPublicar(pantalla);
  const anterior = useRef(paso);

  // Al cambiar de paso: arriba, y el foco a lo que se contesta. Un campo con `autoFocus` ya lo tomó al montarse; si no, la pregunta
  // (o, en un paso sin ella, el título de la barra), para que el lector de pantalla diga dónde se está; también tras Atrás, cuyo botón
  // sigue en pantalla. Al llegar no se mueve nada.
  useEffect(() => {
    if (anterior.current === paso) return;
    anterior.current = paso;
    window.scrollTo({ top: 0 });
    const main = pantalla.current;
    const activo = document.activeElement;
    if (!main || (activo instanceof HTMLInputElement && main.contains(activo))) return;
    (main.querySelector("h2") ?? main.querySelector("h1"))?.focus({ preventScroll: true });
  }, [paso]);

  return (
    <main ref={pantalla} className={styles.pasos} data-direccion={direccion ?? undefined}>
      <Barra titulo={titulo} paso={{ avance, salida: onAtras ? <AtrasDelPaso onAtras={onAtras} /> : <Cerrar href={salida.href} texto={salida.texto} relieve="plano" /> }} />
      <Fragment key={paso}>
        {pregunta && (
          <h2 className={styles.pregunta} tabIndex={-1}>
            {pregunta}
          </h2>
        )}
        {children}
      </Fragment>
      {fijo}
      {hojaSalir}
    </main>
  );
}

/** Atrás del paso: vuelve al anterior sin salir de la pantalla. Mientras se ve, el gesto de deslizar de la app de iPhone hace lo mismo. */
function AtrasDelPaso({ onAtras }: { onAtras: () => void }) {
  useEffect(() => registrarVolverVisible(onAtras), [onAtras]);
  return (
    <BotonIcono onClick={onAtras} aria-label="Atrás">
      <IconoChevronIzquierda width={26} height={26} />
    </BotonIcono>
  );
}

/**
 * El pie del paso, pegado abajo con su botón. Con el teclado del iPhone abierto se queda justo encima de él: la ventana de maquetación
 * sigue midiendo hasta el borde de la pantalla y el teclado tapa su parte de abajo, así que el pie sube lo que el teclado ocupa (el área
 * visible, `useAreaVisible`, como `ui/Hoja` y `ui/CampoLargo`). Lo que el botón dice (qué falta) se anuncia al cambiar. `ref` es para
 * quien necesita medirlo (la hoja «¿Dónde es?», OL-303: la lista flotante no debe taparlo).
 */
export function PiePaso({ children, ref }: { children: ReactNode; ref?: Ref<HTMLElement> }) {
  const area = useAreaVisible();
  const teclado = area ? Math.max(0, area.ventana - area.top - area.height) : 0;
  return (
    <footer ref={ref} className={styles.pie} style={teclado ? { bottom: teclado } : undefined} aria-live="polite">
      {children}
    </footer>
  );
}
