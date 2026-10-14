"use client";

import Link from "next/link";
import type { Tarjeta, TarjetaConFecha } from "@/lib/destacados";
import type { Asistencia } from "@/lib/deslizar";
import { SIN_FOTO } from "@/lib/imagen";
import { tamanoImagenCarril } from "@/lib/imagenOptima";
import { claseConFigura, conPortadaDelSistema, paletasDeCarril, type ClaseConFigura, type PaletaPortada } from "@/lib/portadasSistema";
import { cejaDeTarjeta, chipDeTarjeta, nombreDeTarjeta, piezasDeArtista, selloFechaDe, type SelloFecha } from "@/lib/tarjetaInicio";
import { Chip } from "../ui/Chip";
import { IconoMarcador } from "../ui/Iconos";
import Imagen from "../ui/Imagen";
import PortadaSistema from "./PortadaSistema";
import { useTextoEnPalabra } from "./useTextoEnPalabra";
import styles from "./TarjetaEvento.module.css";

/** El tamaño de una tarjeta de evento de Inicio: el de su carril (`Destacados.module.css`). */
export type TamanoTarjeta = "xl" | "grande" | "mediana";

type Props = {
  /** La tarjeta, como la arma `tarjetaDeInicio` (o como la guardó «Tus planes» en el teléfono, sin su sello: se calcula aquí). */
  t: Tarjeta & Partial<Pick<TarjetaConFecha, "inicio" | "fin" | "zona">>;
  /** `xl` en el carril estelar (Destacados o «Seleccionados para ti», OL-382, D2); `grande` en Tus planes y Festivales y expos; `mediana` en Esta
   *  semana, Nuevos eventos y Más adelante (E5). */
  tamano: TamanoTarjeta;
  /** Lo que la persona decidió («Te interesa» es el marcador arriba a la izquierda, OL-382, I1; «Vas» solo lo dice el nombre del enlace). */
  decision: Asistencia;
  /** La paleta de su portada del sistema con la regla de las vecinas de su carril (`paletasDeCarril`, la pone `Destacados`); sin ella, la suya. */
  paleta?: PaletaPortada | null;
};

/**
 * La tarjeta de evento de Inicio (OL-370), la versión que firmó el founder el 2026-10-10 (prototipo `inicio-tarjetas.html`, «Firmada»; bitácora
 * 398), con las portadas del sistema que firmó el 2026-10-11 (OL-375; prototipo `portadas-sistema.html`, «Firmada»; bitácora 405). Todo es un
 * enlace a la ficha, también el sello de fecha; ya no lleva el botón de «Voy» (founder: «ya se resuelve en los carriles si va»; decidir queda en
 * la ficha y en las historias).
 *
 * Con lo que firmó el 2026-10-12 (OL-382; prototipo `inicio-propuestas.html`, «Firmada»; bitácora 408): el título completo tal cual lo escribió
 * quien publicó (T1: sin título corto calculado ni pasarlo a oración), en tres líneas como mucho (T2); lo que te interesa es el marcador relleno
 * arriba a la izquierda en vez del chip (I1); debajo, primero cuándo y luego dónde (F1); y el tamaño `xl` del carril estelar (D2).
 *
 * - Con cartel o foto (E1), un evento: el cartel entero en 4:5, sin franja; encima, el sello de fecha arriba a la derecha (E8 + E8c), el marcador
 *   arriba a la izquierda si te interesa (I1) y como mucho un chip abajo a la izquierda (cuántos van). Debajo, la ceja (su día si es de varios:
 *   E3b), el título en tres líneas como mucho y cortado en palabra, cuándo en violeta y el lugar en gris.
 * - Festival, exposición y taller (P1, en todos los carriles: P5): la portada del sistema en vez del cartel (`PortadaSistema`), con el color de su
 *   cartel (el de su próximo acto si es un festival sin cartel propio) o su respaldo y el patrón de su clase; dentro, la zona del título: el chip
 *   solo en su renglón, la ceja y el título (P4). El cartel sigue en la ficha y en la historia. Debajo, cuándo y el lugar.
 * - Un evento sin ninguna imagen (P7): la misma portada sin figura, con el símbolo SN arriba a la izquierda y el título abajo (sustituye al
 *   degradado E10, cuyo título bajaba a 2,3:1); con el marcador, el símbolo se corre a su derecha.
 */
export default function TarjetaEvento({ t, tamano, decision, paleta }: Props) {
  const chip = chipDeTarjeta(t);
  const sistema = conPortadaDelSistema(t) ? { id: t.id, clase: claseConFigura(t.clase), paleta: paleta ?? paletasDeCarril([t])[0]! } : null;
  return (
    <TarjetaCartel
      href={t.href}
      etiqueta={nombreDeTarjeta(t, decision)}
      tamano={tamano}
      portada={sistema ? { sistema } : { foto: t.foto! }}
      sello={selloFechaDe(t)}
      chip={chip && { texto: chip.texto, variante: "sello" }}
      interesa={decision === "me_interesa"}
      ceja={cejaDeTarjeta(t)}
      titulo={t.titulo}
      lugar={t.sitio}
      cuando={t.detalle}
    />
  );
}

