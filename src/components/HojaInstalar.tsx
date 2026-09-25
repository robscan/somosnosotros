"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import Hoja from "./ui/Hoja";
import { pasosInstalar, type Glifo } from "@/lib/plataforma";
import { usePlataforma } from "@/lib/useAvisosTelefono";
import styles from "./HojaInstalar.module.css";

const trazo = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/** Los iconos como los muestra Safari de iOS 26: tinta, y el botón Agregar en azul. */
const GLIFOS: Record<Glifo, ReactNode> = {
  puntos: <span className={styles.puntos}>···</span>,
  compartir: (
    <svg viewBox="0 0 24 24">
      <path d="M12 3v12M8 7l4-4 4 4" {...trazo} />
      <path d="M6 11v8.5A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5V11" {...trazo} />
    </svg>
  ),
  "ver-mas": (
    <svg viewBox="0 0 24 24">
      <path d="M6 9l6 6 6-6" {...trazo} strokeWidth={2} />
    </svg>
  ),
  "agregar-inicio": (
    <svg viewBox="0 0 24 24">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" {...trazo} />
      <path d="M12 8v8M8 12h8" {...trazo} />
    </svg>
  ),
  agregar: <span className={styles.agregar}>Agregar</span>,
};

/** "Toca ···": los tres puntos en la letra del sistema, como el botón de Safari. */
function conPuntos(texto: string): ReactNode {
  const [antes, despues] = texto.split("···");
  if (despues === undefined) return texto;
  return (
    <>
      {antes}
      <span className={styles.puntosTexto}>···</span>
      {despues}
    </>
  );
}

/**
 * Hoja "Instala Somos Nosotros" para iPhone (decisión 2 de docs/rediseno/17): los pasos del Safari de la persona, uno
 * por renglón con el icono que va a ver, y al pie lo que sigue (tocar Activar al abrirla). En iOS 26 son cinco toques;
 * fuera de Safari (Chrome del iPhone, otra app) se le pide abrirla en Safari. Solo emerge tras un toque.
 */
export default function HojaInstalar({ onCerrar }: { onCerrar: () => void }) {
  const p = usePlataforma();
  const pasos = pasosInstalar(p?.versionSafari ?? null);
  const fueraDeSafari = !!p && p.ios && !p.safari;

  return (
    <Hoja etiqueta="Instala Somos Nosotros" onCerrar={onCerrar}>
      <h3 className={styles.titulo}>Instala Somos Nosotros</h3>
      <p className={styles.sub}>{fueraDeSafari ? "Los avisos del iPhone llegan a la app instalada, y se instala desde Safari: ábrela ahí y sigue estos pasos." : "Los avisos del iPhone llegan a la app instalada."}</p>
      <ol className={styles.pasos}>
        {pasos.map((paso, i) => (
          <li key={paso.glifo} className={styles.paso}>
            <span className={styles.num}>{i + 1}</span>
            <span className={paso.glifo === "agregar" ? styles.glifoSolo : styles.glifo} aria-hidden="true">
              {GLIFOS[paso.glifo]}
            </span>
            <b>{conPuntos(paso.que)}</b>
            <small>{paso.donde}</small>
          </li>
        ))}
      </ol>
      <p className={styles.despues}>
        {/* ?v=2: símbolo SN nuevo (OL-200), mismo nombre de archivo. */}
        <Image src="/apple-touch-icon.png?v=2" alt="" width={44} height={44} className={styles.icono} />
        <span>
          <b>Después</b>, ábrela desde tu inicio y toca Activar.
        </span>
      </p>
    </Hoja>
  );
}
