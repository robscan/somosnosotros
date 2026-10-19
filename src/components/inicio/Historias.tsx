"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cambiarAsistencia } from "@/app/eventos/acciones";
import { IconoMarcador, IconoRuta } from "@/components/ui/Iconos";
import { SIN_ACERCAR } from "@/lib/acercar";
import { etiquetaAhora, metaAhora, type AvisoAhora } from "@/lib/ahora";
import { coloresDeImagen, conAlfa, paletaPropia, type Paleta } from "@/lib/coloresCartel";
import type { Asistencia } from "@/lib/deslizar";
import { useZoomImagen } from "../useZoomImagen";
import SimboloBlanco from "./SimboloBlanco";
import styles from "./Historias.module.css";

type Props = {
  avisos: AvisoAhora[];
  inicial: number;
  /** Se abrió con el teclado: el foco va a «Cerrar» (se ve); con un toque, a la historia misma, sin marco. */
  conTeclado: boolean;
  ahora: Date;
  asistencias: Record<string, Exclude<Asistencia, null>> | null;
  conSesion: boolean;
  onVer: (clave: string) => void;
  /** Con la historia en que se cerró: el foco vuelve a su círculo. */
  onCerrar: (indice: number) => void;
};

/** Toque corto: al soltar antes de esto y sin moverse, pasa de historia; más largo, era «mantener» (pausa) y sigue donde iba. */
const TOQUE_CORTO = 300;
/** Deslizar hacia abajo más que esto cierra; a un lado, cambia de historia. */
const CIERRA_DY = 90;
const CAMBIA_DX = 50;
/** Lo que tarda en irse (`--duracion`): mientras, ya no recibe toques. */
const SALIDA_MS = 200;
/** Tras soltar un enlace o un botón, lo más que el avance espera a su clic (si llega antes, sigue en ese momento): el clic nunca encuentra otra
 *  historia ni, en la última, la capa cerrada. */
const ESPERA_CLIC = 300;

/** Colores ya leídos de cada cartel en esta visita (OL-360 los guardará con el evento). */
const paletas = new Map<string, Paleta>();

const FOCABLES = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Las historias de la fila «Ahora» (OL-359; prototipo firmado `barra-ahora.html`, bitácora 388), a pantalla completa sobre todo. El cartel entero
 * sobre un degradado vivo de sus propios colores (o, sin cartel, la historia tipográfica con el símbolo SN sobre una paleta propia) y partículas,
 * solo con la historia abierta y nunca con «Reducir movimiento». Segmentos de 6 s; los gestos de Instagram: tocar a la derecha avanza y en el
 * tercio izquierdo retrocede, mantener pausa, deslizar hacia abajo cierra. Los arrastres terminan solo con `pointerup` y `pointercancel` (también en
 * `window`), nunca con `pointerleave` (Safari táctil lo dispara en el primer movimiento). Abajo, «Ver más información», «Me interesa» y «Cómo llegar».
 * No toca la URL ni el historial (filtrar no es navegar): al cerrar, Inicio está donde estaba. Teclado: flechas, Espacio y Escape; el foco no sale.
 * El cartel se acerca como en el visor (OL-408, `useZoomImagen`): pellizcar hasta 4× y, acercado, uno o dos dedos lo recorren (o la rueda, en
 * escritorio). Mientras está acercado la historia se queda quieta: el avance se pausa, deslizar mueve el cartel y un toque no pasa de historia, lo
 * devuelve a 1× y el avance sigue. Sin doble toque para acercar: el toque simple ya avanza y esperar un segundo toque retrasaría cada uno.
 * Con un dedo sobre un enlace o un botón el avance también espera (OL-419): la historia no pasa ni se cierra bajo el dedo. Al tocar un enlace de la
 * app la historia se va en ese momento (`onNavigate={salir}`): si la ficha tarda o no llega, la capa ya no recibe toques ni frena el desplazamiento.
 */
