"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ComponentProps } from "react";
import { useSalirSinPublicar } from "@/components/SalirSinPublicar";
import Barra from "@/components/ui/Barra";
import { tituloDeAlta } from "@/lib/armazon";
import { pedirSalida } from "@/lib/guardiaSalida";
import FormularioLugar from "@/app/lugares/FormularioLugar";
import FormularioArtista from "@/app/artistas/FormularioArtista";
import plantilla from "@/components/ui/Plantilla.module.css";
import styles from "./Alta.module.css";

/** Lo que se registra en esta pantalla; un evento se publica en su alta por pasos (`/nuevo/evento`). */
type Tipo = "lugar" | "artista";
type Salida = { href: string; texto: string };

type Props = {
  /** El tipo con el que abre: el de la sección desde la que se tocó «+». */
  tipoInicial: Tipo;
  /** La dirección del alta de evento por pasos, con la ciudad que se veía: a dónde lleva «Evento» en la tira. */
  evento: string;
  /** A dónde vuelve la ✕ si no hay pantalla anterior, según el tipo que esté a la vista. */
  salidas: Record<Tipo, Salida>;
  lugar: ComponentProps<typeof FormularioLugar>;
  artista: ComponentProps<typeof FormularioArtista>;
};

const TIPOS: { alta: Tipo; etiqueta: string }[] = [
  { alta: "lugar", etiqueta: "Lugar" },
  { alta: "artista", etiqueta: "Artista" },
];

/**
 * La pantalla de alta de lugar y de artista (docs/rediseno/50, P9; prototipo firmado): una tarea con su barra (el título del tipo y la ✕),
 * el formulario del tipo elegido y, abajo, la tira de tipos (Evento · Lugar · Artista). Lugar y Artista cambian de formulario sin salir de
 * la pantalla ni apilar historial: los dos siguen montados y solo se ve uno, así lo escrito en uno no se pierde al mirar el otro. «Evento»
 * tiene la misma pinta pero es un enlace (OL-312): lleva al alta de evento por pasos, en lugar de esta pantalla (no se apila) y pasando por
 * la guardia de salida si hay algo escrito. Una sola guardia sirve a los dos formularios: Atrás, la ✕ o «Evento» preguntan si se escribió
 * algo en cualquiera.
 */
export default function Alta({ tipoInicial, evento, salidas, lugar, artista }: Props) {
  const [tipo, setTipo] = useState(tipoInicial);
  const pantalla = useRef<HTMLElement>(null);
  const hojaSalir = useSalirSinPublicar(pantalla);
  const router = useRouter();

  function elegir(nuevo: Tipo) {
    setTipo(nuevo);
    window.scrollTo({ top: 0 });
  }

  function aEvento(e: React.MouseEvent<HTMLAnchorElement>) {
    // Abrir en otra pestaña (Cmd, Ctrl, clic central) sigue siendo cosa del navegador.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (pedirSalida(() => router.replace(evento))) e.preventDefault();
  }

  return (
    <main ref={pantalla} className={`${plantilla.pagina} ${styles.alta}`}>
      <Barra cerrar={salidas[tipo]} titulo={tituloDeAlta(tipo)} />
      <FormularioLugar {...lugar} oculta={tipo !== "lugar"} autoFocus={tipoInicial === "lugar"} />
      <FormularioArtista {...artista} oculta={tipo !== "artista"} autoFocus={tipoInicial === "artista"} />
      <div className={styles.tira} role="group" aria-label="Qué publicar">
        <Link href={evento} replace prefetch={false} className={styles.tipo} onClick={aEvento}>
          Evento
        </Link>
        {TIPOS.map(({ alta, etiqueta }) => (
          <button key={alta} type="button" className={styles.tipo} aria-pressed={tipo === alta} onClick={() => elegir(alta)}>
            {etiqueta}
          </button>
        ))}
      </div>
      {hojaSalir}
    </main>
  );
}
