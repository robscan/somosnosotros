"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { pedirSalida } from "@/lib/guardiaSalida";
import styles from "./TiraTipos.module.css";

/** Lo que se puede dar de alta desde la tira. */
export type TipoDeAlta = "evento" | "lugar" | "artista";

const TIPOS: { tipo: TipoDeAlta; etiqueta: string }[] = [
  { tipo: "evento", etiqueta: "Evento" },
  { tipo: "lugar", etiqueta: "Lugar" },
  { tipo: "artista", etiqueta: "Artista" },
];

type Props = {
  /** El tipo de la pantalla en que se está: va marcado y no lleva a ningún lado. */
  actual: TipoDeAlta;
  /** A dónde lleva cada uno de los otros tipos (su alta por pasos): un enlace que reemplaza la entrada y, si hay algo escrito, pasa por la guardia de salida. */
  destinos: Partial<Record<TipoDeAlta, string>>;
  /** Dentro del pie de un paso (el primer paso del alta de lugar y del de artista, OL-315 y OL-316): una fila más del pie, que ya pone la zona segura y el anclaje sobre el teclado. */
  enPie?: boolean;
};

/**
 * La tira de tipos de las altas (docs/rediseno/50, P9; prototipo firmado): Evento · Lugar · Artista, solo enlaces entre las tres altas por
 * pasos. La usan el primer paso del alta de evento (OL-313, sola), el del alta de lugar (OL-315) y el del alta de artista (OL-316), estos dos
 * dentro del pie del paso, bajo «Siguiente», como en el prototipo `lugar-artista-por-pasos.html`. Sola es de borde a borde y pegada abajo,
 * sobre la zona segura del iPhone. El tipo de la pantalla va marcado (`aria-current`); los otros son enlaces que no apilan historial
 * (`replace`) y, si hay algo escrito, antes preguntan «¿Salir sin publicar?» (`pedirSalida`).
 */
export default function TiraTipos({ actual, destinos, enPie = false }: Props) {
  const router = useRouter();
  const Caja = enPie ? "div" : "footer";

  function ir(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    // Abrir en otra pestaña (Cmd, Ctrl, clic central) sigue siendo cosa del navegador.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (pedirSalida(() => router.replace(href))) e.preventDefault();
  }

  return (
    <Caja className={enPie ? `${styles.tira} ${styles.enPie}` : styles.tira} role="group" aria-label="Qué publicar">
      {TIPOS.map(({ tipo, etiqueta }) => {
        const destino = destinos[tipo];
        if (destino && tipo !== actual)
          return (
            <Link key={tipo} href={destino} replace prefetch={false} className={styles.tipo} onClick={(e) => ir(e, destino)}>
              {etiqueta}
            </Link>
          );
        return (
          <span key={tipo} className={styles.tipo} aria-current={actual === tipo ? "page" : undefined}>
            {etiqueta}
          </span>
        );
      })}
    </Caja>
  );
}
