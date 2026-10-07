# 227 · Envoltorio de Android (Trusted Web Activity) — OL-192

**2026-09-25.** Operador nuevo (Sonnet), rama `app-android-twa` desde `origin/main`. Pieza 2 del plan `docs/rediseno/47-app-ios.md`.

## Qué leí

- `docs/rediseno/47-app-ios.md` completo, en especial la sección 6 (TWA recomendada frente a Capacitor en Android) y la 9 (`assetlinks.json`).
- `docs/ops/OPEN_LOOPS.md` (línea OL-192) y `docs/ops/ASIGNACIONES.md` (fila de esta pieza): rama, alcance de archivos y el límite de no tocar `apps/ios/**`, `src/app/auth/**` ni el `package.json` de la raíz.
- `next.config.ts` y `src/proxy.ts`: ninguno de los dos bloquea ni redirige `/.well-known/assetlinks.json`; el proxy sí lo atraviesa (matcher no excluye `.json`) pero solo refresca cookies de sesión, no cambia la respuesta.
- `src/app/manifest.ts` y confirmado con `curl -sI https://somosnosotros.org/manifest.webmanifest`: URL real, 200, `Content-Type: application/manifest+json`, `theme_color`/`background_color` `#ffffff`, sin `orientation` explícita, iconos `icono-192.png`, `icono-512.png`, `icono-maskable-512.png`.
- `src/app/robots.ts`, `src/app/eventos/[id]/calendario/route.ts`, `src/app/api/estado/route.ts` y su prueba: estilo del repo para una `route.ts` que sirve un tipo de contenido propio con cabeceras explícitas, para seguirlo en `assetlinks.json/route.ts` (pendiente).

## Qué hice

1. Confirmé el encargo en `ASIGNACIONES.md` y creé la rama `app-android-twa` desde `origin/main`.
2. Instalé en la Mac (nada quedó en el repo):
   - `openjdk@17` (Homebrew, keg-only en `/opt/homebrew/opt/openjdk@17`).
   - Cask `android-commandlinetools` (Homebrew): trae `sdkmanager`, `avdmanager`, `apkanalyzer`, etc. en `/opt/homebrew/bin`; SDK root `/opt/homebrew/share/android-commandlinetools`.
   - Con `sdkmanager`: licencias aceptadas, `platform-tools`, `platforms;android-36` y `build-tools;36.0.0`. Verifiqué con una búsqueda que desde el 2026-08-31 Google Play exige apuntar a API 36 (Android 16) en apps y actualizaciones nuevas (con prórroga a noviembre para quien la pida); por eso 36 y no 35.
   - Archivo de config `~/.bubblewrap/config.json` apuntando `jdkPath`/`androidSdkPath` a lo de arriba, para que `npx @bubblewrap/cli` (sin instalación global, tal como pide el encargo) no intente bajar su propio JDK/SDK.
3. Generé la llave de firma de SUBIDA con `keytool` (JDK recién instalado), fuera del repo:
   - Ruta: `/Users/apple-1/somosnosotros-privado/android/subida.keystore` (permisos 600).
   - Alias `subida`, RSA 2048, validez 10000 días.
   - Contraseña generada al azar y huella SHA-256 anotadas en `/Users/apple-1/somosnosotros-privado/android/LEEME.txt` (permisos 600), con la nota de que al activar Play App Signing (OL-193) hay que AÑADIR la huella de la llave de Google sin quitar esta.
   - Ninguna de las dos cosas se imprimió en este documento ni se acercó al repo.
