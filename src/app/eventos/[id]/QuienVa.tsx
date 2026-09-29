"use client";

import Link from "next/link";
import { useState } from "react";
import { resumenAsistentes, type Asistente } from "@/lib/comunidad";
import { IconoCaret, IconoChevronDerecha } from "@/components/ui/Iconos";
import ficha from "@/components/ui/Ficha.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import styles from "./ficha.module.css";

type Props = { van: Asistente[]; /** Cuántos van en total, también los de perfil reservado (que no traen nombre). */ total: number; interesados: number; conSesion: boolean };

const textoInteresados = (n: number) => (n === 1 ? "A 1 persona le interesa." : `A ${n} personas les interesa.`);

/**
 * Quién va, en el renglón de datos de la ficha (docs/rediseno/50, P6): sus avatares apilados, «Ana, Luis y 10 más» y a cuántas
 * personas más les interesa; tocarlo despliega la lista, y cada persona lleva a su ficha. El número «Van» de arriba baja hasta aquí.
 */
export default function QuienVa({ van, total, interesados, conSesion }: Props) {
  const [abierto, setAbierto] = useState(false);
  const n = Math.max(total, van.length);
  const reservados = n - van.length;
  const resumen = resumenAsistentes(van, 2, n);

  return (
    <section className={ficha.bloque} id="quien-va" aria-label="Quién va">
      <h2>Quién va</h2>
      {n === 0 ? (
        <>
          <p className={ficha.vacio}>Nadie ha dicho que va todavía. {conSesion ? "Sé la primera persona." : "Entra y sé la primera persona."}</p>
          {interesados > 0 && <p className={ficha.vacio}>{textoInteresados(interesados)}</p>}
        </>
      ) : (
        <>
          <button type="button" className={`${renglon.dato} ${styles.resumenVan}`} onClick={() => setAbierto((a) => !a)} aria-expanded={abierto}>
            <span className={styles.pila} aria-hidden="true">
              {van.slice(0, 4).map((a) => (
                <Avatar key={a.id} a={a} />
              ))}
            </span>
            <b>{resumen}</b>
            {interesados > 0 && <small>{textoInteresados(interesados)}</small>}
            <IconoCaret />
          </button>
          {abierto && (
            <ul>
              {van.map((a) => (
                <li key={a.id}>
                  <Link href={`/personas/${a.id}`} className={renglon.dato}>
                    <Avatar a={a} enLista />
                    <b>{a.nombre}</b>
                    <IconoChevronDerecha />
                  </Link>
                </li>
              ))}
              {reservados > 0 && <li className={ficha.vacio}>{reservados === 1 ? "Y 1 persona con perfil reservado." : `Y ${reservados} personas con perfil reservado.`}</li>}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

/** La foto de quien va, o su inicial. En la pila mide lo suyo; en la lista, lo que la foto de un renglón de datos (`ui/Renglon`). */
function Avatar({ a, enLista = false }: { a: Asistente; enLista?: boolean }) {
  return a.foto ? (
    // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
    <img src={a.foto} alt="" className={styles.avatar} />
  ) : (
    <span className={enLista ? `${styles.avatar} ${styles.inicialEnLista}` : styles.avatar}>{(a.nombre || "?").slice(0, 1).toUpperCase()}</span>
  );
}
