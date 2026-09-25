# 47 · App nativa para iOS: plan de implementación

**OL-191 · Bitácora 225 · 2026-09-25. Segunda versión, con las correcciones del gestor.** Plan de la app de iOS en la tienda de Apple. Sin código: solo documentación, decisiones y piezas propuestas. El founder decide si la app nativa va antes o después del blog.

## 1. Qué es la app de iOS

La app nativa es **la misma web de somosnosotros.org envuelta en un contenedor de tienda** (un `WKWebView`), sin reescribir ninguna pantalla en Swift. Agenda, directorio, perfiles y Wallet siguen siendo la web; el envoltorio solo añade lo que el navegador no puede darle a una web instalada: avisos por APNs, un inicio de sesión que funcione dentro del contenedor, enlaces directos (Universal Links) y, más adelante, NFC o vibración si aparece un uso concreto.

**Qué NO es:** no se reescribe ninguna pantalla; no se abandona Next.js ni Supabase; no se inventan funciones que nadie pidió («validar entradas por NFC», «modo offline», «deslizar con háptica» quedan fuera: son ideas sin un uso real detrás).

## 2. Corrección importante: Wallet no es exclusiva de la app nativa

El borrador anterior usaba Wallet como la prueba de que la app «hace algo que la web no hace». Es falso: Safari en el iPhone **ya puede agregar un `.pkpass` a Wallet desde una página web común** (Content-Type `application/vnd.apple.pkpass`), sin app nativa, desde iOS 6. Esto ya está planeado como OL-155 y solo espera que el founder cree el certificado Pass Type ID. En la app nativa el mismo pase se agrega igual: con PassKit (`PKAddPassesViewController`) o simplemente abriendo la misma URL del `.pkpass` dentro del WKWebView, que dispara el mismo flujo de Safari.

Conclusión: Wallet no sirve como argumento frente a la guía 4.2.2. Lo que de verdad distingue a la app nativa de «el sitio empaquetado» se explica en la sección 4.

## 3. Avisos: dentro del contenedor no llegan los push web

Los avisos push de hoy (`PushManager`, `src/lib/pushCliente.ts`, `public/sw.js`) funcionan porque Safari registra un service worker cuando la persona instala la web en el inicio. **Un `WKWebView` metido en una app nativa no tiene ese registro**: ni `PushManager` ni el service worker se comportan igual que en Safari instalado. Si la app nativa no trae su propio canal de avisos, quien la instale **pierde los avisos que ya tenía en la web instalada** — no es opcional, hay que resolverlo antes de enviar la app.

La solución es APNs (Apple Push Notification service), con un puente claro:

1. La app nativa se registra ante Apple y recibe un token de dispositivo.
2. La app manda ese token al servidor (endpoint nuevo, por ejemplo `/api/dispositivos`).
3. El servidor, en `src/lib/avisosWorker.ts`, ya sabe mandar web push (Vercel); se le agrega una segunda vía: si el destinatario tiene un token de APNs guardado, manda por APNs además o en vez de web push, según de dónde venga ese dispositivo.

Nada de esto cambia el web push que ya existe para quien usa la web instalada sin la app de tienda (`docs/rediseno/28-avisos-y-boletin.md`).

## 4. Inicio de sesión dentro del contenedor

Hoy `src/app/entrar` ofrece tres caminos (revisado en el código, no supuesto):

- **Correo:** `signInWithOtp` manda un código de 8 dígitos y también un enlace («también trae un enlace, por si prefieres tocarlo»). Es una llamada directa a Supabase, sin salir a otra página: **funciona igual dentro del WKWebView**, sin ajustes.
- **Google:** `src/app/auth/[proveedor]/route.ts` redirige a Google y Google devuelve con un POST. Google **bloquea este flujo dentro de cualquier webview embebido** desde 2021 (error `disallowed_useragent`): el botón de Google fallaría siempre dentro del contenedor. El propio código ya excluye ese botón cuando detecta un navegador embebido tipo Instagram o Facebook (`botonesProveedor`, `src/lib/entrarCon.ts`); hay que aplicar la misma exclusión cuando el agente sea el de nuestro propio WKWebView, o resolverlo con el punto siguiente.
- **Apple:** mismo mecanismo de redirección y POST; no está bloqueado como Google, pero Apple recomienda no hacerlo en un webview simple porque es frágil (cookies de sesión, seguimiento de terceros).

**Solución habitual y la que se propone aquí:** abrir el inicio de sesión (Apple o Google) en `ASWebAuthenticationSession` (o `SFSafariViewController`), que es una ventana de navegador de verdad controlada por iOS, no el WKWebView de la app; al terminar, Apple o Google regresan por un enlace que la app reconoce (deep link) y cierra esa ventana. El correo con código sigue funcionando siempre dentro del WKWebView, como respaldo si algo falla.

