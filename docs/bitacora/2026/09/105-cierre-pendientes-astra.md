# 105 - Cierre de pendientes y recorridos confiables

Fecha: 2026-09-18. OL-074. Rama: `codex/cierre-pendientes`.

## Objetivo aceptado

El founder precisa que la primera etapa termina con los ajustes en produccion
y probados en su dispositivo. Los commits locales no cierran el objetivo.
Primero cerrar pendientes y hacer confiables los recorridos existentes;
el rediseno general queda para una segunda etapa.

## Coordinacion

- Este chat actua como gestor Astra. Revision independiente Astra y conciliacion
  Terra, como maximo dos operadores al inicio.
- Main y worktrees de Claude se conservan. La modificacion encontrada en la
  bitacora 056 de main es ajena a esta tarea y no se toca.
- Se recuperan selectivamente los archivos de cuotas e indicadores, incluyendo
  los cambios sin commit de Claude. No se arrastran versiones viejas de login,
  navegacion o historial, ni el conflicto de OPEN_LOOPS.
- Esta rama parte de codex/push-seguro. Migraciones en orden: cuotas 17160000,
  indicadores 17170000 y push 18100000. Ninguna aplicada remotamente todavia.
- Reservado OL-074 y bitacora 105 tras comprobar el script del proyecto.

## Pendiente de verificar

- Revision independiente de OL-072/073.
- Cuotas e indicadores juntos en PostgreSQL, incluyendo concurrencia y RLS.
- Nuevos por publicacion y texto con icono de Entrar.
- Guardado atomico de evento y entrega fiable de avisos.
- Flyer, preservacion de ediciones, direccion, mapa y Como llegar.
- Publicacion aprobada por el founder, despliegue comprobado y prueba de iPhone.

No se declara esta etapa terminada ni en produccion.

## Avance de gestion, 18 de septiembre

La lista anterior conserva el estado de apertura. Avance verificado:

