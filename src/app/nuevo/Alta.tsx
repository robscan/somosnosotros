"use client";

import { useRef, type ComponentProps } from "react";
import { useSalirSinPublicar } from "@/components/SalirSinPublicar";
import Barra from "@/components/ui/Barra";
import { tituloDeAlta } from "@/lib/armazon";
import FormularioArtista from "@/app/artistas/FormularioArtista";
import plantilla from "@/components/ui/Plantilla.module.css";
import styles from "./Alta.module.css";
import TiraTipos from "./TiraTipos";

type Props = {
  /** La dirección del alta de evento por pasos, con la ciudad que se veía: a dónde lleva «Evento» en la tira. */
  evento: string;
  /** La del alta de lugar por pasos (OL-315), con la misma ciudad: a dónde lleva «Lugar». */
  lugar: string;
  /** A dónde vuelve la ✕ si no hay pantalla anterior. */
  salida: { href: string; texto: string };
  artista: ComponentProps<typeof FormularioArtista>;
};

/**
 * La pantalla de alta de artista (docs/rediseno/50, P9; prototipo firmado): una tarea con su barra (el título y la ✕), el formulario y,
 * abajo, la tira de tipos (Evento · Lugar · Artista), con «Artista» marcado. El evento (OL-312) y el lugar (OL-315) tienen ya su alta por
 * pasos: en la tira son enlaces que la reemplazan (no se apila) pasando por la guardia de salida si hay algo escrito. El artista pasará a su
 * alta por pasos en OL-316.
 */
export default function Alta({ evento, lugar, salida, artista }: Props) {
  const pantalla = useRef<HTMLElement>(null);
  const hojaSalir = useSalirSinPublicar(pantalla);
  return (
    <main ref={pantalla} className={`${plantilla.pagina} ${styles.alta}`}>
      <Barra cerrar={salida} titulo={tituloDeAlta("artista")} />
      <FormularioArtista {...artista} autoFocus />
      <TiraTipos actual="artista" destinos={{ evento, lugar }} />
      {hojaSalir}
    </main>
  );
}
