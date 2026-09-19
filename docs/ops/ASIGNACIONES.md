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
