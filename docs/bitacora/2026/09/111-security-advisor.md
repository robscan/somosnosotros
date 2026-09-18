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

Actualizacion posterior del gestor: el hardening de funciones de esta bitacora
se integro en el cierre local junto con CAPO y Storage. El catalogo de las 43
funciones desplegadas se contrasto contra main y contra el dump restaurado,
coincidiendo cuerpo, modo y path. Auth y listado de Storage se detallan en la
bitacora [114](114-storage-minimo.md); existen seis cuentas con contrasena y la
proteccion filtrada requiere Pro. No se ha cambiado produccion ni vuelto a
calcular su Advisor despues de un despliegue; los conteos originales no son
resultados de las correcciones locales. Las reservas CAPO se resolvieron con
18120000 y su integracion, conservando arriba la historia inicial.

- [Funciones y permisos](https://supabase.com/docs/guides/database/functions).
- [Aviso de EXECUTE para authenticated](https://github.com/supabase/splinter/blob/main/docs/0029_authenticated_security_definer_function_executable.md).
- [RLS y denegacion por defecto](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [Seguridad de contrasenas](https://supabase.com/docs/guides/auth/password-security).

## Implementacion local de OL-077: catalogo y permisos

2026-09-18. Worktree `somosnosotros-security-advisor`, rama `codex/security-advisor`,
base `dd59a0f`. Autorizacion del gestor: nueva migracion
`20260918130000_security_advisor.sql`, su banco PG y esta seccion. Sin cambios a
OPEN_LOOPS, Storage, Auth, credenciales, servicios ni produccion. El inventario
anterior es de produccion; la matriz siguiente se obtuvo del catalogo de la base
temporal creada por el runner, despues de aplicar las migraciones de esta rama.
La seccion anterior "Pendiente implementacion" describe el estado de apertura;
esta implementacion local sigue pendiente de revision e integracion autorizada.

### Hallazgos y correccion

- P2 preexistente confirmado: `van_por_evento` y `cuenta_seguidores` contaban
  actividad de fichas ocultas/privadas para cualquier caller con sus UUID, aunque
  RLS impidiera leer dichas fichas. Reproduccion: crear una asistencia y dos
  seguimientos de un perfil reservado; ocultar evento/artista y marcar privado el
  lugar; como anon, consultar los UUID. Antes: 1 asistente, 1 seguidor de cada
  ficha. Ahora: ninguna fila de evento y 0 seguidores. Autor/admin conservan los
  conteos; una cuenta ligada conserva los de sus fichas, no los del evento ajeno.
  Se preservan firmas, tipos y conteos de perfiles reservados en fichas accesibles.
- Endurecimiento: las 51 funciones propias auditadas quedan con `search_path=''`.
  Sus relaciones y ayudantes ya usan `public`, `auth` o `extensions`; no fue
  necesario copiar los otros cuerpos. Los builtins se resuelven en pg_catalog.
  En esta base habia 10 funciones sin path, no 8: incluye `inicio_del_mes` y
  `tope_de_cartel_base`, de la pieza de cupos pendiente. No se atribuyen estos dos
  avisos adicionales a produccion sin contrastar su catalogo.
- Nueve funciones trigger quedan sin EXECUTE para PUBLIC/anon/authenticated.
  Registro, controles de rol/autor, orden, duplicados, zona y push siguen
  disparando sus triggers instalados. Tambien se prueba que un usuario no puede
  instalar `crear_perfil` ni `proteger_rol` sobre una tabla temporal controlada.
  Tener EXECUTE de un trigger no demuestra por si solo una explotacion via REST:
  no son RPC ordinarias; se cierra ademas su posible reutilizacion por SQL.
- `es_admin` y `gestiona_evento` pasan a INVOKER: perfiles tiene SELECT publico y
  el SELECT de eventos no llama a gestiona_evento. No hay ciclo. Se mantienen los
  permisos que necesitan sus politicas y los triggers invoker.
- Seis consultas de panel pasan a INVOKER: artistas, eventos, lugares,
  fichas_conteos, destacados y pendientes. Conservan su guarda es_admin y las
  lecturas que las politicas ya permiten al admin. El banco compara las listas
  del admin con las mismas consultas con bypass RLS: resultados completos iguales.
- `es_admin_de_origen`, `tope_de_cartel_base` y la regla vieja `sin_pasar` dejan de
  exponerse al cliente. No hay llamadas de la app a esas firmas: origen se usa
  dentro de los definers de rol/perfil, tope dentro del cupo y sin_pasar no tiene
  consumidores vigentes. `inicio_del_mes` mantiene EXECUTE authenticated porque
  lo usa panel_pendientes, ahora invoker. No se revocan ayudantes por su nombre sin
  comprobar las dependencias.
- Se elimina el grant implicito a PUBLIC en las 51 firmas. Roles explicitos por
  grupo, con service_role conservado expresamente; no se cambian defaults para
  funciones futuras ni objetos de extensiones o de otras piezas.

### Matriz completa local

Todas las firmas pertenecen a `public`. I = INVOKER, D = DEFINER; A = anon,
U = authenticated. "Interna" significa sin EXECUTE cliente, incluido el admin
de la app. El owner SQL y service_role conservan ejecucion en todas estas firmas.
Los permisos U no convierten a cualquier usuario en admin: se valida la identidad
JWT y el rol dentro del cuerpo o se limita la operacion a auth.uid().

| Firma | Modo final | Clientes | Control y dependencia |
|---|---|---|---|
| `apartar_lectura_de_cartel()` | D | U | Solo auth.uid; cerrojo/cupo y escritura en tabla cerrada. |
| `artista_sin_duplicado()` | I | Interna | Trigger; mantiene RLS y normalizar_nombre. |
| `artistas_con_nombre(text)` | I | A,U | Solo visibles, RLS y limite 6. |
| `borrar_mi_cuenta()` | D | U | Exige uid; borra solo ese auth.users, cascadas previstas. |
| `cambiar_destacado(text,uuid,text,timestamptz,timestamptz)` | D | U | es_admin, enum/plazos; tabla sin INSERT/UPDATE cliente. |
| `cambiar_rol(uuid,text)` | D | U | Origen, confirmacion, fila bloqueada; proteger_rol registra. |
| `crear_perfil()` | D | Interna | Trigger auth.users; rol por email real, no metadata. |
| `cuenta_seguidores(uuid,uuid)` | D | A,U | Conteo sin identidades, ahora exige acceso a cada ficha. |
| `dar_mas_lecturas(uuid)` | D | U | es_admin; registra quien cambia el cupo, tabla cerrada. |
| `detalles_de_disciplina(text,text,integer)` | I | A,U | Artistas visibles via RLS. |
| `disciplinas_con_artistas(text)` | I | A,U | Artistas visibles via RLS. |
| `distancia_m(double precision,double precision,double precision,double precision)` | I | A,U | Calculo puro; dependencia de lugares_parecidos invoker. |
| `es_admin_de_origen()` | D | Interna | JWT + rol + email en lista interna; usados solo por definers. |
| `es_admin()` | I | A,U | Consulta perfil propio; perfiles SELECT publico, sin recursion. |
| `eventos_zona_del_lugar()` | D | Interna | Trigger lee zona del lugar aun cuando el caller no lo ve. |
| `gestiona_artista(uuid)` | D | A,U | Autor/ligado/admin; evita recursion de artistas SELECT. |
| `gestiona_evento(uuid)` | I | A,U | Autor/admin; eventos SELECT no lo llama. |
| `gestiona_lugar(uuid)` | D | A,U | Autor/ligado/admin; evita recursion de lugares SELECT. |
| `guardar_indicadores()` | D | Interna | Tarea service_role; calcula y escribe snapshot interno. |
| `indicadores_ahora()` | D | Interna | Usa auth.users, actividad reservada y rol_en; no RPC cliente. |
| `inicio_del_mes()` | I | U | Calculo puro; necesario para panel_pendientes invoker. |
| `limitar_suscripciones_push()` | D | Interna | Trigger; conteo bajo cerrojo y cuota por usuario. |
| `lugares_con_nombre(text)` | I | A,U | Visibles/no privados, RLS, minimo 4 caracteres y limite 5. |
| `lugares_parecidos(text,double precision,double precision,uuid)` | I | A,U | Visibles/no privados, RLS, normalizacion y distancia. |
| `lugares_zona_a_sus_eventos()` | D | Interna | Trigger sincroniza fechas de eventos ajenos al cambiar zona. |
| `marcar_visto()` | D | U | Solo uid existente; un dia por cuenta, sin escritura directa. |
| `mi_cupo_de_cartel()` | D | U | Solo uid; lee sus reportes/lecturas/topes internos. |
| `normalizar_nombre(text)` | I | A,U | Calculo; extensions.unaccent cualificado, usado por triggers. |
| `panel_artistas(text,text,integer,integer)` | I | U | es_admin + RLS; limite acotado. |
| `panel_comunidad()` | D | U | es_admin antes de leer auth y rol_en internos. |
| `panel_correo(uuid)` | D | U | es_admin; acceso puntual a auth.users. |
| `panel_destacados(text)` | I | U | es_admin + RLS; llama tira_destacados con ACL publica. |
| `panel_eventos(text,text,integer,integer)` | I | U | es_admin + RLS; limite acotado. |
| `panel_fichas_conteos(text)` | I | U | CASE es_admin + RLS; null sin permiso. |
| `panel_lugares(text,text,integer,integer)` | I | U | es_admin + RLS; incluye privados legitimamente para admin. |
| `panel_pendientes()` | I | U | es_admin + RLS; lecturas/topes legibles por admin, limite 100. |
| `panel_persona(uuid)` | D | U | es_admin; auth.users, lista origen y es_admin_de_origen. |
| `panel_personas_conteos()` | D | U | CASE es_admin; auth.users, null sin permiso. |
| `panel_personas(text,text,integer,integer)` | D | U | es_admin; auth.users, correo parcial, limite 1..600. |
| `panel_resumen()` | D | U | es_admin; indicadores internos y escritura sin politica cliente. |
| `poner_nombre_orden()` | I | Interna | Trigger usa normalizar_nombre, permiso helper conservado. |
| `proteger_autor_y_visible()` | I | Interna | current_user debe seguir siendo caller; no convertir a D. |
| `proteger_rol()` | D | Interna | Exige origen, protege fundador, escribe auditoria cerrada. |
| `push_endpoint_permitido(text)` | I | A,U | Validador puro; necesario para CHECK al escribir suscripcion. |
| `rol_en(uuid,timestamptz)` | D | Interna | Lee historial interno para indicadores, sin API cliente. |
| `sin_pasar(timestamptz,timestamptz)` | I | Interna | Regla historica sin consumidores vigentes. |
| `tira_destacados(text,text)` | D | A,U | Maximo 8; filtra visibles/no privados, cuenta reservas sin identidad. |
| `tocar_actualizado_en()` | I | Interna | Trigger de timestamp en filas; no API. |
| `tope_de_cartel_base()` | I | Interna | Constante consumida solo dentro de definers de cupo. |
| `van_por_evento(uuid[])` | D | A,U | Cuenta reservas sin identidad, ahora exige acceso al evento. |
| `zona_valida(text)` | I | A,U | Validador puro usado por CHECK; pg_catalog.timezone cualificado. |

### Evidencia de pruebas locales

- Instalacion local `npm ci --ignore-scripts --no-audit --no-fund`, sin scripts ni
  instalaciones globales. Aviso de engine: Node local 22.6 frente a >=22.13 de
  eslint-visitor-keys; lint de este archivo termino correctamente.
- Baseline antes de editar: 36 migraciones, 122 comprobaciones, 0 fallos.
- `TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55439/postgres npm run test:db`
  con `PGPASSFILE=/dev/null`: 37 migraciones, 428 comprobaciones, 0 fallos. De ellas,
  306 nuevas cubren catalogo, anon, usuario, ajeno, ligado, admin nombrado, origen,
  sesion sin uid, ausencia de efectos en denegaciones y consumidores legitimos.
- Control negativo en memoria, sin editar archivos: restaurar solo los dos cuerpos
  antiguos de agregados dentro de la base temporal, manteniendo path y ACL nuevos.
  Resultado esperado: 3 fallos sobre 428, exactamente las comprobaciones de conteos
  inaccesibles (anon, usuario ajeno y ligado sin permiso sobre el evento).
- Path hostil con funcion `es_admin`/`lower` falsas y tabla temporal `perfiles`:
  no concede admin, no cambia la normalizacion y no rompe la RPC legitima.
- Registro ignora metadata que pide rol admin; nombrado no asciende ni degrada
  cuentas por RPC o UPDATE; origen puede nombrar y queda auditoria. Triggers sin
  EXECUTE cliente siguen activos, incluida la propagacion de zona a evento ajeno.
- `npx --no-install eslint supabase/tests/pg/security-advisor.test.mjs`: correcto.
  Sin cambios TS/UI: no se ejecutan build ni captura visual, no aplican a esta pieza.
- El runner uso su cerrojo y bases/roles efimeros; el servidor compartido del puerto
  55439 no fue arrancado ni apagado. No se enviaron notificaciones ni correos.

### Excepciones y pendientes de despliegue

1. No se promete cero warnings. En el catalogo local resultante quedan 5 grants
   anon y 18 authenticated sobre DEFINER (23 avisos potenciales, no 23 funciones
   distintas): RLS recursiva, agregados sin identidades y API controlada. Las
   negativas anon/usuario/ajeno y positivas admin justifican conservarlos.
   Las 51 firmas auditadas ya no tienen path sin fijar ni EXECUTE para PUBLIC.
2. El banco reproduce PostgreSQL, no PostgREST, Auth ni Storage reales. Antes de
   aplicar se debe contrastar con produccion la definicion, owner, proconfig y ACL
   de estas firmas, los grants de tablas y las politicas de perfiles/eventos.
   Los conteos previos 49/4 por si solos no prueban ausencia de drift. SQL de solo
   lectura sugerido al gestor: `select p.oid::regprocedure, p.prosecdef, p.proconfig,
   p.proacl, pg_get_userbyid(p.proowner), pg_get_functiondef(p.oid) from pg_proc p
   join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and not exists
   (select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid
   and d.deptype='e') order by 1;`. No se consulto produccion en esta tarea.
3. La migracion usa ALTER por firmas explicitas: conserva cuerpos posteriores de
   indicadores/cupo y no toca guardar_evento_completo de OL-075. Solo reemplaza los
   dos agregados descritos. Debe aplicarse tras sus predecesoras y revisar futuras
   recreaciones de funciones: los defaults de Supabase pueden volver a dar permisos
   publicos; no se cambiaron a ciegas porque otras piezas dependen de ellos.
4. Las cuatro tablas sin politicas siguen deliberadamente cerradas al cliente,
   incluido admin, con pruebas: admin_correos, avisos_enviados, contactos_importados
   e invitaciones_enviadas. El acceso interno mediante servicio no es una politica
   publica faltante. No se agregaron politicas para quitar los INFO.
5. Storage sigue pendiente del criterio de privacidad del material. Propuesta:
   impedir listado anon del bucket sin confundirlo con servir URLs publicas;
   separar originales, carteles no publicados y material reservado en un bucket
   privado con acceso por owner/autorizacion y URLs firmadas de corta duracion.
   Quitar SELECT amplio de un bucket publico no vuelve privadas sus URLs conocidas.
   Requiere inventario de usos, migracion de objetos/referencias y pruebas reales de
   subir, ver, listar y borrar como anon/owner/ajeno/admin. Nada de esto se cambio.
6. Auth no fue modificado ni consultado remotamente. La interfaz OTP/OAuth no
   demuestra que la API password este deshabilitada. Pedir al gestor metadata de
   metodos habilitados y disponibilidad de proteccion de passwords filtrados;
   decidir habilitarla o cerrar el metodo segun contrato/plan y aprobacion aparte.
7. Integracion, comparacion de catalogo y nueva lectura del Advisor requieren el
   gestor; produccion sigue sin autorizacion. Los tres hallazgos de OL-075 siguen
   con el parent, no se duplican aqui. No se toca CAPO 110/OL-076.

Referencia tecnica adicional: PostgreSQL documenta los cuidados de
[SECURITY DEFINER y search_path](https://www.postgresql.org/docs/16/sql-createfunction.html)
y el requisito EXECUTE al
[crear un trigger](https://www.postgresql.org/docs/17/sql-createtrigger.html).
