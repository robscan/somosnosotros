import Capacitor
import ImageIO
import Photos
import UIKit
import UniformTypeIdentifiers

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
 * OL-332 (bitácora 361, hallazgo de seguridad F08): cualquier página que cargue la app puede llamar a este método con lo que quiera, así que
 * no se fía de lo que manda JavaScript. La primera versión decodificaba la cadena entera, abría un `UIImage` y, para lo que no fuera JPEG ni
 * PNG según el `tipo` que declaraba la web, generaba un PNG; todo eso antes de pedir permiso y sin ningún tope. Ahora, en este orden:
 * 1. tope de la cadena base64 **antes de decodificar** (no toca la imagen; así una cadena enorme ni siquiera hace preguntar el permiso);
 * 2. el permiso de solo agregar: denegado, se rechaza sin decodificar nada;
 * 3. el formato real por sus primeros bytes (JPEG, PNG o WebP; el `tipo` de la web ya no cuenta), y que ImageIO lo lea como ese mismo formato;
 * 4. las dimensiones por los metadatos de ImageIO, sin decodificar píxeles (sin metadatos, se rechaza);
 * 5. JPEG y PNG se guardan tal cual, byte por byte; WebP (Fotos no lo garantiza) se pasa a JPEG, que pesa menos que el PNG de antes, con la
 *    salida también acotada.
 * Cada rechazo lleva un código corto y estable (`CodigoFallo`) que la web puede distinguir; hoy todos acaban en «No se pudo guardar».
 */
