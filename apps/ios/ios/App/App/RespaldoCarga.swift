import Capacitor
import UIKit
import WebKit

/**
 * OL-503 (bitácora 536): «No se pudo cargar» en la app de la tienda. El founder abrió la app con datos celulares y se quedó en blanco, sin
 * ningún botón (2026-11-02). En este envoltorio no corre ningún service worker (el respaldo de la web, OL-501, no llega aquí) y la única salida
 * nativa que había —la página «Sin conexión» de `www/index.html`— solo salía cuando `NWPathMonitor` decía que el teléfono no tenía ruta: una
 * radio que «aún no engancha», un 5xx o una petición colgada dejaban el WKWebView en blanco.
 *
 * Qué hace ya Capacitor (`@capacitor/ios` 8.5.2, `WebViewDelegationHandler.swift`): al morir el proceso web
 * (`webViewWebContentProcessDidTerminate`) hace `bridge.reset()` + `webView.reload()` — eso NO se duplica aquí; si esa recarga falla, cae en
 * los avisos de abajo como cualquier otra navegación. En `didFailProvisionalNavigation`/`didFail` solo carga `server.errorPath` si existe
 * (apagado a propósito, ver capacitor.config.ts) y escribe en el registro: nada más. No implementa `decidePolicyFor navigationResponse`.
 *
 * Cómo se engancha sin romper a Capacitor: `CAPBridgeViewController.loadView()` (final) crea su `WebViewDelegationHandler` y lo pone como
 * `navigationDelegate` del WKWebView; no hay forma de darle una subclase. Esta clase toma su lugar como `navigationDelegate` (solo ese: el
 * `uiDelegate` y el de desplazamiento siguen siendo de Capacitor) y le pasa TODO: los métodos que toca los llama primero en Capacitor y
 * luego añade lo suyo; los que no toca (el reto de autenticación, el proceso muerto) se le reenvían tal cual con `forwardingTarget(for:)`.
 * Así los plugins siguen decidiendo en `shouldOverrideLoad` (EntrarSistemaPlugin, GestoAtrasPlugin) exactamente como antes.
 *
 * Cuándo sale el respaldo (solo para el documento principal de somosnosotros.org o www.somosnosotros.org):
 * - la navegación falla antes o después de llegar (`didFailProvisionalNavigation`, `didFail`) con un error de verdad. NUNCA con una
 *   cancelación: `NSURLErrorCancelled` (-999, una navegación que otra sustituye) ni `WebKitErrorFrameLoadInterruptedByPolicyChange` (102, la
 *   que cancela un plugin: EntrarSistemaPlugin con `/auth/apple` y `/auth/google`, GestoAtrasPlugin con el gesto de volver — por esto mismo
 *   se descartó `server.errorPath`). Motivo «red».
 * - el servidor contesta 500 o más al documento principal (`decidePolicyFor navigationResponse`): se cancela (no se enseña la página inglesa
 *   de Vercel) y sale el respaldo con «El servidor no respondió». Motivo «servidor».
 * - el documento no llega en `RespaldoCarga.topeSegundos`: se detiene la carga. Motivo «red» (igual que el tope de la web).
 * «Intentar de nuevo» carga otra vez la dirección que falló (conserva el enlace profundo), nunca un archivo local; en las rutas de `/auth/` lleva a
 * `/entrar` (un enlace de un solo uso no se repite, como en la web). Vuelve solo cuando `NWPathMonitor` dice que hay ruta (con 1 s de
 * espera, MainViewController) y al volver al frente (SceneDelegate).
 *
 * Medirlo (m3 del council): sin red no se puede mandar nada, así que se guarda una marca en `UserDefaults` y, en la siguiente carga buena del
 * dominio propio, se copia al `localStorage` de la web con la misma clave y forma que deja `public/sin-conexion.html`
 * (`sn_carga_fallida` = `{ cuando, motivo, app: "tienda" }`); `MedirCargaFallida` de la web la lee y la manda como `carga_fallida`.
 *
 * Lo que NO cubre: la caída a mitad del streaming de Inicio después de que el documento ya llegó y se pintó (queda en esqueletos, igual que
 * en la web) — si WebKit lo reporta como `didFail` sí sale el respaldo; las peticiones que hace la web por su cuenta (`fetch`, RSC) sin
 * navegar: esas las maneja la propia web.
 */
