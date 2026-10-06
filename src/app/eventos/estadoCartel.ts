import type { FalloAlSubir } from "@/lib/subirFoto";
import type { Cupo } from "./acciones";

/**
 * En qué va la tarjeta del cartel (docs/rediseno/22). Sin esto, está en reposo pidiendo el primero.
 * Las transiciones viven aquí, sueltas del componente, para poder probarlas.
 */
export type EstadoCartel = { estado: "leyendo" | "leido" | "fallo" | "sin_cupo"; titulo?: string; mensaje?: string; foto?: string } | null;

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

/** "el 1 de octubre": cuándo vuelve a haber cupo, en la hora de la ciudad, como lo dice la base. */
export function cuandoSeRenueva(ahora: Date = new Date()): string {
  const [anio, mes] = mesDelCupo(ahora).split("-").map(Number);
  const primero = new Date(Date.UTC(anio, mes, 1));
  return `el 1 de ${new Intl.DateTimeFormat("es-MX", { month: "long", timeZone: "UTC" }).format(primero)}`;
}

/** El periodo del servidor, independiente de la zona del dispositivo. */
export function mesDelCupo(ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit" }).formatToParts(ahora);
  return `${partes.find((p) => p.type === "year")!.value}-${partes.find((p) => p.type === "month")!.value}`;
}

/** Cuántas quedan; solo se dice cuando ya son pocas, porque quien tiene 17 no necesita saberlo. */
export const AVISAR_DESDE = 3;

/** El estado con el que llega la tarjeta: sin cupo pesa más que el reposo. */
export function alLlegar(cupo: Cupo | null): EstadoCartel {
  return lecturaAgotada(cupo) ? { estado: "sin_cupo" } : null;
}

/** ¿Se acabaron las lecturas del mes? Sin saber el cupo (null) no se asume nada: lo decide el servidor al leer. */
export function lecturaAgotada(cupo: Cupo | null): boolean {
  return !!cupo && !cupo.sinTope && cupo.usadas >= cupo.tope;
}

/** Cuántas lecturas quedan este mes; null si no se sabe o si no hay tope. */
export function lecturasQueQuedan(cupo: Cupo | null): number | null {
  return cupo && !cupo.sinTope ? Math.max(0, cupo.tope - cupo.usadas) : null;
}

/**
 * Lo que dice debajo de «Lectura automática» (la casilla del primer paso del alta por pasos y el renglón del perfil; OL-307, bitácora 335):
 * cuántas quedan, cuándo vuelven si no queda ninguna, «Sin límite» para quien no tiene tope; null si no se sabe el cupo. Nunca la palabra «gratis».
 */
export function detalleDeLecturas(cupo: Cupo | null, ahora: Date = new Date()): string | null {
  if (!cupo) return null;
  if (cupo.sinTope) return "Sin límite";
  const quedan = lecturasQueQuedan(cupo) ?? 0;
  if (quedan === 0) return `Se renueva ${cuandoSeRenueva(ahora)}`;
  return `${quedan === 1 ? "Queda" : "Quedan"} ${quedan} este mes`;
}

/**
 * ¿Se lee este cartel? Solo con servicio de lectura, con la casilla marcada y con lecturas que quedan. El cartel se sube siempre; leerlo es
 * lo que esto decide. Sin saber el cupo se intenta: si ya no hay, el servidor lo dice y el cartel queda guardado sin leer.
 */
export function seLee({ servicio, marcada, cupo }: { servicio: boolean; marcada: boolean; cupo: Cupo | null }): boolean {
  return servicio && marcada && !lecturaAgotada(cupo);
}
