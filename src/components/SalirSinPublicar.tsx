"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { ponerGuardia, quitarGuardia, type Guardia } from "@/lib/guardiaSalida";
import Boton from "./ui/Boton";
import Hoja from "./ui/Hoja";
import styles from "./SalirSinPublicar.module.css";

/** Huella de lo que hay en el formulario, campo por campo (un archivo, por su nombre). */
function huellaDe(form: HTMLFormElement): string {
  return [...new FormData(form).entries()].map(([k, v]) => `${k}=${typeof v === "string" ? v : v.name}`).join("&");
}

/**
 * Guardia de salida estándar de las tres altas (pedido del founder, 2026-09-16): Atrás o la ✕ preguntan solo si el
 * formulario cambió respecto a cómo se abrió. Se compara campo por campo, no si está vacío: un alta que llega con el
 * lugar o el artista puestos, o un duplicado, no pregunta hasta que se toca algo. `olvidar` corre al confirmar la
 * salida (el borrador del alta de evento). Devuelve la hoja "¿Salir sin publicar?" para pintarla al final del formulario.
 */
export function useSalirSinPublicar(form: RefObject<HTMLFormElement | null>, activa: boolean, olvidar?: () => void) {
  const inicial = useRef<string | null>(null);
  const [salida, setSalida] = useState<(() => void) | null>(null);
  useLayoutEffect(() => {
    if (!activa) return;
    // La huella se toma en cuanto el formulario está en pantalla, antes de que vuelva un borrador (eso ya cuenta como cambio).
    if (inicial.current === null && form.current) inicial.current = huellaDe(form.current);
    const g: Guardia = (continuar) => {
      if (form.current && huellaDe(form.current) !== inicial.current) setSalida(() => continuar);
      else continuar();
    };
    ponerGuardia(g);
    return () => quitarGuardia(g);
  }, [activa, form]);
  if (!salida) return null;
  const seguir = () => setSalida(null);
  const salir = () => {
    setSalida(null);
    olvidar?.();
    quitarGuardia();
    salida();
  };
  return (
    <Hoja etiqueta="Salir sin publicar" onCerrar={seguir}>
      <div className={styles.salida}>
        <h3>¿Salir sin publicar?</h3>
        <p>Se borra lo que escribiste.</p>
        <Boton type="button" onClick={seguir}>
          Seguir editando
        </Boton>
        <Boton type="button" variante="peligro" onClick={salir}>
          Salir y borrar
        </Boton>
      </div>
    </Hoja>
  );
}
