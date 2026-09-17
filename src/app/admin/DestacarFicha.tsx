"use client";

import { useState, useTransition } from "react";
import ficha from "@/components/ui/Ficha.module.css";
import { opcionDestacar, textoHecho, type Decidido, type Destacado, type TipoFicha } from "@/lib/destacados";
import { cambiarDestacado } from "./acciones";
import styles from "./DestacarFicha.module.css";

type Props = { tipo: TipoFicha; id: string; decidido: Decidido; enTira: Destacado | null; zona?: string };

/**
 * «Destacar» o «Quitar de destacados» en los tres puntos de una ficha, solo para la administración (docs/rediseno/20).
 * No pregunta: debajo dice hasta cuándo o por qué (decisiones 7 y 9). Lo hecho queda escrito en su renglón con Deshacer,
 * como la respuesta de «Reportar» en el mismo menú; Deshacer repone lo decidido antes tal cual, con su plazo y su fecha,
 * para que la tira quede como estaba.
 */
export default function DestacarFicha({ tipo, id, decidido, enTira, zona }: Props) {
  const [hecho, setHecho] = useState<{ texto: string; previo: Decidido } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enCamino, iniciar] = useTransition();
  const opcion = opcionDestacar(tipo, decidido, enTira, new Date(), zona);

  function cambiar(nuevo: Decidido, previo: Decidido | null) {
    setError(null);
    iniciar(async () => {
      const r = await cambiarDestacado(tipo, id, nuevo.estado, nuevo.plazo, nuevo.creado);
      if (!r.ok) setError(r.error);
      else setHecho(previo ? { texto: textoHecho(nuevo.estado, tipo, new Date(), zona), previo } : null);
    });
  }

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
        <button type="button" className={`${ficha.menuItem} ${styles.destacar}`} onClick={() => cambiar({ estado: opcion.quitar ? "quitado" : "elegido", plazo: null, creado: null }, decidido)} disabled={enCamino}>
          {opcion.quitar ? "Quitar de destacados" : "Destacar"}
          <small>{opcion.detalle}</small>
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
