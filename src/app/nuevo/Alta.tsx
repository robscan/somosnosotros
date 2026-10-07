"use client";

import { useRef, useState, type ComponentProps } from "react";
import { useSalirSinPublicar } from "@/components/SalirSinPublicar";
import Barra from "@/components/ui/Barra";
import { tituloDeAlta } from "@/lib/armazon";
import FormularioLugar from "@/app/lugares/FormularioLugar";
import FormularioArtista from "@/app/artistas/FormularioArtista";
import plantilla from "@/components/ui/Plantilla.module.css";
import styles from "./Alta.module.css";
import TiraTipos from "./TiraTipos";

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

  function elegir(nuevo: Tipo) {
    setTipo(nuevo);
    window.scrollTo({ top: 0 });
  }

  return (
    <main ref={pantalla} className={`${plantilla.pagina} ${styles.alta}`}>
      <Barra cerrar={salidas[tipo]} titulo={tituloDeAlta(tipo)} />
      <FormularioLugar {...lugar} oculta={tipo !== "lugar"} autoFocus={tipoInicial === "lugar"} />
      <FormularioArtista {...artista} oculta={tipo !== "artista"} autoFocus={tipoInicial === "artista"} />
      <TiraTipos actual={tipo} destinos={{ evento, lugar: () => elegir("lugar"), artista: () => elegir("artista") }} />
      {hojaSalir}
    </main>
  );
}
