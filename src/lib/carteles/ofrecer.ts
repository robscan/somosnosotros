import { armarTextos, type EventoCartel, type TextosCartel } from "./datos";
import { cuantasTandas, elegir, type Datos } from "./elegir";
import { PALETAS } from "./paleta";
import { CATALOGO, type Plantilla } from "./plantillas";
import { FORMATOS, type IdFormato } from "./tokens";

/**
 * Lo que la pantalla del creador ofrece (OL-324): las cuatro plantillas de la tanda y cuáles tendrían que cortar el título (doc 52 §3.3, capa 4:
 * cada opción se compone y se mide antes de mostrarla). Componer es armar el árbol con las medidas, sin dibujar: menos de un milisegundo por
 * plantilla, así la pantalla lo sabe sin pedir ninguna imagen. Puro.
 */

/** ¿Esta plantilla corta el título en este formato? Se compone con una foto ficticia si hay imagen (la foto no cambia la medida del texto). */
export function cortaElTitulo(plantilla: Plantilla, textos: TextosCartel, formato: IdFormato, conImagen: boolean): boolean {
  return plantilla.dibujar({ textos, formato: FORMATOS[formato], paleta: PALETAS[plantilla.paletas[0]], foto: conImagen ? "data:," : null, sello: true }).tituloRecortado;
}

export type Oferta = { opciones: Plantilla[]; tandas: number; textos: TextosCartel; recortan: Set<string> };

export function ofrecer(evento: EventoCartel, datos: Datos, { titulo = null, pagina = 0, formato = "4x5", ahora }: { titulo?: string | null; pagina?: number; formato?: IdFormato; ahora?: Date } = {}): Oferta {
  const textos = armarTextos(evento, titulo, ahora);
  const recortan = new Set(CATALOGO.filter((p) => textos.tituloRecortado || cortaElTitulo(p, textos, formato, datos.conImagen)).map((p) => p.id));
  const conRecortes = { ...datos, recortan };
  return { opciones: elegir(CATALOGO, conRecortes, pagina), tandas: cuantasTandas(CATALOGO, conRecortes), textos, recortan };
}