/**
 * E9 (OL-372; founder, 2026-10-10: «para este carril usar jerarquía de nuevos eventos»): un artista de «Artistas destacadxs» con la tarjeta mediana
 * de un evento. Su foto entera como el cartel, sin franja (sin foto, la imagen ya generada con el símbolo SN); encima, abajo a la izquierda, «Nuevo
 * video» o «Nuevo audio» si hay una novedad vigente, con el trato de «Hoy» de siempre. Debajo, la disciplina en la ceja, el nombre tal como está
 * escrito, si tiene fecha, la fecha en violeta y luego el género en gris (OL-382, F1; `piezasDeArtista`). Sin sello de fecha ni botón de seguir: se
 * sigue desde la ficha.
 */
export function TarjetaArtista({ t }: { t: Tarjeta }) {
  const a = piezasDeArtista(t);
  return <TarjetaCartel href={t.href} etiqueta={a.nombre} tamano="mediana" portada={{ foto: t.foto ?? SIN_FOTO }} sello={null} chip={a.nuevo ? { texto: a.nuevo, variante: "sello", nuevo: true } : null} interesa={false} ceja={a.ceja} titulo={a.titulo} lugar={a.genero} cuando={a.cuando} />;
}

type PiezasCartel = {
  href: string;
  /** El nombre del enlace: lo que se ve, también para quien no lo ve. */
  etiqueta: string;
  tamano: TamanoTarjeta;
  /** El cartel (o la foto del artista), o la portada del sistema (OL-375) con su clase y su paleta. */
  portada: { foto: string } | { sistema: { id: string; clase: ClaseConFigura | null; paleta: PaletaPortada } };
  sello: SelloFecha | null;
  /** El único chip sobre la portada: cuántos van o la novedad de un artista (con el trato de «Hoy»). */
  chip: { texto: string; variante: "estado" | "sello"; nuevo?: boolean } | null;
  /** I1 (OL-382): la persona marcó «Me interesa»: el marcador arriba a la izquierda de la portada. */
  interesa: boolean;
  ceja: string[];
  /** El título debajo del cartel (en la portada del sistema, dentro), tal cual; se corta en palabra entera si no cabe en tres líneas. */
  titulo: string;
  /** La línea violeta, la primera debajo (F1): cuándo. */
  cuando: string | null;
  /** La línea gris, debajo de cuándo: el lugar de un evento o el género de un artista. */
  lugar?: string | null;
};

/** La tarjeta firmada (una rejilla plana con áreas, `TarjetaEvento.module.css`), con lo que dice cada una ya resuelto. */
function TarjetaCartel({ href, etiqueta, tamano, portada, sello, chip, interesa, ceja, titulo, lugar, cuando }: PiezasCartel) {
  const ref = useTextoEnPalabra(titulo);
  const clase = tamano === "grande" ? styles.tarjeta : `${styles.tarjeta} ${styles[tamano]}`;
  // Sobre el cartel, el sello, el marcador y el chip; debajo, la ceja. En la portada del sistema van dentro de ella (`PortadaSistema`).
  const encima = (
    <>
      {sello && <Sello sello={sello} />}
      {interesa && <Interesa />}
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
          <Imagen src={portada.foto} alt="" className={styles.cartel} width={384} height={480} sizes={tamanoImagenCarril(tamano === "mediana" ? "cartelMediana" : tamano)} />
          {encima}
          <b ref={ref} className={styles.titulo}>
            {titulo}
          </b>
        </>
      ) : (
        <PortadaSistema {...portada.sistema} tamano={tamano} sello={sello && ((enSuEsquina) => <Sello sello={sello} className={enSuEsquina} />)} interesa={interesa ? (enSuEsquina) => <Interesa className={enSuEsquina} /> : null} chip={chip} ceja={ceja} titulo={titulo} tituloRef={ref} />
      )}
      {cuando !== null && <span className={styles.cuando}>{cuando}</span>}
      {lugar && <span className={styles.lugar}>{lugar}</span>}
    </Link>
  );
}

/**
 * El sello: el mes arriba y el día (o los días) abajo; la flecha de un rango entre meses es de trazo (Bricolage no trae «→»). En la portada del
 * sistema, `className` lo pone en su esquina.
 */
function Sello({ sello, className }: { sello: SelloFecha; className?: string }) {
  const flecha = (
    <svg className={styles.flecha} viewBox="0 0 12 12" width={11} height={11} aria-hidden="true" focusable="false">
      <path d="M1.5 6h8M6.5 3l3 3-3 3" />
    </svg>
  );
  return (
    <span className={className ? `${styles.fecha} ${className}` : styles.fecha} title={sello.texto}>
      <small>{sello.mes}</small>
      <b>
        {sello.flecha === "antes" && flecha}
        {sello.dia}
        {sello.flecha === "despues" && flecha}
      </b>
    </span>
  );
}

/**
 * I1 (OL-382; founder, 2026-10-12: «solo con el icono arriba a la derecha en vez del chip» y «prueba arriba a la izquierda»): lo que te interesa,
 * el marcador relleno en violeta en un círculo de vidrio arriba a la izquierda de la portada. Decorativo: el nombre del enlace dice «Te interesa».
 * En la portada del sistema, `className` lo pone en su esquina.
 */
function Interesa({ className }: { className?: string }) {
  return (
    <span className={className ? `${styles.interes} ${className}` : styles.interes} title="Te interesa">
      <IconoMarcador width={20} height={20} fill="currentColor" stroke="none" />
    </span>
  );
}
