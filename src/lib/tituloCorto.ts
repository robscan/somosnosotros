/**
 * El título corto de un evento, el que va en la franja de la tarjeta «título + cartel» de Inicio (OL-360; prototipo firmado `barra-ahora.html`,
 * bitácora 388). Es lo que va antes de los dos puntos, como ya se escriben los títulos de la app («La música de la generación trentina: docufilm…»).
 * Si eso es solo el tipo («Inauguración: Dos siglos…») o el nombre de su festival («CINEMA: El atractivo…») y sigue un nombre (empieza con
 * mayúscula), ese nombre: «Verbena, Ritmo y Sabor: verbena musical» se queda con el festival. Sin dos puntos, lo que va antes de una coma seguida
 * de minúscula («…, de Jacobo Reyna»); una coma dentro del nombre («Verbena, Ritmo y Sabor») no corta. El título completo no se pierde: va en el
 * nombre accesible de la tarjeta, en la ficha y en la historia.
 */
const TIPOS = /^(inauguración|presentación|concierto|taller|charla|conferencia|exposición|proyección|recital|función|clausura|cine)$/i;

export function tituloCorto(titulo: string, festival?: string | null): string {
  const t = titulo.trim();
  const i = t.search(/:\s/);
  if (i > 0) {
    const antes = t.slice(0, i).trim();
    const resto = t.slice(i + 2).trim();
    const esPrefijo = TIPOS.test(antes) || (!!festival && antes.toLocaleLowerCase("es") === festival.trim().toLocaleLowerCase("es"));
    return esPrefijo && /^[¡¿«"]?\p{Lu}/u.test(resto) ? tituloCorto(resto, festival) : antes;
  }
  return t.split(/,\s(?=\p{Ll})/u)[0].replace(/\.$/, "");
}
