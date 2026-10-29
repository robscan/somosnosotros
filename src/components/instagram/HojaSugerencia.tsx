"use client";

import { useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import Hoja from "@/components/ui/Hoja";
import hoja from "@/components/ui/Hoja.module.css";
import {
  programarSugerencia,
  type Hecho,
} from "@/app/admin/instagram/accionesSemana";
import type { Sugerencia } from "@/app/admin/instagram/semana";
import { CUENTA_INSTAGRAM } from "@/lib/instagram/texto";
import styles from "./HojaSugerencia.module.css";

const NO_SE_PUDO: Hecho = {
  ok: false,
  mensaje: "No se pudo. Intenta de nuevo en un momento.",
};

/**
 * Un día de esta semana sin publicación (OL-488, bitácora 520; founder: «Debería haber alguna publicación opcional para que la pueda detonar
 * manualmente»): lo que sugiere la regla para ese día (el artista, el lugar, el evento o el carrusel «Esta semana», con material), por qué, y
 * «Publicar ahora» (hoy: sale ya) o «Programar» (sale sola a su hora). Si nadie lo toca, ese día no sale nada.
 */
export default function HojaSugerencia({
  ciudad,
  sugerencia: s,
  onCerrar,
  onCambio,
}: {
  ciudad: string;
  sugerencia: Sugerencia;
  onCerrar: () => void;
  onCambio?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [enviando, enviar] = useTransition();
  const [que, setQue] = useState<"ahora" | "programar" | null>(null);
  const hacer = (ahora: boolean) =>
    enviar(async () => {
      setError(null);
      setQue(ahora ? "ahora" : "programar");
      const r = await programarSugerencia(ciudad, s.fecha, ahora).catch(
        () => NO_SE_PUDO,
      );
      if (!r.ok) {
        setQue(null);
        return setError(r.mensaje);
      }
      onCambio?.();
      onCerrar();
    });
  return (
    <Hoja
      etiqueta={s.cuando}
      titulo={s.cuando}
      onCerrar={() => !enviando && onCerrar()}
      pie={
        <>
          {s.programar && (
            <Boton
              type="button"
              variante={s.ahora ? "secundario" : undefined}
              onClick={() => hacer(false)}
              disabled={enviando}
              aria-busy={(enviando && que === "programar") || undefined}
            >
              {enviando && que === "programar" ? "Programando…" : "Programar"}
            </Boton>
          )}
          {s.ahora && (
            <Boton
              type="button"
              onClick={() => hacer(true)}
              disabled={enviando}
              aria-busy={(enviando && que === "ahora") || undefined}
            >
              {enviando && que === "ahora" ? "Publicando…" : "Publicar ahora"}
            </Boton>
          )}
        </>
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- la portada o el cartel ya guardados, en pequeño */}
      <img
        className={styles.imagen}
        src={s.imagen}
        alt=""
        width={240}
        height={300}
      />
      <p className={styles.nombre}>{s.nombre}</p>
      {s.motivo && <p className={hoja.nota}>{s.motivo}</p>}
      <p className={hoja.nota}>
        {s.programar
          ? `No está programado: con «Programar» sale sola ${s.sale} en @${CUENTA_INSTAGRAM}${s.ahora ? "; con «Publicar ahora», ya" : ""}.`
          : `Su hora (${s.sale}) ya pasó: con «Publicar ahora» sale ya en @${CUENTA_INSTAGRAM}.`}{" "}
        Si no lo tocas, ese día no sale nada. Después se cambia o se quita desde
        su día, como los demás.
      </p>
      {error && (
        <p className="aviso-error" role="alert">
          {error}
        </p>
      )}
    </Hoja>
  );
}
