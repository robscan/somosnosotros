"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./Sheet.module.css";

export type EstadoSheet = "peek" | "medium" | "expanded";

type Props = {
  cabecera: ReactNode;
  children: ReactNode;
  inicial?: EstadoSheet;
};

const ORDEN: EstadoSheet[] = ["peek", "medium", "expanded"];
const DURACION_MS = 300;

/**
 * Panel inferior sobre el mapa con tres alturas (docs/heredado/front/BOTTOM_SHEET.md):
 * peek = solo la cabecera · medium = la mitad · expanded = casi toda la pantalla.
 * Se arrastra desde el asa o la cabecera; tocar el asa cicla peek → medium → expanded → medium.
 * El contenido solo scrollea cuando el panel no está en peek.
 */
export default function Sheet({ cabecera, children, inicial = "peek" }: Props) {
  const [estado, setEstado] = useState<EstadoSheet>(inicial);
  const [alturas, setAlturas] = useState({ peek: 132, medium: 400, expanded: 700 });
  const [arrastre, setArrastre] = useState<number | null>(null); // altura visible durante el arrastre
  const cabeceraRef = useRef<HTMLDivElement>(null);
  const inicioRef = useRef<{ y: number; altura: number; t: number } | null>(null);

  // Medir: peek según la cabecera real; medium y expanded según la pantalla.
  const medir = useCallback(() => {
    const alto = window.innerHeight;
    const peek = (cabeceraRef.current?.offsetHeight ?? 100) + 4; // en reposo: solo la cabecera
    setAlturas({ peek, medium: Math.round(alto * 0.5), expanded: Math.round(alto - 56) });
  }, []);
  useEffect(() => {
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [medir]);

  const alturaVisible = arrastre ?? alturas[estado];

  function alPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("a, button, input, select, textarea")) return;
    inicioRef.current = { y: e.clientY, altura: alturas[estado], t: performance.now() };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function alPointerMove(e: React.PointerEvent) {
    if (!inicioRef.current) return;
    const nueva = inicioRef.current.altura + (inicioRef.current.y - e.clientY);
    setArrastre(Math.max(alturas.peek * 0.6, Math.min(alturas.expanded, nueva)));
  }
  function alPointerUp(e: React.PointerEvent) {
    const ini = inicioRef.current;
    inicioRef.current = null;
    if (!ini) return;
    const desplazamiento = ini.y - e.clientY; // + hacia arriba
    const dt = Math.max(1, performance.now() - ini.t);
    const velocidad = desplazamiento / dt; // px/ms
    setArrastre(null);
    if (Math.abs(desplazamiento) < 6) {
      // Tap en el asa/cabecera: cicla.
      setEstado((s) => (s === "peek" ? "medium" : s === "medium" ? "expanded" : "medium"));
      return;
    }
    const i = ORDEN.indexOf(estado);
    const rapido = Math.abs(velocidad) > 0.5;
    const umbral = 0.25; // 25 % del tramo al estado vecino
    let siguiente = estado;
    if (desplazamiento > 0 && i < ORDEN.length - 1) {
      const tramo = alturas[ORDEN[i + 1]] - alturas[estado];
      if (rapido || desplazamiento > tramo * umbral) siguiente = ORDEN[i + 1];
    } else if (desplazamiento < 0 && i > 0) {
      const tramo = alturas[estado] - alturas[ORDEN[i - 1]];
      if (rapido || -desplazamiento > tramo * umbral) siguiente = ORDEN[i - 1];
    }
    setEstado(siguiente);
  }

  return (
    <section
      className={styles.sheet}
      style={{ height: alturas.expanded, transform: `translateY(${alturas.expanded - alturaVisible}px)`, transition: arrastre === null ? `transform ${DURACION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)` : "none" }}
      aria-label="Panel"
      data-estado={estado}
    >
      <div
        ref={cabeceraRef}
        className={styles.cabecera}
        onPointerDown={alPointerDown}
        onPointerMove={alPointerMove}
        onPointerUp={alPointerUp}
        onPointerCancel={() => {
          inicioRef.current = null;
          setArrastre(null);
        }}
      >
        <div className={styles.asa} aria-hidden="true" />
        {cabecera}
      </div>
      <div className={styles.cuerpo} style={{ overflowY: estado === "peek" ? "hidden" : "auto" }}>
        {children}
      </div>
    </section>
  );
}
