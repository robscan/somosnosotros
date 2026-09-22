"use client";

import { useEffect, useRef, useState } from "react";
import { abrirCanalObra } from "@/lib/canal-obra";
import { deltaDesdeOrientacion, EVENTO_TRAZO, MENSAJES_POR_SEGUNDO, TINTAS, TRAZOS, type Delta, type MensajeTrazo, type Orientacion, type Trazo } from "@/lib/pincel";
import { clienteNavegador } from "@/lib/supabase/navegador";
import styles from "./mando.module.css";

type PermisoOrientacion = "sin-pedir" | "concedido" | "negado" | "sin-soporte";

/** ¿Este navegador exige pedir permiso para leer el sensor (Safari de iOS 13+)? Chrome/Android no lo pide. */
function requestPermissionDeOrientacion(): (() => Promise<"granted" | "denied">) | null {
  const ctor = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<"granted" | "denied"> };
  return typeof ctor?.requestPermission === "function" ? ctor.requestPermission.bind(ctor) : null;
}

/**
 * El mando (Fase 2 bloque 3, OL-088): ruta neutra `/obra/[id]/mando` (doc rediseno/25 ajuste 2). El celular es
 * solo mando (prototipo firmado OL-084): no dibuja nada, manda deltas del sensor mientras el botón está
 * presionado. Sin cupo ni fila todavía (doc rediseno/34, espera firma) — cualquiera con sesión pinta.
 */
export default function Mando({ obraId, perfilId }: { obraId: string; perfilId: string }) {
  const [trazo, setTrazo] = useState<Trazo>(TRAZOS[0].id);
  const [color, setColor] = useState(TINTAS[0].valor);
  const [presionado, setPresionado] = useState(false);
  const [permiso, setPermiso] = useState<PermisoOrientacion>("sin-pedir");

  const canalRef = useRef<ReturnType<typeof abrirCanalObra> | null>(null);
  const bufferRef = useRef<Delta[]>([]);
  const ultimaLecturaRef = useRef<Orientacion | null>(null);
  const trazoRef = useRef(trazo);
  const colorRef = useRef(color);
  useEffect(() => {
    trazoRef.current = trazo;
  }, [trazo]);
  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  // El canal se abre una vez, al montar — mandar no depende de tener el botón presionado en ese instante.
  useEffect(() => {
    const supabase = clienteNavegador();
    if (!supabase) return;
    const canal = abrirCanalObra(supabase, obraId);
    canal.subscribe();
    canalRef.current = canal;
    return () => {
      canal.unsubscribe();
      canalRef.current = null;
    };
  }, [obraId]);

  // Mientras está presionado: escucha el sensor (juntando deltas) y manda MENSAJES_POR_SEGUNDO veces por segundo.
  useEffect(() => {
    if (!presionado) return;

    function alMoverse(e: DeviceOrientationEvent) {
      const actual: Orientacion = { beta: e.beta, gamma: e.gamma };
      const delta = deltaDesdeOrientacion(ultimaLecturaRef.current, actual);
      ultimaLecturaRef.current = actual;
      if (delta.dx === 0 && delta.dy === 0) return;
      bufferRef.current.push(delta);
    }
    window.addEventListener("deviceorientation", alMoverse);

    const intervalo = setInterval(() => {
      const deltas = bufferRef.current.splice(0, 20); // DELTAS_MAX_POR_MENSAJE
      if (deltas.length === 0 || !canalRef.current) return;
      const mensaje: MensajeTrazo = { trazo: trazoRef.current, color: colorRef.current, deltas, remitente: perfilId };
      canalRef.current.send({ type: "broadcast", event: EVENTO_TRAZO, payload: mensaje });
    }, Math.round(1000 / MENSAJES_POR_SEGUNDO));

    return () => {
      window.removeEventListener("deviceorientation", alMoverse);
      clearInterval(intervalo);
      bufferRef.current = [];
      ultimaLecturaRef.current = null;
    };
  }, [presionado, perfilId]);

  async function empezarAPintar() {
    if (permiso === "sin-pedir") {
      const pedir = requestPermissionDeOrientacion();
      if (pedir) {
        try {
          const resultado = await pedir();
          setPermiso(resultado === "granted" ? "concedido" : "negado");
          if (resultado !== "granted") return;
        } catch {
          setPermiso("sin-soporte");
          return;
        }
      } else if (typeof window.DeviceOrientationEvent === "undefined") {
        setPermiso("sin-soporte");
        return;
      } else {
        setPermiso("concedido"); // Android y navegadores que no exigen el permiso explícito
      }
    } else if (permiso !== "concedido") {
      return;
    }
    setPresionado(true);
  }

  return (
    <div className={styles.mando}>
      <div className={styles.centro}>
        <button
          type="button"
          className={styles.orb}
          aria-pressed={presionado}
          onPointerDown={empezarAPintar}
          onPointerUp={() => setPresionado(false)}
          onPointerLeave={() => setPresionado(false)}
        >
          ●
        </button>
        {permiso === "negado" || permiso === "sin-soporte" ? (
          <p className={styles.aviso} role="alert">
            {permiso === "negado" ? "Sin permiso del sensor, no se puede pintar. Actívalo en Ajustes y vuelve a intentar." : "Este navegador no tiene sensor de movimiento."}
          </p>
        ) : (
          <p className={styles.ayuda}>{presionado ? "Pintando en la pared" : "Mantén presionado y mueve tu celular"}</p>
        )}
      </div>
      <div className={styles.herramientas}>
        <div className={styles.picker} role="group" aria-label="Trazo">
          {TRAZOS.map((t) => (
            <button key={t.id} type="button" aria-pressed={t.id === trazo} onClick={() => setTrazo(t.id)}>
              {t.etiqueta}
            </button>
          ))}
        </div>
        <div className={styles.picker} role="group" aria-label="Tinta">
          {TINTAS.map((t) => (
            <button key={t.valor} type="button" aria-pressed={t.valor === color} onClick={() => setColor(t.valor)}>
              <span className={styles.muestraTinta} style={{ background: t.valor }} aria-hidden="true" />
              {t.etiqueta}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
