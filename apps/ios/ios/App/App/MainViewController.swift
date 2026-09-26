import Capacitor
import Network

/**
 * OL-194: dos cambios sobre la vista base de Capacitor.
 *
 * 1. Registrar `EntrarSistemaPlugin` (ver ese archivo) a mano: no se genera solo (Capacitor arma la lista de
 *    plugins a registrar leyendo `capacitor.config.json`, que lista los paquetes de npm; este plugin es nativo
 *    puro, sin paquete). `capacitorDidLoad()` es el enganche que Capacitor ofrece para registrar plugins propios,
 *    y `registerPluginInstance` no depende de `autoRegisterPlugins`.
 *
 * 2. La página de "Sin conexión" (apps/ios/www/index.html): se muestra a mano con `NWPathMonitor`, nunca con la
 *    opción `server.errorPath` de Capacitor (ver el comentario de capacitor.config.ts: esa dispara con cualquier
 *    navegación cancelada, incluida la que EntrarSistemaPlugin cancela a propósito para abrir Apple o Google en
 *    el navegador del sistema).
 */
class MainViewController: CAPBridgeViewController {
    private let monitorDeRed = NWPathMonitor()
    private var mostrandoSinConexion = false

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(EntrarSistemaPlugin())
        observarRed()
    }

    private func observarRed() {
        monitorDeRed.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async { self?.alCambiarRed(hayRed: path.status == .satisfied) }
        }
        monitorDeRed.start(queue: DispatchQueue(label: "org.somosnosotros.app.red"))
    }

    private func alCambiarRed(hayRed: Bool) {
        guard let webView = webView, let config = bridge?.config else { return }
        if !hayRed, !mostrandoSinConexion, let sinConexion = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "public") {
            mostrandoSinConexion = true
            webView.loadFileURL(sinConexion, allowingReadAccessTo: sinConexion.deletingLastPathComponent())
        } else if hayRed, mostrandoSinConexion {
            mostrandoSinConexion = false
            webView.load(URLRequest(url: config.appStartServerURL))
        }
    }

    deinit {
        monitorDeRed.cancel()
    }
}
