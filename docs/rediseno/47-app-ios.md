# 47 · App en las tiendas: iOS y Android

**OL-191 · Bitácora 225 · 2026-09-25. Tercera versión: ahora cubre Android, a pedido del founder («asegúrate de considerar en el plan Android e iOS»).** Plan de la app en las dos tiendas (Apple y Google). Sin código: solo documentación, decisiones y piezas propuestas. El founder decide si la app nativa va antes o después del blog, y qué tienda sale primero.

## 1. Qué es la app

La app nativa es **la misma web de somosnosotros.org envuelta en un contenedor de tienda**, sin reescribir ninguna pantalla en Swift ni en Kotlin. En iOS el envoltorio es Capacitor (control sobre un `WKWebView`); en Android se recomienda una Trusted Web Activity (TWA), que corre en Chrome, no en un WebView (sección 6). Agenda, directorio, perfiles y Wallet siguen siendo la web; el envoltorio solo añade lo que el navegador de cada plataforma todavía no le da a una web instalada: en iOS, avisos por APNs y un inicio de sesión que funcione dentro del contenedor (secciones 3 y 4); en Android, con TWA, casi todo ya funciona igual que en la web instalada de hoy.

**Qué NO es:** no se reescribe ninguna pantalla; no se abandona Next.js ni Supabase; no se inventan funciones que nadie pidió («validar entradas por NFC», «modo offline», «deslizar con háptica» quedan fuera: son ideas sin un uso real detrás), en ninguna de las dos plataformas.

## 2. Wallet: no es exclusiva de la app nativa, y en Android es un pase distinto

El borrador anterior usaba Wallet como la prueba de que la app «hace algo que la web no hace». Es falso: Safari en el iPhone **ya puede agregar un `.pkpass` a Wallet desde una página web común** (Content-Type `application/vnd.apple.pkpass`), sin app nativa, desde iOS 6. Esto ya está planeado como OL-155 y solo espera que el founder cree el certificado Pass Type ID. En la app nativa el mismo pase se agrega igual: con PassKit (`PKAddPassesViewController`) o abriendo la misma URL del `.pkpass` dentro del envoltorio.

En Android no existe Apple Wallet; el equivalente es **Google Wallet**, con otro sistema por completo (API de Google Wallet, cuenta de emisor propia, pases «Guardar en Google Wallet»). No es la misma pieza que OL-155 ni se resuelve con el mismo certificado: se propone como **pieza aparte y opcional** (sección 11) que no bloquea la salida a ninguna tienda.

Conclusión: Wallet no sirve como argumento frente a la guía 4.2.2 de Apple ni frente a la política equivalente de Play. Lo que de verdad distingue a la app nativa de «el sitio empaquetado» se explica en la sección 8.

## 3. Avisos: dentro del contenedor no siempre llegan los push web

Los avisos push de hoy (`PushManager`, `src/lib/pushCliente.ts`, `public/sw.js`) funcionan porque el navegador registra un service worker cuando la persona instala la web en el inicio.

**iOS:** un envoltorio Capacitor/WKWebView no tiene ese registro: ni `PushManager` ni el service worker se comportan como en Safari instalado. Si la app no trae su propio canal, quien la instale **pierde los avisos que ya tenía en la web** — hay que resolverlo antes de enviarla. La solución es APNs: (1) la app se registra ante Apple y recibe un token; (2) lo manda al servidor (endpoint nuevo, ej. `/api/dispositivos`); (3) `src/lib/avisosWorker.ts`, que ya manda web push, agrega una segunda vía por APNs cuando hay token guardado.

**Android:** depende del envoltorio elegido. Con **TWA (la vía recomendada, sección 6)** el service worker sigue siendo el de Chrome: los avisos push web de hoy llegan igual, sin tocar nada. Con Capacitor en Android (la alternativa no recomendada) el service worker queda dentro de un WebView y deja de recibir push web, igual que en iOS; haría falta un puente con FCM (Firebase Cloud Messaging), cuenta de Firebase propia y su SDK — trabajo extra que TWA evita.

Nada de esto cambia el web push que ya existe para quien usa la web instalada sin app de tienda (`docs/rediseno/28-avisos-y-boletin.md`).

