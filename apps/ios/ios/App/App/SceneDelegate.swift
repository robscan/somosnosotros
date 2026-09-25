import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var observadorEnlaceUniversal: NSObjectProtocol?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = MainViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
        observarEnlaceUniversal()
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }

    /**
     * Enlaces universales «normales» (una ficha de evento, lugar o artista compartida y tocada fuera de la app):
     * Capacitor los reenvía como la notificación `capacitorOpenUniversalLink` (SceneDelegateProxy, de serie en la
     * plantilla) y aquí solo falta cargarlos en el WKWebView de la app.
     *
     * La vuelta de entrar con Apple o Google (OL-194) ya NO pasa por aquí desde la corrección del gestor (bitácora
     * 228): `EntrarSistemaPlugin.swift` la recibe directo de `ASWebAuthenticationSession` y carga el WKWebView él
     * mismo, sin enlace universal — por eso las rutas de entrar ya no se reclaman en apple-app-site-association.
     */
    private func observarEnlaceUniversal() {
        observadorEnlaceUniversal = NotificationCenter.default.addObserver(forName: .capacitorOpenUniversalLink, object: nil, queue: .main) { [weak self] notificacion in
            guard let datos = notificacion.object as? [String: Any], let url = datos["url"] as? URL else { return }
            let bridgeVC = self?.window?.rootViewController as? CAPBridgeViewController
            bridgeVC?.webView?.load(URLRequest(url: url))
        }
    }
}
