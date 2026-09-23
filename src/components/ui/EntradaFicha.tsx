"use client";

import { useEffect, useRef, useState, type ReactNode, type TransitionEvent } from "react";
import styles from "./EntradaFicha.module.css";
import { debePasarAQuieta, estadoInicial, type EstadoFicha } from "./entradaFichaEstado";

/** Tope de seguridad: 220 ms de transición + margen. Si `transitionend` no llega (p. ej. pestaña oculta),
 * esto deja la ficha quieta de todos modos (OL-157). */
const TOPE_QUIETA_MS = 400;

/**
 * La ficha (lugar, artista) entra deslizándose desde la derecha en 220 ms al abrirse desde un listado
 * (docs/rediseno/38-transiciones-cargador.md, OL-144/148). Solo `transform`; con "reducir movimiento" no hay
 * transición (la regla global de `globals.css` ya la apaga, y aquí también por si acaso).
 *
 * Arranca cerrada (fuera de pantalla, a la derecha) y pasa a abierta en el primer fotograma tras montarse: así el
 * navegador anima el cambio de estado en vez de pintar ya en su lugar final, igual que el prototipo firmado
 * (`docs/rediseno/prototipos/transiciones.html`, clase `.abierta`). Al volver (Atrás), Safari y Next navegan por su
 * cuenta al listado ya en memoria (memoria de pantalla): esta ficha simplemente deja de existir, sin cargador.
 *
 * Al terminar la entrada pasa a "quieta" (`transform: none`, OL-157): dejar `translateX(0)` convertía al
 * envoltorio en contenedor de los elementos `position: fixed`/`sticky` de dentro, y la barra de seguir/compartir
 * de las fichas de lugar y artista dejaba de pegarse al borde de la ventana.
 */
export default function EntradaFicha({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoFicha>(() =>
    estadoInicial(typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches),
  );
  const topeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (estado !== "cerrada") return;
    const id = requestAnimationFrame(() => setEstado("abierta"));
    return () => cancelAnimationFrame(id);
  }, [estado]);

  useEffect(() => {
    if (estado !== "abierta") return;
    topeRef.current = setTimeout(() => setEstado((actual) => (debePasarAQuieta(actual) ? "quieta" : actual)), TOPE_QUIETA_MS);
    return () => {
      if (topeRef.current) clearTimeout(topeRef.current);
    };
  }, [estado]);

  function alTerminarTransicion(evento: TransitionEvent<HTMLDivElement>) {
    if (evento.target !== evento.currentTarget || evento.propertyName !== "transform") return;
    setEstado((actual) => (debePasarAQuieta(actual) ? "quieta" : actual));
  }

  return (
    <div className={`${styles.ficha} ${styles[estado]}`} onTransitionEnd={alTerminarTransicion}>
      {children}
    </div>
  );
}
