# 47 · App nativa para iOS: plan de implementación

**OL-191 · Bitácora 225 · 2026-09-25.** Plan de la app de iOS en la tienda de Apple. Sin código: solo documentación, decisiones y piezas propuestas. El founder decide si la app nativa va antes o después del blog.

## 1. Qué es la app de iOS

La app nativa de iOS es **la misma web de somosnosotros.org envuelta en un contenedor de tienda**, sin reescritura en Swift ni SwiftUI. La experiencia de usuario es idéntica: agenda, directorio de lugares, perfiles de artistas, Wallet, avisos — todo lo que hoy la PWA hace desde un navegador, llegará desde una app instalada en la tienda.

**Qué NO es:** no se reescribe ninguna pantalla en lenguajes nativos; no se abandona Next.js ni Supabase; la app no ofrece capacidades nuevas que la web ya cubra (cámara, micrófono, movimiento). Solo suma lo que el iPhone niega a Safari (NFC, vibración) y lo que la tienda facilita (entrega automática de actualizaciones, posicionamiento en buscador de apps).

**Por qué después de cerrar la web:** cada actualización de una app en tienda pasa revisión de Apple (3–7 días tipicamente). En fase de pruebas, el founder decide cambios diarios. Esperar a que la web esté cerrada y suficiente testeada mitiga rechazos y acelera la iteración: la revisión es el único plazo que no controla el equipo.

## 2. Enfoque técnico: WKWebView vs Capacitor vs PWABuilder

### Opciones y comparación

| Aspecto | WKWebView propio en Swift | Capacitor (Ionic) | PWABuilder / similares |
|---|---|---|---|
| **Control total** | Completo: todo el código en repositorio | Medio: Capacitor + plugins de terceros | Bajo: depende de herramienta y actualizaciones |
| **Costo por actualización** | Cero: la web se actualiza sola via HTTP, la app solo envoltura | Bajo: lo mismo, plugins gestionados por Ionic | Cero: mismo principio |
| **Acceso a Wallet** | Sí (directo vía ASN.1 + Safari) | Sí (plugin Capacitor) | Sí (pasar URL a Safari) |
| **APNs (avisos)** | Sí, en la app | Sí (plugin) | Solo push web (no APNs nativos) |
| **NFC** | Sí, Core NFC nativa | Sí (plugin en Beta) | No (PWA en webapp mode no accede NFC) |
| **Vibración** | Sí, Haptic Engine | Sí (plugin) | Sí (Vibration API web, limitada) |
| **Tamaño de descarga** | ~15 MB | ~30–50 MB | Varía, típicamente ~20–30 MB |
| **Hoja de cambios** | El owner controla totalmente | Esperar a nuevas versiones de Capacitor | Esperar a actualizaciones de la herramienta |
| **Sign in with Apple nativo** | Sí, ASAuthenticationSession | Sí (plugin) | Via Safari o delegado a web |
| **Deep links (Associated Domains)** | Sí, configurado al enviar | Sí (plugin) | Sí, via manifest web |
| **Equipo estimado** | 1 persona + Claude | 1–2 personas (menos Swift) | 1 persona, pero atado a herramienta |
| **Punto de fallo único** | La web; si cae, la app no carga | Capacitor + plugins de Ionic | La herramienta (PWABuilder, Pwa2apk, etc.) |

### Recomendación

**WKWebView propio en Swift.** Razones:

1. **Control y predictibilidad:** la web es fuente única de verdad; todo cambio se valida una vez, no en dos lugares (web + app).
2. **Costo operativo cero por actualización:** una vez publicada en tienda, la app carga la web desde somosnosotros.org; cambios en la web llegan instantáneamente, sin revisión adicional (salvo cambio de código nativo raro).
3. **Tamaño mínimo:** WKWebView + Swift ≈ 15 MB; Capacitor ≈ 50 MB. En tienda, cada MB importa para tiempo de descarga y retención.
4. **Equipo chico:** una persona con Swift + ayuda de Claude es suficiente para envoltorio + APNs + Wallet + NFC + Haptics.
5. **Riesgo bajo en cambios nulos:** si Capacitor saca un breaking change, hay que actualizar la app; Swift es más estable.

