"use client";

import { useState, useTransition } from "react";
import ficha from "@/components/ui/Ficha.module.css";
import { textoDestacar, textoHecho, textoMotivo, type Destacado, type EstadoDestacado, type TipoFicha } from "@/lib/destacados";
import { cambiarDestacado } from "./acciones";
import styles from "./DestacarFicha.module.css";

type Props = { tipo: TipoFicha; id: string; destacado: Destacado | null; quitado: boolean };

/**
 * «Destacar» o «Quitar de destacados» en los tres puntos de una ficha, solo para la administración (docs/rediseno/20).
 * No pregunta: debajo dice hasta cuándo o por qué (decisiones 7 y 9). Lo hecho queda escrito en su renglón con Deshacer,
 * como la respuesta de «Reportar» en el mismo menú.
 */
export default function DestacarFicha({ tipo, id, destacado, quitado }: Props) {
  const [hecho, setHecho] = useState<{ texto: string; previo: EstadoDestacado } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enCamino, iniciar] = useTransition();

  function cambiar(estado: EstadoDestacado, previo: EstadoDestacado | null) {
    setError(null);
    iniciar(async () => {
      const r = await cambiarDestacado(tipo, id, estado);
      if (!r.ok) setError(r.error);
      else setHecho(previo ? { texto: textoHecho(estado, tipo), previo } : null);
    });
  }

  const actual: EstadoDestacado = destacado?.motivo === "elegido" ? "elegido" : quitado ? "quitado" : "ninguno";
  return (
    <li>
      {hecho ? (
        <p className={`${ficha.menuItem} ${styles.hecho}`} role="status">
          {hecho.texto}
          <button type="button" onClick={() => cambiar(hecho.previo, null)} disabled={enCamino}>
            Deshacer
          </button>
        </p>
      ) : (
        <button type="button" className={`${ficha.menuItem} ${styles.destacar}`} onClick={() => cambiar(destacado ? "quitado" : "elegido", actual)} disabled={enCamino}>
          {destacado ? "Quitar de destacados" : "Destacar"}
          <small>{destacado ? textoMotivo(destacado, tipo) : textoDestacar(tipo)}</small>
        </button>
      )}
      {error && (
        <p className="aviso-error" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}
