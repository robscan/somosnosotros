import { enCamino, type EstadoTrabajo } from "@/lib/redes/reglas";

/** Un trabajo de la cola que la pantalla enseña «Publicando…» (o «Reintentando…»). */
export type Vivo = { id: string; reintentando: boolean };
/** Lo que responde `estadosTrabajos`: el trabajo entero (o, en una respuesta corta, su estado y su intento). */
export type Estados = Record<string, Pick<EstadoTrabajo, "estado" | "reintentando"> & Partial<EstadoTrabajo>>;

/** ¿La respuesta dice algo nuevo de lo que va en camino? Que terminó (publicado o no se pudo) o que pasó a otro intento. */
export function hayCambio(vivos: readonly Vivo[], m: Estados): boolean {
  return vivos.some((v) => m[v.id] && (!enCamino(m[v.id]) || m[v.id].reintentando !== v.reintentando));
}

/**
 * OL-506: el sondeo de `useAlDia`, sin React ni el documento para poder probarlo con un reloj falso. Cada `cada` ms (solo con algo en camino, solo
 * con la pantalla a la vista y sin dos preguntas a la vez) pregunta por esos trabajos y, si algo cambió, entrega la respuesta (`alCambiar`): quien
 * la recibe cambia la línea del renglón; nada vuelve a pedir la pantalla. `pregunta()` pregunta ya (al volver a la app).
 */
export function sondear(
  vivos: readonly Vivo[],
  o: { preguntar: (ids: string[]) => Promise<Estados>; alCambiar: (m: Estados) => void; visible: () => boolean; cada: number },
): { pregunta: () => void; parar: () => void } {
  let vivo = true;
  let enVuelo = false;
  const pregunta = () => {
    if (!vivos.length || enVuelo || !vivo || !o.visible()) return;
    enVuelo = true;
    o.preguntar(vivos.map((v) => v.id))
      .then(
        (m) => {
          if (vivo && hayCambio(vivos, m)) o.alCambiar(m);
        },
        () => undefined,
      )
      .finally(() => {
        enVuelo = false;
      });
  };
  const reloj = vivos.length ? setInterval(pregunta, o.cada) : null;
  return {
    pregunta,
    parar: () => {
      vivo = false;
      if (reloj) clearInterval(reloj);
    },
  };
}
