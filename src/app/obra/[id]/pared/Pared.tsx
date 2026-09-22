"use client";

import { useEffect, useRef, useState } from "react";
import CodigoQr from "@/components/ui/CodigoQr";
import { abrirCanalObra } from "@/lib/canal-obra";
import { configPublica } from "@/lib/config";
import {
  acreditaCercania,
  ANCHO_POR_GROSOR_PX,
  borradoReciente,
  BUCKET_INSTANTANEAS,
  diametroDelPuntoDePosicion,
  DIAMETRO_PUNTO_MIN_PX,
  encajar,
  entradasDesdePresencia,
  esMensajeBorrarValido,
  esMensajePosicionValido,
  esMensajeTrazoValido,
  esTintaClara,
  EVENTO_BORRAR,
  EVENTO_POSICION,
  EVENTO_TRAZO,
  latenciasDe,
  LIENZO,
  OPACIDAD_PUNTO_TENUE,
  puntoEnPared,
  quienesPintan,
  rectanguloDelLienzo,
  rutaInstantanea,
  siguientesSegmentos,
  SUAVIZADO_PUNTO_MS,
  tocaSubirInstantanea,
  type Latencias,
  type MensajePosicion,
  type MensajeTrazo,
  type MotivoInstantanea,
  type Punto,
  type Rectangulo,
} from "@/lib/pincel";
import { clienteNavegador } from "@/lib/supabase/navegador";
import styles from "./pared.module.css";

/** El punto de referencia de un mando (OL-120): dónde está su pincel, de qué color y tamaño, y si está pintando. */
type PuntoDeMando = { x: number; y: number; color: string; diametro: number; pintando: boolean };

/** Una línea de la sonda (OL-126): qué mensaje, de quién, y sus latencias. */
type LecturaSonda = { evento: string; remitente: string; puntos: number; latencias: Latencias; recibido: number };

/** Cada cuánto la pared revisa si toca subir la instantánea (la regla de los 20 s vive en `tocaSubirInstantanea`). */
const REVISAR_INSTANTANEA_MS = 5000;

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

/** El PNG de la pared a su tamaño fijo (LIENZO, 1920×1080 — no a píxeles de pantalla), con fondo transparente:
 * solo lo pintado. OL-135: el bitmap del lienzo ya mide eso, así que no se vuelve a muestrear. */
function pngDeLaPared(lienzo: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolver) => lienzo.toBlob(resolver, "image/png"));
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
 * Instantánea (OL-126, parte 4): al abrirse pinta de fondo el PNG guardado en Storage, si lo hay, y sube uno
 * nuevo cada 20 s si hubo trazos, al ocultarse/cerrarse y al recibir «borrar» — así lo pintado sobrevive a cerrar
 * y reabrir la pared mientras la obra esté abierta, sin guardar trazos. OL-135 (founder: «se deformó el dibujo… que
 * mantenga aspect ratio y solo se escale»): el lienzo mide siempre LIENZO (1920×1080, 16:9) y se muestra escalado
 * entero y centrado en la ventana (`rectanguloDelLienzo`); posiciones, trazos, grosor, puntos de mando e instantánea
 * viven en esas unidades, y una instantánea con otra proporción se encaja centrada sin estirarse.
 */
