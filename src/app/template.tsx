"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import styles from "./template.module.css";

/** Las tres secciones raíz de la barra inferior (`NavInferior`), por su ruta exacta (sin filtros ni ciudad). */
const SECCION_DE_RUTA: Record<string, string> = { "/": "agenda", "/lugares": "lugares", "/artistas": "artistas" };

/**
 * Fundido de 200 ms al cambiar de sección en la barra inferior (Agenda ↔ Lugares ↔ Artistas), como pidió el
 * founder (L46, docs/rediseno/38-transiciones-cargador.md). Nada más se anima aquí: ni las pestañas dentro de una
 * sección (viven en `ui/Pestanas`), ni las fichas (tienen su propio `template.tsx`), ni la barra o el scroll
 * repuesto por la memoria de pantalla.
 *
 * `template.tsx` se vuelve a montar en cada navegación (a propósito, así lo documenta Next): por eso la sección
 * "anterior" no puede vivir en el estado de este componente (se perdería en cada remontaje) y vive en una
 * variable de módulo. Solo cuenta como cambio de sección cuando la ruta es una de las tres raíces y la sección
 * anterior conocida era otra; así no se dispara por filtros, por la ciudad (query, que `usePathname` ya ignora)
 * ni por la primera carga (`ultimaSeccion` empieza en null: doc 38, "qué no se anima").
 */
let ultimaSeccion: string | null = null;

export default function Plantilla({ children }: { children: ReactNode }) {
  const ruta = usePathname();
  const seccion = SECCION_DE_RUTA[ruta];
  const esCambioDeSeccion = ultimaSeccion !== null && !!seccion && seccion !== ultimaSeccion;
  // La variable de módulo se actualiza en un efecto (tras pintar), no durante el render: React exige que
  // renderizar sea puro y esto es, a propósito, un efecto secundario que sobrevive al remontaje de `template.tsx`.
  useEffect(() => {
    if (seccion) ultimaSeccion = seccion;
  });
  if (!esCambioDeSeccion) return <>{children}</>;
  return (
    <div key={seccion} className={styles.fundido}>
      {children}
    </div>
  );
}