Sacrificio: más código Swift al principio, pero payoff es bajo mantenimiento después y pleno control sobre Wallet/APNs/NFC. La web hace toda el trabajo pesado (UI, datos, lógica). Swift solo orquesta: carga WKWebView, pone los avisos, maneja NFC/vibración.

## 3. Requisitos de Apple: guías y reglas clave

Apple pide cumplir estas reglas **antes de enviar a revisión** (App Store Review Guidelines, vigentes a 2026-09):

| Regla | Guía | Qué significa para somosnosotros | Mitiga |
|---|---|---|---|
| **4.2 · Funcionalidad mínima** | Cualquier app debe hacer algo útil. Los envoltorios web que solo cargan una URL sin valor agregado se rechazan. | La app ya suma: Wallet nativo (pasaporte descargable sin salir de la app), APNs (avisos sin web push), deep links (abrir evento directo desde SMS), presencia offline (caché mínimo de lo que se estaba viendo). | Rechazo por "es un browser wrapper". |
| **5.1.1 · Privacidad** | Si hay Sign in con Apple (nuestro caso), Sign in con Google, Facebook, etc., Apple exige que **también esté Sign in with Apple**. Borrado de cuenta debe estar dentro de la app, no solo via web. | Tenemos Sign in con Apple (identificador `org.somosnosotros.web`). Borrado existe en `/borrado` (web). Necesita duplicado en app con toque de botón `Eliminar mi cuenta` que dispare `/api/borrado` via WKWebView. | Rechazo por "falta Sign in with Apple" o "no se borra desde la app". |
| **2.5.1 · Webkit** | Las apps iOS **deben** usar WebKit (el motor de Safari) para cualquier contenido web. Usar un motor alterno (Chrome, Firefox) viola la guía. | WKWebView **es** WebKit: Apple lo controla, es legal. Capacitor también lo usa. | Rechazo si intentamos Chromium. |
| **Privacidad · Nutrition Label** | La ficha de la app en Store pide declarar qué datos se recopilan: ubicación, contacto, cookies, etc. | Con Vercel Analytics (actual) sin Analytics Plus: rastreo mínimo, sin rastreo de personas (CLAUDE.md, memoria). Declarar en App Privacy: "No recopilamos datos de identificación personal. Los análisis usan cookies de sesión sin seguimiento cruzado". Importa mantener esto real. | Rechazo o alarma de usuarios si los datos declarados no coinciden con el código. |
| **Etiqueta de edad** | App Store requiere edad mínima (típicamente 4+, 12+, 17+). | Público: cualquier edad. Sin contenido +17 (violencia, drogas, etc.). Declarar **4+**. | Rechazo si hay conflicto. |
| **Textos y capturas** | Ficha de Store: descripción, cambios, capturas (5 máximo), URL de privacidad, soporte, permisos requeridos. | El founder crea: descripción en español, 5 capturas de iPhone (390×844 px) mostrando agenda/lugares/artistas/Wallet/avisos, enlace a política de privacidad (somosnosotros.org/privacidad), email de soporte (legal o community). | Rechazo por textos vagas, capturas borrosas o sin permiso explícito de entrar. |

**Paso de revisión:** se manda la app binaria (.ipa) + el formulario en App Store Connect. Apple la revisa contra estas guías en 3–7 días. Causas comunes de rechazo en envoltorios: dicen "es un wrapper del sitio" (se mitiga con Wallet/APNs/deep links), piden acceso a cámara sin usarlo (no pidamos permisos innecesarios), o los textos son genéricos. Nuestra propuesta: ser explícito en la ficha sobre qué suma (Wallet, agenda sync en background via APNs).

## 4. Qué añade lo nativo respecto a la web instalada

