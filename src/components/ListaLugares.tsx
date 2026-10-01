"use client";

import { useEffect, useRef, useState } from "react";
import { primerosDeGrupos, type GrupoLugares, type LugarLista } from "@/lib/lugares";
import { siguienteTanda, tandaInicial } from "@/lib/tandas";
import CargarMas from "./ui/CargarMas";
import Grupo from "./ui/Grupo";
import RenglonLugar from "./RenglonLugar";
import { useCanalDePantalla } from "./useCanalDeListas";
import { useCentinela } from "./useCentinela";
import { useSeguirEnLista, type AvisosLista } from "./useSeguirEnLista";
import styles from "./ListaLugares.module.css";

type Props = {
  /** Los lugares que se ven, ya filtrados y en sus grupos y su orden (`agruparLugares`). */
  grupos: GrupoLugares<LugarLista>[];
  /** La distancia de cada uno desde quien mira, si se sabe (cada grupo se ordena por cercanía). */
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
 * botón de seguir, en dos grupos con su título pegado (`ui/Grupo`, como los días de Agenda): «Con eventos» y «Sin eventos próximos»
 * (OL-249, ajuste 7). Ya llegan filtrados (Filtros y la lupa viven en la fila de contexto de `VistaLugares`, que los comparte con
 * el mapa) y en su orden. La cantidad y lo que dice una lista vacía son de la propia hoja. Si la pantalla puso su canal (Lugares), el
 * aviso y la pregunta son de ella.
 */
export default function ListaLugares({ grupos, km, seguidos, avisos, alAbrir }: Props) {
  const seguir = useSeguirEnLista("lugar", seguidos, avisos, useCanalDePantalla());

  // Carga progresiva (OL-158): la lista ya está completa en el teléfono (como siempre); lo que se reparte en tandas es cuánto
  // se pinta de una vez, para que la primera línea de contenido se vea antes en una ciudad con muchos lugares. Se acota de nuevo
  // cada vez que cambia el total (otro filtro, Cercanos, una búsqueda).
  // La tanda cuenta renglones de toda la lista: se llena el primer grupo y, si sobra, el siguiente.
  const total = grupos.reduce((suma, g) => suma + g.lugares.length, 0);
  const [mostrados, setMostrados] = useState(() => tandaInicial(total).mostrados);
  const totalAnteriorRef = useRef(total);
  useEffect(() => {
    if (totalAnteriorRef.current !== total) {
      totalAnteriorRef.current = total;
      setMostrados(tandaInicial(total).mostrados);
    }
  }, [total]);
  const hayMas = mostrados < total;
  const centinelaRef = useCentinela(hayMas, () => setMostrados((m) => siguienteTanda(total, m).mostrados));

  return (
    <section className={styles.lista} aria-label="Lugares">
      {primerosDeGrupos(grupos, mostrados).map((g) => (
        <Grupo key={g.clave} titulo={g.titulo} cuenta={g.total}>
          {g.lugares.map((l) => (
            <RenglonLugar key={l.id} lugar={l} km={km.get(l.id)} boton={seguir.boton(l.id, l.nombre)} alAbrir={() => alAbrir(l)} />
          ))}
        </Grupo>
      ))}
      <CargarMas hayMas={hayMas} centinelaRef={centinelaRef} onVerMas={() => setMostrados((m) => siguienteTanda(total, m).mostrados)} />
      {seguir.extras}
    </section>
  );
}
