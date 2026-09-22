"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { abrirCanalObra } from "@/lib/canal-obra";
import {
  deltaDesdeOrientacion,
  entradasDesdePresencia,
  estadoDeFila,
  EVENTO_TRAZO,
  MENSAJES_POR_SEGUNDO,
  TINTAS,
  TRAZOS,
  type Delta,
  type EntradaPresencia,
  type MensajeTrazo,
  type Orientacion,
  type Trazo,
} from "@/lib/pincel";
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
 * presionado. Cupo y fila (doc rediseno/34, firmado 2026-09-21): quien llega después de que se llenó el cupo se
 * conecta igual (ve cuántos esperan, guarda su lugar por Presence) pero no pinta hasta que le toque.
 */
export default function Mando({ obraId, perfilId, cupo }: { obraId: string; perfilId: string; cupo: number }) {
  const [trazo, setTrazo] = useState<Trazo>(TRAZOS[0].id);
  const [color, setColor] = useState(TINTAS[0].valor);
  const [presionado, setPresionado] = useState(false);
  const [permiso, setPermiso] = useState<PermisoOrientacion>("sin-pedir");
  const [entradas, setEntradas] = useState<EntradaPresencia[]>([]);
  const [banner, setBanner] = useState(false);

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

  const estado = useMemo(() => estadoDeFila(entradas, cupo, perfilId), [entradas, cupo, perfilId]);

  // El canal se abre una vez, al montar — mandar no depende de tener el botón presionado en ese instante.
  // `track()` solo al confirmarse la suscripción (con "llegada" = ahora, la fila la ordena Presence).
  useEffect(() => {
    const supabase = clienteNavegador();
    if (!supabase) return;
    const canal = abrirCanalObra(supabase, obraId);
    canal.on("presence", { event: "sync" }, () => {
      setEntradas(entradasDesdePresencia(canal.presenceState()));
    });
    canal.subscribe((estadoCanal) => {
      if (estadoCanal === "SUBSCRIBED") canal.track({ remitente: perfilId, llegada: Date.now() });
    });
    canalRef.current = canal;
    return () => {
      canal.unsubscribe();
      canalRef.current = null;
    };
  }, [obraId, perfilId]);

  // «Te toca» (recorte del founder, doc rediseno/34: sin turno con tiempo máximo): un aviso que se va solo a los
  // pocos segundos, y el mando queda activo de inmediato — no hace falta un toque extra para empezar a pintar.
  const yaEsperabaRef = useRef(false);
  useEffect(() => {
    if (estado.tipo === "esperando") {
      yaEsperabaRef.current = true;
      return;
    }
    if (estado.tipo === "pintando" && yaEsperabaRef.current) {
      yaEsperabaRef.current = false;
      setBanner(true);
      const id = setTimeout(() => setBanner(false), 4000);
      return () => clearTimeout(id);
    }
  }, [estado.tipo]);

  // Mientras está presionado y con cupo para pintar: escucha el sensor (juntando deltas) y manda
  // MENSAJES_POR_SEGUNDO veces por segundo. Si el cupo baja a media pulsación (o el sync de Presence llega
  // tarde), este efecto se desmonta solo — la pared, de todos modos, ya descarta el trazo de quien no pinta.
  useEffect(() => {
    if (!presionado || estado.tipo !== "pintando") return;

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
  }, [presionado, perfilId, estado.tipo]);

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

  const esperando = estado.tipo === "esperando";

  return (
    <div className={styles.mando}>
      {banner && (
        <div className={styles.bannerTurno} role="status">
          <svg viewBox="0 0 24 24" aria-hidden="true" width="24" height="24">
            <path d="M5 13l4 4 10-10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <b>Te toca pintar</b>
            <span>Tu turno empezó</span>
          </div>
        </div>
      )}
      {estado.tipo !== "fuera" && <p className={styles.presente}>{esperando ? `${cupo} pintando` : `${entradas.length} personas aquí`}</p>}
      {esperando ? (
        <div className={styles.centro}>
          <span className={styles.esperaIcono} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="36" height="36">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <p className={styles.lugar}>
            Vas el<b>{estado.lugar}</b>
          </p>
          <p className={styles.explicaEspera}>Pintas en cuanto alguien salga. No pierdes tu lugar por esperar.</p>
          <span className={styles.conteoEsperando}>{estado.esperando} esperando</span>
        </div>
      ) : (
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
      )}
      <div className={styles.herramientas}>
        <div className={`${styles.picker} ${esperando ? styles.apagado : ""}`} role="group" aria-label="Trazo">
          {TRAZOS.map((t) => (
            <button key={t.id} type="button" aria-pressed={t.id === trazo} disabled={esperando} onClick={() => setTrazo(t.id)}>
              {t.etiqueta}
            </button>
          ))}
        </div>
        <div className={`${styles.picker} ${esperando ? styles.apagado : ""}`} role="group" aria-label="Tinta">
          {TINTAS.map((t) => (
            <button key={t.valor} type="button" aria-pressed={t.valor === color} disabled={esperando} onClick={() => setColor(t.valor)}>
              <span className={styles.muestraTinta} style={{ background: t.valor }} aria-hidden="true" />
              {t.etiqueta}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