final class RespaldoCarga: NSObject, WKNavigationDelegate {
    /// Doce segundos, el mismo tope que el respaldo de la web (`TOPE_NAVEGACION_MS`, public/sw.js): un arranque en frío de producción tarda
    /// unos 3 s en pintar (bitácora 487), así que 12 s sin documento ya no es lentitud sino una petición colgada o una radio que no engancha.
    static let topeSegundos: TimeInterval = 12

    /// Los mismos dominios que EntrarSistemaPlugin (DOMINIOS_REGISTRADOS en src/lib/entrarCon.ts).
    private static let dominiosPropios: Set<String> = ["somosnosotros.org", "www.somosnosotros.org"]
    /// La misma clave que usa la web (CLAVE_CARGA_FALLIDA, src/lib/cargaFallida.ts); en UserDefaults guarda `{ cuando, motivo }`.
    private static let claveMarca = "sn_carga_fallida"

    enum Motivo: String {
        case red
        case servidor
    }

    private let capacitor: WebViewDelegationHandler
    private weak var webView: WKWebView?
    private weak var contenedor: UIView?
    private let urlInicio: URL

    private var vista: VistaRespaldoCarga?
    /// La dirección del documento que se está pidiendo (la última que dejó pasar la política de navegación).
    private var urlCandidata: URL?
    /// La navegación vigilada por el tope y su dirección.
    private var navegacionVigilada: WKNavigation?
    private var urlVigilada: URL?
    private var tope: Timer?
    /// Lo que «Intentar de nuevo» vuelve a cargar.
    private var urlFallida: URL?
    private(set) var ultimaCargaFallo = false

    var mostrando: Bool { vista != nil }

    init(capacitor: WebViewDelegationHandler, webView: WKWebView, contenedor: UIView, urlInicio: URL) {
        self.capacitor = capacitor
        self.webView = webView
        self.contenedor = contenedor
        self.urlInicio = urlInicio
        super.init()
    }

    // MARK: - Reenvío a Capacitor de lo que esta clase no toca

    override func responds(to aSelector: Selector!) -> Bool {
        super.responds(to: aSelector) || capacitor.responds(to: aSelector)
    }

    override func forwardingTarget(for aSelector: Selector!) -> Any? {
        capacitor.responds(to: aSelector) ? capacitor : super.forwardingTarget(for: aSelector)
    }

    // MARK: - WKNavigationDelegate

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        capacitor.webView(webView, decidePolicyFor: navigationAction) { [weak self] politica in
            if politica == .allow, navigationAction.targetFrame?.isMainFrame == true, let url = navigationAction.request.url {
                self?.urlCandidata = url
                if self?.navegacionVigilada != nil { self?.urlVigilada = url } // una redirección dentro de la misma navegación
            }
            decisionHandler(politica)
        }
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        capacitor.webView(webView, didStartProvisionalNavigation: navigation)
        // Solo las navegaciones de verdad pasan por aquí (cambiar el hash o `pushState` no): ninguna deja un tope sin cerrar.
        let url = urlCandidata ?? webView.url
        pararTope()
        guard let url, esPropia(url) else { return }
        navegacionVigilada = navigation
        urlVigilada = url
        let reloj = Timer(timeInterval: Self.topeSegundos, repeats: false) { [weak self] _ in self?.alAgotarseTope() }
        RunLoop.main.add(reloj, forMode: .common) // también mientras se desplaza o se toca la pantalla
        tope = reloj
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        // Capacitor no implementa este método (por omisión WebKit deja pasar todo): solo se decide aquí el 500 o más del documento propio.
        if navigationResponse.isForMainFrame, let http = navigationResponse.response as? HTTPURLResponse, http.statusCode >= 500,
           let url = http.url, esPropia(url) {
            decisionHandler(.cancel) // sigue la cancelación 102 en didFailProvisionalNavigation, que se ignora
            fallo(.servidor, url: url)
            return
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
        if navigation === navegacionVigilada { pararTope() }
        guard let url = webView.url, esPropia(url) else { return }
        // El documento propio ya llegó: fuera el respaldo y, si hubo una carga fallida, su marca a la web antes de que esta se hidrate.
        ultimaCargaFallo = false
        urlFallida = nil
        ocultar()
        pasarMarcaALaWeb(webView)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        capacitor.webView(webView, didFinish: navigation)
        if navigation === navegacionVigilada { pararTope() }
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        capacitor.webView(webView, didFailProvisionalNavigation: navigation, withError: error)
        alFallar(navigation, error)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        capacitor.webView(webView, didFail: navigation, withError: error)
        alFallar(navigation, error)
    }

