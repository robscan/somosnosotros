"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "./EntradaFicha.module.css";

/**
 * La ficha (lugar, artista) entra deslizándose desde la derecha en 220 ms al abrirse desde un listado
 * (docs/rediseno/38-transiciones-cargador.md, OL-144/148). Solo `transform`; con "reducir movimiento" no hay
 * transición (la regla global de `globals.css` ya la apaga, y aquí también por si acaso).
 *
 * Arranca cerrada (fuera de pantalla, a la derecha) y pasa a abierta en el primer fotograma tras montarse: así el
 * navegador anima el cambio de estado en vez de pintar ya en su lugar final, igual que el prototipo firmado
 * (`docs/rediseno/prototipos/transiciones.html`, clase `.abierta`). Al volver (Atrás), Safari y Next navegan por su
 * cuenta al listado ya en memoria (memoria de pantalla): esta ficha simplemente deja de existir, sin cargador.
 */
export default function EntradaFicha({ children }: { children: ReactNode }) {
  const [abierta, setAbierta] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAbierta(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return <div className={`${styles.ficha} ${abierta ? styles.abierta : ""}`}>{children}</div>;
}