## 4. Inicio de sesión dentro del contenedor

Hoy `src/app/entrar` ofrece tres caminos (revisado en el código, no supuesto):

- **Correo:** `signInWithOtp` manda un código de 8 dígitos y también un enlace. Es una llamada directa a Supabase, sin salir de la página: **funciona igual dentro de cualquier envoltorio**, en iOS y en Android.
- **Google:** `src/app/auth/[proveedor]/route.ts` redirige a Google, que devuelve con un POST. Google **bloquea este flujo dentro de cualquier webview embebido** desde 2021 (`disallowed_useragent`): fallaría en un WKWebView (iOS) o en un WebView de Capacitor-Android. El código ya excluye el botón en navegadores embebidos conocidos (`botonesProveedor`, `src/lib/entrarCon.ts`); hay que aplicar la misma exclusión al agente de nuestro envoltorio, o resolverlo abajo. **Una TWA en Android no tiene este problema**: corre en Chrome real, no en un WebView embebido, así que el botón funciona sin cambios.
- **Apple:** mismo mecanismo de redirección y POST; no está bloqueado como Google, pero Apple recomienda no hacerlo en un webview simple por ser frágil (cookies, seguimiento de terceros). En Android no aplica esta guía, pero el mismo riesgo existe si el envoltorio fuera Capacitor.

**Solución para iOS y para un eventual Capacitor-Android:** abrir Apple o Google en `ASWebAuthenticationSession` (iOS) o **Custom Tabs** (Android), ventanas de navegador reales controladas por el sistema, no el WebView de la app; al terminar, regresan por un enlace que la app reconoce (deep link). El correo con código sigue funcionando dentro del contenedor como respaldo. Con TWA en Android este paso no hace falta: ya es Chrome.

La prueba de esta pieza es entrar de las tres formas sin que ninguna falle dentro del contenedor, y volver a entrar tras cerrar la app — en las dos plataformas.

Dos guías de Apple entran aquí (políticas equivalentes de Play en la sección 10):

- **4.8 (Sign in with Apple):** obligatorio si hay otros inicios de sesión de terceros. Ya existe en la web (`org.somosnosotros.web`); falta comprobar que funcione dentro de la app con el mecanismo de arriba.
- **5.1.1(v) (borrado de cuenta):** debe poder borrarse desde dentro de la app. **Corrección al borrador anterior:** la cuenta no se borra en `/borrado` (esa pantalla confirma borrar un evento, lugar o artista); vive en `/ajustes` («Borrar mi cuenta», acción `borrarMiCuenta`). Basta con que `/ajustes` sea alcanzable dentro del envoltorio, cosa ya cierta por ser la misma web. Play exige lo mismo y además un **enlace web** de borrado fuera de la app: `/ajustes` ya cumple las dos formas.

## 5. Permisos del navegador dentro del envoltorio

Cámara, micrófono, ubicación y movimiento ya los usa la web hoy (con permiso, memoria del founder 2026-09-21). Dentro de un WebView embebido no llegan solos: son trabajo real del envoltorio. **Esto solo aplica a iOS y a un eventual Capacitor-Android**; una TWA es Chrome, así que estos permisos siguen pidiéndose igual que en la web instalada de hoy, sin puente que escribir.

| Capacidad | iOS (Capacitor/WKWebView) | Android con Capacitor | Android con TWA |
|---|---|---|---|
| Cámara / micrófono (`getUserMedia`) | Funciona desde iOS 14.3; `decideMediaCapturePermissionFor` (iOS 15+) decide si se pregunta | Plugin de Capacitor + permiso en `AndroidManifest.xml` | Ya funciona, es el permiso de Chrome |
| Ubicación (`navigator.geolocation`, `src/lib/ubicacion.ts`) | `NSLocationWhenInUseUsageDescription` | Plugin + permiso en el manifiesto | Ya funciona, es el permiso de Chrome |
| Movimiento y orientación | `NSMotionUsageDescription` (solo si aparece un uso) | Plugin + permiso en el manifiesto | Ya funciona, es el permiso de Chrome |

