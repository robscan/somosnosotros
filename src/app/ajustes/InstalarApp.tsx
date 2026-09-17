"use client";

import { useState } from "react";
import HojaInstalar from "@/components/HojaInstalar";
import { IconoChevronDerecha, IconoInstalar, IconoInstalarComputadora } from "@/components/ui/Iconos";
import { decidirInstalar, pasosInstalar } from "@/lib/plataforma";
import { useInstalarApp, usePlataforma } from "@/lib/useAvisosTelefono";
import styles from "./ajustes.module.css";

/**
 * "Instalar la app" en Ajustes › Somos Nosotros (decisión 7 de docs/rediseno/17). Solo donde se puede y mientras no esté
 * instalada: en Chrome, Edge o Android abre el diálogo del navegador (un toque); en Safari del iPhone, la hoja con los
 * pasos; dentro de otra app o en Chrome del iPhone, dice dónde abrirla. En los demás casos no aparece.
 */
export default function InstalarApp() {
  const plataforma = usePlataforma();
  const { puede, instalar } = useInstalarApp();
  const [hoja, setHoja] = useState(false);
  const [instalada, setInstalada] = useState(false);
  if (!plataforma || instalada) return null;
  const como = decidirInstalar(plataforma, puede);
  if (como === "ya-instalada" || como === "no") return null;

  const icono = plataforma.computadora ? <IconoInstalarComputadora width={20} height={20} /> : <IconoInstalar width={20} height={20} />;
  if (como === "abrir-en-safari" || como === "abrir-en-navegador") {
    return (
      <li className={`${styles.fila} ${styles.apagada}`}>
        {icono}
        <b>Instalar la app</b>
        <small>Ábrela en {como === "abrir-en-safari" ? "Safari" : "tu navegador"} para instalarla</small>
      </li>
    );
  }
  const detalle = como === "pasos-safari" ? `${pasosInstalar(plataforma.versionSafari).length} toques en Safari` : plataforma.computadora ? "Como app, en su propia ventana" : "Un toque, sin tienda";
  return (
    <li>
      <button
        type="button"
        className={styles.fila}
        onClick={async () => {
          if (como === "pasos-safari") return setHoja(true);
          if (await instalar()) setInstalada(true);
        }}
      >
        {icono}
        <b>Instalar la app</b>
        <small>{detalle}</small>
        <span className={styles.valor}>
          <IconoChevronDerecha />
        </span>
      </button>
      {hoja && <HojaInstalar onCerrar={() => setHoja(false)} />}
    </li>
  );
}
