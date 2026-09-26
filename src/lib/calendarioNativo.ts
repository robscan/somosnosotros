import type { EventoCalendarioNativo } from "./calendario";

/**
 * «A mi calendario» dentro de la app de iPhone (OL-214, bitácora 243): en vez de descargar el .ics, abre la hoja
 * nativa del sistema con `CalendarioPlugin` (apps/ios/ios/App/App/CalendarioPlugin.swift, `EKEventEditViewController`
 * de EventKitUI, registrado a mano en `MainViewController.capacitorDidLoad()`, sin paquete de npm — mismo patrón que
 * `EntrarSistemaPlugin`/`GestoAtrasPlugin`). Lo que Capacitor pone en `window` ahí; en Safari o Chrome no existe.
 */
type PuenteCalendario = { agregarEvento: (datos: EventoCalendarioNativo) => Promise<{ guardado: boolean }> };

/** La forma de `window` que le hace falta a `calendarioDelSistema` (para pasar el `window` real, o uno de prueba). */
export type VentanaConCalendario = { Capacitor?: { Plugins?: { Calendario?: PuenteCalendario } } };

/**
 * El plugin nativo, si esta página corre dentro de la app (`window.Capacitor` existe); `null` en el navegador
 * normal, donde el `<a>` sigue como siempre (descarga el .ics). Recibe `ventana` para probarse sin DOM.
 */
export function calendarioDelSistema(ventana: VentanaConCalendario): PuenteCalendario | null {
  return ventana.Capacitor?.Plugins?.Calendario ?? null;
}