La prueba de esta pieza no es solo «cargó la página»: es entrar de las tres formas (correo, Apple, Google) sin que ninguna falle dentro del contenedor, y volver a entrar tras cerrar la app para comprobar que la sesión quedó guardada.

Dos guías de Apple entran aquí:

- **4.8 (Sign in with Apple):** si la app ofrece otros inicios de sesión de terceros, debe ofrecer también Apple. Ya existe para la web (`org.somosnosotros.web`); falta comprobar que el mismo botón funcione dentro de la app con el mecanismo de arriba.
- **5.1.1(v) (borrado de cuenta):** debe poder borrarse la cuenta desde dentro de la app. **Corrección al borrador anterior:** la cuenta no se borra en `/borrado` — esa pantalla es la confirmación de borrar un evento, lugar o artista. Borrar la cuenta vive en `/ajustes` («Borrar mi cuenta», acción `borrarMiCuenta` en `src/app/perfil/acciones`). Basta con que `/ajustes` sea alcanzable dentro del WKWebView, cosa que ya es cierta porque es parte de la misma web.

## 5. Permisos del navegador dentro del WKWebView

Cámara, micrófono, ubicación y movimiento ya los usa la web hoy (con permiso, memoria del founder 2026-09-21). Dentro de un WKWebView no llegan solos: cada uno es trabajo real del envoltorio, no un ajuste automático.

| Capacidad | Qué hace falta en el envoltorio | Permiso en Info.plist |
|---|---|---|
| Cámara / micrófono (`getUserMedia`) | Funciona en WKWebView desde iOS 14.3; el delegado `decideMediaCapturePermissionFor` (iOS 15+) decide si se pregunta o no | `NSCameraUsageDescription`, `NSMicrophoneUsageDescription` |
| Ubicación (`navigator.geolocation`, usado en `src/lib/ubicacion.ts`) | El delegado de WKWebView pide el permiso nativo de localización la primera vez que la web lo solicita | `NSLocationWhenInUseUsageDescription` |
| Movimiento y orientación | Solo si algún flujo lo usa (hoy no se encontró uso en el código); si se agrega, pide su propio permiso nativo | `NSMotionUsageDescription` (solo si aplica) |

Nada de esto se prueba solo mirando el código: hay que abrir el flujo en un dispositivo real (o el simulador) y comprobar que Apple y Google de verdad regresan a la app, no solo que el redirect sale bien en la web.

## 6. Enfoque técnico: WKWebView propio, Capacitor o PWABuilder

| Aspecto | WKWebView propio en Swift | Capacitor (Ionic) | PWABuilder |
|---|---|---|---|
| Puentes de permisos, push y deep links | Se escriben a mano | Ya vienen en plugins mantenidos por la comunidad | Limitados, sin APNs nativo |
| Control sobre el código | Completo | El envoltorio es de Capacitor; los plugins, de terceros | Bajo, depende de la herramienta |
| Equipo | Una persona con Swift | Una persona, con menos Swift | Una persona, atada a la herramienta |
| Riesgo | Escribir y mantener los puentes propios | Actualizaciones de Capacitor y de sus plugins | La herramienta puede quedar obsoleta |

**Recomendación: Capacitor.** Para una persona sola manteniendo el proyecto, no vale la pena escribir y mantener a mano los puentes de permisos, push y deep links: Capacitor ya los trae como plugins mantenidos (incluido APNs y `ASWebAuthenticationSession`), y sigue siendo la web de siempre por dentro — no hay reescritura. El costo es aceptar la capa de Capacitor como dependencia adicional; el ahorro de tiempo de desarrollo y mantenimiento la compensa.

## 7. Qué distingue a la app nativa de «el sitio empaquetado» (guía 4.2.2)

La guía 4.2.2 es el riesgo real de rechazo: una app que solo carga una URL sin más se rechaza. Lo cierto, sin inventar funciones:

- **Avisos por APNs**, con el mismo contenido que hoy pero por el canal nativo del teléfono (sección 3).
- **Entrada con Apple integrada** en el propio flujo de la app, sin salto visible a Safari (sección 4).
- **Universal Links**: un enlace a un evento (por SMS o WhatsApp) abre directo la app, no el navegador.
- **La promesa de NFC y vibración cuando aparezca un uso concreto** pedido por el founder (nunca antes: CLAUDE.md es explícito en que estas capacidades esperan a esa etapa).

