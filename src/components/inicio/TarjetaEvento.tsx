"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { degradadoTarjeta, paletaPropia } from "@/lib/coloresCartel";
import type { Tarjeta, TarjetaConFecha } from "@/lib/destacados";
import type { Asistencia } from "@/lib/deslizar";
import { SIN_FOTO } from "@/lib/imagen";
import { tamanoImagenCarril } from "@/lib/imagenOptima";
import { cejaDeTarjeta, chipDeTarjeta, cortarEnPalabra, nombreDeTarjeta, piezasDeArtista, selloFechaDe, type SelloFecha } from "@/lib/tarjetaInicio";
import { comoOracion, tituloCorto } from "@/lib/tituloCorto";
import { Chip } from "../ui/Chip";
import Imagen from "../ui/Imagen";
import SimboloBlanco from "./SimboloBlanco";
import styles from "./TarjetaEvento.module.css";

type Props = {
  /** La tarjeta, como la arma `tarjetaDeInicio` (o como la guardó «Tus planes» en el teléfono, sin su sello: se calcula aquí). */
  t: Tarjeta & Partial<Pick<TarjetaConFecha, "inicio" | "fin" | "zona">>;
  /** `grande` en Tus planes, Destacados y Festivales y expos; `mediana` en Esta semana, Nuevos eventos y Más adelante (E5). */
  tamano: "grande" | "mediana";
  /** Lo que la persona decidió («Te interesa» es el chip; «Vas» solo lo dice el nombre del enlace). */
  decision: Asistencia;
};

/**
 * La tarjeta de evento de Inicio (OL-370), la versión que firmó el founder el 2026-10-10 (prototipo `inicio-tarjetas.html`, «Firmada»; bitácora
 * 398). Todo es un enlace a la ficha, también el sello de fecha; ya no lleva el botón de «Voy» (founder: «ya se resuelve en los carriles si va»;
 * decidir queda en la ficha y en las historias).
 *
 * - Con cartel (E1): el cartel entero en 4:5, sin franja; encima, el sello de fecha arriba a la derecha (E8 + E8c) y como mucho un chip abajo a
 *   la izquierda («Te interesa» o cuántos van). Debajo, la ceja (la clase si no es un evento, con su sesión: E3 + E3b), el título como oración en
 *   dos líneas como mucho y cortado en palabra, el lugar en gris y cuándo en violeta.
 * - Sin cartel (E10): la portada con su paleta propia, el símbolo SN arriba a la izquierda, el sello arriba a la derecha y en la base el chip, la
 *   ceja y el título corto; debajo, el lugar y cuándo.
 */
export default function TarjetaEvento({ t, tamano, decision }: Props) {
  const chip = chipDeTarjeta(t, decision);
  const corto = t.corto ?? tituloCorto(t.titulo);
  return (
    <TarjetaCartel
      href={t.href}
      etiqueta={nombreDeTarjeta(t, decision)}
      tamano={tamano}
      portada={t.foto ? { foto: t.foto } : { fondo: degradadoTarjeta(paletaPropia(t.id)), corto }}
      sello={selloFechaDe(t)}
      chip={chip && { texto: chip.texto, variante: chip.tuyo ? "estado" : "sello" }}
      ceja={cejaDeTarjeta(t)}
      titulo={comoOracion(corto)}
      lugar={t.sitio}
      cuando={t.detalle}
    />
  );
}

/**
 * E9 (OL-372; founder, 2026-10-10: «para este carril usar jerarquía de nuevos eventos»): un artista de «Artistas destacadxs» con la tarjeta mediana
 * de un evento. Su foto entera como el cartel, sin franja (sin foto, la imagen ya generada con el símbolo SN); encima, abajo a la izquierda, «Nuevo
 * video» o «Nuevo audio» si hay una novedad vigente, con el trato de «Hoy» de siempre. Debajo, la disciplina en la ceja, el nombre tal como está
 * escrito, el género en gris y, si tiene fecha, la fecha en violeta (`piezasDeArtista`). Sin sello de fecha ni botón de seguir: se sigue desde la
 * ficha.
 */
export function TarjetaArtista({ t }: { t: Tarjeta }) {
  const a = piezasDeArtista(t);
  return <TarjetaCartel href={t.href} etiqueta={a.nombre} tamano="mediana" portada={{ foto: t.foto ?? SIN_FOTO }} sello={null} chip={a.nuevo ? { texto: a.nuevo, variante: "sello", nuevo: true } : null} ceja={a.ceja} titulo={a.titulo} lugar={a.genero} cuando={a.cuando} />;
}

type PiezasCartel = {
  href: string;
  /** El nombre del enlace: lo que se ve, también para quien no lo ve. */
  etiqueta: string;
  tamano: "grande" | "mediana";
  /** El cartel (o la foto del artista); sin él, la portada de título de un evento (E10) con su fondo y su título corto. */
  portada: { foto: string } | { fondo: string; corto: string };
  sello: SelloFecha | null;
  /** El único chip sobre la portada: «Te interesa» (`estado`), cuántos van (`sello`) o la novedad de un artista (`sello` con el trato de «Hoy»). */
  chip: { texto: string; variante: "estado" | "sello"; nuevo?: boolean } | null;
  ceja: string[];
  /** El título debajo del cartel, ya como se dice; se corta en palabra entera si no cabe en dos líneas. */
  titulo: string;
  /** La línea gris: el lugar de un evento o el género de un artista. */
  lugar?: string | null;
  /** La línea violeta: cuándo. */
  cuando: string | null;
};

