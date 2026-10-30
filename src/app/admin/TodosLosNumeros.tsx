"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import Hoja from "@/components/ui/Hoja";
import styles from "./admin.module.css";

/** La marca de la hoja en el estado de su entrada del historial (como la capa del mapa de una ficha, `MapaFicha`). */
const LLAVE = "somosnosotrosNumeros";
const enHoja = () => (window.history.state as Record<string, unknown> | null)?.[LLAVE] === true;

type Cuerpo = { cuerpo: ReactNode; fallos: number };

/**
 * «Ver todos los números ›» y su hoja (OL-494, variante C firmada del prototipo OL-493): lo que salió de la portada se pide al servidor al
 * abrirla (`numerosEnHoja.tsx`, que la página pasa como prop) y se guarda mientras la portada está en pantalla. Abrirla deja una entrada propia
 * en el historial, añadida con el toque (Safari del iPhone salta las que no): el Atrás del sistema la cierra sin salir de Administración, y la
 * ✕, el velo y Escape la consumen igual. Si se vuelve a esa entrada (desde una lista abierta en un desglose, o al recargar), la hoja se abre.
 */
export default function TodosLosNumeros({ abrir }: { abrir: () => Promise<Cuerpo | null> }) {
  const [abierta, setAbierta] = useState(false);
  const [cuerpo, setCuerpo] = useState<Cuerpo | "fallo" | null>(null);
  const [cargando, iniciar] = useTransition();
  const pedido = useRef(false);

  const pedir = useCallback(() => {
    pedido.current = true;
    iniciar(async () => {
      try {
        setCuerpo((await abrir()) ?? "fallo");
      } catch {
        setCuerpo("fallo");
      }
    });
  }, [abrir]);
  const mostrar = useCallback(() => {
    setAbierta(true);
    if (!pedido.current) pedir();
  }, [pedir]);

  // Atrás o adelante a la entrada de la hoja la abre; a cualquier otra, la cierra.
  useEffect(() => {
    const alVolver = () => (enHoja() ? mostrar() : setAbierta(false));
    window.addEventListener("popstate", alVolver);
    if (enHoja()) alVolver();
    return () => window.removeEventListener("popstate", alVolver);
  }, [mostrar]);

  function alTocar() {
    window.history.pushState({ ...(window.history.state ?? {}), [LLAVE]: true }, "");
    mostrar();
  }
  const cerrar = useCallback(() => {
    if (enHoja()) window.history.back(); // el `popstate` la cierra
    else setAbierta(false);
  }, []);
  const otraVez = () => {
    setCuerpo(null);
    pedir();
  };

  return (
    <>
      <button type="button" className={`${styles.enlace} ${styles.verTodos}`} aria-haspopup="dialog" onClick={alTocar}>
        Ver todos los números ›
      </button>
      {abierta && (
        <Hoja etiqueta="Todos los números" titulo="Todos los números" onCerrar={cerrar}>
          {cuerpo && cuerpo !== "fallo" ? (
            <>
              {cuerpo.cuerpo}
              {cuerpo.fallos > 0 && (
                <button type="button" className={`${styles.enlace} ${styles.verTodos}`} disabled={cargando} onClick={otraVez}>
                  {cargando ? "Intentando…" : "Intentar de nuevo"}
                </button>
              )}
            </>
          ) : cuerpo === "fallo" ? (
            <p className={styles.error} role="alert">
              No pudimos leer los números.
              <button type="button" className={styles.enlace} disabled={cargando} onClick={otraVez}>
                {cargando ? "Intentando…" : "Intentar de nuevo"}
              </button>
            </p>
          ) : (
            <p className={styles.vacio} role="status" aria-busy="true">
              Contando…
            </p>
          )}
        </Hoja>
      )}
    </>
  );
}
