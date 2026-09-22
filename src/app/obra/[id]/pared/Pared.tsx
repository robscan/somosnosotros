"use client";

import { useEffect, useRef, useState } from "react";
import CodigoQr from "@/components/ui/CodigoQr";
import { abrirCanalObra } from "@/lib/canal-obra";
import {
  ANCHO_POR_GROSOR_PX,
  diametroDelPuntoDePosicion,
  entradasDesdePresencia,
  esMensajePosicionValido,
  esMensajeTrazoValido,
  EVENTO_POSICION,
  EVENTO_TRAZO,
  latenciasDe,
  OPACIDAD_PUNTO_TENUE,
  puntoEnPared,
  quienesPintan,
  siguientesSegmentos,
  SUAVIZADO_PUNTO_MS,
  type Latencias,
  type MensajePosicion,
  type MensajeTrazo,
  type Punto,
} from "@/lib/pincel";
import { clienteNavegador } from "@/lib/supabase/navegador";
import styles from "./pared.module.css";

/** El punto de referencia de un mando (OL-120): dónde está su pincel, de qué color y tamaño, y si está pintando. */
type PuntoDeMando = { x: number; y: number; color: string; diametro: number; pintando: boolean };

/** Una línea de la sonda (OL-126): qué mensaje, de quién, y sus latencias. */
type LecturaSonda = { evento: string; remitente: string; puntos: number; latencias: Latencias; recibido: number };

/** Un punto de un trazo, coloreado y grosor según el pincel — para no repetir el `switch` en cada segmento. Los
 * anchos por unidad de grosor viven en `ANCHO_POR_GROSOR_PX` (el punto de referencia mide con los mismos). */
