# 297 · OL-270 · Hoja de ciudades

Fecha: 2026-10-04. Operador: Codex, chat `01a1082a-33fb-7302-b694-1889ceaaf549`.
Estado actual: **persistencia de ciudad implementada, parte A autorizada por el founder**.
Base conciliada con PR339 (`f653e639`) mediante `resolver_ol.py`. Candidato para
revisión final del gestor y CI en PR333; publicará A antes de OL-274 B sin volver
a pedir firma. Sin cambio de diseño ni migración en esta pieza.
El historial y las aprobaciones anteriores quedan abajo.

## Encargo y acuerdos comprobados

El founder pidió comunicarse con **Gestor de cambios III**, confirmar primero
que se entendía la tarea, pedir la asignación OL-270 y trabajar con componentes
canonizados, con confirmaciones y revisión del gestor. Se confirmó en este chat
antes de actuar y se leyó el protocolo del repositorio.

Canal del gestor: conversación de Claude `local_004a210b-4803-4298-bd64-2666df33576c`,
título «Gestor de cambios III». La comunicación se hizo en la app Claude con
Computer Use, por autorización expresa del founder. El gestor reservó:

- Rama `hoja-ciudades`, base `origin/ubicacion-al-dia`, SHA
  `f704c8b210992a95ffd1c5be6473e4de372f148b` (PR #294, en pausa).
- OL-270 / bitácora 297; worktree propio `.claude/worktrees/hoja-ciudades`.
- Prototipo firmado `docs/rediseno/prototipos/donde-estas.html`, cinco estados,
  aprobado por el founder en el artifact el 2026-10-04 a las 18:21.
- Archivos propios y límites registrados en `docs/ops/ASIGNACIONES.md`.

Main con la reserva (#330, `0375c774`) se concilió en `2c23836b`; único conflicto
en OPEN_LOOPS, resuelto con `resolver_ol.py`: faltantes de main 0, de rama 0,
marcas 0. Registro posterior #331 (`61444c86`, solo reserva OL-271) conciliado en
`adfa884f`. Se preservó la reserva ajena. Main de la carpeta principal quedó
limpio. El gestor corrigió expresamente la futura base del PR a **main**: hasta
integrar #294 incluirá también sus commits; declarar esa dependencia.

Confirmaciones adicionales del gestor, antes de programar:

- Filtrar el catálogo recibido por eventos/lugares/artistas; conservar siempre
  la ciudad actual de la URL aunque su cuenta sea cero. No cambiar RPC/consultas.
- Buscar usa título «Ciudades» y nota «Solo salen ciudades donde ya hay lugares
  o eventos publicados.», mismo catálogo recibido, independientemente de `desde`;
  ubicación sí, botón de alta no.
- Artistas no tiene centros propios: lista/buscador sin distancias, «Estás aquí»,
  lectura/consulta de ubicación ni alta.
- Usar `Hoja` con `plano` y `hoja.nota`, `Boton`, `CampoBuscar` y filas canónicas;
  permitir solo CSS del cuerpo con tokens existentes. No modificar `ui/*`.
- Consulta observadora `permisoConcedido()` permitida; ocultar el botón mientras
  no resuelva y si ya está concedido. El toque usa `leerUbicacionCercana()` y
  `avisarUbicacion()`, conserva la hoja; negativa recordada en sessionStorage con
  try/catch durante la pestaña. Otros errores permiten reintentar con nota breve.
- Solo primera entrada sin `?ciudad` ni marca `sn:ciudad-elegida` puede elegir la
  más cercana, hasta 50 km. Tap y elección automática guardan la marca local.
- **Sin geocodificación inversa Mapbox**, pendiente decisión del founder. Fallback
  autorizado: «Agregar un evento donde estás» / «Agregar un lugar donde estás»,
  enlaces `/nuevo?tipo=evento` / `/nuevo?tipo=lugar`, sin coordenadas en URL.
- El alta existente ya recibe el punto fresco del cliente: no fue necesario
  modificar `src/app/nuevo/page.tsx` ni `Alta.tsx`; el gestor lo confirmó.

## Implementación local

`Ciudad.tsx` abre directamente la lista de la sección. Tap elige y cierra por
`router.replace`, mantiene la palomita en la ciudad vista y devuelve el foco.
El botón de ubicación es secundario, píldora, separado de la tarjeta. Con punto
fresco se ordena por distancia; la cercana hasta 50 km muestra «Estás aquí» con
`--ok`, peso 600. A más de 50 km se ofrece el alta canónica del tipo autorizado.

Más de ocho ciudades activa `CampoBuscar`; búsqueda sin acentos/mayúsculas,
vacío «Nada con «texto».». El foco amplía el cuerpo y deja la tarjeta desplazable
entre campo y límite visual que proporciona `Hoja`. No hay «Otra ciudad» ni
chevrons. Los cuatro usos de ChipCiudad solo añaden la prop `seccion`.

Helpers puros en `lib/ciudad.ts`: filtrado del catálogo, filas ordenadas, primera
selección, alta lejana y oferta del botón. El código mantiene por ahora el
contrato recibido de centros; el hallazgo siguiente impide declararlo correcto
para ciudades sin lugares.

## Pruebas y evidencia del avance inicial `4dded093`

Pruebas sobre el mismo código; la conciliación #331 solo añadió documentación.
Servicios, permisos, coordenadas y cuentas de los recorridos son **simulados**.
No se copiaron `.env` reales ni se escribió en producción.

| Verificación | Resultado |
|---|---|
| `vitest run src/lib/ciudad.test.ts` | 14/14; seis casos nuevos de comportamiento |
| `npm test` | 137 archivos, 1895/1895, 6,54 s |
| `npm run typecheck` | Correcto |
| `npm run lint` final | 0 errores; warning previo `VisorImagen.componentes.test.mjs:171` |
| `Ciudad.componentes.test.mjs` | 8/8, 6,55 s; React StrictMode y módulos reales contra navegador simulado |
| `npm run inventario` | Sin nuevos colores/medidas/z-index/duplicaciones; 104 CSS, 1211 reglas |
| `npm run medir` | Build local contra respaldo, 17 s; 24 pantallas × 4 anchos, 96 mediciones, 84 s, sin novedades |
| Capturas específicas de app compilada | 5 estados × 390/320 × 844; WebKit adicional; 0 errores de página/desbordamientos laterales |
| Prueba anterior de FilaEventos | **Falla esperada sin adaptar**: busca el diálogo «Dónde estás» y «Otra ciudad» retirados |
| `git diff --check` | Correcto |

Componentes cubren: selección/cierre/foco, permiso concedido y relectura compartida
de caché caducada, permiso pendiente sin parpadeo del botón, primera entrada frente
a URL/marca, almacenamiento bloqueado, lectura tras toque pendiente y concedida,
negativa por pestaña, error reintentable, Artistas con 13 ciudades sin consulta
de ubicación, búsqueda/estado vacío y ofertas de alta por sección sin datos en URL.

Comando focalizado de componentes:

```sh
PLAYWRIGHT_MODULE="$PWD/node_modules/playwright-core/index.mjs" \
CHROME_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
node --test src/components/Ciudad.componentes.test.mjs
```

Capturas y mediciones en `docs/rediseno/capturas-297/`. App compilada por `medir`,
servida por `next start` con respaldo Supabase local y reloj fijo
`2026-10-07T16:00:00Z`, sincronizado en servidor/navegador. Tipografía real
Bricolage Grotesque cargada. Se corrigió solo la preparación de capturas que
vencía el punto simulado por una diferencia de relojes; no fue cambio de producto.
Logs temporales de sesión: `/tmp/sn-ol270/`.

### Revisión visual inicial (PNG en el commit `4dded093`, antes de la corrección)

| Estado | Observación a 390 y 320 px |
|---|---|
| 1: sin punto | Título, nota, píldora y tres filas visibles, palomita SLP, sin buscador para tres ciudades. Nota ocupa dos líneas a 320; sin recorte. |
| 2: tras toque pendiente | Misma hoja abierta; botón atenuado/deshabilitado. **No hay aviso nativo de iOS en esta captura**. |
| 3: punto SLP, URL SMA | SLP primero, icono ubicación y «Estás aquí» verde; palomita en SMA. Meta SLP envuelve a 320 sin recorte. **Aguascalientes muestra 0 km falso por el centro de respaldo: hallazgo pendiente**. |
| 4: búsqueda con 13 ciudades | «gua» muestra Aguascalientes/Guadalajara, campo arriba y ambas filas debajo; hoja desde y=48 hasta y=508. Área visual reducida simulada; sin dibujo de teclado ni teclado nativo. |
| 5: punto lejano | Tres filas con distancias, ninguna «Estás aquí», botón primario «Agregar un evento donde estás» completo, separado bajo la lista. Distancia Aguascalientes hereda el mismo defecto del estado 3. |

WebKit 26.6 (build 2359), viewport 390×844 con `visualViewport.height=508`
simulado: campo y resultado dentro del área disponible, sin errores. Esto prueba
la adaptación de layout; **no sustituye teclado/permiso nativos ni Safari en el
iPhone físico del founder**. Las imágenes 2 y 4 no reproducen las capas nativas
del prototipo firmado; deben validarse en ese dispositivo antes del cierre físico.

## Pendientes del avance inicial (resueltos en la continuidad siguiente)

1. **Respuesta del gestor a ampliación mínima de prueba.** Se envió en Claude
   (mensaje 73) la solicitud para reemplazar únicamente el caso obsoleto de
   `FilaEventos.componentes.test.mjs:334` por lista directa/selección/cierre, sin
   tocar los demás casos ni tolerancias. No se ha leído respuesta porque la Mac
   quedó bloqueada. Archivo aún sin modificar. Reproducción focalizada:
   `--test-name-pattern='Dónde estás'`, 0/1, timeout buscando «Otra ciudad».
2. **Criterio para ciudades con eventos y cero lugares.** Hallazgo comprobado en
   `src/lib/ciudades.ts:46` y también `armarCiudades`: `!a.lugares` asigna centro
   SLP. El fixture representa Aguascalientes con 0 lugares/1 evento; la captura
   3 demuestra 0 km falso. Puede afectar distancias, primera selección y decisión
   «lejos de todas». Falta informar al gestor y que confirme el tratamiento sin
   inventar coordenadas ni ampliar consultas/SQL. Propuesta para su evaluación:
   tratar centros de respaldo como desconocidos, sin distancia ni selección de
   esa ciudad; él decide también cómo afecta la oferta de alta. No implementado.
3. **Canal bloqueado.** Computer Use devuelve «The Mac is locked and automatic
   unlock could not unlock it». Se pidió al founder desbloquear mediante pregunta
   asíncrona. No se intentó eludir el bloqueo. Reanudar en la misma conversación
   Claude, leer la respuesta pendiente, comunicar el hallazgo 2 y pedir criterio.
4. Tras resolver: pruebas focalizadas afectadas, actualizar evidencia de estados
   3/5, revisión consolidada del gestor con SHA/alcance/capturas; abrir PR contra
   main cuando corresponda y completar CI. **Este avance no es entrega final**.
   #294 va antes; producción requiere el «publica» expreso del founder.

En ese avance no cambiaron `ui/*`, consultas, SQL, permisos, backend, `apps/ios`, ni librerías de
ubicación aparte de la dependencia #294 ya asignada. Sin migraciones ni nuevas
variables de entorno de producción. Dependencias locales instaladas con el lock
existente; no se cambió `package.json`/lock.

## Continuidad después de desbloquear la Mac

El founder confirmó «listo» y se retomó el mismo canal. Gestor III, mensajes
74/80/84/86, resolvió todos los pendientes de alcance antes de aplicar cambios:

- Sustituir únicamente el caso anterior de `FilaEventos.componentes.test.mjs`.
  Instrumentar `push/replace` en su doble solo cuando el caso nuevo activa las
  listas de registro; otros casos mantienen el mismo comportamiento. 11/11.
- Actualizar solo los comentarios de `ui/Renglon.module.css` y `ui/Buscador.tsx`:
  «hoja de ciudades». **No cambió ninguna regla CSS ni comportamiento en ui/**.
- Añadir `centroConocido: boolean` obligatorio a `CiudadConDatos`, en
  `armarCiudades` y `cargarCiudades` (`lib/ciudades.ts` asignado expresamente):
  true para SLP o ciudades con lugares > 0, false para las demás. Centro de
  respaldo, RPC, consulta y zona conservados.
- Centros desconocidos: sin distancia/«Estás aquí»/selección automática; con
  punto, después de los conocidos en el orden de catálogo recibido (conteo y
  nombre). Selección explícita y excepción de ciudad actual conservadas.
- Alta lejana se calcula sobre centros conocidos del catálogo ya filtrado.
  El gestor rechazó ocultarla por existir una ciudad de centro desconocido.
- Defensa explícita: SLP se considera conocida aunque un doble antiguo omita
  la marca; cualquier otra ciudad requiere la marca true. Unitaria específica.
- Typecheck detectó solo el arreglo propio de `ciudad.test.ts`; se informó antes
  de completarlo. Inspección de `.mjs` y scripts encontró cinco objetos en cuatro
  archivos. El gestor autorizó **solo añadir la marca**, sin cambiar casos,
  expectativas ni tolerancias: `FilaEventos.componentes.test.mjs` (SLP/Qro),
  `FilaLugares.componentes.test.mjs`, `BuscarPantalla.componentes.test.mjs` y
  `AgendaNuevos.componentes.test.mjs` (SLP). Scripts entra por el cargador real:
  no requiere cambios. Dobles propios de Ciudad incluyen Aguascalientes false.

Regresión del defecto de centros: antes de corregir, tres pruebas nuevas fallan
y las 14 anteriores pasan; después pasan las 18 de ciudad. Prueba nueva de
componente mantiene palomita en Aguascalientes sin 0 km/«Estás aquí» ni replace,
conocidos primero. No se amplió SQL ni el diseño.

### Evidencia del candidato actual

| Verificación | Resultado |
|---|---|
| `npm test` | 137 archivos, 1899/1899, 15,87 s (18 de ciudad) |
| `npm run typecheck` | Correcto, contrato obligatorio comprobado |
| `npm run lint` | 0 errores; único warning previo en VisorImagen:171 |
| Componentes afectados | 37/37, 21,48 s: Ciudad9, FilaEventos11, FilaLugares3, Buscar5, AgendaNuevos9 |
| `npm run medir` tras añadir la marca | Build10 s, 96 mediciones/77 s, sin novedades |
| Build final tras defensa de SLP/fixtures | `next build` contra respaldo sintético, correcto; captura sobre ese binario |
| Capturas finales específicas | 11 PNG observados completos; 0 errores de página/desbordamientos laterales |
| CSS | Reutilizado inventario aprobado: cuerpo sin cambios; ui solo dos comentarios |
| `git diff --check` | Correcto |

No se repitieron las 96 mediciones tras añadir únicamente la defensa de SLP y
marcas a dobles: mismo layout. Sí se ejecutaron unitarias/componentes afectados,
tipos/lint y un build final para capturar el código exacto entregado.

Los PNG actuales y `mediciones.json` sustituyen los del avance inicial; el antes
sigue accesible en `4dded093`. Estados 1/2: lista/píldora y palomita completas,
nota envuelta a 320. Estado 3: SLP «Estás aquí», SMA a 139 km con palomita,
Aguascalientes al final con «1 evento» **sin distancia falsa**, a 390 y 320.
Estado 5: SLP178/SMA279 km, Aguascalientes al final sin km y acción primaria
completa. Estado 4 y WebKit: campo y dos resultados dentro de y48–508, misma
limitación declarada de área visual/permiso/teclado simulados, sin capas nativas.

### Límites vigentes y salida

- El gestor comprobó que los eventos sin lugar sí tienen coordenadas propias,
  pero `ciudades_agregadas` no las promedia. Abrirá una pieza SQL aparte al cerrar
  OL-270. No inventamos coordenadas en esta pieza.
- Una persona en una ciudad de centro desconocido puede ver «Agregar un evento
  donde estás» aunque la ciudad aparezca en el catálogo. **Limitación conocida
  aceptada por el gestor**: el alta es válida; «lejos» solo mide centros conocidos.
- Se mantiene fallback sin Mapbox inverso ni nombre de ciudad prellenado nuevo;
  el alta usa el punto fresco existente del cliente, sin cambios a `/nuevo`.
- Permiso/teclado/Safari físicos siguen pendientes del founder; simulación
  declarada. Sin migraciones, nuevos secretos/variables de producción ni datos
  reales escritos. Ningún cambio de componentes canónicos fuera de comentarios.
- Entrega congelada local al gestor con SHA, diff y estos PNG para revisión
  completa. Responsable siguiente: Gestor III, devolver hallazgos o aceptar y
  coordinar PR/CI/preview. #294 antes y «publica» expreso del founder para producción.

## Revisión consolidada del gestor y corrección de orden

Mensaje 88: Gestor III revisó **todo el diff, canon y capturas** de `194cda39`.
Aprobó alcance, comentarios ui, cargador sin cambio de RPC, fallback/alta sin
coordenadas en URL, componentes canónicos, filtro de sección, radio50, primera
selección, permisos/negativa, separación de Artistas y capturas3/búsqueda.
Devolvió un único hallazgo: sin punto, el orden todavía medía cercanía desde
centros de respaldo y Aguascalientes aparecía antes de SMA.

Corrección asignada solo en `ciudad.ts`: sin punto, actual primero aunque tenga
centro desconocido; luego conocidas por cercanía a la actual; al final las
desconocidas en orden estable del catálogo. Con punto se conserva el orden ya
aprobado. Regresión: un caso nuevo falla antes (18 pasan), después ciudad19/19 y
cargador5/5. Suite1900/1900 (6,35 s), tipos correctos, componentes Ciudad+Fila20/20
(15,98 s); resto de la evidencia37/37 se reutiliza. Lint sin nuevos errores.
Build final correcto contra respaldo; estados1/2 renovados a390/320 y vistos
completos: SLP con palomita, SMA segunda, Aguascalientes al final, mismos controles,
nota y espaciado; botón atenuado tras toque pendiente. Sin cambio de diseño/CSS.

El gestor autorizó expresamente **push de `hoja-ciudades` y PR en borrador contra
main**, declarando #294 `f704c8b2` incluido hasta integrarlo, para CI y Vercel.
Debe recibir SHA y URL de preview para probar él el **teclado real en Safari del
simulador de iOS**, en especial `.buscando { height:100dvh }`; el founder lo prueba
en su iPhone. No quitar borrador, no unir; #294 primero y «publica» expreso.


## PR borrador y revisión real de Safari de `3887bf76`

PR [#333](https://github.com/robscan/somosnosotros/pull/333), base main, head
`hoja-ciudades`, **draft**, creado con la autorización del mensaje88 y adjuntado
al chat Codex. CI37230599197 del `3887bf76` **success**. Preview GitHub6846011086
success para ese SHA; la protección de Vercel requiere login en el simulador, y
se conservó. La revisión del mensaje92 se hizo con la misma app compilada contra
el respaldo local y 13 ciudades de Artistas, sin modificar datos de producción.

Gestor III aceptó el orden, probó Safari iOS26.3 / iPhone15Pro de simulador con
**teclado de pantalla real** y devolvió dos hallazgos bloqueantes: franja de página
sin hoja/velo bajo los resultados, y primer toque que solo quitaba el foco.
Evidencia en su rama: `capturas-297-revision/teclado-safari-ios-gua.png` y
`tras-tocar-resultado.png`. Ambos PNG se observaron completos.

Se consultó alcance antes de tocar `ui/Hoja`: ya tenía el observador de
visualViewport, por lo que añadir otro en Ciudad no resolvería la geometría.
Mensaje96 del gestor: medición con proxy local de diagnóstico en Safari:

| Estado | innerHeight | scrollY | vv.height / offsetTop | Velo / dialog |
|---|---:|---:|---|---|
| Sin teclado | 695 | 0 | 695 / 0 | 0–695 / 48–695 |
| Con teclado | 695 | 0 | 358 / 0 | 0–358 / 48–358 |

La barra de dirección flotante de Safari iOS26 ocupa unos43pt excluidos del
visualViewport y es translúcida. El gestor **autorizó expresamente ampliar el
alcance a `ui/Hoja.tsx`, `Hoja.module.css` y su regresión focalizada**, conservando
diseño, tokens, foco, inert y gestos; HojaLugares queda fuera.

Corrección: el velo conserva innerHeight y offsetTop; `--alto-visible` mantiene
contenido/borde inferior de la hoja en visualViewport.height. Un pseudo-elemento
con `var(--fondo)` prolonga el blanco detrás de la barra móvil. En escritorio el
diálogo conserva el centro del área visible y no prolonga blanco. Sin teclado
se retira el marco inline y queda el canon CSS original. No se añade nodo, nueva
medida literal, color, z-index, dependencia ni prop pública del canon.

Toque: se conserva la altura después de enfocar, hasta cerrar; evita mover la
fila al perder foco incluso si aún no se ha escrito. Se mantiene `buscando ||
texto`, retirando el colapso en onBlur. Regresión con pointer down/up separado y
un solo replace, con texto y campo vacío; la fila se desplaza primero a la vista,
sin debilitar el criterio de posición. El fallo original se reprodujo antes.

## Petición adicional expresa del founder: alta con búsqueda vacía

El founder escribió en este chat: «recuerda agregar el botón de agregar lugar
cuando no hay resultados de busqueda en el caso de que se muestra buscador.
Dile a gestor que te lo pedí así. incluye en la entrega». Se transmitió literal
al gestor (mensaje95); mensaje96 confirma el alcance:

- Con buscador (>8 ciudades), texto significativo y cero coincidencias, debajo de
  «Nada con «texto».», **Boton canónico primario completo «Agregar un lugar»**.
- Aplica en toda sección con buscador, incluido Artistas; sustituye el alta lejana
  en ese vacío para evitar dos botones. No hay botón de vacío con resultados ni
  con texto vacío/espacios.
- Destino `/nuevo?tipo=lugar`, cierre de hoja; no se inventa slug ni se pasa el
  texto como ciudad o nombre. El alta existente obtiene ciudad de la dirección.
- Se conservan las reglas anteriores del alta por distancia fuera de ese vacío.

## Verificación del candidato corregido

- Base main `fd11330b` conciliada en `9d3dc682`: único conflicto OPEN_LOOPS,
  resolutor con faltantes main0/rama0/marcas0. Carpeta principal intacta y limpia.
- Regresión negativa del marco: esperaba velo43–887, anterior43–551; falla antes
  y pasa después. Foco, inert, Escape/pila, móvil320/390, centro820/1280, retorno
  de marco al cerrar teclado y fondo continuo correctos.
- Regresión de consumidores: **HojaFiltros real con campo y pie** y **HojaCiudad
  real del alta/edición de Artistas**,320/390 con viewport reducido y cierre.
  Alta/edición de evento/lugar usan HojaDonde independiente, sin usar ui/Hoja;
  no se cambia ni se atribuye esa hoja a esta regresión.
- Componentes finales Ciudad+Hoja **22/22**,18,45s. FilaEventos+FilaLugares14/14
  del mismo código reutilizadas (ejecución combinada36, con un fallo del nuevo
  montaje al tocar Querétaro fuera de la zona visible, corregido con scroll a la
  vista sin cambiar aserciones). CI completa del nuevo SHA requerida.
- `npm test`: **1900/1900**,137 archivos,7,98s. Tipos/build correctos. Lint0errores,
  warning previo de VisorImagen:171. Inventario104CSS/1213reglas, sin novedades;
  344medidas y2duplicados conservan presupuestos. Medir final: build6s,
  24pantallas×4anchos, **96mediciones correctas**,83s, sin novedades.
- App compilada: cinco estados renovados390/320; los PNG1/2/3/5 son idénticos y
  conservan revisión visual previa. Nuevos estado4 y estado6 (vacío con alta),
  más WebKit390, observados completos. Bricolage cargada;0errores/desbordes.
- Toque del **Link real de Next** en el vacío llega a `/nuevo?tipo=lugar` y cierra
  la hoja a320/390; no es solo aserción del href. Datos y permisos simulados.
- Área visual reducida en Chrome/WebKit sigue siendo **simulada**, no teclado
  nativo. El gestor debe repetir Safari real con su proxy sobre el nuevo SHA,
  revisar todo el delta y aceptar o devolver hallazgos consolidados.

Se conserva PR333 draft, #294 primero y «publica» expreso del founder para
producción. Firma física del iPhone sigue pendiente; sin SQL/env/configuración,
Mapbox inverso, datos reales escritos ni servidores propios permanentes.


## Aceptación de `064d25a2` y ajuste posterior de Artistas

Mensaje100: el gestor revisó todo el delta de `064d25a2`, aceptó el cambio mínimo
del canon y repitió Safari iOS26.3 con teclado de pantalla real. Franja blanca
continua, campo/resultados visibles, Guadalajara elegida con un toque; vacío y
alta correctos. Sin sesión llega a «Entra para registrar un lugar». Sus capturas
`064d25a2-teclado-gua.png` y `064d25a2-sin-coincidencias.png`, en su carpeta
`capturas-297-revision`, se observaron completas.

CI [37232698189](https://github.com/robscan/somosnosotros/actions/runs/37232698189)
**success** en ese SHA:1900 unitarias,243 componentes correctos/0fallos y2omisiones
Linux previas,96mediciones78s correctas. Preview GitHub6846381610 success para
064d25a2. No se retiró draft ni publicó. Esta evidencia se conserva como historia;
la condición del nuevo código requiere su propia CI.

**Decisión posterior del founder, transmitida y confirmada por Gestor III**
(mensaje101: «Lo dejamos en lugares solamente»; ajuste explícito del gestor,
confirmado de nuevo en108): Artistas no ofrece «Agregar un lugar» sin coincidencias,
porque registrar un lugar no añade una ciudad al catálogo de Artistas. No se
sustituye por un botón de artista. Las demás secciones con buscador (Agenda,
Inicio, Lugares y Buscar) conservan el alta de lugar. Sustituye expresamente la
confirmación previa de mensaje96 que la permitía en Artistas.

Cambio acotado: `sinCoincidencias` exige además `seccion !== "artistas"`. Se
actualiza la expectativa del vacío de Artistas a botón0 y el caso de catálogo
con13ciudades en Lugares (también Eventos/Buscar) confirma un solo Boton completo,
URL exacta, visible sobre el área reducida, cierre y ausencia con espacios.
Componentes Ciudad **11/11**,12,84s; lint focalizado correcto, tipos/build correctos.
No se repite suite local general ni Safari: el gestor permite reutilizar la
prueba del canon/teclado de064d25a2 porque este delta no los cambia; exige nueva
CI completa y su revisión de la excepción.

`estado-6-{320,390}.png` ahora muestra **Lugares**, catálogo local sintético de
13ciudades, fuente cargada,0errores/desbordes. Ambos PNG observados completos.
Toque real de Next llega a `/nuevo?tipo=lugar` y cierra. Mediciones actualizadas
solo para estado6; estados1–5 y WebKit se conservan. Datos/permiso/altura del
viewport simulados; no afirmar teclado nativo nuevo para estas capturas.

Responsables confirmados en108: el gestor revisa nueva excepción/CI, trae main
y une en orden cuando se autorice; el founder prueba iPhone físico y da «publica»
para #294 y luego #333. PR333 permanece draft. No hay otros cambios de diseño,
canon, geocodificación, SQL, variables ni producción.


## Hallazgo a358 y disposición confirmada por el gestor (mensajes111–112)

Mensaje110 aceptó `4f93978d` y la excepción de Artistas; CI37233704253 de ese SHA
terminó success. **No se considera cierre**: antes de entregar se comprobó Lugares
con vv.height358 (medida real anterior del gestor), permiso prompt y sin punto.
El botón de ubicación añade60px que no existían en Artistas. A390 el alta mide
301,4–349,4 con cuerpo terminado en338; a320 mide321,6–369,6 y el centro devuelve
el dialog, no el enlace. PNG negativos vistos completos, ahora guardados como
`antes-recorte-358-{320,390}.png`. La comprobación usa altura simulada; no es
prueba nativa adicional. El click automático de Playwright desplaza overflowhidden
y ocultaría el fallo: por eso se comprueba rectángulo/hit-test antes de tocar.

Se comunicó el hallazgo y se pidió confirmación de disposición antes de cambiar
el código. Mensaje112 autoriza progressive disclosure: mientras `buscando || texto`
se ocultan **Usar mi ubicación, su error y el alta lejana**. Conserva título/nota,
campo, resultados y, sin coincidencias fuera de Artistas, **Agregar un lugar**.
Al reabrir, acciones normales; sin cambios a permisos/lectura/sessionStorage,
orden, diseño, CSS ni ui/Hoja. Se descarta agregar scroll extra.

Corrección solo en Ciudad: `enBusqueda` gobierna las tres acciones y la altura.
Regresión nueva falla antes (ubicación todavía visible) y pasa después. Ciudad
**12/12**,14,11s; incluye error oculto, alta lejana ausente con resultados/texto,
acciones recuperadas al reabrir y bbox completo + elementFromPoint a358/320/390.
Lint focalizado, tipos y build correctos. No se repite suite local general ni
mediciones normales del mismo canon: nueva CI completa requerida.

App compilada con13ciudades locales de Lugares, capturas oficiales **estado6 a358**
renovadas y vistas completas. Rectángulos finales:

| Ancho | Campo | Alta | Cuerpo | Centro del alta |
|---|---|---|---|---|
| 390 | 139,2–185,2 | 241,4–289,4 | 106,9–338 | enlace |
| 320 | 159,4–205,4 | 261,6–309,6 | 106,9–338 | enlace |

Ambos controles completos dentro del cuerpo;0errores/desbordes, Bricolage cargada.
El Link real de Next llega a `/nuevo?tipo=lugar` y cierra. Mediciones estado6
actualizadas con358 e hit-test, estados1–5 conservados. Servicios/altura simulados.
El gestor repetirá **Safari con teclado real sobre el nuevo SHA** porque cambia
la disposición al buscar; debe revisar el delta y recibir la nueva CI exacta.
Sin producción, PR333 draft, #294 primero y responsables ya confirmados en108.


## Parte A · ciudad persistente (firma y encargo del gestor259)

El founder aprobó el prototipo OL-274 y ordenó: «Listo. Apruebo, notifica a gestor
vamos a prod». Transmitido literalmente al gestor (258). El gestor259 reserva
A en esta rama/PR333 y B en `inicio-mas-adelante`, bit306, sobre main posterior a
PR339. El gestor registra la firma y revisa/publica A→B; no repetir aprobación.

Causa reproducida con regresiones negativas: NavSecciones reutilizaba URLs SLP
y filtros de otra ciudad, y una entrada sin `?ciudad` ignoraba la preferencia.
Artistas además resolvía solo su catálogo propio. Se conserva un catálogo común
por dos agregados cacheados; la hoja sigue filtrando según oferta. La navegación
y el logotipo llevan la ciudad actual y solo recuperan filtros/scroll de una URL
de la misma sección y ciudad. La preferencia local se aplica con replace en
entradas sin ciudad; una URL explícita gana sin sobrescribirla. Elegir SLP deja
su slug explícito para distinguirla de una entrada sin elección. Almacén bloqueado
y SSR conservan su comportamiento seguro. No se editó `memoriaPantalla`.

`useSearchParams` en el logotipo compartido hizo fallar prerender de `/borrado`;
se aisló exclusivamente la lectura del href bajo Suspense, igual en Nav, con
fallback del mismo elemento y sin nodos/estilos adicionales. Build final correcto,
incluidas páginas estáticas. No se tocó carriles, Destacados ni reglas de Inicio.

Verificación local:
- 1904 unitarias (137 archivos) sobre base90f136b4 antes de conciliar339;
  33 componentes focalizados Ciudad/Armazon, sin fallos ni omisiones;
  lint0errores (1advertencia previa VisorImagen171), tipos correctos.
- `medir`: build7s,96mediciones/24pantallas×4anchos,92s sin novedades;
  anterior al merge339, cuyo delta no cambia el canon de esta hoja/navegación.
- Build repetido tras conciliar339 y QA real de Next sobre ese código:
  elegir León en Agenda con antiguo filtro Gratis de SLP → Lugares → Artistas →
  Inicio → Agenda → recarga. El evento futuro sigue en Todos; ninguna sección
  vuelve a SLP. Artistas sin fichas mantiene León y su vacío canonizado.
- Entrada `/lugares` restaura León; URL explícita Puebla gana y su logotipo la
  lleva a Inicio, sin cambiar `sn:ciudad-elegida=leon`.
- A320/390, alta lejana Agenda/Lugares cierra hoja y llega al alta existente/Entrar;
  Artistas tiene0botones de alta. Búsqueda Lugares sin coincidencias a vv358:
  Boton completo, hit-test correcto y enlace real `/nuevo?tipo=lugar`.
  Bbox390:241,4–289,4;320:261,6–309,6, cuerpo hasta338.

Evidencia en `capturas-297/persistencia/`:10PNG completos observados y `qa.json`.
León y su mensaje de ausencia visibles en Artistas; Agenda Todos con fecha y
renglón completos; hojas mantienen título/✕/campo/filas del canon, botón final
violeta sin recortes. Área visual/GPS/datos simulados y navegador Chrome local:
no afirmar teclado/Safari físico. Se mantiene el pedido expreso del founder de
**Agregar un lugar cuando el buscador no tiene resultados**, fuera de Artistas.
La hoja B/Inicio «Más adelante» se implementa aparte según la reserva306.

Nueva CI y preview exactas requeridas por el gestor antes de integrar; esta
bitácora no declara la pieza publicada. Sin SQL propio, servicios reales escritos,
geocodificación, variables nuevas ni cambios a accesos.

CI37250687353 detectó una expectativa anterior en el caso autorizado de FilaEventos334:
el doble no cambia URL al replace y esperaba `/agenda` sin ciudad. Se adaptó solo
ese caso a una entrada explícita SLP y destino explícito Querétaro. Regresión
focalizada correcta; no cambia código ni invalida build/QA. CI nueva requerida.
