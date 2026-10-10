"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { anilloDe, clasificarAhora, etiquetaAhora, rotuloCirculo, type EventoAhora } from "@/lib/ahora";
import { degradadoCSS, paletaPropia } from "@/lib/coloresCartel";
import type { Asistencia } from "@/lib/deslizar";
import Historias from "./Historias";
import SimboloBlanco from "./SimboloBlanco";
import styles from "./FilaAhora.module.css";

type Props = {
  eventos: EventoAhora[];
  /** La hora con que el servidor pintó la fila: el primer pintado del teléfono es igual (sin desajuste al hidratar); después, la del teléfono. */
  ahoraServidor: string;
  asistencias: Record<string, Exclude<Asistencia, null>> | null;
  conSesion: boolean;
};

/** Lo ya visto en esta visita (el anillo apagado). Por sesión del navegador: mañana, o en otra pestaña nueva, vuelve a estar encendido. */
const LLAVE_VISTOS = "somosnosotros:ahora-vistos";
function leerVistos(): Set<string> {
  try {
    const crudo = sessionStorage.getItem(LLAVE_VISTOS);
    const lista: unknown = crudo ? JSON.parse(crudo) : [];
    return new Set(Array.isArray(lista) ? lista.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}
function guardarVistos(vistos: Set<string>) {
  try {
    sessionStorage.setItem(LLAVE_VISTOS, JSON.stringify([...vistos].slice(-100)));
  } catch {
    // Sin almacenamiento (ventana privada): el anillo se apaga solo mientras dure la pantalla.
  }
}

/**
 * La fila de círculos «Ahora» de Inicio (OL-359; prototipo firmado `barra-ahora.html`, bitácora 388): debajo de las dos barras, antes de los
 * carriles, y se va al bajar (no es fija). Cada círculo es un evento de `clasificarAhora` (Ahora · En un rato · exposiciones · Hoy · Mañana, tope 8):
 * su cartel recortado o, sin cartel, su degradado con el símbolo SN; el anillo dice la urgencia y se apaga al verlo. Tocar abre las historias en él.
 * Se recalcula cada minuto. Sin nada que mostrar no pinta nada, ni hueco.
 */
export default function FilaAhora({ eventos, ahoraServidor, asistencias, conSesion }: Props) {
  const [ahora, setAhora] = useState(() => new Date(ahoraServidor));
  const [vistos, setVistos] = useState<Set<string>>(() => new Set());
  const [abierta, setAbierta] = useState<{ indice: number; teclado: boolean } | null>(null);
  const botones = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const tic = () => setAhora(new Date());
    queueMicrotask(() => {
      tic();
      setVistos(leerVistos());
    });
    // Al minuto en punto, y cada minuto: «En 30 min» pasa a «En 29 min» cuando el reloj del teléfono cambia.
    let intervalo: ReturnType<typeof setInterval> | undefined;
    const espera = setTimeout(() => {
      tic();
      intervalo = setInterval(tic, 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => {
      clearTimeout(espera);
      clearInterval(intervalo);
    };
  }, []);

  // Con las historias abiertas la lista no cambia bajo el dedo: se congela en la hora con que se abrió.
  const [congelada, setCongelada] = useState<Date | null>(null);
  const avisos = useMemo(() => clasificarAhora(eventos, congelada ?? ahora), [eventos, ahora, congelada]);

  const ver = useCallback((clave: string) => {
    setVistos((antes) => {
      if (antes.has(clave)) return antes;
      const nuevos = new Set(antes).add(clave);
      guardarVistos(nuevos);
      return nuevos;
    });
  }, []);

  const cerrar = useCallback(
    (ultima: number) => {
      const origen = abierta ? botones.current[ultima] ?? botones.current[abierta.indice] : null;
      setAbierta(null);
      setCongelada(null);
      origen?.focus({ preventScroll: true });
    },
    [abierta],
  );

  if (!avisos.length) return null;

  return (
    <section className={styles.fila} aria-label="Lo de hoy">
      <ul className={styles.lista}>
        {avisos.map((a, i) => {
          const anillo = anilloDe(a.tipo, vistos.has(a.e.clave));
          return (
            <li key={a.e.clave} className={styles.item}>
              <button
                ref={(b) => {
                  botones.current[i] = b;
                }}
                type="button"
                className={styles.circulo}
                aria-label={`${etiquetaAhora(a, ahora)}: ${a.e.titulo}`}
                data-anillo={anillo}
                onClick={(ev) => {
                  setCongelada(ahora);
                  // `detail === 0`: lo abrió el teclado (Intro o Espacio), no un toque.
                  setAbierta({ indice: i, teclado: ev.detail === 0 });
                }}
              >
                <span className={styles.anillo} data-anillo={anillo}>
                  {a.e.cartel ? (
                    <Image className={styles.foto} src={a.e.cartel} alt="" width={66} height={66} sizes="96px" />
                  ) : (
                    <span className={styles.sinCartel} style={{ background: degradadoCSS(paletaPropia(a.e.id)) }}>
                      <SimboloBlanco className={styles.simbolo} />
                    </span>
                  )}
                </span>
                <small className={styles.rotulo} data-ahora={a.tipo === "ahora" || undefined}>
                  {rotuloCirculo(a, ahora)}
                </small>
              </button>
            </li>
          );
        })}
      </ul>
      {abierta && (
        <Historias
          avisos={avisos}
          inicial={abierta.indice}
          conTeclado={abierta.teclado}
          ahora={congelada ?? ahora}
          asistencias={asistencias}
          conSesion={conSesion}
          onVer={ver}
          onCerrar={cerrar}
        />
      )}
    </section>
  );
}
