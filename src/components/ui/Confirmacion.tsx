"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconoCerrar, IconoOk } from "./Iconos";
import useSobreLaPastilla from "./useSobreLaPastilla";
import styles from "./Confirmacion.module.css";

/** Cuánto se queda el aviso a la vista, de que aparece a que se va. Quien necesite que otra cosa dure lo mismo (el botón que ignora toques mientras avisa) usa esta cifra. */
export const CONFIRMACION_MS = 2500;
/** Lo último de ese tiempo es la salida (se desliza y se desvanece); con «reducir movimiento» no hay salida: se quita sin más. */
const SALIDA_MS = 220;
/** La vibración corta con que se acompaña un «hecho» donde el navegador la tiene (Android; en iOS no existe `navigator.vibrate`). */
const VIBRACION_MS = 25;

export type Confirmacion = {
  /** Lo que dice, llano y en pasado: «Cartel guardado en Fotos», «Enlace copiado», «No se pudo guardar». */
  texto: string;
  /** No se pudo: en vez de la palomita lleva una ✕ roja. No vibra. */
  fallo?: boolean;
};

type Visible = Confirmacion & { vez: number; saliendo: boolean };

/** Quién tiene hoy el aviso en pantalla: si otra pieza avisa mientras tanto, la anterior se quita, aunque sea de otro hook. Uno a la vez. */
let quitarLaActiva: (() => void) | null = null;

/**
 * Un aviso flotante de confirmación (OL-318; pedido del founder: «hace falta un toast o una animación de guardado que confirme claramente… terminé
 * guardando 3 veces el cartel»). Es la pieza canon de «algo se hizo»: aparece con una palomita animada (el sello de «Publicado», en chico) y dos o tres
 * palabras llanas, vibra si el teléfono puede, y se va solo a los 2,5 s. Para lo que se puede deshacer, el aviso con botón es `Hecho`.
 *
 *   const { avisar, nodo } = useConfirmacion();
 *   …  avisar({ texto: "Enlace copiado" });  avisar({ texto: "No se pudo guardar", fallo: true });
 *   …  return <>{contenido}{nodo}</>;
 *
 * Uno a la vez: un aviso nuevo reemplaza al que esté a la vista, también el de otra pieza. Va fuera de la pantalla (en `body`: una pantalla que entra de
 * lado, con su `transform`, rompería un `position: fixed`), centrado, sobre el pie del paso (`--alto-pie`), sobre la pastilla flotante de una ficha
 * (`data-flotantes`) o sobre la navegación. `role="status"` lo anuncia a quien usa lector de pantalla.
 *
 * Pendiente (hace falta otra compilación de TestFlight): en la app de iPhone, `navigator.vibrate` no existe; el latido corto saldría de `@capacitor/haptics`,
 * que todavía no está en `apps/ios/package.json`.
 */
export function useConfirmacion(): { avisar: (c: Confirmacion) => void; nodo: ReactNode } {
  const [visible, setVisible] = useState<Visible | null>(null);
  const vez = useRef(0);
  const plazos = useRef<{ salida?: ReturnType<typeof setTimeout>; fin?: ReturnType<typeof setTimeout> }>({});

  const parar = useCallback(() => {
    clearTimeout(plazos.current.salida);
    clearTimeout(plazos.current.fin);
  }, []);
  const quitar = useCallback(() => {
    parar();
    setVisible(null);
  }, [parar]);
  // Al desmontarse la pieza que avisa (la persona cambia de pantalla) el aviso se va con ella.
  useEffect(
    () => () => {
      parar();
      if (quitarLaActiva === quitar) quitarLaActiva = null;
    },
    [parar, quitar],
  );

  const avisar = useCallback(
    (c: Confirmacion) => {
      if (quitarLaActiva && quitarLaActiva !== quitar) quitarLaActiva();
      quitarLaActiva = quitar;
      parar();
      vez.current += 1;
      setVisible({ ...c, vez: vez.current, saliendo: false });
      plazos.current.salida = setTimeout(() => setVisible((v) => v && { ...v, saliendo: true }), CONFIRMACION_MS - SALIDA_MS);
      plazos.current.fin = setTimeout(quitar, CONFIRMACION_MS);
      if (!c.fallo) vibrar();
    },
    [parar, quitar],
  );

  const nodo = visible && typeof document !== "undefined" ? createPortal(<Pieza key={visible.vez} {...visible} />, document.body) : null;
  return { avisar, nodo };
}

function vibrar() {
  try {
    navigator.vibrate?.(VIBRACION_MS);
  } catch {
    // Sin vibración (o el navegador la niega): el aviso se ve igual.
  }
}

function Pieza({ texto, fallo = false, saliendo }: Visible) {
  const aviso = useSobreLaPastilla<HTMLParagraphElement>();
  return (
    <p ref={aviso} className={styles.confirmacion} role="status" aria-live="polite" data-fallo={fallo || undefined} data-saliendo={saliendo || undefined}>
      <span className={styles.sello} aria-hidden="true">
        {fallo ? <IconoCerrar /> : <IconoOk />}
      </span>
      <span>{texto}</span>
    </p>
  );
}
