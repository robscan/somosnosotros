import Cartel from "../Cartel";
import ficha from "./Ficha.module.css";

type Props = {
  /** La portada de la ficha; sin ella, la imagen con el símbolo SN. */
  portada: string | null;
  /** Cómo se llama la portada para quien no la ve («Cartel de …», «Portada de …»). */
  alt: string;
  titulo: string;
  /** Qué es (MUSEO, ARTES VISUALES): el chip que va sobre el título. */
  etiqueta?: string;
  /** Una línea más bajo el título («Fotografía · Solista · San Luis Potosí»). */
  meta?: string;
  /** La foto redonda de un artista, a la izquierda del título; sin ella (`src` null), el símbolo SN redondo. */
  avatar?: { src: string | null; alt: string };
  /** `h1` en la página de la ficha; `h2` dentro de la hoja de Lugares, que ya tiene su propio título de pantalla. */
  nivel?: 1 | 2;
};

/**
 * El héroe de una ficha (docs/rediseno/50, P6): la portada 3:2 a todo lo ancho y, encima, en la misma celda de la rejilla, su
 * título sobre un velo con la etiqueta como chip, la meta y, si es un artista, su avatar. Tocar la portada la abre entera.
 * Lo mismo a pantalla completa (`ui/Ficha`) y dentro de la hoja de Lugares. La portada lleva `data-portada`: la barra compacta y la
 * hoja miden ahí cuándo la imagen ya se fue arriba.
 */
export default function Heroe({ portada, alt, titulo, etiqueta, meta, avatar, nivel = 1 }: Props) {
  const Titulo = nivel === 1 ? "h1" : "h2";
  return (
    <>
      <figure className={ficha.portada} data-portada>
        <Cartel src={portada} alt={alt} />
      </figure>
      <div className={avatar ? `${ficha.titulo} ${ficha.conAvatar}` : ficha.titulo}>
        {avatar && <Cartel src={avatar.src} alt={avatar.alt} forma="avatar" />}
        {etiqueta && <span className={ficha.etiqueta}>{etiqueta}</span>}
        <Titulo>{titulo}</Titulo>
        {meta && <p className={ficha.meta}>{meta}</p>}
      </div>
    </>
  );
}