export default function Pared({ obraId, nombre, abierta, cupo, qr, sonda = false }: { obraId: string; nombre: string; abierta: boolean; cupo: number; qr: string | null; sonda?: boolean }) {
  const lienzoRef = useRef<HTMLCanvasElement | null>(null);
  const puntos = useRef<Map<string, Punto>>(new Map());
  const pintanRef = useRef<Set<string>>(new Set());
  // La última posición de cada remitente, esté o no en el cupo todavía: si su «aquí estoy» llega antes que el sync
  // de Presence de esta pared, su punto aparece en cuanto el sync lo confirme, sin esperar a que se mueva.
  const ultimaPosicionRef = useRef<Map<string, MensajePosicion>>(new Map());
  // Instantánea: si hubo trazos desde la última subida, cuándo fue, si hay una en curso, y el token de sesión
  // para la subida de emergencia al cerrarse la pestaña (fetch keepalive, sin tiempo para el cliente).
  const hayTrazosNuevosRef = useRef(false);
  const ultimaSubidaRef = useRef<number | null>(null);
  const subiendoRef = useRef(false);
  const tokenRef = useRef<string | null>(null);
  const ultimoBorradoRef = useRef<number | null>(null); // el último «borrar» aplicado (hora registrada por Administración)
  const [puntosDeMando, setPuntosDeMando] = useState<Record<string, PuntoDeMando>>({});
  const [lecturas, setLecturas] = useState<LecturaSonda[]>([]);
  const [instantanea, setInstantanea] = useState<string>("sin instantánea todavía");
  // OL-135: dónde va el lienzo en la ventana (16:9, centrado); hasta la primera medida, la ventana entera.
  const [marco, setMarco] = useState<Rectangulo | null>(null);

  useEffect(() => {
    const medir = () => setMarco(rectanguloDelLienzo(window.innerWidth, window.innerHeight));
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  useEffect(() => {
    if (!abierta) return;
    const supabase = clienteNavegador();
    if (!supabase) return;
    const lienzo = lienzoRef.current;
    if (!lienzo) return;
    const ctx = lienzo.getContext("2d");
    if (!ctx) return;
    const ruta = rutaInstantanea(obraId);
    let cancelado = false;
    let canal: ReturnType<typeof abrirCanalObra> | null = null;

    // OL-135: el bitmap mide siempre LIENZO (16:9); la ventana solo cambia la escala con que se muestra (.marco),
    // así que cambiar de tamaño ni borra ni deforma lo pintado.
    lienzo.width = LIENZO.ancho;
    lienzo.height = LIENZO.alto;

    function puntoDe(mensaje: MensajePosicion | MensajeTrazo, hasta: Punto, pintando: boolean): PuntoDeMando {
      return { x: hasta.x, y: hasta.y, color: mensaje.color, diametro: diametroDelPuntoDePosicion(mensaje.trazo, mensaje.grosor), pintando };
    }
    // Sonda (OL-126): las últimas 12 lecturas, con la latencia de cada mensaje (marcas del mando + reloj de aquí).
    function anotar(evento: string, mensaje: { remitente: string; enviado?: number; muestra?: number }, recibido: number, puntosN: number) {
      if (!sonda) return;
      const lectura: LecturaSonda = { evento, remitente: mensaje.remitente.slice(0, 8), puntos: puntosN, latencias: latenciasDe(mensaje, recibido, Date.now()), recibido };
      setLecturas((l) => [...l.slice(-11), lectura]);
    }

    // --- Instantánea: subir ---
    async function subir(motivo: MotivoInstantanea) {
      if (!lienzo || subiendoRef.current || cancelado) return;
      if (!tocaSubirInstantanea({ motivo, hayTrazosNuevos: hayTrazosNuevosRef.current, ultimaSubidaMs: ultimaSubidaRef.current, ahoraMs: Date.now() })) return;
      subiendoRef.current = true;
      hayTrazosNuevosRef.current = false; // lo que se pinte durante la subida cuenta para la siguiente
      const inicio = Date.now();
      try {
        const png = await pngDeLaPared(lienzo);
        if (!png) throw new Error("sin PNG");
        const { error } = await supabase!.storage.from(BUCKET_INSTANTANEAS).upload(ruta, png, { upsert: true, contentType: "image/png" });
        if (error) throw error;
        ultimaSubidaRef.current = Date.now();
        if (sonda) setInstantanea(`instantánea subida (${motivo}): ${Math.round(png.size / 1024)} KB en ${Date.now() - inicio} ms, ${new Date().toLocaleTimeString()}`);
      } catch (e) {
        hayTrazosNuevosRef.current = true; // se reintenta en la siguiente revisión
        if (sonda) setInstantanea(`instantánea (${motivo}) FALLÓ: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        subiendoRef.current = false;
      }
    }
    // Al cerrarse la pestaña no hay tiempo para el cliente de Storage: un `fetch` con `keepalive` al mismo endpoint,
    // con el token de sesión ya en mano. Chrome limita el cuerpo con keepalive a 64 KB: si el PNG pesa más, esta
    // subida se pierde y vale la última periódica (a lo sumo 20 s atrás). Es lo mejor que se puede hacer al salir.
    function subirAlCerrar() {
      if (!lienzo || !tokenRef.current) return;
      if (!tocaSubirInstantanea({ motivo: "cierre", hayTrazosNuevos: hayTrazosNuevosRef.current, ultimaSubidaMs: ultimaSubidaRef.current, ahoraMs: Date.now() })) return;
      const { supabaseUrl, supabaseAnonKey } = configPublica();
      if (!supabaseUrl || !supabaseAnonKey) return;
      const b64 = lienzo.toDataURL("image/png").split(",")[1] ?? "";
      const bytes = atob(b64);
      const cuerpo = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) cuerpo[i] = bytes.charCodeAt(i);
      hayTrazosNuevosRef.current = false;
      fetch(`${supabaseUrl}/storage/v1/object/${BUCKET_INSTANTANEAS}/${ruta}`, {
        method: "POST",
        keepalive: true,
        headers: { Authorization: `Bearer ${tokenRef.current}`, apikey: supabaseAnonKey, "content-type": "image/png", "x-upsert": "true" },
        body: cuerpo,
      }).catch(() => {});
    }
    function alOcultarse() {
      if (document.visibilityState === "hidden") void subir("cierre");
    }
    document.addEventListener("visibilitychange", alOcultarse);
    window.addEventListener("pagehide", subirAlCerrar);
    const revision = setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      tokenRef.current = data.session?.access_token ?? null;
      void subir("periodica");
    }, REVISAR_INSTANTANEA_MS);

    // --- Arranque: la instantánea de fondo (si la hay) y, después, el canal ---
    async function iniciar() {
      const { data: png } = await supabase!.storage.from(BUCKET_INSTANTANEAS).download(ruta);
      if (cancelado || !lienzo) return;
      if (png && png.size > 0) {
        try {
          const imagen = await createImageBitmap(png);
          if (cancelado) return;
          // OL-135: en el lienzo 16:9; una instantánea vieja con otra proporción va centrada y sin estirarse.
          const r = encajar(imagen.width, imagen.height, LIENZO.ancho, LIENZO.alto);
          ctx!.drawImage(imagen, r.left, r.top, r.width, r.height);
          ultimaSubidaRef.current = Date.now();
          if (sonda) setInstantanea(`instantánea de fondo: ${Math.round(png.size / 1024)} KB`);
        } catch {
          // un PNG ilegible no detiene la pared: se pinta desde cero y la siguiente subida lo reemplaza
        }
      }
      if (cancelado) return;
      canal = abrirCanalObra(supabase!, obraId);
      canal.on("presence", { event: "sync" }, () => {
        if (!canal) return;
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
              const hasta = puntoEnPared(ultima.posicion, LIENZO.ancho, LIENZO.alto);
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
        if (!acreditaCercania(mensaje)) return; // sin `cerca: true` (OL-127) no pinta: fricción, no seguridad
        // El trazo se dibuja en cuanto llega (OL-126): sin esperar a ninguna transición ni cuadro.
        const { segmentos, hasta } = siguientesSegmentos(puntos.current.get(mensaje.remitente) ?? null, mensaje.puntos, LIENZO.ancho, LIENZO.alto);
        for (const segmento of segmentos) trazarSegmento(ctx!, segmento, mensaje);
        hayTrazosNuevosRef.current = true;
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
        if (!acreditaCercania(mensaje)) return; // OL-127
        const hasta = puntoEnPared(mensaje.posicion, LIENZO.ancho, LIENZO.alto);
        puntos.current.set(mensaje.remitente, hasta); // el trazo que venga arranca donde está el punto tenue
        setPuntosDeMando((actuales) => ({ ...actuales, [mensaje.remitente]: puntoDe(mensaje, hasta, false) }));
        anotar("posicion", mensaje, recibido, 1);
      });
      // «Borrar la pared» (OL-126, desde Administración): solo si la obra registra un borrado reciente — lo escribe
      // la acción de servidor, que exige administración; un mando que mande «borrar» por su cuenta no pasa de aquí.
      // Entonces se limpia el lienzo y se sube el lienzo vacío como instantánea; los puntos y la obra siguen.
      canal.on("broadcast", { event: EVENTO_BORRAR }, async ({ payload }) => {
        const recibido = Date.now();
        if (!esMensajeBorrarValido(payload)) return;
        const { data } = await supabase!.from("obras_colectivas").select("borrado_pared_en").eq("id", obraId).maybeSingle();
        if (cancelado || !lienzo) return;
        const registrado = (data as { borrado_pared_en?: string | null } | null)?.borrado_pared_en ?? null;
        if (!borradoReciente(registrado, Date.now(), ultimoBorradoRef.current)) {
          anotar("borrar ignorado (sin borrado registrado por Administración)", payload, recibido, 0);
          return;
        }
        ultimoBorradoRef.current = Date.parse(registrado!);
        ctx!.clearRect(0, 0, LIENZO.ancho, LIENZO.alto);
        anotar("borrar", payload, recibido, 0);
        void subir("borrado");
      });
      canal.subscribe();
    }
    void iniciar();

    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", alOcultarse);
      window.removeEventListener("pagehide", subirAlCerrar);
      clearInterval(revision);
      canal?.unsubscribe();
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
  // OL-135: cuántos px de pantalla mide una unidad del lienzo (1 hasta la primera medida).
  const escala = marco ? marco.width / LIENZO.ancho : 1;

  return (
    <main className={styles.pared}>
      <div className={styles.titulo}>
        <p>Obra colectiva</p>
        <h1>{nombre}</h1>
      </div>
      <div className={styles.marco} style={marco ? { left: marco.left, top: marco.top, width: marco.width, height: marco.height } : undefined}>
        <canvas ref={lienzoRef} className={styles.lienzo} aria-label="Lienzo colectivo, se pinta en vivo" />
        {/* Un punto por mando (OL-120): se mueve solo con `transform`; el lienzo no se toca. Solo el punto tenue se
            suaviza, y poco (SUAVIZADO_PUNTO_MS): el trazo ya está dibujado cuando el punto se desliza (OL-126).
            OL-135: posición y diámetro están en unidades del lienzo y se escalan con él; el diámetro no baja de
            DIAMETRO_PUNTO_MIN_PX en pantalla, para que el punto siga viéndose en un teléfono. */}
        {Object.entries(puntosDeMando).map(([remitente, p]) => {
          const d = Math.max(DIAMETRO_PUNTO_MIN_PX, p.diametro * escala);
          return (
            <span
              key={remitente}
              className={styles.puntoDeMando}
              data-pintando={p.pintando ? "true" : "false"}
              aria-hidden="true"
              style={{
                width: `${d}px`,
                height: `${d}px`,
                background: p.color,
                // Blanco (OL-126) no se vería sobre la pared casi blanca: lleva un borde fino.
                boxShadow: esTintaClara(p.color) ? "0 0 0 1px rgba(0, 0, 0, 0.35)" : undefined,
                opacity: p.pintando ? 1 : OPACIDAD_PUNTO_TENUE,
                transform: `translate(${p.x * escala - d / 2}px, ${p.y * escala - d / 2}px)`,
                transition: `transform ${SUAVIZADO_PUNTO_MS}ms linear, opacity 0.2s`,
              }}
            />
          );
        })}
      </div>
      {qr && (
        <figure className={styles.qr}>
          <CodigoQr svg={qr} alt="Código QR: abre el mando de esta obra" />
          <figcaption>Escanea para pintar</figcaption>
        </figure>
      )}
      {sonda && (
        <pre className={styles.sonda} aria-hidden="true">
          {`sonda · ${lecturas.length ? `${porSegundo} mensajes en el último segundo` : "sin mensajes todavía"} · ${instantanea}\n` +
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
