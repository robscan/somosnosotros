"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { abrirCanalObra } from "@/lib/canal-obra";
import {
  ARRASTRE_GROSOR_MAX_PX,
  decidirCercania,
  decidirSensor,
  diametroDelPunto,
  entradasDesdePresencia,
  estaAjustandoGrosor,
  estadoDeFila,
  estaEncendido,
  esTintaClara,
  EVENTO_POSICION,
  EVENTO_TRAZO,
  GROSOR_BASE,
  grosorDesdeArrastre,
  intervaloMs,
  muestrear,
  personasAqui,
  posicionDesdeOrientacion,
  POSICIONES_POR_SEGUNDO,
  PUNTOS_MAX_POR_MENSAJE,
  ritmoDeTrazo,
  textoDeCercania,
  textoDelSensor,
  TINTAS,
  TRAZOS,
  type Cercania,
  type EntradaPresencia,
  type MensajePosicion,
  type MensajeTrazo,
  type Orientacion,
  type PosicionNormalizada,
  type Sensor,
  type Trazo,
} from "@/lib/pincel";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { leerUbicacionConPrecision } from "@/lib/ubicacion";
import styles from "./mando.module.css";

type Selector = "trazo" | "tinta";

/** El centro de la pared: donde arranca el pincel al encender y adonde vuelve con «Centrar». */
const CENTRO: PosicionNormalizada = { x: 0, y: 0 };

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
    // Con Blanco (OL-126) la punta no se vería sobre la tarjeta blanca: `data-clara` le pone un fondo gris detrás.
    <svg className={styles.muestra} viewBox="0 0 48 28" aria-hidden="true" style={{ color }} data-clara={esTintaClara(color) ? "true" : undefined}>
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
 * solo mando (prototipo firmado OL-084): no dibuja nada, manda hacia dónde apunta mientras el botón está
 * presionado. Cupo y fila (doc rediseno/34, firmado 2026-09-21): quien llega después de que se llenó el cupo se
 * conecta igual (ve cuántos esperan, guarda su lugar por Presence) pero no pinta hasta que le toque. OL-120: el
 * botón arranca apagado y el primer toque lo enciende (permiso del sensor); encendido y con cupo, el mando manda su
 * posición aunque no pinte (la pared enseña un punto tenue) y «Centrar» recalibra el cero.
 */