export default function Historias({ avisos, inicial, conTeclado, ahora, asistencias, conSesion, onVer, onCerrar }: Props) {
  const [indice, setIndice] = useState(inicial);
  const [abierta, setAbierta] = useState(false);
  const [pausada, setPausada] = useState(false);
  const [oculta, setOculta] = useState(false);
  // Se lee ya en el primer pintado (la historia solo se monta en el teléfono, al tocar un círculo): si empezara en `false`, el segmento «actual»
  // pintaría su animación con la duración de 0,01 ms de «Reducir movimiento» y su `animationend` pasaría a la siguiente antes de verla.
  const [reducido, setReducido] = useState(() => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [arrastre, setArrastre] = useState(0);
  /** El cartel acercado: la historia se pausa y los gestos son del cartel. */
  const [acercada, setAcercada] = useState(false);
  /** Un dedo (o el ratón) sobre un enlace o un botón: el avance espera a que se suelte y a su clic. */
  const [pulsando, setPulsando] = useState(false);
  const control = useRef<number | null>(null);
  const reanudar = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [interesan, setInteresan] = useState<Record<string, boolean>>(() => Object.fromEntries(Object.entries(asistencias ?? {}).map(([id, e]) => [id, e === "me_interesa"])));
  /** El aviso de «Me interesa» es de su historia: al pasar a otra ya no se dice. */
  const [aviso, setAviso] = useState<{ clave: string; texto: string } | null>(null);
  const raiz = useRef<HTMLElement>(null);
  const cerrar = useRef<HTMLButtonElement>(null);
  const marco = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const polvo = useRef<HTMLCanvasElement>(null);
  const zoom = useZoomImagen<HTMLDivElement>({ rueda: true, alCambiar: setAcercada, bordes: "imagen" });
  const { caja: centro, imagen: cartel } = zoom;
  const indiceRef = useRef(indice);
  const cerrandoRef = useRef(false);
  const a = avisos[Math.min(indice, avisos.length - 1)];
  const colores = useRef<Paleta>(a.e.cartel ? (paletas.get(a.e.cartel) ?? paletaPropia(a.e.id)) : paletaPropia(a.e.id));

  useEffect(() => {
    indiceRef.current = indice;
  }, [indice]);

  const seguirTrasControl = useCallback(() => {
    clearTimeout(reanudar.current);
    reanudar.current = undefined;
    setPulsando(false);
  }, []);
  useEffect(() => () => clearTimeout(reanudar.current), []);

  const salir = useCallback(() => {
    if (cerrandoRef.current) return;
    cerrandoRef.current = true;
    document.documentElement.removeAttribute("data-historia"); // la página vuelve a desplazarse ya, sin esperar al desmontaje
    setAbierta(false);
    setTimeout(() => onCerrar(indiceRef.current), reducido ? 0 : SALIDA_MS);
  }, [onCerrar, reducido]);

  const pasar = useCallback(
    (d: number) => {
      const n = indiceRef.current + d;
      if (n >= avisos.length) salir();
      else setIndice(Math.max(0, n));
    },
    [avisos.length, salir],
  );

  // Abrir: entra con su transición, el foco va dentro y la página de atrás no se desplaza (sin tocar su scroll: al cerrar, Inicio está igual).
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const alCambiar = () => setReducido(mq.matches);
    alCambiar();
    mq.addEventListener("change", alCambiar);
    const entra = setTimeout(() => setAbierta(true), 16);
    (conTeclado ? cerrar.current : raiz.current)?.focus({ preventScroll: true });
    // La página de atrás no se desplaza mientras la historia está abierta: `html[data-historia]` (globals), nunca un estilo en línea que
    // pudiera quedarse si el desmontaje se retrasa (al navegar a la ficha) o si otra capa ya lo había puesto. Se quita al cerrar, al
    // desmontar y si la página se va (`pagehide`): el desplazamiento de Inicio nunca queda muerto.
    const html = document.documentElement;
    html.setAttribute("data-historia", "");
    const soltarPagina = () => html.removeAttribute("data-historia");
    const visible = () => setOculta(document.hidden);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("pagehide", soltarPagina);
    return () => {
      clearTimeout(entra);
      mq.removeEventListener("change", alCambiar);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("pagehide", soltarPagina);
      soltarPagina();
    };
    // Solo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cada historia que se ve apaga su anillo; sus colores, de la paleta propia hasta que su cartel cargue.
  useEffect(() => {
    onVer(a.e.clave);
    colores.current = (a.e.cartel && paletas.get(a.e.cartel)) || paletaPropia(a.e.id);
  }, [a.e.clave, a.e.cartel, a.e.id, onVer]);

  // Otra historia (con las flechas del teclado, que siguen pasando acercada) empieza con su cartel a 1×.
  const reiniciarZoom = zoom.reiniciar;
  useEffect(() => reiniciarZoom(), [a.e.clave, reiniciarZoom]);

  // El degradado vivo: un lienzo de 36×72 con cuatro luces que se mueven despacio (el navegador lo estira: el estirado ya es el desenfoque) y,
  // encima, 36 partículas. Solo con la historia abierta y visible; con «Reducir movimiento», un cuadro quieto y sin partículas.
  useEffect(() => {
    const g = lienzo.current?.getContext("2d");
    const p = polvo.current;
    const ctxP = p?.getContext("2d");
    if (!g || !p || !ctxP) return;
    const r = p.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ancho = r.width || 390, alto = r.height || 844;
    p.width = ancho * dpr;
    p.height = alto * dpr;
    ctxP.setTransform(dpr, 0, 0, dpr, 0, 0);
    const particulas = Array.from({ length: 36 }, () => ({ x: Math.random() * ancho, y: Math.random() * alto, r: 0.6 + Math.random() * 1.8, v: 6 + Math.random() * 16, a: 0.12 + Math.random() * 0.45, f: Math.random() * 6.28 }));
    const dibujar = (ms: number) => {
      const s = ms / 1000, W = 36, H = 72, c = colores.current;
      g.globalAlpha = 1;
      g.fillStyle = c[0];
      g.fillRect(0, 0, W, H);
      const luces: [number, number, number, string][] = [
        [0.25 + 0.18 * Math.sin(s * 0.31), 0.2 + 0.1 * Math.cos(s * 0.27), 0.7, c[2]],
        [0.8 + 0.12 * Math.cos(s * 0.23), 0.45 + 0.14 * Math.sin(s * 0.19), 0.45, c[3]],
        [0.35 + 0.22 * Math.sin(s * 0.17 + 1), 0.9 + 0.06 * Math.cos(s * 0.29), 0.8, c[1]],
        [0.65 + 0.18 * Math.sin(s * 0.21 + 2), 0.12 + 0.1 * Math.sin(s * 0.33), 0.45, c[1]],
      ];
      for (const [x, y, rr, color] of luces) {
        const grad = g.createRadialGradient(x * W, y * H, 0, x * W, y * H, rr * H);
        grad.addColorStop(0, conAlfa(color, 0.95));
        grad.addColorStop(1, conAlfa(color, 0));
        g.fillStyle = grad;
        g.fillRect(0, 0, W, H);
      }
      ctxP.clearRect(0, 0, ancho, alto);
      if (reducido) return;
      for (const q of particulas) {
        let y = (q.y - s * q.v) % alto;
        if (y < 0) y += alto;
        const x = q.x + Math.sin(s * 0.6 + q.f) * 8, brillo = q.a * (0.55 + 0.45 * Math.sin(s * 1.3 + q.f));
        ctxP.beginPath();
        ctxP.arc(x, y, q.r, 0, 6.283);
        ctxP.fillStyle = `rgba(255,255,255,${brillo.toFixed(3)})`;
        ctxP.fill();
      }
    };
    dibujar(9000);
    if (reducido || oculta) return;
    let id = requestAnimationFrame(function bucle(ms) {
      dibujar(ms);
      id = requestAnimationFrame(bucle);
    });
    return () => cancelAnimationFrame(id);
  }, [reducido, oculta]);

  // Los gestos. Un toque sobre un botón o un enlace es suyo; el resto de la historia es la superficie del gesto. Los dedos sobre el cartel son
  // además del zoom: con un segundo dedo (pellizco) o con el cartel acercado, el gesto de la historia se suelta y todo es del cartel.
  const gesto = useRef<{ x: number; y: number; t: number; id: number; fuera: boolean } | null>(null);
  const { tocar: tocarZoom, mover: moverZoom, soltar: soltarZoom, dedos, acercada: estaAcercada, poner: ponerZoom } = zoom;
  const soltar = useCallback(
    (ev: { clientX: number; clientY: number; pointerId: number; type?: string }, cancelado: boolean) => {
      const enZoom = dedos();
      const toqueZoom = soltarZoom(ev);
      const g = gesto.current;
      if (!g || g.id !== ev.pointerId) {
        // El último dedo del cartel: el avance sigue (si quedó acercado, sigue en pausa por `acercada`). Acercado, un toque lo devuelve a 1×; nunca
        // pasa de historia.
        if (enZoom > 0 && dedos() === 0) {
          setPausada(false);
          if (toqueZoom && !cancelado && estaAcercada()) ponerZoom(SIN_ACERCAR, true);
        }
        return;
      }
      gesto.current = null;
      setArrastre(0);
      setPausada(false);
      if (cancelado) return;
      const dy = ev.clientY - g.y, dx = ev.clientX - g.x, duro = performance.now() - g.t;
      if (dy > CIERRA_DY) return salir();
      if (Math.abs(dx) > CAMBIA_DX && Math.abs(dx) > Math.abs(dy)) return pasar(dx < 0 ? 1 : -1);
      if (duro < TOQUE_CORTO && Math.abs(dx) < 12 && Math.abs(dy) < 12) {
        // Fuera del marco (tableta y escritorio): cierra, como tocar el velo de una hoja.
        if (g.fuera) return salir();
        const r = marco.current?.getBoundingClientRect();
        if (r) pasar(ev.clientX - r.left < r.width * 0.3 ? -1 : 1);
      }
    },
    [pasar, salir, dedos, soltarZoom, estaAcercada, ponerZoom],
  );
  useEffect(() => {
    const arriba = (ev: PointerEvent) => {
      if (ev.pointerId !== control.current) return soltar(ev, false);
      // Se soltó el control: su clic llega enseguida y el avance sigue entonces (`onClickCapture`); si no llega (el dedo salió del control), al
      // acabar la espera.
      control.current = null;
      clearTimeout(reanudar.current);
      reanudar.current = setTimeout(seguirTrasControl, ESPERA_CLIC);
    };
    const cancela = (ev: PointerEvent) => {
      if (ev.pointerId !== control.current) return soltar(ev, true);
      control.current = null;
      seguirTrasControl();
    };
    window.addEventListener("pointerup", arriba);
    window.addEventListener("pointercancel", cancela);
    return () => {
      window.removeEventListener("pointerup", arriba);
      window.removeEventListener("pointercancel", cancela);
    };
  }, [soltar, seguirTrasControl]);

  // Teclado: flechas pasan, Espacio pausa, Escape cierra; Tab no sale de la historia.
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") salir();
      else if (ev.key === "ArrowRight") pasar(1);
      else if (ev.key === "ArrowLeft") pasar(-1);
      else if (ev.key === " " && !(ev.target as Element | null)?.closest?.("a, button")) {
        ev.preventDefault();
        setPausada((p) => !p);
      } else if (ev.key === "Tab" && raiz.current) {
        const focables = [...raiz.current.querySelectorAll<HTMLElement>(FOCABLES)];
        if (!focables.length) return;
        const primero = focables[0], ultimo = focables.at(-1)!;
        const dentro = raiz.current.contains(document.activeElement);
        if (ev.shiftKey && (!dentro || document.activeElement === primero || document.activeElement === raiz.current)) {
          ev.preventDefault();
          ultimo.focus();
        } else if (!ev.shiftKey && (!dentro || document.activeElement === ultimo)) {
          ev.preventDefault();
          primero.focus();
        }
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [pasar, salir]);

  async function alternarInteres() {
    const id = a.e.id;
    const si = !interesan[id];
    setInteresan((x) => ({ ...x, [id]: si }));
    setAviso(null);
    let guardado = false;
    try {
      guardado = await cambiarAsistencia(id, si ? "me_interesa" : null);
    } catch {
      guardado = false;
    }
    if (!guardado) setInteresan((x) => ({ ...x, [id]: !si }));
    setAviso({ clave: a.e.clave, texto: guardado ? (si ? "Te interesa" : "Quitado de «Me interesa»") : "No se pudo guardar" });
  }

  const e = a.e;
  const etiqueta = etiquetaAhora(a, ahora);
  const interesa = !!interesan[e.id];
  const titulo = e.titulo.length > 70 ? "muyLargo" : e.titulo.length > 42 ? "largo" : "corto";
  // También mientras entra y se va: al irse (por ejemplo, al tocar «Ver más información») ninguna otra historia cuenta como vista.
  const pausa = pausada || oculta || pulsando || !abierta;

  // En `body`: una capa fija no puede quedar dentro de un contenedor con transformación (la transición de pantalla), o deja de cubrir todo.
  return createPortal(
    <section
      ref={raiz}
      className={styles.historias}
      role="dialog"
      aria-modal="true"
      aria-label="Historias de hoy"
      tabIndex={-1}
      data-abierta={abierta || undefined}
      data-pausada={pausa || acercada || undefined}
      data-sin-cartel={!e.cartel || undefined}
      data-arrastrando={arrastre > 0 || undefined}
      style={arrastre > 0 ? { transform: `translateY(${arrastre}px) scale(${1 - Math.min(arrastre, 400) / 2000})` } : undefined}
      onPointerDown={(ev) => {
        // Un enlace o un botón: el toque es suyo, sin captura (su clic llega); solo se pausa el avance mientras el dedo siga abajo.
        if ((ev.target as Element).closest("a, button")) {
          clearTimeout(reanudar.current);
          control.current = ev.pointerId;
          setPulsando(true);
          return;
        }
        if (cartel.current?.contains(ev.target as Node) || dedos() > 0 || estaAcercada()) tocarZoom(ev);
        try {
          raiz.current?.setPointerCapture(ev.pointerId);
        } catch {
          // Sin captura (un puntero sintético): el `pointerup` de `window` cierra el gesto igual.
        }
        setPausada(true);
        if (dedos() > 1 || estaAcercada()) {
          gesto.current = null;
          setArrastre(0);
          return;
        }
        gesto.current = { x: ev.clientX, y: ev.clientY, t: performance.now(), id: ev.pointerId, fuera: !marco.current?.contains(ev.target as Node) };
      }}
      onPointerMove={(ev) => {
        moverZoom(ev);
        const g = gesto.current;
        if (!g || g.id !== ev.pointerId) return;
        const dy = ev.clientY - g.y;
        setArrastre(dy > 10 ? dy : 0);
      }}
      onClickCapture={() => {
        if (reanudar.current !== undefined) seguirTrasControl();
      }}
      onContextMenu={(ev) => ev.preventDefault()}
    >
      <canvas ref={lienzo} className={styles.degradado} width={36} height={72} aria-hidden="true" />
      <canvas ref={polvo} className={styles.particulas} aria-hidden="true" data-quieto={reducido || undefined} />
      <div ref={marco} className={styles.capa}>
        <div className={styles.segmentos} aria-hidden="true">
          {avisos.map((x, i) => (
            <span
              key={i === indice ? `${x.e.clave}-actual` : x.e.clave}
              data-estado={i < indice ? "visto" : i === indice ? (reducido ? "visto" : "actual") : undefined}
              onAnimationEnd={i === indice && !reducido ? () => pasar(1) : undefined}
            />
          ))}
        </div>
        <header className={styles.cabecera}>
          <p className={styles.linea}>
            <span className={styles.etiqueta} data-tipo={a.tipo}>
              {etiqueta}
            </span>
            <small>{metaAhora(a)}</small>
          </p>
          {e.cartel && <h2 className={styles.titulo}>{e.titulo}</h2>}
          <button ref={cerrar} type="button" className={styles.cerrar} aria-label="Cerrar" onClick={salir}>
            <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div ref={centro} className={styles.centro} data-acercada={acercada || undefined}>
          {e.cartel ? (
            <Image
              key={e.cartel}
              ref={cartel}
              className={styles.cartel}
              src={e.cartel}
              alt={`Cartel: ${e.titulo}`}
              width={768}
              height={960}
              sizes="(max-width: 600px) 100vw, 600px"
              draggable={false}
              onLoad={(ev) => {
                const src = e.cartel!;
                const c = paletas.get(src) ?? coloresDeImagen(ev.currentTarget);
                if (!c) return;
                paletas.set(src, c);
                if (avisos[indiceRef.current]?.e.cartel === src) colores.current = c;
              }}
            />
          ) : (
            <div className={styles.tipografica}>
              <SimboloBlanco className={styles.sello} />
              <span className={styles.cuando}>
                {etiqueta} · {metaAhora(a).split(" · ")[0]}
              </span>
              <h2 className={styles.grande} data-largo={titulo}>
                {e.titulo}
              </h2>
              <span className={styles.lugar}>{[e.sitio, e.parte].filter(Boolean).join(" · ")}</span>
            </div>
          )}
        </div>
        <footer className={styles.acciones}>
          {/* «Ver más información» (founder, 14 oct: «no se entiende ficha»). Al tocarlo la historia se va ya (`salir`: suelta el desplazamiento de la
              página y la capa deja de recibir toques), sin esperar a que la ficha llegue: si tarda o no llega, Inicio no se queda trabado (OL-412, OL-419).
              `onNavigate` solo avisa de una navegación dentro de la app: abrirlo en otra pestaña deja la historia abierta. */}
          <Link className={styles.ficha} href={e.href} onNavigate={salir}>
            Ver más información
          </Link>
          {conSesion ? (
            <button type="button" className={styles.icono} aria-pressed={interesa} aria-label={interesa ? "Te interesa" : "Me interesa"} onClick={alternarInteres}>
              <IconoMarcador fill={interesa ? "currentColor" : "none"} />
            </button>
          ) : (
            <Link className={styles.icono} aria-label="Me interesa" href={`/entrar?siguiente=${encodeURIComponent(`${e.href}?accion=me_interesa`)}`} onNavigate={salir}>
              <IconoMarcador />
            </Link>
          )}
          {e.destino && (
            <a className={styles.icono} aria-label="Cómo llegar" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(e.destino)}`} target="_blank" rel="noopener noreferrer">
              <IconoRuta />
            </a>
          )}
        </footer>
        <p className={styles.aviso} role="status">
          {aviso?.clave === e.clave ? aviso.texto : ""}
        </p>
      </div>
    </section>,
    document.body,
  );
}