@objc(FotosPlugin)
public class FotosPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FotosPlugin"
    public let jsName = "Fotos"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "guardarFoto", returnType: CAPPluginReturnPromise),
    ]

    /// Los códigos con que rechaza el método (`error.code` en JavaScript). Cortos y estables: la web los puede distinguir sin leer el mensaje.
    private enum CodigoFallo: String {
        case permiso  // la persona no dio permiso de agregar a Fotos
        case formato  // no es un JPEG, PNG o WebP legible (base64 roto, otro formato, sin metadatos)
        case tamano   // la cadena, la imagen o su conversión pasan los topes
        case error    // Fotos o la conversión fallaron por otra causa
    }

    /// Tope de bytes de la imagen (y de lo que sale de la conversión): 8 MiB. Los carteles que llegan aquí no pasan de 5 MiB: el bucket
    /// `fotos` no acepta más (`file_size_limit`), las fotos subidas a mano se reducen antes en el teléfono (`src/lib/imagen.ts`, ~200 KB) y
    /// los carteles del creador pesan 150-250 KB. Se deja margen para no romper un cartel válido si un día sube el tope del bucket, sin
    /// abrirle la puerta a cientos de megas.
    static let bytesMaximos = 8 * 1024 * 1024
    /// La longitud en base64 de esos bytes: 4 caracteres por cada 3 bytes, redondeando hacia arriba (11 184 812).
    static let base64Maximo = (bytesMaximos + 2) / 3 * 4
    /// Tope de píxeles y de lado: un cartel real anda por 1080×1920 (2 Mpx) o 1600 px de lado; 12 Mpx y 8000 px dejan pasar cualquier foto de
    /// teléfono y frenan una imagen chica en bytes que se infla al decodificarla (una «bomba» de 30 000 × 30 000 en pocos KB).
    static let pixelesMaximos = 12_000_000
    static let ladoMaximo = 8000

    /// Los formatos que se aceptan, reconocidos por sus primeros bytes (no por el tipo que declara la web), con el tipo que ImageIO les da.
    private enum Formato {
        case jpeg, png, webp

        /// Firma de cada formato: JPEG `FF D8 FF`; PNG `89 50 4E 47 0D 0A 1A 0A`; WebP `RIFF`, cuatro bytes de tamaño y `WEBP`.
        init?(bytes datos: Data) {
            let b = [UInt8](datos.prefix(12))
            if b.starts(with: [0xFF, 0xD8, 0xFF]) {
                self = .jpeg
            } else if b.starts(with: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) {
                self = .png
            } else if b.count == 12, b[0..<4].elementsEqual("RIFF".utf8), b[8..<12].elementsEqual("WEBP".utf8) {
                self = .webp
            } else {
                return nil
            }
        }

        var tipo: UTType {
            switch self {
            case .jpeg: return .jpeg
            case .png: return .png
            case .webp: return .webP
            }
        }
    }

    @objc func guardarFoto(_ call: CAPPluginCall) {
        // `utf16.count` no recorre la cadena (que llega como `NSString` desde el puente) y, en base64, cada carácter es un byte.
        guard let base64 = call.getString("datos"), !base64.isEmpty else {
            return rechazar(call, .formato, "No llegó ninguna imagen")
        }
        guard base64.utf16.count <= Self.base64Maximo else {
            return rechazar(call, .tamano, "La imagen pesa demasiado")
        }
        // El `tipo` que manda la web se ignora a propósito: el formato lo dicen los bytes.

        // Capacitor llama los métodos del plugin en una cola de fondo; `PHPhotoLibrary` pide permiso y escribe fuera del hilo principal. El
        // permiso va antes de decodificar: sin él no se toca la imagen.
        PHPhotoLibrary.requestAuthorization(for: .addOnly) { estado in
            guard estado == .authorized || estado == .limited else {
                return self.rechazar(call, .permiso, "Sin permiso para guardar en Fotos")
            }
            let preparada: (datos: Data, tipo: UTType)
            switch Self.preparar(base64) {
            case .success(let lista): preparada = lista
            case .failure(let fallo): return self.rechazar(call, fallo.codigo, fallo.mensaje)
            }
            PHPhotoLibrary.shared().performChanges({
                let opciones = PHAssetResourceCreationOptions()
                opciones.uniformTypeIdentifier = preparada.tipo.identifier
                PHAssetCreationRequest.forAsset().addResource(with: .photo, data: preparada.datos, options: opciones)
            }) { guardado, error in
                if guardado {
                    call.resolve(["guardado": true])
                } else {
                    self.rechazar(call, .error, error?.localizedDescription ?? "No se pudo guardar")
                }
            }
        }
    }

    private struct Fallo: Error {
        let codigo: CodigoFallo
        let mensaje: String
    }

    /// Decodifica y valida la imagen ya con permiso: los bytes que van a Fotos y su tipo real, o por qué no.
    private static func preparar(_ base64: String) -> Result<(datos: Data, tipo: UTType), Fallo> {
        guard let datos = Data(base64Encoded: base64), !datos.isEmpty else {
            return .failure(Fallo(codigo: .formato, mensaje: "La imagen no se pudo leer"))
        }
        guard datos.count <= bytesMaximos else {
            return .failure(Fallo(codigo: .tamano, mensaje: "La imagen pesa demasiado"))
        }
        guard let formato = Formato(bytes: datos) else {
            return .failure(Fallo(codigo: .formato, mensaje: "Solo se guardan imágenes JPEG, PNG o WebP"))
        }
        // `ShouldCache: false`: abrir la fuente y leer sus propiedades no decodifica píxeles ni los guarda en memoria.
        let sinCache = [kCGImageSourceShouldCache: false] as CFDictionary
        guard let fuente = CGImageSourceCreateWithData(datos as CFData, sinCache),
              CGImageSourceGetCount(fuente) > 0,
              let leido = CGImageSourceGetType(fuente) as String?, leido == formato.tipo.identifier,
              let propiedades = CGImageSourceCopyPropertiesAtIndex(fuente, 0, sinCache) as? [CFString: Any],
              let ancho = propiedades[kCGImagePropertyPixelWidth] as? Int,
              let alto = propiedades[kCGImagePropertyPixelHeight] as? Int,
              ancho > 0, alto > 0
        else {
            return .failure(Fallo(codigo: .formato, mensaje: "La imagen no se pudo leer"))
        }
        guard ancho <= ladoMaximo, alto <= ladoMaximo, ancho * alto <= pixelesMaximos else {
            return .failure(Fallo(codigo: .tamano, mensaje: "La imagen es demasiado grande"))
        }
        if formato != .webp { return .success((datos, formato.tipo)) }

        // WebP → JPEG con ImageIO, de fuente a destino (solo el primer cuadro si es animado). Ya pasó los topes, así que el mapa de píxeles
        // que hace falta para recodificar está acotado (12 Mpx). Fondo blanco: un WebP con transparencia no sale con el fondo negro.
        let salida = NSMutableData()
        guard let destino = CGImageDestinationCreateWithData(salida, UTType.jpeg.identifier as CFString, 1, nil) else {
            return .failure(Fallo(codigo: .error, mensaje: "La imagen no se pudo preparar"))
        }
        let blanco = CGColor(red: 1, green: 1, blue: 1, alpha: 1)
        let ajustes = [kCGImageDestinationLossyCompressionQuality: 0.9, kCGImageDestinationBackgroundColor: blanco] as CFDictionary
        CGImageDestinationAddImageFromSource(destino, fuente, 0, ajustes)
        guard CGImageDestinationFinalize(destino), salida.length > 0 else {
            return .failure(Fallo(codigo: .error, mensaje: "La imagen no se pudo preparar"))
        }
        guard salida.length <= bytesMaximos else {
            return .failure(Fallo(codigo: .tamano, mensaje: "La imagen pesa demasiado"))
        }
        return .success((salida as Data, .jpeg))
    }

    private func rechazar(_ call: CAPPluginCall, _ codigo: CodigoFallo, _ mensaje: String) {
        call.reject(mensaje, codigo.rawValue)
    }
}
