import Capacitor
import EventKit
import EventKitUI

/**
 * OL-214 (bitácora 243): «A mi calendario» dentro de la app abre la hoja nativa del sistema en vez de descargar el
 * .ics (`src/app/eventos/[id]/calendario/route.ts`). `EKEventEditViewController` (EventKitUI), desde iOS 17, no
 * pide acceso al calendario para esta vía de solo agregar: el permiso de "acceso completo" (`requestFullAccessToEvents`)
 * solo hace falta para leer o modificar eventos que ya existen, no para que la persona agregue uno nuevo con la hoja
 * del sistema (Apple, WWDC23 "What's new in EventKit"). Por eso Info.plist no lleva ninguna clave nueva — se probó
 * sin ella en el simulador (iOS 26): la hoja aparece de una vez, sin ningún aviso de permiso de por medio.
 *
 * Sin paquete de npm (como `EntrarSistemaPlugin`/`GestoAtrasPlugin`): se registra a mano en
 * `MainViewController.capacitorDidLoad()`. A diferencia de esos dos sí tiene un método que la web llama
 * (`agregarEvento`, ver `src/lib/calendarioNativo.ts` y `src/components/BotonCalendario.tsx`), así que además de
 * `CAPBridgedPlugin` declara `pluginMethods`.
 */
@objc(CalendarioPlugin)
public class CalendarioPlugin: CAPPlugin, CAPBridgedPlugin, EKEventEditViewDelegate {
    public let identifier = "CalendarioPlugin"
    public let jsName = "Calendario"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "agregarEvento", returnType: CAPPluginReturnPromise),
    ]

    /// `inicio`/`fin` llegan en el mismo formato que ya arma la web para el .ics (`aFechaIcs`, `datosEventoNativo`):
    /// un instante absoluto en ISO 8601 (con o sin milisegundos) — nunca hay que reinterpretarlo por zona horaria,
    /// EventKit y el Calendario del teléfono ya muestran cualquier `Date` en la hora local de quien mira.
    private static func fecha(_ iso: String) -> Date? {
        let conMilisegundos = ISO8601DateFormatter()
        conMilisegundos.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = conMilisegundos.date(from: iso) { return d }
        return ISO8601DateFormatter().date(from: iso)
    }

    /// Se retiene mientras la hoja está abierta: la resuelve `eventEditViewController(_:didCompleteWith:)`.
    private var llamadaActual: CAPPluginCall?

    @objc func agregarEvento(_ call: CAPPluginCall) {
        guard let titulo = call.getString("titulo"), let inicioIso = call.getString("inicio"), let finIso = call.getString("fin"),
              let inicio = Self.fecha(inicioIso), let fin = Self.fecha(finIso)
        else {
            call.reject("Faltan datos del evento")
            return
        }
        guard let bridge = bridge else {
            call.reject("Sin puente de Capacitor")
            return
        }

        // Capacitor llama los métodos del plugin en una cola de fondo (`handleJSCall`): `EKEventEditViewController`
        // (como cualquier `UIViewController`) solo se puede crear y presentar en el hilo principal — construirlo
        // antes, fuera de este bloque, tronaba la app ("Modifications to the layout engine must not be performed
        // from a background thread", visto en el simulador antes de esta corrección).
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            guard let vc = bridge.viewController else {
                call.reject("Sin pantalla donde mostrar la hoja")
                return
            }
            let store = EKEventStore()
            let evento = EKEvent(eventStore: store)
            evento.title = titulo
            evento.startDate = inicio
            evento.endDate = fin
            if let lugar = call.getString("lugar"), !lugar.isEmpty { evento.location = lugar }
            if let notas = call.getString("notas"), !notas.isEmpty { evento.notes = notas }
            if let url = call.getString("url") { evento.url = URL(string: url) }

            let editor = EKEventEditViewController()
            editor.event = evento
            editor.eventStore = store
            editor.editViewDelegate = self
            self.llamadaActual = call
            vc.present(editor, animated: true)
        }
    }

    public func eventEditViewController(_ controller: EKEventEditViewController, didCompleteWith action: EKEventEditViewAction) {
        controller.dismiss(animated: true) { [weak self] in
            self?.llamadaActual?.resolve(["guardado": action == .saved])
            self?.llamadaActual = nil
        }
    }
}
