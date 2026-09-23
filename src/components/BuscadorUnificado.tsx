"use client";

import { useEffect, useRef, useState } from "react";
import { buscarUnificado } from "@/app/accionesBuscar";
import type { ResultadoBusqueda } from "@/lib/buscarUnificado";
import type { SeccionBuscador } from "@/lib/inicio";
import ResultadosBusqueda from "./ResultadosBusqueda";
import styles from "./BuscadorUnificado.module.css";

/**
 * El buscador único (docs/rediseno/41, OL-153, bitácora 188): la misma lupa de siempre, dentro de `ui/Cabecera`, pero
 * los resultados salen agrupados por tipo — eventos, lugares y artistas — reutilizando las tres consultas de
 * `accionesBuscar.buscarUnificado` (una por tabla). Qué grupo va primero y cuántos trae cada uno lo manda la
 * sección donde ya está la persona (`ResultadosBusqueda`, que hace el pintado): desde Inicio, los tres van igual;
 * desde Lugares o Artistas, la propia sección sale primero y con más resultados. Vive sobre el contenido, debajo de
 * la cabecera (que ya mide `--alto-cabecera`), como la sugerencia de Lugares en el mapa — no un componente nuevo de
 * pantalla completa, ni una barra de búsqueda propia.
 */
export default function BuscadorUnificado({ seccion, q, ciudadSlug, ciudadNombre }: { seccion: SeccionBuscador; q: string; ciudadSlug: string | null; ciudadNombre: string }) {
  const [resultado, setResultado] = useState<ResultadoBusqueda | null>(null);
  const vigente = useRef(0);
  useEffect(() => {
    const texto = q.trim();
    if (texto.length < 2) return;
    const propio = ++vigente.current;
    const espera = window.setTimeout(() => {
      void buscarUnificado(texto, ciudadNombre).then((r) => {
        if (vigente.current === propio) setResultado(r);
      });
    }, 250);
    return () => window.clearTimeout(espera);
  }, [q, ciudadNombre]);

  const texto = q.trim();
  if (texto.length < 2) return <p className={styles.aviso}>Escribe al menos dos letras.</p>;
  if (!resultado) return <p className={styles.aviso} role="status">Buscando…</p>;
  return <ResultadosBusqueda seccion={seccion} resultado={resultado} texto={texto} ciudadSlug={ciudadSlug} />;
}
