import type { FalloAlSubir } from "@/lib/subirFoto";

/**
 * En qué va la tarjeta del cartel (docs/rediseno/22). Sin esto, está en reposo pidiendo el primero.
 * Las transiciones viven aquí, sueltas del componente, para poder probarlas.
 */
export type EstadoCartel = { estado: "leyendo" | "leido" | "fallo"; titulo?: string; mensaje?: string; foto?: string } | null;

/**
 * La foto nueva no llegó a subirse. Se conserva la que ya estaba —sigue siendo la imagen del evento— y se dice,
 * porque si no la tarjeta parece haberla perdido. El titular lo pone la tarjeta: aquí solo va el motivo o lo que
 * toca hacer, nunca "falló" otra vez (revisión de la bitácora 095).
 */
export function falloAlSubir(anterior: string | undefined, error: string, motivo: FalloAlSubir): NonNullable<EstadoCartel> {
  const dice = motivo === "pesa" ? error : "Intenta con otra foto.";
  return { estado: "fallo", titulo: "No pude subir el cartel", foto: anterior, mensaje: anterior ? `${dice} El cartel de antes se queda.` : dice };
}

/** Se subió pero no se pudo leer: la foto nueva se queda como imagen del evento. */
export function falloAlLeer(foto: string | undefined, mensaje: string): NonNullable<EstadoCartel> {
  return { estado: "fallo", foto, mensaje };
}

/**
 * Se cortó a mitad: se cayó la señal, el servidor tardó de más o la función se agotó. La tarjeta no puede quedarse
 * en "Leyendo el cartel…" para siempre, así que cae aquí con lo que se pueda salvar.
 */
export function falloDeCorte(actual: EstadoCartel, anterior: string | undefined): NonNullable<EstadoCartel> {
  return { estado: "fallo", titulo: "Se cortó a la mitad", foto: actual?.foto ?? anterior, mensaje: "Revisa tu conexión y prueba otra vez." };
}

/** Leído: el titular ya dice "Leí el cartel", así que el mensaje solo dice qué revisar. */
export function leido(foto: string, faltan: string[]): NonNullable<EstadoCartel> {
  return { estado: "leido", foto, mensaje: faltan.length ? `Revisa ${faltan.join(", ")} y publica.` : "Revisa que todo esté bien y publica." };
}
