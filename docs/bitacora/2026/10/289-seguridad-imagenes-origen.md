# 289 · Origen de imágenes en la base (OL-262 / H05)

**Fecha:** 2026-10-03. **Estado:** publicado y comprobado; conciliación final de catálogo con gestor pendiente por bloqueo del Mac.
Reserva del Gestor de cambios III: `seguridad-imagenes-origen`, base `0a0e26a3`
tras PR304, worktree `/Users/apple-1/somosnosotros-seguridad-imagenes-origen`.
OL262/bit289 comprobados por el script de numeración. Migración reservada
`20261003160000_imagenes_origen_permitido.sql`. Sin subagentes.
Founder mantiene publicación continua de entregas probadas; gestor revisa y
coordina ventana antes de aplicar la migración y unir el PR.

## Inventario y política aceptada

El gestor consultó producción en solo lectura y entregó únicamente agregados.
No se copiaron URLs personales ni se desactivó la comprobación TLS.

| Columna | Almacenamiento propio | Google | NULL |
| --- | ---: | ---: | ---: |
| artistas.foto | 323 | 0 | 335 |
| artistas.portada | 3 | 0 | 655 |
| eventos.imagen | 123 | 0 | 145 |
| lugares.portada | 47 | 0 | 19 |
| perfiles.foto | 7 | 23 | 19 |

Sin vacíos, HTTP ni otros dominios. Storage usa el host público
`viesoxgrfvftkgpjbnml.supabase.co` y `/storage/v1/object/public/fotos/`;
Google usa exactamente `lh3.googleusercontent.com`.

Gestor aceptó la política y el saneamiento de `crear_perfil` antes del SQL:

- INSERT o cambio real de imagen: una cuenta normal acepta Storage propio;
  solo la foto de perfil admite además el host exacto de Google.
- NULL/vacío quitan la imagen. Una imagen histórica idéntica no bloquea editar
  la ficha, incluso si hoy su URL sería rechazada. No se reescribe ninguna fila.
- Admin comprobado por `es_admin()` o rol efectivo `service_role` conservan
  imágenes HTTPS externas para administración/CAPO/instituciones. Un campo
  `origen`, un autor o metadatos no conceden esa excepción.
- Gramática común TS/PG: HTTPS, host DNS ASCII, puerto válido, sin credenciales,
  espacios, controles ni barras inversas. Los nombres Unicode van codificados.
  Orígenes ordinarios exigen puerto443 y ruta con objeto, sin segmentos punto
  ni separadores/barras/doble codificación que puedan escapar del prefijo.
  Query y fragmento no se interpretan como parte de la ruta.

No se verifica que exista el objeto ni se descarga la imagen. Se conserva la
capacidad explícita de administración de enlazar otros dominios; no equivale a
que cualquier URL HTTPS externa sea confiable. Esta pieza tampoco optimiza
tráfico ni cambia Auth, Storage, dependencias, mapas o aplicaciones nativas.

## Cambio de seguridad

El servidor validaba fichas con `imagenPermitida`, pero escribir directamente
en PostgreSQL omitía esa frontera; perfil solo exigía HTTPS. Reproducción sobre
las 73 migraciones anteriores: las cinco columnas admiten UPDATE externo y los
INSERT de artista (ambas columnas), lugar y evento también. Diez comprobaciones
fallan antes del arreglo (nueve escrituras y función todavía inexistente).

La nueva migración añade cuatro triggers BEFORE INSERT/UPDATE OF y una función
de validación pura, invoker, con search_path vacío. El trigger valida cada columna
cambiada y rechaza la operación completa con SQLSTATE23514. No abre permisos por
fila ni concede nuevos accesos a tablas. El trigger no tiene EXECUTE público ni
de clientes; el validador puro solo lo pueden llamar authenticated/service_role.

La excepción de servicio usa el rol efectivo conservado en `role`: no toma
`current_user`, que dentro de una RPC SECURITY DEFINER puede ser el dueño, ni
`request.jwt.claims` enviados por una vía distinta al rol efectivo. El origen
propio es una constante pública en SQL, nunca una configuración controlable por
el cliente. Si se migra a otro proyecto Supabase deberá actualizarse esa constante
mediante una migración revisada junto con la configuración de la aplicación.

`crear_perfil` conserva SECURITY DEFINER, search_path vacío ya vigente, permisos,
nombre, rol por `admin_correos` y ON CONFLICT. Único cambio en su cuerpo:

```diff
-    new.raw_user_meta_data ->> 'avatar_url',
+    case when public.imagen_origen_permitido(new.raw_user_meta_data ->> 'avatar_url', false, true)
+      then new.raw_user_meta_data ->> 'avatar_url' else null end,
```

Así una foto inválida de metadatos se descarta sin impedir crear la cuenta.
Se comprobó el diff contra el cuerpo de la definición original; las migraciones
intermedias endurecieron search_path/permisos y no cambiaron ese cuerpo.

## Evidencia

- Regresión TS antes del cambio: 17 fallos / 29 correctas; incluía controles,
  credenciales, puertos y rutas que escapaban del prefijo textual anterior.
