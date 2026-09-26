import Capacitor

/**
 * OL-213 (bitácora 242): APNs exige mandar cada token al servidor de SU entorno (api.push.apple.com o
 * api.sandbox.push.apple.com, src/lib/push.ts), y solo la app sabe cuál es (el certificado con el que corre no lo
 * ve la web). `#if DEBUG` distingue el esquema de depuración (Xcode, simulador: sandbox) del de Release/Archivo
 * (TestFlight y la tienda: producción) — la misma simplificación que pide el encargo; si algún día hay un
 * distribución ad-hoc en Debug esto se equivocaría, pero hoy este proyecto no la usa.
 *
 * Sin paquete de npm (como EntrarSistemaPlugin/GestoAtrasPlugin): un plugin nativo puro, registrado a mano en
 * MainViewController.swift. `src/lib/pushCliente.ts` lo llama tras registrar el token, antes de guardarlo.
 */
@objc(EntornoApnsPlugin)
public class EntornoApnsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "EntornoApnsPlugin"
    public let jsName = "EntornoApns"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "entorno", returnType: CAPPluginReturnPromise)
    ]

    @objc func entorno(_ call: CAPPluginCall) {
        #if DEBUG
        call.resolve(["entorno": "sandbox"])
        #else
        call.resolve(["entorno": "produccion"])
        #endif
    }
}
