import type { Map as MapaGL } from "mapbox-gl";

/**
 * Cuánto se espera, tras desmontar un mapa que ya terminó su primera carga, para destruirlo: lo que tardan en volver las dos peticiones de
 * telemetría que Mapbox manda en ese momento (cientos de milisegundos con red; al instante si algo las bloquea).
 */
export const ESPERA_TELEMETRIA_MS = 15_000;

/**
 * Cómo se quita un mapa de Mapbox al desmontar su componente, sin el error de la librería (mapbox-gl 3.30, y sigue en 3.32): al terminar la
 * primera carga, cada mapa manda el «map.load» (events.mapbox.com) y la sesión (/map-sessions) con un aviso de error que Mapbox guarda en un
 * objeto compartido por todos sus mapas; `Map.remove()` lo deja en null, y si una de esas peticiones falla después (bloqueada, sin red, abortada),
 * la librería llama a ese null y lanza «this.errorCb is not a function» (CI del PR #401, pantalla s19: confirmar «¿Dónde está?» justo después
 * de que el mapa cargó; reproducido en `MapaDondeEs.componentes.test.mjs`).
 *
 * `seguirMapa` se llama al crear el mapa y devuelve con qué quitarlo: si todavía no terminó su primera carga, no mandó nada y se destruye al
 * momento; si ya la terminó, su lienzo ya salió de la página con el componente y se destruye cuando su telemetría ya tuvo tiempo de volver.
 */
export function seguirMapa(mapa: MapaGL): () => void {
  let cargo = false;
  // La telemetría sale en el mismo cuadro en que el mapa queda quieto por primera vez («idle»).
  mapa.once("idle", () => {
    cargo = true;
  });
  return () => {
    if (!cargo) mapa.remove();
    else window.setTimeout(() => mapa.remove(), ESPERA_TELEMETRIA_MS);
  };
}
