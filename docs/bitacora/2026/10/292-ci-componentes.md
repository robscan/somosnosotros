# 292 · Suite completa de componentes en CI (OL-265 / H12)

**Fecha:** 2026-10-03. **Estado:** publicado y comprobado (PR314 / `ac6cb4c8`); CI PR y main correctas, 212 aprobadas + 2 en cuarentena Linux.

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


## Bloqueo vigente: la ejecución serial tampoco resuelve el caso de inercia

[CI37171465834](https://github.com/robscan/somosnosotros/actions/runs/37171465834)
sobre `99732513fad2eeca6266e49bb76e73b008955bc0`: 213/214, 0 omitidas/canceladas,
267,995 s (4 min 28 s). Ahora sí ejecuta un archivo por vez. El arrastre desde llena
espera asoma (250) pero acaba recogida (0), línea 367. La hipótesis de competencia
entre navegadores no basta; no reintentar ni publicar esperando verde por azar.
La serialización agrega tiempo sin solucionar el defecto observado: se propone
retirarla del candidato cuando el gestor resuelva el siguiente paso.

La instrucción del founder registrada en bit277 §4 exige terminar directo en la
altura correspondiente, sin inercia larga y un tirón posterior. La implementación
y su prueba añadieron «jalón rápido → siguiente altura». El CSS actual usa
scroll-snap-stop normal (por defecto). La [especificación W3C, §5.3 y §6](https://www.w3.org/TR/css-scroll-snap-1/#scroll-snap-stop)
permite pasar puntos con normal y deja al navegador buena parte de la elección.
Eso explica una posible diferencia de contrato, pero no prueba por sí solo que
la discrepancia de Linux sea del producto y no del envío CDP. No se cambia la
aserción a «cualquier altura válida» sin resolver esa distinción.

**Siguiente acción y responsable:** el gestor debe ampliar el diagnóstico al caso
de inercia del mismo harness o reservar una corrección de producto si se exige
exactamente una altura por gesto. PR314 permanece en borrador; sin merge ni
publicación. No se omite la prueba, no se añade continue-on-error ni reintento.
Los cambios de aplicación siguen siendo cero. Caso de clics e Imagen pasan en
las ejecuciones posteriores al control negativo. No se abre otra pieza sin reserva.

**Doble toque solicitado por el gestor:** diagnóstico CDP en Chromium táctil,
390×844, dos toques consecutivos sobre las mismas coordenadas: el asa recibe
ambos en y=660 y y=658 y vuelve a llena. Con 60/150/600 ms entre toques solo el
primero llega al asa, que ya se ha movido, y termina recogida. Es comportamiento
real de Chromium con entrada táctil simulada, aún sin comprobación física en
Safari. Se entrega como hallazgo separado de producto, sin corregirlo en H12.

Todos los logs quedan en la carpeta persistente: `ci-serial-real.log/json`,
`doble-toque.log`, además de los anteriores. Capturas/producto de OL264 conservan
su validez; esta pieza de CI sigue pendiente. Los diagnósticos locales cerraron
sus propios servidores y navegadores.


## Decisión posterior del gestor: cuarentena explícita de dos casos

El Gestor de cambios III ordena detener la investigación de física de gestos en
Linux, retirar la serialización y mantener dos excepciones declaradas en una
lista única: el caso de inercia y el de entrada/salida con clics del asa. Sustituye
para esos dos casos el requisito inicial de ejecutar toda la suite en CI; no es
una decisión unilateral del operador ni una afirmación de 214 pruebas aprobadas.
No se afirma que esté descartado todo posible defecto de producto por esta decisión.

`scripts/pruebas/cuarentena-componentes.json` contiene archivo, nombre exacto,
motivo y obligación de validación local de cada caso. Solo sus dos declaraciones
usan `pruebaConCuarentena`; exige entrada con motivo en esa lista y marca skip
únicamente cuando CI=true y plataforma Linux. El runner nativo informa el motivo.
En Mac y fuera de CI las aserciones completas siguen ejecutándose; ambas son
obligatorias al revisar cualquier pieza que toque la hoja. No se borran ni alteran
aserciones. El ajuste previo de esperar recogida entre clics queda conservado.

Objetivo del candidato: 214 casos inventariados, 212 correctos y 2 en cuarentena,
con tiempo y excepción declarados. El control negativo de Imagen sigue documentado
como evidencia de que otro fallo detiene el job. No se cambia producto ni se abre
otra pieza. El posible efecto del doble toque sigue separado para el founder.


Verificación local del candidato con la cuarentena instalada: `CI=true` en Mac,
Chromium fijado, los dos casos ejecutados y correctos (2/2, 0 skips, 43,10 s).
Confirma que la excepción no desactiva las obligaciones locales. ESLint focalizado
y diff correctos; package.json e Imagen idénticos a main. CI Linux pendiente.


## Última ampliación del gestor: navegación del harness de Entrar

CI37172311906 / `68c1f8ef`: la cuarentena se aplica exactamente a dos casos,
211 correctos, 1 fallo, 2 skips, 96,60 s. El nuevo fallo ocurre en Entrar, caso
«+ para publicar / proveedor de 2 páginas / Atrás gesto»: `page.evaluate` ejecuta
history.back y la navegación destruye su contexto antes de devolver el resultado.
No alcanza las aserciones de destino; no se presenta como fallo demostrado de Auth.

El gestor acepta solo `src/app/entrar/Entrar.componentes.test.mjs`: sustituir los
dos history.back invocados por evaluate por `page.goBack({waitUntil:
"domcontentloaded"})`. En el segundo punto también se elimina el catch vacío.
Se conservan las comprobaciones de sesión, ruta, regreso a about:blank y ausencia
de errores. Sin producto ni Auth, sin ampliar la cuarentena.

Esta es la última ampliación del harness en OL265: cualquier nuevo fallo debe
reportarse al gestor antes de modificar nada. Ventana cedida a Codex cuando los
49 casos de Entrar y la CI final (212 correctos + 2 cuarentena) pasen; después unir
y comprobar que la CI de main también ejecuta la suite.


Entrar focalizado tras el arreglo: 49/49, 0 fallos/omitidas/canceladas, 51,70 s
con Chromium fijado. ESLint del archivo y diff correctos. Log `entrar-final.log`
en la evidencia persistente; candidato siguiente para la CI final.


## Publicación y cierre (2026-10-03, hora de México)

Cumplidas las condiciones del gestor: 49/49 de Entrar locales y CI final
[37172826238](https://github.com/robscan/somosnosotros/actions/runs/37172826238)
**success antes del merge**, candidato `986276b42011d4a08f81b8fafa726edb82cc4fc3`.
214 componentes inventariados, 212 aprobados, 2 skips declarados, 0 fallos y
0 cancelaciones; 98,77 s. Lint/tipos, 1822 unitarias en 133 archivos, PostgreSQL,
build, inventario y 96 mediciones correctos. Un aviso previo de lint permanece.

[PR314](https://github.com/robscan/somosnosotros/pull/314) unido en
`ac6cb4c8c64ffdc19182dc0a9a809e8727a49796` a las 03:08:32 UTC del 4 de octubre.
Deployment Production6836212575 **success** sobre ese mismo SHA (03:09 UTC).
Dominio real: Inicio, Agenda y Entrar HTTP200; Apple, Google y correo presentes;
`/api/estado` informa Supabase ok y Mapbox configurado. Lecturas anónimas, sin
iniciar sesión ni escribir datos. Se reutiliza QA visual de OL264: producto intacto.

CI de main [37173199885](https://github.com/robscan/somosnosotros/actions/runs/37173199885)
**success**, sobre el merge exacto. El paso nuevo sí se ejecuta en push a main:
212 aprobados + 2 skips, 98,76 s, sin fallos ni cancelaciones. Medir también pasa.
No confundir las dos excepciones autorizadas con 214 aprobadas en Linux.

El commit temporal `c05b2df6` no es ancestro de main, comprobado. Package.json e
Imagen están idénticos a la base; producto y presupuestos sin diferencias. No se
requieren migraciones ni configuración remota. Checkout principal preservado;
worktree propio limpio tras el cierre, procesos de diagnóstico terminados.

Evidencia persistente adicional: `ci-986276b4.log/json`, `ci-main.log/json`,
`produccion.json`, `entrar-final.log` y `cuarentena-local.log`.
OL265/H12 cerrado con la política de cuarentena explícita del gestor. El gestor
concilia ASIGNACIONES y reserva la siguiente pieza de la auditoría antes de abrir
otra rama. Doble toque rápido del asa y Safari físico siguen como validación de
producto separada; no se declaran corregidos por esta entrega.
