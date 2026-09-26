import AuthenticationServices
import Capacitor
import WebKit

/**
 * OL-194 (docs/rediseno/47-app-ios.md §4): Google bloquea "accounts.google.com" dentro de cualquier WKWebView
 * embebido (disallowed_useragent) y Apple recomienda lo mismo por fragilidad de cookies, así que entrar con Apple o
 * con Google no puede pasar por el WKWebView de la app.
 *
 * La primera versión de esta pieza abría un `SFSafariViewController` sobre la propia app. No sirvió: esa hoja
 * comparte las cookies de Safari.app, no las del WKWebView de la app, así que la sesión que Supabase deja al
 * terminar (`/auth/[proveedor]/fin`) nunca llegaba a donde la app puede leerla; y una redirección de servidor al
 * mismo dominio dentro de esa hoja tampoco dispara un enlace universal, así que ni la vuelta por un enlace así
 * habría llegado a tiempo. `ASWebAuthenticationSession` resuelve las dos cosas a la vez: entrega la vuelta directo
 * a esta función en cuanto la dirección coincide con la callback registrada (sin pasar por ningún enlace universal
 * ni por Safari.app), y aquí se carga esa dirección a mano en el WKWebView de la app, que es donde de verdad hace
 * falta la sesión.
 *
 * Corrección de seguridad (OL-194): la primera versión de esta corrección usaba un esquema propio de la app (el
 * prefijo "somosnosotros" con dos barras, vía `callbackURLScheme`) para esa entrega. Cualquier app puede registrar
 * el mismo esquema en el teléfono: si alguien hacía abrir `/auth/google?app=1` a la víctima fuera de esta app,
 * Safari podía mandar esa vuelta —con el `token_hash` de un enlace de un solo uso, ver `urlAppTrasEntrar` en
 * src/lib/entrarCon.ts— a una app impostora que también reclamara ese esquema, quedándose con la sesión de la
 * víctima. Con
 * `ASWebAuthenticationSession.Callback.https(host:path:)` (iOS 17.4+) la callback es una URL https de nuestro
 * propio dominio: el sistema solo se la entrega a la app cuyo Associated Domains lo verificó
 * (`webcredentials:somosnosotros.org`, App.entitlements) — ninguna otra app puede recibirla. Y si esa misma URL se
 * abriera fuera de esta app (navegador normal, o el teléfono sin la app instalada), `/auth/app-regreso` hace
 * exactamente lo mismo ahí: la sesión se queda en quien la abrió, nunca llega a otra app.
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

    /// El dominio y la ruta de la callback (iOS 17.4+): ASWebAuthenticationSession solo la entrega a la app cuyo
    /// Associated Domains verificó "webcredentials:somosnosotros.org" (App.entitlements) — corrección de seguridad
    /// de OL-194, ver el comentario de arriba. Debe ser la misma ruta que src/app/auth/app-regreso/route.ts.
    private static let callbackDeVuelta = ASWebAuthenticationSession.Callback.https(host: "somosnosotros.org", path: "/auth/app-regreso")

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
        let sesion = ASWebAuthenticationSession(url: url, callback: Self.callbackDeVuelta) { [weak self] callback, error in
            self?.alTerminar(callback: callback, error: error)
        }
        sesion.presentationContextProvider = self
        self.sesion = sesion
        sesion.start()
    }

    /**
     * `/auth/[proveedor]/fin` (src/app/auth) manda la vuelta a `/auth/app-regreso` con `token_hash` y `siguiente`
     * cuando entrar salió bien, o con `error=1` cuando no pudo armar el enlace de un solo uso. Como la callback ya
     * es la URL https de nuestro propio dominio (`callbackDeVuelta`), no hay que reconstruir nada: se carga tal
     * cual en el WKWebView de la app, y `/auth/app-regreso` (misma ruta que si alguien la abriera fuera de la app)
     * decide qué hacer con el `token_hash` o con el error. Si la persona cancela la hoja del sistema (o Apple/Google
     * fallan sin volver a esta app), `callback` viene vacío: no hay nada que cargar, el WKWebView se queda donde
     * estaba (la navegación original ya se había cancelado) y la pantalla sigue en Entrar, igual que si nunca se
     * hubiera tocado el botón.
     */
    private func alTerminar(callback: URL?, error: Error?) {
        sesion = nil
        guard let callback, let bridge = bridge else { return }
        DispatchQueue.main.async { bridge.webView?.load(URLRequest(url: callback)) }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }
}
