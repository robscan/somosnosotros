# 293 · Fin efectivo en Inicio y tope de Nuevos (OL-266 / H06 + H08)

**Fecha:** 2026-10-03. **Estado:** publicado y verificado; cierre técnico completo, prueba física en Safari pendiente.

Reserva del Gestor de cambios III en PR316 / `be6d23aff1f57f28b59388646102a327eca70e04`,
tras el cierre PR315 de OL265. Rama `inicio-semana-nuevos`, worktree
`/Users/apple-1/somosnosotros-inicio-semana-nuevos`. OL266 y bit293 comprobados
libres con el script del proyecto. El gestor confirma expresamente
`inicio/CarrilNuevos.tsx` y `AgendaNuevos.componentes.test.mjs` dentro del alcance.
Checkout principal y demás piezas preservados; sin subagentes.

## Causa y corrección

H06: `eventosEstaSemana` usaba `fin ?? inicio`. Sin fin explícito, descartaba el
evento en cuanto pasaba su inicio. Ahora reutiliza `terminaDe(inicio, fin, zona)`,
la regla existente de Agenda: fin explícito o medianoche siguiente en la zona del
evento. Conserva la frontera inclusiva `termina >= ahora` de Agenda y el horizonte
actual de siete días de Inicio. Exige la zona en el tipo para no perderla al filtrar.

La columna generada `eventos.termina`, `cargarEventosSemana` y `ocurreEstaSemana`
ya aplican el fin efectivo; no necesitan cambios ni SQL. Esta pieza no iguala el
horizonte de siete días exactos de Inicio con el horizonte de calendario de los
carriles de artistas/lugares: corrige únicamente cuándo se considera terminado.

H08: `carrilNuevos` devolvía todos los candidatos. Ahora aplica `LIMITE_NUEVOS`
(20, existente en Agenda) después de filtrar y ordenar, antes de convertir las
tarjetas y entregarlas al componente de cliente. Solo los 20 elegidos se añaden a
`vistos`. El cliente conserva el mismo tope tras aplicar la última visita guardada.
Sigue vigente el mínimo de tres y el enlace «Ver la agenda»; Agenda/Todos conserva
la lista completa y su carga progresiva. No se cambia el tope de artistas:
el gestor lo dejó pendiente de decisión del founder.

## Reproducción y regresión

Pruebas nuevas ejecutadas **antes de corregir producto**:

- Inicio: 7 fallos esperados / 46 correctas. Seis casos de eventos sin fin que
  desaparecían antes de medianoche y el caso de 100 candidatos sin límite.
- Componente real CarrilNuevos: devuelve 100 enlaces cuando se esperan 20.

Después de corregir: 129 pruebas focalizadas correctas (Inicio, fechas, Agenda,
eventosSemana y cargarEventosSemana). Las 12 fronteras temporales comparan Inicio
con el fin efectivo de Agenda en México, Los Ángeles, Tokio y un día de 25 horas
en Nueva York; incluyen antes/después del inicio, medianoche y fin explícito.
La comparación usa el equivalente local de la regla SQL; no es una consulta remota.

Componente Agenda/Nuevos completo: 9/9 correctas, 6,93 s, Chromium fijado. Con 100
tarjetas y sin visita salen los 20 más recientes; con visita a las 17:51 quedan
10. Conserva el enlace a Agenda/Nuevos. Las unitarias comprueban además que lo
excluido por el tope no se marca como visto y que Agenda/Todos conserva los 100.

Integración local: 1835 unitarias en 133 archivos, tipos y lint correctos; permanece
un aviso previo de variable `page` sin usar en VisorImagen.componentes. Pendientes
build/medir, revisión visual local y preview, CI y revisión del gestor. Sin tocar
Auth, SQL, imágenes, lugares ocultos ni direcciones reservadas.

Evidencia local inicial: `/tmp/sn-ol266-evidencia/` (logs de reproducción y
regresión). Antes de entregar se conservará fuera de `/tmp` junto con las capturas.
Safari físico seguirá pendiente del founder; Chromium no lo sustituye.

## Integración y revisión visual local

`npm run medir` compila correctamente en 15 s y completa 24 pantallas × 4 anchos
(320,390,820,1280) en 77 s, sin novedades. Inventario correcto. Presupuestos intactos:
el fixture estándar tiene pocos Nuevos, por eso Inicio conserva 295/295/297/297
nodos (sin sesión) y 304/304/306/306 (con sesión). La reducción de 100 a20 tarjetas
se verifica en el caso de carga alta; no se atribuye una reducción inexistente al
fixture pequeño ni se relajan sus límites.

Aplicación compilada real contra el respaldo local inventado, ampliado solo en
memoria desde un guion temporal: 100 candidatos nuevos y un evento sin fin iniciado
una hora antes. Inicio muestra 20 tarjetas nuevas y mantiene el evento en curso.
«Ver la agenda» abre `/agenda?ver=nuevos` y muestra 20; «Todos» conserva el evento en
curso y la agenda completa. HTTP200 y cero errores de página. Sin base remota,
usuarios reales, correos ni escrituras de producción.

Capturas reales abiertas y revisadas, 390×844 a3x y 1280×800: cabecera, filtros,
barra y tarjetas conservan su composición; el evento de las09:00 aparece en Inicio
y Agenda a las10:00. Nuevos muestra título, enlace y tarjetas en el carril; en Agenda
se ve «Lo más nuevo ·20». Se repitieron dos capturas tras asentar scroll/transición
para que la cabecera no tape el título durante la toma. La captura de OL264 sirve
como referencia de composición anterior; los datos de carga alta son sintéticos.

