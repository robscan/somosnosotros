"use client";

import { useEffect, useRef } from "react";
import { abrirCanalObra } from "@/lib/canal-obra";
import {
  entradasDesdePresencia,
  esMensajeTrazoValido,
  EVENTO_TRAZO,
  puntoInicial,
  quienesPintan,
  siguientesSegmentos,
  type MensajeTrazo,
  type Punto,
} from "@/lib/pincel";
import { clienteNavegador } from "@/lib/supabase/navegador";
import styles from "./pared.module.css";

/** Un punto de un trazo, coloreado y grosor según el pincel — para no repetir el `switch` en cada segmento. */
function trazarSegmento(ctx: CanvasRenderingContext2D, [desde, hasta]: [Punto, Punto], mensaje: MensajeTrazo) {
  ctx.strokeStyle = mensaje.color;
  ctx.fillStyle = mensaje.color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (mensaje.trazo === "aire") {
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(desde.x, desde.y);
    ctx.lineTo(hasta.x, hasta.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }
  if (mensaje.trazo === "spray") {
    const gotas = 6;
    for (let i = 0; i < gotas; i++) {
      const t = Math.random();
      const x = desde.x + (hasta.x - desde.x) * t + (Math.random() - 0.5) * 14;
      const y = desde.y + (hasta.y - desde.y) * t + (Math.random() - 0.5) * 14;
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (mensaje.trazo === "organico") {
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.ellipse(hasta.x, hasta.y, 9, 5, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }
  // "trazo": una línea limpia, el pincel por defecto.
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(desde.x, desde.y);
  ctx.lineTo(hasta.x, hasta.y);
  ctx.stroke();
}

/**
 * La pared (Fase 2 bloque 3, OL-088): pantalla completa, con sesión (revisión del gestor, 2026-09-21), solo dibuja
 * lo que llega del canal. Cada remitente tiene su propio punto en el lienzo (`puntoInicial`, estable, para que su
 * segundo mensaje siga desde donde se quedó su primero, no desde otro lado) — así varios pinceles pintan a la vez
 * sin mezclarse. Cupo y fila (doc rediseno/34): la pared también trae su propia cuenta de Presence y descarta
 * cualquier trazo cuyo remitente no esté, en ese momento, entre los primeros `cupo` — el freno no puede depender
 * solo de que el mando se autolimite (un cliente modificado podría seguir mandando trazo estando en la fila).
 */
export default function Pared({ obraId, nombre, abierta, cupo }: { obraId: string; nombre: string; abierta: boolean; cupo: number }) {
  const lienzoRef = useRef<HTMLCanvasElement | null>(null);
  const puntos = useRef<Map<string, Punto>>(new Map());
  const pintanRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!abierta) return;
    const supabase = clienteNavegador();
    if (!supabase) return;
    const lienzo = lienzoRef.current;
    if (!lienzo) return;
    const ctx = lienzo.getContext("2d");
    if (!ctx) return;

    function ajustarTamano() {
      if (!lienzo) return;
      const proporcion = window.devicePixelRatio || 1;
      lienzo.width = lienzo.clientWidth * proporcion;
      lienzo.height = lienzo.clientHeight * proporcion;
      ctx?.scale(proporcion, proporcion);
    }
    ajustarTamano();
    window.addEventListener("resize", ajustarTamano);

    const canal = abrirCanalObra(supabase, obraId);
    canal.on("presence", { event: "sync" }, () => {
      pintanRef.current = quienesPintan(entradasDesdePresencia(canal.presenceState()), cupo);
    });
    canal.on("broadcast", { event: EVENTO_TRAZO }, ({ payload }) => {
      if (!esMensajeTrazoValido(payload)) return; // la pared no confía en un payload sin mirarlo
      const mensaje = payload;
      if (!pintanRef.current.has(mensaje.remitente)) return; // en la fila, no pinta — aunque su cliente mande trazo
      const ancho = lienzo.clientWidth;
      const alto = lienzo.clientHeight;
      const desde = puntos.current.get(mensaje.remitente) ?? puntoInicial(mensaje.remitente, ancho, alto);
      const { segmentos, hasta } = siguientesSegmentos(desde, mensaje.deltas, ancho, alto);
      for (const segmento of segmentos) trazarSegmento(ctx, segmento, mensaje);
      puntos.current.set(mensaje.remitente, hasta);
    });
    canal.subscribe();

    return () => {
      window.removeEventListener("resize", ajustarTamano);
      canal.unsubscribe();
    };
  }, [obraId, abierta, cupo]);

  if (!abierta) {
    return (
      <main className={styles.cerrada}>
        <p>Esta obra ya cerró. El trazo que dejó, quedó.</p>
      </main>
    );
  }

  return (
    <main className={styles.pared}>
      <div className={styles.titulo}>
        <p>Obra colectiva</p>
        <h1>{nombre}</h1>
      </div>
      <canvas ref={lienzoRef} className={styles.lienzo} aria-label="Lienzo colectivo, se pinta en vivo" />
    </main>
  );
}