4. Investigué (leyendo el código fuente de `@bubblewrap/cli` en la caché de `npx`, sin ejecutarlo con efectos) cómo generar el proyecto sin quedar atado a los `prompts` interactivos de `bubblewrap init` (usan `inquirer` con `type: 'list'`, que no acepta bien respuestas por *pipe*): la vía limpia es escribir `twa-manifest.json` a mano y correr `bubblewrap update --skipVersionUpgrade`, que no pregunta nada. Decisiones ya tomadas para cuando se retome:
   - `packageId`: `org.somosnosotros.app` (fijo, no el que Bubblewrap deriva solo del dominio).
   - `launcherName` (el nombre bajo el ícono, límite duro de 12 caracteres en Bubblewrap): el `short_name` del manifiesto es "Somos Nosotros" (14 caracteres, no cabe). Propongo `SMSNSTRS`, la marca ya aprobada por el founder el 2026-09-15 (`docs/diseno/LINEA_GRAFICA.md`) y usada en cabeceras — no es una idea nueva, es el mismo lettering reducido a texto. Falta que el founder lo vea en el ícono antes de compilar.
   - `signingKey`: la ruta y el alias de arriba.
   - `enableNotifications`: ya es el valor por defecto de Bubblewrap (`true`); se deja explícito en el manifiesto por claridad.

## Detenida el 2026-09-25

El founder para la pieza: no tiene todavía un teléfono Android para probarla, y pide no instalar ni descargar nada más hasta entonces. Aviso del gestor de cambios recibido y atendido de inmediato: se paró antes de generar el proyecto Gradle, sin compilar nada.

**Queda hecho** (lo de la lista de arriba): rama creada, herramientas instaladas en la Mac, llave de subida generada y documentada fuera del repo, decisiones de nombre/paquete tomadas, investigación de cómo generar `apps/android/` sin quedar atrapado en prompts interactivos.

**Falta** (nada de esto se tocó):
- Generar `apps/android/` de verdad (`twa-manifest.json` + proyecto Gradle) — no llegué a correr `bubblewrap init` ni `update`.
- `src/app/.well-known/assetlinks.json/route.ts` y su prueba — solo miré el estilo de otras rutas, no escribí el archivo.
- Compilar `.aab`/`.apk`, probarlos en emulador y capturar pantalla — nada de esto ocurrió.
- `npm run lint && npm run typecheck && npm test && npm run build` de esta pieza — no aplica todavía, no hay código nuevo en el repo web.
- `.gitignore` de `apps/android/` (binarios, `build/`, `.gradle/`, `local.properties`, `*.keystore`).

**Qué se instaló en la Mac** (para que quien retome no lo repita ni lo borre sin saber):
- Homebrew: `openjdk@17` (17.0.20.1) y sus dependencias (`graphite2`, `harfbuzz`, `webp`, actualizó `libtiff`).
- Cask `android-commandlinetools` (SDK en `/opt/homebrew/share/android-commandlinetools`).
- Con `sdkmanager`: `platform-tools`, `platforms;android-36`, `build-tools;36.0.0`; licencias del SDK aceptadas.
- `~/.bubblewrap/config.json` (rutas al JDK y al SDK de arriba).
- `@bubblewrap/cli` 10.8.2 quedó en la caché de `npx` (no se instaló global, como pedía el encargo).
- No se creó ningún emulador (`avdmanager`) ni se descargó ninguna imagen de sistema.

**Nada de esto se comitea**: la llave vive solo en `/Users/apple-1/somosnosotros-privado/android/` (confirmado con `ls`, fuera de cualquier carpeta del repo); no hay `.aab`, `.apk` ni carpeta `apps/android/` con archivos (quedó vacía, git no la ve). El único cambio de repo de esta rama es esta bitácora.

## Qué sigue cuando el founder tenga el teléfono

1. Retomar desde "Falta" arriba: escribir `twa-manifest.json` a mano con los valores ya decididos, `bubblewrap update --skipVersionUpgrade` para generar el proyecto, revisar que `SMSNSTRS` se vea bien como nombre bajo el ícono.
2. `assetlinks.json/route.ts` con la huella ya generada (vive en el LEEME privado) y su prueba.
3. Compilar, probar en el propio teléfono del founder (o un emulador si conviene), capturar y seguir el resto del encargo original (evidencia, commit, PR).
