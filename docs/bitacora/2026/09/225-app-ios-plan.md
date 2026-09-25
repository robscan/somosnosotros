# 225 · Plan de la app de iOS en la tienda (OL-191)

**2026-09-25 · Solo documentación.**

## Qué leí

- CLAUDE.md: decisión del founder sobre app nativa (espera a cerrar web y probar, sin capacidades que la web ya cubra, NFC y vibración para después).
- docs/DEFINICION.md: reglas y audiencia.
- OL-032 (app de tienda detenida el 2026-09-16): lo hecho en Apple se queda (identificador, ficha), si se retoma la lista de lo que pide Apple.
- OL-155 (Wallet, espera certificado Pass Type ID del founder).
- docs/ops/COLA_DE_PIEZAS.md, E3: "preparar app nativa" falta acotar con el founder.
- docs/rediseno/28-avisos-y-boletin.md: web push ya existe; APNs para la app.
- docs/rediseno/40-perfil-artista-enlace.md: Wallet es posible desde web de Safari (no solo nativa), pero el founder decidirá si antes o después de la app.
- src/app/manifest.ts: PWA configurada con display standalone, icons.
- public/sw.js: service worker ya maneja push web y abre URLs.

## Qué decidí

Documento 47 cubre:

1. **Qué es:** la web envuelta, no reescrita. Suma Wallet, APNs, NFC, vibración, deep links.
2. **Enfoque recomendado:** WKWebView en Swift (control total, costo cero por actualización, tamaño mínimo ~15 MB, equipo chico). Comparación con Capacitor (50 MB, control medio) y PWABuilder (herramienta, control bajo).
3. **Requisitos de Apple:** 4.2 (funcionalidad mínima mitiga Wallet/APNs/deep links), 5.1.1 (Sign in con Apple obligatorio, borrado en app), Webkit, Nutrition Label, etiqueta de edad, capturas y textos.
4. **Qué suma lo nativo:** tabla de Wallet, APNs, NFC, vibración, Sign in más fluido, deep links nativos, caché de emergencia, actualización automática.
5. **Piezas:** dos fases de setup (certificados, llaves), luego envoltorio + Wallet (TestFlight), APNs cliente/servidor, NFC/vibración, ficha y envío a tienda. Cada una es OL-192 a OL-202; tamaño chica a mediana.
6. **Costos:** USD 99/año (ya pagado), revisión 3–10 días, rechazos típicos (wrapper vacío, sin funcionalidad) con respuesta preparada.
7. **App antes o después del blog:** **antes o en paralelo**. Revisión de tienda es el único plazo externo; while esperamos Apple, blog avanza sin bloqueos. Si blog primero, app se retrasa.
8. **Pendientes del founder:** crear certificado Pass Type ID, llave P8 de APNs, 5 capturas, textos de Store, aceptar términos, probar en TestFlight, dar orden de envío.

## Qué queda

- El founder firma el plan y elige si app antes o después del blog.
- Confirmar OL-192 a OL-202 en ASIGNACIONES.md.
- Primera pieza (OL-192): certificados y llaves — solo founder.

## Segunda versión: correcciones del gestor

El gestor de cambios devolvió el primer borrador con estos errores, ya corregidos en `docs/rediseno/47-app-ios.md`:

