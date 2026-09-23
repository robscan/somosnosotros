"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { guardarMemoria, guardarUrlSeccion, leerMemoria } from "@/lib/memoriaPantalla";

export type Seccion = "inicio" | "agenda" | "lugares" | "artistas";

/**
 * Recuerda el estado de un listado (pestaña, filtro, búsqueda) y lo devuelve al volver a la misma URL
 * (pedido del founder, 2026-09-15: volver de una ficha a la agenda no puede perder el punto de lectura).
 * Al montar, si hay memoria de esta URL, `aplicar` recibe el estado guardado antes de pintar (sin parpadeo);
 * después, cada cambio de estado se guarda y la URL queda como última de su sección para la barra inferior.
 * El scroll lo repone MemoriaScroll (global, en el layout), en cuanto la lista está en su sitio.
 */
export function useMemoriaPantalla<T>(seccion: Seccion, estado: T, aplicar: (estado: T) => void) {
  const ruta = usePathname();
  const params = useSearchParams();
  const cadena = params.toString();
  const clave = cadena ? `${ruta}?${cadena}` : ruta;

  const estadoActual = useRef(estado);
  const aplicarActual = useRef(aplicar);
  useLayoutEffect(() => {
    estadoActual.current = estado;
    aplicarActual.current = aplicar;
  });
  const estadoJson = JSON.stringify(estado ?? null);

  // Al montar: aplicar el estado guardado antes de pintar.
  useLayoutEffect(() => {
    const m = leerMemoria<T>(clave);
    if (m && m.estado !== undefined && JSON.stringify(m.estado) !== JSON.stringify(estadoActual.current)) aplicarActual.current(m.estado);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  // Cada URL que se ve queda como la última de su sección, y cada cambio de estado se guarda.
  useEffect(() => {
    guardarUrlSeccion(seccion, clave);
  }, [seccion, clave]);
  useEffect(() => {
    guardarMemoria(clave, { estado: estadoActual.current });
  }, [clave, estadoJson]);
}

/** Para listados cuyo filtro ya vive en la URL (Artistas): solo deja la URL como última de su sección. */
export default function MemoriaPantalla({ seccion }: { seccion: Seccion }) {
  const ruta = usePathname();
  const params = useSearchParams();
  const cadena = params.toString();
  useEffect(() => {
    guardarUrlSeccion(seccion, cadena ? `${ruta}?${cadena}` : ruta);
  }, [seccion, ruta, cadena]);
  return null;
}