    // MARK: - Fallos

    private func alFallar(_ navigation: WKNavigation?, _ error: Error) {
        let vigilada = navigation === navegacionVigilada
        let urlDeEsta = vigilada ? urlVigilada : nil
        if vigilada { pararTope() }
        let error = error as NSError
        guard !Self.esCancelacion(error) else { return }
        guard let url = (error.userInfo[NSURLErrorFailingURLErrorKey] as? URL) ?? urlDeEsta ?? urlCandidata, esPropia(url) else { return }
        // Las que cancela EntrarSistemaPlugin ya llegan como 102; esto solo lo deja escrito por si WebKit cambiara el código.
        guard url.path != "/auth/apple", url.path != "/auth/google" else { return }
        fallo(.red, url: url)
    }

    private func alAgotarseTope() {
        guard navegacionVigilada != nil else { return }
        let url = urlVigilada ?? urlInicio
        navegacionVigilada = nil // el -999 que sigue a stopLoading() ya no es de nadie
        fallo(.red, url: url)
        webView?.stopLoading()
    }

    private func fallo(_ motivo: Motivo, url: URL) {
        pararTope()
        ultimaCargaFallo = true
        urlFallida = url
        guardarMarca(motivo)
        mostrar(motivo)
    }

    private func pararTope() {
        tope?.invalidate()
        tope = nil
        navegacionVigilada = nil
    }

    /// -999 (una navegación sustituida por otra, o detenida a mano) y 102 de WebKit (la cancela la política de navegación: un plugin con
    /// `shouldOverrideLoad`, o este mismo delegado ante un 500). 204 de WebKit: un video o audio que maneja el propio reproductor.
    private static func esCancelacion(_ error: NSError) -> Bool {
        if error.domain == NSURLErrorDomain, error.code == NSURLErrorCancelled { return true }
        if error.domain == "WebKitErrorDomain", error.code == 102 || error.code == 204 { return true }
        return false
    }

    /// El dominio propio, más el de `server.url` (hoy el mismo somosnosotros.org; en una prueba local, 127.0.0.1).
    private func esPropia(_ url: URL) -> Bool {
        guard let host = url.host?.lowercased() else { return false }
        return Self.dominiosPropios.contains(host) || host == urlInicio.host?.lowercased()
    }

    // MARK: - Volver a intentar

    /// «Intentar de nuevo», la red que vuelve o volver al frente con la última carga fallida.
    func reintentar() {
        guard let webView, vista?.cargando != true else { return }
        vista?.cargando = true
        webView.load(URLRequest(url: destinoDelReintento()))
    }

    /// Al volver al frente (SceneDelegate): si la última carga falló, otra vez; si el WKWebView se quedó sin documento, el arranque. Lo que
    /// ya está cargado no se toca (la decisión «primero lo cargado», bitácora 533), ni una carga que ya va en camino.
    func alVolverAlFrente() {
        guard let webView else { return }
        if ultimaCargaFallo || mostrando {
            reintentar()
            return
        }
        guard !webView.isLoading else { return }
        if webView.url == nil || webView.url?.absoluteString == "about:blank" {
            webView.load(URLRequest(url: urlInicio))
        }
    }

    private func destinoDelReintento() -> URL {
        guard let url = urlFallida else { return urlInicio }
        // Un enlace de `/auth/…` puede ser de un solo uso (PKCE, `token_hash`): no se repite, se lleva a Entrar (como la web, bitácora 533).
        if url.path.hasPrefix("/auth/") { return URL(string: "/entrar", relativeTo: urlInicio)?.absoluteURL ?? urlInicio }
        return url
    }

    // MARK: - La vista

    private func mostrar(_ motivo: Motivo) {
        guard let contenedor else { return }
        if let vista {
            vista.motivo = motivo
            vista.cargando = false
            return
        }
        let nueva = VistaRespaldoCarga(motivo: motivo)
        nueva.alIntentar = { [weak self] in self?.reintentar() }
        nueva.translatesAutoresizingMaskIntoConstraints = false
        contenedor.addSubview(nueva)
        NSLayoutConstraint.activate([
            nueva.topAnchor.constraint(equalTo: contenedor.topAnchor),
            nueva.bottomAnchor.constraint(equalTo: contenedor.bottomAnchor),
            nueva.leadingAnchor.constraint(equalTo: contenedor.leadingAnchor),
            nueva.trailingAnchor.constraint(equalTo: contenedor.trailingAnchor),
        ])
        vista = nueva
        UIAccessibility.post(notification: .screenChanged, argument: nueva)
    }

