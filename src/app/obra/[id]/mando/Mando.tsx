"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { abrirCanalObra } from "@/lib/canal-obra";
import {
  ARRASTRE_GROSOR_MAX_PX,
  decidirSensor,
  deltaDesdeOrientacion,
  diametroDelPunto,
  entradasDesdePresencia,
  estaAjustandoGrosor,
  estadoDeFila,
  EVENTO_TRAZO,
  GROSOR_BASE,
  grosorDesdeArrastre,
  MENSAJES_POR_SEGUNDO,
  personasAqui,
  textoDelSensor,
  TINTAS,
  TRAZOS,
  type Delta,
  type EntradaPresencia,
  type MensajeTrazo,
  type Orientacion,
  type Sensor,
  type Trazo,
} from "@/lib/pincel";
import { clienteNavegador } from "@/lib/supabase/navegador";
import styles from "./mando.module.css";

type Selector = "trazo" | "tinta";

/** ¿Es la app añadida al inicio (standalone), no Safari? Solo se consulta al pintar el texto tras un rechazo, en el
 * cliente — nunca en el render del servidor. */
function estaInstalada(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches);
}

/**
 * La punta de cada pincel, dibujada (no solo el nombre): calcada de `brushSample` del prototipo firmado
 * (`experiments/pincel-prototipo/core.mjs`, commit de48c0c). Se pinta en el color de la tinta elegida.
 */
