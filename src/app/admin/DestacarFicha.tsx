"use client";

import { useState, useTransition } from "react";
import ficha from "@/components/ui/Ficha.module.css";
import { opcionDestacar, textoHecho, type Destacado, type EstadoDestacado, type TipoFicha } from "@/lib/destacados";
import { cambiarDestacado } from "./acciones";
import styles from "./DestacarFicha.module.css";

type Previo = { estado: EstadoDestacado; plazo: string | null };
type Props = Previo & { tipo: TipoFicha; id: string; enTira: Destacado | null; zona?: string };

/**
 * «Destacar» o «Quitar de destacados» en los tres puntos de una ficha, solo para la administración (docs/rediseno/20).
 * No pregunta: debajo dice hasta cuándo o por qué (decisiones 7 y 9). Lo hecho queda escrito en su renglón con Deshacer,
 * como la respuesta de «Reportar» en el mismo menú; Deshacer vuelve a lo decidido antes, con su plazo.
 */
export default function DestacarFicha({ tipo, id, estado, plazo, enTira, zona }: Props) {
  const [hecho, setHecho] = useState<{ texto: string; previo: Previo } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enCamino, iniciar] = useTransition();
  const opcion = opcionDestacar(tipo, estado, plazo, enTira, new Date(), zona);

  function cambiar(nuevo: EstadoDestacado, plazoNuevo: string | null, previo: Previo | null) {
    setError(null);
    iniciar(async () => {
      const r = await cambiarDestacado(tipo, id, nuevo, plazoNuevo);
      if (!r.ok) setError(r.error);
      else setHecho(previo ? { texto: textoHecho(nuevo, tipo, new Date(), zona), previo } : null);
    });
  }

  return (
    <li>
      {hecho ? (
        <p className={`${ficha.menuItem} ${styles.hecho}`} role="status">
          {hecho.texto}
          <button type="button" onClick={() => cambiar(hecho.previo.estado, hecho.previo.plazo, null)} disabled={enCamino}>
            Deshacer
          </button>
        </p>
      ) : (
        <button type="button" className={`${ficha.menuItem} ${styles.destacar}`} onClick={() => cambiar(opcion.quitar ? "quitado" : "elegido", null, { estado, plazo })} disabled={enCamino}>
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
