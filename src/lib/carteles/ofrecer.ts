import { armarTextos, type EventoCartel, type TextosCartel } from "./datos";
import { tandasDe, type Datos, type Eleccion } from "./elegir";
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

/** Las tandas, en orden, con lo que corta el título con foto (`recortan`) y en la versión sin foto (`recortanSinFoto`, la tipográfica de cada tanda). */
export type Oferta = { tandas: Eleccion[][]; textos: TextosCartel; recortan: Set<string>; recortanSinFoto: Set<string> };

export function ofrecer(evento: EventoCartel, datos: Datos, { titulo = null, formato = "4x5", ahora }: { titulo?: string | null; formato?: IdFormato; ahora?: Date } = {}): Oferta {
  const textos = armarTextos(evento, titulo, ahora);
  const corta = (conImagen: boolean) => new Set(CATALOGO.filter((p) => textos.tituloRecortado || cortaElTitulo(p, textos, formato, conImagen)).map((p) => p.id));
  const recortanSinFoto = corta(false);
  const recortan = datos.conImagen ? corta(true) : recortanSinFoto;
  return { tandas: tandasDe(CATALOGO, { ...datos, recortan, recortanSinFoto }), textos, recortan, recortanSinFoto };
}

/** ¿Corta el título esta opción? Según se dibuje con foto o sin ella. */
export function cortaLaOpcion(o: Eleccion, oferta: Pick<Oferta, "recortan" | "recortanSinFoto">): boolean {
  return (o.sinFoto ? oferta.recortanSinFoto : oferta.recortan).has(o.plantilla.id);
}
