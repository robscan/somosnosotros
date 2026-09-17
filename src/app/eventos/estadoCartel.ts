import type { FalloAlSubir } from "@/lib/subirFoto";

/**
 * En qué va la tarjeta del cartel (docs/rediseno/22). Sin esto, está en reposo pidiendo el primero.
 * Las transiciones viven aquí, sueltas del componente, para poder probarlas.
 */
export type EstadoCartel = { estado: "leyendo" | "leido" | "fallo"; titulo?: string; mensaje?: string; foto?: string } | null;

/**
 * La foto nueva no llegó a subirse.
 *
 * `imagenDelEvento` es la imagen que de verdad se va a publicar, no la foto de la tarjeta: si por "Más" se cambió,
 * decir "el cartel de antes se queda" sería mentira (revisión de la bitácora 095). De ahí salen la miniatura y el
 * aviso de que no se pierde nada.
 *
 * El titular ya dice que no se pudo, y el chip de abajo ya dice qué hacer: aquí va **la causa**, nada más.
 */
export function falloAlSubir(imagenDelEvento: string | null, error: string, motivo: FalloAlSubir): NonNullable<EstadoCartel> {
  // "pesa" trae su propia causa con el tamaño; lo demás, en la práctica, es la señal.
  const causa = motivo === "pesa" ? error.replace(/\s*Elige otra\.\s*$/, "") : "Puede ser tu conexión.";
  return { estado: "fallo", titulo: "No pude subir el cartel", foto: imagenDelEvento ?? undefined, mensaje: imagenDelEvento ? `${causa} La imagen que ya tenías se queda.` : causa };
}

/** Se subió pero no se pudo leer: la foto nueva se queda como imagen del evento. */
export function falloAlLeer(foto: string | undefined, mensaje: string): NonNullable<EstadoCartel> {
  return { estado: "fallo", foto, mensaje };
}

/**
 * Se cortó a mitad: se cayó la señal, el servidor tardó de más o la función se agotó. La tarjeta no puede quedarse
 * en "Leyendo el cartel…" para siempre, así que cae aquí con lo que se pueda salvar.
 */
export function falloDeCorte(actual: EstadoCartel, imagenDelEvento: string | null): NonNullable<EstadoCartel> {
  return { estado: "fallo", titulo: "Se cortó a la mitad", foto: actual?.foto ?? imagenDelEvento ?? undefined, mensaje: "Puede ser tu conexión." };
}

/** Leído: el titular ya dice "Leí el cartel", así que el mensaje solo dice qué revisar. */
export function leido(foto: string, faltan: string[]): NonNullable<EstadoCartel> {
  return { estado: "leido", foto, mensaje: faltan.length ? `Revisa ${faltan.join(", ")} y publica.` : "Revisa que todo esté bien y publica." };
}
