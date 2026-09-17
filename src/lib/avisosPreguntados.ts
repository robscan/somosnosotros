/**
 * ¿Hay que hacer la pregunta de avisos? (bitácora 085). Lo dice la base (`avisos_preguntado`), pero Next reutiliza un rato
 * las páginas ya vistas (atrás y adelante, y un minuto con la barra inferior) con el dato de cuando se cargaron: sin la
 * marca de aquí, tras contestar en un evento y volver a la agenda, el siguiente Voy o Seguir volvía a preguntar. La marca
 * va atada a la cuenta que contestó: si otra persona entra en la misma pestaña sin recargar (así se entra con código), a
 * ella sí se le pregunta. Vive mientras la app esté abierta; al recargar, la página ya trae el dato de la base.
 */
let contestadaPor: string | null = null;

export function hayQuePreguntar(cuenta: string, preguntado: boolean): boolean {
  return !preguntado && contestadaPor !== cuenta;
}

/** Se llama solo cuando la respuesta quedó guardada. */
export function marcarAvisosContestados(cuenta: string): void {
  if (cuenta) contestadaPor = cuenta;
}