function MuestraTrazo({ trazo, color }: { trazo: Trazo; color: string }) {
  const curva = "M5 19C14 5 24 25 43 9";
  const gotas: [number, number][] = [[6, 18], [9, 14], [12, 11], [15, 13], [17, 9], [20, 14], [23, 17], [26, 19], [28, 15], [31, 17], [34, 13], [37, 10], [40, 12], [42, 8], [13, 17], [24, 12], [35, 16]];
  return (
    <svg className={styles.muestra} viewBox="0 0 48 28" aria-hidden="true" style={{ color }}>
      {trazo === "aire" && <path d={curva} fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" opacity="0.45" />}
      {trazo === "spray" && gotas.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="currentColor" />)}
      {trazo === "organico" && (
        <g fill="currentColor" opacity="0.6">
          <ellipse cx="13" cy="15" rx="9" ry="5" transform="rotate(-20 13 15)" />
          <ellipse cx="24" cy="14" rx="9" ry="4.5" transform="rotate(15 24 14)" />
          <ellipse cx="35" cy="12" rx="8" ry="5" transform="rotate(-10 35 12)" />
        </g>
      )}
      {trazo === "trazo" && <path d={curva} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />}
    </svg>
  );
}

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
  const [sensor, setSensor] = useState<Sensor>({ tipo: "sin-pedir" });
  const [entradas, setEntradas] = useState<EntradaPresencia[]>([]);
  const [banner, setBanner] = useState(false);
  const [abierto, setAbierto] = useState<Selector | null>(null); // nunca los dos menús abiertos (prototipo firmado)
  const tarjetaTrazoRef = useRef<HTMLButtonElement | null>(null);
  const tarjetaTintaRef = useRef<HTMLButtonElement | null>(null);
  // Grosor por arrastre (founder, 2026-09-21; reglas del gestor): el punto sigue al dedo en vertical solo con
  // `transform`, el grosor se queda hasta que se cambie, y mientras se ajusta no se manda trazo.
  const [desplazamiento, setDesplazamiento] = useState(0); // px del punto mientras se arrastra (positivo = arriba)
  const [grosor, setGrosor] = useState(GROSOR_BASE);

  const canalRef = useRef<ReturnType<typeof abrirCanalObra> | null>(null);
  const bufferRef = useRef<Delta[]>([]);
  const ultimaLecturaRef = useRef<Orientacion | null>(null);
  const trazoRef = useRef(trazo);
  const colorRef = useRef(color);
  const grosorRef = useRef(grosor);
  const arrastreInicioYRef = useRef<number | null>(null);
  const grosorAlEmpezarRef = useRef(GROSOR_BASE); // desde dónde se ajusta en ESTA pulsación
  const ajustandoRef = useRef(false); // más allá del umbral: se ajusta grosor, no se pinta
  useEffect(() => {
    trazoRef.current = trazo;
  }, [trazo]);
  useEffect(() => {
    colorRef.current = color;
  }, [color]);
  useEffect(() => {
    grosorRef.current = grosor;
  }, [grosor]);

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
      // Mientras se ajusta el grosor no se manda trazo (gestor, 2026-09-21): el arrastre del dedo no es pintar.
      // Los deltas de ese rato se tiran, no se guardan: al volver a pintar no debe salir un salto acumulado.
      if (ajustandoRef.current) return;
      if (deltas.length === 0 || !canalRef.current) return;
      const mensaje: MensajeTrazo = { trazo: trazoRef.current, color: colorRef.current, deltas, remitente: perfilId, grosor: grosorRef.current };
      canalRef.current.send({ type: "broadcast", event: EVENTO_TRAZO, payload: mensaje });
    }, Math.round(1000 / MENSAJES_POR_SEGUNDO));

    return () => {
      window.removeEventListener("deviceorientation", alMoverse);
      clearInterval(intervalo);
      bufferRef.current = [];
      ultimaLecturaRef.current = null;
    };
  }, [presionado, perfilId, estado.tipo]);

  // Grosor por arrastre: con el punto presionado, mover el dedo hacia arriba engruesa, hacia abajo adelgaza — el
  // gesto ya usado para pintar (mantener presionado), no uno nuevo. `arrastreInicioYRef` se marca en el propio
  // evento de presionar (llega antes que este efecto). Relativo al grosor con que se empezó: así "se queda".
  useEffect(() => {
    if (!presionado) return;
    function alArrastrar(e: PointerEvent) {
      if (arrastreInicioYRef.current === null) return;
      const deltaY = arrastreInicioYRef.current - e.clientY; // positivo = dedo subió
      const acotado = Math.max(-ARRASTRE_GROSOR_MAX_PX, Math.min(ARRASTRE_GROSOR_MAX_PX, deltaY));
      setDesplazamiento(acotado);
      ajustandoRef.current = estaAjustandoGrosor(acotado);
      setGrosor(grosorDesdeArrastre(deltaY, grosorAlEmpezarRef.current));
    }
    window.addEventListener("pointermove", alArrastrar);
    return () => window.removeEventListener("pointermove", alArrastrar);
  }, [presionado]);

  /** Al soltar: el punto vuelve al centro (transición de CSS sobre `transform`, la rejilla no se toca) y el grosor
   * SE QUEDA — la siguiente pulsación pinta con él y, si se arrastra otra vez, ajusta desde ahí. */
  function soltar() {
    setPresionado(false);
    setDesplazamiento(0);
    arrastreInicioYRef.current = null;
    ajustandoRef.current = false;
  }

  /**
   * OL-117: pedir el permiso del sensor SOLO desde un gesto que Safari de iOS cuente como activación del usuario —
   * el `click` del botón grande al soltarlo (antes se pedía en `pointerdown`, que no siempre cuenta, y la promesa
   * rechazaba con NotAllowedError; ese rechazo caía en el `catch` y salía «Este navegador no tiene sensor de
   * movimiento», falso). El nombre y el mensaje del error se guardan en el estado (se muestran discretos en la
   * ayuda mientras el founder prueba) y van a `console.warn`.
   */
  async function pedirPermisoDelSensor() {
    if (sensor.tipo === "pidiendo" || sensor.tipo === "concedido") return;
    if (typeof window.DeviceOrientationEvent === "undefined") {
      setSensor(decidirSensor({ caso: "sin-constructor" }));
      return;
    }
    const pedir = requestPermissionDeOrientacion();
    if (!pedir) {
      setSensor(decidirSensor({ caso: "sin-request-permission" })); // Android y navegadores que no lo exigen
      return;
    }
    setSensor({ tipo: "pidiendo" });
    try {
      const respuesta = await pedir();
      setSensor(decidirSensor({ caso: "respuesta", valor: String(respuesta) }));
    } catch (e) {
      const err = e as { name?: string; message?: string };
      console.warn("Pincel: requestPermission() del sensor rechazó", err?.name, err?.message);
      setSensor(decidirSensor({ caso: "error", nombre: err?.name ?? "Error", mensaje: err?.message ?? "" }));
    }
  }

  /** Presionar: solo pinta con el sensor ya concedido. Sin permiso todavía, el botón no pinta; el permiso se pide
   * al soltar (`onClick`), que es el gesto que iOS acepta. */
  function empezarAPintar(e: React.PointerEvent<HTMLButtonElement>) {
    setAbierto(null); // como en el prototipo firmado: pintar cierra cualquier menú abierto
    if (sensor.tipo !== "concedido") return;
    arrastreInicioYRef.current = e.clientY;
    grosorAlEmpezarRef.current = grosorRef.current;
    setPresionado(true);
  }

  const esperando = estado.tipo === "esperando";
  // Solo tras un rechazo importa si es la app instalada; y solo entonces se consulta window (nunca en el servidor).
  const ayudaSensor = textoDelSensor(sensor, sensor.tipo === "negado" ? estaInstalada() : false);
  const trazoElegido = TRAZOS.find((t) => t.id === trazo) ?? TRAZOS[0];
  const tintaElegida = TINTAS.find((t) => t.valor === color) ?? TINTAS[0];

  // Al elegir: se cierra el menú y el foco vuelve a la tarjeta (bitácora 118: "al elegir el foco vuelve al selector").
  function elegirTrazo(id: Trazo) {
    setTrazo(id);
    setAbierto(null);
    tarjetaTrazoRef.current?.focus();
  }
  function elegirTinta(valor: string) {
    setColor(valor);
    setAbierto(null);
    tarjetaTintaRef.current?.focus();
  }

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
      {estado.tipo !== "fuera" && <p className={styles.presente}>{esperando ? `${cupo} pintando` : personasAqui(entradas.length)}</p>}
      {esperando && (
        <div className={styles.espera}>
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
      )}

      {/* Trazo: tarjeta cerrada con la punta elegida (dibujada, en el color de la tinta); su menú abre hacia arriba. */}
      <div className={`${styles.selector} ${styles.selectorTrazo}`}>
        <button
          ref={tarjetaTrazoRef}
          type="button"
          className={styles.tarjeta}
          aria-label={`Trazo: ${trazoElegido.etiqueta}`}
          aria-expanded={abierto === "trazo"}
          aria-controls="menu-trazo"
          disabled={esperando}
          onClick={() => setAbierto(abierto === "trazo" ? null : "trazo")}
        >
          <MuestraTrazo trazo={trazo} color={color} />
          <span>{trazoElegido.etiqueta}</span>
        </button>
        {abierto === "trazo" && (
          <div id="menu-trazo" className={styles.menu} role="group" aria-label="Trazo">
            {TRAZOS.map((t) => (
              <button key={t.id} type="button" className={styles.opcion} aria-pressed={t.id === trazo} onClick={() => elegirTrazo(t.id)}>
                <MuestraTrazo trazo={t.id} color={color} />
                <span>{t.etiqueta}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!esperando && (
        <button
          type="button"
          className={styles.orb}
          aria-pressed={presionado}
          aria-label={sensor.tipo === "concedido" ? "Mantén presionado y mueve tu celular" : "Toca el punto para activar el sensor"}
          onClick={pedirPermisoDelSensor}
          style={{
            // Solo `transform` y solo traslación: el botón sigue al dedo en vertical sin cambiar de tamaño (si creciera,
            // se montaría sobre las tarjetas). Sin transición mientras está presionado: sigue al dedo al instante; al
            // soltar, la transición del CSS lo regresa al centro.
            transform: `${presionado ? "scale(0.94) " : ""}translateY(${-desplazamiento}px)`,
            transition: presionado ? "none" : undefined,
          }}
          onPointerDown={empezarAPintar}
          onPointerUp={soltar}
          onPointerLeave={soltar}
        >
          {/* El punto blanco MIDE el grosor a escala del mando (16 px por unidad: 8 a 56 px) y se queda así al soltar:
              es cómo se ve el grosor que lleva sin abrir nada. Cambia el tamaño del punto, no el del botón (128 px
              fijos, lo centra su rejilla) ni el de la rejilla del mando. */}
          <span className={styles.punto} style={{ width: `${diametroDelPunto(grosor)}px`, height: `${diametroDelPunto(grosor)}px` }} aria-hidden="true" />
        </button>
      )}

      {/* Tinta: tarjeta cerrada con el círculo del color y su nombre; su menú abre hacia arriba, alineado a la derecha. */}
      <div className={`${styles.selector} ${styles.selectorTinta}`}>
        <button
          ref={tarjetaTintaRef}
          type="button"
          className={styles.tarjeta}
          aria-label={`Tinta: ${tintaElegida.etiqueta}`}
          aria-expanded={abierto === "tinta"}
          aria-controls="menu-tinta"
          disabled={esperando}
          onClick={() => setAbierto(abierto === "tinta" ? null : "tinta")}
        >
          <i className={styles.tinta} style={{ background: color }} aria-hidden="true" />
          <span>{tintaElegida.etiqueta}</span>
        </button>
        {abierto === "tinta" && (
          <div id="menu-tinta" className={styles.menu} role="group" aria-label="Tinta">
            {TINTAS.map((t) => (
              <button key={t.valor} type="button" className={styles.opcion} aria-pressed={t.valor === color} onClick={() => elegirTinta(t.valor)}>
                <i className={styles.tinta} style={{ background: t.valor }} aria-hidden="true" />
                <span>{t.etiqueta}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!esperando &&
        (ayudaSensor ? (
          <p className={`${styles.hold} ${ayudaSensor.esAviso ? styles.aviso : ""}`} role={ayudaSensor.esAviso ? "alert" : undefined} aria-live="polite">
            {ayudaSensor.texto}
            {ayudaSensor.abrirEnSafari && (
              // Desde la app instalada, un enlace con target=_blank abre Safari — donde el permiso sí se puede dar.
              <a className={styles.abrirSafari} href={typeof window === "undefined" ? "#" : window.location.href} target="_blank" rel="noopener">
                Abrir en Safari
              </a>
            )}
            {(sensor.tipo === "negado" || sensor.tipo === "sin-soporte") && <small className={styles.detalle}>({sensor.detalle})</small>}
          </p>
        ) : (
          <p className={styles.hold} aria-live="polite">
            {/* Mientras el dedo ajusta el grosor no se pinta (no se manda trazo), así que el texto no debe decir
                «Pintando»; además, en el tope de abajo el punto quedaría encima del texto. El <p> conserva su renglón. */}
            {presionado ? (estaAjustandoGrosor(desplazamiento) ? " " : "Pintando en la pared") : "Mantén presionado y mueve tu celular"}
          </p>
        ))}
    </div>
  );
}