    private func ocultar() {
        vista?.removeFromSuperview()
        vista = nil
    }

    // MARK: - La marca para medir

    private func guardarMarca(_ motivo: Motivo) {
        let cuando = ISO8601DateFormatter().string(from: Date())
        UserDefaults.standard.set(["cuando": cuando, "motivo": motivo.rawValue], forKey: Self.claveMarca)
    }

    /// Copia la marca al `localStorage` del documento recién llegado y, si la web la recibió, la borra de aquí. Si `MedirCargaFallida` ya
    /// hubiera leído antes de esto, la encuentra en la siguiente carga: se cuenta una sola vez porque la web la borra al leerla.
    private func pasarMarcaALaWeb(_ webView: WKWebView) {
        guard let marca = UserDefaults.standard.dictionary(forKey: Self.claveMarca),
              let cuando = marca["cuando"] as? String, let motivo = (marca["motivo"] as? String).flatMap(Motivo.init(rawValue:))
        else { return }
        let datos: [String: String] = ["cuando": cuando, "motivo": motivo.rawValue, "app": "tienda"]
        guard let json = try? JSONSerialization.data(withJSONObject: datos), let texto = String(data: json, encoding: .utf8) else { return }
        // `texto` es JSON de tres cadenas fijas (fecha ISO y dos palabras conocidas): seguro dentro de una cadena de JS con JSON.stringify.
        let guion = "try{localStorage.setItem(\"\(Self.claveMarca)\",JSON.stringify(\(texto)));true}catch(e){false}"
        webView.evaluateJavaScript(guion) { resultado, error in
            if error == nil, resultado as? Bool == true {
                UserDefaults.standard.removeObject(forKey: Self.claveMarca)
            }
        }
    }
}

/**
 * La pantalla «No se pudo cargar», copia nativa de `public/sin-conexion.html` (OL-501): tema claro, símbolo SN del arte final
 * (docs/diseno/logotipo/LogoFinal/SN - Symbol.svg, en Assets como `SimboloSN`), título, «Suele arreglarse al intentar de nuevo.» (con «El
 * servidor no respondió.» delante cuando fue el servidor) y el botón violeta de 48 pt. Una columna alineada a la izquierda, centrada en
 * vertical, de 600 pt como máximo; letra del sistema que crece con el tamaño de texto del teléfono hasta el doble (`--letra-tope: 2`).
 * Nativa y encima del WKWebView, no una página cargada en él: no toca el historial ni el documento que hubiera debajo.
 */
final class VistaRespaldoCarga: UIView {
    var alIntentar: (() -> Void)?

    var motivo: VistaRespaldoCarga.Motivo {
        didSet { ponerTexto() }
    }

    var cargando = false {
        didSet {
            boton.configuration?.showsActivityIndicator = cargando
            boton.isEnabled = !cargando
        }
    }

    typealias Motivo = RespaldoCarga.Motivo

    private enum Color {
        static let fondo = UIColor.white
        static let texto = UIColor(red: 0x1A / 255, green: 0x1A / 255, blue: 0x1A / 255, alpha: 1) // --texto
        static let textoSuave = UIColor(red: 0x5C / 255, green: 0x5C / 255, blue: 0x5C / 255, alpha: 1) // --texto-suave
        static let primario = UIColor(red: 0x6D / 255, green: 0x34 / 255, blue: 0xC8 / 255, alpha: 1) // --primario
    }

    private let desplazable = UIScrollView()
    private let columna = UIStackView()
    private let simbolo = UIImageView(image: UIImage(named: "SimboloSN"))
    private let titulo = UILabel()
    private let texto = UILabel()
    private let boton = UIButton(configuration: .filled())

    init(motivo: Motivo) {
        self.motivo = motivo
        super.init(frame: .zero)
        armar()
        ponerTexto()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) no se usa") }

    /// Letra del sistema escalada con el tamaño de texto del teléfono, con el mismo tope que la web (el doble).
    private static func letra(_ puntos: CGFloat, _ peso: UIFont.Weight, estilo: UIFont.TextStyle) -> UIFont {
        UIFontMetrics(forTextStyle: estilo).scaledFont(for: .systemFont(ofSize: puntos, weight: peso), maximumPointSize: puntos * 2)
    }

