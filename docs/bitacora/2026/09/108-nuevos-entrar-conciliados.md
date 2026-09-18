# 108 - Nuevos y Entrar conciliados

Fecha: 2026-09-18. OL-074, continuidad de OL-068 y OL-061.
Rama: `codex/cierre-pendientes`.

- Recuperadas las piezas pendientes de Nuevos por publicacion y texto con icono
  de Entrar. Se conserva el arreglo posterior de Atrás de main.
- Nuevos recibe un sello anterior a la consulta del servidor, no la hora de
  hidratacion del navegador. Una consulta fallida no avanza la marca.
- La marca de lectura queda separada por ciudad; una pestaña con una lista vieja
  no retrocede una marca valida mas reciente.
- La memoria de pantalla sigue usando el mecanismo del proyecto, por URL.
  Al cambiar de ciudad se monta la agenda con su propio contexto.
- Pruebas unitarias: 459 aprobadas. Typecheck y lint sin errores; persiste el
  warning previo de iconos-sn.mjs. Capturas locales a 390x844 revisadas: grupos
  por publicacion y fecha del evento en Nuevos; escudo y texto en Entrar.
- Sin firma de iPhone ni produccion. El founder autorizo push de ramas y PR,
  pero exige otra aprobacion para main y migraciones remotas.

## Diagnostico de despliegue

Supabase remoto tiene 33 migraciones, hasta 20260917150000, y PostgreSQL 17.6.
Consulta en transaccion READ ONLY y TLS verificado con el certificado oficial
referenciado por el codigo de Supabase Studio. Seis suscripciones push.
No se cambiaron datos ni configuracion remota.

Respaldo local de public/auth/storage/supabase_migrations creado con pg_dump;
su indice se lee con pg_restore. No incluye los bytes de objetos de Storage
ni equivale a una restauracion ensayada de todo Supabase.

`next dev` agrego automaticamente un bloque de instrucciones a CLAUDE.md.
No se incluye con estos cambios de producto ni se elimina a la fuerza.