/** La tarjeta firmada (una rejilla plana con áreas, `TarjetaEvento.module.css`), con lo que dice cada una ya resuelto. */
function TarjetaCartel({ href, etiqueta, tamano, portada, sello, chip, ceja, titulo, lugar, cuando }: PiezasCartel) {
  const ref = useTituloEnPalabra(titulo);
  const clase = tamano === "mediana" ? `${styles.tarjeta} ${styles.mediana}` : styles.tarjeta;
  const encima = (
    <>
      {sello && <Sello sello={sello} />}
      {chip && (
        <Chip variante={chip.variante} className={chip.nuevo ? `${styles.chip} ${styles.nuevo}` : styles.chip}>
          {chip.texto}
        </Chip>
      )}
      {/* Cada parte de la ceja no se parte; si no caben en un renglón, la segunda baja entera y el punto se queda al final del primero. */}
      {ceja.length > 0 && <span className={styles.ceja}>{ceja.map((parte) => parte.replaceAll(" ", "\u00a0")).join("\u00a0· ")}</span>}
    </>
  );
  return (
    <Link href={href} className={clase} aria-label={etiqueta}>
      {"foto" in portada ? (
        <>
          <Imagen src={portada.foto} alt="" className={styles.cartel} width={384} height={480} sizes={tamanoImagenCarril(tamano === "mediana" ? "cartelMediana" : "grande")} />
          {encima}
          <b ref={ref} className={styles.titulo}>
            {titulo}
          </b>
        </>
      ) : (
        <span className={styles.portada} style={{ background: portada.fondo }}>
          <SimboloBlanco className={styles.simbolo} />
          {encima}
          <span className={styles.tituloPortada}>{portada.corto}</span>
        </span>
      )}
      {lugar && <span className={styles.lugar}>{lugar}</span>}
      {cuando !== null && <span className={styles.cuando}>{cuando}</span>}
    </Link>
  );
}

/** El sello: el mes arriba y el día (o los días) abajo; la flecha de un rango entre meses es de trazo (Bricolage no trae «→»). */
function Sello({ sello }: { sello: SelloFecha }) {
  const flecha = (
    <svg className={styles.flecha} viewBox="0 0 12 12" width={11} height={11} aria-hidden="true" focusable="false">
      <path d="M1.5 6h8M6.5 3l3 3-3 3" />
    </svg>
  );
  return (
    <span className={styles.fecha} title={sello.texto}>
      <small>{sello.mes}</small>
      <b>
        {sello.flecha === "antes" && flecha}
        {sello.dia}
        {sello.flecha === "despues" && flecha}
      </b>
    </span>
  );
}

/** Los títulos que se ven, con su texto entero, para volver a cortarlos cuando llega la letra o cambia su ancho. */
const titulos = new Map<HTMLElement, string>();
const anchos = new WeakMap<HTMLElement, number>();
let escuchando = false;

/**
 * Corta el título en la última palabra entera que deja que quepa en sus dos líneas (`cortarEnPalabra`), midiéndolo en su sitio como el
 * prototipo. El texto lo pinta React entero (y así llega del servidor y se hidrata); aquí solo se cambia el texto del nodo, que React no vuelve a
 * tocar mientras el título no cambie. Se corta antes de pintar (`useLayoutEffect`), y otra vez al terminar de cargar la letra o al cambiar el
 * ancho de la tarjeta (desde 1048 crece).
 */
function useTituloEnPalabra(completo: string) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    escuchar();
    titulos.set(el, completo);
    recortar(el, completo);
    return () => {
      titulos.delete(el);
    };
  }, [completo]);
  return ref;
}

function recortar(el: HTMLElement, completo: string) {
  const linea = parseFloat(getComputedStyle(el).lineHeight) || 16;
  const cabe = (texto: string) => {
    if (el.textContent !== texto) el.textContent = texto;
    // Esconde media línea o más: el corte a dos líneas esconde una entera, y las letras asoman 1 o 2 px de su renglón sin que falte nada.
    return el.scrollHeight - el.clientHeight <= linea / 2;
  };
  // `cortarEnPalabra` deja en el nodo el último texto que probó, que es el que devuelve.
  cortarEnPalabra(completo, cabe);
  anchos.set(el, el.clientWidth);
}

function escuchar() {
  if (escuchando) return;
  escuchando = true;
  const todos = () => titulos.forEach((completo, el) => recortar(el, completo));
  document.fonts.ready.then(todos);
  document.fonts.addEventListener("loadingdone", todos);
  window.addEventListener("resize", () => {
    titulos.forEach((completo, el) => {
      if (el.clientWidth !== anchos.get(el)) recortar(el, completo);
    });
  });
}