| Pieza | Estado real |
| --- | --- |
| Base de pruebas | PR [100](https://github.com/robscan/somosnosotros/pull/100), CI y preview correctos |
| Nuevos/Entrar | PR [101](https://github.com/robscan/somosnosotros/pull/101), base apilada sobre 100; CI y preview correctos |
| Push | Validacion de endpoint, limite concurrente y estado real del navegador revisados; integrado localmente |
| Cupos/historico | Conciliacion de cambios Claude, concurrencia y UI probadas; integrado localmente |
| Guardado atomico | Evento, sitio privado y artistas en una transaccion; revision optimista e identificador de reintento; integrado localmente |
| CAPO | Metricas agregadas honestas, permisos y casos vacios probados; integrado localmente |
| Security Advisor | Inventario y matriz de funciones, hardening y cierre de filtraciones por conteos; integrado localmente |
| Storage | Listado propio y UUID sin sobrescritura; integrado localmente, limites de privacidad documentados en 114 |
| Flyer/direccion | Primer commit c9c0574 revisado, retenido por fallo de persistencia al reeditar; correccion estructurada en curso |
| Avisos fiables | Outbox duradero en curso, pendiente revision, convivencia durante despliegue y pruebas finales |

Los PR 100/101 son el primer lote sin migraciones. Se solicito autorizacion
explicita para integrarlos y comprobar su despliegue; al registrar este avance
no hay respuesta. La autorizacion previa de push/PR no permite main ni produccion.
Tras aprobar: integrar 100 sin borrar la rama base, cambiar base de 101 a main,
recomprobar checks e integrar 101. Confirmar deployment de Vercel y recorrido en
somosnosotros.org antes de decir que el founder puede probar ese lote en iPhone.
Las piezas con migraciones, Auth y configuracion requieren otra aprobacion.

Preview de 101 probado en navegador, solo lectura: Nuevos -> ficha -> Atras
conserva exactamente los enlaces de la lista. No equivale a produccion ni prueba
OAuth real. Preview: https://somosnosotros-git-codex-nuevos-entrar-robscans-projects.vercel.app

Integracion con Storage: 532 pruebas unitarias y 40 migraciones/495 comprobaciones
PostgreSQL correctas; build/typecheck correctos y lint sin errores (un warning
heredado). Estos resultados no incluyen los cambios posteriores de flyer/outbox.
El respaldo remoto se restauro en PostgreSQL local aislado y las siete migraciones
integradas se aplicaron a esa copia sin errores; evidencia y limites en 114.

Hallazgo adicional de revision: nombre y direccion unidos en sitio_texto pierden
su separacion al reabrir; reservar despues puede conservar una direccion en el
alias publico. Se encarga a Terra columna sitio_direccion, sin backfill ni parser
de texto humano; confirmacion de alias legacy, validacion de pin modificado y
pruebas de alta -> guardar -> reeditar -> reservar. Reserva migracion
20260918160000_evento_direccion.sql. No se declara corregido antes de su entrega.

Auth de produccion es Free y seis de diez cuentas tienen contrasena registrada.
Proteccion de contrasenas filtradas requiere Pro segun el panel consultado;
configuracion y contrato siguen intactos. No se descarta el warning por usar OTP.
Los cuatro avisos de tablas internas sin politicas se mantienen justificados,
sin abrirlas para silenciar el Advisor.

Coordinacion futura separada: propuesta 115/OL-081 del celular como pincel recibida
en 079364c; documentos de investigacion, no implementacion ni parte del lote.
Reservas vigentes: 112/OL078 direccion, 113/OL079 avisos, 114/OL080 Storage,
115/OL081 propuesta QR. Proxima libre 116/OL082, comprobar antes de tomarla.

Los cambios generados de CLAUDE.md en este worktree y la bitacora 056 ajena en
main se mantienen fuera de los commits del gestor.

## Integracion local de Nuevos20 y estado Vercel (2026-09-18)

Integrado por cherry-pick `7cedf1b12d1e451e789b9d7cf40f71e11869d882`
sobre `7a556bc` en `codex/cierre-pendientes`. Entrar conserva el estado de
produccion ya repuesto; `page.tsx` conserva `sitio_direccion` de la integracion
pendiente y retira `selloLista`, como la feature. No hay nuevas migraciones.
Conflicto de OPEN_LOOPS resuelto uniendo la actualizacion de Nuevos y el historial
de OL-074, sin perder entradas ni duplicar segmentos de Last updated. Verificado
contra ambas ramas y origin/main. CLAUDE.md ajeno intacto y fuera del commit.
No se modifica el worktree feature ni su bitacora 108; no hay push ni deploy.

Validacion local de la integracion: 657 unitarias en 61 archivos; typecheck y build
correctos; lint sin errores y un warning heredado del logotipo. Banco compartido
local 55439: 42 migraciones y 627 checks correctos, con aislamiento y limpieza
del runner, sin arrancar ni apagar servicios. Seis recorridos Chrome correctos
a 390/1280 con transporte simulado y hook real de asistencia. Build sin claves
de Supabase/Resend/VAPID/Mapbox; sin entregas reales ni red de produccion.

Estado comunicado por el gestor, corte **21:04Z**: PR #100 integrado en `75469d7`;
PR #101 sigue abierto. [Incidencia oficial de Vercel](https://www.vercel-status.com/incidents/bwkmw4hmrgmk)
desde 20:32Z. El intento manual por SHA `7cedf1b` creo el preview
`AzGFuSnWXksA2cMxe5kPjLDpvQzK`, pero seguia en **Initializing**:
[preview pendiente](https://somosnosotros-il4llxveq-robscans-projects.vercel.app).
El gestor dejo [comentario durable en GitHub](https://github.com/robscan/somosnosotros/pull/101#issuecomment-5736135099).
Este corte actualiza las referencias de avance anteriores, conservadas como
historia; no se infiere un estado posterior ni se modifica el deployment desde
esta integracion. **No es produccion ni cierre de OL-074.** El manager actualizara
108 y el cierre final cuando exista despliegue comprobado.

## Revision del siguiente candidato: carriles semanales (2026-09-18)

Revision independiente de `85c5423`, OL-083/bitacora 117: retenido por un P2
nuevo. `cargarEventosSemana` acumula lotes de 500 hasta agotar las relaciones,
sin presupuesto global ni cancelacion; Artistas y Lugares esperan el resultado,
incluso en Mapa. Reproduccion con loader real y transporte simulado: 2.000
relaciones del mismo artista requieren cinco consultas para una tarjeta; retener
la quinta mantiene pendiente el directorio. No es una medicion de carga real.

El gestor solicito al operador original una correccion local en su misma rama:
presupuesto global y deadline con aborto efectivo; al excederlos, omitir el
carril completo y entregar el directorio, sin ofrecer un ranking parcial por ID.
Debe cubrir presupuesto agotado, transporte suspendido, aborto y fronteras.
Sin SQL nuevo, migraciones, push ni despliegue. Un limite arbitrario sobre las
relaciones no garantiza las primeras entidades por fecha. No se encontraron
otros P1/P2 fundamentados en el diff; las 13 pruebas focalizadas pasaron.

La publicacion autorizada sigue limitada a Nuevos20 y su base de verificacion,
con Entrar intacto. Mapa, avisos, seguridad y Pincel siguen separados. El founder
recibio una pregunta opcional sobre vigilancia automatica de Vercel: no crearla
ni prometer notificaciones hasta recibir su autorizacion. Revalidar el estado
de la incidencia y del despliegue antes de retomar; no duplicar solicitudes
mientras el preview exacto siga pendiente.

## Merge autorizado y segunda revision semanal (2026-09-18)

- PR #101 integrado a main como `3a45399f14701803fe3035e02878a7a5935c0601`
  a las 21:23:21Z. Su arbol coincide con `7cedf1b`; CI posterior al merge
  aprobada (run 35396513626). El founder reitero: "ok dime que debo revisar,
  vamos a prod". Solo Nuevos20 y su base, Entrar sin cambios.
- Preview manual `AzGFuSnWXksA2cMxe5kPjLDpvQzK` del SHA 7cedf1b en Ready,
  build de 27 s. Su URL inmutable es
  https://somosnosotros-il4llxveq-robscans-projects.vercel.app/ . El alias de
  rama apuntaba al commit anterior 8b71171; un duplicado automatico J6kZmW7BA
  seguia Queued/Stale. No se atribuye el alias anterior a la version nueva.
- En la sesion de la preview exacta, Nuevos mostro el vacio de una visita
  previamente registrada; Ver todos regreso al directorio. El conteo de 20
  y ficha/Atras quedaron verificados en el build local real del mismo codigo,
  no en esa sesion vacia. No confundir ambos tipos de evidencia.
- Solicitado Deploy to Production por SHA exacto 3a45399 desde el panel
  conectado. Al corte 21:31Z seguia pendiente de aceptacion, sin un ID nuevo;
  no repetir la solicitud a ciegas. Incidencia oficial Vercel aun abierta.
  Falta comprobar dominio, version y recorridos; este registro NO declara
  produccion ni cierra OL-074. Comentario durable en PR #101:
  https://github.com/robscan/somosnosotros/pull/101#issuecomment-5736383699 .
- Carril semanal: P2 cerrado en `8ff7ce0`; precision documental en `8380657`.
  Dos consultas, hasta 1000 filas leidas y 750 ms de espera. Con 1000 o mas
  filas candidatas se omite completo: dos lotes llenos no confirman el fin.
  Revision independiente: 17 pruebas focalizadas y SDK real con fetch simulado
  verifican fronteras, plazo compartido y senal de aborto. 396 pruebas/build
  y QA Next con transporte suspendido son evidencia del operador, no una
  segunda ejecucion del revisor. No certifica cancelacion inmediata en PG ni
  tiempo total de pagina. Rama aislada, apta para preparar PR y revision visual;
  sin push, integracion ni autorizacion de produccion de esta pieza.

## Primer lote publicado: cierre documental (2026-09-18)

Integrado solo el commit documental `8a53338` sobre `13485ef`, con 108 y
OPEN_LOOPS completos y su historial conservado. Segun la comprobacion comunicada
por el gestor, Nuevos20 ya esta publicado en https://somosnosotros.org/:
20 eventos, mismos IDs al abrir ficha y volver con Atras, Ver todos funcional
y Entrar con Apple, Google y correo. PR #101 integrado en `3a45399`;
Production `6iCc9mbpMXiBv3BMWZgpqiSik39s` confirmado Current por la respuesta
de Promote. Este estado sustituye los cortes pendientes anteriores, conservados
como historia; la evidencia de publicacion se detalla en bitacora 108.

Publicado solo el primer lote. El resto del cierre de pendientes sigue pendiente,
sin ampliar autorizaciones. Falta la firma del founder en Safari y su telefono.
Esta integracion es documental y local: sin cambios de codigo, push ni deploy,
y sin alterar el CLAUDE.md ajeno. No se repiten pruebas de aplicacion ni se
interactua con produccion; se comprueban el diff y la preservacion documental.

## Reanudacion autorizada y reparto operativo (2026-09-18)

El founder autoriza reanudar la gestion, con tareas operativas separadas y
revision propia. Se integra solo `dd1c8e6` de `codex/entrar-texto-breve`:
una linea de FormularioEntrar y el apendice de 108. No cambia accesos ni Auth;
este ajuste de texto queda local, pendiente de revision y publicacion.

- Direccion: tarea `01a0b694-7b57-7b23-9ee6-4fa07c2f2ddf`, rama
  `codex/direccion-correcciones`, desde `4eee240`.
- Avisos: tarea `01a0b694-ed57-7700-b717-a4e56dbd1c31`, rama
  `codex/avisos-correcciones`, desde `4eee240`.
- Sartre reproduce y revisa independientemente. El gestor aprueba los
  cherry-picks tras revision y suite integrada; ninguna asignacion equivale
  a una entrega terminada ni a autorizacion de produccion.
- La continuacion automatica se mantiene dentro del trabajo activo. Un estado
  idle no acredita ejecucion ni avance; comprobar entrega y evidencia antes
  de pasar de etapa. No se crea una automatizacion programada en esta integracion.

Checklist durable para cada pieza pendiente:

- [ ] Entrega identificada por commit y pruebas del operador.
- [ ] Revision independiente y reproduccion de hallazgos.
- [ ] Correcciones verificadas por el revisor.
- [ ] Integracion local candidata bajo gestion, sin publicacion.
- [ ] Unitarias y PostgreSQL del arbol integrado; aprobacion del cherry-pick
  por el gestor tras revision y suite integrada.
- [ ] Preview y recorridos verificados.
- [ ] Aprobacion explicita de produccion y publicacion comprobada.
- [ ] Firma del founder en Safari y su telefono.

El primer lote Nuevos20 conserva su cierre publicado; los restantes lotes no
heredan esa autorizacion. Esta rama queda disponible para continuar la gestion,
sin sincronizar otros commits, tocar el CLAUDE.md ajeno, push ni deploy.

Verificacion de esta integracion del copy: `npm test`, 657 pruebas en 61 archivos
correctas; `npm run typecheck` correcto. No se ejecutan PostgreSQL, build ni QA
visual en este paso acotado; no sustituye las revisiones y pruebas pendientes
de cada entrega. Diff comprobado y fetch antes del commit local por nombres.

## Politica de modelos y estado comprobado (2026-09-18)

El founder pide operadores asequibles. Politica para estas dos piezas:
gestor y revision independiente con Astra; operadores de direccion y avisos
con Terra high. Luna queda reservada para tareas simples futuras.

Segun la verificacion del gestor mediante `turn_context`, ambos chats nuevos
arrancaron con Astra high por defecto. El gestor ya envio a ambos la
configuracion Terra high mediante `send_message_to_thread` con override de
modelo. El envio no demuestra que el turno actual haya cambiado: si no cambia,
se deja un checkpoint y se continua con Terra. El modelo efectivo posterior
queda pendiente de verificar en metadata; no se afirman porcentajes de ahorro.
Esta anotacion no ejecuta trabajo operativo adicional ni declara entregas
terminadas o nueva autorizacion de produccion.

## Checkpoint de candidato integrado y ensayo local (2026-09-18)

Interrupcion del gestor para continuar con Terra, conservando lo ejecutado.
Metadata confirmada por el gestor: este turno de integracion uso Astra high,
no Terra; no se infiere el modelo por el prompt. Las sesiones de direccion y
avisos si fueron confirmadas en gpt-5.6-terra/high a las 22:18:01.200Z y
22:17:47.409Z, desde checkpoints 0f2bd3d y c33e955 respectivamente.

Codigo integrado en `ff017cb`: direccion `0f2bd3d` + `4d032113` y avisos
`c33e955` + `22e996d`, sobre `086153e` que ya contiene el copy de Entrar.
Se incorpora ademas el merge de main `e6905e8`: solo agrega a 108 su apendice
de autorizacion y QA, sin diferencia adicional de codigo. Se conservan
CLAUDE.md ajeno, bit056 e historial completo de OPEN_LOOPS. No se incorporan
carriles ni los commits documentales `623058d`, `61e632d`, `60e1d09`.

Decision vigente comunicada por el gestor: founder autoriza publicar todo el
trabajo de fase 1 y revoca la suspension anterior de carriles. Carriles mantiene
PR separado; este encargo sigue siendo local, sin PR, SQL remoto, push ni deploy.
La activacion de avisos requiere una respuesta separada todavia pendiente.
Sartre emitio dictamen favorable segun el gestor: tres P2 cerrados y sin nuevos
bloqueantes; evidencia propia del revisor 65 unitarias, 14 Chrome y 163 checks PG.
No se repitieron esas reproducciones ni se atribuyen al integrador.

Suite integrada ejecutada una vez: 662 unitarias en 61 archivos, 42 migraciones
y 658 checks PG correctos mediante el runner con lock local 55439; typecheck
y build correctos. Lint sin errores, warning previo en iconos-sn.mjs:57.
62 recorridos de componentes correctos: 41 flyer/direccion, 13 cupo, 2 guardado
y 6 Nuevos. Capturas propias en `/tmp/sn-cierre-candidato-086153e`; inspeccionadas
pin publico a 390/1280 y reservado a 390. Mapbox con estilo local, geocoding y
transporte simulados; no certifica servicios reales ni Safari. Build con variables
de proveedores vacias. Sin nuevas funcionalidades ni repeticion de suites.

Ensayo del dump exacto comunicado por el gestor:
`/Users/apple-1/Backups/somosnosotros/2026-09-18T22-37-38.411Z-pre-fase1-final/supabase.dump`,
817611 bytes, SHA256 `4974565da8ca1b708b1cd2011871d425da1f258dd6f3992c515a2535048fa1c4`
comprobado antes de restaurar. PostgreSQL 17.11 independiente en socket privado
`/tmp/sn-fase1-restore.Lwu7ar`, listen_addresses vacio, sin TCP ni uso de roles
del servidor compartido. Roles locales anon/authenticated/service_role.
pg_restore con no-owner/no-privileges, exit-on-error y single-transaction.

Limitacion concreta: PG17 local no dispone de supabase_vault. Se excluyeron solo
su entrada de extension, comentario y TABLE DATA vault.secrets mediante una lista
TOC temporal; el dump original no se edito ni se leyeron valores secretos.
La restauracion restante termino correctamente y las nueve migraciones pendientes
17160000, 17170000, 18100000, 18110000, 18120000, 18130000, 18140000, 18150000
y 18160000 se aplicaron sin error, cada una en transaccion. El ledger restaurado
se dejo en 33 filas: no se simulo un registro de despliegue remoto.

Conteos antes/despues: cuentas 10/10, perfiles 10/10, eventos 88/88, artistas
526/526, lugares 58/58, asistencias 22/22, sitio privado 1/1, suscripciones push
6/6, avisos enviados 7/7, novedades 2/2, objetos Storage 385/385. Las restantes
tablas preexistentes conservaron conteo salvo indicadores_diarios, 3/2. Esa
diferencia disparo el control estricto del script (exit 1) despues de aplicar las
nueve migraciones; 17170000 contiene expresamente el DELETE de la foto de hoy
para regenerarla. No se afirma igualdad total de conteos ni aprobacion del ensayo.

Limpieza terminada aun tras ese control: PG privado detenido y directorio temporal
eliminado, incluido el TOC derivado. No se paro ni altero 55439. No se expusieron
filas personales. No se probaron owners/grants originales, Vault, Auth/Storage/CDN
ni bytes de imagen. Pendientes para el gestor: aceptar o completar la limitacion
de Vault y el control de conteos, aprobar el ensayo SQL, autorizar PR del candidato,
preview, publicacion y comprobacion en telefono; activar avisos se decide aparte.
Este checkpoint no declara restauracion integral aprobada ni despliegue realizado.

## Ensayo canónico terminado y candidato con carriles (2026-09-18)

El gestor confirmó este turno de continuidad en Terra high a las 22:44:21. No se
abrieron agentes ni se repitieron las baterías previas: se corrigió solamente el
criterio de comparación del ensayo de restauración. La primera comparación usaba
la representación JSON de `guardado_en`; las migraciones cambian la zona de la
sesión y un `timestamptz` se serializa distinto sin que la fila cambie. El
agregado final usa época UTC canónica, sin mostrar filas ni datos personales.

El dump verificado se restauró de nuevo en PostgreSQL 17.11 temporal, solo por
socket Unix privado y sin TCP; roles locales anon/authenticated/service_role,
`no-owner`, `no-privileges`, `exit-on-error` y `single-transaction`. Se
excluyeron exactamente tres entradas TOC de Vault: extensión `supabase_vault`,
su comentario y `TABLE DATA vault.secrets`. No existe esa extensión local; no se
instaló, no se leyó ningún secreto y el dump mantuvo su SHA256 antes y después.
Por ello es un ensayo de esquema y datos no-Vault, no una restauración integral
de Vault, Auth/Storage/CDN ni bytes de imágenes.

Resultado: las nueve migraciones pendientes se aplicaron sin error sobre las
33 del dump. De 60 tablas originales, 59 mantuvieron su conteo. La única
variación es `public.indicadores_diarios`, de 3 a 2: había exactamente una fila
del día de México y 17170000 la borra explícitamente para recalcularla. Las dos
filas históricas conservaron el mismo agregado canónico. El ledger restaurado
permanece en 33 filas porque el ensayo no simula el registro remoto de un
despliegue. La instancia y su TOC temporal se detuvieron y eliminaron; 55439 no
se tocó. Esto resuelve la discrepancia de conteo, pero no convierte la limitación
de Vault en aprobada: el gestor debe decidirla antes de autorizar SQL remoto.

Se actualizó la base del candidato con `origin/main` `0a305989381c5a4eb47cd32e040c3174cf63114b`
(PR #103, carriles semanales). El merge fue limpio: conserva la selección y
presentación de `sitio_direccion`, no revive el texto antiguo de Entrar y suma
los carriles en Artistas y Lugares. La bitácora 117 y OPEN_LOOPS de main quedan
incluidos sin borrar su historia. SQL no cambió al sumar carriles, así que no se
repitieron PG ni restauración. Pruebas de la combinación: 679 unitarias en 63
archivos, typecheck y build correctos con variables de proveedor vacías. Siguen
pendientes la aprobación del gestor para abrir PR, preview y revisión visual del
candidato; nada se publica ni se activa. La pregunta separada para activar
entregas reales de avisos/cron continúa pendiente.
