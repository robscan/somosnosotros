"use client";

import { useState } from "react";
import { etiquetaEnlace, LIMITE_ENLACES, reconocerEnlace, type Enlace } from "@/lib/enlaces";
import IconoRed from "./ui/IconoRed";
import { IconoCerrar } from "./ui/Iconos";
import Limpiar from "@/components/ui/Limpiar";
import limpiar from "@/components/ui/Limpiar.module.css";
import styles from "./SelectorEnlaces.module.css";

type Props = { inicial: Enlace[]; error?: string };

/**
 * Enlaces y redes sin elegir la red (docs/rediseno/09-enlaces-flujo-y-estados.md): la persona pega un
 * enlace, un @usuario o un teléfono; el sistema reconoce de qué red es y lo enseña con su icono.
 * Tantos como haga falta; se quitan con ✕. Viaja al servidor como JSON en un campo oculto.
 */
export default function SelectorEnlaces({ inicial, error }: Props) {
  const [enlaces, setEnlaces] = useState<Enlace[]>(inicial);
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const lleno = enlaces.length >= LIMITE_ENLACES;

  function agregar() {
    const e = reconocerEnlace(texto);
    if (!e) {
      setAviso(texto.trim() ? "No parece un enlace, un @usuario ni un teléfono." : null);
      return;
    }
    if (enlaces.some((x) => x.url === e.url)) {
      setAviso("Ese ya está.");
      return;
    }
    setEnlaces([...enlaces, e]);
    setTexto("");
    setAviso(null);
  }
  function quitar(e: Enlace) {
    setEnlaces(enlaces.filter((x) => x !== e));
  }

  return (
    <div className={styles.selector}>
      {enlaces.length > 0 && (
        <p className={styles.etiqueta}>Redes y contacto</p>
      )}
      {enlaces.length > 0 && (
        <ul className={styles.lista} aria-label="Enlaces">
          {enlaces.map((e) => (
            <li key={e.url} className={styles.enlace}>
              <IconoRed red={e.red} />
              <span className={styles.texto}>
                <b>{etiquetaEnlace(e)}</b>
                <small>{e.url.replace(/^https?:\/\/(www\.)?/, "")}</small>
              </span>
              <button type="button" className={styles.quitar} onClick={() => quitar(e)} aria-label={`Quitar ${etiquetaEnlace(e)}`}>
                <IconoCerrar width={18} height={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {!lleno && (
        <>
          <label htmlFor="campo-enlace" className={styles.etiqueta}>
            {enlaces.length ? "Otro enlace" : "Redes y contacto (opcional)"}
          </label>
          <div className={styles.fila}>
            <span className={limpiar.caja}>
              <input
                id="campo-enlace"
                type="text"
                className={styles.campo}
                value={texto}
                onChange={(e) => {
                  setTexto(e.target.value);
                  setAviso(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregar();
                  }
                }}
                onBlur={() => texto.trim() && agregar()}
                placeholder="Ej. instagram.com/losvecinos, @losvecinos, vimeo.com/…"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                aria-describedby={aviso || error ? "campo-enlace-aviso" : undefined}
                aria-invalid={!!aviso || !!error}
              />
              <Limpiar visible={!!texto} />
            </span>
            <button type="button" className={styles.agregar} onClick={agregar} disabled={!texto.trim()}>
              Añadir
            </button>
          </div>
          {(aviso || error) && (
            <p id="campo-enlace-aviso" className={styles.aviso} role="alert">
              {aviso ?? error}
            </p>
          )}
          {!aviso && !error && enlaces.length === 0 && <p className={styles.ayuda}>Pégalo y reconocemos la red: Instagram, YouTube, Vimeo, Spotify, SoundCloud, WhatsApp, tu sitio…</p>}
        </>
      )}
      <input type="hidden" name="enlaces" value={JSON.stringify(enlaces)} />
    </div>
  );
}
