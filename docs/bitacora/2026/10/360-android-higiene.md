# 360 · Higiene de Android

**OL-331 · android-higiene · 2026-10-07 · Codex.** Reserva del gestor en el buzón, base f72a76fd. Arreglo F11 del informe 356.

El README tenía dos rutas absolutas de la Mac fuera de la excepción de twa-manifest.json. Se sustituyen por la referencia al directorio privado de firma indicado en ese manifest. No se abre ni modifica ese directorio o su llave.

.gitignore añade p12, pfx, keystore.properties y signing.properties, en cualquier nivel bajo apps/android. Conserva las exclusiones previas y los archivos públicos de configuración.

Prueba: git check-ignore --no-index --stdin acepta siete casos de firma/binario (incluidos los tres ejemplos de F11) y no oculta README.md ni twa-manifest.json. Escaneo de los 44 archivos rastreados: queda una sola ruta /Users/, la excepción permitida del manifest, línea 20. Evidencia autorizada: .buzon/tmp-codex/android331-check.json. No se crean archivos de firma ni se leen secretos para esta prueba.

Cambio de documentación e ignores: comprobación de diff y de exclusiones; no altera código, UI ni binarios. No requiere repetir suites o build por el criterio proporcional de MEMORIA_GESTOR/GESTION_DE_CAMBIOS. Integración y publicación las coordina el gestor.
