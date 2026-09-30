"use client";

import { useRef, useState, type ComponentProps } from "react";
import { useSalirSinPublicar } from "@/components/SalirSinPublicar";
import Barra from "@/components/ui/Barra";
import { tituloDeAlta, type Alta as TipoDeAlta } from "@/lib/armazon";
import { olvidarBorrador } from "@/app/eventos/borrador";
import FormularioEvento from "@/app/eventos/FormularioEvento";
import FormularioLugar from "@/app/lugares/FormularioLugar";
import FormularioArtista from "@/app/artistas/FormularioArtista";
import plantilla from "@/components/ui/Plantilla.module.css";
import styles from "./Alta.module.css";

type Salida = { href: string; texto: string };

type Props = {
  /** El tipo con el que abre: el de la sección desde la que se tocó «+». */
  tipoInicial: TipoDeAlta;
  /** A dónde vuelve la ✕ si no hay pantalla anterior, según el tipo que esté a la vista. */
  salidas: Record<TipoDeAlta, Salida>;
  evento: ComponentProps<typeof FormularioEvento>;
  /** Sin lugar ni artista no hay tira de tipos: un evento ya armado (duplicado, o publicado desde un lugar o un artista) es un evento. */
  lugar?: ComponentProps<typeof FormularioLugar>;
  artista?: ComponentProps<typeof FormularioArtista>;
};

const TIPOS: { alta: TipoDeAlta; etiqueta: string }[] = [
  { alta: "evento", etiqueta: "Evento" },
  { alta: "lugar", etiqueta: "Lugar" },
  { alta: "artista", etiqueta: "Artista" },
];

/**
 * La pantalla de alta (docs/rediseno/50, P9; prototipo firmado): una tarea con su barra (el título del tipo y la ✕), el formulario
 * del tipo elegido y, abajo, la tira de tipos (Evento · Lugar · Artista). Cambiar de tipo cambia de formulario sin salir de la
 * pantalla ni apilar historial: los tres siguen montados y solo se ve uno, así lo escrito en uno no se pierde al mirar otro. Una
 * sola guardia de salida sirve a los tres: Atrás o la ✕ preguntan si se escribió algo en cualquiera.
 */
export default function Alta({ tipoInicial, salidas, evento, lugar, artista }: Props) {
  const [tipo, setTipo] = useState(tipoInicial);
  const pantalla = useRef<HTMLElement>(null);
  const hojaSalir = useSalirSinPublicar(pantalla, olvidarBorrador);
  const conTira = !!lugar && !!artista;

  function elegir(nuevo: TipoDeAlta) {
    setTipo(nuevo);
    window.scrollTo({ top: 0 });
  }

  return (
    <main ref={pantalla} className={`${plantilla.pagina} ${styles.alta}`}>
      <Barra cerrar={salidas[tipo]} titulo={evento.modo === "duplicar" ? "Duplicar evento" : tituloDeAlta(tipo)} />
      <FormularioEvento {...evento} oculta={tipo !== "evento"} />
      {lugar && <FormularioLugar {...lugar} oculta={tipo !== "lugar"} autoFocus={tipoInicial === "lugar"} />}
      {artista && <FormularioArtista {...artista} oculta={tipo !== "artista"} autoFocus={tipoInicial === "artista"} />}
      {conTira && (
        <div className={styles.tira} role="group" aria-label="Qué publicar">
          {TIPOS.map(({ alta, etiqueta }) => (
            <button key={alta} type="button" className={styles.tipo} aria-pressed={tipo === alta} onClick={() => elegir(alta)}>
              {etiqueta}
            </button>
          ))}
        </div>
      )}
      {hojaSalir}
    </main>
  );
}
