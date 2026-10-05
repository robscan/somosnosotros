/** Lo común de los formularios: antes estaba copiado en eventos, lugares, artistas y perfil. */

/** Texto de un campo: recortado y con los espacios de más colapsados; lo que no es texto queda vacío. */
export function limpiar(v: FormDataEntryValue | string | null | undefined): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
}

/** Un id de la base (uuid en minúsculas): lo que llega por la URL o el formulario se comprueba antes de consultar. */
export function esUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f-]{36}$/.test(v);
}

/**
 * Lo que falta para publicar, en una frase corta: es la única nota que lleva el botón («Falta el nombre y dónde es.»).
 * Las partes van en el orden en que se piden; sin ninguna, ya se puede publicar (null).
 */
export function queFalta(partes: readonly (string | false)[]): string | null {
  const faltan = partes.filter((p): p is string => p !== false);
  if (faltan.length === 0) return null;
  const ultima = faltan[faltan.length - 1];
  return `Falta ${faltan.length === 1 ? ultima : `${faltan.slice(0, -1).join(", ")} y ${ultima}`}.`;
}

/** Un evento pide nombre y dónde es. «Por confirmar»: el sitio se leyó del cartel, pero falta poner el pin. */
export function faltaEnEvento({ nombre, donde }: { nombre: string; donde: "listo" | "por-confirmar" | "falta" }): string | null {
  return queFalta([!nombre.trim() && "el nombre", donde === "falta" && "dónde es", donde === "por-confirmar" && "confirmar dónde es"]);
}

/** Un lugar pide nombre y dónde está; su tipo se deduce del nombre y nunca detiene. */
export function faltaEnLugar({ nombre, ubicado }: { nombre: string; ubicado: boolean }): string | null {
  return queFalta([!nombre.trim() && "el nombre", !ubicado && "dónde está"]);
}

/** Un artista pide el nombre y qué hace (su disciplina, que no se adivina sin pista en el nombre), y que no tenga ya ficha en su ciudad. */
export function faltaEnArtista({ nombre, conDisciplina, repetido }: { nombre: string; conDisciplina: boolean; repetido: boolean }): string | null {
  return queFalta([!nombre.trim() && "el nombre", !conDisciplina && "la disciplina"]) ?? (repetido ? "Ese nombre ya tiene ficha." : null);
}