| Capacidad | Web instalada (hoy) | App nativa (propuesto) | Cómo se alcanza |
|---|---|---|---|
| **Wallet (tarjeta descargable)** | No (NFC es web solo en Safari, pero Safari no puede generar `.pkpass`) | Sí, con botón en perfil de artista | Certificado Pass Type ID + servidor genera `.pkpass` firmado; usuario toca y entra a Wallet |
| **APNs (avisos empujados)** | Sí vía web push (ya existe) | Sí, con icono en barra de sistema | Server manda a APNs en vez de Vercel; cliente registra token de APNs en app nativa |
| **NFC (leer pase de entrada)** | No (Safari iOS no lo soporta) | Sí, con Core NFC | Evento con pase NFC; usuario toca el teléfono y se valida entrada |
| **Vibración (Haptic Engine)** | Parcial (Vibration API web da un zumbido genérico) | Completa (patrones Haptic, timing) | Usar UIImpactFeedbackGenerator + UINotificationFeedbackGenerator en Swift |
| **Sign in with Apple** | Vía web (ASP, Safari lo maneja) | Vía app (más fluido, menos salto a browser) | ASAuthenticationSession en Swift; comparte credencial con web |
| **Deep links** | Sí, vía web (somosnosotros.org/eventos/123) | Sí, con Universal Links (iOS 9+) | Associated Domains configurado; toque en SMS abre evento directo en app |
| **Caché de emergencia** | No | Mínimo: HTML + CSS de shell, último evento/lugar visto | Si sin red, muestra "últimos visto" en caché; al volver, sincroniza |
| **Actualización automática** | Manual (usuario borra + reinstala) | Automática vía App Store | App Store checkea versión diaria; notifica al usuario si hay nuevas |

**Punto clave:** cambios en la web (ficha de artista, evento, Agenda) se ven de inmediato en la app sin pasar revisión. Solo si modificamos código Swift (Wallet, APNs, NFC) necesita revisión nueva. Esto sostiene velocidad de iteración.

## 5. Piezas propuestas y orden

Cada pieza es independiente y lista para el siguente OL/bitácora. El `git checkout` es desde `main`, no acumulativo; el founder testea cada hito en TestFlight antes del siguiente.

### Fase 1: Certificados y bases (sin actualización de App Store)

| Pieza | OL sugerido | Tamaño | Prototipo | Qué cierra | Responsable |
|---|---|---|---|---|
| **Certificate y llaves de APNs** | OL-192 | Chica | No (es setup) | Certificado P8 creado en Apple Developer; llave en Vercel como secreto; servidor testea envío a APNs (cron de prueba) | Solo founder |
| **Identificadores de Deep Links** | OL-193 | Chica | No | Associated Domains (com.apple.developer.associated-domains) configurado para somosnosotros.org en Xcode | Solo founder |

### Fase 2: Envoltorio mínimo + Wallet (primera versión en TestFlight)

| Pieza | OL sugerido | Tamaño | Prototipo | Qué cierra | Responsable |
|---|---|---|---|---|---|
| **WKWebView y navegación básica** | OL-194 | Mediana | Sí (boceto en Figma de estado de carga y atrás) | Binario que carga somosnosotros.org; botones atrás/adelante en la barra; icono SN en la esquina; prueba en iPhone simulador (launch_screen, deep link a /eventos/1, vuelve a inicio) | Operador + Xcode |
| **Wallet: certificado y servidor** | OL-195 | Mediana | Sí (maqueta de `.pkpass` con datos de prueba) | Certificado Pass Type ID creado y en Vercel; servidor genera `.pkpass` para artista de prueba; perfil de artista muestra botón "Agregar a Wallet"; toque abre Safari → Wallet → toca "Agregar" y aparece en la app de Wallet. Foto: pantalla Wallet con la tarjeta. | Operador con llave del founder |
| **TestFlight y Build en App Store Connect** | OL-196 | Chica | No | Archivos binarios subidos a TestFlight; el founder la descarga y testea en su iPhone; acepta la invitación y la app llega a su teléfono | Operador (el founder da acceso) |

### Fase 3: APNs y notificaciones nativas

