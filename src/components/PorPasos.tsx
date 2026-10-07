"use client";

import { Fragment, useEffect, useRef, type ReactNode, type Ref } from "react";
import { registrarVolverVisible } from "./Navegacion";
import { useSalirSinPublicar, type Guardar } from "./SalirSinPublicar";
import Barra from "./ui/Barra";
import BotonIcono from "./ui/BotonIcono";
import Cerrar from "./ui/Cerrar";
import { IconoChevronIzquierda } from "./ui/Iconos";
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
  /** Lo que va encima de la pregunta (en el alta de evento, la fila chica del cartel ya guardado, solo en la primera pregunta). */
  encima?: ReactNode;
  /** La única pregunta del paso, su encabezado. */
  pregunta?: string;
  /** Lo que no cambia de un paso a otro (el formulario escondido que publica): no entra de lado ni se vuelve a montar. */
  fijo?: ReactNode;
  /** Lo del paso, en orden: sus controles y, si lo lleva, su `PiePaso`. */
  children: ReactNode;
  /** Qué pregunta la guardia de salida: «¿Salir sin publicar?» (un alta) o «¿Salir sin guardar?» (editar, OL-319). */
  guardia?: Guardar;
};

/**
 * El armazón de un alta por pasos (OL-300; doc 51 y prototipo firmado `publicar-por-pasos.html`, bitácora 323): una pregunta por
 * pantalla. Una sola columna, `main` con sus hijos directos: la barra (la ✕ del primer paso o el Atrás de los demás, el título y la línea
 * de avance), la pregunta, sus controles y el pie pegado abajo con el botón que dice qué falta. Los pasos son estado de la pantalla y no
 * entradas del historial (en Safari del iPhone el atrás del navegador retrocede al documento anterior, y filtrar no es navegar): Atrás
 * vuelve al paso anterior con lo contestado intacto, y la ✕ sale de la tarea pasando por «¿Salir sin publicar?» (`useSalirSinPublicar`,
 * que también avisa con `beforeunload`), que compara los formularios de esta pantalla con cómo se abrió. Lo usa el alta de evento y lo
 * usan también las de lugar y de artista, y editar un evento (OL-319), que entra directo en «Revisa» y cuya guardia dice «¿Salir sin guardar?».
 */
export default function PorPasos({ titulo, paso, direccion, avance, salida, onAtras, encima, pregunta, fijo, children, guardia = "publicar" }: Props) {
  const pantalla = useRef<HTMLElement>(null);
  const hojaSalir = useSalirSinPublicar(pantalla, undefined, guardia);
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
        {encima}
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
 * El pie del paso, pegado abajo con su botón. Con el teclado del iPhone abierto queda anclado justo encima de él (`bottom: var(--abajo-visible)`
 * en el CSS, publicado por `ui/useCampoVisible`): las acciones nunca quedan bajo el teclado. En la columna de los pasos sale del flujo para
 * eso, y publica su alto en `--alto-pie` para que la columna le deje sitio al campo enfocado; en una capa fija con su propio desplazamiento
 * (la hoja «¿Dónde es?», OL-303) sigue pegado. `ref` es para quien necesita medirlo (la lista flotante de esa hoja no debe taparlo). Lo que el
 * botón dice (qué falta) se anuncia al cambiar.
 */
export function PiePaso({ children, ref }: { children: ReactNode; ref?: Ref<HTMLElement> }) {
  const propio = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const pie = propio.current;
    if (!pie) return;
    const raiz = document.documentElement;
    const medir = () => raiz.style.setProperty("--alto-pie", `${pie.getBoundingClientRect().height}px`);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(pie);
    return () => {
      observador.disconnect();
      raiz.style.removeProperty("--alto-pie");
    };
  }, []);
  return (
    <footer
      ref={(el) => {
        propio.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      className={styles.pie}
      aria-live="polite"
    >
      {children}
    </footer>
  );
}
