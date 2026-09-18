# 111 - Security Advisor como requisito del primer cierre

Fecha: 2026-09-18. OL-077. Gestor: tarea Gestor de cambios.

## Evidencia de solo lectura

El founder pregunta si los 49 warnings y 4 suggestions de Supabase se incluyen
en el alcance. La seguridad ya era parte de la fase, pero estos avisos concretos
no estaban inventariados. Se consulto el panel autenticado y el catalogo de
produccion mediante una transaccion READ ONLY con TLS verificado. No se cambiaron
permisos, datos ni configuracion; no se ejecutaron reparaciones del Advisor.

- 8 funciones con search_path sin fijar. Las ocho son SECURITY INVOKER, no
  SECURITY DEFINER: endurecer su resolucion de nombres, sin confundirlas con
  escaladas de privilegios confirmadas.
- 39 avisos de EXECUTE sobre SECURITY DEFINER: 11 para anon y 28 para
  authenticated. Hay funciones repetidas entre ambos roles, no 39 funciones
  distintas ni 39 vulnerabilidades demostradas. Incluyen triggers, ayudantes RLS,
  consultas publicas y operaciones administrativas.
- 1 bucket publico fotos con SELECT amplio sobre storage.objects. La politica
  vigente permite enumerar objetos del bucket. Revisar fotos/carteles privados
  o aun no publicados y separar visualizar una URL publica de listar archivos.
- 1 aviso de proteccion contra contrasenas filtradas desactivada. La interfaz
  ofrece OTP y OAuth, pero falta verificar la superficie de contrasenas en Auth;
  no se descarta el aviso solo porque la interfaz no muestre ese metodo.
- 4 sugerencias RLS sin politicas: admin_correos, avisos_enviados,
  contactos_importados e invitaciones_enviadas. No agregar politicas publicas
  para quitar avisos: el cierre al cliente es coherente con su uso interno.
- El panel muestra 0 errores. Esto no es certificacion de seguridad.

## Trabajo requerido antes de cerrar la fase

1. Matriz por funcion: firma, roles autorizados, necesidad de privilegios,
   validacion de identidad y dependencias de RLS/triggers. Probar anon, usuario
   ajeno, propietario y administrador; confirmar denegacion sin efectos.
2. Proponer permisos minimos y search_path fijo con nombres cualificados.
   No revocar todo ni cambiar todas las funciones a INVOKER en bloque: puede
   romper registro, administracion y politicas recursivas.
3. Revisar almacenamiento y acceso a material reservado; reducir listado
   manteniendo lectura y gestion legitimas. Pruebas reales de Storage aparte
   del banco PostgreSQL, que no reproduce toda su API.
4. Contrastar Auth y tratar la proteccion de contrasenas segun metodos habilitados
   y disponibilidad del plan. Cualquier cambio de configuracion se aprueba aparte.
5. Dejar evidencia para cada hallazgo corregido o excepcion justificada y volver
   a ejecutar Advisor tras el despliegue autorizado. Ningun aviso se silencia
   por defecto. Una vulnerabilidad grave confirmada bloquea publicacion.

Pendiente implementacion y revision independiente. Este inventario no afirma
que todas las funciones sean seguras ni que las correcciones ya esten listas.

## Coordinacion y autorizaciones

El founder autorizo subir ramas y abrir PR, con aprobacion separada de produccion.
PR 100 (base de pruebas) ya tiene CI y preview Vercel aprobados; no esta mezclado.
Esta revision se agrega al primer cierre de recorridos confiables, no al rediseno.
Reserva externa CAPO: bitacora 110, OL-076, codex/capo-conversiones desde main;
solo metricas honestas de vinculacion posterior, sin tocar envios ni abrir tablas
internas al cliente. Ninguna migracion CAPO reservada hasta revisar contrato.

## Referencias oficiales

- [Funciones y permisos](https://supabase.com/docs/guides/database/functions).
- [Aviso de EXECUTE para authenticated](https://github.com/supabase/splinter/blob/main/docs/0029_authenticated_security_definer_function_executable.md).
- [RLS y denegacion por defecto](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [Seguridad de contrasenas](https://supabase.com/docs/guides/auth/password-security).
