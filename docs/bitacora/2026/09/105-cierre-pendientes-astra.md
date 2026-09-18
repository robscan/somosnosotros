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
