# 293 · Fin efectivo en Inicio y tope de Nuevos (OL-266 / H06 + H08)

**Fecha:** 2026-10-03. **Estado:** corrección local; verificaciones y revisión pendientes.

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
