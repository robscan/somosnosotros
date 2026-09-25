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
     * OL-194: la vuelta de entrar con Apple o Google desde dentro de la app (EntrarSistemaPlugin.swift) sale por un
     * enlace universal a `/auth/app-vuelta` (destinoTrasEntrar, src/lib/entrarCon.ts). Capacitor ya reenvía ese
     * enlace como la notificación `capacitorOpenUniversalLink` (SceneDelegateProxy, de serie en la plantilla); acá
     * solo falta cerrar la hoja del navegador del sistema y cargar la dirección en el WKWebView de la app, que para
     * entonces ya tiene la sesión (Supabase la puso ahí, en el mismo almacenamiento que comparte con esa hoja).
     */
    private func observarEnlaceUniversal() {
        observadorEnlaceUniversal = NotificationCenter.default.addObserver(forName: .capacitorOpenUniversalLink, object: nil, queue: .main) { [weak self] notificacion in
            guard let datos = notificacion.object as? [String: Any], let url = datos["url"] as? URL else { return }
            let bridgeVC = self?.window?.rootViewController as? CAPBridgeViewController
            if let hoja = EntrarSistemaPlugin.hojaAbierta {
                EntrarSistemaPlugin.hojaAbierta = nil
                hoja.dismiss(animated: true) { bridgeVC?.webView?.load(URLRequest(url: url)) }
            } else {
                bridgeVC?.webView?.load(URLRequest(url: url))
            }
        }
    }
}
