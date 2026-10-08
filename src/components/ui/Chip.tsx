"use client";

import Link from "next/link";
import { useContext, useLayoutEffect, useRef, type MouseEvent, type MouseEventHandler, type ReactNode, type Ref } from "react";
import { movimiento, sinMovimiento } from "@/lib/movimiento";
import EnCamino from "./EnCamino";
import { IconoCerrar } from "./Iconos";
import SoloLector from "./SoloLector";
import { TiraDeChips } from "./tiraDeChips";
import styles from "./Chip.module.css";

/**
 * Los cinco papeles del chip (docs/rediseno/50, § 5.2). Los tres primeros se tocan; `estado` y `sello` son rótulos.
 * - `filtro`: una opción que se elige (un día, un tipo, una disciplina). Activa = elegida, en el color de acción.
 * - `contexto`: lo que la pantalla sabe de quien mira (ciudad, Cuándo con su valor, Filtros con su cuenta); abre su hoja.
 * - `quitar`: un filtro puesto, siempre activo y con su ✕; el texto (una cadena) es lo que se quita.
 * - `estado`: lo que la persona ya decidió (Te interesa), en el tono suave del color de acción.
 * - `sello`: un dato sobre una foto (Hoy, 3 van), en vidrio.
 */
type Variante = "filtro" | "contexto" | "quitar" | "estado" | "sello";

type Props = {
  variante?: Variante;
  /** Elegido (`filtro`) o con un valor puesto (`contexto`). Sin él, el chip no es un conmutador (no lleva `aria-pressed`). */
  activo?: boolean;
  /** Antes del texto (el de un chip de contexto). */
  icono?: ReactNode;
  /** Después del texto (la flecha del chip de ciudad). */
  fin?: ReactNode;
  /** Cuántos filtros hay puestos, en un círculo junto al texto (Filtros). */
  cuenta?: number;
  /** A dónde lleva, si es un enlace: el filtro vive en la URL. */
  href?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  /** Para que quien lo pone lo coloque (un sello sobre la foto de su tarjeta). */
  className?: string;
  children: ReactNode;
};

/**
 * El chip: una sola píldora con cinco papeles. Los que se tocan miden `--alto-chip` a la vista y `--toque-min` al tacto (su
 * `::before`); sus estados son reposo, activo, en camino y deshabilitado. Con `href` es un enlace: filtrar no es navegar (founder,
 * 2026-09-17), así que reemplaza la entrada del historial en vez de apilar otra, y mientras el servidor responde el chip tocado
 * se pone en camino (founder, 2026-09-16: «a veces no pasa nada»). Con `onClick` es un botón.
 *
 * Dentro de la fila de contexto (`ui/Cabecera`) lo que se pone se nota (founder, 2026-09-30: «para que el usuario note cuando se activan»): un
 * chip `quitar` que entra, o uno que ya estaba y cambia de valor (Cuándo con su día, el tipo de un lugar), crece con el resorte de
 * `globals.css` y la fila se desliza para mostrarlo entero; al quitar uno, su ✕ lo encoge con el recorte del resorte, cierra el hueco que
 * deja y solo entonces quita el filtro. Nada se anima cuando la pantalla abre con sus filtros (la URL, la memoria de pantalla) ni con «reducir
 * movimiento»; y el chip se toca desde el primer cuadro.
 */
