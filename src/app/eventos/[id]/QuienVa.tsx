"use client";

import Link from "next/link";
import { useState } from "react";
import { primerNombre, type Asistente } from "@/lib/comunidad";
import { IconoCaret } from "@/components/ui/Iconos";
import styles from "./ficha.module.css";

type Props = { van: Asistente[]; interesados: number; conSesion: boolean };

/** Quién va, compacto: avatares apilados y "Van 12: Ana, Luis y 10 más"; tocar despliega la lista. */
export default function QuienVa({ van, interesados, conSesion }: Props) {
  const [abierto, setAbierto] = useState(false);
  const n = van.length;
  const nombres = van.map((a) => primerNombre(a.nombre)).filter(Boolean);
  const primeros = nombres.slice(0, 2).join(", ");
  const resto = n - Math.min(2, n);
  const resumen = n === 0 ? "" : n === 1 ? `Va ${primeros}` : `Van ${n}: ${primeros}${resto > 0 ? ` y ${resto} más` : ""}`;

  return (
    <section className={styles.quienVa} id="quien-va" aria-label="Quién va">
      <h2>Quién va</h2>
      {n === 0 ? (
        <p className={styles.nadie}>Nadie ha dicho que va todavía. {conSesion ? "Sé la primera persona." : "Entra y sé la primera persona."}</p>
      ) : (
        <>
          <button type="button" className={styles.resumenVan} onClick={() => setAbierto((a) => !a)} aria-expanded={abierto}>
            <span className={styles.pila} aria-hidden="true">
              {van.slice(0, 4).map((a) => (
                <Avatar key={a.id} a={a} />
              ))}
            </span>
            <span>{resumen}</span>
            <IconoCaret width={18} height={18} />
          </button>
          {abierto && (
            <ul className={styles.listaVan}>
              {van.map((a) => (
                <li key={a.id}>
                  <Link href={`/personas/${a.id}`} className={styles.persona}>
                    <Avatar a={a} />
                    <span>{a.nombre}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {interesados > 0 && <p className={styles.interesados}>{interesados === 1 ? "A 1 persona le interesa." : `A ${interesados} personas les interesa.`}</p>}
    </section>
  );
}

function Avatar({ a }: { a: Asistente }) {
  return a.foto ? (
    // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
    <img src={a.foto} alt="" className={styles.avatar} />
  ) : (
    <span className={styles.avatar}>{(a.nombre || "?").slice(0, 1).toUpperCase()}</span>
  );
}
