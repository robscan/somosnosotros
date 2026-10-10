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

/**
 * El título como oración, el que va debajo del cartel en la tarjeta de evento de Inicio (OL-370; prototipo firmado `inicio-tarjetas.html`, E1,
 * `comoOracion`): una palabra toda en mayúsculas de cuatro letras o más pasa a minúsculas («DESIERTO» → «Desierto», «MERK LOCAL EDICIÓN» →
 * «Merk local edición»), con la primera letra en mayúscula si es la primera palabra; las siglas cortas se quedan («XV Festival», «ONU»). Lo demás
 * no se toca: un nombre propio que ya viene en minúsculas sigue igual.
 */
export function comoOracion(titulo: string): string {
  let primera = true;
  return titulo
    .split(/(\s+)/)
    .map((palabra) => {
      if (!palabra.trim()) return palabra;
      const letras = palabra.replace(/[^\p{L}]/gu, "");
      let dicha = palabra;
      if (letras.length >= 4 && letras === letras.toLocaleUpperCase("es")) {
        dicha = palabra.toLocaleLowerCase("es");
        if (primera) dicha = dicha.replace(/\p{L}/u, (c) => c.toLocaleUpperCase("es"));
      }
      primera = false;
      return dicha;
    })
    .join("");
}