- 176 pruebas focalizadas de imágenes y consumidores de artistas/lugares/eventos
  correctas en primera pasada; después se amplió cobertura de históricos/puertos.
- Candidato final: **1786 unitarias / 131 archivos**, **74 migraciones y 1358
  comprobaciones PostgreSQL reales, cero fallos**. Lint sin errores, solo el
  warning previo de `VisorImagen.componentes.test.mjs:169`; tipos e inventario
  correctos. Build de producción correcto.
- Matriz común JSON consumida por TS/PG: Storage, Google, dominios parecidos,
  otro bucket, controles, userinfo, puertos, segmentos punto y codificados;
  preservación de query/hash y nombres codificados.
- Escrituras directas de todas las columnas; INSERT normal, admin y servicio;
  RLS ajena/anónima; `origen=capo` y claims falsos; RPC definer; foto/portada
  mixtas sin guardado parcial; legado HTTPS/HTTP; borrado de imagen;
  alta Auth con avatar propio, Google, externo, javascript o ausente.
- Respaldo local de QA: es un servidor HTTP que imita PostgREST, no PGlite ni
  PostgreSQL. Sus imágenes se recorrieron con el validador SQL bajo servicio;
  son compatibles. Sin cambios al fixture ni descarga adicional de imágenes.
- No cambia marcado, CSS ni recorridos. La verificación es de contratos de
  datos; no se presenta como prueba visual nueva ni OAuth/Safari físico real.

PG se ejecutó en cluster efímero propio, loopback55440, sin variables de
producción. Los logs locales están en `/tmp/sn-ol262-evidencia/`.

## Incidente anterior conciliado: PR304

El operador unió por error el cierre documental PR304 antes de comprobar que su
CI estaba verde. CI37161224789 falló en `medir`, s13 a320px:168 nodos contra167 y
marcador Mapbox fuera63px. El diff era únicamente bit288/OPEN_LOOPS; H04 ya tenía
CI de código y Production verificadas. Merge documental `0a0e26a3`, CI de main
37161469449 correcta con el mismo código. No se cambió presupuesto ni se ocultó
el fallo. Founder informado; gestor revisó ambos resultados y concilió como
medición inestable del mapa. Regla reforzada: consultar explícitamente conclusión
de CI del PR antes de unir, también en documentación; ninguna cadena de comandos
debe permitir el merge tras un check fallido. La evidencia histórica de bit288
y OL261 se conserva íntegra.

## Entrega y recuperación

Pendiente revisión del gestor, CI del PR, ventana exclusiva, dry-run que enumere
solo160000, aplicación y verificación remota de funciones/triggers/versión. Luego
merge, Production del SHA exacto y salud/lectura en dominio. Sin escrituras de
prueba ni cuentas nuevas en producción. El gestor dispone de conexión directa
para comprobación de catálogo sin relajar TLS.

Si hubiera una regresión de validación, corregir mediante una nueva migración
revisada; quitar la frontera reintroduce H05. La migración no borra ni transforma
imágenes históricas, por lo que no hay datos que reconstruir para revertir.

## Publicación y comprobación posterior

Gestor aceptó `1cba930c` y cedió ventana condicionada al CI del PR en verde.
[PR305](https://github.com/robscan/somosnosotros/pull/305), CI37162695434 completo
y correcto, incluida medición visual. CI de main37163005342 también correcto. Antes de operar se consultó explícitamente
la conclusión y el SHA: coincide con el candidato aceptado. Preview correcta.

Dry-run enumeró únicamente160000; `db:push` aplicó esa migración sin seeds ni
cambios de roles. PR unido con merge `ee284157e21047b1270e1e6fce3c7d657b023d2b`
a las23:49:53 UTC. Production6834601894 del mismo SHA, success23:50:28 UTC.

Comprobaciones posteriores en producción:

- `/api/estado` HTTP200: `supabase:ok`, Mapbox configurado.
- La nueva RPC **pura y sin escritura** devuelve HTTP200: propia=true, externa
  normal=false, Google perfil=true, Google ficha=false, externa admin=true.
  No se crearon imágenes, objetos, cuentas ni fichas para probarlo.
- La regresión H03 conserva identidad pública200 y preferencias/filtros privados
  y RPC de perfil anónima401/42501; consultas con limit0, sin datos personales.
- Navegador sin sesión: `/perfil` y `/ajustes` llevan a Entrar y mantienen su
  respectivo `siguiente` en Apple/Google. No hay sesión real disponible; no se
  presenta esta comprobación como carga autenticada ni login OAuth/Safari físico.
- Cluster PG local detenido; código de producto congelado y árbol sin cambios
  ajenos. Se prepara este cierre documental sin repetir unitarias/build.

Al entregar el cierre, la herramienta de comunicación informó que el Mac está
bloqueado y el desbloqueo automático falló. Se solicitó al founder desbloquearlo.
Pendiente del gestor: confirmar catálogo remoto (funciones, cuatro disparadores
y permisos) y conciliar cierre. No se oculta esta limitación ni se promete un
seguimiento desatendido. La publicación ya fue autorizada, probada y ejecutada.
