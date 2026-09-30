"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import Cartel from "@/components/Cartel";
import BotonIcono from "@/components/ui/BotonIcono";
import { EsqueletoDato } from "@/components/ui/Esqueleto";
import ficha from "@/components/ui/Ficha.module.css";
import { IconoCerrar, IconoChevronIzquierda } from "@/components/ui/Iconos";
import MenuAcciones from "@/components/ui/MenuAcciones";
import { etiquetaTipo, hrefLugar, type LugarLista } from "@/lib/lugares";
import { useHoja } from "./HojaLugares";
import styles from "./FichaHoja.module.css";

/** Lo que llega del servidor cuando la ficha se abre (`fichaEnHoja.tsx`); mientras llega, la ficha enseña su héroe y un esqueleto. */
export type PiezasFicha = { cuerpo: ReactNode; opciones: ReactNode; seguir: ReactNode };

type Props = {
  lugar: LugarLista;
  /** null mientras llega; «fallo» si no se pudo pedir o el lugar ya no existe. */
  piezas: PiezasFicha | "fallo" | null;
  onCerrar: () => void;
};

/** Los tres datos de la ficha mientras llegan: del alto que tendrán, para que la hoja no salte al recibirlos. */
function DatosCargando() {
  return (
    <ul className={ficha.datos}>
      <EsqueletoDato />
      <EsqueletoDato />
      <EsqueletoDato />
    </ul>
  );
}

/**
 * La ficha de un lugar dentro de la hoja de Lugares (docs/rediseno/50, P5b; `cuerpo_lugar(en_hoja=True)` del prototipo firmado).
 * Toda su información vive en la hoja, nunca en la barra del sitio: la cabecera con el asa, la ✕ (o Atrás, con la hoja llena),
 * el título (que aparece al desplazar) y el menú «···»; el héroe 3:2 con la etiqueta y el título dentro de la imagen sobre un
 * velo; y, debajo, el mismo cuerpo de la ficha a pantalla completa (`../[id]/CuerpoLugar.tsx`) con su barra de Seguir.
 * Desplazada, o con la hoja recogida, la cabecera se vuelve compacta con la portada oscurecida detrás del título
 * (`data-compacta`, que pone la hoja). Solo se cierra con la ✕.
 */
export default function FichaHoja({ lugar, piezas, onCerrar }: Props) {
  const { irA, siguiente } = useHoja();
  const articulo = useRef<HTMLElement>(null);
  // Al abrirse, el foco pasa a la ficha: el renglón que se tocó deja de verse y el foco no debe perderse.
  useEffect(() => articulo.current?.focus({ preventScroll: true }), []);
  const abierta = piezas && piezas !== "fallo" ? piezas : null;
  return (
    <article ref={articulo} tabIndex={-1} className={styles.ficha} data-ficha-hoja aria-label={`Ficha de ${lugar.nombre}`} style={{ "--portada": lugar.portada ? `url(${JSON.stringify(lugar.portada)})` : undefined } as CSSProperties}>
      <header className={styles.cabecera}>
        <button type="button" className={styles.asa} aria-label="Subir o bajar la ficha" onClick={siguiente} />
        <BotonIcono tamano="accion" relieve="elevado" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar la ficha">
          <IconoCerrar width={22} height={22} />
        </BotonIcono>
        <BotonIcono tamano="accion" relieve="elevado" className={styles.atras} onClick={() => irA("media")} aria-label="Atrás">
          <IconoChevronIzquierda width={22} height={22} />
        </BotonIcono>
        <b className={styles.titulo}>{lugar.nombre}</b>
        {abierta && (
          <MenuAcciones className={styles.menu} tamano="accion" relieve="elevado">
            <Suspense fallback={null}>{abierta.opciones}</Suspense>
          </MenuAcciones>
        )}
      </header>

      <div className={styles.heroe} data-portada>
        <Cartel src={lugar.portada} alt={`Portada de ${lugar.nombre}`} forma="heroe" />
        <div className={styles.encima}>
          <span className={styles.etiqueta}>{etiquetaTipo(lugar.tipo)}</span>
          <h2>{lugar.nombre}</h2>
        </div>
      </div>

      {/* Lo que llega del servidor pide sus componentes de cliente y puede tardar en estar listo: cada pieza tiene su propio
          `<Suspense>` para que, si tarda, solo ella espere y no la ruta entera (que se escondería con la hoja adentro). */}
      <div className={styles.cuerpo} data-cuerpo>
        {abierta ? (
          <Suspense fallback={<DatosCargando />}>{abierta.cuerpo}</Suspense>
        ) : piezas === "fallo" ? (
          <p className={styles.fallo}>
            No se pudo abrir la ficha aquí. <Link href={hrefLugar(lugar)}>Abrir la ficha completa</Link>
          </p>
        ) : (
          <DatosCargando />
        )}
      </div>
      {abierta && (
        <div className={styles.accion}>
          <Suspense fallback={null}>{abierta.seguir}</Suspense>
        </div>
      )}
    </article>
  );
}
