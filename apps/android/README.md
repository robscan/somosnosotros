# apps/android — envoltorio de Android (Trusted Web Activity)

OL-192, pieza 2 de [`docs/rediseno/47-app-ios.md`](../../docs/rediseno/47-app-ios.md). Esto **no es la web**: la web
sigue en la raíz del repo (Next.js). Aquí solo vive el envoltorio de Android: una Trusted Web Activity (TWA) que
abre `https://somosnosotros.org` en Chrome a pantalla completa, sin barra de direcciones. No hay una sola pantalla
escrita en Kotlin ni en Java: la sesión, los avisos push y las capacidades del navegador son los de Chrome.
(En iPhone el envoltorio es Capacitor; ver [`apps/ios/README.md`](../ios/README.md).)

## Qué hay

- `twa-manifest.json` — **la fuente**: paquete `org.somosnosotros.app`, host `somosnosotros.org`, nombre «Somos
  Nosotros», nombre bajo el icono `SMSNSTRS` (Bubblewrap limita a 12 caracteres), colores blancos (la web es de tema
  claro), iconos de producción (`icono-512.png` e `icono-maskable-512.png`), avisos activados, `appVersionCode` 1,
  `appVersion` «1.0», respaldo en pestaña personalizada (`customtabs`) y la ruta de la llave de subida.
- El resto (`app/`, `build.gradle`, `gradle/`, `gradlew`, `store_icon.png`, `manifest-checksum.txt`) lo genera
  Bubblewrap desde el manifiesto: no se edita a mano. `targetSdkVersion` 36 (Android 16), el que Google Play exige
  desde el 2026-08-31 a apps y actualizaciones nuevas. `minSdkVersion` **24** (Android 7.0): la protección automática de Play
  (Play Protect) exige 24 o más; con 21 (el valor por omisión de Bubblewrap) Play Console rechazó el `.aab` el
  2026-10-06.
- `.gitignore` — deja fuera `*.keystore`, `*.jks`, `*.aab`, `*.apk`, `build/`, `.gradle/`, `local.properties`.
  **El repo es público: ninguna llave ni binario entra.**
- La web sirve [`/.well-known/assetlinks.json`](../../src/app/.well-known/assetlinks.json/route.ts), el archivo que
  hace que Chrome confíe en la app (sin él, la app abre la web con la barra de Chrome).

## Herramientas (una vez, ya instaladas en la Mac del founder)

- JDK 17 (`brew install openjdk@17`) y SDK de Android en `/opt/homebrew/share/android-commandlinetools` con
  `platforms;android-36` y `build-tools;36.1.0` (la versión fija que pide Bubblewrap).
- `~/.bubblewrap/config.json`: `jdkPath` `/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk` (Bubblewrap le añade
  `/Contents/Home`) y `androidSdkPath` el del SDK. Además un enlace `bin → cmdline-tools/latest/bin` dentro del SDK
  (Bubblewrap busca `sdkmanager` en `<sdk>/bin`; el SDK de Homebrew lo trae en `cmdline-tools/latest/bin`).
- `@bubblewrap/cli` se usa con `npx`, sin instalación global.

## Cómo se regenera y se compila (desde `apps/android/`)

```
# Regenerar el proyecto tras cambiar twa-manifest.json (no pregunta nada)
npx @bubblewrap/cli update --skipVersionUpgrade --manifest=twa-manifest.json --directory=.

# Compilar y firmar: produce app-release-bundle.aab (el que se sube a Play) y app-release-signed.apk
BUBBLEWRAP_KEYSTORE_PASSWORD=… BUBBLEWRAP_KEY_PASSWORD=… npx @bubblewrap/cli build --manifest=twa-manifest.json --directory=.
```

Las dos contraseñas son la misma y están en `/Users/apple-1/somosnosotros-privado/android/LEEME.txt` (nunca en el
repo, ni en un chat, ni en una bitácora). Léelas a las variables de entorno en el mismo comando, sin imprimirlas.

**Para cada subida nueva a Play**, sube `appVersionCode` (y `appVersion` si cambia el nombre visible) editando
`twa-manifest.json` a mano (Play rechaza un código repetido) y vuelve a correr `update` y `build`.

Verificar la firma sin contraseñas:

```
keytool -printcert -jarfile app-release-bundle.aab        # la huella SHA256 debe ser la de la llave de subida
$ANDROID_SDK/build-tools/36.1.0/apksigner verify --print-certs app-release-signed.apk
```

## La llave

- **Llave de subida** (`subida.keystore`, alias `subida`): `/Users/apple-1/somosnosotros-privado/android/`, fuera del
  repo, con su contraseña y su huella en `LEEME.txt`. Con Play App Signing, Google re-firma con SU llave lo que
  llega a los teléfonos; la nuestra solo identifica nuestras subidas. Si se pierde, Play permite pedir un
  restablecimiento de la llave de subida (con tiempo de espera); no es el fin de la app, pero conviene respaldarla.
- Huella SHA-256 de la llave de subida (pública; está en `assetlinks.json`):
  `BC:BE:8F:FB:71:A6:B0:B9:0A:07:3A:F4:13:AB:45:64:1F:A4:A5:9E:9F:6F:51:6C:B0:3E:82:5E:D7:6E:40:50`.

## Huella de la llave de firma de Google (hecho el 2026-10-06)

Tras la primera subida, Play Console (Prueba y lanza → Configuración → Integridad de la app → Firma de apps) dio la
huella SHA-256 del certificado de la clave de firma de la app (la de Google, no la de subida):
`D6:F9:F9:04:10:B8:E0:A1:8E:F2:B9:08:83:22:83:89:72:88:4E:6E:3D:78:12:5C:19:DD:73:71:07:3B:2C:8F`.
Ya está en `HUELLA_FIRMA_GOOGLE` de `src/app/.well-known/assetlinks.json/route.ts`, **junto** a la de subida (nunca en
su lugar: la de subida cubre el APK instalado a mano con `adb`). Sin las dos, la app abre la web con la barra de
direcciones de Chrome. Para comprobarlo: `curl -s https://somosnosotros.org/.well-known/assetlinks.json` debe traer
las dos huellas, y la app instalada desde la pista de prueba debe abrirse sin barra de direcciones (si aparece, la web
aún no se publicó o la huella no coincide; Chrome cachea el archivo, reinstalar la app lo fuerza).

Enlace para unirse a la prueba interna (verificadores internos): https://play.google.com/apps/internaltest/4701524694821002071

## Regla de Google para cuentas personales

Una cuenta de desarrollador **personal** creada después de noviembre de 2023 solo puede pedir **producción** tras
una **prueba cerrada con al menos 12 personas inscritas durante 14 días seguidos** (doc 47 §10). Los
14 días cuentan con los 12 inscritos de forma continua, no desde la subida: conviene reunirlos cuanto antes.