    private func armar() {
        backgroundColor = Color.fondo
        overrideUserInterfaceStyle = .light
        accessibilityViewIsModal = true

        simbolo.tintColor = Color.texto
        simbolo.contentMode = .scaleAspectFit
        simbolo.isAccessibilityElement = true
        simbolo.accessibilityLabel = "Somos Nosotrxs"
        simbolo.accessibilityTraits = .image

        titulo.text = "No se pudo cargar"
        titulo.font = Self.letra(26, .bold, estilo: .title1)
        titulo.textColor = Color.texto
        titulo.numberOfLines = 0
        titulo.adjustsFontForContentSizeCategory = true
        titulo.accessibilityTraits = .header

        texto.font = Self.letra(17, .regular, estilo: .body)
        texto.textColor = Color.textoSuave
        texto.numberOfLines = 0
        texto.adjustsFontForContentSizeCategory = true

        var config = UIButton.Configuration.filled()
        config.baseBackgroundColor = Color.primario
        config.baseForegroundColor = .white
        config.cornerStyle = .fixed
        config.background.cornerRadius = 8 // --radio
        config.contentInsets = NSDirectionalEdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16)
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { atributos in
            var nuevos = atributos
            nuevos.font = Self.letra(18, .bold, estilo: .body)
            return nuevos
        }
        config.title = "Intentar de nuevo"
        boton.configuration = config
        boton.addAction(UIAction { [weak self] _ in self?.alIntentar?() }, for: .primaryActionTriggered)

        columna.axis = .vertical
        columna.alignment = .leading
        columna.spacing = 16 // --espacio-4
        [simbolo, titulo, texto, boton].forEach(columna.addArrangedSubview)
        columna.setCustomSpacing(24, after: texto) // 16 + el margin-top de 8 del botón
        columna.translatesAutoresizingMaskIntoConstraints = false

        desplazable.alwaysBounceVertical = false
        desplazable.translatesAutoresizingMaskIntoConstraints = false
        desplazable.addSubview(columna)
        addSubview(desplazable)

        let contenido = desplazable.contentLayoutGuide
        let marco = desplazable.frameLayoutGuide
        let anchoColumna = columna.widthAnchor.constraint(equalTo: marco.widthAnchor, constant: -40) // 20 de cada lado (--espacio-5)
        anchoColumna.priority = .defaultHigh
        let altoMinimo = contenido.heightAnchor.constraint(equalTo: marco.heightAnchor)
        altoMinimo.priority = .defaultLow
        NSLayoutConstraint.activate([
            desplazable.topAnchor.constraint(equalTo: topAnchor),
            desplazable.bottomAnchor.constraint(equalTo: bottomAnchor),
            desplazable.leadingAnchor.constraint(equalTo: leadingAnchor),
            desplazable.trailingAnchor.constraint(equalTo: trailingAnchor),

            contenido.widthAnchor.constraint(equalTo: marco.widthAnchor),
            contenido.heightAnchor.constraint(greaterThanOrEqualTo: marco.heightAnchor),
            altoMinimo,

            columna.centerXAnchor.constraint(equalTo: contenido.centerXAnchor),
            columna.widthAnchor.constraint(lessThanOrEqualToConstant: 600), // --columna
            columna.widthAnchor.constraint(lessThanOrEqualTo: marco.widthAnchor, constant: -40),
            anchoColumna,
            columna.centerYAnchor.constraint(equalTo: contenido.centerYAnchor),
            columna.topAnchor.constraint(greaterThanOrEqualTo: contenido.topAnchor, constant: 24), // --espacio-6
            contenido.bottomAnchor.constraint(greaterThanOrEqualTo: columna.bottomAnchor, constant: 24),

            simbolo.widthAnchor.constraint(equalToConstant: 64),
            simbolo.heightAnchor.constraint(equalTo: simbolo.widthAnchor, multiplier: 795.0 / 1035.0),
            boton.widthAnchor.constraint(equalTo: columna.widthAnchor),
            boton.heightAnchor.constraint(greaterThanOrEqualToConstant: 48), // --toque
        ])
    }

    private func ponerTexto() {
        let base = "Suele arreglarse al intentar de nuevo."
        texto.text = motivo == .servidor ? "El servidor no respondió. " + base : base
    }
}
