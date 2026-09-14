"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { resumenAsistentes, type Asistente } from "@/lib/comunidad";
import { cambiarAsistencia, type EstadoAsistencia } from "../acciones";
import styles from "./ficha.module.css";

type Props = { eventoId: string; miEstado: EstadoAsistencia; conSesion: boolean; van: Asistente[]; interesados: number; yo: Asistente | null };

/**
 * "Voy" / "Me interesa" con respuesta instantánea (optimista) y la lista de quiénes van:
 * es la forma de conocer gente. Sin sesión, el botón lleva a entrar y el "Voy" se aplica al volver.
 */
export default function Asistencia({ eventoId, miEstado, conSesion, van, interesados, yo }: Props) {
  const [pendiente, iniciar] = useTransition();
  const [estado, fijarOptimista] = useOptimistic<EstadoAsistencia, EstadoAsistencia>(miEstado, (_actual, nuevo) => nuevo);

  function cambiar(nuevo: EstadoAsistencia) {
    if (!conSesion) return; // los enlaces de abajo llevan a entrar
    iniciar(async () => {
      fijarOptimista(nuevo);
      await cambiarAsistencia(eventoId, nuevo);
    });
  }

  // Lista optimista: si acabo de decir "Voy", me veo en la lista de inmediato.
  const listaVan = (() => {
    const sinMi = van.filter((a) => a.id !== yo?.id);
    return estado === "voy" && yo ? [yo, ...sinMi] : sinMi;
  })();
  const nInteresados = interesados + (estado === "me_interesa" && miEstado !== "me_interesa" ? 1 : 0) - (miEstado === "me_interesa" && estado !== "me_interesa" ? 1 : 0);

  const botones = (
    <div className={styles.asistencia}>
      {conSesion ? (
        <>
          <button type="button" className={`${styles.botonVoy} ${estado === "voy" ? styles.botonVoyActivo : ""}`} onClick={() => cambiar(estado === "voy" ? null : "voy")} disabled={pendiente} aria-pressed={estado === "voy"}>
            {estado === "voy" ? "✓ Voy" : "Voy"}
          </button>
          <button type="button" className={`${styles.botonInteres} ${estado === "me_interesa" ? styles.botonInteresActivo : ""}`} onClick={() => cambiar(estado === "me_interesa" ? null : "me_interesa")} disabled={pendiente} aria-pressed={estado === "me_interesa"}>
            {estado === "me_interesa" ? "✓ Me interesa" : "Me interesa"}
          </button>
        </>
      ) : (
        <>
          <Link href={`/entrar?siguiente=${encodeURIComponent(`/eventos/${eventoId}?accion=voy`)}`} className={styles.botonVoy}>
            Voy
          </Link>
          <Link href={`/entrar?siguiente=${encodeURIComponent(`/eventos/${eventoId}?accion=me_interesa`)}`} className={styles.botonInteres}>
            Me interesa
          </Link>
        </>
      )}
    </div>
  );

  return (
    <section className={styles.quienVa} aria-label="Quién va">
      {botones}
      {listaVan.length > 0 ? (
        <>
          <p className={styles.resumenVan}>{resumenAsistentes(listaVan)}</p>
          <ul className={styles.listaVan}>
            {listaVan.map((a) => (
              <li key={a.id}>
                <Link href={`/personas/${a.id}`} className={styles.persona}>
                  {a.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
                    <img src={a.foto} alt="" className={styles.avatar} />
                  ) : (
                    <span className={styles.avatar}>{(a.nombre || "?").slice(0, 1).toUpperCase()}</span>
                  )}
                  <span>{a.nombre}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className={styles.resumenVan}>Nadie ha dicho que va todavía. {conSesion ? "Sé la primera persona." : "Entra y sé la primera persona."}</p>
      )}
      {nInteresados > 0 && <p className={styles.interesados}>{nInteresados === 1 ? "A 1 persona le interesa." : `A ${nInteresados} personas les interesa.`}</p>}
    </section>
  );
}
