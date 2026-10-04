# 292 · Suite completa de componentes en CI (OL-265 / H12)

**Fecha:** 2026-10-03. **Estado:** control negativo comprobado; candidato sin fallo provocado preparado para CI y revisión.

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
Ninguna modificación de producto, SQL, secretos ni presupuestos. La ampliación
posterior del gestor permite sincronizar un caso de prueba, como se detalla abajo.

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


## Control negativo y ampliación puntual del gestor

[CI 37170081642](https://github.com/robscan/somosnosotros/actions/runs/37170081642),
commit temporal `c05b2df6a0f4e2870ab69d9ba7242a9add4644e3`, PR314 en borrador:
214 pruebas, 210 correctas, 4 fallos, 0 omitidas/canceladas, 101,37 s. Tres fallos
son exactamente los provocados en Imagen a DPR 1/2/3 (`57 !== 56`); paso y job
terminan failure, exit 1, y medir no se ejecuta. El control demuestra propagación
real del fallo; ese commit se retira antes de integrar y no modifica el candidato.

El cuarto fallo, anterior e independiente, es HojaLugares: el caso de animación
hace dos clics consecutivos sin esperar al desplazamiento del primero; en Linux
ambos pueden partir de llena y terminar recogida cuando esperaba asoma. El gestor
autoriza expresamente sumar solo `HojaLugares.componentes.test.mjs`, tras comprobar
que PR294/295 no lo tocan. Se espera recogida y scrollTop <= 1 entre los dos clics
en los dos ciclos del caso. No se cambia producto, ninguna aserción ni presupuesto,
y no se añade un reintento. Caso focalizado local correcto (1/1, 10,34 s).

**Hallazgo de producto separado, pendiente de validación física:** sí hay riesgo
de que dos activaciones muy rápidas no avancen dos alturas. `siguiente()` calcula
la siguiente altura desde scrollTop presente, sin encolar el destino pedido.
Diagnóstico en Chromium con viewport táctil 390×844: dos activaciones DOM en el
mismo cuadro observaron ambas y=660/llena y terminaron y=0/recogida. Esto demuestra
el mecanismo con activaciones programáticas; no equivale a dos toques físicos en
Safari. En un teléfono la posición del asa también cambia mientras se desplaza,
por lo que el destino del segundo toque puede variar. Comunicar al founder para
probar doble toque rápido y decidir el comportamiento deseado; no corregirlo en
H12 ni presentar la sincronización de la prueba como arreglo del producto.

El fixture de Imagen vuelve exactamente a main; diff final: workflow, esta
sincronización y documentación propia. Evidencia persistente:
`/Users/apple-1/.codex/visualizations/2026/10/02/01a0fece-65fd-79e3-a64d-296a4b8fa13c/ci-componentes/`.
Se conserva el SHA/diff temporal, log completo y JSON de la CI roja, diagnóstico
y log focalizado. Próxima comprobación: candidato final completo en Linux.


## Segunda ejecución y aislamiento del navegador en Linux

[CI 37170629062](https://github.com/robscan/somosnosotros/actions/runs/37170629062)
en `6e5c81c0`: 213/214, 106,57 s. Imagen y el caso de clics corregido pasan; falla
el arrastre desde recogida que esperaba y=250 y acaba y=660 (HojaLugares, caso de
inercia). No se presenta como verde ni se reintenta el mismo candidato.

Diagnóstico focalizado con Chromium headless 153.0.8010.12, revisión 1243 de
playwright-core 1.63.0 (la fijada en CI): las nueve fases del gesto pasan en Mac,
38,06 s. Esto no prueba Linux ni Safari. El harness envía eventos CDP a intervalos
cortos y la ejecución simultánea de archivos abre varios navegadores; la presión
sobre el runner puede cambiar su entrega al compositor. Hipótesis operativa,
sin afirmar una causa de producto demostrada.

Se ajusta exclusivamente el paso de CI a
`npm run test:componentes -- --test-concurrency=1`: un archivo/navegador a la vez,
conservando todos los casos, las aserciones y el límite de 10 minutos. Configuración
del runner dentro de la reserva; no cambia el comando local por defecto ni añade
reintentos. Se validará una ejecución completa de este candidato en Linux y se
registrará el tiempo real. El log del fallo adicional también queda preservado.


### Corrección de la posición del argumento del runner

CI37171095565 / `6df9c1d8` terminó 213/214, 115,51 s, con otro destino inesperado
del mismo caso de inercia. Esa ejecución **no fue serial**: Node 22 ignora la
opción de concurrencia añadida después del patrón de archivos mediante npm.
La comprobación inicial de exit 0 fue insuficiente; error del operador corregido.

Control cronometrado con dos archivos de 500 ms: argumento después del patrón,
inicios simultáneos y total 605 ms; argumento antes, inicios separados y total
1189 ms. Se coloca `--test-concurrency=1` antes del patrón dentro del script
existente de package.json. El workflow vuelve a invocar solo npm run; no se añade
ningún script ni dependencia. El comando local completo también queda serial,
con el costo de tiempo que se medirá. Ninguna aserción o caso se elimina.

La hipótesis sobre competencia de navegadores sigue sin validarse en Linux; no
se declara corregido ese segundo fallo hasta comprobar el nuevo candidato.