Nada de esto se prueba solo mirando el código: hay que abrir el flujo en un dispositivo real (o simulador/emulador) y comprobar que Apple y Google de verdad regresan a la app.

## 6. Enfoque técnico: iOS con Capacitor, Android con TWA o Capacitor

| Aspecto | WKWebView propio (iOS) | Capacitor (iOS y Android) | PWABuilder | TWA en Android (Bubblewrap/PWABuilder) |
|---|---|---|---|---|
| Puentes de permisos, push y deep links | Se escriben a mano | Plugins mantenidos por la comunidad | Limitados, sin push nativo | No hacen falta: es Chrome, ya los da la web instalada |
| Control sobre el código | Completo | Envoltorio de Capacitor; plugins de terceros | Bajo, depende de la herramienta | Bajo: casi no hay código nativo que mantener |
| Equipo | Una persona con Swift | Una persona, con menos Swift/Kotlin | Una persona, atada a la herramienta | Una persona, sin Kotlin real |
| Riesgo | Escribir y mantener los puentes propios | Actualizaciones de Capacitor y sus plugins | La herramienta puede quedar obsoleta | Que la web deje de servir `assetlinks.json` |

**Recomendación para iOS: Capacitor** (para una persona sola, no vale la pena escribir a mano los puentes de permisos, push y deep links).

**TWA frente a Capacitor, solo para Android:**

| | TWA (Bubblewrap/PWABuilder) | Capacitor en Android |
|---|---|---|
| Dónde corre | Chrome real | WebView embebido |
| Avisos push | Los de hoy, sin cambios (sección 3) | Hace falta FCM (sección 3) |
| Entrar con Google/Apple | Igual que en la web (sección 4) | Bloqueado o frágil; hace falta Custom Tabs |
| NFC y vibración | Ya los da Chrome (sección 7) | También los da el WebView, pero sin necesidad |
| Costo del proyecto | Un envoltorio distinto al de iOS | Mismo proyecto que iOS, un solo código nativo |

**Recomendación: TWA para Android.** Casi no hay trabajo nativo que mantener y los avisos, el inicio de sesión, NFC y la vibración siguen funcionando tal cual ya funcionan en la web instalada; el costo es sostener dos envoltorios distintos (TWA en Android, Capacitor en iOS) en vez de un solo proyecto, un costo menor que escribir y mantener FCM y Custom Tabs dentro de Capacitor solo para evitar esa duplicidad.

## 7. NFC y vibración: solo le faltan a iOS

Chrome en Android ya da Web NFC y la Vibration API dentro de la web instalada de hoy, con o sin envoltorio: no son argumento para pedir una app nativa en Android. En iPhone, Safari sigue sin ofrecer ninguna de las dos (memoria del founder 2026-09-21): siguen siendo lo que solo una app nativa de iOS puede dar, y solo cuando el founder pida un uso concreto (sección 13).

## 8. Qué distingue a la app nativa de «el sitio empaquetado»

La guía 4.2.2 de Apple (y la política equivalente de Play sobre apps que solo envuelven una web, sección 10) es el riesgo real de rechazo. Lo cierto, sin inventar funciones:

- **Avisos por su canal nativo:** APNs en iOS (sección 3); en Android los avisos web de siempre ya cumplen porque TWA es la misma web instalada.
- **Entrada con Apple integrada** en el propio flujo de la app en iOS, sin salto visible a Safari (sección 4).
- **Enlaces directos:** Universal Links en iOS, App Links en Android; un enlace a un evento (SMS o WhatsApp) abre la app, no el navegador, en las dos plataformas (sección 9).
- **NFC y vibración en iOS** cuando aparezca un uso concreto pedido por el founder (nunca antes: CLAUDE.md es explícito en que esperan a esa etapa); en Android no aplica, la web ya los tiene (sección 7).

Si Apple o Google rechazan igual alegando «es un wrapper»: se responde con capturas de los avisos llegando por su canal nativo, del inicio de sesión integrado y de un enlace directo abriendo un evento — sin inventar nada que no esté en la app.

## 9. Enlaces profundos: dos archivos servidos por la web

