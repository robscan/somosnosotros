# 297 · OL-270 · Hoja de ciudades

Fecha: 2026-10-04. Operador: Codex, chat `01a1082a-33fb-7302-b694-1889ceaaf549`.
Estado: avance local guardado; **no listo para integrar**. Falta resolver con el
gestor el centro de las ciudades sin lugares, autorizar la actualización de una
prueba anterior y recibir revisión final. Sin push, PR ni publicación de OL-270.

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

## Pruebas y evidencia reutilizable

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

### Revisión visual (cada PNG completo observado)

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

## Pendientes concretos y siguiente acción

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

No cambian `ui/*`, consultas, SQL, permisos, backend, `apps/ios`, ni librerías de
ubicación aparte de la dependencia #294 ya asignada. Sin migraciones ni nuevas
variables de entorno de producción. Dependencias locales instaladas con el lock
existente; no se cambió `package.json`/lock.
