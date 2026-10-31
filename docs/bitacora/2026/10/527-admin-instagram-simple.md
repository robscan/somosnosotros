# 527 · OL-495 · Administración › Instagram más simple: tu ciudad, la conexión como botón y la pestaña inicial (código, firmado)

**Fecha:** 2026-10-29. **Rama:** `admin-instagram-simple` (desde `origin/main` `3f4b51d1` con `origin/admin-simple` unida, el prototipo de OL-493).
**Quién:** operador del Gestor de cambios VII (agente en árbol aislado, sin subagentes). **Sin migración.** **Estado:** listo para revisar.

## El pedido

El founder firmó el 29 de octubre la variante C del prototipo de OL-493 (bitácora [525](525-admin-simple.md)). De Instagram: que la pantalla
abra con la ciudad de quien entra, que la conexión ya hecha deje de ocupar media pantalla (un botón con el icono y un punto de color a la derecha
de las pestañas) y que una semana vacía abra en «Eventos», con «Falta material» arriba si está vacía por eso.

## Lo que cambió

1. **La ciudad de quien entra** (`page.tsx`, `ciudadDeLaPantalla`). El orden: la de la dirección (`?ciudad=todas` sigue siendo «todas»), la que
   se eligió en las listas de Administración en esta sesión (la galleta `sn_admin_ciudad` de OL-456), la de quien entra (`ciudad_de_persona`,
   con la llave de servicio porque la función no es de `authenticated`; solo pregunta por la persona misma) y, si no tiene, la ciudad inicial.
   «Todas las ciudades» sigue en la hoja, ya no es la de omisión. Elegir en la hoja la guarda en la misma galleta (`recordarCiudad`, sin cambios).
   **El hallazgo «queretaro»:** el nombre del chip y los de la hoja salen ahora de la tabla `ciudades` («Querétaro»); si una ciudad no está ahí,
   el de sus eventos como antes.
2. **La conexión como botón** (`ConexionInstagram.tsx`). Tres piezas: `BotonConexion`, el redondo plano de 44 px (`ui/BotonIcono`) con el
   icono de Instagram y el punto de la barra de la app (`Sesion/punto`) en verde (conectada), gris (sin conexión) o rojo (caducó o le faltan
   permisos), a la derecha de «Semana · Eventos» en una rejilla de dos columnas (`PantallaInstagram.module.css`); `HojaConexion`, la hoja
   «Conexión con Instagram» con la cuenta, «Página Somos Nosotrxs · conectada desde el 7 de octubre», «Puede» (publicar en Instagram, en la
   página de Facebook, leer otras cuentas para completar fichas), una nota llana y «Reconectar» (secundario si está bien, principal si no) o
   «Conectar Instagram»; y el renglón suelto bajo la cabecera, sin el rótulo «Conexión», **solo si falta algo o caducó**. El nombre del botón:
   «Instagram conectado como @smsnstrsapp», «Instagram sin conexión», «Instagram sin conexión propia» (con la llave de respaldo del servidor),
   «A la conexión con Instagram le faltan permisos», «La conexión con Instagram caducó». «Usa el token de respaldo» pasa a «Publica con la llave
   de respaldo» (sin jerga).
3. **«Caducó»** (`lib/instagram/conexionEstado.ts`). `leerConexion` lee a la vez la fila de `instagram_conexion` y el último trabajo de
   Instagram que terminó en `redes_trabajos` (red `instagram`, publicado o fallido, del más reciente). `caducoEn` (pura): si ese trabajo falló con
   `error = 'permiso'` (la clave que la cola guarda para los códigos 190, 102, 10 y 2xx de la Graph API) **después** de `conectado_en`, caducó; si
   el último salió bien, falló por otra cosa o fue antes de reconectar, no. Sin fila (llave de respaldo) cuenta cualquier trabajo. Renglón:
   «Instagram dejó de publicar · La conexión caducó el mié 7 de oct: reconecta»; hoja: «Dejó de publicar el … : la conexión caducó» y «Pasa si
   cambia la contraseña de Facebook o si se quitan los permisos. Reconecta con la cuenta que administra la página y vuelve a publicar lo que se
   quedó sin salir» (la cola no reintenta un fallo de permiso solo: el prototipo decía «se publica solo» y no es así). **Para la portada (OL-494):**
   `conexionPendiente(fila, hayRespaldo, ultimo, ahora)` devuelve `{ titulo, detalle, punto }` o null; con `leerConexion` la portada lo pinta
   sin tocar esta pantalla. No hizo falta migración: la administración ya lee `redes_trabajos`.
4. **La pestaña inicial** (`pestana.ts`, pura, con sus pruebas). «Semana» si tiene algo de hoy en adelante (programado, de hoy, publicándose,
   publicado hoy o una sugerencia, que solo sale si alguien tiene material); si no, «Eventos». La dirección gana (`?pestana=`, `?evento=` →
   Eventos, `?dia=` o `?semana=viene` → Semana); después, la que la persona eligió en esta sesión (memoria de pantalla, la misma
   `lib/memoriaPantalla` de `useMemoriaPantalla`, con una clave fija para la pantalla y repuesta antes de pintar: `useMemoriaPantalla` guarda por
   dirección y la dirección cambia con la pestaña); y al final la regla. Las pestañas ahora escriben `?pestana=semana` o `?pestana=eventos`.
   Cambiar de ciudad no cambia de pestaña (filtrar no es navegar). Con la semana vacía y alguien sin material, «Eventos» abre con «Esta semana no
   hay nada programado: a nadie le alcanza el material.» y el renglón «Falta material» (el mismo de la semana, ahora `RenglonFalta.tsx`, con su
   `HojaMaterial`), y después la lista para publicar uno a mano.

