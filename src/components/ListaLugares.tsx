"use client";

import { useEffect, useRef, useState } from "react";
import type { LugarLista } from "@/lib/lugares";
import { siguienteTanda, tandaInicial } from "@/lib/tandas";
import CargarMas from "./ui/CargarMas";
import RenglonLugar from "./RenglonLugar";
import { useCanalDePantalla } from "./useCanalDeListas";
import { useCentinela } from "./useCentinela";
import { useSeguirEnLista, type AvisosLista } from "./useSeguirEnLista";
import styles from "./ListaLugares.module.css";

type Props = {
  /** Los lugares que se ven, ya filtrados y en su orden. */
  lugares: LugarLista[];
  /** La distancia de cada uno desde quien mira, si se sabe (la lista se ordena por cercanía). */
  km: Map<string, number>;
  /** Los lugares que la persona sigue (se ven y cambian con el botón de cada renglón); null = sin sesión. */
  seguidos: string[] | null;
  /** Para la pregunta de avisos tras el primer Seguir; null = sin sesión. */
  avisos: AvisosLista | null;
  /** Tocar un renglón abre el lugar (la ficha dentro de la hoja) en vez de ir a su página. */
  alAbrir: (lugar: LugarLista) => void;
};

/**
 * Los renglones de la hoja de Lugares (docs/rediseno/50, P5b): foto, nombre, qué es, calle y kilómetros, próximo evento y el
 * botón de seguir. Ya llegan filtrados (Filtros y la lupa viven en la fila de contexto de `VistaLugares`, que los comparte con
 * el mapa) y en su orden: por cercanía con la ubicación, y alfabético sin ella. La cantidad y lo que dice una lista vacía son
 * de la propia hoja. Si la pantalla puso su canal (Lugares), el aviso y la pregunta son de ella.
 */
export default function ListaLugares({ lugares, km, seguidos, avisos, alAbrir }: Props) {
  const seguir = useSeguirEnLista("lugar", seguidos, avisos, useCanalDePantalla());

  // Carga progresiva (OL-158): la lista ya está completa en el teléfono (como siempre); lo que se reparte en tandas es cuánto
  // se pinta de una vez, para que la primera línea de contenido se vea antes en una ciudad con muchos lugares. Se acota de nuevo
  // cada vez que cambia el total (otro filtro, Cercanos, una búsqueda).
  const [mostrados, setMostrados] = useState(() => tandaInicial(lugares.length).mostrados);
  const totalAnteriorRef = useRef(lugares.length);
  useEffect(() => {
    if (totalAnteriorRef.current !== lugares.length) {
      totalAnteriorRef.current = lugares.length;
      setMostrados(tandaInicial(lugares.length).mostrados);
    }
  }, [lugares.length]);
  const hayMas = mostrados < lugares.length;
  const centinelaRef = useCentinela(hayMas, () => setMostrados((m) => siguienteTanda(lugares.length, m).mostrados));

  return (
    <section className={styles.lista} aria-label="Lugares">
      <ul>
        {lugares.slice(0, mostrados).map((l) => (
          <RenglonLugar key={l.id} lugar={l} km={km.get(l.id)} boton={seguir.boton(l.id, l.nombre)} alAbrir={() => alAbrir(l)} />
        ))}
      </ul>
      <CargarMas hayMas={hayMas} centinelaRef={centinelaRef} onVerMas={() => setMostrados((m) => siguienteTanda(lugares.length, m).mostrados)} />
      {seguir.extras}
    </section>
  );
}
