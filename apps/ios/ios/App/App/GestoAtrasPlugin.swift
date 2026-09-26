import Capacitor
import WebKit

/**
 * OL-205 (auditoría OL-202, problema 3, docs/rediseno/48-shell-ios.md §3.3): el gesto de deslizar desde el borde
 * izquierdo para volver no hacía nada, porque `@capacitor/ios` lo trae apagado por omisión
 * (`allowsBackForwardNavigationGestures`, encendido en `MainViewController.capacitorDidLoad()`).
 *
 * Encenderlo tal cual no basta: ese gesto dispara el `WKBackForwardList` nativo de iOS (un `goBack()`/`goForward()`
 * de toda la vida), que no conoce la marca propia del historial de la app (`src/lib/historial.ts`, "filtrar no es
 * navegar", memoria de pantalla): un filtro, "Ver más" o un salto "ver" pueden apilar o reemplazar entradas de un
 * modo que el `WKBackForwardList` no distingue, y la vuelta de entrar con Apple o Google se repone a mano en
 * `sessionStorage`, no en ese historial nativo. Duplicar esa lógica en Swift arriesgaría desincronizarla de la web.
 *
 * En vez de eso: este plugin intercepta la navegación de tipo `.backForward` (la que dispara tanto `goBack()` como
 * el propio gesto — Apple documenta que ambos caminos producen el mismo `WKNavigationAction`) con el mismo enganche
 * que ya usa `EntrarSistemaPlugin` para Apple/Google (`shouldOverrideLoad`, la política de navegación del
 * `WKWebView` que Capacitor ofrece a sus plugins). La cancela y avisa a la web con `notifyListeners("atras", …)`;
 * la web (`src/components/Navegacion.tsx`, `src/lib/gestoAtras.ts`) ejecuta ahí la misma función que ya usa el
 * botón "Atrás" o la ✕ visibles (`ui/Atras.tsx`, `useVolver`), la única que sabe decidir entre volver con el
 * historial o ir a la pantalla madre.
 *
 * Sin métodos que la web llame (`pluginMethods` vacío, igual que `EntrarSistemaPlugin`): solo emite el aviso
 * `atras`, que la web escucha con `Capacitor.Plugins.GestoAtras.addListener("atras", …)`.
 */
@objc(GestoAtrasPlugin)
public class GestoAtrasPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GestoAtrasPlugin"
    public let jsName = "GestoAtras"
    public let pluginMethods: [CAPPluginMethod] = []

    public override func shouldOverrideLoad(_ navigationAction: WKNavigationAction) -> NSNumber? {
        let esPrincipal = navigationAction.targetFrame?.isMainFrame ?? true
        guard esPrincipal, navigationAction.navigationType == .backForward else {
            return nil // nil: sigue la política normal de Capacitor (cualquier otra navegación, sin cambios)
        }
        notifyListeners("atras", data: [:])
        return true // cancela el goBack()/goForward() nativo: la web decide con su propia marca de historial
    }
}
