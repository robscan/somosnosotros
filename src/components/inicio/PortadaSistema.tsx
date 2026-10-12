"use client";

import { useId, useLayoutEffect, useRef, type CSSProperties, type ReactNode, type Ref } from "react";
import { dibujoDePortada, paletaDeBase, type ClaseConFigura, type PaletaPortada } from "@/lib/portadasSistema";
import { Chip } from "../ui/Chip";
import { reaplicarGiro, registrarPortada, useGiroEncendido } from "./giroPortadas";
import SimboloBlanco from "./SimboloBlanco";
import styles from "./PortadaSistema.module.css";

type Props = {
  /** El id del evento: elige su arreglo (y su respaldo, que ya viene en `paleta`). */
  id: string;
  /** La clase con figura; null en el evento sin imagen (P7): sin figura, con el símbolo SN. */
  clase: ClaseConFigura | null;
  /** Su paleta, ya con la regla de las vecinas de su carril (`paletasDeCarril`). */
  paleta: PaletaPortada;
  tamano: "grande" | "mediana";
  /** El sello de fecha, en su esquina: quien lo pinta recibe la clase que lo pone ahí (y por la que la figura sabe dónde queda). */
  sello: ((className: string) => ReactNode) | null;
  chip: { texto: string; variante: "estado" | "sello" } | null;
  ceja: string[];
  /** El título como oración; se corta en palabra entera con «…» (`tituloRef`, el de `TarjetaEvento`). */
  titulo: string;
  tituloRef: Ref<HTMLElement>;
};

/**
 * La portada del sistema (OL-375; prototipo firmado `portadas-sistema.html`, «Firmada»; bitácora 405): un color plano, el patrón de figuras de su
 * clase arriba y, abajo, la zona del título (el chip solo en su renglón, la ceja y el título, en la tinta de su banda: 5:1 o más). Toda la
 * portada es decorativa salvo el texto: el nombre lo dice el enlace que la contiene.
 *
 * El color, el texto y el sello llegan del servidor. El dibujo no: las figuras se apoyan en la línea de la zona del título, que depende de cuántos
 * renglones ocupa el título y de la letra del teléfono (OL-373), y dejan libre la esquina del sello; eso solo se sabe en la página, como en el
 * prototipo (`dibujarPortada`). Se mide y se dibuja antes de pintar (`useLayoutEffect`) y otra vez si cambia el tamaño de la portada, de las
 * piezas de la zona o del sello (llega la letra, cambia el tamaño del texto) o lo que dice la zona. El `<svg>` mide siempre lo mismo y React no le
 * pone hijos: dibujar no mueve nada ni descuadra la hidratación. El dibujo se recorta en el borde de la zona del título; con el giro encendido, el
 * recorte baja `MAX_UNIDADES` dentro del relleno de arriba de la zona (comentario 3 del founder), así la base nunca se corta y nada llega al texto.
 * Maquetación plana: la zona no es una caja, sus piezas van en la rejilla de la portada (`PortadaSistema.module.css`).
 */
export default function PortadaSistema({ id, clase, paleta, tamano, sello, chip, ceja, titulo, tituloRef }: Props) {
  const portada = useRef<HTMLSpanElement>(null);
  const figura = useRef<SVGSVGElement>(null);
  const giro = useGiroEncendido();
  // El recorte de cada portada lleva su propio nombre: varias en la misma página.
  const clip = `portada-${useId().replace(/[^\w-]/g, "")}`;
  const { base, banda } = paleta;
  // Lo que cambia la zona del título por dentro (aparece el chip, cambia el título): se vuelve a medir.
  const piezas = [chip?.texto ?? "", ...ceja, titulo].join("|");
  useLayoutEffect(() => {
    const p = portada.current,
      svg = figura.current;
    if (!clase || !p || !svg) return;
    const P = paletaDeBase(base, banda);
    const hijo = (clases: string[]) => [...p.children].filter((el): el is HTMLElement => el instanceof HTMLElement && clases.some((c) => el.classList.contains(c)));
    const [s] = hijo([styles.fecha]);
    // La zona del título no es una caja: empieza donde empieza su primera pieza, menos el relleno de arriba (su margen).
    const zona = hijo([styles.chip, styles.ceja, styles.titulo]);
    let dibujado = "";
    const dibujar = () => {
      const ancho = p.clientWidth;
      if (!ancho || !zona.length) return;
      // En unidades de la portada (100 de ancho), como el prototipo: el margen del título (12 px), la línea de la zona y la esquina del sello.
      const escala = ancho / 100;
      const linea = zona[0].offsetTop - parseFloat(getComputedStyle(zona[0]).marginTop);
      const medidas = { H: linea / escala, M: 12 / escala, selloIzq: s ? s.offsetLeft / escala : 100, selloAbajo: s ? (s.offsetTop + s.offsetHeight) / escala : 0 };
      const dibujo = dibujoDePortada({ clase, id, P, medidas, giro, clip });
      if (dibujo === dibujado) return;
      dibujado = dibujo;
      svg.innerHTML = dibujo;
      reaplicarGiro(p);
    };
    dibujar();
    const observador = new ResizeObserver(dibujar);
    for (const el of [p, s, ...zona]) if (el) observador.observe(el);
    const quitar = registrarPortada(p);
    return () => {
      observador.disconnect();
      quitar();
    };
  }, [clase, id, base, banda, giro, clip, piezas]);

  return (
    <span ref={portada} className={tamano === "mediana" ? `${styles.portada} ${styles.mediana}` : styles.portada} style={{ "--base": base, "--tinta": paleta.tinta } as CSSProperties}>
      {clase ? <svg ref={figura} className={styles.figura} viewBox="0 0 100 125" preserveAspectRatio="xMidYMin meet" aria-hidden="true" focusable="false" /> : <SimboloBlanco className={styles.simbolo} />}
      {sello?.(styles.fecha)}
      {chip && (
        <Chip variante={chip.variante} className={styles.chip}>
          {chip.texto}
        </Chip>
      )}
      {/* Cada parte de la ceja no se parte; si no caben en un renglón, la segunda baja entera (como debajo del cartel). */}
      {ceja.length > 0 && <span className={styles.ceja}>{ceja.map((parte) => parte.replaceAll(" ", "\u00a0")).join("\u00a0· ")}</span>}
      <b ref={tituloRef} className={styles.titulo}>
        {titulo}
      </b>
    </span>
  );
}
