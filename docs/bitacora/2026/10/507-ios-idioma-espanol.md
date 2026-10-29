# 507 · La app del App Store declara español (versión 1.0.1, compilación 7)

**Pieza:** OL-475. **Rama:** `ios-idioma-espanol`, base `origin/main` (`a047afa9`). **Fecha:** 2026-10-29. **Operador:** Gestor de cambios VII (Fable 5.1).
**Manda:** el founder, el día que Apple aprobó la app: «en la aplicación de Somos Nosotros, dentro del App Store, viene señalado idioma en inglés. Y eso es mentira, estamos en español. Me gustaría ver si se puede corregir sin tirar la app».
**Estado:** cambio hecho y comprobado en una compilación de simulador; falta subir la compilación 7 a App Store Connect y enviar la 1.0.1 a revisión como actualización (la 1.0 sigue publicada mientras tanto).

## La causa

El idioma que el App Store muestra en la ficha sale de la compilación, no de los textos de la ficha. El proyecto de Capacitor (`apps/ios/ios/App`) traía `CFBundleDevelopmentRegion = en`, `developmentRegion = en` y `knownRegions = (en, Base)`: ninguna localización en español. Apple lo lista como «Inglés».

## El cambio (solo `apps/ios`, sin tocar la web)

- `Info.plist`: `CFBundleDevelopmentRegion` = `es` y `CFBundleLocalizations` = [`es`].
- `project.pbxproj`: `developmentRegion = es`, `knownRegions = (es, en, Base)`, `MARKETING_VERSION` 1.0 → 1.0.1 y `CURRENT_PROJECT_VERSION` 6 → 7 (Debug y Release).
- Los textos de permisos (`NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`) ya estaban en español.

## Comprobado

`npm ci` en `apps/ios`, `npx cap sync ios` y `xcodebuild -project App.xcodeproj -scheme App -sdk iphonesimulator build`: la compilación sale y su `Info.plist` final dice `CFBundleDevelopmentRegion = es`, `CFBundleLocalizations = [es]`, `CFBundleShortVersionString = 1.0.1`, `CFBundleVersion = 7`.

## Lo que sigue (gestor, con el visto bueno del founder)

1. Archivar y subir la compilación 7 desde esta Mac con el procedimiento de la bitácora 283 (archivo Release, `exportArchive` con `destination export` para revisar la firma y luego `upload`).
2. En App Store Connect, crear la versión 1.0.1, elegir la compilación 7, notas «Idioma de la app: español» y enviar a revisión. Al aprobarse, la ficha dirá «Español».