1. **Wallet no es exclusivo de la app nativa.** El borrador la usaba como prueba de «funcionalidad única» frente a la guía 4.2.2. Falso: Safari en el iPhone ya agrega un `.pkpass` servido por la web desde iOS 6 (OL-155, ya planeada, solo espera el certificado del founder). En la app nativa el mismo pase se agrega con PassKit o abriendo la misma URL. Se quitó Wallet de los argumentos frente a 4.2.2 y se dijo la verdad sobre qué añade lo nativo.
2. **Avisos push no llegan solos dentro del contenedor.** `PushManager` y el service worker (`public/sw.js`) dependen de Safari instalado; un `WKWebView` no los hereda. Si la app no trae APNs, quien la instale pierde los avisos que ya tenía en la web. Se documentó el puente: token de la app al servidor, y `avisosWorker.ts` elige web push o APNs según el dispositivo.
3. **Inicio de sesión dentro de un webview es frágil o falla directamente.** Revisé el código (`src/app/entrar`, `src/lib/entrarCon.ts`, `src/app/auth/[proveedor]`): hoy hay correo (código de 8 dígitos + enlace, vía `signInWithOtp`), Apple y Google (redirección + POST). Google bloquea OAuth en webviews embebidos desde 2021 (`disallowed_useragent`) y el propio código ya excluye su botón en navegadores embebidos conocidos; dentro del WKWebView de la app pasaría lo mismo. La solución documentada es abrir Apple y Google en `ASWebAuthenticationSession` y volver por deep link; el correo sigue funcionando igual dentro del contenedor porque es una llamada directa a Supabase, no una redirección de página completa.
4. **Corrección sobre el borrado de cuenta.** El borrador (y mi propio encargo) asumían que `/borrado` es la pantalla de borrar la cuenta. Revisando el código, `/borrado` es la confirmación de borrar un evento, lugar o artista (`src/app/borrado/page.tsx`). Borrar la cuenta vive en `/ajustes` (acción `borrarMiCuenta`). Se corrigió en el documento: basta con que `/ajustes` sea alcanzable dentro de la app, que ya lo es por ser la misma web.
5. **Permisos del navegador dentro del WKWebView son trabajo real, no un ajuste automático.** Cámara y micrófono funcionan en WKWebView desde iOS 14.3 (no 14.5 como decía el encargo; el delegado fino `decideMediaCapturePermissionFor` es de iOS 15), con el permiso declarado en Info.plist (`NSCameraUsageDescription`, `NSMicrophoneUsageDescription`); ubicación pide su propio permiso nativo (`NSLocationWhenInUseUsageDescription`); no se encontró uso de movimiento/orientación en el código hoy, así que ese permiso queda condicionado a que aparezca.
6. **Se quitaron funciones inventadas.** Fuera «validar entradas por NFC», «caché sin red», «deslizar con háptica», «modo offline»: ninguna estaba pedida por el founder. NFC y vibración quedan como capacidades que la web del iPhone niega hoy, sin proponer un uso para ellas.
7. **Numeración de guías corregida:** el motor web es la guía **2.5.6** (no 2.5.1, confirmado con búsqueda). Se citan también 4.2, 4.2.2, 4.8, 5.1.1 (y su inciso (v), borrado de cuenta), 5.1.2 y las etiquetas de privacidad de la ficha.
8. **Sin cifras inventadas de la cuenta del founder.** Se quitó «pagada hasta 2027-09-16» y cualquier mención de invitación pendiente; quedan solo los hechos ciertos: membresía activa, identificador `org.somosnosotros.app`, ficha 6812916453, Services ID `org.somosnosotros.web`, sin llave APNs ni certificado Pass Type ID todavía.
9. **Tiempos de revisión sin precisión falsa:** «normalmente entre uno y pocos días, sin garantía; un rechazo suma otra vuelta», sin el rango «3–10 días» que sonaba más preciso de lo que en realidad se puede prometer.
10. **Universal Links necesitan código en la web**, no solo un ajuste del founder en Apple Developer: el archivo `/.well-known/apple-app-site-association` lo sirve el propio repo, además del entitlement en la app.
11. **Piezas recortadas a cinco reales** (antes había hasta OL-202 con piezas de NFC y vibración sin uso pedido): OL-155 (ya reservada, Wallet + llaves), OL-192 (envoltorio con permisos y entrar por sesión externa), OL-193 (APNs cliente y servidor), OL-194 (TestFlight), OL-195 (ficha y envío). NFC y vibración quedan sin OL hasta que haya un uso concreto.
12. **Recomendación técnica honesta:** Capacitor en vez de WKWebView propio, porque ya trae plugins mantenidos de permisos, push y deep links — más razonable para una persona sola manteniendo el proyecto — en vez de la comparación anterior que favorecía escribir todos los puentes a mano sin justificar bien el costo de mantenerlos.

## Qué queda (actualizado)

- El founder firma el plan corregido y elige si app antes o después del blog (recomendación: antes o en paralelo).
- Confirmar OL-192 a OL-195 en ASIGNACIONES cuando el founder dé la orden de arrancar.
- Primera pieza real: seguir OL-155 (Wallet en la web) hasta que el founder tenga las llaves; después, OL-192.