export default function Mando({
  obraId,
  perfilId,
  cupo,
  sonda = false,
  esAdmin = false,
  referencia = null,
  lugarNombre = null,
  lugarHref = null,
}: {
  obraId: string;
  perfilId: string;
  cupo: number;
  sonda?: boolean;
  /** Cercanía (OL-127): administración queda exenta; `referencia` es el lugar de la obra (o sus coordenadas propias). */
  esAdmin?: boolean;
  referencia?: { lat: number; lng: number } | null;
  lugarNombre?: string | null;
  lugarHref?: string | null;
}) {
  const [trazo, setTrazo] = useState<Trazo>(TRAZOS[0].id);
  // Cercanía (OL-127): se pide la ubicación al encender; solo con «cerca» el control queda encendido y manda.
  const [cercania, setCercania] = useState<Cercania>({ tipo: "sin-pedir" });
  const cercaRef = useRef(false);
  useEffect(() => {
    cercaRef.current = cercania.tipo === "cerca";
  }, [cercania]);
  const [color, setColor] = useState(TINTAS[0].valor);
  const [presionado, setPresionado] = useState(false);
  const [sensor, setSensor] = useState<Sensor>({ tipo: "sin-pedir" });
  const [entradas, setEntradas] = useState<EntradaPresencia[]>([]);
  const [banner, setBanner] = useState(false);
  const [abierto, setAbierto] = useState<Selector | null>(null); // nunca los dos menús abiertos (prototipo firmado)
  const tarjetaTrazoRef = useRef<HTMLButtonElement | null>(null);
  const tarjetaTintaRef = useRef<HTMLButtonElement | null>(null);
  const orbRef = useRef<HTMLButtonElement | null>(null);
  // Grosor por arrastre (founder, 2026-09-21; reglas del gestor): el punto sigue al dedo en vertical solo con
  // `transform`, el grosor se queda hasta que se cambie, y mientras se ajusta no se manda trazo.
  const [desplazamiento, setDesplazamiento] = useState(0); // px del punto mientras se arrastra (positivo = arriba)
  const [grosor, setGrosor] = useState(GROSOR_BASE);
  // Sonda (OL-126, founder: «grosor se sigue bloqueando» en el iPhone real, donde no hay consola): solo con
  // `?sonda=1`, un recuadro con los últimos eventos de puntero/toque que llegaron y el estado del mando. Sin el
  // parámetro `anotar` no hace nada y no se pinta nada.
  const [lineasSonda, setLineasSonda] = useState<string[]>([]);
  const [muestrasPorSegundo, setMuestrasPorSegundo] = useState(0);
  const [posicionSonda, setPosicionSonda] = useState<PosicionNormalizada>(CENTRO); // copia por segundo, para no leer refs al pintar
  const [capturado, setCapturado] = useState(false);
  const muestrasRef = useRef(0);
  const anotar = useCallback(
    (texto: string) => {
      if (!sonda) return;
      setLineasSonda((l) => [...l.slice(-7), `${new Date().toISOString().slice(14, 23)} ${texto}`]);
    },
    [sonda],
  );

  const canalRef = useRef<ReturnType<typeof abrirCanalObra> | null>(null);
  // Hacia dónde apunta el pincel (OL-120): el cero es la postura del teléfono al encender o al centrar; cada lectura
  // del sensor da una posición normalizada respecto a él. `bufferRef` junta las muestras entre mensaje y mensaje
  // mientras se pinta; `posicionRef` es la última, la que se manda como posición cuando no se pinta.
  const ceroRef = useRef<Orientacion | null>(null);
  const posicionRef = useRef<PosicionNormalizada>(CENTRO);
  const ultimaEnviadaRef = useRef<PosicionNormalizada | null>(null);
  const ultimaMuestraRef = useRef<number | undefined>(undefined); // ms de época de la última lectura (OL-126: latencia)
  const bufferRef = useRef<PosicionNormalizada[]>([]);
  const trazoRef = useRef(trazo);
  const colorRef = useRef(color);
  const grosorRef = useRef(grosor);
  const puedePintarRef = useRef(false);
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
  useEffect(() => {
    puedePintarRef.current = estado.tipo === "pintando";
  }, [estado.tipo]);

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

  /** La posición sin trazo (OL-120): solo con cupo — quien espera no manda posición. */
  const mandarPosicion = useCallback(
    (posicion: PosicionNormalizada) => {
      if (!canalRef.current || !puedePintarRef.current || !cercaRef.current) return;
      const mensaje: MensajePosicion = { remitente: perfilId, trazo: trazoRef.current, color: colorRef.current, grosor: grosorRef.current, posicion, enviado: Date.now(), muestra: ultimaMuestraRef.current, cerca: true };
      canalRef.current.send({ type: "broadcast", event: EVENTO_POSICION, payload: mensaje });
      ultimaEnviadaRef.current = posicion;
    },
    [perfilId],
  );

  // El sensor se escucha siempre que el control está encendido y con cupo (no solo presionado): sin pintar, la
  // lectura mueve el punto tenue de la pared. La primera lectura completa fija el cero (la postura con que se
  // encendió, o la de después de «Centrar», que lo borra).
  useEffect(() => {
    if (!estaEncendido(sensor) || estado.tipo !== "pintando") return;
    function alMoverse(e: DeviceOrientationEvent) {
      muestrasRef.current += 1;
      const actual: Orientacion = { beta: e.beta, gamma: e.gamma };
      if (!ceroRef.current && actual.beta !== null && actual.gamma !== null) ceroRef.current = actual;
      const posicion = posicionDesdeOrientacion(ceroRef.current, actual);
      if (!posicion) return;
      posicionRef.current = posicion;
      ultimaMuestraRef.current = Date.now();
      bufferRef.current.push(posicion);
    }
    window.addEventListener("deviceorientation", alMoverse);
    // Con sonda: cuántas lecturas por segundo da el sensor de verdad (en Safari de iOS, ~60).
    const contador = sonda
      ? setInterval(() => {
          setMuestrasPorSegundo(muestrasRef.current);
          setPosicionSonda(posicionRef.current);
          muestrasRef.current = 0;
        }, 1000)
      : null;
    return () => {
      window.removeEventListener("deviceorientation", alMoverse);
      if (contador) clearInterval(contador);
      bufferRef.current = [];
    };
  }, [sensor, estado.tipo, sonda]);

  // (a) Safari de iOS: mientras el mando está en pantalla, sin «tirar para refrescar» ni rebote de la página
  // (`overscroll-behavior` tiene que ir en html/body, no basta en el botón); se repone al salir.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const antes = [html.style.overscrollBehavior, body.style.overscrollBehavior];
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";
    return () => {
      html.style.overscrollBehavior = antes[0];
      body.style.overscrollBehavior = antes[1];
    };
  }, []);

  // Presionado y con cupo para pintar (OL-126): el primer punto del trazo sale AL INSTANTE al presionar (donde está
  // el punto tenue) y, después, `ritmoDeTrazo(cupo)` mensajes por segundo (6 con el cupo de 10; 5 con 20) con las
  // posiciones juntadas desde el anterior. Si el cupo baja a media pulsación (o el sync de Presence llega tarde),
  // este efecto se desmonta solo — la pared, de todos modos, ya descarta el trazo de quien no pinta.
  useEffect(() => {
    if (!presionado || estado.tipo !== "pintando") return;
    function mandarTrazo(muestras: PosicionNormalizada[]) {
      if (muestras.length === 0 || !canalRef.current) return;
      const mensaje: MensajeTrazo = {
        trazo: trazoRef.current,
        color: colorRef.current,
        puntos: muestrear(muestras, PUNTOS_MAX_POR_MENSAJE),
        remitente: perfilId,
        grosor: grosorRef.current,
        enviado: Date.now(),
        muestra: ultimaMuestraRef.current,
        cerca: true, // OL-127: solo se presiona con el control encendido, y encendido implica cerca
      };
      canalRef.current.send({ type: "broadcast", event: EVENTO_TRAZO, payload: mensaje });
    }
    bufferRef.current = [];
    mandarTrazo([posicionRef.current]); // el trazo arranca donde está el punto tenue, sin esperar al primer tic
    const intervalo = setInterval(() => {
      const muestras = bufferRef.current;
      bufferRef.current = [];
      // Mientras se ajusta el grosor no se manda trazo (gestor, 2026-09-21): el arrastre del dedo no es pintar.
      // Las muestras de ese rato se tiran, no se guardan: al volver a pintar no debe salir un salto acumulado.
      if (ajustandoRef.current) return;
      mandarTrazo(muestras);
    }, intervaloMs(ritmoDeTrazo(cupo)));
    return () => {
      clearInterval(intervalo);
      bufferRef.current = [];
    };
  }, [presionado, perfilId, estado.tipo, cupo]);

  // Sin pintar y con cupo: «aquí estoy» al conectarse (y al soltar, ya con el grosor que quedó) y, después, la
  // posición a POSICIONES_POR_SEGUNDO (2/s, OL-126: es referencia, no trazo), solo si cambió y siempre la última
  // (sin cola). Nada se guarda.
  useEffect(() => {
    if (presionado || estado.tipo !== "pintando" || cercania.tipo !== "cerca") return;
    mandarPosicion(posicionRef.current);
    const intervalo = setInterval(() => {
      bufferRef.current = []; // sin pintar, las muestras no se acumulan
      const posicion = posicionRef.current;
      const ultima = ultimaEnviadaRef.current;
      if (ultima && ultima.x === posicion.x && ultima.y === posicion.y) return;
      mandarPosicion(posicion);
    }, intervaloMs(POSICIONES_POR_SEGUNDO));
    return () => clearInterval(intervalo);
  }, [presionado, estado.tipo, cercania.tipo, mandarPosicion]);

  /** Al soltar (o si el sistema cancela el toque): el punto vuelve al centro (transición de CSS sobre `transform`,
   * la rejilla no se toca) y el grosor SE QUEDA — la siguiente pulsación pinta con él y, si se arrastra otra vez,
   * ajusta desde ahí. Antes del efecto del arrastre porque este lo lista como dependencia. */
  const soltar = useCallback(
    (e?: { type: string; pointerType?: string; clientY?: number }) => {
      if (e) anotar(`${e.type} ${e.pointerType ?? ""} y=${e.clientY === undefined ? "-" : Math.round(e.clientY)}`);
      setPresionado(false);
      setDesplazamiento(0);
      setCapturado(false);
      arrastreInicioYRef.current = null;
      ajustandoRef.current = false;
    },
    [anotar],
  );

  // Grosor por arrastre: con el punto presionado, mover el dedo hacia arriba engruesa, hacia abajo adelgaza — el
  // gesto ya usado para pintar (mantener presionado), no uno nuevo. `arrastreInicioYRef` se marca en el propio
  // evento de presionar (llega antes que este efecto). Relativo al grosor con que se empezó: así "se queda".
  useEffect(() => {
    if (!presionado) return;
    function ajustarDesde(clientY: number) {
      if (arrastreInicioYRef.current === null) return;
      const deltaY = arrastreInicioYRef.current - clientY; // positivo = dedo subió
      const acotado = Math.max(-ARRASTRE_GROSOR_MAX_PX, Math.min(ARRASTRE_GROSOR_MAX_PX, deltaY));
      setDesplazamiento(acotado);
      ajustandoRef.current = estaAjustandoGrosor(acotado);
      setGrosor(grosorDesdeArrastre(deltaY, grosorAlEmpezarRef.current));
    }
    function alArrastrar(e: PointerEvent) {
      anotar(`${e.type} ${e.pointerType} y=${Math.round(e.clientY)}`);
      ajustarDesde(e.clientY);
    }
    // Soltar también desde window: si el navegador no captura el puntero, el `pointerup` fuera del botón llega aquí.
    // (El botón NO usa `pointerleave` para soltar: en Safari de iOS llega un `pointerleave` en el primer
    // `pointermove` del dedo, aunque el toque siga —medido en el simulador, OL-120— y soltaba el arrastre.)
    function alSoltarFuera(e: PointerEvent) {
      anotar(`${e.type} ${e.pointerType} window y=${Math.round(e.clientY)}`);
      soltar();
    }
    // (c) Respaldo por toques (OL-126): si Safari no entrega `pointermove` (captura fallida), el arrastre se lee
    // del `touchmove`, y `touchend`/`touchcancel` sueltan. Los mismos valores por las dos vías: no se pisan.
    function alMoverToque(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      anotar(`touchmove y=${Math.round(t.clientY)}${e.cancelable ? "" : " (no cancelable)"}`);
      if (e.cancelable) e.preventDefault(); // (a) el documento no se desplaza mientras hay un dedo pintando
      ajustarDesde(t.clientY);
    }
    function alTerminarToque(e: TouchEvent) {
      anotar(e.type);
      soltar();
    }
    // Si la app pierde el foco a media pulsación (llamada, cambio de app), el botón no se queda trabado.
    function alPerderFoco() {
      anotar(document.visibilityState === "hidden" ? "visibilidad oculta" : "blur");
      soltar();
    }
    window.addEventListener("pointermove", alArrastrar);
    window.addEventListener("pointerup", alSoltarFuera);
    window.addEventListener("pointercancel", alSoltarFuera);
    document.addEventListener("touchmove", alMoverToque, { passive: false });
    document.addEventListener("touchend", alTerminarToque);
    document.addEventListener("touchcancel", alTerminarToque);
    window.addEventListener("blur", alPerderFoco);
    document.addEventListener("visibilitychange", alPerderFoco);
    return () => {
      window.removeEventListener("pointermove", alArrastrar);
      window.removeEventListener("pointerup", alSoltarFuera);
      window.removeEventListener("pointercancel", alSoltarFuera);
      document.removeEventListener("touchmove", alMoverToque);
      document.removeEventListener("touchend", alTerminarToque);
      document.removeEventListener("touchcancel", alTerminarToque);
      window.removeEventListener("blur", alPerderFoco);
      document.removeEventListener("visibilitychange", alPerderFoco);
    };
  }, [presionado, anotar, soltar]);

  // OL-120, punto 7 (founder en el iPhone: «arrastro el punto arriba y abajo y no funciona»): en Safari de iOS un
  // dedo que se mantiene y se mueve en vertical es, por defecto, desplazar la página o seleccionar, y el toque se
  // cancela (`pointercancel`) — el `pointermove` no llega. `touch-action: none` (CSS) se lo dice a Safari; este
  // `touchmove` NO pasivo con `preventDefault` es la segunda cerradura (React registra `touchmove` como pasivo, así
  // que va a mano), junto con `-webkit-user-select`/`-webkit-touch-callout` en el CSS y `pointercancel` como soltar.
  useEffect(() => {
    const orb = orbRef.current;
    if (!orb) return;
    const frenarDesplazamiento = (e: TouchEvent) => e.preventDefault();
    orb.addEventListener("touchmove", frenarDesplazamiento, { passive: false });
    return () => orb.removeEventListener("touchmove", frenarDesplazamiento);
  }, []);

  /**
   * Encender el control (OL-120, punto 5 del founder; antes OL-117): el primer toque del botón grande pide el
   * permiso del sensor — SOLO desde un gesto que Safari de iOS cuente como activación del usuario, el `click` al
   * soltar (en `pointerdown` la promesa rechazaba con NotAllowedError y salía «Este navegador no tiene sensor de
   * movimiento», falso). Concedido, el botón queda encendido (verde) y desde ahí mantener presionado pinta; en
   * Android, sin permiso que pedir, el mismo toque enciende. El nombre y el mensaje de un error se guardan en el
   * estado (se muestran discretos en la ayuda mientras el founder prueba) y van a `console.warn`.
   */
  async function encender() {
    // Las dos comprobaciones arrancan en el mismo toque (el gesto que iOS exige para el sensor): sensor y ubicación.
    void comprobarCercania();
    await encenderSensor();
  }

  /**
   * Cercanía (OL-127): la ubicación se lee al encender, una vez, y no se guarda. Cerca = a menos de 200 m del lugar
   * de la obra más la precisión del aparato; administración queda exenta (prueba desde donde sea) aunque la
   * ubicación falle. Si está lejos, negada o falló, el control no enciende y la ayuda lo dice; otro toque vuelve a
   * pedirla. Es fricción, no seguridad: la pared confía en el `cerca: true` del mando.
   */
  async function comprobarCercania() {
    if (cercania.tipo === "cerca" || cercania.tipo === "pidiendo") return;
    if (!referencia) {
      setCercania({ tipo: "cerca", distanciaM: null }); // sin referencia no hay qué comprobar
      return;
    }
    setCercania({ tipo: "pidiendo" });
    try {
      const { punto, precisionM } = await leerUbicacionConPrecision();
      setCercania(decidirCercania({ esAdmin, punto, precisionM, referencia }));
    } catch (e) {
      if (esAdmin) {
        setCercania({ tipo: "cerca", distanciaM: null });
        return;
      }
      setCercania({ tipo: e === "negado" ? "negada" : e === "sin-soporte" ? "sin-soporte" : "error" });
    }
  }

  async function encenderSensor() {
    if (sensor.tipo === "pidiendo" || sensor.tipo === "concedido") return;
    ceroRef.current = null; // el cero será la postura del teléfono con que se encienda
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

  /** Presionar: solo pinta con el control encendido. Apagado, el botón no pinta; se enciende al soltar (`onClick`),
   * que es el gesto que iOS acepta. */
  function empezarAPintar(e: React.PointerEvent<HTMLButtonElement>) {
    anotar(`${e.type} ${e.pointerType} y=${Math.round(e.clientY)} ${estaEncendido(sensor) ? "encendido" : "apagado"}`);
    setAbierto(null); // como en el prototipo firmado: pintar cierra cualquier menú abierto
    if (!estaEncendido(sensor) || cercania.tipo !== "cerca") return;
    // El botón se queda con el puntero aunque el dedo (o el propio botón, que lo sigue) salga de su área: el
    // arrastre del grosor y el soltar llegan siempre a él. Si Safari no lo captura (OL-126, sospecha c), la sonda
    // lo enseña («cap=no») y el arrastre sigue por `touchmove`.
    let cap = false;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
      cap = e.currentTarget.hasPointerCapture(e.pointerId);
    } catch {
      // un navegador sin captura de puntero sigue funcionando con los eventos de window/touch
    }
    setCapturado(cap);
    arrastreInicioYRef.current = e.clientY;
    grosorAlEmpezarRef.current = grosorRef.current;
    setPresionado(true);
  }

  /** «Centrar» (OL-120): recalibra el cero con la postura actual del teléfono (la siguiente lectura del sensor es
   * el nuevo cero, sin salto) y manda el pincel al centro de la pared. */
  function centrar() {
    setAbierto(null);
    ceroRef.current = null;
    posicionRef.current = CENTRO;
    bufferRef.current = [];
    mandarPosicion(CENTRO);
  }

  const esperando = estado.tipo === "esperando";
  // Encendido = sensor concedido Y cerca (OL-127): sin cercanía el botón sigue apagado, con su aviso.
  const encendido = estaEncendido(sensor) && cercania.tipo === "cerca";
  // Solo tras un rechazo importa si es la app instalada; y solo entonces se consulta window (nunca en el servidor).
  const ayudaSensor = textoDelSensor(sensor, sensor.tipo === "negado" ? estaInstalada() : false);
  // La ubicación manda sobre el sensor en la ayuda cuando es un aviso (lejos, negada, error); «pidiendo» no tapa un
  // aviso del sensor.
  const ayudaCercania = textoDeCercania(cercania, lugarNombre);
  const ayuda = ayudaCercania && (ayudaCercania.esAviso || !ayudaSensor?.esAviso) ? { ...ayudaCercania, abrirEnSafari: false, detalle: null } : ayudaSensor ? { ...ayudaSensor, verFicha: false, detalle: sensor.tipo === "negado" || sensor.tipo === "sin-soporte" ? sensor.detalle : null } : null;
  const trazoElegido = TRAZOS.find((t) => t.id === trazo) ?? TRAZOS[0];
  const tintaElegida = TINTAS.find((t) => t.valor === color) ?? TINTAS[0];

  // Al elegir: se cierra el menú y el foco vuelve a la tarjeta (bitácora 118: "al elegir el foco vuelve al selector").
  // Y la pared se entera al instante (el punto tenue cambia de punta o de color) sin esperar a que el pincel se mueva.
  function elegirTrazo(id: Trazo) {
    setTrazo(id);
    trazoRef.current = id;
    setAbierto(null);
    tarjetaTrazoRef.current?.focus();
    if (!presionado) mandarPosicion(posicionRef.current);
  }
  function elegirTinta(valor: string) {
    setColor(valor);
    colorRef.current = valor;
    setAbierto(null);
    tarjetaTintaRef.current?.focus();
    if (!presionado) mandarPosicion(posicionRef.current);
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

      {/* Centrar (OL-120): en la zona libre sobre el botón; no añade fila ni mueve nada (mando.module.css). */}
      {!esperando && (
        <button type="button" className={styles.centrar} onClick={centrar} aria-label="Centrar el pincel en la pared">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="12" cy="12" r="1.8" fill="currentColor" />
            <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Centrar
        </button>
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
          ref={orbRef}
          type="button"
          className={styles.orb}
          data-encendido={encendido ? "true" : "false"}
          aria-pressed={presionado}
          aria-label={encendido ? "Mantén presionado y mueve tu celular" : "Encender el control"}
          onClick={encender}
          style={{
            // Solo `transform` y solo traslación: el botón sigue al dedo en vertical sin cambiar de tamaño (si creciera,
            // se montaría sobre las tarjetas). Sin transición mientras está presionado: sigue al dedo al instante; al
            // soltar, la transición del CSS lo regresa al centro.
            transform: `${presionado ? "scale(0.94) " : ""}translateY(${-desplazamiento}px)`,
            transition: presionado ? "none" : undefined,
          }}
          onPointerDown={empezarAPintar}
          onPointerUp={soltar}
          onPointerCancel={soltar}
        >
          {/* El punto MIDE el grosor a escala del mando (16 px por unidad: 8 a 56 px) y se queda así al soltar:
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
          <i className={styles.tinta} style={{ background: color }} data-clara={esTintaClara(color) ? "true" : undefined} aria-hidden="true" />
          <span>{tintaElegida.etiqueta}</span>
        </button>
        {abierto === "tinta" && (
          <div id="menu-tinta" className={styles.menu} role="group" aria-label="Tinta">
            {TINTAS.map((t) => (
              <button key={t.valor} type="button" className={styles.opcion} aria-pressed={t.valor === color} onClick={() => elegirTinta(t.valor)}>
                <i className={styles.tinta} style={{ background: t.valor }} data-clara={esTintaClara(t.valor) ? "true" : undefined} aria-hidden="true" />
                <span>{t.etiqueta}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!esperando &&
        (ayuda ? (
          <p className={`${styles.hold} ${ayuda.esAviso ? styles.aviso : ""}`} role={ayuda.esAviso ? "alert" : undefined} aria-live="polite">
            {ayuda.texto}
            {ayuda.abrirEnSafari && (
              // Desde la app instalada, un enlace con target=_blank abre Safari — donde el permiso sí se puede dar.
              <a className={styles.abrirSafari} href={typeof window === "undefined" ? "#" : window.location.href} target="_blank" rel="noopener">
                Abrir en Safari
              </a>
            )}
            {ayuda.verFicha && lugarHref && (
              // Lejos (OL-127): a la ficha del lugar, sin pedir entrar otra vez.
              <a className={styles.abrirSafari} href={lugarHref}>
                Ver ficha
              </a>
            )}
            {ayuda.detalle && <small className={styles.detalle}>({ayuda.detalle})</small>}
          </p>
        ) : (
          <p className={styles.hold} aria-live="polite">
            {/* Mientras el dedo ajusta el grosor no se pinta (no se manda trazo), así que el texto no debe decir
                «Pintando»; además, en el tope de abajo el punto quedaría encima del texto. El <p> conserva su renglón. */}
            {presionado ? (estaAjustandoGrosor(desplazamiento) ? " " : "Pintando en la pared") : "Mantén presionado y mueve tu celular"}
          </p>
        ))}

      {sonda && (
        <pre className={styles.sonda} aria-hidden="true">
          {`sonda · fila=${estado.tipo} (${entradas.length}) · sensor=${sensor.tipo} · ${muestrasPorSegundo} lecturas/s · trazo ${ritmoDeTrazo(cupo)}/s, posición ${POSICIONES_POR_SEGUNDO}/s\n` +
            `cercanía=${cercania.tipo}${"distanciaM" in cercania && cercania.distanciaM !== null ? ` ${Math.round(cercania.distanciaM)} m` : ""}${cercania.tipo === "lejos" ? ` (±${Math.round(cercania.precisionM)} m)` : ""}${esAdmin ? " · admin exenta" : ""}${referencia ? "" : " · sin referencia"}\n` +
            `pres=${presionado ? "sí" : "no"} cap=${capturado ? "sí" : "no"} desp=${desplazamiento} grosor=${grosor.toFixed(2)} pos=${posicionSonda.x.toFixed(2)},${posicionSonda.y.toFixed(2)}\n` +
            lineasSonda.join("\n")}
        </pre>
      )}
    </div>
  );
}