Los enlaces directos necesitan dos partes que coincidan, en cada plataforma:

- **iOS:** el entitlement `associated-domains` en la app, y un archivo `/.well-known/apple-app-site-association` servido por `somosnosotros.org` en HTTPS, sin redirecciones, con el Team ID y el identificador de la app.
- **Android:** la declaración de intent filters en la app, y un archivo `/.well-known/assetlinks.json` (Digital Asset Links) servido por `somosnosotros.org`, con la huella digital del certificado de firma de la app.

Las dos partes son código en el repo web (una ruta que sirva cada archivo), no algo que el founder configure solo desde Apple Developer o Google Play Console. Se agrupan en una sola pieza, OL-195 (sección 11).

## 10. Guías de Apple y políticas de Google Play citadas

**Apple (confirmadas por su numeración vigente):**

- **2.5.6** — toda navegación web dentro de la app debe usar WebKit.
- **4.2 / 4.2.2** — funcionalidad mínima: la app debe ser más que el sitio empaquetado (sección 8).
- **4.8** — Sign in with Apple obligatorio si hay otros inicios de sesión de terceros (sección 4).
- **5.1.1** — privacidad y datos; **5.1.1(v)** exige que la cuenta pueda borrarse desde dentro de la app (sección 4).
- **5.1.2** — uso de datos: lo declarado en la ficha debe coincidir con lo que la app de verdad hace.
- **App Privacy (etiquetas de la ficha)** — declarar qué se recopila; con Vercel Analytics sin Analytics Plus, el rastreo es mínimo y sin identificar personas (memoria del founder).

**Google Play (confirmadas 2026-09-25):**

- **Funcionalidad mínima / «Webviews» y spam** — igual que la 4.2.2 de Apple: una app que solo envuelve una web sin más se retira o rechaza.
- **Seguridad de los datos (Data safety)** — sección obligatoria de la ficha, declarar qué se recopila.
- **Borrado de cuenta** — dentro de la app y también por un **enlace web** fuera de ella; `/ajustes` cubre ambas formas (sección 4).
- **Target API level** — Play exige apuntar a una versión reciente de Android; el requisito sube cada año, hay que revisar la vigente al subir el paquete.
- **Clasificación de contenido** — cuestionario IARC en Play Console, equivalente a la etiqueta de edad de Apple.
- **Cuenta de desarrollador** — pago único de 25 USD (confirmado: sigue siendo pago único, no anual) más verificación de identidad. Las cuentas **personales** creadas después de noviembre de 2023 deben completar una **prueba cerrada con al menos 12 personas inscritas de forma continua durante 14 días seguidos** antes de poder pedir producción (cifra vigente desde el 11 de diciembre de 2024, cuando Google la bajó de 20 a 12; fuente: Play Console Help, `support.google.com/googleplay/android-developer/answer/14151465`). Las cuentas de **organización** (piden D-U-N-S y documentos) no tienen esta regla, pero su verificación toma más tiempo; se menciona como opción si el proyecto se constituye como asociación.

## 11. Piezas propuestas y orden

Pocas piezas, realistas, cada una con su prueba, ordenadas para que la prueba cerrada de 14 días de Play arranque cuanto antes y corra en paralelo al resto (ese es el plazo largo de Android, no la revisión en sí).

