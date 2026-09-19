"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { idGrupo, LETRAS, letraEnPunto } from "@/lib/indice";
import styles from "./IndiceAlfabetico.module.css";

/**
 * Lleva la página al encabezado de una letra, bajo lo que se queda pegado arriba (pestañas de Lugares, buscador y
 * chips de Artistas): las cabeceras pegajosas son hijas de `main` o de la sección de la lista.
 */
export function irAlGrupo(letra: string) {
  const grupo = document.getElementById(idGrupo(letra));
  if (!grupo) return false;
  // Lo que tapan una vez pegadas: su `top` más su alto (antes de pegarse, su posición actual no sirve).
  const tapa = Math.max(0, ...[...document.querySelectorAll<HTMLElement>("main > *, main > section > *")].map((e) => {
    const s = getComputedStyle(e);
    return s.position === "sticky" && !e.contains(grupo) ? (parseFloat(s.top) || 0) + e.offsetHeight : 0;
  }));
  window.scrollTo({ top: grupo.getBoundingClientRect().top + window.scrollY - tapa });
  return true;
}

/**
 * Índice vertical al borde derecho de la lista, como Contactos de Apple: tocar una letra lleva a su grupo y arrastrar
 * el dedo por la columna va pasando letras. Quien lo usa decide qué hacer con la letra (saltar o pedirla).
 * `alSoltar` llega al levantar el dedo, con la última letra: sirve para lo que no conviene hacer a cada paso.
 */
export default function IndiceAlfabetico({ alTocar, alSoltar }: { alTocar: (letra: string) => void; alSoltar?: (letra: string) => void }) {
  const [activa, setActiva] = useState<string | null>(null);
  const ultima = useRef<string | null>(null);

  function tocar(e: PointerEvent<HTMLElement>) {
    const caja = e.currentTarget.getBoundingClientRect();
    const letra = letraEnPunto(e.clientY - caja.top, caja.height);
    if (letra === ultima.current) return;
    ultima.current = letra;
    setActiva(letra);
    alTocar(letra);
  }
  function soltar() {
    const letra = ultima.current;
    ultima.current = null;
    setActiva(null);
    if (letra) alSoltar?.(letra);
  }
  // Con teclado (Enter o espacio sobre una letra) no hay puntero: la letra se toca y se suelta de una vez.
  function conTeclado(e: KeyboardEvent<HTMLElement>) {
    const letra = (e.target as HTMLElement).dataset.letra;
    if (!letra || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    alTocar(letra);
    alSoltar?.(letra);
  }

  return (
    <nav
      className={styles.indice}
      aria-label="Ir a una letra"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        tocar(e);
      }}
      onPointerMove={(e) => ultima.current && tocar(e)}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onKeyDown={conTeclado}
    >
      {LETRAS.map((l) => (
        <button key={l} type="button" data-letra={l} aria-label={`Ir a la ${l}`} className={activa === l ? styles.activa : undefined}>
          {l}
        </button>
      ))}
    </nav>
  );
}