Si Apple rechaza igual alegando «es un wrapper»: se responde con capturas de los avisos llegando por APNs, del inicio de sesión con Apple dentro de la app y de un Universal Link abriendo un evento directo — sin inventar nada que no esté en la app.

## 8. Deep links: falta un archivo en la web, no solo un ajuste en la app

Los Universal Links necesitan **dos partes que coincidan**: el entitlement `associated-domains` en la app, y un archivo `/.well-known/apple-app-site-association` servido por `somosnosotros.org` en HTTPS, sin redirecciones, con el Team ID y el identificador de la app. La segunda parte es código en el repo web (una ruta que sirva ese archivo), no algo que el founder configure solo desde Apple Developer.

## 9. Guías de Apple citadas (confirmadas por su numeración vigente)

- **2.5.6** — toda navegación web dentro de la app debe usar WebKit (WKWebView cumple; Chrome o Firefox embebidos no).
- **4.2 / 4.2.2** — funcionalidad mínima: la app debe ser más que el sitio empaquetado (sección 7).
- **4.8** — Sign in with Apple obligatorio si hay otros inicios de sesión de terceros (sección 4).
- **5.1.1** — privacidad y datos; **5.1.1(v)** exige que la cuenta pueda borrarse desde dentro de la app (sección 4).
- **5.1.2** — uso de datos: lo que se declare en la ficha debe coincidir con lo que la app de verdad hace.
- **App Privacy (etiquetas de la ficha)** — declarar qué se recopila; con Vercel Analytics sin Analytics Plus, el rastreo es mínimo y sin identificar personas (memoria del founder).

## 10. Piezas propuestas y orden

Pocas piezas, realistas, cada una con su prueba. El founder prueba cada hito en su iPhone (TestFlight) antes de la siguiente.

| # | Pieza | OL sugerido | Tamaño | Prototipo | Qué cierra |
|---|---|---|---|---|---|
| 1 | Llaves del founder (APNs `.p8` y certificado Pass Type ID) + Wallet en la web | **OL-155** (ya reservada, no duplicar) | Mediana | Sí (ya en curso) | Certificado y llave en Vercel; botón «Agregar a Wallet» funcionando en la web, sin app nativa |
| 2 | Envoltorio Capacitor: sesión persistente, permisos puenteados (cámara, micrófono, ubicación), entrar por `ASWebAuthenticationSession` y vuelta por deep link, archivo `apple-app-site-association` | OL-192 | Grande | Sí (boceto del flujo de entrar y de los permisos) | Binario que carga somosnosotros.org, permisos nativos funcionando, entrar con Apple y con Google sin fallar, un evento abierto por SMS abre la app |
| 3 | APNs: registro del token en la app y envío desde el servidor junto al web push actual | OL-193 | Mediana | Sí (diagrama app → servidor → APNs) | La app registra su token; `avisosWorker.ts` manda por APNs si hay token, sin tocar el web push existente; prueba con un evento real |
| 4 | TestFlight con el founder | OL-194 | Chica | No | El founder instala desde TestFlight, entra, ve la agenda, recibe un aviso y borra su cuenta de prueba, todo dentro de la app |
| 5 | Ficha de la tienda: textos, capturas reales del iPhone, etiquetas de privacidad, edad, y envío a revisión | OL-195 | Chica–mediana | Sí (5 capturas 390×844 con datos reales) | Ficha completa en App Store Connect; envío hecho; número de caso anotado |
| — | Tras la aprobación: NFC o vibración | Sin OL todavía | — | — | Solo si el founder pide un uso concreto; hasta entonces, no se propone nada |

El blog avanza en paralelo mientras Apple revisa (3 a 10 días, sin garantía): es web pura y llega a la app sin reenviar nada.

## 11. Tiempos de revisión

Normalmente entre uno y pocos días, sin garantía; un rechazo suma otra vuelta. No hay una cifra más precisa que ofrecer.

## 12. Pendientes del founder (solo él puede hacerlos)

1. Crear la llave APNs (`.p8`) y el certificado Pass Type ID en developer.apple.com, y pasar esos secretos a Vercel — nunca al repositorio.
2. Aceptar los acuerdos pendientes en App Store Connect.
3. Probar cada hito en TestFlight, en su propio iPhone.
4. Dar la orden de enviar a revisión cuando la ficha esté lista.

## 13. ¿App nativa antes o después del blog?

Antes, o en paralelo. El blog es web pura y llega a la app sin reenviar: en cuanto la app esté en la tienda, el blog se ve ahí solo. La revisión de Apple es el único plazo que no controlamos, así que conviene arrancarla ya y avanzar el blog mientras se espera.
