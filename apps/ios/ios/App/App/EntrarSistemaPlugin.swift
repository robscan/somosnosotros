import Capacitor
import SafariServices
import WebKit

/**
 * OL-194 (docs/rediseno/47-app-ios.md §4): Google bloquea "accounts.google.com" dentro de cualquier WKWebView
 * embebido (disallowed_useragent) y Apple recomienda lo mismo por fragilidad de cookies. Sin este plugin, Capacitor
 * ya saca esa navegación de la app por su cuenta (WebViewDelegationHandler.decidePolicyFor: como el dominio no está
 * en `allowNavigation`, cancela y hace `UIApplication.shared.open`), pero eso manda a la persona a Safari.app
 * completo. `shouldOverrideLoad` es el enganche que Capacitor ofrece para decidirlo antes que eso: aquí se abre un
 * `SFSafariViewController` sobre la propia app (la misma clase que usa @capacitor/browser en iOS por debajo; no se
 * pudo reutilizar su clase `Browser` directamente porque su `viewController` es `internal`, no público, a otro
 * módulo), así la persona nunca sale de Somos Nosotros. Esto reemplaza hacer el llamado desde JavaScript
 * (`Browser.open()`), que habría exigido tocar el botón en src/app/entrar/FormularioEntrar.tsx, fuera del alcance
 * de esta pieza (solo dentro de src/app/auth y en src/lib/entrarCon.ts). El paquete @capacitor/browser sigue instalado y
 * disponible para JavaScript (`window.Capacitor.Plugins.Browser`) si una pieza futura lo necesita desde ahí.
 *
 * La vuelta (con la sesión ya puesta por Supabase en `/auth/[proveedor]/fin`, que la manda a `/auth/app-vuelta`
 * cuando el intento viene con `enApp`: ver `destinoTrasEntrar` en src/lib/entrarCon.ts) sale por un enlace
 * universal que `SceneDelegate.swift` intercepta: cierra esta hoja y carga esa dirección en el WKWebView de la
 * app, que ya tiene la sesión (mismo almacenamiento de WKWebView que el navegador del sistema).
 *
 * No tiene métodos que la web llame (`pluginMethods` vacío): no hace falta ningún cambio en el bundle web para
 * que esto funcione, solo que Capacitor cargue este plugin (se registra solo, como cualquier plugin nativo).
 */
@objc(EntrarSistemaPlugin)
public class EntrarSistemaPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "EntrarSistemaPlugin"
    public let jsName = "EntrarSistema"
    public let pluginMethods: [CAPPluginMethod] = []

    /// La hoja abierta, para poder cerrarla cuando vuelve el enlace universal (ver SceneDelegate.swift).
    static weak var hojaAbierta: SFSafariViewController?

    private static let dominiosProveedor = ["appleid.apple.com", "accounts.google.com"]

    public override func shouldOverrideLoad(_ navigationAction: WKNavigationAction) -> NSNumber? {
        let esPrincipal = navigationAction.targetFrame?.isMainFrame ?? true
        guard esPrincipal, let url = navigationAction.request.url, let host = url.host,
              Self.dominiosProveedor.contains(where: { host == $0 || host.hasSuffix(".\($0)") })
        else { return nil } // nil: sigue la política normal de Capacitor (para todo lo demás, sin cambios)

        abrirEnNavegadorDelSistema(url)
        return true // cancela la navegación del WKWebView
    }

    private func abrirEnNavegadorDelSistema(_ url: URL) {
        DispatchQueue.main.async { [weak self] in
            guard let presentador = self?.bridge?.viewController else { return }
            let hoja = SFSafariViewController(url: url)
            hoja.modalPresentationStyle = .pageSheet
            Self.hojaAbierta = hoja
            presentador.present(hoja, animated: true)
        }
    }
}
