/**
 * El único aviso de abajo de una pantalla y la pregunta de avisos que comparten sus listas y sus barras (OL-057,
 * bitácora 086). Aquí están las reglas, sin React, para poder probarlas:
 *
 * - **Un solo aviso a la vez.** El nuevo reemplaza al anterior y cada uno cierra solo el suyo (su número de vez): un
 *   Reintentar que publica su propio aviso no se borra a sí mismo.
 * - **Cada aviso tiene dueño.** Un toque nuevo limpia lo que él mismo puso, nunca lo de otro: si la barra borrara el
 *   "No se pudo guardar · Reintentar" de un renglón, ese renglón se quedaría sin guardar y sin que nadie lo viera
 *   (revisión de gestión de cambios, 2026-09-17).
 * - **La pregunta de avisos es un cerrojo, no un cupo.** Evita dos hojas a la vez en la pantalla; al cerrar la hoja sin
 *   que la respuesta quedara guardada, vuelve a estar libre, porque tocar fuera sin querer no puede dejar a la persona
 *   sin la única puerta a los recordatorios en toda la visita. A quien contesta lo cubre la marca por cuenta
 *   (`lib/avisosPreguntados`).
 */

/** El aviso de abajo: lo hecho con Deshacer, o que no se pudo guardar con Reintentar. */
export type Aviso = {
  texto: string;
  boton: () => void;
  etiqueta?: string;
  fallo?: boolean;
  /** Quién lo publicó (cada lista y cada barra, el suyo): solo él puede limpiarlo sin poner nada en su lugar. */
  de: string;
  /** Su turno en la pantalla; sube con cada aviso. */
  vez: number;
};

/** Publicar uno nuevo: reemplaza al anterior y toma el siguiente número. */
export function alAvisar(previo: Aviso | null, nuevo: Omit<Aviso, "vez">): Aviso {
  return { ...nuevo, vez: (previo?.vez ?? 0) + 1 };
}

/** Se acabó el tiempo de un aviso (o lo cerraron): solo se va si el de abajo sigue siendo ese. */
export function alCerrar(previo: Aviso | null, vez: number): Aviso | null {
  return previo?.vez === vez ? null : previo;
}

/** Un toque nuevo que todavía no tiene su aviso: quita el suyo anterior y deja en paz el de otro. */
export function alLimpiar(previo: Aviso | null, de: string): Aviso | null {
  return previo && previo.de === de ? null : previo;
}

/** El cerrojo de la pregunta de avisos de una pantalla: una hoja a la vez; al cerrarse, libre otra vez. */
export function cerrojoDePregunta(): { tomar: () => boolean; soltar: () => void } {
  let tomado = false;
  return {
    tomar: () => {
      if (tomado) return false;
      tomado = true;
      return true;
    },
    soltar: () => {
      tomado = false;
    },
  };
}
