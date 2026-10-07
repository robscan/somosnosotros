import type { ReactElement } from "react";
import type { TextosCartel } from "../datos";
import type { IdPaleta, Paleta } from "../paleta";
import type { Formato } from "../tokens";

/** Las seis familias del arranque (doc 52 §3.4), sacadas de las muestras del founder: tipografía, foto y formas; sin ilustración ni lettering. */
export type Familia = "cine" | "tipografico" | "feria" | "zine" | "galeria" | "deco";

/** Cómo prepara `dibujar.ts` la foto antes de ponerla: tal cual, en duotono (zine) o entonada en sepia (deco). */
export type Tratamiento = "natural" | "duotono" | "sepia";

/** Lo que recibe una plantilla para dibujarse: textos ya armados, el formato, la paleta y la foto (o nada). */
export type Contexto = {
  textos: TextosCartel;
  formato: Formato;
  paleta: Paleta;
  /** La foto ya preparada (data URL de un JPEG del tamaño del lienzo), o null: la plantilla dibuja su versión sin foto. */
  foto: string | null;
  /** El sello discreto «somosnosotros.org» en el pie (por decidir el founder si va siempre o solo en los sin costo; hoy, siempre). */
  sello: boolean;
};

/** Lo que devuelve: el árbol para satori y si hubo que cortar el título con «…» (la pantalla ofrece entonces «Acortar título»). */
export type Dibujo = { elemento: ReactElement; tituloRecortado: boolean };

export type Plantilla = {
  /** Estable: va en la URL, en `carteles_generados.plantilla` y en la memoria del lugar. */
  id: string;
  familia: Familia;
  /** El nombre que lee el lector de pantalla en la miniatura. */
  nombre: string;
  /** Sin foto no se ofrece (su versión sin foto existe solo como respaldo si la imagen falla al dibujar). */
  fotoNecesaria: boolean;
  /** Cuántos nombres de artistas enseña antes de «y N más». */
  artistasVisibles: number;
  /** Para qué lugares y disciplinas va mejor (ordena, no descarta). */
  afinidad: { tiposLugar: readonly string[]; disciplinas: readonly string[] };
  /** Las paletas que admite; la primera es la de siempre (sin foto o con una foto sin color). */
  paletas: readonly IdPaleta[];
  tratamiento: Tratamiento;
  dibujar: (c: Contexto) => Dibujo;
};
