# 292 · Suite completa de componentes en CI (OL-265 / H12)

**Fecha:** 2026-10-03. **Estado:** preparada; validación de CI y control negativo pendientes.

Reserva del Gestor de cambios III publicada en PR313 / `cc7bfb33`: rama
`ci-componentes`, base `cc7bfb33ef3ca9ffafdcf2a84382c0bd3b5eed2d`, después del cierre
PR312 / `fb9218cd` de OL-264. Worktree
`/Users/apple-1/somosnosotros-ci-componentes`; checkout principal intacto.
Bitácora 292 y OL-265 comprobados libres; sin subagentes.

## Problema y cambio

La CI ejecutaba unitarias, PostgreSQL, build, inventario y medir, pero omitía
`npm run test:componentes`. Por eso no detectó el montaje roto de dos consumidores
de Next/Image, reparado en OL-264. Se añade la suite completa al mismo job
`verificar`, después de instalar Chromium y antes de medir. Se aplica tanto a
pull requests como a pushes de main por los disparadores existentes.

Se reutiliza Chromium headless de `playwright-core`, fijado por package-lock y
sus revisiones de navegador; sin nueva dependencia ni otro descargador. La suite
selecciona playwright-core mediante el script existente y en Linux usa su
navegador instalado. No se establece una ruta de la Mac en CI.

El paso conserva el código de salida de `npm run test:componentes`; sin
`continue-on-error`, reintentos, filtros ni pruebas omitidas. Límite de 10 minutos
para evitar esperas indefinidas; la ejecución completa local previa tardó 110 s.
Ninguna modificación de producto, SQL, secretos, presupuestos ni pruebas finales.

## Verificación prevista y evidencia reutilizada

OL-264 ya comprobó el mismo código de producto: 1822 unitarias, 214 componentes,
build, tipos, lint, inventario y 96 mediciones. No se repite localmente por este
cambio de workflow. La CI de esta pieza verificará la integración real en Linux.

Se hará un control negativo temporal en esta misma rama: alterar solo el ancho
del fixture de Imagen (56 a 57 px), manteniendo las aserciones que exigen 56 px.
El fallo debe propagarse al paso de componentes y al job. Ese commit temporal
no se integrará; después se retirará con push protegido por el SHA remoto esperado.
El candidato final debe tener únicamente este workflow y la documentación propia.
Se registrarán SHA, ejecución, conteos y duración de ambos resultados.

Siguiente: control negativo, candidato limpio verde, entrega consolidada al gestor,
revisión y publicación según la autorización vigente. No requiere una pantalla
nueva ni repetir capturas del producto; Safari físico previo sigue pendiente.
