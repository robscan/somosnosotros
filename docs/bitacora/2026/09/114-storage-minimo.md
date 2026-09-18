# 114 - Listado minimo de fotos y limites de privacidad

Fecha: 2026-09-18. OL-080. Rama: `codex/storage-minimo`.
Base: `7a6bdc7`, cierre integrado con guardado atomico, Security Advisor y CAPO.
Numeros reservados por gestion; el script aun no ve todas las reservas 113-115.

## Cambio preparado, no aplicado en produccion

- Migracion `20260918150000_storage_listado_minimo.sql`: sustituye la lectura
  general de metadatos de `storage.objects` por listado propio para usuarios
  autenticados y listado de fotos para administracion. No abre otros buckets.
- Se mantienen las politicas de insertar, cambiar y borrar en carpetas propias
  `perfiles`, `lugares` y `artistas`. Administracion no gana escritura ajena.
- El bucket `fotos` permanece publico. No se mueven ni borran archivos, no se
  cambian URL existentes, formatos o limite de 5 MB.
- Nuevas fotos del cliente usan UUID aleatorio en vez de hora y `upsert: false`.
  Se evitan nombres temporales predecibles y sobrescrituras por colision. Los
  scripts de importacion existentes quedan fuera de este cambio.

## Verificacion local

- 40 migraciones aplicadas desde cero en PostgreSQL 17 aislado, 495 comprobaciones
  correctas (19 nuevas de Storage). Se prueban anon, autora, otra cuenta, admin,
  authenticated sin uid y service_role; escritura propia, transferencia denegada,
  otros buckets y preservacion de configuracion.
- 532 pruebas unitarias correctas; 7 nuevas para subirFoto, UUID, opciones de
  upload, reduccion, error, falta de cliente y limite de tamano.
- Build y typecheck correctos. Lint sin errores, una advertencia heredada en
  `docs/diseno/logotipo/iconos-sn.mjs:57` (variable k).
- La primera comprobacion del limite comparaba bigint de pg (string) con number;
  se corrigio la expectativa, sin cambiar el limite de la base.
- Sin peticiones de subida, eliminacion o cambios al proyecto remoto.

## Lo que esto no garantiza

RLS sobre metadatos no hace privada la imagen de un bucket publico. Quien conoce
una URL puede leerla, incluso si el flyer no se ha publicado o contiene una
direccion reservada. UUID y listado restringido reducen enumeracion, no son
autorizacion. No se debe anunciar este cambio como privacidad de flyers.

Un flujo de imagenes temporales/privadas y publicacion explicita requiere una
pieza adicional, politicas, limpieza y una decision sobre flyers de eventos
reservados. No se implementa silenciosamente en esta migracion.

Referencia oficial: [buckets publicos y privados](https://supabase.com/docs/guides/storage/buckets/fundamentals).

El banco SQL emula tablas de Storage, no su servidor HTTP ni CDN. Antes de dar
por cerrado el despliegue deben probarse una URL publica existente, una nueva
subida y su visualizacion, reemplazo y borrado autorizado en entorno aprobado.
No se ha hecho esa prueba con escrituras reales en produccion.

## Diagnosticos remotos de solo lectura del gestor

- Catalogo de las 43 funciones de aplicacion desplegadas comparado con una base
  local de las 33 migraciones de main: cuerpo (hash), modo de ejecucion,
  search_path y privilegios anon/authenticated coinciden. Se excluyeron funciones
  de extensiones, instaladas en esquemas distintos en el banco local.
  Esto contrasta el punto de partida, no prueba las migraciones pendientes.
- Auth: plan Free, Email/Apple/Google habilitados, altas y confirmacion de correo
  activas, acceso anonimo desactivado. Diez cuentas; seis tienen contrasena
  registrada. Solo se guardan conteos, no correos, identidades ni hashes.
- Proteccion contra contrasenas filtradas desactivada; el panel la reserva al
  plan Pro. Por ello no se descarta el warning argumentando que la interfaz usa
  codigos. Cambio seguro de correo activo; cambio seguro de contrasena y exigir
  contrasena actual desactivados. No se pudo comprobar el minimo de longitud.
- No se cambio Auth ni se contrato un plan. Antes de proponer medidas gratuitas
  hay que verificar compatibilidad con recuperacion y cuentas ya existentes;
  no se resetean contrasenas ni se invalidan sesiones por esta pieza.

Referencia oficial: [seguridad de contrasenas](https://supabase.com/docs/guides/auth/password-security).

## Publicacion y recuperacion

Pendiente de PR, revision y aprobacion separada para migracion/produccion.
Aplicar despues del hardening de funciones 18130000 y del outbox reservado
18140000. La migracion no elimina objetos ni datos; si bloquease un recorrido,
detener el despliegue y preparar una correccion revisada. Restaurar el listado
publico anterior reabre el riesgo, no es un rollback que se aplique sin avisar.

Respaldo previo: `Backups/somosnosotros/2026-09-18-pre-publicacion/supabase.dump`
(ruta bajo /Users/apple-1). Archivo custom comprobado con pg_restore --list;
sin ensayo de restauracion y sin los bytes de los objetos de Storage. No se
describe como recuperacion integral validada.

## Ensayo posterior del gestor: restauracion local

La limitacion anterior refleja el estado al crear la pieza. Despues, en esta
misma fecha, se restauro el dump completo en una instancia PostgreSQL 17 nueva,
accesible solo por socket Unix dentro de una carpeta temporal privada, sin TCP.
Se prepararon roles anon/authenticated/service_role y extensiones unaccent,
pgcrypto y uuid-ossp. `pg_restore --no-owner --no-privileges --exit-on-error`
termino correctamente. El primer intento detecto el esquema public vacio que
crea PostgreSQL; se retiraron solo esos esquemas vacios de la instancia temporal
y se repitio la restauracion. El respaldo original no se modifico.

Conteos restaurados: 10 cuentas y perfiles, 88 eventos, 526 artistas, 385
metadatos de Storage y 33 migraciones. Las 43 funciones de aplicacion coinciden
en hash del cuerpo, modo y search_path con el catalogo remoto de solo lectura.
Se aplicaron sobre esa copia, sin errores, las siete migraciones pendientes
17160000, 17170000, 18100000, 18110000, 18120000, 18130000 y 18150000; los cinco
conteos de datos anteriores se conservaron. Outbox 18140000 y direccion 18160000
todavia no estaban integrados, por lo que no se atribuye ese ensayo a ellos.

La instancia se detuvo y su carpeta temporal se elimino al acabar. No se
exportaron filas personales a documentos ni se hicieron escrituras remotas.
Este ensayo valida restauracion de esquemas/datos y compatibilidad de esas
migraciones con la copia. No valida owners/grants originales, omitidos de forma
explicita, los servicios Auth/Storage/CDN ni los bytes de imagen. La recuperacion
integral del servicio aun necesita esas piezas y su procedimiento aprobado.