function trazarSegmento(ctx: CanvasRenderingContext2D, [desde, hasta]: [Punto, Punto], mensaje: MensajeTrazo) {
  ctx.strokeStyle = mensaje.color;
  ctx.fillStyle = mensaje.color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const grosor = mensaje.grosor; // arrastre en el mando (founder, 2026-09-21): 1 es el trazo de siempre
  if (mensaje.trazo === "aire") {
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = ANCHO_POR_GROSOR_PX.aire * grosor;
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
      ctx.arc(x, y, (ANCHO_POR_GROSOR_PX.spray / 2) * grosor, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (mensaje.trazo === "organico") {
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.ellipse(hasta.x, hasta.y, (ANCHO_POR_GROSOR_PX.organico / 2) * grosor, 5 * grosor, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }
  // "trazo": una línea limpia, el pincel por defecto.
  ctx.lineWidth = ANCHO_POR_GROSOR_PX.trazo * grosor;
  ctx.beginPath();
  ctx.moveTo(desde.x, desde.y);
  ctx.lineTo(hasta.x, hasta.y);
  ctx.stroke();
}

const ms = (v: number | null) => (v === null ? "—" : `${Math.round(v)} ms`);

/**
 * La pared (Fase 2 bloque 3, OL-088): pantalla completa, con sesión (revisión del gestor, 2026-09-21), solo dibuja
 * lo que llega del canal. Cada remitente tiene su propio punto en el lienzo (dónde quedó su pincel, para que su
 * siguiente mensaje siga desde ahí) — así varios pinceles pintan a la vez sin mezclarse. Cupo y fila (doc
 * rediseno/34): la pared también trae su propia cuenta de Presence y descarta cualquier trazo o posición cuyo
 * remitente no esté, en ese momento, entre los primeros `cupo` — el freno no puede depender solo de que el mando se
 * autolimite (un cliente modificado podría seguir mandando trazo estando en la fila). OL-120: por cada mando con
 * cupo, un punto de referencia (tenue sin pintar, pleno pintando) que se va cuando el mando sale. `qr` (OL-118):
 * el SVG hacia el mando, ya dibujado en el servidor; arriba a la derecha (OL-120), lo único que la pared enseña
 * además del título — la pared no lleva controles. `sonda` (OL-126): con `?sonda=1`, la latencia de cada mensaje.
 */
export default function Pared({ obraId, nombre, abierta, cupo, qr, sonda = false }: { obraId: string; nombre: string; abierta: boolean; cupo: number; qr: string | null; sonda?: boolean }) {
  const lienzoRef = useRef<HTMLCanvasElement | null>(null);
  const puntos = useRef<Map<string, Punto>>(new Map());
  const pintanRef = useRef<Set<string>>(new Set());
  // La última posición de cada remitente, esté o no en el cupo todavía: si su «aquí estoy» llega antes que el sync
  // de Presence de esta pared, su punto aparece en cuanto el sync lo confirme, sin esperar a que se mueva.
  const ultimaPosicionRef = useRef<Map<string, MensajePosicion>>(new Map());
  const [puntosDeMando, setPuntosDeMando] = useState<Record<string, PuntoDeMando>>({});
  const [lecturas, setLecturas] = useState<LecturaSonda[]>([]);

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

    function puntoDe(mensaje: MensajePosicion | MensajeTrazo, hasta: Punto, pintando: boolean): PuntoDeMando {
      return { x: hasta.x, y: hasta.y, color: mensaje.color, diametro: diametroDelPuntoDePosicion(mensaje.trazo, mensaje.grosor), pintando };
    }
    // Sonda (OL-126): las últimas 12 lecturas, con la latencia de cada mensaje (marcas del mando + reloj de aquí).
    function anotar(evento: string, mensaje: MensajePosicion | MensajeTrazo, recibido: number, puntosN: number) {
      if (!sonda) return;
      const lectura: LecturaSonda = { evento, remitente: mensaje.remitente.slice(0, 8), puntos: puntosN, latencias: latenciasDe(mensaje, recibido, Date.now()), recibido };
      setLecturas((l) => [...l.slice(-11), lectura]);
    }

    const canal = abrirCanalObra(supabase, obraId);
    canal.on("presence", { event: "sync" }, () => {
      const pintan = quienesPintan(entradasDesdePresencia(canal.presenceState()), cupo);
      pintanRef.current = pintan;
      // Al salir un mando (o quedar fuera del cupo) su punto desaparece; el que entra y ya dijo dónde está, aparece.
      setPuntosDeMando((actuales) => {
        const siguientes: Record<string, PuntoDeMando> = {};
        for (const remitente of pintan) {
          const conocido = actuales[remitente];
          const ultima = ultimaPosicionRef.current.get(remitente);
          if (conocido) siguientes[remitente] = conocido;
          else if (ultima) {
            const hasta = puntoEnPared(ultima.posicion, lienzo.clientWidth, lienzo.clientHeight);
            puntos.current.set(remitente, hasta);
            siguientes[remitente] = puntoDe(ultima, hasta, false);
          }
        }
        return siguientes;
      });
    });
    canal.on("broadcast", { event: EVENTO_TRAZO }, ({ payload }) => {
      const recibido = Date.now();
      if (!esMensajeTrazoValido(payload)) return; // la pared no confía en un payload sin mirarlo
      const mensaje = payload;
      if (!pintanRef.current.has(mensaje.remitente)) return; // en la fila, no pinta — aunque su cliente mande trazo
      // El trazo se dibuja en cuanto llega (OL-126): sin esperar a ninguna transición ni cuadro.
      const { segmentos, hasta } = siguientesSegmentos(puntos.current.get(mensaje.remitente) ?? null, mensaje.puntos, lienzo.clientWidth, lienzo.clientHeight);
      for (const segmento of segmentos) trazarSegmento(ctx, segmento, mensaje);
      anotar("trazo", mensaje, recibido, mensaje.puntos.length);
      if (!hasta) return;
      puntos.current.set(mensaje.remitente, hasta);
      setPuntosDeMando((actuales) => ({ ...actuales, [mensaje.remitente]: puntoDe(mensaje, hasta, true) }));
    });
    canal.on("broadcast", { event: EVENTO_POSICION }, ({ payload }) => {
      const recibido = Date.now();
      if (!esMensajePosicionValido(payload)) return;
      const mensaje = payload;
      ultimaPosicionRef.current.set(mensaje.remitente, mensaje);
      if (!pintanRef.current.has(mensaje.remitente)) return; // quien espera no mueve ningún punto
      const hasta = puntoEnPared(mensaje.posicion, lienzo.clientWidth, lienzo.clientHeight);
      puntos.current.set(mensaje.remitente, hasta); // el trazo que venga arranca donde está el punto tenue
      setPuntosDeMando((actuales) => ({ ...actuales, [mensaje.remitente]: puntoDe(mensaje, hasta, false) }));
      anotar("posicion", mensaje, recibido, 1);
    });
    canal.subscribe();

    return () => {
      window.removeEventListener("resize", ajustarTamano);
      canal.unsubscribe();
    };
  }, [obraId, abierta, cupo, sonda]);

  if (!abierta) {
    return (
      <main className={styles.cerrada}>
        <p>Esta obra ya cerró. El trazo que dejó, quedó.</p>
      </main>
    );
  }

  // Resumen de la sonda: la última lectura y la media de las últimas 12 (solo las que traen marcas).
  const conRed = lecturas.filter((l) => l.latencias.redMs !== null);
  const media = (f: (l: LecturaSonda) => number | null) => {
    const v = conRed.map(f).filter((x): x is number => x !== null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  // «En el último segundo» contado desde la última lectura (no desde el reloj al pintar: el render es puro).
  const ultima = lecturas[lecturas.length - 1];
  const porSegundo = ultima ? lecturas.filter((l) => l.recibido >= ultima.recibido - 1000).length : 0;

  return (
    <main className={styles.pared}>
      <div className={styles.titulo}>
        <p>Obra colectiva</p>
        <h1>{nombre}</h1>
      </div>
      <canvas ref={lienzoRef} className={styles.lienzo} aria-label="Lienzo colectivo, se pinta en vivo" />
      {/* Un punto por mando (OL-120): se mueve solo con `transform`; el lienzo no se toca. Solo el punto tenue se
          suaviza, y poco (SUAVIZADO_PUNTO_MS): el trazo ya está dibujado cuando el punto se desliza (OL-126). */}
      {Object.entries(puntosDeMando).map(([remitente, p]) => (
        <span
          key={remitente}
          className={styles.puntoDeMando}
          data-pintando={p.pintando ? "true" : "false"}
          aria-hidden="true"
          style={{
            width: `${p.diametro}px`,
            height: `${p.diametro}px`,
            background: p.color,
            opacity: p.pintando ? 1 : OPACIDAD_PUNTO_TENUE,
            transform: `translate(${p.x - p.diametro / 2}px, ${p.y - p.diametro / 2}px)`,
            transition: `transform ${SUAVIZADO_PUNTO_MS}ms linear, opacity 0.2s`,
          }}
        />
      ))}
      {qr && (
        <figure className={styles.qr}>
          <CodigoQr svg={qr} alt="Código QR: abre el mando de esta obra" />
          <figcaption>Escanea para pintar</figcaption>
        </figure>
      )}
      {sonda && (
        <pre className={styles.sonda} aria-hidden="true">
          {`sonda · ${lecturas.length ? `${porSegundo} mensajes en el último segundo` : "sin mensajes todavía"}\n` +
            (ultima
              ? `último ${ultima.evento} de ${ultima.remitente} (${ultima.puntos} punto${ultima.puntos === 1 ? "" : "s"}): sensor→envío ${ms(ultima.latencias.agrupacionMs)} · envío→recepción ${ms(ultima.latencias.redMs)} · dibujo ${ms(ultima.latencias.dibujoMs)} · total ${ms(ultima.latencias.totalMs)}\n` +
                `media (${conRed.length}): envío→recepción ${ms(media((l) => l.latencias.redMs))} · total ${ms(media((l) => l.latencias.totalMs))}\n`
              : "") +
            `(envío→recepción usa el reloj de cada aparato: puede traer su desfase)`}
        </pre>
      )}
    </main>
  );
}
