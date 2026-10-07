import Capacitor
import Photos
import UIKit

/**
 * OL-317 (bitácora 344): «Guardar en Fotos» el cartel del evento con un toque. Safari y la web instalada no tienen una API para
 * escribir en Fotos (lo más cercano es la hoja de compartir con «Guardar imagen»); la app sí, con `PHPhotoLibrary`.
 *
 * Sin paquete de npm (como `CalendarioPlugin`, `EntrarSistemaPlugin` y `GestoAtrasPlugin`): se registra a mano en
 * `MainViewController.capacitorDidLoad()`. Se descartó `@capacitor-community/media` 9.1.0: sí encaja con Capacitor 8 y pide el mismo
 * permiso de solo agregar, pero trae SDWebImage como dependencia y toda su superficie de lectura de álbumes (listar, leer miniaturas) para una
 * sola operación de escritura.
 *
 * Permiso mínimo: `PHAccessLevel.addOnly` (la app solo agrega a Fotos, nunca lee la fonoteca), con
 * `NSPhotoLibraryAddUsageDescription` en Info.plist. La primera vez iOS pregunta; si la persona dice que no, el método rechaza con el
 * código `permiso` y el botón de la web dice «No se pudo guardar» (`src/components/BotonDescargarCartel.tsx`; sin hoja de compartir ni descarga de respaldo).
 *
 * La web manda la imagen en base64 (`datos`) y su tipo (`tipo`). JPEG y PNG se guardan tal cual, byte por byte; cualquier otro formato que
 * iOS sepa leer (WebP, AVIF, GIF) se guarda como PNG para no depender de que Fotos lo acepte tal cual. Lo que no se pueda leer como imagen
 * se rechaza con `imagen`.
 */
@objc(FotosPlugin)
public class FotosPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FotosPlugin"
    public let jsName = "Fotos"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "guardarFoto", returnType: CAPPluginReturnPromise),
    ]

    @objc func guardarFoto(_ call: CAPPluginCall) {
        guard let base64 = call.getString("datos"), let original = Data(base64Encoded: base64), let imagen = UIImage(data: original) else {
            call.reject("La imagen no se pudo leer", "imagen")
            return
        }
        let tipo = (call.getString("tipo") ?? "").lowercased()
        let sinCambios = tipo == "image/jpeg" || tipo == "image/png"
        guard let datos = sinCambios ? original : imagen.pngData() else {
            call.reject("La imagen no se pudo preparar", "imagen")
            return
        }

        // Capacitor llama los métodos del plugin en una cola de fondo; `PHPhotoLibrary` pide permiso y escribe fuera del hilo principal.
        PHPhotoLibrary.requestAuthorization(for: .addOnly) { estado in
            guard estado == .authorized || estado == .limited else {
                call.reject("Sin permiso para guardar en Fotos", "permiso")
                return
            }
            PHPhotoLibrary.shared().performChanges({
                let pedido = PHAssetCreationRequest.forAsset()
                pedido.addResource(with: .photo, data: datos, options: nil)
            }) { guardado, error in
                if guardado {
                    call.resolve(["guardado": true])
                } else {
                    call.reject(error?.localizedDescription ?? "No se pudo guardar", "guardar")
                }
            }
        }
    }
}