| Pieza | OL sugerido | Tamaño | Prototipo | Qué cierra | Responsable |
|---|---|---|---|---|---|
| **APNs: cliente en Swift** | OL-197 | Mediana | Sí (diagrama cliente → servidor → Apple) | App registra token de APNs al abrir; envía token al servidor via `/api/dispositivos` (endpoint nuevo); servidor lo guarda. Test: en App Store Connect, enviar prueba de push vía APNs; notificación aparece en el teléfono del founder. Foto: notificación en la barra de iOS. | Operador + Xcode |
| **APNs: servidor** | OL-198 | Mediana | Sí (si ya existe, ampliar doc de avisos) | Modificar `src/lib/avisosWorker.ts` para enviar a APNs si hay token registrado, además de web push. No cambiar web push (ya existe). Test: evento nuevo → push a web + APNs si hay token. | Operador con Vercel |

### Fase 4: NFC y vibración (actualización 1.1)

| Pieza | OL sugerido | Tamaño | Prototipo | Qué cierra | Responsable |
|---|---|---|---|---|---|
| **NFC: leer pase de evento** | OL-199 | Mediana | Sí (flujo: evento abierto → toque NFC → se valida entrada → vibración) | Si en evento hay pase NFC (campo nuevo `nfc_id` en `eventos`), botón "Validar entrada" dispara Core NFC; lee y compara con `nfc_id`; si coincide, vibra + muestra "¡Entrada validada!"; si no, vibra diferente + "No válido". Test en evento de prueba del founder. | Operador + Xcode |
| **Vibración (Haptic Engine)** | OL-200 | Chica | No | Reemplazar Vibration API web en acciones clave (validar entrada, añadir a Wallet, deslizar evento) con UIImpactFeedbackGenerator (toque leve/firme). Test: deslizar evento siente más "real" que web. | Operador + Xcode |

### Fase 5: Ficha en App Store y envío a revisión

| Pieza | OL sugerido | Tamaño | Prototipo | Qué cierra | Responsable |
|---|---|---|---|---|---|
| **Textos y capturas de Store** | OL-201 | Chica | Sí (5 PNG 390×844 con eventos reales del founder) | Descripción breve (3 líneas), cambios (v1.0), capturas ordenadas, URL de privacidad y soporte. Textos para que el founder apruebe en App Store Connect. | Operador (founder crea capturas) |
| **Envío a revisión de Apple** | OL-202 | Chica | No | App enviada, número de caso Apple anotado; esperar 3–7 días. Si rechazo: notas del revisor → bug fix → reenvío (OL nuevo si es grande). Si aprobación: versión 1.0 en App Store (disponible 48 h después). | Founder solo en App Store Connect |

### Fase 6: Blog en paralelo (sin bloquear revisión)

**Durante revisión de Apple (3–7 días), encargarse el blog en paralelo** (E10 de la cola, pieza `C1` o similar): entradas de eventos destacados, noticias de artistas. No depende de la app; la app la hereda cuando llega a tienda.

## 6. Costos, riesgos y respuesta de operación

### Cuota de desarrollador de Apple

- **USD 99 / año** (vence en la fecha del equipo del founder; ya está pagada hasta 2027-09-16).
- **No se paga por app ni por descargas.** Solo por membresía.

### Tiempo de revisión

- **Rango realista: 3–10 días.** Promedio hoy: 3–5 días en apps medianas.
- **Primer rechazo muy común en envoltorios.** Razones típicas: "es un wrapper, sin funcionalidad única" (mitiga Wallet), "piden permiso de cámara sin usarlo" (no pidamos), "descripción genérica" (sea específica). Reenvío toma otros 3–5 días.
- **Mitiga riesgo:** tener Wallet + APNs visibles en la ficha de Store ("autoridad para agregar pases", "notificaciones nativas") evita la queja de "wrapper vacío".

### Mantenimiento por versión de iOS

- Cada año iOS cambia (iOS 27 en otoño 2026, 28 en 2027, etc.). WKWebView suele ser compatible hacia atrás 3–4 años. **No hay breaking change anual típicamente**, salvo cambios grandes en Swift.
- **Vibración y NFC:** Core NFC cambió poco desde iOS 13; Haptics es estable desde iOS 10.
- **Sign in with Apple:** estable desde iOS 13.
- **Associated Domains:** estable desde iOS 9.
- **Conclusión:** mantener la app viva es cambios cosméticos + una revisión anual de deprecaciones (Xcode marca líneas rojas).

