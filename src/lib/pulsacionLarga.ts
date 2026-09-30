/**
 * La pulsación larga del mapa de Lugares (ajuste del founder, 2026-09-30): sostener un dedo en un punto del mapa para registrar ahí un lugar.
 * Aquí solo se decide si un gesto lo es, sin DOM ni reloj: una máquina de estados a la que quien la usa (`usePulsacionLarga`) le cuenta lo que
 * pasa —un dedo baja, se mueve, sube, se cancela, pasó el tiempo— y que contesta dónde fue, una sola vez por gesto.
 *
 * Es una pulsación larga si un dedo baja, se queda quieto (a lo más `TOLERANCIA_PX`), ningún otro baja, el mapa no empieza a moverse y nadie
 * lo cancela durante `RETENCION_MS`. Y nunca si es el segundo toque de un doble toque (`DOBLE_TOQUE_MS`): «toca, toca y arrastra» acerca el
 * mapa. Con dos dedos no se arma hasta que levantan los dos.
 */

/** Cuánto hay que sostener. */
export const RETENCION_MS = 500;
/** Cuánto puede moverse el dedo sin que deje de ser un dedo quieto. */
export const TOLERANCIA_PX = 10;
/** Un toque que baja antes de que pasen tantos ms desde que subió el anterior es el segundo de un doble toque. */
export const DOBLE_TOQUE_MS = 300;
/** Desde cuándo se ve el anillo que dice «sigue sosteniendo»: un toque corto nunca lo enseña. */
export const ANILLO_DESDE_MS = 150;

/** Un punto en px, desde la esquina de arriba a la izquierda del mapa. */
export type PuntoEnMapa = { x: number; y: number };

/** Lo que se le cuenta: `dedos` son los que hay puestos en ese momento (al bajar, con el que baja; al subir, los que quedan). */
export type Entrada =
  | { tipo: "bajar"; t: number; x: number; y: number; dedos: number }
  | { tipo: "mover"; x: number; y: number; dedos: number }
  | { tipo: "subir"; t: number; dedos: number }
  /** `touchcancel`, o el mapa empezó a moverse (`dragstart`, `zoomstart`, `rotatestart`, `pitchstart`). */
  | { tipo: "cancelar" }
  /** Pasaron `RETENCION_MS` desde que bajó el dedo. */
  | { tipo: "retencion" };

export type Estado = {
  fase: "libre" | "armado" | "disparado" | "anulado";
  /** Dónde bajó el dedo (de donde se mide la tolerancia) y dónde está ahora, dentro de ella. */
  inicio: PuntoEnMapa;
  ahora: PuntoEnMapa;
  /** Cuándo subió el último dedo (`t` de la entrada). */
  soltadoEn: number;
};

export const EN_REPOSO: Estado = { fase: "libre", inicio: { x: 0, y: 0 }, ahora: { x: 0, y: 0 }, soltadoEn: -Infinity };

/** Lo que pasa con esa entrada: el estado nuevo y, solo al cumplirse `RETENCION_MS` de un dedo quieto, el punto de la pulsación larga. */
export function avanzar(estado: Estado, e: Entrada): { estado: Estado; larga: PuntoEnMapa | null } {
  const sigue = (cambios: Partial<Estado>) => ({ estado: { ...estado, ...cambios }, larga: null });
  switch (e.tipo) {
    case "bajar": {
      if (e.dedos > 1 || e.t - estado.soltadoEn < DOBLE_TOQUE_MS) return sigue({ fase: "anulado" });
      const punto = { x: e.x, y: e.y };
      return sigue({ fase: "armado", inicio: punto, ahora: punto });
    }
    case "mover": {
      if (estado.fase !== "armado") return sigue({});
      if (e.dedos > 1 || Math.hypot(e.x - estado.inicio.x, e.y - estado.inicio.y) > TOLERANCIA_PX) return sigue({ fase: "anulado" });
      return sigue({ ahora: { x: e.x, y: e.y } });
    }
    case "subir":
      return sigue({ fase: e.dedos > 0 ? "anulado" : "libre", soltadoEn: e.t });
    case "cancelar":
      return sigue({ fase: "anulado" });
    case "retencion":
      return estado.fase === "armado" ? { estado: { ...estado, fase: "disparado" }, larga: estado.ahora } : sigue({});
  }
}