Evidencia persistente (guiones, PNG, JSON y logs):
`/Users/apple-1/.codex/visualizations/2026/10/02/01a0fece-65fd-79e3-a64d-296a4b8fa13c/inicio-semana-nuevos/`.
Pendientes preview del candidato, suite completa en CI con las dos excepciones
Linux ya autorizadas en OL265, entrega consolidada y ventana del gestor.

## Revisión del primer candidato y decisión posterior del founder

Primer candidato `296c50df`, PR317: CI37174739779 **success**, 215 componentes
inventariados, 213 correctos, 2 excepciones Linux de OL265, 0 fallos, 98,74 s.
Preview6836450214 correcto sobre ese SHA. Inicio real muestra20 Nuevos y el enlace
abre Agenda/Nuevos; sin errores del navegador. Producción anterior tenía81 tarjetas
al comparar (el inventario vivo ya difiere de94 en la auditoría). No es una medición
de transferencia o factura.

El gestor revisó y aceptó H06/H08. Antes de publicar comunica la decisión del founder
en su tarea: «Acepto tus recomendaciones», aprobando un tope de12 en «Artistas con
eventos esta semana». **Sustituye la espera de decisión indicada arriba.** Se incorpora
al mismo PR y OL266; todavía no se publica el primer candidato.

La exclusión de quienes ya aparecen en Destacados sucede en `src/app/page.tsx`;
cortar antes en la carga semanal podría dejar una tira vacía aunque existan otros
candidatos. El gestor amplía expresamente solo ese bloque y sus importaciones para
conectar `seleccionarArtistasSemana` (helper puro de eventosSemana). Conserva
`Promise.all`: primero se quitan los destacados y luego se corta con la constante
existente `TOPE_ARTISTAS_DESTACADOS` (12), antes de entregar al cliente. Sin nuevas
consultas, SQL, modificaciones de Lugares o cargarArtistasDestacados.

Regresión: 30 artistas dan12; si los primeros12 están destacados, salen los12
siguientes; si quedan menos se conservan, si todos están destacados no sale ninguno.
La lista de entrada y el carril de Lugares conservan30. 23 pruebas focalizadas
correctas y1837 unitarias en133 archivos; tipos y lint correctos. Nuevo build6s y
medir focalizado de Inicio,8 combinaciones,14s sin novedades; la CI hará las96.
Se reutilizan las9 pruebas de Agenda/Nuevos y capturas del mismo código H06/H08.

Ventana del gestor: con CI verde sobre el candidato ampliado, unir y verificar en
Production Nuevos<=20 y artistas<=12, comunicar SHA y cerrar documentación.

QA adicional del candidato ampliado: app compilada con30 artistas inventados y los
12 primeros destacados devuelve exactamente los artistas13…24 en la tira semanal,
mantiene20 Nuevos y «Ver artistas» abre el directorio (36 artistas en el fixture).
Cero errores de página; capturas `artistas-390.png` y `directorio-artistas-390.png`
abiertas y revisadas. Se mantienen las tarjetas redondas, su fecha y el enlace.
El primer intento del guion de QA detectó que el respaldo devuelve vacío para
la RPC de destacados de artistas; completar ese doble temporal con los12 elegidos
resolvió el desajuste, sin modificar producto ni el respaldo versionado. Log
conservado como `qa-artistas-fixture-incompleto.log`, resultado final en
`qa-artistas.json`. Procesos propios finalizados.


## Publicación y cierre técnico

Candidato final `36e52d815e1237a5c1eebb20715798e83ebe2a85`: CI
[37175497999](https://github.com/robscan/somosnosotros/actions/runs/37175497999)
**success antes del merge**. 215 componentes inventariados:213 correctos,
2 excepciones Linux declaradas en OL265,0 fallos,98,7369 s. Tipos, lint,
1837 unitarias, contratos PostgreSQL, build, inventario y96 mediciones correctos.
Preview6836566828 correcto en ese SHA:20 Nuevos,12 artistas semanales y
continuación al directorio,0 errores de navegador.

Con la ventana del gestor, [PR317](https://github.com/robscan/somosnosotros/pull/317)
unido el 2026-10-04 a04:02:33 UTC (2026-10-03 en México), merge
`06fbf261d7d8b4f66a9061817db221406b146971`. CI de main
[37175828406](https://github.com/robscan/somosnosotros/actions/runs/37175828406)
**success** sobre ese merge. Production6836618148 **success**,04:03:04 UTC,
URL `https://somosnosotros-2hmlk3b0x-robscans-projects.vercel.app`.

Comprobación anónima en `https://somosnosotros.org`,390×844:

- Inicio devuelve20 Nuevos y12 artistas semanales; ninguno de esos12 repite los4
  destacados presentes. Esta semana conserva eventos sin fin cuya hora de inicio
  ya pasó, de acuerdo con la regresión de fin efectivo.
- «Ver la agenda» de Nuevos abre `/agenda?ver=nuevos`, con Nuevos seleccionado.
  «Ver artistas» abre `/artistas`, directorio de638 artistas en la lectura.
- Capturas reales observadas, composición conservada y cero errores de consola.
  `/`, `/agenda`, `/artistas`, `/entrar` y `/api/estado` responden200;
  estado informa Supabase ok y Mapbox configurado.

Sin SQL, variables nuevas ni escrituras de datos reales. El checkout principal
permanece limpio en `1b9461e4`; el árbol de la pieza se actualizó al merge.
Procesos y pestañas propios cerrados; se retiró el viewport temporal. Evidencia
local persistida en la carpeta antes citada, incluidos CI final, CI main y
`produccion.json`. La evidencia automatizada no sustituye Safari físico: queda al
founder comprobar en su iPhone las tarjetas, su desplazamiento y los enlaces.
La siguiente pieza requiere reserva expresa del gestor; no se autoasigna.
