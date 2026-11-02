import Capacitor
import Network
import UserNotifications
import WebKit

/**
 * OL-194: dos cambios sobre la vista base de Capacitor.
 *
 * 1. Registrar `EntrarSistemaPlugin` (ver ese archivo) a mano: no se genera solo (Capacitor arma la lista de
 *    plugins a registrar leyendo `capacitor.config.json`, que lista los paquetes de npm; este plugin es nativo
 *    puro, sin paquete). `capacitorDidLoad()` es el enganche que Capacitor ofrece para registrar plugins propios,
 *    y `registerPluginInstance` no depende de `autoRegisterPlugins`.
 *
 * 2. «No se pudo cargar» (OL-503, bitácora 536, `RespaldoCarga.swift`): una vista nativa sobre el WKWebView cuando el
 *    documento propio no llega (error de red, 500 o más, o 12 s sin respuesta), nunca con la opción `server.errorPath`
 *    de Capacitor (ver el comentario de capacitor.config.ts: esa dispara con cualquier navegación cancelada, incluida
 *    la que EntrarSistemaPlugin cancela a propósito para abrir Apple o Google en el navegador del sistema).
 *    `NWPathMonitor` ya no cambia la pantalla al perder la red (antes cargaba `www/index.html` encima de lo que hubiera,
 *    y su «Reintentar» recargaba ese archivo local): lo ya cargado se queda («primero lo cargado», bitácora 533), y si
 *    una navegación falla sin red sale el respaldo. Al volver la ruta, el respaldo se reintenta solo tras 1 s.
 *
 * OL-205 (auditoría OL-202, docs/rediseno/48-shell-ios.md §3.3): el gesto de deslizar desde el borde para volver
 * se enciende aquí (`allowsBackForwardNavigationGestures`), pero `GestoAtrasPlugin` (ver ese archivo) cancela la
 * navegación nativa que dispara y le pide a la web que vuelva con su propia marca de historial.
 *
 * OL-213 (bitácora 242): tocar un aviso push abre la ficha del evento/artista/lugar tal como venga en su URL —
 * mismo camino que un enlace universal `capacitorOpenUniversalLink` (SceneDelegate.swift): cargarla en este mismo
 * WKWebView. `notificationRouter.pushNotificationHandler` (Capacitor 8, ver NotificationRouter.swift en
 * @capacitor/ios) es EL sitio pensado para esto, no un UNUserNotificationCenterDelegate propio a mano: Capacitor ya
 * pone su propio delegate una sola vez y reparte a quien registre aquí. `@capacitor/push-notifications` reclama
 * este mismo puesto en su `load()`; registrar el nuestro DESPUÉS de `super.capacitorDidLoad()` (que ya cargó los
 * plugins) lo sustituye a propósito: seguimos usando el plugin para pedir permiso y el token (`register()`,
 * `requestPermissions()`, el evento `registration`), pero la apertura al tocar la maneja esta clase, no sus propios
 * eventos JS `pushNotificationActionPerformed` (que dejan de dispararse, sin que nada los use).
 * OL-214 (bitácora 243): `CalendarioPlugin` (ver ese archivo) se registra igual que los dos de arriba — nativo
 * puro, sin paquete de npm.
 * OL-317 (bitácora 344): `FotosPlugin` («Guardar en Fotos» el cartel del evento) se registra igual.
 */
class MainViewController: CAPBridgeViewController, NotificationHandlerProtocol {
    private let monitorDeRed = NWPathMonitor()
    /// OL-503: toma el puesto de `navigationDelegate` y le pasa todo a Capacitor (ver RespaldoCarga.swift). El WKWebView
    /// guarda su delegado con referencia débil: esta es la fuerte.
    private var respaldoCarga: RespaldoCarga?
    /// Un segundo, como la web (`public/sin-conexion.html`): el aviso de que hay ruta puede llegar antes de que la red
    /// de verdad sirva, y reintentar en ese instante volvería a caer en el respaldo.
    private static let esperaTrasVolverLaRed: TimeInterval = 1

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(EntrarSistemaPlugin())
        bridge?.registerPluginInstance(GestoAtrasPlugin())
        bridge?.registerPluginInstance(EntornoApnsPlugin())
        bridge?.notificationRouter.pushNotificationHandler = self
        bridge?.registerPluginInstance(CalendarioPlugin())
        bridge?.registerPluginInstance(FotosPlugin())
        webView?.allowsBackForwardNavigationGestures = true
        if let webView, let capacitor = webView.navigationDelegate as? WebViewDelegationHandler, let config = bridge?.config {
            let respaldo = RespaldoCarga(capacitor: capacitor, webView: webView, contenedor: webView, urlInicio: config.appStartServerURL)
            webView.navigationDelegate = respaldo
            respaldoCarga = respaldo
        }
        observarRed()
    }

    /// Mostrar el aviso con la app abierta (banner + sonido): sin esto, un push con la app en primer plano no se ve.
    func willPresent(notification: UNNotification) -> UNNotificationPresentationOptions {
        [.banner, .list, .sound]
    }

    /// Al tocar el aviso (o su acción por defecto): la URL va en el payload de APNs, fuera de "aps" (src/lib/push.ts,
    /// `payloadApns`), así que UNUserNotifications la entrega tal cual en `content.userInfo["url"]`.
    func didReceive(response: UNNotificationResponse) {
        guard let urlString = response.notification.request.content.userInfo["url"] as? String, let url = URL(string: urlString) else { return }
        webView?.load(URLRequest(url: url))
    }

    private func observarRed() {
        monitorDeRed.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async { self?.alCambiarRed(hayRed: path.status == .satisfied) }
        }
        monitorDeRed.start(queue: DispatchQueue(label: "org.somosnosotros.app.red"))
    }

    private func alCambiarRed(hayRed: Bool) {
        guard hayRed, respaldoCarga?.mostrando == true else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + Self.esperaTrasVolverLaRed) { [weak self] in
            guard let respaldo = self?.respaldoCarga, respaldo.mostrando else { return }
            respaldo.reintentar()
        }
    }

    /// SceneDelegate, al volver al frente: ver `RespaldoCarga.alVolverAlFrente()`.
    func alVolverAlFrente() {
        respaldoCarga?.alVolverAlFrente()
    }

    deinit {
        monitorDeRed.cancel()
    }
}
