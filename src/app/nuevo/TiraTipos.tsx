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
  /** El tipo de la pantalla en que se está: va marcado. */
  actual: TipoDeAlta;
  /** Qué hace cada tipo al tocarlo: una dirección (un enlace, que reemplaza la entrada y pasa por la guardia de salida si hay algo escrito), una función (un botón, que cambia de formulario sin salir) o nada (es esta pantalla). */
  destinos: Partial<Record<TipoDeAlta, string | (() => void)>>;
};

/**
 * La tira de tipos de las altas (docs/rediseno/50, P9; prototipo firmado): Evento · Lugar · Artista, de borde a borde y pegada abajo sobre la
 * zona segura del iPhone. La usan `/nuevo` (lugar y artista; «Evento» lleva al alta por pasos, OL-312) y el primer paso del alta de evento
 * (OL-313; «Lugar» y «Artista» llevan a `/nuevo`). Cambiar de tipo no apila historial (`replace`), y si hay algo escrito, antes pregunta
 * «¿Salir sin publicar?» (`pedirSalida`). El tipo actual va con `aria-pressed` si es un botón y con `aria-current` si no lleva a ningún lado.
 */
export default function TiraTipos({ actual, destinos }: Props) {
  const router = useRouter();

  function ir(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    // Abrir en otra pestaña (Cmd, Ctrl, clic central) sigue siendo cosa del navegador.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (pedirSalida(() => router.replace(href))) e.preventDefault();
  }

  return (
    <footer className={styles.tira} role="group" aria-label="Qué publicar">
      {TIPOS.map(({ tipo, etiqueta }) => {
        const destino = destinos[tipo];
        if (typeof destino === "string")
          return (
            <Link key={tipo} href={destino} replace prefetch={false} className={styles.tipo} onClick={(e) => ir(e, destino)}>
              {etiqueta}
            </Link>
          );
        if (destino)
          return (
            <button key={tipo} type="button" className={styles.tipo} aria-pressed={actual === tipo} onClick={destino}>
              {etiqueta}
            </button>
          );
        return (
          <span key={tipo} className={styles.tipo} aria-current={actual === tipo ? "page" : undefined}>
            {etiqueta}
          </span>
        );
      })}
    </footer>
  );
}
