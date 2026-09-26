/**
 * Cuándo aplicar lo elegido en el `<input type="date">` nativo de `ui/ChipFecha` (OL-204, bitácora 233:
 * regresión de OL-188). En Safari de iPhone, abrir el selector con el campo vacío hace que el sistema muestre
 * hoy y dispare `change` de inmediato — antes de que la persona haya elegido nada. Aplicar ese primer `change`
 * filtraba solo por abrir el selector y lo cerraba de golpe («se selecciona automáticamente el día actual y se
 * cierra selector», founder). El arreglo: `change` solo guarda lo elegido; se aplica hasta que el selector se
 * cierra (`blur`, que dispara "Listo" o tocar fuera). Cancelar sin elegir (`blur` sin `change` antes) no filtra.
 *
 * Esta máquina de estados también cubre el orden distinto de algunos navegadores (Chrome de Android: el `blur`
 * del diálogo puede llegar antes que el `change` con la fecha elegida) sin aplicar dos veces: una vez aplicado,
 * el resto de eventos se ignora hasta el próximo `focus` (una nueva apertura del selector).
 *
 * Un `focus` de más DENTRO de la misma apertura (comprobado con Chrome de escritorio: fijar por código el valor
 * de un `<input type="date">` con foco dispara un `focus` extra, aunque el foco nunca salió del campo) no borra
 * lo pendiente — solo un `focus` que llega después de cerrar (`cerrado` o `aplicado`) empieza una apertura nueva.
 */

export type EventoFechaNativa = { tipo: "focus" } | { tipo: "change"; valor: string } | { tipo: "blur" };

export type EstadoFechaNativa = {
  /** Lo último que llegó por `change` desde que se abrió el selector; "" si nada todavía. */
  pendiente: string;
  /** Ya hubo `blur` en esta apertura. */
  cerrado: boolean;
  /** Ya se llamó a `onCambiar` en esta apertura; bloquea eventos tardíos para no aplicar dos veces. */
  aplicado: boolean;
};

export const ESTADO_INICIAL_FECHA_NATIVA: EstadoFechaNativa = { pendiente: "", cerrado: false, aplicado: false };

/** El siguiente estado y, si toca, el valor a pasar a `onCambiar` (null = no llamarlo). Sin efectos, se prueba sola. */
export function siguienteEstadoFechaNativa(estado: EstadoFechaNativa, evento: EventoFechaNativa): { estado: EstadoFechaNativa; aplicar: string | null } {
  if (evento.tipo === "focus") {
    // Solo una apertura ya cerrada empieza de cero; un `focus` de más a mitad de la misma apertura se ignora.
    return estado.cerrado || estado.aplicado ? { estado: ESTADO_INICIAL_FECHA_NATIVA, aplicar: null } : { estado, aplicar: null };
  }

  if (estado.aplicado) return { estado, aplicar: null };

  if (evento.tipo === "change") {
    if (estado.cerrado) {
      // El selector ya cerró (blur) y este `change` llegó después (orden de Android): aplicar ya, si trae valor.
      if (!evento.valor) return { estado, aplicar: null };
      return { estado: { ...estado, aplicado: true }, aplicar: evento.valor };
    }
    return { estado: { ...estado, pendiente: evento.valor }, aplicar: null };
  }

  // blur
  if (estado.cerrado) return { estado, aplicar: null };
  if (!estado.pendiente) return { estado: { ...estado, cerrado: true }, aplicar: null };
  return { estado: { ...estado, cerrado: true, aplicado: true }, aplicar: estado.pendiente };
}
