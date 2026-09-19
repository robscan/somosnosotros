# Asignaciones del gestor

Registro central de reservas, actualizado el 2026-09-18. Solo el gestor asigna
o cambia rama, base, OL, bitacora y alcance. El operador consulta este registro
ademas de ejecutar `scripts/ops/siguiente-bitacora.sh`: el script comprueba
archivos existentes, pero no sustituye reservas aun sin archivo.

| Pieza / tarea | Rama y base | OL / bitacora | Archivos o recursos asignados | Limite |
| --- | --- | --- | --- | --- |
| Pincel / Analiza activacion de lienzo colabor (`01a0b601-b973-7983-95eb-fe66f43e1988`) | `codex/pincel-prototipo`, base `d1b5bdc` | OL-084 / 118 | `experiments/pincel-prototipo/**`, bit118, entrada propia OL-084 | Prototipo local. Presentacion y VoBo del founder; sin app, backend, push ni produccion. |
| Directorios / Anadir slider de eventos proximos (`01a0b61e-abcd-7483-a141-116715ad40d4`) | `codex/directorios-alfabeticos`, base `eb2f80e` | OL-085 / 119 | Directorios Artistas/Lugares, indice y carriles, helpers/tests afectados, bit119, entrada propia OL-085 | PR105 draft. Propuesta vertical y carriles segun ultima decision, primero VoBo; no publicar propuesta anterior. |
| Activacion de avisos / Operador: avisos y anuncios fiables (`01a0b694-ed57-7700-b717-a4e56dbd1c31`) | `codex/avisos-operacion`, base `eb2f80e` | OL-086 / 120, reservados por gestor | Bit120 y entrada propia OL-086; operacion autorizada de avisos_config, cron/Vault y transicion conforme bit113 | Sin codigo nuevo, nuevas migraciones, Auth, Storage, CAPO ni planes. Propiedad exclusiva de esa ventana remota hasta informe de liberacion. |
| Reactivar avisos / operador Claude nuevo (Sonnet 5, esfuerzo medio) | `codex/avisos-operacion` en `/Users/apple-1/somosnosotros-avisos-operacion`, sobre `eb2f80e` | OL-086 / 120 (continúa) | Bit120 y entrada OL-086; lectura de producción; Vercel solo si el founder da acceso | Reunir la prueba de que los despliegues antiguos no emiten y preparar las dos rondas diarias. No reactivar `entregar` ni el cron sin las horas del founder y la revisión del gestor. |
| Security Advisor, lo que queda / chat «SEO, tags y Google Analytics» (Sonnet 5, esfuerzo medio) | `advisor-seguimiento`, base main del día | OL-077 / 121 | Bit121, entrada OL-077; migración nueva que solo añade o endurece, con nombre dado por el gestor | Leer el Advisor en producción solo lectura, arreglar lo que quede en una migración. No aplicarla: la aplica el gestor. |
| Topes de campos / chat «Cámara y fecha en evento» (Haiku 4.5) | `topes-de-campos`, base main del día | OL-065 / 096 | Los tres formularios del canon y su validación; bit096 y entrada OL-065 | Que la pantalla acote lo mismo que el servidor, sin quitar texto ya escrito. Sin migración. |
| Cabeceras consistentes / chat «Inconsistencia en búsqueda y filtros» | `cabeceras-consistentes`, base main tras unir `codex/directorios-letra-filtro` | OL-087 / 122, reservados por gestor | Cabecera única en Agenda, Lugares y Artistas (prototipo firmado por el founder 2026-09-18), botón ↑, renglón 1 que se esconde al bajar; prototipo en `docs/rediseno/prototipos/cabeceras.html`; bit122 y entrada OL-087. Sin migración |
| Pincel en la app / chat «Ajustar el controlador de Pincel (OL-084)» (Sonnet 5) | `pincel-app`, base main del día | OL-088 / 123, reservados por gestor | Llevar a la app el prototipo firmado de OL-084 (codex/pincel-prototipo 6063e16): primero un plan con fases y migraciones para firmar; después el código. Autorizado por el founder 2026-09-19 («llevalas a prod», «que comience producción») |
| Mapa en fichas / chat «Terminar los directorios alfabéticos (PR #105)» (Sonnet 5) | `mapa-en-fichas`, base main del día | OL-089 / 124, reservados por gestor | Mapa de referencia en la ficha de cada lugar y evento (pedido del founder 2026-09-19), respetando direcciones reservadas; bit124 y entrada OL-089. Sin migración |

Los worktrees correspondientes son `/Users/apple-1/somosnosotros-pincel-prototipo`,
`/Users/apple-1/somosnosotros-directorios-alfabeticos` y
`/Users/apple-1/somosnosotros-avisos-operacion`. No cambiar de rama en la carpeta
de otro operador. `main` queda al gestor para coordinacion documental e integracion.
Modelos operativos: Terra; pruebas focalizadas segun riesgo. No abrir mas agentes
ni repetir suites como parte de esta asignacion.

Avisos entrego `f6c78d2` en bit113 antes de recibir la reserva formal OL-086/120.
Se conserva ese commit y esa bitacora: bit120 sera cierre operativo con referencia
a la evidencia anterior, no renumeracion ni repeticion de activacion. El operador
reporta ventana remota liberada y cron activo; revision final del gestor pendiente.


Gestor desde el 2026-09-19: la sesión Claude `c45c6c9f-46b4-426d-a884-9ddb0b295fa7` retoma la gestión tras Codex, con las mismas reglas de este registro. Operadores Claude en modelos baratos (Sonnet 5 o Haiku 4.5) y esfuerzo medio o bajo; revisión con agentes solo en migraciones, seguridad y avisos. PR105 y Pincel siguen retenidos a la espera del VoBo del founder.

## Reglas de entrega

- Una pieza por rama y OL; otra pieza o ampliacion requiere asignacion del gestor.
  La activacion OL-086 es distinta de la implementacion OL-079/bit113 ya publicada.
- Una propuesta nueva se prepara aislada; el founder valida UX/UI antes de
  implementar. La rama de implementacion futura se asigna desde el main vigente;
  no arrastrar automaticamente experimentos o decisiones sin aprobar.
- Operador presenta propuesta en su tarea y solicita VoBo; despues entrega SHA,
  archivos, evidencia y limites al gestor. No se vigilan pasos intermedios.
- Durante revision/integracion el SHA entregado queda congelado: no editar esa
  rama a la vez. Hallazgos se devuelven en lote y el gestor libera la rama para
  correccion. Un nuevo pedido del founder se comunica antes de ampliar alcance.
- Gestor resuelve choques y secuencia integracion/publicacion autorizada. PR105
  no se despliega durante la ventana remota de avisos. Pincel permanece local.
- Los operadores no escriben este registro ni la memoria central; cada uno
  modifica solo su bitacora y su entrada de OPEN_LOOPS. Preservar cambios ajenos.

## Fuente Recuperada

Contrastado con el transcript local del gestor Claude
`c45c6c9f-46b4-426d-a884-9ddb0b295fa7` y su memoria
`project-gestion-de-cambios.md`, no solo con nuestras notas posteriores:

- 2026-09-17 20:57:59Z: asigna rama/base, OL/bitacora y archivos que chocan para
  Atras tras entrar; limita alcance y conserva la composicion de otro operador.
- 2026-09-17 20:58:08Z: comunica Cartel en produccion, cierra esa rama y asigna
  la siguiente pieza desde el main publicado, con numeros y migracion reservados.
- 2026-09-17 21:43:01Z: devuelve correcciones verificadas al operador de
  indicadores, pero deja un cambio de portada a decision del founder.
- Memoria original: propuesta documental aislada antes de construir, numeros
  asignados centralmente, rama quieta durante revision, una decision consolidada
  por chat cuando hay mensajes en cola. No reproducir los volumenes antiguos
  de pruebas: se mantiene la regla actual de verificacion proporcional.
