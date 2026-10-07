# 345 · Envoltorio de Android: proyecto, .aab firmado y assetlinks

**Pieza:** OL-192 (retomada). **Rama:** `android-aab` (sobre `origin/main`). **Fecha:** 2026-10-06. **Operador:** Claude Sonnet 5.5 (agente del gestor IV).
**Estado (2026-10-06, noche):** el `.aab` está en la prueba interna de Play y **disponible para verificadores internos** (https://play.google.com/apps/internaltest/4701524694821002071); assetlinks ya lleva las dos huellas. (Corregido el mismo día por el rechazo de Play: `minSdkVersion` 24.) `.aab` compilado y firmado con la llave de subida, firma verificada; ruta de assetlinks lista y probada con `next start`. No se probó la app en un emulador ni en un teléfono (no hay ninguno en la Mac). Sin migraciones ni variables de entorno nuevas.

## Qué se encargó

El founder (2026-10-06) quiere subir hoy a una pista de prueba de Google Play el `.aab` de Android (versionCode 1). La app ya está dada de alta en Play Console: «Somos Nosotros», paquete `org.somosnosotros.app`, Play App Signing aceptado (Google re-firma con su llave; la nuestra es solo la de subida). La pieza se había detenido el 2026-09-25 antes de generar el proyecto ([bitácora 227](../09/227-app-android-twa.md), copiada a esta rama para que la historia quede en `main`, porque la rama vieja `app-android-twa` no se une).

## Qué hay

- **`apps/android/twa-manifest.json`** escrito a mano (la fuente) y el proyecto Gradle que Bubblewrap 10.8.2 generó desde él con `update --skipVersionUpgrade` (no pregunta nada): `app/`, `build.gradle`, `gradle/`, `gradlew`, `store_icon.png`, `manifest-checksum.txt`. `targetSdkVersion` y `compileSdkVersion` 36, `minSdkVersion` 24 (ver «Corrección»).
- **`apps/android/.gitignore`**: `*.keystore`, `*.jks`, `*.aab`, `*.apk`, `*.idsig`, `build/`, `.gradle/`, `local.properties`, `app/build/`. Con `git status --ignored` se comprobó que el `.aab`, los `.apk`, `app/build/`, `build/` y `.gradle/` quedan ignorados y que ningún binario ni llave está añadido.
- **`src/app/.well-known/assetlinks.json/route.ts`** y su prueba: responde `application/json` (sin `charset`, como la de Apple) con la relación `delegate_permission/common.handle_all_urls` para `org.somosnosotros.app` y las dos huellas: la de la llave de subida y la de firma de Google (`HUELLA_FIRMA_GOOGLE`, añadida tras la primera subida).
- **`apps/android/README.md`**: qué es, herramientas, cómo se regenera y se compila (sin contraseñas), dónde vive la llave, qué hacer tras la primera subida y la regla de Google para cuentas personales.
- **Binarios fuera del repo**, con permisos 600, en `/Users/apple-1/somosnosotros-privado/android/salida/`:
  - `somosnosotros-1.0-vc1.aab`: 1 229 569 bytes, SHA-256 `33ac7472cc65ce73d63f5fcf062adcfe8bbf32fef701206d37102f17f6c7e74a` (versión con minSdk 24; la primera, de 1 304 759 bytes y minSdk 21, fue rechazada por Play).
  - `somosnosotros-1.0-vc1.apk`: 1 134 321 bytes (para instalar a mano con `adb`).
  - Los originales de Bubblewrap siguen en `apps/android/` (`app-release-bundle.aab`, `app-release-signed.apk`), ignorados por git; esa carpeta es de un árbol de trabajo que se puede limpiar, la de `somosnosotros-privado` no.

## Decisiones del operador

1. **Nombre bajo el icono: `SMSNSTRS`.** El `short_name` del manifiesto web («Somos Nosotros», 14 caracteres) no cabe en el límite de 12 de Bubblewrap; se usa la marca ya aprobada el 2026-09-15. **El founder debe confirmarlo** (se ve en el cajón de apps y en el inicio del teléfono; el nombre de la ficha en Play sigue siendo «Somos Nosotros»). Cambiarlo es editar `launcherName` y recompilar con `appVersionCode` 2.
2. **Barra de estado y de navegación blancas también en modo oscuro.** Los valores por omisión de Bubblewrap pintan la barra de navegación de negro y el modo oscuro de la barra de estado también; la app es de tema claro, así que `themeColorDark`, `navigationColor` y `navigationColorDark` van en `#ffffff` (los mismos de `src/app/manifest.ts`). Sin esto, la barra de abajo saldría negra bajo una web blanca.
3. **Dos huellas en assetlinks.** La llave de Google (la que Android ve en lo que baja de Play) aparece en Play Console tras la primera subida; el 2026-10-06 el coordinador pasó la huella `D6:F9:F9:04:10:B8:E0:A1:8E:F2:B9:08:83:22:83:89:72:88:4E:6E:3D:78:12:5C:19:DD:73:71:07:3B:2C:8F` y quedó en `HUELLA_FIRMA_GOOGLE`, junto a la de subida (que se queda: cubre el APK instalado a mano con `adb`). Mientras la web con este PR no esté en producción, la app instalada desde Play abre con la barra de direcciones de Chrome (respaldo `customtabs`); con el PR desplegado debe abrirse a pantalla completa.
4. **Avisos activados** (`enableNotifications`): la TWA delega los avisos push web de Chrome; añade el permiso `POST_NOTIFICATIONS` (visible en el APK con `aapt2 dump badging`, junto a un permiso propio de recepción interna). Hay que declararlo coherente en la ficha de Play (Data safety).
5. **Respaldo `customtabs`, no `webview`**: si Chrome no puede verificar el sitio, abre una pestaña de Chrome (Google bloquea el inicio de sesión dentro de un `webview` embebido, no en una pestaña de Chrome; doc 47 §3).
6. **Bubblewrap en esta Mac necesitó tres ajustes que no están en el repo**, anotados en el README para quien repita: (a) `build-tools;36.1.0` (Bubblewrap fija esa versión; el SDK solo traía la 36.0.0), instalado con `sdkmanager`; (b) un enlace `bin → cmdline-tools/latest/bin` dentro del SDK, porque Bubblewrap valida que exista `<sdk>/bin` o `<sdk>/tools` y el SDK de Homebrew deja `sdkmanager` en `cmdline-tools/latest/bin`; (c) `jdkPath` de `~/.bubblewrap/config.json` apuntando a `/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk`, porque Bubblewrap le añade `/Contents/Home` (con la ruta anterior, Gradle fallaba con «JAVA_HOME is set to an invalid directory»). Nada se instaló global.
7. **Contraseña**: leída a variables de entorno dentro de un script del scratchpad, nunca impresa. Se comprobó (con búsqueda literal) que no aparece en ningún archivo de `apps/android/` ni dentro del `.aab`, y el registro de la compilación se pasó por un reemplazo por si algún comando la repetía.
8. **Emulador: no hay y no se instaló.** `avdmanager` no encontró ninguno y el SDK no trae `emulator` ni imágenes de sistema (bajarlos son varios GB; la instrucción del founder del 2026-09-25 fue no descargar más sin un teléfono, y esta tarea solo pedía probar si ya había). Por eso no hay carpeta `docs/rediseno/capturas-345/` ni captura alguna.

## Corrección: Play rechazó el primer `.aab` (minSdk 21)

Al subirlo a prueba interna, Play Console lo rechazó: «La protección automática de Play requiere una versión mínima del SDK de 24 o una versión posterior. El paquete de aplicación subido tiene una versión mínima del SDK de 21.» El 21 venía del valor por omisión de Bubblewrap que dejé en `twa-manifest.json`. Se cambió `minSdkVersion` a **24** (Android 7.0), se regeneró con `update --skipVersionUpgrade` (`app/build.gradle` quedó en `minSdkVersion 24`, `versionCode` 1: el archivo rechazado no quedó en ninguna versión de Play) y se recompiló y firmó igual que antes. Los archivos viejos de `salida/` se sustituyeron (mismos nombres).

Verificado en el nuevo: `apkanalyzer manifest min-sdk` del APK da 24 y `target-sdk` 36; para el `.aab` se armó el módulo base como APK, se convirtió con `aapt2 convert` y `aapt2 dump xmltree` muestra `uses-sdk minSdkVersion=24 targetSdkVersion=36`. `keytool -printcert -jarfile` sobre el `.aab` da la huella de la llave de subida `BC:BE:…:40:50`; `jarsigner` «jar verified»; `apksigner verify` verifica el APK con v2 y v3. Ya no con v1: con minSdk 24 el APK no lleva firma v1, es lo esperado (v2 existe desde Android 7.0). El mismo script de la contraseña de antes: no aparece en `apps/android/` ni en el `.aab`.

## Verificación

Primera compilación (minSdk 21; la corrección de arriba repite lo que cambió con minSdk 24): `npx @bubblewrap/cli build` terminó con código 0 (APK y AAB). Firma, con herramientas del JDK y del SDK:

- `keytool -printcert -jarfile` sobre el `.aab`: propietario `CN=Somos Nosotros, OU=somosnosotros, O=somosnosotros, L=San Luis Potosi, ST=SLP, C=MX`, válido hasta 2054-02-10, SHA-256 `BC:BE:8F:FB:71:A6:B0:B9:0A:07:3A:F4:13:AB:45:64:1F:A4:A5:9E:9F:6F:51:6C:B0:3E:82:5E:D7:6E:40:50`, **idéntica** a la del `LEEME.txt` y a la que `keytool -list` da del keystore (y a la de `apksigner verify --print-certs` sobre el APK).
- `jarsigner -verify` sobre el `.aab`: «jar verified», `SHA256withRSA` de 2048 bits. Avisa que la cadena no es de una autoridad conocida, que es autofirmado y sin sello de tiempo: es lo normal en una llave de subida (Play la reconoce por huella, no por cadena).
- `apksigner verify` sobre el APK: verificado con esquemas v1, v2 y v3. Avisa de entradas `META-INF/*.version` sin proteger: son metadatos de las bibliotecas de AndroidX, sin efecto en la instalación.
- `aapt2 dump badging` sobre el APK: paquete `org.somosnosotros.app`, `versionCode` 1, `versionName` «1.0», `targetSdkVersion` 36, etiqueta «Somos Nosotros», actividad de arranque con etiqueta `SMSNSTRS`.
- El `.aab` trae `BundleConfig.pb`, `base/manifest/AndroidManifest.xml`, `base/dex/classes.dex` y `base/resources.pb`.

Web: `npx vitest run src/app/.well-known` (assetlinks 4 pruebas: tipo exacto sin redirección; paquete y relación; huella con el formato SHA-256 sin repetirse; el paquete coincide con `twa-manifest.json`; más las 3 de Apple, que no cambian). `next build` verde y, con `next start -p 3103`:

```
curl -si http://localhost:3103/.well-known/assetlinks.json
HTTP/1.1 200 OK … content-type: application/json … cache-control: public, max-age=3600
[{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"org.somosnosotros.app","sha256_cert_fingerprints":["BC:BE:8F:…:40:50"]}}]
```

Completo: `npm run lint` (0 errores; 1 aviso previo en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (152 archivos, 2 258 pruebas), `npm run inventario` («sin novedades») y `npm run medir` («26 pantallas × 4 anchos, sin novedades») en verde.

No verificado: que la app se vea y se abra bien en Android, que el nombre `SMSNSTRS` luzca bien bajo el icono, y que Chrome la verifique a pantalla completa (necesita la web con este PR en producción; la huella de Google ya está).

## Qué sigue (founder / Play Console)

1. ~~Subir el `.aab` a una pista de prueba~~: hecho (prueba interna, enlace para unirse: https://play.google.com/apps/internaltest/4701524694821002071).
2. **Unir este PR y desplegar**, para que `https://somosnosotros.org/.well-known/assetlinks.json` exista con las dos huellas; hasta entonces la app abre con barra de Chrome.
3. ~~Huella de la llave de firma de Google~~: hecha, ya en la ruta junto a la de subida. Tras desplegar, comprobar con `curl` que salen las dos.
4. **Confirmar `SMSNSTRS`** como nombre bajo el icono.
5. **Prueba cerrada de 12 personas durante 14 días seguidos** (cuenta personal: regla de Google, doc 47 §10) antes de pedir producción. Reunirlas cuanto antes.
6. En la ficha de Play: Data safety, clasificación de contenido, política de privacidad y borrado de cuenta por enlace web (OL-198), y revisar que `POST_NOTIFICATIONS` sea coherente con lo declarado.
7. Probar en el celular Android de pruebas que le llega al founder (memoria «Android pendiente»): arranque a pantalla completa, aviso push, entrar con Google (abre pestaña de Chrome), canon del teclado y alta por pasos. Esa prueba sí produce las capturas que esta pieza no pudo.
