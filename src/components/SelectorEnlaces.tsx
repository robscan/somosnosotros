"use client";

import { type CSSProperties, type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { etiquetaEnlace, LIMITE_ENLACES, LIMITE_TITULO_ENLACE, reconocerEnlace, type Enlace } from "@/lib/enlaces";
import { indiceDestino, mover } from "@/lib/reordenar";
import Campo from "./ui/Campo";
import IconoRed from "./ui/IconoRed";
import { IconoAgarre, IconoCerrar } from "./ui/Iconos";
import Limpiar from "@/components/ui/Limpiar";
import limpiar from "@/components/ui/Limpiar.module.css";
import styles from "./SelectorEnlaces.module.css";

type Props = { inicial: Enlace[]; error?: string };

/** Un arrastre en curso: `indice` es el puesto de donde partió el renglón levantado (no cambia mientras se
 * arrastra); `objetivo` es a qué puesto apunta ahora mismo (mismo número que usa `indiceDestino`). */
type Arrastre = { indice: number; objetivo: number; inicioY: number; desplazamiento: number; altoRenglon: number };

/**
 * Enlaces y redes sin elegir la red (docs/rediseno/09-enlaces-flujo-y-estados.md): la persona pega un
 * enlace, un @usuario o un teléfono; el sistema reconoce de qué red es y lo enseña con su icono.
 * Tantos como haga falta; se quitan con ✕. Viaja al servidor como JSON en un campo oculto.
 *
 * Reordenar (OL-184): con más de un enlace, cada renglón lleva un agarre a la izquierda. Arrastre con eventos
 * de puntero (`onPointerDown` + `setPointerCapture`), que es lo único que funciona con el dedo en Safari iOS —
 * el drag and drop nativo de HTML5 no dispara con touch. El renglón levantado sigue al dedo con `transform:
 * translateY`; los demás renglones que tienen que apartarse lo hacen con una transición corta (120ms) para
 * abrir el hueco. La lógica de a qué puesto apunta el arrastre vive aparte, en `lib/reordenar.ts` (pura,
 * probada), este componente solo mide el DOM y aplica el resultado. Con el foco en el agarre, las flechas
 * arriba/abajo mueven el enlace un puesto (mismo `mover`) para quien no puede arrastrar (teclado, VoiceOver);
 * un `aria-live` anuncia el nuevo puesto. Con un solo enlace no hay nada que reordenar: el agarre no se
 * muestra (decisión de esta pieza, más simple que mostrarlo apagado).
 */
export default function SelectorEnlaces({ inicial, error }: Props) {
  const [enlaces, setEnlaces] = useState<Enlace[]>(inicial);
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  const [anuncio, setAnuncio] = useState("");
  const filas = useRef<Map<string, HTMLLIElement>>(new Map());
  const agarres = useRef<Map<string, HTMLButtonElement>>(new Map());
  const focoPendiente = useRef<string | null>(null);
  const lleno = enlaces.length >= LIMITE_ENLACES;
  const conAgarre = enlaces.length > 1;

  // Reordenar por teclado mueve el DOM del renglón (cambia de puesto en la lista); el foco se queda en el
  // agarre del MISMO enlace, no en el puesto, así que se repone tras la nueva pintura.
  useEffect(() => {
    if (!focoPendiente.current) return;
    agarres.current.get(focoPendiente.current)?.focus();
    focoPendiente.current = null;
  }, [enlaces]);

  function agregar() {
    const e = reconocerEnlace(texto);
    if (!e) {
      setAviso(texto.trim() ? "No parece un enlace, un @usuario ni un teléfono." : null);
      return;
    }
    if (enlaces.some((x) => x.url === e.url)) {
      setAviso("Ese ya está.");
      return;
    }
    setEnlaces([...enlaces, e]);
    setTexto("");
    setAviso(null);
  }
  function quitar(e: Enlace) {
    setEnlaces(enlaces.filter((x) => x !== e));
  }
  // El título de cada enlace lo puede cambiar la persona (OL-168): se guarda tal cual escribió, aunque quede
  // igual a la etiqueta automática; un campo vacío no se rellena solo, así "queda vacío" es una opción real.
  function cambiarTitulo(url: string, titulo: string) {
    setEnlaces((prev) => prev.map((x) => (x.url === url ? { ...x, titulo: titulo.replace(/[\r\n]+/g, " ").slice(0, LIMITE_TITULO_ENLACE) } : x)));
  }

  function anunciarPuesto(e: Enlace, indice: number, total: number) {
    setAnuncio(`${etiquetaEnlace(e)} ahora en el puesto ${indice + 1} de ${total}`);
  }

  // La distancia entre el mismo punto de dos renglones consecutivos (alto real + el `gap` de `.lista`), medida
  // en el DOM en vez de leída del CSS: así vale lo mismo si el renglón crece (título largo, error debajo).
  function altoRenglon(indice: number): number {
    const urls = enlaces.map((e) => e.url);
    const actual = filas.current.get(urls[indice]);
    const siguiente = indice + 1 < urls.length ? filas.current.get(urls[indice + 1]) : null;
    const anterior = indice > 0 ? filas.current.get(urls[indice - 1]) : null;
    if (actual && siguiente) return siguiente.getBoundingClientRect().top - actual.getBoundingClientRect().top;
    if (anterior && actual) return actual.getBoundingClientRect().top - anterior.getBoundingClientRect().top;
    return actual?.getBoundingClientRect().height ?? 0;
  }

  function iniciarArrastre(ev: ReactPointerEvent<HTMLButtonElement>, indice: number) {
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    ev.currentTarget.setPointerCapture(ev.pointerId);
    setArrastre({ indice, objetivo: indice, inicioY: ev.clientY, desplazamiento: 0, altoRenglon: altoRenglon(indice) });
  }
  function seguirArrastre(ev: ReactPointerEvent<HTMLButtonElement>) {
    setArrastre((a) => {
      if (!a) return a;
      const desplazamiento = ev.clientY - a.inicioY;
      const objetivo = indiceDestino(desplazamiento, a.indice, a.altoRenglon, enlaces.length);
      return { ...a, desplazamiento, objetivo };
    });
  }
  function soltarArrastre() {
    if (arrastre && arrastre.objetivo !== arrastre.indice) {
      const nuevo = mover(enlaces, arrastre.indice, arrastre.objetivo);
      setEnlaces(nuevo);
      anunciarPuesto(nuevo[arrastre.objetivo], arrastre.objetivo, nuevo.length);
    }
    setArrastre(null);
  }
  function moverConTeclado(indice: number, delta: number) {
    const destino = indice + delta;
    if (destino < 0 || destino >= enlaces.length) return;
    const url = enlaces[indice].url;
    const nuevo = mover(enlaces, indice, destino);
    setEnlaces(nuevo);
    focoPendiente.current = url;
    anunciarPuesto(nuevo[destino], destino, nuevo.length);
  }

  // Cómo se ve cada renglón mientras hay un arrastre en curso: el levantado sigue al dedo sin transición; los
  // que tiene que saltar el hueco se apartan un `altoRenglon` con una transición de 120ms; el resto, quieto.
  function estiloFila(indice: number): CSSProperties | undefined {
    if (!arrastre) return undefined;
    if (indice === arrastre.indice) {
      return { transform: `translateY(${arrastre.desplazamiento}px)`, transition: "none", zIndex: 2, boxShadow: "var(--sombra-panel)", position: "relative" };
    }
    const { indice: origen, objetivo, altoRenglon: alto } = arrastre;
    let salto = 0;
    if (origen < objetivo && indice > origen && indice <= objetivo) salto = -alto;
    else if (objetivo < origen && indice >= objetivo && indice < origen) salto = alto;
    return { transform: salto ? `translateY(${salto}px)` : undefined, transition: "transform 120ms ease" };
  }

  return (
    <div className={styles.selector}>
      {enlaces.length > 0 && (
        <p className={styles.etiqueta}>Redes y contacto</p>
      )}
      {enlaces.length > 0 && (
        <ul className={styles.lista} aria-label="Enlaces">
          {enlaces.map((e, i) => (
            <li
              key={e.url}
              ref={(el) => {
                if (el) filas.current.set(e.url, el);
                else filas.current.delete(e.url);
              }}
              className={`${styles.enlace} ${conAgarre ? styles.conAgarre : ""}`}
              style={estiloFila(i)}
            >
              {conAgarre && (
                <button
                  type="button"
                  ref={(el) => {
                    if (el) agarres.current.set(e.url, el);
                    else agarres.current.delete(e.url);
                  }}
                  className={styles.agarre}
                  aria-label={`Mover ${etiquetaEnlace(e)}`}
                  onPointerDown={(ev) => iniciarArrastre(ev, i)}
                  onPointerMove={seguirArrastre}
                  onPointerUp={soltarArrastre}
                  onPointerCancel={soltarArrastre}
                  onKeyDown={(ev) => {
                    if (ev.key === "ArrowUp") {
                      ev.preventDefault();
                      moverConTeclado(i, -1);
                    } else if (ev.key === "ArrowDown") {
                      ev.preventDefault();
                      moverConTeclado(i, 1);
                    }
                  }}
                >
                  <IconoAgarre width={20} height={20} />
                </button>
              )}
              <IconoRed red={e.red} />
              <Campo
                etiqueta="Título"
                name={`titulo-enlace-${i}`}
                value={e.titulo ?? etiquetaEnlace(e)}
                onChange={(ev) => cambiarTitulo(e.url, ev.target.value)}
                maxLength={LIMITE_TITULO_ENLACE}
                mostrarContador
                ayuda={e.url.replace(/^https?:\/\/(www\.)?/, "")}
                autoComplete="off"
                // La ✕ de "quitar el enlace" ya vive fuera del campo, a 8px: con la ✕ de "vaciar" del campo
                // ahí también se confundían (hallazgo del gestor). Vaciar el título a mano se sigue pudiendo
                // con Retroceso; vacío = etiqueta automática (limpiarTituloEnlace en el servidor).
                sinLimpiar
              />
              <button type="button" className={styles.quitar} onClick={() => quitar(e)} aria-label={`Quitar ${etiquetaEnlace(e)}`}>
                <IconoCerrar width={18} height={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className={styles.soloLector} aria-live="polite">
        {anuncio}
      </p>
      {!lleno && (
        <>
          <label htmlFor="campo-enlace" className={styles.etiqueta}>
            {enlaces.length ? "Otro enlace" : "Redes y contacto (opcional)"}
          </label>
          <div className={styles.fila}>
            <span className={limpiar.caja}>
              <input
                id="campo-enlace"
                type="text"
                className={styles.campo}
                value={texto}
                onChange={(e) => {
                  setTexto(e.target.value);
                  setAviso(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregar();
                  }
                }}
                onBlur={() => texto.trim() && agregar()}
                placeholder="Ej. instagram.com/losvecinos, @losvecinos, vimeo.com/…"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                aria-describedby={aviso || error ? "campo-enlace-aviso" : undefined}
                aria-invalid={!!aviso || !!error}
              />
              <Limpiar visible={!!texto} />
            </span>
            <button type="button" className={styles.agregar} onClick={agregar} disabled={!texto.trim()}>
              Añadir
            </button>
          </div>
          {(aviso || error) && (
            <p id="campo-enlace-aviso" className={styles.aviso} role="alert">
              {aviso ?? error}
            </p>
          )}
          {!aviso && !error && enlaces.length === 0 && <p className={styles.ayuda}>Pégalo y reconocemos la red: Instagram, YouTube, Vimeo, Spotify, SoundCloud, WhatsApp, tu sitio…</p>}
        </>
      )}
      <input type="hidden" name="enlaces" value={JSON.stringify(enlaces)} />
    </div>
  );
}
