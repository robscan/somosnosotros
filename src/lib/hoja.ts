/**
 * Las alturas de la hoja de Lugares (docs/rediseno/50, P5b): lógica pura, sin DOM. La hoja es un solo contenedor que
 * desplaza y cada altura es una posición de ese desplazamiento (`y`): 0 es la más baja (solo asoma su franja) y la más
 * alta es `llena`, cuando la hoja ya cubre la pantalla y el mismo gesto sigue desplazando su contenido. La lista tiene
 * tres (recogida · asoma · llena) y la ficha otras tres (recogida · media · llena). Quien la dibuja mide las posiciones
 * en el DOM; aquí se decide hasta dónde sube cada una, cuál es la altura más cercana, cuándo asentarse y a dónde lleva el asa.
 */
export type Detente = "recogida" | "asoma" | "media" | "llena";
export type Detentes = Partial<Record<Detente, number>>;

/** Una diferencia de un píxel ya es «estar en la altura»: el desplazamiento de un dedo nunca cae exacto. */
const HOLGURA = 1;

/** La altura más cercana a `y`; si dos empatan, la más baja. */
export function masCercano(y: number, detentes: Detentes): Detente {
  let mejor: Detente = "recogida";
  let distancia = Infinity;
  for (const [nombre, valor] of Object.entries(detentes) as [Detente, number][]) {
    const d = Math.abs(valor - y);
    if (d < distancia) {
      distancia = d;
      mejor = nombre;
    }
  }
  return mejor;
}

/** En qué altura está la hoja: `llena` en cuanto llega arriba (y desde ahí, todo lo que baje del contenido); si no, la más cercana. */
export function estadoEn(y: number, detentes: Detentes): Detente {
  return detentes.llena !== undefined && y >= detentes.llena - HOLGURA ? "llena" : masCercano(y, detentes);
}

/**
 * A dónde asentar la hoja cuando el dedo deja de moverla: la altura más cercana, o nada si ya está en ella o si está
 * llena (ahí el gesto desplaza el contenido y no hay nada que asentar).
 */
export function destinoAlAsentar(y: number, detentes: Detentes): number | null {
  if (detentes.llena !== undefined && y >= detentes.llena - HOLGURA) return null;
  const destino = detentes[masCercano(y, detentes)];
  return destino !== undefined && Math.abs(destino - y) > HOLGURA ? destino : null;
}

/** Tocar el asa: la siguiente altura hacia arriba y, desde la más alta, la más baja. */
export function alturaSiguiente(y: number, detentes: Detentes): number {
  const alturas = Object.values(detentes).sort((a, b) => a - b);
  return alturas.find((v) => v > y + HOLGURA) ?? alturas[0] ?? 0;
}

/**
 * El desplazamiento con el que la hoja llega a «llena»: el borde de arriba del cuerpo (en `arribaDelCuerpo` cuando la hoja va en `y`)
 * sube hasta el techo. Cada hoja llega hasta donde le toca: la ficha es una página y cubre hasta arriba de la hoja; la lista vive bajo sus
 * filtros y se detiene justo debajo de la fila de contexto (`bajoLaFila`), que se queda siempre a la vista. Las posiciones se miden en la
 * ventana y `y` las lleva a desplazamiento, así el resultado no depende de dónde esté la hoja al medir.
 */
export function alturaLlena(m: { arribaDelCuerpo: number; y: number; arribaDeLaHoja: number; bajoLaFila: number; conFicha: boolean }): number {
  const techo = m.conFicha ? m.arribaDeLaHoja : m.bajoLaFila;
  return Math.round(m.arribaDelCuerpo - techo + m.y);
}

/**
 * A dónde va la hoja cuando cambia lo que la persona ve (un filtro, un chip, otra ciudad): recogida sube a asoma para enseñar el
 * resultado; en asoma o llena se queda donde está.
 */
export function detenteAlFiltrar(detente: Detente): Detente {
  return detente === "recogida" ? "asoma" : detente;
}

/**
 * ¿La cabecera de la ficha ya es compacta —la portada oscurecida detrás del título—? Desde que la portada se desplazó fuera y, en
 * el teléfono, con la hoja recogida. Es la misma regla que manda a la pastilla de Seguir (docs/rediseno/50, OL-237): mientras la
 * portada está a la vista la pastilla vive en el héroe, arriba a la derecha, junto al menú «···»; en cuanto la cabecera se
 * vuelve compacta, flota abajo.
 */
export function cabeceraCompacta(y: number, compactaDesde: number, detente: Detente, enPanel: boolean): boolean {
  return y >= compactaDesde || (!enPanel && detente === "recogida");
}
