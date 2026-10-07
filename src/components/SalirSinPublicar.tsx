"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { hayGuardia, ponerGuardia, quitarGuardia, type Guardia } from "@/lib/guardiaSalida";
import Boton from "./ui/Boton";
import Hoja from "./ui/Hoja";
import styles from "./SalirSinPublicar.module.css";

/** Huella de lo que hay en los formularios de la pantalla, campo por campo (un archivo, por su nombre). */
function huellaDe(pantalla: HTMLElement): string {
  return [...pantalla.querySelectorAll("form")].map((form) => [...new FormData(form).entries()].map(([k, v]) => `${k}=${typeof v === "string" ? v : v.name}`).join("&")).join("|");
}

/** Lo que dice la hoja: al publicar algo nuevo se borra lo escrito; al editar algo publicado (OL-319) se pierden los cambios. */
export type Guardar = "publicar" | "guardar";
const TEXTOS: Record<Guardar, { titulo: string; detalle: string; salir: string }> = {
  publicar: { titulo: "¿Salir sin publicar?", detalle: "Se borra lo que escribiste.", salir: "Salir y borrar" },
  guardar: { titulo: "¿Salir sin guardar?", detalle: "Se pierden los cambios que hiciste.", salir: "Salir sin guardar" },
};

/**
 * Guardia de salida estándar de la pantalla de alta (pedido del founder, 2026-09-16): Atrás o la ✕ preguntan solo si lo escrito
 * cambió respecto a cómo se abrió. Se compara campo por campo, no si está vacío: un alta que llega con el lugar o el artista
 * puestos, o un duplicado, no pregunta hasta que se toca algo. Vale para todos los formularios de la pantalla (aunque solo se vea
 * uno, lo escrito en los otros también cuenta). `olvidar` corre al confirmar la salida (lo que la pantalla guarde aparte). También avisa con `beforeunload` si se recarga o se cierra con cambios. Devuelve
 * la hoja «¿Salir sin publicar?» (o «¿Salir sin guardar?» al editar, `que`) para pintarla dentro de la pantalla.
 */
export function useSalirSinPublicar(pantalla: RefObject<HTMLElement | null>, olvidar?: () => void, que: Guardar = "publicar") {
  const inicial = useRef<string | null>(null);
  const [salida, setSalida] = useState<(() => void) | null>(null);
  useLayoutEffect(() => {
    // La huella se toma en cuanto los formularios están en pantalla, antes de que vuelva un borrador (eso ya cuenta como cambio).
    if (inicial.current === null && pantalla.current) inicial.current = huellaDe(pantalla.current);
    const g: Guardia = (continuar) => {
      if (pantalla.current && huellaDe(pantalla.current) !== inicial.current) setSalida(() => continuar);
      else continuar();
    };
    ponerGuardia(g);
    // Cerrar la pestaña, recargar o irse a otro sitio con cambios: el navegador pregunta con su propio aviso (donde lo respeta; Safari del
    // iPhone no). El atrás del navegador dentro de la app no descarga el documento y no se puede atrapar sin entradas falsas en el historial.
    const alDescargar = (e: BeforeUnloadEvent) => {
      if (!hayGuardia(g) || !pantalla.current || huellaDe(pantalla.current) === inicial.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", alDescargar);
    return () => {
      window.removeEventListener("beforeunload", alDescargar);
      quitarGuardia(g);
    };
  }, [pantalla]);
  if (!salida) return null;
  const seguir = () => setSalida(null);
  const salir = () => {
    setSalida(null);
    olvidar?.();
    quitarGuardia();
    salida();
  };
  const textos = TEXTOS[que];
  return (
    <Hoja etiqueta={textos.titulo.slice(1, -1)} onCerrar={seguir}>
      <div className={styles.salida}>
        <div className={styles.encabezado}>
          <h3>{textos.titulo}</h3>
          <p>{textos.detalle}</p>
        </div>
        <Boton type="button" onClick={seguir}>
          Seguir editando
        </Boton>
        <Boton type="button" variante="peligro" onClick={salir}>
          {textos.salir}
        </Boton>
      </div>
    </Hoja>
  );
}
