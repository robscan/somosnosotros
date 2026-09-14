"use client";

import { useState } from "react";
import styles from "./ficha.module.css";

/** Descripción en cuatro líneas y "más" que la despliega en el sitio. */
export default function Desplegable({ texto }: { texto: string }) {
  const [abierto, setAbierto] = useState(false);
  const larga = texto.length > 220 || texto.split("\n").length > 4;
  return (
    <>
      <p className={`${styles.descripcion} ${abierto || !larga ? styles.descripcionAbierta : ""}`}>{texto}</p>
      {larga && (
        <button type="button" className={styles.mas} onClick={() => setAbierto((a) => !a)} aria-expanded={abierto}>
          {abierto ? "menos" : "más"}
        </button>
      )}
    </>
  );
}
