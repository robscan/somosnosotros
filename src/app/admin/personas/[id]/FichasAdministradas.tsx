"use client";

import { useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import Hoja from "@/components/ui/Hoja";
import { IconoChevronDerecha, IconoMas, IconoOk } from "@/components/ui/Iconos";
import Renglon from "@/components/ui/Renglon";
import renglon from "@/components/ui/Renglon.module.css";
import { hrefFicha, lineaQueEs, nombrePersona, type FichaAdministrada } from "@/lib/asignarFichas";
import { quitarFicha } from "./acciones";
import HojaAsignar from "./HojaAsignar";
import IconoFicha from "./IconoFicha";
import styles from "../../admin.module.css";
import css from "./asignar.module.css";

/**
 * «Fichas que administra» (OL-447): los lugares y artistas que la persona lleva (por un reclamo aprobado o asignados aquí), cada uno con el
 * renglón de lista de la app y «Quitar», y al final un solo renglón, «Asignar una ficha», que abre la hoja de buscar. Quitar pasa por una hoja
 * que dice qué deja de poder hacer, con un solo botón. Hecho, una línea lo confirma y la lista llega de nuevo del servidor.
 */
export default function FichasAdministradas({ perfilId, nombre, fichas }: { perfilId: string; nombre: string; fichas: FichaAdministrada[] | null }) {
  const [asignando, setAsignando] = useState(false);
  const [quitando, setQuitando] = useState<FichaAdministrada | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enCamino, iniciar] = useTransition();
  const quien = nombrePersona(nombre);

  function confirmarQuitar(f: FichaAdministrada) {
    setError(null);
    iniciar(async () => {
      const r = await quitarFicha(perfilId, f.tipo, f.id);
      if (!r.ok) return setError(r.error);
      setQuitando(null);
      setHecho(`${quien} ya no administra ${f.nombre}`);
    });
  }

  return (
    <>
      <h2 className={styles.grupo}>Fichas que administra</h2>
      {hecho && (
        <p className={styles.hecho} role="status">
          <IconoOk width={20} height={20} />
          <span>{hecho}</span>
        </p>
      )}
      {fichas === null ? (
        <p className={styles.vacio}>No pudimos leer sus fichas. Recarga la página.</p>
      ) : (
        fichas.length > 0 && (
          <ul className={styles.publicado} aria-label="Fichas que administra">
            {fichas.map((f) => (
              <Renglon
                key={`${f.tipo}-${f.id}`}
                href={hrefFicha(f)}
                foto={f.foto}
                redonda={f.tipo === "artista"}
                titulo={f.nombre}
                accion={
                  <button
                    type="button"
                    className={`${styles.pildora} ${styles.quitar} ${css.quitar}`}
                    onClick={() => {
                      setError(null);
                      setQuitando(f);
                    }}
                    aria-haspopup="dialog"
                    aria-label={`Quitar ${f.nombre}`}
                  >
                    Quitar
                  </button>
                }
              >
                <span>
                  <IconoFicha f={f} />
                  <span>{lineaQueEs(f)}</span>
                </span>
              </Renglon>
            ))}
          </ul>
        )
      )}
      <ul className={`${renglon.tarjeta} ${css.asignar}`}>
        <li>
          <button
            type="button"
            className={renglon.ajuste}
            onClick={() => {
              setHecho(null);
              setAsignando(true);
            }}
            aria-haspopup="dialog"
          >
            <IconoMas width={20} height={20} />
            <b>Asignar una ficha</b>
            <small>{fichas?.length ? "Otro lugar o artista para que lo administre" : "Un lugar o un artista para que lo administre"}</small>
            <IconoChevronDerecha />
          </button>
        </li>
      </ul>
      {asignando && (
        <HojaAsignar
          perfilId={perfilId}
          persona={quien}
          onCerrar={() => setAsignando(false)}
          onAsignada={(ficha) => {
            setAsignando(false);
            setHecho(`${quien} ya administra ${ficha}`);
          }}
        />
      )}
      {quitando && (
        <Hoja etiqueta="Quitar la ficha" onCerrar={() => setQuitando(null)}>
          <h3>
            ¿Quitar {quitando.nombre} a {quien}?
          </h3>
          <p>Deja de poder editarla. La ficha y lo que publicó se quedan como están.</p>
          {error && (
            <p className="aviso-error" role="alert">
              {error}
            </p>
          )}
          <Boton type="button" variante="peligro" disabled={enCamino} aria-busy={enCamino} onClick={() => confirmarQuitar(quitando)}>
            {enCamino ? "Quitando…" : "Quitar la ficha"}
          </Boton>
        </Hoja>
      )}
    </>
  );
}