export function Chip({ variante = "filtro", activo, icono, fin, cuenta = 0, href, onClick, disabled = false, className, children }: Props) {
  const tira = useContext(TiraDeChips);
  const boton = useRef<HTMLButtonElement>(null);
  /** Lo que decía este chip la última vez que estuvo puesto: si es distinto (o es la primera), la persona acaba de poner algo. */
  const dicho = useRef<string | null>(null);
  const saliendo = useRef(false);
  const puesto = variante === "quitar" || (variante === "contexto" && !!activo);
  useLayoutEffect(() => {
    const chip = boton.current;
    const dice = puesto && chip ? chip.textContent : null;
    const cambio = dice !== null && dice !== dicho.current;
    dicho.current = dice;
    if (!cambio || !chip || !tira?.puesta()) return;
    tira.mostrar(chip);
    if (!sinMovimiento()) entrar(chip);
  });
  function alTocar(e: MouseEvent<HTMLButtonElement>) {
    const chip = boton.current;
    if (variante !== "quitar" || !onClick || !chip || !tira?.puesta() || sinMovimiento()) return onClick?.(e);
    if (saliendo.current) return;
    saliendo.current = true;
    salir(chip).then(() => {
      saliendo.current = false;
      onClick(e);
    });
  }
  const rotulo = variante === "estado" || variante === "sello";
  const clase = [styles.chip, styles[variante], !rotulo && styles.toque, (activo || variante === "quitar") && styles.activo, className].filter(Boolean).join(" ");
  const cuerpo = (
    <>
      {icono}
      {variante === "contexto" ? <span>{children}</span> : children}
      {cuenta > 0 && (
        <span className={styles.cuentaFiltros}>
          {cuenta}
          <SoloLector> puestos</SoloLector>
        </span>
      )}
      {variante === "quitar" ? <IconoCerrar width={16} height={16} /> : fin}
    </>
  );
  if (rotulo) return <span className={clase}>{cuerpo}</span>;
  if (href) {
    return (
      <Link href={href} scroll={false} replace className={clase} aria-current={activo ? "true" : undefined}>
        {cuerpo}
        <EnCamino className={styles.enCamino} />
      </Link>
    );
  }
  const lector = variante === "contexto" ? { "aria-haspopup": "dialog" as const } : variante === "quitar" ? { "aria-label": `Quitar ${children}` } : { "aria-pressed": activo };
  return (
    <button ref={boton} type="button" className={clase} onClick={alTocar} disabled={disabled} {...lector}>
      {cuerpo}
    </button>
  );
}

/** De qué tamaño parte un chip al entrar y a cuál llega al salir (`--escala-chip`, globals.css). */
const escalaDelChip = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--escala-chip"));

/** Un chip que se pone entra con el resorte: crece desde su borde izquierdo mientras se aclara. Su caja ya está en su sitio, así que nada
 *  se mueve y se puede tocar desde el primer cuadro. */
function entrar(chip: HTMLElement) {
  chip.animate({ opacity: [0, 1], transform: [`scale(${escalaDelChip()})`, "scale(1)"] }, movimiento("resorte"));
}

/** Un chip que se quita sale con el recorte del resorte: se encoge hacia su borde izquierdo mientras se apaga y cierra el hueco que deja (su
 *  margen de la derecha se vuelve negativo hasta su ancho más el espacio entre chips), así los que vienen detrás ya están en su sitio
 *  cuando el chip se quita de verdad. Devuelve cuándo termina. */
function salir(chip: HTMLElement) {
  const hueco = chip.offsetWidth + parseFloat(getComputedStyle(chip.parentElement!).columnGap);
  return chip.animate({ opacity: [1, 0], transform: ["scale(1)", `scale(${escalaDelChip()})`], marginRight: ["0px", `${-hueco}px`] }, { ...movimiento("salida"), fill: "forwards" }).finished;
}

/**
 * Chip que ES el campo nativo: el <input type="date|time"> va encima, invisible y del mismo tamaño,
 * para que el toque caiga en él y el teléfono abra su selector (Safari no lo abre por código).
 */
export function ChipNativo({ tipo, valor, activo, etiqueta, onCambio, ariaLabel }: { tipo: "date" | "time"; valor: string; activo: boolean; etiqueta: string; onCambio: (v: string) => void; ariaLabel: string }) {
  return (
    <span className={`${styles.chip} ${styles.toque} ${activo ? styles.activo : ""}`}>
      {etiqueta}
      <input type={tipo} className={styles.encima} value={valor} step={tipo === "time" ? 300 : undefined} onChange={(e) => onCambio(e.target.value)} aria-label={ariaLabel} />
    </span>
  );
}

/** Cuántos resultados da el chip, en chico y a la derecha del texto. */
export function Cuenta({ n }: { n: number }) {
  return <span className={styles.cuenta}>{n}</span>;
}

/**
 * Fila de chips que se desliza a lo ancho sin barra de scroll; con `envuelve`, los chips pasan al renglón de abajo (una hoja). `ref`, para quien
 * necesita deslizarla hasta un chip (la clase marcada bajo el nombre del alta de evento, OL-345).
 */
export function Chips({ children, ariaLabel, envuelve = false, ref }: { children: ReactNode; ariaLabel: string; envuelve?: boolean; ref?: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} className={envuelve ? `${styles.chips} ${styles.envuelve}` : styles.chips} role="group" aria-label={ariaLabel}>
      {children}
    </div>
  );
}
