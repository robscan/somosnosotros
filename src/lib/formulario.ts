/** Lo común de leer formularios: antes estaba copiado en eventos, lugares, artistas y perfil. */

/** Texto de un campo: recortado y con los espacios de más colapsados; lo que no es texto queda vacío. */
export function limpiar(v: FormDataEntryValue | string | null | undefined): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
}

/** Un id de la base (uuid en minúsculas): lo que llega por la URL o el formulario se comprueba antes de consultar. */
export function esUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f-]{36}$/.test(v);
}
