# 109 - Guardado atomico del evento

Fecha: 2026-09-18. OL-075. Rama: `codex/evento-atomico`.
Reservada migracion `20260918110000_evento_atomico.sql`, despues de push validado.

En construccion: guardar datos publicos, sitio reservado, nuevos artistas y
relaciones en una sola funcion SQL con SECURITY INVOKER. Cualquier fallo revierte
todo. Sin service_role para guardar en nombre de una persona. RLS y triggers de
propiedad siguen vigentes. La funcion no acepta cambiar autor ni visibilidad.

37 migraciones y 140 comprobaciones PostgreSQL aprobadas (25 nuevas): fallo de
direccion, artista ausente y fallo provocado en la ultima insercion revierten
todo, incluso artistas creados durante el intento. Otra cuenta no edita; la
direccion privada no se expone; autor/visibilidad no se toman del JSON.
Cinco pruebas nuevas de acciones aprobadas, incluyendo ausencia de avisos y
redireccion ante fallo y revalidacion de fichas anteriores. Typecheck aprobado.
Pendiente revision independiente y prueba completa antes de integrar/publicar.

## Revision independiente y correcciones

Astra reprodujo tres P2: sobrescritura desde una version antigua, reintento del
alta que duplicaba evento y reparacion de una direccion privada ausente sin
reconocer cambio. Sin P1 nuevo de permisos ni rollback.

Corregidos localmente: la edicion exige actualizado_en de la pantalla inicial,
comparado bajo FOR UPDATE; el conflicto no cambia datos y conserva el formulario
con enlace a la version actual en otra pestaña. Cada envio conserva una clave
UUID mientras sus datos no cambien. El alta usa ese UUID como id y serializa
reintentos concurrentes; una cuenta ajena no puede recuperarlo como propio. La
ultima edicion confirmada recuerda la operacion y un reintento no reescribe.
Una operacion posterior invalida el reintento antiguo mediante la revision.
La ausencia de direccion reservada anterior tambien produce cambio de lugar.

Verificados 148 checks PostgreSQL, incluidos dos clientes creando a la vez con
la misma clave, y 11 tests focalizados de acciones/claves. Build aprobado.
La clave vive en el formulario, no es un nuevo borrador persistente ni un secreto.
El contrato es primer resultado para una clave; cambiar campos crea otra clave.

NO listo para publicar todavia: falta cola transaccional de avisos, para que
perder la respuesta despues del commit no pierda el envio. El codigo after actual
no garantiza esa recuperacion; el reintento por si solo no la resuelve. Falta
revision independiente de estas correcciones y prueba visual del conflicto.

## Verificacion posterior del formulario

El gestor agrega `guardado.componentes.test.mjs`: dos recorridos en Chrome real,
390x844 y 1280x844, con FormularioEvento real y accion simulada, sin escrituras
remotas. Un error conserva titulo y operacion; reintentar sin cambios repite UUID;
cambiar un campo crea otro. Un refresh de props no reemplaza la revision inicial.
Un conflicto mantiene la edicion y ofrece enlace con target blank/noopener a la
ficha actual, sin ejecutar la salida de guardado correcto.

Ambas pruebas pasan. Capturas completas examinadas en
`/tmp/sn-guardado-109/conflicto-390.png` y `conflicto-1280.png`: texto y enlace
legibles, sin desborde horizontal ni superposicion con Guardar cambios. CSS real,
fuente local Arial en el harness; otros selectores simulados, no se afirma prueba
de esos recorridos ni de Safari. Primera ejecucion corregida por usar un doble
con general dentro de errores en vez del contrato real (general separado).

Reproduccion: variables PLAYWRIGHT_MODULE y CHROME_EXECUTABLE del banco de cupo,
GUARDADO_SCREENSHOTS=/tmp/sn-guardado-109 y
`node --test src/app/eventos/guardado.componentes.test.mjs`.
Lint del archivo correcto. Esto cubre la prueba visual pendiente, no cierra
la cola de avisos ni la revision independiente del conjunto final.
