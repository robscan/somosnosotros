/**
 * Ya se contestó la pregunta de avisos en esta visita (bitácora 085). Next reutiliza páginas ya vistas (atrás y adelante,
 * y un minuto con la barra inferior) con el `avisos_preguntado` de cuando se cargaron: sin esto, tras contestar en un
 * evento y volver a la agenda, el siguiente Voy o Seguir volvía a preguntar. Vive mientras la app esté abierta; al
 * recargar, la página ya trae el dato nuevo de la base.
 */
let contestada = false;

export function avisosYaContestados(): boolean {
  return contestada;
}

export function marcarAvisosContestados(): void {
  contestada = true;
}
