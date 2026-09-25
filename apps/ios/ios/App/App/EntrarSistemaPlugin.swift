import AuthenticationServices
import Capacitor
import WebKit

/**
 * OL-194 (docs/rediseno/47-app-ios.md §4), corrección del gestor (bitácora 228, «Correcciones del gestor»): Google
 * bloquea "accounts.google.com" dentro de cualquier WKWebView embebido (disallowed_useragent) y Apple recomienda lo
 * mismo por fragilidad de cookies, así que entrar con Apple o con Google no puede pasar por el WKWebView de la app.
 *
 * La primera versión de esta pieza abría un `SFSafariViewController` sobre la propia app. No sirvió: esa hoja
 * comparte las cookies de Safari.app, no las del WKWebView de la app, así que la sesión que Supabase deja al
 * terminar (`/auth/[proveedor]/fin`) nunca llegaba a donde la app puede leerla; y una redirección de servidor al
 * mismo dominio dentro de esa hoja tampoco dispara un enlace universal, así que ni la vuelta por un enlace así
 * habría llegado a tiempo. `ASWebAuthenticationSession` resuelve las dos cosas a la vez: entrega la vuelta directo
 * a esta función en cuanto la dirección coincide con `callbackURLScheme` (sin pasar por ningún enlace universal ni
 * por Safari.app), y aquí se toma esa dirección — con el `token_hash` de un enlace de un solo uso, ver
 * `urlAppTrasEntrar` en src/lib/entrarCon.ts — y se carga a mano en el WKWebView de la app, que es donde de verdad
 * hace falta la sesión.
 *
 * `shouldOverrideLoad` intercepta la ida a `/auth/apple` o `/auth/google` (las rutas de
 * src/app/auth/[proveedor]/route.ts) antes de que el WKWebView las cargue — antes, se interceptaba la ida a
 * appleid.apple.com/accounts.google.com, un paso más tarde, cuando la cookie del intento ya se había puesto en el
 * WKWebView y no en la sesión del sistema que de verdad la necesitaba. `?app=1` (que deja rastro en el intento como
 * `Intento.enApp`, entrarCon.ts) lo añade este plugin al abrir la sesión del sistema: la web no necesita saber que
 * corre dentro de un envoltorio para construir ese enlace.
 *
 * No tiene métodos que la web llame (`pluginMethods` vacío): no hace falta ningún cambio en el bundle web para que
 * esto funcione, solo que Capacitor cargue este plugin (se registra a mano en MainViewController.swift).
 */
@objc(EntrarSistemaPlugin)
public class EntrarSistemaPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "EntrarSistemaPlugin"
    public let jsName = "EntrarSistema"
    public let pluginMethods: [CAPPluginMethod] = []

    /// Esquema propio, registrado en Info.plist (CFBundleURLTypes). ASWebAuthenticationSession solo entrega de
    /// vuelta una dirección con este esquema (nunca https): así ninguna navegación normal la dispara por error.
    private static let esquemaDeVuelta = "somosnosotros"

    /// Los mismos dominios que reconoce la web (DOMINIOS_REGISTRADOS en src/lib/entrarCon.ts).
    private static let dominiosPropios = ["somosnosotros.org", "www.somosnosotros.org"]

    /// Referencia fuerte a la sesión abierta: sin ella ARC la libera en cuanto termina esta función y el sistema
    /// nunca llama al bloque de cierre (documentado por Apple: hay que retener la sesión mientras esté activa).
    private var sesion: ASWebAuthenticationSession?

    public override func shouldOverrideLoad(_ navigationAction: WKNavigationAction) -> NSNumber? {
        let esPrincipal = navigationAction.targetFrame?.isMainFrame ?? true
        guard esPrincipal, let url = navigationAction.request.url, let host = url.host, Self.dominiosPropios.contains(host),
              url.path == "/auth/apple" || url.path == "/auth/google"
        else {
            return nil // nil: sigue la política normal de Capacitor (para todo lo demás, sin cambios)
        }
        abrirSesionDelSistema(marcarComoDeLaApp(url))
        return true // cancela la navegación del WKWebView: la ida de verdad sale por la sesión del sistema
    }

    /// `app=1`, sin duplicarlo si ya viniera puesto.
    private func marcarComoDeLaApp(_ url: URL) -> URL {
        guard var componentes = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return url }
        var query = (componentes.queryItems ?? []).filter { $0.name != "app" }
        query.append(URLQueryItem(name: "app", value: "1"))
        componentes.queryItems = query
        return componentes.url ?? url
    }

    private func abrirSesionDelSistema(_ url: URL) {
        let sesion = ASWebAuthenticationSession(url: url, callbackURLScheme: Self.esquemaDeVuelta) { [weak self] callback, error in
            self?.alTerminar(callback: callback, error: error)
        }
        sesion.presentationContextProvider = self
        self.sesion = sesion
        sesion.start()
    }

    /**
     * `/auth/[proveedor]/fin` (src/app/auth) manda la vuelta por este esquema con `token_hash` y `siguiente`
     * cuando entrar salió bien, o con `error=1` cuando no pudo armar el enlace de un solo uso. Si la persona
     * cancela la hoja del sistema (o Apple/Google fallan sin volver a esta app), `callback` viene vacío: no hay
     * nada que cargar, el WKWebView se queda donde estaba (la navegación original ya se había cancelado) y la
     * pantalla sigue en Entrar, igual que si nunca se hubiera tocado el botón.
     */
    private func alTerminar(callback: URL?, error: Error?) {
        sesion = nil
        guard let callback, let bridge = bridge else { return }
        let componentes = URLComponents(url: callback, resolvingAgainstBaseURL: false)
        let conError = componentes?.queryItems?.contains { $0.name == "error" } ?? true
        var destino = URLComponents()
        destino.scheme = "https"
        destino.host = "somosnosotros.org"
        if conError {
            destino.path = "/entrar"
            destino.queryItems = [URLQueryItem(name: "error", value: "enlace")]
        } else {
            destino.path = "/auth/app-vuelta"
            destino.queryItems = componentes?.queryItems
        }
        guard let url = destino.url else { return }
        DispatchQueue.main.async { bridge.webView?.load(URLRequest(url: url)) }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }
}
