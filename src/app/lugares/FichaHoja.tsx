"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, type ReactNode } from "react";
import BotonIcono from "@/components/ui/BotonIcono";
import { EsqueletoKpis } from "@/components/ui/Esqueleto";
import { estiloPortada } from "@/components/ui/Ficha";
import ficha from "@/components/ui/Ficha.module.css";
import Heroe from "@/components/ui/Heroe";
import { IconoCerrar, IconoChevronIzquierda } from "@/components/ui/Iconos";
import MenuAcciones from "@/components/ui/MenuAcciones";
import { etiquetaTipo, hrefLugar, type LugarLista } from "@/lib/lugares";
import { useHoja } from "./HojaLugares";
import styles from "./FichaHoja.module.css";

/** Lo que llega del servidor cuando la ficha se abre (`fichaEnHoja.tsx`); mientras llega, la ficha enseña su héroe y los tres números en gris. */
export type PiezasFicha = { cuerpo: ReactNode; opciones: ReactNode; seguir: ReactNode };

type Props = {
  lugar: LugarLista;
  /** null mientras llega; «fallo» si no se pudo pedir o el lugar ya no existe. */
  piezas: PiezasFicha | "fallo" | null;
  onCerrar: () => void;
};

/** El cuerpo de la ficha mientras llega: los tres números en gris, del alto que tendrán, para que la hoja no salte al recibirlos. */
function CuerpoCargando() {
  return (
    <div className={ficha.cuerpo} data-cuerpo>
      <EsqueletoKpis />
    </div>
  );
}

/**
 * La ficha de un lugar dentro de la hoja de Lugares (docs/rediseno/50, P5b y P6): la misma de `/lugares/:id` —la misma rejilla
 * (`ui/Ficha.module.css`), el mismo héroe y el mismo cuerpo (`../[id]/CuerpoLugar.tsx`)— con su barra propia: el asa, la ✕ (o Atrás,
 * con la hoja llena), el título (que aparece al desplazar) y el menú «···». Toda su información vive en la hoja, nunca en la barra
 * del sitio. Desplazada, o con la hoja recogida, la barra se vuelve compacta con la portada oscurecida detrás del título
 * (`data-compacta`, que pone la hoja). Solo se cierra con la ✕.
 */
export default function FichaHoja({ lugar, piezas, onCerrar }: Props) {
  const { irA, siguiente } = useHoja();
  const articulo = useRef<HTMLElement>(null);
  // Al abrirse, el foco pasa a la ficha: el renglón que se tocó deja de verse y el foco no debe perderse.
  useEffect(() => articulo.current?.focus({ preventScroll: true }), []);
  const abierta = piezas && piezas !== "fallo" ? piezas : null;
  return (
    <article ref={articulo} tabIndex={-1} className={`${ficha.ficha} ${styles.enHoja}`} data-ficha-hoja aria-label={`Ficha de ${lugar.nombre}`} style={estiloPortada(lugar.portada)}>
      <header className={ficha.barra}>
        <button type="button" className={styles.asa} aria-label="Subir o bajar la ficha" onClick={siguiente} />
        <BotonIcono tamano="accion" relieve="elevado" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar la ficha">
          <IconoCerrar width={22} height={22} />
        </BotonIcono>
        <BotonIcono tamano="accion" relieve="elevado" className={styles.atras} onClick={() => irA("media")} aria-label="Atrás">
          <IconoChevronIzquierda width={22} height={22} />
        </BotonIcono>
        <b className={ficha.tituloBarra} aria-hidden="true">{lugar.nombre}</b>
        {abierta && (
          <MenuAcciones tamano="accion" relieve="elevado">
            <Suspense fallback={null}>{abierta.opciones}</Suspense>
          </MenuAcciones>
        )}
      </header>

      <Heroe portada={lugar.portada} alt={`Portada de ${lugar.nombre}`} titulo={lugar.nombre} etiqueta={etiquetaTipo(lugar.tipo)} nivel={2} />

      {/* Lo que llega del servidor pide sus componentes de cliente y puede tardar en estar listo: cada pieza tiene su propio
          `<Suspense>` para que, si tarda, solo ella espere y no la ruta entera (que se escondería con la hoja adentro). */}
      {abierta ? (
        <Suspense fallback={<CuerpoCargando />}>{abierta.cuerpo}</Suspense>
      ) : piezas === "fallo" ? (
        <div className={ficha.cuerpo} data-cuerpo>
          <p className={styles.fallo}>
            No se pudo abrir la ficha aquí. <Link href={hrefLugar(lugar)}>Abrir la ficha completa</Link>
          </p>
        </div>
      ) : (
        <CuerpoCargando />
      )}
      {abierta && <Suspense fallback={null}>{abierta.seguir}</Suspense>}
    </article>
  );
}