### Rechazos típicos y respuesta

| Rechazo esperado | Causa | Respuesta |
|---|---|---|
| "Es un wrapper de sitio web" | Criterio 4.2 | "La app añade: Wallet nativo, APNs, deep links, modo offline. Ninguno es posible desde web safari.org." + captura de Wallet funcionando. |
| "Las capturas no muestran la funcionalidad única" | Criterio 2.1 | Captura 1: Wallet abierto con tarjeta de artista. Captura 2: notificación de evento. Captura 3: entrada vía NFC. |
| "No tienen descripción de privacidad" | Criterio 5.1.1 | Añadir URL a somosnosotros.org/privacidad (crear si no existe). Verificar que Nutrition Label declare rastreo mínimo. |
| "No tiene Sign in with Apple" | Criterio 5.1.1 | Sign in with Apple ya existe (ASAuthenticationSession); captura de flujo. |
| "La app no se abre sin conexión" | Criterio 4.2 (parcial) | Caché de shell + últimos vistos; no es offline completo, pero muestra algo. O: "La app sin red muestra mensaje: requiere conexión. Diseño a propósito: datos siempre frescos, no cache stale." |

**Política:** si rechazan, el founder elige si arreglar (OL nuevo) o desistir (no vuelvo a enviar). No somos Apple: respuesta directa, sin teatralidad.

## 7. ¿App nativa antes o después del blog?

**Recomendación del gestor: antes (o en paralelo).**

**Razones:**

1. **Revisión de Apple es el único plazo externo.** Si esperamos a hacer el blog primero y luego la app, perdemos 4+ semanas de revisión de tienda que no podemos acortar. La web está cerrada, la app de tienda llega cuando llega.
2. **Durante revisión de Apple, se construye el blog sin bloqueos.** Apple revisa 3–7 días; en ese tiempo, blog avanza sin tocar código nativo. Al aprobar la app, el blog entra sin conflictos (es contenido web puro).
3. **El blog hereda características de la app automáticamente.** Una vez que la app esté en tienda, el blog se ve en la app WKWebView: no hay reescritura, no hay instalador aparte.
4. **Riesgo: si blog primero, app se retrasa.** Cambios del blog pueden afectar la pantalla web (layout, datos); cada cambio en la web exige probar nuevamente en la app antes de enviar a tienda.

**Conclusión:** **App nativa primero (OL-192 a OL-202, ~4–5 semanas si revisión sale a la primera). Blog en paralelo a partir de OL-203 (semana 4). Entrega final: app 1.0 en tienda + blog vivo en somosnosotros.org vía app + web.**

## 8. Pendientes del founder (solo él puede hacerlos)

1. **Aceptar invitación a Apple Developer** (ya llegó el 2026-09-16; revisar correo de Apple).
2. **Crear certificado Pass Type ID en Apple Developer** para Wallet → botón "Create identifier" en Apple Developer, dominio `pass.somosnosotros.org`, descargar `.cer` e instalarlo en la Mac.
3. **Exportar llave P8 de APNs** en Apple Developer (Authentication Key para APNs) → descargar `.p8` → guardar en Vercel como secreto `APPLE_APN_KEY`.
4. **Crear las 5 capturas de iPhone (390×844 px)** de la app en TestFlight mostrando: agenda, lugar con Wallet, artista, avisos, evento. Textos legibles, SN visible arriba.
5. **Textos de App Store Connect:** descripción breve, textos de cambios (v1.0 – "Primera versión: Somos Nosotros en tu teléfono. Descarga la app, entra en eventos con Wallet, recibe avisos de lugares que sigues."), etiqueta de edad (4+), URL de privacidad y soporte.
6. **Aceptar términos en App Store Connect** (Developer Agreement, pago anual de USD 99 si no está pagado).
7. **TestFlight: probar la app en su iPhone** antes de cada envío a revisión. Flujo: instalar desde TestFlight → entrar → ver agenda → seguir un lugar → mirar Wallet → comprobar que APNs llegan si crea un evento de prueba.
8. **Enviar a revisión** en App Store Connect cuando el gestor diga (pieza OL-202).