## El respaldo local

`fixture.mjs`: la RPC `ciudad_de_persona` (la misma regla que ya estaba en `ciudadDePersona`) y `RESPALDO_INSTAGRAM_CONEXION=caduco`: conectada
hace 9 días y un trabajo de Instagram fallido por `permiso` esta mañana (después de lo publicado el lunes y el martes con
`RESPALDO_INSTAGRAM_SEMANA=1`; con el fallo antes de lo publicado, la pantalla dice bien que **no** caducó: la primera corrida lo mostró).

## Medición

`npm run medir`: s46 y s47 (Eventos) suben 13 nodos (la línea y el renglón «Falta material»: en el respaldo de la medición la semana de San Luis
no tiene nada de hoy en adelante y le falta material a seis artistas), s48 y s49 (Semana) 3 (la rejilla de las pestañas, el botón y su punto,
menos el rótulo «Conexión»). Anotados a mano en `medidas.aceptadas.json` (solo esas cuatro líneas, para no tocar los presupuestos de otras
piezas). s48 y s49 piden ahora `&pestana=semana`: sin ella, la regla los abre en Eventos.

## Recorrido con toques reales (`capturas-527/recorrido.txt`, `capturar-instagram-simple.mjs`): 61 de 61, sin errores de página ni de consola

La app compilada contra el respaldo (reloj fijo del mié 7 de oct, cuenta de administración), cuatro arranques del respaldo: conectada, sin
conexión, caducó y la semana vacía. Ratón en el punto del elemento, comprobado con `elementFromPoint`. Sin `?ciudad` ni galleta abre con San Luis
(la administradora del respaldo no tiene ciudad propia: la inicial); abre en «Semana»; el botón mide 44×44 y cabe a 320, 390 y 768; la hoja se
abre y se cierra con la ✕; «Todas las ciudades» se elige en la hoja; elegir San Luis guarda `sn_admin_ciudad`; elegir «Eventos» y volver a abrir
la pantalla abre en «Eventos», y lo mismo con «Semana»; `?ciudad=queretaro` dice «Querétaro»; sin conexión, el renglón y «Conectar Instagram»;
caducó, el renglón rojo y la hoja; la semana vacía abre en «Eventos» con «Falta material» a 320, 390 y 768, y tocarlo abre su hoja.

## Capturas (`docs/rediseno/capturas-527/`, 390 × 844 salvo donde se dice; cada una abierta)

- `01-conectada`: San Luis, «Esta semana · La que viene», «Semana» elegida y a la derecha el icono de Instagram con el punto verde; la semana
  empieza en el resumen, sin el bloque «Conexión» (como la captura 12 del prototipo).
- `02-hoja-conectada`: «Conexión con Instagram»: @smsnstrsapp, «Página Somos Nosotrxs · conectada desde el 7 de octubre», «Puede» con tres
  palomitas, la nota y «Reconectar» blanco abajo.
- `03-hoja-ciudades`: «Ciudades con eventos»: «Todas las ciudades» y San Luis Potosí con su palomita.
- `04-queretaro`: el chip dice «Querétaro» y la lista «No hay eventos por publicar en Querétaro en los próximos 7 días.»
- `05-conectada-320`, `05-conectada-768`: a 320 «La que viene» asoma al final (como hoy) y el botón entero; a 768 el botón al borde derecho de
  la columna.
- `06-sin-conexion`, `07-hoja-sin-conexion`: punto gris; el renglón «Sin conexión · Conecta Instagram para publicar» con su botón; la hoja con
  la nota de con qué cuenta entrar y «Conectar Instagram» violeta.
- `08-caduco`, `09-hoja-caduco`: punto rojo; «Instagram dejó de publicar · La conexión caducó el mié 7 de oct: reconecta»; la hoja dice por qué
  pasa y «Reconectar» violeta.
- `10-semana-vacia-390`, `-320`, `-768`: «Eventos» elegida, la línea de la semana vacía, «Falta material · 6 artistas con fecha se quedaron
  fuera por falta de foto o portada · Pedírselo o subirla tú» y después «13 eventos en los próximos 7 días», «Para publicar · 12».
- `11-hoja-falta-material`: la hoja «Falta material» con cada artista y lo que le falta.

## Comprobaciones

`npm run lint` (0 errores; 2 avisos que ya estaban, en archivos de otras piezas) · `npm run typecheck` · `npm test` (316 archivos, 5101 pruebas)
· `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db` (2998, 0 fallaron) · `npm run inventario` (sin novedades) · `npm run
medir` (sin novedades, con los cuatro presupuestos nuevos) · `npm run test:componentes` (791 de 791; `ConexionInstagram.componentes.test.mjs`
reescrito: botón, punto, hoja, caducó y la vuelta de Meta).

## Preguntas al founder

1. En el respaldo la administradora no tiene ciudad propia y cae en San Luis. En producción, tu cuenta abrirá con la ciudad que más se repite en
   lo que llevas, publicas y marcas «Voy». ¿Te sirve así o prefieres elegirla una vez en tu perfil?
2. Si a la conexión le falta un permiso (por ejemplo, el de leer cuentas) el punto sale rojo, igual que cuando caduca. ¿Lo dejamos así o prefieres
   amarillo para «funciona a medias»?
3. Cuando caduca, lo que no salió no se vuelve a publicar solo al reconectar (la cola no reintenta un fallo de permiso). ¿Quieres que al reconectar
   se reintente solo lo de esta semana?