| # | Pieza | OL sugerido | Tamaño | Prototipo | Qué cierra |
|---|---|---|---|---|---|
| 1 | Llaves del founder (APNs `.p8` y certificado Pass Type ID) + Wallet en la web | **OL-155** (ya reservada, no duplicar) | Mediana | Sí (ya en curso) | Certificado y llave en Vercel; botón «Agregar a Wallet» en la web |
| 2 | Envoltorio Android: TWA con Bubblewrap o PWABuilder | OL-192 | Mediana | Sí (boceto de la ficha del paquete) | Paquete Android que abre la web instalada como app, listo para subir a Play |
| 3 | Cuenta de Google Play + arranque de la prueba cerrada con 12 probadores | OL-193 | Chica | No | Prueba cerrada corriendo — arranca aquí para que los 14 días avancen mientras se hace el resto |
| 4 | Envoltorio Capacitor iOS: sesión persistente, permisos puenteados, entrar por `ASWebAuthenticationSession` y vuelta por deep link | OL-194 | Grande | Sí (boceto del flujo de entrar y de los permisos) | Binario iOS que carga la web, permisos nativos, entrar con Apple y Google sin fallar |
| 5 | Enlaces profundos: `apple-app-site-association` (iOS) y `assetlinks.json` (Android), servidos por la web, más el entitlement/intent filter en cada app | OL-195 | Chica | Sí (boceto del enlace compartido) | Un evento compartido por SMS/WhatsApp abre la app instalada, en las dos plataformas |
| 6 | APNs: token del cliente iOS + envío desde el servidor junto al web push actual (Android sigue con web push, sin FCM) | OL-196 | Mediana | Sí (diagrama app → servidor → APNs) | La app iOS registra su token; `avisosWorker.ts` manda por APNs si hay token |
| 7 | TestFlight con el founder (iOS) | OL-197 | Chica | No | El founder instala, entra, ve la agenda, recibe un aviso y borra su cuenta de prueba |
| 8 | Fichas de las dos tiendas: textos, capturas reales (iPhone y Android), Data safety y App Privacy, borrado de cuenta por enlace web, clasificación de contenido, target API vigente, envío a revisión en ambas | OL-198 | Mediana | Sí (5 capturas 390×844 con datos reales, en las dos plataformas) | Fichas completas; envío hecho en las dos tiendas; número de caso anotado |
| — | Google Wallet (API propia, cuenta de emisor) | Sin OL todavía | — | — | Pieza aparte de OL-155, opcional; no bloquea la salida a ninguna tienda |
| — | Tras la aprobación: NFC o vibración en iOS | Sin OL todavía | — | — | Solo si el founder pide un uso concreto; en Android ya los da Chrome (sección 7) |

El blog avanza en paralelo mientras las tiendas revisan: es web pura y llega a las dos apps sin reenviar nada.

## 12. Tiempos de revisión y de prueba

- **Apple:** normalmente entre uno y pocos días, sin garantía; un rechazo suma otra vuelta.
- **Google Play:** los 12 probadores deben quedar inscritos 14 días **seguidos** antes de pedir producción (si alguien sale y vuelve a entrar, esos días no cuentan); después, la revisión de producción propia de Play. No hay una cifra más precisa que ofrecer en ninguna de las dos.

## 13. Pendientes del founder (solo él puede hacerlos)

1. Crear la llave APNs (`.p8`) y el certificado Pass Type ID en developer.apple.com, y pasar esos secretos a Vercel — nunca al repositorio.
2. Aceptar los acuerdos pendientes en App Store Connect.
3. **Crear la cuenta de Google Play** (no consta que exista hoy): pago único de 25 USD y verificación de identidad.
4. Decidir quiénes son los **12 probadores** de la prueba cerrada de Play: se propone la comunidad cercana del founder y los artistas que ya reclamaron su ficha en el CAPO como primer grupo natural.
5. Probar cada hito en TestFlight (iOS) y en la prueba cerrada de Play (Android), en sus propios teléfonos.
6. Dar la orden de enviar a revisión en cada tienda cuando la ficha esté lista.

## 14. ¿App nativa antes o después del blog?

Antes, o en paralelo, en las dos tiendas. El blog es web pura y llega a ambas apps sin reenviar: en cuanto una app esté en su tienda, el blog se ve ahí solo. La revisión de Apple y la prueba cerrada de Play son los únicos plazos que no controlamos, así que conviene arrancarlos ya y avanzar el blog mientras se espera.

## 15. ¿Cuál tienda primero?

Ninguna espera a la otra: se arrancan las dos en cuanto exista el envoltorio de cada una, porque el plazo largo de Android (los 14 días de prueba cerrada) no depende de terminar iOS y conviene que corra cuanto antes. En la práctica eso significa construir primero el envoltorio de Android (TWA, la pieza más chica) para abrir esa prueba cerrada, mientras se construye en paralelo el de iOS (Capacitor, la pieza más grande); la que termine antes su revisión sale primero, sin que haga falta decidirlo de antemano.
