"use client";

import Link from "next/link";
import { nombreSitio, type EventoResumen } from "@/lib/eventos";
import { formatearCuando, tramo } from "@/lib/fechas";
import styles from "./Agenda.module.css";

type Props = { eventos: EventoResumen[]; conSesion: boolean; hayLugares: boolean };

const TITULOS = { hoy: "Hoy", semana: "Esta semana", proximos: "Próximos" } as const;

/** Agenda del panel: Hoy · Esta semana · Próximos. Lo vacío se dice. */
export default function Agenda({ eventos, conSesion, hayLugares }: Props) {
  const ahora = new Date();
  const grupos = { hoy: [] as EventoResumen[], semana: [] as EventoResumen[], proximos: [] as EventoResumen[] };
  for (const e of eventos) {
    const t = tramo(e.inicio, ahora);
    if (t !== "pasado") grupos[t].push(e);
  }
  const hrefNuevo = conSesion ? "/eventos/nuevo" : "/entrar?siguiente=/eventos/nuevo";
  const total = grupos.hoy.length + grupos.semana.length + grupos.proximos.length;

  return (
    <div>
      <Link href={hayLugares ? hrefNuevo : "/lugares/nuevo"} className={styles.nuevo}>
        + Publicar un evento
      </Link>
      {total === 0 ? (
        <p className={styles.vacio}>Aún no hay eventos próximos. Si sabes de uno, publícalo.</p>
      ) : (
        (["hoy", "semana", "proximos"] as const).map((clave) =>
          grupos[clave].length === 0 ? null : (
            <section key={clave} className={styles.grupo} aria-label={TITULOS[clave]}>
              <h2 className={styles.tituloGrupo}>{TITULOS[clave]}</h2>
              <ul className={styles.lista}>
                {grupos[clave].map((e) => (
                  <li key={e.id}>
                    <Link href={`/eventos/${e.id}`} className={styles.tarjeta}>
                      <div className={styles.miniatura} aria-hidden="true">
                        {e.imagen || e.lugar?.portada ? (
                          // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
                          <img src={(e.imagen ?? e.lugar?.portada) as string} alt="" />
                        ) : (
                          <span>{e.titulo.slice(0, 1).toUpperCase()}</span>
                        )}
                      </div>
                      <div className={styles.texto}>
                        <span className={styles.cuando}>{formatearCuando(e.inicio, e.fin, ahora)}</span>
                        <strong className={styles.titulo}>{e.titulo}</strong>
                        <span className={styles.detalle}>
                          {nombreSitio(e)}
                          {e.precio ? ` · ${e.precio}` : " · Gratis"}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ),
        )
      )}
    </div>
  );
}
