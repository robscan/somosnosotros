# 295 · Ciudades agregadas y señal de capacidad (OL-268 / H07)

**Fecha:** 2026-10-04 UTC (2026-10-03 en México). **Estado:** candidato local probado; pendiente revisión del gestor, migración remota y publicación.

Reserva inicial en PR321/1d8bf3d9. Rama `topes-lectura`, worktree
`/Users/apple-1/somosnosotros-topes-lectura`, base `1259dd0716780071e128cf57d8c4242957548cec`
(cierre PR322). El script confirmó OL268/bit295 libres.

## Alcance vigente y sustituciones

El Gestor de cambios III redujo explícitamente H07 en su mensaje141:
**b)** ciudades agregadas; **d)** señal de servidor al alcanzar ≥90% de300.
Sustituye a la reserva inicial a)+b)+c): consulta propia de Nuevos y paginación /
filtros antes del corte quedan **diferidos**, hasta observar la señal o petición
del founder, con propuesta visual primero. No se tocaron componentes, páginas,
acciones, `inicio.ts`, `agenda.ts`, ubicación, Lugares ni `apps/ios`.

Mensaje145 del gestor autoriza ampliar exclusivamente el respaldo local
`fixture.mjs` y su prueba de paridad para las dos RPC sintéticas: impedir QA con
respuestas vacías a funciones desconocidas. Sin otras modificaciones al respaldo.

## Implementación y seguridad

Migración aditiva reservada `20261004090000_ciudades_agregadas.sql`:

- `ciudades_agregadas(p_ahora timestamptz default now())`: grupos por ciudad/zona,
  número de lugares públicos, eventos visibles vigentes, suma de coordenadas de
  lugares. Usa `eventos.termina`, conservando fin explícito o medianoche local y
  frontera inclusiva. No consulta copias reservadas de direcciones.
- `ciudades_artistas_agregadas()`: número de artistas visibles por ciudad.
- Ambas `STABLE SECURITY INVOKER`, `search_path=''`, sin EXECUTE para PUBLIC;
  ejecución para anon/authenticated/service_role. RLS sigue siendo la del actor.
  Filtros explícitos de visible/no privado también excluyen ocultos del admin.
  Devuelven una lista JSON escalar para que PostgREST no trunque grupos por su
  límite de filas. No devuelven IDs, nombres individuales ni direcciones.
- La app mantiene `ciudadCanonica`: Soledad se une a SLP; se preservan centro
  ponderado, zona mayoritaria/desempate, ciudad inicial, orden y zoom. React cache
  conserva la deduplicación por petición. Error de RPC: respaldo inicial existente
  y aviso estático, sin detalles del servicio. No se descargan fichas individuales.
- Agenda conserva su tope300 y comportamiento. Aviso estático
  `[agenda] capacidad: lectura al 90% del tope` desde270 filas; sin personas, IDs,
  ciudades o payload. Es un registro en servidor, no monitor ni notificación.

No altera tablas, políticas, datos, Auth, dependencias ni variables. Orden de
publicación: revisar y aplicar las dos funciones aditivas antes de usar el nuevo
loader; validar las RPC con roles reales y la preview; unir solo con `verificar`
correcto sobre el SHA exacto. Ante fallo, revertir código a la versión anterior;
las funciones aditivas pueden permanecer sin uso. No aplicar SQL remoto antes de
la revisión/ventana del gestor.

## Evidencia

- Reproducción antes:21 pruebas,7 fallos esperados/14 correctas (loader antiguo
  descargaba filas y no emitía señal a270/300). Después29 focalizadas correctas;
  se agregó además paridad del respaldo con la app:1 prueba correcta.
- PostgreSQL17.11 local aislado en loopback:75 migraciones,1391 comprobaciones,
  cero fallos. Nuevas33:5001 artistas y5002 eventos sin corte; roles anon, autora,
  admin y service_role; ocultos/privados/vencidos excluidos; salida sin campos
  individuales; frontera exacta y posterior en3 zonas; políticas restrictivas
  sintéticas demuestran RLS del invocador; metadatos de seguridad. Transacción
  revertida, base/roles de prueba eliminados y servidor propio detenido.
- Suite1869 unitarias /136 archivos correcta (7,46s); tipos correctos; lint sin
  errores, solo warning anterior de `page` en VisorImagen.componentes.test.mjs.
- Build16s; inventario sin novedades. `medir`:24 pantallas×4 anchos (96),80s,
  sin novedades y sin subir presupuestos.
- App compilada, datos inventados: Inicio/Agenda muestran9 lugares y13 eventos;
  Artistas6. Hojas de ciudad abiertas a390×844, capturas inspeccionadas; cero
  errores de navegador o desbordamiento horizontal. Registro HTTP confirma ambas
  RPC nuevas y ausencia de la lectura antigua `select=ciudad` de fichas.
- La suite completa de componentes queda para CI, reutilizando la ejecución del
  candidato; las2 cuarentenas Linux de OL265 siguen declaradas.

Evidencia local: `/tmp/sn-ol268-evidencia/` (logs, qa.mjs/qa.json, capturas);
copia duradera en el directorio de visualizaciones de esta tarea, `topes-lectura/`.
Las capturas son Chromium automatizado, no Safari físico. Todavía no se ha escrito
SQL ni datos en Supabase para esta pieza.
